# UI Cache Invalidation Guide

## Problem Fixed
UI changes weren't appearing after deployment due to service worker and browser caching.

## What Was Changed

### 1. Service Worker Cache Versioning
- **Before**: Hardcoded cache version `chess-tournament-v1.0.0`
- **After**: Dynamic timestamp-based cache version `chess-tournament-${BUILD_TIMESTAMP}`
- **Result**: Each deployment gets a unique cache version

### 2. Automated Build Process
- Added `prebuild` script that runs before each build
- Updates service worker timestamp automatically
- Updates manifest.json version automatically
- **No manual steps needed**

### 3. Cache-Busting Headers
- Service worker and HTML files: `no-cache, no-store, must-revalidate`
- Static assets: 1-hour cache
- **Prevents aggressive browser caching**

### 4. Cache Cleanup
- All old caches deleted on service worker activation
- Fresh cache created for each deployment

## How to Deploy

The fix is automatic and requires no special steps:

```bash
# Standard deployment process
git add .
git commit -m "Update UI"
git push heroku main

# The fix handles cache invalidation automatically
```

## For Developers

### Testing Locally

```bash
# Build with cache invalidation
cd client
npm run build

# Check timestamp was updated
grep BUILD_TIMESTAMP public/sw.js

# Start server
cd ..
npm start
```

### Verifying the Fix

After deployment:

1. **Check Service Worker Cache**
   - Open DevTools → Application → Service Workers
   - Verify new service worker is registered
   - Check that old caches are deleted

2. **Check Browser Cache**
   - Open DevTools → Application → Cache Storage
   - Verify only cache with new timestamp exists

3. **Hard Reload**
   - Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - This forces browser to fetch latest files

### Manual Cache Clear (If Needed)

If you still see old UI after deployment:

**Chrome/Edge:**
1. DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

**Firefox:**
1. DevTools (F12)
2. Network tab
3. Check "Disable Cache"
4. Refresh page

**Safari:**
1. Develop → Empty Caches
2. Or `Cmd+Option+E`

## Technical Details

### File Changes

**Modified:**
- `client/public/sw.js` - Dynamic cache versioning
- `client/package.json` - Prebuild hooks
- `server/index.js` - Cache-control headers

**Created:**
- `client/scripts/update-service-worker-version.js` - Auto-updates SW timestamp
- `client/scripts/update-manifest-version.js` - Auto-updates manifest version

### Build Process Flow

```
npm run build
    ↓
prebuild hook runs
    ↓
update-service-worker-version.js → Updates sw.js with new timestamp
    ↓
update-manifest-version.js → Updates manifest.json with new version
    ↓
react-scripts build → Builds app with updated files
    ↓
Deploy to Heroku
    ↓
Service worker detects new version
    ↓
Old caches deleted
    ↓
Fresh cache created
    ↓
User sees latest UI
```

## Prevention

This fix ensures:
- ✅ Cache version updates automatically on each build
- ✅ No manual intervention required
- ✅ Old caches are automatically cleaned up
- ✅ Proper HTTP headers prevent aggressive caching
- ✅ Users always see the latest UI

## Troubleshooting

### Issue: Still seeing old UI after deployment

**Solution 1**: Wait 1-2 minutes for service worker update
**Solution 2**: Hard reload (Ctrl+Shift+R)
**Solution 3**: Clear browser cache manually

### Issue: Service worker not updating

**Check:**
1. Build completed successfully
2. Service worker file updated with new timestamp
3. Manifest version updated

**Fix:** Rebuild and redeploy

```bash
cd client
npm run build
cd ..
git add .
git commit -m "Force rebuild"
git push heroku main
```

### Issue: Cache still showing old content

**Force complete cache deletion:**

1. Unregister service worker
2. Clear site data
3. Hard reload

Or use DevTools:
- Application → Clear storage → Clear site data

## Additional Notes

- Service worker updates are progressive (users update gradually)
- Changes may take a few minutes to propagate to all users
- Always test after deployment to ensure latest UI is showing
- Consider implementing a "New Version Available" notification for PWA users

