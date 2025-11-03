#!/bin/bash

# Heroku Deployment Script
# This script helps deploy the Chess Tournament Director app to Heroku

set -e  # Exit on error

echo "🚀 Chess Tournament Director - Heroku Deployment Script"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo -e "${RED}❌ Heroku CLI is not installed.${NC}"
    echo "Please install it from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

echo -e "${GREEN}✓ Heroku CLI found${NC}"

# Check if logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo -e "${YELLOW}⚠ Not logged in to Heroku${NC}"
    echo "Logging in..."
    heroku login
fi

echo -e "${GREEN}✓ Logged in to Heroku${NC}"

# Get app name
read -p "Enter your Heroku app name (or press Enter to create new): " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo "Creating new Heroku app..."
    heroku create
    APP_NAME=$(heroku apps:info | grep "Name:" | awk '{print $2}')
    echo -e "${GREEN}✓ Created app: $APP_NAME${NC}"
else
    # Check if app exists
    if heroku apps:info -a "$APP_NAME" &> /dev/null; then
        echo -e "${GREEN}✓ Using existing app: $APP_NAME${NC}"
        heroku git:remote -a "$APP_NAME"
    else
        echo -e "${RED}❌ App '$APP_NAME' not found${NC}"
        read -p "Create new app with this name? (y/n): " CREATE_APP
        if [ "$CREATE_APP" = "y" ]; then
            heroku create "$APP_NAME"
            echo -e "${GREEN}✓ Created app: $APP_NAME${NC}"
        else
            exit 1
        fi
    fi
fi

# Set environment variables
echo ""
echo "Setting environment variables..."
heroku config:set NODE_ENV=production -a "$APP_NAME"
heroku config:set NPM_CONFIG_PRODUCTION=false -a "$APP_NAME"

# Generate JWT secret if not set
if [ -z "$(heroku config:get JWT_SECRET -a "$APP_NAME")" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    heroku config:set JWT_SECRET="$JWT_SECRET" -a "$APP_NAME"
    echo -e "${GREEN}✓ Generated and set JWT_SECRET${NC}"
else
    echo -e "${GREEN}✓ JWT_SECRET already set${NC}"
fi

# Set CORS origin
CORS_ORIGIN="https://$APP_NAME.herokuapp.com"
heroku config:set CORS_ORIGIN="$CORS_ORIGIN" -a "$APP_NAME"
echo -e "${GREEN}✓ Set CORS_ORIGIN to $CORS_ORIGIN${NC}"

# Check if git repository
if [ ! -d ".git" ]; then
    echo ""
    echo "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for Heroku deployment"
    echo -e "${GREEN}✓ Git repository initialized${NC}"
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo ""
    echo -e "${YELLOW}⚠ You have uncommitted changes${NC}"
    read -p "Commit them now? (y/n): " COMMIT_CHANGES
    if [ "$COMMIT_CHANGES" = "y" ]; then
        read -p "Enter commit message: " COMMIT_MSG
        git add .
        git commit -m "${COMMIT_MSG:-Update for deployment}"
    fi
fi

# Deploy
echo ""
echo "Deploying to Heroku..."
echo "This may take several minutes..."
git push heroku main 2>/dev/null || git push heroku master

echo ""
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Wait for the build to complete (check with: heroku logs --tail)"
echo "2. Create an admin user: heroku run npm run setup -a $APP_NAME"
echo "3. Open your app: heroku open -a $APP_NAME"
echo ""
echo "Useful commands:"
echo "  heroku logs --tail -a $APP_NAME    # View logs"
echo "  heroku open -a $APP_NAME           # Open app"
echo "  heroku ps -a $APP_NAME             # Check dyno status"
echo ""
