#!/usr/bin/env bash
set -e

echo "🚀 Creating Cloud Run job to seed the database..."

# Create a temporary seeding job
gcloud run jobs create seed-database \
  --image=gcr.io/long-operator-466309-g6/simpalahr-backend \
  --region=us-central1 \
  --project=long-operator-466309-g6 \
  --vpc-connector=simpala-vpc-connector \
  --vpc-egress=all-traffic \
  --set-secrets=DATABASE_URL=DEV_DATABASE_URL:latest \
  --command="npm" \
  --args="run,seed" \
  --max-retries=0 \
  --task-timeout=120s

echo "✅ Job created. Executing..."

# Execute the job
gcloud run jobs execute seed-database \
  --region=us-central1 \
  --project=long-operator-466309-g6 \
  --wait

echo "🎉 Database seeding completed!"
echo ""
echo "📧 You can now login with:"
echo "   Email: owner@simpala.lk"
echo "   Password: password123"
echo ""
echo "   or"
echo ""
echo "   Email: admin@simpala.lk"
echo "   Password: password123"
