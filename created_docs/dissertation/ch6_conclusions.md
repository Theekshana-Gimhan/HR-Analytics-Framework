# Chapter 6 — Conclusions and Future Work

## 6.1 Answers to the Research Questions

The primary question asked whether a serverless, cost-effective AI system can deliver actionable employee attrition predictions for Sri Lankan SMEs at enterprise-grade accuracy. **The answer is a qualified yes — but the qualification is the finding.** The serverless economics work comfortably, and accurate prediction is achievable; what does not work is obtaining that accuracy from international data. The framework is viable only where local data exists to fit it.

**Sub-question 1 — can a model trained on multi-source international data achieve recall above 80% when validated on Sri Lankan data?** As worded, **no**. The transfer model does reach recall of 1.000 on the Sri Lankan sample, but only by flagging 86% of the workforce at a precision of 0.167, which is not prediction in any useful sense. Its discrimination is 0.641 ROC-AUC at the reported configuration, and unstable across seeds and resampling paths. The recall target *is* met — at recall 0.879 and precision 0.580 — but by the **local** model, which is not trained on international data. The honest answer is that the objective was achieved by abandoning the premise of the question.

**Sub-question 2 — can the pipeline run within LKR 10,000 per month on serverless infrastructure?** **Yes**, with substantial margin: LKR 4,050 per month on the most conservative scenario measured, approximately 2.5 times inside the ceiling. The mechanism is scale-to-zero inference, evidenced by 150 billable instance-seconds across four months.

**Sub-question 3 — can SHAP attributions produce explanations that SME managers trust and act on, measured by SUS above 80?** **Unanswered.** The explanation mechanism was built and is exercised in the interface, but the usability study was not conducted and the objective is unmeasured rather than met or refuted (§5.10). This is the clearest shortfall of the work.

**Sub-question 4 — can the system handle employee PII in full compliance with the PDPA?** **Partially, and by design rather than by demonstration.** Personally identifying data is stripped at the database layer before export, access is role-gated, and every data operation is audit-logged. However, the automated pre-transfer masking specified in the design was never provisioned, and — because no real employee data was ever processed — the compliance design has not been exercised on live personal data. What this work establishes is a compliant *design*, not a compliance *result*.

## 6.2 Contributions

Four contributions are claimed.

First, and principally, **an empirical demonstration that HR attrition models do not transfer across national contexts on shared demographic features**, while a locally-fitted psychometric model performs strongly (0.937 against 0.641). The gap was shown to survive leakage correction, estimator substitution and alternative binarisation of the outcome. More informatively, decomposition showed that age and gender score *below chance* (0.457) and that the transfer model's apparent skill comes almost entirely from satisfaction items which are, on the validation side, same-source self-report. The transfer result is therefore weaker than its headline suggests — which strengthens rather than weakens the argument for local data collection.

Second, **a cost-viable serverless reference architecture** for SME-scale predictive HR analytics, measured rather than estimated, with the finding that compute is not the cost: the always-on database accounts for roughly 70% of operational spend while inference is effectively free.

Third, **a working data-capture mechanism** — the Pulse Check — that produces the model's own input constructs inside the product, closing the gap between a model that performs well in a study and one that could be operated.

Fourth, **the reporting of negative and infeasible results** rather than their suppression: the transfer failure, the immateriality of the sample-weighting scheme, and the structural impossibility of subgroup fairness validation on this sample.

## 6.3 Limitations

The limitations are set out fully in §5.12 and are summarised here without softening.

The Sri Lankan outcome is turnover **intention**, not observed departure; every claim about the local model is a claim about intention. Predictors and outcome come from a single self-report instrument, so common-method variance inflates the local result by an amount this design cannot quantify. The local figure is a within-sample cross-validated estimate on 230 records with 33 positives, with a wide bootstrap interval of [0.883, 0.982]. The validation sample is drawn from startup professionals rather than the SME population targeted, and the training sources were selected for availability rather than similarity.

Fairness is unvalidated for women and for employees over 25 because the sample cannot support it — two positive cases and six respectively — and gender remains partly recoverable from the deployed model's inputs at 0.655. The system should not be used on real employees without subgroup validation on an adequate sample.

Usability was not measured. Cost was measured on development traffic in a shared project, not on a live fifty-employee workload. And the Pulse Check, while functional, was never populated with real responses, so its short-form reliability is unassessed.

## 6.4 Future Work

**Obtain observed attrition data from a partner SME.** This is the single highest-value next step. Behavioural outcome data would dissolve the label-shift confound that limits the transfer comparison and would allow the local model to be evaluated against departures rather than intentions. It is also the least controllable, requiring an organisational partner willing to share outcome records.

**Validate the Pulse Check short form.** Once roughly fifty real responses exist, the internal consistency of the two-item construct pairs can be assessed, which would either defend the short-form design empirically or justify lengthening it.

**Conduct the usability study.** The protocol is fully specified in §5.10 and is directly executable; completing it would close the one objective this work leaves unanswered.

**Validate fairness on an adequate sample.** Subgroup performance should be treated as a deployment precondition. On the evidence available, age and gender should also be dropped from the transfer model outright, since removing them costs nothing.

**Reduce the dominant cost.** Since the always-on database accounts for most of the operational spend, a serverless or scale-to-zero database tier would be the obvious next architectural target — as would a container image retention policy, which alone accounts for LKR 1,140 per month.

## 6.5 Reflection

The most useful thing this project produced was not the strong model but the weak one. The original expectation was that international training data could substitute for absent local data; the evidence says it cannot, and says so in a way that is now robust to several attempts to explain it away. Reporting that clearly — including the discovery that the transfer model's residual skill was largely same-source correlation rather than transferred knowledge — proved more valuable than the headline accuracy figure it sits beside.

The second lesson was methodological. Several claims made confidently at the interim stage did not survive scrutiny: an operating point tuned on the data it was scored against, a sample-weighting scheme that turned out to be immaterial, and a statement about age dominating the transfer model that was an artefact of how age had been coded. Each was found by writing a script specifically to attack a number rather than to produce one. That practice — one script per question, a machine-readable report per script, and a refusal to print a figure the data could not support — is what makes the limitations in this dissertation credible rather than decorative.
