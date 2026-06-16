"""SQLAlchemy models, async engine, and session management.

The schema models a political-promise verification domain:

* :class:`Politician` — a public figure who makes promises.
* :class:`Promise` — a commitment made by a politician.
* :class:`Document` — an uploaded/source document (speech, manifesto, …).
* :class:`Policy` — a concrete policy attributed to a politician.
* :class:`Verification` — the AI (and optionally human) assessment of whether a
  promise was kept, linking a promise to the policy that best evidences it.

All tables use UUID primary keys, declare appropriate indexes for common
lookups, and cascade deletes from a politician down to their owned rows.
"""

from __future__ import annotations

import datetime
import enum
import uuid
from collections.abc import AsyncGenerator

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
)

from config import get_settings

settings = get_settings()

# ---------------------------------------------------------------------------
# Engine & session factory
# ---------------------------------------------------------------------------
# `create_async_engine` with an explicit pool gives us PostgreSQL connection
# pooling out of the box. `pool_pre_ping` transparently recovers from dropped
# connections (common behind cloud load balancers).
#
# Managed Postgres (Neon, Render, etc.) requires TLS. asyncpg takes SSL via a
# connect arg, not the URL's `sslmode` param (which config strips), so pass
# `ssl=True` when the connection string asked for it.
_connect_args: dict = {"ssl": True} if settings.db_ssl else {}
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout,
    pool_recycle=settings.db_pool_recycle,
    pool_pre_ping=True,
    connect_args=_connect_args,
)

# `expire_on_commit=False` keeps attributes accessible after commit so we can
# safely serialize ORM objects in the response layer.
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------
class VerificationStatus(str, enum.Enum):
    """Outcome of analysing whether a promise was fulfilled.

    ``COMPROMISE`` covers promises that were partially kept / watered down — an
    outcome sitting between ``FULFILLED`` and ``BROKEN``.
    """

    FULFILLED = "fulfilled"
    IN_PROGRESS = "in_progress"
    COMPROMISE = "compromise"
    BROKEN = "broken"
    NO_ACTION = "no_action"


