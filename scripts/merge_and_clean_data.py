"""
merge_and_clean_data.py

Combines all available HR datasets into a single master training file.

Design decisions:
  - MonthlyIncome is normalised WITHIN each data source before merging (z-score).
    Raw values are retained as MonthlyIncome_raw. This prevents the model from
    conflating LKR with IBM's fictional USD-like units.
  - Missing features are left as NaN, never imputed with 0.
    (0 is a valid value for attendance counts; NaN means "not collected".)
  - Every record carries DataSource and SampleWeight columns.
    Real local data (when available) gets weight 4.0; international real data
    gets 2.0; synthetic gets 0.5; IBM benchmark gets 1.0.
  - The Sri Lanka PLoS ONE survey data is split off as a held-out validation
    set — it is NOT added to the training master. It goes to data/validation_srilanka.csv.
  - IBM data is also split off as a benchmark-only file (data/benchmark_ibm.csv).
    It should not be in the main training set due to the income scale problem
    and its synthetic origin.

Output files:
  data/nexus_hr_master_dataset.csv      ← training data for the ML model
  data/validation_srilanka.csv          ← held-out local validation (PLoS ONE)
  data/benchmark_ibm.csv               ← IBM benchmark for published comparison

Usage:
  python scripts/merge_and_clean_data.py
"""

import os
import json
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings('ignore')

BASE_DIR   = os.path.join(os.path.dirname(__file__), '..')
DATA_DIR   = os.path.join(BASE_DIR, 'data')
RAW_DIR    = os.path.join(DATA_DIR, 'raw')

OUT_MASTER     = os.path.join(DATA_DIR, 'nexus_hr_master_dataset.csv')
OUT_VALIDATION = os.path.join(DATA_DIR, 'validation_srilanka.csv')
OUT_BENCHMARK  = os.path.join(DATA_DIR, 'benchmark_ibm.csv')

# ── Sample weights by data source ─────────────────────────────────────────────
# When real Sri Lankan company data is contributed later, add it here with 4.0.
SAMPLE_WEIGHTS = {
    'Local_Synthetic':    0.5,
    'Saudi_Real':         2.0,
    'Russian_Real':       2.0,
    'IBM_Benchmark':      1.0,   # processed separately; included here for completeness
    'SriLanka_Survey':    3.0,   # real Sri Lankan data, but intention not attrition
    'Local_Real':         4.0,   # future: real Sri Lankan company data
}

# ── Column aliases for each raw dataset ───────────────────────────────────────
def norm_col(name: str) -> str:
    """Normalise column name for fuzzy matching."""
    return name.lower().replace(' ', '').replace('_', '').replace('-', '')


def find_col(df: pd.DataFrame, aliases: list) -> str | None:
    index = {norm_col(c): c for c in df.columns}
    for alias in aliases:
        match = index.get(norm_col(alias))
        if match:
            return match
    return None


# ── Normalise income within a source ──────────────────────────────────────────
def normalise_income(df: pd.DataFrame, income_col: str = 'MonthlyIncome') -> pd.DataFrame:
    """
    Add MonthlyIncome_normalized (z-score within source) and keep raw as
    MonthlyIncome_raw. This is the critical fix that prevents cross-currency
    contamination when IBM fictional units mix with LKR values.
    """
    df = df.copy()
    if income_col not in df.columns:
        df['MonthlyIncome_raw']        = np.nan
        df['MonthlyIncome_normalized'] = np.nan
        return df

    vals = pd.to_numeric(df[income_col], errors='coerce')
    df['MonthlyIncome_raw'] = vals

    mu, sigma = vals.mean(), vals.std()
    if sigma and sigma > 0:
        df['MonthlyIncome_normalized'] = (vals - mu) / sigma
    else:
        df['MonthlyIncome_normalized'] = 0.0

    df = df.drop(columns=[income_col])
    return df


# ── Binary attrition helper ────────────────────────────────────────────────────
def to_binary_attrition(series: pd.Series, threshold: float = None) -> pd.Series:
    """Convert attrition column to integer 0/1. Handles string, int, and ordinal."""
    if threshold is not None:
        # Ordinal (e.g. PLoS ONE 1-5 turnover intention): threshold → binary
        return (pd.to_numeric(series, errors='coerce') >= threshold).astype(float)

    if series.dtype == object:
        return series.str.strip().str.lower().map(
            {'yes': 1, 'no': 0, 'true': 1, 'false': 0, '1': 1, '0': 0}
        ).astype(float)

    return pd.to_numeric(series, errors='coerce').astype(float)


