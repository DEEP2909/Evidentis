"""
EvidentIS AI Service - Research Router
Semantic legal research with RAG (Retrieval Augmented Generation).
"""

import json
import logging
import re
from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from explainability import explain_research_result
from llm_safety import RetryConfig, extract_ollama_text, retry_with_backoff
from prompts import RESEARCH_QUERY, add_safety_guardrails

logger = logging.getLogger(__name__)

router = APIRouter()

LLM_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    initial_delay=1.0,
    max_delay=10.0,
    exponential_base=2.0,
)


class ResearchQuery(BaseModel):
    """Research query model."""
    query: Optional[str] = Field(default=None, description="Legal research question", max_length=2000)
    question: Optional[str] = Field(default=None, description="Compatibility alias for query", max_length=2000)
    matter_id: Optional[str] = Field(default=None, description="Matter context for the search")
    document_ids: Optional[List[str]] = Field(
        default=None,
        description="Limit search to specific documents"
    )
    jurisdiction: Optional[str] = Field(
        default=None,
        description="Indian state or UT jurisdiction filter (e.g., 'DL', 'MH')"
    )
    max_results: int = Field(default=10, ge=1, le=50)
    include_citations: bool = Field(default=True)
    stream: bool = Field(default=False, description="Stream the response via SSE")
    chunks: Optional[List[str | Dict[str, Any]]] = Field(default=None, description="Pre-retrieved chunk payloads from API layer")
    context: Optional[str] = Field(default=None, description="Optional synthesized context from API layer")
    language: str = Field(default="en", max_length=16, description="Requested response language code")


class Citation(BaseModel):
    """Citation for research answer."""
    document_id: str
    document_name: str
    chunk_id: str
    text_excerpt: str
    page_number: Optional[int] = None
    relevance_score: float
    source_type: Optional[str] = None
    source_url: Optional[str] = None
    court_type: Optional[str] = None
    judgment_year: Optional[int] = None
    source_verified: bool = False
    language: Optional[str] = None


class ResearchResult(BaseModel):
    """Non-streaming research result."""
    query: str
    answer: str
    citations: List[Citation]
    confidence: float
    jurisdiction: Optional[str]
    explanation: Optional[Dict[str, Any]] = Field(default=None, description="Explainability data for the research result")


class ChunkForRAG(BaseModel):
    """Document chunk for RAG context."""
    chunk_id: str
    document_id: str
    document_name: str
    text: str
    page_number: Optional[int]
    relevance_score: float
    source_type: Optional[str] = None
    source_url: Optional[str] = None
    court_type: Optional[str] = None
    judgment_year: Optional[int] = None
    source_verified: bool = False
    language: Optional[str] = None


