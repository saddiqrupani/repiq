"""Rubric-based form scoring from a MediaPipe pose series.

We have two rubrics:
  * squat  — depth, torso lean, and knee valgus (0..100).
  * generic — rep count and pose confidence only; no form judgement.

Returned dict is stored as-is in `form_analyses.feedback` / `.metrics`.
"""
from __future__ import annotations

from typing import TypedDict

import numpy as np

from .pose import (
    LEFT_ANKLE,
    LEFT_HIP,
    LEFT_KNEE,
    LEFT_SHOULDER,
    RIGHT_ANKLE,
    RIGHT_HIP,
    RIGHT_KNEE,
    RIGHT_SHOULDER,
    PoseSeries,
)


class ScoreResult(TypedDict):
    score: float
    rubric: str
    feedback: list[str]
    metrics: dict[str, float | int]


def score(series: PoseSeries, exercise_slug: str) -> ScoreResult:
    if exercise_slug in {"back-squat", "front-squat", "goblet-squat", "squat"}:
        return _score_squat(series)
    return _score_generic(series)


# --- helpers ---------------------------------------------------------------

def _angle_deg(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Angle at vertex b formed by segments b→a and b→c."""
    ba = a - b
    bc = c - b
    denom = float(np.linalg.norm(ba) * np.linalg.norm(bc))
    if denom < 1e-6:
        return 0.0
    cos_theta = float(np.dot(ba, bc) / denom)
    cos_theta = max(-1.0, min(1.0, cos_theta))
    return float(np.degrees(np.arccos(cos_theta)))


def _smooth(vals: np.ndarray, window: int = 5) -> np.ndarray:
    if len(vals) < window:
        return vals
    kernel = np.ones(window) / window
    return np.convolve(vals, kernel, mode="same")


def _detect_reps(knee_angle: np.ndarray, valid_mask: np.ndarray) -> list[tuple[int, int, int]]:
    """Return [(start_top, bottom, end_top)] indices for each detected rep.

    A rep is a valley in knee angle: goes from high (>=150°) down to low
    (<=120°) and back up to >=150°.
    """
    if len(knee_angle) < 10:
        return []
    smooth = _smooth(knee_angle, window=5)
    # Only consider frames where we actually detected the lower body.
    smooth = np.where(valid_mask, smooth, np.nan)

    reps: list[tuple[int, int, int]] = []
    state = "search_top"  # search_top → descending → ascending
    top_idx = -1
    bottom_idx = -1
    bottom_val = 180.0

    for i, v in enumerate(smooth):
        if np.isnan(v):
            continue
        if state == "search_top":
            if v >= 150.0:
                top_idx = i
                state = "descending"
        elif state == "descending":
            if v < bottom_val:
                bottom_val = v
                bottom_idx = i
            if v <= 120.0:
                state = "ascending"
        elif state == "ascending":
            if v >= 150.0 and top_idx >= 0 and bottom_idx > top_idx:
                reps.append((top_idx, bottom_idx, i))
                top_idx = i
                bottom_idx = -1
                bottom_val = 180.0
                state = "descending"
    return reps


def _score_squat(series: PoseSeries) -> ScoreResult:
    L = series.landmarks
    n = len(L)
    valid = np.zeros(n, dtype=bool)
    knee_angle = np.zeros(n, dtype=np.float32)
    torso_angle = np.zeros(n, dtype=np.float32)
    valgus_ratio = np.full(n, np.nan, dtype=np.float32)

    for i in range(n):
        row = L[i]
        # Require lower body visible for this frame to count.
        needed = [LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE,
                  LEFT_SHOULDER, RIGHT_SHOULDER]
        if any(row[j, 3] < 0.4 for j in needed):
            continue
        valid[i] = True

        def p(idx: int) -> np.ndarray:
            return row[idx, :2].astype(np.float32)

        left_knee = _angle_deg(p(LEFT_HIP), p(LEFT_KNEE), p(LEFT_ANKLE))
        right_knee = _angle_deg(p(RIGHT_HIP), p(RIGHT_KNEE), p(RIGHT_ANKLE))
        knee_angle[i] = (left_knee + right_knee) / 2.0

        # Torso lean vs vertical: shoulder-hip vector angle from straight up.
        mid_shoulder = (p(LEFT_SHOULDER) + p(RIGHT_SHOULDER)) / 2.0
        mid_hip = (p(LEFT_HIP) + p(RIGHT_HIP)) / 2.0
        torso = mid_shoulder - mid_hip
        vertical = np.array([0.0, -1.0], dtype=np.float32)  # y grows downward in image space
        torso_angle[i] = _angle_deg(mid_hip + vertical, mid_hip, mid_hip + torso)

        knee_spread = abs(row[LEFT_KNEE, 0] - row[RIGHT_KNEE, 0])
        ankle_spread = abs(row[LEFT_ANKLE, 0] - row[RIGHT_ANKLE, 0])
        if ankle_spread > 1e-4:
            valgus_ratio[i] = float(knee_spread / ankle_spread)

    reps = _detect_reps(knee_angle, valid)

    if not reps:
        return ScoreResult(
            score=0.0,
            rubric="squat",
            feedback=[
                "Couldn't detect any complete reps. Make sure your whole body is in frame and film from the side or front-3/4.",
            ],
            metrics={
                "rep_count": 0,
                "valid_frame_ratio": float(valid.mean()) if n else 0.0,
            },
        )

    # Per-rep metrics.
    bottom_angles: list[float] = []
    max_torso_per_rep: list[float] = []
    min_valgus_per_rep: list[float] = []
    for top, bottom, end in reps:
        bottom_angles.append(float(knee_angle[bottom]))
        segment = slice(top, end + 1)
        max_torso_per_rep.append(float(np.max(torso_angle[segment])))
        vg = valgus_ratio[segment]
        vg = vg[~np.isnan(vg)]
        if len(vg):
            min_valgus_per_rep.append(float(np.min(vg)))

    avg_bottom = float(np.mean(bottom_angles))
    avg_torso = float(np.mean(max_torso_per_rep))
    avg_valgus = float(np.mean(min_valgus_per_rep)) if min_valgus_per_rep else 1.0

    depth_pts = _band(avg_bottom, [(90, 40), (100, 32), (110, 22), (130, 10), (999, 0)])
    torso_pts = _band(avg_torso, [(30, 30), (45, 22), (60, 12), (999, 0)])
    # Valgus is higher-is-better (knees track over toes), so use explicit bands.
    if avg_valgus >= 1.0:
        valgus_pts = 30.0
    elif avg_valgus >= 0.9:
        valgus_pts = 22.0
    elif avg_valgus >= 0.75:
        valgus_pts = 12.0
    else:
        valgus_pts = 0.0

    total = round(depth_pts + torso_pts + valgus_pts, 1)

    feedback: list[str] = []
    if avg_bottom > 110:
        feedback.append("Sit deeper — get your hip crease below your knee for full depth.")
    elif avg_bottom > 100:
        feedback.append("A touch shallow. Aim for hips just below parallel.")
    else:
        feedback.append("Good depth — hitting parallel or below consistently.")

    if avg_torso > 45:
        feedback.append("Torso is leaning forward a lot. Brace core and keep chest up.")
    elif avg_torso > 30:
        feedback.append("Some forward lean — keep the chest tall out of the hole.")

    if avg_valgus < 0.9:
        feedback.append("Knees are caving in. Push them out to track over your toes.")

    return ScoreResult(
        score=total,
        rubric="squat",
        feedback=feedback,
        metrics={
            "rep_count": len(reps),
            "avg_bottom_knee_angle": round(avg_bottom, 1),
            "avg_max_torso_angle": round(avg_torso, 1),
            "avg_min_valgus_ratio": round(avg_valgus, 2),
            "depth_points": round(depth_pts, 1),
            "torso_points": round(torso_pts, 1),
            "valgus_points": round(valgus_pts, 1),
            "valid_frame_ratio": round(float(valid.mean()), 2),
        },
    )


def _band(value: float, bands: list[tuple[float, float]]) -> float:
    """Piecewise: first (threshold, points) where value <= threshold."""
    for threshold, pts in bands:
        if value <= threshold:
            return float(pts)
    return 0.0


def _score_generic(series: PoseSeries) -> ScoreResult:
    L = series.landmarks
    n = len(L)
    if n == 0:
        return ScoreResult(
            score=0.0,
            rubric="generic",
            feedback=["No frames decoded from the video."],
            metrics={"rep_count": 0, "valid_frame_ratio": 0.0},
        )
    # Rough rep proxy: count zero-crossings of the mid-hip y-velocity.
    hips_y = (L[:, LEFT_HIP, 1] + L[:, RIGHT_HIP, 1]) / 2.0
    valid = ((L[:, LEFT_HIP, 3] > 0.4) & (L[:, RIGHT_HIP, 3] > 0.4)).astype(np.float32)
    smooth = _smooth(hips_y, window=7)
    dy = np.diff(smooth)
    # Count peaks: transitions from up to down movement large enough to matter.
    reps = 0
    prev_sign = 0
    threshold = 0.005
    for v in dy:
        s = 1 if v > threshold else (-1 if v < -threshold else prev_sign)
        if prev_sign == -1 and s == 1:
            reps += 1
        prev_sign = s

    visibility = float(valid.mean())
    # Score is just visibility * 100 as a placeholder — real form judgement
    # only exists for exercises we've built a rubric for.
    return ScoreResult(
        score=round(visibility * 100.0, 1),
        rubric="generic",
        feedback=[
            f"Detected roughly {reps} reps. Form scoring for this exercise isn't tuned yet — we're showing pose quality only.",
        ],
        metrics={
            "rep_count": reps,
            "valid_frame_ratio": round(visibility, 2),
        },
    )
