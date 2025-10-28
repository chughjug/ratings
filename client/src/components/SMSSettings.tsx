import React, { useState } from 'react';
import { MessageSquare, Save, CheckCircle, Info } from 'lucide-react';

interface SMSSettingsProps {
  tournamentId?: string;
  tournament?: any;
  organizationId?: string;
  organization?: any;
  onSave: (credentials: any) => void;
}

const SMSSettings: React.FC<SMSSettingsProps> = ({ 
  tournamentId, 
  tournament,
  organizationId,
  organization,
  onSave 
}) => {
  // Support both tournament and organization contexts
  const entityId = tournamentId || organizationId!;
  const entity = tournament || organization;
  
  const [credentials, setCredentials] = useState({
    twilio_account_sid: entity?.twilio_account_sid || '',
    twilio_auth_token: entity?.twilio_auth_token || '',
    twilio_phone_number: entity?.twilio_phone_number || '',
    sms_notifications_enabled: entity?.sms_notifications_enabled || false
  });
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [testing, setTesting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(credentials);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save SMS credentials:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!credentials.twilio_account_sid || !credentials.twilio_auth_token || !credentials.twilio_phone_number) {
      setTestResult({ success: false, message: 'Please fill in all Twilio credentials first' });
      return;
    }

    setTesting(true);
    try {
      // Test the credentials by calling the backend
      const response = await fetch('/api/pairings/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          twilio_account_sid: credentials.twilio_account_sid,
          twilio_auth_token: credentials.twilio_auth_token,
          twilio_phone_number: credentials.twilio_phone_number
        })
      });
      
      const result = await response.json();
      setTestResult({ success: result.success, message: result.message || result.error });
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Failed to test SMS credentials' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
            SMS Text Notifications
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure Twilio credentials to send automatic text notifications to players when pairings are generated
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleTest}
            disabled={testing || !credentials.twilio_account_sid || !credentials.twilio_auth_token || !credentials.twilio_phone_number}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              testing
                ? 'bg-gray-400 text-white'
                : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {testing ? 'Testing...' : 'Test SMS'}
          </button>
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
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
          testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {testResult.success ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <Info className="h-5 w-5" />
          )}
          <span className="text-sm">{testResult.message}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-900">
              Enable SMS Notifications
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Automatically send text messages when pairings are generated
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={credentials.sms_notifications_enabled}
              onChange={(e) => setCredentials(prev => ({ ...prev, sms_notifications_enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        {/* Twilio Credentials */}
        {credentials.sms_notifications_enabled && (
          <>
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Get Twilio Credentials:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Sign up at <a href="https://twilio.com" target="_blank" rel="noopener noreferrer" className="underline">twilio.com</a> (free trial)</li>
                    <li>Go to Console → Account → API keys & tokens</li>
                    <li>Copy Account SID and Auth Token</li>
                    <li>Get a phone number: Console → Phone Numbers → Buy a number</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Account SID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Twilio Account SID
              </label>
              <input
                type="text"
                value={credentials.twilio_account_sid}
                onChange={(e) => setCredentials(prev => ({ ...prev, twilio_account_sid: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in Twilio Console → Account → API keys
              </p>
            </div>

            {/* Auth Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Twilio Auth Token
              </label>
              <input
                type="password"
                value={credentials.twilio_auth_token}
                onChange={(e) => setCredentials(prev => ({ ...prev, twilio_auth_token: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Keep this secure"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used for server-side SMS processing. Keep secure.
              </p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Twilio Phone Number
              </label>
              <input
                type="text"
                value={credentials.twilio_phone_number}
                onChange={(e) => setCredentials(prev => ({ ...prev, twilio_phone_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+12345678901"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your Twilio phone number in E.164 format (e.g., +12345678901)
              </p>
            </div>

            {/* Message Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Message Format:</p>
              <div className="bg-white border border-gray-300 rounded px-3 py-2 text-sm font-mono">
                🏆 R2 WHITE vs John Doe Board 5
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Concise format optimized for text messaging (under 160 characters)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SMSSettings;




