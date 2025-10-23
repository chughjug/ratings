import React, { useState } from 'react';
import { tournamentApi } from './services/api';

const TestAPI: React.FC = () => {
  const [result, setResult] = useState<string>('Click to test');
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      console.log('Testing API call...');
      console.log('API Base URL:', process.env.REACT_APP_API_URL || '/api');
      
      // Try direct fetch first
      try {
        const fetchResponse = await fetch('/api/tournaments', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit'
        });
        console.log('Fetch response:', fetchResponse);
        
        if (fetchResponse.ok) {
          const data = await fetchResponse.json();
          console.log('Fetch data:', data);
          setResult(`Fetch Success! Found ${data.data.length} tournaments`);
        } else {
          setResult(`Fetch Error: ${fetchResponse.status} - ${fetchResponse.statusText}`);
        }
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError);
        setResult(`Fetch Error: ${fetchError.message || 'Unknown error'}`);
      }
      
      // Now try axios
      const response = await tournamentApi.getAll();
      console.log('API Response:', response);
      setResult(`Axios Success! Found ${response.data.data.length} tournaments`);
    } catch (error: any) {
      console.error('API Error:', error);
      setResult(`Error: ${error.message} - ${error.code || 'No code'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border-2 border-red-500 bg-red-50">
      <h3 className="text-lg font-bold mb-2">API Test</h3>
      <button 
        onClick={testAPI} 
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API'}
      </button>
      <p className="mt-2 text-sm">{result}</p>
    </div>
  );
};

export default TestAPI;
