# Google Forms Extension - Setup Guide

## Overview

This extension automatically captures responses from your Google Form and imports them into your tournament system. Once set up, all new form submissions will be automatically imported as players.

## Features

✅ **Real-time Import** - Players imported immediately upon form submission  
✅ **Batch Processing** - Periodic checks for missed responses  
✅ **Smart Field Detection** - Automatically maps form questions to player fields  
✅ **Automatic Confirmation** - Optional email confirmations to registered players  
✅ **Import Logging** - Track all imports with timestamps and status  
✅ **Error Handling** - Detailed error logging for troubleshooting  

---

## Step 1: Create Your Google Form

### 1.1 Create a New Form
1. Go to [forms.google.com](https://forms.google.com)
2. Click **"+ Create new form"** (Blank template)
3. Give your form a title (e.g., "Chess Tournament Registration")

### 1.2 Add Form Questions

The system will automatically detect these field names. Add questions with titles containing these keywords:

**Required:**
- **Player Name** (e.g., "What is your name?", "Player Name")

**Recommended:**
- **USCF ID** (e.g., "USCF Member ID", "Member Number")
- **Rating** (e.g., "Current Chess Rating", "USCF Rating")
- **Email** (e.g., "Email Address", "Contact Email")

**Optional Fields:**
- **Section/Division** - Tournament section preference
- **School** - School or institution
- **Grade** - Grade level
- **Phone** - Contact phone number
- **State/City** - Location
- **Team/Club** - Team or club name
- **Parent Name/Email/Phone** - For junior players
- **Notes** - Additional information

### 1.3 Example Form Setup

```
Question 1: Player's Full Name (Short Answer)
Question 2: USCF Member ID (Short Answer)
Question 3: Current Chess Rating (Short Answer)
Question 4: Email Address (Short Answer)
Question 5: Phone Number (Short Answer)
Question 6: School (Short Answer)
Question 7: Grade/Year (Short Answer)
Question 8: Tournament Section (Multiple Choice)
  - Option: Beginner
  - Option: Intermediate
  - Option: Advanced
Question 9: Any Special Notes? (Long Answer - Optional)
```

---

## Step 2: Set Up the Google Apps Script

### 2.1 Copy the Extension Code

1. Get your form's ID from the URL:
   - Form URL: `https://forms.google.com/u/1/d/YOUR_FORM_ID/edit`
   - Copy the `YOUR_FORM_ID` part

2. Create a Google Sheet to host the script:
   - Go to [sheets.google.com](https://sheets.google.com)
   - Create a new spreadsheet (or use existing)
   - Note: The script needs to be attached to a Sheet, not directly to the Form

### 2.2 Add the Extension Script

1. In your Google Sheet, click **"Extensions"** > **"Apps Script"**
2. Delete the default code
3. Copy and paste the entire content from `google-apps-script.js` in this repo
4. Save the script (Ctrl+S or Cmd+S)

### 2.3 Configure the Extension

In the script editor, update the `FORMS_CONFIG` section:

```javascript
const FORMS_CONFIG = {
  ENABLE_FORM_IMPORT: true,  // Set to true to enable
  FORM_ID: '1FAIpQLSfXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',  // Your form ID
  API_BASE_URL: 'https://your-tournament-system.com',   // Your API URL
  API_KEY: 'your-api-key-here',                         // Your API key
  TOURNAMENT_ID: 'tournament-123',                      // Tournament ID
  CHECK_INTERVAL: 5,                                    // Check every 5 minutes
  RESPONSE_LIMIT: 100
};
```

---

## Step 3: Set Up Triggers

### 3.1 Initialize the Setup

1. In the Apps Script editor, select `setupFormImport` from the dropdown
2. Click the **▶ Run** button
3. Authorize the script when prompted (click "Review permissions" → "Allow")

### 3.2 Verify Triggers

1. Click the **⏱ Triggers** icon on the left sidebar
2. You should see two new triggers:
   - `onFormSubmit` - Triggered on form submission
   - `checkFormResponses` - Triggered every 5 minutes

If you don't see triggers, run `setupFormImport()` again.

---

## Step 4: Test the Integration

### 4.1 Test with a Sample Response

1. Go to your Google Form
2. Fill it out and submit it
3. Wait up to 1 minute for processing

### 4.2 Check the Import Log

1. Go back to your Google Sheet
2. Click on the **"FormImportLog"** tab
3. You should see a log entry with "Single Form Response: [Player Name]"

### 4.3 Verify in Tournament System

1. Log into your tournament management system
2. Open the tournament
3. Check the players list
4. The player from the form should appear

---

## Configuration Reference

### FORMS_CONFIG Options

| Option | Type | Description | Required |
|--------|------|-------------|----------|
| ENABLE_FORM_IMPORT | Boolean | Enable/disable form import | Yes |
| FORM_ID | String | Your Google Form ID | Yes |
| API_BASE_URL | String | Tournament system API URL | Yes |
| API_KEY | String | API key for authentication | Yes |
| TOURNAMENT_ID | String | Target tournament ID | Yes |
| CHECK_INTERVAL | Number | Minutes between automatic checks | No |
| RESPONSE_LIMIT | Number | Max responses per import | No |

### Supported Form Field Names

The extension automatically detects these question titles:

**Name Fields**
- name, player name, full name, player's name, what is your name

**USCF ID**
- uscf id, uscf_id, uscf, member id, member_id, membership, member number

**Rating**
- rating, uscf rating, current rating, chess rating, elo rating, elo

**Email**
- email, email address, e-mail, contact email, email addr

**Phone**
- phone, phone number, telephone, phone num, contact phone, mobile

**School**
- school, institution, university, college, academy, school name

**Grade**
- grade, year, class year, school year, academic year, grade level

**Location**
- city (city, city/town, town, location)
- state (state, state/province, province, region, state/prov)

**Team**
- team, team name, team_name, club, club name, organization

**Parent/Guardian**
- parent name, guardian name, parent, guardian
- parent email, guardian email, parent contact email
- parent phone, guardian phone, emergency contact

---

## Usage Guide

### Manual Import

To manually import pending form responses:

1. In Google Apps Script, select `checkFormResponses`
2. Click **▶ Run**
3. Check the FormImportLog for results

### Monitor Imports

1. Go to the **FormImportLog** sheet in your Google Sheet
2. View all import attempts with timestamps
3. Check Status column for Success/Failure
4. View Error column for any issues

### Troubleshooting

#### Issue: "Form ID not found"
- Verify your FORM_ID is correct
- Ensure the form URL is: `https://forms.google.com/u/1/d/FORM_ID/edit`
- Double-check for extra spaces

#### Issue: "API Key Invalid"
- Verify the API key in FORMS_CONFIG
- Check your tournament system settings for the correct key
- Use "demo-key-123" for testing

#### Issue: "Tournament ID not found"
- Verify the tournament ID exists in your system
- Check spelling (case-sensitive)
- Ensure you have access to the tournament

#### Issue: Imports not working
- Check the FormImportLog for error messages
- Open Apps Script and check Executions tab for errors
- Try running `testConnection()` manually
- Verify API_BASE_URL includes http:// or https://

### View Detailed Logs

1. In Apps Script, click **Executions** (⏱ icon on left)
2. Find the execution with the error
3. Click to expand and see detailed error message

---

## Advanced Configuration

### Custom Field Mapping

To add custom field mapping, modify `convertFormResponseToPlayer()`:

```javascript
// In convertFormResponseToPlayer(), add:
if (question.includes('your-custom-field')) {
  player.custom_field = answer;
}
```

### Disable Confirmation Emails

To disable automatic confirmation emails:

```javascript
// In onFormSubmit(), comment out:
// if (player.email) {
//   sendConfirmationEmail(player.email, player.name);
// }
```

### Change Check Interval

Update `CHECK_INTERVAL` in FORMS_CONFIG (in minutes):

```javascript
CHECK_INTERVAL: 10  // Check every 10 minutes instead of 5
```

---

## API Integration Details

### What Gets Sent to Tournament System

When a form response is imported, this data is sent:

```json
{
  "api_key": "your-api-key",
  "players": [
    {
      "name": "John Doe",
      "uscf_id": "12345678",
      "rating": 1850,
      "email": "john@example.com",
      "phone": "+1-555-0123",
      "school": "High School",
      "section": "Advanced",
      "notes": "Any special info"
    }
  ],
  "lookup_ratings": true,
  "auto_assign_sections": true,
  "source": "google_forms"
}
```

### Response Handling

The system will respond with:

```json
{
  "success": true,
  "message": "Successfully imported 1 player",
  "data": {
    "imported_count": 1,
    "players": [
      {
        "id": "player-123",
        "name": "John Doe",
        "rating": 1850
      }
    ]
  }
}
```

---

## Security Considerations

1. **Keep API Key Secure**
   - Never share your API key
   - Don't commit it to version control
   - Use environment variables in production

2. **Form Privacy**
   - Consider limiting form access to specific people
   - Google Forms can be restricted to specific domains

3. **Data Storage**
   - Form responses are stored in your Google Drive
   - Consider archiving old forms periodically

---

## Frequently Asked Questions

**Q: How often are responses imported?**
A: Real-time on submission + periodic checks every 5 minutes (configurable)

**Q: Can I modify the form after setup?**
A: Yes! Add/remove/rename questions anytime. The script auto-detects field names.

**Q: What if a field doesn't get imported?**
A: Check that the question title contains the field keyword. The system is case-insensitive.

**Q: Can I import multiple tournaments?**
A: Create a separate script/sheet configuration for each tournament.

**Q: Does the script store personal data?**
A: No, data flows directly to your tournament system. Only import logs are stored locally.

**Q: Can I disable automatic imports?**
A: Yes, set `ENABLE_FORM_IMPORT: false` or set up manual checking only.

---

## Support

For issues or questions:

1. Check the FormImportLog for error details
2. Review Apps Script executions for stack traces
3. Verify all configuration settings
4. Test with the demo API key first
5. Contact your tournament system administrator

---

## Next Steps

1. ✅ Create your Google Form
2. ✅ Set up the Apps Script
3. ✅ Configure FORMS_CONFIG
4. ✅ Run setupFormImport()
5. ✅ Test with a sample response
6. ✅ Start accepting registrations!

**Your form is now live and will automatically import responses!**
