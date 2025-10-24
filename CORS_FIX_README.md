# CORS Fix for Heroku Deployment

## Problem
The frontend was experiencing CORS policy violations when making API requests to the backend, specifically:
- `cache-control` header was not allowed in preflight requests
- This caused `net::ERR_FAILED` errors and prevented tournaments from loading

## Solution
Enhanced CORS configuration to allow all necessary headers for both development and production environments.

## Changes Made

### 1. Server-side CORS Configuration (`server/index.js`)
```javascript
allowedHeaders: [
  'Content-Type', 
  'Authorization', 
  'X-Requested-With', 
  'Accept', 
  'Origin', 
  'Cache-Control',        // ✅ Added
  'Pragma',              // ✅ Added
  'Expires',             // ✅ Added
  'Access-Control-Request-Method',
  'Access-Control-Request-Headers'
]
```

### 2. Frontend Cache Busting (`client/src/services/api.ts`)
```javascript
// Add cache-busting parameter to prevent cached requests
if (config.method === 'get') {
  const separator = config.url?.includes('?') ? '&' : '?';
  config.url = `${config.url}${separator}t=${Date.now()}`;
}
```

### 3. Enhanced Heroku CORS Support
- Added specific Heroku app domains to allowed origins
- Added `maxAge` for preflight caching
- Added `exposedHeaders` for better browser support

## Deployment

### Automatic Deployment
```bash
./deploy-heroku-cors-fix.sh
```

### Manual Deployment
```bash
# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://chess-tournament-director.herokuapp.com
heroku config:set HEROKU_APP_NAME=chess-tournament-director

# Deploy
git add .
git commit -m "Fix CORS policy for Heroku deployment"
git push heroku main
```

## Testing

### Local Development
```bash
# Test CORS preflight
curl -s -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: content-type,cache-control" \
     -X OPTIONS http://localhost:5000/api/tournaments \
     -v | grep -i "access-control-allow-headers"
```

### Production Testing
```bash
# Test Heroku CORS
curl -s -H "Origin: https://chess-tournament-director.herokuapp.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: content-type,cache-control" \
     -X OPTIONS https://chess-tournament-director.herokuapp.com/api/tournaments \
     -v | grep -i "access-control-allow-headers"
```

## Expected Results

### Development
- ✅ No CORS errors in browser console
- ✅ Tournaments load successfully
- ✅ API requests work with cache-control headers

### Production (Heroku)
- ✅ No CORS errors in production
- ✅ Frontend can communicate with backend
- ✅ All API endpoints accessible
- ✅ Cache-busting prevents stale requests

## Troubleshooting

### If CORS errors persist:
1. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Check Heroku logs**: `heroku logs --tail`
3. **Verify environment variables**: `heroku config`
4. **Test CORS manually** using curl commands above

### Common Issues:
- **Browser cache**: Hard refresh required after CORS changes
- **Environment variables**: Ensure `NODE_ENV=production` is set
- **Origin mismatch**: Check that frontend URL matches allowed origins

## Files Modified
- `server/index.js` - Enhanced CORS configuration
- `client/src/services/api.ts` - Added cache busting and removed unused imports
- `deploy-heroku-cors-fix.sh` - Automated deployment script
- `CORS_FIX_README.md` - This documentation

## Status
✅ **FIXED** - CORS policy violations resolved for both development and production environments.
