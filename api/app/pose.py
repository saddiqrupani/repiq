"""MediaPipe pose extraction over a video clip.

Returns a dense per-frame landmark array (frames × 33 × 4) plus frame size.
Kept intentionally thin so the scoring layer can consume raw arrays without
knowing about MediaPipe.
"""
from __future__ import annotations

from dataclasses import dataclass

import cv2
import mediapipe as mp
import numpy as np

# Landmark indices we care about; MediaPipe Pose exposes 33 total.
NOSE = 0
LEFT_SHOULDER, RIGHT_SHOULDER = 11, 12
LEFT_HIP, RIGHT_HIP = 23, 24
LEFT_KNEE, RIGHT_KNEE = 25, 26
LEFT_ANKLE, RIGHT_ANKLE = 27, 28


def _open_video(video_path: str) -> tuple[cv2.VideoCapture, int]:
    """Open a video and return the capture plus the container rotation in degrees.

    iOS records with the sensor in landscape and stores a rotation tag (typically 90°)
    in the moov atom. CAP_PROP_ORIENTATION_AUTO is unreliable across OpenCV builds,
    so we read CAP_PROP_ORIENTATION_META and apply the rotation manually on every
    frame the caller reads.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")
    orientation_meta = getattr(cv2, "CAP_PROP_ORIENTATION_META", None)
    rot = 0
    if orientation_meta is not None:
        rot = int(cap.get(orientation_meta) or 0)
    return cap, rot


def _rotate_frame(frame: np.ndarray, rotation_deg: int) -> np.ndarray:
    if rotation_deg == 90:
        return cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
    if rotation_deg == 180:
        return cv2.rotate(frame, cv2.ROTATE_180)
    if rotation_deg == 270:
        return cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return frame


@dataclass
class PoseSeries:
    # Shape: (num_frames, 33, 4) → x, y (normalized 0..1), z, visibility.
    landmarks: np.ndarray
    fps: float
    width: int
    height: int
    # Frame indices that produced a valid detection (others are all-zero rows).
    valid_frame_indices: list[int]


def extract_pose(video_path: str, sample_every: int = 1) -> PoseSeries:
    """Run MediaPipe Pose over the clip.

    `sample_every` lets callers skip frames if the video is long; keep at 1
    for short lift clips where every frame matters for rep detection.
    """
    cap, rotation = _open_video(video_path)

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    raw_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    raw_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    # After manual rotation, width/height swap for 90/270°.
    width, height = (raw_h, raw_w) if rotation in (90, 270) else (raw_w, raw_h)

    frames: list[np.ndarray] = []
    valid_indices: list[int] = []

    mp_pose = mp.solutions.pose
    with mp_pose.Pose(
        model_complexity=1,
        enable_segmentation=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as pose:
        frame_idx = -1
        kept_idx = -1
        while True:
            ok, frame_bgr = cap.read()
            if not ok:
                break
            frame_idx += 1
            if frame_idx % sample_every != 0:
                continue
            kept_idx += 1

            frame_bgr = _rotate_frame(frame_bgr, rotation)
            rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            rgb.flags.writeable = False
            result = pose.process(rgb)

            row = np.zeros((33, 4), dtype=np.float32)
            if result.pose_landmarks:
                for i, lm in enumerate(result.pose_landmarks.landmark):
                    row[i] = (lm.x, lm.y, lm.z, lm.visibility)
                valid_indices.append(kept_idx)
            frames.append(row)

    cap.release()
    if not frames:
        raise RuntimeError("No frames decoded from video")

    return PoseSeries(
        landmarks=np.stack(frames, axis=0),
        fps=fps / sample_every,
        width=width,
        height=height,
        valid_frame_indices=valid_indices,
    )


def middle_valid_frame(series: PoseSeries) -> int:
    if not series.valid_frame_indices:
        return len(series.landmarks) // 2
    return series.valid_frame_indices[len(series.valid_frame_indices) // 2]


def render_thumbnail(
    video_path: str, frame_index: int, series: PoseSeries, out_path: str
) -> None:
    """Grab a single frame, draw pose landmarks on it, save as PNG."""
    cap, rotation = _open_video(video_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
    ok, frame = cap.read()
    cap.release()
    if not ok:
        raise RuntimeError(f"Could not read frame {frame_index}")
    frame = _rotate_frame(frame, rotation)

    if frame_index < len(series.landmarks):
        _draw_skeleton(frame, series.landmarks[frame_index])

    cv2.imwrite(out_path, frame)


# Segments we draw between landmark pairs on both the still thumbnail and the
# annotated video. Kept as a module constant so the two renderers stay in sync.
_SKELETON_EDGES: tuple[tuple[int, int], ...] = (
    (LEFT_SHOULDER, RIGHT_SHOULDER),
    (LEFT_SHOULDER, LEFT_HIP),
    (RIGHT_SHOULDER, RIGHT_HIP),
    (LEFT_HIP, RIGHT_HIP),
    (LEFT_HIP, LEFT_KNEE),
    (RIGHT_HIP, RIGHT_KNEE),
    (LEFT_KNEE, LEFT_ANKLE),
    (RIGHT_KNEE, RIGHT_ANKLE),
)


def render_annotated_video(video_path: str, series: PoseSeries, out_path: str) -> None:
    """Re-encode the clip with the pose skeleton drawn on every frame.

    We reuse the landmark array from `extract_pose` — no second inference pass.
    Output is H.264 in an .mp4 container so iOS AVPlayer can decode it directly.
    """
    cap, rotation = _open_video(video_path)
    raw_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    raw_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out_w, out_h = (raw_h, raw_w) if rotation in (90, 270) else (raw_w, raw_h)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    # 'avc1' → H.264; iOS/Safari need this. 'mp4v' produces a file the RN video
    # players won't decode without extra codecs installed.
    fourcc = cv2.VideoWriter_fourcc(*"avc1")
    writer = cv2.VideoWriter(out_path, fourcc, fps, (out_w, out_h))
    if not writer.isOpened():
        cap.release()
        raise RuntimeError("VideoWriter failed to open (missing H.264 codec?)")

    try:
        idx = -1
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            idx += 1
            frame = _rotate_frame(frame, rotation)
            if idx < len(series.landmarks):
                row = series.landmarks[idx]
                _draw_skeleton(frame, row)
            writer.write(frame)
    finally:
        cap.release()
        writer.release()


def _draw_skeleton(frame: np.ndarray, row: np.ndarray) -> None:
    h, w = frame.shape[:2]
    for _i, (x, y, _z, v) in enumerate(row):
        if v < 0.3:
            continue
        cv2.circle(frame, (int(x * w), int(y * h)), 4, (0, 255, 0), -1)
    for a, b in _SKELETON_EDGES:
        if row[a, 3] < 0.3 or row[b, 3] < 0.3:
            continue
        p1 = (int(row[a, 0] * w), int(row[a, 1] * h))
        p2 = (int(row[b, 0] * w), int(row[b, 1] * h))
        cv2.line(frame, p1, p2, (0, 200, 255), 2)
