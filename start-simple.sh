#!/bin/bash

# Simple PairCraft Development Startup Script
echo "🚀 Starting PairCraft Development Servers..."

# Kill existing servers
echo "Stopping existing servers..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start backend
echo "Starting backend server (port 5000)..."
cd server
npm start &
BACKEND_PID=$!
cd ..

# Start frontend
echo "Starting frontend server (port 3000)..."
cd client
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Servers started!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for interrupt
trap 'echo ""; echo "🛑 Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo "✅ Servers stopped"; exit 0' INT

# Keep running
wait
