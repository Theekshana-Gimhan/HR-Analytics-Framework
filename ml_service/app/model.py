"""Model registry + inference for the attrition service.

Loads the two servable bundles written by scripts/train_model.py:
  - attrition_local.joblib    (8 constructs, strong, ROC-AUC ~0.94)
  - attrition_transfer.joblib (4 features, weak, ROC-AUC ~0.64)

Each bundle is self-describing:
  {model, imputer, features, ordinal_rescale, rescale_bounds, threshold,
   model_type, sl_roc_auc, trained_date, version}

Preprocessing here MUST mirror scripts/train_model.py exactly (gender encoding,
within-dataset min-max rescale via persisted bounds, median imputation) so that
train/serve parity holds.

Source priority: download from GCS (MODEL_BUCKET) if reachable, else fall back to
the baked-in copies under ml_service/models/ (fast cold start / offline dev).
"""

import os
import logging

import numpy as np
import joblib

try:
    import shap
    HAVE_SHAP = True
except ImportError:
    HAVE_SHAP = False

log = logging.getLogger("ml_service.model")

# ── Config ──────────────────────────────────────────────────────────────────
MODEL_BUCKET = os.environ.get("MODEL_BUCKET", "kpi-uat-simpalahr-ml")
MODEL_PREFIX = os.environ.get("MODEL_PREFIX", "models")
# Force a source for testing: "gcs" | "baked-in" | "" (auto)
MODEL_SOURCE = os.environ.get("MODEL_SOURCE", "").lower()

_THIS_DIR  = os.path.dirname(__file__)
BAKED_DIR  = os.path.join(_THIS_DIR, "..", "models")
_TMP_DIR   = os.environ.get("MODEL_TMP_DIR", "/tmp/models")

BUNDLE_FILES = {
    "local":    "attrition_local.joblib",
    "transfer": "attrition_transfer.joblib",
}

CAVEATS = [
    "SL target is turnover INTENTION, not actual attrition — treat as flight-risk proxy.",
    "Local model inputs are survey constructs (future source: Dialogflow Pulse Check).",
    "Transfer model is weak (ROC-AUC ~0.64) — illustrative only.",
    "Local model trained on n=230 (~33 positives); AUC is multi-seed CV mean.",
]


# ── Registry ────────────────────────────────────────────────────────────────
class _Registry:
    def __init__(self):
        self.bundles = {}      # model_type -> bundle dict
        self.explainers = {}   # model_type -> shap.TreeExplainer
        self.source = "unloaded"

    def load(self):
        self.source = _download_bundles()
        local_dir = _TMP_DIR if self.source == "gcs" else BAKED_DIR
        for mtype, fname in BUNDLE_FILES.items():
            path = os.path.join(local_dir, fname)
            if not os.path.exists(path):
                log.warning("bundle %s missing at %s — skipping", mtype, path)
                continue
            bundle = joblib.load(path)
            self.bundles[mtype] = bundle
            if HAVE_SHAP:
                try:
                    self.explainers[mtype] = shap.TreeExplainer(bundle["model"])
                except Exception as e:   # noqa: BLE001
                    log.warning("SHAP explainer for %s failed: %s", mtype, e)
        if not self.bundles:
            raise RuntimeError(
                f"No model bundles loaded (source={self.source}, "
                f"looked in {local_dir}).")
        log.info("loaded models %s from %s", list(self.bundles), self.source)


REGISTRY = _Registry()


