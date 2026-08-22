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
| P3 | ✅ **Done 15 Aug 2026** — Baseline table: LogReg + Gradient Boosting beside RF, both settings (see results box below) | "Why RF?" viva question | Done |
| P4 | ✅ **Done 15 Aug 2026** — Threshold sensitivity across ≥ 3.0 / 3.5 / 4.0 (see results box below) | Binarization choice | Done |
| P5 | ✅ **Done 15 Aug 2026** — Fairness audit; rescoped to what the data supports (see results box below) | LO2, ethics, Age-dominance | Done |
| P6 | ✅ **Done 16 Aug 2026** — Cost attribution study (`scripts/cost_analysis.py`). Rescoped: the planned billing export is unusable because `kpi-uat` is shared with four unrelated systems and no detailed BigQuery billing export exists (nor is one retroactive). Method used instead: **measured usage × published unit price, attributed per resource**. Result: **LKR 4,050/month on the most conservative scenario — PASS** with ~2.5× headroom. See results box below. | RQ2 | Done |
| P7 | ✅ **Closed 16 Aug 2026 — not required.** Neither planned human-participant activity took place: the SUS study was never run and the Pulse Check was never populated with real employee responses (synthetic test data only). With no human participants and no primary data collection, Guidelines §8 is not triggered. Action is now a written ethics *statement* (Ch3 §3.9 + Appendix C), not an application. | Guidelines §8 | Done |

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

> **P3 results (15 Aug 2026)** — `scripts/baseline_comparison.py` → `reports/baseline_comparison.json`, `reports/baseline_comparison.png`. Three estimators, identical data/seeds/folds; GBM gets balanced `sample_weight` (it has no `class_weight`), LogReg is StandardScaler-wrapped. 5 seeds, mean ± SD. *Harness check: the local RF arm reproduces P1's leak-free 0.937 exactly.*
>
> | Arm | Random Forest | Logistic Regression | Gradient Boosting |
> |---|---|---|---|
> | **Local** (8 constructs, 5-fold CV) | **0.937 ± 0.006** | 0.823 ± 0.009 | 0.853 ± 0.016 |
> | **Transfer** (class_weight path) | 0.821 ± 0.020 | **0.854 ± 0.003** | 0.819 ± 0.018 |
> | **Transfer** (SMOTETOMEK, headline) | 0.718 ± 0.100 | **0.833 ± 0.005** | 0.393 ± 0.126 |
>
> - **The local model's RF choice is vindicated outright** — 0.937 vs 0.853 (GBM) and 0.823 (LogReg), Δ +0.084, |z| = 7.8. This is the deployed model and the 0.94 headline, so the "Why Random Forest?" question is answered where it matters. RF also has the best PR-AUC (0.790 vs 0.607 / 0.399) and Brier (0.061 vs 0.095 / 0.166).
> - **The transfer model's RF choice is NOT vindicated.** Logistic Regression beats RF on both paths (+0.033, |z| = 2.9 on class-weight; +0.115, |z| = 2.2 on SMOTETOMEK) and is an order of magnitude more stable (SD 0.003–0.005 vs 0.020–0.100). **This corroborates P2 from a new direction:** the transfer task carries so little genuine signal that a 4-feature *linear* model matches or beats an ensemble — RF's extra capacity buys variance, not accuracy. Report it; it strengthens rather than weakens the argument that the transfer setting is signal-poor.
> - **GBM collapses under SMOTETOMEK** (0.393 — below chance), a useful illustration that the resampling path is doing something violent to a 4-feature space.
>
> **Verdict:** RF is empirically the right estimator for the local model and is defended by a table rather than by assertion. For the transfer model, disclose that LogReg would be both better and steadier, and justify RF there on cross-model consistency and exact SHAP — or simply report the LogReg number alongside. *Final-report action:* add this table to Chapter 5; it closes the "chosen a priori" gap in A.4.4.

