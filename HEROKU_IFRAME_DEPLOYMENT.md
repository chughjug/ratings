# Deploy Iframe Embedding Fix to Heroku

Your Chess Tournament Director application has been configured to allow iframe embedding. Follow these steps to deploy the fix to Heroku.

## Quick Deploy

### Option 1: Automated Script (Recommended)

```bash
./deploy-iframe-fix.sh
```

This script will:
- ✅ Check that Heroku CLI is installed and you're logged in
- ✅ Commit the changes to git
- ✅ Push to Heroku
- ✅ Display your app URL and testing instructions

### Option 2: Manual Deploy

If you prefer to deploy manually:

```bash
# 1. Stage the changes
git add server/index.js test-simple-iframe.html test-iframe-embedding.html IFRAME_STATUS.md IFRAME_EMBEDDING_SETUP.md

# 2. Commit
git commit -m "Enable iframe embedding for Heroku deployment"

# 3. Push to Heroku
git push heroku main
```

## Verify Deployment

After deployment, verify the headers are correct:

```bash
# Get your Heroku app URL
heroku info

# Check the headers
curl -I https://YOUR-APP-NAME.herokuapp.com | grep -i "content-security"
```

You should see:
```
Content-Security-Policy: ...frame-ancestors *;
```

You should **NOT** see:
```
X-Frame-Options: DENY
```

## Test Iframe Embedding

1. Open `test-simple-iframe.html` in your browser
2. Edit the iframe URL to use your Heroku app:
   - Change `src="http://localhost:5000"` 
   - To `src="https://YOUR-APP-NAME.herokuapp.com"`
3. Reload the page - the iframe should load your site

## Troubleshooting

### If iframe still doesn't work

1. **Clear browser cache** - Old headers may be cached
   - Chrome/Edge: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
   - Firefox: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)

2. **Check Heroku logs**:
   ```bash
   heroku logs --tail
   ```

3. **Restart the Heroku app**:
   ```bash
   heroku restart
   ```

4. **Verify headers**:
   ```bash
   curl -I https://YOUR-APP-NAME.herokuapp.com
   ```

### If deployment fails

1. Check Heroku CLI is installed:
   ```bash
   heroku --version
   ```

2. Check you're logged in:
   ```bash
   heroku auth:whoami
   ```

3. Check git remote exists:
   ```bash
   git remote -v
   ```

## What Was Changed

The following configuration was added to allow iframe embedding:

### `server/index.js`

1. **Content-Security-Policy**: Added `frameAncestors: ["*"]` to allow embedding from any origin
2. **X-Frame-Options**: Disabled with `xFrameOptions: false`
3. **Custom Middleware**: Added after helmet to ensure proper CSP header formatting

### Key Headers

- `Content-Security-Policy: ...frame-ancestors *;` - Allows iframe embedding from any origin
- **No** `X-Frame-Options: DENY` - This would block iframe embedding

## Security Considerations

⚠️ **Current Configuration**: The site can now be embedded from **any origin**.

If you want to restrict embedding to specific domains, edit `server/index.js`:

```javascript
frameAncestors: [
  "'self'",
  "https://specific-domain.com",
  "https://your-main-website.com"
]
```

Then redeploy:
```bash
git commit -am "Restrict iframe embedding to specific domains"
git push heroku main
```

## Support

If you continue to have issues:

1. Check Heroku logs: `heroku logs --tail`
2. Test locally first: Open `test-simple-iframe.html` with localhost
3. Verify headers: `curl -I https://YOUR-APP.herokuapp.com`

## Files Changed

- `server/index.js` - Main configuration changes
- `test-simple-iframe.html` - Simple test page
- `test-iframe-embedding.html` - Comprehensive test page
- `IFRAME_STATUS.md` - Status documentation
- `IFRAME_EMBEDDING_SETUP.md` - Setup documentation
