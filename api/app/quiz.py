"""POST /form/{analysis_id}/quiz — generate a 3-question multiple-choice quiz
that reinforces the specific form corrections in a completed form_analyses row.

Reads the analysis (RLS-scoped to the caller), extracts exercise + rubric
feedback + key metrics, hands them to the model, and returns strict JSON so
the client can render questions without extra parsing.
"""
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from openai import OpenAI
from pydantic import BaseModel

from .auth import CurrentUser, bearer_token, current_user
from .config import Settings, get_settings
from .supabase_client import SupabaseError, rest_get

router = APIRouter(prefix="/form", tags=["form"])


class QuizChoice(BaseModel):
    text: str


class QuizQuestion(BaseModel):
    prompt: str
    choices: list[str]
    correct_index: int
    explanation: str


class QuizResponse(BaseModel):
    analysis_id: str
    exercise: str
    questions: list[QuizQuestion]


@router.post("/{analysis_id}/quiz", response_model=QuizResponse)
def generate_quiz(
    analysis_id: str,
    user: CurrentUser = Depends(current_user),
    token: str = Depends(bearer_token),
    settings: Settings = Depends(get_settings),
) -> QuizResponse:
    if not settings.openai_api_key:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "OpenAI API key not configured on the server.",
        )

    # RLS ensures the caller can only read their own row — no user_id check needed.
    try:
        rows = rest_get(
            settings.supabase_url, token, settings.supabase_anon_key,
            "form_analyses",
            {
                "select": "id,exercise_id,status,score,feedback,metrics",
                "id": f"eq.{analysis_id}",
            },
        )
    except SupabaseError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"analysis lookup: {e.body}") from e
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form analysis not found")
    row = rows[0]
    if row["status"] != "complete":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Analysis is {row['status']} — generate a quiz after it completes.",
        )

    try:
        ex_rows = rest_get(
            settings.supabase_url, token, settings.supabase_anon_key,
            "exercises", {"select": "name", "id": f"eq.{row['exercise_id']}"},
        )
    except SupabaseError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"exercise lookup: {e.body}") from e
    exercise_name = ex_rows[0]["name"] if ex_rows else "the lift"

    feedback: list[str] = row.get("feedback") or []
    metrics: dict[str, Any] = row.get("metrics") or {}
    score = row.get("score")

    quiz_json = _call_openai(
        api_key=settings.openai_api_key,
        model=settings.openai_model,
        exercise=exercise_name,
        score=score,
        feedback=feedback,
        metrics=metrics,
    )

    return QuizResponse(
        analysis_id=analysis_id,
        exercise=exercise_name,
        questions=[QuizQuestion(**q) for q in quiz_json["questions"]],
    )


def _call_openai(
    *,
    api_key: str,
    model: str,
    exercise: str,
    score: float | None,
    feedback: list[str],
    metrics: dict[str, Any],
) -> dict[str, Any]:
    client = OpenAI(api_key=api_key)

    feedback_bulleted = "\n".join(f"- {f}" for f in feedback) if feedback else "- (no specific issues flagged)"
    metrics_lines = "\n".join(f"- {k.replace('_', ' ')}: {v}" for k, v in metrics.items() if not isinstance(v, dict))

    system = (
        "You are a strength coach. Given a lifter's form-analysis result, "
        "write a 3-question multiple-choice quiz that reinforces the SPECIFIC "
        "corrections in the feedback. Each question tests understanding of ONE "
        "coaching cue. Keep questions concrete and lift-specific. "
        "Return STRICT JSON matching the schema — no prose, no markdown."
    )
    user_prompt = (
        f"Exercise: {exercise}\n"
        f"Form score: {score if score is not None else 'n/a'} / 100\n\n"
        f"Coach feedback:\n{feedback_bulleted}\n\n"
        f"Key metrics:\n{metrics_lines or '- (none)'}\n\n"
        "Generate 3 questions. Each has exactly 4 choices, one correct. "
        "The explanation should reference the specific cue from the feedback above."
    )
    schema = {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "minItems": 3,
                "maxItems": 3,
                "items": {
                    "type": "object",
                    "properties": {
                        "prompt": {"type": "string"},
                        "choices": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                        "correct_index": {"type": "integer", "minimum": 0, "maximum": 3},
                        "explanation": {"type": "string"},
                    },
                    "required": ["prompt", "choices", "correct_index", "explanation"],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["questions"],
        "additionalProperties": False,
    }

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_prompt},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {"name": "form_quiz", "strict": True, "schema": schema},
            },
            temperature=0.5,
        )
    except Exception as e:  # noqa: BLE001 — surface any OpenAI error as 502
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"OpenAI request failed: {e}") from e

    content = resp.choices[0].message.content or "{}"
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"OpenAI returned malformed JSON: {content[:200]}") from e
