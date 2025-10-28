# PayPal Payment Setup Guide

## Issue: Invalid PayPal Client ID

The current PayPal Client ID in your database is invalid or a placeholder. You need to obtain a real PayPal Client ID from PayPal's developer portal.

## How to Get Valid PayPal Credentials

### Step 1: Create a PayPal Developer Account
1. Go to https://developer.paypal.com
2. Click "Sign Up" or "Log In" if you already have an account
3. Create an account using your business email

### Step 2: Create a New App
1. After logging in, navigate to "My Apps & Credentials"
2. Click "Create App"
3. Fill in the app details:
   - **App Name**: Your Tournament Name (e.g., "Chess Tournament Payment")
   - **Merchant**: Select your business account
4. Click "Create App"

### Step 3: Get Your Credentials
1. After creating the app, you'll see your credentials
2. You need **two keys**:
   - **Client ID**: Starts with `Ae...` or `AV...` for production, `AZ...` for sandbox
   - **Client Secret**: A longer string starting with similar patterns

### Step 4: Sandbox vs Production
- **Sandbox (for testing)**: Use sandbox credentials
  - Client IDs start with `AZ...`
  - Use for testing without real payments
- **Production (live)**: Use production credentials  
  - Client IDs start with `Ae...` or `AV...`
  - Use for real payments

## Update Your Tournament

Once you have valid credentials:

1. **Via UI**:
   - Go to your tournament
   - Settings → Registration Settings
   - Enter the entry fee and PayPal credentials
   - Save

2. **Via Database** (quick fix):
   ```bash
   sqlite3 server/chess_tournaments.db "UPDATE tournaments SET 
     paypal_client_id = 'YOUR_CLIENT_ID_HERE',
     paypal_secret = 'YOUR_SECRET_HERE',
     entry_fee = 20.00,
     payment_method = 'paypal'
   WHERE id = 'YOUR_TOURNAMENT_ID';"
   ```

3. **For Heroku**:
   ```bash
   # Create a script to update via API
   ```

## PayPal Client ID Formats

Valid PayPal Client IDs look like:
- Sandbox: `AZXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- Production: `AeXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- Production (Alternative): `AVXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

Your current value appears to be a placeholder.

## Testing

After updating credentials:

1. Restart your server
2. Visit the registration form
3. The PayPal button should load without 503 errors
4. In sandbox mode, you can use test credentials:
   - Email: `sb-personal@paypal.com`
   - Password: `test123`

## Alternative: Stripe

If PayPal setup is complex, consider using Stripe instead:

1. Sign up at https://stripe.com
2. Get your publishable key (starts with `pk_...`)
3. Get your secret key (starts with `sk_...`)
4. Update tournament settings with Stripe credentials

## Need Help?

- PayPal Developer Docs: https://developer.paypal.com/docs
- PayPal Sandbox Testing: https://developer.paypal.com/docs/test-tools/sandbox-testing/
- Contact: Check with your tournament platform administrator


