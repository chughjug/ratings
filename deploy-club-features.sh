#!/bin/bash

# Club Management Features Deployment Script
# This script deploys the new club management features to Heroku

echo "🏆 Deploying Chess Nut Pro Club Management Features..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit with club management features"
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

# Get current Heroku app name
app_name=$(heroku apps:info --json 2>/dev/null | jq -r '.app.name' 2>/dev/null)

if [ -z "$app_name" ] || [ "$app_name" = "null" ]; then
    echo "❌ No Heroku app found. Please create one first or run from the correct directory."
    echo "   You can create one with: heroku create your-app-name"
    exit 1
fi

echo "📱 Deploying to Heroku app: $app_name"

# Set up environment variables for club management features
echo "⚙️  Setting up environment variables for club management..."

# Email service configuration
heroku config:set SMTP_HOST=smtp.gmail.com
heroku config:set SMTP_PORT=587
heroku config:set SMTP_SECURE=false
heroku config:set SMTP_FROM=noreply@yourdomain.com

# Payment processing (0% commission for Pro users)
heroku config:set STRIPE_SECRET_KEY=your_stripe_secret_key
heroku config:set STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
heroku config:set PAYPAL_CLIENT_ID=your_paypal_client_id
heroku config:set PAYPAL_CLIENT_SECRET=your_paypal_secret

# Lichess integration
heroku config:set LICHESS_API_URL=https://lichess.org/api

echo "✅ Environment variables configured"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the React client
echo "🔨 Building React client with club management features..."
cd client
npm install
npm run build
cd ..

# Check if build was successful
if [ ! -d "client/build" ]; then
    echo "❌ React build failed. Please check for errors."
    exit 1
fi

echo "✅ React build completed successfully"

# Commit all changes
echo "📝 Committing changes..."
git add .
git commit -m "Add Chess Nut Pro club management features

- Club announcements system
- Email campaigns with tracking
- Custom club rating database
- Auto-generate club ratings
- Club dues tracking
- Branded documents (score sheets, quad forms)
- Lichess challenge integration
- 0% commission for Pro users
- Enhanced organization page with club management"

# Deploy to Heroku
echo "🚀 Deploying to Heroku..."
git push heroku main 2>/dev/null || git push heroku master

# Check deployment status
if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    
    # Scale the app
    echo "📈 Scaling app to 1 web dyno..."
    heroku ps:scale web=1
    
    # Run database migrations
    echo "🗄️  Running database migrations..."
    heroku run "node server/migrations/add-missing-columns.js" || echo "⚠️  Migration script not found, continuing..."
    
    # Open the app
    echo "🌐 Opening your deployed app..."
    heroku open
    
    echo ""
    echo "🎉 Club Management Features Deployment Complete!"
    echo "📱 Your app is available at: https://$app_name.herokuapp.com"
    echo ""
    echo "🏆 New Features Available:"
    echo "   ✅ Club Announcements - Share news with members"
    echo "   ✅ Email Campaigns - Send branded emails with tracking"
    echo "   ✅ Club Ratings - Custom rating database with auto-generation"
    echo "   ✅ Club Dues - Track member payments and dues"
    echo "   ✅ Branded Documents - Generate score sheets and quad forms"
    echo "   ✅ Lichess Integration - Create online game challenges"
    echo "   ✅ 0% Commission - Pro users get zero commission on payments"
    echo ""
    echo "📋 How to Access:"
    echo "   1. Go to your organization settings page"
    echo "   2. Scroll to 'Club Management' section"
    echo "   3. Use the tabbed interface to access all features"
    echo ""
    echo "📚 Useful commands:"
    echo "   heroku logs --tail    # View logs"
    echo "   heroku restart        # Restart app"
    echo "   heroku ps             # Check app status"
    echo "   heroku config         # View environment variables"
    echo ""
    echo "⚠️  Next Steps:"
    echo "   1. Configure SMTP settings for email campaigns"
    echo "   2. Set up Stripe/PayPal for payment processing"
    echo "   3. Connect Lichess accounts for online games"
    echo "   4. Test all club management features"
    
else
    echo "❌ Deployment failed. Please check the logs:"
    echo "   heroku logs --tail"
    exit 1
fi