def _coerce_float(value: Any, default: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    if parsed < 0:
        return 0.0
    if parsed > 1:
        return 1.0
    return parsed


def _coerce_int(value: Any) -> Optional[int]:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def score_answer_confidence(
    answer: str,
    chunks: List[ChunkForRAG],
    jurisdiction: Optional[str],
) -> float:
    """Derive confidence from retrieval quality and answer evidence."""
    if not answer.strip():
        return 0.0
    if not chunks:
        return 0.2

    avg_relevance = sum(chunk.relevance_score for chunk in chunks) / len(chunks)
    source_coverage = min(len(chunks), 8) / 8
    citation_bonus = 0.06 if re.search(r"\[Source\s+\d+\]", answer) else 0.0
    jurisdiction_bonus = 0.04 if jurisdiction else 0.0
    answer_quality = min(len(answer.strip()) / 500, 1.0) * 0.05

    confidence = (
        0.35
        + (avg_relevance * 0.35)
        + (source_coverage * 0.15)
        + citation_bonus
        + jurisdiction_bonus
        + answer_quality
    )
    return round(max(0.05, min(confidence, 0.95)), 2)


def build_chunks_from_payload(
    chunks: Optional[List[str | Dict[str, Any]]],
    context: Optional[str],
    max_results: int,
) -> List[ChunkForRAG]:
    """Normalize pre-retrieved chunk payloads from the API gateway."""
    prepared_chunks: List[ChunkForRAG] = []

    if context and context.strip():
        prepared_chunks.append(
            ChunkForRAG(
                chunk_id="api-context",
                document_id="api-context",
                document_name="Gateway Context",
                text=context.strip(),
                page_number=None,
                relevance_score=1.0,
                source_type="gateway_context",
            )
        )

    if not chunks:
        return prepared_chunks

    for index, chunk_value in enumerate(chunks[:max_results], start=1):
        if isinstance(chunk_value, dict):
            raw_text = (
                chunk_value.get("text")
                or chunk_value.get("text_content")
                or chunk_value.get("textExcerpt")
                or chunk_value.get("text_excerpt")
                or chunk_value.get("snippet")
                or ""
            )
            cleaned = str(raw_text).strip()
            if not cleaned:
                continue

            chunk_id = str(
                chunk_value.get("chunk_id")
                or chunk_value.get("chunkId")
                or chunk_value.get("id")
                or f"api-{index}"
            )
            document_id = str(
                chunk_value.get("document_id")
                or chunk_value.get("documentId")
                or f"api-{index}"
            )
            document_name = str(
                chunk_value.get("document_name")
                or chunk_value.get("documentName")
                or chunk_value.get("title")
                or f"Retrieved Chunk {index}"
            )
            relevance_score = _coerce_float(
                chunk_value.get("relevance_score", chunk_value.get("relevance")),
                max(0.2, 1 - (index * 0.02)),
            )
            page_number = _coerce_int(chunk_value.get("page_number", chunk_value.get("pageNumber")))
            judgment_year = _coerce_int(chunk_value.get("judgment_year", chunk_value.get("judgmentYear")))
            source_verified = bool(chunk_value.get("source_verified", chunk_value.get("sourceVerified", False)))
            source_type = (
                str(chunk_value.get("source_type", chunk_value.get("sourceType")))
                if chunk_value.get("source_type", chunk_value.get("sourceType")) is not None
                else None
            )
            source_url = (
                str(chunk_value.get("source_url", chunk_value.get("sourceUrl")))
                if chunk_value.get("source_url", chunk_value.get("sourceUrl")) is not None
                else None
            )
            court_type = (
                str(chunk_value.get("court_type", chunk_value.get("courtType")))
                if chunk_value.get("court_type", chunk_value.get("courtType")) is not None
                else None
            )
            language = (
                str(chunk_value.get("language"))
                if chunk_value.get("language") is not None
                else None
            )

            prepared_chunks.append(
                ChunkForRAG(
                    chunk_id=chunk_id,
                    document_id=document_id,
                    document_name=document_name,
                    text=cleaned,
                    page_number=page_number,
                    relevance_score=relevance_score,
                    source_type=source_type,
                    source_url=source_url,
                    court_type=court_type,
                    judgment_year=judgment_year,
                    source_verified=source_verified,
                    language=language,
                )
            )
            continue

        cleaned = str(chunk_value).strip()
        if not cleaned:
            continue

        prepared_chunks.append(
            ChunkForRAG(
                chunk_id=f"api-{index}",
                document_id=f"api-{index}",
                document_name=f"Retrieved Chunk {index}",
                text=cleaned,
                page_number=None,
                relevance_score=max(0.2, 1 - (index * 0.02)),
                source_type="gateway_chunk",
            )
        )

    return prepared_chunks


async def get_relevant_chunks(
    query: str,
    query_embedding: List[float],
    document_ids: Optional[List[str]],
    matter_id: str,
    max_results: int,
    pg_connection_string: str
) -> List[ChunkForRAG]:
    """
    Retrieve relevant document chunks using pgvector similarity search.

    This service currently expects chunks to be provided by the API layer.
    """
    if not pg_connection_string:
        logger.warning(
            "Research retrieval called without pg_connection_string. "
            "API layer should pass pre-fetched chunks/context."
        )
        raise NotImplementedError(
            "Direct DB retrieval is not configured for ai-service. "
            "Pass chunks/context from the API layer."
        )

    raise NotImplementedError(
        "Direct DB retrieval path is not implemented yet. "
        "Pass chunks/context from the API layer."
    )


async def generate_research_answer_stream(
    query: str,
    chunks: List[ChunkForRAG],
    jurisdiction: Optional[str],
    response_language: str,
    ollama_url: str,
    model: str,
    timeout: int
) -> AsyncGenerator[str, None]:
    """
    Generate streaming research answer using RAG.
    Yields Server-Sent Events.
    """
    # Deduplicate chunks by first 100 chars
    seen_keys = set()
    unique_chunks = []
    for chunk in chunks:
        key = chunk.text[:100]
        if key not in seen_keys:
            seen_keys.add(key)
            # Trim chunk to ~600 tokens (~2400 chars)
            trimmed_text = chunk.text[:2400]
            chunk.text = trimmed_text
            unique_chunks.append(chunk)

    # Build context from chunks
    context_parts = []
    for i, chunk in enumerate(unique_chunks, 1):
        context_parts.append(f"[Source {i}: {chunk.document_name}]\n{chunk.text}\n")

    context = "\n---\n".join(context_parts) if context_parts else "No relevant documents found."

    prompt = RESEARCH_QUERY.format(
        query=query,
        context=context,
        jurisdiction=jurisdiction or "India",
        response_language=response_language,
    )
    prompt += "\n\nCite context snippets using [Source N] labels aligned to excerpt order."

    # Split into system / user messages for better persona adherence
    system_prompt = "You are a legal research assistant helping advocates analyze contracts, pleadings, and legal questions."
    user_prompt = prompt.replace(system_prompt, "").strip()

    async def _read_llm_stream_lines() -> list[str]:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                f"{ollama_url}/api/chat",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "stream": True,
                    "options": {
                        "temperature": RESEARCH_QUERY.temperature,
                        "num_predict": 2048,
                    },
                },
            ) as response:
                if response.status_code != 200:
                    raise RuntimeError(f"Ollama error: {response.status_code}")
                return [line async for line in response.aiter_lines() if line]

    try:
        stream_lines = await retry_with_backoff(
            _read_llm_stream_lines,
            config=LLM_RETRY_CONFIG,
        )

        for line in stream_lines:
            try:
                data = json.loads(line)
                token = extract_ollama_text(data, "")
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
                if data.get("done"):
                    break
            except json.JSONDecodeError:
                continue

        # Send citations at the end
        citations = [
            {
                "document_id": c.document_id,
                "document_name": c.document_name,
                "chunk_id": c.chunk_id,
                "excerpt": c.text[:200] + "..." if len(c.text) > 200 else c.text,
                "page_number": c.page_number,
                "relevance": c.relevance_score,
                "source_type": c.source_type,
                "source_url": c.source_url,
                "court_type": c.court_type,
                "judgment_year": c.judgment_year,
                "source_verified": c.source_verified,
                "language": c.language,
            }
            for c in chunks
        ]
        yield f"data: {json.dumps({'citations': citations, 'done': True})}\n\n"

    except Exception as e:
        logger.error(f"Research stream failed: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


async def generate_research_answer(
    query: str,
    chunks: List[ChunkForRAG],
    jurisdiction: Optional[str],
    response_language: str,
    ollama_url: str,
    model: str,
    timeout: int
) -> tuple[str, float]:
    """
    Generate non-streaming research answer.
    """
    # Deduplicate chunks by first 100 chars
    seen_keys = set()
    unique_chunks = []
    for chunk in chunks:
        key = chunk.text[:100]
        if key not in seen_keys:
            seen_keys.add(key)
            # Trim chunk to ~600 tokens (~2400 chars)
            trimmed_text = chunk.text[:2400]
            chunk.text = trimmed_text
            unique_chunks.append(chunk)

    context_parts = []
    for i, chunk in enumerate(unique_chunks, 1):
        context_parts.append(f"[Source {i}: {chunk.document_name}]\n{chunk.text}\n")

    context = "\n---\n".join(context_parts) if context_parts else "No relevant documents found."

    prompt = RESEARCH_QUERY.format(
        query=query,
        context=context,
        jurisdiction=jurisdiction or "India",
        response_language=response_language,
    )
    prompt += "\n\nCite context snippets using [Source N] labels aligned to excerpt order."

    # Split into system / user messages for better persona adherence
    system_prompt = "You are a legal research assistant helping advocates analyze contracts, pleadings, and legal questions."
    user_prompt = prompt.replace(system_prompt, "").strip()

    async def _call_llm() -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{ollama_url}/api/chat",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "stream": False,
                    "options": {
                        "temperature": RESEARCH_QUERY.temperature,
                        "num_predict": 2048,
                    },
                },
            )
            if response.status_code != 200:
                raise RuntimeError(f"Ollama error: {response.status_code}")
            return response.json()

    try:
        result = await retry_with_backoff(
            _call_llm,
            config=LLM_RETRY_CONFIG,
        )
        answer = add_safety_guardrails(extract_ollama_text(result, "").strip())
        confidence = score_answer_confidence(answer, chunks, jurisdiction)
        return answer, confidence
    except RuntimeError as e:
        if str(e).startswith("Ollama error:"):
            return "Research service temporarily unavailable.", 0.0
        logger.error(f"Research generation failed: {e}")
        return f"Research generation failed: {e}", 0.0
    except Exception as e:
        logger.error(f"Research generation failed: {e}")
        return f"Research generation failed: {e}", 0.0


