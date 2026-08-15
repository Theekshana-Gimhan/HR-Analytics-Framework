"""
fairness_audit.py  --  P5: algorithmic fairness of the attrition models.

The system makes employment-relevant predictions about individuals. Under the
EU AI Act framing that is a high-risk application, and Sri Lanka's PDPA has
adjacent provisions on automated decision-making. `Age` and `Gender` are inputs
to the transfer model and `Age` dominates its SHAP plot (interim report Fig. 6).
A dissertation that ships this without a fairness section has a hole in it.

WHY THIS SCRIPT DOES NOT PRODUCE THE SUBGROUP TABLE THE AUDIT PLAN ASSUMED:
  The audit plan (P5) called for "subgroup AUC/recall by gender and age band".
  The Sri Lankan validation data cannot support that, and discovering WHY is
  itself the finding:

    * Age is not continuous. It takes four values -- 25, 35, 45, 52 -- with 204
      of 230 respondents (89%) at 25. These are almost certainly age-bracket
      midpoints from the source instrument. Age "bands" therefore reduce to one
      dominant band plus 26 people, and the transfer model's headline Age
      importance rests on a feature that is near-constant on the validation side.

    * Gender is severely imbalanced in the OUTCOME, not just the population:
      female 2 positives / 73, male 31 / 157. A female subgroup ROC-AUC computed
      on two positives is not a measurement, it is noise with a decimal point.

  So this script reports what is measurable, states plainly what is not, and
  quantifies the uncertainty on the rest. That is a stronger ethics section than
  a table of numbers nobody should trust -- and it is the honest answer.

WHAT IS ACTUALLY MEASURED:
  1. Subgroup structure and outcome base rates (always computable).
  2. Subgroup ROC-AUC / recall WHERE the positive count supports it, with every
     subgroup explicitly marked evaluable or not (MIN_POSITIVES_FOR_AUC).
  3. Selection rate and the four-fifths rule at the deployed operating point.
     This needs no positives at all, so it is computable for every subgroup and
     is the one hard fairness number this data can support.
  4. Equal-opportunity (TPR) gap, reported with its positive counts attached so
     the reader can see how thin it is.
  5. Protected-attribute decision, tested rather than asserted:
       - drop-and-test on the TRANSFER model (drop Age+Gender, measure the loss)
       - a PROXY test on the LOCAL model: can Gender be predicted from the 8
         psychometric constructs? If it can, "we don't use Gender" is not a
         defence, because the constructs would encode it.

Outputs (gitignored, reproducible):
  reports/fairness_audit.json  -- all numbers plus the evaluability verdicts
  reports/fairness_audit.png   -- base rates, selection rates, evaluability

Run:  python scripts/fairness_audit.py
"""

import os
import json
import argparse
import warnings
from datetime import date

import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.model_selection import (
    StratifiedKFold, cross_val_predict, train_test_split,
)
from sklearn.metrics import (
    roc_auc_score, recall_score, precision_score, f1_score,
)

warnings.filterwarnings('ignore')

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    HAVE_MPL = True
except ImportError:
    HAVE_MPL = False

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.join(os.path.dirname(__file__), '..')
DATA_DIR    = os.path.join(BASE_DIR, 'data')
REPORTS_DIR = os.path.join(BASE_DIR, 'reports')
MASTER_PATH     = os.path.join(DATA_DIR, 'nexus_hr_master_dataset.csv')
VALIDATION_PATH = os.path.join(DATA_DIR, 'validation_srilanka.csv')

# ── Config (kept identical to train_model.py) ──────────────────────────────────
TARGET = 'Attrition_binary'
PRIMARY_FEATURES = ['Age', 'Gender', 'JobSatisfaction', 'WorkLifeBalance']
ORDINAL_RESCALE  = ['JobSatisfaction', 'WorkLifeBalance']
SL_CONSTRUCTS = ['JobSatisfaction', 'WorkLifeBalance', 'Happiness',
                 'ManagementSupport', 'CareerManagement',
                 'InnovativeWorkBehavior', 'LeaderMemberExchange', 'CoworkerSupport']
