"""FastAPI application: routes, endpoints, and app lifecycle.

Exposes a REST API for the political-promise verification system:

* CRUD-ish endpoints for politicians, promises, documents, and policies.
* A document upload endpoint that extracts text from PDF/Word files.
* The main ``/api/verify`` endpoint that runs Claude analysis.
* Health and status utility endpoints.

Run locally with: ``uvicorn main:app --reload``
"""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from claude_service import (
    ClaudeAnalysisError,
    ClaudeConfigurationError,
    ClaudeService,
    PromiseNotFoundError,
)
from database import (
    Document,
    Policy,
    Politician,
    Promise,
    Verification,
    dispose_engine,
    get_session,
    init_db,
)
from document_processor import (
    DocumentExtractionError,
    DocumentProcessor,
    UnsupportedDocumentError,
)
from schemas import (
    DocumentRead,
    HealthResponse,
    PolicyCreate,
    PolicyRead,
    PoliticianCreate,
    PoliticianRead,
    PromiseCreate,
    PromiseRead,
    StatusResponse,
    VerificationRead,
    VerifyRequest,
)

settings = get_settings()
document_processor = DocumentProcessor()

# Reusable dependency alias for the async DB session.
DBSession = Annotated[AsyncSession, Depends(get_session)]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: create tables on startup, dispose pool on shutdown."""
    await init_db()
    yield
    await dispose_engine()


app = FastAPI(
    title="Political Promise Verification API",
    description=(
        "Store politicians, promises, documents, and policies, then use Claude "
        "to verify whether promises were fulfilled."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _ensure_politician_exists(
    session: AsyncSession, politician_id: uuid.UUID
) -> Politician:
    """Return the politician or raise a 404 if it does not exist."""
    politician = await session.get(Politician, politician_id)
    if politician is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Politician {politician_id} not found.",
        )
    return politician


# ---------------------------------------------------------------------------
# Politicians
# ---------------------------------------------------------------------------
@app.post(
    "/api/politicians",
    response_model=PoliticianRead,
    status_code=status.HTTP_201_CREATED,
    tags=["politicians"],
)
async def create_politician(
    payload: PoliticianCreate, session: DBSession
) -> Politician:
    """Create a new politician."""
    politician = Politician(**payload.model_dump())
    session.add(politician)
    await session.flush()
    await session.refresh(politician)
    return politician


@app.get(
    "/api/politicians/{politician_id}",
    response_model=PoliticianRead,
    tags=["politicians"],
)
async def get_politician(
    politician_id: uuid.UUID, session: DBSession
) -> Politician:
    """Fetch a single politician by ID."""
    return await _ensure_politician_exists(session, politician_id)


# ---------------------------------------------------------------------------
# Promises
# ---------------------------------------------------------------------------
@app.post(
    "/api/promises",
    response_model=PromiseRead,
    status_code=status.HTTP_201_CREATED,
    tags=["promises"],
)
async def create_promise(payload: PromiseCreate, session: DBSession) -> Promise:
    """Create a new promise for an existing politician."""
    await _ensure_politician_exists(session, payload.politician_id)
    promise = Promise(**payload.model_dump())
    session.add(promise)
    await session.flush()
    await session.refresh(promise)
    return promise


@app.get(
    "/api/promises/{promise_id}",
    response_model=PromiseRead,
    tags=["promises"],
)
async def get_promise(promise_id: uuid.UUID, session: DBSession) -> Promise:
    """Fetch a single promise by ID."""
    promise = await session.get(Promise, promise_id)
    if promise is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise {promise_id} not found.",
        )
    return promise


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------
@app.post(
    "/api/documents/upload",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
    tags=["documents"],
)
async def upload_document(
    session: DBSession,
    politician_id: Annotated[uuid.UUID, Form()],
    title: Annotated[str, Form()],
    file: Annotated[UploadFile, File()],
    document_type: Annotated[str | None, Form()] = None,
    source_url: Annotated[str | None, Form()] = None,
) -> Document:
    """Upload a PDF or Word file, extract its text, and store the document.

    The file is persisted to ``UPLOAD_DIR`` and its extracted text is saved to
    the ``raw_text`` column for later use during verification.
    """
    await _ensure_politician_exists(session, politician_id)

    data = await file.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File exceeds the maximum size of "
                f"{settings.max_upload_bytes} bytes."
            ),
        )

    # Extract text first so a parse failure never leaves an orphaned file.
    try:
        raw_text = await document_processor.extract_text(
            data, file.content_type or "", file.filename or ""
        )
    except UnsupportedDocumentError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except DocumentExtractionError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    file_path = _persist_upload(data, file.filename or "document")

    document = Document(
        politician_id=politician_id,
        title=title,
        document_type=document_type,
        source_url=source_url,
        file_path=file_path,
        raw_text=raw_text,
    )
    session.add(document)
    await session.flush()
    await session.refresh(document)
    return document


def _persist_upload(data: bytes, filename: str) -> str:
    """Write the upload to disk under ``UPLOAD_DIR`` and return its path.

    A UUID prefix prevents collisions; ``os.path.basename`` guards against path
    traversal in the supplied filename.
    """
    import os

    os.makedirs(settings.upload_dir, exist_ok=True)
    safe_name = os.path.basename(filename) or "document"
    path = os.path.join(settings.upload_dir, f"{uuid.uuid4().hex}_{safe_name}")
    with open(path, "wb") as fh:
        fh.write(data)
    return path


# ---------------------------------------------------------------------------
# Policies
# ---------------------------------------------------------------------------
@app.post(
    "/api/policies",
    response_model=PolicyRead,
    status_code=status.HTTP_201_CREATED,
    tags=["policies"],
)
async def create_policy(payload: PolicyCreate, session: DBSession) -> Policy:
    """Create a new policy for an existing politician."""
    await _ensure_politician_exists(session, payload.politician_id)
    policy = Policy(**payload.model_dump())
    session.add(policy)
    await session.flush()
    await session.refresh(policy)
    return policy


# ---------------------------------------------------------------------------
# Verification (main feature)
# ---------------------------------------------------------------------------
@app.post(
    "/api/verify",
    response_model=VerificationRead,
    status_code=status.HTTP_201_CREATED,
    tags=["verification"],
)
async def verify_promise(payload: VerifyRequest, session: DBSession) -> Verification:
    """Run Claude analysis on a promise and return the stored verification."""
    try:
        service = ClaudeService()
    except ClaudeConfigurationError as exc:
        # Misconfiguration is a server-side problem.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc

    try:
        return await service.verify_promise(session, payload.promise_id)
    except PromiseNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise {payload.promise_id} not found.",
        ) from exc
    except ClaudeAnalysisError as exc:
        # Upstream model returned something we couldn't use.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Claude analysis failed: {exc}",
        ) from exc


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health(session: DBSession) -> HealthResponse:
    """Report system health, including a live database connectivity check."""
    try:
        await session.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:  # noqa: BLE001 - report any failure as unhealthy
        db_status = "error"

    return HealthResponse(
        status="ok" if db_status == "ok" else "degraded",
        environment=settings.environment,
        database=db_status,
        claude_configured=bool(settings.anthropic_api_key),
    )


@app.get("/api/status", response_model=StatusResponse, tags=["system"])
async def get_status(session: DBSession) -> StatusResponse:
    """Return aggregate counts across all core resources."""

    async def _count(model) -> int:
        result = await session.execute(select(func.count()).select_from(model))
        return int(result.scalar_one())

    return StatusResponse(
        politicians=await _count(Politician),
        promises=await _count(Promise),
        documents=await _count(Document),
        policies=await _count(Policy),
        verifications=await _count(Verification),
    )
