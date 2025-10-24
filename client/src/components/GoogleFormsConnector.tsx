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
};

const FIELD_MAPPING = {
  name: { keywords: ['name', 'player', 'full name'], excludeKeywords: ['parent', 'guardian', 'emergency'], required: true },
  uscf_id: { keywords: ['uscf', 'uscf id', 'member id'], excludeKeywords: [] },
  fide_id: { keywords: ['fide', 'fide id'], excludeKeywords: [] },
  rating: { keywords: ['rating', 'elo', 'chess rating'], excludeKeywords: [] },
  section: { keywords: ['section', 'division', 'category'], excludeKeywords: [] },
  email: { keywords: ['email'], excludeKeywords: ['parent', 'guardian'] },
  phone: { keywords: ['phone', 'telephone'], excludeKeywords: ['parent', 'guardian', 'emergency'] },
  school: { keywords: ['school', 'institution'], excludeKeywords: ['parent'] },
  grade: { keywords: ['grade', 'year', 'level'], excludeKeywords: ['parent'] },
  city: { keywords: ['city', 'town'], excludeKeywords: [] },
  state: { keywords: ['state', 'province'], excludeKeywords: [] },
  team_name: { keywords: ['team', 'club'], excludeKeywords: [] },
  parent_name: { keywords: ['parent name', 'parent', 'guardian'], excludeKeywords: ['email', 'phone'] },
  parent_email: { keywords: ['parent email', 'guardian email'], excludeKeywords: [] },
  parent_phone: { keywords: ['parent phone', 'guardian phone'], excludeKeywords: [] },
  emergency_contact: { keywords: ['emergency', 'emergency contact'], excludeKeywords: ['phone', 'number'] },
  emergency_phone: { keywords: ['emergency phone', 'emergency number'], excludeKeywords: [] },
  notes: { keywords: ['notes', 'comments', 'additional'], excludeKeywords: [] }
};