PROTECTED = ['Age', 'Gender']
N_ESTIMATORS = 400
SEEDS = [42, 1, 7, 13, 99]
RANDOM_STATE = 42

# A subgroup ROC-AUC needs enough minority-class cases to mean anything. Below
# this we refuse to print a number rather than print a meaningless one.
MIN_POSITIVES_FOR_AUC = 10
# EEOC four-fifths rule: selection-rate ratio below this flags adverse impact.
FOUR_FIFTHS = 0.80


# ── Preprocessing (copied from train_model.py for parity) ──────────────────────
def encode_gender(series: pd.Series) -> pd.Series:
    s = series.astype(str).str.strip().str.lower()
    return s.map({'male': 1.0, 'm': 1.0, '1': 1.0,
                  'female': 0.0, 'f': 0.0, '0': 0.0})


def prepare_features(df: pd.DataFrame, features=PRIMARY_FEATURES) -> pd.DataFrame:
    X = pd.DataFrame(index=df.index)
    for col in features:
        if col == 'Gender':
            X[col] = encode_gender(df[col]) if col in df.columns else np.nan
            continue
        vals = pd.to_numeric(df.get(col, pd.Series(index=df.index, dtype=float)),
                             errors='coerce')
        if col in ORDINAL_RESCALE:
            lo, hi = vals.min(), vals.max()
            if pd.notna(lo) and hi > lo:
                vals = (vals - lo) / (hi - lo)
            else:
                vals = vals * 0 + 0.5
        X[col] = vals
    return X


def f1_optimal_threshold(y, proba):
    """F1-optimal cut on pooled OOF predictions. P1 established this is an
    OPTIMISTIC operating point (tuned on the data it is scored on); it is used
    here only as a plausible deployed cut at which to compare SELECTION RATES
    between groups, which is a within-run comparison and unaffected by that bias."""
    best_f1, best_thr = -1.0, 0.5
    for thr in np.unique(np.round(proba, 3)):
        f1 = f1_score(y, (proba >= thr).astype(int), zero_division=0)
        if f1 > best_f1:
            best_f1, best_thr = f1, float(thr)
    return best_thr


# ── Subgroup structure ─────────────────────────────────────────────────────────
def describe_groups(val: pd.DataFrame) -> dict:
    y = val[TARGET].astype(int).values
    out = {}

    g = val['Gender'].astype(str).str.strip().str.lower()
    out['gender'] = {
        'levels': {lvl: {'n': int((g == lvl).sum()),
                         'positives': int(y[(g == lvl).values].sum()),
                         'base_rate': round(float(y[(g == lvl).values].mean()), 4)}
                   for lvl in sorted(g.unique())},
    }

    age = pd.to_numeric(val['Age'], errors='coerce')
    counts = age.value_counts().sort_index()
    out['age'] = {
        'distinct_values': int(age.nunique()),
        'value_counts': {str(int(k)): int(v) for k, v in counts.items()},
        'modal_value': int(counts.idxmax()),
        'modal_share': round(float(counts.max() / len(age)), 4),
        'is_effectively_continuous': bool(age.nunique() > 10),
        'note': ('Four coded values only -- almost certainly age-bracket midpoints '
                 'from the source instrument, not measured ages.'),
    }
    # The only age split with enough people on both sides to say anything.
    modal = int(counts.idxmax())
    older = (age > modal).values
    out['age']['binary_split'] = {
        f'age_eq_{modal}': {'n': int((~older).sum()),
                            'positives': int(y[~older].sum()),
                            'base_rate': round(float(y[~older].mean()), 4)},
        f'age_gt_{modal}': {'n': int(older.sum()),
                            'positives': int(y[older].sum()),
                            'base_rate': round(float(y[older].mean()), 4)},
    }
    return out


