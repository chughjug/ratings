import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { tournamentApi } from '../services/api';

interface NetworkTest {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

const NetworkDebugger: React.FC = () => {
  const [tests, setTests] = useState<NetworkTest[]>([
    { name: 'Server Connectivity', status: 'pending', message: 'Testing...' },
    { name: 'API Endpoint', status: 'pending', message: 'Testing...' },
    { name: 'CORS Headers', status: 'pending', message: 'Testing...' },
    { name: 'Data Retrieval', status: 'pending', message: 'Testing...' }
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const runNetworkTests = useCallback(async () => {
    setIsRunning(true);
    setTests(prev => prev.map(test => ({ ...test, status: 'pending', message: 'Testing...' })));

    try {
      // Test 1: Basic server connectivity
      console.log('🔍 Starting network tests...');
      
      // Test 2: API endpoint
      setTests(prev => prev.map((test, index) => 
        index === 1 ? { ...test, status: 'pending', message: 'Testing API endpoint...' } : test
      ));
      
      const apiResponse = await tournamentApi.getAll();
      setTests(prev => prev.map((test, index) => 
        index === 1 ? { 
          ...test, 
          status: 'success', 
          message: `API working - ${apiResponse.data.data.length} tournaments found`,
          details: apiResponse.data
        } : test
      ));

      // Test 3: CORS headers
      setTests(prev => prev.map((test, index) => 
        index === 2 ? { ...test, status: 'pending', message: 'Testing CORS...' } : test
      ));
      
      const corsResponse = await fetch('https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/tournaments', {
        method: 'GET',
        headers: {
          'Origin': 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com',
          'Content-Type': 'application/json'
        }
      });
      
      setTests(prev => prev.map((test, index) => 
        index === 2 ? { 
          ...test, 
          status: corsResponse.ok ? 'success' : 'error',
          message: corsResponse.ok ? 'CORS working correctly' : `CORS failed: ${corsResponse.status}`,
          details: {
            status: corsResponse.status,
            headers: Object.fromEntries(corsResponse.headers.entries())
          }
        } : test
      ));

      // Test 4: Data retrieval
      setTests(prev => prev.map((test, index) => 
        index === 3 ? { ...test, status: 'pending', message: 'Testing data retrieval...' } : test
      ));
      
      const dataResponse = await tournamentApi.getAll();
      setTests(prev => prev.map((test, index) => 
        index === 3 ? { 
          ...test, 
          status: 'success', 
          message: `Data retrieved successfully - ${dataResponse.data.data.length} tournaments`,
          details: dataResponse.data
        } : test
      ));

      // Test 1: Server connectivity (after other tests)
      setTests(prev => prev.map((test, index) => 
        index === 0 ? { 
          ...test, 
          status: 'success', 
          message: 'Server is reachable',
          details: { timestamp: new Date().toISOString() }
        } : test
      ));

    } catch (error: any) {
      console.error('❌ Network test failed:', error);
      
      // Update the first failing test
      setTests(prev => {
        const firstPendingIndex = prev.findIndex(test => test.status === 'pending');
        if (firstPendingIndex !== -1) {
          return prev.map((test, index) => 
            index === firstPendingIndex ? { 
              ...test, 
              status: 'error', 
              message: `Failed: ${error.message}`,
              details: error
            } : test
          );
        }
        return prev;
      });
    } finally {
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    runNetworkTests();
  }, [runNetworkTests]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md z-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Wifi className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-800">Network Debugger</h3>
        </div>
        <button
          onClick={runNetworkTests}
          disabled={isRunning}
          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-3">
        {tests.map((test, index) => (
          <div key={index} className="flex items-start space-x-3">
            {getStatusIcon(test.status)}
            <div className="flex-1">
              <div className={`font-medium ${getStatusColor(test.status)}`}>
                {test.name}
              </div>
              <div className="text-sm text-gray-600">
                {test.message}
              </div>
              {test.details && (
                <details className="mt-1">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    View Details
                  </summary>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-32">
                    {JSON.stringify(test.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <div>API Base URL: {process.env.REACT_APP_API_URL || 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api'}</div>
          <div>Current URL: {window.location.href}</div>
          <div>Timestamp: {new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
};

export default NetworkDebugger;
