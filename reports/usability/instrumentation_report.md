# Instrumented Evidence for the Heuristic Evaluation (§5.10 Part B)

**Captured:** 23 August 2026 · **Tool:** Playwright Agent CLI v0.1.18 (Chromium, 1280×720)
**Target:** `simpalahr-frontend-dev` / `simpalahr-backend-dev` / `simpalahr-ml-dev`, project `kpi-uat`, region `us-central1`
**Account:** OWNER role, company 18

## What this document is, and is not

This is **evidence collection, not evaluation.** Everything below is a measurement or a factual observation captured by automation. No heuristic is assigned, no severity is rated, and no finding is declared.

That separation is deliberate and must be preserved in the write-up. Heuristic evaluation is defined as expert *human* inspection; §5.10 states that the inspection was conducted by the system's own developer and names single-evaluator non-independence as a declared weakness. If an automated pass produced the findings, that statement would be false. The evaluator reads this document, forms their own judgements against the ten heuristics, and assigns severities in `created_docs/Heuristic_Evaluation_Worksheet.md`.

When §5.10 Part B is written, the split should be stated in one sentence: findings and severities are the evaluator's; latency, click-path and console measurements were instrumented.

---

## 1. Blocking defect found before inspection could start

**Login fails entirely on one of the service's two hostnames.**

Cloud Run exposes each service on two URL forms. The backend allowlists only one of them for CORS, so the browser's `Origin` header fails the literal string match on the other.

| Frontend URL used | Login |
|---|---|
| `simpalahr-frontend-dev-3e2u4hcihq-uc.a.run.app` | **Fails** |
| `simpalahr-frontend-dev-809106518632.us-central1.run.app` | Works |

Console output on the failing origin:

```
Access to XMLHttpRequest at
'https://simpalahr-backend-dev-3e2u4hcihq-uc.a.run.app/api/v1/auth/login'
from origin 'https://simpalahr-frontend-dev-3e2u4hcihq-uc.a.run.app'
has been blocked by CORS policy: Response to preflight request doesn't pass
access control check: No 'Access-Control-Allow-Origin' header is present
on the requested resource.
Login failed AxiosError: Network Error
Failed to load resource: net::ERR_FAILED
```

**Cause.** The backend reads `CORS_ORIGIN` from the Secret Manager secret `frontend-url`, whose value is `https://simpalahr-frontend-dev-809106518632.us-central1.run.app`. The `WEBAUTHN_ORIGIN` and `WEBAUTHN_RP_ID` environment variables on the same service were updated to the `3e2u4hcihq` form and now disagree with the secret.

**Why it matters beyond this inspection.** `gcloud run services list` prints the `3e2u4hcihq` URL — so the URL most likely to be copied is the one that cannot log in. The final presentation and demo fall on 2–9 September.

**Suggested fix (not applied — awaiting authorisation):** add both origins to the `frontend-url` secret, or configure `CORS_ORIGIN` to accept a list, then redeploy `simpalahr-backend-dev`.

All measurements below were taken on the working origin.

---

## 2. Latency measurements

### 2.1 ML inference cold start versus warm

The `simpalahr-ml-dev` service scales to zero. The first prediction of the session was therefore a genuine cold start.

| Condition | Measurement | Method |
|---|---|---|
| **Cold start**, click to result | **≈ 20 s** | Wall-clock: 12.7 s to a confirmed in-flight loading state, then polled at 1.5 s granularity until the control reset — a further 7.5 s |
| **Warm**, request to response | **523 ms · 715 ms · 1,092 ms** (mean ≈ 777 ms) | `performance.now()` around three successive in-page `fetch` calls |

**Ratio: roughly 20–40× between cold and warm.**

*Precision caveat.* The cold figure is approximate. Each CLI invocation spawns a process, and polling granularity was 1.5 s, so ~20 s is an upper-bound estimate of the user-perceived wait rather than a server-side latency. The warm figures are precise, measured in-page. If a tighter cold-start number is wanted, let the service idle to zero (roughly 15 minutes) and instrument a single timed `fetch` rather than a UI click.

This measurement bears directly on §4.5, which argues that a 60-second timeout with one retry was chosen over `min-instances=1` in order to preserve the cost thesis. The cost consequence of that decision is quantified in §5.11; **this is the latency it buys**.

### 2.2 Other timings

| Action | Elapsed |
|---|---|
| Sign-in click to dashboard render | 4.5 s |
| Employee detail page navigation | 4.1 s |
| Rejected request (400 validation) | 360–365 ms — validation rejects before reaching the ML service |

---

## 3. Factual observations, by screen

Presented as observations only. **The evaluator assigns heuristic and severity.**

### 3.1 Login (`01_login_failed_cors_no_visible_error.png`)

- After a failed login, the screenshot taken ~3.8 s post-click shows the form unchanged: no inline error, no visible toast, the button still reading "Sign in".
- **Unverified:** a toast may have appeared and auto-dismissed inside that window. This needs a deliberate re-test before any finding is recorded.
- Three errors were written to the browser console; none of that detail reached the interface.

### 3.2 Employees list (`03_employees_list_no_risk_column.png`)

