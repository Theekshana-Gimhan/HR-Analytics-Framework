# Final Report (COM4901) — Outline and Source Map

**Student:** Theekshana Gimhan (ID 15002) · **Supervisor:** Ms. Thanuja Irugalbandara
**Deliverable:** Final Report, 30% of module · **LMS deadline:** 31 August 2026
**Supervisor draft due:** ~24 August 2026 (the ≥1-week review rule)
**Created:** 16 August 2026

---

## Purpose of this document

This is the build plan for the dissertation. Every section below carries:

- a **word target**, so the 10,000-word minimum is a schedule rather than a surprise;
- a **source**, so no section is written from memory when a written record exists;
- a **status**, so it is always obvious what can be drafted today and what is waiting on something.

Nothing here is prose to be pasted into the thesis. It is the map that makes each drafting session mechanical.

### Status legend

| Status | Meaning |
|---|---|
| **READY** | Evidence exists and is frozen. Draft immediately. |
| **LIFT** | Adapt and expand from the Interim Report. Needs rewriting, not copying (Turnitin sees self-overlap). |
| **NEW** | No existing text, but no blocker either. Write from scratch. |
| **P9** | Needs the literature expansion (21 → 40+ IEEE refs) before it can be written properly. |
| **SUBSTITUTED** | The planned method could not be executed. A justified alternative is reported in its place, with the substitution disclosed. |

---

## Scope decision, 16 August 2026 — no primary data collection

Recorded here because it changes several sections at once, and because the dissertation must state it consistently everywhere.

**Neither planned human-participant activity took place.** The SUS usability study was never run, and the Pulse Check — although built, deployed and functionally verified — was never populated with responses from real employees. All Pulse Check data to date is synthetic test data.

Three consequences:

1. **P7 (ethics approval) is closed, not blocked.** Guidelines §8 requires approval for projects involving human participants or personal data. This project has neither. All model data is **secondary and published**, used under the source studies' own ethics approvals. What the thesis needs is not an application but a short, accurate ethics statement — see Ch3 §3.9.
2. **Metric 2 (SUS > 80) cannot be measured.** It is replaced by a **Nielsen heuristic evaluation** over the same task scenarios — see Ch5 §5.10.
3. **A precision requirement across the whole document.** The Pulse Check must never be described in a way that implies real employees used it. `masters_plan.md` currently calls it "live on dev," which is true of the *deployment* but will be read as "live with real users." Every mention must be: built, deployed, functionally verified, **no real respondents**. Under Design Science this is still a legitimate artifact contribution — but overstating it would be a factual error, and it would drag the PDPA and ethics sections down with it.

---

## Format requirements (from `campus_docs/Final_Year_Research_Project_Guidelines.md` §10)

| Item | Requirement |
|---|---|
| Font / spacing / margins | Times New Roman 12 · 1.5 spacing · 1 inch |
| References | **IEEE** |
| Minimum length | **10,000 words**, excluding references and appendices |
| Plagiarism | Turnitin report required at submission |
| Submission bundle | Dissertation (PDF **and** Word), slides, source code, datasets, plagiarism report, **project diary/logbook** |

> **Note on the logbook (P11):** it is a *mandatory submission item*, not optional evidence. It is currently not started and is easy to forget until the night before. Budget half a day.

---

## Word budget

Target **~11,500 words** against a 10,000 minimum — the 15% headroom absorbs the cuts that always follow supervisor feedback.

| Chapter | Target | Of which liftable | Net new |
|---|---:|---:|---:|
| Abstract | 300 | 150 | 150 |
| Ch1 Introduction | 1,200 | 900 | 300 |
| Ch2 Literature Review | 2,200 | 500 | 1,700 |
| Ch3 Methodology / Design | 2,300 | 700 | 1,600 |
| Ch4 Implementation | 2,000 | 600 | 1,400 |
| Ch5 Testing & Evaluation | 3,000 | 400 | 2,600 |
| Ch6 Conclusions & Future Work | 1,000 | 100 | 900 |
| **Total** | **12,000** | **3,350** | **8,650** |

