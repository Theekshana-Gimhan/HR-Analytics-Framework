# Heuristic Evaluation — Inspection Worksheet

**Evaluator:** Theekshana Gimhan (sole evaluator — see the honesty note at the end)
**Date of inspection:** _____________
**Build inspected:** dev deployment, revision / commit: _____________
**Method:** Nielsen and Molich's ten usability heuristics, applied across the four task scenarios specified in Ch5 §5.10 Part A, with a 0–4 severity rating per finding.

This worksheet feeds Ch5 §5.10 Part B directly. Fill in §6 below and hand it back; I will write it up into the findings table, the severity distribution and the three leading issues.

---

## 1. Before you start (10 minutes)

- [ ] Open the deployed frontend and log in as an **OWNER or ADMIN** account (you need `ATTRITION_VIEW` to see the risk cards).
- [ ] Confirm the ML service is awake — open one employee detail page and let the attrition card load. First call can take up to 60 seconds because the service scales to zero. **That cold start is itself a finding; note how it is or isn't communicated.**
- [ ] Have a second login available as a plain **EMPLOYEE** if you can, for scenario 3's privacy check.
- [ ] Open a notepad or duplicate this file. Record as you go — not afterwards from memory.
- [ ] Set aside **90 minutes uninterrupted.** Two passes at roughly 40 minutes plus write-up.

## 2. How the method works

Two passes over the same interface.

**Pass 1 — flow.** Walk each of the four scenarios end to end as a first-time SME HR manager would, at normal speed. Do not stop to analyse. You are getting a feel for where the flow stalls, where you hesitate, where you have to guess. Note hesitations with a single word; you will come back.

**Pass 2 — inspection.** Walk the same four scenarios again, slowly, and this time check each screen against all ten heuristics in §3 deliberately. Most findings come from this pass. Ask of each screen: *does this violate this specific heuristic?* — not *is this screen good?*

The two-pass structure is what stops the inspection from becoming a general opinion about your own UI. Do not merge them.

## 3. The ten heuristics

Check every screen against every heuristic in pass 2. The right-hand column is what a violation tends to look like in an HR product specifically — use it as a prompt, not a checklist to satisfy.

| # | Heuristic | What a violation looks like here |
|---|---|---|
| H1 | **Visibility of system status** | The attrition card sits blank during the cold start with no spinner, no "waking model" text, no elapsed indicator. Payroll generation gives no progress. A saved pulse gives no confirmation. |
| H2 | **Match between system and the real world** | Internal vocabulary leaks to the user: "transfer model", "SHAP", "threshold", "construct", "probability 0.62". Would a Sri Lankan HR manager know what "leader–member exchange" means without explanation? |
| H3 | **User control and freedom** | No way to cancel a running payroll, no undo on a submitted pulse, no obvious back-out of the risk card once opened, no escape from a multi-step flow without losing entered data. |
| H4 | **Consistency and standards** | The two risk cards (manual attrition card, pulse-derived card) present the same underlying quantity differently. Buttons in one module are labelled differently from the same action elsewhere. Date formats vary. |
| H5 | **Error prevention** | Sliders permit a nonsensical combination without warning. Payroll can be generated twice for the same month. A leave application can be submitted with an end date before its start date. |
| H6 | **Recognition rather than recall** | The manager must remember what a "0.62 probability against a 0.41 threshold" meant on the previous screen. The eight construct names appear without their meaning available at the point of use. |
| H7 | **Flexibility and efficiency of use** | No keyboard path, no bulk action, no way for a returning user to skip steps a novice needs. Everything takes the same number of clicks on the hundredth use as the first. |
| H8 | **Aesthetic and minimalist design** | The risk card shows every SHAP contribution rather than the few that matter. The dashboard competes for attention with equal visual weight everywhere. |
| H9 | **Help users recognise, diagnose and recover from errors** | The ML service times out and the user sees a raw error, a status code, or nothing — rather than "the risk service is unavailable, your data is saved, try again shortly". |
| H10 | **Help and documentation** | No explanation of what the risk band means or what a manager should *do* with it. The beta caveat is present, but is it findable at the moment of decision? |

## 4. Severity scale

