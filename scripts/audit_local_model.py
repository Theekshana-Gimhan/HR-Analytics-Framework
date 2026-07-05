"""
audit_local_model.py  --  P1: leakage & common-method-bias audit of the LOCAL
Sri Lanka model (the strong ~0.94 ROC-AUC headline number).

The interim report leans on one strong number: the local model reaches SL
ROC-AUC ~0.94 under repeated stratified 5-fold CV on 8 psychometric constructs.
Before that number goes into the final dissertation it must survive four
challenges, which this script runs and documents:

  A. LEAKAGE (preprocessing).  train_model.py fits the median imputer on ALL 230
     rows *before* cross_val_predict, so the held-out fold contributes to its own
     imputation. This re-runs the CV with imputation done fold-internally (an
     sklearn Pipeline inside cross_val_predict) and reports the delta. If the two
     AUCs are within noise, the leakage is immaterial and we can say so; if not,
     the fold-internal number is the honest one.

  B. LEAKAGE (threshold).  train_model.py tunes the operating threshold on the
     SAME out-of-fold predictions it then reports P/R at -> an optimistic
     operating point. This adds a NESTED estimate: tune the threshold on the
     training folds, apply it to the held-out fold, so the reported P/R never
     sees its own tuning data.

  C. COMMON METHOD VARIANCE (CMV / CMB).  The 8 predictors and the turnover-
     intention target come from one self-report survey, one respondent, one
     sitting (Podsakoff et al., 2003). This is NOT item-overlap leakage -- the
     target's ET-1..4 items are a disjoint group from every predictor construct
     (see preprocess_raw.py ITEM_GROUPS) -- but shared method can still inflate
     the predictor<->target correlations. We quantify each construct's linear
     correlation with the intention composite so the reader can see how much of
     the signal is a small number of strongly method-shared constructs.

  D. STABILITY.  n=230 with only ~33 positives. A single AUC is not enough. We
     report per-fold AUC mean+/-SD (fold instability), the across-seed range
     (already in train_model.py), a bootstrap 95% CI on the pooled OOF
     predictions, plus the Brier score and a reliability curve (RF probabilities
     are often miscalibrated, which matters if HR staff read the probability as
     a literal flight-risk percentage).

Outputs:
  reports/audit_local_model.json   -- all numbers, machine-readable
  reports/audit_local_calibration.png -- reliability curve (if matplotlib present)

Usage:
  python scripts/audit_local_model.py
  python scripts/audit_local_model.py --target-recall 0.80 --n-boot 2000
"""

import os
import json
import argparse
import warnings

import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import (
    roc_auc_score, average_precision_score, brier_score_loss,
    precision_score, recall_score, f1_score, confusion_matrix,
)

warnings.filterwarnings('ignore')

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from sklearn.calibration import calibration_curve
    HAVE_MPL = True
except ImportError:
    HAVE_MPL = False

BASE_DIR    = os.path.join(os.path.dirname(__file__), '..')
DATA_DIR    = os.path.join(BASE_DIR, 'data')
REPORTS_DIR = os.path.join(BASE_DIR, 'reports')
VALIDATION_PATH = os.path.join(DATA_DIR, 'validation_srilanka.csv')

TARGET = 'Attrition_binary'
# Must match train_model.py SL_CONSTRUCTS exactly.
SL_CONSTRUCTS = ['JobSatisfaction', 'WorkLifeBalance', 'Happiness',
                 'ManagementSupport', 'CareerManagement',
                 'InnovativeWorkBehavior', 'LeaderMemberExchange', 'CoworkerSupport']
# The intention composite the binary target is thresholded from (ET-1..4 mean).
INTENTION_COMPOSITE = 'ET_composite'
LOCAL_CV_SEEDS = [42, 1, 7, 13, 99]
RANDOM_STATE = 42


def make_rf(seed):
    return RandomForestClassifier(n_estimators=400, class_weight='balanced',
                                  random_state=seed, n_jobs=-1)


def pooled_oof(X, y, seed, fold_internal_impute):
    """Return out-of-fold P(attrition) for one seed. If fold_internal_impute,
    the imputer is fit inside each fold (leakage-free); else X is assumed
    already imputed on all rows (mirrors train_model.py)."""
    cv = StratifiedKFold(5, shuffle=True, random_state=seed)
    if fold_internal_impute:
        est = Pipeline([('impute', SimpleImputer(strategy='median')),
                        ('rf', make_rf(seed))])
    else:
        est = make_rf(seed)
    return cross_val_predict(est, X, y, cv=cv, method='predict_proba')[:, 1]


