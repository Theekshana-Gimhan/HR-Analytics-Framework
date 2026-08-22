# Project Diary / Logbook

**Student:** Theekshana Gimhan · **ID:** 15002
**Module:** COM 4901 — Final Year Individual Project
**Supervisor:** Ms. Thanuja Irugalbandara
**Project:** A Cost-Effective Predictive HR Analytics Framework for Sri Lankan SMEs Using Cloud-Native Serverless AI
**Period covered:** 4 April 2026 – 31 August 2026

Maintained under §7 of the Final Year Research Project Guidelines, which requires a record of **meeting dates, supervisor feedback, tasks completed, and challenges faced**. Those four elements appear as §1, §2 and §3 respectively.

**Provenance note.** The work log in §2 is reconstructed from the project's Git version-control history, which timestamps every unit of work as it was committed. Those timestamps are contemporaneous evidence rather than recollection, and the repository is available for inspection. §1, the supervisor meeting record, cannot be reconstructed this way and is completed from the student's own records.

---

## 1. Supervisor Meetings

> **TO BE COMPLETED BY THE STUDENT.** These entries cannot be derived from the repository. Fill in each meeting held, the feedback received, and the action taken. If exact dates are uncertain, give the week rather than inventing a date.

| # | Date | Mode | Topics discussed | Supervisor feedback | Action taken |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |

**Key milestones for cross-reference when completing the table above:**

| Date | Milestone |
|---|---|
| March 2026 | Proposal submitted and approved; proposal presentation delivered |
| 4 April 2026 | Repository initialised with the approved proposal |
| 29 June 2026 | Interim Report submitted (20 pp, 6 figures, 5 tables, 21 references) |
| ~24 August 2026 | Dissertation draft due with supervisor (one week before submission) |
| 31 August 2026 | Final Report submission |
| 2–9 September 2026 | Final presentation and viva |

---

## 2. Work Log

### Phase 1 — Foundation and proposal (April 2026)

| Date | Work completed |
|---|---|
| 4 Apr | Repository initialised. Research proposal, reference collection and the base HR system committed as the project baseline. |

Objective for the phase: establish an approved topic, a supervisor, and a working codebase to build the research on rather than starting the engineering from zero.

### Phase 2 — Data strategy and the ML pipeline (May 2026)

| Date | Work completed |
|---|---|
| 10 May | Project README and a six-phase plan with the GCP technology stack documented. |
| 10 May | Synthetic data generator built; 500 calibrated SME HR records produced. |
| 10 May | First master training dataset assembled by merging IBM and synthetic sources. |
| 10 May | **Pipeline rebuilt** on a real-data calibration strategy after the first merge proved methodologically unsound (see C1). |
| 16 May | Russian employee turnover dataset added as a third real-data source. |

This phase established the hybrid data strategy that RQ3 tests: real international sources weighted 2.0, calibrated synthetic weighted 0.5, income z-score normalised within each source before merging.

### Phase 3 — Modelling, deployment and integration (June 2026)

| Date | Work completed |
|---|---|
| 2 Jun | Transfer-versus-local evaluation implemented; data pipeline hardened with target-integrity assertions. |
| 20 Jun | Both attrition models deployed to Cloud Run (`kpi-uat`), IAM-locked and scaling to zero. |
| 28 Jun | Attrition models integrated into the production HR application over the API boundary. |
| 29 Jun | Cold-start fix and the Pulse Check capture mechanism merged and verified end to end on dev. |
| 29 Jun | Sri Lankan validation dataset attribution corrected. |
| 29 Jun | **Interim Report submitted** — figures, SHAP plots and UI screenshots embedded. |

The two-model comparison implemented on 2 June produced the result that became the dissertation's central finding, although at this stage the weak transfer score was still being read as a defect rather than as evidence.

### Phase 4 — Evaluation hardening and audit (July – August 2026)

| Date | Work completed |
|---|---|
| 5 Jul | Project record synchronised post-interim; a twelve-item audit and fine-tuning plan defined. |
| 5 Jul | **P1** — leakage and common-method-bias audit of the local model. The 0.94 result survived. |
| 6 Jul | **P2** — synthetic-data ablation answering RQ3. Augmentation lift marginal; transfer signal shown to be same-source. |
| 16 Aug | **P3–P5** — baseline comparison, threshold sensitivity and fairness audit completed. |
| 16 Aug | **P6** — operational cost measured at LKR 4,050/month. **P7** (ethics) closed as not required. |

Each audit item was implemented as a standalone script writing a machine-readable report, on the principle that a script written to *attack* a number is more trustworthy than one written to produce it. Three interim-stage claims did not survive this phase — see C6, C7 and C8.

### Phase 5 — Dissertation (August 2026)

| Date | Work completed |
|---|---|
| 16 Aug | Chapter 3 Methodology drafted; Markdown-to-Word build pipeline with stable citation keys implemented. |
| 16 Aug | Chapters 4 (Implementation) and 5 (Testing and Evaluation) drafted. |
| 16 Aug | Chapter 6 (Conclusions and Future Work) drafted. |
| 16 Aug | Chapter 1 (Introduction) drafted; research-question set aligned with the submitted interim (see C9). |
| 22 Aug | Chapter 2 (Literature Review) drafted; **P9** closed at 46 verified references. |
| 22 Aug | Heuristic evaluation worksheet prepared for the §5.10 usability inspection. |
| 22 Aug | Abstract drafted; project diary assembled. |

