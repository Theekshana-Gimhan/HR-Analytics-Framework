"""
download_datasets.py

Downloads and validates the three real-world HR datasets used for calibration
and training. Run this once before calibrate.py and merge_and_clean_data.py.

Datasets:
  1. Saudi Employee Attrition (Mendeley, CC BY 4.0) — 1,191 real records
  2. Employee Turnover — Russian company (Kaggle) — ~1,129 real records
  3. Sri Lanka Startup Turnover Intent (PLoS ONE 2023) — 230 real records

Usage:
  python scripts/download_datasets.py

  For the Kaggle dataset, either:
    a) Install kaggle CLI and run `kaggle datasets download davinwijaya/employee-turnover`
    b) Download manually and place in data/raw/ (instructions printed below)
"""

import os
import sys
import urllib.request
import zipfile
import shutil

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
RAW_DIR = os.path.join(DATA_DIR, 'raw')

DATASETS = {
    'saudi': {
        'target_file': os.path.join(RAW_DIR, 'saudi_attrition.csv'),
        'description': 'Saudi Employee Attrition Dataset (Mendeley Data, CC BY 4.0)',
        'records': 1191,
        'mendeley_doi': '10.17632/6z2hty8php.1',
        'mendeley_url': 'https://data.mendeley.com/datasets/6z2hty8php/1',
        'manual_instructions': (
            "1. Go to: https://data.mendeley.com/datasets/6z2hty8php/1\n"
            "2. Click 'Download All' or download the CSV file directly.\n"
            "3. Rename the file to 'saudi_attrition.csv'.\n"
            "4. Place it in:  data/raw/saudi_attrition.csv"
        ),
    },
    'russian': {
        'target_file': os.path.join(RAW_DIR, 'russian_turnover.csv'),
        'description': 'Employee Turnover — Real Russian Company (Kaggle)',
        'records': 1129,
        'kaggle_dataset': 'davinwijaya/employee-turnover',
        'manual_instructions': (
            "Option A (Kaggle CLI):\n"
            "  pip install kaggle\n"
            "  kaggle datasets download davinwijaya/employee-turnover -p data/raw --unzip\n"
            "  Rename the downloaded CSV to 'russian_turnover.csv'\n\n"
            "Option B (Manual):\n"
            "  1. Go to: https://www.kaggle.com/datasets/davinwijaya/employee-turnover\n"
            "  2. Download the CSV file.\n"
            "  3. Rename to 'russian_turnover.csv'.\n"
            "  4. Place it in:  data/raw/russian_turnover.csv"
        ),
    },
    'srilanka': {
        'target_file': os.path.join(RAW_DIR, 'srilanka_turnover_intent.csv'),
        'description': 'Sri Lanka Startup Turnover Intention (PLoS ONE 2023)',
        'records': 230,
        'paper_doi': '10.1371/journal.pone.0281729',
        'manual_instructions': (
            "1. Go to: https://pmc.ncbi.nlm.nih.gov/articles/PMC9916568/\n"
            "2. Scroll to 'Supporting Information' and download S2 Appendix (the data file).\n"
            "   It may be an Excel (.xlsx) file — convert to CSV using Excel or pandas:\n"
            "     python -c \"import pandas as pd; pd.read_excel('S2_Appendix.xlsx').to_csv('data/raw/srilanka_turnover_intent.csv', index=False)\"\n"
            "3. Place it in:  data/raw/srilanka_turnover_intent.csv\n\n"
            "Note: This dataset measures turnover INTENTION (1-5 Likert scale), not actual\n"
            "attrition. It is used as the held-out validation set for local relevance, not\n"
            "as training data. We threshold intention >= 4 as 'high flight risk'."
        ),
    },
}


def ensure_dirs():
    os.makedirs(RAW_DIR, exist_ok=True)


def check_existing():
    print("=" * 60)
    print("Checking for existing datasets in data/raw/")
    print("=" * 60)
    found = []
    missing = []
    for key, info in DATASETS.items():
        if os.path.exists(info['target_file']):
            size_kb = os.path.getsize(info['target_file']) / 1024
            print(f"  [OK] {key:12s} — {info['target_file'].split(os.sep)[-1]} ({size_kb:.1f} KB)")
            found.append(key)
        else:
            print(f"  [--] {key:12s} — NOT FOUND")
            missing.append(key)
    print()
    return found, missing


def try_kaggle_download(info):
    try:
        import subprocess
        result = subprocess.run(
            ['kaggle', 'datasets', 'download', info['kaggle_dataset'],
             '-p', RAW_DIR, '--unzip'],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            # Find the downloaded file and rename it
            for fname in os.listdir(RAW_DIR):
                if fname.endswith('.csv') and 'turnover' in fname.lower():
                    src = os.path.join(RAW_DIR, fname)
                    dst = info['target_file']
                    if src != dst:
                        shutil.move(src, dst)
                    return True
        print(f"  Kaggle CLI failed: {result.stderr.strip()}")
    except FileNotFoundError:
        print("  Kaggle CLI not installed.")
    except Exception as e:
        print(f"  Kaggle download error: {e}")
    return False


def print_manual_instructions(missing):
    if not missing:
        return
    print("=" * 60)
    print("MANUAL DOWNLOAD REQUIRED")
    print("=" * 60)
    print("The following datasets must be downloaded manually:")
    print("(Academic/Kaggle datasets require login or terms acceptance)\n")
    for key in missing:
        info = DATASETS[key]
        print(f"--- {info['description']} ---")
        print(info['manual_instructions'])
        print()


def validate_files(found):
    if not found:
        return
    print("=" * 60)
    print("Validating downloaded files")
    print("=" * 60)
    import csv
    for key in found:
        info = DATASETS[key]
        path = info['target_file']
        try:
            with open(path, newline='', encoding='utf-8-sig') as f:
                reader = csv.reader(f)
                header = next(reader)
                row_count = sum(1 for _ in reader)
            print(f"  [OK] {key}: {row_count} records, {len(header)} columns")
            print(f"       Columns: {', '.join(header[:8])}{'...' if len(header) > 8 else ''}")
        except Exception as e:
            print(f"  [WARN] {key}: Could not parse — {e}")
    print()


def main():
    ensure_dirs()
    found, missing = check_existing()

    # Try automated Kaggle download for Russian dataset if missing
    if 'russian' in missing:
        print("Attempting automated Kaggle download for Russian dataset...")
        if try_kaggle_download(DATASETS['russian']):
            print("  [OK] Kaggle download succeeded.")
            missing.remove('russian')
            found.append('russian')
        else:
            print("  Automated download failed — manual steps printed below.")
        print()

    validate_files(found)
    print_manual_instructions(missing)

    if missing:
        print("=" * 60)
        print(f"ACTION NEEDED: {len(missing)} dataset(s) missing.")
        print("After downloading, re-run this script to validate.")
        print("Then run:  python scripts/calibrate.py")
        print("=" * 60)
        sys.exit(1)
    else:
        print("=" * 60)
        print("All datasets present. Next step:")
        print("  python scripts/calibrate.py")
        print("=" * 60)


if __name__ == '__main__':
    main()
