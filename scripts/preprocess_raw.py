"""
preprocess_raw.py

Converts the raw downloaded xlsx files to clean numeric CSVs that calibrate.py
and merge_and_clean_data.py can read directly.

Handles:
  - Saudi dataset: ordinal string categories → numeric midpoints / ordinal ints
  - Sri Lanka dataset: Likert item groups → composite scores, binary target

Run after download_datasets.py, before calibrate.py.

Usage:
  python scripts/preprocess_raw.py
"""

import os
import re
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings('ignore')

BASE_DIR = os.path.join(os.path.dirname(__file__), '..')
RAW_DIR  = os.path.join(BASE_DIR, 'data', 'raw')


# ── Saudi preprocessing ────────────────────────────────────────────────────────

def _clean_str(s) -> str:
    """Strip whitespace, BOM chars, and non-breaking spaces."""
    if not isinstance(s, str):
        return str(s)
    return s.replace('\xa0', '').replace('﻿', '').strip()


def _extract_range_midpoint(s, unit_pattern=None) -> float:
    """
    Extract the numeric midpoint from strings like "From 5 to 10 years",
    "Less than 5000 SAR", "31 to 40", etc.
    """
    s = _clean_str(s).lower()

    # "less than N" or "under N"
    m = re.search(r'less than\s+([\d,]+)', s)
    if m:
        return float(m.group(1).replace(',', '')) / 2

    # "N and more" or "N or more" or "N+"
    m = re.search(r'([\d,]+)\s*(?:and more|or more|\+)', s)
    if m:
        return float(m.group(1).replace(',', '')) * 1.2  # open-ended: add 20%

    # "from N to M" or "N to M" or "N - M"
    m = re.search(r'([\d,]+)\s*(?:to|-)\s*([\d,]+)', s)
    if m:
        lo = float(m.group(1).replace(',', ''))
        hi = float(m.group(2).replace(',', ''))
        return (lo + hi) / 2

    # Plain number
    m = re.search(r'([\d,]+)', s)
    if m:
        return float(m.group(1).replace(',', ''))

    return np.nan


SATISFACTION_3PT = {  # 3-level ordinal scales in Saudi data
    'not satisfied':    1,
    'satisfied':        2,
    'very satisfied':   3,
}

ENV_SATISFACTION = {
    'low':    1,
    'medium': 2,
    'high':   3,
}

WORK_LIFE_BALANCE = {
    'difficult': 1,
    'medium':    2,
    'easy':      3,
}

BINARY_YES_NO = {'yes': 1, 'no': 0}


def preprocess_saudi(path_in: str, path_out: str):
    df = pd.read_excel(path_in)

    # Strip all column names
    df.columns = [_clean_str(c) for c in df.columns]

    print(f"  Loaded {len(df)} rows, {len(df.columns)} columns")

    # --- Target ---
    df['Attrition_binary'] = (
        df['Attrition'].apply(_clean_str).str.lower()
        .map({'yes': 1, 'no': 0})
    )

    # --- Age → numeric midpoint ---
    df['Age_numeric'] = df['Age'].apply(_extract_range_midpoint)

    # --- Tenure → years (midpoint) ---
    df['TenureYears'] = df['Years_Experience'].apply(_extract_range_midpoint)

    # --- Salary → numeric midpoint (SAR) ---
    df['MonthlyIncome'] = df['MonthlySalary'].apply(_extract_range_midpoint)

    # --- Satisfaction scales → ordinal int ---
    df['JobSatisfaction_num'] = (
        df['Job_Satisfaction'].apply(_clean_str).str.lower()
        .map(SATISFACTION_3PT)
    )
    df['EnvironmentSatisfaction_num'] = (
        df['Environment_Satisfaction'].apply(_clean_str).str.lower()
        .map(ENV_SATISFACTION)
    )
    df['WorkLifeBalance_num'] = (
        df['Work_Live_Balance'].apply(_clean_str).str.lower()
        .map(WORK_LIFE_BALANCE)
    )

    # --- Gender (keep as string for merge, useful for analysis) ---
    df['Gender'] = df['Gender'].apply(_clean_str)

    # --- Select output columns ---
    out = df[[
        'Age_numeric', 'Gender', 'TenureYears', 'MonthlyIncome',
        'JobSatisfaction_num', 'EnvironmentSatisfaction_num', 'WorkLifeBalance_num',
        'Attrition', 'Attrition_binary',
    ]].rename(columns={
        'Age_numeric':               'Age',
        'JobSatisfaction_num':       'JobSatisfaction',
        'EnvironmentSatisfaction_num': 'EnvironmentSatisfaction',
        'WorkLifeBalance_num':       'WorkLifeBalance',
    })

    out = out.dropna(subset=['Attrition_binary'])
    out.to_csv(path_out, index=False)

    n_attr = int(out['Attrition_binary'].sum())
    print(f"  Saved {len(out)} clean records to {path_out}")
    print(f"  Attrition: Yes={n_attr} ({n_attr/len(out):.1%}), "
          f"No={len(out)-n_attr} ({1 - n_attr/len(out):.1%})")
    print(f"  Numeric columns OK: Age={out['Age'].notna().sum()}, "
          f"Tenure={out['TenureYears'].notna().sum()}, "
          f"Income={out['MonthlyIncome'].notna().sum()}, "
          f"JobSatisfaction={out['JobSatisfaction'].notna().sum()}")


