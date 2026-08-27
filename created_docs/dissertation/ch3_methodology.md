# Chapter 3 — Methodology and Design

## 3.1 Research Approach

This project is conducted as Design Science Research (DSR), the paradigm appropriate to enquiry in which the construction and evaluation of an information technology artifact is itself the contribution to knowledge [@hevner2004]. The artifact is a cost-effective predictive HR analytics framework for Sri Lankan small and medium enterprises: an operational HR platform, a machine-learning pipeline, and a serverless inference service, integrated and deployed. DSR is preferred to a purely experimental design because the research question is not only *whether* attrition can be predicted, but whether it can be predicted **within an economic and infrastructural envelope that a Sri Lankan SME could actually sustain**. That second condition cannot be evaluated without building the thing.

The work is structured according to the Design Science Research Methodology (DSRM) process model [@peffers2007], whose six activities map onto the project as shown in Table 3.1. The mapping is given explicitly because DSR is frequently invoked as a label rather than followed as a process, and because it makes the evaluation obligations of each phase auditable.

**Table 3.1 — DSRM process model [@peffers2007] mapped to project phases**

| DSRM activity | Instantiation in this project | Artifact produced | Evaluation |
|---|---|---|---|
| 1. Problem identification and motivation | SME attrition cost in Sri Lanka; absence of affordable predictive HR tooling; no local attrition dataset | Problem statement, research questions (Ch1) | Literature survey (Ch2) |
| 2. Define objectives of a solution | Three measurable targets: recall > 80%, usability, operational cost < LKR 10,000/month | Objective specification (Ch1 §1.4) | Objectives restated as testable metrics (Ch5) |
| 3. Design and development | Multi-source data strategy; two-model design; HR platform; serverless inference; Pulse Check capture | Datasets, models, deployed system (Ch4) | Internal validation during development |
| 4. Demonstration | Deployment to Google Cloud Run with the HR application consuming live predictions | Running integrated system (Ch4 §4.5–4.7) | Functional verification |
| 5. Evaluation | Held-out validation; five-part evaluation audit; cost attribution study | Reproducible reports under `reports/` (Ch5) | Ch5 in full |
| 6. Communication | This dissertation and the accompanying defence | Dissertation, source repository | Examination |

## 3.2 Research Design: A Two-Model Comparison

The central design decision is that **two models are built and evaluated side by side rather than one**. This follows directly from the data situation described in §3.3: no public, individual-level record of observed employee attrition exists for Sri Lanka, while substantial real datasets exist for other national contexts.

The first model, referred to throughout as the **transfer model**, is trained on the pooled international training data and validated against the held-out Sri Lankan sample. It is necessarily restricted to the four features the two bodies of data share — age, gender, job satisfaction and work-life balance. It tests the proposition that a model learned in one labour market can be applied in another.

The second, the **local model**, is trained and cross-validated entirely *within* the Sri Lankan sample, using the eight psychometric constructs available there. It tests what is achievable when the data is local but small.

The contrast between the two is the empirical contribution of this work, and the design deliberately admits the possibility of a negative result. A single-model design that reported only the stronger figure would conceal the more interesting finding; presenting both makes the limits of cross-context transfer visible and measurable.

One asymmetry must be stated at the outset rather than discovered by the reader in Chapter 5. The international training data records **observed attrition** — the employee left. The Sri Lankan validation data records **turnover intention**, a self-reported psychological state [@kanchana2023]. Intention is a well-established antecedent of turnover but is not turnover [@griffeth2000]. The two models therefore do not predict identically defined outcomes, and this label shift is a confound on the transfer comparison that is carried explicitly through Chapters 5 and 6 rather than resolved.

## 3.3 Data Strategy and Source Selection

No public individual-level HR attrition dataset exists for Sri Lanka. The closest available instrument is a 2023 survey of 230 Sri Lankan startup professionals measuring turnover intention on a five-point ordinal scale [@kanchana2023]. A model trained exclusively on Sri Lankan data is therefore not possible.

The strategy adopted is **multi-source weighted training**: train on real international data drawn from developing-economy and private-sector contexts, supplement with a smaller volume of synthetic records calibrated to Sri Lankan conditions, and hold the Sri Lankan survey back entirely for validation.

**Table 3.2 — Multi-source data strategy**

| Source | Records | Type | Weight | Role |
|---|---:|---|---:|---|
| Saudi employee attrition | 1,191 | Real, developing-country private sector | 2.0 | Training |
| Russian employee turnover | 1,129 | Real, private-sector company | 2.0 | Training |
| Calibrated synthetic (SL context) | 500 | Simulated, Sri Lankan SME | 0.5 | Training |
| Sri Lanka startup survey [@kanchana2023] | 230 | Real, turnover intention | — | Held-out validation |
| IBM HR Analytics [@ibm2017] | 1,470 | Synthetic benchmark | — | Published comparison only |

The training master set therefore contains 2,820 records. Real records carry a sample weight of 2.0 and synthetic records 0.5, so that observed human behaviour dominates the fitted decision boundary and simulated data can inform it without governing it. The weights are passed to the estimator's `sample_weight` parameter rather than being applied by duplication, which preserves the true sample size for cross-validation.

