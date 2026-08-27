# Chapter 6 — Conclusions and Future Work

## 6.1 Answers to the Research Questions

Each question is answered first in a sentence, then elaborated. The wording is that of the research questions as stated in the interim report; §1.7 records how RQ1 and RQ3 evolved from the approved proposal and why.

**RQ1 — what are the most significant predictors of attrition for the Sri Lankan SME context, and to what extent do attrition patterns transfer from international data?**

*The significant predictors are psychometric rather than behavioural, and attrition patterns transfer barely at all.*

Within the Sri Lankan sample, all eight psychometric constructs relate negatively to turnover intention, with job satisfaction the strongest (r = −0.613), followed by career management (−0.571) and innovative work behaviour (−0.559). Together they support a strongly discriminating model (ROC-AUC 0.937).

Transfer, however, is close to absent. The cross-context model reaches 0.641 at the reported configuration and is unstable — 0.718 ± 0.100 on one resampling path against 0.828 ± 0.014 on another, meaning its measured performance depends more on a preprocessing choice than on the data. Decomposition then removes most of what remains: age and gender together score **0.457, below chance**, while satisfaction items alone score 0.825 — effectively the entire model. Those satisfaction items are, on the Sri Lankan side, self-reported in the same instrument as the outcome. What looks like transferred knowledge is substantially same-source correlation. **The honest answer is that international attrition patterns do not meaningfully transfer to the Sri Lankan context on the features the two bodies of data share.**

**RQ2 — to what extent can a serverless architecture reduce operational cost relative to persistent infrastructure, and can it stay within LKR 10,000 per month?**

*The budget question is answered decisively; the comparative question only partially.*

Measured operational cost is **LKR 4,050 per month** on the most conservative scenario, roughly 2.5 times inside the ceiling. The mechanism is demonstrated rather than asserted: the inference service consumed 150 billable instance-seconds across four months, and all compute together accounts for about LKR 82 per month, while the one component that cannot scale to zero — the always-on database — accounts for roughly 70% of total spend. That distribution is itself the answer to how serverless reduces cost: it removes the idle cost of the components that can be made stateless, and leaves untouched those that cannot.

The comparison against *persistent* infrastructure is, however, argued architecturally rather than measured. The planned controlled comparison across alternative deployment topologies was not carried out, so the reduction relative to an always-on deployment is inferred from the cost structure rather than benchmarked. This is a genuine incompleteness in the answer to RQ2.

**RQ3 — can a hybrid dataset combining real international data with calibrated synthetic data produce a usable classifier for a low-volume Sri Lankan environment?**

*No.*

The hybrid approach produced a classifier, but not a usable one. On Sri Lankan data the resulting model achieves an F1 of approximately 0.29, and reaches high recall only by flagging 86% of the workforce at a precision of 0.167. Against the criterion originally set in the proposal — F1 ≥ 80% — it fails, and so does every configuration tested. The ablation explains why: synthetic data alone performs at 0.526, indistinguishable from chance; synthetic augmentation contributes +0.032 ROC-AUC, at the edge of seed noise; and the 2.0 and 0.5 sample weights make a difference of −0.007, meaning the weighting scheme central to the data strategy is doing no measurable work.

The usable classifier in this project came from local data alone, not from the hybrid. **This is the central negative result of the work, and it is more valuable than a positive one would have been**: it establishes empirically that synthetic augmentation and international borrowing cannot substitute for local data collection in this domain, which is precisely the gap the project set out to examine.

## 6.2 Contributions

Four contributions are claimed.

First, and principally, **an empirical demonstration that HR attrition models do not transfer across national contexts on shared demographic features**, while a locally-fitted psychometric model performs strongly (0.937 against 0.641). The gap was shown to survive leakage correction, estimator substitution and alternative binarisation of the outcome. More informatively, decomposition showed that age and gender score *below chance* (0.457) and that the transfer model's apparent skill comes almost entirely from satisfaction items which are, on the validation side, same-source self-report. The transfer result is therefore weaker than its headline suggests — which strengthens rather than weakens the argument for local data collection.

Second, **a cost-viable serverless reference architecture** for SME-scale predictive HR analytics, measured rather than estimated, with the finding that compute is not the cost: the always-on database accounts for roughly 70% of operational spend while inference is effectively free.

Third, **a working data-capture mechanism** — the Pulse Check — that produces the model's own input constructs inside the product, closing the gap between a model that performs well in a study and one that could be operated.

Fourth, **the reporting of negative and infeasible results** rather than their suppression: the transfer failure, the immateriality of the sample-weighting scheme, and the structural impossibility of subgroup fairness validation on this sample.

