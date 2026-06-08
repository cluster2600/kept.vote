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


class PromiseRead(PromiseBase):
    """Promise as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    politician_id: uuid.UUID
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
    """Input to the main verification endpoint."""

    promise_id: uuid.UUID


class VerificationRead(BaseModel):
    """Verification as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    promise_id: uuid.UUID
    policy_id: uuid.UUID | None = None
    status: VerificationStatus
    confidence_score: float
    reasoning: str | None = None
    claude_analysis: str | None = None
    human_review_status: HumanReviewStatus
    verified_date: datetime.datetime | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


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
