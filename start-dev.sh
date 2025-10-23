#!/bin/bash

# PairCraft Development Server Startup Script
# This script starts both the backend (port 5000) and frontend (port 3000) servers

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local service_name=$2
    
    if check_port $port; then
        print_warning "$service_name is already running on port $port. Stopping it..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to wait for server to be ready
wait_for_server() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start after $max_attempts seconds"
    return 1
}

# Main script
echo "=========================================="
echo "🚀 Starting PairCraft Development Servers"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "client" ] || [ ! -d "server" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "Installing dependencies..."

# Install backend dependencies
print_status "Installing backend dependencies..."
npm install

# Install frontend dependencies
print_status "Installing frontend dependencies..."
cd client
npm install
cd ..

# Kill any existing servers
print_status "Stopping any existing servers..."
kill_port 5000 "Backend server"
kill_port 3000 "Frontend server"

# Start backend server
print_status "Starting backend server on port 5000..."
cd server
npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
if wait_for_server "http://localhost:5000/api/tournaments" "Backend server"; then
    print_success "Backend server started successfully (PID: $BACKEND_PID)"
else
    print_error "Failed to start backend server"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start frontend server
print_status "Starting frontend server on port 3000..."
cd client
npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
if wait_for_server "http://localhost:3000" "Frontend server"; then
    print_success "Frontend server started successfully (PID: $FRONTEND_PID)"
else
    print_error "Failed to start frontend server"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

# Create a cleanup script
cat > stop-dev.sh << 'EOF'
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
EOF

chmod +x stop-dev.sh

# Save PIDs for cleanup
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

echo ""
echo "=========================================="
print_success "🎉 Both servers are running successfully!"
echo "=========================================="
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000/api"
echo ""
echo "📋 Logs:"
echo "   Backend: tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop servers: ./stop-dev.sh"
echo ""
echo "Press Ctrl+C to stop this script (servers will continue running)"
echo ""

# Keep script running and show logs
trap 'echo ""; print_status "Script stopped. Servers are still running."; echo "Use ./stop-dev.sh to stop them."; exit 0' INT

# Show recent logs
print_status "Recent backend logs:"
tail -n 5 backend.log 2>/dev/null || echo "No backend logs yet"

print_status "Recent frontend logs:"
tail -n 5 frontend.log 2>/dev/null || echo "No frontend logs yet"

echo ""
print_status "Monitoring servers... (Press Ctrl+C to exit monitoring)"

# Monitor servers
while true; do
    sleep 10
    
    # Check if backend is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        print_error "Backend server stopped unexpectedly"
        break
    fi
    
    # Check if frontend is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        print_error "Frontend server stopped unexpectedly"
        break
    fi
done