# ── Loaders per dataset ────────────────────────────────────────────────────────

def load_synthetic() -> pd.DataFrame | None:
    path = os.path.join(DATA_DIR, 'synthetic_hr_data.csv')
    if not os.path.exists(path):
        print("  [--] Synthetic data not found. Run generate_synthetic_data.py first.")
        return None

    df = pd.read_csv(path)
    df['Attrition_binary'] = to_binary_attrition(df['Attrition'])

    # Ensure metadata columns exist (older generated files may not have them)
    if 'DataSource' not in df.columns:
        df['DataSource'] = 'Local_Synthetic'
    if 'SampleWeight' not in df.columns:
        df['SampleWeight'] = SAMPLE_WEIGHTS['Local_Synthetic']

    df = normalise_income(df, 'MonthlyIncome')

    print(f"  [OK] Synthetic:   {len(df):>5} records  "
          f"(attrition {df['Attrition_binary'].mean():.1%})")
    return df


def load_ibm() -> pd.DataFrame | None:
    path = os.path.join(DATA_DIR, 'ibm_hr_attrition.csv')
    if not os.path.exists(path):
        print("  [--] IBM dataset not found.")
        return None

    df = pd.read_csv(path)

    # Drop constant IBM columns
    drop_cols = ['EmployeeCount', 'Over18', 'StandardHours', 'EmployeeNumber']
    df = df.drop(columns=[c for c in drop_cols if c in df.columns])

    df['Attrition_binary'] = to_binary_attrition(df.get('Attrition', pd.Series(dtype=object)))
    df['DataSource']   = 'IBM_Benchmark'
    df['SampleWeight'] = SAMPLE_WEIGHTS['IBM_Benchmark']

    # Rename IBM tenure column to our standard
    if 'YearsAtCompany' in df.columns and 'TenureYears' not in df.columns:
        df = df.rename(columns={'YearsAtCompany': 'TenureYears'})

    df = normalise_income(df, 'MonthlyIncome')

    print(f"  [OK] IBM:         {len(df):>5} records  "
          f"(attrition {df['Attrition_binary'].mean():.1%})  [benchmark only]")
    return df


def load_saudi() -> pd.DataFrame | None:
    path = os.path.join(RAW_DIR, 'saudi_attrition.csv')
    if not os.path.exists(path):
        print("  [--] Saudi dataset not found (run download_datasets.py).")
        return None

    df = pd.read_csv(path, encoding='utf-8-sig')

    target_col = find_col(df, ['attrition', 'left', 'turnover', 'quit'])
    if not target_col:
        print("  [WARN] Saudi: cannot identify target column — skipping.")
        return None

    df['Attrition_binary'] = to_binary_attrition(df[target_col])

    # Standardise column names
    rename_map = {}
    for candidate, standard in [
        (['age'], 'Age'),
        (['gender', 'sex'], 'Gender'),
        (['yearsexperience', 'experience', 'years_experience', 'totalworkingyears'], 'TenureYears'),
        (['monthlysalary', 'salary', 'monthlyincome', 'income', 'monthly_salary'], 'MonthlyIncome'),
        (['department'], 'Department'),
        (['jobrole', 'jobtitle', 'job_role', 'job_title', 'position'], 'JobRole'),
        (['jobsatisfaction', 'job_satisfaction', 'satisfaction'], 'JobSatisfaction'),
        (['worklifebalance', 'work_life_balance'], 'WorkLifeBalance'),
        (['environmentsatisfaction', 'environment_satisfaction'], 'EnvironmentSatisfaction'),
    ]:
        col = find_col(df, candidate)
        if col and col not in rename_map.values():
            rename_map[col] = standard
    df = df.rename(columns=rename_map)

    # Convert tenure if in months (median > 20 → assume months)
    if 'TenureYears' in df.columns:
        tenure = pd.to_numeric(df['TenureYears'], errors='coerce')
        if tenure.median() > 20:
            df['TenureYears'] = tenure / 12.0

    df['DataSource']   = 'Saudi_Real'
    df['SampleWeight'] = SAMPLE_WEIGHTS['Saudi_Real']
    df = normalise_income(df, 'MonthlyIncome') if 'MonthlyIncome' in df.columns else df

    print(f"  [OK] Saudi:       {len(df):>5} records  "
          f"(attrition {df['Attrition_binary'].mean():.1%})")
    return df