---

## 3. Challenges Faced and How They Were Resolved

Recorded because several of these shaped the research findings rather than merely delaying the work.

### Data and methodology

**C1 — No public Sri Lankan attrition data exists.** No individual-level record of observed employee attrition for Sri Lanka is publicly available. *Resolution:* a hybrid strategy — train on real international sources plus calibrated synthetic data, validate on a held-out real Sri Lankan survey. *Consequence:* testing whether this substitution works became the project's central research question, and the answer turned out to be no.

**C2 — The sources barely overlap on features.** Satisfaction measures exist only in the Saudi data, personality traits only in the Russian, attendance and leave only in the synthetic; only age, income and tenure are shared. *Resolution:* the transfer model was restricted to the four features genuinely common to training and validation, and SHAP findings on source-exclusive features are treated with explicit caution.

**C3 — Every source encodes the target differently.** The Saudi data uses `' Yes'`/`' No'` with leading spaces; the Russian label lives in an `event` column. *Resolution:* a single canonical `Attrition_binary` column, with the merge step asserting target integrity — no nulls, binary only, every source contributing labelled rows — before writing.

**C4 — Character encoding.** The Russian dataset is cp1251-encoded Cyrillic, which fails under default UTF-8 reads. *Resolution:* multi-encoding fallback in both scripts that consume it.

**C5 — The transfer model was weak, and it was not obvious this was a result.** Early readings treated ROC-AUC 0.641 as a modelling defect to be fixed. *Resolution:* the P2 decomposition established that age and gender together score 0.457 — below chance — and that the model's residual skill comes from same-source satisfaction items. The weakness was real, and reporting it became the dissertation's principal contribution rather than its embarrassment.

### Claims that did not survive audit

**C6 — The operating point was tuned on the data it was scored against.** Found during threshold-sensitivity analysis. *Resolution:* nested threshold selection; the honest operating point is reported (recall 0.879 / precision 0.580) rather than the flattering one.

**C7 — The sample-weighting scheme was immaterial.** The 2.0/0.5 real-versus-synthetic weighting, central to the stated data strategy, moved results by −0.007. *Resolution:* reported as a negative finding rather than quietly retained.

**C8 — The age-dominance claim was an artefact.** The interim reported age as dominating the transfer model. Age in the validation data takes four coded values with 88.7% at a single one. *Resolution:* the claim is formally withdrawn in Ch1 §1.7.

**C9 — Three conflicting research-question sets existed.** The proposal, the interim report and the internal project record each carried a different set. *Resolution:* the dissertation answers the **interim's** set, with all deviations from the proposal declared in Ch1 §1.7 before any result is presented.

**C10 — Fairness could not be validated.** The Sri Lankan sample contains two positive cases for women and six for employees over 25 — structurally too few for subgroup evaluation. *Resolution:* reported as an infeasibility with subgroup validation named as a deployment precondition, rather than reporting a fairness metric the sample cannot support.

### Engineering and infrastructure

**C11 — Cold starts on a scale-to-zero service.** The first request to an idle inference service could exceed the client timeout. *Resolution:* a 60-second per-request timeout with one automatic retry. Provisioning a minimum instance was deliberately rejected because it would have invalidated the cost thesis the architecture exists to demonstrate.

**C12 — Deployment pipeline failures.** A lockfile desynchronisation blocked all dev deploys, and GitHub Actions quota was exhausted at one point. *Resolution:* lockfile synchronisation shipped as a durability fix; a documented manual deploy procedure used while quota was unavailable.

**C13 — Library version drift.** A scikit-learn version mismatch between training and serving can break joblib unpickling silently. *Resolution:* the serving requirements pin the exact training version, and preprocessing in the service mirrors the training script for train/serve parity.

### Measurement and process

**C14 — Cloud billing could not answer the cost question.** The GCP project hosts four unrelated systems and shares a database instance six ways; no BigQuery billing export existed, and such exports are not retroactive. *Resolution:* per-resource attribution — measured usage from Cloud Monitoring multiplied by published unit rates. This is arguably the better method for the research question, since an SME would deploy single-tenant, and that scenario is reported as the headline.

**C15 — The usability study could not be run.** No participants were recruited and the timeline did not permit recruitment. *Resolution:* the objective is reported as **unmeasured — neither met nor refuted**, with a heuristic expert inspection substituted and the limits of that substitution stated explicitly. The SUS protocol is documented in full so the study remains directly repeatable.

**C16 — Ethical approval status was initially unclear.** *Resolution:* established that no human participants were involved at any point — the usability study never ran, and the Pulse Check was populated only with synthetic test data — so Guidelines §8 is not triggered. A written ethics statement appears in Ch3 §3.9 in place of an application.

---

## 4. Reflection

Two lessons stand out from the record above.

The first is that the most valuable result was the one that initially looked like a failure. The project set out expecting international training data to substitute for absent local data; the evidence says it cannot, and the audit phase made that conclusion robust to several attempts to explain it away.

The second is methodological. The claims that did not survive — C6, C7 and C8 — were all made confidently at the interim stage and were all found by writing a script specifically to attack a number rather than to produce one. That practice is what makes the limitations reported in the dissertation credible rather than decorative.
