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
)
from sqlalchemy.dialects.postgresql import UUID
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
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout,
    pool_recycle=settings.db_pool_recycle,
    pool_pre_ping=True,
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
    """Outcome of analysing whether a promise was fulfilled."""

    FULFILLED = "fulfilled"
    IN_PROGRESS = "in_progress"
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
