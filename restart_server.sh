#!/bin/bash

# Chess Tournament Director - Server Restart Script
# This script handles server restarts and common issue fixes

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/Users/aarushchugh/ratings"
SERVER_PORT=5000
CLIENT_PORT=3000
LOG_FILE="$PROJECT_DIR/server_restart.log"

# Function to log messages
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to log errors
log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

# Function to log success
log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

# Function to log warnings
log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on specific port
kill_port() {
    local port=$1
    local service_name=$2
    
    if check_port $port; then
        log "Killing processes on port $port ($service_name)..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
        
        if check_port $port; then
            log_warning "Some processes on port $port may still be running"
        else
            log_success "Port $port is now free"
        fi
    else
        log "Port $port is already free"
    fi
}

# Function to check Node.js and npm
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed or not in PATH"
        exit 1
    fi
    
    log_success "Node.js and npm are available"
}

# Function to check if we're in the right directory
check_project_structure() {
    log "Checking project structure..."
    
    if [ ! -f "$PROJECT_DIR/package.json" ]; then
        log_error "package.json not found. Are you in the right directory?"
        exit 1
    fi
    
    if [ ! -f "$PROJECT_DIR/server/index.js" ]; then
        log_error "server/index.js not found. Project structure may be corrupted."
        exit 1
    fi
    
    if [ ! -d "$PROJECT_DIR/client" ]; then
        log_warning "client directory not found. Client may not be built yet."
    fi
    
    log_success "Project structure looks good"
}

# Function to install dependencies
install_dependencies() {
    log "Installing/updating dependencies..."
    
    cd "$PROJECT_DIR"
    
    # Install server dependencies
    log "Installing server dependencies..."
    npm install --silent
    
    # Install client dependencies if client directory exists
    if [ -d "$PROJECT_DIR/client" ]; then
        log "Installing client dependencies..."
        cd "$PROJECT_DIR/client"
        npm install --silent
        cd "$PROJECT_DIR"
    fi
    
    log_success "Dependencies installed successfully"
}

# Function to clean up temporary files
cleanup_temp_files() {
    log "Cleaning up temporary files..."
    
    # Remove node_modules/.cache if it exists
    if [ -d "$PROJECT_DIR/node_modules/.cache" ]; then
        rm -rf "$PROJECT_DIR/node_modules/.cache"
        log "Removed node_modules/.cache"
    fi
    
    # Remove client build cache if it exists
    if [ -d "$PROJECT_DIR/client/node_modules/.cache" ]; then
        rm -rf "$PROJECT_DIR/client/node_modules/.cache"
        log "Removed client node_modules/.cache"
    fi
    
    # Clean up any lock files that might be corrupted
    if [ -f "$PROJECT_DIR/package-lock.json" ]; then
        # Backup the lock file
        cp "$PROJECT_DIR/package-lock.json" "$PROJECT_DIR/package-lock.json.backup"
    fi
    
    log_success "Temporary files cleaned up"
}

# Function to check database
check_database() {
    log "Checking database..."
    
    if [ -f "$PROJECT_DIR/server/chess_tournaments.db" ]; then
        log_success "Database file exists"
        
        # Check if database is accessible
        if sqlite3 "$PROJECT_DIR/server/chess_tournaments.db" "SELECT 1;" >/dev/null 2>&1; then
            log_success "Database is accessible"
        else
            log_warning "Database may be corrupted or locked"
        fi
    else
        log_warning "Database file not found. It will be created on first run."
    fi
}

# Function to build client if needed
build_client() {
    if [ -d "$PROJECT_DIR/client" ]; then
        log "Checking if client needs to be built..."
        
        if [ ! -d "$PROJECT_DIR/client/build" ] || [ "$PROJECT_DIR/client/build/index.html" -ot "$PROJECT_DIR/client/package.json" ]; then
            log "Building client..."
            cd "$PROJECT_DIR/client"
            npm run build --silent
            cd "$PROJECT_DIR"
            log_success "Client built successfully"
        else
            log "Client build is up to date"
        fi
    fi
}

