"""
baseline_comparison.py  --  P3: algorithm baselines beside the Random Forest.

"Why Random Forest?" is a guaranteed viva question. The RF was chosen a priori
(interpretable, SHAP TreeExplainer is exact on it, cheap to serve on Cloud Run),
never compared. This script supplies the missing empirical column: Logistic
Regression and Gradient Boosting run through the SAME two harnesses as the RF,
on the SAME data, with the SAME seeds -- so the only thing that varies is the
estimator.

TWO ARMS, matching the two models the project actually reports:

  LOCAL arm  -- 8 psychometric constructs, repeated stratified 5-fold CV inside
                the 230-row SL survey. This is the ~0.94 headline. Imputation is
                fold-internal (sklearn Pipeline inside cross_val_predict), which
                P1 showed is a no-op here (0% missing) but is the correct form.

  TRANSFER arm -- 4 shared features, train on the master, evaluate on the fixed
                230-row SL validation set. Both resampling paths are run because
                P2 showed they behave differently: 'smote' (SMOTETOMEK, the
                documented headline recipe, drops sample_weight) and 'cw'
                (class_weight='balanced' + the master's SampleWeight column).

CLASS BALANCING IS PER-ALGORITHM, NOT PER-LIBRARY-QUIRK. RF and LogReg accept
class_weight='balanced'; GradientBoostingClassifier does not, so it receives the
equivalent balanced weights through sample_weight instead. Without this the GB
column would lose on a handicap rather than on merit. Logistic Regression is
wrapped in a StandardScaler (it is scale-sensitive; the trees are not).

Every number is the mean over 5 seeds with the SD reported beside it, because P2
established that a single draw on this dataset can move ROC-AUC by +/-0.10.

Outputs (gitignored, reproducible):
  reports/baseline_comparison.json  -- full metrics per algorithm per arm
  reports/baseline_comparison.png   -- ROC-AUC by algorithm, both arms

Run:  python scripts/baseline_comparison.py
"""

import os
import json
import argparse
import warnings
from datetime import date

import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.model_selection import (
    StratifiedKFold, cross_val_predict, train_test_split,
)
from sklearn.utils.class_weight import compute_sample_weight
from sklearn.metrics import (
    roc_auc_score, average_precision_score, brier_score_loss,
)

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
PRIMARY_FEATURES = ['Age', 'Gender', 'JobSatisfaction', 'WorkLifeBalance']
ORDINAL_RESCALE  = ['JobSatisfaction', 'WorkLifeBalance']
SL_CONSTRUCTS = ['JobSatisfaction', 'WorkLifeBalance', 'Happiness',
                 'ManagementSupport', 'CareerManagement',
                 'InnovativeWorkBehavior', 'LeaderMemberExchange', 'CoworkerSupport']
N_ESTIMATORS = 400
SEEDS = [42, 1, 7, 13, 99]
ALGORITHMS = ['rf', 'logreg', 'gbm']
ALGO_LABEL = {'rf': 'Random Forest (current)',
              'logreg': 'Logistic Regression',
              'gbm': 'Gradient Boosting'}


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


# ── Estimators ─────────────────────────────────────────────────────────────────
def make_estimator(algo: str, seed: int, balanced: bool = True):
    """
    Return a bare estimator for `algo`. `balanced` applies the algorithm's native
    class-balancing where one exists; GradientBoosting has none, so callers must
    pass balanced sample_weight instead (see needs_manual_balance).

    LogReg is scaled inside its own Pipeline -- it is the only scale-sensitive
    estimator here, and scaling must not leak across CV folds.
    """
    cw = 'balanced' if balanced else None
    if algo == 'rf':
        return RandomForestClassifier(n_estimators=N_ESTIMATORS, class_weight=cw,
                                      random_state=seed, n_jobs=-1)
    if algo == 'logreg':
        return Pipeline([('scale', StandardScaler()),
                         ('clf', LogisticRegression(class_weight=cw, max_iter=2000,
                                                    random_state=seed))])
    if algo == 'gbm':
        return GradientBoostingClassifier(random_state=seed)
    raise ValueError(f'unknown algorithm: {algo}')


def needs_manual_balance(algo: str) -> bool:
    """GradientBoostingClassifier has no class_weight; balance it via weights."""
    return algo == 'gbm'