The Interim Report is ~4,000 words in total, so roughly 3,350 of it survives into the final in adapted form. **The real writing job is about 8,650 net new words** — a little over 1,000 words per working day across the 8 days to the supervisor draft.

---

## Primary evidence sources

These are the files each chapter draws on. All are in this repository.

| Source | What it holds |
|---|---|
| `masters_plan.md` | The comprehensive running record. §-references below are to its headings. |
| `created_docs/Audit_and_FineTuning_Plan.md` | P1–P12 audit plan with results boxes for P1–P5. |
| `created_docs/Interim_Report_COM4901_Theekshana_Gimhan.docx` | ~4,000 words, 6 figures, 5 tables, 21 IEEE refs. |
| `reports/training_report.json` | Headline two-model result. |
| `reports/audit_local_model.json` | P1 — leakage / CMB audit. |
| `reports/ablation_synthetic.json` | P2 — RQ3 synthetic ablation. |
| `reports/baseline_comparison.json` | P3 — estimator justification. |
| `reports/threshold_sensitivity.json` | P4 — binarisation sensitivity. |
| `reports/fairness_audit.json` | P5 — fairness and its structural limits. |
| `scripts/*.py` | 12 scripts; the reproducibility claim rests on these. |
| `references/` | 17 papers on disk (21 cited in the interim). |
| `created_docs/dissertation/references.md` | **Central keyed reference list** — 30 entries. Chapters cite `[@key]`; the build script resolves keys to IEEE numbers in order of first appearance, so P9 can expand to 40+ without touching a single in-text citation. |
| `created_docs/dissertation/*.md` | Chapter drafts, one file per chapter. |

---

## Front matter

| Item | Status | Notes |
|---|---|---|
| Title page | NEW | Title, name, ID 15002, supervisor, KIU, degree, date. |
| Abstract | NEW (last) | 300 words. Write **after** Ch6 — it must state the headline contrast (0.94 local vs 0.64 transfer) and the honest caveat. |
| Acknowledgement | NEW | Supervisor, KIU, dataset providers. |
| Table of Contents | AUTO | Word field. Regenerate before export. |
| List of Figures / Tables | AUTO | Word field. Requires every figure to carry a proper caption. |
| List of Abbreviations | NEW | Worth adding: EPF/ETF/PAYE, SHAP, CMB, DSR, PDPA, SME, ROC-AUC, SMOTETOMEK. |

---

## Chapter 1 — Introduction · 1,200 words

| § | Section | Words | Source | Status |
|---|---|---:|---|---|
| 1.1 | Background and motivation | 250 | `masters_plan.md` §1 (L28–51); Interim 1.1 | LIFT |
| 1.2 | Problem statement | 200 | §1 "The Research Gap" (L46); Interim 1.2 | LIFT |
| 1.3 | Research questions | 150 | §2 (L52–64); Interim 1.3 | LIFT |
| 1.4 | Aim and objectives | 200 | §2 "Three Measurable Targets" (L65–80); Interim 1.4 | LIFT |
| 1.5 | Scope and delimitations | 150 | Interim 1.5 | LIFT |
| 1.6 | **Contributions of this work** | 150 | NEW — see below | NEW |
| 1.7 | Dissertation structure | 100 | NEW | NEW |

**§1.6 is the most important new paragraph in Chapter 1.** The examiner needs the contribution stated plainly and early. Four claims, each defensible from evidence already in hand:

1. An empirical demonstration that HR attrition models **do not transfer** across national contexts on demographically-shared features (0.64), while a locally-fitted psychometric model performs strongly (0.94) — with the gap shown to be robust to leakage, estimator choice, and target binarisation.
2. A **cost-viable serverless reference architecture** for SME-scale predictive HR analytics (scale-to-zero inference, monthly retraining).
3. A working **data-capture loop** (Pulse Check) that produces the model's own input features in production, closing the gap between a research model and a deployable one.
4. A **negative and infeasibility result reported honestly** — the transfer model's weakness, and the structural impossibility of subgroup fairness validation on this sample — rather than suppressed.

