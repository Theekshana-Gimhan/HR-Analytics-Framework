# Heuristic Evaluation — Evaluator E2 (AI-assisted inspection)

**Evaluator:** Claude (AI), driving Chromium via Playwright Agent CLI v0.1.18
**Date:** 23 August 2026 · **Viewport:** 1280×720
**Build:** `simpalahr-frontend-dev` / `simpalahr-backend-dev` / `simpalahr-ml-dev`, project `kpi-uat`, `us-central1`, model bundle `2026.07.31`
**Account:** OWNER, company 18 · **Scenarios:** S1, S2, S3, S4 per §5.10 Part A

> **This is one evaluator's pass, not the evaluation.** It is submitted for verification by evaluator E1 (the developer). Every row below cites a screenshot so each claim can be checked rather than taken on trust. E1 should confirm, downgrade, upgrade or reject each row, and add anything E2 could not perceive.
>
> **What E2 cannot do.** An automated evaluator reasons about principles against captured evidence. It does not *experience* confusion, hesitation, irritation or time pressure, and heuristic evaluation was designed around evaluators who do. E2's blind spots differ from E1's — which is the point of using more than one evaluator — but they are not the blind spots of a human expert. This limitation must be stated in §5.10 if these findings are used.

---

## Findings

Severity: 0 not a problem · 1 cosmetic · 2 minor · 3 major · 4 catastrophe.
Per the worksheet's domain rule, anything capable of leading a manager to act on a **misunderstood risk score** is rated 4.

| # | Heuristic | Scenario | Screen | Observation | Sev | Evidence |
|---|---|---|---|---|---|---|
| 1 | H10 Help & documentation | S3 | Attrition risk card | All eight constructs at the neutral midpoint (3 of 5) return **77.5% probability, band HIGH**, against a disclosed threshold of 30.2%. A manager who enters "everything is average" is told the employee is a high flight risk. The card explains what the number *is* but never what a neutral input should be expected to produce, nor what to do with a HIGH band. | **4** | `06` |
| 2 | H9 Error recovery | S1 | Login | A **network/CORS failure** renders the message *"Login failed. Check your credentials and try again."* The credentials were correct. The message misattributes an infrastructure fault to user error, sending the user to retype a password that was never wrong. | **3** | §1 of `instrumentation_report.md` |
| 3 | H7 Flexibility & efficiency | S2 | Employees list, dashboard, nav, pulse | **The primary task is unsupported.** There is no risk column, sort, filter, dashboard tile, navigation entry or manager-side aggregate anywhere. Ranking *n* employees requires *n* page loads and *n* manual predictions, then ranking by hand. Scenario S2 cannot be completed as specified. | **3** | `03`, `09`, `10` |
| 4 | H5 Error prevention | S3 | Attrition card & Pulse Check | Both forms default every slider to the midpoint. A user who submits without touching anything produces a complete, plausible-looking neutral response — which per finding 1 scores HIGH. Neither form distinguishes "answered neutral" from "not answered". | **3** | `04`, `10` |
| 5 | H6 Recognition vs recall | S2 | Employees / detail | With no comparative view, a manager must hold up to five probabilities in working memory to identify the top three. | **3** | `03`, `09` |
| 6 | H4 Consistency & standards | S3 | Attrition risk card | The same eight constructs are named two ways **on one card**: sliders read "Work-life balance", "Coworker support", "Innovative work behaviour"; the results panel directly beneath reads `WorkLifeBalance`, `CoworkerSupport`, `InnovativeWorkBehavior`. | 2 | `06` |
| 7 | H2 Match to real world | S3 | Attrition risk card | Card copy describes the Pulse Check as *"the planned Pulse Check survey"* and the footer cites *"future source: Dialogflow Pulse Check"*. The Pulse Check is built and deployed, and Dialogflow was deliberately not used. The card contradicts the shipped product. | 2 | `04`, `06` |
| 8 | H1 Visibility of status | S3 | Attrition risk card | The first prediction takes **≈20 s** (warm: 523–1,092 ms). The control shows "Scoring…" and disables — feedback exists — but there is no progress indication and no warning that a first call may take this long. Against Nielsen's 10-second threshold for holding attention, 20 s is well past where an explanation is needed. | 2 | `05`, §2.1 |
| 9 | H6 Recognition vs recall | S4 | Payroll | All five row checkboxes carry the accessible name "Select row" with no employee identity. A screen-reader user hears "Select row" five times while selecting people for payment. | 2 | `07` |
| 10 | H8 Aesthetic & minimalist | — | Pulse Check | The left-hand scale anchor "Disagree" is clipped by its container on **all 16 items**. | 1 | `10` |
| 11 | H3 User control & freedom | S4 | Payroll | Payroll generation runs immediately on click with no confirmation step. Mitigated — and arguably made unnecessary — by the idempotency in finding 13. | 1 | `12` |
| 12 | H2 Match to real world | S1 | Dashboard | The page is titled "Company-wide HR overview at a glance" but a large "My Leaves" panel showing the viewer's personal balances sits in the middle of it, mixing company and personal scope. | 1 | `09` |

## Heuristics where E2 found no violation

**None recorded for H1, H3, H5, H9 or H10 as *categories*** — each produced at least one finding above. E2 found **no violations at all** attributable to:

- Nothing. Every heuristic produced at least one observation, which E1 should treat with suspicion rather than satisfaction: an inspection that flags all ten heuristics is often over-reporting. E1 should be willing to reject rows.

## Behaviour that worked well

Recorded because a findings-only report misrepresents the interface, and because §5.10 should not read as an attack on the system.

- **Payroll is idempotent.** A repeat run reports *"Payroll run complete — Created: 0 | Skipped (already exists): 1"* and writes nothing. Strong H5. (`12`)
- **The generate control states its own scope** — "Generate payslip for 1 employee", correctly pluralised, disabled at zero selection, with a live "1 of 5 selected" counter. (`11`, `07`)
- **The decision threshold is disclosed** — "flags at 30.2%" — rather than presenting a bare probability. Unusually transparent. (`06`)
- **Genuine bad credentials produce a correct, specific message** — "Invalid credentials". The H9 failure in finding 2 is confined to the network path. (`08`)
- **The intention caveat is present at the point of use**, in the card itself: *"The model estimates turnover intention, not a certainty — use it as an early-warning signal."* (`04`)
- **Pulse Check states its confidentiality contract** to the respondent: *"Your individual answers are confidential and are used as an early-warning signal for people managers. This is a short pulse, not a formal assessment."* (`10`)
- **The empty state on the pulse-derived risk card explains itself** rather than showing a blank or a zero. (§3.6)
- **Modal focus trapping works** — an underlying control could not be clicked while the create-employee dialog was open.

## Corrections to the earlier instrumentation report

`instrumentation_report.md` §3.1 recorded that a failed login showed no visible error, flagged **unverified**. That was wrong, and re-testing found the opposite: a red "Invalid credentials" toast appears bottom-right and had simply auto-dismissed before the original screenshot. The real defect is narrower and different — see finding 2, which concerns the *wording* on the network path, not the absence of a message.

## Coverage and gaps

| Scenario | E2 coverage |
|---|---|
| S1 login → dashboard | Full, including both error paths |
| S2 rank three highest-risk | Attempted as a task; unsupported |
| S3 explain a flagged employee | Full, cold and warm |
| S4 generate payroll | Full, including duplicate-run behaviour |

**Not covered by E2, still needed from E1:** keyboard-only navigation; the EMPLOYEE-role privacy check (an employee must not see their own score); mobile/narrow viewport; and any judgement about whether the interface *feels* confusing, which E2 cannot assess.