> **P4 results (15 Aug 2026)** — `scripts/threshold_sensitivity.py` → `reports/threshold_sensitivity.json`, `reports/threshold_sensitivity.png`. The SL target is re-derived from `ET_composite` at each cut; the master training target (real attrition) is unchanged throughout, so only what the transfer model is *scored against* moves.
>
> | Cut | Positives | Local ROC-AUC | Local boot 95% CI | Transfer (cw) | Transfer (smote) | Contrast (cw / smote) |
> |---|---|---|---|---|---|---|
> | ≥ 3.0 | 51 (22.2%) | 0.908 ± 0.011 | [0.83, 0.95] | 0.777 | 0.693 | **+0.131 / +0.215** |
> | **≥ 3.5 (current)** | 33 (14.3%) | **0.937 ± 0.006** | [0.88, 0.98] | 0.821 | 0.718 | **+0.116 / +0.218** |
> | ≥ 4.0 *(indicative)* | 12 (5.2%) | 0.849 ± 0.007 | [0.68, 0.95] | 0.755 | 0.675 | **+0.095 / +0.175** |
>
> - **The contrast survives every cut tested** — local beats transfer by +0.095 to +0.131 (class-weight) and +0.175 to +0.218 (SMOTETOMEK). The headline finding is *not* an artefact of the 3.5 binarisation.
> - **Only ≥ 3.0 and ≥ 3.5 clear the 20-positive reliability bar.** At ≥ 4.0 there are 12 positives (~2.4 per held-out fold) and the bootstrap CI widens to [0.68, 0.95] — reported, but explicitly labelled indicative. This is why the original "just rerun at ≥ 4.0" plan was widened to a three-point curve.
> - **Disclose honestly:** 3.5 happens to be where the local model scores highest (0.937 vs 0.908 and 0.849). The cut was fixed long before this analysis and the *contrast* holds at every point, but a reader is entitled to see the curve rather than take the best point on trust — so present the whole table, not the peak.
> - PR-AUC is reported against its own moving no-skill baseline at each cut (lift 3.7× / 5.5× / 8.5× for the local model); comparing raw PR-AUC across thresholds would be meaningless since the baseline *is* the prevalence.
>
> **Verdict:** the ≥ 3.5 binarisation is defensible and the transfer-vs-local contrast is threshold-robust. *Final-report action:* include the curve in Chapter 5 and cite it wherever the 3.5 choice is justified.

> **P5 results (15 Aug 2026)** — `scripts/fairness_audit.py` → `reports/fairness_audit.json`, `reports/fairness_audit.png`. **Rescoped from the original plan, and the reason is itself the finding.**
>
> **Why the planned subgroup table could not be produced:**
> - **`Age` is not a continuous variable.** It takes four values — 25 (n=204, **88.7%**), 35 (17), 45 (6), 52 (3) — almost certainly bracket midpoints from the source instrument. Age-band analysis reduces to one dominant band plus 26 people. **This also undercuts the interim report's Figure 6:** the transfer model's headline `Age` importance rests on a feature that is near-constant on the validation side. Fix the Figure 6 commentary in the final report.
> - **The female subgroup has 2 positive cases** (2/73 = 2.7%, vs male 31/157 = 19.8%). A female ROC-AUC on two positives is noise with a decimal point, so the script refuses to print one (`MIN_POSITIVES_FOR_AUC = 10`) rather than print a meaningless number.
>
> **What was measurable:**
> - **Evaluable slices show no degradation:** male ROC-AUC 0.941, age=25 ROC-AUC 0.943, overall 0.943. Where the model *can* be checked, it holds up.
> - **Four-fifths rule FAILS on both attributes — but the two failures mean opposite things**, which is why the raw ratio alone would have been misleading:
>   - **Gender:** selection-rate ratio 0.416 (FAIL), but the *base-rate* ratio is 0.139. The model's gap is **narrower** than the gap already in the outcomes — women are flagged at **3.0×** their own base rate vs men at 1.0×. Under differing base rates, four-fifths parity and calibration are mathematically incompatible (Kleinberg et al. 2016; Chouldechova 2017). This is a trade-off to argue, not a bug to fix.
>   - **Age:** selection-rate ratio 0.462 vs base-rate ratio 0.574 — here the model **amplifies** the disparity (over-25s flagged at 1.33× their base rate vs 1.07×). Flagged for attention, but the group is n=26 / 6 positives, so indicative only.
> - **Proxy test (new):** can `Gender` be recovered from the 8 constructs the deployed model uses? LogReg 5-fold CV → **ROC-AUC 0.655**. Weak but non-zero, so *"the local model excludes protected attributes"* is mostly — not entirely — true, and must be stated that way rather than as a clean defence.
> - **Drop-and-test on the transfer model:** removing `Age`+`Gender` gives **0.825 ± 0.014** vs **0.821 ± 0.020** with them (Δ **+0.004**, |z| = 0.23). **Dropping the protected attributes costs nothing and slightly helps** — consistent with P2's finding that `Age`+`Gender` alone score 0.46 (below chance).
>
> **Verdict:** fairness cannot be *fully* validated on this dataset, and the reason is structural rather than an oversight. The defensible position for the thesis: (i) the deployed local model takes no protected attribute as input, with the 0.655 proxy caveat disclosed; (ii) **recommend dropping `Age`+`Gender` from the transfer model outright** — the drop-and-test shows there is no accuracy argument for keeping them; (iii) report the four-fifths results *with* the base-rate decomposition; (iv) treat subgroup validation as an explicit **deployment precondition**, not a solved problem. *Final-report action:* this supports a full ethics/fairness section (LO2) with Kleinberg/Chouldechova, Barocas & Selbst, and the EU AI Act high-risk framing — see A.3 and A.5.5.

