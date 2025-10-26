#!/bin/bash
# Script to deploy fixes to Heroku

echo "🚀 Deploying fixes to Heroku..."

# Add all changes
git add .

# Commit with a descriptive message
git commit -m "Fix Heroku 500 errors: Add calculateTiebreakers, fix database path, add migrations"

# Push to Heroku
echo "📤 Pushing to Heroku..."
git push heroku main

echo "✅ Deployment initiated!"
echo ""
echo "Monitor the deployment with:"
echo "  heroku logs --tail"

