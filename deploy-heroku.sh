#!/bin/bash

# Heroku Deployment Script for Chess Tournament Director
# This script automates the deployment process and fixes common network issues

set -e  # Exit on any error

echo "🚀 Starting Heroku deployment process..."

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed. Please install it first:"
    echo "   brew install heroku/brew/heroku"
    exit 1
fi

# Check if user is logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "❌ Not logged in to Heroku. Please run: heroku login"
    exit 1
fi

# Get app name from user or use default
if [ -z "$1" ]; then
    echo "📝 Enter your Heroku app name (or press Enter to create a new app):"
    read -r APP_NAME
else
    APP_NAME="$1"
fi

# Create app if it doesn't exist
if [ -n "$APP_NAME" ]; then
    echo "🔍 Checking if app '$APP_NAME' exists..."
    if ! heroku apps:info --app "$APP_NAME" &> /dev/null; then
        echo "📦 Creating new Heroku app: $APP_NAME"
        heroku create "$APP_NAME"
    else
        echo "✅ App '$APP_NAME' already exists"
    fi
else
    echo "📦 Creating new Heroku app with random name..."
    APP_NAME=$(heroku create --json | jq -r '.name')
    echo "✅ Created app: $APP_NAME"
fi

echo "🔧 Setting up environment variables..."

# Set environment variables
heroku config:set NODE_ENV=production --app "$APP_NAME"
heroku config:set CORS_ORIGIN="https://$APP_NAME.herokuapp.com" --app "$APP_NAME"
heroku config:set HEROKU_APP_NAME="$APP_NAME" --app "$APP_NAME"

# Generate and set JWT secret
JWT_SECRET=$(openssl rand -base64 32)
heroku config:set JWT_SECRET="$JWT_SECRET" --app "$APP_NAME"

echo "✅ Environment variables set:"
echo "   NODE_ENV=production"
echo "   CORS_ORIGIN=https://$APP_NAME.herokuapp.com"
echo "   HEROKU_APP_NAME=$APP_NAME"
echo "   JWT_SECRET=*** (hidden)"

# Check if git remote exists
if ! git remote get-url heroku &> /dev/null; then
    echo "🔗 Adding Heroku remote..."
    git remote add heroku "https://git.heroku.com/$APP_NAME.git"
else
    echo "✅ Heroku remote already exists"
fi

# Deploy to Heroku
echo "🚀 Deploying to Heroku..."
git push heroku main

# Scale the app
echo "📊 Scaling app to 1 web dyno..."
heroku ps:scale web=1 --app "$APP_NAME"

# Wait for app to start
echo "⏳ Waiting for app to start..."
sleep 10

# Check app status
echo "🔍 Checking app status..."
heroku ps --app "$APP_NAME"

# Test the API
echo "🧪 Testing API endpoint..."
if curl -s "https://$APP_NAME.herokuapp.com/api/tournaments" > /dev/null; then
    echo "✅ API is responding correctly"
else
    echo "⚠️  API test failed, but deployment may still be successful"
fi

echo ""
echo "🎉 Deployment completed!"
echo "🌐 Your app is available at: https://$APP_NAME.herokuapp.com"
echo ""
echo "📋 Useful commands:"
echo "   heroku logs --tail --app $APP_NAME    # View logs"
echo "   heroku restart --app $APP_NAME        # Restart app"
echo "   heroku config --app $APP_NAME         # View config vars"
echo "   heroku open --app $APP_NAME            # Open app in browser"
echo ""
echo "🔧 If you encounter network errors:"
echo "   1. Check that CORS_ORIGIN is set correctly"
echo "   2. Verify HEROKU_APP_NAME matches your app name"
echo "   3. Restart the app: heroku restart --app $APP_NAME"


