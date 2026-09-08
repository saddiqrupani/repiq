from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient

from .config import Settings, get_settings

# Supabase gotrue v2.19x+ signs access tokens with ES256 (asymmetric).
# The legacy HS256 shared secret is still accepted as a fallback for old tokens.
_ALLOWED_ALGS = {"ES256", "RS256", "HS256"}


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None


@lru_cache(maxsize=1)
def _jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(f"{url}/auth/v1/.well-known/jwks.json")


def bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    return authorization.split(" ", 1)[1].strip()


def current_user(
    token: str = Depends(bearer_token),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Malformed token: {exc}") from exc

    alg = header.get("alg")
    if alg not in _ALLOWED_ALGS:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Unsupported alg: {alg}")

    try:
        if alg == "HS256":
            key: object = settings.supabase_jwt_secret
        else:
            key = _jwks_client(settings.supabase_url).get_signing_key_from_jwt(token).key
        payload = jwt.decode(
            token,
            key,
            algorithms=[alg],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}") from exc

    return CurrentUser(id=payload["sub"], email=payload.get("email"))
