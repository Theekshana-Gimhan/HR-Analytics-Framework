# Chapter 1 — Introduction

## 1.1 Background and Motivation

Small and medium enterprises form the backbone of Sri Lanka's economy, contributing approximately 52% of national gross domestic product and employing around 45% of the workforce [@dcs2023]. Despite that weight, most Sri Lankan SMEs still administer human resources through manual, paper-based or spreadsheet-driven processes [@kirupananthan2024]. Under such reactive arrangements, the decisions that matter most — above all, identifying employees at risk of resignation — are taken only after the loss has already occurred, once recruitment, onboarding and knowledge-loss costs are unavoidable.

The global HR technology market answers this need with AI-driven platforms, but prices them out of reach. Per-employee-per-month licensing of roughly USD 8–15 amounts to LKR 240,000–450,000 annually for a fifty-employee firm [@charney2024] — a sum that excludes precisely the organisations with the least capacity to absorb turnover. Meanwhile, the economics of deploying machine learning have changed. Cloud services that scale to zero permit a pay-per-prediction model in which idle infrastructure costs nothing [@jonas2019], creating an opening to deliver predictive analytics to resource-constrained organisations at a small fraction of conventional cost, consistent with Sri Lanka's national artificial intelligence and digital economy strategies [@icta2023], [@moth2024].

## 1.2 Problem Statement

Employee turnover falls disproportionately on smaller employers. Replacing a departing employee is estimated to cost between 50% and 200% of annual salary once recruitment, onboarding, training and lost productivity are accounted for [@allen2008]. In Sri Lanka this pressure is compounded by sustained skilled-worker emigration, with over 300,000 departures recorded annually [@slbfe2023], which makes retention of remaining staff a question of organisational survival rather than optimisation.

Machine learning has been shown to predict attrition effectively [@sarker2021], [@punnoose2016], yet adoption among SMEs remains low, for three reasons. **Cost**: enterprise per-employee pricing assumes an enterprise budget. **Infrastructure**: self-hosted machine learning presumes hardware and operational expertise that a twenty-person firm does not have [@ribeiro2015]. **Integration**: standalone analytics tools create data silos disconnected from the systems where HR work actually happens [@angrave2016].

A fourth barrier is specific to this context and became the central concern of this study. **There is no public, individual-level record of observed employee attrition for Sri Lanka.** Any model must therefore either borrow from other national contexts or be fitted to whatever local data exists — and whether such borrowing works is an empirical question that had not been tested.

The research gap is consequently a cost-optimised, cloud-native predictive analytics framework that is financially accessible, architecturally integrated into an existing HR system, and genuinely contextualised for the Sri Lankan workforce rather than merely deployed there.

## 1.3 Research Questions

- **RQ1** — What are the most significant predictors of employee attrition derivable for the Sri Lankan SME context, and to what extent do attrition patterns transfer from international data to Sri Lanka?
- **RQ2** — To what extent can a serverless cloud architecture reduce the operational cost of deploying HR predictive analytics relative to persistent infrastructure, and can it remain within a monthly budget of LKR 10,000?
- **RQ3** — Can a hybrid dataset approach, combining real international attrition data with calibrated synthetic data, produce a usable attrition classifier for the low-volume Sri Lankan SME data environment?

## 1.4 Aim and Objectives

**Aim.** To design, develop and evaluate a cost-effective, serverless, AI-driven predictive analytics module integrated into an existing cloud-native HR system, to forecast employee attrition risk for Sri Lankan SMEs.

- **O1 — Feature identification.** Identify predictors of attrition appropriate to the Sri Lankan SME context, in compliance with the Personal Data Protection Act No. 9 of 2022 [@pdpa2022].
- **O2 — Architecture design.** Design a serverless architecture maintaining low monthly operational cost for a twenty-to-fifty employee organisation, with a verifiable cost baseline against always-on deployment.
- **O3 — Model development.** Develop and train classification models using a hybrid dataset strategy, targeting a usable early-warning operating point with high recall on the attrition class.
- **O4 — System integration.** Implement a risk-insights interface within the HR product, including SHAP-based explanations.
- **O5 — Evaluation.** Evaluate predictive performance, deployment cost and usability.

