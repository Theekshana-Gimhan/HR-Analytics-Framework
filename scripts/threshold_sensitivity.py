"""
threshold_sensitivity.py  --  P4: is the transfer-vs-local contrast an artefact
of where we cut the turnover-intention scale?

The Sri Lankan target is not observed attrition. It is a composite of four
turnover-intention items (ET-1..4, 1-5 Likert) binarised at >= 3.5. That 3.5 is
a defensible convention (above the 3.0 scale midpoint, i.e. agreement rather
than neutrality) but it is still a choice, and every headline number in the
project inherits it. An examiner is entitled to ask what happens at a different
cut. This script answers that empirically.

WHY 3.0 / 3.5 / 4.0 AND NOT JUST 4.0 (as the audit plan originally proposed):
  The class is small and shrinks fast as the cut rises --
      >= 3.0 : 51 positives (22.2%)
      >= 3.5 : 33 positives (14.3%)   <- current
      >= 4.0 : 12 positives ( 5.2%)
  At >= 4.0 a stratified 5-fold split leaves ~2.4 positives per held-out fold, so
  that point is inherently noisy and a wide interval there proves nothing either
  way. Reporting a three-point curve (one cut below the current one, one above)
  shows the DIRECTION and STABILITY of the contrast, which is what the question
  actually asks, and is honest about which point is trustworthy. Any cut whose
  positive count falls below MIN_RELIABLE_POSITIVES is flagged as indicative-only
  in both the console output and the JSON.

WHAT MOVES AND WHAT DOES NOT:
  Only the SL validation target is re-derived. The master training target is real
  observed attrition from the Saudi/Russian sources and has nothing to do with
  this Likert cut, so the transfer model's TRAINING data is identical at every
  point -- only what it is scored against changes.

  PR-AUC is reported against its own no-skill baseline at each cut, because the
  baseline IS the prevalence and the prevalence changes by design. Comparing raw
  PR-AUC across thresholds without that lift ratio would be meaningless.

Outputs (gitignored, reproducible):
  reports/threshold_sensitivity.json  -- metrics per threshold, both models
  reports/threshold_sensitivity.png   -- ROC-AUC vs threshold, both models

Run:  python scripts/threshold_sensitivity.py
"""

import os
import json
import argparse
import warnings
from datetime import date

import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.model_selection import (
    StratifiedKFold, cross_val_predict, train_test_split,
)
from sklearn.metrics import roc_auc_score, average_precision_score

warnings.filterwarnings('ignore')

try:
    from imblearn.combine import SMOTETomek
    HAVE_IMBLEARN = True
except ImportError:
    HAVE_IMBLEARN = False

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
INTENTION_COMPOSITE = 'ET_composite'
PRIMARY_FEATURES = ['Age', 'Gender', 'JobSatisfaction', 'WorkLifeBalance']
ORDINAL_RESCALE  = ['JobSatisfaction', 'WorkLifeBalance']
SL_CONSTRUCTS = ['JobSatisfaction', 'WorkLifeBalance', 'Happiness',
                 'ManagementSupport', 'CareerManagement',
                 'InnovativeWorkBehavior', 'LeaderMemberExchange', 'CoworkerSupport']
N_ESTIMATORS = 400
SEEDS = [42, 1, 7, 13, 99]
THRESHOLDS = [3.0, 3.5, 4.0]
CURRENT_THRESHOLD = 3.5
# Below this many positives a 5-fold estimate is too thin to defend.
MIN_RELIABLE_POSITIVES = 20
N_BOOT = 2000


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


def bootstrap_auc_ci(y, proba, n_boot=N_BOOT, seed=42):
    """Percentile CI on pooled out-of-fold predictions. Resamples that lose a
    class are skipped -- at the high cuts that happens often, which is itself
    part of why those cuts are flagged."""
    rng = np.random.default_rng(seed)
    n, aucs = len(y), []
    for _ in range(n_boot):
        idx = rng.integers(0, n, n)
        if len(np.unique(y[idx])) < 2:
            continue
        aucs.append(roc_auc_score(y[idx], proba[idx]))
    if not aucs:
        return None
    return [round(float(np.percentile(aucs, 2.5)), 4),
            round(float(np.percentile(aucs, 97.5)), 4)]


