#!/bin/bash
# CI build helper script - builds shared types package
set -e

echo "📦 Installing root dependencies..."
npm install

echo "📦 Installing types package dependencies..."
cd packages/types
npm install

echo "🔨 Building types package..."
npm run build

echo "✅ Types package built successfully!"
ls -la dist/