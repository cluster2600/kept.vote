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
from urllib.parse import urlparse

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
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
    Company,
    Document,
    Education,
    ElectoralHistory,
    FinanceEntry,
    Honor,
    Interest,
    JusticeCase,
    KeyLegislation,
    NetWorthTimeline,
    Policy,
    Politician,
    Polemic,
    Promise,
    RealEstate,
    StockHolding,
    Verification,
    VerificationStatus,
    WorkHistory,
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
    CompanyRead,
    DocumentRead,
    EducationRead,
    ElectoralHistoryRead,
    FinanceEntryRead,
    HealthResponse,
    HonorRead,
    InterestRead,
    JusticeCaseRead,
    KeyLegislationRead,
    NetWorthTimelineRead,
    PolemicRead,
    PolicyCreate,
    PolicyRead,
    PoliticianCreate,
    PoliticianRead,
    PoliticianSummary,
    PromiseCreate,
    PromiseRead,
    PromiseWithVerification,
    RealEstateRead,
    SourceRef,
    SourcesResponse,
    StatusResponse,
    StockHoldingRead,
    VerificationCreate,
    VerificationRead,
    VerifyRequest,
    WorkHistoryRead,
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

# Allow the browser-based frontend (Next.js) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _latest_verifications(
    session: AsyncSession, promise_ids: list[uuid.UUID]
) -> dict[uuid.UUID, Verification]:
    """Return the most recent verification per promise id.

    Promises with no verification are simply absent from the returned mapping.
    """
    if not promise_ids:
        return {}
    result = await session.execute(
        select(Verification)
        .where(Verification.promise_id.in_(promise_ids))
        .order_by(Verification.created_at.asc())
    )
    # Ascending order means later rows overwrite earlier ones, leaving the
    # newest verification per promise as the final value.
    latest: dict[uuid.UUID, Verification] = {}
    for verification in result.scalars().all():
        latest[verification.promise_id] = verification
    return latest
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
    "/api/politicians",
    response_model=list[PoliticianSummary],
    tags=["politicians"],
)
async def list_politicians(session: DBSession) -> list[PoliticianSummary]:
    """List all politicians with aggregate promise/verification counts.

    Powers the public browse view. For each politician, counts reflect the
    *latest* verification status of each of their promises.
    """
    politicians = list(
        (await session.execute(select(Politician).order_by(Politician.name)))
        .scalars()
        .all()
    )

    # Map every promise to its owning politician in one query.
    promise_rows = (
        await session.execute(select(Promise.id, Promise.politician_id))
    ).all()
    promises_by_politician: dict[uuid.UUID, list[uuid.UUID]] = {}
    for promise_id, politician_id in promise_rows:
        promises_by_politician.setdefault(politician_id, []).append(promise_id)

    latest = await _latest_verifications(
        session, [pid for pid, _ in promise_rows]
    )

    summaries: list[PoliticianSummary] = []
    for politician in politicians:
        owned = promises_by_politician.get(politician.id, [])
        counts = {s: 0 for s in VerificationStatus}
        for promise_id in owned:
            verification = latest.get(promise_id)
            if verification is not None:
                counts[verification.status] += 1
        summaries.append(
            PoliticianSummary(
                id=politician.id,
                name=politician.name,
                country=politician.country,
                party=politician.party,
                promise_count=len(owned),
                kept_count=counts[VerificationStatus.FULFILLED],
                broken_count=counts[VerificationStatus.BROKEN],
                in_progress_count=counts[VerificationStatus.IN_PROGRESS],
                compromise_count=counts[VerificationStatus.COMPROMISE],
                no_action_count=counts[VerificationStatus.NO_ACTION],
            )
        )
    return summaries


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


@app.delete(
    "/api/politicians/{politician_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    tags=["politicians"],
)
async def delete_politician(
    politician_id: uuid.UUID, session: DBSession
) -> Response:
    """Delete a politician and (by cascade) their promises, documents,
    policies, and verifications."""
    politician = await _ensure_politician_exists(session, politician_id)
    await session.delete(politician)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get(
    "/api/politicians/{politician_id}/promises",
    response_model=list[PromiseWithVerification],
    tags=["politicians", "promises"],
)
async def list_politician_promises(
    politician_id: uuid.UUID, session: DBSession
) -> list[PromiseWithVerification]:
    """List a politician's promises, each with its latest verification embedded.

    This is the endpoint the front-end relies on to render a politician's
    promise list with status badges and confidence in a single round trip.
    """
    await _ensure_politician_exists(session, politician_id)

    promises = list(
        (
            await session.execute(
                select(Promise)
                .where(Promise.politician_id == politician_id)
                .order_by(Promise.date_made.asc().nulls_last(), Promise.created_at.asc())
            )
        )
        .scalars()
        .all()
    )
    latest = await _latest_verifications(session, [p.id for p in promises])

    return [
        PromiseWithVerification(
            **PromiseRead.model_validate(promise).model_dump(),
            verification=(
                VerificationRead.model_validate(latest[promise.id])
                if promise.id in latest
                else None
            ),
        )
        for promise in promises
    ]