# ── LOCAL arm: 8 constructs, 5-fold CV inside the SL survey ────────────────────
def local_arm(val: pd.DataFrame, algo: str) -> dict:
    feats = [c for c in SL_CONSTRUCTS if c in val.columns]
    X = val[feats].apply(pd.to_numeric, errors='coerce').values
    y = val[TARGET].astype(int).values

    aucs, praucs, briers = [], [], []
    for seed in SEEDS:
        est = make_estimator(algo, seed)
        # Fold-internal imputation: correct form (a no-op here, 0% missing -- P1).
        pipe = Pipeline([('impute', SimpleImputer(strategy='median')),
                         ('est', est)])
        cv = StratifiedKFold(5, shuffle=True, random_state=seed)
        fit_params = {}
        if needs_manual_balance(algo):
            fit_params['est__sample_weight'] = compute_sample_weight('balanced', y)
        oof = cross_val_predict(pipe, X, y, cv=cv, method='predict_proba',
                                params=fit_params or None)[:, 1]
        aucs.append(roc_auc_score(y, oof))
        praucs.append(average_precision_score(y, oof))
        briers.append(brier_score_loss(y, oof))

    aucs, praucs, briers = np.array(aucs), np.array(praucs), np.array(briers)
    return {
        'algorithm': algo, 'label': ALGO_LABEL[algo], 'arm': 'local',
        'features': feats, 'n': int(len(y)), 'positives': int(y.sum()),
        'roc_auc_mean': round(float(aucs.mean()), 4),
        'roc_auc_std':  round(float(aucs.std()), 4),
        'roc_auc_by_seed': [round(float(a), 4) for a in aucs],
        'pr_auc_mean': round(float(praucs.mean()), 4),
        'brier_mean':  round(float(briers.mean()), 4),
    }


# ── TRANSFER arm: 4 shared features, master -> fixed SL validation ─────────────
def transfer_once(master: pd.DataFrame, val: pd.DataFrame, algo: str,
                  seed: int, mode: str):
    """One train+evaluate pass. Mirrors ablation_synthetic.train_eval_once so the
    numbers stay comparable to P2, with the estimator swapped out."""
    X_all = prepare_features(master)
    y_all = master[TARGET].astype(int).values
    w_all = master['SampleWeight'].astype(float).values

    X_tr, _Xte, y_tr, _yte, w_tr, _wte = train_test_split(
        X_all, y_all, w_all, test_size=0.20, stratify=y_all, random_state=seed)

    imp = SimpleImputer(strategy='median')
    X_tr_i = imp.fit_transform(X_tr)

    if mode == 'smote':
        # Headline recipe: resampling rebalances the classes and drops weights.
        X_fit, y_fit = SMOTETomek(random_state=seed).fit_resample(X_tr_i, y_tr)
        est = make_estimator(algo, seed, balanced=False)
        sw = compute_sample_weight('balanced', y_fit) if needs_manual_balance(algo) else None
    else:
        X_fit, y_fit = X_tr_i, y_tr
        est = make_estimator(algo, seed, balanced=True)
        sw = w_tr
        if needs_manual_balance(algo):
            sw = w_tr * compute_sample_weight('balanced', y_tr)

    if isinstance(est, Pipeline):
        est.fit(X_fit, y_fit, **({'clf__sample_weight': sw} if sw is not None else {}))
    else:
        est.fit(X_fit, y_fit, sample_weight=sw)

    Xv = imp.transform(prepare_features(val))
    yv = val[TARGET].astype(int).values
    pv = est.predict_proba(Xv)[:, 1]
    return float(roc_auc_score(yv, pv)), float(average_precision_score(yv, pv))


def transfer_arm(master: pd.DataFrame, val: pd.DataFrame, algo: str, mode: str) -> dict:
    rocs, prs = [], []
    for seed in SEEDS:
        roc, pr = transfer_once(master, val, algo, seed, mode)
        rocs.append(roc)
        prs.append(pr)
    rocs, prs = np.array(rocs), np.array(prs)
    return {
        'algorithm': algo, 'label': ALGO_LABEL[algo],
        'arm': f'transfer_{mode}', 'mode': mode,
        'roc_auc_mean': round(float(rocs.mean()), 4),
        'roc_auc_std':  round(float(rocs.std()), 4),
        'roc_auc_by_seed': [round(float(r), 4) for r in rocs],
        'pr_auc_mean': round(float(prs.mean()), 4),
    }