Two exclusions are deliberate. The widely used IBM dataset [@ibm2017] is **not** used for training. It is a synthetic dataset published for demonstration purposes, and including it would inflate apparent performance while adding no real-world signal; it is retained solely so that results can be compared against the large published literature that uses it. Second, the Sri Lankan sample is treated as a **held-out validation set rather than being pooled and cross-validated**, so that no Sri Lankan record enters model fitting directly. One qualification on that statement is owed and is given in §3.5: the sample did contribute to the calibration step that shapes the synthetic component of the training data.

The resulting composition is set out in Table 3.2.

## 3.4 Normalisation Decisions

Three normalisation decisions govern cross-source comparability. Each is recorded here because each would silently corrupt the model if made differently, and because they are the decisions most likely to be probed in examination.

**Income is z-score normalised within each source before merging.** The sources report salary in different currencies and different economic periods; a raw merge would teach the model that Russian salaries are numerically larger than Saudi ones, which is an artefact of denomination rather than a fact about employees. Normalising within source means the model learns an employee's *relative salary position within their own labour market*, which is the construct actually of interest.

**Ordinal features are min-max rescaled within each dataset.** Satisfaction and work-life balance are recorded on a one-to-three scale in the training sources but a one-to-five scale in the Sri Lankan survey. Rescaling each to a common interval within its own dataset makes the transfer comparison meaningful. The rescaling bounds are persisted alongside the trained model so that inference applies exactly the transformation used in training — without this, train/serve skew would appear as unexplained degradation in production.

**Missing values are encoded as `NaN`, never as zero.** The sources overlap only partially on features, so absence is common and structural. Encoding a missing satisfaction score as zero would assert *minimum satisfaction* rather than *unknown satisfaction*, injecting a false and systematically biased signal. Imputation is instead performed inside the cross-validation fold (§3.8) so that no information crosses the train/test boundary.

## 3.5 Calibration and Synthetic Generation

Synthetic records are not drawn from arbitrary distributions. A logistic regression is first fitted to the pooled real records to estimate the direction and magnitude of each available predictor's association with attrition; the resulting coefficients are persisted to a calibration file and used to drive generation, so the synthetic sample reproduces relationships observed in real data rather than assumed ones.

**A leakage disclosure is required here.** The calibration was fitted to **2,550 records, and those 2,550 include the 230 Sri Lankan validation records** alongside the 2,320 international ones — the pipeline passes all three sources to the calibration step. There is therefore an indirect path by which the validation sample influenced the training data: validation records shaped the calibration coefficients, the coefficients generated the 500 synthetic records, and those records entered the training master. No Sri Lankan record was seen by either model during fitting, but the strict claim that the validation set is untouched by training does not hold, and it is stated here rather than left for a reader to derive.

The exposure is bounded and its direction is known. The leak is aggregate-level — eight regression coefficients estimated across 2,550 records — and it reaches the models only through the synthetic component, whose total contribution §5.5 measures at +0.032 ROC-AUC, inside seed noise. Any effect can only have *helped* the transfer arm, which is the arm this dissertation reports as failing. The headline negative result in §5.3 is therefore conservative with respect to this defect, not flattered by it. A corrected pipeline would fit calibration on the international sources alone, and that is recorded in §6.4.

The intercept is recomputed rather than inherited, so that the generated sample carries a prevalence appropriate to a Sri Lankan SME context instead of the base rate of the source populations. Where a source dataset is unavailable, the pipeline degrades to literature-derived default coefficients rather than failing, which keeps the pipeline reproducible on a fresh machine.

The honest limitation is that synthetic data of this kind can only encode what the calibration captured. This is not left as an assertion: an ablation reported in Chapter 5 finds that a model trained on synthetic data *alone* performs at approximately chance, and that the synthetic augmentation contributes a small, non-harmful improvement rather than a substantive one. The synthetic component is therefore presented as augmentation, never as a substitute for real local data.

## 3.6 Construct Computation and Feature Sets

The Sri Lankan instrument measures eight psychometric constructs — job satisfaction, work-life balance, happiness, management support, career management, innovative work behaviour, leader-member exchange and coworker support. Each construct is computed as the **mean of its constituent survey items**, a definition applied identically in the offline preprocessing pipeline and in the production Pulse Check capture, so that a construct value means the same thing at training time and at inference time.

The dependent variable requires its own decision. Turnover intention is captured by four items; these are averaged into a composite and the composite is thresholded at **3.5 on the five-point scale** to produce the binary label, yielding a positive class prevalence of 14.3%. Any threshold on a continuous construct is a modelling choice rather than a natural boundary, and Chapter 5 reports a sensitivity analysis across alternative cut-points to establish that the study's conclusions do not depend on this one.

Two feature sets follow from §3.2: four shared demographic and satisfaction features for the transfer model, and the eight constructs for the local model. The eight constructs are **survey-sourced**, not operational HR data — a point with direct architectural consequences, since it means the production system must capture employee self-report to feed the local model at all. That requirement is what the Pulse Check component (Chapter 4) exists to satisfy.

