# Microsoft Forms → Chess Tournament API Sync

> **TL;DR**  
> Build a Power Automate flow that watches Microsoft Forms submissions, reshapes the payload with a Compose action, delivers it to the tournament `api-import` endpoint, and optionally fans the data out to confirmations, webhooks, and auditing stores.

---

## Quick Start Checklist

- [ ] Create an automated cloud flow using the Forms trigger.  
- [ ] Pull full submission details with **Get response details**.  
- [ ] Normalize fields with a **Compose** JSON template.  
- [ ] POST the payload to `/api/players/api-import/{tournamentId}` with your API key.  
- [ ] (Optional) Notify the player and archive the payload via webhook for analytics.

---

## System Architecture

```
Microsoft Forms  →  Power Automate Flow  →  Chess Tournament API
                          │
                          ├─ Optional: Confirmation Email
                          └─ Optional: Custom Webhook (CRM, Airtable, Datadog, etc.)
```

---

## Prerequisites

| Requirement | Description |
| --- | --- |
| Microsoft 365 | Access to Microsoft Forms + Power Automate. |
| Tournament Credentials | Base URL `https://chess-tournament-director-6ce5e76147d7.herokuapp.com`, Tournament ID `0d40d92c-ed28-44df-aa91-f2e992e89d86`, API key `demo-key-123` (replace in production). |
| Field Mapping Plan | Know which form questions map to player attributes (name, ratings, section, contacts, notes). |
| Optional Webhook Endpoint | HTTPS endpoint capable of accepting JSON POSTs if you want to forward submissions elsewhere. |

---

## Power Automate Flow Blueprint

### 1. Automated Cloud Flow