@router.post("")
async def research(
    request: Request,
    body: ResearchQuery
):
    """
    Perform semantic legal research using RAG.
    
    Features:
    - Vector similarity search across document chunks
    - LLM-powered answer synthesis
    - Source citations with document references
    - Optional SSE streaming for real-time response
    - Indian state and UT jurisdiction filtering
    
    All responses include the required AI disclaimer.
    """
    settings = request.app.state.settings
    models = request.app.state.models

    query_text = (body.query or body.question or "").strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="Query required")

    response_language = (body.language or "en").strip().lower() or "en"

    if body.chunks or body.context:
        chunks = build_chunks_from_payload(body.chunks, body.context, body.max_results)
    else:
        # Generate query embedding
        try:
            query_embedding = models.embedding_model.encode(
                query_text,
                normalize_embeddings=True,
                show_progress_bar=False,
            ).tolist()
        except Exception as e:
            logger.error(f"Query embedding failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to process query")

        # Get relevant chunks (would be DB call in production)
        try:
            chunks = await get_relevant_chunks(
                query_text,
                query_embedding,
                body.document_ids,
                body.matter_id or "",
                body.max_results,
                "",  # API layer should supply chunks/context in current architecture
            )
        except NotImplementedError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
    
    # Note: In production deployment, the chunks would be fetched by the API
    # and passed to this service, or this service would have DB access
    
    if body.stream:
        # Return SSE stream
        return StreamingResponse(
            generate_research_answer_stream(
                query_text,
                chunks,
                body.jurisdiction,
                response_language,
                settings.ollama_base_url,
                settings.ollama_model_research,
                settings.ollama_timeout
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    else:
        # Return complete response
        answer, confidence = await generate_research_answer(
            query_text,
            chunks,
            body.jurisdiction,
            response_language,
            settings.ollama_base_url,
            settings.ollama_model_research,
            settings.ollama_timeout
        )
        
        citations = [
            Citation(
                document_id=c.document_id,
                document_name=c.document_name,
                chunk_id=c.chunk_id,
                text_excerpt=c.text[:300] + "..." if len(c.text) > 300 else c.text,
                page_number=c.page_number,
                relevance_score=c.relevance_score,
                source_type=c.source_type,
                source_url=c.source_url,
                court_type=c.court_type,
                judgment_year=c.judgment_year,
                source_verified=c.source_verified,
                language=c.language,
            )
            for c in chunks
        ]
        
        # Build explanation for transparency
        explanation = explain_research_result(
            query=query_text,
            answer=answer,
            sources=[
                {
                    "citation": c.document_name,
                    "type": "document",
                    "jurisdiction": body.jurisdiction or "General",
                    "relevance_note": f"Relevance score: {c.relevance_score:.2f}",
                    "url": None,
                }
                for c in chunks
            ],
            jurisdiction=body.jurisdiction,
        )
        
        return ResearchResult(
            query=query_text,
            answer=answer,
            citations=citations,
            confidence=confidence,
            jurisdiction=body.jurisdiction,
            explanation=explanation,
        )


@router.post("/stream")
async def research_stream(
    request: Request,
    body: ResearchQuery,
):
    """Streaming alias endpoint for compatibility (`/research/stream`)."""
    stream_body = body.model_copy(update={"stream": True})
    return await research(request, stream_body)
