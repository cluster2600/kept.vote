"""Pydantic v2 schemas for request validation and response serialization.

Each resource has:

* a ``*Create`` schema validating incoming payloads, and
* a ``*Read`` schema (with ``from_attributes=True``) for serializing ORM rows.

Read schemas all expose ``id`` plus relevant ``created_at`` / ``updated_at``
timestamps, per the API contract.
"""

from __future__ import annotations

import datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field

from database import HumanReviewStatus, VerificationStatus

# ---------------------------------------------------------------------------
# Politicians
# ---------------------------------------------------------------------------
class PoliticianBase(BaseModel):
    """Shared politician fields."""

    name: str = Field(..., min_length=1, max_length=255)
    country: str | None = Field(default=None, max_length=120)
    party: str | None = Field(default=None, max_length=255)
    birth_date: datetime.date | None = None
    bio: str | None = None


class PoliticianCreate(PoliticianBase):
    """Payload for creating a politician."""


class PoliticianRead(PoliticianBase):
    """Politician as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime.datetime


class PoliticianSummary(BaseModel):
    """Politician with aggregate promise counts, for list/browse views."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    country: str | None = None
    party: str | None = None
    promise_count: int = 0
    kept_count: int = 0
    broken_count: int = 0
    in_progress_count: int = 0
    compromise_count: int = 0
    no_action_count: int = 0


# ---------------------------------------------------------------------------
# Promises
# ---------------------------------------------------------------------------
class PromiseBase(BaseModel):
    """Shared promise fields."""

    title: str = Field(..., min_length=1, max_length=512)
    description: str | None = None
    date_made: datetime.date | None = None
    category: str | None = Field(default=None, max_length=120)
    source_url: str | None = Field(default=None, max_length=1024)
    original_text: str | None = None


class PromiseCreate(PromiseBase):
    """Payload for creating a promise. Must reference an existing politician."""

    politician_id: uuid.UUID
    external_id: str | None = Field(default=None, max_length=255)


class PromiseRead(PromiseBase):
    """Promise as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
    external_id: str | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------
class DocumentRead(BaseModel):
    """Document as returned by the API (after text extraction)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
    title: str
    document_type: str | None = None
    date_published: datetime.date | None = None
    source_url: str | None = None
    file_path: str | None = None
    raw_text: str | None = None
    created_at: datetime.datetime


# ---------------------------------------------------------------------------
# Policies
# ---------------------------------------------------------------------------
class PolicyBase(BaseModel):
    """Shared policy fields."""

    title: str = Field(..., min_length=1, max_length=512)
    description: str | None = None
    date_implemented: datetime.date | None = None
    category: str | None = Field(default=None, max_length=120)
    source_url: str | None = Field(default=None, max_length=1024)


class PolicyCreate(PolicyBase):
    """Payload for creating a policy. Must reference an existing politician."""

    politician_id: uuid.UUID


class PolicyRead(PolicyBase):
    """Policy as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
    created_at: datetime.datetime


# ---------------------------------------------------------------------------
# Verifications
# ---------------------------------------------------------------------------
class VerifyRequest(BaseModel):
    """Input to the AI verification endpoint."""

    promise_id: uuid.UUID


class VerificationCreate(BaseModel):
    """Payload for recording a curated (human) verification of a promise.

    Complements the AI-driven ``/api/verify`` flow: lets editors enter vetted
    fact-checks directly. Used by the seed script.
    """

    promise_id: uuid.UUID
    policy_id: uuid.UUID | None = None
    status: VerificationStatus
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    reasoning: str | None = None
    key_evidence: list[str] | None = None
    source_urls: list[str] | None = None
    # Manually entered verifications are vetted by definition.
    human_review_status: HumanReviewStatus = HumanReviewStatus.APPROVED


class VerificationRead(BaseModel):
    """Verification as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    promise_id: uuid.UUID
    policy_id: uuid.UUID | None = None
    status: VerificationStatus
    confidence_score: float
    reasoning: str | None = None
    key_evidence: list[str] | None = None
    source_urls: list[str] | None = None
    claude_analysis: str | None = None
    human_review_status: HumanReviewStatus
    verified_date: datetime.datetime | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class PromiseWithVerification(PromiseRead):
    """A promise plus its latest verification (``None`` if not yet verified).

    Powers the politician detail view, which renders each promise with its
    status badge, confidence, and evidence in a single response.
    """

    verification: VerificationRead | None = None


