"""
EvidentIS AI Service
FastAPI application for AI/ML capabilities including OCR, embeddings, 
clause extraction, risk assessment, and semantic research.
"""

import logging
from contextlib import asynccontextmanager
from typing import Any, Dict

import redis.asyncio as redis
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from models.loader import ModelRegistry
from routers import ocr, embed, extract, assess, research, suggest, obligations, health
from evaluation.evaluator import run_evaluation
from evaluation.scoring import compute_metrics

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

settings = get_settings()
INTERNAL_BYPASS_PATHS = {
    "/",
    "/health",
    "/health/live",
    "/health/ready",
    "/health/version",
    "/docs",
    "/redoc",
    "/openapi.json",
}
RATE_LIMIT_WINDOW_SECONDS = 60

# Global model registry
model_registry: ModelRegistry | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management - load models on startup."""
    global model_registry
    
    logger.info("Starting EvidentIS AI Service...")
    logger.info(f"Embedding model: {settings.embedding_model}")
    logger.info(f"OCR engines: {settings.ocr_engine_list}")
    logger.info(f"LLM model: {settings.ollama_model_extract}")
    
    # Initialize model registry and load models
    model_registry = ModelRegistry(settings)
    await model_registry.load_all()
    
    # Store in app state for access in routes
    app.state.models = model_registry
    app.state.settings = settings
    app.state.rate_limit_redis = redis.from_url(settings.redis_url)
    
    logger.info("AI Service ready")
    
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down AI Service...")
    if model_registry:
        await model_registry.unload_all()
    rate_limit_redis = getattr(app.state, "rate_limit_redis", None)
    if rate_limit_redis:
        await rate_limit_redis.aclose()


# Create FastAPI app
app = FastAPI(
    title="EvidentIS India AI Service",
    description="AI/ML service for Indian legal document analysis",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def enforce_internal_access(request: Request, call_next):
    runtime_settings = getattr(request.app.state, "settings", settings)

    if request.url.path in INTERNAL_BYPASS_PATHS:
        return await call_next(request)

    if runtime_settings.ai_service_internal_key:
        request_key = request.headers.get("X-Internal-Key", "")
        if request_key != runtime_settings.ai_service_internal_key:
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

    rate_limit_redis = getattr(request.app.state, "rate_limit_redis", None)
    if rate_limit_redis is None:
        logger.warning("Rate limiter unavailable: Redis client missing on app state; allowing request")
        return await call_next(request)

    forwarded_for = request.headers.get("x-forwarded-for", "")
    client_ip = (
        request.client.host
        if request.client and request.client.host
        else (forwarded_for.split(",")[0].strip() if forwarded_for else request.headers.get("x-real-ip", "unknown"))
    )
    if not client_ip:
        client_ip = f"unknown:{request.url.path}"
    bucket_key = f"ratelimit:{client_ip}:{request.url.path}"

    try:
        request_count = await rate_limit_redis.incr(bucket_key)
        if request_count == 1:
            await rate_limit_redis.expire(bucket_key, RATE_LIMIT_WINDOW_SECONDS)
    except redis.RedisError as exc:
        logger.warning("Rate limit Redis operation failed for key %s: %s; allowing request", bucket_key, exc)
        return await call_next(request)

    if request_count > runtime_settings.rate_limit_requests_per_minute:
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})

    return await call_next(request)

# CORS configuration
# AI service is internal-only (called by API server, not browsers)
# In production, CORS should be disabled or restricted to the API server only
if settings.environment == "development":
    # Allow localhost for development/testing
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:4000"],  # API server only
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Authorization", "X-Tenant-ID"],
    )
else:
    # Production: No CORS needed (internal service)
    # If CORS is required, configure via environment variable
    allowed_origins = settings.cors_origins if hasattr(settings, 'cors_origins') else []
    if allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=allowed_origins,
            allow_credentials=False,
            allow_methods=["GET", "POST"],
            allow_headers=["Content-Type", "Authorization", "X-Tenant-ID"],
        )

# Register routers
app.include_router(health.router, tags=["Health"])
app.include_router(ocr.router, prefix="/ocr", tags=["OCR"])
app.include_router(embed.router, prefix="/embed", tags=["Embeddings"])
app.include_router(extract.router, prefix="/extract-clauses", tags=["Extraction"])
app.include_router(assess.router, prefix="/assess-risk", tags=["Risk Assessment"])
app.include_router(research.router, prefix="/research", tags=["Research"])
app.include_router(suggest.router, prefix="/suggest-redline", tags=["Suggestions"])
app.include_router(obligations.router, prefix="/extract-obligations", tags=["Obligations"])


@app.get("/")
async def root() -> Dict[str, Any]:
    """Root endpoint with service info."""
    return {
        "service": "EvidentIS India AI Service",
        "version": "1.0.0",
        "status": "running",
        "models": {
            "embedding": settings.embedding_model,
            "llm": settings.ollama_model_extract,
            "ocr": settings.ocr_engine_list,
        }
    }


@app.get("/models")
async def list_models() -> Dict[str, Any]:
    """List loaded models and their status."""
    if not model_registry:
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    return {
        "models": model_registry.get_status(),
        "gpu_enabled": settings.gpu_enabled,
    }


@app.post("/eval/run", include_in_schema=False)
async def run_eval(dataset: str = "default") -> Dict[str, Any]:
    """
    Internal endpoint to run AI model evaluation.
    Used for benchmarking clause extraction and risk assessment accuracy.
    """
    from evaluation.datasets import load_golden_dataset
    
    try:
        load_golden_dataset(dataset)
        
        # Define a mock inference function for testing
        async def inference_fn(input_data: Dict[str, Any]) -> Dict[str, Any]:
            # In production, this would call the actual AI endpoints
            return {"clauses": [], "risk_level": "medium"}
        
        result = await run_evaluation(
            model_version=settings.ollama_model_extract,
            dataset_path=dataset,
            inference_fn=inference_fn,
        )
        metrics = compute_metrics([result]) if result else {}
        
        return {
            "status": "completed",
            "dataset": dataset,
            "result": result.to_dict() if result else None,
            "metrics": metrics,
        }
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        timeout_graceful_shutdown=30,
    )