# ── LOCAL model at one threshold ───────────────────────────────────────────────
def local_at(val: pd.DataFrame, y: np.ndarray) -> dict:
    feats = [c for c in SL_CONSTRUCTS if c in val.columns]
    X = val[feats].apply(pd.to_numeric, errors='coerce').values

    aucs, praucs, oof_first = [], [], None
    for seed in SEEDS:
        pipe = Pipeline([('impute', SimpleImputer(strategy='median')),
                         ('rf', RandomForestClassifier(
                             n_estimators=N_ESTIMATORS, class_weight='balanced',
                             random_state=seed, n_jobs=-1))])
        cv = StratifiedKFold(5, shuffle=True, random_state=seed)
        oof = cross_val_predict(pipe, X, y, cv=cv, method='predict_proba')[:, 1]
        aucs.append(roc_auc_score(y, oof))
        praucs.append(average_precision_score(y, oof))
        if oof_first is None:
            oof_first = oof

    aucs, praucs = np.array(aucs), np.array(praucs)
    prevalence = float(y.mean())
    return {
        'roc_auc_mean': round(float(aucs.mean()), 4),
        'roc_auc_std':  round(float(aucs.std()), 4),
        'roc_auc_by_seed': [round(float(a), 4) for a in aucs],
        'roc_auc_boot_ci95': bootstrap_auc_ci(y, oof_first),
        'pr_auc_mean': round(float(praucs.mean()), 4),
        'pr_auc_baseline': round(prevalence, 4),
        'pr_auc_lift_over_baseline': round(float(praucs.mean()) / prevalence, 2),
    }


# ── TRANSFER model at one threshold ────────────────────────────────────────────
def transfer_once(master, val, y_val, seed, mode):
    """Training data is IDENTICAL at every threshold (the master target is real
    observed attrition). Only y_val changes."""
    X_all = prepare_features(master)
    y_all = master[TARGET].astype(int).values
    w_all = master['SampleWeight'].astype(float).values

    X_tr, _Xte, y_tr, _yte, w_tr, _wte = train_test_split(
        X_all, y_all, w_all, test_size=0.20, stratify=y_all, random_state=seed)

    imp = SimpleImputer(strategy='median')
    X_tr_i = imp.fit_transform(X_tr)

    if mode == 'smote':
        X_fit, y_fit = SMOTETomek(random_state=seed).fit_resample(X_tr_i, y_tr)
        sw, cw = None, None
    else:
        X_fit, y_fit = X_tr_i, y_tr
        sw, cw = w_tr, 'balanced'

    clf = RandomForestClassifier(n_estimators=N_ESTIMATORS, class_weight=cw,
                                 random_state=seed, n_jobs=-1)
    clf.fit(X_fit, y_fit, sample_weight=sw)

    pv = clf.predict_proba(imp.transform(prepare_features(val)))[:, 1]
    return (float(roc_auc_score(y_val, pv)),
            float(average_precision_score(y_val, pv)))


