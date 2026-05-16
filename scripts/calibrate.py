"""
calibrate.py

Fits a logistic regression on available real-world datasets to extract
attrition-related coefficients. Saves results to data/calibration_params.json.

These coefficients are then used by generate_synthetic_data.py instead of
hand-coded rules, making the synthetic generation grounded in real evidence.

Run after download_datasets.py, before generate_synthetic_data.py.

Usage:
  python scripts/calibrate.py

If no real datasets are found, writes research-literature defaults and exits
gracefully — synthetic generation will still work, just without calibration.
"""

import os
import json
import warnings
from datetime import date

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

warnings.filterwarnings('ignore')

BASE_DIR = os.path.join(os.path.dirname(__file__), '..')
RAW_DIR = os.path.join(BASE_DIR, 'data', 'raw')
OUT_PATH = os.path.join(BASE_DIR, 'data', 'calibration_params.json')

# ── Literature defaults ────────────────────────────────────────────────────────
# From meta-analyses: Griffeth et al. (2000), Mitchell et al. (2001),
# Sarker (2021). Used when a real dataset cannot provide a coefficient.
LITERATURE_DEFAULTS = {
    'intercept': -2.2,           # baseline ~10% attrition before any risk factors
    'age_norm': -0.08,           # older → slightly less likely to leave
    'tenure_years_norm': -0.42,  # longer tenure → meaningfully less likely
    'salary_ratio_norm': -0.31,  # below-market salary → more attrition
    'career_stagnation': 0.48,   # long tenure in junior role → more attrition
    'late_count_norm': 0.18,     # attendance problems → more attrition
    'absent_count_norm': 0.22,   # absenteeism → more attrition
    'satisfaction_norm': -0.55,  # lower satisfaction → much more attrition
}

# ── Column name aliases per dataset ───────────────────────────────────────────
# Each entry lists candidate column names (case-insensitive). First match wins.
COLUMN_ALIASES = {
    'saudi': {
        'target':       ['attrition', 'left', 'turnover', 'quit'],
        'age':          ['age'],
        'tenure_years': ['tenureyears', 'tenure_years', 'yearsexperience',
                         'experience', 'years_experience', 'totalworkingyears',
                         'yearsatcompany', 'tenure'],
        'income':       ['monthlysalary', 'salary', 'monthlyincome', 'income',
                         'monthly_salary'],
        'satisfaction': ['jobsatisfaction', 'job_satisfaction', 'satisfaction',
                         'worksatisfaction'],
    },
    'russian': {
        'target':       ['event', 'left', 'attrition', 'turnover', 'quit'],
        'age':          ['age'],
        'tenure_years': ['tenureyears', 'tenure_years', 'stag', 'tenure',
                         'yearsatcompany', 'total_working_years', 'experience'],
        'income':       ['salary', 'monthlyincome', 'income', 'monthlysalary'],
        'satisfaction': ['jobsatisfaction', 'satisfaction'],
    },
    'srilanka': {
        # PLoS ONE dataset: preprocess_raw.py already produces Attrition_binary
        'target':       ['attritionbinary', 'attrition_binary', 'attrition',
                         'turnoverintention', 'turnover_intention', 'intention', 'ti'],
        'age':          ['age'],
        'tenure_years': ['tenureyears', 'tenure_years', 'tenure',
                         'yearsatcompany', 'experience', 'workingyears'],
        'income':       ['salary', 'income', 'monthlyincome'],
        'satisfaction': ['jobsatisfaction', 'satisfaction', 'jobsat',
                         'employeehappiness', 'happiness'],
    },
}


def find_column(df: pd.DataFrame, aliases: list) -> str | None:
    """Return the first column in df whose lowercased name (stripped) matches an alias."""
    normalised = {c.lower().replace(' ', '').replace('_', ''): c for c in df.columns}
    for alias in aliases:
        key = alias.lower().replace(' ', '').replace('_', '')
        if key in normalised:
            return normalised[key]
    return None


