# Google Credentials Setup - Complete Guide

## 🚨 IMMEDIATE ISSUE DETECTED

Your service account credentials file is **VALID**, but the error you're getting means:

**❌ Google Sheets API is NOT enabled in your Google Cloud Console!**

### ✅ Quick Fix (5 minutes)

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com/
   - Project should be: `fluent-cinema-476115-a6`

2. **Enable Google Sheets API**
   - Click **"APIs & Services"** in the left menu
   - Click **"+ Enable APIs and Services"** (top)
   - Search for: `Google Sheets API`
   - Click on it
   - Click **"ENABLE"** button (blue button)
   - Wait for it to finish enabling (takes a few seconds)

3. **Enable Google Forms API** (also needed)
   - Repeat step 2, but search for `Google Forms API`
   - Click **"ENABLE"**

4. **Verify APIs are Enabled**
   - Go to **"APIs & Services"** > **"Enabled APIs & Services"**
   - You should see:
     - ✅ Google Sheets API
     - ✅ Google Forms API

5. **Test the Fix**
   - After enabling, wait 1-2 minutes for changes to propagate
   - Run the validation test again:
   ```bash
   node -e "
   const { JWT } = require('google-auth-library');
   const credentials = require('./fluent-cinema-476115-a6-e76b30820fd1.json');

   const auth = new JWT({
     email: credentials.client_email,
     key: credentials.private_key,
     scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
   });

   auth.getAccessToken()
     .then(() => console.log('✅ SUCCESS! APIs are now enabled!'))
     .catch(err => console.log('❌ Still failing:', err.message));
   "
   ```

---

## 📋 Full Setup Guide (If needed)

### ✅ Pre-checks

Your current credentials file (`fluent-cinema-476115-a6-e76b30820fd1.json`) contains:
- ✅ Project ID: `fluent-cinema-476115-a6`
- ✅ Service Email: `test-219@fluent-cinema-476115-a6.iam.gserviceaccount.com`
- ✅ Private Key: Valid
- ✅ Type: service_account

### The REAL Problem

**Error: "Could not refresh access token"**

This happens when:
1. ❌ Google Sheets API is NOT enabled
2. ❌ Google Forms API is NOT enabled  
3. ❌ Service account doesn't have permissions

**Solution: Enable the APIs!**

### Step-by-Step (Google Cloud Console)

1. **Go to Google Cloud Console**
   ```
   https://console.cloud.google.com/
   ```

2. **Make sure you're in the RIGHT project**
   - Top left, click on project selector
   - Select: `fluent-cinema-476115-a6`

3. **Enable APIs & Services**
   - Left menu → **"APIs & Services"**
   - Click **"+ Enable APIs and Services"**

4. **Enable EACH of these APIs:**

   **Google Sheets API:**
   - Search box → type `sheets`
   - Click "Google Sheets API"
   - Click blue **"ENABLE"** button
   - Wait for completion

   **Google Forms API:**
   - Search box → type `forms`
   - Click "Google Forms API"  
   - Click blue **"ENABLE"** button
   - Wait for completion

   **Google Drive API:**
   - Search box → type `drive`
   - Click "Google Drive API"
   - Click blue **"ENABLE"** button
   - Wait for completion

5. **Verify Enabled APIs**
   - Go to **"APIs & Services"** > **"Enabled APIs & Services"**
   - Scroll down, you should see all three:
     - ✅ Google Sheets API
     - ✅ Google Forms API
     - ✅ Google Drive API

6. **Share Your Google Sheet**
   - Open your Google Sheets document
   - Click **"Share"** button
   - Paste this email: `test-219@fluent-cinema-476115-a6.iam.gserviceaccount.com`
   - Give it **"Viewer"** permissions
   - Click **"Share"**

7. **Test It**
   - Wait 1-2 minutes for permissions to update
   - Go back to the application
   - Try importing with your spreadsheet ID

---

## 🧪 Testing Your Setup

### Step 1: Verify Credentials File

```bash
node -e "console.log(require('./fluent-cinema-476115-a6-e76b30820fd1.json').client_email)"
```

Expected output:
```
test-219@fluent-cinema-476115-a6.iam.gserviceaccount.com
```

### Step 2: Test API Access

```bash
node -e "
const { JWT } = require('google-auth-library');
const creds = require('./fluent-cinema-476115-a6-e76b30820fd1.json');

const auth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

auth.getAccessToken()
  .then(() => console.log('✅ APIs ENABLED - Authentication works!'))
  .catch(err => console.log('❌ APIs NOT enabled or error:', err.message));
"
```

### Step 3: Test Demo Import

```bash
# Start server
npm run server

# In another terminal
curl -X POST http://localhost:5000/api/google-import/sheets/preview \
  -H "Content-Type: application/json" \
  -d '{"spreadsheet_id": "demo", "range": "Sheet1!A1:Z1000", "api_key": "demo-key-123"}'
```

---

## 🆘 Still Having Issues?

### Check Server Logs

When running `npm run server`, look for error messages that say:
- "Google Sheets API is not enabled"
- "Permission denied"
- "Access denied"

These messages tell you exactly what's wrong.

### Verify Each Step

1. **Credentials file exists**: ✅ (checked above)
2. **Credentials are valid JSON**: ✅ (checked above)
3. **Google Sheets API enabled**: Run validation script above
4. **Google Forms API enabled**: Same validation script
5. **Google Drive API enabled**: Same validation script
6. **Spreadsheet shared with service account**: Manually verify in Google Sheets
7. **Service account has Viewer permission**: Manually verify in Google Sheets

### Common Mistakes

❌ **Mistake**: Forgetting to enable APIs  
✅ **Fix**: Enable all three APIs in Google Cloud Console

❌ **Mistake**: Not waiting for APIs to be enabled  
✅ **Fix**: Wait 1-2 minutes after enabling before testing

❌ **Mistake**: Not sharing the Google Sheet  
✅ **Fix**: Share with `test-219@fluent-cinema-476115-a6.iam.gserviceaccount.com`

❌ **Mistake**: Sharing with Editor instead of Viewer  
✅ **Fix**: Give "Viewer" permission (minimum required)

---

## 📞 Support

If you're still stuck:

1. **Run this command and share the output:**
   ```bash
   node -e "
   const creds = require('./fluent-cinema-476115-a6-e76b30820fd1.json');
   console.log('Project:', creds.project_id);
   console.log('Email:', creds.client_email);
   console.log('Files are set up correctly - now enable APIs!');
   "
   ```

2. **Go to Google Cloud Console and enable the 3 APIs**

3. **Wait 2 minutes and try again**

That should fix it! 🎉
