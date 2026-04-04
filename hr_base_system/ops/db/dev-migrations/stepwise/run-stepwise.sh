#!/bin/sh
set -e
cd /workspace/migrations
for f in *.sql; do
  echo "---- APPLYING $f ----"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
  echo "---- SUCCEEDED $f ----"
done
echo "ALL DONE"
