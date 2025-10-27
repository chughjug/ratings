import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Shield,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader,
  AlertCircle,
  Settings,
  DollarSign
} from 'lucide-react';
import { organizationApi } from '../services/organizationApi';

interface PaymentSettingsProps {
  organizationId: string;
  organization: any;
}

interface PaymentConfig {
  stripe: {
    configured: boolean;
    accountId?: string;
    connected: boolean;
    testMode: boolean;
  };
  paypal: {
    configured: boolean;
    accountId?: string;
    connected: boolean;
    testMode: boolean;
  };
}

const PaymentSettings: React.FC<PaymentSettingsProps> = ({ organizationId, organization }) => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<PaymentConfig>({
    stripe: { configured: false, connected: false, testMode: false },
    paypal: { configured: false, connected: false, testMode: false }
  });
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentConfig();
  }, [organizationId]);

  const loadPaymentConfig = async () => {
    try {
      const paymentSettings = organization.payment_settings 
        ? JSON.parse(organization.payment_settings) 
        : null;

      if (paymentSettings) {
        setConfig({
          stripe: {
            configured: !!paymentSettings.stripe?.accountId,
            accountId: paymentSettings.stripe?.accountId,
            connected: !!paymentSettings.stripe?.connected,
            testMode: paymentSettings.stripe?.testMode || false
          },
          paypal: {
            configured: !!paymentSettings.paypal?.accountId,
            accountId: paymentSettings.paypal?.accountId,
            connected: !!paymentSettings.paypal?.connected,
            testMode: paymentSettings.paypal?.testMode || false
          }
        });
      }
    } catch (error) {
      console.error('Error loading payment config:', error);
    }
  };

  const connectStripe = async (mode: 'test' | 'live' = 'test') => {
    try {
      setConnecting('stripe');
      setError(null);

      // Create OAuth URL for Stripe Connect
      const response = await fetch(`/api/payments/connect/stripe?organizationId=${organizationId}&mode=${mode}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.oauthUrl) {
          // Redirect to Stripe OAuth
          window.location.href = data.oauthUrl;
        } else {
          throw new Error(data.error || 'Failed to connect Stripe');
        }
      } else {
        throw new Error('Failed to initiate Stripe connection');
      }
    } catch (error: any) {
      console.error('Stripe connection error:', error);
      setError(error.message || 'Failed to connect Stripe account');
    } finally {
      setConnecting(null);
    }
  };

  const connectPayPal = async (mode: 'test' | 'live' = 'test') => {
    try {
      setConnecting('paypal');
      setError(null);

      // Create OAuth URL for PayPal
      const response = await fetch(`/api/payments/connect/paypal?organizationId=${organizationId}&mode=${mode}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.oauthUrl) {
          // Open PayPal auth in popup
          const width = 500;
          const height = 600;
          const left = window.screen.width / 2 - width / 2;
          const top = window.screen.height / 2 - height / 2;
          
          window.open(
            data.oauthUrl,
            'PayPalAuth',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
          );
        } else {
          throw new Error(data.error || 'Failed to connect PayPal');
        }
      } else {
        throw new Error('Failed to initiate PayPal connection');
      }
    } catch (error: any) {
      console.error('PayPal connection error:', error);
      setError(error.message || 'Failed to connect PayPal account');
    } finally {
      setConnecting(null);
    }
  };

  const disconnectPayment = async (provider: 'stripe' | 'paypal') => {
    if (!window.confirm(`Are you sure you want to disconnect your ${provider.toUpperCase()} account?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/payments/disconnect/${provider}?organizationId=${organizationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess(`Successfully disconnected ${provider.toUpperCase()} account`);
          setConfig(prev => ({
            ...prev,
            [provider]: {
              configured: false,
              connected: false,
              accountId: undefined,
              testMode: false
            }
          }));
          setTimeout(() => setSuccess(null), 3000);
        } else {
          throw new Error(data.error);
        }
      }
    } catch (error: any) {
      setError(error.message || `Failed to disconnect ${provider}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
          <CheckCircle className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-green-800">Success</h3>
            <p className="text-sm text-green-700 mt-1">{success}</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Payment Settings
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Connect your Stripe or PayPal account to accept registration payments
            </p>
          </div>
        </div>

        {/* Stripe Integration */}
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h4 className="text-base font-medium text-gray-900">Stripe</h4>
                <p className="text-sm text-gray-500">Credit cards, Apple Pay, Google Pay</p>
              </div>
            </div>
            {config.stripe.connected ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 text-gray-400" />
            )}
          </div>

          {config.stripe.connected ? (
            <div className="pl-15">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-green-800">Connected</p>
                  <p className="text-xs text-green-600 mt-1">
                    Account ID: {config.stripe.accountId?.substring(0, 20)}...
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Mode: {config.stripe.testMode ? 'Test' : 'Live'}
                  </p>
                </div>
                <button
                  onClick={() => disconnectPayment('stripe')}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md border border-red-200 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="pl-15 space-y-3">
              <div className="flex space-x-3">
                <button
                  onClick={() => connectStripe('test')}
                  disabled={connecting === 'stripe'}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {connecting === 'stripe' ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    'Connect Stripe (Test Mode)'
                  )}
                </button>
                <button
                  onClick={() => connectStripe('live')}
                  disabled={connecting === 'stripe'}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  Connect Stripe (Live)
                </button>
              </div>
              <a
                href="https://stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
              >
                Create a Stripe account <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          )}
        </div>

        {/* PayPal Integration */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 bg-indigo-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-base font-medium text-gray-900">PayPal</h4>
                <p className="text-sm text-gray-500">PayPal account, Credit cards</p>
              </div>
            </div>
            {config.paypal.connected ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 text-gray-400" />
            )}
          </div>

          {config.paypal.connected ? (
            <div className="pl-15">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-green-800">Connected</p>
                  <p className="text-xs text-green-600 mt-1">
                    Account ID: {config.paypal.accountId?.substring(0, 20)}...
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Mode: {config.paypal.testMode ? 'Sandbox' : 'Live'}
                  </p>
                </div>
                <button
                  onClick={() => disconnectPayment('paypal')}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md border border-red-200 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="pl-15 space-y-3">
              <div className="flex space-x-3">
                <button
                  onClick={() => connectPayPal('test')}
                  disabled={connecting === 'paypal'}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {connecting === 'paypal' ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    'Connect PayPal (Sandbox)'
                  )}
                </button>
                <button
                  onClick={() => connectPayPal('live')}
                  disabled={connecting === 'paypal'}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  Connect PayPal (Live)
                </button>
              </div>
              <a
                href="https://paypal.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center"
              >
                Create a PayPal account <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Shield className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">Security & Privacy</p>
            <ul className="space-y-1 text-blue-700">
              <li>• Payment credentials are encrypted and stored securely</li>
              <li>• We use OAuth for account connections (no password storage)</li>
              <li>• PCI DSS compliant payment processing</li>
              <li>• Transaction fees apply - see Stripe/PayPal pricing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettings;

