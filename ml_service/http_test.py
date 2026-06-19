"""HTTP-level smoke test via FastAPI TestClient. Run with MODEL_SOURCE=baked-in."""
import os
os.environ.setdefault("MODEL_SOURCE", "baked-in")
from fastapi.testclient import TestClient
from app.main import app

with TestClient(app) as c:
    print("health:", c.get("/health").json())
    info = c.get("/model-info").json()
    print("model-info:", [(m["model_type"], m["sl_roc_auc"]) for m in info["models"]])

    r = c.post("/predict/local", json={
        "JobSatisfaction": 2.1, "WorkLifeBalance": 1.5, "Happiness": 2.0,
        "ManagementSupport": 2.0, "CareerManagement": 1.9,
        "InnovativeWorkBehavior": 2.3, "LeaderMemberExchange": 2.2,
        "CoworkerSupport": 2.5})
    j = r.json()
    print("predict/local:", r.status_code, j["probability"], j["risk_band"], j["flag"],
          "| top:", j["top_shap"][0]["feature"])

    t = c.post("/predict/transfer", json={
        "Age": 29, "Gender": "female", "JobSatisfaction": 2.0, "WorkLifeBalance": 1.5})
    print("predict/transfer:", t.status_code, t.json()["probability"], t.json()["risk_band"])

    bad = c.post("/predict/local", json={"JobSatisfaction": 9})
    print("invalid input ->", bad.status_code, "(expect 422)")

print("HTTP OK")
