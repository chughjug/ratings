# Google Forms Integration System

## 🎯 Overview

This complete system allows you to attach a **Google Form** to your chess tournament management system. When players submit the form, their data is **automatically imported** into your tournament.

**✅ Zero manual work required once set up!**

---

## 🚀 What You Get

| Feature | Description |
|---------|-------------|
| **Real-time Import** | Players imported immediately on form submission |
| **Automatic Detection** | Smart field mapping - works with any form structure |
| **Backup Checking** | Periodic checks catch any missed responses |
| **Email Confirmations** | Optional auto-emails to players (customizable) |
| **Import Logging** | Complete audit trail of all imports |
| **Error Handling** | Detailed error messages for troubleshooting |
| **Easy Configuration** | Just 4 values to set up |

---

## 📋 Quick Start (5 Minutes)

### 1. Create Your Google Form
```
https://forms.google.com
→ Create new form
→ Add questions: Player Name, Email, Rating (optional: School, Grade, etc.)
→ Publish form
```

### 2. Get Form ID
```
Form URL: https://forms.google.com/u/1/d/FORM_ID_HERE/edit
Copy FORM_ID_HERE
```

### 3. Set Up Script
```
1. Go to https://sheets.google.com → Create new sheet
2. Extensions → Apps Script
3. Paste code from google-apps-script.js
4. Update FORMS_CONFIG with:
   - FORM_ID (from step 2)
   - API_BASE_URL (your tournament system)
   - API_KEY (from tournament system)
   - TOURNAMENT_ID (your tournament)
5. Save (Ctrl+S)
```

### 4. Activate
```
1. Select 'setupFormImport' from dropdown
2. Click Run (▶️)
3. Authorize when prompted
```

### 5. Done! ✅
```
Fill out your form and watch the magic happen!
Players auto-import to your tournament system.
```

---

## 📁 Documentation Files

### Quick References
- **`GOOGLE_FORMS_QUICK_START.md`** - 5-minute setup guide (START HERE!)
- **`GOOGLE_FORMS_README.md`** - This file, system overview

### Detailed Guides
- **`GOOGLE_FORMS_EXTENSION_SETUP.md`** - Comprehensive step-by-step setup
- **`GOOGLE_FORMS_TROUBLESHOOTING.md`** - Troubleshooting & debugging

### Code Files
- **`google-apps-script.js`** - Main extension code (copy to Apps Script)
- **`GOOGLE_FORMS_CONFIG_TEMPLATE.js`** - Configuration template

---

## 🔧 System Architecture

```
Google Form (your survey)
       ↓
User submits response
       ↓
Google Apps Script (extension) ← YOU SET UP THIS
       ↓
Tournament System API
       ↓
Players database
       ↓
Tournament system shows players!
```

### How It Works

1. **User fills out form** - At forms.google.com
2. **Form submission triggers script** - Our Apps Script runs immediately
3. **Script reads form response** - Extracts player information
4. **Smart field mapping** - Automatically detects name, email, rating, etc.
5. **API call** - Sends data to tournament system
6. **Player appears** - In tournament within seconds
7. **Confirmation email** - Sent to player (optional)
8. **Log created** - Import tracked for audit trail

---

## ⚙️ Configuration

You need **4 values** to configure:

```javascript
FORMS_CONFIG = {
  FORM_ID: 'xxx...',              // From form URL
  API_BASE_URL: 'http://...',     // Where your tournament system runs
  API_KEY: 'your-key',            // From tournament system admin
  TOURNAMENT_ID: 'tournament-123' // The tournament to import to
}
```

### Where to Find Each Value

| Value | Where |
|-------|-------|
| **FORM_ID** | Form URL: `forms.google.com/u/1/d/FORM_ID_HERE/edit` |
| **API_BASE_URL** | Your tournament system URL |
| **API_KEY** | Tournament system admin panel > API settings |
| **TOURNAMENT_ID** | Tournament system > Your tournament > Tournament ID |

---

## 🎓 Supported Form Fields

### Auto-Detected (Case-Insensitive)

Your form questions can have any of these titles:

**Player Information:**
- Name: "player name", "full name", "what is your name"
- Email: "email", "email address", "contact email"
- Rating: "rating", "chess rating", "elo"
- Phone: "phone", "phone number"