@app.get(
    "/api/politicians/{politician_id}/work-history",
    response_model=list[WorkHistoryRead],
    tags=["politicians", "profile"],
)
async def list_work_history(
    politician_id: uuid.UUID, session: DBSession
) -> list[WorkHistory]:
    """List a politician's career history, most recent role first.

    ``start_date`` strings are year-first (``YYYY`` / ``YYYY-MM`` /
    ``YYYY-MM-DD``), so a lexical descending sort is chronological.
    """
    await _ensure_politician_exists(session, politician_id)
    result = await session.execute(
        select(WorkHistory)
        .where(WorkHistory.politician_id == politician_id)
        .order_by(WorkHistory.start_date.desc().nulls_last())
    )
    return list(result.scalars().all())


@app.get(
    "/api/politicians/{politician_id}/finances",
    response_model=list[FinanceEntryRead],
    tags=["politicians", "profile"],
)
async def list_finances(
    politician_id: uuid.UUID, session: DBSession
) -> list[FinanceEntry]:
    """List a politician's declared finance entries (most recent period first)."""
    await _ensure_politician_exists(session, politician_id)
    result = await session.execute(
        select(FinanceEntry)
        .where(FinanceEntry.politician_id == politician_id)
        .order_by(
            FinanceEntry.year_or_period.desc().nulls_last(),
            FinanceEntry.label.asc(),
        )
    )
    return list(result.scalars().all())


@app.get(
    "/api/politicians/{politician_id}/polemics",
    response_model=list[PolemicRead],
    tags=["politicians", "profile"],
)
async def list_polemics(
    politician_id: uuid.UUID, session: DBSession
) -> list[Polemic]:
    """List a politician's controversies (most recent period first)."""
    await _ensure_politician_exists(session, politician_id)
    result = await session.execute(
        select(Polemic)
        .where(Polemic.politician_id == politician_id)
        .order_by(Polemic.period.desc().nulls_last(), Polemic.title.asc())
    )
    return list(result.scalars().all())


@app.get(
    "/api/politicians/{politician_id}/stocks",
    response_model=list[StockHoldingRead],
    tags=["politicians", "profile"],
)
async def list_stocks(
    politician_id: uuid.UUID, session: DBSession
) -> list[StockHolding]:
    """List a politician's securities / stock-holding declarations."""
    await _ensure_politician_exists(session, politician_id)
    result = await session.execute(
        select(StockHolding)
        .where(StockHolding.politician_id == politician_id)
        .order_by(StockHolding.as_of.desc().nulls_last(), StockHolding.holding.asc())
    )
    return list(result.scalars().all())


@app.get(
    "/api/politicians/{politician_id}/real-estate",
    response_model=list[RealEstateRead],
    tags=["politicians", "profile"],
)
async def list_real_estate(
    politician_id: uuid.UUID, session: DBSession
) -> list[RealEstate]:
    """List a politician's real-estate declarations."""
    await _ensure_politician_exists(session, politician_id)
    result = await session.execute(
        select(RealEstate)
        .where(RealEstate.politician_id == politician_id)
        .order_by(RealEstate.date.desc().nulls_last(), RealEstate.property.asc())
    )
    return list(result.scalars().all())


@app.get(
    "/api/politicians/{politician_id}/companies",
    response_model=list[CompanyRead],
    tags=["politicians", "profile"],
)
async def list_companies(
    politician_id: uuid.UUID, session: DBSession
) -> list[Company]:
    """List a politician's company / ownership declarations."""
    await _ensure_politician_exists(session, politician_id)
    result = await session.execute(
        select(Company)
        .where(Company.politician_id == politician_id)
        .order_by(Company.period.desc().nulls_last(), Company.entity.asc())
    )
    return list(result.scalars().all())