## 1.5 Scope

**In scope:** binary attrition-risk classification; a serverless prediction service; an in-product risk-insights interface with per-prediction explanations; cost measurement; a calibrated synthetic-data pipeline; and privacy-preserving data handling.

**Out of scope:** real-time communications monitoring; mobile application development; modification of core payroll, leave or attendance logic; multilingual natural-language processing; and succession planning.

## 1.6 Contributions

This dissertation makes four contributions.

1. **An empirical demonstration that attrition models do not transfer across national contexts** on the demographic and satisfaction features that international and Sri Lankan data share. A locally fitted psychometric model reaches ROC-AUC 0.937 where a cross-context model reaches 0.641, and the gap survives correction for leakage, substitution of the estimator, and alternative binarisation of the outcome. Decomposition further shows that the cross-context model's residual skill is largely same-source correlation rather than transferred knowledge.
2. **A cost-viable serverless reference architecture**, measured rather than estimated, with the finding that inference is effectively free and the always-on database dominates operational cost.
3. **A working in-product data-capture mechanism** that generates the model's own input constructs, addressing the gap between a model that performs well in study conditions and one that could be operated.
4. **The reporting of negative and infeasible results** — the transfer failure, the immateriality of the sample-weighting scheme, and the structural impossibility of subgroup fairness validation on the available sample — rather than their omission.

## 1.7 Deviations from the Approved Proposal

Three departures from the approved proposal are declared here, before any result is presented, together with the reasoning behind each.

**RQ1 shifted from behavioural to psychometric predictors.** The proposal asked which *behavioural* predictors — attendance patterns, leave frequency, salary positioning, tenure, payroll anomalies — predict attrition in Sri Lankan SMEs. Answering that requires operational HR records paired with observed resignations, and no such Sri Lankan dataset exists publicly; nor could one be constructed within this project, since the deployed system has not yet accumulated real attrition outcomes. The only individual-level Sri Lankan instrument available measures psychometric constructs against turnover *intention* [@kanchana2023]. RQ1 was therefore reframed, first in the interim report, to ask which predictors are derivable for this context and how far international patterns transfer. The delivered local model consequently uses eight psychometric constructs rather than behavioural features. The behavioural-feature pipeline was nonetheless built and remains in the system, awaiting the outcome data that would make it trainable.

**The RQ3 success criterion changed from F1 ≥ 80% to a recall-primary operating point.** The proposal committed to an F1 score of at least 80%. That criterion was replaced during the project by a high-recall target, on the reasoning set out in §3.8: in early warning, a missed resignation is far more costly than a false alarm, and F1 weights the two errors equally. The change is defensible, but it relaxed a stated numeric commitment and is declared as such. **Reported against the original criterion, RQ3 fails**: the hybrid model achieves an F1 of approximately 0.29 on Sri Lankan data, and the local model 0.699 at its honest operating point. Neither reaches 80%. Chapter 6 answers RQ3 negatively on both criteria.

**The usability study was not conducted.** Objective O5 included evaluation by the System Usability Scale. No participants were recruited and the timeline did not permit recruitment, so the usability target is **unmeasured — neither met nor refuted**. A heuristic expert inspection is reported in its place (§5.10), together with an explicit statement of what that substitution can and cannot establish.

A fourth, smaller correction is noted for completeness: the interim report described age as dominating the transfer model. Subsequent analysis showed that age in the validation data takes only four coded values with 88.7% at a single one, so the apparent dominance is an artefact of coding rather than a substantive age effect (§5.3). That characterisation is withdrawn.

## 1.8 Structure of the Dissertation

Chapter 2 surveys the relevant literature on attrition prediction, explainable machine learning, serverless economics, and fairness in algorithmic employment decisions, and locates the gap this study addresses. Chapter 3 sets out the research methodology and the design decisions governing data, modelling and evaluation. Chapter 4 describes the implemented system. Chapter 5 reports testing and evaluation, including a five-part audit of the predictive claims and a measured cost study. Chapter 6 answers the research questions, states the contributions and limitations, and identifies future work.