class HumanReviewStatus(str, enum.Enum):
    """Lifecycle of optional human oversight of an AI verification."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    NOT_REVIEWED = "not_reviewed"


# ---------------------------------------------------------------------------
# Reusable column helpers
# ---------------------------------------------------------------------------
def _uuid_pk() -> Mapped[uuid.UUID]:
    """A UUID primary-key column with a server-friendly Python default."""
    return mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )


def _created_at() -> Mapped[datetime.datetime]:
    """A timezone-aware creation timestamp set by the database."""
    return mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


def _updated_at() -> Mapped[datetime.datetime]:
    """A timezone-aware update timestamp maintained by the database."""
    return mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class Politician(Base):
    """A political figure who makes promises and implements policies."""

    __tablename__ = "politicians"

    id: Mapped[uuid.UUID] = _uuid_pk()
    # Stable slug (e.g. "emmanuel-macron") for idempotent imports that target a
    # specific politician regardless of name spelling/changes.
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    country: Mapped[str | None] = mapped_column(String(120), index=True)
    party: Mapped[str | None] = mapped_column(String(255), index=True)
    birth_date: Mapped[datetime.date | None] = mapped_column()
    bio: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = _created_at()

    promises: Mapped[list["Promise"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    documents: Mapped[list["Document"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    policies: Mapped[list["Policy"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    work_history: Mapped[list["WorkHistory"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    finances: Mapped[list["FinanceEntry"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    polemics: Mapped[list["Polemic"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    stocks: Mapped[list["StockHolding"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    real_estate: Mapped[list["RealEstate"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    companies: Mapped[list["Company"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    electoral_history: Mapped[list["ElectoralHistory"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    interests: Mapped[list["Interest"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    education: Mapped[list["Education"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    honors: Mapped[list["Honor"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    key_legislation: Mapped[list["KeyLegislation"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    net_worth_timeline: Mapped[list["NetWorthTimeline"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    justice_cases: Mapped[list["JusticeCase"]] = relationship(
        back_populates="politician",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Promise(Base):
    """A commitment publicly made by a politician."""

    __tablename__ = "promises"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Stable external import key (e.g. a source dataset's slug). Lets imports be
    # idempotent: re-running updates the matching promise instead of duplicating.
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    date_made: Mapped[datetime.date | None] = mapped_column(index=True)
    category: Mapped[str | None] = mapped_column(String(120), index=True)
    source_url: Mapped[str | None] = mapped_column(String(1024))
    original_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = _created_at()
    updated_at: Mapped[datetime.datetime] = _updated_at()

    politician: Mapped["Politician"] = relationship(back_populates="promises")
    verifications: Mapped[list["Verification"]] = relationship(
        back_populates="promise",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        # Common dashboard query: a politician's promises in a category.
        Index("ix_promises_politician_category", "politician_id", "category"),
    )


class Document(Base):
    """A source or uploaded document tied to a politician.

    ``raw_text`` holds the text extracted from the uploaded PDF/Word file and is
    what gets fed to Claude during verification.
    """

    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    document_type: Mapped[str | None] = mapped_column(String(120), index=True)
    date_published: Mapped[datetime.date | None] = mapped_column(index=True)
    source_url: Mapped[str | None] = mapped_column(String(1024))
    file_path: Mapped[str | None] = mapped_column(String(1024))
    raw_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = _created_at()

    politician: Mapped["Politician"] = relationship(back_populates="documents")


class Policy(Base):
    """A concrete policy implemented (or attributed to) a politician."""

    __tablename__ = "policies"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    date_implemented: Mapped[datetime.date | None] = mapped_column(index=True)
    category: Mapped[str | None] = mapped_column(String(120), index=True)
    source_url: Mapped[str | None] = mapped_column(String(1024))
    created_at: Mapped[datetime.datetime] = _created_at()

    politician: Mapped["Politician"] = relationship(back_populates="policies")
    verifications: Mapped[list["Verification"]] = relationship(
        back_populates="policy",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("ix_policies_politician_category", "politician_id", "category"),
    )


class Verification(Base):
    """The AI (and optionally human) assessment of a promise.

    Links a :class:`Promise` to the :class:`Policy` that best evidences the
    outcome (nullable — a promise may have seen no relevant policy at all).
    """

    __tablename__ = "verifications"

    id: Mapped[uuid.UUID] = _uuid_pk()
    promise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("promises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Nullable: verification can conclude "no_action" with no linked policy.
    policy_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("policies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status"),
        nullable=False,
        index=True,
    )
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    reasoning: Mapped[str | None] = mapped_column(Text)
    # Bullet-point evidence supporting the verdict (list of short strings).
    key_evidence: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # All source URLs backing the verdict (first is treated as primary).
    source_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # Raw, unparsed Claude output retained for auditability.
    claude_analysis: Mapped[str | None] = mapped_column(Text)
    human_review_status: Mapped[HumanReviewStatus] = mapped_column(
        Enum(HumanReviewStatus, name="human_review_status"),
        nullable=False,
        default=HumanReviewStatus.PENDING,
        index=True,
    )
    verified_date: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    created_at: Mapped[datetime.datetime] = _created_at()
    updated_at: Mapped[datetime.datetime] = _updated_at()

    promise: Mapped["Promise"] = relationship(back_populates="verifications")
    policy: Mapped["Policy | None"] = relationship(back_populates="verifications")


class WorkHistory(Base):
    """A role or position in a politician's career timeline.

    Dates are stored as strings to preserve mixed precision (``1990``,
    ``2012-05``, ``2014-08-26``) and the sentinel ``present`` for ongoing roles.
    """

    __tablename__ = "work_history"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    role: Mapped[str] = mapped_column(String(512), nullable=False)
    organization: Mapped[str | None] = mapped_column(String(512))
    start_date: Mapped[str | None] = mapped_column(String(32))
    end_date: Mapped[str | None] = mapped_column(String(32))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(120), index=True)
    source_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime.datetime] = _created_at()

    politician: Mapped["Politician"] = relationship(back_populates="work_history")


class FinanceEntry(Base):
    """A declared financial figure for a politician.

    ``amount`` is a string to preserve qualifiers like ``approx.`` and currency
    formatting; ``label``/``detail`` carry the declared-vs-estimate wording
    verbatim (e.g. HATVP declarations).
    """

    __tablename__ = "finance_entries"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    year_or_period: Mapped[str | None] = mapped_column(String(64), index=True)
    type: Mapped[str | None] = mapped_column(String(64), index=True)
    label: Mapped[str | None] = mapped_column(String(512))
    amount: Mapped[str | None] = mapped_column(String(255))
    detail: Mapped[str | None] = mapped_column(Text)
    source_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime.datetime] = _created_at()

    politician: Mapped["Politician"] = relationship(back_populates="finances")


class Polemic(Base):
    """A controversy / polemic associated with a politician.

    ``status`` (e.g. ``no_charges`` / ``ongoing`` / ``political`` / ``resolved``)
    is stored as free text rather than an enum so new dataset values never
    require a schema migration. ``description`` and ``key_facts`` are preserved
    verbatim to keep the neutral, allegation-aware framing intact.
    """

    __tablename__ = "polemics"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    # Free text: a controversy's period can carry a verbatim legal timeline
    # (e.g. "...conviction 31 March 2025; appeal verdict scheduled 7 July 2026").
    period: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(120), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(String(64), index=True)
    confidence_score: Mapped[float | None] = mapped_column(Float)
    key_facts: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    source_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime.datetime] = _created_at()

    politician: Mapped["Politician"] = relationship(back_populates="polemics")


class StockHolding(Base):
    """A securities / stock-holding entry from a politician's declarations.

    ``value`` is a string so qualifiers and the sentinel ``None declared`` are
    preserved exactly; ``status`` (declared/estimated/historical/divested/none)
    is free text.
    """

    __tablename__ = "stock_holdings"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    holding: Mapped[str] = mapped_column(String(512), nullable=False)
    type: Mapped[str | None] = mapped_column(String(64), index=True)
    value: Mapped[str | None] = mapped_column(String(255))
    as_of: Mapped[str | None] = mapped_column(String(64))
    detail: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(String(64), index=True)
    source_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime.datetime] = _created_at()

    politician: Mapped["Politician"] = relationship(back_populates="stocks")


class RealEstate(Base):
    """A real-estate entry from a politician's declarations.

    ``value`` and ``transaction_type`` preserve the source wording (including
    ``None declared`` / ``none_declared``) so an explicit declaration of "none"
    reads accurately rather than as missing data.
    """

    __tablename__ = "real_estate"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    property: Mapped[str] = mapped_column(String(512), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    transaction_type: Mapped[str | None] = mapped_column(String(64))
    date: Mapped[str | None] = mapped_column(String(64))
    value: Mapped[str | None] = mapped_column(String(255))
    detail: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(String(64), index=True)
    source_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime.datetime] = _created_at()

    politician: Mapped["Politician"] = relationship(back_populates="real_estate")


class Company(Base):
    """A company / corporate-ownership entry from a politician's declarations."""

    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    entity: Mapped[str] = mapped_column(String(512), nullable=False)
    role: Mapped[str | None] = mapped_column(String(255))
    ownership_stake: Mapped[str | None] = mapped_column(String(255))
    period: Mapped[str | None] = mapped_column(String(64))
    # Free text: a company's status may carry a verbatim legal note
    # (e.g. "subject of judicial investigation ...; disposition unverified").
    status: Mapped[str | None] = mapped_column(Text, index=True)
    detail: Mapped[str | None] = mapped_column(Text)
    source_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime.datetime] = _created_at()

    politician: Mapped["Politician"] = relationship(back_populates="companies")