## 6.3 Limitations

The limitations are set out fully in §5.12 and are summarised here without softening.

The Sri Lankan outcome is turnover **intention**, not observed departure; every claim about the local model is a claim about intention. Predictors and outcome come from a single self-report instrument, so common-method variance inflates the local result by an amount this design cannot quantify. The local figure is a within-sample cross-validated estimate on 230 records with 33 positives, with a wide bootstrap interval of [0.883, 0.982]. The validation sample is drawn from startup professionals rather than the SME population targeted, and the training sources were selected for availability rather than similarity. The validation sample also contributed to the synthetic-data calibration (§3.5), so it is not untouched by the training pipeline, though the exposure is aggregate-level and works against the transfer arm rather than for it.

Fairness is unvalidated for women and for employees over 25 because the sample cannot support it — two positive cases and six respectively — and gender remains partly recoverable from the deployed model's inputs at 0.655. The system should not be used on real employees without subgroup validation on an adequate sample.

Usability was not *measured*: the System Usability Scale study did not run, so the "above 80" target is neither met nor refuted and objective O5 remains only partly discharged. A heuristic inspection was substituted and did return findings (§5.10), but it was conducted by two evaluators of whom the only human is the system's author, which is materially weaker than the independence the method assumes. Cost was measured on development traffic in a shared project, not on a live fifty-employee workload, and the comparison against persistent infrastructure was argued rather than benchmarked. The Pulse Check, while functional, was never populated with real responses, so its short-form reliability is unassessed.

Objective O1 required compliance with the Personal Data Protection Act. What this work establishes is a compliant **design** rather than a compliance **result**: identifying data is stripped at the database layer, access is role-gated and operations are audit-logged, but the automated pre-transfer masking specified in the architecture was never provisioned, and — because no real employee data was ever processed — none of these controls has been exercised on live personal data.

## 6.4 Future Work

**Obtain observed attrition data from a partner SME.** This is the single highest-value next step. Behavioural outcome data would dissolve the label-shift confound that limits the transfer comparison and would allow the local model to be evaluated against departures rather than intentions. It is also the least controllable, requiring an organisational partner willing to share outcome records.

**Refit the synthetic calibration on the international sources alone.** The calibration step currently includes the Sri Lankan validation sample (§3.5), which puts an indirect path between the held-out data and the training set. The effect is bounded and favours the arm this work reports as failing, so no conclusion here depends on it — but the pipeline should be corrected before any of these results are built on, and the transfer figures regenerated from a calibration fitted only on the Saudi and Russian sources.

**Validate the Pulse Check short form.** Once roughly fifty real responses exist, the internal consistency of the two-item construct pairs can be assessed, which would either defend the short-form design empirically or justify lengthening it.

**Conduct the usability study.** The protocol is fully specified in §5.10 and is directly executable with independent evaluators; completing it would close the one objective this work leaves unanswered.

**Build the workforce risk view, and an onboarding path.** The heuristic inspection found that the system's primary question — *which of my employees should I worry about?* — has no interface (§5.10, F3), and that a first-time user is given no place to start (F13). Both are additions rather than corrections, and both matter more than they appear: §2.5 identifies effort expectancy and facilitating conditions, not accuracy, as what determines whether an SME adopts a tool of this kind. A ranked risk view is also close to free once Pulse Check responses exist, since the predictions are already cached per employee per week (§4.7).

**Validate fairness on an adequate sample.** Subgroup performance should be treated as a deployment precondition. On the evidence available, age and gender should also be dropped from the transfer model outright, since removing them costs nothing.

**Reduce the dominant cost.** Since the always-on database accounts for most of the operational spend, a serverless or scale-to-zero database tier would be the obvious next architectural target — as would a container image retention policy, which alone accounts for LKR 1,140 per month.

## 6.5 Reflection

The most useful thing this project produced was not the strong model but the weak one. The original expectation was that international training data could substitute for absent local data; the evidence says it cannot, and says so in a way that is now robust to several attempts to explain it away. Reporting that clearly — including the discovery that the transfer model's residual skill was largely same-source correlation rather than transferred knowledge — proved more valuable than the headline accuracy figure it sits beside.

The second lesson was methodological. Several claims made confidently at the interim stage did not survive scrutiny: an operating point tuned on the data it was scored against, a sample-weighting scheme that turned out to be immaterial, and a statement about age dominating the transfer model that was an artefact of how age had been coded. Each was found by writing a script specifically to attack a number rather than to produce one. That practice — one script per question, a machine-readable report per script, and a refusal to print a figure the data could not support — is what makes the limitations in this dissertation credible rather than decorative.
