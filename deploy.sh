#!/bin/bash

# Heroku Deployment Script for Chess Tournament Director
# Make sure you have Heroku CLI installed and are logged in

echo "🚀 Starting Heroku deployment process..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for Heroku deployment"
fi

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed. Please install it first:"
    echo "   brew install heroku/brew/heroku"
    exit 1
fi

# Check if user is logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "🔐 Please login to Heroku first:"
    echo "   heroku login"
    exit 1
fi

# Get app name from user or use default
if [ -z "$1" ]; then
    echo "📝 Enter your desired Heroku app name (or press Enter for auto-generated):"
    read app_name
else
    app_name=$1
fi

# Create Heroku app
echo "🏗️  Creating Heroku app..."
if [ -z "$app_name" ]; then
    heroku create
    app_url=$(heroku apps:info --json | jq -r '.app.web_url')
else
    heroku create "$app_name"
    app_url="https://$app_name.herokuapp.com"
fi

echo "✅ Heroku app created: $app_url"

# Set environment variables
echo "⚙️  Setting up environment variables..."

# Generate a secure JWT secret
jwt_secret=$(openssl rand -base64 32)

heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET="$jwt_secret"
heroku config:set CORS_ORIGIN="$app_url"

echo "✅ Environment variables configured"

# Build the React client
echo "🔨 Building React client..."
cd client
npm install
npm run build
cd ..

# Deploy to Heroku
echo "🚀 Deploying to Heroku..."
git add .
git commit -m "Deploy to Heroku" || echo "No changes to commit"

# Check if heroku remote exists
if ! git remote | grep -q heroku; then
    git remote add heroku "https://git.heroku.com/$(heroku apps:info --json | jq -r '.app.name').git"
fi

git push heroku main 2>/dev/null || git push heroku master

# Scale the app
echo "📈 Scaling app to 1 web dyno..."
heroku ps:scale web=1

# Open the app
echo "🌐 Opening your deployed app..."
heroku open

echo ""
echo "🎉 Deployment complete!"
echo "📱 Your app is available at: $app_url"
echo ""
echo "📋 Useful commands:"
echo "   heroku logs --tail    # View logs"
echo "   heroku restart        # Restart app"
echo "   heroku ps             # Check app status"
echo "   heroku config         # View environment variables"
echo ""
echo "⚠️  Important notes:"
echo "   - The free tier has limitations (sleeps after 30 min inactivity)"
echo "   - SQLite database will reset on dyno restart"
echo "   - Consider upgrading to Hobby plan for production use"
echo ""
echo "📚 See HEROKU_DEPLOYMENT.md for more details"
