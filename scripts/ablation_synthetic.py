"""
ablation_synthetic.py  --  P2: RQ3 synthetic-data ablation (transfer model).

Answers the previously-unanswered research question: does augmenting the real
international training data with 500 calibrated *synthetic* Sri-Lankan-SME rows
actually help the cross-domain TRANSFER model predict Sri Lankan turnover
intention -- and are the ad-hoc 2.0 (real) / 0.5 (synthetic) sample weights
justified over the obvious alternatives (equal weights, real-only)?

WHY THE TRANSFER MODEL (not the 0.94 local model):
  The synthetic rows live ONLY in nexus_hr_master_dataset.csv, which trains the
  4-feature transfer model. The strong local model (~0.94) trains entirely within
  the real Sri Lankan survey and never sees a synthetic row, so it is untouched by
  this question. This ablation is therefore scoped to the transfer model, whose SL
  ROC-AUC (~0.64 headline) is the number the synthetic-augmentation strategy is
  supposed to move.

TWO RESAMPLING MODES ARE TESTED, because they treat the weights differently:
  * class_weight mode (train_model.py --no-resample): sample_weight is ACTIVE, so
    the 2.0/0.5 weights actually bite. This is where "weight sensitivity" is real.
  * SMOTETOMEK mode (train_model.py default / the headline recipe): resampling
    rebalances the classes and DROPS sample_weight entirely, so only the
    in/out-of-synthetic question is meaningful there. We run it so the finding is
    shown to hold under the actual headline path, not just a side path.

Preprocessing mirrors train_model.py exactly (encode_gender, per-dataset min-max
rescale of the ordinal satisfaction features, median imputation fit on the train
split). Each condition is repeated over 5 seeds (varying both the 80/20 split and
the RF) and reported as mean +/- range on the FIXED 230-row SL validation set, so
a claimed delta can be judged against seed noise rather than a single lucky draw.

Outputs (gitignored, reproducible):
  reports/ablation_synthetic.json    -- full metrics per condition + verdict
  reports/ablation_synthetic.png     -- SL ROC-AUC per condition (mean, seed range)

Run:  python scripts/ablation_synthetic.py
"""

import os
import json
from datetime import date

import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer
from sklearn.metrics import roc_auc_score, average_precision_score

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
N_ESTIMATORS = 400
SEEDS = [42, 1, 7, 13, 99]
SYNTH_SOURCE = 'Local_Synthetic'


# ── Preprocessing (copied from train_model.py for train/serve parity) ──────────
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


# ── One train+evaluate pass for a single (condition, seed) ─────────────────────
def train_eval_once(master_sub: pd.DataFrame, val: pd.DataFrame,
                    seed: int, mode: str, weight_scheme: str,
                    feats=PRIMARY_FEATURES):
    """
    mode: 'cw'    -> class_weight='balanced' + sample_weight active
          'smote' -> SMOTETOMEK resample, no sample_weight (headline recipe)
    weight_scheme (only used in 'cw' mode):
          'asis'  -> master SampleWeight column (real 2.0 / synth 0.5)
          'equal' -> all rows weight 1.0
    feats: feature subset (used by the transfer-signal decomposition).
    Returns (sl_roc_auc, sl_pr_auc).
    """
    X_all = prepare_features(master_sub, feats)
    y_all = master_sub[TARGET].astype(int).values
    if weight_scheme == 'asis':
        w_all = master_sub['SampleWeight'].astype(float).values
    else:
        w_all = np.ones(len(master_sub), dtype=float)

    X_tr, _X_te, y_tr, _y_te, w_tr, _w_te = train_test_split(
        X_all, y_all, w_all, test_size=0.20, stratify=y_all, random_state=seed)

    imp = SimpleImputer(strategy='median')
    X_tr_i = imp.fit_transform(X_tr)

    if mode == 'smote':
        smt = SMOTETomek(random_state=seed)
        X_fit, y_fit = smt.fit_resample(X_tr_i, y_tr)
        sample_weight, class_weight = None, None
    else:
        X_fit, y_fit = X_tr_i, y_tr
        sample_weight, class_weight = w_tr, 'balanced'

    clf = RandomForestClassifier(n_estimators=N_ESTIMATORS, class_weight=class_weight,
                                 random_state=seed, n_jobs=-1)
    clf.fit(X_fit, y_fit, sample_weight=sample_weight)

    Xv = imp.transform(prepare_features(val, feats))
    yv = val[TARGET].astype(int).values
    pv = clf.predict_proba(Xv)[:, 1]
    return float(roc_auc_score(yv, pv)), float(average_precision_score(yv, pv))