---

## Chapter 2 — Literature Review · 2,200 words

The weakest chapter today: the interim carried a "(Status)" heading and 21 references against a target of 40+. This is **P9**, and it is the one chapter where drafting is genuinely blocked on new reading.

| § | Section | Words | Source | Status |
|---|---|---:|---|---|
| 2.1 | ML for employee attrition prediction | 350 | `references/`; Interim 2 | LIFT + P9 |
| 2.2 | Explainable AI in HR decisions (SHAP) | 250 | Lundberg & Lee; `references/` | P9 |
| 2.3 | **Cross-context transfer of HR models** | 350 | Mostly new reading | **P9 — the gap section** |
| 2.4 | Serverless / cloud-native AI economics | 300 | Interim 2; `masters_plan.md` §8 (L564–589) | LIFT + P9 |
| 2.5 | HR analytics in SMEs and developing economies | 300 | Interim 2 | LIFT + P9 |
| 2.6 | Turnover intention and psychometric constructs | 300 | Source PLoS ONE battery; Podsakoff et al. 2003 (CMB) | P9 |
| 2.7 | Fairness and ethics in algorithmic HR | 250 | Kleinberg et al. 2016; Chouldechova 2017; EEOC four-fifths | P9 — already cited in P5 |
| 2.8 | Synthesis and research gap | 100 | NEW | NEW |

**§2.3 carries the thesis.** The whole contribution is that the transfer failed; the literature review has to establish that the field *assumed* transfer would work, or the negative result reads as a bug rather than a finding.

**§2.7 is nearly free** — the P5 fairness audit already cites and applies Kleinberg, Chouldechova and the four-fifths rule. Those citations exist; the section is mostly assembly.

**Add usability-evaluation methods to the P9 reading list.** Ch5 §5.10 now rests on Nielsen & Molich (1990) for heuristic evaluation and Bangor et al. (2009) for the SUS interpretation bands. Both need to be introduced in Ch2 — fold them into §2.5 or give them a short §2.5.1 — otherwise the substituted method arrives in Ch5 with no theoretical grounding, which is exactly where a substitution looks improvised rather than reasoned.

---

## Chapter 3 — Methodology / Design · 2,200 words

Fully evidenced. **This chapter can be drafted today, end to end.**

| § | Section | Words | Source | Status |
|---|---|---:|---|---|
| 3.1 | Research approach: Design Science (DSRM) | 250 | Peffers et al. 2007; Interim 3.1 | LIFT |
| 3.2 | Research design: the two-model comparison | 250 | `masters_plan.md` §12 (L848–860) | READY |
| 3.3 | Data strategy and source selection | 350 | §4 (L134–164) | READY |
| 3.4 | Normalisation decisions (income z-score; ordinal rescale; NaN not zero) | 300 | §4 (L165–186) | READY |
| 3.5 | Calibration and synthetic generation | 250 | §4 (L187–222); §5 scripts 3–4 | READY |
| 3.6 | Construct computation and feature sets | 250 | `scripts/preprocess_raw.py`; §5 (L242–253) | READY |
| 3.7 | Model selection and training protocol | 250 | §12; `scripts/train_model.py` | READY |
| 3.8 | Evaluation design (CV, thresholds, bootstrap CIs) | 200 | `scripts/audit_local_model.py` | READY |
| 3.9 | **Ethical, legal and privacy design (PDPA)** | 200 | §7 (L441–476) | READY — **LO2** |

**§3.9 must now carry the explicit no-primary-data statement.** Draft wording:

> This project collected no primary data from human participants. All model training and validation data are secondary, previously published datasets, used under the ethics approvals obtained by their originating studies, which are cited in §3.3. The Pulse Check instrument was implemented and functionally verified using synthetic test data only; no employee responses were collected. Accordingly, the ethical approval requirement in the KIU project guidelines §8 was not triggered. Privacy-by-design measures nonetheless governed the system architecture throughout, in anticipation of real deployment and in compliance with the Sri Lanka Personal Data Protection Act No. 9 of 2022 (§3.9.1).

