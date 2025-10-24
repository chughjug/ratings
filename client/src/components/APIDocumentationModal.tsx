import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Code, Zap, Search, Users, Database, Globe, Key, Play } from 'lucide-react';
import APITestingTool from './APITestingTool';

interface APIDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  tournamentName: string;
  apiKey: string;
}

const APIDocumentationModal: React.FC<APIDocumentationModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  tournamentName,
  apiKey
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'registration' | 'bulk-import' | 'examples' | 'testing'>('overview');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseUrl = window.location.origin;
  const apiBaseUrl = `${baseUrl}/api`;

  const copyToClipboard = async (text: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const CodeBlock = ({ code, language = 'bash', id }: { code: string; language?: string; id: string }) => (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, id)}
        className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition-colors"
      >
        {copiedCode === id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );

  const registrationExample = `curl -X POST ${apiBaseUrl}/players/register/${tournamentId} \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "${apiKey}",
    "name": "Magnus Carlsen",
    "email": "magnus@example.com",
    "phone": "+1-555-0123",
    "state": "NY",
    "city": "New York",
    "school": "Chess Academy",
    "grade": "12",
    "parent_name": "Henrik Carlsen",
    "parent_email": "henrik@example.com",
    "emergency_contact": "Henrik Carlsen",
    "emergency_phone": "+1-555-0123",
    "tshirt_size": "L",
    "dietary_restrictions": "None",
    "special_needs": "None"
  }'`;

  const bulkImportExample = `curl -X POST ${apiBaseUrl}/players/api-import/${tournamentId} \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "${apiKey}",
    "players": [
      {
        "name": "Magnus Carlsen",
        "email": "magnus@example.com",
        "phone": "+1-555-0123"
      },
      {
        "name": "Hikaru Nakamura", 
        "email": "hikaru@example.com",
        "phone": "+1-555-0124"
      },
      {
        "name": "John Doe",
        "uscf_id": "15274812",
        "email": "john@example.com"
      }
    ],
    "lookup_ratings": true,
    "auto_assign_sections": true
  }'`;

  const pythonExample = `import requests
import json

# Configuration
API_URL = '${apiBaseUrl}/players/register/${tournamentId}'
API_KEY = '${apiKey}'

# Player data
player_data = {
    'api_key': API_KEY,
    'name': 'Magnus Carlsen',
    'email': 'magnus@example.com',
    'phone': '+1-555-0123',
    'state': 'NY',
    'city': 'New York'
}

# Make request
response = requests.post(API_URL, json=player_data)
result = response.json()

if result['success']:
    print(f"Player registered: {result['data']['player_id']}")
    print(f"Rating found: {result['data']['rating_lookup']['rating']}")
else:
    print(f"Error: {result['error']}")`;

  const javascriptExample = `const API_URL = '${apiBaseUrl}/players/register/${tournamentId}';
const API_KEY = '${apiKey}';

const playerData = {
    api_key: API_KEY,
    name: 'Magnus Carlsen',
    email: 'magnus@example.com',
    phone: '+1-555-0123',
    state: 'NY',
    city: 'New York'
};

fetch(API_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(playerData)
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        console.log('Player registered:', data.data.player_id);
        console.log('Rating found:', data.data.rating_lookup.rating);
    } else {
        console.error('Error:', data.error);
    }
});`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">API Documentation</h2>
            <p className="text-gray-600">Tournament: {tournamentName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: Globe },
              { id: 'registration', label: 'Single Registration', icon: Users },
              { id: 'bulk-import', label: 'Bulk Import', icon: Database },
              { id: 'examples', label: 'Code Examples', icon: Code },
              { id: 'testing', label: 'Test API', icon: Play }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Zap className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-semibold text-blue-900">Enhanced USCF Lookup</h3>
                    <p className="text-blue-800 text-sm mt-1">
                      Our API automatically searches for USCF ratings for ANY player name, even if no USCF ID is provided. 
                      This means you can register players with just their name and we'll find their rating automatically!
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">API Endpoints</h3>
                  <div className="space-y-3">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Single Player Registration</h4>
                          <p className="text-sm text-gray-600">Register one player at a time</p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">POST</span>
                      </div>
                      <code className="text-sm text-gray-600 mt-2 block">
                        {apiBaseUrl}/players/register/{tournamentId}
                      </code>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Bulk Player Import</h4>
                          <p className="text-sm text-gray-600">Import multiple players at once</p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">POST</span>
                      </div>
                      <code className="text-sm text-gray-600 mt-2 block">
                        {apiBaseUrl}/players/api-import/{tournamentId}
                      </code>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Get Players</h4>
                          <p className="text-sm text-gray-600">Retrieve all tournament players</p>
                        </div>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">GET</span>
                      </div>
                      <code className="text-sm text-gray-600 mt-2 block">
                        {apiBaseUrl}/players/tournament/{tournamentId}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Key Features</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Search className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Automatic USCF Lookup</h4>
                        <p className="text-sm text-gray-600">Searches for player ratings by name, even without USCF ID</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Section Auto-Assignment</h4>
                        <p className="text-sm text-gray-600">Automatically assigns players to appropriate sections based on rating</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Database className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Bulk Operations</h4>
                        <p className="text-sm text-gray-600">Import hundreds of players efficiently with parallel processing</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Key className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">API Key Authentication</h4>
                        <p className="text-sm text-gray-600">Secure access with configurable API keys</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">Required vs Optional Fields</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-green-800 mb-1">✅ Required</h4>
                    <ul className="text-yellow-800 space-y-1">
                      <li>• <code>name</code> - Player's full name</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 mb-1">❌ Optional (All Others)</h4>
                    <ul className="text-yellow-800 space-y-1">
                      <li>• <code>uscf_id</code>, <code>fide_id</code>, <code>rating</code></li>
                      <li>• <code>email</code>, <code>phone</code>, <code>school</code></li>
                      <li>• <code>parent_name</code>, <code>emergency_contact</code></li>
                      <li>• <code>tshirt_size</code>, <code>dietary_restrictions</code></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'registration' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Single Player Registration</h3>
                <p className="text-gray-600 mb-4">
                  Register one player at a time. The API will automatically search for USCF ratings even if no USCF ID is provided.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">cURL Example</h4>
                <CodeBlock code={registrationExample} id="registration-curl" />
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Response Format</h4>
                <pre className="text-sm text-gray-700 overflow-x-auto">
{`{
  "success": true,
  "message": "Player registered successfully",
  "data": {
    "player_id": "uuid-here",
    "tournament_id": "${tournamentId}",
    "tournament_name": "${tournamentName}",
    "player": {
      "name": "Magnus Carlsen",
      "uscf_id": "15218438",
      "rating": 2914,
      "section": "Open",
      "email": "magnus@example.com"
    },
    "rating_lookup": {
      "success": true,
      "rating": 2914,
      "expirationDate": "07/31/2013",
      "isActive": false,
      "searchAttempted": true,
      "matchedName": "Magnus CARLSEN",
      "uscf_id": "15218438"
    },
    "auto_assigned_section": true
  }
}`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'bulk-import' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Player Import</h3>
                <p className="text-gray-600 mb-4">
                  Import multiple players at once. Perfect for large tournaments with hundreds of players.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">cURL Example</h4>
                <CodeBlock code={bulkImportExample} id="bulk-curl" />
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Response Format</h4>
                <pre className="text-sm text-gray-700 overflow-x-auto">
{`{
  "success": true,
  "message": "Successfully imported 3 players",
  "data": {
    "tournament_id": "${tournamentId}",
    "tournament_name": "${tournamentName}",
    "imported_count": 3,
    "player_ids": ["uuid1", "uuid2", "uuid3"],
    "rating_lookup_results": [
      {
        "name": "Magnus Carlsen",
        "uscf_id": "15218438",
        "success": true,
        "rating": 2914,
        "expirationDate": "07/31/2013",
        "isActive": false,
        "searchAttempted": true
      }
    ],
    "import_errors": [],
    "validation_errors": []
  }
}`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'examples' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Code Examples</h3>
                <p className="text-gray-600 mb-4">
                  Examples in different programming languages to help you integrate with our API.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Python</h4>
                  <CodeBlock code={pythonExample} language="python" id="python-example" />
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">JavaScript/Node.js</h4>
                  <CodeBlock code={javascriptExample} language="javascript" id="js-example" />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Pro Tips</h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Always include error handling for API responses</li>
                  <li>• Use bulk import for more than 5 players to improve performance</li>
                  <li>• The API automatically handles USCF rating lookups - no need to provide USCF IDs</li>
                  <li>• Set <code>lookup_ratings: true</code> and <code>auto_assign_sections: true</code> for best results</li>
                  <li>• Check the <code>rating_lookup</code> field in responses to see if ratings were found</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'testing' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Test API Integration</h3>
                <p className="text-gray-600 mb-4">
                  Test the API directly from your browser or copy the examples to test with your own tools.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Quick Test</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Test with a simple player registration
                  </p>
                  <button
                    onClick={() => {
                      const testData = {
                        api_key: apiKey,
                        name: 'Test Player',
                        email: 'test@example.com'
                      };
                      copyToClipboard(JSON.stringify(testData, null, 2), 'test-data');
                    }}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy Test Data</span>
                  </button>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">API Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">API Key:</span>
                      <code className="text-gray-900">{apiKey}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tournament ID:</span>
                      <code className="text-gray-900">{tournamentId}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base URL:</span>
                      <code className="text-gray-900">{apiBaseUrl}</code>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">✅ Ready to Use</h4>
                <p className="text-green-800 text-sm">
                  Your API is ready! Use the examples above to integrate player registration into your application. 
                  The enhanced USCF lookup will automatically find ratings for any player name you provide.
                </p>
              </div>

              <APITestingTool tournamentId={tournamentId} apiKey={apiKey} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default APIDocumentationModal;