def per_fold_aucs(X, y, seed, fold_internal_impute):
    """AUC computed within each held-out fold (shows fold-level instability)."""
    cv = StratifiedKFold(5, shuffle=True, random_state=seed)
    aucs = []
    for tr, te in cv.split(X, y):
        if fold_internal_impute:
            imp = SimpleImputer(strategy='median')
            Xtr = imp.fit_transform(X[tr]); Xte = imp.transform(X[te])
        else:
            Xtr, Xte = X[tr], X[te]
        rf = make_rf(seed).fit(Xtr, y[tr])
        p = rf.predict_proba(Xte)[:, 1]
        if len(np.unique(y[te])) > 1:
            aucs.append(roc_auc_score(y[te], p))
    return aucs


def nested_operating_point(X, y, target_recall, seed=RANDOM_STATE):
    """Honest P/R/F1: for each fold, pick the F1-optimal threshold on the TRAIN
    folds only, apply it to the held-out fold, pool predictions. The threshold
    never sees the data it is scored on. Imputation is fold-internal too."""
    cv = StratifiedKFold(5, shuffle=True, random_state=seed)
    pred_all = np.zeros(len(y), dtype=int)
    thr_used = []
    for tr, te in cv.split(X, y):
        imp = SimpleImputer(strategy='median')
        Xtr = imp.fit_transform(X[tr]); Xte = imp.transform(X[te])
        rf = make_rf(seed).fit(Xtr, y[tr])
        # Tune threshold on an inner OOF of the training folds.
        inner = cross_val_predict(
            Pipeline([('impute', SimpleImputer(strategy='median')), ('rf', make_rf(seed))]),
            X[tr], y[tr], cv=StratifiedKFold(5, shuffle=True, random_state=seed),
            method='predict_proba')[:, 1]
        grid = np.unique(np.round(inner, 3))
        best_f1, best_thr = -1.0, 0.5
        for thr in grid:
            f1 = f1_score(y[tr], (inner >= thr).astype(int), zero_division=0)
            if f1 > best_f1:
                best_f1, best_thr = f1, thr
        thr_used.append(float(best_thr))
        pred_all[te] = (rf.predict_proba(Xte)[:, 1] >= best_thr).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred_all, labels=[0, 1]).ravel()
    return {
        'method': 'nested (threshold tuned on train folds only)',
        'thresholds_per_fold': [round(t, 3) for t in thr_used],
        'precision': round(float(precision_score(y, pred_all, zero_division=0)), 4),
        'recall':    round(float(recall_score(y, pred_all, zero_division=0)), 4),
        'f1':        round(float(f1_score(y, pred_all, zero_division=0)), 4),
        'confusion': {'tn': int(tn), 'fp': int(fp), 'fn': int(fn), 'tp': int(tp)},
    }


def optimistic_operating_point(y, oof, target_recall):
    """The train_model.py operating point: tune F1-optimal threshold on the same
    pooled OOF it is reported at (optimistic — reproduced here for contrast)."""
    grid = np.unique(np.round(oof, 3))
    best_f1, best_thr = -1.0, 0.5
    for thr in grid:
        f1 = f1_score(y, (oof >= thr).astype(int), zero_division=0)
        if f1 > best_f1:
            best_f1, best_thr = f1, thr
    pred = (oof >= best_thr).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    return {
        'method': 'optimistic (threshold tuned on the reported OOF)',
        'threshold': round(float(best_thr), 3),
        'precision': round(float(precision_score(y, pred, zero_division=0)), 4),
        'recall':    round(float(recall_score(y, pred, zero_division=0)), 4),
        'f1':        round(float(f1_score(y, pred, zero_division=0)), 4),
        'confusion': {'tn': int(tn), 'fp': int(fp), 'fn': int(fn), 'tp': int(tp)},
    }