# ── Sri Lanka preprocessing ────────────────────────────────────────────────────

# Likert item groups from the PLoS ONE paper
ITEM_GROUPS = {
    'JS':  [f'JS-{i}'  for i in range(1, 10)],   # Job Satisfaction (9 items)
    'WLB': [f'WLB-{i}' for f in ['WLB'] for i in range(1, 6)],  # Work-life Balance (5)
    'H':   [f'H-{i}'   for i in range(1, 6)],    # Happiness (5)
    'MS':  [f'MS-{i}'  for i in range(1, 6)],    # Management Support (5)
    'CM':  [f'CM-{i}'  for i in range(1, 5)],    # Career Management (4)
    'IWB': [f'IWB-{i}' for i in range(1, 5)],   # Innovative Work Behaviour (4)
    'LMX': [f'LMX-{i}' for i in range(1, 5)],   # Leader-Member Exchange (4)
    'CWS': [f'CWS-{i}' for i in range(1, 5)],   # Co-Worker Support (4)
    'ET':  [f'ET-{i}'  for i in range(1, 5)],    # Employee Turnover intention (4)
}

AGE_GROUP_MAP = {
    '20 - 30': 25, '20-30': 25, '20 to 30': 25,
    '31 - 40': 35, '31-40': 35, '31 to 40': 35,
    '41 - 50': 45, '41-50': 45, '41 to 50': 45,
    '51 - 60': 55, '51-60': 55, 'above 50': 52, 'above 51': 55,
}


def preprocess_srilanka(path_in: str, path_out: str):
    df = pd.read_excel(path_in)

    # Strip column names
    df.columns = [_clean_str(c) for c in df.columns]

    print(f"  Loaded {len(df)} rows, {len(df.columns)} columns")

    # Compute composite scores (mean of items in each group)
    for group, items in ITEM_GROUPS.items():
        present = [c for c in items if c in df.columns]
        if present:
            df[f'{group}_composite'] = df[present].apply(
                pd.to_numeric, errors='coerce'
            ).mean(axis=1)

    # Binary target: ET composite >= 3.5 → high flight risk
    if 'ET_composite' in df.columns:
        df['Attrition_binary'] = (df['ET_composite'] >= 3.5).astype(float)
    else:
        print("  [WARN] ET items not found — target cannot be computed.")
        return

    # Age group → numeric midpoint
    age_col = next((c for c in df.columns
                    if 'age' in c.lower()), None)
    if age_col:
        df['Age'] = (
            df[age_col].apply(_clean_str).str.strip()
            .map(AGE_GROUP_MAP)
        )

    # Gender
    gender_col = next((c for c in df.columns
                       if 'gender' in c.lower()), None)
    if gender_col:
        df['Gender'] = df[gender_col].apply(_clean_str)

    out_cols = ['Age', 'Gender',
                'JS_composite', 'WLB_composite', 'H_composite',
                'MS_composite', 'CM_composite',
                'ET_composite', 'Attrition_binary']
    out = df[[c for c in out_cols if c in df.columns]].copy()

    # Rename composites to standard names
    out = out.rename(columns={
        'JS_composite':  'JobSatisfaction',
        'WLB_composite': 'WorkLifeBalance',
        'MS_composite':  'ManagementSupport',
        'CM_composite':  'CareerManagement',
    })

    out.to_csv(path_out, index=False)

    n_attr = int(out['Attrition_binary'].sum())
    print(f"  Saved {len(out)} clean records to {path_out}")
    print(f"  High flight risk (ET >= 3.5): {n_attr} ({n_attr/len(out):.1%}), "
          f"Low: {len(out)-n_attr} ({1 - n_attr/len(out):.1%})")
    if 'JobSatisfaction' in out.columns:
        print(f"  Mean JobSatisfaction: {out['JobSatisfaction'].mean():.2f} / 5.0")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Preprocessing raw datasets -> clean numeric CSVs")
    print("=" * 60)

    saudi_xlsx = os.path.join(RAW_DIR, 'saudi_attrition.xlsx')
    saudi_csv  = os.path.join(RAW_DIR, 'saudi_attrition.csv')
    if os.path.exists(saudi_xlsx):
        print(f"\nSaudi dataset ({saudi_xlsx}):")
        preprocess_saudi(saudi_xlsx, saudi_csv)
    else:
        print("\n[--] Saudi xlsx not found — skipping.")

    sl_xlsx = os.path.join(RAW_DIR, 'srilanka_turnover_intent.xlsx')
    sl_csv  = os.path.join(RAW_DIR, 'srilanka_turnover_intent.csv')
    if os.path.exists(sl_xlsx):
        print(f"\nSri Lanka dataset ({sl_xlsx}):")
        preprocess_srilanka(sl_xlsx, sl_csv)
    else:
        print("\n[--] Sri Lanka xlsx not found — skipping.")

    print("\nNext step:  python scripts/calibrate.py")
    print("=" * 60)


if __name__ == '__main__':
    main()
