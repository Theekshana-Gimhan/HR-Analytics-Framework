#!/bin/sh
set -eu

echo "Starting DB backup job"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL not set. Make sure to pass it via Secret Manager." >&2
  exit 1
fi

if [ -z "${BUCKET_NAME:-}" ]; then
  echo "BUCKET_NAME not set. Pass bucket name via env var." >&2
  exit 1
fi

TS=$(date -u +"%Y%m%dT%H%M%SZ")
FNAME="simpala-db-dev-backup-${TS}.sql.gz"
OUTPATH="/workspace/${FNAME}"

echo "Dumping database to ${OUTPATH}"

# pg_dump reads DATABASE_URL if provided via --dbname
pg_dump --dbname="$DATABASE_URL" -F p | gzip > "$OUTPATH"

echo "Uploading ${OUTPATH} to gs://${BUCKET_NAME}/${FNAME}"
gsutil cp "$OUTPATH" "gs://${BUCKET_NAME}/${FNAME}"

echo "Backup complete: gs://${BUCKET_NAME}/${FNAME}"
