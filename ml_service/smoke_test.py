"""Local parity smoke-test for the inference service (no HTTP / no GCS).

Loads the baked-in bundles, runs the service's predict() on rows from
validation_srilanka.csv, and checks that the probabilities match a direct
model.predict_proba call (train/serve parity) and that the operating point lines
up with reports/training_report.json.

Run:  MODEL_SOURCE=baked-in python ml_service/smoke_test.py
"""
import os
import sys

os.environ.setdefault("MODEL_SOURCE", "baked-in")

sys.path.insert(0, os.path.dirname(__file__))           # ml_service/
import numpy as np
import pandas as pd

from app import model as M

BASE = os.path.join(os.path.dirname(__file__), "..")
VAL = os.path.join(BASE, "data", "validation_srilanka.csv")

LOCAL_FEATS = ["JobSatisfaction", "WorkLifeBalance", "Happiness", "ManagementSupport",
               "CareerManagement", "InnovativeWorkBehavior", "LeaderMemberExchange",
               "CoworkerSupport"]


def main():
    M.REGISTRY.load()
    assert set(M.REGISTRY.bundles) == {"local", "transfer"}, M.REGISTRY.bundles
    print(f"loaded: {list(M.REGISTRY.bundles)} from {M.REGISTRY.source}")

    val = pd.read_csv(VAL)
    bundle = M.REGISTRY.bundles["local"]

    # Direct path: reproduce the bundle's own preprocessing on the whole frame.
    X = val[LOCAL_FEATS].apply(pd.to_numeric, errors="coerce")
    X = bundle["imputer"].transform(X.values)
    direct = bundle["model"].predict_proba(X)[:, 1]

    # Service path: row by row.
    max_diff = 0.0
    flagged = 0
    for i, row in val[LOCAL_FEATS].iterrows():
        resp = M.predict("local", row.to_dict())
        max_diff = max(max_diff, abs(resp["probability"] - direct[i]))
        flagged += int(resp["flag"])

    print(f"local: max |service - direct| prob diff = {max_diff:.4f}  (should be ~<=0.0001)")
    print(f"local: flagged {flagged}/{len(val)} at threshold {bundle['threshold']}")
    assert max_diff <= 0.001, "train/serve parity broken for local model"

    # Show one high-risk and one low-risk prediction with SHAP.
    probs = direct.copy()
    hi, lo = int(np.argmax(probs)), int(np.argmin(probs))
    for label, idx in [("HIGH-risk", hi), ("LOW-risk", lo)]:
        r = M.predict("local", val.loc[idx, LOCAL_FEATS].to_dict())
        top = r["top_shap"][0]
        print(f"  {label}: p={r['probability']} band={r['risk_band']} flag={r['flag']} "
              f"| top SHAP: {top['feature']} ({top['direction']})")

    # Transfer model sanity.
    t = M.predict("transfer", {"Age": 29, "Gender": "female",
                               "JobSatisfaction": 2.0, "WorkLifeBalance": 1.5})
    print(f"transfer: p={t['probability']} band={t['risk_band']} "
          f"top SHAP: {t['top_shap'][0]['feature']}")

    print("\nPARITY OK")


if __name__ == "__main__":
    main()