# ── Local-model out-of-fold predictions (the deployed model) ───────────────────
def local_oof(val: pd.DataFrame) -> tuple:
    feats = [c for c in SL_CONSTRUCTS if c in val.columns]
    X = val[feats].apply(pd.to_numeric, errors='coerce').values
    y = val[TARGET].astype(int).values
    pipe = Pipeline([('impute', SimpleImputer(strategy='median')),
                     ('rf', RandomForestClassifier(
                         n_estimators=N_ESTIMATORS, class_weight='balanced',
                         random_state=RANDOM_STATE, n_jobs=-1))])
    cv = StratifiedKFold(5, shuffle=True, random_state=RANDOM_STATE)
    oof = cross_val_predict(pipe, X, y, cv=cv, method='predict_proba')[:, 1]
    return y, oof, feats


def subgroup_performance(y, proba, mask, label, thr) -> dict:
    """Metrics for one subgroup, with an explicit evaluability verdict."""
    ys, ps = y[mask], proba[mask]
    pos = int(ys.sum())
    n = int(mask.sum())
    pred = (ps >= thr).astype(int)
    rec = {
        'group': label, 'n': n, 'positives': pos,
        'base_rate': round(float(ys.mean()), 4) if n else None,
        # Selection rate needs no positives -- always computable, and it is the
        # number the four-fifths rule is defined on.
        'selection_rate': round(float(pred.mean()), 4) if n else None,
    }
    if pos >= MIN_POSITIVES_FOR_AUC and len(np.unique(ys)) > 1:
        rec.update({
            'evaluable': True,
            'roc_auc': round(float(roc_auc_score(ys, ps)), 4),
            'recall_tpr': round(float(recall_score(ys, pred, zero_division=0)), 4),
            'precision': round(float(precision_score(ys, pred, zero_division=0)), 4),
        })
    else:
        rec.update({
            'evaluable': False,
            'roc_auc': None,
            'recall_tpr': (round(float(recall_score(ys, pred, zero_division=0)), 4)
                           if pos > 0 else None),
            'precision': None,
            'why_not': (f'only {pos} positive case(s); a subgroup ROC-AUC needs at '
                        f'least {MIN_POSITIVES_FOR_AUC} to be meaningful'),
        })
    return rec


# ── Protected-attribute decision, tested ───────────────────────────────────────
def transfer_drop_and_test(master, val) -> dict:
    """Measure what the TRANSFER model loses if Age+Gender are removed outright.
    If the loss is nil, dropping the protected attributes is free and should be
    the default. class_weight path (the stable one, per P2)."""
    def run(feats):
        rocs = []
        for seed in SEEDS:
            X_all = prepare_features(master, feats)
            y_all = master[TARGET].astype(int).values
            w_all = master['SampleWeight'].astype(float).values
            X_tr, _a, y_tr, _b, w_tr, _c = train_test_split(
                X_all, y_all, w_all, test_size=0.20, stratify=y_all,
                random_state=seed)
            imp = SimpleImputer(strategy='median')
            clf = RandomForestClassifier(n_estimators=N_ESTIMATORS,
                                         class_weight='balanced',
                                         random_state=seed, n_jobs=-1)
            clf.fit(imp.fit_transform(X_tr), y_tr, sample_weight=w_tr)
            pv = clf.predict_proba(imp.transform(prepare_features(val, feats)))[:, 1]
            rocs.append(roc_auc_score(val[TARGET].astype(int).values, pv))
        return np.array(rocs)

    keep = run(PRIMARY_FEATURES)
    drop = run([f for f in PRIMARY_FEATURES if f not in PROTECTED])
    delta = float(drop.mean() - keep.mean())
    pooled = (keep.std() + drop.std()) / 2 or 1e-9
    return {
        'keep_protected': {'features': PRIMARY_FEATURES,
                           'roc_auc_mean': round(float(keep.mean()), 4),
                           'roc_auc_std': round(float(keep.std()), 4)},
        'drop_protected': {'features': [f for f in PRIMARY_FEATURES
                                        if f not in PROTECTED],
                           'roc_auc_mean': round(float(drop.mean()), 4),
                           'roc_auc_std': round(float(drop.std()), 4)},
        'roc_auc_delta_dropping_protected': round(delta, 4),
        'z_vs_seed_noise': round(delta / pooled, 2),
    }


