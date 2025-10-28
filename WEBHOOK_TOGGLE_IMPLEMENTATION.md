# Webhook Toggle Implementation for TD Dashboard

## Overview
Added a toggle switch to the Notification Center in the TD dashboard to enable/disable pairing notification emails.

## What Was Added

### 1. **Updated NotificationButton Component**
- **File:** `client/src/components/NotificationButton.tsx`
- **New Props:**
  - `webhookEnabled?: boolean` - Current state of webhook
  - `onWebhookToggle?: (enabled: boolean) => void` - Callback when toggle is clicked
  - `webhookUrl?: string` - Display the webhook endpoint URL

### 2. **New UI Section**
Located in the modal footer, includes:
- **Toggle Switch** - Enable/Disable pairing notifications
- **Webhook Endpoint Display** - Shows the current webhook URL when enabled
- **Status Indicator** - Green for enabled, gray for disabled
- **Help Text** - Clear description of what the setting does

## Implementation in TournamentDetail.tsx

To use this new toggle in your TD dashboard, update the `NotificationButton` component call:

```tsx
const [webhookEnabled, setWebhookEnabled] = useState(false);
const webhookUrl = 'https://script.google.com/macros/s/AKfycbxHMYoAVrLUpxzwaNMbTlDKusQVvhTvGAmrnDeaftLqhVhGt4rGUddxWxQiDPzqKW0z/exec';

const handleWebhookToggle = async (enabled: boolean) => {
  try {
    // Call API to update tournament webhook setting
    await tournamentApi.updateWebhookSetting(tournamentId, {
      notifications_enabled: enabled,
      webhook_url: webhookUrl
    });
    setWebhookEnabled(enabled);
  } catch (error) {
    console.error('Failed to update webhook setting:', error);
  }
};

// In render:
<NotificationButton
  notifications={notifications}
  webhookEnabled={webhookEnabled}
  onWebhookToggle={handleWebhookToggle}
  webhookUrl={webhookUrl}
  // ... other props
/>
```

## Backend API Endpoint Required

Add this endpoint to your backend to save the webhook setting:

```javascript
// server/routes/tournaments.js
router.patch('/:id/webhook-settings', async (req, res) => {
  const { id } = req.params;
  const { notifications_enabled, webhook_url } = req.body;

  try {
    db.run(
      `UPDATE tournaments 
       SET notifications_enabled = ?, webhook_url = ?
       WHERE id = ?`,
      [notifications_enabled, webhook_url, id],
      (err) => {
        if (err) {
          return res.json({ success: false, error: err.message });
        }
        res.json({ success: true });
      }
    );
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
```

## Database Schema Update

Add columns to the tournaments table:

```sql
ALTER TABLE tournaments ADD COLUMN notifications_enabled BOOLEAN DEFAULT 1;
ALTER TABLE tournaments ADD COLUMN webhook_url TEXT;
```

## How It Works

1. **TD Opens Tournament**
   - Notification Center button shows in dashboard
   
2. **TD Clicks Notification Center**
   - Modal opens showing USCF alerts
   - At the bottom: "Pairing Notifications" section with toggle

3. **TD Toggles On/Off**
   - Webhook is enabled/disabled
   - Webhook URL is displayed when enabled
   - Status updates in real-time

4. **When Generating Pairings**
   - Backend checks if `notifications_enabled` is true
   - If true: Sends webhook to Google Apps Script
   - If false: Skips notification sending

## Webhook Integration

The webhook still sends to:
```
https://script.google.com/macros/s/AKfycbyLjx_xfOs6XNlDmAZHJKobn1MMSgOeRBHJOAS0qNK7HyQEuMm9EdRIxt5f5P6sej-a/exec
```

The backend should check:
```javascript
// In server/routes/pairings.js
if (tournament.notifications_enabled) {
  await sendPairingNotificationWebhook(
    pairings,
    tournament,
    round
  );
}
```

## Features

✅ **Clean Toggle Interface**
- Green when enabled
- Gray when disabled
- Click to toggle instantly

✅ **Visual Feedback**
- Displays webhook URL when active
- Shows status message (Active/Disabled)
- Help text explains the feature

✅ **Easy to Understand**
- Icon + label for clarity
- Integrated into existing notification center
- No separate settings page needed

## Testing

1. **Verify Toggle Display**
   - Open Notification Center
   - Scroll to bottom
   - See "Pairing Notifications" section with toggle

2. **Test Toggle Click**
   - Click toggle button
   - State should update
   - Webhook URL appears/disappears

3. **Test Pairings Generation**
   - With toggle ON: Should send webhook → players get emails
   - With toggle OFF: Should NOT send webhook → no emails

## Files Modified

- `client/src/components/NotificationButton.tsx` - Added webhook toggle UI

## Next Steps

1. Implement backend API endpoint
2. Update database schema
3. Modify pairings generation to check setting
4. Test end-to-end workflow
5. Deploy to production

