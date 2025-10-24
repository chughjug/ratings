# ⚠️ Why Google Apps Script Can't Access Localhost

## The Problem

When you set `API_BASE_URL: 'http://localhost:3000'`, Google Apps Script fails with:
```
DNS error: http://localhost:3000/api/players/api-import/...
```

## Why This Happens

### ❌ Localhost (Your Local Machine)
- `localhost:3000` is on YOUR computer
- Google Apps Script runs in GOOGLE'S cloud servers
- Google's servers can't reach your computer over the internet
- Result: DNS error (can't find the address)

### ✅ Public URLs (Internet)
- `https://chess-tournament-director-6ce5e76147d7.herokuapp.com/` is publicly hosted
- Can be accessed from anywhere, including Google's servers
- Google Apps Script can reach it
- Result: Works perfectly!

## How Internet Works

```
Your Computer          Google Cloud           Heroku Cloud
   │                      │                       │
   │ localhost:3000        │                       │
   ├─────────┐             │                       │
   │ (only accessible      │                       │
   │  from your PC)        │                       │
   │                       │                       │
   │                  Google Apps             Public URL ✓
   │                  Script can't        (accessible from
   │                  reach here ✗        anywhere)
   │                                          │
   │                  Apps Script ────────────→ Heroku
   │                                       ✓ Works!
```

## Solutions

### Solution 1: Use Production Heroku (Current - Working)
```javascript
API_BASE_URL: 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/'
```
✅ Pros:
- Always accessible
- Production-ready
- Works from anywhere

❌ Cons:
- Not local development

### Solution 2: Use ngrok for Local Testing
**Best for local development!**

#### Step 1: Install ngrok
```bash
brew install ngrok
```

#### Step 2: Start your local server
```bash
cd server
npm start
# Server running on http://localhost:3000
```

#### Step 3: Create a tunnel in another terminal
```bash
ngrok http 3000
# Output:
# Forwarding                    https://abc-123-def.ngrok.io -> http://localhost:3000
```

#### Step 4: Update FORMS_CONFIG
```javascript
API_BASE_URL: 'https://abc-123-def.ngrok.io',
```

✅ Pros:
- Test locally without deploying
- Live reload possible
- Debug issues easily

❌ Cons:
- ngrok tunnel URL changes when you restart
- Need to update config each time

### Solution 3: Deploy Your Server Publicly

#### Option A: Heroku (Free tier available)
```bash
cd server
heroku create your-app-name
git push heroku main
# Get your URL and use it in FORMS_CONFIG
```

#### Option B: Other Platforms
- AWS Lambda
- Google Cloud Functions
- DigitalOcean
- Railway
- Render

## Current Configuration

Your config is now set to:
```javascript
const FORMS_CONFIG = {
  ENABLE_FORM_IMPORT: true,
  FORM_ID: '15fTL-FenfGKK3s_6IMcu6FeeYFONIyJUD9s0eWSqCS4',
  API_BASE_URL: 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/',  // ✓ Public URL
  API_KEY: 'demo-key-123',
  TOURNAMENT_ID: '399a6188-406c-45ea-b078-ae37a0fdd509',
  CHECK_INTERVAL: 5,
  SEND_CONFIRMATION_EMAILS: true,
  AUTO_ASSIGN_SECTIONS: true,
  LOOKUP_RATINGS: true
};
```

✅ This will work! The Heroku URL is publicly accessible.

## Testing

1. **Save** the updated script
2. **Close and reopen** the Google Sheet
3. **Click**: Chess Tournament → Test Connection
4. Should see: ✅ Connection successful!

## If You Want Local Testing

1. Install ngrok: `brew install ngrok`
2. Start server: `npm start`
3. In another terminal: `ngrok http 3000`
4. Copy the ngrok URL and update FORMS_CONFIG
5. Test again

## Important Notes

- ⚠️ Never use `localhost` with Google Apps Script
- ⚠️ Always use publicly accessible URLs
- ⚠️ ngrok URLs change when you restart (update config each time)
- ✅ Heroku URLs are permanent and reliable

## Summary

**Current Setup**: ✅ Using production Heroku URL - WORKING
**Local Development**: Use ngrok tunnel or deploy to public server
**Why localhost failed**: Google can't access your private machine

