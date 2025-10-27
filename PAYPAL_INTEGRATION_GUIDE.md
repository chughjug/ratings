# PayPal & Stripe Integration Guide

## ✅ What's Been Implemented

### 1. PayPal SDK Integration in Registration Form
- PayPal SDK loads automatically when tournament has PayPal credentials
- Embedded PayPal button (not a custom button)
- Full payment flow: create order → approve → capture

### 2. Stripe Elements Integration in Registration Form
- Stripe.js loads automatically when tournament has Stripe credentials
- Embedded Stripe Payment Element (modern card form)
- Full payment flow: create intent → collect card → confirm payment

### 3. Tournament-Level Payment Settings
Payment credentials are stored in **tournament settings** (not organization settings) for easy management:

**PayPal Configuration:**
```json
{
  "payment_settings": {
    "paypal_client_id": "AazRC_i2xdF__MU_m_qFHsypNKktktCbUbBh9drb40409ApWHq2WW7Ico9WtEIoCEdCQsSNn4P0fb26-",
    "paypal_secret": "EBoBlclN77FLkrWawXa951KJIZxQJwfmDwviwGZ6etfdiS7t37NDE68w8xG3PwIpDxhSBlMuVB5adIVR"
  }
}
```

**Stripe Configuration:**
```json
{
  "payment_settings": {
    "stripe_publishable_key": "pk_test_...",
    "stripe_secret_key": "sk_test_..."
  }
}
```

### 3. How It Works

1. **Tournament loads** → checks for `paypal_client_id` in settings
2. **PayPal SDK loads** → dynamically loads PayPal script with client ID
3. **Button renders** → PayPal's official button appears in the form
4. **User clicks** → creates order on backend
5. **Payment approved** → captures payment
6. **Registration continues** → stores payment info

## 🎨 UI Preview

```
┌──────────────────────────────────────┐
│  💰 Payment Options                  │
│  Select your payment method below.   │
│                                      │
│  [Pay with Stripe]                  │
│                                      │
│  [🅿 PayPal]  ← PayPal SDK Button   │
└──────────────────────────────────────┘
```

## 📝 Configuration Steps

### Step 1: Add PayPal Credentials to Tournament

```javascript
// In the tournament settings JSON
{
  "payment_settings": {
    "paypal_client_id": "YOUR_CLIENT_ID",
    "paypal_secret": "YOUR_SECRET"
  }
}
```

### Step 2: Set Entry Fee (Optional)

```javascript
{
  "entry_fee": 25.00
}
```

### Step 3: Enable Registration

The registration form will automatically:
- Load PayPal SDK if credentials exist
- Show PayPal button
- Handle payment flow

## 🔧 Code Structure

### `RegistrationFormWithPayment.tsx`

**New Functions:**
1. `loadPayPalSDK(clientId)` - Dynamically loads PayPal SDK
2. `initializePayPalButton(clientId)` - Renders PayPal button
3. Auto-loads when tournament has PayPal credentials

**Payment Flow:**
```typescript
createOrder() → Backend API → Returns orderId
onApprove() → Captures payment → Stores payment ID
onError() → Shows error message
```

## ✅ Benefits

1. **Tournament-Specific** - Each tournament can have different credentials
2. **Easy Setup** - Just add credentials to tournament settings
3. **Official SDK** - Uses PayPal's official Smart Buttons
4. **Automatic** - SDK loads when credentials are present
5. **No Hardcoding** - Credentials stored in database

## 🎯 Usage

1. Tournament organizer adds PayPal credentials to tournament
2. Registration form automatically shows PayPal button
3. Users can pay with PayPal directly in the form
4. Payment is captured and stored with registration

---

**Status:** ✅ PayPal integration embedded and ready!
**Client ID:** `AazRC_i2xdF__MU_m_qFHsypNKktktCbUbBh9drb40409ApWHq2WW7Ico9WtEIoCEdCQsSNn4P0fb26-`