> **P6 results — cost attribution study (16 Aug 2026, `scripts/cost_analysis.py` → `reports/cost_analysis.json`, `reports/cost_analysis.png`)**
>
> - **Rescoped, and the reason is itself reportable.** The planned "export ≥ 1 month of billing" cannot answer RQ2 here: `kpi-uat` is a **shared** project — it also runs an Atlantis Terraform runner, a GitHub Actions runner dispatcher, a commission app and a KPI dashboard; the single `staging-sql-instance` carries **6 databases of which 2 are ours**; Artifact Registry holds 3 repositories. A project bill would charge the thesis for infrastructure it does not use. Resource-level attribution needs the *detailed* BigQuery billing export — **not enabled on any of the 4 projects on this billing account, and not retroactive**.
> - **Method used instead:** measured usage (Cloud Monitoring, 120-day window, data available from 23 Apr 2026) × published unit price, attributed per resource. Defensible as the *better* method, not a fallback: RQ2 asks what an SME would pay, and an SME deploys single-tenant.
> - **Result — PASS on all four scenarios**, headline on the most conservative: **LKR 4,050/month vs the LKR 10,000 target (~2.5× headroom)**. A: attributed share 2,256 / 2,353 (free tier applied / ignored); B: single-tenant SME 3,953 / **4,050**.
> - **Compute is not the cost.** All three Cloud Run services total ~LKR 82/month and fall entirely inside the free tier. **`simpalahr-ml-dev` consumed 150 billable instance-seconds in four months** — scale-to-zero doing exactly what the cost thesis claims, and direct empirical support for Decision 2 ("why not Vertex AI AutoML").
> - **The always-on database dominates**: LKR 2,828/month, ~70% of the total. The one component that cannot scale to zero is the one that costs money — a clean architectural finding.
> - **Artifact Registry is the surprise line item**: LKR 1,140/month for **37.7 GB** of accumulated container images. Build history, not operational data; a retention policy would remove most of it. Report as real but reducible.
> - **Caveats carried in the JSON:** rate-card not invoice prices; scenario A's Cloud SQL apportionment is by database count (an assumption, which scenario B avoids); egress and Cloud Build are not per-resource attributable in a shared project and are excluded from the headline; the always-free tier is per *billing account* so scenario A's free-tier credit is generous (another reason to headline B); and **usage is development traffic, not a 50-employee SME workload** — measured and modelled figures must never be conflated.
>
> **Verdict:** RQ2 is answered with a measured, script-traceable result. *Final-report action:* Ch5 §5.11 reports scenario B / no free tier as the headline, with the shared-project problem and the attribution method explained in Ch3 rather than apologised for. The three findings above are more interesting than the pass itself and should carry the section.

### Medium-term — August 2026 (evaluation completion + writing)

| # | Action | Notes |
|---|--------|-------|
| P8 | ⚠️ **Superseded 16 Aug 2026 — SUS study will not run.** No participants were recruited and there is no time left to do so. Replaced by a **Nielsen heuristic evaluation** over the same four task scenarios (no participants required). Ch5 §5.10 reports the SUS protocol *as designed* plus the heuristic evaluation *as executed*, and states plainly that the SUS > 80 target is **unmeasured** — neither met nor refuted — with the single-non-independent-evaluator bias disclosed | Metric 2 |
| P9 | ✅ **Closed 22 Aug 2026** — 46 verified refs (from 30), all cited, no orphans. [6] `kodakandla2021` **removed** and replaced by `adzic2017`/`eivy2017`/`jonas2019`; [4] `charney2024` retained but restricted to the market-pricing claim; [5] `googlecloud2024vertex` supplemented by `jonas2019`. Ch2 drafted, 2,376 words. Every added reference was verified against a publisher/arXiv/indexing record — none cited from recall. | Fed Ch2 |
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
