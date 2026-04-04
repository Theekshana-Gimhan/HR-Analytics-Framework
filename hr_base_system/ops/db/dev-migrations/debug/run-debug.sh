#!/bin/sh
set -e
echo "DEBUG START"
# print masked prefix of DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set"
else
  PREFIX=$(printf "%s" "$DATABASE_URL" | cut -c1-60)
  echo "DATABASE_URL prefix: ${PREFIX}..."
fi
# psql version
echo "psql version:"; psql --version || true
# try a connection and simple query
echo "running SELECT 1"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select version();" -c "select 1;"
echo "DEBUG END"