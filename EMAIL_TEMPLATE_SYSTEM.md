# Email Template System Documentation

## Overview

The Email Template System provides a comprehensive solution for creating, managing, and sending branded email communications within your chess tournament application. This system supports customizable templates, HTML rendering, and test email functionality.

## Features

### ✨ Core Features

- **Template Management**: Create, edit, and delete email templates
- **Preset Templates**: Quick-start templates for common use cases
- **HTML & Text Support**: Send both HTML and plain-text versions
- **Dynamic Variables**: Use Handlebars syntax for dynamic content ({{variable}})
- **Test Emails**: Send test emails to verify template rendering
- **Email Queue**: Queue emails for batch sending
- **Audit Trail**: Track all sent emails with delivery status

### 🎯 Pre-built Template Types

1. **Pairing Notification** - Send round pairings to players
2. **Round Summary** - Share round results and player standing
3. **Tournament Invitation** - Invite players to participate in tournaments

## Quick Start

### Environment Setup

Add these environment variables to your `.env` file:

```env
# Email Configuration
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_SECURE=false

# Or use Mailtrap for testing
MAILTRAP_USER=your-mailtrap-user
MAILTRAP_PASSWORD=your-mailtrap-password
```

### Installation

1. **Install Dependencies**
   ```bash
   npm install nodemailer handlebars
   ```

2. **Initialize Database Tables**
   The system will automatically create `email_templates` and `email_queue` tables on first run.

3. **Register Routes in Server**
   In your `server/index.js`:
   ```javascript
   const { router: emailTemplatesRouter, setEmailService } = require('./routes/emailTemplates');
   const EmailTemplateService = require('./services/emailTemplateService');
   
   // Initialize email service
   const emailService = new EmailTemplateService(db);
   setEmailService(emailService);
   
   // Mount routes
   app.use('/api/email-templates', emailTemplatesRouter);
   ```

## API Endpoints

### Get Organization Templates
```
GET /api/email-templates/organization/:organizationId
```
Returns all email templates for an organization.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Pairing Notification",
      "subject": "Round {{round}} Pairings",
      "html_template": "<p>Hello {{playerName}},</p>...",
      "variables": ["playerName", "round", "boardNumber"]
    }
  ]
}
```

### Get Single Template
```
GET /api/email-templates/:templateId
```

### Create Template
```
POST /api/email-templates
```

**Request Body:**
```json
{
  "organizationId": "org-id",
  "name": "Pairing Notification",
  "subject": "Round {{round}} Pairings for {{tournamentName}}",
  "htmlTemplate": "<p>Hello {{playerName}},</p>...",
  "textTemplate": "Hello {{playerName}},...",
  "variables": ["playerName", "round", "tournamentName"]
}
```

### Update Template
```
PUT /api/email-templates/:templateId
```

### Delete Template
```
DELETE /api/email-templates/:templateId
```

### Get Preset Templates
```
GET /api/email-templates/presets/list
```
Returns available preset templates.

### Send Test Email
```
POST /api/email-templates/send-test/:templateId
```

**Request Body:**
```json
{
  "recipientEmail": "test@example.com",
  "testVariables": {
    "playerName": "John Doe",
    "round": 1,
    "boardNumber": 5
  }
}
```

## Template Variables

### Available Variables

Variables are defined using Handlebars syntax: `{{variableName}}`

#### Pairing Notification Variables
- `{{playerName}}` - Player's name
- `{{tournamentName}}` - Tournament name
- `{{round}}` - Round number
- `{{boardNumber}}` - Board assignment
- `{{opponentName}}` - Opponent's name
- `{{opponentRating}}` - Opponent's rating
- `{{color}}` - Color assignment (White/Black)
- `{{timeControl}}` - Time control format
- `{{organizationName}}` - Organization name

#### Round Summary Variables
- `{{playerName}}` - Player's name
- `{{tournamentName}}` - Tournament name
- `{{round}}` - Round number
- `{{result}}` - Game result (Win/Loss/Draw)
- `{{score}}` - Player's score
- `{{ratingChange}}` - Rating change (+X or -X)
- `{{tournamentUrl}}` - Link to tournament standings
- `{{organizationName}}` - Organization name

#### Tournament Invitation Variables
- `{{playerName}}` - Player's name
- `{{tournamentName}}` - Tournament name
- `{{startDate}}` - Tournament start date
- `{{endDate}}` - Tournament end date
- `{{timeControl}}` - Time control
- `{{rounds}}` - Number of rounds
- `{{location}}` - Tournament location
- `{{registrationUrl}}` - Registration link
- `{{organizationName}}` - Organization name

## HTML Template Best Practices

### Basic Template Structure

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>{{tournamentName}}</h1>
  
  <p>Hello {{playerName}},</p>
  
  <p>Your pairing for Round {{round}} is:</p>
  
  <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p><strong>Board Number:</strong> {{boardNumber}}</p>
    <p><strong>Opponent:</strong> {{opponentName}} (Rating: {{opponentRating}})</p>
    <p><strong>Color:</strong> {{color}}</p>
  </div>
  
  <p>Good luck!</p>
  
  <p>
    {{organizationName}}<br>
    <a href="https://yourdomain.com" style="color: #0066cc;">Visit Website</a>
  </p>
</div>
```

