from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth import CurrentUser, current_user
from .form import router as form_router
from .quiz import router as quiz_router

app = FastAPI(title="RepIQ API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/me")
def me(user: CurrentUser = Depends(current_user)) -> dict:
    return {"user_id": user.id, "email": user.email}


app.include_router(form_router)
app.include_router(quiz_router)
