# NexusHR — Research Audit & Fine-Tuning Plan

**Subject:** "A Cost-Effective Predictive HR Analytics Framework for Sri Lankan SMEs Using Cloud-Native Serverless AI" (COM4901)
**Basis:** Interim Report (June 2026) + project record (`masters_plan.md`)
**Purpose:** Audit the current draft and produce a prioritized plan to harden the work for the Final Report (due 31 Aug 2026) and viva.
**Date:** 05 July 2026

---

## Part A — Section-by-Section Audit

### A.1 Abstract
**Verdict: Strong, one factual inconsistency.**
- Clear problem → method → finding → cost arc; the transfer-vs-local contrast is correctly foregrounded.
- **Defect:** the abstract says "*Measured idle cost is approximately LKR 140 per month*", but §5.2 states idle cost is **effectively nil** and LKR 140 is the **operational** cost for a representative 50-employee workload. Fix the abstract to "measured operational cost ≈ LKR 140/month; idle cost is effectively zero (scale-to-zero)". An examiner who catches this will probe every other number.

### A.2 Chapter 1 — Introduction
**Verdict: Sound structure; two evidentiary weaknesses.**
1. The headline economic claim (USD 8–15 PEPM → LKR 240,000–450,000/yr) rests on **[4], a practitioner blog** (People Managing People). For the final report, triangulate with at least one additional source: published vendor price lists (Workday/SAP partner pricing docs), a Gartner/Forrester market note, or an academic HRIS-cost study. A single blog citation under a 15%-weighted claim is fragile.
2. "Sri Lanka's intensifying skilled-worker emigration (over 300,000 departures annually) [17]" — the SLBFE figure counts **all departures for foreign employment**, not only skilled workers. Reword: "over 300,000 annual departures for foreign employment, an increasing share of them skilled workers" (and verify the skilled-share statistic in the SLBFE annual report before citing it).
3. **RQ3 has no dedicated experiment yet** (see A.5.2) — flag now because the RQ framing commits you to answering it.

