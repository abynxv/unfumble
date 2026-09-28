# ─── Backend Dockerfile ───
# Multi-stage build for a smaller production image.

# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

WORKDIR /app

# Install system dependencies needed for psycopg2 and Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libjpeg-dev \
    libpng-dev \
    libwebp-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Production image
FROM python:3.12-slim

WORKDIR /app

# Install only runtime system dependencies (no compilers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libjpeg62-turbo \
    libpng16-16 \
    libwebp7 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder stage
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Create a non-root user for security
RUN useradd --create-home appuser
USER appuser

# Expose the FastAPI port
EXPOSE 8000

# Run the FastAPI application with uvicorn
# --host 0.0.0.0 makes it accessible from outside the container
# --port 8000 is the standard FastAPI port
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