def proxy_test(val) -> dict:
    """Can Gender be recovered from the 8 constructs the LOCAL model uses? If it
    can, "the deployed model excludes protected attributes" would be a hollow
    defence, because the constructs would carry the signal implicitly."""
    feats = [c for c in SL_CONSTRUCTS if c in val.columns]
    X = val[feats].apply(pd.to_numeric, errors='coerce').values
    g = encode_gender(val['Gender'])
    ok = g.notna().values
    X, gv = X[ok], g[ok].astype(int).values
    pipe = Pipeline([('impute', SimpleImputer(strategy='median')),
                     ('scale', StandardScaler()),
                     ('clf', LogisticRegression(class_weight='balanced',
                                                max_iter=2000,
                                                random_state=RANDOM_STATE))])
    cv = StratifiedKFold(5, shuffle=True, random_state=RANDOM_STATE)
    p = cross_val_predict(pipe, X, gv, cv=cv, method='predict_proba')[:, 1]
    auc = float(roc_auc_score(gv, p))
    if auc < 0.60:
        verdict = ('No meaningful proxy. Gender is close to unrecoverable from the '
                   '8 constructs, so the local model excluding Gender is a real '
                   'exclusion, not a nominal one.')
    elif auc < 0.70:
        verdict = ('Weak proxy signal. Disclose it; the exclusion of Gender is '
                   'mostly but not entirely effective.')
    else:
        verdict = ('MATERIAL proxy signal -- the constructs encode Gender. '
                   '"We do not use Gender" is NOT a sufficient fairness defence '
                   'for this model and must not be claimed as one.')
    return {'target': 'Gender', 'predictors': feats, 'model': 'LogReg (5-fold CV)',
            'roc_auc': round(auc, 4), 'verdict': verdict}


