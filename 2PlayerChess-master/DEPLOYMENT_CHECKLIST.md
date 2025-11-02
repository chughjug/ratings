# Heroku Deployment Checklist

Use this checklist to ensure everything is ready for deployment.

## ✅ Pre-Deployment Checklist

### Required Files
- [x] `Procfile` exists and contains `web: node index.js`
- [x] `package.json` has a `start` script
- [x] `package.json` includes `engines` field for Node.js
- [x] `.gitignore` excludes `node_modules/` but includes `package-lock.json`
- [x] `index.js` uses `process.env.PORT` or has a fallback

### Configuration
- [x] Socket.io CORS configured for production
- [x] Socket.io transports include fallback options
- [x] Static files are properly served
- [x] No hardcoded ports in production code

### Testing
- [x] App runs locally with `npm start`
- [x] HTML page loads correctly
- [x] No syntax errors
- [x] Dependencies install without errors

## 🚀 Deployment Steps

### 1. Initialize Git Repository
```bash
cd 2PlayerChess-master
git init
git add .
git commit -m "Initial commit - configured for Heroku"
```

### 2. Login to Heroku
```bash
heroku login
```

### 3. Create Heroku App
```bash
heroku create your-chess-app-name
```

### 4. Deploy to Heroku
```bash
git push heroku main
```

If you're on a different branch:
```bash
git push heroku your-branch:main
```

### 5. Verify Deployment
```bash
# Open the app in browser
heroku open

# Check logs
heroku logs --tail

# Check app status
heroku ps
```

## 🔍 Post-Deployment Verification

### Essential Checks
- [ ] App loads in browser without errors
- [ ] Socket.io connection works (check browser console)
- [ ] You can create a room
- [ ] You can join with a room code
- [ ] Moves sync between two tabs/browsers
- [ ] Chat functionality works
- [ ] Timer counts down correctly

### Browser Console Checks
Open browser developer tools (F12) and verify:
- No socket.io connection errors
- No CORS errors
- No 404 errors for static files
- WebSocket or polling connection established

### Network Checks
```bash
# Ping your app
curl https://your-app-name.herokuapp.com

# Check if app is responding
heroku ps:scale web=1
```

## 🐛 Troubleshooting Common Issues

### Issue: "Build failed" or "npm ERR!"
**Solution:**
```bash
# Clear build cache and try again
heroku config:set NODE_ENV=production
git push heroku main --force
```

### Issue: "Cannot GET /" or blank page
**Solution:**
- Check `heroku logs --tail` for errors
- Verify `Procfile` is correct
- Ensure `package.json` has a `start` script

### Issue: Socket.io connection fails
**Solution:**
- Check browser console for CORS errors
- Verify Socket.io CORS configuration in `index.js`
- Check Heroku logs for socket.io errors
- Try restarting: `heroku restart`

### Issue: App sleeps after 30 minutes
**Solution:**
- This is normal on Heroku's free tier
- First request may be slow
- Consider upgrading to a paid plan for always-on

### Issue: Game state lost on refresh
**Solution:**
- This is expected - state is in-memory
- Consider adding Redis for persistence (advanced)

## 📊 Monitoring Your App

### Useful Commands
```bash
# View real-time logs
heroku logs --tail

# View specific number of log lines
heroku logs -n 100

# Check dyno status
heroku ps

# Scale dynos (if needed)
heroku ps:scale web=1

# View app metrics
heroku ps:exec

# Restart app
heroku restart

# Roll back to previous version
heroku rollback
```

### Environment Variables (if needed later)
```bash
# Set environment variable
heroku config:set VARIABLE_NAME=value

# View all environment variables
heroku config

# Remove environment variable
heroku config:unset VARIABLE_NAME
```

## 🎯 Success Criteria

Your deployment is successful if:
- ✅ App loads at `https://your-app-name.herokuapp.com`
- ✅ You can start a new game
- ✅ Someone can join using the room code
- ✅ Chess pieces move and sync between players
- ✅ Chat messages appear for both players
- ✅ Timers work correctly
- ✅ No console errors in browser

## 📝 Next Steps

After successful deployment:
1. Share your Heroku URL with friends to test
2. Monitor logs for any errors during gameplay
3. Consider adding custom domain (paid feature)
4. Set up monitoring/alerting (optional)
5. Review scaling options if you expect high traffic

## 🆘 Getting Help

If you encounter issues not covered here:
1. Check Heroku logs: `heroku logs --tail`
2. Review Heroku Status: https://status.heroku.com
3. Check Heroku Dev Center: https://devcenter.heroku.com
4. Review Socket.io documentation for production issues

## 📚 Additional Resources

- [Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support)
- [Socket.io Production Guide](https://socket.io/docs/v4/production-checklist/)
- [Heroku Dyno Sleeping](https://devcenter.heroku.com/articles/dynos#dyno-sleeping)

