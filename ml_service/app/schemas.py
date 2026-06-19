"""Pydantic request/response models for the attrition inference API.

Construct inputs are on the Sri Lanka survey's 1-5 Likert scale. They are the
same 8 psychometric constructs the local model was trained on; in production
their natural source is the planned Dialogflow "Pulse Check" survey.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ── Requests ────────────────────────────────────────────────────────────────
class LocalPredictRequest(BaseModel):
    """8 psychometric constructs (1-5 Likert). Strong local model (ROC-AUC ~0.94)."""
    JobSatisfaction:        float = Field(..., ge=1, le=5)
    WorkLifeBalance:        float = Field(..., ge=1, le=5)
    Happiness:              float = Field(..., ge=1, le=5)
    ManagementSupport:      float = Field(..., ge=1, le=5)
    CareerManagement:       float = Field(..., ge=1, le=5)
    InnovativeWorkBehavior: float = Field(..., ge=1, le=5)
    LeaderMemberExchange:   float = Field(..., ge=1, le=5)
    CoworkerSupport:        float = Field(..., ge=1, le=5)

    model_config = {
        "json_schema_extra": {
            "example": {
                "JobSatisfaction": 2.1, "WorkLifeBalance": 1.8, "Happiness": 2.4,
                "ManagementSupport": 2.0, "CareerManagement": 1.9,
                "InnovativeWorkBehavior": 2.3, "LeaderMemberExchange": 2.2,
                "CoworkerSupport": 2.5,
            }
        }
    }


class TransferPredictRequest(BaseModel):
    """4 operational features. Weak cross-domain model (ROC-AUC ~0.64) — illustrative."""
    Age:             float = Field(..., ge=16, le=80)
    Gender:          str = Field(..., description="male/female (case-insensitive)")
    JobSatisfaction: float = Field(..., ge=1, le=5)
    WorkLifeBalance: float = Field(..., ge=1, le=5)

    model_config = {
        "json_schema_extra": {
            "example": {
                "Age": 29, "Gender": "female",
                "JobSatisfaction": 2.0, "WorkLifeBalance": 1.5,
            }
        }
    }


# ── Responses ───────────────────────────────────────────────────────────────
class ShapContribution(BaseModel):
    feature: str
    shap_value: float          # signed contribution to the positive (flight-risk) class
    direction: str             # "increases_risk" | "decreases_risk"


class PredictResponse(BaseModel):
    model_type: str            # "local" | "transfer"
    probability: float         # P(high flight risk)
    threshold: float           # operating threshold for the flag
    flag: bool                 # probability >= threshold
    risk_band: str             # "LOW" | "MEDIUM" | "HIGH"
    top_shap: List[ShapContribution]
    model_version: str
    caveat: str


class ModelMeta(BaseModel):
    model_type: str
    features: List[str]
    threshold: float
    sl_roc_auc: Optional[float] = None
    version: Optional[str] = None
    trained_date: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    models_loaded: List[str]
    source: str                # "gcs" | "baked-in"


class ModelInfoResponse(BaseModel):
    models: List[ModelMeta]
    source: str
    caveats: List[str]