@app.get(
    "/api/politicians/{politician_id}/electoral-history",
    response_model=list[ElectoralHistoryRead],
    tags=["politicians", "profile"],
)
async def list_electoral_history(
    politician_id: uuid.UUID, session: DBSession
) -> list[ElectoralHistory]:
    """List a politician's electoral history (most recent first)."""
    await _ensure_politician_exists(session, politician_id)
    result = await session.execute(
        select(ElectoralHistory)
        .where(ElectoralHistory.politician_id == politician_id)
        .order_by(ElectoralHistory.date.desc().nulls_last())
    )
    return list(result.scalars().all())


@app.get(
    "/api/politicians/{politician_id}/interests",
    response_model=list[InterestRead],
    tags=["politicians", "profile"],
)
async def list_interests(
    politician_id: uuid.UUID, session: DBSession
) -> list[Interest]:
    """List a politician's declaration-of-interests entries (import order)."""
    await _ensure_politician_exists(session, politician_id)
    result = await session.execute(
        select(Interest)
        .where(Interest.politician_id == politician_id)
        .order_by(Interest.created_at.asc())
    )
    return list(result.scalars().all())


@app.get(
    "/api/politicians/{politician_id}/education",
    response_model=list[EducationRead],
    tags=["politicians", "profile"],
)
async def list_education(
    politician_id: uuid.UUID, session: DBSession
) -> list[Education]:
    """List a politician's education entries (chronological / import order)."""
    await _ensure_politician_exists(session, politician_id)
    result = await session.execute(
        select(Education)
        .where(Education.politician_id == politician_id)
        .order_by(Education.created_at.asc())
    )
    return list(result.scalars().all())


@app.get(
    "/api/politicians/{politician_id}/honors",
    response_model=list[HonorRead],
    tags=["politicians", "profile"],
)
async def list_honors(
    politician_id: uuid.UUID, session: DBSession
) -> list[Honor]:
    """List a politician's honours and distinctions (most recent first)."""
    await _ensure_politician_exists(session, politician_id)
    result = await session.execute(
        select(Honor)
        .where(Honor.politician_id == politician_id)
        .order_by(Honor.year.desc().nulls_last(), Honor.honor.asc())
    )
    return list(result.scalars().all())


@app.get(
    "/api/politicians/{politician_id}/key-legislation",
    response_model=list[KeyLegislationRead],
    tags=["politicians", "profile"],
)
async def list_key_legislation(
    politician_id: uuid.UUID, session: DBSession
) -> list[KeyLegislation]:
    """List landmark legislation associated with a politician (chronological)."""
    await _ensure_politician_exists(session, politician_id)
    result = await session.execute(
        select(KeyLegislation)
        .where(KeyLegislation.politician_id == politician_id)
        .order_by(KeyLegislation.year.asc().nulls_last(), KeyLegislation.law_name.asc())
    )
    return list(result.scalars().all())


@app.get(
    "/api/politicians/{politician_id}/net-worth",
    response_model=list[NetWorthTimelineRead],
    tags=["politicians", "profile"],
)
async def list_net_worth(
    politician_id: uuid.UUID, session: DBSession
) -> list[NetWorthTimeline]:
    """List a politician's declared-net-worth timeline (chronological)."""
    await _ensure_politician_exists(session, politician_id)
    result = await session.execute(
        select(NetWorthTimeline)
        .where(NetWorthTimeline.politician_id == politician_id)
        .order_by(NetWorthTimeline.year.asc().nulls_last())
    )
    return list(result.scalars().all())


@app.get(
    "/api/politicians/{politician_id}/justice",
    response_model=list[JusticeCaseRead],
    tags=["politicians", "profile"],
)
async def list_justice(
    politician_id: uuid.UUID, session: DBSession
) -> list[JusticeCase]:
    """List a politician's judicial / legal-record entries (import order).

    Each entry carries its own status (ongoing / convicted / acquitted /
    dismissed / no_charges / appeal_pending / settled) and a verbatim
    presumption-of-innocence note. The importer guarantees every row is sourced.
    """
    await _ensure_politician_exists(session, politician_id)
    result = await session.execute(
        select(JusticeCase)
        .where(JusticeCase.politician_id == politician_id)
        .order_by(JusticeCase.created_at.asc())
    )
    return list(result.scalars().all())


def _domain(url: str) -> str:
    """Return a clean hostname (no leading ``www.``) for grouping/display."""
    try:
        netloc = urlparse(url).netloc.lower()
    except ValueError:
        return ""
    return netloc[4:] if netloc.startswith("www.") else netloc