# ── Transfer-signal decomposition: where does the "transfer" AUC come from? ─────
def decompose_transfer_signal(master, val):
    """
    The 4-feature transfer model shares Age+Gender (genuinely cross-country) and
    JobSatisfaction+WorkLifeBalance (which on the SL side are the same survey
    constructs the LOCAL model uses, CMV-correlated with the intention target per
    P1). This isolates each group to show the "transfer" AUC is really the SL-side
    satisfaction signal, not cross-cultural demographic transfer. class_weight
    mode, all rows, 5 seeds.
    """
    subsets = {
        'demographics_only (Age,Gender)':      ['Age', 'Gender'],
        'satisfaction_only (JobSat,WLB)':      ['JobSatisfaction', 'WorkLifeBalance'],
        'all_four':                            PRIMARY_FEATURES,
    }
    out = {}
    for name, feats in subsets.items():
        rocs = [train_eval_once(master, val, s, 'cw', 'equal', feats)[0] for s in SEEDS]
        rocs = np.array(rocs)
        out[name] = {'features': feats,
                     'roc_auc_mean': round(float(rocs.mean()), 4),
                     'roc_auc_std':  round(float(rocs.std()), 4)}
    return out


def run_condition(cond, master, val):
    if cond['subset'] == 'all':
        sub = master
    elif cond['subset'] == 'real':
        sub = master[master['DataSource'] != SYNTH_SOURCE]
    else:  # 'synth'
        sub = master[master['DataSource'] == SYNTH_SOURCE]
    sub = sub.reset_index(drop=True)

    rocs, prs = [], []
    for seed in SEEDS:
        roc, pr = train_eval_once(sub, val, seed, cond['mode'], cond.get('wt', 'equal'))
        rocs.append(roc)
        prs.append(pr)
    rocs, prs = np.array(rocs), np.array(prs)
    return {
        'label': cond['label'],
        'mode': cond['mode'],
        'subset': cond['subset'],
        'weight_scheme': cond.get('wt', 'n/a (smote drops weights)'),
        'n_train_rows': int(len(sub)),
        'roc_auc_mean': round(float(rocs.mean()), 4),
        'roc_auc_std':  round(float(rocs.std()), 4),
        'roc_auc_min':  round(float(rocs.min()), 4),
        'roc_auc_max':  round(float(rocs.max()), 4),
        'roc_auc_by_seed': [round(float(r), 4) for r in rocs],
        'pr_auc_mean':  round(float(prs.mean()), 4),
    }


