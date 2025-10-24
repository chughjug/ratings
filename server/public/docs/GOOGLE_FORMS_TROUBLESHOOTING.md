# Google Forms Extension - Troubleshooting Guide

## Diagnostic Tools

### Check If Setup Ran Successfully

1. In Google Apps Script, click the **⏱ Triggers** icon (left sidebar)
2. You should see two triggers:
   - `onFormSubmit` - On form submit
   - `checkFormResponses` - Time-based, every 5 minutes

**If triggers are missing:**
- Run the `setupFormImport()` function manually
- Check the Executions tab for errors

---

## Common Issues & Solutions

### ❌ Issue: "Form ID not found"

**Symptoms:**
- Script won't run or gives an error about form ID
- Seeing "Form with ID not found" in error logs

**Solutions:**

1. **Verify your Form ID**
   - Go to your form: https://forms.google.com
   - Open the form you want to use
   - Copy URL from browser address bar
   - Should be: `https://forms.google.com/u/1/d/FORM_ID_HERE/edit`
   - Extract just the FORM_ID part

2. **Update FORMS_CONFIG**
   - In Apps Script, find `const FORMS_CONFIG = {`
   - Update: `FORM_ID: 'YOUR_ACTUAL_FORM_ID'`
   - Save (Ctrl+S)

3. **Test Connection**
   - In Apps Script, select `testConnection` from dropdown
   - Click Run button
   - Should see "✅ Connection successful!"

4. **Form Access**
   - Ensure you (the account running the script) have edit access to the form
   - The form should not be deleted or archived

---

### ❌ Issue: "API Key Invalid"

**Symptoms:**
- Import fails with "Invalid API key" message
- FormImportLog shows API authentication errors

**Solutions:**

1. **Verify API Key**
   - Log into your tournament system
   - Go to admin settings/API section
   - Find your API key
   - Copy it exactly (no extra spaces)

2. **Update Configuration**
   - In Apps Script FORMS_CONFIG:
   - `API_KEY: 'your-exact-api-key'`
   - Make sure there are no leading/trailing spaces

3. **Test with Demo Key**
   - Change to `API_KEY: 'demo-key-123'` for testing
   - Run a test import
   - If it works with demo key, your real key is wrong

4. **Check Tournament System Status**
   - Make sure your tournament system API is running
   - Try accessing API endpoint directly in browser:
   - `http://your-api-url/api/tournaments`
   - Should return data or valid error (not connection refused)

---

### ❌ Issue: "Tournament not found"

**Symptoms:**
- Import fails with "Tournament not found" message
- No error message but no imports happening

**Solutions:**

1. **Verify Tournament ID**
   - In your tournament system, open a tournament
   - Look for the tournament ID in the URL or settings
   - Note the exact ID (case-sensitive!)

2. **Update Configuration**
   - In FORMS_CONFIG: `TOURNAMENT_ID: 'your-tournament-id'`
   - Should match exactly (case-sensitive)

3. **Check Tournament Exists**
   - Log into tournament system
   - Verify the tournament exists and is active
   - Check you have access to this tournament

4. **Test Tournament Access**
   - Try this in browser:
   - `http://your-api-url/api/tournaments/your-tournament-id`
   - Should return tournament data

---

### ❌ Issue: "No logs appearing in FormImportLog"

**Symptoms:**
- FormImportLog sheet is empty or not showing new entries
- Submitted form but no import logs

**Solutions:**

1. **Check if FormImportLog sheet exists**
   - Look for "FormImportLog" tab in your spreadsheet
   - If missing, run `setupFormImport()` again

2. **Verify Triggers Are Active**
   - Click ⏱ Triggers icon
   - Ensure `onFormSubmit` and `checkFormResponses` exist
   - Check if last execution shows any errors

3. **Check Executions**
   - Click ⏱ icon, then click "Executions" tab
   - Look for the most recent execution
   - Click to expand and see what happened