- Columns are: Employee · Job title · Status · Phone · Address · Actions.
- **There is no attrition-risk column, no risk sort, and no risk filter.**
- There is no "Attrition" or "Risk" entry in the primary navigation. The only route to a risk figure is the individual employee detail page.
- **Consequence for scenario S2** ("identify the three highest-risk employees"): with *n* employees, a manager must open *n* detail pages and run *n* predictions, then rank the results by hand. At the current five employees that is 5 page loads and 5 prediction cycles; the first of those costs ~20 s.
- Header actions are labelled: Payroll · Refresh · CSV Template · Import CSV · Export CSV · New employee.

### 3.3 Attrition risk card — idle (`04_attrition_card_idle.png`)

- Eight sliders, each defaulting to 3 on a 1–5 scale: Job satisfaction · Work-life balance · Happiness · Management support · Career management · Innovative work behaviour · Leader-member exchange · Coworker support.
- Caveat text present above the inputs: *"Inputs are employee-sentiment constructs (1-5). Their live source is the planned Pulse Check survey; for now enter or sample them below. The model estimates turnover **intention**, not a certainty — use it as an early-warning signal."*
- Actions: "Predict risk", "Reset".

### 3.4 Attrition risk card — in flight (`05_attrition_card_scoring_state.png`)

- The button changes to **"Scoring…"** and is disabled during the request. A loading state does exist.
- No progress indicator, no elapsed-time hint, and no advance warning that the first call may take ~20 seconds.

### 3.5 Attrition risk card — result (`06_attrition_card_result.png`)

Verbatim output for all eight inputs left at the neutral midpoint (3 of 5):

> **Nimali Perera: flight-risk band `HIGH`**
> Probability 77.5% (flags at 30.2%)
> Top contributing factors:
> WorkLifeBalance — increases risk · CoworkerSupport — increases risk · ManagementSupport — increases risk · Happiness — lowers risk · InnovativeWorkBehavior — increases risk
> *Local model inputs are survey constructs (future source: Dialogflow Pulse Check). (model 2026.07.31)*

Four observations:

1. **Neutral inputs produce a HIGH band.** Every construct at the midpoint yields 77.5% against a 30.2% threshold. This is mechanically correct given the tuned operating point, but it means a manager who enters "everything is average" is told the employee is a high flight risk.
2. **Feature names appear raw.** The result lists `WorkLifeBalance`, `CoworkerSupport`, `InnovativeWorkBehavior` in camelCase, whereas the sliders directly above use prose labels ("Work-life balance", "Coworker support", "Innovative work behaviour"). The same concepts are named two ways on the same card.
3. **The threshold is disclosed** — "flags at 30.2%" — so the decision rule is visible rather than hidden.
4. **The footer copy is stale.** It cites "future source: Dialogflow Pulse Check", and the caveat above calls the Pulse Check "planned". The Pulse Check is built and deployed, and the dissertation records that the Dialogflow CX agent was deliberately replaced by the in-stack implementation. The card's own copy contradicts the shipped product.

### 3.6 Pulse-derived risk card

- Empty state reads: *"This employee has not submitted a Pulse Check yet. Once they do, their latest risk signal appears here automatically."*

### 3.7 Payroll (`07_payroll.png`)

- Page states its own procedure: *"Select one or more employees, choose the period, then generate."*
- Month and year selectors are explicit and marked required.
- Per-employee checkboxes with a select-all control, and a live counter reading "0 of 5 selected".
- Generation requires explicit selection; nothing runs by default.

### 3.8 Modal behaviour

- Opening "New employee" renders a modal that correctly blocks interaction with the page behind it (an automated click on an underlying button timed out). This is correct behaviour, recorded to pre-empt it being logged as a defect.

---

## 4. Environment notes

- **Employee plan cap.** Creating a fifth-plus employee returns `403 SUBSCRIPTION_LIMIT`: *"Your plan allows a maximum of 5 employees. You currently have 5."* The message is specific and actionable at the API level; whether the UI surfaces it as clearly was not tested.
- **Test data added.** Three employees were created via the API to make S2 a meaningful ranking task: Nimali Perera (Software Engineer), Kasun Fernando (Accounts Executive), Dilani Jayawardena (HR Assistant). Total is now five.
- **Hire date defaulted.** The employees were created with `employmentStartDate` in the payload, but the detail page shows the hire date as the creation date. The create form's "Join Date" field maps to a different key than the one used. Not pursued — data-entry path, outside the four scenarios.
- **Stale URLs in `CLAUDE.md`.** The documented dev URLs use the `wxbl5wur4q` hostname and now return 404 on both frontend and backend. Should be corrected to the `3e2u4hcihq` form, with the CORS caveat in §1 noted alongside.

---

## 5. What still needs the human evaluator

1. **Re-test the failed-login error path deliberately** and confirm whether any user-visible message appears (§3.1 is unverified).
2. **Walk all four scenarios in both passes** as set out in the worksheet — this document covers S1, S3 and S4 only partially and does not attempt S2 as a task.
3. **Assign heuristic and severity to every observation above**, discarding any that do not represent a genuine usability problem.
4. **Judge the neutral-inputs-to-HIGH-band behaviour** (§3.5, observation 1). The worksheet's severity guidance states that anything capable of leading a manager to act on a misunderstood risk score is a 4 rather than a 3. Whether this qualifies is a judgement about consequence, and it is the evaluator's to make.
