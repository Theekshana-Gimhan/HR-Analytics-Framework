#!/bin/sh
set -eu
echo "Starting prisma migrate resolve run"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set (passed as secret). Exiting." >&2
  exit 1
fi

PRISMA_DIR=/workspace/prisma
if [ ! -d "$PRISMA_DIR" ]; then
  echo "Prisma folder not found at $PRISMA_DIR" >&2
  exit 1
fi

echo "Using Prisma CLI to mark migrations applied from $PRISMA_DIR/migrations"

for m in "$PRISMA_DIR"/migrations/*; do
  if [ -d "$m" ]; then
    name=$(basename "$m")
    echo "Marking migration $name as applied"
    prisma migrate resolve --schema "$PRISMA_DIR/schema.prisma" --applied "$name"
  fi
done

echo "Completed prisma migrate resolve run"