# ── Verdict ────────────────────────────────────────────────────────────────────
def rank_and_verdict(block: dict, arm_name: str) -> dict:
    """Rank algorithms and say whether RF's lead (or deficit) clears seed noise."""
    ranked = sorted(block.values(), key=lambda r: -r['roc_auc_mean'])
    best = ranked[0]
    rf = block['rf']
    gap = rf['roc_auc_mean'] - best['roc_auc_mean']
    pooled_sd = (rf['roc_auc_std'] + best['roc_auc_std']) / 2 or 1e-9
    z = gap / pooled_sd
    if best['algorithm'] == 'rf':
        runner = ranked[1]
        lead = rf['roc_auc_mean'] - runner['roc_auc_mean']
        pooled = (rf['roc_auc_std'] + runner['roc_auc_std']) / 2 or 1e-9
        if abs(lead / pooled) < 1.0:
            text = (f"RF ranks first ({rf['roc_auc_mean']:.3f}) but its lead over "
                    f"{runner['label']} ({runner['roc_auc_mean']:.3f}) is within seed "
                    f"noise (delta {lead:+.3f}, |z|={abs(lead/pooled):.2f}) -- defend RF "
                    f"on interpretability/serving cost, not on accuracy.")
        else:
            text = (f"RF wins outright ({rf['roc_auc_mean']:.3f} vs "
                    f"{runner['roc_auc_mean']:.3f} for {runner['label']}, "
                    f"delta {lead:+.3f}, |z|={abs(lead/pooled):.2f}).")
    elif abs(z) < 1.0:
        text = (f"{best['label']} ranks first ({best['roc_auc_mean']:.3f}) but RF "
                f"({rf['roc_auc_mean']:.3f}) is within seed noise of it "
                f"(delta {gap:+.3f}, |z|={abs(z):.2f}) -- RF is defensible as a tie "
                f"broken on interpretability and serving cost.")
    else:
        text = (f"{best['label']} BEATS RF materially ({best['roc_auc_mean']:.3f} vs "
                f"{rf['roc_auc_mean']:.3f}, delta {gap:+.3f}, |z|={abs(z):.2f}) -- "
                f"report this honestly and justify RF on SHAP-exactness/cost, or "
                f"switch.")
    return {'arm': arm_name,
            'ranking': [r['algorithm'] for r in ranked],
            'best': best['algorithm'],
            'rf_minus_best_roc_auc': round(float(gap), 4),
            'z_vs_seed_noise': round(float(z), 2),
            'verdict': text}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--seeds', type=int, nargs='*', default=None,
                    help='Override the seed list (default: 42 1 7 13 99).')
    args = ap.parse_args()
    if args.seeds:
        global SEEDS
        SEEDS = args.seeds

    print("=" * 68)
    print("P3 -- baseline algorithm comparison (LogReg / GBM / RF)")
    print("=" * 68)

    master = pd.read_csv(MASTER_PATH)
    val = pd.read_csv(VALIDATION_PATH)
    y_val = val[TARGET].astype(int).values
    print(f"  Master rows: {len(master)}   SL validation: n={len(val)} "
          f"positives={int(y_val.sum())} prevalence={y_val.mean():.4f}")
    print(f"  Seeds: {SEEDS}   RF/GBM n_estimators={N_ESTIMATORS}")
    if not HAVE_IMBLEARN:
        print("  [WARN] imbalanced-learn missing -- SMOTETOMEK arm skipped.")

    # ── LOCAL arm ───────────────────────────────────────────────────────────────
    print("\n  " + "-" * 64)
    print("  LOCAL arm -- 8 constructs, repeated stratified 5-fold CV (n=230)")
    print("  " + "-" * 64)
    local = {}
    for algo in ALGORITHMS:
        r = local_arm(val, algo)
        local[algo] = r
        print(f"    {r['label']:26s} ROC-AUC {r['roc_auc_mean']:.3f} "
              f"+/- {r['roc_auc_std']:.3f}   PR-AUC {r['pr_auc_mean']:.3f}   "
              f"Brier {r['brier_mean']:.3f}")

    # ── TRANSFER arms ───────────────────────────────────────────────────────────
    transfer = {}
    modes = ['cw'] + (['smote'] if HAVE_IMBLEARN else [])
    mode_title = {'cw': 'class_weight + SampleWeight (stable path)',
                  'smote': 'SMOTETOMEK (documented headline recipe)'}
    for mode in modes:
        print("\n  " + "-" * 64)
        print(f"  TRANSFER arm -- 4 shared features, {mode_title[mode]}")
        print("  " + "-" * 64)
        block = {}
        for algo in ALGORITHMS:
            r = transfer_arm(master, val, algo, mode)
            block[algo] = r
            print(f"    {r['label']:26s} ROC-AUC {r['roc_auc_mean']:.3f} "
                  f"+/- {r['roc_auc_std']:.3f}   PR-AUC {r['pr_auc_mean']:.3f}")
        transfer[mode] = block

    # ── Verdicts ────────────────────────────────────────────────────────────────
    verdicts = {'local': rank_and_verdict(local, 'local')}
    for mode in modes:
        verdicts[f'transfer_{mode}'] = rank_and_verdict(transfer[mode], f'transfer_{mode}')

    print("\n  " + "=" * 64)
    print("  VERDICTS -- does Random Forest earn its place?")
    print("  " + "=" * 64)
    for k, v in verdicts.items():
        print(f"    [{k}]\n      {v['verdict']}")

    # ── Plot ────────────────────────────────────────────────────────────────────
    if HAVE_MPL:
        arms = [('local', local)] + [(f'transfer_{m}', transfer[m]) for m in modes]
        # Floor the shared y-axis below the worst bar, else a sub-0.4 result (GBM
        # under SMOTETOMEK collapses below chance) renders as an invisible bar.
        worst = min(r['roc_auc_mean'] - r['roc_auc_std']
                    for _, block in arms for r in block.values())
        y_floor = min(0.4, np.floor(worst * 10) / 10)
        fig, axes = plt.subplots(1, len(arms), figsize=(4.2 * len(arms), 4.2),
                                 squeeze=False)
        for ax, (name, block) in zip(axes[0], arms):
            algos = ALGORITHMS
            means = [block[a]['roc_auc_mean'] for a in algos]
            errs  = [block[a]['roc_auc_std'] for a in algos]
            colors = ['#2a7' if a == 'rf' else '#59f' for a in algos]
            ax.bar(range(len(algos)), means, yerr=errs, capsize=4, color=colors)
            ax.axhline(0.5, ls='--', c='#999', lw=1)
            ax.set_xticks(range(len(algos)))
            ax.set_xticklabels([ALGO_LABEL[a].replace(' (current)', '\n(current)')
                                for a in algos], rotation=20, ha='right', fontsize=8)
            ax.set_ylim(y_floor, 1.0)
            ax.set_title(name, fontsize=10)
            ax.set_ylabel('SL ROC-AUC (mean +/- SD over seeds)', fontsize=8)
        fig.suptitle('P3 baseline comparison -- RF (green) vs alternatives', fontsize=11)
        plt.tight_layout()
        os.makedirs(REPORTS_DIR, exist_ok=True)
        png = os.path.join(REPORTS_DIR, 'baseline_comparison.png')
        plt.savefig(png, dpi=120)
        plt.close()
        print(f"\n  Plot saved -> {png}")

    # ── Persist ─────────────────────────────────────────────────────────────────
    os.makedirs(REPORTS_DIR, exist_ok=True)
    out = {
        'generated': str(date.today()),
        'question': 'P3 -- is Random Forest the right estimator, or was it just the '
                    'one chosen a priori?',
        'method': 'Same data, same seeds, same folds/splits; only the estimator '
                  'varies. GBM receives balanced sample_weight because it has no '
                  'class_weight parameter; LogReg is StandardScaler-wrapped.',
        'seeds': SEEDS,
        'n_estimators': N_ESTIMATORS,
        'validation': {'n': int(len(val)), 'positives': int(y_val.sum()),
                       'prevalence': round(float(y_val.mean()), 4)},
        'local_arm': local,
        'transfer_arms': transfer,
        'verdicts': verdicts,
    }
    out_path = os.path.join(REPORTS_DIR, 'baseline_comparison.json')
    with open(out_path, 'w') as f:
        json.dump(out, f, indent=2)
    print(f"  Report saved -> {out_path}")
    print("=" * 68)


if __name__ == '__main__':
    main()
