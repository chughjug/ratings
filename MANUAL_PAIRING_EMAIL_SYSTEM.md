# Manual Pairing Email System

## Overview
Changed the pairing notification system from automatic to manual. Emails are now sent **only when the TD clicks a button**, not automatically when pairings are generated.

## What Changed

### 1. Toggle Defaults to OFF
- Notification Center toggle now defaults to disabled
- No emails sent unless explicitly enabled

### 2. Manual "Send Emails" Button
- New button appears on the pairing generation page when enabled
- TD can send emails on demand for each round
- Confirmation dialog before sending

## How It Works

### Step 1: Enable in Notification Center
1. TD opens Tournament Detail page
2. Clicks "Notifications" button (top right)
3. Scrolls to "Pairing Notifications" section
4. Toggles "Email Pairing Notifications" to **Enabled**

### Step 2: Generate Pairings
1. TD goes to Pairings tab
2. Generates pairings for a round (as normal)
3. Pairings are stored but NO emails sent yet

### Step 3: Send Emails Manually
1. "Send Pairing Emails" button appears below pairings
2. TD reviews the pairings first
3. Clicks "Send Pairing Emails" button
4. Confirmation dialog shows:
   - Number of players who will receive emails
   - Round number
   - Message about personalization
5. TD confirms or cancels
6. Emails are sent to all players with pairings

## Components

### SendPairingEmailsButton.tsx
New component for the pairing page button.

**Props:**
```tsx
{
  tournamentId: string;        // Tournament ID
  round: number;               // Current round number
  pairingsCount: number;       // Number of pairings
  webhookUrl: string;          // Google Apps Script webhook URL
  isEnabled: boolean;          // Is email feature enabled?
  onSuccess?: () => void;      // Callback on success
  onError?: (error: string) => void; // Callback on error
}
```

**Features:**
- ✅ Hidden if email feature is disabled
- ✅ Disabled if no pairings exist
- ✅ Confirmation dialog before sending
- ✅ Success/error messages
- ✅ Loading indicator during send

### NotificationButton.tsx (Updated)
Updated the toggle description and status messages.

**Changes:**
- Description: "Enable manual email sending on the pairing generation page"
- Status message when enabled: "A 'Send Emails' button will appear on the pairing generation page"
- Status message when disabled: "Enable to add a 'Send Emails' button to the pairing page"

## Integration Steps

### 1. Add Button to Pairing Page
In `TournamentDetail.tsx`, add the button near pairings display:

```tsx
import SendPairingEmailsButton from '../components/SendPairingEmailsButton';

// In the pairings section:
<SendPairingEmailsButton
  tournamentId={id!}
  round={currentRound}
  pairingsCount={pairings.length}
  webhookUrl="https://script.google.com/macros/s/AKfycbyLjx_xfOs6XNlDmAZHJKobn1MMSgOeRBHJOAS0qNK7HyQEuMm9EdRIxt5f5P6sej-a/exec"
  isEnabled={emailsEnabled}
  onSuccess={() => {
    // Optional: Show success message
    console.log('Emails sent successfully');
  }}
  onError={(error) => {
    // Optional: Show error message
    console.error('Failed to send emails:', error);
  }}
/>
```

### 2. Add State for Email Status
```tsx
const [emailsEnabled, setEmailsEnabled] = useState(false);

// Load from tournament settings when fetching tournament:
useEffect(() => {
  // Fetch from backend if you store this in database
  setEmailsEnabled(tournament?.notifications_enabled || false);
}, [tournament]);
```

### 3. Update NotificationButton Call
```tsx
<NotificationButton
  notifications={notifications}
  webhookEnabled={emailsEnabled}
  onWebhookToggle={(enabled) => {
    setEmailsEnabled(enabled);
    // Call API to save setting
    tournamentApi.updateWebhookSetting(id, { notifications_enabled: enabled });
  }}
  webhookUrl="https://script.google.com/macros/s/AKfycbyLjx_xfOs6XNlDmAZHJKobn1MMSgOeRBHJOAS0qNK7HyQEuMm9EdRIxt5f5P6sej-a/exec"
  // ... other props
/>
```

