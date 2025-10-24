import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Link as LinkIcon, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  ExternalLink,
  Loader,
  Save,
  X,
  Code,
  FileText,
  Play,
  RefreshCw
} from 'lucide-react';

interface GoogleFormsConnectorProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  tournamentName: string;
}

interface FormsConfig {
  formId: string;
  apiBaseUrl: string;
  apiKey: string;
  checkInterval: number;
  sendConfirmationEmails: boolean;
  autoAssignSections: boolean;
  lookupRatings: boolean;
}

interface ConnectionStatus {
  formConnected: boolean;
  lastSync: string | null;
  responseCount: number;
  importedCount: number;
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  error?: string;
}

const GoogleFormsConnector: React.FC<GoogleFormsConnectorProps> = ({
  isOpen,
  onClose,
  tournamentId,
  tournamentName
}) => {
  const [config, setConfig] = useState<FormsConfig>({
    formId: '',
    apiBaseUrl: 'http://localhost:5000',
    apiKey: 'demo-key-123',
    checkInterval: 5,
    sendConfirmationEmails: true,
    autoAssignSections: true,
    lookupRatings: true
  });

  const [status, setStatus] = useState<ConnectionStatus>({
    formConnected: false,
    lastSync: null,
    responseCount: 0,
    importedCount: 0,
    status: 'disconnected'
  });

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [setupStep, setSetupStep] = useState<'intro' | 'configure' | 'test' | 'complete'>('intro');
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load saved configuration
  useEffect(() => {
    if (isOpen) {
      loadConfiguration();
    }
  }, [isOpen]);

  const loadConfiguration = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/google-forms-config`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConfig(data.data.config || config);
          setStatus(data.data.status || status);
        }
      }
    } catch (err) {
      console.error('Failed to load configuration:', err);
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/google-forms-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      if (data.success) {
        setTestMessage({ type: 'success', text: 'Configuration saved successfully!' });
        setTimeout(() => setTestMessage(null), 3000);
      } else {
        setTestMessage({ type: 'error', text: data.error || 'Failed to save configuration' });
      }
    } catch (err: any) {
      setTestMessage({ type: 'error', text: err.message || 'Failed to save configuration' });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setStatus(prev => ({ ...prev, status: 'testing' }));
    setTestMessage({ type: 'info', text: 'Testing connection...' });

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/google-forms-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      if (data.success) {
        setStatus({
          formConnected: true,
          lastSync: new Date().toISOString(),
          responseCount: data.data?.responseCount || 0,
          importedCount: data.data?.importedCount || 0,
          status: 'connected'
        });
        setTestMessage({ type: 'success', text: 'Connection successful! Form is ready.' });
      } else {
        setStatus(prev => ({ ...prev, status: 'error', error: data.error }));
        setTestMessage({ type: 'error', text: data.error || 'Connection failed' });
      }
    } catch (err: any) {
      setStatus(prev => ({ ...prev, status: 'error', error: err.message }));
      setTestMessage({ type: 'error', text: err.message || 'Connection test failed' });
    } finally {
      setLoading(false);
    }
  };

  const getAppsScriptCode = () => {
    return `const FORMS_CONFIG = {
  ENABLE_FORM_IMPORT: true,
  FORM_ID: '${config.formId}',
  API_BASE_URL: '${config.apiBaseUrl}',
  API_KEY: '${config.apiKey}',
  TOURNAMENT_ID: '${tournamentId}',
  CHECK_INTERVAL: ${config.checkInterval},
  SEND_CONFIRMATION_EMAILS: ${config.sendConfirmationEmails},
  AUTO_ASSIGN_SECTIONS: ${config.autoAssignSections},
  LOOKUP_RATINGS: ${config.lookupRatings}
};`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <LinkIcon size={24} />
            <div>
              <h2 className="text-xl font-bold">Google Forms Connector</h2>
              <p className="text-blue-100 text-sm">{tournamentName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-blue-700 p-2 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Status Banner */}
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            status.status === 'connected'
              ? 'bg-green-50 border border-green-200'
              : status.status === 'error'
              ? 'bg-red-50 border border-red-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            {status.status === 'testing' && <Loader size={20} className="animate-spin text-yellow-600" />}
            {status.status === 'connected' && <CheckCircle size={20} className="text-green-600" />}
            {status.status === 'error' && <AlertCircle size={20} className="text-red-600" />}
            {status.status === 'disconnected' && <AlertCircle size={20} className="text-yellow-600" />}
            
            <div className="flex-1">
              <p className={`font-semibold ${
                status.status === 'connected'
                  ? 'text-green-800'
                  : status.status === 'error'
                  ? 'text-red-800'
                  : 'text-yellow-800'
              }`}>
                {status.status === 'connected'
                  ? `✓ Connected - Form is active`
                  : status.status === 'testing'
                  ? 'Testing connection...'
                  : status.status === 'error'
                  ? `⚠ Error: ${status.error || 'Connection failed'}`
                  : 'Not connected'}
              </p>
              {status.lastSync && (
                <p className="text-sm text-gray-600">
                  Last sync: {new Date(status.lastSync).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Test Message */}
          {testMessage && (
            <div className={`mb-6 p-4 rounded-lg ${
              testMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : testMessage.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {testMessage.text}
            </div>
          )}

          {/* Setup Steps */}
          <div className="space-y-6">
            {/* Step 1: Form ID */}
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block font-semibold text-gray-700 mb-2">
                📋 Google Form ID
              </label>
              <p className="text-sm text-gray-600 mb-3">
                From your form URL: <code className="bg-gray-100 px-2 py-1 rounded text-xs">forms.google.com/u/1/d/FORM_ID_HERE/edit</code>
              </p>
              <input
                type="text"
                value={config.formId}
                onChange={(e) => setConfig({ ...config, formId: e.target.value })}
                placeholder="Enter your Google Form ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Step 2: API Configuration */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <label className="block font-semibold text-gray-700 mb-2">
                🔗 API Configuration
              </label>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">API Base URL</label>
                <input
                  type="text"
                  value={config.apiBaseUrl}
                  onChange={(e) => setConfig({ ...config, apiBaseUrl: e.target.value })}
                  placeholder="http://localhost:5000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">API Key</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="Your API key"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => copyToClipboard(config.apiKey)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    title="Copy to clipboard"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: Import Options */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <label className="block font-semibold text-gray-700 mb-2">
                ⚙️ Import Options
              </label>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="lookupRatings"
                    checked={config.lookupRatings}
                    onChange={(e) => setConfig({ ...config, lookupRatings: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="lookupRatings" className="text-sm text-gray-700">
                    ✓ Lookup USCF ratings for imported players
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoAssignSections"
                    checked={config.autoAssignSections}
                    onChange={(e) => setConfig({ ...config, autoAssignSections: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="autoAssignSections" className="text-sm text-gray-700">
                    ✓ Auto-assign players to sections based on rating
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendConfirmationEmails"
                    checked={config.sendConfirmationEmails}
                    onChange={(e) => setConfig({ ...config, sendConfirmationEmails: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="sendConfirmationEmails" className="text-sm text-gray-700">
                    📧 Send confirmation emails to players
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Check interval (minutes): {config.checkInterval}
                </label>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={config.checkInterval}
                  onChange={(e) => setConfig({ ...config, checkInterval: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Step 4: Apps Script Code */}
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Code size={18} /> Google Apps Script Configuration
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Copy this configuration to your Google Apps Script (in FORMS_CONFIG):
              </p>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto mb-2">
                <pre>{getAppsScriptCode()}</pre>
              </div>
              <button
                onClick={() => copyToClipboard(getAppsScriptCode())}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition"
              >
                <Copy size={18} />
                {copied ? 'Copied!' : 'Copy Configuration'}
              </button>
            </div>

            {/* Documentation Links */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-semibold text-blue-900 mb-3">📚 Documentation & Help</p>
              <div className="space-y-2">
                <a
                  href="/docs/GOOGLE_FORMS_QUICK_START.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink size={16} /> Quick Start Guide (5 minutes)
                </a>
                <a
                  href="/docs/GOOGLE_FORMS_EXTENSION_SETUP.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink size={16} /> Detailed Setup Guide
                </a>
                <a
                  href="/docs/GOOGLE_FORMS_TROUBLESHOOTING.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink size={16} /> Troubleshooting Guide
                </a>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={testConnection}
              disabled={loading || !config.formId}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition"
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Play size={18} />}
              {loading ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              onClick={saveConfiguration}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition"
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>

            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
            >
              <X size={18} /> Close
            </button>
          </div>

          {/* Info Box */}
          {status.formConnected && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-semibold mb-2">✓ Form is Connected!</p>
              <p className="text-sm text-green-700">
                Your Google Form is now connected and will automatically import player responses 
                to <strong>{tournamentName}</strong>. Players will be imported immediately upon form submission.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleFormsConnector;
