# ==============================================================================
# Dockerfile for Python FastAPI AI Microservice
# ==============================================================================

FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy microservice application code
COPY . .

EXPOSE 8000

# Start FastAPI application using uvicorn
CMD ["uvicorn", "app.api_server:app", "--host", "0.0.0.0", "--port", "8000"]