def _download_bundles() -> str:
    """Try GCS, else baked-in. Returns the source actually used."""
    if MODEL_SOURCE == "baked-in":
        return "baked-in"
    if MODEL_SOURCE in ("gcs", ""):
        try:
            from google.cloud import storage
            os.makedirs(_TMP_DIR, exist_ok=True)
            client = storage.Client()
            bucket = client.bucket(MODEL_BUCKET)
            got_any = False
            for fname in BUNDLE_FILES.values():
                blob = bucket.blob(f"{MODEL_PREFIX}/{fname}")
                if blob.exists():
                    blob.download_to_filename(os.path.join(_TMP_DIR, fname))
                    got_any = True
            if got_any:
                return "gcs"
            log.warning("GCS bucket %s has no bundles — using baked-in", MODEL_BUCKET)
        except Exception as e:   # noqa: BLE001
            log.warning("GCS load failed (%s) — using baked-in", e)
    return "baked-in"


# ── Preprocessing (mirror train_model.py) ────────────────────────────────────
def _encode_gender(value) -> float:
    s = str(value).strip().lower()
    return {"male": 1.0, "m": 1.0, "1": 1.0,
            "female": 0.0, "f": 0.0, "0": 0.0}.get(s, np.nan)


def _build_row(bundle: dict, raw: dict) -> np.ndarray:
    feats = bundle["features"]
    ordinal = set(bundle.get("ordinal_rescale", []))
    bounds = bundle.get("rescale_bounds", {}) or {}
    row = []
    for col in feats:
        if col == "Gender":
            row.append(_encode_gender(raw.get("Gender")))
            continue
        v = raw.get(col)
        v = float(v) if v is not None else np.nan
        if col in ordinal:
            b = bounds.get(col)
            if b:
                lo, hi = b
                v = (v - lo) / (hi - lo) if hi > lo else 0.5
            else:
                v = 0.5
        row.append(v)
    X = np.array([row], dtype=float)          # (1, n_features), may contain NaN
    return bundle["imputer"].transform(X)     # median-impute identically to training


def _top_shap(model_type: str, X: np.ndarray, feats: list, k: int = 5) -> list:
    expl = REGISTRY.explainers.get(model_type)
    if expl is None:
        return []
    try:
        sv = expl.shap_values(X)
        sv_pos = sv[1] if isinstance(sv, list) else sv
        if getattr(sv_pos, "ndim", 2) == 3:        # (n, features, classes)
            sv_pos = sv_pos[:, :, 1]
        vals = np.asarray(sv_pos)[0]
        order = np.argsort(-np.abs(vals))[:k]
        return [{
            "feature": feats[i],
            "shap_value": round(float(vals[i]), 5),
            "direction": "increases_risk" if vals[i] > 0 else "decreases_risk",
        } for i in order]
    except Exception as e:   # noqa: BLE001
        log.warning("SHAP for %s failed: %s", model_type, e)
        return []


def _risk_band(proba: float, threshold: float) -> str:
    if proba >= threshold:
        return "HIGH"
    if proba >= 0.5 * threshold:
        return "MEDIUM"
    return "LOW"


# ── Public API ───────────────────────────────────────────────────────────────
def predict(model_type: str, raw: dict) -> dict:
    bundle = REGISTRY.bundles.get(model_type)
    if bundle is None:
        raise KeyError(model_type)
    feats = bundle["features"]
    X = _build_row(bundle, raw)
    proba = float(bundle["model"].predict_proba(X)[0, 1])
    thr = float(bundle["threshold"])
    return {
        "model_type": model_type,
        "probability": round(proba, 4),
        "threshold": round(thr, 4),
        "flag": proba >= thr,
        "risk_band": _risk_band(proba, thr),
        "top_shap": _top_shap(model_type, X, feats),
        "model_version": bundle.get("version", "unknown"),
        "caveat": CAVEATS[2] if model_type == "transfer" else CAVEATS[1],
    }


def model_meta() -> list:
    out = []
    for mtype, b in REGISTRY.bundles.items():
        out.append({
            "model_type": b.get("model_type", mtype),
            "features": b.get("features", []),
            "threshold": round(float(b.get("threshold", 0.5)), 4),
            "sl_roc_auc": b.get("sl_roc_auc"),
            "version": b.get("version"),
            "trained_date": b.get("trained_date"),
        })
    return out