## User Experience Flow

```
TD Dashboard
    ↓
Click Notifications Button
    ↓
[Notification Center Modal]
    ↓
Scroll to Pairing Notifications
    ↓
Toggle: "Disabled" → "Enabled"
    ↓
Close Modal & Go to Pairings Tab
    ↓
Generate Pairings for Round 1
    ↓
[Pairings display with button]:
    ┌─────────────────────────────┐
    │ Pairings for Round 1        │
    │ [List of pairings]          │
    │                             │
    │ [Send Pairing Emails] ← NEW │
    └─────────────────────────────┘
    ↓
TD Reviews Pairings
    ↓
Click [Send Pairing Emails]
    ↓
[Confirmation Dialog]
    "Send personalized emails to 20 players for Round 1?"
    [Cancel] [Send Emails]
    ↓
Success Message
    "Emails Sent Successfully!
     20 players will receive their pairings for Round 1."
    ↓
Players receive emails with:
  • Their board number
  • Their color (White/Black)
  • Opponent name and rating
  • Instructions
```

## API Requirements

### Fetch Pairings
The button fetches pairings via:
```
GET /api/tournaments/{tournamentId}/pairings?round={round}
```

Response format:
```json
{
  "success": true,
  "data": [
    {
      "board": 1,
      "white": { "id": "p1", "name": "Alice", "rating": 1850, "email": "alice@example.com" },
      "black": { "id": "p2", "name": "Bob", "rating": 1800, "email": "bob@example.com" },
      "section": "Open"
    }
  ]
}
```

### Send Webhook
The button sends POST to Google Apps Script:
```
POST https://script.google.com/macros/s/AKfycbyLjx_.../exec
Content-Type: application/json

{
  "event": "pairings_generated",
  "tournament": { "id": "...", "name": "...", "format": "swiss", "rounds": 5 },
  "round": 1,
  "pairings": [{ board, white, black, section }, ...],
  "timestamp": "2024-..."
}
```

## Benefits

✅ **Full Control** - TD decides when to send emails, not automatic
✅ **Review First** - TD can check pairings before emailing players
✅ **No Mistakes** - Confirmation dialog prevents accidental sending
✅ **Easy to Use** - Single button click to send all emails
✅ **Better UX** - Clear success/error messages
✅ **Flexible** - Can resend if needed (just click again)

## Webhook Configuration

**Current Webhook URL:**
```
https://script.google.com/macros/s/AKfycbyLjx_xfOs6XNlDmAZHJKobn1MMSgOeRBHJOAS0qNK7HyQEuMm9EdRIxt5f5P6sej-a/exec
```

This uses the simplified Google Apps Script that:
- Receives POST requests from the button
- Sends personalized emails to each player
- Returns success/error status

## Files Modified/Created

**Created:**
- `client/src/components/SendPairingEmailsButton.tsx` - The manual send button component

**Updated:**
- `client/src/components/NotificationButton.tsx` - Updated descriptions for manual workflow

**To Update:**
- `client/src/pages/TournamentDetail.tsx` - Add button to pairing section

## Database Schema (Optional)

If you want to persist the toggle state:

```sql
ALTER TABLE tournaments ADD COLUMN notifications_enabled BOOLEAN DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN webhook_url TEXT;
```

Then load/save this in TournamentDetail.tsx.

## Testing Checklist

- [ ] Toggle defaults to OFF
- [ ] Button doesn't appear when toggle is OFF
- [ ] Button appears when toggle is ON
- [ ] Button is disabled if no pairings exist
- [ ] Clicking button shows confirmation dialog
- [ ] Confirmation shows correct player count and round
- [ ] Canceling the dialog doesn't send emails
- [ ] Confirming sends emails successfully
- [ ] Success message appears after sending
- [ ] Error message appears if sending fails
- [ ] Players receive personalized emails with correct pairings
- [ ] Each player only sees their own pairing

