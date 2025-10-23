#!/bin/bash
echo "🛑 Stopping PairCraft Development Servers..."

# Kill backend server
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Stopping backend server..."
    lsof -ti:5000 | xargs kill -9 2>/dev/null || true
fi

# Kill frontend server
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Stopping frontend server..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

echo "✅ All servers stopped"
