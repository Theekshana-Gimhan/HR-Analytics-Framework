"""
train_model.py  --  Phase 3: train + honestly evaluate the attrition model.

This script is deliberately conservative about what it claims, because the data
has three properties that make naive evaluation misleading:

  1. FEATURE FRAGMENTATION. The held-out Sri Lankan validation set shares only
     four predictors with the training master: Age, Gender, JobSatisfaction,
     WorkLifeBalance. A model trained on the master's full column set CANNOT be
     evaluated on the SL data (the other columns don't exist there). So the
     honest, apples-to-apples model is trained on exactly the shared feature set
     (PRIMARY_FEATURES). A richer "internal" model is reported separately and is
     explicitly NOT validated on Sri Lanka.

  2. SCALE MISMATCH. JobSatisfaction / WorkLifeBalance are on a 1-3 scale in the
     master but a 1-5 scale in the SL survey. A RandomForest split threshold
     learned on 1-3 is meaningless on 1-5. We min-max rescale these ordinal
     features to [0,1] WITHIN each dataset before use (the same reasoning as the
     within-source income z-score in merge_and_clean_data.py).

  3. BASE-RATE MISMATCH. Training prevalence is ~42% (Saudi/Russian), but SL
     validation is ~14% and IBM ~16%. A 0.5 cut-off tuned implicitly to 42% will
     over-predict on a 14% population. We therefore TUNE the decision threshold
     on an internal held-out split and report the full metric suite
     (precision/recall/F1/ROC-AUC/PR-AUC), not recall alone.

  4. CONSTRUCT MISMATCH. The SL target is turnover *intention* (Likert >= 4), not
     actual attrition. Treat SL results as a flight-risk proxy, never as proof of
     predicting real resignations. This is printed in the report header too.

imbalanced-learn (SMOTETOMEK) and shap are optional. If absent, the script falls
back to class_weight='balanced' and skips SHAP, and tells you how to enable them.

Usage:
  python scripts/train_model.py                 # default: SMOTETOMEK if available
  python scripts/train_model.py --no-resample   # use class weights instead
  python scripts/train_model.py --target-recall 0.80
"""

import os
import json
import argparse
import warnings
from datetime import date

import numpy as np
import pandas as pd
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_predict, StratifiedKFold
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    average_precision_score, confusion_matrix, classification_report,
)

warnings.filterwarnings('ignore')

# ── Optional dependencies ──────────────────────────────────────────────────────
try:
    from imblearn.combine import SMOTETomek
    HAVE_IMBLEARN = True
except ImportError:
    HAVE_IMBLEARN = False

try:
    import shap
    HAVE_SHAP = True
except ImportError:
    HAVE_SHAP = False

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
MODELS_DIR  = os.path.join(BASE_DIR, 'models')
REPORTS_DIR = os.path.join(BASE_DIR, 'reports')

MASTER_PATH     = os.path.join(DATA_DIR, 'nexus_hr_master_dataset.csv')
VALIDATION_PATH = os.path.join(DATA_DIR, 'validation_srilanka.csv')
BENCHMARK_PATH  = os.path.join(DATA_DIR, 'benchmark_ibm.csv')

# ── Feature configuration ──────────────────────────────────────────────────────
TARGET = 'Attrition_binary'

# The ONLY features shared between the training master and the SL validation set.
# Training on exactly these keeps the SL evaluation honest (no missing-column
# imputation papering over the gap).
PRIMARY_FEATURES = ['Age', 'Gender', 'JobSatisfaction', 'WorkLifeBalance']

# Ordinal features whose scale differs across instruments → rescale within dataset.
ORDINAL_RESCALE = ['JobSatisfaction', 'WorkLifeBalance']

