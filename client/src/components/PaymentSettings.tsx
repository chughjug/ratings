import React, { useState } from 'react';
import { CreditCard, DollarSign, Save, CheckCircle } from 'lucide-react';

interface PaymentSettingsProps {
  tournamentId: string;
  tournament: any;
  onSave: (credentials: any) => void;
}

const PaymentSettings: React.FC<PaymentSettingsProps> = ({ 
  tournamentId, 
  tournament,
  onSave 
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'stripe' | 'both'>(
    (tournament?.payment_method as any) || 'both'
  );
  
  const [credentials, setCredentials] = useState({
    entry_fee: tournament?.entry_fee || 0,
    paypal_client_id: tournament?.paypal_client_id || '',
    paypal_secret: tournament?.paypal_secret || '',
    stripe_publishable_key: tournament?.stripe_publishable_key || '',
    stripe_secret_key: tournament?.stripe_secret_key || ''
  });
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saveData = {
        entry_fee: credentials.entry_fee,
        payment_method: paymentMethod,
        paypal_client_id: credentials.paypal_client_id,
        paypal_secret: credentials.paypal_secret,
        stripe_publishable_key: credentials.stripe_publishable_key,
        stripe_secret_key: credentials.stripe_secret_key
      };
      
      console.log('💳 Saving payment credentials to tournament:', saveData);
      
      await onSave(saveData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save payment credentials:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
            Tournament Director Payment Credentials
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure payment credentials for this tournament. These are separate from registration form settings.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50`}
        >
          {saved ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Credentials'}</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* Entry Fee */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Entry Fee (USD)
          </label>
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-gray-400" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={credentials.entry_fee}
              onChange={(e) => setCredentials(prev => ({ ...prev, entry_fee: parseFloat(e.target.value) || 0 }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Accepted Payment Methods
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="both">Both PayPal and Stripe</option>
            <option value="paypal">PayPal Only</option>
            <option value="stripe">Stripe Only</option>
          </select>
        </div>

        {/* PayPal Credentials */}
        {(paymentMethod === 'both' || paymentMethod === 'paypal') && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <CreditCard className="h-4 w-4 mr-2 text-orange-500" />
              PayPal Credentials
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PayPal Client ID
              </label>
              <input
                type="text"
                value={credentials.paypal_client_id}
                onChange={(e) => setCredentials(prev => ({ ...prev, paypal_client_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="PayPal App Client ID"
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in your PayPal Developer Dashboard under App credentials
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PayPal Secret Key
              </label>
              <input
                type="password"
                value={credentials.paypal_secret}
                onChange={(e) => setCredentials(prev => ({ ...prev, paypal_secret: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="PayPal Secret Key"
              />
              <p className="text-xs text-gray-500 mt-1">
                Keep this secure. Used for server-side payment processing.
              </p>
            </div>
          </div>
        )}

        {/* Stripe Credentials */}
        {(paymentMethod === 'both' || paymentMethod === 'stripe') && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <CreditCard className="h-4 w-4 mr-2 text-purple-500" />
              Stripe Credentials
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stripe Publishable Key
              </label>
              <input
                type="text"
                value={credentials.stripe_publishable_key}
                onChange={(e) => setCredentials(prev => ({ ...prev, stripe_publishable_key: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="pk_test_..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Publishable key (safe to expose). Found in Stripe Dashboard → API keys
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stripe Secret Key
              </label>
              <input
                type="password"
                value={credentials.stripe_secret_key}
                onChange={(e) => setCredentials(prev => ({ ...prev, stripe_secret_key: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="sk_test_..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Secret key (keep secure). Used for server-side payment processing.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSettings;