4. **Manually Check for Responses**
   - Run `checkFormResponses()` manually:
   - In Apps Script, select it from dropdown
   - Click Run
   - Check if logs appear

5. **Enable Detailed Logging**
   - In Apps Script, open Chrome DevTools (F12)
   - Go to Console tab
   - Run a manual import
   - Check for any error messages in console

---

### ❌ Issue: "Form responses not importing"

**Symptoms:**
- FormImportLog shows successful imports
- But players not appearing in tournament system
- Or import shows "Failed" with error

**Solutions:**

1. **Check Import Status**
   - Look at FormImportLog sheet
   - What does the "Success" column say?
   - What error is shown in "Error" column?

2. **If Import Shows Failed:**
   - Note the exact error message
   - See specific error solutions below

3. **If Import Shows Success But Players Missing:**
   - Check tournament system is saving data
   - Try creating a player manually in tournament system
   - Verify you're looking at the right tournament
   - Check if player data is partially saved

4. **Test with Manual Import**
   ```javascript
   // In Apps Script console, run:
   const testPlayer = {
     name: "Test Player",
     email: "test@example.com",
     rating: 1800
   };
   syncPlayersToAPI([testPlayer]);
   ```

---

### ❌ Issue: "Invalid form response / Missing name"

**Symptoms:**
- FormImportLog shows "Invalid form response"
- Or "Missing or invalid player name"
- Some responses import, others don't

**Solutions:**

1. **Check Form Question Names**
   - Open your Google Form
   - Make sure you have a question about player name
   - Question title should include "name" or "player"
   - Examples: "Player Name", "What is your name?", "Full Name"

2. **Verify Field Mapping**
   - Look at form question titles:
   - Question must have "name" in title for name field
   - Must have "email" for email field, etc.
   - Field detection is case-insensitive

3. **Check Form Response Data**
   - In Google Form, click "Responses" tab
   - Check that responses have filled-in values
   - Empty responses will fail import

4. **Add Custom Field Mapping**
   - If form has different question titles:
   - Edit `convertFormResponseToPlayer()` function
   - Add custom mapping:
   ```javascript
   if (question.includes('your-custom-field')) {
     player.your_field = answer;
   }
   ```

---

### ❌ Issue: "Connection timeout / API unreachable"

**Symptoms:**
- FormImportLog shows "Connection timeout"
- Error: "Failed to reach API"
- Network error messages

**Solutions:**

1. **Check API URL**
   - In FORMS_CONFIG: `API_BASE_URL`
   - Should include http:// or https://
   - Examples:
     - `http://localhost:5000` ✅
     - `https://tournament-app.com` ✅
     - `tournament-app.com` ❌ (missing protocol)

2. **Verify API is Running**
   - If local: Run `npm start` in tournament system directory
   - If hosted: Check service status
   - Test in browser: Navigate to API_BASE_URL

3. **Check Network/Firewall**
   - Google Apps Script runs in Google's cloud
   - May not reach localhost (if running locally)
   - If API is on localhost, deploy it or use ngrok tunnel
   - Or test with a deployed version of the API

4. **Check CORS Settings**
   - Google Apps Script should work with most APIs
   - If still failing, check tournament system CORS config
   - May need to whitelist Google's IP ranges

---

## Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| "Form with ID not found" | Wrong FORM_ID | Check form URL and update FORM_ID |
| "Invalid API key" | Wrong API_KEY | Verify API key in tournament system |
| "Tournament not found" | Wrong TOURNAMENT_ID | Check tournament ID (case-sensitive) |
| "Missing or invalid player name" | Form missing name field | Add "name" question to form |
| "Connection timeout" | API unreachable | Check API_BASE_URL and network |
| "Authorization failed" | API key not accepted | Verify API_KEY is correct |
| "No responses found" | Form has no submissions | Fill out and submit form first |

---

## Debugging Steps

### Step 1: Enable Debug Logging

