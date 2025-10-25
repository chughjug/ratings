import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Phone,
  Mail,
  BarChart3,
  TestTube
} from 'lucide-react';
import { smsApi } from '../services/api';

interface SMSManagerProps {
  tournamentId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface SMSConfig {
  twilioConfigured: boolean;
  emailFallbackConfigured: boolean;
  phoneNumberConfigured: boolean;
  fallbackEmailConfigured: boolean;
}

interface SMSStats {
  totalMessages: number;
  sent: number;
  delivered: number;
  failed: number;
  totalCost: number;
}

const SMSManager: React.FC<SMSManagerProps> = ({ tournamentId, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'send' | 'bulk' | 'tournament' | 'stats' | 'config'>('send');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<SMSConfig | null>(null);
  const [stats, setStats] = useState<SMSStats | null>(null);
  const [message, setMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bulkRecipients, setBulkRecipients] = useState('');
  const [notificationType, setNotificationType] = useState('pairings_ready');
  const [customMessage, setCustomMessage] = useState('');
  const [includePlayerName, setIncludePlayerName] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      loadStats();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const response = await smsApi.getConfig();
      setConfig(response.data.data);
    } catch (error) {
      console.error('Failed to load SMS config:', error);
    }
  };

  const loadStats = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const response = await smsApi.getStats(
        startDate.toISOString(),
        endDate.toISOString()
      );
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load SMS stats:', error);
    }
  };

  const handleSendSMS = async () => {
    if (!phoneNumber || !message) {
      alert('Please enter both phone number and message');
      return;
    }

    setLoading(true);
    try {
      const response = await smsApi.sendSMS(phoneNumber, message);
      setTestResult(response.data.data);
      alert('SMS sent successfully!');
    } catch (error: any) {
      alert(`Failed to send SMS: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSMS = async () => {
    if (!bulkRecipients) {
      alert('Please enter recipients');
      return;
    }

    // Parse recipients (format: phone1,phone2,phone3)
    const recipients = bulkRecipients.split(',').map(phone => ({
      phoneNumber: phone.trim(),
      message: message,
      playerName: 'Player'
    }));

    setLoading(true);
    try {
      const response = await smsApi.sendBulkSMS(recipients);
      alert(`Bulk SMS sent! ${response.data.data.successCount} successful, ${response.data.data.failureCount} failed`);
    } catch (error: any) {
      alert(`Failed to send bulk SMS: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTournamentNotification = async () => {
    if (!message && notificationType !== 'custom') {
      alert('Please enter a message or select a notification type');
      return;
    }

    setLoading(true);
    try {
      const data = notificationType === 'custom' ? {
        message: customMessage,
        includePlayerName
      } : {};

      const response = await smsApi.sendTournamentNotification(
        tournamentId,
        notificationType,
        data
      );
      alert(`Tournament notification sent! ${response.data.data.successCount} successful, ${response.data.data.failureCount} failed`);
    } catch (error: any) {
      alert(`Failed to send tournament notification: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSMS = async () => {
    if (!phoneNumber) {
      alert('Please enter a phone number for testing');
      return;
    }

    setLoading(true);
    try {
      const response = await smsApi.testSMS(phoneNumber);
      setTestResult(response.data.data);
      alert('Test SMS sent successfully!');
    } catch (error: any) {
      alert(`Test SMS failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getConfigStatus = () => {
    if (!config) return { status: 'loading', text: 'Loading...', color: 'text-gray-600' };
    
    if (config.twilioConfigured) {
      return { status: 'configured', text: 'Twilio SMS Configured', color: 'text-green-600' };
    } else if (config.emailFallbackConfigured) {
      return { status: 'fallback', text: 'Email Fallback Only', color: 'text-yellow-600' };
    } else {
      return { status: 'not-configured', text: 'Not Configured', color: 'text-red-600' };
    }
  };

  const configStatus = getConfigStatus();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">SMS Notifications</h2>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${configStatus.color}`}>
                {configStatus.text}
              </div>
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
              { id: 'send', label: 'Send SMS', icon: Send },
              { id: 'bulk', label: 'Bulk SMS', icon: Users },
              { id: 'tournament', label: 'Tournament', icon: Settings },
              { id: 'stats', label: 'Statistics', icon: BarChart3 },
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
          {/* Send SMS Tab */}
          {activeTab === 'send' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Send Single SMS</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1234567890"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Enter your message here..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleSendSMS}
                      disabled={loading}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      <span>{loading ? 'Sending...' : 'Send SMS'}</span>
                    </button>

                    <button
                      onClick={handleTestSMS}
                      disabled={loading}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      <TestTube className="h-4 w-4" />
                      <span>Test SMS</span>
                    </button>
                  </div>

                  {testResult && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-md">
                      <h4 className="font-medium text-gray-900 mb-2">Last Test Result:</h4>
                      <pre className="text-sm text-gray-600 overflow-x-auto">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bulk SMS Tab */}
          {activeTab === 'bulk' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Send Bulk SMS</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipients (comma-separated phone numbers)
                    </label>
                    <textarea
                      value={bulkRecipients}
                      onChange={(e) => setBulkRecipients(e.target.value)}
                      placeholder="+1234567890, +1987654321, +1555123456"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Enter your message here..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleBulkSMS}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Users className="h-4 w-4" />
                    <span>{loading ? 'Sending...' : 'Send Bulk SMS'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tournament Notifications Tab */}
          {activeTab === 'tournament' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Tournament Notifications</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notification Type
                    </label>
                    <select
                      value={notificationType}
                      onChange={(e) => setNotificationType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pairings_ready">Pairings Ready</option>
                      <option value="round_started">Round Started</option>
                      <option value="results_posted">Results Posted</option>
                      <option value="tournament_reminder">Tournament Reminder</option>
                      <option value="custom">Custom Message</option>
                    </select>
                  </div>

                  {notificationType === 'custom' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Message
                        </label>
                        <textarea
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          placeholder="Enter your custom message here..."
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="includePlayerName"
                          checked={includePlayerName}
                          onChange={(e) => setIncludePlayerName(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="includePlayerName" className="ml-2 block text-sm text-gray-700">
                          Include player name in message
                        </label>
                      </div>
                    </>
                  )}

                  <button
                    onClick={handleTournamentNotification}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Settings className="h-4 w-4" />
                    <span>{loading ? 'Sending...' : 'Send Tournament Notification'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">SMS Statistics (Last 30 Days)</h3>
                
                {stats ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <MessageSquare className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-blue-600">Total Messages</p>
                          <p className="text-2xl font-bold text-blue-900">{stats.totalMessages}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-green-600">Delivered</p>
                          <p className="text-2xl font-bold text-green-900">{stats.delivered}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <XCircle className="h-8 w-8 text-red-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-red-600">Failed</p>
                          <p className="text-2xl font-bold text-red-900">{stats.failed}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <BarChart3 className="h-8 w-8 text-yellow-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-yellow-600">Total Cost</p>
                          <p className="text-2xl font-bold text-yellow-900">${stats.totalCost.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No statistics available</p>
                )}
              </div>
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">SMS Configuration</h3>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Configuration Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Twilio SMS</span>
                        <div className="flex items-center">
                          {config?.twilioConfigured ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Email Fallback</span>
                        <div className="flex items-center">
                          {config?.emailFallbackConfigured ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Phone Number</span>
                        <div className="flex items-center">
                          {config?.phoneNumberConfigured ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
                    <div className="text-sm text-blue-800 space-y-2">
                      <p>1. Add Twilio credentials to your .env file:</p>
                      <pre className="bg-blue-100 p-2 rounded text-xs">
{`TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number`}
                      </pre>
                      <p>2. Configure email fallback (optional):</p>
                      <pre className="bg-blue-100 p-2 rounded text-xs">
{`SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMS_FALLBACK_EMAIL=your_email@example.com`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
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

export default SMSManager;