class ElectoralHistory(Base):
    """An election a politician contested (or a context entry)."""

    __tablename__ = "electoral_history"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    election: Mapped[str] = mapped_column(String(512), nullable=False)
    date: Mapped[str | None] = mapped_column(String(64))
    role_sought: Mapped[str | None] = mapped_column(String(255))
    result: Mapped[str | None] = mapped_column(String(255))
    vote_share: Mapped[str | None] = mapped_column(String(64))
    opponent: Mapped[str | None] = mapped_column(String(255))
    detail: Mapped[str | None] = mapped_column(Text)
    source_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime.datetime] = _created_at()

    politician: Mapped["Politician"] = relationship(back_populates="electoral_history")


class Interest(Base):
    """A declaration-of-interests entry. ``status`` (declared/historical/none)
    is free text; ``value`` may be ``n/a`` and is preserved verbatim."""

    __tablename__ = "interests"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    item: Mapped[str] = mapped_column(String(512), nullable=False)
    type: Mapped[str | None] = mapped_column(String(64), index=True)
    period: Mapped[str | None] = mapped_column(String(120))
    value: Mapped[str | None] = mapped_column(String(255))
    detail: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(String(64), index=True)
    source_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime.datetime] = _created_at()

    politician: Mapped["Politician"] = relationship(back_populates="interests")


class Education(Base):
    """A detailed education entry (breakout of education work-history items)."""

    __tablename__ = "education"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    institution: Mapped[str] = mapped_column(String(512), nullable=False)
    qualification: Mapped[str | None] = mapped_column(String(255))
    field: Mapped[str | None] = mapped_column(String(255))
    years: Mapped[str | None] = mapped_column(String(64))
    detail: Mapped[str | None] = mapped_column(Text)
    source_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime.datetime] = _created_at()

    politician: Mapped["Politician"] = relationship(back_populates="education")


