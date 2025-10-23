import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import NetworkDiagnostics from '../utils/networkDiagnostics';

interface NetworkStatusProps {
  baseUrl: string;
  onStatusChange?: (isOnline: boolean) => void;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ baseUrl, onStatusChange }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsReport, setDiagnosticsReport] = useState<any>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      onStatusChange?.(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      onStatusChange?.(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onStatusChange]);

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const diagnostics = NetworkDiagnostics.getInstance();
      const report = await diagnostics.generateNetworkReport(baseUrl);
      setDiagnosticsReport(report);
      setShowDiagnostics(true);
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    
    if (diagnosticsReport) {
      switch (diagnosticsReport.summary.overall) {
        case 'success':
          return <CheckCircle className="w-4 h-4 text-green-500" />;
        case 'warning':
          return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
        case 'error':
          return <XCircle className="w-4 h-4 text-red-500" />;
        default:
          return <Wifi className="w-4 h-4 text-blue-500" />;
      }
    }
    
    return <Wifi className="w-4 h-4 text-blue-500" />;
  };

  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline';
    }
    
    if (diagnosticsReport) {
      switch (diagnosticsReport.summary.overall) {
        case 'success':
          return 'Connected';
        case 'warning':
          return 'Connection Issues';
        case 'error':
          return 'Connection Failed';
        default:
          return 'Unknown';
      }
    }
    
    return 'Online';
  };

  const getStatusColor = () => {
    if (!isOnline) {
      return 'text-red-500';
    }
    
    if (diagnosticsReport) {
      switch (diagnosticsReport.summary.overall) {
        case 'success':
          return 'text-green-500';
        case 'warning':
          return 'text-yellow-500';
        case 'error':
          return 'text-red-500';
        default:
          return 'text-blue-500';
      }
    }
    
    return 'text-blue-500';
  };

  return (
    <div className="relative">
      {/* Network Status Indicator */}
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        <button
          onClick={runDiagnostics}
          disabled={isRunningDiagnostics}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Run network diagnostics"
        >
          <RefreshCw className={`w-3 h-3 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Diagnostics Modal */}
      {showDiagnostics && diagnosticsReport && (
        <div className="absolute top-8 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-96 max-w-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">Network Diagnostics</h3>
            <button
              onClick={() => setShowDiagnostics(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Summary */}
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              {getStatusIcon()}
              <span className={`font-medium ${getStatusColor()}`}>
                {diagnosticsReport.summary.overall.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {diagnosticsReport.summary.testsPassed} of {diagnosticsReport.summary.totalTests} tests passed
            </p>
          </div>

          {/* Test Results */}
          <div className="space-y-2 mb-4">
            {diagnosticsReport.results.map((result: any, index: number) => (
              <div key={index} className="flex items-start space-x-2">
                {result.success ? (
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{result.message}</p>
                  {result.details && (
                    <details className="text-xs text-gray-500 mt-1">
                      <summary className="cursor-pointer hover:text-gray-700">
                        Details
                      </summary>
                      <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {diagnosticsReport.recommendations.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {diagnosticsReport.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Network Info */}
          <details className="text-xs">
            <summary className="cursor-pointer hover:text-gray-700 font-medium">
              Network Information
            </summary>
            <pre className="mt-2 p-2 bg-gray-50 rounded overflow-auto">
              {JSON.stringify(diagnosticsReport.networkInfo, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default NetworkStatus;