def main():
    argparse.ArgumentParser().parse_args()

    print("=" * 68)
    print("P5 -- fairness audit (subgroup performance + protected attributes)")
    print("=" * 68)

    master = pd.read_csv(MASTER_PATH)
    val = pd.read_csv(VALIDATION_PATH)

    # ── 1. Structure ────────────────────────────────────────────────────────────
    groups = describe_groups(val)
    print("\n  " + "-" * 64)
    print("  SUBGROUP STRUCTURE (what the data can and cannot support)")
    print("  " + "-" * 64)
    for lvl, d in groups['gender']['levels'].items():
        print(f"    gender={lvl:8s} n={d['n']:4d}  positives={d['positives']:3d}  "
              f"base rate {d['base_rate']:.1%}")
    a = groups['age']
    print(f"    Age: {a['distinct_values']} distinct values {a['value_counts']}")
    print(f"         modal value {a['modal_value']} covers {a['modal_share']:.1%} "
          f"of respondents -- NOT a continuous variable")
    for lvl, d in a['binary_split'].items():
        print(f"    {lvl:14s} n={d['n']:4d}  positives={d['positives']:3d}  "
              f"base rate {d['base_rate']:.1%}")

    # ── 2/3/4. Subgroup performance of the deployed local model ─────────────────
    y, oof, feats = local_oof(val)
    thr = f1_optimal_threshold(y, oof)
    print("\n  " + "-" * 64)
    print(f"  LOCAL MODEL SUBGROUP PERFORMANCE (out-of-fold, operating thr={thr:.3f})")
    print("  " + "-" * 64)

    g = val['Gender'].astype(str).str.strip().str.lower()
    age = pd.to_numeric(val['Age'], errors='coerce')
    modal = int(age.value_counts().idxmax())

    masks = {f'gender={lvl}': (g == lvl).values for lvl in sorted(g.unique())}
    masks[f'age={modal}']  = (age <= modal).values
    masks[f'age>{modal}']  = (age > modal).values
    masks['ALL']           = np.ones(len(val), dtype=bool)

    perf = {}
    for label, mask in masks.items():
        r = subgroup_performance(y, oof, mask, label, thr)
        perf[label] = r
        if r['evaluable']:
            print(f"    {label:14s} n={r['n']:4d} pos={r['positives']:3d}  "
                  f"ROC-AUC {r['roc_auc']:.3f}  TPR {r['recall_tpr']:.3f}  "
                  f"sel.rate {r['selection_rate']:.3f}")
        else:
            tpr = 'n/a' if r['recall_tpr'] is None else f"{r['recall_tpr']:.3f}"
            print(f"    {label:14s} n={r['n']:4d} pos={r['positives']:3d}  "
                  f"ROC-AUC   ---  (UNEVALUABLE)  TPR {tpr}  "
                  f"sel.rate {r['selection_rate']:.3f}")
            print(f"      -> {r['why_not']}")

    # Four-fifths rule on selection rates (computable for every subgroup).
    def four_fifths(pair_labels):
        rates = {l: perf[l]['selection_rate'] for l in pair_labels}
        hi = max(rates.values())
        lo = min(rates.values())
        ratio = (lo / hi) if hi > 0 else None
        # A selection-rate gap is only evidence of MODEL bias if it exceeds the
        # gap already present in the outcomes. Kleinberg et al. (2016) and
        # Chouldechova (2017): when base rates differ between groups, selection-
        # rate parity and calibration cannot both hold. Reporting the ratio of
        # each group's selection rate to its own base rate separates "the model
        # mistreats this group" from "this group's outcomes genuinely differ".
        calib = {}
        for l in pair_labels:
            br = perf[l]['base_rate']
            calib[l] = round(perf[l]['selection_rate'] / br, 3) if br else None
        base_rates = {l: perf[l]['base_rate'] for l in pair_labels}
        hi_b, lo_b = max(base_rates.values()), min(base_rates.values())
        base_ratio = (lo_b / hi_b) if hi_b > 0 else None
        # Every ratio here is only as trustworthy as its thinnest group.
        smallest = min(pair_labels, key=lambda l: perf[l]['positives'])
        caveat = (f' CAVEAT: the "{smallest}" group has only '
                  f'{perf[smallest]["positives"]} positive case(s) in n='
                  f'{perf[smallest]["n"]}, so these ratios carry wide uncertainty '
                  f'and should be reported as indicative.'
                  if perf[smallest]['positives'] < MIN_POSITIVES_FOR_AUC else '')
        return {
            'thinnest_group': {'group': smallest,
                               'positives': perf[smallest]['positives'],
                               'n': perf[smallest]['n']},
            'selection_rates': rates,
            'base_rates': base_rates,
            'ratio_min_over_max': round(ratio, 4) if ratio is not None else None,
            'passes_four_fifths': (ratio >= FOUR_FIFTHS) if ratio is not None else None,
            'base_rate_ratio_min_over_max': round(base_ratio, 4) if base_ratio is not None else None,
            'selection_over_base_rate_by_group': calib,
            'interpretation': (
                'Selection-rate disparity is at least partly attributable to a '
                'genuine base-rate difference in the outcome '
                f'(base-rate ratio {round(base_ratio, 3) if base_ratio else "n/a"} vs '
                f'selection-rate ratio {round(ratio, 3) if ratio else "n/a"}). '
                'Under differing base rates, four-fifths parity and calibration are '
                'mathematically incompatible (Kleinberg et al. 2016; Chouldechova '
                '2017) -- this is a documented trade-off to argue, not a bug to fix.'
                if base_ratio is not None and ratio is not None and base_ratio <= ratio
                else
                'The selection-rate gap is WIDER than the underlying base-rate gap, '
                'which points at the model amplifying the disparity rather than '
                'merely reflecting it. This needs to be addressed, not just disclosed.'
            ) + caveat,
        }

    gender_labels = [l for l in perf if l.startswith('gender=')]
    age_labels    = [l for l in perf if l.startswith('age')]
    impact = {'gender': four_fifths(gender_labels), 'age': four_fifths(age_labels)}

    print("\n  " + "-" * 64)
    print(f"  ADVERSE IMPACT -- four-fifths rule (threshold {FOUR_FIFTHS})")
    print("  " + "-" * 64)
    for attr, d in impact.items():
        status = ('PASS' if d['passes_four_fifths'] else 'FAIL') \
                 if d['passes_four_fifths'] is not None else 'n/a'
        print(f"    {attr:8s} selection-rate ratio {d['ratio_min_over_max']}  -> {status}")
        print(f"             base-rate ratio      {d['base_rate_ratio_min_over_max']}  "
              f"(the disparity already in the outcomes)")
        print(f"             selection/base rate by group: "
              f"{d['selection_over_base_rate_by_group']}")
        print(f"             {d['interpretation']}")

    # ── 5. Protected-attribute decision ─────────────────────────────────────────
    print("\n  " + "-" * 64)
    print("  PROTECTED-ATTRIBUTE DECISION (tested, not asserted)")
    print("  " + "-" * 64)
    print(f"    LOCAL model inputs ({len(feats)}): {feats}")
    print(f"    -> contains NO protected attribute (no Age, no Gender) by construction.")

    prox = proxy_test(val)
    print(f"    Proxy test: Gender predicted from the 8 constructs -> "
          f"ROC-AUC {prox['roc_auc']:.3f}")
    print(f"      {prox['verdict']}")

    dat = transfer_drop_and_test(master, val)
    print(f"    TRANSFER model drop-and-test (Age+Gender removed):")
    print(f"      keep {dat['keep_protected']['roc_auc_mean']:.3f} "
          f"+/- {dat['keep_protected']['roc_auc_std']:.3f}   ->   "
          f"drop {dat['drop_protected']['roc_auc_mean']:.3f} "
          f"+/- {dat['drop_protected']['roc_auc_std']:.3f}   "
          f"(delta {dat['roc_auc_delta_dropping_protected']:+.3f}, "
          f"|z|={abs(dat['z_vs_seed_noise']):.2f})")
    if dat['roc_auc_delta_dropping_protected'] >= -0.01:
        drop_verdict = ('Dropping Age+Gender costs nothing (or helps). RECOMMEND '
                        'drop-and-test: remove protected attributes from the '
                        'transfer model entirely -- there is no accuracy argument '
                        'for keeping them.')
    else:
        drop_verdict = ('Dropping Age+Gender costs measurable performance. If they '
                        'are kept it must be a documented keep-and-audit decision '
                        'with this subgroup analysis attached.')
    print(f"      {drop_verdict}")

    # ── Overall verdict ─────────────────────────────────────────────────────────
    unevaluable = [l for l, r in perf.items() if not r['evaluable'] and l != 'ALL']
    overall = (
        "Fairness CANNOT be fully validated on this dataset, and the reason is "
        "structural, not an oversight: " +
        "; ".join([
            f"Age has only {groups['age']['distinct_values']} distinct coded values "
            f"({groups['age']['modal_share']:.0%} at {groups['age']['modal_value']}), "
            f"so age-band analysis is not supportable",
            f"the female subgroup has "
            f"{groups['gender']['levels'].get('female', {}).get('positives', 0)} "
            f"positive case(s), so its ROC-AUC is unevaluable",
            f"unevaluable subgroups: {unevaluable}",
        ]) +
        ". What IS established: the deployed local model uses no protected "
        "attribute and Gender is "
        f"{'not meaningfully recoverable' if prox['roc_auc'] < 0.60 else 'partly recoverable'} "
        f"from its inputs (proxy ROC-AUC {prox['roc_auc']:.2f}); selection-rate "
        "parity is reported above against the four-fifths rule. The thesis should "
        "state these limits explicitly and treat subgroup validation as a "
        "deployment precondition, not a solved problem."
    )
    print("\n  " + "=" * 64)
    print("  OVERALL VERDICT")
    print("  " + "=" * 64)
    print(f"    {overall}")

    # ── Plot ────────────────────────────────────────────────────────────────────
    if HAVE_MPL:
        labels = [l for l in perf if l != 'ALL']
        base = [perf[l]['base_rate'] for l in labels]
        sel  = [perf[l]['selection_rate'] for l in labels]
        xs = np.arange(len(labels))
        fig, ax = plt.subplots(figsize=(8, 4.5))
        ax.bar(xs - 0.2, base, 0.4, label='actual base rate', color='#59f')
        ax.bar(xs + 0.2, sel, 0.4, label='model selection rate', color='#2a7')
        for i, l in enumerate(labels):
            if not perf[l]['evaluable']:
                ax.annotate(f"AUC\nunevaluable\n({perf[l]['positives']} pos)",
                            (i, max(base[i], sel[i])), ha='center',
                            textcoords='offset points', xytext=(0, 6),
                            fontsize=7, color='#a00')
        ax.set_xticks(xs)
        ax.set_xticklabels(labels, rotation=15, ha='right', fontsize=8)
        ax.set_ylabel('rate')
        ax.set_ylim(0, max(max(base), max(sel)) * 1.45)
        ax.set_title('P5 fairness audit -- base rate vs selection rate by subgroup')
        ax.legend(fontsize=8)
        plt.tight_layout()
        os.makedirs(REPORTS_DIR, exist_ok=True)
        png = os.path.join(REPORTS_DIR, 'fairness_audit.png')
        plt.savefig(png, dpi=120)
        plt.close()
        print(f"\n  Plot saved -> {png}")

    # ── Persist ─────────────────────────────────────────────────────────────────
    os.makedirs(REPORTS_DIR, exist_ok=True)
    out = {
        'generated': str(date.today()),
        'question': 'P5 -- is the system fair across gender and age, and should the '
                    'protected attributes be kept or dropped?',
        'scope_note': ('The audit plan asked for subgroup AUC by gender and age '
                       'band. The data cannot support age bands (4 coded values, '
                       '89% at one) or a female subgroup AUC (2 positives). This '
                       'reports what is measurable and documents what is not.'),
        'min_positives_for_auc': MIN_POSITIVES_FOR_AUC,
        'four_fifths_threshold': FOUR_FIFTHS,
        'operating_threshold': round(thr, 4),
        'operating_threshold_note': ('F1-optimal on pooled OOF; optimistic per P1, '
                                     'used here only for between-group selection-'
                                     'rate comparison, which that bias does not '
                                     'distort.'),
        'subgroup_structure': groups,
        'local_model_subgroup_performance': perf,
        'adverse_impact_four_fifths': impact,
        'protected_attributes': {
            'local_model_inputs': feats,
            'local_model_uses_protected': False,
            'proxy_test': prox,
            'transfer_drop_and_test': dat,
            'recommendation': drop_verdict,
        },
        'overall_verdict': overall,
    }
    out_path = os.path.join(REPORTS_DIR, 'fairness_audit.json')
    with open(out_path, 'w') as f:
        json.dump(out, f, indent=2)
    print(f"  Report saved -> {out_path}")
    print("=" * 68)


if __name__ == '__main__':
    main()