def load_russian() -> pd.DataFrame | None:
    path = os.path.join(RAW_DIR, 'russian_turnover.csv')
    if not os.path.exists(path):
        print("  [--] Russian dataset not found (run download_datasets.py).")
        return None

    df = None
    for enc in ('utf-8-sig', 'utf-8', 'cp1251', 'latin-1'):
        try:
            df = pd.read_csv(path, encoding=enc)
            break
        except UnicodeDecodeError:
            continue
    if df is None:
        print("  [WARN] Russian: could not decode file — skipping.")
        return None

    target_col = find_col(df, ['event', 'left', 'attrition', 'turnover', 'quit'])
    if not target_col:
        print("  [WARN] Russian: cannot identify target column — skipping.")
        return None

    df['Attrition_binary'] = to_binary_attrition(df[target_col])

    rename_map = {}
    for candidate, standard in [
        (['age'], 'Age'),
        (['gender', 'sex', 'head_gender'], 'Gender'),
        (['stag', 'tenure', 'yearsatcompany', 'experience'], 'TenureYears'),
        (['salary', 'monthlyincome', 'income', 'monthlysalary'], 'MonthlyIncome'),
        (['industry', 'department', 'prof', 'profession'], 'Department'),
        (['jobrole', 'jobtitle', 'position'], 'JobRole'),
    ]:
        col = find_col(df, candidate)
        if col and col not in rename_map.values():
            rename_map[col] = standard
    df = df.rename(columns=rename_map)

    if 'TenureYears' in df.columns:
        tenure = pd.to_numeric(df['TenureYears'], errors='coerce')
        if tenure.median() > 20:
            df['TenureYears'] = tenure / 12.0

    df['DataSource']   = 'Russian_Real'
    df['SampleWeight'] = SAMPLE_WEIGHTS['Russian_Real']
    df = normalise_income(df, 'MonthlyIncome') if 'MonthlyIncome' in df.columns else df

    print(f"  [OK] Russian:     {len(df):>5} records  "
          f"(attrition {df['Attrition_binary'].mean():.1%})")
    return df


def load_srilanka() -> pd.DataFrame | None:
    """
    Sri Lanka PLoS ONE survey data. Returned separately as the held-out
    validation set — not included in the training master.
    """
    path = os.path.join(RAW_DIR, 'srilanka_turnover_intent.csv')
    if not os.path.exists(path):
        print("  [--] Sri Lanka survey not found (run download_datasets.py).")
        return None

    df = pd.read_csv(path, encoding='utf-8-sig')

    # Find the target column — preprocess_raw.py produces 'Attrition_binary';
    # raw xlsx may have ordinal ET items instead.
    target_col = find_col(df, [
        'attritionbinary', 'attrition_binary', 'attrition',
        'turnoverintention', 'turnover_intention', 'intention', 'ti',
        'turnover intent', 'intentiontoleave', 'intention_to_leave',
    ])
    if not target_col:
        print("  [WARN] Sri Lanka: cannot identify target column — skipping.")
        return None

    vals = pd.to_numeric(df[target_col], errors='coerce')
    if 'binary' in target_col.lower() or vals.dropna().max() <= 1:
        # Already preprocessed to binary
        df['Attrition_binary'] = vals
    else:
        # Raw ordinal scale: threshold >= 3.5 as high flight risk. This is the
        # canonical definition (matches preprocess_raw.py). The normal path above
        # passes through the precomputed binary; this fallback only fires if a raw
        # ET_composite is fed directly.
        df['Attrition_binary'] = (vals >= 3.5).astype(float)
    df['DataSource']   = 'SriLanka_Survey'
    df['SampleWeight'] = SAMPLE_WEIGHTS['SriLanka_Survey']

    # Most SL columns already carry standard names from preprocess_raw.py; the
    # aliases below keep this robust if a differently-named file is supplied.
    # The 8 psychometric constructs (incl. Happiness, InnovativeWorkBehavior,
    # LeaderMemberExchange, CoworkerSupport) pass through unchanged.
    rename_map = {}
    for candidate, standard in [
        (['age'], 'Age'),
        (['gender', 'sex'], 'Gender'),
        (['jobsatisfaction', 'job_satisfaction', 'satisfaction', 'jobsat'], 'JobSatisfaction'),
        (['worklifebalance', 'work_life_balance'], 'WorkLifeBalance'),
        (['happiness', 'h_composite'], 'Happiness'),
        (['managementsupport', 'management_support'], 'ManagementSupport'),
        (['careermanagement', 'career_management'], 'CareerManagement'),
        (['innovativeworkbehavior', 'iwb_composite', 'iwb'], 'InnovativeWorkBehavior'),
        (['leadermemberexchange', 'lmx_composite', 'lmx'], 'LeaderMemberExchange'),
        (['coworkersupport', 'cws_composite', 'cws'], 'CoworkerSupport'),
    ]:
        col = find_col(df, candidate)
        if col and col not in rename_map.values():
            rename_map[col] = standard
    df = df.rename(columns=rename_map)

    print(f"  [OK] Sri Lanka:   {len(df):>5} records  "
          f"(high flight risk {df['Attrition_binary'].mean():.1%})  [validation only]")
    return df


