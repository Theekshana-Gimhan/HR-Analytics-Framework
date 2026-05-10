"""
generate_synthetic_data.py

Generates synthetic Sri Lankan SME HR records for model training augmentation.

Key differences from the original version:
  - Attrition probability uses a logistic function with coefficients loaded from
    data/calibration_params.json (produced by calibrate.py).
  - If no calibration file exists, falls back to literature-based defaults.
  - Salary is drawn from a log-normal distribution calibrated to Sri Lankan LKR ranges.
  - Attendance counts use Poisson distributions rather than uniform random integers.
  - Each record carries data_source='synthetic' and sample_weight=0.5 so the merge
    step can weight real records higher during model training.
  - No hard-coded if/else attrition rules — the logistic function encodes all risk.

Usage:
  python scripts/generate_synthetic_data.py [--records N]
"""

import argparse
import json
import os

import numpy as np
import pandas as pd
from scipy.special import expit  # numerically stable sigmoid: 1 / (1 + exp(-x))

BASE_DIR = os.path.join(os.path.dirname(__file__), '..')
CALIB_PATH = os.path.join(BASE_DIR, 'data', 'calibration_params.json')
OUT_PATH = os.path.join(BASE_DIR, 'data', 'synthetic_hr_data.csv')

RANDOM_SEED = 42

# Target attrition rate for synthetic Sri Lankan SME records.
# The calibrated intercept from Saudi data reflects Saudi labour market
# conditions (43% attrition). We keep the calibrated slopes — which tell us
# the direction and relative strength of each predictor — but recompute the
# intercept so that the synthetic population has a rate consistent with
# Sri Lankan SME context (~15%, per SLBFE 2023 and ILO LKA reports).
TARGET_ATTRITION_RATE = 0.15

# ── Domain constants (Sri Lankan SME context) ─────────────────────────────────

DEPARTMENTS = ['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Marketing']

JOB_TITLES = {
    'Engineering': ['Software Engineer', 'Senior Software Engineer',
                    'QA Engineer', 'DevOps Engineer'],
    'Sales':       ['Sales Executive', 'Account Manager', 'Senior Account Manager'],
    'HR':          ['HR Executive', 'HR Manager'],
    'Finance':     ['Accountant', 'Senior Accountant', 'Finance Controller'],
    'Operations':  ['Operations Executive', 'Project Manager', 'Senior Project Manager'],
    'Marketing':   ['Marketing Executive', 'Digital Marketer', 'Marketing Manager'],
}

SENIOR_KEYWORDS = {'Senior', 'Manager', 'Controller', 'Head', 'Lead'}

# Approximate median monthly salary (LKR) by broad seniority band.
# Source: Salary Explorer Sri Lanka 2023, ILO Sri Lanka labour reports.
SALARY_BANDS = {
    'senior': {'mu_log': np.log(280_000), 'sigma_log': 0.40},
    'mid':    {'mu_log': np.log(140_000), 'sigma_log': 0.35},
    'junior': {'mu_log': np.log(80_000),  'sigma_log': 0.30},
}

# Literature-default coefficients used when no calibration file is present.
LITERATURE_DEFAULTS = {
    'intercept':          -2.2,
    'age_norm':           -0.08,
    'tenure_years_norm':  -0.42,
    'salary_ratio_norm':  -0.31,
    'career_stagnation':   0.48,
    'late_count_norm':     0.18,
    'absent_count_norm':   0.22,
}


def load_calibration() -> dict:
    if os.path.exists(CALIB_PATH):
        with open(CALIB_PATH) as f:
            params = json.load(f)
        sources = params.get('data_sources_used', [])
        source_tag = f"real data ({', '.join(sources)})" if sources else "literature defaults"
        print(f"  Calibration params loaded — coefficients from {source_tag}.")
        return params
    print("  No calibration file found — using literature defaults.")
    return LITERATURE_DEFAULTS


def is_senior(title: str) -> bool:
    return any(kw in title for kw in SENIOR_KEYWORDS)


def salary_band(title: str) -> str:
    if is_senior(title):
        return 'senior'
    if 'Executive' in title or 'Accountant' in title:
        return 'mid'
    return 'junior'


