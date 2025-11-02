# Heroku Deployment Guide for 2PlayerChess

This guide explains how to deploy the 2PlayerChess application to Heroku.

## Prerequisites

- Node.js installed locally
- Git installed
- Heroku CLI installed
- A Heroku account

## Deployment Steps

### 1. Install Heroku CLI (if not already installed)

```bash
# macOS
brew install heroku/brew/heroku

# Or download from: https://devcenter.heroku.com/articles/heroku-cli
```

### 2. Login to Heroku

```bash
heroku login
```

### 3. Navigate to Project Directory

```bash
cd 2PlayerChess-master
```

### 4. Create Heroku App

```bash
heroku create your-app-name
```

Replace `your-app-name` with your desired app name (or omit for Heroku to generate one).

### 5. Deploy to Heroku

```bash
# Add all files to git (if not already done)
git init  # if this is a new git repo
git add .
git commit -m "Initial commit for Heroku deployment"

# Deploy to Heroku
git push heroku main

# If you're on a different branch:
git push heroku your-branch:main
```

### 6. Open Your App

```bash
heroku open
```

### 7. View Logs

```bash
heroku logs --tail
```

## Configuration Details

The application has been configured with:

- **Procfile**: Tells Heroku to run `node index.js`
- **package.json**: Includes `start` script and Node.js version requirements
- **Socket.io CORS**: Configured to allow connections from any origin
- **Port Configuration**: Uses `process.env.PORT` (set by Heroku) or defaults to 8080

## Troubleshooting

### Build Fails

```bash
# Check build logs
heroku logs --tail

# Common issues:
# - Missing dependencies: run npm install locally and commit package-lock.json
# - Wrong Node version: check package.json engines field
```

### Socket.io Connection Issues

The app is configured with CORS and multiple transport methods. If you still have issues:

1. Check Heroku logs for errors
2. Verify the app is running: `heroku ps`
3. Restart the dyno: `heroku restart`

### Port Already in Use (Local Testing)

If you want to test locally with Heroku-like environment:

```bash
# Set the PORT environment variable
PORT=5000 node index.js
```

## Additional Heroku Commands

```bash
# Scale dynos (if needed)
heroku ps:scale web=1

# View app info
heroku info

# Run one-off dyno commands
heroku run bash

# View config vars
heroku config

# Set config vars (if needed)
heroku config:set VARIABLE_NAME=value

# Restart app
heroku restart

# Check app status
heroku status
```

## Notes

- Heroku automatically assigns a port via the `PORT` environment variable
- The free tier may sleep after 30 minutes of inactivity
- Socket.io long polling is configured as a fallback if WebSockets fail
- Game state is stored in memory and will be lost on dyno restart

