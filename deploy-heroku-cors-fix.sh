#!/bin/bash

# Deploy to Heroku with CORS fixes
echo "🚀 Deploying to Heroku with CORS fixes..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Error: Heroku CLI not installed"
    echo "Install from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if logged into Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "❌ Error: Not logged into Heroku"
    echo "Run: heroku login"
    exit 1
fi

# Set environment variables for CORS
echo "🔧 Setting Heroku environment variables..."
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://chess-tournament-director.herokuapp.com
heroku config:set HEROKU_APP_NAME=chess-tournament-director

# Deploy to Heroku
echo "📦 Deploying to Heroku..."
git add .
git commit -m "Fix CORS policy for Heroku deployment - allow cache-control headers"
git push heroku main

# Check deployment status
echo "✅ Deployment complete!"
echo "🌐 App URL: https://chess-tournament-director.herokuapp.com"
echo "🔍 Check logs: heroku logs --tail"

# Test CORS configuration
echo "🧪 Testing CORS configuration..."
curl -s -H "Origin: https://chess-tournament-director.herokuapp.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: content-type,cache-control" \
     -X OPTIONS https://chess-tournament-director.herokuapp.com/api/tournaments \
     -v | grep -i "access-control-allow-headers"

echo "✅ CORS fix deployed to Heroku!"
