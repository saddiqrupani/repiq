"""Thin helpers around Supabase Storage + PostgREST.

We forward the caller's JWT on every call so all reads/writes are RLS-scoped
to that user. No service-role key is used.
"""
from __future__ import annotations

from typing import Any

import httpx


class SupabaseError(Exception):
    def __init__(self, status: int, body: str) -> None:
        super().__init__(f"supabase {status}: {body}")
        self.status = status
        self.body = body


def _headers(token: str, anon_key: str, *, extra: dict[str, str] | None = None) -> dict[str, str]:
    h = {
        "Authorization": f"Bearer {token}",
        "apikey": anon_key,
    }
    if extra:
        h.update(extra)
    return h


def download_object(base_url: str, token: str, anon_key: str, bucket: str, path: str) -> bytes:
    """Fetch an object from a private bucket using the caller's JWT."""
    url = f"{base_url}/storage/v1/object/{bucket}/{path}"
    with httpx.Client(timeout=60.0) as client:
        r = client.get(url, headers=_headers(token, anon_key))
        if r.status_code != 200:
            raise SupabaseError(r.status_code, r.text)
        return r.content


def upload_object(
    base_url: str,
    token: str,
    anon_key: str,
    bucket: str,
    path: str,
    content: bytes,
    content_type: str,
) -> None:
    url = f"{base_url}/storage/v1/object/{bucket}/{path}"
    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            url,
            content=content,
            headers=_headers(token, anon_key, extra={
                "Content-Type": content_type,
                "x-upsert": "true",
            }),
        )
        if r.status_code not in (200, 201):
            raise SupabaseError(r.status_code, r.text)


def rest_get(base_url: str, token: str, anon_key: str, path: str, params: dict[str, str]) -> list[dict[str, Any]]:
    url = f"{base_url}/rest/v1/{path}"
    with httpx.Client(timeout=30.0) as client:
        r = client.get(url, headers=_headers(token, anon_key), params=params)
        if r.status_code != 200:
            raise SupabaseError(r.status_code, r.text)
        return r.json()


def rest_insert(
    base_url: str, token: str, anon_key: str, path: str, row: dict[str, Any]
) -> dict[str, Any]:
    url = f"{base_url}/rest/v1/{path}"
    with httpx.Client(timeout=30.0) as client:
        r = client.post(
            url,
            json=row,
            headers=_headers(token, anon_key, extra={
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            }),
        )
        if r.status_code not in (200, 201):
            raise SupabaseError(r.status_code, r.text)
        data = r.json()
        return data[0] if isinstance(data, list) else data


def rest_patch(
    base_url: str,
    token: str,
    anon_key: str,
    path: str,
    match: dict[str, str],
    updates: dict[str, Any],
) -> dict[str, Any]:
    url = f"{base_url}/rest/v1/{path}"
    params = {k: f"eq.{v}" for k, v in match.items()}
    with httpx.Client(timeout=30.0) as client:
        r = client.patch(
            url,
            json=updates,
            params=params,
            headers=_headers(token, anon_key, extra={
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            }),
        )
        if r.status_code not in (200, 201):
            raise SupabaseError(r.status_code, r.text)
        data = r.json()
        return data[0] if isinstance(data, list) else data