# Function to start server
start_server() {
    log "Starting server..."
    
    cd "$PROJECT_DIR"
    
    # Start server in background
    nohup node server/index.js > "$PROJECT_DIR/server.log" 2>&1 &
    SERVER_PID=$!
    
    # Wait a moment for server to start
    sleep 3
    
    # Check if server is running
    if kill -0 $SERVER_PID 2>/dev/null; then
        log_success "Server started with PID $SERVER_PID"
        
        # Wait a bit more and check if it's listening on the port
        sleep 2
        if check_port $SERVER_PORT; then
            log_success "Server is listening on port $SERVER_PORT"
        else
            log_warning "Server may not be listening on port $SERVER_PORT yet"
        fi
    else
        log_error "Failed to start server"
        log "Check server.log for details:"
        tail -20 "$PROJECT_DIR/server.log" 2>/dev/null || true
        exit 1
    fi
}

# Function to start client (optional)
start_client() {
    if [ -d "$PROJECT_DIR/client" ]; then
        log "Starting client..."
        
        cd "$PROJECT_DIR/client"
        nohup npm start > "$PROJECT_DIR/client.log" 2>&1 &
        CLIENT_PID=$!
        
        # Wait a moment for client to start
        sleep 5
        
        # Check if client is running
        if kill -0 $CLIENT_PID 2>/dev/null; then
            log_success "Client started with PID $CLIENT_PID"
            
            # Wait a bit more and check if it's listening on the port
            sleep 5
            if check_port $CLIENT_PORT; then
                log_success "Client is listening on port $CLIENT_PORT"
            else
                log_warning "Client may not be listening on port $CLIENT_PORT yet"
            fi
        else
            log_warning "Failed to start client (this is optional)"
        fi
        
        cd "$PROJECT_DIR"
    fi
}

# Function to show status
show_status() {
    log "=== SERVER STATUS ==="
    
    if check_port $SERVER_PORT; then
        log_success "Server is running on port $SERVER_PORT"
    else
        log_error "Server is not running on port $SERVER_PORT"
    fi
    
    if check_port $CLIENT_PORT; then
        log_success "Client is running on port $CLIENT_PORT"
    else
        log_warning "Client is not running on port $CLIENT_PORT"
    fi
    
    echo ""
    log "=== RECENT LOGS ==="
    if [ -f "$PROJECT_DIR/server.log" ]; then
        log "Server logs (last 10 lines):"
        tail -10 "$PROJECT_DIR/server.log" 2>/dev/null || true
    fi
    
    if [ -f "$PROJECT_DIR/client.log" ]; then
        log "Client logs (last 10 lines):"
        tail -10 "$PROJECT_DIR/client.log" 2>/dev/null || true
    fi
}

# Function to stop all services
stop_all() {
    log "Stopping all services..."
    
    # Kill server
    kill_port $SERVER_PORT "Server"
    
    # Kill client
    kill_port $CLIENT_PORT "Client"
    
    # Kill any remaining node processes related to this project
    pkill -f "node.*server/index.js" 2>/dev/null || true
    pkill -f "npm.*start" 2>/dev/null || true
    
    log_success "All services stopped"
}

# Main restart function
restart_server() {
    log "=== CHESS TOURNAMENT DIRECTOR - SERVER RESTART ==="
    
    # Change to project directory
    cd "$PROJECT_DIR"
    
    # Run all checks and fixes
    check_dependencies
    check_project_structure
    cleanup_temp_files
    check_database
    install_dependencies
    build_client
    
    # Stop existing services
    stop_all
    
    # Start services
    start_server
    start_client
    
    # Show final status
    echo ""
    show_status
    
    log_success "Restart completed!"
    log "Server URL: http://localhost:$SERVER_PORT"
    log "Client URL: http://localhost:$CLIENT_PORT"
    log "Logs: $LOG_FILE"
}

# Handle command line arguments
case "${1:-restart}" in
    "restart")
        restart_server
        ;;
    "stop")
        stop_all
        ;;
    "start")
        start_server
        start_client
        show_status
        ;;
    "status")
        show_status
        ;;
    "clean")
        stop_all
        cleanup_temp_files
        install_dependencies
        log_success "Clean completed!"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  restart  - Stop and restart all services (default)"
        echo "  start    - Start all services"
        echo "  stop     - Stop all services"
        echo "  status   - Show current status"
        echo "  clean    - Clean and reinstall dependencies"
        echo "  help     - Show this help message"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac
