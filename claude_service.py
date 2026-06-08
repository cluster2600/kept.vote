"""Claude-powered promise verification.

:class:`ClaudeService` orchestrates the core feature of the system: given a
promise, it gathers the related documents and policies, asks Claude to judge
whether the promise was fulfilled, parses the structured verdict, and persists a
:class:`~database.Verification` row.

Uses the official Anthropic Python SDK (async client) and the latest Claude
model with adaptive thinking.
"""

from __future__ import annotations

import datetime
import json
import uuid

from anthropic import AsyncAnthropic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database import (
    Document,
    Policy,
    Promise,
    Verification,
    VerificationStatus,
)

settings = get_settings()

# Maps the free-form status strings Claude may emit onto our enum. Anything
# unrecognized falls back to NO_ACTION, which is the safe, neutral verdict.
_STATUS_MAP: dict[str, VerificationStatus] = {
    "fulfilled": VerificationStatus.FULFILLED,
    "in_progress": VerificationStatus.IN_PROGRESS,
    "broken": VerificationStatus.BROKEN,
    "no_action": VerificationStatus.NO_ACTION,
}

# Cap how much document text we feed the model per document to control cost and
# stay well within context limits.
_MAX_DOC_CHARS = 8000


class PromiseNotFoundError(LookupError):
    """Raised when the requested promise does not exist."""


class ClaudeConfigurationError(RuntimeError):
    """Raised when the Anthropic API key is not configured."""


class ClaudeAnalysisError(RuntimeError):
    """Raised when Claude's response cannot be parsed into a verdict."""