class Honor(Base):
    """An honour/distinction. ``awarded_by`` preserves ex-officio framing."""

    __tablename__ = "honors"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    honor: Mapped[str] = mapped_column(String(512), nullable=False)
    awarded_by: Mapped[str | None] = mapped_column(String(255))
    year: Mapped[str | None] = mapped_column(String(64))
    detail: Mapped[str | None] = mapped_column(Text)
    source_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime.datetime] = _created_at()

    politician: Mapped["Politician"] = relationship(back_populates="honors")


class KeyLegislation(Base):
    """A landmark law associated with a politician."""

    __tablename__ = "key_legislation"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    law_name: Mapped[str] = mapped_column(String(512), nullable=False)
    year: Mapped[str | None] = mapped_column(String(64))
    area: Mapped[str | None] = mapped_column(String(120), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    significance: Mapped[str | None] = mapped_column(Text)
    source_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime.datetime] = _created_at()

    politician: Mapped["Politician"] = relationship(back_populates="key_legislation")


class NetWorthTimeline(Base):
    """A point on a declared-net-worth timeline."""

    __tablename__ = "net_worth_timeline"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    year: Mapped[str | None] = mapped_column(String(64), index=True)
    declared_net_worth: Mapped[str | None] = mapped_column(String(255))
    note: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(String(64), index=True)
    source_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime.datetime] = _created_at()

    politician: Mapped["Politician"] = relationship(back_populates="net_worth_timeline")


class JusticeCase(Base):
    """A judicial / legal-record entry for a politician.

    Models the full lifecycle of a legal matter — from investigation through
    indictment, trial, and final outcome (conviction / acquittal / dismissal /
    appeal). ``type`` and ``status`` are stored as free text (rather than DB
    enums) so a new dataset value never forces a migration; the documented
    vocabularies are: ``type`` ∈ {investigation, indictment, trial, conviction,
    acquittal, dismissal, appeal, civil, other} and ``status`` ∈ {ongoing,
    convicted, acquitted, dismissed, no_charges, appeal_pending, settled, other}.

    ``description``, ``outcome`` and ``presumption_note`` are preserved verbatim
    so the neutral, presumption-of-innocence framing is never altered. The
    importer refuses any record without a source — no unsourced legal claims.
    """

    __tablename__ = "justice_cases"

    id: Mapped[uuid.UUID] = _uuid_pk()
    politician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("politicians.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    case_title: Mapped[str] = mapped_column(Text, nullable=False)
    period: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str | None] = mapped_column(String(64), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(String(64), index=True)
    outcome: Mapped[str | None] = mapped_column(Text)
    court: Mapped[str | None] = mapped_column(Text)
    presumption_note: Mapped[str | None] = mapped_column(Text)
    key_facts: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    source_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime.datetime] = _created_at()

    politician: Mapped["Politician"] = relationship(back_populates="justice_cases")


# ---------------------------------------------------------------------------
# Lifecycle helpers
# ---------------------------------------------------------------------------
async def init_db() -> None:
    """Create all tables if they do not already exist.

    Called on application startup. For real migrations, prefer Alembic; this is
    convenient for development and containerized demos.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # `create_all` does not ALTER existing tables. The politicians table
        # predates the external_id slug column, so add it idempotently here.
        await conn.execute(
            text(
                "ALTER TABLE politicians "
                "ADD COLUMN IF NOT EXISTS external_id VARCHAR(255)"
            )
        )
        # Different source datasets pack variable-length text into short fields
        # (e.g. a multi-term "period"). Widen every VARCHAR column in our content
        # tables to TEXT — a lossless, metadata-only cast in Postgres — so no
        # value can overflow a column length. Idempotent (no-op once TEXT).
        await conn.execute(
            text(
                """
                DO $$
                DECLARE r record;
                BEGIN
                  FOR r IN
                    SELECT table_name, column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND data_type = 'character varying'
                      AND table_name IN (
                        'politicians','promises','verifications','documents',
                        'policies','work_history','education','electoral_history',
                        'finance_entries','net_worth_timeline','real_estate',
                        'companies','stock_holdings','interests','honors',
                        'key_legislation','polemics','justice_cases'
                      )
                  LOOP
                    EXECUTE format(
                      'ALTER TABLE %I ALTER COLUMN %I TYPE TEXT',
                      r.table_name, r.column_name
                    );
                  END LOOP;
                END $$;
                """
            )
        )


async def dispose_engine() -> None:
    """Dispose of the connection pool on shutdown."""
    await engine.dispose()


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding a transactional async session.

    The session is committed if the request handler returns normally and rolled
    back on any exception, then always closed.
    """
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
