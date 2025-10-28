# PayPal Domain Setup Required

## Issue: 503 Error from PayPal SDK

You're getting a `503 Service Unavailable` error because PayPal needs to whitelist your domain.

## PayPal Configuration Steps

### 1. Go to PayPal Developer Dashboard
Visit: https://developer.paypal.com/dashboard

### 2. Find Your App
- Select your app (the one with Client ID: `AazRC_i2xdF__MU...`)
- Or create a new app if needed

### 3. Whitelist Your Domain
Your Heroku app domain is:
```
https://chess-tournament-director.herokuapp.com
```

You need to add this to your PayPal app's allowed domains/URLs.

### 4. Check PayPal App Settings
In your PayPal app settings, make sure:
- **Return URL** includes: `https://chess-tournament-director.herokuapp.com`
- **Cancel URL** includes: `https://chess-tournament-director.herokuapp.com/*`
- **Allowed Domains** includes: `chess-tournament-director.herokuapp.com`

### 5. Credentials Format
Your current Client ID (`AazRC...`) doesn't match standard PayPal formats:
- Production: `Ae...` or `AV...`
- Sandbox: `AZ...`

If this is a test account, you might need to:
1. Create a proper PayPal Sandbox app
2. Get sandbox credentials (starts with `AZ...`)
3. Use those credentials

## Current Setup

Your Heroku URL:
- `https://chess-tournament-director.herokuapp.com`

Test Registration URL:
- `https://chess-tournament-director.herokuapp.com/register/0d40d92c-ed28-44df-aa91-f2e992e89d86`

## Troubleshooting

### Option 1: Register Domain in PayPal
1. Log into https://developer.paypal.com
2. Go to your app settings
3. Add `chess-tournament-director.herokuapp.com` to allowed domains
4. Wait a few minutes for changes to propagate

### Option 2: Create New PayPal Sandbox App
1. Go to https://developer.paypal.com
2. Create new "Sandbox App"
3. Get sandbox credentials (will start with `AZ...`)
4. Update tournament with new credentials

### Option 3: Disable Payment Temporarily
Until credentials are properly set up, you can disable the payment requirement in tournament settings.

## Next Steps

1. **Verify demo HTML works**: Open `paypal-demo.html` in your browser
   - If it works → credentials are valid, just need domain whitelisting
   - If it doesn't work → need new credentials

2. **Add domain to PayPal**: Register your Heroku domain in PayPal dashboard

3. **Test again**: Visit the registration form and check console for PayPal SDK loading

