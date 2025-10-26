#!/bin/bash

# Deploy Iframe Embedding Fix to Heroku
# This script commits and deploys the iframe embedding configuration

echo "🚀 Deploying iframe embedding fix to Heroku..."
echo ""

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

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not a git repository"
    exit 1
fi

# Check if heroku remote exists
if ! git remote | grep -q heroku; then
    echo "⚠️  No Heroku remote found. Attempting to find Heroku app..."
    APP_NAME=$(heroku apps:info --json 2>/dev/null | grep -o '"name":"[^"]*' | cut -d'"' -f4 | head -1)
    if [ -z "$APP_NAME" ]; then
        echo "❌ Error: Cannot find Heroku app"
        echo "Please run: heroku git:remote -a your-app-name"
        exit 1
    fi
    echo "Found app: $APP_NAME"
fi

# Show current changes
echo "📋 Files to be committed:"
git status -s
echo ""

# Commit changes
echo "📝 Committing changes..."
git add server/index.js test-simple-iframe.html test-iframe-embedding.html IFRAME_STATUS.md IFRAME_EMBEDDING_SETUP.md deploy-iframe-fix.sh 2>/dev/null
git commit -m "Enable iframe embedding for Heroku deployment

- Configure helmet to allow frame-ancestors from any origin
- Disable X-Frame-Options header
- Add custom CSP middleware for proper header setting
- Add test pages to verify embedding works"

# Push to Heroku
echo ""
echo "🚀 Pushing to Heroku..."
git push heroku main || git push heroku master

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    
    # Get Heroku app URL
    APP_URL=$(heroku apps:info --json 2>/dev/null | grep -o '"web_url":"[^"]*' | cut -d'"' -f4 | head -1)
    if [ -z "$APP_URL" ]; then
        APP_NAME=$(heroku apps:info --json 2>/dev/null | grep -o '"name":"[^"]*' | cut -d'"' -f4 | head -1)
        APP_URL="https://${APP_NAME}.herokuapp.com"
    fi
    
    echo "🌐 Your app URL: $APP_URL"
    echo ""
    echo "🧪 Test iframe embedding:"
    echo "   1. Open test-simple-iframe.html in your browser"
    echo "   2. Change the URL from localhost:5000 to: $APP_URL"
    echo ""
    echo "📊 Check logs:"
    echo "   heroku logs --tail"
    echo ""
    echo "🔍 Verify headers:"
    echo "   curl -I $APP_URL | grep -i 'content-security-policy'"
    echo ""
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi
