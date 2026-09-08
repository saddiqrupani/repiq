"""POST /form/analyze — pull a lift video from Supabase Storage, run MediaPipe,
score it against a rubric, and persist the result to form_analyses.

Sync response for MVP: the client waits ~5-15s for a short clip.
"""
from __future__ import annotations

import os
import tempfile
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from .auth import CurrentUser, bearer_token, current_user
from .config import Settings, get_settings
from .pose import extract_pose, middle_valid_frame, render_annotated_video, render_thumbnail
from .scoring import score
from .supabase_client import (
    SupabaseError,
    download_object,
    rest_get,
    rest_insert,
    rest_patch,
    upload_object,
)

router = APIRouter(prefix="/form", tags=["form"])

BUCKET = "lift-videos"


class AnalyzeRequest(BaseModel):
    video_path: str
    exercise_id: str
    workout_set_id: str | None = None


class AnalyzeResponse(BaseModel):
    id: str
    status: str
    score: float | None
    rubric: str | None
    feedback: list[str] | None
    metrics: dict[str, Any] | None
    frame_thumb_path: str | None
    annotated_video_path: str | None
    error: str | None


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(
    body: AnalyzeRequest,
    user: CurrentUser = Depends(current_user),
    token: str = Depends(bearer_token),
    settings: Settings = Depends(get_settings),
) -> AnalyzeResponse:
    # Look up the exercise name so we know which rubric to run. We derive a
    # rubric key from the name — schema currently has no slug column.
    try:
        rows = rest_get(
            settings.supabase_url, token, settings.supabase_anon_key,
            "exercises", {"select": "name", "id": f"eq.{body.exercise_id}"},
        )
    except SupabaseError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"exercise lookup: {e.body}") from e
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exercise not found")
    name: str = rows[0]["name"]
    slug = _rubric_for(name)

    # Create the row up front so the client has an ID to poll if we later go async.
    try:
        row = rest_insert(
            settings.supabase_url, token, settings.supabase_anon_key,
            "form_analyses",
            {
                "user_id": user.id,
                "exercise_id": body.exercise_id,
                "workout_set_id": body.workout_set_id,
                "video_path": body.video_path,
                "status": "processing",
            },
        )
    except SupabaseError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"insert failed: {e.body}") from e

    analysis_id = row["id"]

    try:
        video_bytes = download_object(
            settings.supabase_url, token, settings.supabase_anon_key, BUCKET, body.video_path,
        )
    except SupabaseError as e:
        _mark_failed(settings, token, analysis_id, f"download failed: {e.body}")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"download failed: {e.body}") from e

    tmpdir = tempfile.mkdtemp(prefix="repiq-form-")
    video_tmp = os.path.join(tmpdir, "clip.mp4")
    thumb_tmp = os.path.join(tmpdir, "thumb.png")
    annotated_tmp = os.path.join(tmpdir, "annotated.mp4")
    with open(video_tmp, "wb") as f:
        f.write(video_bytes)

    try:
        series = extract_pose(video_tmp, sample_every=1)
        result = score(series, slug)
    except Exception as e:  # noqa: BLE001 — surface any pose error to the row
        _mark_failed(settings, token, analysis_id, f"pose extraction: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(e)) from e

    thumb_path_remote: str | None = None
    try:
        mid = middle_valid_frame(series)
        render_thumbnail(video_tmp, mid, series, thumb_tmp)
        thumb_path_remote = f"{user.id}/thumbs/{analysis_id}.png"
        with open(thumb_tmp, "rb") as f:
            upload_object(
                settings.supabase_url, token, settings.supabase_anon_key,
                BUCKET, thumb_path_remote, f.read(), "image/png",
            )
    except Exception:  # thumbnail is nice-to-have; don't fail the whole analysis
        thumb_path_remote = None

    annotated_path_remote: str | None = None
    try:
        render_annotated_video(video_tmp, series, annotated_tmp)
        annotated_path_remote = f"{user.id}/annotated/{analysis_id}.mp4"
        with open(annotated_tmp, "rb") as f:
            upload_object(
                settings.supabase_url, token, settings.supabase_anon_key,
                BUCKET, annotated_path_remote, f.read(), "video/mp4",
            )
    except Exception:  # annotated video is nice-to-have; keep the analysis
        annotated_path_remote = None

    try:
        updated = rest_patch(
            settings.supabase_url, token, settings.supabase_anon_key,
            "form_analyses", {"id": analysis_id},
            {
                "status": "complete",
                "score": result["score"],
                "feedback": result["feedback"],
                "metrics": {**result["metrics"], "rubric": result["rubric"]},
                "frame_thumb_path": thumb_path_remote,
                "annotated_video_path": annotated_path_remote,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            },
        )
    except SupabaseError as e:
        _mark_failed(settings, token, analysis_id, f"update failed: {e.body}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, e.body) from e
    finally:
        for p in (video_tmp, thumb_tmp, annotated_tmp):
            try:
                os.remove(p)
            except OSError:
                pass
        try:
            os.rmdir(tmpdir)
        except OSError:
            pass

    return AnalyzeResponse(
        id=updated["id"],
        status=updated["status"],
        score=updated.get("score"),
        rubric=result["rubric"],
        feedback=updated.get("feedback"),
        metrics=updated.get("metrics"),
        frame_thumb_path=updated.get("frame_thumb_path"),
        annotated_video_path=updated.get("annotated_video_path"),
        error=None,
    )


def _rubric_for(exercise_name: str) -> str:
    lower = exercise_name.lower()
    # Split-squat is unilateral — the bilateral squat rubric misfires on it.
    if "split" in lower and "squat" in lower:
        return "generic"
    if "squat" in lower:
        return "squat"
    return "generic"


def _mark_failed(settings: Settings, token: str, analysis_id: str, msg: str) -> None:
    try:
        rest_patch(
            settings.supabase_url, token, settings.supabase_anon_key,
            "form_analyses", {"id": analysis_id},
            {"status": "failed", "error": msg[:500], "completed_at": datetime.now(timezone.utc).isoformat()},
        )
    except SupabaseError:
        pass