### Inline Styles

Always use inline styles instead of `<style>` tags for email compatibility:

```html
<div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px;">
  Content here
</div>
```

### Responsive Design

Use inline media query support where possible:

```html
<table width="100%" style="max-width: 600px; margin: 0 auto;">
  <tr>
    <td style="padding: 10px;">Content</td>
  </tr>
</table>
```

### Colors & Branding

Use hex colors for maximum compatibility:

```html
<!-- Good -->
<a href="#" style="background-color: #0066cc; color: #ffffff;">Click Here</a>

<!-- Avoid -->
<a href="#" style="background-color: blue; color: white;">Click Here</a>
```

## Using Email Templates Programmatically

### Backend Usage

```javascript
const EmailTemplateService = require('./services/emailTemplateService');
const emailService = new EmailTemplateService(db);

// Get a template
const template = await emailService.getTemplate(templateId);

// Render with variables
const rendered = emailService.renderTemplate(template, {
  playerName: 'John Doe',
  tournamentName: 'Regional Championship',
  round: 2,
  boardNumber: 5
});

// Send email
await emailService.sendEmail(
  'player@example.com',
  rendered.subject,
  rendered.html,
  rendered.text
);

// Or use pre-made method for templated emails
await emailService.sendTemplatedEmail(
  organizationId,
  'player@example.com',
  'John Doe',
  { templateId: 'template-uuid' },
  {
    playerName: 'John Doe',
    tournamentName: 'Regional Championship',
    round: 2
  }
);
```

### Frontend Usage