Then continue into the design measures that *were* implemented — PII stripping at the database layer, the employee-never-sees-own-score rule, manager visibility boundaries, and the cross-border DLP trigger. **The distinction to hold throughout: these were designed and built, not exercised on real data.** That is still a substantive LO2 answer, because the design decisions are real and reviewable.

**§3.4 is where the methodological care shows.** The income z-score, the per-dataset ordinal rescale, and the decision to encode missing values as NaN rather than 0 are exactly the kind of decisions a viva probes. Each has a written rationale in `masters_plan.md` — use it.

---

## Chapter 4 — Implementation · 2,000 words

Fully evidenced. Draftable today.

| § | Section | Words | Source | Status |
|---|---|---:|---|---|
| 4.1 | System architecture overview | 250 | §3 (L81–133); Interim 4.1 | LIFT |
| 4.2 | The HR platform (payroll, leave, attendance) | 350 | §6 (L339–440) | READY |
| 4.3 | Sri Lankan compliance implementation (EPF/ETF/PAYE, CIPS/SLIPS) | 250 | §6; `CLAUDE.md` compliance table | READY |
| 4.4 | The ML pipeline (5 scripts, in order) | 300 | §5 (L223–338) | READY |
| 4.5 | Serverless inference service | 300 | §8 (L479–500); `ml_service/` | READY |
| 4.6 | HR-app integration over the API boundary | 250 | §8 (L501–526); PRs #207/#208/#210 | READY |
| 4.7 | Pulse Check — closing the data loop | 300 | §8 (L527–553); PRs #211/#212 | READY |

**§4.7 must state the Pulse Check's evidential status in its opening lines**, not bury it in a caveat: implemented, deployed to the dev environment, functionally verified against synthetic test data, **never populated with real employee responses**. Frame the contribution as what it is — a designed and working data-capture mechanism that closes the loop between the research model and a deployable one — and put empirical validation of it in Ch6 future work. The 16-item short form's reliability is also unvalidated for the same reason (no responses to compute reliability from), which is a second, separate limitation.

**§4.6 deserves a design-rationale paragraph, not just a description.** The two repositories share no git history and integrate over HTTP rather than merging — that was a deliberate architectural decision with a defensible reason, and it reads as an accident if left unexplained.

**§4.5 should mention the cold-start decision explicitly**: a 60s timeout plus one retry was chosen over `min-instances=1` precisely because pinning an instance would break the cost thesis. That is an engineering decision *made in service of a research claim*, which is exactly what a Design Science chapter is for.

---

## Chapter 5 — Testing & Evaluation · 2,600 words

The strongest chapter and the largest. §5.3–§5.9 and §5.12 are frozen and reproducible. §5.10 is a substituted method and §5.11 needs the billing pull, but neither is blocked on anyone outside the project.

| § | Section | Words | Source | Status |
|---|---|---:|---|---|
| 5.1 | Evaluation protocol and metrics | 150 | §12 (L808–847) | READY |
| 5.2 | Software testing and QA | 200 | §9 (L590–632) | READY |
| 5.3 | **Headline result: transfer vs local** | 350 | `reports/training_report.json`; §12 (L848–860) | READY |
| 5.4 | P1 — leakage and common-method-bias audit | 250 | `reports/audit_local_model.json`; commit `23815fc` | READY |
| 5.5 | P2 — synthetic-data ablation (RQ3) | 250 | `reports/ablation_synthetic.json`; commit `fa3958b` | READY |
| 5.6 | P3 — estimator justification | 250 | `reports/baseline_comparison.json`; commit `8e0e4fc` | READY |
| 5.7 | P4 — threshold sensitivity | 200 | `reports/threshold_sensitivity.json` | READY |
| 5.8 | **P5 — fairness audit and its structural limits** | 300 | `reports/fairness_audit.json` | READY — **LO2** |
| 5.9 | Metric 1: Recall > 80% on the attrition class | 150 | §12 (L810–822) | READY |
| 5.10 | Metric 2: usability — heuristic evaluation | 350 | NEW; Nielsen & Molich 1990 | **SUBSTITUTED** |
| 5.11 | Metric 3: Cost < LKR 10,000/month | 250 | `reports/cost_analysis.json` | **READY — measured, LKR 4,050/mo** |
| 5.12 | Threats to validity and limitations | 300 | §12 (L861–880), limitations #1–#10 | READY |

