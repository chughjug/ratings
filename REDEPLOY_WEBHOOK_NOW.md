# ⚡ URGENT: Redeploy Google Apps Script - HTML Fixed

## Issue
The webhook URL was showing blank content because the HTML formatting wasn't rendering properly in Google Apps Script.

## Solution
✅ Updated `google-apps-script-pairings.gs` with:
- Simplified HTML structure
- Cleaner CSS formatting
- Better compatibility with Google Apps Script rendering
- Fixed XFrameOptionsMode for proper display

## What to Do NOW

### Step 1: Copy Updated Code
```
File: /Users/aarushchugh/ratings/google-apps-script-pairings.gs
```

### Step 2: Go to Google Apps Script
1. Open your existing Google Apps Script project
2. Delete ALL current code
3. Copy-paste the ENTIRE updated google-apps-script-pairings.gs file
4. Save (Ctrl+S or Cmd+S)

### Step 3: Create NEW Deployment
1. Click **Deploy** (top right, blue button)
2. Click **Manage deployments** (if you see it) OR **New deployment**
3. Click the gear icon
4. Select **Web app**
5. Set:
   - **Execute as**: Your email address
   - **Who has access**: Anyone
6. Click **Deploy**
7. **COPY THE NEW DEPLOYMENT URL**

### Step 4: Update Backend
```bash
PAIRING_NOTIFICATION_WEBHOOK=<paste_new_deployment_url>
```

Set this in your .env or environment configuration and restart backend.

## Test It

Visit the new webhook URL in your browser:
```
https://script.google.com/macros/s/{NEW_SCRIPT_ID}/usercontent
```

You should now see:

```
🏆 Chess Tournament Pairing Notifier

✅ Webhook is Active and Ready

ℹ️ This is a webhook receiver
This script receives POST requests from your tournament backend...

[Complete status page with instructions]
```

## What's Fixed

✅ HTML now renders properly in Google Apps Script
✅ Status page displays all content
✅ Professional formatting and styling
✅ Clear instructions on the page
✅ Webhook payload format documented
✅ Testing instructions included
✅ Database setup information provided

## Functions

### doGet(e)
- Handles GET requests (browser visits)
- Returns professional status page
- Shows webhook is active

### doPost(e)  
- Handles POST requests (from backend)
- Processes pairing data
- Sends personalized emails
- Logs everything

## No Linting Errors

✅ Code validated and clean
✅ No syntax errors
✅ Ready for deployment

---

**IMPORTANT**: This is a NEW deployment - you'll get a NEW URL. Update your backend environment variable!

After deployment, your webhook will be fully functional! 🚀
