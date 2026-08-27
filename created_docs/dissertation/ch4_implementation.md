# Chapter 4 — Implementation

## 4.1 System Architecture

The framework is implemented as **two systems joined across an API boundary** rather than as a single application. The first is an operational HR platform that a small enterprise uses daily for payroll, leave and attendance. The second is a machine-learning pipeline and a serverless inference service that consumes anonymised features and returns an attrition-risk assessment with explanations.

The separation is deliberate and is the central architectural decision of the implementation. An HR platform is a stateful, transactional, always-available system; an inference service is stateless, bursty and idle most of the time. Merging them would force the inference workload to inherit the availability profile — and therefore the cost profile — of the transactional system, which would defeat the economic objective. Keeping them apart allows the inference tier to scale to zero when nobody is asking it anything, which §4.5 shows is where the cost saving actually comes from.

The two systems also live in **separate repositories with no shared version history**. The HR platform is developed independently of this research; the machine-learning work integrates with it over HTTP rather than by merging codebases. This is a constraint that turned out to be a benefit: it forced the integration to be defined by a contract rather than by shared internals, which is the arrangement an SME adopting the framework would actually have.

## 4.2 The HR Platform

The HR platform is a TypeScript monorepo: a Node.js and Express REST API backed by PostgreSQL through the Prisma ORM, and a React single-page application built with Vite. The data model spans more than twenty entities across twenty-one versioned migrations, covering companies, users, employees, attendance, leave requests and balances, payslips, bank-file exports, rosters, shift templates, employee documents and audit logs.

Access control is layered. Authentication issues short-lived access tokens with rotating refresh tokens, and additionally supports passwordless biometric login via WebAuthn. Authorisation is role-based across four roles — owner, administrator, HR staff and employee — with the last restricted to self-service. Every request passes through the same lifecycle: schema validation, authentication, role authorisation, controller, service, database.

One rule governs the entire data layer: **every database query filters by the authenticated user's company identifier**. Multi-tenancy is enforced explicitly in each service method rather than implicitly by middleware, on the principle that an isolation rule which is visible at every call site is harder to omit than one applied invisibly somewhere upstream. For a system holding salary and personal data for multiple companies, a cross-tenant leak is the most serious failure available, and the design accepts verbosity as the price of making that failure obvious.

The frontend lazy-loads every route and splits vendor bundles, so an SME on a constrained connection downloads only the screens actually used. Server state is managed through a query cache with revalidation rather than hand-rolled fetching, and dashboard aggregates are served from an in-memory cache keyed by company identifier, with the cache interface written so that it can be replaced by a shared cache without touching call sites. Figure 4.1 shows the resulting dashboard.

![Figure 4.1 — The HR platform dashboard, showing headcount, leave utilisation and attendance aggregates.](created_docs/figures/dashboard.png)

## 4.3 Sri Lankan Statutory Compliance

The platform implements Sri Lankan payroll law directly rather than through a configurable generic engine, because the statutory rates are stable and an SME needs them correct by default rather than correct after configuration. Employees' Provident Fund contributions are calculated at 8% from the employee and 12% from the employer, the Employees' Trust Fund at 3%, all on basic salary, with Pay As You Earn applied on the progressive schedule published by the Inland Revenue Department.

Statutory leave minimums are enforced as floors that a company's configuration cannot fall below: fourteen days annual leave, seven days casual and seven days medical, the last accruing against the employment anniversary. Payslips are generated as PDFs, and salary disbursement files are exported in the CIPS and SLIPS formats used by Sri Lankan banks. Every payroll and bank-file operation writes an audit record.

This compliance layer is not incidental to the research. A predictive tool that an SME must run *alongside* its payroll system is a tool that will not be adopted; the prediction has value precisely because it sits inside the system where the HR work already happens.

## 4.4 The Machine-Learning Pipeline

The offline pipeline is implemented as five Python scripts executed in sequence, each with a single responsibility and a file-based contract with the next. Source datasets are retrieved and staged; raw survey spreadsheets are converted into clean numeric form with the eight psychometric constructs computed as means of their constituent items; a logistic regression is fitted to the pooled real records to produce calibration coefficients; synthetic records are generated from those coefficients; and finally the sources are merged into the weighted master training set, the held-out validation set and the benchmark comparison set.

Two engineering decisions in this pipeline are worth recording. First, the merge step **asserts target integrity before writing anything** — that the label contains no missing values, that it is strictly binary, and that every contributing source has supplied labelled rows. The three sources encode their outcome differently, one of them embedding it in an event field and another carrying leading whitespace in its categorical values, so the raw outcome columns are stripped and a single canonical binary label is derived. Silent corruption of the target is the most damaging error available in a supervised pipeline, and the assertions exist to make it loud.

Second, the pipeline **degrades rather than fails** when a source dataset is unavailable, substituting literature-derived default coefficients. This keeps the work reproducible on a machine that cannot reach every upstream source, which matters for examination and for anyone reproducing the results later.

Training itself produces both models described in §3.2, together with a machine-readable training report and SHAP summary plots. Model artifacts are serialised with their fitted preprocessing state — imputation statistics and the per-dataset rescaling bounds — so that inference can reproduce training-time transformation exactly.

## 4.5 Serverless Inference

