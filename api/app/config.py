import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    supabase_url: str
    supabase_jwt_secret: str
    supabase_anon_key: str
    api_host: str
    api_port: int
    openai_api_key: str | None
    openai_model: str

    def __init__(self) -> None:
        self.supabase_url = _required("SUPABASE_URL")
        self.supabase_jwt_secret = _required("SUPABASE_JWT_SECRET")
        self.supabase_anon_key = _required("SUPABASE_ANON_KEY")
        self.api_host = os.getenv("API_HOST", "127.0.0.1")
        self.api_port = int(os.getenv("API_PORT", "8000"))
        # Optional so the API still boots without a key; quiz endpoint returns 503.
        self.openai_api_key = os.getenv("OPENAI_API_KEY") or None
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing env var {name}. Copy api/.env.example to api/.env.")
    return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