# ---------------------------------------------------------------------------
# Profile sections: work history, finances, controversies
# ---------------------------------------------------------------------------
class WorkHistoryRead(BaseModel):
    """A career role/position as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
    external_id: str | None = None
    role: str
    organization: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None
    category: str | None = None
    source_urls: list[str] | None = None
    created_at: datetime.datetime


class FinanceEntryRead(BaseModel):
    """A declared financial figure as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
    external_id: str | None = None
    year_or_period: str | None = None
    type: str | None = None
    label: str | None = None
    amount: str | None = None
    detail: str | None = None
    source_urls: list[str] | None = None
    created_at: datetime.datetime


class PolemicRead(BaseModel):
    """A controversy / polemic as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
    external_id: str | None = None
    title: str
    period: str | None = None
    category: str | None = None
    description: str | None = None
    status: str | None = None
    confidence_score: float | None = None
    key_facts: list[str] | None = None
    source_urls: list[str] | None = None
    created_at: datetime.datetime


class StockHoldingRead(BaseModel):
    """A securities / stock-holding entry as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
    external_id: str | None = None
    holding: str
    type: str | None = None
    value: str | None = None
    as_of: str | None = None
    detail: str | None = None
    status: str | None = None
    source_urls: list[str] | None = None
    created_at: datetime.datetime


class RealEstateRead(BaseModel):
    """A real-estate entry as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
    external_id: str | None = None
    property: str
    location: str | None = None
    transaction_type: str | None = None
    date: str | None = None
    value: str | None = None
    detail: str | None = None
    status: str | None = None
    source_urls: list[str] | None = None
    created_at: datetime.datetime


class CompanyRead(BaseModel):
    """A company / ownership entry as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
    external_id: str | None = None
    entity: str
    role: str | None = None
    ownership_stake: str | None = None
    period: str | None = None
    status: str | None = None
    detail: str | None = None
    source_urls: list[str] | None = None
    created_at: datetime.datetime


# ---------------------------------------------------------------------------
# Extended profile sections
# ---------------------------------------------------------------------------
class ElectoralHistoryRead(BaseModel):
    """An electoral-history entry as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
    external_id: str | None = None
    election: str
    date: str | None = None
    role_sought: str | None = None
    result: str | None = None
    vote_share: str | None = None
    opponent: str | None = None
    detail: str | None = None
    source_urls: list[str] | None = None
    created_at: datetime.datetime


class InterestRead(BaseModel):
    """A declaration-of-interests entry as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
    external_id: str | None = None
    item: str
    type: str | None = None
    period: str | None = None
    value: str | None = None
    detail: str | None = None
    status: str | None = None
    source_urls: list[str] | None = None
    created_at: datetime.datetime


class EducationRead(BaseModel):
    """An education entry as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
    external_id: str | None = None
    institution: str
    qualification: str | None = None
    field: str | None = None
    years: str | None = None
    detail: str | None = None
    source_urls: list[str] | None = None
    created_at: datetime.datetime


class HonorRead(BaseModel):
    """An honour/distinction entry as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
    external_id: str | None = None
    honor: str
    awarded_by: str | None = None
    year: str | None = None
    detail: str | None = None
    source_urls: list[str] | None = None
    created_at: datetime.datetime


class KeyLegislationRead(BaseModel):
    """A key-legislation entry as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
    external_id: str | None = None
    law_name: str
    year: str | None = None
    area: str | None = None
    description: str | None = None
    significance: str | None = None
    source_urls: list[str] | None = None
    created_at: datetime.datetime


class NetWorthTimelineRead(BaseModel):
    """A net-worth-timeline point as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
    external_id: str | None = None
    year: str | None = None
    declared_net_worth: str | None = None
    note: str | None = None
    status: str | None = None
    source_urls: list[str] | None = None
    created_at: datetime.datetime


# ---------------------------------------------------------------------------
# Aggregated sources
# ---------------------------------------------------------------------------
class SourceRef(BaseModel):
    """A single unique source URL and which record sections rely on it."""

    url: str
    domain: str
    # Section keys this URL backs, e.g. "promises", "finances", "controversies".
    sections: list[str]


class SourcesResponse(BaseModel):
    """The deduplicated union of every source URL across a politician."""

    total: int
    domain_count: int
    sources: list[SourceRef]


# ---------------------------------------------------------------------------
# Utility / system schemas
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    """System health payload for ``GET /health``."""

    status: str
    environment: str
    database: str
    claude_configured: bool


class StatusResponse(BaseModel):
    """Aggregate counts for ``GET /api/status``."""

    politicians: int
    promises: int
    documents: int
    policies: int
    verifications: int