**Tournament Info:**
- USCF ID: "uscf id", "member id"
- Section: "section", "division", "category"
- School: "school", "institution"
- Grade: "grade", "year"
- Team: "team", "club", "organization"

**Additional:**
- City: "city", "town"
- State: "state", "province"
- Parent: "parent name", "parent email", "guardian"
- Notes: "notes", "comments", "additional info"

**No matching?** No problem! Add custom mapping in the script (see docs).

---

## 📊 Import Flow

### Real-Time (Immediate)
```
User submits form
    ↓ (instant trigger)
Apps Script runs
    ↓ (< 5 seconds)
Player appears in tournament
```

### Batch (Every 5 Minutes)
```
Every 5 minutes, script checks form responses
    ↓
Finds new responses since last import
    ↓
Imports them
```

Both methods work together for reliability!

---

## 📝 Example Form Setup

```
Question 1: What is your name?
Response: John Doe
→ Imported as: name = "John Doe"

Question 2: What is your email?
Response: john@example.com
→ Imported as: email = "john@example.com"

Question 3: Current chess rating?
Response: 1850
→ Imported as: rating = 1850

Question 4: Which section? (Multiple choice: Beginner/Intermediate/Advanced)
Response: Intermediate
→ Imported as: section = "Intermediate"

Question 5: School name?
Response: Lincoln High School
→ Imported as: school = "Lincoln High School"
```

---

## ✅ Testing

### Test Your Setup

1. **Fill out your form** - Go to the form and submit a test response
2. **Wait 1 minute** - Script needs time to run
3. **Check import log**:
   - Go to your Google Sheet
   - Click "FormImportLog" tab
   - Should show your test entry
4. **Check tournament system**:
   - Log in to tournament system
   - Open your tournament
   - Player should appear in players list

### Verify Each Component

- ✅ Form created and published
- ✅ FORM_ID correct (matches URL)
- ✅ API_BASE_URL correct (can reach in browser)
- ✅ API_KEY correct (from tournament system)
- ✅ TOURNAMENT_ID correct (exists in system)
- ✅ Script saved and running
- ✅ Triggers active (check ⏱ Triggers icon)
- ✅ Test response imported

---

## 🐛 Troubleshooting

### Quick Fixes

| Problem | Fix |
|---------|-----|
| No imports | Check FORM_ID matches URL exactly |
| "API Key Invalid" | Copy API key again (no spaces) |
| "Tournament not found" | Verify TOURNAMENT_ID exists (case-sensitive) |
| No logs appearing | Run setupFormImport() again |
| Script won't run | Check you authorized it correctly |

**For detailed troubleshooting:** See `GOOGLE_FORMS_TROUBLESHOOTING.md`

### Debug Checklist

- [ ] FORM_ID matches form URL
- [ ] API_BASE_URL includes http:// or https://
- [ ] API_KEY is correct
- [ ] TOURNAMENT_ID exists
- [ ] Triggers set up (click ⏱ Triggers icon)
- [ ] Test response submitted
- [ ] Check FormImportLog sheet
- [ ] Check Apps Script Executions tab

---

## 🔐 Security & Privacy

### Data Flow
```
Form Responses → Apps Script → Tournament System
                 (your server)
```

- Form responses stored in your Google Drive
- Script processes in Google's cloud
- Data sent to your tournament system API
- No data stored with us

### Best Practices

1. **Protect your API key**
   - Never share it
   - Don't put it on GitHub
   - Keep it in FORMS_CONFIG only

2. **Form privacy**
   - Can restrict form to specific people/domain
   - Can require login
   - Can view responses only in Google Forms

3. **Data retention**
   - Keep form responses archived
   - Can export as CSV anytime
   - Consider deleting old forms/responses

---

## 🎯 Use Cases

### School Chess Club
```
Form: "Join Our Chess Club"
Fields: Name, Grade, School, Experience Level
→ Auto-imports to club tournament
→ Sends confirmation email
```

### Open Tournament
```
Form: "Chess Tournament Registration"
Fields: Name, USCF ID, Rating, Section Preference
→ Auto-imports all registrations
→ Email confirmations sent
```

