# ============================================================
# EvidentIS AI Service Dockerfile
# Python FastAPI AI/ML Service
# ============================================================

FROM python:3.11-slim AS builder

# Install system dependencies for OCR and ML
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    tesseract-ocr-ben \
    tesseract-ocr-tam \
    tesseract-ocr-tel \
    tesseract-ocr-kan \
    tesseract-ocr-mal \
    tesseract-ocr-mar \
    tesseract-ocr-guj \
    tesseract-ocr-pan \
    tesseract-ocr-ori \
    tesseract-ocr-urd \
    tesseract-ocr-san \
    tesseract-ocr-asm \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# ============================================================
# Production image
# ============================================================
FROM python:3.11-slim AS runner

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    tesseract-ocr-ben \
    tesseract-ocr-tam \
    tesseract-ocr-tel \
    tesseract-ocr-kan \
    tesseract-ocr-mal \
    tesseract-ocr-mar \
    tesseract-ocr-guj \
    tesseract-ocr-pan \
    tesseract-ocr-ori \
    tesseract-ocr-urd \
    tesseract-ocr-san \
    tesseract-ocr-asm \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Security: Create non-root user with writable home/cache
RUN groupadd --system --gid 1001 appgroup && \
    useradd --system --uid 1001 --gid appgroup --create-home --home-dir /home/appuser appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=appuser:appgroup . .

# Create model/cache directories with appuser ownership
RUN mkdir -p /models/.cache/huggingface && chown -R appuser:appgroup /models /home/appuser

# Security: Run as non-root user
USER appuser

EXPOSE 5000

ENV PYTHONUNBUFFERED=1
ENV HOME=/home/appuser
ENV MODEL_CACHE_DIR=/models
ENV XDG_CACHE_HOME=/models/.cache
ENV HF_HOME=/models/.cache/huggingface
ENV HF_HUB_DISABLE_XET=1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