# ── Master schema ──────────────────────────────────────────────────────────────
# Defines the final column order and NaN fill strategy.
# Features not present in a given source are left as NaN (not filled with 0).
MASTER_COLUMNS = [
    # Identity / demographics
    'Age', 'Gender', 'Department', 'JobRole',
    # Employment
    'TenureYears',
    # Financials (normalised — safe to merge across sources)
    'MonthlyIncome_raw', 'MonthlyIncome_normalized', 'TotalAllowances',
    # Attendance (only in synthetic/future local data → NaN for IBM/Saudi/Russian)
    'Attendance_LateCount', 'Attendance_AbsentCount', 'Attendance_HalfDayCount',
    # Leave (only in synthetic/future local data)
    'Leave_TotalDaysApproved', 'Leave_RequestCount',
    # Satisfaction / engagement (IBM, Saudi, PLoS ONE)
    'JobSatisfaction', 'WorkLifeBalance', 'EnvironmentSatisfaction',
    'JobInvolvement', 'RelationshipSatisfaction',
    # IBM-specific career features
    'NumCompaniesWorked', 'YearsSinceLastPromotion', 'OverTime',
    # Saudi-specific
    'ManagementSupport', 'CareerManagement',
    # Target and metadata
    # NOTE: the raw per-source 'Attrition' label is deliberately NOT carried into
    # the output. It is inconsistent across sources (Saudi ' Yes'/' No' with
    # leading spaces, Russian has none — its label lives in 'event', synthetic is
    # clean 'Yes'/'No'). 'Attrition_binary' is the single canonical 0/1 target.
    'Attrition_binary', 'DataSource', 'SampleWeight',
]

# The one true target column. Everything downstream (train_model.py) must use this.
TARGET_COL = 'Attrition_binary'


def build_master(frames: list) -> pd.DataFrame:
    combined = pd.concat(frames, ignore_index=True, sort=False)

    # Raw per-source label columns must never become features — they are the
    # target in disguise. 'Attrition' is the Saudi/synthetic raw label; 'event'
    # is the Russian raw label (already encoded into Attrition_binary). Carrying
    # either as a feature would leak the target into the model.
    LEAK_COLS = {'Attrition', 'event', 'left', 'quit', 'turnover'}

    # Keep only columns that appear in the master schema
    keep = [c for c in MASTER_COLUMNS if c in combined.columns]
    # Also keep any extra columns from real datasets not in schema (minus leakage)
    extra = [c for c in combined.columns if c not in MASTER_COLUMNS
             and c not in LEAK_COLS]
    combined = combined[keep + extra]

    return combined


