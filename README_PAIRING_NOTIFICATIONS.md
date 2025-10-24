# 📧 Pairing Notification System - Complete Guide

**Get automatic email notifications when tournament pairings are generated!**

---

## 🚀 Quick Start (Choose Your Level)

### ⚡ Super Quick (5 minutes)
👉 Start here if you just want to get it working fast:
- Go to: **GET_WEBHOOK_URL.md**
- Follow the 6 steps
- Done! ✅

### 📖 Comprehensive Setup (15 minutes)
👉 For detailed setup with customization:
- Go to: **WEBHOOK_QUICK_START.md**
- Follow the 3 main steps
- Customize recipients and email template
- Test it works

### 🔧 Advanced Configuration (30+ minutes)
👉 For power users and complex setups:
- Go to: **PAIRING_NOTIFICATION_SETUP.md**
- Learn all configuration options
- Set up with Google Sheets
- Customize email templates
- Advanced troubleshooting

---

## 📚 Documentation Files

| File | Purpose | Time |
|------|---------|------|
| **GET_WEBHOOK_URL.md** | Step-by-step to get your webhook URL | 5 min |
| **WEBHOOK_QUICK_START.md** | Quick 3-step setup guide | 15 min |
| **PAIRING_NOTIFICATION_SETUP.md** | Complete detailed guide | 30+ min |
| **NOTIFICATION_SYSTEM_SUMMARY.md** | Technical overview | 10 min |

---

## 🎯 What This System Does

When you generate tournament pairings, emails are **automatically sent** to:
- ✅ Tournament directors
- ✅ Players in the round (optional)
- ✅ Custom recipient lists
- ✅ Email archives (optional)

### Email Contents
- Tournament name and details
- Round number
- All pairings organized by board
- Player names and ratings
- Section information
- Professional HTML formatting
- Plain text version for all email clients

---

## 🏗️ System Architecture

```
Your Tournament System
    ↓ (generates pairings)
Backend Server (pairings.js)
    ↓ (sends webhook POST)
Google Apps Script
    ↓ (builds emails)
Gmail / Email Provider
    ↓ (sends)
Tournament Directors & Players 📨
```

---

## ⚙️ Configuration Options

### Recipients
```javascript
// Option 1: Directors only
SEND_TO_ROUND_PARTICIPANTS: false
DEFAULT_RECIPIENTS: ['td@example.com']

// Option 2: Directors + Players
SEND_TO_ROUND_PARTICIPANTS: true
DEFAULT_RECIPIENTS: ['td@example.com']

// Option 3: From Google Sheet
SHEET_ID: 'your-sheet-id'
```

### Email Template
```javascript
SUBJECT_TEMPLATE: 'Round {round} Pairings - {tournamentName}'
CC_EMAILS: []
BCC_EMAILS: []
```

---

## 🧪 Testing

### Quick Test (no pairings needed)
1. Open your Google Apps Script
2. Select `testSendEmail()` function
3. Click Run button
4. Check your email

### Full Test (with real pairings)
```bash
curl -X POST http://localhost:5000/api/pairings/generate/section \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "test-tournament",
    "round": 1,
    "sectionName": "Open"
  }'
```

---

## 📝 Implementation Files

### Created
- `google-apps-script-pairings.gs` - Google Apps Script (copy this)
- `GET_WEBHOOK_URL.md` - Get webhook URL steps
- `WEBHOOK_QUICK_START.md` - Quick start guide
- `PAIRING_NOTIFICATION_SETUP.md` - Full documentation
- `NOTIFICATION_SYSTEM_SUMMARY.md` - Technical overview

### Modified
- `server/routes/pairings.js` - Added webhook integration

---

## 🔑 Environment Variables

```bash
# Required
PAIRING_NOTIFICATION_WEBHOOK=https://script.google.com/macros/d/.../usercontent
```

That's the only one needed! Everything else is configured in the Google Apps Script.

---

## ✨ Features

- ✅ Automatic notifications on pairing generation
- ✅ Beautiful HTML emails
- ✅ Multiple recipient options
- ✅ Google Sheet integration
- ✅ Easy customization
- ✅ Logging to sheets
- ✅ Non-blocking (doesn't delay pairing generation)
- ✅ Error handling and retry logic
- ✅ Plain text email fallback
- ✅ Section support

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Emails not sending | Check Google Apps Script execution log |
| Wrong recipients | Verify CONFIG in Apps Script |
| Webhook not received | Check environment variable is set |
| Spam folder | Check email domain reputation |
| Authorization error | Re-authorize Apps Script |

See **PAIRING_NOTIFICATION_SETUP.md** for detailed troubleshooting.

---

## 📊 Webhook Payload

When pairings are generated, this JSON is sent:

```json
{
  "event": "pairings_generated",
  "tournament": {
    "id": "tournament-123",
    "name": "Spring Tournament",
    "format": "swiss",
    "rounds": 5
  },
  "round": 1,
  "pairings": [
    {
      "board": 1,
      "white": {"id": "p1", "name": "Alice", "rating": 1850},
      "black": {"id": "p2", "name": "Bob", "rating": 1820},
      "section": "Open"
    }
  ]
}
```

---

## 🎓 Learning Path

1. **First Time?** → Start with **GET_WEBHOOK_URL.md** (5 min)
2. **Want Details?** → Read **WEBHOOK_QUICK_START.md** (15 min)
3. **Power User?** → Study **PAIRING_NOTIFICATION_SETUP.md** (30 min)
4. **Technical?** → Check **NOTIFICATION_SYSTEM_SUMMARY.md**

---

## 🤔 Frequently Asked Questions

### Can I customize the email?
Yes! Edit `buildEmailContent()` in Google Apps Script

### Can I add more recipients?
Yes! Update `DEFAULT_RECIPIENTS` array

### Can I email only directors?
Yes! Set `SEND_TO_ROUND_PARTICIPANTS: false`

### Can I use a different email provider?
Yes! Modify the email sending section in Apps Script

### Is it secure?
Yes! The webhook URL is randomly generated and Google-secured

### Does it slow down pairing generation?
No! It's asynchronous and non-blocking

### Can I test without real pairings?
Yes! Use `testSendEmail()` function

---

## 📞 Support

1. ✅ Check the appropriate documentation file
2. ✅ Review Google Apps Script execution logs
3. ✅ Run `testSendEmail()` to verify it works
4. ✅ Check backend logs: `grep webhook server.log`
5. ✅ Verify email addresses are valid

---

## 🎉 Ready to Start?

### Choose your path:

**I want it NOW** (5 min)
→ Open **GET_WEBHOOK_URL.md**

**I want to understand it** (15 min)
→ Open **WEBHOOK_QUICK_START.md**

**I need everything explained** (30+ min)
→ Open **PAIRING_NOTIFICATION_SETUP.md**

---

## 📋 Checklist to Deploy

- [ ] Read GET_WEBHOOK_URL.md or WEBHOOK_QUICK_START.md
- [ ] Create Google Apps Script project
- [ ] Paste code from google-apps-script-pairings.gs
- [ ] Deploy as Web app
- [ ] Copy webhook URL
- [ ] Set PAIRING_NOTIFICATION_WEBHOOK environment variable
- [ ] Configure recipients in CONFIG
- [ ] Test with testSendEmail()
- [ ] Generate pairings and verify email received
- [ ] Customize email template (optional)
- [ ] Deploy to production

---

**Status**: ✅ Ready to deploy

All components are integrated and tested. Choose your setup guide above and get started!

---

*Last updated: October 24, 2024*
*Part of Chess Tournament Director System*