### §5.10 — the substituted usability evaluation

The SUS study could not be run within the timeframe. Rather than leave a stated objective unanswered, this section reports **both halves honestly**:

**Part A — the SUS protocol as designed** (~120 words). The 10-item instrument, the 5–10 participant SME HR-manager profile, the four task scenarios already specified in `masters_plan.md` §12 (L823–837), and the 0–100 scoring with the Bangor et al. (2009) interpretation bands. This demonstrates evaluation *design* capability, which is what LO5 assesses, and it makes the study directly repeatable by anyone continuing the work.

**Part B — the heuristic evaluation actually performed** (~230 words). Nielsen and Molich's 10 usability heuristics applied across the same four task scenarios, using the deployed system and the interface screenshots in `created_docs/figures/`. Report as a table: heuristic, observation, severity rating (0–4), affected screen. Then summarise counts by severity and name the top three issues.

**Two disclosures this section must carry in its own words**, not buried in §5.12:

1. Heuristic evaluation is an **expert inspection method, not a user-based measurement**. It surfaces usability problems; it does not produce a satisfaction score. So **Metric 2's numeric target of SUS > 80 is neither met nor refuted — it is unmeasured**. Say that directly.
2. The evaluation was conducted by the system's **own developer**, carrying an acknowledged self-assessment bias. Nielsen's own guidance recommends 3–5 independent evaluators; a single non-independent evaluator is a genuine weakness and should be named as one.

Handled this way, the substitution reads as sound research conduct under time constraint. Handled by quietly dropping the objective, it reads as an unmet promise.

### §5.11 — the cost result · **DONE 16 Aug 2026**

Measured via `scripts/cost_analysis.py` → `reports/cost_analysis.json` / `.png`. **Headline: LKR 4,050/month against the LKR 10,000 target — PASS with ~2.5× headroom**, on the most conservative of four scenarios.

**The method needs explaining in Ch3, not apologising for in Ch5.** A project-level bill was unusable because `kpi-uat` is shared with four unrelated systems, and no detailed BigQuery billing export exists (nor is one retroactive). The method used — measured usage × published unit price, attributed per resource — is a better answer to RQ2 anyway, because RQ2 asks what an *SME* would pay and an SME deploys single-tenant. Put the shared-project problem and the attribution logic in Ch3 §3.8 or a short §5.11 preamble; the reader must understand why before they see the number.

**Lead the section with the three findings, not the pass** — the pass is expected, the findings are interesting:

1. **Compute is not the cost.** All three Cloud Run services total ~LKR 82/month, entirely inside the free tier. `simpalahr-ml-dev` used **150 billable seconds in four months**. This is direct empirical support for the "why not Vertex AI AutoML" decision — link it back to Ch3 §3.7.
2. **The always-on database dominates** at LKR 2,828/month (70%). The one component that cannot scale to zero is the one that costs money. That is the architectural lesson of the whole cost study.
3. **Artifact Registry is the hidden line item**: LKR 1,140/month for 37.7 GB of accumulated container images — build history, not operational data, and largely removable with a retention policy.

**Disclosures this section must carry:** rate-card rather than invoice prices; scenario A's Cloud SQL apportionment is an assumption (scenario B avoids it); egress and Cloud Build are excluded as unattributable in a shared project; the free tier is granted per billing account; and usage is **development traffic, not a 50-employee SME workload** — report measured and modelled separately and never present one as the other. That last point is the "idle-vs-operational cost wording" fix already flagged in P12, so make it once, here and in the abstract.

