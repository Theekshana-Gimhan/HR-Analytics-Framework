# NexusHR attrition inference service — Cloud Run (scale-to-zero).
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    MODEL_TMP_DIR=/tmp/models

WORKDIR /app

# Dependencies first (better layer caching).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code.
COPY app ./app
# Baked-in model fallback (used if GCS is unreachable). The deploy script copies
# the freshly-trained bundles into ./models before the build; an empty dir is fine
# (the service then relies solely on GCS).
COPY models ./models

EXPOSE 8080

# Cloud Run injects $PORT (8080). Single worker keeps memory low; the model load
# + SHAP explainers are process-global and cheap to serve concurrently.
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
