# Google Forms Extension - Quick Start (5 Minutes)

## What You'll Get
✅ Automatic player registration from Google Form  
✅ Real-time import to tournament system  
✅ Email confirmations to players  
✅ Import tracking and logging  

---

## Quick Setup

### 1️⃣ Create Your Form (2 min)
```
https://forms.google.com → Create new form
Add questions: Player Name, Email, Rating, School (optional)
```

### 2️⃣ Get Form ID (30 sec)
```
From form URL: https://forms.google.com/u/1/d/FORM_ID_HERE/edit
Copy the FORM_ID part
```

### 3️⃣ Set Up Google Apps Script (2 min)

**A. Create/Open Google Sheet**
- Go to https://sheets.google.com
- Create new sheet or use existing

**B. Add Script**
1. Click **Extensions** → **Apps Script**
2. Delete default code
3. Paste code from `/google-apps-script.js`
4. Save (Ctrl+S)

**C. Configure**
Find and update FORMS_CONFIG:
```javascript
const FORMS_CONFIG = {
  ENABLE_FORM_IMPORT: true,
  FORM_ID: 'YOUR_FORM_ID_HERE',           // ← Paste your form ID
  API_BASE_URL: 'http://localhost:5000',  // ← Your tournament system URL
  API_KEY: 'demo-key-123',                // ← Your API key
  TOURNAMENT_ID: 'tournament-123',        // ← Your tournament ID
  CHECK_INTERVAL: 5
};
```

### 4️⃣ Activate (30 sec)
1. In Apps Script, select `setupFormImport` from dropdown
2. Click ▶️ **Run**
3. Click **Review permissions** → **Allow**

---

## That's It! ✅

Your form now automatically imports responses.

**Test it:**
1. Fill out your form
2. Wait 1 minute
3. Check the "FormImportLog" sheet tab
4. You should see the import logged

---

## Where to Find Things

| What | Where |
|------|-------|
| Form ID | Form URL (forms.google.com/u/1/d/**FORM_ID**/edit) |
| Tournament ID | Your tournament system settings |
| API URL | Your tournament system (usually localhost:5000 or deployed URL) |
| API Key | Your tournament system admin panel |
| Logs | "FormImportLog" tab in Google Sheet |

---

## Supported Form Question Names

Auto-detected (case-insensitive):
- **name** → Player Name
- **email** → Email Address
- **rating** → Current Rating
- **school** → School Name
- **phone** → Phone Number
- **uscf** → USCF Member ID
- **section** → Tournament Section
- **grade** → Grade/Year
- **team** → Team/Club Name
- **parent** → Parent Info

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Form not importing | Check FORM_ID in config matches URL |
| "API Key Invalid" | Verify API_KEY is correct in tournament system |
| "Tournament not found" | Verify TOURNAMENT_ID exists |
| No log entries | Check that setupFormImport() ran successfully |

---

## Next Steps

1. ✅ Create form
2. ✅ Set up script
3. ✅ Run setupFormImport()
4. ✅ Test with sample response
5. 🚀 **Live!** Form is now capturing players automatically

For detailed setup, see `GOOGLE_FORMS_EXTENSION_SETUP.md`
