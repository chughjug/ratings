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
    apiBaseUrl: 'http://localhost:3000',
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
  const [fullScriptCode, setFullScriptCode] = useState<string>('');

  // Load saved configuration
  useEffect(() => {
    const loadFullScript = async () => {
      const code = await getAppsScriptCode();
      setFullScriptCode(code);
    };
    if (isOpen) {
      loadConfiguration();
      loadFullScript();
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

  const getAppsScriptCode = async () => {
    try {
      // Try to fetch the complete google-apps-script.js file from the server
      const response = await fetch('/google-apps-script.js');
      if (response.ok) {
        const scriptContent = await response.text();
        return scriptContent;
      }
    } catch (err) {
      console.warn('Could not fetch complete script file, returning configuration template:', err);
    }
    
    // Fallback: return configuration template
    return `// ============================================================================
// GOOGLE APPS SCRIPT - COMPLETE CONFIGURATION TEMPLATE
// ============================================================================
// 
// This is a template. For the COMPLETE 1200+ line script, please:
// 1. Use the "Copy Complete Script" button below to get the full version
// 2. Or visit: https://github.com/your-repo/google-apps-script.js
//
// ============================================================================

const FORMS_CONFIG = {
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

  // Build the complete code to copy (FORMS_CONFIG + full script)
  const getCompleteCopyCode = () => {
    // Create the tournament-specific FORMS_CONFIG
    const formsConfig = `const FORMS_CONFIG = {
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
    
    // Find where the hardcoded FORMS_CONFIG ends in the full script
    // Look for "let FORMS_CONFIG = {" or "const FORMS_CONFIG = {" and replace it
    const configStartPattern = /let FORMS_CONFIG = \{[\s\S]*?\};/;
    const configEndPattern = /const FORMS_CONFIG = \{[\s\S]*?\};/;
    
    let updatedScript = fullScriptCode;
    
    // Try to replace the existing FORMS_CONFIG
    if (configStartPattern.test(updatedScript)) {
      updatedScript = updatedScript.replace(configStartPattern, formsConfig);
    } else if (configEndPattern.test(updatedScript)) {
      updatedScript = updatedScript.replace(configEndPattern, formsConfig);
    }
    
    return updatedScript;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
          {/* Info Section */}
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-900 font-semibold mb-2">Google Apps Script Setup</p>
            <p className="text-sm text-blue-800">
              Copy the complete code below (including your tournament-specific configuration) and paste it into your Google Apps Script editor.
            </p>
          </div>

          {/* Tournament-Specific Configuration Preview */}
          <div className="border-2 border-amber-500 rounded-lg p-4 bg-amber-50 mb-6">
            <p className="font-semibold text-amber-900 mb-3">⚙️ Your Tournament Configuration:</p>
            <div className="bg-gray-900 text-amber-400 p-4 rounded-lg font-mono text-sm overflow-x-auto border border-gray-700">
              <pre>{`const FORMS_CONFIG = {
  ENABLE_FORM_IMPORT: true,
  FORM_ID: '${config.formId}',
  API_BASE_URL: '${config.apiBaseUrl}',
  API_KEY: '${config.apiKey}',
  TOURNAMENT_ID: '${tournamentId}',
  CHECK_INTERVAL: ${config.checkInterval},
  SEND_CONFIRMATION_EMAILS: ${config.sendConfirmationEmails},
  AUTO_ASSIGN_SECTIONS: ${config.autoAssignSections},
  LOOKUP_RATINGS: ${config.lookupRatings}
};`}</pre>
            </div>
          </div>

          {/* Complete Script Code */}
          <div className="border-2 border-blue-600 rounded-lg p-6 bg-gradient-to-br from-gray-50 to-gray-100 mb-6">
            <div className="mb-4">
              <p className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Code size={20} /> Complete Google Apps Script ({fullScriptCode.split('\n').length} lines)
              </p>
              <p className="text-sm text-gray-600">
                The full 1200+ line script with all functions:
              </p>
            </div>

            <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm overflow-x-auto mb-6 border border-gray-700 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap break-words">{fullScriptCode}</pre>
            </div>

            <button
              onClick={() => copyToClipboard(getCompleteCopyCode())}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition transform hover:scale-105 active:scale-95"
            >
              <Copy size={20} />
              <span className="text-lg">{copied ? '✓ Copied Complete Code!' : 'Copy Complete Code (1200+ lines)'}</span>
            </button>
          </div>

          {/* Setup Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
            <p className="font-semibold text-amber-900 mb-3">📋 Setup Instructions:</p>
            <ol className="text-sm text-amber-800 space-y-2 list-decimal list-inside">
              <li>Open your Google Sheet</li>
              <li>Click <code className="bg-amber-100 px-1 rounded">Extensions → Apps Script</code></li>
              <li>Delete all existing code</li>
              <li>Paste the COMPLETE code you just copied (includes your tournament config)</li>
              <li>Save <code className="bg-amber-100 px-1 rounded">Ctrl+S</code> or <code className="bg-amber-100 px-1 rounded">Cmd+S</code></li>
              <li>Run the <code className="bg-amber-100 px-1 rounded">setup()</code> function in the console</li>
              <li>Done! Forms will auto-import every 5 minutes</li>
            </ol>
          </div>

          {/* Documentation Links */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
            <p className="font-semibold text-blue-900 mb-3">📚 Documentation & Help</p>
            <div className="space-y-2">
              <a
                href="/docs/GOOGLE_FORMS_SETUP_QUICK_START.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink size={16} /> Quick Start Guide (5 minutes)
              </a>
              <a
                href="/docs/GOOGLE_FORMS_DYNAMIC_CONFIG.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink size={16} /> Complete Configuration Guide
              </a>
              <a
                href="/docs/DEPLOYMENT_GUIDE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink size={16} /> Deployment Instructions
              </a>
            </div>
          </div>

          {/* Close Button */}
          <div className="mt-8">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleFormsConnector;