def load_and_map(path: str, source_key: str) -> pd.DataFrame | None:
    """Load a real dataset and extract the common feature columns we can calibrate on."""
    if not os.path.exists(path):
        return None

    df = None
    for enc in ('utf-8-sig', 'utf-8', 'cp1251', 'latin-1'):
        try:
            df = pd.read_csv(path, encoding=enc, low_memory=False)
            break
        except UnicodeDecodeError:
            continue
        except Exception as e:
            print(f"  [WARN] Could not read {path}: {e}")
            return None
    if df is None:
        print(f"  [WARN] Could not decode {path} with any known encoding — skipping.")
        return None

    aliases = COLUMN_ALIASES[source_key]
    mapped = {}

    # Target variable
    target_col = find_column(df, aliases['target'])
    if target_col is None:
        print(f"  [WARN] {source_key}: cannot find target column — skipping.")
        return None

    raw_target = df[target_col]

    if source_key == 'srilanka':
        vals = pd.to_numeric(raw_target, errors='coerce')
        if 'binary' in target_col.lower() or vals.dropna().max() <= 1:
            # preprocess_raw.py already produced a 0/1 column — use as-is
            mapped['attrition'] = vals
        else:
            # Raw ordinal intention scale (1–5): threshold >= 4 as high flight risk
            mapped['attrition'] = (vals >= 4).astype(float)
    elif raw_target.dtype == object:
        # String labels: 'Yes'/'No', 'True'/'False', '1'/'0'
        mapped['attrition'] = raw_target.str.strip().str.lower().map(
            {'yes': 1, 'no': 0, 'true': 1, 'false': 0, '1': 1, '0': 0}
        )
    else:
        mapped['attrition'] = pd.to_numeric(raw_target, errors='coerce')

    # Age
    age_col = find_column(df, aliases['age'])
    if age_col:
        mapped['age'] = pd.to_numeric(df[age_col], errors='coerce')

    # Tenure
    tenure_col = find_column(df, aliases['tenure_years'])
    if tenure_col:
        raw = pd.to_numeric(df[tenure_col], errors='coerce')
        # If tenure looks like months (median > 20), convert to years
        if raw.median() > 20:
            raw = raw / 12.0
        mapped['tenure_years'] = raw

    # Income
    income_col = find_column(df, aliases['income'])
    if income_col:
        mapped['income'] = pd.to_numeric(df[income_col], errors='coerce')

    # Satisfaction
    sat_col = find_column(df, aliases['satisfaction'])
    if sat_col:
        mapped['satisfaction'] = pd.to_numeric(df[sat_col], errors='coerce')

    result = pd.DataFrame(mapped)
    result = result.dropna(subset=['attrition'])
    result['source'] = source_key

    n_attrition = result['attrition'].sum()
    n_total = len(result)
    print(f"  [OK] {source_key}: {n_total} records, "
          f"{n_attrition} attrition events ({100*n_attrition/n_total:.1f}%)")

    return result


def compute_salary_ratio(df: pd.DataFrame) -> pd.DataFrame:
    """Add salary_ratio: income relative to the within-source mean (z-score)."""
    if 'income' not in df.columns:
        return df
    df = df.copy()
    for source in df['source'].unique():
        mask = df['source'] == source
        vals = df.loc[mask, 'income']
        mu, sigma = vals.mean(), vals.std()
        if sigma > 0:
            df.loc[mask, 'salary_ratio'] = (vals - mu) / sigma
    return df