## 3.7 Model Selection and Training Protocol

The estimator is a Random Forest [@breiman2001], configured with 400 trees and balanced class weighting. Random Forest was selected over managed automated machine-learning services for three reasons: it admits exact rather than approximated explanation; it imposes no per-prediction service cost, which is material to the cost objective; and it is inspectable, which matters for an employment-related application where an unexplainable decision is an ethical as well as a technical liability.

Class imbalance is addressed by SMOTE-family resampling combining synthetic minority over-sampling [@chawla2002] with Tomek-link cleaning of the resulting boundary [@batista2004]. Both a resampling path and a class-weighting path are retained and reported, since the two are not equivalent and the choice between them affects the operating point.

Explanations are generated with SHAP TreeExplainer [@lundberg2017], which computes exact Shapley values for tree ensembles rather than sampling approximations. Explanations are produced per prediction, not only in aggregate, because the intended use is a manager asking why *this* employee has been flagged.

The selection of Random Forest is treated as a claim requiring evidence rather than a preference. Chapter 5 reports a controlled comparison against logistic regression and gradient boosting on identical data, folds and seeds.

## 3.8 Evaluation Design

Evaluation follows repeated stratified five-fold cross-validation, averaged across five random seeds, with the seed set fixed and recorded so that every reported figure is reproducible.

Three controls guard against optimistic bias. First, **imputation and scaling are performed inside each fold** by means of a pipeline, so that no statistic computed from held-out data can influence the model that is evaluated on it. Second, **decision thresholds are selected nested within the cross-validation** rather than tuned on the same data used to report performance; a threshold chosen on the reported split flatters precision and recall simultaneously, and Chapter 5 quantifies exactly how much. Third, **confidence intervals are estimated by bootstrap resampling** [@efron1993] rather than reported as point estimates, so that the reader can distinguish a real difference from sampling noise on a 230-record sample.

The primary metric is **recall on the attrition class**, because the application is early warning and the costly error is the employee who leaves unflagged. Recall is never reported alone: precision, F1, ROC-AUC, PR-AUC and confusion matrices accompany it, since a trivial classifier that flags everyone achieves perfect recall.

A reproducibility convention governs the evaluation: **each evaluation question is answered by one dedicated script that writes a machine-readable report**. No figure enters this dissertation that cannot be traced to a script and regenerated.

## 3.9 Ethical, Legal and Privacy Design

**This project collected no primary data from human participants.** All model training and validation data are secondary, previously published datasets, used under the ethics approvals obtained by their originating studies and cited in §3.3. The Pulse Check instrument described in Chapter 4 was implemented and functionally verified using synthetic test data only; no employee responses were collected. The ethical approval requirement in the KIU project guidelines is therefore not triggered.

Privacy-by-design measures nonetheless govern the architecture, in anticipation of real deployment and in compliance with the Sri Lanka Personal Data Protection Act No. 9 of 2022 [@pdpa2022]. Personally identifying information — names, national identity card numbers, email addresses, telephone numbers, bank details — is stripped **at the database layer**, before any data leaves the HR application; the export produces only modelling features with hashed identifiers. Access to export functions is restricted by role, every data operation carries a correlation identifier for audit, and data is encrypted in transit and at rest. Automated pre-transfer inspection for residual identifiers is specified in the design as a control on cross-border movement under PDPA §25; it is **specified but not yet provisioned**, and is recorded as such in the limitations rather than claimed as implemented.

One design decision is ethical rather than technical and is worth stating explicitly: **employees do not see their own risk score**. The Pulse Check returns only a confirmation of submission. A system that reports a personal attrition-risk score back to the individual invites both distress and gaming, and neither serves the intervention purpose the tool exists for.

Protected attributes receive a decision rather than a default. Age and gender are inputs to the transfer model and are excluded from the local model. Chapter 5 reports a fairness audit that tests whether they can be removed without cost, and whether they can be reconstructed from the remaining features.

## 3.10 Cost Evaluation Methodology

The cost objective requires its own method, because the obvious approach does not work. The deployment shares a Google Cloud project with four unrelated systems, and a single database instance serves six databases of which two belong to this project. A project-level billing export would therefore charge this research for infrastructure it does not use, by an unknown and unauditable margin. Resource-level attribution from billing records would require the detailed billing export, which is not enabled on the account and cannot be applied retrospectively.

Cost is therefore established by **measuring usage per resource and applying published unit prices**. Per-service utilisation is retrieved from cloud monitoring telemetry over a four-month window and multiplied by the published rate for each service, with results reported under two scenarios: the project's attributed share of the shared deployment, and a dedicated single-tenant deployment of the kind an SME would actually operate. Each is reported both with and without the provider's free-tier allowance.

This is argued as the more faithful method rather than a substitute for billing data. The research question concerns what a Sri Lankan SME would pay to run this system, and such an organisation would deploy it alone; per-resource attribution models that deployment, whereas a shared invoice does not. The limitations — that unit prices are published rates rather than invoiced amounts, that shared-resource apportionment involves an assumption, and that measured traffic is development-scale rather than a live workload — are reported alongside the result in Chapter 5.