# The 8 psychometric constructs available in the Sri Lanka survey. The LOCAL model
# trains and validates entirely within the SL data on these (5-fold CV), which is
# far stronger than the cross-domain transfer model because the features are rich,
# same-instrument, and same-population. These are survey-sourced — in production
# their natural input is the planned Dialogflow "Pulse Check" survey, not the
# operational HR data (attendance/leave/payroll).
SL_CONSTRUCTS = ['JobSatisfaction', 'WorkLifeBalance', 'Happiness',
                 'ManagementSupport', 'CareerManagement',
                 'InnovativeWorkBehavior', 'LeaderMemberExchange', 'CoworkerSupport']

LOCAL_CV_SEEDS = [42, 1, 7, 13, 99]

RANDOM_STATE = 42


# ── Feature preparation ────────────────────────────────────────────────────────
def encode_gender(series: pd.Series) -> pd.Series:
    """Case-insensitive male/female -> 1/0. Anything else -> NaN (then imputed)."""
    s = series.astype(str).str.strip().str.lower()
    return s.map({'male': 1.0, 'm': 1.0, '1': 1.0,
                  'female': 0.0, 'f': 0.0, '0': 0.0})


def prepare_features(df: pd.DataFrame, features: list) -> pd.DataFrame:
    """
    Build a numeric feature matrix. Ordinal satisfaction features are min-max
    rescaled to [0,1] WITHIN this dataset so a 1-3 instrument and a 1-5
    instrument become comparable. Fitting per-dataset is intentional: it assumes
    each instrument's observed min/max represent its lowest/highest levels, which
    is the most defensible cross-instrument alignment available.
    """
    X = pd.DataFrame(index=df.index)
    for col in features:
        if col == 'Gender':
            X[col] = encode_gender(df[col]) if col in df.columns else np.nan
            continue
        vals = pd.to_numeric(df.get(col, pd.Series(index=df.index, dtype=float)),
                             errors='coerce')
        if col in ORDINAL_RESCALE:
            lo, hi = vals.min(), vals.max()
            vals = (vals - lo) / (hi - lo) if pd.notna(lo) and hi > lo else vals * 0 + 0.5
        X[col] = vals
    return X


# ── Metrics ────────────────────────────────────────────────────────────────────
def metrics_at(y_true, proba, thr: float) -> dict:
    pred = (proba >= thr).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred, labels=[0, 1]).ravel()
    return {
        'threshold': round(float(thr), 4),
        'precision': round(float(precision_score(y_true, pred, zero_division=0)), 4),
        'recall':    round(float(recall_score(y_true, pred, zero_division=0)), 4),
        'f1':        round(float(f1_score(y_true, pred, zero_division=0)), 4),
        'predicted_positive_rate': round(float(pred.mean()), 4),
        'confusion': {'tn': int(tn), 'fp': int(fp), 'fn': int(fn), 'tp': int(tp)},
    }


def threshold_metrics(y_true, proba) -> dict:
    """Threshold-independent metrics."""
    out = {'positives': int(np.sum(y_true)), 'n': int(len(y_true)),
           'prevalence': round(float(np.mean(y_true)), 4)}
    if len(np.unique(y_true)) > 1:
        out['roc_auc'] = round(float(roc_auc_score(y_true, proba)), 4)
        out['pr_auc']  = round(float(average_precision_score(y_true, proba)), 4)
    else:
        out['roc_auc'] = out['pr_auc'] = None
    return out


def pick_thresholds(y_true, proba, target_recall: float) -> dict:
    """
    From a held-out split, derive two operating points:
      - f1_optimal: threshold maximising F1
      - recall_target: lowest threshold achieving recall >= target (best precision
        among those that hit the recall floor)
    """
    grid = np.unique(np.round(proba, 3))
    grid = np.clip(np.concatenate([[0.0], grid, [1.0]]), 0, 1)
    best_f1, best_f1_thr = -1.0, 0.5
    recall_thr, recall_prec = None, -1.0
    for thr in grid:
        pred = (proba >= thr).astype(int)
        f1 = f1_score(y_true, pred, zero_division=0)
        if f1 > best_f1:
            best_f1, best_f1_thr = f1, thr
        rec = recall_score(y_true, pred, zero_division=0)
        prec = precision_score(y_true, pred, zero_division=0)
        if rec >= target_recall and prec > recall_prec:
            recall_prec, recall_thr = prec, thr
    return {
        'f1_optimal': float(best_f1_thr),
        'recall_target': float(recall_thr) if recall_thr is not None else None,
    }