### A.3 Chapter 2 — Literature Review
**Verdict: Adequate for interim; materially short for a dissertation.**
- 21 references is fine at interim stage; a BSc(Hons) dissertation examiner will expect **~40+**, and the *gaps map exactly onto the project's own contributions*, i.e. the literature you most need is the literature that frames what you actually found:
  - **Cross-domain / cross-cultural transfer** in ML and in HR analytics specifically (domain shift, covariate shift, label shift). Your central finding IS a transfer failure — currently zero transfer-learning literature is cited.
  - **Synthetic tabular data generation** (SMOTE is cited, but the calibrated-generator approach needs framing against CTGAN/copula/simulation-based literature to show you knowingly chose a simpler method).
  - **Turnover-intention measurement validity** (intention–behaviour gap [20] is cited — good — but add the measurement side: turnover intention scales, their predictive validity meta-analyses).
  - **Common method bias** (Podsakoff et al. 2003) — directly relevant to the 0.94 result (see A.5.1).
  - **Fairness/bias in algorithmic HR** (e.g., Barocas & Selbst; Mehrabi et al. survey; the EU AI Act's classification of employment ML as *high-risk* is a strong comparative frame next to PDPA).
- **Rigor slip:** "exceeding 85% *accuracy* on benchmark data [9], [10]" — accuracy is the wrong metric on imbalanced attrition data, and the rest of the report is scrupulous about this. Reframe using AUC/F1 and add a sentence critiquing accuracy-reporting in prior work (this turns a weakness into a positioning point).
- **Weak venues:** [6] (Iconic Research and Engineering Journals) is a low-quality outlet; replace or supplement with Baldini et al. (2017), the Berkeley "Cloud Programming Simplified" view (Jonas et al., 2019), or Eismann et al. (IEEE TSE 2021) for serverless economics. [5] (Google marketing page) is fine as a technical reference but should not carry the scholarly weight of the "pay-per-prediction economics" claim alone.

### A.4 Chapter 3 — Methodology
**Verdict: The strongest and the most exposed chapter. Four issues, one of them the single biggest threat to the thesis.**

1. **DSR mapping is asserted, not demonstrated.** Hevner [13] is cited, but the final report should map each project phase to an explicit DSR process model — **Peffers et al. (2007) DSRM** fits your staged narrative (problem → objectives → design → demonstration → evaluation → communication) better than Hevner's guidelines alone. One table does this.
2. **Comparability of Saudi/Russian data to Sri Lanka is asserted** ("comparable workforce dynamics") without evidence. Either justify (labour-market indicators, cultural-dimension proximity, sector composition) or — better — soften the claim and note that *the transfer experiment itself tests comparability empirically* (and finds it weak). The second framing is both more honest and more elegant.
3. **⚠ THE CONFOUND (highest-priority intellectual issue):** the transfer evaluation trains on **observed attrition** (Saudi/Russian labels) and validates on **intention ≥ 3.5** (SL survey). The weak ROC-AUC 0.64 therefore conflates **(a) cross-cultural domain shift** with **(b) label shift (behaviour vs intention)**. The report's headline sentence — "directly quantifies why Sri Lanka requires its own HR data" — is only partially licensed: the result quantifies that *international behavioural models do not predict Sri Lankan stated intention*. An examiner who spots this can deflate the headline. **You cannot fully remove the confound without real SL attrition data, but you can (i) name it explicitly as a limitation, (ii) partially bound it** — e.g., evaluate the transfer model on an *intention-labelled international dataset* if one exists, or evaluate an SL-features model against the IBM benchmark — and (iii) reframe the claim as "cross-context transfer to the available Sri Lankan signal is weak, whichever component dominates, the practical conclusion — local data is required — holds."
4. **Analytical choices lack sensitivity evidence:**
   - Intention threshold **≥ 3.5** — justify (scale midpoint-plus? convention?) and report a **sensitivity run at ≥ 4.0** showing the transfer-vs-local contrast survives.
   - Sample weights **2.0 / 0.5** — ad hoc; report an ablation (1.0/1.0 and real-only).
   - **No baseline comparison** — RF was chosen a priori; add logistic regression and gradient boosting columns to the results table. "Why Random Forest?" is a guaranteed viva question; an empirical table is the cheapest possible armour.

### A.5 Chapter 5 — Preliminary Results
**Verdict: The transfer-vs-local framing is genuinely good research communication. Three substantive threats and one missing analysis.**

1. **⚠ The 0.94 is plausibly inflated by common method variance.** The eight predictor constructs and the four ET (intention) items come from the **same survey instrument, same respondents, same sitting**. Same-source Likert batteries share method variance (acquiescence, mood, halo), which inflates predictor–target association. With N=230 and ~33 positives, some of the 0.94 is likely method, not signal. Actions: (i) verify **no ET item overlaps or near-duplicates any construct item** (leakage audit); (ii) confirm **SMOTETOMEK and threshold tuning run strictly inside CV folds** (a classic leakage source that alone can produce 0.9+); (iii) cite Podsakoff and state CMB as a limitation; (iv) report **fold-level SD / bootstrap CI**, not just the multi-seed range 0.93–0.94 (ranges across seeds understate variance vs across folds).
2. **RQ3 is currently unanswered.** The hybrid-synthetic question has no experiment: nothing reports master-with-synthetic vs master-without-synthetic. One ablation run answers a whole research question. Do this before writing the final report.
3. **Precision of language:** "0.64, barely above chance" — 0.64 is *modestly* above chance; keep the honesty but keep it exact. Also note transfer PR-AUC 0.29 vs the 0.143 base rate is ~2× lift — reporting this is fairer and preempts a "you strawmanned the transfer model" challenge.
4. **Missing: probability calibration.** The product surfaces *risk bands* derived from predicted probabilities; nothing yet shows those probabilities are calibrated (Brier score, reliability diagram). Cheap to add; directly relevant to a deployed risk tool.
5. **Missing entirely: fairness/bias analysis.** Gender and Age are model inputs, and **Age dominates the transfer model** (your own Figure 6). For an employment ML system this is a material ethical and academic exposure — EU AI Act would class it high-risk; PDPA §s on automated decision-making are adjacent. Add: subgroup performance (AUC/recall by gender, by age band), a disparate-impact discussion, and an explicit design decision about protected attributes (keep-and-audit vs drop-and-test). This also strengthens LO2 (ethical/professional issues) which the module explicitly assesses.

### A.6 Cost Evaluation (§5.2)
**Verdict: Credible direction, needs measurement discipline.**
- "measured/estimated ≈ LKR 140/month" — **separate measured from estimated**. For the final report: (i) export actual GCP billing for ≥ 1 full month; (ii) define the comparison architectures precisely — *scale-to-zero Cloud Run* (yours) vs *min-instances=1 Cloud Run* vs *always-on e2-small VM* vs *Vertex AI endpoint* — with like-for-like workload from a scripted load test; (iii) include the hidden line items (Artifact Registry storage, Cloud Build minutes, Scheduler, egress, GCS); (iv) state the USD→LKR rate and date, and add a one-line sensitivity to FX movement (LKR volatility is nontrivial); (v) close the loop with the motivation: put the SaaS PEPM cost for the same 50-employee firm in the same table.
- The "even at 10× usage < LKR 1,500" claim is good — show the arithmetic in an appendix.

### A.7 Chapter 6 — Progress, Deviations, Plan
**Verdict: The transparency is a genuine strength. Two compliance gaps.**
- The deviations table (Vertex→Cloud Run, IBM→real multi-source, single-recall→transfer-vs-local) is exactly how deviations should be reported — keep this structure in the final dissertation.
- **Gap 1 — Ethics approval:** KIU guidelines §8: projects involving human participants or personal data require **ethical approval**. The pipeline uses human survey data (secondary, published — likely fine, cite the source study's ethics), but the **SUS study** and the **live Pulse Check** (weekly psychometric responses from real employees, visible to managers) are primary data collection. Before the SUS study, confirm what KIU requires and document it; in the thesis, add a dedicated ethics section covering consent, the employee-never-sees-own-score design, manager visibility, and surveillance concerns.
- **Gap 2 — Project Diary/Logbook:** required by guidelines §7 and listed in final submission requirements §13. It appears nowhere in the interim report or work plan. `masters_plan.md` + git history is superb raw material — schedule converting it into the required logbook format (meeting dates, supervisor feedback, tasks, challenges).
- Cosmetic: verify Tables 1–4 render correctly in the final Word/PDF (the text-layer extraction scrambles multi-line cells; confirmed earlier this is an extraction artifact, but re-check visually in the final document).

### A.8 References
- IEEE formatting is consistent. Weak links: [4] blog, [5] vendor page, [6] low-tier venue — replace/supplement per A.3. Target ~40+ for the final report; every new methodological defence above brings its own citations (Peffers, Podsakoff, transfer-learning, fairness, calibration).

---

## Part B — Overall Assessment

### Strengths
1. **The transfer-vs-local contrast is a real finding**, honestly framed, and more original than the ">80% recall" claim it replaced. Few undergraduate projects generate an empirical result that *is* the argument.
2. **Unusual implementation depth**: deployed product, reproducible 5-stage pipeline, IAM-locked serverless inference, train/serve parity, live Pulse Check — the artifact (DSR's core requirement) demonstrably exists.
3. **Methodological honesty** is systematic: NaN-vs-zero handling, per-source normalisation, held-out validation, limitations section, deviations table. This is the report's brand — protect it.
4. **Cost thesis is demonstrable, not aspirational** — scale-to-zero is deployed and the safety margin (140 vs 10,000) is enormous.
5. Scope discipline: clear in/out-of-scope; the Dialogflow→Pulse-Check descope is well argued on cost grounds.

### Weaknesses (ranked by threat to the grade)
1. **Label-shift confound in the transfer experiment** (A.4.3) — threatens the headline claim's precision.
2. **Possible inflation of the 0.94** via common method variance and/or CV leakage (A.5.1) — threatens the second headline number.
3. **RQ3 has no experiment** (A.5.2) — an unanswered research question is a direct marking liability.
4. **No fairness analysis despite Age/Gender features** (A.5.5) — ethical exposure + missed LO2 marks.
5. **No baselines, no sensitivity analyses, no calibration** (A.4.4, A.5.4) — rigor gaps an examiner probes first.
6. **Compliance gaps**: ethics approval for primary data collection; project logbook (A.7).
7. **Literature volume and two weak sources** (A.3, A.8).
8. Minor: abstract idle-vs-operational cost inconsistency; imprecise "barely above chance"; SLBFE statistic precision.

---

## Part C — Prioritized Fine-Tuning Plan

### Short-term — July 2026 (evaluation hardening; mostly runs on the existing pipeline)

| # | Action | Answers / Defends | Effort |
|---|--------|-------------------|--------|
| P1 | ✅ **Done 5 Jul 2026** — Leakage & CMB audit of the local model (see results box below) | The 0.94 headline | Done |
| P2 | ✅ **Done 6 Jul 2026** — RQ3 synthetic ablation + weight sensitivity + transfer-signal decomposition (see results box below) | RQ3, weights choice | Done |
| P3 | **Baseline table**: LogReg + Gradient Boosting beside RF, both settings | "Why RF?" viva question | 0.5–1 day |
| P4 | **Threshold sensitivity**: rerun SL target at ≥ 4.0; show contrast survives | Binarization choice | 0.5 day |
| P5 | **Fairness audit**: subgroup AUC/recall by gender & age band; document protected-attribute decision; add fairness paragraph + citations | LO2, ethics, Age-dominance | 1–2 days |
| P6 | **Formal cost study**: billing export ≥ 1 month; 3–4 architecture comparison via scripted load test; hidden line items; FX note; SaaS PEPM row | RQ2 | 2–3 days spread over the month |
| P7 | **Ethics compliance**: confirm KIU requirements for SUS + Pulse Check primary data; obtain approval/waiver before the SUS study | Guidelines §8; blocks P8 | admin, start immediately |

> **P1 results (5 Jul 2026)** — `scripts/audit_local_model.py` → `reports/audit_local_model.json`, `reports/audit_local_calibration.png`.
> The 0.94 was challenged on four fronts and survived three cleanly:
> - **Imputation leakage: none.** The construct matrix has **0% missing values**, so `train_model.py`'s "impute on all rows before CV" step is a no-op; re-running with fold-internal imputation gives an identical AUC (delta = 0.0000).
> - **Item-overlap leakage: none.** The target's `ET-1..4` items are a **disjoint** group from every predictor construct (confirmed in `preprocess_raw.py` `ITEM_GROUPS`). The predictor↔intention correlations (−0.43 to −0.61) are genuine + shared-method, not overlap.
> - **Stability: strong.** Leak-free ROC-AUC mean 0.937 (5 seeds 0.929–0.943); **bootstrap 95% CI [0.88, 0.98]**; per-fold SD 0.047; PR-AUC 0.815 (vs 0.143 baseline); **Brier 0.056** (well-calibrated — the reliability curve tracks the diagonal, slightly conservative at the top bin).
> - **The one real correction — operating point.** `train_model.py` tunes the F1-optimal threshold on the same out-of-fold predictions it then reports P/R at, so the interim **P 0.73 / R 0.82** is optimistic. Under **nested** threshold selection (tune on train folds, score on held-out fold) the honest operating point is **P 0.58 / R 0.88**. *Final-report action:* report 0.94 with its bootstrap CI, use the nested operating point (or label 0.73/0.82 as optimistic), and add a Harman's single-factor / marker-variable CMV note in Chapter 5.
>
> **Verdict:** the 0.94 ROC-AUC headline is defensible; the threshold-dependent precision claim needed the correction above. CMV remains a limitation to *disclose*, not a defect that invalidates the result.

> **P2 results (6 Jul 2026)** — `scripts/ablation_synthetic.py` → `reports/ablation_synthetic.json`, `reports/ablation_synthetic.png`. Transfer model, 6 conditions × 5 seeds, fixed 230-row SL validation set (harness verified: SMOTETOMEK/seed-42 reproduces the 0.64 headline exactly). *Scope note:* this concerns the **transfer** model — the 0.94 local model uses **no** synthetic data, so it is untouched by RQ3.
> - **RQ3 (does calibrated synthetic augmentation help?) — yes, marginally, and it is not harmful.** Class-weight path: ROC-AUC **0.821** with synthetic vs **0.788** real-only (Δ **+0.032**, |z|≈1.3 vs seed noise). SMOTETOMEK path: Δ +0.063 but within noise (|z|≈0.7). **Synthetic-only ≈ 0.53** (near random) — it carries no standalone transferable signal; it augments rather than drives.
> - **Sample weights (2.0/0.5) are immaterial.** 2.0/0.5 vs 1.0/1.0 → Δ **−0.007** (|z|≈0.4). The ad-hoc weighting is defensible but not load-bearing — disclose it as such rather than defend it as tuned.
> - **The "transfer" AUC is same-source, not cross-cultural.** Decomposition (class-weight, all rows): `Age`+`Gender` alone = **0.46** (below chance); `JobSatisfaction`+`WorkLifeBalance` alone = **0.83**; all four = 0.83. On the SL side JS/WLB are the survey's own constructs (CMV-linked to the intention target, per P1), so the 0.64–0.72 "transfer" number reflects same-instrument SL signal, not knowledge transferred from Saudi/Russia. Genuine cross-cultural demographic transfer is nil — which **strengthens** the "SL needs its own data" gap.
> - **The 0.64 headline is one unstable draw.** Seed-averaged SMOTETOMEK transfer is 0.72 ± 0.10 (range 0.57–0.85); a class-weighted transfer is 0.82 ± 0.02. Per the framing decision we **keep 0.64 as the documented recipe** and recontextualise it, rather than restate the number.
>
> **Verdict:** RQ3 is answered — the hybrid-synthetic strategy gives a small, non-harmful lift and the model does not depend on synthetic rows or on the specific weights. The transfer result is best reported via the demographic-vs-satisfaction decomposition. See masters_plan §12 limitation #7.

### Medium-term — August 2026 (evaluation completion + writing)

| # | Action | Notes |
|---|--------|-------|
| P8 | SUS study (5–10 SME stakeholders) — *after* P7 | Already planned |
| P9 | Literature expansion to ~40+ refs across the five missing areas (A.3); replace [4]/[6], supplement [5] | Feeds Ch2 |
| P10 | Final dissertation: reframe transfer claim with the label-shift confound named (A.4.3 wording); add a formal **Threats to Validity** section (construct/internal/external/conclusion); DSRM mapping table (Peffers) | The intellectual core of the writeup |
| P11 | Assemble the **Project Diary/Logbook** from masters_plan.md + git history + supervisor meeting notes | Required for final submission |
| P12 | Fix the small textual defects: abstract cost wording, "barely above chance", SLBFE precision, table rendering check | 0.5 day |

### Long-term / stretch (only if time permits — do not let these displace P1–P12)

| # | Action | Value |
|---|--------|-------|
| P13 | Partner SME real *attrition* (behaviour) data through the pipeline at weight 2.0 | Would dissolve the label-shift confound — highest scientific value, lowest controllability |
| P14 | Pulse Check short-form reliability: once ≥ ~50 real pulse responses exist, compute internal consistency of the 2-item construct pairs | Defends the 16-item descope empirically |
| P15 | Cloud DLP + BigQuery hardening | Nice-to-have; the PDPA story already stands on DB-layer stripping |

### Sequencing logic
P1 and P2 come first because they defend or refine the two headline numbers **before** any final-report prose is written around them — if either number moves, everything downstream inherits the corrected value. P7 starts immediately because ethics approval has external latency and gates P8. Everything in the short-term block reuses `scripts/train_model.py` infrastructure — no new systems are built, only new evidence extracted from existing ones.

---

*Prepared as an internal audit against COM4901 guidelines (KIU FCSE): LO1–LO6, 10,000-word minimum, IEEE referencing, Turnitin, supervisor review ≥ 1 week before LMS submission.*
