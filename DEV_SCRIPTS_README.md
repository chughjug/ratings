# PairCraft Development Scripts

This directory contains several scripts to help you start and manage the PairCraft development environment.

## Available Scripts

### 1. Full Development Script (`start-dev.sh`)
**Most comprehensive option with full error handling and monitoring**

```bash
./start-dev.sh
# or
npm run dev:full
```

**Features:**
- ✅ Installs dependencies automatically
- ✅ Kills existing servers before starting
- ✅ Waits for servers to be ready
- ✅ Color-coded output
- ✅ Creates log files (`backend.log`, `frontend.log`)
- ✅ Monitors server health
- ✅ Creates `stop-dev.sh` script automatically

### 2. Simple Development Script (`start-simple.sh`)
**Quick and simple startup**

```bash
./start-simple.sh
# or
npm run dev:simple
```

**Features:**
- ✅ Quick startup
- ✅ Kills existing servers
- ✅ Starts both servers
- ✅ Graceful shutdown with Ctrl+C

### 3. NPM Concurrent Script
**Uses concurrently package (already configured)**

```bash
npm run dev
```

**Features:**
- ✅ Uses npm's concurrently package
- ✅ Shows output from both servers
- ✅ Simple and clean

### 4. Stop Script
**Stops all development servers**

```bash
./stop-dev.sh
# or
npm run stop
```

## Server URLs

- **Frontend (React)**: http://localhost:3000
- **Backend (API)**: http://localhost:5000/api

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```bash
# Kill processes on specific ports
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:5000 | xargs kill -9  # Backend
```

### Dependencies Issues
```bash
# Install all dependencies
npm run install-all
```

### Check Running Servers
```bash
# See what's running on ports 3000 and 5000
lsof -i :3000
lsof -i :5000
```

## Log Files

When using `start-dev.sh`, logs are saved to:
- `backend.log` - Backend server logs
- `frontend.log` - Frontend server logs

View logs in real-time:
```bash
tail -f backend.log
tail -f frontend.log
```

## Recommended Usage

For daily development, use the **simple script**:
```bash
./start-simple.sh
```

For production-like testing or when you need detailed monitoring, use the **full script**:
```bash
./start-dev.sh
```
