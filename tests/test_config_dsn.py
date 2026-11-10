"""Tests for DSN normalization in config.Settings.

``_normalize_async_dsn`` upgrades a plain Postgres URL to asyncpg and strips
the libpq-only query parameters asyncpg cannot parse. It must leave every
other DSN alone: round-tripping a SQLite URL through ``urlsplit``/``urlunsplit``
silently collapses the leading ``//`` of an absolute path — ``sqlite+aiosqlite:
////tmp/x.db`` became ``sqlite+aiosqlite://tmp/x.db``, which SQLAlchemy reads
as a host name — and that broke ``build_d1.py``, which builds the site's data
on a throwaway SQLite database.
"""

from __future__ import annotations

import pytest

from config import Settings

normalize = Settings._normalize_async_dsn


@pytest.mark.parametrize(
    "dsn",
    [
        "sqlite+aiosqlite:////tmp/kept-vote-d1-abc123/build.db",
        "sqlite+aiosqlite:///relative/build.db",
        "sqlite+aiosqlite:///:memory:",
        "sqlite:////var/lib/kept/build.db",
    ],
)
def test_non_postgres_dsn_is_untouched(dsn: str) -> None:
    assert normalize(dsn) == (dsn, False)


@pytest.mark.parametrize(
    "raw, expected",
    [
        (
            "postgresql://postgres:postgres@localhost:5432/promises",
            "postgresql+asyncpg://postgres:postgres@localhost:5432/promises",
        ),
        ("postgres://u:p@host/db", "postgresql+asyncpg://u:p@host/db"),
        # An explicit driver is kept as the caller wrote it.
        ("postgresql+asyncpg://u:p@host/db", "postgresql+asyncpg://u:p@host/db"),
    ],
)
def test_postgres_dsn_gets_async_driver(raw: str, expected: str) -> None:
    assert normalize(raw) == (expected, False)


@pytest.mark.parametrize(
    "sslmode, ssl_required",
    [
        ("require", True),
        ("verify-ca", True),
        ("verify-full", True),
        ("disable", False),
        ("prefer", False),
    ],
)
def test_sslmode_is_stripped_and_reported(sslmode: str, ssl_required: bool) -> None:
    """asyncpg rejects sslmode, so it is removed and surfaced separately."""
    dsn, ssl = normalize(f"postgresql://u:p@host/db?sslmode={sslmode}")
    assert "sslmode" not in dsn
    assert ssl is ssl_required


def test_channel_binding_is_stripped() -> None:
    dsn, ssl = normalize("postgresql://u:p@host/db?channel_binding=require")
    assert "channel_binding" not in dsn
    assert ssl is True


def test_other_query_params_survive() -> None:
    """A managed-Postgres URL keeps the parameters asyncpg does understand."""
    dsn, ssl = normalize(
        "postgresql://u:p@host/db"
        "?sslmode=require&channel_binding=require&application_name=keptvote"
    )
    assert dsn == "postgresql+asyncpg://u:p@host/db?application_name=keptvote"
    assert ssl is True
