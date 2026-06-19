# NexusHR Attrition Inference Service

FastAPI service that serves the two attrition models behind a Cloud Run
(scale-to-zero, IAM-authenticated) endpoint. Part of the cost-effective
(< LKR 10,000/month) serverless architecture.

## Models

| Route | Model | Inputs | SL ROC-AUC | Note |
|---|---|---|---|---|
| `POST /predict/local` | local | 8 psychometric constructs (1–5) | ~0.94 | Strong. Inputs are survey-sourced (future: Dialogflow Pulse Check). |
| `POST /predict/transfer` | transfer | Age, Gender, JobSatisfaction, WorkLifeBalance | ~0.64 | Weak / illustrative. |

Both return `{probability, threshold, flag, risk_band, top_shap[], model_version, caveat}`.
The SL target is turnover **intention**, not actual attrition.

## Endpoints
- `GET /health` — liveness + which models loaded + source (`gcs` | `baked-in`)
- `GET /model-info` — features, thresholds, AUCs, caveats
- `GET /docs` — interactive OpenAPI UI
- `POST /predict/local`, `POST /predict/transfer`

## Model loading
At startup the service downloads `attrition_local.joblib` and
`attrition_transfer.joblib` from `gs://$MODEL_BUCKET/$MODEL_PREFIX/`, falling back
to the baked-in `models/` copies if GCS is unreachable. Env vars:
`MODEL_BUCKET` (default `kpi-uat-simpalahr-ml`), `MODEL_PREFIX` (default `models`),
`MODEL_SOURCE` (`gcs` | `baked-in` | empty=auto).

## Local run
```powershell
pip install -r requirements.txt
# stage the trained bundles for the baked-in path
Copy-Item ..\models\attrition_*.joblib .\models\
$env:MODEL_SOURCE = "baked-in"
uvicorn app.main:app --reload --port 8080
# http://localhost:8080/docs
```

## Deploy (kpi-uat / us-central1)
```powershell
.\setup-iam.ps1   # once: bucket grant, runtime SA, invoker grant
.\deploy.ps1      # build -> Artifact Registry -> Cloud Run
```

## Call the deployed (locked) endpoint
```bash
TOKEN=$(gcloud auth print-identity-token)
URL=https://simpalahr-ml-dev-...run.app
curl -H "Authorization: Bearer $TOKEN" $URL/health
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"JobSatisfaction":2.1,"WorkLifeBalance":1.8,"Happiness":2.4,"ManagementSupport":2.0,"CareerManagement":1.9,"InnovativeWorkBehavior":2.3,"LeaderMemberExchange":2.2,"CoworkerSupport":2.5}' \
  $URL/predict/local
```

Train/serve parity: preprocessing here mirrors `scripts/train_model.py` exactly
(gender encoding, persisted min-max rescale bounds, median imputation).