### Two corrections that must land in this chapter

Both come out of the audit and are easy to lose between documents:

1. **Figure 6 / the "Age dominates the transfer model" claim must be reworded.** On the Sri Lankan validation side `Age` has only 4 coded values with 88.7% at a single value, so the apparent dominance is a coding artefact, not a substantive age effect. Carrying the interim's wording into the final would be a factual error the audit already caught.
2. **State the recommendation to drop `Age` and `Gender` from the transfer model.** Drop-and-test showed removal costs nothing (Δ +0.004) — which makes it both a performance-neutral and an ethically preferable design.

---

## Chapter 6 — Conclusions and Future Work · 1,000 words

| § | Section | Words | Source | Status |
|---|---|---:|---|---|
| 6.1 | Answers to the research questions | 300 | Ch5 results | NEW |
| 6.2 | Contributions revisited | 200 | §1.6 | NEW |
| 6.3 | Limitations | 200 | §12 (L861–880) | READY |
| 6.4 | Future work | 200 | §11 (L776–796) stretch items | READY |
| 6.5 | Reflection on the process | 100 | NEW — feeds the viva | NEW |

**§6.1 must answer each RQ in one direct sentence before elaborating.** Including the uncomfortable one: the answer to the transfer question is "no, not on shared demographic features" — and that is a result, not a failure.

---

## Appendices (not counted toward the 10,000 words)

| Appendix | Content | Status |
|---|---|---|
| A | Source code listing / repository structure | READY |
| B | Dataset schemas and provenance | READY |
| C | Ethics statement (no primary data collection; secondary-source approvals cited) | READY |
| D | SUS instrument as designed + heuristic evaluation worksheet | READY |
| E | Pulse Check 16-item instrument | READY |
| F | Full audit report JSON extracts (P1–P5) | READY |
| G | Project diary / logbook | **P11 — mandatory, not started** |
| H | Turnitin originality report | Generate at submission |

---

## Figure and table register

Every figure needs a numbered caption and an in-text reference, or the auto-generated List of Figures will be wrong.

### Figures that already exist

| File | Proposed use |
|---|---|
| `reports/shap_summary.png` | Ch5 — transfer model explainability |
| `reports/shap_local.png` | Ch5 — local model explainability |
| `reports/audit_local_calibration.png` | Ch5 §5.4 |
| `reports/ablation_synthetic.png` | Ch5 §5.5 |
| `reports/baseline_comparison.png` | Ch5 §5.6 |
| `reports/threshold_sensitivity.png` | Ch5 §5.7 |
| `reports/fairness_audit.png` | Ch5 §5.8 |
| `reports/cost_analysis.png` | Ch5 §5.11 — scenarios vs target, and cost breakdown |
| `created_docs/figures/dashboard.png` | Ch4 §4.2 |
| `created_docs/figures/attrition_risk_card.png` | Ch4 §4.6 |
| `created_docs/figures/pulse_check_page.png` | Ch4 §4.7 |
| `created_docs/figures/pulse_risk_card.png` | Ch4 §4.7 |

### Figures still to produce

| Figure | Chapter | Source |
|---|---|---|
| DSRM process diagram | Ch3 §3.1 | Peffers et al. 2007, adapted |
| System architecture diagram | Ch4 §4.1 | Reuse/redraw from interim |
| ML pipeline dependency graph | Ch4 §4.4 | `masters_plan.md` §5 (L316–338) |
| Data flow / privacy boundary diagram | Ch3 §3.9 | §7 (L441–476) — supports LO2 |
| ROC curves, both models on one axis | Ch5 §5.3 | Small plotting script; not yet written |

---

## Learning-outcome coverage

Examiners mark against these. Worth checking off before submission.

