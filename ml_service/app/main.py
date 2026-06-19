"""NexusHR attrition inference API (Cloud Run, scale-to-zero).

Serves two models on separate routes:
  POST /predict/local     8 psychometric constructs  (strong, ROC-AUC ~0.94)
  POST /predict/transfer  4 operational features      (weak,   ROC-AUC ~0.64)

Plus GET /health and GET /model-info. Models load once at startup from GCS
(falling back to baked-in copies). Auth is handled at the Cloud Run layer
(IAM-authenticated), so the app itself stays auth-agnostic.
"""

import logging

from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager

from app import model
from app.schemas import (
    LocalPredictRequest, TransferPredictRequest, PredictResponse,
    HealthResponse, ModelInfoResponse,
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ml_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    model.REGISTRY.load()      # load models once on cold start
    yield


app = FastAPI(
    title="NexusHR Attrition Inference",
    version="1.0.0",
    description="Predictive HR analytics for Sri Lankan SMEs — flight-risk scoring "
                "with SHAP explanations. SL target is turnover intention, not actual "
                "attrition.",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok" if model.REGISTRY.bundles else "degraded",
        models_loaded=list(model.REGISTRY.bundles.keys()),
        source=model.REGISTRY.source,
    )


@app.get("/model-info", response_model=ModelInfoResponse)
def model_info():
    return ModelInfoResponse(
        models=model.model_meta(),
        source=model.REGISTRY.source,
        caveats=model.CAVEATS,
    )


@app.post("/predict/local", response_model=PredictResponse)
def predict_local(req: LocalPredictRequest):
    try:
        return model.predict("local", req.model_dump())
    except KeyError:
        raise HTTPException(503, "local model not loaded")


@app.post("/predict/transfer", response_model=PredictResponse)
def predict_transfer(req: TransferPredictRequest):
    try:
        return model.predict("transfer", req.model_dump())
    except KeyError:
        raise HTTPException(503, "transfer model not loaded")


@app.get("/")
def root():
    return {"service": "nexushr-attrition-inference",
            "docs": "/docs", "health": "/health"}