def fit_logistic(df: pd.DataFrame) -> dict:
    """
    Fit logistic regression on available common features.
    Returns a dict of standardised feature coefficients and intercept.
    """
    feature_cols = [c for c in ['age', 'tenure_years', 'salary_ratio', 'satisfaction']
                    if c in df.columns]

    if not feature_cols:
        print("  No numeric features available for regression — using literature defaults.")
        return {}

    subset = df[feature_cols + ['attrition']].dropna()
    if len(subset) < 50 or subset['attrition'].nunique() < 2:
        print("  Insufficient data for regression — using literature defaults.")
        return {}

    X = subset[feature_cols].values
    y = subset['attrition'].values

    clf = Pipeline([
        ('scaler', StandardScaler()),
        ('lr', LogisticRegression(max_iter=1000, class_weight='balanced', C=1.0))
    ])
    clf.fit(X, y)

    scaler: StandardScaler = clf.named_steps['scaler']
    lr: LogisticRegression = clf.named_steps['lr']

    coefs = {}
    for name, coef in zip(feature_cols, lr.coef_[0]):
        # Map back to our internal naming convention
        key_map = {
            'age':          'age_norm',
            'tenure_years': 'tenure_years_norm',
            'salary_ratio': 'salary_ratio_norm',
            'satisfaction': 'satisfaction_norm',
        }
        coefs[key_map.get(name, name)] = round(float(coef), 4)

    coefs['intercept'] = round(float(lr.intercept_[0]), 4)

    return coefs


def build_params(fitted_coefs: dict, sources_used: list, n_records: int,
                 baseline_rate: float) -> dict:
    """Merge fitted coefficients with literature defaults for missing features."""
    params = dict(LITERATURE_DEFAULTS)

    # Overwrite with real-data coefficients where we have them
    params.update(fitted_coefs)

    params['baseline_attrition_rate'] = round(baseline_rate, 4)
    params['data_sources_used'] = sources_used
    params['n_records_calibrated'] = n_records
    params['calibration_date'] = str(date.today())

    # Record which coefficients came from real data vs. literature
    params['coefficient_sources'] = {
        k: ('calibrated' if k in fitted_coefs else 'literature_default')
        for k in [c for c in params if c not in
                  ('baseline_attrition_rate', 'data_sources_used',
                   'n_records_calibrated', 'calibration_date', 'coefficient_sources')]
    }

    return params


def main():
    print("=" * 60)
    print("Calibrating synthetic data generator from real datasets")
    print("=" * 60)

    dataset_paths = {
        'saudi':    os.path.join(RAW_DIR, 'saudi_attrition.csv'),
        'russian':  os.path.join(RAW_DIR, 'russian_turnover.csv'),
        'srilanka': os.path.join(RAW_DIR, 'srilanka_turnover_intent.csv'),
    }

    frames = []
    sources_used = []

    for key, path in dataset_paths.items():
        if not os.path.exists(path):
            print(f"  [--] {key}: not found at {path} — skipping.")
            continue
        df = load_and_map(path, key)
        if df is not None and len(df) > 0:
            frames.append(df)
            sources_used.append(key)

    if not frames:
        print("\nNo real datasets found. Writing literature defaults.")
        params = build_params({}, [], 0, 0.16)
    else:
        combined = pd.concat(frames, ignore_index=True)
        combined = compute_salary_ratio(combined)

        baseline_rate = float(combined['attrition'].mean())
        n_records = len(combined)

        print(f"\nCombined: {n_records} records from {sources_used}")
        print(f"Overall attrition rate: {baseline_rate:.1%}")
        print("\nFitting logistic regression on common features...")

        fitted = fit_logistic(combined)

        if fitted:
            print(f"  Fitted coefficients: {fitted}")
        else:
            print("  Falling back to literature defaults for all coefficients.")

        params = build_params(fitted, sources_used, n_records, baseline_rate)

    # Save
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w') as f:
        json.dump(params, f, indent=2)

    print(f"\nCalibration params saved to: {OUT_PATH}")
    print("\nCoefficient summary:")
    for k, v in params.items():
        if k not in ('data_sources_used', 'coefficient_sources', 'calibration_date'):
            source_tag = params.get('coefficient_sources', {}).get(k, '')
            tag = f" ({source_tag})" if source_tag else ''
            print(f"  {k:28s}: {v}{tag}")

    print("\nNext step:  python scripts/generate_synthetic_data.py")
    print("=" * 60)


if __name__ == '__main__':
    main()