### Junior Tournament
```
Form: "Youth Chess Championship"
Fields: Player Name, School, Grade, Parent Name, Parent Email
→ Auto-imports players
→ Parent confirmations sent
```

### Online Tournament
```
Form: "Online Speed Chess"
Fields: Player Handle, Rating, Time Zone
→ Auto-imports to online tournament
→ Immediate confirmation
```

---

## 🚀 Advanced Features

### Customization

**Change import frequency:**
```javascript
CHECK_INTERVAL: 10  // Check every 10 minutes instead of 5
```

**Disable confirmations:**
```javascript
// Comment out in onFormSubmit:
// if (player.email) sendConfirmationEmail(...)
```

**Add custom fields:**
```javascript
// In convertFormResponseToPlayer:
if (question.includes('my-field')) {
  player.my_field = answer;
}
```

### Manual Import

Run manual import anytime:
```
Apps Script → Select 'checkFormResponses' → Click Run
```

### Monitor Imports

View all imports in FormImportLog sheet:
- Timestamp of each import
- Number of players imported
- Success/failure status
- Any errors that occurred
- Details of each import

---

## 📚 Full Documentation

| Topic | File |
|-------|------|
| Quick Start (5 min) | `GOOGLE_FORMS_QUICK_START.md` |
| Detailed Setup | `GOOGLE_FORMS_EXTENSION_SETUP.md` |
| Troubleshooting | `GOOGLE_FORMS_TROUBLESHOOTING.md` |
| System Overview | This file |

---

## ❓ FAQ

**Q: Can I use the same form for multiple tournaments?**
A: Not with one script. Create separate scripts with different TOURNAMENT_IDs.

**Q: What if I want to change my form questions?**
A: Go right ahead! The script auto-detects field names. No reconfiguration needed.

**Q: How often are responses imported?**
A: Real-time on submission + backup checks every 5 minutes (adjustable).

**Q: Can I edit imported players?**
A: Yes, import gets them in the system. You can edit them in tournament system.

**Q: What happens if import fails?**
A: Error logged in FormImportLog. Check logs and re-run setup if needed.

**Q: Can I track who imported when?**
A: Yes! Check FormImportLog sheet. Every import timestamped and logged.

**Q: Do I need to do anything after setup?**
A: No! Just collect form responses. Everything else is automatic.

---

## 🎉 You're Ready!

1. ✅ Read `GOOGLE_FORMS_QUICK_START.md`
2. ✅ Create your form
3. ✅ Set up the script
4. ✅ Configure the 4 values
5. ✅ Run setupFormImport()
6. ✅ Test with a form submission
7. 🚀 **Go live!**

Your form is now automatically importing players to your tournament!

---

## 💡 Tips & Tricks

1. **Test before going live**
   - Fill out form yourself
   - Verify it appears in tournament

2. **Name your form clearly**
   - Helps players understand what they're registering for

3. **Set form permissions**
   - Can limit to specific users
   - Can require login
   - Can restrict by domain

4. **Archive old forms**
   - Keep responses backed up as CSV
   - Download before deleting

5. **Monitor the logs**
   - Check FormImportLog regularly
   - Catch any errors early

---

## 📞 Support Resources

- **Quick Issue?** Check `GOOGLE_FORMS_TROUBLESHOOTING.md`
- **Setup Help?** See `GOOGLE_FORMS_EXTENSION_SETUP.md`
- **Configuration?** Review FORMS_CONFIG in code
- **Still stuck?** Check Apps Script Executions tab for errors

---

## 📋 Checklist Before Going Live

- [ ] Form created at forms.google.com
- [ ] FORM_ID extracted from form URL
- [ ] Tournament system running and API accessible
- [ ] API key obtained from tournament system
- [ ] Tournament ID verified in system
- [ ] Script pasted to Google Apps Script
- [ ] FORMS_CONFIG updated with 4 values
- [ ] setupFormImport() run successfully
- [ ] Triggers visible in ⏱ Triggers icon
- [ ] Test form submission imported successfully
- [ ] FormImportLog shows successful import
- [ ] Tournament system shows test player
- [ ] Form published and ready for users

**All checked? You're ready to go live! 🎉**

---

**Made with ❤️ for tournament organizers**

Last updated: 2025

For latest updates and troubleshooting, check documentation files.
