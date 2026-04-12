"""Targeted unit coverage for research router helper logic."""

from types import SimpleNamespace

import pytest

import routers.research as research_router
from routers.research import ChunkForRAG, ResearchQuery


def _sample_chunk(relevance: float = 0.9) -> ChunkForRAG:
    return ChunkForRAG(
        chunk_id="c1",
        document_id="d1",
        document_name="Doc One",
        text="Clause text for source citation.",
        page_number=12,
        relevance_score=relevance,
    )


def test_coerce_helpers_cover_bounds_and_invalid_values() -> None:
    assert research_router._coerce_float("0.75", 0.2) == 0.75
    assert research_router._coerce_float("-3", 0.2) == 0.0
    assert research_router._coerce_float("9", 0.2) == 1.0
    assert research_router._coerce_float("bad", 0.2) == 0.2

    assert research_router._coerce_int("42") == 42
    assert research_router._coerce_int(None) is None
    assert research_router._coerce_int("not-int") is None


def test_score_answer_confidence_handles_empty_and_evidence_paths() -> None:
    assert research_router.score_answer_confidence("   ", [], None) == 0.0
    assert research_router.score_answer_confidence("Basic answer", [], None) == 0.2

    confidence = research_router.score_answer_confidence(
        answer="This is supported by [Source 1] and [Source 2].",
        chunks=[_sample_chunk(0.9), _sample_chunk(0.8)],
        jurisdiction="DL",
    )
    assert 0.6 <= confidence <= 0.95


def test_build_chunks_from_payload_normalizes_dict_and_string_inputs() -> None:
    payload = [
        {
            "chunk_id": "chunk-123",
            "document_id": "doc-123",
            "document_name": "Supreme Court Order",
            "text": "Important clause text.",
            "page_number": "9",
            "relevance_score": "0.88",
            "source_type": "court_case",
            "source_url": "https://example.test/judgment",
            "court_type": "Supreme Court",
            "judgment_year": "2024",
            "source_verified": True,
            "language": "hi",
        },
        "  fallback string chunk  ",
    ]
    chunks = research_router.build_chunks_from_payload(payload, "  api context  ", 10)

    assert len(chunks) == 3
    assert chunks[0].source_type == "gateway_context"
    assert chunks[1].chunk_id == "chunk-123"
    assert chunks[1].page_number == 9
    assert chunks[1].court_type == "Supreme Court"
    assert chunks[1].judgment_year == 2024
    assert chunks[2].source_type == "gateway_chunk"


@pytest.mark.asyncio
async def test_get_relevant_chunks_requires_api_provided_context() -> None:
    with pytest.raises(NotImplementedError):
        await research_router.get_relevant_chunks(
            query="indemnity cap",
            query_embedding=[0.1, 0.2],
            document_ids=None,
            matter_id="m1",
            max_results=10,
            pg_connection_string="",
        )


@pytest.mark.asyncio
async def test_generate_research_answer_success_and_error_paths(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_retry_success(_func, config):
        assert config == research_router.LLM_RETRY_CONFIG
        return {"response": "Answer with [Source 1] support."}

    monkeypatch.setattr(research_router, "retry_with_backoff", fake_retry_success)
    answer, confidence = await research_router.generate_research_answer(
        query="What is indemnity?",
        chunks=[_sample_chunk()],
        jurisdiction="MH",
        response_language="en",
        ollama_url="http://unused",
        model="mock-model",
        timeout=10,
    )
    assert "Answer with" in answer
    assert confidence > 0

    async def fake_retry_failure(_func, config):
        raise RuntimeError("Ollama error: 503")

    monkeypatch.setattr(research_router, "retry_with_backoff", fake_retry_failure)
    fallback_answer, fallback_confidence = await research_router.generate_research_answer(
        query="What is indemnity?",
        chunks=[_sample_chunk()],
        jurisdiction=None,
        response_language="en",
        ollama_url="http://unused",
        model="mock-model",
        timeout=10,
    )
    assert fallback_answer == "Research service temporarily unavailable."
    assert fallback_confidence == 0.0


@pytest.mark.asyncio
async def test_research_stream_alias_forces_stream_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, bool] = {}

    async def fake_research(_request, body):
        captured["stream"] = body.stream
        return {"ok": True}

    monkeypatch.setattr(research_router, "research", fake_research)
    result = await research_router.research_stream(
        request=SimpleNamespace(),
        body=ResearchQuery(query="test", stream=False),
    )

    assert result == {"ok": True}
    assert captured["stream"] is True