def transfer_at(master, val, y, mode) -> dict:
    rocs, prs = [], []
    for seed in SEEDS:
        roc, pr = transfer_once(master, val, y, seed, mode)
        rocs.append(roc)
        prs.append(pr)
    rocs, prs = np.array(rocs), np.array(prs)
    prevalence = float(y.mean())
    return {
        'roc_auc_mean': round(float(rocs.mean()), 4),
        'roc_auc_std':  round(float(rocs.std()), 4),
        'roc_auc_by_seed': [round(float(r), 4) for r in rocs],
        'pr_auc_mean': round(float(prs.mean()), 4),
        'pr_auc_baseline': round(prevalence, 4),
        'pr_auc_lift_over_baseline': round(float(prs.mean()) / prevalence, 2),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--thresholds', type=float, nargs='*', default=None,
                    help='Override the intention cut points (default 3.0 3.5 4.0).')
    args = ap.parse_args()
    cuts = args.thresholds or THRESHOLDS

    print("=" * 68)
    print("P4 -- turnover-intention threshold sensitivity")
    print("=" * 68)

    master = pd.read_csv(MASTER_PATH)
    val = pd.read_csv(VALIDATION_PATH)
    if INTENTION_COMPOSITE not in val.columns:
        raise SystemExit(f"[FATAL] {INTENTION_COMPOSITE} missing from "
                         f"{VALIDATION_PATH} -- rerun preprocess_raw.py.")
    et = pd.to_numeric(val[INTENTION_COMPOSITE], errors='coerce')

    print(f"  SL validation n={len(val)}   ET_composite range "
          f"[{et.min():.2f}, {et.max():.2f}]")
    print(f"  Master training target is UNCHANGED at every cut "
          f"(real attrition, {len(master)} rows)")
    print(f"  Seeds: {SEEDS}   flagged unreliable below "
          f"{MIN_RELIABLE_POSITIVES} positives")

    modes = ['cw'] + (['smote'] if HAVE_IMBLEARN else [])
    results = {}
    for cut in cuts:
        y = (et >= cut).astype(int).values
        pos = int(y.sum())
        reliable = pos >= MIN_RELIABLE_POSITIVES
        tag = ' <- CURRENT' if abs(cut - CURRENT_THRESHOLD) < 1e-9 else ''
        flag = '' if reliable else '  [INDICATIVE ONLY: thin positive class]'
        print("\n  " + "-" * 64)
        print(f"  ET_composite >= {cut}   positives={pos} ({y.mean():.1%}){tag}{flag}")
        print("  " + "-" * 64)

        if pos < 5:
            print("    [SKIPPED] fewer than 5 positives -- 5-fold CV is impossible.")
            results[str(cut)] = {'threshold': cut, 'positives': pos,
                                 'prevalence': round(float(y.mean()), 4),
                                 'reliable': False, 'skipped': True}
            continue

        loc = local_at(val, y)
        print(f"    LOCAL    (8 constructs, 5-fold CV)  ROC-AUC "
              f"{loc['roc_auc_mean']:.3f} +/- {loc['roc_auc_std']:.3f}"
              f"   boot95 {loc['roc_auc_boot_ci95']}"
              f"   PR-AUC {loc['pr_auc_mean']:.3f} "
              f"({loc['pr_auc_lift_over_baseline']:.1f}x baseline)")

        tr = {}
        for mode in modes:
            tr[mode] = transfer_at(master, val, y, mode)
            print(f"    TRANSFER ({mode:5s}, 4 features)        ROC-AUC "
                  f"{tr[mode]['roc_auc_mean']:.3f} +/- {tr[mode]['roc_auc_std']:.3f}"
                  f"   PR-AUC {tr[mode]['pr_auc_mean']:.3f} "
                  f"({tr[mode]['pr_auc_lift_over_baseline']:.1f}x baseline)")

        gaps = {m: round(loc['roc_auc_mean'] - tr[m]['roc_auc_mean'], 4) for m in modes}
        for m in modes:
            print(f"    CONTRAST local - transfer({m}) = {gaps[m]:+.3f}")

        results[str(cut)] = {
            'threshold': cut, 'positives': pos,
            'prevalence': round(float(y.mean()), 4),
            'reliable': reliable, 'skipped': False,
            'local': loc, 'transfer': tr,
            'contrast_local_minus_transfer': gaps,
        }

    # ── Verdict: does the headline contrast survive every cut? ──────────────────
    usable = {k: r for k, r in results.items() if not r.get('skipped')}
    signs = {m: [r['contrast_local_minus_transfer'][m] for r in usable.values()]
             for m in modes}
    verdicts = {}
    for m in modes:
        vals = signs[m]
        if all(v > 0 for v in vals):
            verdicts[m] = (f"Contrast SURVIVES at every cut tested: local beats "
                           f"transfer({m}) by {min(vals):+.3f} to {max(vals):+.3f} "
                           f"ROC-AUC across cuts {list(usable.keys())}. The "
                           f"transfer-vs-local finding is not an artefact of the "
                           f"3.5 binarisation.")
        elif all(v <= 0 for v in vals):
            verdicts[m] = (f"Contrast REVERSES for transfer({m}) at every cut "
                           f"({min(vals):+.3f} to {max(vals):+.3f}) -- the headline "
                           f"claim does not hold and must be rewritten.")
        else:
            verdicts[m] = (f"Contrast is THRESHOLD-DEPENDENT for transfer({m}): "
                           f"{ {k: r['contrast_local_minus_transfer'][m] for k, r in usable.items()} }"
                           f" -- report the curve, do not report a single cut.")

    reliable_cuts = [k for k, r in usable.items() if r['reliable']]
    print("\n  " + "=" * 64)
    print("  VERDICTS")
    print("  " + "=" * 64)
    for m in modes:
        print(f"    transfer({m}): {verdicts[m]}")
    print(f"\n    Cuts meeting the >= {MIN_RELIABLE_POSITIVES}-positive reliability "
          f"bar: {reliable_cuts}")

    # ── Plot ────────────────────────────────────────────────────────────────────
    if HAVE_MPL and usable:
        xs = [float(k) for k in usable.keys()]
        fig, ax = plt.subplots(figsize=(7, 4.5))
        loc_m = [usable[k]['local']['roc_auc_mean'] for k in usable]
        loc_s = [usable[k]['local']['roc_auc_std'] for k in usable]
        ax.errorbar(xs, loc_m, yerr=loc_s, marker='o', capsize=4, lw=2,
                    color='#2a7', label='Local (8 constructs, CV)')
        for m, colour in zip(modes, ['#59f', '#f80']):
            tm = [usable[k]['transfer'][m]['roc_auc_mean'] for k in usable]
            ts = [usable[k]['transfer'][m]['roc_auc_std'] for k in usable]
            ax.errorbar(xs, tm, yerr=ts, marker='s', capsize=4, lw=2,
                        color=colour, label=f'Transfer ({m}, 4 features)')
        ax.axhline(0.5, ls='--', c='#999', lw=1, label='random (0.50)')
        ax.axvline(CURRENT_THRESHOLD, ls=':', c='#333', lw=1.2,
                   label=f'current cut ({CURRENT_THRESHOLD})')
        # Pad the x-range so the right-most annotation is not clipped.
        span = (max(xs) - min(xs)) or 1.0
        ax.set_xlim(min(xs) - 0.08 * span, max(xs) + 0.18 * span)
        for k in usable:
            if not usable[k]['reliable']:
                ax.annotate(f"n+={usable[k]['positives']}\nindicative only",
                            (float(k), usable[k]['local']['roc_auc_mean']),
                            textcoords='offset points', xytext=(8, -6),
                            fontsize=7, color='#a00')
        ax.set_xlabel('Turnover-intention cut on ET_composite (1-5 Likert)')
        ax.set_ylabel('SL ROC-AUC (mean +/- SD over seeds)')
        ax.set_ylim(0.3, 1.0)
        ax.set_title('P4 threshold sensitivity -- does the local/transfer gap survive?')
        ax.legend(fontsize=8)
        plt.tight_layout()
        os.makedirs(REPORTS_DIR, exist_ok=True)
        png = os.path.join(REPORTS_DIR, 'threshold_sensitivity.png')
        plt.savefig(png, dpi=120)
        plt.close()
        print(f"\n  Plot saved -> {png}")

    # ── Persist ─────────────────────────────────────────────────────────────────
    os.makedirs(REPORTS_DIR, exist_ok=True)
    out = {
        'generated': str(date.today()),
        'question': 'P4 -- is the transfer-vs-local contrast an artefact of the '
                    '>= 3.5 binarisation of turnover intention?',
        'method': 'Re-derive the SL target from ET_composite at each cut and rerun '
                  'both models. The master training target (real attrition) is '
                  'unchanged throughout; only what the transfer model is scored '
                  'against moves.',
        'current_threshold': CURRENT_THRESHOLD,
        'thresholds_tested': cuts,
        'min_reliable_positives': MIN_RELIABLE_POSITIVES,
        'reliable_cuts': reliable_cuts,
        'seeds': SEEDS,
        'by_threshold': results,
        'verdicts': verdicts,
    }
    out_path = os.path.join(REPORTS_DIR, 'threshold_sensitivity.json')
    with open(out_path, 'w') as f:
        json.dump(out, f, indent=2)
    print(f"  Report saved -> {out_path}")
    print("=" * 68)


if __name__ == '__main__':
    main()