def generate_records(n: int, rng: np.random.Generator, params: dict) -> pd.DataFrame:
    # ── Sample base features ──────────────────────────────────────────────────
    ages = rng.integers(22, 56, size=n)

    # Tenure: exponential distribution (most employees have short tenure in SMEs).
    # Mean ~3.5 years, capped at 15 years.
    tenure_years = np.clip(rng.exponential(scale=3.5, size=n), 0.08, 15.0)

    departments = rng.choice(DEPARTMENTS, size=n)
    titles = np.array([rng.choice(JOB_TITLES[d]) for d in departments])
    genders = rng.choice(['Male', 'Female'], size=n)

    # Salary: log-normal per seniority band
    incomes = np.array([
        rng.lognormal(
            mean=SALARY_BANDS[salary_band(t)]['mu_log'],
            sigma=SALARY_BANDS[salary_band(t)]['sigma_log']
        )
        for t in titles
    ])
    allowances = incomes * rng.uniform(0.05, 0.15, size=n)

    # Attendance: Poisson counts. ~15% of employees have elevated absence patterns.
    is_irregular = rng.random(size=n) < 0.15
    late_counts  = np.where(is_irregular,
                            rng.poisson(lam=5.0, size=n),
                            rng.poisson(lam=1.2, size=n))
    absent_counts = np.where(is_irregular,
                             rng.poisson(lam=2.5, size=n),
                             rng.poisson(lam=0.6, size=n))
    half_day_counts = rng.poisson(lam=0.8, size=n)

    # Leave
    leave_requests = rng.integers(1, 6, size=n)
    leave_days     = leave_requests * rng.uniform(1.0, 3.0, size=n)

    # ── Normalise features for logistic model ────────────────────────────────
    def znorm(arr):
        mu, sd = arr.mean(), arr.std()
        return (arr - mu) / sd if sd > 0 else np.zeros_like(arr)

    age_norm    = znorm(ages.astype(float))
    tenure_norm = znorm(tenure_years)
    salary_norm = znorm(incomes)          # relative purchasing power within cohort

    # Career stagnation: long tenure in a non-senior role
    career_stagnation = ((tenure_years > 5) & ~np.array([is_senior(t) for t in titles])).astype(float)

    late_norm   = znorm(late_counts.astype(float))
    absent_norm = znorm(absent_counts.astype(float))

    # ── Attrition probability via logistic function ───────────────────────────
    # Compute the linear predictor using calibrated slopes (no intercept yet).
    # Calibrated slopes come from real Saudi data and tell us the direction and
    # relative strength of each predictor. The intercept is then solved to
    # achieve TARGET_ATTRITION_RATE in this synthetic Sri Lankan population,
    # because the Saudi baseline rate (43%) does not apply here.
    z_no_intercept = (
          params.get('age_norm',         LITERATURE_DEFAULTS['age_norm'])         * age_norm
        + params.get('tenure_years_norm',LITERATURE_DEFAULTS['tenure_years_norm'])* tenure_norm
        + params.get('salary_ratio_norm',LITERATURE_DEFAULTS['salary_ratio_norm'])* salary_norm
        + params.get('career_stagnation',LITERATURE_DEFAULTS['career_stagnation'])* career_stagnation
        + params.get('late_count_norm',  LITERATURE_DEFAULTS['late_count_norm'])  * late_norm
        + params.get('absent_count_norm',LITERATURE_DEFAULTS['absent_count_norm'])* absent_norm
    )

    # Solve intercept: sigmoid(intercept + mean(z_no_intercept)) = TARGET_ATTRITION_RATE
    # => intercept = logit(TARGET_ATTRITION_RATE) - mean(z_no_intercept)
    target_rate = TARGET_ATTRITION_RATE
    logit_target = np.log(target_rate / (1 - target_rate))
    intercept = logit_target - z_no_intercept.mean()

    z = intercept + z_no_intercept

    attrition_prob = expit(z)                      # sigmoid: maps z → (0, 1)
    attrition_draw = rng.random(size=n)
    attrition      = np.where(attrition_draw < attrition_prob, 'Yes', 'No')

    # ── Assemble DataFrame ────────────────────────────────────────────────────
    df = pd.DataFrame({
        'Age':                      ages,
        'Gender':                   genders,
        'JobRole':                  titles,
        'Department':               departments,
        'MonthlyIncome':            np.round(incomes, 2),
        'TotalAllowances':          np.round(allowances, 2),
        'TenureYears':              np.round(tenure_years, 2),
        'Attendance_LateCount':     late_counts,
        'Attendance_AbsentCount':   absent_counts,
        'Attendance_HalfDayCount':  half_day_counts,
        'Leave_TotalDaysApproved':  np.round(leave_days, 1),
        'Leave_RequestCount':       leave_requests,
        'Attrition':                attrition,
        'DataSource':               'Local_Synthetic',
        'SampleWeight':             0.5,
    })

    return df


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--records', type=int, default=500,
                        help='Number of synthetic records to generate (default: 500)')
    args = parser.parse_args()

    rng = np.random.default_rng(RANDOM_SEED)

    print("=" * 60)
    print(f"Generating {args.records} synthetic Sri Lankan SME HR records")
    print("=" * 60)
    params = load_calibration()

    df = generate_records(args.records, rng, params)

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    df.to_csv(OUT_PATH, index=False)
    print(f"\nSaved {len(df)} records to {OUT_PATH}")

    attrition_rate = (df['Attrition'] == 'Yes').mean()
    print(f"\nAttrition distribution:")
    print(f"  Yes: {(df['Attrition'] == 'Yes').sum()} ({attrition_rate:.1%})")
    print(f"  No:  {(df['Attrition'] == 'No').sum()} ({1 - attrition_rate:.1%})")

    print(f"\nSample statistics:")
    print(df[['Age', 'TenureYears', 'MonthlyIncome',
              'Attendance_LateCount', 'Attendance_AbsentCount']].describe().round(1).to_string())

    print("\nNext step:  python scripts/merge_and_clean_data.py")
    print("=" * 60)


if __name__ == '__main__':
    main()