def bootstrap_auc_ci(y, oof, n_boot, seed=RANDOM_STATE):
    rng = np.random.default_rng(seed)
    n = len(y)
    aucs = []
    for _ in range(n_boot):
        idx = rng.integers(0, n, n)
        if len(np.unique(y[idx])) > 1:
            aucs.append(roc_auc_score(y[idx], oof[idx]))
    lo, hi = np.percentile(aucs, [2.5, 97.5])
    return round(float(lo), 4), round(float(hi), 4), round(float(np.mean(aucs)), 4)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--target-recall', type=float, default=0.80)
    ap.add_argument('--n-boot', type=int, default=2000)
    args = ap.parse_args()

    os.makedirs(REPORTS_DIR, exist_ok=True)
    val = pd.read_csv(VALIDATION_PATH)
    feats = [c for c in SL_CONSTRUCTS if c in val.columns]
    X_raw = val[feats].apply(pd.to_numeric, errors='coerce').values
    y = val[TARGET].astype(int).values

    print("=" * 68)
    print("P1 AUDIT -- local Sri Lanka model (8 constructs)")
    print("=" * 68)
    print(f"  n={len(y)}  positives={int(y.sum())}  prevalence={y.mean():.1%}")
    print(f"  constructs ({len(feats)}): {feats}")

    # ---- A. imputation leakage: all-data vs fold-internal ---------------------
    # train_model.py imputes on all rows first; reproduce that, then compare.
    X_alldata = SimpleImputer(strategy='median').fit_transform(X_raw)
    nan_rate = float(np.isnan(X_raw).mean())

    print("\n" + "-" * 68)
    print("A. IMPUTATION LEAKAGE  (median imputer: all-data vs fold-internal)")
    print("-" * 68)
    print(f"  missing-value rate across construct matrix: {nan_rate:.2%}")
    leak = {}
    for label, fold_internal, Xin in [
            ('all_data_impute (train_model.py)', False, X_alldata),
            ('fold_internal_impute (leak-free)', True, X_raw)]:
        seed_aucs = [roc_auc_score(y, pooled_oof(Xin, y, s, fold_internal))
                     for s in LOCAL_CV_SEEDS]
        leak[label] = {
            'roc_auc_mean': round(float(np.mean(seed_aucs)), 4),
            'roc_auc_range': [round(min(seed_aucs), 4), round(max(seed_aucs), 4)],
            'per_seed': [round(a, 4) for a in seed_aucs],
        }
        print(f"  {label:38s} AUC mean={leak[label]['roc_auc_mean']:.4f} "
              f"range={leak[label]['roc_auc_range']}")
    delta = leak['all_data_impute (train_model.py)']['roc_auc_mean'] - \
            leak['fold_internal_impute (leak-free)']['roc_auc_mean']
    print(f"  --> leakage delta (all-data minus leak-free): {delta:+.4f}")

    # Use the honest fold-internal OOF (seed 42) for the rest.
    oof = pooled_oof(X_raw, y, RANDOM_STATE, fold_internal_impute=True)

    # ---- D. stability: per-fold SD + bootstrap CI + Brier ---------------------
    print("\n" + "-" * 68)
    print("D. STABILITY  (fold-internal impute)")
    print("-" * 68)
    fold_aucs_all = []
    for s in LOCAL_CV_SEEDS:
        fold_aucs_all.extend(per_fold_aucs(X_raw, y, s, fold_internal_impute=True))
    fold_mean, fold_sd = float(np.mean(fold_aucs_all)), float(np.std(fold_aucs_all))
    boot_lo, boot_hi, boot_mean = bootstrap_auc_ci(y, oof, args.n_boot)
    brier = float(brier_score_loss(y, oof))
    pr_auc = float(average_precision_score(y, oof))
    print(f"  per-fold AUC: mean={fold_mean:.3f} SD={fold_sd:.3f} "
          f"(over {len(fold_aucs_all)} folds x seeds)")
    print(f"  pooled-OOF bootstrap 95% CI (seed 42): [{boot_lo:.3f}, {boot_hi:.3f}] "
          f"(n_boot={args.n_boot})")
    print(f"  PR-AUC (pooled OOF): {pr_auc:.3f}  (prevalence baseline={y.mean():.3f})")
    print(f"  Brier score: {brier:.4f}  (lower is better; 0.25 = uninformative at p=0.5)")

    # ---- B. threshold honesty: optimistic vs nested ---------------------------
    print("\n" + "-" * 68)
    print("B. OPERATING POINT  (optimistic vs nested)")
    print("-" * 68)
    opt = optimistic_operating_point(y, oof, args.target_recall)
    nst = nested_operating_point(X_raw, y, args.target_recall)
    for tag, m in [('optimistic', opt), ('nested   ', nst)]:
        print(f"  {tag}: P={m['precision']:.3f} R={m['recall']:.3f} "
              f"F1={m['f1']:.3f}  tp={m['confusion']['tp']} fn={m['confusion']['fn']} "
              f"fp={m['confusion']['fp']} tn={m['confusion']['tn']}")

    # ---- C. common method variance: construct<->target correlations -----------
    print("\n" + "-" * 68)
    print("C. COMMON METHOD VARIANCE  (construct <-> intention correlation)")
    print("-" * 68)
    corr = {}
    Xdf = pd.DataFrame(X_alldata, columns=feats)
    intent = pd.to_numeric(val[INTENTION_COMPOSITE], errors='coerce') \
        if INTENTION_COMPOSITE in val.columns else pd.Series(y, dtype=float)
    intent_label = INTENTION_COMPOSITE if INTENTION_COMPOSITE in val.columns \
        else 'Attrition_binary'
    for c in feats:
        r = float(np.corrcoef(Xdf[c], intent.fillna(intent.median()))[0, 1])
        corr[c] = round(r, 3)
    for c, r in sorted(corr.items(), key=lambda kv: kv[1]):
        print(f"    {c:24s} r(construct, {intent_label}) = {r:+.3f}")
    item_overlap = ('NONE -- target ET-1..4 is a disjoint item group from every '
                    'predictor construct (see preprocess_raw.py ITEM_GROUPS). '
                    'Correlations reflect genuine + shared-method variance, '
                    'not item-overlap leakage.')
    print(f"  item-overlap check: {item_overlap}")

    # ---- calibration curve ----------------------------------------------------
    calib_png = None
    if HAVE_MPL:
        try:
            frac_pos, mean_pred = calibration_curve(y, oof, n_bins=5, strategy='quantile')
            plt.figure(figsize=(5, 5))
            plt.plot([0, 1], [0, 1], '--', color='gray', label='perfect')
            plt.plot(mean_pred, frac_pos, 'o-', label=f'local model (Brier={brier:.3f})')
            plt.xlabel('mean predicted P(flight risk)')
            plt.ylabel('observed fraction positive')
            plt.title('Local model reliability curve (SL, fold-internal OOF)')
            plt.legend(); plt.tight_layout()
            calib_png = os.path.join(REPORTS_DIR, 'audit_local_calibration.png')
            plt.savefig(calib_png, dpi=120); plt.close()
            print(f"\n  reliability curve saved -> {calib_png}")
        except Exception as e:
            print(f"  [calibration plot skipped: {e}]")

    out = {
        'n': int(len(y)), 'positives': int(y.sum()),
        'prevalence': round(float(y.mean()), 4),
        'constructs': feats,
        'A_imputation_leakage': {
            'missing_rate': round(nan_rate, 4),
            'variants': leak,
            'delta_alldata_minus_leakfree': round(float(delta), 4),
            'verdict': ('immaterial (<0.005 AUC)' if abs(delta) < 0.005
                        else 'material — report the fold-internal number'),
        },
        'B_operating_point': {'optimistic': opt, 'nested': nst},
        'C_common_method_variance': {
            'construct_target_correlation': corr,
            'intention_composite': intent_label,
            'item_overlap': item_overlap,
        },
        'D_stability': {
            'per_fold_auc_mean': round(fold_mean, 4),
            'per_fold_auc_sd': round(fold_sd, 4),
            'bootstrap_auc_ci95': [boot_lo, boot_hi],
            'bootstrap_auc_mean': boot_mean,
            'n_boot': args.n_boot,
            'pr_auc': round(pr_auc, 4),
            'brier_score': round(brier, 4),
        },
        'headline_reconciliation': {
            'reported_roc_auc': 0.94,
            'leak_free_roc_auc_mean': leak['fold_internal_impute (leak-free)']['roc_auc_mean'],
            'honest_operating_point_f1': nst['f1'],
        },
    }
    out_path = os.path.join(REPORTS_DIR, 'audit_local_model.json')
    with open(out_path, 'w') as f:
        json.dump(out, f, indent=2)
    print(f"  audit JSON saved -> {out_path}")
    print("=" * 68)


if __name__ == '__main__':
    main()
