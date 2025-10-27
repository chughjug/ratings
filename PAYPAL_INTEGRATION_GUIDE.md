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
│  ┌────────────────────────────────┐ │
│  │ [🅿 PayPal]                    │ │
│  │  ← PayPal SDK Button           │ │
│  └────────────────────────────────┘ │
│                                      │
│  Pay with Card                       │
│  ┌────────────────────────────────┐ │
│  │ [Card Number]                  │ │
│  │ [Expiry] [CVC] [ZIP]           │ │
│  │  ← Stripe Elements              │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

## 📝 Configuration Steps

### Step 1: Add Payment Credentials to Tournament

**PayPal:**
```javascript
{
  "payment_settings": {
    "paypal_client_id": "YOUR_CLIENT_ID",
    "paypal_secret": "YOUR_SECRET"
  }
}
```

**Stripe:**
```javascript
{
  "payment_settings": {
    "stripe_publishable_key": "pk_test_...",
    "stripe_secret_key": "sk_test_..."
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
- Load PayPal SDK if PayPal credentials exist
- Load Stripe.js if Stripe credentials exist
- Show appropriate payment options
- Handle payment flow

## 🔧 Code Structure

### `RegistrationFormWithPayment.tsx`

**New Functions:**
1. `loadPayPalSDK(clientId)` - Dynamically loads PayPal SDK
2. `initializePayPalButton(clientId)` - Renders PayPal button
3. `loadStripeSDK(publishableKey)` - Dynamically loads Stripe.js
4. `initializeStripeElements(publishableKey)` - Creates Stripe Payment Element
5. Auto-loads when tournament has payment credentials

**Payment Flow:**
```typescript
createOrder() → Backend API → Returns orderId
onApprove() → Captures payment → Stores payment ID
onError() → Shows error message
```

## ✅ Benefits

1. **Tournament-Specific** - Each tournament can have different credentials
2. **Easy Setup** - Just add credentials to tournament settings
3. **Official SDKs** - Uses PayPal's Smart Buttons & Stripe Elements
4. **Automatic** - SDKs load when credentials are present
5. **No Hardcoding** - Credentials stored in database
6. **Multiple Options** - Both PayPal and Stripe in one form

## 🎯 Usage

1. Tournament organizer adds PayPal credentials to tournament
2. Registration form automatically shows PayPal button
3. Users can pay with PayPal directly in the form
4. Payment is captured and stored with registration

---

**Status:** ✅ PayPal & Stripe integration embedded and ready!
**PayPal Client ID:** `AazRC_i2xdF__MU_m_qFHsypNKktktCbUbBh9drb40409ApWHq2WW7Ico9WtEIoCEdCQsSNn4P0fb26-`

