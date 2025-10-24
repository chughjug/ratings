import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, Copy, RefreshCw } from 'lucide-react';

interface APITestingToolProps {
  tournamentId: string;
  apiKey: string;
}

const APITestingTool: React.FC<APITestingToolProps> = ({ tournamentId, apiKey }) => {
  const [testData, setTestData] = useState({
    name: 'Magnus Carlsen',
    email: 'magnus@example.com',
    phone: '+1-555-0123',
    state: 'NY',
    city: 'New York',
    school: 'Chess Academy',
    grade: '12'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/players/register/${tournamentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          ...testData
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Test Player Registration</h4>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={testData.name}
              onChange={(e) => setTestData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Player name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={testData.email}
              onChange={(e) => setTestData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="player@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={testData.phone}
              onChange={(e) => setTestData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1-555-0123"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              value={testData.state}
              onChange={(e) => setTestData(prev => ({ ...prev, state: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="NY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={testData.city}
              onChange={(e) => setTestData(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="New York"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
            <input
              type="text"
              value={testData.school}
              onChange={(e) => setTestData(prev => ({ ...prev, school: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Chess Academy"
            />
          </div>
        </div>

        <button
          onClick={runTest}
          disabled={isLoading || !testData.name.trim()}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          <span>{isLoading ? 'Testing...' : 'Test Registration'}</span>
        </button>
      </div>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-green-900">Test Successful!</h4>
            </div>
            <button
              onClick={copyResult}
              className="flex items-center space-x-1 text-green-700 hover:text-green-800 text-sm"
            >
              <Copy className="h-4 w-4" />
              <span>Copy</span>
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-green-700">Player ID:</span>
              <code className="text-green-900">{result.data?.player_id}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Name:</span>
              <span className="text-green-900">{result.data?.player?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">USCF ID:</span>
              <span className="text-green-900">{result.data?.player?.uscf_id || 'Not found'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Rating:</span>
              <span className="text-green-900">{result.data?.player?.rating || 'Not found'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Section:</span>
              <span className="text-green-900">{result.data?.player?.section || 'Not assigned'}</span>
            </div>
            {result.data?.rating_lookup?.searchAttempted && (
              <div className="mt-2 p-2 bg-green-100 rounded text-xs">
                <div className="font-medium text-green-800">USCF Lookup Results:</div>
                <div className="text-green-700">
                  {result.data.rating_lookup.success ? (
                    <>
                      Found rating: {result.data.rating_lookup.rating} 
                      {result.data.rating_lookup.matchedName && (
                        <span> (matched: {result.data.rating_lookup.matchedName})</span>
                      )}
                    </>
                  ) : (
                    `Search attempted but failed: ${result.data.rating_lookup.error}`
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <h4 className="font-medium text-red-900">Test Failed</h4>
          </div>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default APITestingTool;
