# Monthly retrain job (Cloud Run Job). Re-fits both model bundles and uploads
# them to GCS. The build context is ml_service/retrain/ AFTER setup-retrain.ps1
# stages ../../scripts and the committed ../../data CSVs into ./scripts and ./data.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=utf-8 \
    PYTHONWARNINGS=ignore \
    MODEL_BUCKET=kpi-uat-simpalahr-ml \
    MODEL_PREFIX=models

WORKDIR /pipeline

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY scripts/ ./scripts/
COPY data/ ./data/

# Re-fit (train_model.py writes models/*.joblib) then publish to GCS.
CMD ["sh", "-c", "python scripts/train_model.py && python scripts/upload_model.py"]