The inference service is a FastAPI application deployed to Google Cloud Run, serving both models on separate routes. Each prediction returns the probability, the operating threshold, the resulting flag and risk band, and the per-request SHAP contributions that explain it. Model bundles are loaded from Cloud Storage at start-up, with a copy baked into the container image as a fallback so the service remains available if object storage is briefly unreachable.

Four properties of the deployment matter to the research argument:

- **It scales to zero.** No instance runs when no prediction is being requested. §5.11 shows the inference service consumed 150 billable instance-seconds across four months, which is the mechanism by which the cost objective is met.
- **It is closed by default.** The service rejects unauthenticated invocation; the HR backend calls it with an identity token minted from the instance metadata service. The service account it runs under holds read access to one storage bucket and nothing else.
- **Retraining is scheduled, not manual.** A Cloud Run job re-runs training monthly under a scheduler trigger, so the model does not silently age.
- **Train/serve parity is enforced by construction.** The serving code applies the same gender encoding, the same persisted rescaling bounds and the same imputation as training, and the serving environment pins the identical scikit-learn version, since a version mismatch can break deserialisation of the model bundle outright.

The cold-start behaviour required an explicit decision. A scaled-to-zero service makes the first request after an idle period wait for a container to start. The obvious remedy — keeping one instance permanently warm — would have removed the delay and simultaneously destroyed the cost argument, since a warm instance bills continuously. The implementation instead uses an extended request timeout with a single automatic retry: the first attempt wakes the instance, the retry arrives to a warm one. This is an engineering decision made in service of a research claim, and it is the clearest illustration in the implementation of the trade-off the framework is built around.

The deployment environment is a shared development project rather than a dedicated production tenancy. This has no effect on functional behaviour but has a direct effect on cost measurement, and is the reason §3.10 specifies per-resource attribution rather than project-level billing.

## 4.6 Integration with the HR Application

Integration was delivered as a thin proxy in the HR backend. The proxy exposes attrition endpoints under the application's own API, validates request payloads against a schema, and gates access behind a dedicated permission granted to owners automatically and to administrators explicitly. It obtains an identity token for the inference service at call time and forwards the request. When the inference service address is not configured, the feature disables itself cleanly rather than erroring — so the HR platform remains fully functional for a deployment that has not adopted the predictive component at all.

On the frontend, an attrition risk card appears on the employee detail page, presenting the eight construct inputs, the resulting probability against its threshold, the risk band, and the strongest contributing factors from the SHAP output. The card carries a visible caveat stating that the inputs are survey-sourced and that the model predicts turnover *intention* rather than departure. Figure 4.2 shows the card after a prediction has been requested.

![Figure 4.2 — Attrition risk card after a prediction, showing the risk band, the probability against its disclosed threshold, and the leading SHAP contributions.](created_docs/figures/attrition_risk_result.png)

The integration was verified end to end against the deployed services with a real authenticated session: the status endpoint reporting the feature enabled, both prediction routes returning coherent probabilities with corresponding SHAP attributions, and malformed input rejected by schema validation.

## 4.7 The Pulse Check

The local model consumes eight psychometric constructs, and those constructs do not exist in operational HR data. Attendance records and payroll history cannot tell you whether an employee feels supported by their manager. Without a mechanism to capture self-report, the stronger of the two models would be undeployable — an accurate predictor with no way to obtain its inputs.

The Pulse Check is that mechanism: a weekly sixteen-item Likert micro-survey, two items per construct, averaged into the eight constructs using **the same mean-of-items definition applied during training**, which is what preserves train/serve parity. One submission is stored per employee per ISO week, holding the raw answers, the derived constructs and a cached prediction. Scoring is best-effort by design — if the inference service is cold or unavailable, the response is still recorded and the submission never fails.

A full conversational agent was considered for this role and rejected. It would have added a managed service dependency and a recurring cost to capture data that a form in the existing application captures adequately, which would have undermined the cost objective the framework exists to demonstrate. The survey as presented to employees is shown in Figure 4.3.

![Figure 4.3 — The weekly Pulse Check survey presented to employees.](created_docs/figures/pulse_check_page.png)

Two design decisions carry ethical weight. First, **employees never see their own risk score**; the survey returns only a confirmation of submission. A tool that reports a personal attrition-risk figure back to the individual invites distress and invites gaming, and serves no intervention purpose. Second, the manager-facing readout, shown in Figure 4.4, is gated behind the same permission as the attrition feature, so pulse-derived risk is not visible to peers.

![Figure 4.4 — Manager-side pulse-derived risk readout on the employee detail page.](created_docs/figures/pulse_risk_card.png)

**The evidential status of this component must be stated precisely.** The Pulse Check was implemented, deployed and functionally verified end to end — question delivery, submission, construct derivation, scoring, persistence and manager readout — but it was **never populated with responses from real employees**. All data exercised through it is synthetic test data. Under a design science framing this remains a legitimate artifact contribution: the mechanism exists, works, and closes the loop between the research model and a deployable system. What it does not constitute is empirical evidence about real employee sentiment, and no claim of that kind is made anywhere in this dissertation.

Two further limitations follow from the same fact. The two-items-per-construct short form is not the full validated battery from which the constructs originate, and is therefore a noisier estimate; and because no responses were collected, the short form's internal consistency could not be assessed. Both are disclosed in the application's own interface as well as here, and both are carried into Chapter 6 as future work.