def main():
    print("=" * 68)
    print("P2 -- RQ3 synthetic-data ablation (transfer model, SL validation)")
    print("=" * 68)

    master = pd.read_csv(MASTER_PATH)
    val = pd.read_csv(VALIDATION_PATH)
    prevalence = float(val[TARGET].mean())
    print(f"  Master rows: {len(master)}  "
          f"(real={int((master['DataSource'] != SYNTH_SOURCE).sum())}, "
          f"synthetic={int((master['DataSource'] == SYNTH_SOURCE).sum())})")
    print(f"  SL validation: n={len(val)}  positives={int(val[TARGET].sum())}  "
          f"prevalence={prevalence:.4f}  (PR-AUC no-skill baseline)")
    print(f"  Seeds: {SEEDS}   RF n_estimators={N_ESTIMATORS}")
    if not HAVE_IMBLEARN:
        print("  [WARN] imbalanced-learn not installed -- SMOTETOMEK conditions skipped.")

    conditions = [
        {'key': 'cw_current',   'subset': 'all',   'mode': 'cw', 'wt': 'asis',
         'label': 'class_weight | real 2.0 + synth 0.5  (CURRENT recipe)'},
        {'key': 'cw_equal',     'subset': 'all',   'mode': 'cw', 'wt': 'equal',
         'label': 'class_weight | real 1.0 + synth 1.0  (equal weights)'},
        {'key': 'cw_real_only', 'subset': 'real',  'mode': 'cw', 'wt': 'equal',
         'label': 'class_weight | REAL ONLY (synthetic dropped)'},
        {'key': 'cw_synth_only','subset': 'synth', 'mode': 'cw', 'wt': 'equal',
         'label': 'class_weight | SYNTHETIC ONLY (diagnostic)'},
    ]
    if HAVE_IMBLEARN:
        conditions += [
            {'key': 'smote_with',    'subset': 'all',  'mode': 'smote',
             'label': 'SMOTETOMEK | with synthetic  (HEADLINE path)'},
            {'key': 'smote_without', 'subset': 'real', 'mode': 'smote',
             'label': 'SMOTETOMEK | real only'},
        ]

    results = {}
    print("\n  " + "-" * 64)
    for cond in conditions:
        r = run_condition(cond, master, val)
        results[cond['key']] = r
        print(f"  {r['label']}")
        print(f"      SL ROC-AUC {r['roc_auc_mean']:.3f} "
              f"(sd {r['roc_auc_std']:.3f}, range {r['roc_auc_min']:.3f}-{r['roc_auc_max']:.3f})"
              f"   PR-AUC {r['pr_auc_mean']:.3f}   [{r['n_train_rows']} rows]")

    # ── Verdicts: is a delta bigger than the pooled seed noise? ─────────────────
    def delta(a, b):
        ra, rb = results[a], results[b]
        d = ra['roc_auc_mean'] - rb['roc_auc_mean']
        pooled_sd = (ra['roc_auc_std'] + rb['roc_auc_std']) / 2 or 1e-9
        return round(d, 4), round(d / pooled_sd, 2)

    d_synth_cw, z_synth_cw = delta('cw_current', 'cw_real_only')
    d_synth_sm, z_synth_sm = delta('smote_with', 'smote_without') if HAVE_IMBLEARN else (None, None)
    d_weights,  z_weights  = delta('cw_current', 'cw_equal')

    def verdict(d, z):
        if d is None:
            return 'n/a'
        if abs(z) < 1.0:
            return f'negligible (delta {d:+.3f} ROC-AUC, within seed noise; |z|={abs(z):.2f})'
        direction = 'helps' if d > 0 else 'HURTS'
        return f'{direction} (delta {d:+.3f} ROC-AUC, |z|={abs(z):.2f} vs seed noise)'

    verdicts = {
        'synthetic_effect_class_weight': verdict(d_synth_cw, z_synth_cw),
        'synthetic_effect_smotetomek':   verdict(d_synth_sm, z_synth_sm),
        'weight_scheme_2.0_0.5_vs_1.0_1.0': verdict(d_weights, z_weights),
    }

    print("\n  " + "=" * 64)
    print("  VERDICTS")
    print("  " + "=" * 64)
    for k, v in verdicts.items():
        print(f"    {k:34s}: {v}")

    # ── Where does the transfer AUC actually come from? ─────────────────────────
    decomp = decompose_transfer_signal(master, val)
    print("\n  " + "-" * 64)
    print("  TRANSFER-SIGNAL DECOMPOSITION (class_weight, all rows)")
    print("  " + "-" * 64)
    for name, r in decomp.items():
        print(f"    {name:34s}: ROC-AUC {r['roc_auc_mean']:.3f} +/- {r['roc_auc_std']:.3f}")

    # ── Plot ────────────────────────────────────────────────────────────────────
    if HAVE_MPL:
        keys = list(results.keys())
        means = [results[k]['roc_auc_mean'] for k in keys]
        lows  = [results[k]['roc_auc_mean'] - results[k]['roc_auc_min'] for k in keys]
        highs = [results[k]['roc_auc_max'] - results[k]['roc_auc_mean'] for k in keys]
        labels = [results[k]['label'].split('|')[-1].strip() for k in keys]
        colors = ['#2a7' if 'HEADLINE' in results[k]['label'] or 'CURRENT' in results[k]['label']
                  else '#59f' for k in keys]
        fig, ax = plt.subplots(figsize=(9, 4.5))
        ax.bar(range(len(keys)), means, yerr=[lows, highs], capsize=4, color=colors)
        ax.axhline(0.5, ls='--', c='#999', lw=1, label='random (0.50)')
        ax.set_xticks(range(len(keys)))
        ax.set_xticklabels(labels, rotation=30, ha='right', fontsize=8)
        ax.set_ylabel('SL validation ROC-AUC')
        ax.set_ylim(0.4, max(0.75, max(means) + 0.05))
        ax.set_title('RQ3 synthetic-data ablation (transfer model, mean +/- seed range)')
        ax.legend(fontsize=8)
        plt.tight_layout()
        png = os.path.join(REPORTS_DIR, 'ablation_synthetic.png')
        os.makedirs(REPORTS_DIR, exist_ok=True)
        plt.savefig(png, dpi=120)
        plt.close()
        print(f"\n  Plot saved -> {png}")

    # ── Persist ─────────────────────────────────────────────────────────────────
    os.makedirs(REPORTS_DIR, exist_ok=True)
    out = {
        'generated': str(date.today()),
        'question': 'RQ3 -- does calibrated synthetic augmentation help the transfer model, '
                    'and are the 2.0/0.5 sample weights justified?',
        'scope': 'Transfer model only (4 shared features). The local 0.94 model uses no synthetic data.',
        'validation': {'n': int(len(val)), 'positives': int(val[TARGET].sum()),
                       'prevalence': round(prevalence, 4)},
        'seeds': SEEDS,
        'n_estimators': N_ESTIMATORS,
        'conditions': results,
        'transfer_signal_decomposition': decomp,
        'deltas': {
            'synthetic_vs_realonly_class_weight': {'roc_auc_delta': d_synth_cw, 'z_vs_seed_noise': z_synth_cw},
            'synthetic_vs_realonly_smotetomek':   {'roc_auc_delta': d_synth_sm, 'z_vs_seed_noise': z_synth_sm},
            'weights_2.0_0.5_vs_1.0_1.0':         {'roc_auc_delta': d_weights,  'z_vs_seed_noise': z_weights},
        },
        'verdicts': verdicts,
    }
    out_path = os.path.join(REPORTS_DIR, 'ablation_synthetic.json')
    with open(out_path, 'w') as f:
        json.dump(out, f, indent=2)
    print(f"  Report saved -> {out_path}")
    print("=" * 68)


if __name__ == '__main__':
    main()
