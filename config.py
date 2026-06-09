"""Application configuration.

Loads settings from environment variables (and a local ``.env`` file via
``python-dotenv``). No credentials are ever hardcoded — every secret comes from
the environment.
"""

from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

# Load variables from a local .env file if present. In production (Docker,
# CI, etc.) the variables are typically injected by the orchestrator and this
# call is a harmless no-op.
load_dotenv()


class Settings:
    """Strongly-typed view over the process environment.

    Attributes are resolved once at construction time. Use :func:`get_settings`
    to obtain a cached singleton instead of instantiating directly.
    """

    def __init__(self) -> None:
        # ---- Core ---------------------------------------------------------
        self.environment: str = os.getenv("ENVIRONMENT", "development")
        self.debug: bool = self.environment != "production"

        # ---- Database -----------------------------------------------------
        # Default points at the docker-compose service; override in .env.
        raw_database_url: str = os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/promises",
        )
        # SQLAlchemy's async engine needs an async driver. Transparently
        # upgrade a plain `postgresql://` URL to use asyncpg, and strip libpq-only
        # query params (sslmode/channel_binding) that asyncpg can't parse — these
        # appear in managed-Postgres URLs like Neon's. SSL is applied via
        # connect_args instead (see `db_ssl`).
        self.database_url, ssl_from_url = self._normalize_async_dsn(
            raw_database_url
        )
        # Whether to require TLS on the DB connection. Derived from the URL's
        # sslmode (Neon uses sslmode=require), overridable via DB_SSL.
        db_ssl_env = os.getenv("DB_SSL")
        if db_ssl_env is not None:
            self.db_ssl: bool = db_ssl_env.strip().lower() in {"1", "true", "yes", "require"}
        else:
            self.db_ssl = ssl_from_url

        # Connection-pool tuning (sensible production defaults).
        self.db_pool_size: int = int(os.getenv("DB_POOL_SIZE", "10"))
        self.db_max_overflow: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
        self.db_pool_timeout: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
        self.db_pool_recycle: int = int(os.getenv("DB_POOL_RECYCLE", "1800"))

        # ---- Claude / Anthropic ------------------------------------------
        self.anthropic_api_key: str | None = os.getenv("ANTHROPIC_API_KEY")
        # Default to the most capable current Claude model. Override per
        # deployment via CLAUDE_MODEL if needed.
        self.claude_model: str = os.getenv("CLAUDE_MODEL", "claude-opus-4-8")
        self.claude_max_tokens: int = int(os.getenv("CLAUDE_MAX_TOKENS", "4096"))

        # ---- CORS ---------------------------------------------------------
        # Comma-separated list of allowed browser origins for the frontend.
        # Defaults cover local Next.js dev. Use "*" to allow any origin.
        self.cors_origins: list[str] = [
            origin.strip()
            for origin in os.getenv(
                "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
            ).split(",")
            if origin.strip()
        ]

        # ---- Uploads ------------------------------------------------------
        self.upload_dir: str = os.getenv("UPLOAD_DIR", "./uploads")
        # 25 MB default ceiling for uploaded documents.
        self.max_upload_bytes: int = int(
            os.getenv("MAX_UPLOAD_BYTES", str(25 * 1024 * 1024))
        )

    @staticmethod
    def _normalize_async_dsn(dsn: str) -> tuple[str, bool]:
        """Return an asyncpg-ready DSN and whether SSL should be required.

        - ``postgres://`` / ``postgresql://`` are rewritten to
          ``postgresql+asyncpg://`` (driver-qualified URLs keep their driver).
        - libpq-only query params asyncpg cannot parse — ``sslmode`` and
          ``channel_binding`` — are stripped. A ``sslmode`` of ``require`` /
          ``verify-ca`` / ``verify-full`` (or ``channel_binding=require``) means
          SSL is required; that's returned as the second tuple element so the
          engine can pass ``connect_args={"ssl": True}`` to asyncpg.

        This makes managed-Postgres URLs (e.g. Neon's
        ``postgresql://u:p@host/db?sslmode=require``) work out of the box.
        """
        from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

        parts = urlsplit(dsn)
        scheme = parts.scheme
        if scheme in ("postgres", "postgresql"):
            scheme = "postgresql+asyncpg"

        ssl_required = False
        kept_params: list[tuple[str, str]] = []
        for key, value in parse_qsl(parts.query, keep_blank_values=True):
            lkey = key.lower()
            if lkey == "sslmode":
                if value.lower() in {"require", "verify-ca", "verify-full"}:
                    ssl_required = True
                continue  # drop — asyncpg doesn't accept sslmode
            if lkey == "channel_binding":
                if value.lower() == "require":
                    ssl_required = True
                continue  # drop — asyncpg doesn't accept channel_binding
            kept_params.append((key, value))

        normalized = urlunsplit(
            (scheme, parts.netloc, parts.path, urlencode(kept_params), parts.fragment)
        )
        return normalized, ssl_required


@lru_cache
def get_settings() -> Settings:
    """Return a process-wide cached :class:`Settings` instance."""
    return Settings()
