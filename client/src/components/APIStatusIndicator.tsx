import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CheckCircle, AlertCircle, Code } from 'lucide-react';

interface APIStatusIndicatorProps {
  tournamentId: string;
  apiKey: string;
}

const APIStatusIndicator: React.FC<APIStatusIndicatorProps> = ({ tournamentId, apiKey }) => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline' | 'error'>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkAPIStatus = async () => {
    setStatus('checking');
    try {
      const response = await fetch(`/api/players/tournament/${tournamentId}?api_key=${apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setStatus('online');
      } else if (response.status === 401) {
        setStatus('error');
      } else {
        setStatus('offline');
      }
    } catch (error) {
      setStatus('offline');
    } finally {
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    checkAPIStatus();
    // Check every 30 seconds
    const interval = setInterval(checkAPIStatus, 30000);
    return () => clearInterval(interval);
  }, [tournamentId, apiKey]);

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Wifi className="h-4 w-4 animate-pulse text-yellow-500" />;
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Checking API...';
      case 'online':
        return 'API Online';
      case 'offline':
        return 'API Offline';
      case 'error':
        return 'API Error';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'online':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'offline':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'error':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-sm ${getStatusColor()}`}>
      {getStatusIcon()}
      <span className="font-medium">{getStatusText()}</span>
      {lastChecked && (
        <span className="text-xs opacity-75">
          ({lastChecked.toLocaleTimeString()})
        </span>
      )}
    </div>
  );
};

export default APIStatusIndicator;