def assert_target_integrity(df: pd.DataFrame, name: str,
                            expected_sources: list | None = None) -> None:
    """
    Fail loudly if the canonical target is malformed. Catches the silent failure
    modes that would otherwise corrupt training: a source whose labels all went
    NaN (e.g. Russian if its 'event' column is ever missed), stray non-binary
    values, or an empty source. Better to crash here than to train on bad labels.
    """
    errors = []

    if TARGET_COL not in df.columns:
        raise AssertionError(f"[{name}] missing target column '{TARGET_COL}'")

    target = df[TARGET_COL]

    n_nan = int(target.isna().sum())
    if n_nan:
        bad = (df.loc[target.isna(), 'DataSource'].value_counts().to_dict()
               if 'DataSource' in df.columns else '?')
        errors.append(f"{n_nan} NaN target value(s); by source: {bad}")

    bad_vals = set(pd.unique(target.dropna())) - {0.0, 1.0}
    if bad_vals:
        errors.append(f"non-binary target values present: {sorted(bad_vals)}")

    if 'DataSource' in df.columns:
        per_source = df.groupby('DataSource')[TARGET_COL].count()
        empty = per_source[per_source == 0].index.tolist()
        if empty:
            errors.append(f"source(s) contributed 0 labelled rows: {empty}")
        if expected_sources:
            missing = [s for s in expected_sources if s not in per_source.index]
            if missing:
                errors.append(f"expected source(s) absent: {missing}")

    if errors:
        raise AssertionError(f"[{name}] target integrity check FAILED:\n    - "
                             + "\n    - ".join(errors))

    print(f"  [CHECK] {name}: target '{TARGET_COL}' OK "
          f"({len(df)} rows, {int(target.sum())} positive, 0 NaN)")


def print_summary(df: pd.DataFrame, title: str):
    print(f"\n{title}")
    print(f"  Total records:    {len(df):,}")
    print(f"  Columns:          {len(df.columns)}")
    print(f"  Attrition rate:   {df['Attrition_binary'].mean():.1%}")
    print(f"\n  By source:")
    for source, grp in df.groupby('DataSource'):
        weight = grp['SampleWeight'].iloc[0]
        rate = grp['Attrition_binary'].mean()
        print(f"    {source:22s}  {len(grp):>5} records  "
              f"attrition {rate:.1%}  weight {weight:.1f}")
    print(f"\n  Missing values (columns with >10% NaN):")
    missing = df.isnull().mean()
    high_missing = missing[missing > 0.10]
    if high_missing.empty:
        print("    None")
    else:
        for col, pct in high_missing.items():
            print(f"    {col:35s}  {pct:.0%} missing")


def main():
    print("=" * 60)
    print("Building NexusHR master dataset")
    print("=" * 60)
    print("\nLoading datasets...")

    # Load everything
    synthetic = load_synthetic()
    ibm       = load_ibm()
    saudi     = load_saudi()
    russian   = load_russian()
    srilanka  = load_srilanka()

    # ── Training master: synthetic + real international ────────────────────────
    training_frames = [f for f in [synthetic, saudi, russian] if f is not None]

    if not training_frames:
        print("\nERROR: No training data available. "
              "Run generate_synthetic_data.py at minimum.")
        return

    master = build_master(training_frames)
    expected = [f['DataSource'].iloc[0] for f in training_frames]
    print("\nValidating integrity before write...")
    assert_target_integrity(master, "master", expected_sources=expected)
    master.to_csv(OUT_MASTER, index=False)
    print_summary(master, "TRAINING MASTER DATASET")
    print(f"\n  Saved to: {OUT_MASTER}")

    # ── Held-out validation: Sri Lanka survey ─────────────────────────────────
    if srilanka is not None:
        assert_target_integrity(srilanka, "validation_srilanka")
        srilanka.to_csv(OUT_VALIDATION, index=False)
        print(f"\n  Validation set (Sri Lanka) saved to: {OUT_VALIDATION}")

    # ── Benchmark only: IBM ───────────────────────────────────────────────────
    if ibm is not None:
        assert_target_integrity(ibm, "benchmark_ibm")
        ibm.to_csv(OUT_BENCHMARK, index=False)
        print(f"  IBM benchmark saved to:             {OUT_BENCHMARK}")

    print(f"\n{'=' * 60}")
    print("Summary of intended model training strategy:")
    print(f"  Train on:    nexus_hr_master_dataset.csv")
    print(f"  Validate on: validation_srilanka.csv  (real Sri Lankan responses)")
    print(f"  Benchmark:   benchmark_ibm.csv         (compare against published results)")
    print(f"\nNext step:  python scripts/train_model.py  (Phase 3)")
    print("=" * 60)


if __name__ == '__main__':
    main()
