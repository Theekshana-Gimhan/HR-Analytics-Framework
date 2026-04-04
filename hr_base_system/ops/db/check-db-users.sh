#!/usr/bin/env bash
set -e

echo "🔍 Checking for existing users in database..."
echo ""

# Query the database
QUERY="SELECT id, email, role FROM \"User\" ORDER BY id;"

# Use gcloud to execute query
gcloud sql execute-sql simpala-postgres \
  --project=long-operator-466309-g6 \
  --database=simpala_db \
  --query="$QUERY" \
  --format=table

echo ""
echo "✅ Query completed"
echo ""
echo "📝 If no users found, run the seed script to create initial admin users:"
echo "   Default credentials will be:"
echo "   - Email: owner@simpala.lk, Password: password123"
echo "   - Email: admin@simpala.lk, Password: password123"
echo "   - Email: hr@simpala.lk, Password: password123"