In Apps Script console (F12):
```javascript
// Run this to see detailed logs
function debugFormImport() {
  console.log('FORMS_CONFIG:', FORMS_CONFIG);
  console.log('Form exists?', FormApp.openById(FORMS_CONFIG.FORM_ID) ? 'Yes' : 'No');
  checkFormResponses();
}
```

### Step 2: Check Execution Logs

1. In Apps Script, click ⏱ icon
2. Click "Executions" tab
3. Find the execution you want to debug
4. Click it to expand and see stack trace

### Step 3: Manually Test Functions

Test each function individually:

```javascript
// Test 1: Can we access the form?
function testFormAccess() {
  try {
    const form = FormApp.openById(FORMS_CONFIG.FORM_ID);
    console.log('Form title:', form.getTitle());
    console.log('Number of questions:', form.getItems().length);
    return true;
  } catch (error) {
    console.error('Cannot access form:', error);
    return false;
  }
}

// Test 2: Can we get responses?
function testGetResponses() {
  try {
    const form = FormApp.openById(FORMS_CONFIG.FORM_ID);
    const responses = form.getResponses();
    console.log('Number of responses:', responses.length);
    return true;
  } catch (error) {
    console.error('Cannot get responses:', error);
    return false;
  }
}

// Test 3: Can we connect to API?
function testAPIConnection() {
  try {
    const url = FORMS_CONFIG.API_BASE_URL + '/api/tournaments/' + FORMS_CONFIG.TOURNAMENT_ID;
    const response = UrlFetchApp.fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + FORMS_CONFIG.API_KEY
      }
    });
    console.log('API Response:', response.getResponseCode());
    return true;
  } catch (error) {
    console.error('API Connection failed:', error);
    return false;
  }
}
```

Run each test and note which ones fail.

---

## Performance Issues

### Issue: Imports are slow

**Solutions:**
1. Increase `CHECK_INTERVAL` in FORMS_CONFIG (e.g., 10 or 15 minutes)
2. Limit the number of responses with `RESPONSE_LIMIT`
3. Check tournament system performance
4. Check network latency to API

### Issue: Too many API calls

**Solutions:**
1. Disable automatic import: `ENABLE_FORM_IMPORT: false`
2. Use manual import only: `checkFormResponses()` manually
3. Increase `CHECK_INTERVAL` to reduce frequency

---

## Getting Help

### Gather Information

Before contacting support, collect:
1. Error message from FormImportLog
2. Full stack trace from Apps Script Executions tab
3. Your FORMS_CONFIG (redact API key)
4. Browser console errors (F12)
5. Tournament system API logs

### Contact Resources

1. Check detailed logs in:
   - FormImportLog sheet
   - Apps Script Executions tab
   - Browser Console (F12)

2. Test with provided diagnostic functions above

3. Review this troubleshooting guide

4. Contact your tournament system administrator with:
   - Error messages
   - Configuration (API URL, Tournament ID)
   - Steps taken to reproduce

---

## Performance Checklist

- [ ] FORM_ID is correct (matches form URL)
- [ ] API_BASE_URL includes http:// or https://
- [ ] API_KEY is correct and not expired
- [ ] TOURNAMENT_ID exists and is active
- [ ] Triggers are set up (⏱ Triggers icon)
- [ ] FormImportLog sheet exists and has entries
- [ ] Test submission appeared in tournament system
- [ ] Confirmation emails sent (if enabled)
- [ ] No errors in Apps Script Executions tab

---

## Quick Recovery Steps

If everything is broken:

1. **Backup your form data** (download as CSV from Form > Responses)
2. **Remove all triggers**: Click ⏱ Triggers, delete all form-related triggers
3. **Delete FormImportLog sheet**: Right-click tab > Delete sheet
4. **Verify configuration is correct** (all 4 values updated)
5. **Run setup again**: `setupFormImport()`
6. **Test with manual form submission**

This usually fixes most issues.

---

## Still Stuck?

Visit the troubleshooting guide again or see `GOOGLE_FORMS_EXTENSION_SETUP.md` for comprehensive help.