class ClaudeService:
    """Encapsulates all interaction with the Claude API for verification."""

    def __init__(self, client: AsyncAnthropic | None = None) -> None:
        """Initialize the service.

        Args:
            client: An optional pre-built ``AsyncAnthropic`` client (useful for
                testing). If omitted, one is constructed from configuration.

        Raises:
            ClaudeConfigurationError: If no API key is available.
        """
        if client is not None:
            self._client = client
        else:
            if not settings.anthropic_api_key:
                raise ClaudeConfigurationError(
                    "ANTHROPIC_API_KEY is not set; cannot run verification."
                )
            self._client = AsyncAnthropic(api_key=settings.anthropic_api_key)

        self._model = settings.claude_model
        self._max_tokens = settings.claude_max_tokens

    # -- Public API --------------------------------------------------------
    async def verify_promise(
        self,
        session: AsyncSession,
        promise_id: uuid.UUID,
    ) -> Verification:
        """Verify whether a promise was fulfilled and persist the result.

        Steps:
            1. Fetch the promise (404 if missing).
            2. Retrieve the politician's related documents and policies.
            3. Construct a detailed analysis prompt.
            4. Call the Claude API (adaptive thinking).
            5. Parse the JSON verdict.
            6. Store a :class:`Verification` row and return it.

        Args:
            session: Active async DB session (transaction managed by caller).
            promise_id: The promise to verify.

        Returns:
            The newly created, flushed :class:`Verification`.

        Raises:
            PromiseNotFoundError: If the promise does not exist.
            ClaudeAnalysisError: If Claude's response cannot be parsed.
        """
        promise = await session.get(Promise, promise_id)
        if promise is None:
            raise PromiseNotFoundError(str(promise_id))

        documents = await self._fetch_documents(session, promise.politician_id)
        policies = await self._fetch_policies(session, promise.politician_id)

        prompt = self._build_prompt(promise, documents, policies)
        raw_analysis = await self._call_claude(prompt)
        verdict = self._parse_verdict(raw_analysis)

        # Resolve the relevant policy (if Claude named a valid one).
        policy_id = self._resolve_policy_id(verdict.get("relevant_policy_id"), policies)

        verification = Verification(
            promise_id=promise.id,
            policy_id=policy_id,
            status=self._coerce_status(verdict.get("status")),
            confidence_score=self._coerce_confidence(verdict.get("confidence_score")),
            reasoning=verdict.get("reasoning"),
            claude_analysis=raw_analysis,
            verified_date=datetime.datetime.now(datetime.timezone.utc),
        )
        session.add(verification)
        # Flush to populate server defaults (id, timestamps) before returning.
        await session.flush()
        await session.refresh(verification)
        return verification

    # -- Data gathering ----------------------------------------------------
    @staticmethod
    async def _fetch_documents(
        session: AsyncSession, politician_id: uuid.UUID
    ) -> list[Document]:
        """Return all documents belonging to the promise's politician."""
        result = await session.execute(
            select(Document).where(Document.politician_id == politician_id)
        )
        return list(result.scalars().all())

    @staticmethod
    async def _fetch_policies(
        session: AsyncSession, politician_id: uuid.UUID
    ) -> list[Policy]:
        """Return all policies belonging to the promise's politician."""
        result = await session.execute(
            select(Policy).where(Policy.politician_id == politician_id)
        )
        return list(result.scalars().all())

    # -- Prompt construction ----------------------------------------------
    @staticmethod
    def _build_prompt(
        promise: Promise,
        documents: list[Document],
        policies: list[Policy],
    ) -> str:
        """Assemble the analysis prompt sent to Claude."""
        doc_section = "\n\n".join(
            (
                f"- Title: {d.title}\n"
                f"  Type: {d.document_type or 'n/a'}\n"
                f"  Published: {d.date_published or 'n/a'}\n"
                f"  Excerpt: {(d.raw_text or '').strip()[:_MAX_DOC_CHARS] or 'n/a'}"
            )
            for d in documents
        ) or "None provided."

        policy_section = "\n\n".join(
            (
                f"- Policy ID: {p.id}\n"
                f"  Title: {p.title}\n"
                f"  Category: {p.category or 'n/a'}\n"
                f"  Implemented: {p.date_implemented or 'n/a'}\n"
                f"  Description: {(p.description or '').strip()[:_MAX_DOC_CHARS] or 'n/a'}"
            )
            for p in policies
        ) or "None provided."

        return (
            "You are a rigorous, non-partisan political analyst. Verify whether "
            "the following political promise was fulfilled, using ONLY the "
            "supplied documents and policies as evidence. Be skeptical and "
            "calibrate your confidence to the strength of the evidence.\n\n"
            "PROMISE:\n"
            f"- Title: {promise.title}\n"
            f"- Description: {promise.description or 'n/a'}\n"
            f"- Date made: {promise.date_made or 'n/a'}\n"
            f"- Category: {promise.category or 'n/a'}\n"
            f"- Original text: {(promise.original_text or '').strip()[:_MAX_DOC_CHARS] or 'n/a'}\n\n"
            "DOCUMENTS (relevant speeches, manifestos, reports):\n"
            f"{doc_section}\n\n"
            "POLICIES (concrete policies implemented):\n"
            f"{policy_section}\n\n"
            "Analyze the evidence and respond with a SINGLE JSON object and "
            "nothing else, matching exactly this shape:\n"
            "{\n"
            '  "status": "fulfilled|in_progress|broken|no_action",\n'
            '  "confidence_score": 0.0,\n'
            '  "reasoning": "concise explanation grounded in the evidence",\n'
            '  "key_evidence": ["evidence 1", "evidence 2"],\n'
            '  "relevant_policy_id": "the Policy ID that best evidences the '
            'outcome, or null if none applies"\n'
            "}\n\n"
            "Rules:\n"
            "- confidence_score is a float between 0.0 and 1.0.\n"
            "- relevant_policy_id MUST be one of the Policy IDs listed above, "
            "or null.\n"
            "- Use 'no_action' when there is no evidence of any relevant action."
        )

    # -- Claude call -------------------------------------------------------
    async def _call_claude(self, prompt: str) -> str:
        """Call the Messages API and return the concatenated text response."""
        message = await self._client.messages.create(
            model=self._model,
            max_tokens=self._max_tokens,
            thinking={"type": "adaptive"},
            messages=[{"role": "user", "content": prompt}],
        )
        # Concatenate all text blocks (skipping thinking/other block types).
        return "".join(
            block.text for block in message.content if block.type == "text"
        ).strip()

    # -- Response parsing --------------------------------------------------
    @staticmethod
    def _parse_verdict(raw: str) -> dict:
        """Parse Claude's response text into a verdict dict.

        Tolerates leading/trailing prose by extracting the outermost JSON
        object before decoding.

        Raises:
            ClaudeAnalysisError: If no valid JSON object can be parsed.
        """
        start = raw.find("{")
        end = raw.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ClaudeAnalysisError(
                f"Claude response did not contain JSON: {raw[:200]!r}"
            )
        snippet = raw[start : end + 1]
        try:
            parsed = json.loads(snippet)
        except json.JSONDecodeError as exc:
            raise ClaudeAnalysisError(
                f"Failed to decode Claude JSON: {exc}; raw={snippet[:200]!r}"
            ) from exc
        if not isinstance(parsed, dict):
            raise ClaudeAnalysisError("Claude JSON was not an object.")
        return parsed

    @staticmethod
    def _coerce_status(value: object) -> VerificationStatus:
        """Map a raw status string onto :class:`VerificationStatus`."""
        if isinstance(value, str):
            return _STATUS_MAP.get(value.strip().lower(), VerificationStatus.NO_ACTION)
        return VerificationStatus.NO_ACTION

    @staticmethod
    def _coerce_confidence(value: object) -> float:
        """Clamp the model's confidence into the inclusive range [0, 1]."""
        try:
            score = float(value)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return 0.0
        return max(0.0, min(1.0, score))

    @staticmethod
    def _resolve_policy_id(
        value: object, policies: list[Policy]
    ) -> uuid.UUID | None:
        """Validate that ``value`` names one of the supplied policies."""
        if not value or not isinstance(value, str):
            return None
        try:
            candidate = uuid.UUID(value)
        except ValueError:
            return None
        valid_ids = {p.id for p in policies}
        return candidate if candidate in valid_ids else None
