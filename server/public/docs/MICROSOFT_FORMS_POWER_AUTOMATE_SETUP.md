# Microsoft Forms → Chess Tournament API Sync

## Overview

Microsoft Forms cannot execute custom scripts the way Google Apps Script does.  
To sync form submissions to the tournament system, create a **Power Automate** flow that:

1. Listens for new Microsoft Forms responses.  
2. Retrieves the full response payload.  
3. Reshapes the data into the tournament API format (including combining first/last name).  
4. Calls the chess tournament API with an `HTTP` action.  
5. Optionally sends a confirmation email through Office 365 Outlook or Gmail.

## Prerequisites

- Microsoft 365 account with access to **Forms** and **Power Automate**.  
- Tournament API endpoint and credentials:
  - Base URL: `https://chess-tournament-director-6ce5e76147d7.herokuapp.com`
  - Tournament ID: `0d40d92c-ed28-44df-aa91-f2e992e89d86`
  - API key: `demo-key-123` (replace in production)

## Step‑By‑Step Flow Setup

### 1. Create an Automated Cloud Flow

- Browse to [Power Automate](https://flow.microsoft.com).  
- Select **+ Create → Automated cloud flow**.  
- Name the flow (e.g., “Chess Tournament API Sync”).  
- Choose the trigger **When a new response is submitted (Microsoft Forms)**.

### 2. Configure the Form Trigger

- **Trigger:** When a new response is submitted (Microsoft Forms).  
- **Form Id:** Pick the tournament registration form from the dropdown.

### 3. Get Response Details

- Add a new step **Get response details (Microsoft Forms)**.  
- **Form Id:** Same form as the trigger.  
- **Response Id:** Select **List of response notifications Response Id** from dynamic content.

### 4. Map Fields with Data Operation – Compose

Power Automate does not support the fuzzy field-matching JavaScript logic.  
Use a **Compose** action to build the JSON payload the API expects.

- Add **Data Operations → Compose**.  
- In **Inputs**, paste the JSON template below and replace each dynamic content token with your form’s response fields.

```jsonc
{
  "name": "@{trim(concat(outputs('Get_response_details')?['body/rFirstNameId'], ' ', outputs('Get_response_details')?['body/rLastNameId']))}",
  "uscf_id": "@{outputs('Get_response_details')?['body/rUSCFId']}",
  "fide_id": "@{outputs('Get_response_details')?['body/rFIDEId']}",
  "rating": @{if(empty(outputs('Get_response_details')?['body/rRatingId']), null, float(outputs('Get_response_details')?['body/rRatingId']))},
  "email": "@{outputs('Get_response_details')?['body/rEmailId']}",
  "phone": "@{outputs('Get_response_details')?['body/rPhoneId']}",
  "section": "@{outputs('Get_response_details')?['body/rSectionId']}",
  "team_name": "@{outputs('Get_response_details')?['body/rTeamId']}",
  "parent_name": "@{outputs('Get_response_details')?['body/rParentNameId']}",
  "parent_email": "@{outputs('Get_response_details')?['body/rParentEmailId']}",
  "parent_phone": "@{outputs('Get_response_details')?['body/rParentPhoneId']}",
  "notes": "@{outputs('Get_response_details')?['body/rNotesId']}"
}
```

> The placeholders such as `rFirstNameId` represent the field IDs created when you insert dynamic content (e.g., “Player First Name”).  
> Use `concat()` for first + last name and `float()` for numeric conversions.

### 5. Call the Tournament API

- Add **Built-in → HTTP** action.  
- **Method:** `POST`  
- **URI:** `https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/players/api-import/0d40d92c-ed28-44df-aa91-f2e992e89d86`  
- **Headers:**  
  - `Content-Type: application/json`
- **Body:**

```json
{
  "api_key": "demo-key-123",
  "players": [
    @{outputs('Compose')}
  ],
  "lookup_ratings": true,
  "auto_assign_sections": true,
  "source": "microsoft_forms"
}
```

### 6. Send Confirmation Email (Optional)

- Add **Office 365 Outlook → Send an email (V2)** (or Gmail equivalent).  
- **To:** Select the registrant’s email from dynamic content.  
- **Subject:** `Registration Confirmation - ${TournamentName}`  
- **Body:** Use HTML or text with dynamic fields (e.g., `Dear @{outputs('Compose')?['name']}`).

## Tips & Tricks

- **Dynamic IDs:** Always insert fields via Dynamic Content; Power Automate auto-generates the internal IDs.  
- **Validation:** Use `if(empty(...))` or `coalesce(...)` to provide defaults and avoid null errors.  
- **Testing:** Run the flow manually with an existing response before going live.  
- **Error Handling:** Add **Configure run after** branches to capture failed HTTP calls and alert the organizer.

## Comparison with Google Apps Script

- **Execution:** Power Automate runs in Microsoft’s cloud, not inside the form.  
- **Mapping:** Manual JSON mapping replaces JavaScript’s `calculateFieldScore`.  
- **API Request:** Power Automate HTTP action mirrors `UrlFetchApp.fetch`.  
- **Emails:** Use Outlook connector instead of `GmailApp.sendEmail`.  
- **Name Handling:** Power Automate `concat()` expressions replicate the first/last name merge logic.

## Next Steps

1. Build and test the flow in Power Automate.  
2. Submit a sample Microsoft Forms response.  
3. Confirm the player appears in the tournament system.  
4. Monitor the flow run history for failures or retries.

## Integration Guides for Other Form Services
- **Typeform**: Use Typeform's native webhooks to POST submissions to the `universal_webhook_processor` endpoint, mapping question labels to tournament fields. Configure the webhook URL under Typeform's "Connect" panel.
- **Jotform**: In Jotform, go to Settings → Integrations → Webhooks and add your server URL; Jotform sends URL-encoded data that the processor handles automatically.
- **Wufoo**: Enable Webhooks from Form Manager → Notifications, sending JSON payloads to the `/submit` endpoint; ensure HTTPS if you expose the server publicly.
- **Formstack**: Create a REST hook (Settings → Integrations → Webhooks) pointing to your processor; use the field mapping table to align label names with expected player attributes.
- **Cognito Forms**: Under Form Settings → Submissions, add a webhook and specify JSON format; include name and rating fields so the processor can map them correctly.
