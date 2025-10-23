#!/bin/bash

# Enhanced Features Installation Script
# This script installs all dependencies and sets up the enhanced features

echo "🚀 Installing Enhanced Chess Tournament Features..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version $(node -v) detected"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p uploads
mkdir -p server/exports
mkdir -p server/backups

# Set up environment variables if they don't exist
if [ ! -f .env ]; then
    echo "⚙️ Creating .env file..."
    cat > .env << EOF
NODE_ENV=development
PORT=5000
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:3000
DB_PATH=server/chess_tournaments.db
UPLOAD_PATH=uploads
EXPORT_PATH=server/exports
BACKUP_PATH=server/backups
EOF
    echo "✅ Created .env file. Please update JWT_SECRET with a secure value."
fi

# Initialize database with new tables
echo "🗄️ Initializing database with enhanced features..."
node -e "
const db = require('./server/database');
console.log('Database initialized with enhanced features');
process.exit(0);
"

# Create admin user if it doesn't exist
echo "👤 Setting up admin user..."
node server/scripts/create-admin.js

echo ""
echo "🎉 Enhanced features installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your preferred settings"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Access the application at http://localhost:3000"
echo ""
echo "🔧 New features available:"
echo "• Dark mode toggle"
echo "• Keyboard shortcuts (Ctrl+H for help)"
echo "• Enhanced pairing system with manual overrides"
echo "• QR code generation"
echo "• Tournament templates"
echo "• Advanced export options (Excel, PDF)"
echo "• Player photo uploads"
echo "• Multi-day tournament support"
echo "• Knockout tournaments"
echo "• Blitz/Rapid events"
echo "• Simultaneous exhibitions"
echo ""
echo "📚 Documentation:"
echo "• See ADVANCED_FEATURES_README.md for detailed feature documentation"
echo "• API documentation available at /api/enhanced endpoints"
echo ""
echo "Happy tournament directing! 🏆"
