# Getting Your Google Apps Script Webhook URL

Follow these exact steps to get your webhook URL:

## 1. Create Google Apps Script Project

1. Go to **https://script.google.com**
2. Click **"+ New project"** (top left)
3. Name it: **"Chess Tournament Pairings Notifier"**
4. Click **Create**

## 2. Paste the Code

1. In the editor, delete the default `function myFunction() {}` code
2. Copy ALL code from `google-apps-script-pairings.gs` in this repo
3. Paste it into the editor
4. Click **Save** (Ctrl+S or Cmd+S)
5. Close the "Execution log" at bottom if it appears

## 3. Deploy as Web App

1. Click **"Deploy"** button (top right, blue button)
2. Click **"New deployment"** (if you see options)
3. In the dropdown, select **"Web app"**
4. Now fill in:
   - **Execute as**: Your email address (current user)
   - **Who has access**: Select **"Anyone"**
5. Click **"Deploy"** button at bottom
6. A popup will show the deployment

## 4. Copy Your Webhook URL

You'll see something like:

```
Deployment successful! 
Deployment ID: AKfycbz1ABC2DEF3ghi4JKL5mno6PQR...

New URL:
https://script.google.com/macros/d/1VxL-a1B2c3D4e5F6g7h8i9j0k/usercontent
```

**Copy the URL** - this is your webhook!

## 5. Set Environment Variable

### Option A: Local Development (.env file)

Create or edit `.env` in your project root:

```bash
PAIRING_NOTIFICATION_WEBHOOK=https://script.google.com/macros/d/1VxL-a1B2c3D4e5F6g7h8i9j0k/usercontent
```

### Option B: Heroku

```bash
heroku config:set PAIRING_NOTIFICATION_WEBHOOK="https://script.google.com/macros/d/1VxL-a1B2c3D4e5F6g7h8i9j0k/usercontent" --app your-app-name
```

### Option C: Docker/Production

Set as environment variable:

```bash
export PAIRING_NOTIFICATION_WEBHOOK="https://script.google.com/macros/d/1VxL-a1B2c3D4e5F6g7h8i9j0k/usercontent"
```

## 6. Test It Works

### Test in Google Apps Script

1. Go back to your Google Apps Script project
2. In the function dropdown (top), select **"testSendEmail"**
3. Click the **play button** (▶) to run it
4. Check your email (should arrive in 1-2 seconds)
5. Click **"Execution log"** at the bottom to see logs

### Test via Your Backend

```bash
curl -X POST http://localhost:5000/api/pairings/generate/section \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "test-tournament",
    "round": 1,
    "sectionName": "Open"
  }'
```

Check your email!

## Troubleshooting

### Can't Find Deploy Button?

- Look at top right of Google Apps Script
- Click on **"Deploy"** (blue button)
- If you see "Review permissions", click through and allow

### Still Don't See New Deployment Option?

- Click **Project Settings** (gear icon, top right)
- Copy the "Script ID"
- You can also use this to reference the script

### Email Not Received?

1. Check spam/junk folder
2. In Google Apps Script, click "Execution log" and look for errors
3. Run `testSendEmail()` to test Gmail access

### Authorization Error?

1. Google Apps Script needs Gmail permission
2. When you first run the script, you might need to authorize
3. Click through the authorization prompts
4. Allow the script to send emails

## Next Steps

1. ✅ You have your webhook URL
2. ✅ Set it in environment variable
3. ✅ Configure recipients in `CONFIG` section of Apps Script
4. ✅ Test with `testSendEmail()` function
5. ✅ Generate real pairings and verify emails

See `WEBHOOK_QUICK_START.md` for the complete setup!

---

**Questions?** Check the troubleshooting section above or see `PAIRING_NOTIFICATION_SETUP.md` for detailed help.