1. Navigate to [Power Automate](https://flow.microsoft.com) → **+ Create → Automated cloud flow**.  
2. Name it something memorable (e.g., `Chess Tournament API Sync`).  
3. Select **When a new response is submitted (Microsoft Forms)** as the trigger.

### 2. Trigger Configuration

- **Form Id:** Choose the registration form from the dropdown.  
- **Concurrency:** If you expect bursts of signups, enable concurrency control (e.g., max 5) in the trigger’s settings to avoid API spikes.

### 3. Get Response Details

- Add **Microsoft Forms → Get response details**.  
- **Form Id:** Same as the trigger.  
- **Response Id:** Choose **List of response notifications Response Id** from dynamic content.  
- _Tip_: Rename the action (e.g., `Get_Response_Details`) to make expressions cleaner.

### 4. Compose the Tournament Payload

Add **Data Operations → Compose** and paste the JSON template below. Replace each placeholder (`rFirstNameId`, etc.) by inserting the matching field via Dynamic Content. Keep the quotes around string expressions.

```jsonc
{
  "name": "@{trim(concat(outputs('Get_Response_Details')?['body/rFirstNameId'], ' ', outputs('Get_Response_Details')?['body/rLastNameId']))}",
  "uscf_id": "@{coalesce(outputs('Get_Response_Details')?['body/rUSCFId'], '')}",
  "fide_id": "@{coalesce(outputs('Get_Response_Details')?['body/rFIDEId'], '')}",
  "rating": @{if(empty(outputs('Get_Response_Details')?['body/rRatingId']), null, float(outputs('Get_Response_Details')?['body/rRatingId']))},
  "email": "@{outputs('Get_Response_Details')?['body/rEmailId']}",
  "phone": "@{outputs('Get_Response_Details')?['body/rPhoneId']}",
  "section": "@{outputs('Get_Response_Details')?['body/rSectionId']}",
  "team_name": "@{outputs('Get_Response_Details')?['body/rTeamId']}",
  "parent_name": "@{outputs('Get_Response_Details')?['body/rParentNameId']}",
  "parent_email": "@{outputs('Get_Response_Details')?['body/rParentEmailId']}",
  "parent_phone": "@{outputs('Get_Response_Details')?['body/rParentPhoneId']}",
  "notes": "@{outputs('Get_Response_Details')?['body/rNotesId']}"
}
```

> **Why Compose?** Power Automate lacks the fuzzy matching logic from Google Apps Script. A Compose action gives you deterministic control over the payload and lets you add defaults, trimming, or nested conditions.

### 5. POST to the Tournament API

Add **Built-in → HTTP** action configured as follows:

| Setting | Value |
| --- | --- |
| Method | `POST` |
| URI | `https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/players/api-import/0d40d92c-ed28-44df-aa91-f2e992e89d86` |
| Headers | `Content-Type: application/json` |
| Body | See JSON body below |

```jsonc
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

> **Security Tip:** Store the API key in an **environment variable** or use the **Power Automate vault**. Reference it with `@{environmentvariables('TournamentApiKey')}` to avoid hardcoding secrets.

### 6. Send Confirmation Email (Optional but Recommended)

Add **Office 365 Outlook → Send an email (V2)** (or Gmail). Suggested fields:

- To: registrant’s email from dynamic content  
- Subject: `Registration Confirmation - @{outputs('Compose')?['section']}`  
- Body template example:

```html
Hi @{outputs('Compose')?['name']},<br/><br/>
Thank you for registering for the @{outputs('Compose')?['section']} section.
We will reach out with pairings and round times shortly.<br/><br/>
— Tournament Director
```

Add an attachment (PDF, handbook, etc.) if desired.

---

## Power Automate Enhancements

- **Error Handling**: Use the three-dot menu on the HTTP action → **Configure run after** → branch failures to a Teams or Email notification.  
- **Retry Policy**: Leave the default exponential retries enabled for transient outages.  
- **Logging**: Insert a **Compose** or **Append to array variable** before the HTTP call to capture the raw payload in case of issues.  
- **Parallelism**: If you need to fan out to multiple systems, split the flow after the Compose step to keep each connector isolated.

---

## Webhook Delivery Options

Want to mirror submissions to your own system, CRM, or analytics tool? Add a second HTTP action after Compose and point it to your webhook endpoint. Recommended structure:

```jsonc
{
  "tournament_id": "0d40d92c-ed28-44df-aa91-f2e992e89d86",
  "received_at": "@{utcNow()}",
  "source": "microsoft_forms",
  "payload": @{outputs('Compose')}
}
```

### Power Automate Step

1. After the Compose action, add **Built-in → HTTP** (rename to `POST_Webhook`).  
2. **Method:** `POST`  
3. **URI:** Your webhook URL (e.g., `https://example.com/forms/webhook`).  
4. **Headers:** `Content-Type: application/json`  
5. **Body:** Use the wrapper JSON above.  
6. Optional: Enable **Asynchronous pattern** with the **HTTP with Azure AD** connector if you need managed identity auth.

---

## Webhook Implementation Examples

The snippets below show how to stand up a webhook receiver and (optionally) forward the captured payload to the tournament API in real time.

### Node.js (Express)

```javascript
// server.js
import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const TOURNAMENT_API_URL =
  'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/players/api-import/0d40d92c-ed28-44df-aa91-f2e992e89d86';
const TOURNAMENT_API_KEY = process.env.TOURNAMENT_API_KEY ?? 'demo-key-123'; // Replace in production

app.post('/forms/webhook', async (req, res) => {
  const { tournament_id, received_at, payload } = req.body;

  console.log(`New signup for ${tournament_id} @ ${received_at}`);
  console.log(payload); // Persist to DB, CRM, Slack, etc.

  // Optional: forward straight to the tournament API
  if (payload) {
    try {
      await axios.post(TOURNAMENT_API_URL, {
        api_key: TOURNAMENT_API_KEY,
        players: Array.isArray(payload) ? payload : [payload],
        lookup_ratings: true,
        auto_assign_sections: true,
        source: 'forms_webhook_bridge'
      });
    } catch (error) {
      console.error('Failed to forward players to the tournament API:', error.message);
    }
  }

  res.status(202).json({ accepted: true });
});

app.post('/forms/webhook/archive', async (req, res) => {
  // Example: store rating history, analytics, etc.
  // await ratingsCollection.insertOne({ ...req.body });
  res.status(202).json({ archived: true });
});

app.listen(process.env.PORT ?? 8080, () => {
  console.log('Webhook listener ready');
});
```

### Python (Flask)

```python
# app.py
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.post("/forms/webhook")
def forms_webhook():
    data = request.get_json(force=True)
    payload = data.get("payload", {})

    player_name = payload.get("name", "Unknown Player")
    print(f"Received signup for {player_name}")

    # TODO: persist payload, trigger notifications, etc.

    return jsonify({"accepted": True}), 202

if __name__ == "__main__":
    app.run(port=8080, debug=True)
```

#### Relay the Payload to the Tournament API (Python)

```python
import os
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

TOURNAMENT_API_URL = "https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/players/api-import/0d40d92c-ed28-44df-aa91-f2e992e89d86"
TOURNAMENT_API_KEY = os.getenv("TOURNAMENT_API_KEY", "demo-key-123")  # Replace in production

@app.post("/forms/webhook/forward")
def forward_forms_webhook():
    data = request.get_json(force=True)
    payload = data.get("payload") or data

    players = payload if isinstance(payload, list) else [payload]

    response = requests.post(
        TOURNAMENT_API_URL,
        json={
            "api_key": TOURNAMENT_API_KEY,
            "players": players,
            "lookup_ratings": True,
            "auto_assign_sections": True,
            "source": "forms_webhook_bridge"
        },
        timeout=10
    )
    response.raise_for_status()

    return jsonify({"forwarded": True, "import_result": response.json()}), 202

if __name__ == "__main__":
    app.run(port=8081, debug=True)
```

### Curl Smoke Test

Hit your webhook endpoint with a sample request before wiring Power Automate:

```bash
curl -X POST https://example.com/forms/webhook \
  -H "Content-Type: application/json" \
  -d '{
        "tournament_id": "0d40d92c-ed28-44df-aa91-f2e992e89d86",
        "received_at": "2025-01-15T14:32:00Z",
        "source": "manual_test",
        "payload": {
          "name": "Jane Doe",
          "email": "jane@example.com",
          "section": "K-6"
        }
      }'
```

---

## Testing & Observability

- **Forms Dry Run**: Submit a test response in Microsoft Forms and verify the flow run history.  
- **API Logs**: In the tournament admin dashboard, confirm the player appears and review import logs.  
- **Webhook Monitoring**: Return `202 Accepted` promptly and process in the background to avoid Power Automate timeouts (90 seconds).  
- **Resubmission Handling**: Use a dedupe key (e.g., response ID) if your webhook stores data in a system without idempotency.

---

## Appendix A: Example Tournament API Request

```json
{
  "api_key": "demo-key-123",
  "players": [
    {
      "name": "Jordan Fields",
      "uscf_id": "16234589",
      "fide_id": "",
      "rating": 1520,
      "email": "jordan.fields@example.com",
      "phone": "+1-555-555-1234",
      "section": "Open",
      "team_name": "Queens Attackers",
      "parent_name": "Alex Fields",
      "parent_email": "alex.fields@example.com",
      "parent_phone": "+1-555-555-8888",
      "notes": "Prefers afternoon rounds."
    }
  ],
  "lookup_ratings": true,
  "auto_assign_sections": true,
  "source": "microsoft_forms"
}
```

---

## Appendix B: Alternate Form Integrations

- **Typeform**: Configure native webhooks to POST submissions to your `universal_webhook_processor`.  
- **Jotform**: Add a Webhook integration; Jotform sends URL-encoded payloads that you can forward to the same Power Automate HTTP action.  
- **Wufoo**: Enable JSON webhooks under Notifications.  
- **Formstack**: Use REST hooks and map labels to the expected fields.  
- **Cognito Forms**: Enable JSON-formatted webhooks under **Form Settings → Submissions**.

---

Happy automating! Once the flow is live, monitor it for a few days to confirm player imports, webhook deliveries, and email confirmations all run smoothly. When ready for production, swap in your real API key and tighten webhook security with secrets or OAuth.


