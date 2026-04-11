"""
EvidentIS AI Service - Research Router
Semantic legal research with RAG (Retrieval Augmented Generation).
"""

import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from explainability import explain_research_result
from llm_safety import RetryConfig, retry_with_backoff
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
    chunks: Optional[List[str]] = Field(default=None, description="Pre-retrieved chunk text from API layer")
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


def build_chunks_from_payload(
    chunks: Optional[List[str]],
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
            )
        )

    if not chunks:
        return prepared_chunks

    for index, chunk_text in enumerate(chunks[:max_results], start=1):
        cleaned = chunk_text.strip()
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
    
    In production, this would query the PostgreSQL database.
    For now, we return a mock result structure.
    """
    # TODO: In production, this would be:
    # SELECT dc.id, dc.document_id, d.filename, dc.text, dc.page_number,
    #        1 - (dc.embedding <=> $1::vector) as score
    # FROM document_chunks dc
    # JOIN documents d ON dc.document_id = d.id
    # WHERE d.matter_id = $2
    #   AND ($3::uuid[] IS NULL OR dc.document_id = ANY($3))
    # ORDER BY dc.embedding <=> $1::vector
    # LIMIT $4
    
    # Mock return for now - in actual deployment, would call the API service's DB
    return []


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
    # Build context from chunks
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(f"[Source {i}: {chunk.document_name}]\n{chunk.text}\n")
    
    context = "\n---\n".join(context_parts) if context_parts else "No relevant documents found."

    prompt = RESEARCH_QUERY.format(
        query=query,
        context=context,
        jurisdiction=jurisdiction or "India",
        response_language=response_language,
    )
    prompt += "\n\nCite context snippets using [Source N] labels aligned to excerpt order."

    async def _read_llm_stream_lines() -> list[str]:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                f"{ollama_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": True,
                    "options": {
                        "temperature": 0.3,
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
                token = data.get("response", "")
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
                "relevance": c.relevance_score,
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
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(f"[Source {i}: {chunk.document_name}]\n{chunk.text}\n")
    
    context = "\n---\n".join(context_parts) if context_parts else "No relevant documents found."

    prompt = RESEARCH_QUERY.format(
        query=query,
        context=context,
        jurisdiction=jurisdiction or "India",
        response_language=response_language,
    )
    prompt += "\n\nCite context snippets using [Source N] labels aligned to excerpt order."

    async def _call_llm() -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{ollama_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
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
        answer = add_safety_guardrails(result.get("response", "").strip())
        return answer, 0.8
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
        chunks = await get_relevant_chunks(
            query_text,
            query_embedding,
            body.document_ids,
            body.matter_id or "",
            body.max_results,
            ""  # Would be connection string
        )
    
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