```javascript
// Create a template
const response = await fetch('/api/email-templates', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    organizationId: 'org-id',
    name: 'Pairing Notification',
    subject: 'Round {{round}} Pairings',
    htmlTemplate: '<p>Hello {{playerName}},</p>...'
  })
});

// Get all templates
const response = await fetch(`/api/email-templates/organization/${organizationId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Send test email
const response = await fetch(`/api/email-templates/send-test/${templateId}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    recipientEmail: 'test@example.com',
    testVariables: { playerName: 'John Doe' }
  })
});
```

## Frontend Component

### EmailTemplateManager Component

```tsx
import EmailTemplateManager from './components/EmailTemplateManager';

function App() {
  return (
    <EmailTemplateManager 
      organizationId="org-id"
      onClose={() => console.log('closed')}
    />
  );
}
```

**Features:**
- Browse all templates
- Create new templates from scratch or presets
- Edit existing templates
- Delete templates
- Preview template rendering
- Send test emails
- All with beautiful, responsive UI

## Email Queue System

The system maintains an `email_queue` table to track all emails:

```sql
-- Check pending emails
SELECT * FROM email_queue WHERE status = 'pending';

-- Check failed emails
SELECT * FROM email_queue WHERE status = 'failed';

-- Send queued emails
UPDATE email_queue SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
WHERE id = 'email-id';
```

### Email Queue Statuses

- `pending` - Waiting to be sent
- `sent` - Successfully delivered
- `failed` - Failed delivery with error message

## Troubleshooting

### Common Issues

#### "Failed to send email"
- **Solution**: Verify SMTP credentials in `.env`
- Check email service is active
- Test with Mailtrap first

#### "Template not found"
- **Solution**: Verify template ID is correct
- Ensure template belongs to correct organization
- Check database has been initialized

#### "Invalid email format"
- **Solution**: Validate email address format
- Use proper email validation before sending

#### "HTML rendering issues"
- **Solution**: Use inline styles only
- Test email in multiple clients
- Avoid complex CSS

### Testing with Mailtrap

1. Create account at [mailtrap.io](https://mailtrap.io)
2. Get SMTP credentials
3. Configure `.env`:
```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASSWORD=your_password
SMTP_SECURE=false
```
4. Send test emails to see rendering

## Best Practices

### Template Organization

- Use clear, descriptive template names
- Group related templates (e.g., "Pairing - Round Notification", "Pairing - Submission Reminder")
- Add version numbers if iterating: "Pairing Notification v2"

### Email Content

- Keep emails concise and scannable
- Always include a call-to-action link
- Use consistent branding/colors
- Include unsubscribe option for production
- Test across multiple email clients

### Performance

- Queue emails for bulk sending during off-peak hours
- Monitor `email_queue` table for failed emails
- Archive old queue records periodically
- Set reasonable batch limits (50-100 per cycle)

### Security

- Never hardcode SMTP credentials
- Use environment variables
- Validate all email addresses
- Sanitize user input in templates
- Use HTTPS for template preview links

## Advanced Usage

### Batch Email Sending

```javascript
// Send queued emails
const results = await emailService.sendQueuedEmails(100);

// Process results
results.forEach(result => {
  if (result.status === 'sent') {
    console.log(`Email ${result.id} sent successfully`);
  } else {
    console.error(`Email ${result.id} failed: ${result.error}`);
  }
});
```

### Custom Template Development

Create custom templates with Handlebars helpers:

```javascript
const Handlebars = require('handlebars');

// Register custom helper
Handlebars.registerHelper('uppercase', function(text) {
  return text.toUpperCase();
});

// Use in template
// Hello {{uppercase playerName}}!
```

### Integration with Tournament Flow

```javascript
// After generating pairings
const pairings = await getPairingForRound(tournamentId, round);

// Queue emails for all players
for (const pairing of pairings) {
  await emailService.queueEmail(organizationId, {
    templateId: 'pairing-template-id',
    recipientEmail: pairing.player.email,
    recipientName: pairing.player.name,
    variables: {
      playerName: pairing.player.name,
      tournamentName: tournament.name,
      round: round,
      boardNumber: pairing.board,
      opponentName: pairing.opponent.name,
      opponentRating: pairing.opponent.rating,
      color: pairing.color,
      timeControl: tournament.timeControl
    }
  });
}

// Send all queued emails
const results = await emailService.sendQueuedEmails();
```

## Additional Features

### SMS Notifications (Future)

Similar structure can be adapted for SMS with:
- SMS template manager
- Phone number validation
- SMS gateway integration (Twilio, etc.)

### Digest Emails (Future)

Create summary emails with:
- Weekly tournament summaries
- Player performance reports
- Standings updates
- Upcoming events

### Calendar Integration (ICS)

Generate `.ics` files for calendar invitations:
- Tournament date/time
- Venue information
- Round schedule

## Support & Troubleshooting

For issues or questions:
1. Check error messages in server logs
2. Verify database has email_templates table
3. Test with simple template first
4. Use Mailtrap for debugging email rendering
5. Review environment variables

---

**Version:** 1.0  
**Last Updated:** October 2025  
**Status:** Production Ready
