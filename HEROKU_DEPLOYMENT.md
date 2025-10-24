# Heroku Deployment Guide

This guide will help you deploy your Chess Tournament Director application to Heroku.

## Prerequisites

1. **Install Heroku CLI**
   ```bash
   # On macOS
   brew install heroku/brew/heroku
   
   # Or download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Create a Heroku Account**
   - Sign up at https://heroku.com
   - Verify your email address

3. **Login to Heroku**
   ```bash
   heroku login
   ```

## Deployment Steps

### 1. Initialize Git Repository (if not already done)
```bash
cd /Users/aarushchugh/ratings
git init
git add .
git commit -m "Initial commit"
```

### 2. Create Heroku App
```bash
# Create a new Heroku app (replace 'your-app-name' with your desired name)
heroku create your-app-name

# Or let Heroku generate a random name
heroku create
```

### 3. Set Environment Variables
```bash
# Set production environment
heroku config:set NODE_ENV=production

# Set JWT secret (generate a secure random string)
heroku config:set JWT_SECRET=your-super-secret-jwt-key-here

# Set CORS origin to your Heroku app URL (replace 'your-app-name' with your actual app name)
heroku config:set CORS_ORIGIN=https://your-app-name.herokuapp.com

# Set Heroku app name (replace 'your-app-name' with your actual app name)
heroku config:set HEROKU_APP_NAME=your-app-name

# Optional: Set custom port (Heroku will set PORT automatically)
# heroku config:set PORT=5000
```

**Important**: Replace `your-app-name` with your actual Heroku app name in the CORS_ORIGIN and HEROKU_APP_NAME variables.

### 4. Deploy to Heroku
```bash
# Add Heroku remote
git remote add heroku https://git.heroku.com/your-app-name.git

# Deploy
git push heroku main

# Or if using master branch
git push heroku master
```

### 5. Scale the App
```bash
# Scale to 1 web dyno (free tier)
heroku ps:scale web=1

# Check app status
heroku ps
```

### 6. Open Your App
```bash
heroku open
```

## Important Notes

### Database Considerations
- The app uses SQLite which is stored in the ephemeral filesystem
- **Data will be lost when the dyno restarts** (which happens at least once every 24 hours on the free tier)
- For production use, consider upgrading to a paid plan with persistent storage or migrating to PostgreSQL

### Free Tier Limitations
- Apps sleep after 30 minutes of inactivity
- 550-1000 free dyno hours per month
- No persistent file storage

### Production Recommendations
1. **Upgrade to Hobby Plan** ($7/month) for:
   - Always-on dynos
   - Custom domains
   - SSL certificates

2. **Add PostgreSQL Database**:
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

3. **Set up automated backups** if using SQLite

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port (set by Heroku) | `5000` |
| `JWT_SECRET` | Secret for JWT tokens | `your-secret-key` |
| `CORS_ORIGIN` | Allowed CORS origins | `https://your-app.herokuapp.com` |
| `HEROKU_APP_NAME` | Heroku app name | `your-app-name` |

## Troubleshooting

### Common Issues

1. **Network Errors / CORS Issues**
   ```bash
   # Check if CORS_ORIGIN is set correctly
   heroku config:get CORS_ORIGIN
   
   # Set CORS_ORIGIN to your app URL
   heroku config:set CORS_ORIGIN=https://your-app-name.herokuapp.com
   
   # Check if HEROKU_APP_NAME is set
   heroku config:get HEROKU_APP_NAME
   
   # Set HEROKU_APP_NAME
   heroku config:set HEROKU_APP_NAME=your-app-name
   
   # Restart the app after setting config vars
   heroku restart
   ```

2. **Build Failures**
   ```bash
   # Check build logs
   heroku logs --tail
   
   # Check if all dependencies are in package.json
   npm install --production
   ```

3. **App Crashes**
   ```bash
   # View real-time logs
   heroku logs --tail
   
   # Check app status
   heroku ps
   ```

4. **Database Issues**
   ```bash
   # Access Heroku bash
   heroku run bash
   
   # Check if database file exists
   ls -la server/
   ```

5. **API Connection Issues**
   ```bash
   # Check if the app is responding
   curl https://your-app-name.herokuapp.com/api/tournaments
   
   # Check environment variables
   heroku config
   
   # Verify the app is running
   heroku ps:scale web=1
   ```

### Useful Commands

```bash
# View app logs
heroku logs --tail

# Restart the app
heroku restart

# Scale dynos
heroku ps:scale web=1

# Open app in browser
heroku open

# Run one-off dyno
heroku run bash

# Check config vars
heroku config

# Set config vars
heroku config:set KEY=value
```

## Post-Deployment

1. **Test the application** thoroughly
2. **Set up monitoring** (consider Heroku metrics)
3. **Configure custom domain** (if needed)
4. **Set up SSL** (automatically handled by Heroku)

## Security Considerations

1. **Change default JWT secret** to a secure random string
2. **Review CORS settings** for your production domain
3. **Enable rate limiting** (already configured)
4. **Use HTTPS** (automatic with Heroku)

## Maintenance

1. **Regular updates** - Keep dependencies updated
2. **Monitor logs** for errors and performance issues
3. **Backup data** regularly if using SQLite
4. **Scale appropriately** based on usage

For more information, visit the [Heroku Dev Center](https://devcenter.heroku.com/).
