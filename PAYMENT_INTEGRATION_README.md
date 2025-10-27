# Payment Integration for Tournament Registration

This document describes the payment integration system that allows tournament directors to accept registration payments through Stripe and PayPal.

## Features

### For Tournament Directors
1. **Connect Payment Accounts** - TDs can connect their Stripe or PayPal accounts through the organization settings
2. **Set Entry Fees** - Configure entry fees at the tournament level
3. **Track Payments** - View payment history and statistics for each tournament
4. **Process Refunds** - Issue refunds for registrations when needed

### For Players
1. **Payment During Registration** - Pay entry fees directly during the registration process
2. **Multiple Payment Methods** - Support for Stripe (credit cards, Apple Pay, Google Pay) and PayPal
3. **Secure Processing** - All payments processed through secure payment gateways

## Implementation Overview

### Database Schema

#### New Tables
1. **payments** - Tracks payment transactions
   - id, tournament_id, registration_id, player_id, organization_id
   - amount, currency, payment_method
   - payment_intent_id (Stripe), order_id (PayPal)
   - status: pending, processing, completed, failed, refunded
   
2. **payment_configurations** - Stores TD payment account credentials
   - id, organization_id, provider (stripe/paypal)
   - account_id, access_token_encrypted
   - is_active, is_production (test/live mode)
   
#### Updated Tables
- **organizations** - Added `payment_settings` column
- **registrations** - Added payment fields:
  - payment_amount, payment_method, payment_status, payment_id

### API Endpoints

#### Payment Connection
- `GET /api/payments/connect/stripe?organizationId=:id&mode=test|live`
- `GET /api/payments/connect/paypal?organizationId=:id&mode=test|live`
- `POST /api/payments/callback/stripe` - Handle Stripe OAuth callback
- `POST /api/payments/callback/paypal` - Handle PayPal OAuth callback
- `POST /api/payments/disconnect/:provider` - Disconnect payment provider

#### Payment Processing
- `POST /api/payments/stripe/create-intent` - Create Stripe payment intent
- `POST /api/payments/paypal/create-order` - Create PayPal order
- `POST /api/payments/paypal/capture-order` - Capture PayPal order
- `POST /api/payments/refund` - Process refunds

#### Payment Management
- `GET /api/payments/history/:tournamentId` - Get payment history
- `GET /api/payments/stats/:tournamentId` - Get payment statistics
- `GET /api/payments/config` - Get payment configuration

### UI Components

#### PaymentSettings Component
Location: `client/src/components/PaymentSettings.tsx`

Features:
- Display Stripe and PayPal connection status
- Connect/Disconnect payment accounts
- Switch between test and live modes
- Security and privacy information

Usage:
```tsx
<PaymentSettings
  organizationId={organizationId}
  organization={organization}
/>
```

#### RegistrationFormWithPayment Component
Location: `client/src/components/RegistrationFormWithPayment.tsx`

Features:
- Display entry fee requirement
- Process payments before registration
- Support for Stripe and PayPal
- Payment status tracking

### Setup Instructions

#### For Tournament Directors

1. **Navigate to Organization Settings**
   - Go to your organization's settings page
   - Find the "Payment Settings" section

2. **Connect Stripe Account**
   - Click "Connect Stripe (Test Mode)" for testing
   - Or click "Connect Stripe (Live)" for production
   - You'll be redirected to Stripe to authorize the connection
   - Complete the OAuth flow
   - You'll be redirected back to the app

3. **Connect PayPal Account** (optional)
   - Click "Connect PayPal (Sandbox)" for testing
   - Or click "Connect PayPal (Live)" for production
   - Complete the PayPal authorization

4. **Configure Tournament Entry Fees**
   - When creating or editing a tournament
   - Set the "Entry Fee" field in tournament settings
   - Save the tournament

#### For Players

1. **Access Registration Form**
   - Navigate to the tournament's public registration page
   - Fill in player information

2. **Complete Payment** (if entry fee required)
   - Choose payment method (Stripe or PayPal)
   - Follow the payment instructions
   - Wait for payment confirmation

3. **Complete Registration**
   - Fill in all required fields
   - Submit the registration
   - Receive confirmation with registration ID

### Environment Variables

Add these to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_CLIENT_ID=ca_...
STRIPE_REDIRECT_URI=http://localhost:3000/api/payments/callback/stripe

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_REDIRECT_URI=http://localhost:3000/api/payments/callback/paypal
```

### Security Considerations

1. **OAuth Authentication** - Uses OAuth for account connections, no passwords stored
2. **Encrypted Storage** - Payment credentials are encrypted in the database
3. **PCI Compliance** - Payments processed through PCI DSS compliant gateways
4. **Test Mode** - Supports separate test and live modes
5. **Webhook Validation** - Payment status updated via secure webhooks

### Transaction Flow

1. **Player initiates registration**
   - Views tournament info with entry fee
   
2. **Player selects payment method**
   - Chooses Stripe or PayPal
   
3. **Payment Intent Created**
   - Server creates payment intent with provider
   - Returns client secret (Stripe) or approval URL (PayPal)
   
4. **Player completes payment**
   - Stripe: Uses Stripe Elements or Checkout
   - PayPal: Redirects to PayPal approval page
   
5. **Payment confirmed**
   - Webhook notification received
   - Registration status updated to "payment_completed"
   
6. **TD reviews and approves**
   - Sees registration with payment confirmation
   - Can approve or reject registration

### Future Enhancements

1. **Webhook Handlers** - Complete webhook processing for payment status updates
2. **Payment Dashboard** - Enhanced dashboard for viewing all payments
3. **Multi-Currency Support** - Support for international currencies
4. **Payment Plans** - Support for payment installments
5. **Email Notifications** - Automatic emails on payment completion
6. **Refund Automation** - Automated refund processing

### Troubleshooting

#### Payment Connection Issues
- Ensure environment variables are set correctly
- Check that redirect URIs match in provider dashboard
- Verify OAuth credentials are valid

#### Payment Processing Errors
- Check payment configuration is active
- Verify account is connected in organization settings
- Ensure sufficient permissions for payment processing

#### Registration Issues
- Confirm payment was successful before allowing registration
- Check payment status in registration records
- Verify tournament allows registration

## API Documentation

### Connect Stripe Account
```typescript
GET /api/payments/connect/stripe?organizationId={id}&mode={test|live}
Response: {
  success: boolean,
  data: {
    oauthUrl: string
  }
}
```

### Connect PayPal Account
```typescript
GET /api/payments/connect/paypal?organizationId={id}&mode={test|live}
Response: {
  success: boolean,
  data: {
    oauthUrl: string
  }
}
```

### Create Payment Intent
```typescript
POST /api/payments/stripe/create-intent
Body: {
  amount: number,
  currency: string,
  tournamentId: string,
  playerId: string,
  description: string
}
Response: {
  success: boolean,
  data: {
    clientSecret: string,
    paymentIntentId: string
  }
}
```

## Support

For issues or questions about the payment integration:
1. Check this documentation
2. Review the payment settings in your organization dashboard
3. Contact support with error details and transaction IDs

