import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Users,
  BarChart3,
  Settings,
  RefreshCw,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { paymentApi } from '../services/api';

interface PaymentManagerProps {
  tournamentId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  supportedCurrencies: string[];
  fees: string;
}

interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  methodBreakdown: { [key: string]: number };
}

const PaymentManager: React.FC<PaymentManagerProps> = ({ tournamentId, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'payments' | 'stats' | 'config' | 'history'>('payments');
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    method: '',
    playerId: '',
    amount: '',
    currency: 'usd',
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadPaymentMethods();
      loadStats();
      loadPaymentHistory();
      loadConfig();
    }
  }, [isOpen, tournamentId]);

  const loadPaymentMethods = async () => {
    try {
      const response = await paymentApi.getMethods();
      setPaymentMethods(response.data.data.methods);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await paymentApi.getStats(tournamentId);
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load payment stats:', error);
    }
  };

  const loadPaymentHistory = async () => {
    try {
      const response = await paymentApi.getHistory(tournamentId);
      setPaymentHistory(response.data.data);
    } catch (error) {
      console.error('Failed to load payment history:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await paymentApi.getConfig();
      setConfig(response.data.data);
    } catch (error) {
      console.error('Failed to load payment config:', error);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentForm.method || !paymentForm.playerId || !paymentForm.amount) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await paymentApi.processEntryFee({
        method: paymentForm.method,
        tournamentId,
        playerId: paymentForm.playerId,
        amount: parseFloat(paymentForm.amount),
        currency: paymentForm.currency
      });

      if (response.data.success) {
        alert('Payment initiated successfully!');
        setShowPaymentForm(false);
        setPaymentForm({
          method: '',
          playerId: '',
          amount: '',
          currency: 'usd',
          description: ''
        });
        loadStats();
        loadPaymentHistory();
      } else {
        alert(`Payment failed: ${response.data.error}`);
      }
    } catch (error: any) {
      alert(`Payment error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to refund this payment?')) return;

    try {
      const response = await paymentApi.refundPayment(paymentId);
      if (response.data.success) {
        alert('Refund processed successfully!');
        loadStats();
        loadPaymentHistory();
      } else {
        alert(`Refund failed: ${response.data.error}`);
      }
    } catch (error: any) {
      alert(`Refund error: ${error.response?.data?.error || error.message}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Payment Management</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'payments', label: 'Payments', icon: CreditCard },
              { id: 'stats', label: 'Statistics', icon: BarChart3 },
              { id: 'history', label: 'History', icon: Eye },
              { id: 'config', label: 'Configuration', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Process Payments</h3>
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>New Payment</span>
                </button>
              </div>

              {/* Payment Methods */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Available Payment Methods</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentMethods.map(method => (
                    <div key={method.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">{method.icon}</span>
                        <div>
                          <h5 className="font-medium text-gray-900">{method.name}</h5>
                          <p className="text-sm text-gray-600">{method.description}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        <p>Fees: {method.fees}</p>
                        <p>Currencies: {method.supportedCurrencies.join(', ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Form Modal */}
              {showPaymentForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                  <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Process Entry Fee Payment</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                        <select
                          value={paymentForm.method}
                          onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select method</option>
                          {paymentMethods.map(method => (
                            <option key={method.id} value={method.id}>
                              {method.icon} {method.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Player ID</label>
                        <input
                          type="text"
                          value={paymentForm.playerId}
                          onChange={(e) => setPaymentForm({...paymentForm, playerId: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                          <select
                            value={paymentForm.currency}
                            onChange={(e) => setPaymentForm({...paymentForm, currency: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="usd">USD</option>
                            <option value="eur">EUR</option>
                            <option value="gbp">GBP</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                        <input
                          type="text"
                          value={paymentForm.description}
                          onChange={(e) => setPaymentForm({...paymentForm, description: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        onClick={() => setShowPaymentForm(false)}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePaymentSubmit}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'Processing...' : 'Process Payment'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Payment Statistics</h3>
              
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-8 w-8 text-blue-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-600">Total Amount</p>
                        <p className="text-2xl font-bold text-blue-900">${stats.totalAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-600">Completed</p>
                        <p className="text-2xl font-bold text-green-900">{stats.completedPayments}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-8 w-8 text-yellow-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-yellow-600">Pending</p>
                        <p className="text-2xl font-bold text-yellow-900">{stats.pendingPayments}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <XCircle className="h-8 w-8 text-red-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-600">Failed</p>
                        <p className="text-2xl font-bold text-red-900">{stats.failedPayments}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No statistics available</p>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentHistory.map((payment, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.playerId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${payment.amount.toFixed(2)} {payment.currency.toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.method}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                            {getStatusIcon(payment.status)}
                            <span className="ml-1">{payment.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.status === 'completed' && (
                            <button
                              onClick={() => handleRefund(payment.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Payment Configuration</h3>
              
              {config ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Stripe Configuration</h4>
                    <div className="flex items-center space-x-2">
                      {config.stripe.configured ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="text-sm text-gray-600">
                        {config.stripe.configured ? 'Configured' : 'Not configured'}
                      </span>
                    </div>
                    {config.stripe.configured && (
                      <p className="text-xs text-gray-500 mt-1">
                        Publishable Key: {config.stripe.publishableKey?.substring(0, 20)}...
                      </p>
                    )}
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">PayPal Configuration</h4>
                    <div className="flex items-center space-x-2">
                      {config.paypal.configured ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="text-sm text-gray-600">
                        {config.paypal.configured ? 'Configured' : 'Not configured'}
                      </span>
                    </div>
                    {config.paypal.configured && (
                      <p className="text-xs text-gray-500 mt-1">
                        Client ID: {config.paypal.clientId?.substring(0, 20)}...
                      </p>
                    )}
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
                    <div className="text-sm text-blue-800 space-y-2">
                      <p>1. Add Stripe credentials to your .env file:</p>
                      <pre className="bg-blue-100 p-2 rounded text-xs">
{`STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...`}
                      </pre>
                      <p>2. Add PayPal credentials to your .env file:</p>
                      <pre className="bg-blue-100 p-2 rounded text-xs">
{`PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret`}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Loading configuration...</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentManager;
