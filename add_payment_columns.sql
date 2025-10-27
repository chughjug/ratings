-- Add payment columns to tournaments table
ALTER TABLE tournaments ADD COLUMN entry_fee REAL DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN paypal_client_id TEXT;
ALTER TABLE tournaments ADD COLUMN paypal_secret TEXT;
ALTER TABLE tournaments ADD COLUMN stripe_publishable_key TEXT;
ALTER TABLE tournaments ADD COLUMN stripe_secret_key TEXT;
ALTER TABLE tournaments ADD COLUMN payment_method TEXT DEFAULT 'both';
