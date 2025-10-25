#!/bin/bash

echo "🚀 Deploying Lichess Integration Fix..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the project root directory"
    exit 1
fi

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Staging changes..."
    git add .
    
    echo "💾 Committing changes..."
    git commit -m "Fix Lichess integration component visibility

- Fixed variable reference from 'tournament' to 'state.tournament'
- Updated Heroku URL to correct deployment
- Component should now appear in tournament overview tab"
else
    echo "✅ No changes to commit"
fi

# Check if Heroku remote exists
if git remote | grep -q heroku; then
    echo "🚀 Deploying to Heroku..."
    git push heroku main
    
    if [ $? -eq 0 ]; then
        echo "✅ Deployment successful!"
        echo "🔗 Your app: https://chess-tournament-director-6ce5e76147d7.herokuapp.com"
        echo "🧪 Test page: https://chess-tournament-director-6ce5e76147d7.herokuapp.com/tournaments/bb6cb74a-e3e3-4816-a835-559dd9756c5f"
        echo ""
        echo "📋 What to check:"
        echo "1. Go to the tournament overview tab"
        echo "2. Look for 'Lichess Integration' section"
        echo "3. Click 'Connect' to test OAuth"
    else
        echo "❌ Deployment failed. Check the error messages above."
        exit 1
    fi
else
    echo "❌ Heroku remote not found. Please add it first:"
    echo "   heroku git:remote -a chess-tournament-director-6ce5e76147d7"
    exit 1
fi