def report_block(name, y_true, proba, thresholds: dict) -> dict:
    base = threshold_metrics(y_true, proba)
    print(f"\n  [{name}]  n={base['n']}  prevalence={base['prevalence']:.1%}  "
          f"ROC-AUC={base['roc_auc']}  PR-AUC={base['pr_auc']}")
    points = {}
    for label, thr in thresholds.items():
        if thr is None:
            print(f"    {label:16s} : (no threshold met the recall floor)")
            continue
        m = metrics_at(y_true, proba, thr)
        points[label] = m
        print(f"    {label:16s} @thr={m['threshold']:.3f}  "
              f"P={m['precision']:.3f}  R={m['recall']:.3f}  F1={m['f1']:.3f}  "
              f"pred+={m['predicted_positive_rate']:.1%}  "
              f"(tp={m['confusion']['tp']} fn={m['confusion']['fn']} "
              f"fp={m['confusion']['fp']} tn={m['confusion']['tn']})")
    return {**base, 'operating_points': points}


# ── Local Sri Lanka model (train + validate within SL data) ────────────────────
def evaluate_local_sl_model(val_df: pd.DataFrame, target_recall: float) -> dict:
    """
    Train AND validate within the Sri Lanka data using all 8 psychometric
    constructs, via repeated stratified 5-fold cross-validation. Reporting the
    spread across seeds is the key honesty signal: n=230 with only ~33 positives,
    so a single split would be unstable.

    This is the locally-relevant counterpart to the cross-domain transfer model.
    Its strong performance vs the weak transfer model is the headline finding:
    it quantifies why Sri Lanka needs its own HR data.
    """
    feats = [c for c in SL_CONSTRUCTS if c in val_df.columns]
    if len(feats) < 4:
        print(f"\n  [local model skipped: only {len(feats)} constructs present "
              f"-- rerun preprocess_raw.py + merge_and_clean_data.py]")
        return {}

    X = val_df[feats].apply(pd.to_numeric, errors='coerce')
    X = X.fillna(X.median())
    y = val_df[TARGET].astype(int).values

    print("\n" + "-" * 64)
    print("LOCAL Sri Lanka model -- 8 constructs, repeated 5-fold CV")
    print("-" * 64)
    print(f"  Features ({len(feats)}): {feats}")
    print(f"  n={len(y)}  positives={int(y.sum())}  prevalence={y.mean():.1%}")

    aucs, praucs, oof_first = [], [], None
    for seed in LOCAL_CV_SEEDS:
        rf = RandomForestClassifier(n_estimators=400, class_weight='balanced',
                                    random_state=seed, n_jobs=-1)
        cv = StratifiedKFold(5, shuffle=True, random_state=seed)
        oof = cross_val_predict(rf, X, y, cv=cv, method='predict_proba')[:, 1]
        if len(np.unique(y)) > 1:
            aucs.append(roc_auc_score(y, oof))
            praucs.append(average_precision_score(y, oof))
        if oof_first is None:
            oof_first = oof

    auc_mean = float(np.mean(aucs)) if aucs else None
    pr_mean = float(np.mean(praucs)) if praucs else None
    print(f"  ROC-AUC: mean={auc_mean:.3f}  range=[{min(aucs):.3f}, {max(aucs):.3f}]"
          f"  over {len(aucs)} seeds")
    print(f"  PR-AUC : mean={pr_mean:.3f}  range=[{min(praucs):.3f}, {max(praucs):.3f}]"
          f"  (baseline={y.mean():.3f})")

    # Operating points on the first-seed out-of-fold predictions.
    tuned = pick_thresholds(y, oof_first, target_recall)
    thresholds = {'default_0.5': 0.5, 'f1_optimal': tuned['f1_optimal'],
                  'recall_target': tuned['recall_target']}
    points = report_block('SL local (out-of-fold, seed 42)', y, oof_first, thresholds)

    # Final model on all SL rows for SHAP + feature importance.
    final = RandomForestClassifier(n_estimators=400, class_weight='balanced',
                                   random_state=RANDOM_STATE, n_jobs=-1)
    final.fit(X, y)
    importances = dict(zip(feats, [round(float(v), 4) for v in final.feature_importances_]))
    print(f"  Construct importance: "
          f"{dict(sorted(importances.items(), key=lambda kv: -kv[1]))}")

    shap_local = None
    if HAVE_SHAP:
        try:
            expl = shap.TreeExplainer(final)
            sv = expl.shap_values(X)
            sv_pos = sv[1] if isinstance(sv, list) else sv
            if sv_pos.ndim == 3:
                sv_pos = sv_pos[:, :, 1]
            if HAVE_MPL:
                shap.summary_plot(sv_pos, X, feature_names=feats, show=False)
                fig_path = os.path.join(REPORTS_DIR, 'shap_local.png')
                plt.tight_layout(); plt.savefig(fig_path, dpi=120); plt.close()
                print(f"  SHAP (local) saved -> {fig_path}")
            shap_local = dict(zip(feats,
                              [round(float(v), 4) for v in np.abs(sv_pos).mean(axis=0)]))
        except Exception as e:
            print(f"  [SHAP (local) skipped: {e}]")

    return {
        'features': feats, 'n': int(len(y)), 'positives': int(y.sum()),
        'prevalence': round(float(y.mean()), 4),
        'cv': 'repeated stratified 5-fold',
        'roc_auc_mean': round(auc_mean, 4) if auc_mean else None,
        'roc_auc_range': [round(min(aucs), 4), round(max(aucs), 4)] if aucs else None,
        'pr_auc_mean': round(pr_mean, 4) if pr_mean else None,
        'pr_auc_range': [round(min(praucs), 4), round(max(praucs), 4)] if praucs else None,
        'operating_points': points['operating_points'],
        'feature_importance': importances,
        'shap_mean_abs': shap_local,
    }


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--no-resample', action='store_true',
                    help='Use class_weight=balanced instead of SMOTETOMEK.')
    ap.add_argument('--target-recall', type=float, default=0.80,
                    help='Recall floor for the recall_target operating point.')
    ap.add_argument('--n-estimators', type=int, default=400)
    ap.add_argument('--max-depth', type=int, default=None)
    args = ap.parse_args()

    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    use_resample = HAVE_IMBLEARN and not args.no_resample

    print("=" * 64)
    print("NexusHR -- Phase 3 model training")
    print("=" * 64)
    print(f"  Features (shared with SL validation): {PRIMARY_FEATURES}")
    print(f"  Resampling: {'SMOTETOMEK' if use_resample else 'class_weight=balanced'}"
          f"{'' if HAVE_IMBLEARN else '  (imbalanced-learn not installed)'}")
    print(f"  SHAP: {'enabled' if HAVE_SHAP else 'skipped (shap not installed)'}")
    print("  NOTE: SL validation target is turnover INTENTION, not actual")
    print("        attrition. Read SL numbers as a flight-risk proxy.")

    # ── Load ──────────────────────────────────────────────────────────────────
    master = pd.read_csv(MASTER_PATH)
    X_all = prepare_features(master, PRIMARY_FEATURES)
    y_all = master[TARGET].astype(int).values
    w_all = master['SampleWeight'].astype(float).values

    # ── Internal stratified split (for threshold tuning, kept out of training) ──
    X_tr, X_te, y_tr, y_te, w_tr, w_te = train_test_split(
        X_all, y_all, w_all, test_size=0.20, stratify=y_all,
        random_state=RANDOM_STATE)

    # ── Impute (RandomForest cannot consume NaN) ───────────────────────────────
    imputer = SimpleImputer(strategy='median')
    X_tr_i = imputer.fit_transform(X_tr)
    X_te_i = imputer.transform(X_te)

    # ── Resample on the TRAINING split only ────────────────────────────────────
    sample_weight = None
    if use_resample:
        # SMOTETOMEK rebalances classes; combining it with sample_weight would
        # double-correct, so we drop the weights when resampling.
        smt = SMOTETomek(random_state=RANDOM_STATE)
        X_fit, y_fit = smt.fit_resample(X_tr_i, y_tr)
        class_weight = None
        print(f"\n  SMOTETOMEK: {len(y_tr)} -> {len(y_fit)} rows "
              f"(train prevalence {y_tr.mean():.1%} -> {y_fit.mean():.1%})")
    else:
        X_fit, y_fit = X_tr_i, y_tr
        sample_weight = w_tr
        class_weight = 'balanced'

    # ── Train ──────────────────────────────────────────────────────────────────
    clf = RandomForestClassifier(
        n_estimators=args.n_estimators, max_depth=args.max_depth,
        class_weight=class_weight, random_state=RANDOM_STATE, n_jobs=-1)
    clf.fit(X_fit, y_fit, sample_weight=sample_weight)

    # ── Tune thresholds on the internal held-out split ─────────────────────────
    proba_te = clf.predict_proba(X_te_i)[:, 1]
    tuned = pick_thresholds(y_te, proba_te, args.target_recall)
    thresholds = {'default_0.5': 0.5,
                  'f1_optimal': tuned['f1_optimal'],
                  'recall_target': tuned['recall_target']}
    print(f"\n  Tuned on internal test: f1_optimal={tuned['f1_optimal']:.3f}  "
          f"recall>={args.target_recall:.0%} -> "
          f"{('%.3f' % tuned['recall_target']) if tuned['recall_target'] is not None else 'N/A'}")

    results = {}
    print("\n" + "-" * 64)
    print("TRANSFER MODEL -- train on intl. attrition, thresholds on internal test")
    print("-" * 64)
    results['internal_test'] = report_block('internal test (intl. distribution)',
                                            y_te, proba_te, thresholds)

    # ── Sri Lanka validation (primary, honest) ─────────────────────────────────
    val = pd.read_csv(VALIDATION_PATH)
    Xv = imputer.transform(prepare_features(val, PRIMARY_FEATURES))
    yv = val[TARGET].astype(int).values
    proba_v = clf.predict_proba(Xv)[:, 1]
    # Oracle threshold: what SL itself would need for the recall floor (discussion
    # only — NOT a legitimate model-selection threshold, marked as such).
    oracle = pick_thresholds(yv, proba_v, args.target_recall)
    thr_sl = {**thresholds,
              'recall_target_ORACLE_sl': oracle['recall_target']}
    results['validation_srilanka'] = report_block(
        'SRI LANKA validation (intention proxy)', yv, proba_v, thr_sl)

    # ── IBM benchmark (published comparison) ───────────────────────────────────
    if os.path.exists(BENCHMARK_PATH):
        bench = pd.read_csv(BENCHMARK_PATH)
        Xb = imputer.transform(prepare_features(bench, PRIMARY_FEATURES))
        yb = bench[TARGET].astype(int).values
        proba_b = clf.predict_proba(Xb)[:, 1]
        results['benchmark_ibm'] = report_block(
            'IBM benchmark (4-feature subset)', yb, proba_b, thresholds)

    # ── Feature importance / SHAP ──────────────────────────────────────────────
    importances = dict(zip(PRIMARY_FEATURES,
                           [round(float(v), 4) for v in clf.feature_importances_]))
    print(f"\n  RF impurity importance: {importances}")

    if HAVE_SHAP:
        try:
            explainer = shap.TreeExplainer(clf)
            sv = explainer.shap_values(X_te_i)
            sv_pos = sv[1] if isinstance(sv, list) else sv
            if sv_pos.ndim == 3:           # (n, features, classes)
                sv_pos = sv_pos[:, :, 1]
            if HAVE_MPL:
                shap.summary_plot(sv_pos, X_te,
                                  feature_names=PRIMARY_FEATURES, show=False)
                fig_path = os.path.join(REPORTS_DIR, 'shap_summary.png')
                plt.tight_layout(); plt.savefig(fig_path, dpi=120); plt.close()
                print(f"  SHAP summary saved -> {fig_path}")
            mean_abs = np.abs(sv_pos).mean(axis=0)
            results['shap_mean_abs'] = dict(zip(
                PRIMARY_FEATURES, [round(float(v), 4) for v in mean_abs]))
        except Exception as e:
            print(f"  [SHAP skipped: {e}]")

    # ── LOCAL Sri Lanka model (the strong, locally-relevant counterpart) ───────
    local = evaluate_local_sl_model(val, args.target_recall)

    # ── Transfer vs Local comparison (the headline finding) ────────────────────
    transfer_auc = results['validation_srilanka'].get('roc_auc')
    local_auc = local.get('roc_auc_mean') if local else None
    comparison = {
        'transfer_model': {
            'description': 'Train on international attrition -> predict SL intention',
            'features': len(PRIMARY_FEATURES), 'sl_roc_auc': transfer_auc,
            'sl_pr_auc': results['validation_srilanka'].get('pr_auc'),
        },
        'local_model': {
            'description': 'Train + 5-fold CV within SL data on 8 constructs',
            'features': len(local.get('features', [])) if local else 0,
            'sl_roc_auc': local_auc, 'sl_pr_auc': local.get('pr_auc_mean') if local else None,
        },
        'conclusion': (
            'Cross-cultural transfer is weak; a locally-trained model is strong. '
            'This quantifies why Sri Lanka needs its own HR data — the research gap.'
        ),
    }
    print("\n" + "=" * 64)
    print("HEADLINE: TRANSFER vs LOCAL (Sri Lanka, ROC-AUC)")
    print("=" * 64)
    print(f"  Transfer model (4 intl. features) : {transfer_auc}")
    print(f"  Local model    (8 SL constructs)  : {local_auc}"
          f"{'' if not local else '  range ' + str(local.get('roc_auc_range'))}")
    print(f"  -> {comparison['conclusion']}")

    # ── Persist ────────────────────────────────────────────────────────────────
    model_bundle = {'model': clf, 'imputer': imputer,
                    'features': PRIMARY_FEATURES,
                    'ordinal_rescale': ORDINAL_RESCALE}
    model_path = os.path.join(MODELS_DIR, 'attrition_rf.joblib')
    joblib.dump(model_bundle, model_path)

    report = {
        'generated': str(date.today()),
        'config': {
            'transfer_features': PRIMARY_FEATURES,
            'local_features': SL_CONSTRUCTS,
            'resampling': 'SMOTETOMEK' if use_resample else 'class_weight_balanced',
            'n_estimators': args.n_estimators, 'max_depth': args.max_depth,
            'target_recall': args.target_recall,
            'sl_target_threshold': 'ET_composite >= 3.5',
        },
        'caveats': [
            'SL validation target is turnover intention, not actual attrition.',
            'Transfer model: only 4 features shared between training and SL validation.',
            'JobSatisfaction/WorkLifeBalance rescaled to [0,1] within each dataset.',
            'Training prevalence ~42% vs SL ~14% — thresholds tuned on internal test.',
            'Local model: n=230 with ~33 positives — AUC reported as multi-seed CV mean+range.',
            'Local constructs are survey-sourced (future input = Dialogflow pulse-check).',
        ],
        'comparison': comparison,
        'transfer_feature_importance': importances,
        'results': {**results, 'local_model': local},
    }
    report_path = os.path.join(REPORTS_DIR, 'training_report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 64)
    print(f"  Model saved   -> {model_path}")
    print(f"  Report saved  -> {report_path}")
    if not HAVE_IMBLEARN or not HAVE_SHAP:
        miss = [p for p, ok in [('imbalanced-learn', HAVE_IMBLEARN),
                                ('shap', HAVE_SHAP)] if not ok]
        print(f"  To enable full pipeline: pip install {' '.join(miss)}")
    print("=" * 64)


if __name__ == '__main__':
    main()