Rate each finding on impact, not on how easy it is to fix.

| Rating | Meaning |
|---|---|
| **0** | Not a usability problem — record it if you logged it in pass 1 then dismissed it, and say why. |
| **1** | Cosmetic. Fix only if spare time exists. |
| **2** | Minor. Users are mildly irritated or slowed; low priority. |
| **3** | Major. Users are seriously impeded or misled; important to fix. |
| **4** | Catastrophe. The task cannot be completed, or the user is led to a wrong decision about a real employee. |

**A note specific to this system.** Anything that could cause a manager to act on a risk score they have misunderstood — a missing caveat at the point of decision, a probability presented as a certainty, an employee's own score shown to them — is a **4**, not a 3. The consequence lands on a real person's employment. Judge severity by that consequence, not by how much code it would take to fix.

## 5. The four task scenarios

These are the scenarios already specified in the dissertation. Use exactly these — changing them would break the correspondence with Part A.

**S1 — Locate the dashboard after login.**
Log out fully, log back in, and get to the dashboard. Watch: how long until something meaningful renders; whether the pulse nudge banner explains itself; whether a first-time user knows where to go next.

**S2 — Identify the three highest-risk employees.**
This is the important one. As a manager, find your three most at-risk staff. Watch closely: *is this actually possible?* If there is no ranked list and you must open each employee individually, that is a significant finding against H6 and H7 — record it plainly rather than working around it.

**S3 — Explain why a given employee is flagged.**
Open one employee's detail page, read the risk card, and try to answer "why is this person high risk?" as if to that person's manager. Watch: whether SHAP factors are named in human language; whether the intention-not-departure caveat is visible at the moment you would act; whether the number invites over-confidence. Then, if you have an EMPLOYEE login, confirm they cannot see their own score.

**S4 — Generate a month's payroll.**
Run a payroll generation end to end. Watch: progress feedback, confirmation before an irreversible step, whether the run can be repeated by accident, and what the error path looks like.

## 6. Recording sheet — fill this in

One row per finding. Add as many rows as you need. **Do not aim for a target number.**

| # | Heuristic | Scenario | Screen | Observation (what you saw, factually) | Severity |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |
| 8 | | | | | |
| 9 | | | | | |
| 10 | | | | | |
| 11 | | | | | |
| 12 | | | | | |

**Heuristics with no violation found** — list them here. An empty heuristic is a real result and belongs in the write-up:

> _____________________________________________

**Anything you noticed that no heuristic covers:**

> _____________________________________________

## 7. Rules that keep this honest

Your dissertation's credibility rests on its willingness to report against itself — §5.12, §6.3 and the whole of Ch6 §6.5 make that claim explicitly. This worksheet is where that claim is tested on your own interface.

1. **Record the finding even when it stings.** You built this. The reflex is to explain why a defect is reasonable. Write the observation, assign the severity, move on. Justification is not part of the method.
2. **Observation, not verdict.** Write "the card showed no loading state for 47 seconds", not "loading is poor". The write-up needs facts.
3. **Do not pad the table.** Eight real findings beat sixteen manufactured ones. Twelve rows is capacity, not a target.
4. **Do not suppress the severity-4s.** If S2 turns out to be impossible as specified, that is the single most valuable line in the section — it is exactly the kind of result a supervisor looks for evidence of, and it costs you nothing because the objective is already reported as unmeasured.
5. **Time-box it.** 90 minutes. A longer inspection does not produce better findings, it produces defensive ones.
6. **One evaluator is a weakness, and it is already declared.** §5.10 states that Nielsen's method calls for three to five independent evaluators and that you are the system's own developer. You do not need to compensate for that by being harsh or by being kind — just be accurate.

## 8. When you're done

Send back §6 — the filled table, the no-violation list, and the free-text note. That is all I need.

I will then write Ch5 §5.10 Part B: the findings table in dissertation format, the severity distribution, the three leading issues, and a short paragraph connecting the pattern to the adoption barriers established in Ch2 §2.5 — where cost, integration and **trust** rather than accuracy are what determine whether an SME adopts a tool. If the inspection shows the interface explains its predictions poorly, that finding speaks directly to the trust barrier, and the section becomes an argument rather than a list.
