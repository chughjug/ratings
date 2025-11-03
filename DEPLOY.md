# Heroku Deployment Guide

This guide will help you deploy the Chess Tournament Director application to Heroku.

## Prerequisites

1. **Heroku CLI** installed ([Download here](https://devcenter.heroku.com/articles/heroku-cli))
2. **Git** installed and configured
3. **Heroku account** (sign up at [heroku.com](https://www.heroku.com))

## Quick Deployment

### Step 1: Login to Heroku

```bash
heroku login
```

### Step 2: Create a Heroku App

```bash
# Create app with a specific name (optional)
heroku create your-app-name

# OR let Heroku generate a name automatically
heroku create
```

### Step 3: Set Environment Variables

Set required environment variables on Heroku:

```bash
# Node environment
heroku config:set NODE_ENV=production

# NPM config (needed to build client with dev dependencies)
heroku config:set NPM_CONFIG_PRODUCTION=false

# JWT Secret (generate a random string)
heroku config:set JWT_SECRET=$(openssl rand -base64 32)

# Optional: Set CORS origin if needed
heroku config:set CORS_ORIGIN=https://your-app-name.herokuapp.com
```

### Step 4: Configure Database

⚠️ **Important**: This app uses SQLite, which has limitations on Heroku:
- Heroku has an **ephemeral filesystem** - files are deleted when the dyno restarts
- For production use, consider migrating to PostgreSQL

For now, SQLite will work but data may be lost on dyno restarts. To persist data:

**Option 1: Use Heroku Postgres (Recommended for Production)**
```bash
# Add Postgres addon (starts at $5/month)
heroku addons:create heroku-postgresql:mini

# The DATABASE_URL will be automatically set by Heroku
# You'll need to update database.js to support PostgreSQL
```

**Option 2: Use a file-based database with persistence addon**
```bash
# Use a persistent storage solution like Heroku Redis or external storage
# This requires modifying database.js to use a different storage mechanism
```

### Step 5: Deploy

```bash
# Make sure you're in the project root directory
git init  # If not already a git repository
git add .
git commit -m "Initial commit for Heroku deployment"

# Deploy to Heroku
git push heroku main

# Or if your branch is called master:
git push heroku master
```

### Step 6: Verify Deployment

```bash
# Open your app in the browser
heroku open

# Check logs
heroku logs --tail

# Check app status
heroku ps
```

## Post-Deployment

### Create Admin User

After deployment, create an admin user:

```bash
heroku run npm run setup
```

Follow the prompts to create your admin account.

### Verify Build

Check that the build completed successfully:

```bash
heroku logs --tail
```

Look for:
- ✅ `heroku-postbuild` script completion
- ✅ Server starting successfully
- ✅ Database connection established

## Troubleshooting

### Build Fails

If the build fails:

```bash
# Check build logs
heroku logs --tail

# Common issues:
# - Missing environment variables
# - Build script errors
# - Node version mismatch
```

### App Crashes

If the app crashes:

```bash
# View crash logs
heroku logs --tail

# Restart the app
heroku restart

# Check process status
heroku ps
```

### Database Issues

If you see database errors:

```bash
# Check if database file exists (for SQLite)
heroku run bash
ls -la server/

# For PostgreSQL, check connection:
heroku pg:info
heroku pg:psql  # Opens PostgreSQL console
```

### Static Files Not Loading

Ensure `heroku-postbuild` completed and `client/build` exists:

```bash
heroku run bash
cd client && ls -la build/
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `NPM_CONFIG_PRODUCTION` | Yes | Set to `false` to install dev dependencies |
| `JWT_SECRET` | Yes | Secret key for JWT tokens |
| `PORT` | Auto | Automatically set by Heroku |
| `DATABASE_URL` | Optional | For PostgreSQL (auto-set if using addon) |
| `CORS_ORIGIN` | Optional | CORS origin for API requests |

## Scaling

Scale your application:

```bash
# Scale to 1 web dyno (free tier)
heroku ps:scale web=1

# Scale to multiple dynos (paid)
heroku ps:scale web=2
```

## Updating the App

After making changes:

```bash
git add .
git commit -m "Your update message"
git push heroku main
```

## Useful Commands

```bash
# View app logs
heroku logs --tail

# Open app in browser
heroku open

# Run one-off commands
heroku run <command>

# View config variables
heroku config

# Restart app
heroku restart

# Scale down (free tier)
heroku ps:scale web=0

# Scale up
heroku ps:scale web=1
```

## Cost Considerations

- **Free Tier**: Currently unavailable (Heroku removed free tier in 2022)
- **Eco Dyno**: ~$5/month (sleeps after 30 min inactivity)
- **Basic Dyno**: ~$7/month (always on)
- **PostgreSQL Mini**: ~$5/month (if using Postgres)

## Security Notes

1. ✅ Never commit `.env` files
2. ✅ Use strong JWT secrets
3. ✅ Enable HTTPS (automatic on Heroku)
4. ✅ Review environment variables regularly
5. ✅ Keep dependencies updated

## Next Steps

After deployment:
1. Test all major features
2. Create an admin account
3. Set up monitoring (Heroku provides basic logs)
4. Consider setting up custom domain
5. Configure automated backups (if using Postgres)