| LO | Where it is evidenced |
|---|---|
| LO1 — Develop a proposal to solve a domain problem | Ch1 (all) |
| **LO2 — Ethical / professional issues** | Ch3 §3.9 (PDPA, privacy by design), Ch5 §5.8 (fairness audit), Appendix C (ethics approval) |
| LO3 — Literature survey | Ch2 (all) — **the weakest coverage today** |
| LO4 — Methodology to design and implement | Ch3, Ch4 |
| LO5 — Implement, test, evaluate, validate | Ch4, Ch5 |
| LO6 — Written and oral communication | The document itself; the September viva |

**LO2 is unusually well covered** — the fairness audit and the PDPA design work together to answer it with evidence rather than assertion. That is worth foregrounding, because most projects answer LO2 with a paragraph of good intentions.

**LO3 is the exposure.** P9 is not optional.

---

## Suggested drafting order

Ordered by "fully evidenced and unblocked" first, so that if time runs out, what is missing is the part that was always going to be thin.

| # | Task | Est. | Depends on |
|---|---|---|---|
| ~~1~~ | ~~Ch3 Methodology~~ | ✅ **done 16 Aug** | `created_docs/dissertation/ch3_methodology.md` |
| ~~2~~ | ~~Ch4 Implementation~~ | ✅ **done 16 Aug** | `ch4_implementation.md` — 1,947 words, 4 figures |
| ~~3~~ | ~~Ch5 Testing & Evaluation~~ | ✅ **done 16 Aug** | `ch5_evaluation.md` — 2,908 words, 6 figures, 6 tables. **§5.10 Part B still blank** — see item 5 |
| ~~4~~ | ~~Pull GCP billing → §5.11 cost result~~ | ✅ **done 16 Aug** | `scripts/cost_analysis.py` |
| 5 | Heuristic evaluation → §5.10 | 0.5 day | Deployed system + screenshots |
| 6 | Ch1 Introduction | 0.5 day | — |
| 7 | Ch2 Literature Review | 1.5 days | **P9 reading** |
| ~~8~~ | ~~Ch6 Conclusions~~ | ✅ **done 16 Aug** | `ch6_conclusions.md` — 1,181 words |
| 9 | Abstract, front matter, figure captions | 0.5 day | All chapters |
| 10 | P11 project diary / logbook | 0.5 day | — |
| 11 | Format pass, Turnitin, export PDF + Word | 0.5 day | All |

That totals roughly **8 working days against an ~8-day window** to the supervisor draft. **It closes**, provided Ch2's reading starts in parallel with Ch3/Ch4 drafting rather than after Ch5.

**Nothing on this list now depends on a third party.** With no ethics application to wait on and no participants to recruit, every remaining item is within the project's own control — which is a materially better position than the plan was in this morning, even though it costs the SUS number.

---

## Open risks

| Risk | Impact | Response |
|---|---|---|
| **Metric 2 is unmeasured** — an objective stated in Ch1 has no numeric result | Marks lost if it looks like a silently abandoned promise | Report it as an explicit substitution in §5.10: protocol as designed, heuristic evaluation as executed, both disclosures stated. Carry it into Ch6 §6.3 and future work. |
| **The Pulse Check could be read as having had real users** | A factual overstatement that would undermine the ethics and PDPA sections | Fix the wording at every mention (§4.7, §3.9, abstract). Also correct "live on dev" in `masters_plan.md` so the source record stops feeding the wrong phrasing. |
| **Cost is measured at development traffic, not SME workload** | Overstates the cost claim if not qualified | Report measured billing *and* the modelled 50-employee workload separately; never present one as the other. |
| **P9 literature is 21 of 40+ refs** | Directly damages LO3 | Start the reading in parallel with Ch3/Ch4 drafting, not after. |
| **P11 logbook is a mandatory submission item** | Incomplete submission bundle | Reconstruct from git history and `masters_plan.md` §10–11; half a day. |
| Turnitin flags interim self-overlap | Delay at submission | Rewrite lifted sections rather than pasting; check early, not on the 31st. |

---

## The standing rule for this document

Numbers in the dissertation come from `reports/*.json` and nowhere else. If a figure cannot be traced to a script in `scripts/`, it does not go in. The audit was run precisely so that this rule could be followed — and it is what makes the honest limitations credible rather than performative.
