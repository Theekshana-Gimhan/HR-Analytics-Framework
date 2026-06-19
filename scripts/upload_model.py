"""
upload_model.py  --  push trained model bundles to the GCS model bucket.

Uploads the two servable joblib bundles written by train_model.py
(attrition_local.joblib, attrition_transfer.joblib) plus a manifest.json that
records which versions are current. The inference service (ml_service/) reads
these at startup.

Re-runnable: overwrites the objects in place, so the Cloud Run service picks up
the new model on its next cold start / restart.

Usage:
  python scripts/upload_model.py                         # defaults below
  python scripts/upload_model.py --bucket my-bucket
  MODEL_BUCKET=my-bucket python scripts/upload_model.py
"""

import os
import json
import argparse
from datetime import datetime, timezone

import joblib

try:
    from google.cloud import storage
    HAVE_GCS = True
except ImportError:
    HAVE_GCS = False

BASE_DIR   = os.path.join(os.path.dirname(__file__), '..')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

DEFAULT_BUCKET = os.environ.get('MODEL_BUCKET', 'kpi-uat-simpalahr-ml')
DEFAULT_PREFIX = os.environ.get('MODEL_PREFIX', 'models')

# Logical name -> local filename
BUNDLES = {
    'local':    'attrition_local.joblib',
    'transfer': 'attrition_transfer.joblib',
}


def bundle_metadata(path: str) -> dict:
    """Load a bundle and extract its JSON-safe metadata (not the model object)."""
    b = joblib.load(path)
    return {
        'model_type':   b.get('model_type'),
        'features':     b.get('features'),
        'threshold':    b.get('threshold'),
        'sl_roc_auc':   b.get('sl_roc_auc'),
        'version':      b.get('version'),
        'trained_date': b.get('trained_date'),
        'object':       None,  # filled in by caller with the GCS path
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--bucket', default=DEFAULT_BUCKET)
    ap.add_argument('--prefix', default=DEFAULT_PREFIX)
    ap.add_argument('--dry-run', action='store_true',
                    help='Build the manifest and print actions without uploading.')
    args = ap.parse_args()

    # Resolve which bundles exist locally.
    present = {}
    for name, fname in BUNDLES.items():
        path = os.path.join(MODELS_DIR, fname)
        if os.path.exists(path):
            present[name] = (fname, path)
        else:
            print(f"  [skip] {fname} not found in {MODELS_DIR} "
                  f"(run scripts/train_model.py first)")

    if not present:
        raise SystemExit("No model bundles found to upload.")

    # Build manifest from local bundle metadata.
    manifest = {'generated': datetime.now(timezone.utc).isoformat(),
                'bucket': args.bucket, 'prefix': args.prefix, 'models': {}}
    for name, (fname, path) in present.items():
        meta = bundle_metadata(path)
        meta['object'] = f"{args.prefix}/{fname}"
        manifest['models'][name] = meta

    manifest_path = os.path.join(MODELS_DIR, 'manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    print(f"  Manifest written -> {manifest_path}")
    print(json.dumps(manifest['models'], indent=2))

    if args.dry_run:
        print("\n  [dry-run] would upload:")
        for name, (fname, _) in present.items():
            print(f"    models/{fname} -> gs://{args.bucket}/{args.prefix}/{fname}")
        print(f"    manifest.json -> gs://{args.bucket}/{args.prefix}/manifest.json")
        return

    if not HAVE_GCS:
        raise SystemExit(
            "google-cloud-storage not installed. "
            "pip install google-cloud-storage  (or use --dry-run).")

    client = storage.Client()
    bucket = client.bucket(args.bucket)

    def upload(local_path, blob_name):
        blob = bucket.blob(blob_name)
        blob.upload_from_filename(local_path)
        print(f"  Uploaded -> gs://{args.bucket}/{blob_name}")

    for name, (fname, path) in present.items():
        upload(path, f"{args.prefix}/{fname}")
    upload(manifest_path, f"{args.prefix}/manifest.json")

    print("\n  Done. The inference service will load these on its next restart.")


if __name__ == '__main__':
    main()