function safeAlert(msg) { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { console.log('Alert: ' + msg); } }
function calculateFieldScore(q, f) {
  const c = FIELD_MAPPING[f]; if (!c) return 0;
  const ql = q.toLowerCase().trim(); let s = 0;
  for (const e of c.excludeKeywords) if (ql.includes(e.toLowerCase())) return 0;
  for (const k of c.keywords) {
    const kl = k.toLowerCase();
    if (ql === kl) s += 100; else if (ql.startsWith(kl)) s += 50; else if (ql.endsWith(kl)) s += 50; else if (ql.includes(kl)) s += 30;
  }
  return s;
}
function findBestFieldMatch(q) {
  let bf = null, bs = 0;
  for (const f in FIELD_MAPPING) { const s = calculateFieldScore(q, f); if (s > bs) { bs = s; bf = f; } }
  return bs >= 20 ? { field: bf, score: bs } : null;
}
function convertFormResponseToPlayer(ir) {
  const p = {};
  ir.forEach((itemResponse) => {
    const q = itemResponse.getItem().getTitle();
    const a = itemResponse.getResponse();
    if (!a || !a.trim()) return;
    const m = findBestFieldMatch(q);
    if (m) {
      const f = m.field;
      const av = a.toString().trim();
      switch (f) {
        case 'rating':
          const r = parseFloat(av);
          if (!isNaN(r) && r > 0) p.rating = r;
          break;
        case 'name':
        case 'parent_name':
        case 'emergency_contact':
          p[f] = av.toLowerCase().replace(/\\b\\w/g, l => l.toUpperCase()).trim();
          break;
        case 'email':
        case 'parent_email':
          if (av.includes('@')) p[f] = av.toLowerCase().trim();
          break;
        case 'phone':
        case 'parent_phone':
        case 'emergency_phone':
          p[f] = av.replace(/\\D/g, '');
          break;
        default:
          p[f] = av;
      }
    }
  });
  return p;
}
function syncPlayersToAPI(players) {
  const payload = {
    api_key: FORMS_CONFIG.API_KEY,
    players: players,
    lookup_ratings: FORMS_CONFIG.LOOKUP_RATINGS,
    auto_assign_sections: FORMS_CONFIG.AUTO_ASSIGN_SECTIONS,
    source: 'google_sheets'
  };
  const baseURL = FORMS_CONFIG.API_BASE_URL.replace(/\\/$/, '');
  const endpoint = \`\${baseURL}/api/players/api-import/\${FORMS_CONFIG.TOURNAMENT_ID}\`;
  try {
    const response = UrlFetchApp.fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      timeout: 30000
    });
    const status = response.getResponseCode();
    const content = response.getContentText();
    if (content.trim().startsWith('<')) throw new Error('API error');
    if (status !== 200 && status !== 201) throw new Error(\`API status \${status}\`);
    let result;
    try { result = JSON.parse(content); } catch (e) { throw new Error('Parse error'); }
    if (!result.success) throw new Error(result.error || 'API failed');
    return result.data;
  } catch (error) {
    console.error(\`API error: \${error}\`);
    throw error;
  }
}
function checkFormResponses() {
  if (!FORMS_CONFIG.ENABLE_FORM_IMPORT) return;
  try {
    const form = FormApp.openById(FORMS_CONFIG.FORM_ID);
    const responses = form.getResponses();
    if (responses.length === 0) return;
    const lastImportTime = getLastFormImportTime();
    const newResponses = responses.filter(r => !lastImportTime || r.getTimestamp() > lastImportTime);
    if (newResponses.length === 0) return;
    const players = newResponses.map(r => convertFormResponseToPlayer(r.getItemResponses())).filter(p => p && p.name);
    if (players.length === 0) return;
    syncPlayersToAPI(players);
    setLastFormImportTime(new Date());
    players.forEach(player => { if (player.email && FORMS_CONFIG.SEND_CONFIRMATION_EMAILS) sendConfirmationEmail(player.email, player.name); });
  } catch (error) { console.error(\`Error: \${error}\`); }
}
function getLastFormImportTime() {
  const props = PropertiesService.getScriptProperties();
  const time = props.getProperty('lastFormImportTime');
  return time ? new Date(time) : null;
}
function setLastFormImportTime(time) {
  PropertiesService.getScriptProperties().setProperty('lastFormImportTime', time.toISOString());
}
function sendConfirmationEmail(email, name) {
  try {
    GmailApp.sendEmail(email, \`Registration: \${FORMS_CONFIG.TOURNAMENT_ID}\`, \`Dear \${name}, your registration received. Thank you!\`);
  } catch (e) {}
}
function setupFormImport() {
  if (!FORMS_CONFIG.ENABLE_FORM_IMPORT) return;
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => { if (['checkFormResponses', 'onFormSubmit'].includes(t.getHandlerFunction())) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('checkFormResponses').timeBased().everyMinutes(FORMS_CONFIG.CHECK_INTERVAL).create();
}
function onOpen(e) {
  try {
    if (FORMS_CONFIG.ENABLE_FORM_IMPORT) {
      SpreadsheetApp.getUi().createMenu('Google Forms Import')
        .addItem('Setup Form Import', 'setupFormImport')
        .addItem('Check Responses Now', 'checkFormResponses')
        .addToUi();
    }
  } catch (e) {}
}
function setup() { setupFormImport(); }`;
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
          {/* Simple Intro */}
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-900 font-semibold mb-2">Google Apps Script Configuration</p>
            <p className="text-sm text-blue-800">
              Copy the configuration code below and paste it into your Google Apps Script to set up automatic form imports.
            </p>
          </div>

          {/* Apps Script Code - Main Feature */}
          <div className="border-2 border-blue-600 rounded-lg p-6 bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="mb-4">
              <p className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Code size={20} /> Configuration Code
              </p>
              <p className="text-sm text-gray-600">
                Copy and paste into your Google Apps Script:
              </p>
            </div>

            <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm overflow-x-auto mb-6 border border-gray-700">
              <pre className="whitespace-pre-wrap break-words">{getAppsScriptCode()}</pre>
            </div>

            <button
              onClick={() => copyToClipboard(getAppsScriptCode())}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition transform hover:scale-105 active:scale-95"
            >
              <Copy size={20} />
              <span className="text-lg">{copied ? '✓ Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Setup Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
            <p className="font-semibold text-amber-900 mb-3">📋 Setup Instructions:</p>
            <ol className="text-sm text-amber-800 space-y-2 list-decimal list-inside">
              <li>Open your Google Sheet</li>
              <li>Click <code className="bg-amber-100 px-1 rounded">Extensions → Apps Script</code></li>
              <li>Delete all existing code</li>
              <li>Paste the code above</li>
              <li>Save <code className="bg-amber-100 px-1 rounded">Ctrl+S</code> or <code className="bg-amber-100 px-1 rounded">Cmd+S</code></li>
              <li>Run: <code className="bg-amber-100 px-1 rounded">setup()</code> function</li>
              <li>Done! Forms will auto-import</li>
            </ol>
          </div>

          {/* Documentation Links */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
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