@app.get(
    "/api/politicians/{politician_id}/sources",
    response_model=SourcesResponse,
    tags=["politicians", "profile"],
)
async def list_sources(
    politician_id: uuid.UUID, session: DBSession
) -> SourcesResponse:
    """Aggregate every unique source URL backing a politician's records.

    Unions source URLs across promises (and their verifications), work history,
    finances, stock holdings, real estate, companies, and controversies, then
    deduplicates by URL. Each URL records which sections rely on it. Counts are
    computed live from the database — never hardcoded.
    """
    await _ensure_politician_exists(session, politician_id)

    # url -> set of section keys that cite it
    by_url: dict[str, set[str]] = {}

    def add(urls: object, section: str) -> None:
        if not isinstance(urls, (list, tuple)):
            return
        for url in urls:
            if isinstance(url, str) and url.strip():
                by_url.setdefault(url.strip(), set()).add(section)

    # Promises: the promise's primary source_url plus its verification sources.
    promises = list(
        (
            await session.execute(
                select(Promise).where(Promise.politician_id == politician_id)
            )
        )
        .scalars()
        .all()
    )
    for promise in promises:
        if promise.source_url:
            add([promise.source_url], "promises")
    promise_ids = [p.id for p in promises]
    if promise_ids:
        verifications = (
            await session.execute(
                select(Verification).where(
                    Verification.promise_id.in_(promise_ids)
                )
            )
        ).scalars().all()
        for verification in verifications:
            add(verification.source_urls, "promises")

    # Profile sections: each row carries a source_urls JSONB array.
    section_models = [
        ("work_history", WorkHistory),
        ("finances", FinanceEntry),
        ("stocks", StockHolding),
        ("real_estate", RealEstate),
        ("companies", Company),
        ("controversies", Polemic),
        ("electoral_history", ElectoralHistory),
        ("interests", Interest),
        ("education", Education),
        ("honors", Honor),
        ("key_legislation", KeyLegislation),
        ("net_worth", NetWorthTimeline),
        ("justice", JusticeCase),
    ]
    for section, model in section_models:
        rows = (
            await session.execute(
                select(model).where(model.politician_id == politician_id)
            )
        ).scalars().all()
        for row in rows:
            add(row.source_urls, section)

    sources = [
        SourceRef(url=url, domain=_domain(url), sections=sorted(sections))
        for url, sections in by_url.items()
    ]
    # Stable order: group by domain, then URL.
    sources.sort(key=lambda s: (s.domain, s.url))

    return SourcesResponse(
        total=len(sources),
        domain_count=len({s.domain for s in sources}),
        sources=sources,
    )


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


@app.get(
    "/api/promises/{promise_id}/verification",
    response_model=VerificationRead | None,
    tags=["promises", "verification"],
)
async def get_promise_verification(
    promise_id: uuid.UUID, session: DBSession
) -> Verification | None:
    """Return a promise's latest verification, or ``null`` if none exists."""
    promise = await session.get(Promise, promise_id)
    if promise is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise {promise_id} not found.",
        )
    latest = await _latest_verifications(session, [promise_id])
    return latest.get(promise_id)


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
    "/api/verifications",
    response_model=VerificationRead,
    status_code=status.HTTP_201_CREATED,
    tags=["verification"],
)
async def create_verification(
    payload: VerificationCreate, session: DBSession
) -> Verification:
    """Record a curated (human) verification for a promise.

    The editorial counterpart to the AI-driven ``/api/verify`` endpoint. Used by
    the seed script to load vetted fact-checks deterministically.
    """
    import datetime

    promise = await session.get(Promise, payload.promise_id)
    if promise is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise {payload.promise_id} not found.",
        )
    if payload.policy_id is not None:
        policy = await session.get(Policy, payload.policy_id)
        if policy is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Policy {payload.policy_id} not found.",
            )

    verification = Verification(
        promise_id=payload.promise_id,
        policy_id=payload.policy_id,
        status=payload.status,
        confidence_score=payload.confidence_score,
        reasoning=payload.reasoning,
        key_evidence=payload.key_evidence,
        source_urls=payload.source_urls,
        human_review_status=payload.human_review_status,
        verified_date=datetime.datetime.now(datetime.timezone.utc),
    )
    session.add(verification)
    await session.flush()
    await session.refresh(verification)
    return verification


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
