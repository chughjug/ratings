import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Smartphone,
  Monitor,
  Cloud,
  CloudOff,
  Settings,
  Info
} from 'lucide-react';
import pwaService from '../services/pwaService';

interface PWAStatusProps {
  showDetails?: boolean;
  className?: string;
}

const PWAStatus: React.FC<PWAStatusProps> = ({ showDetails = false, className = '' }) => {
  const [appInfo, setAppInfo] = useState(pwaService.getAppInfo());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateAppInfo = () => {
      setAppInfo(pwaService.getAppInfo());
    };

    // Update app info periodically
    const interval = setInterval(updateAppInfo, 5000);

    // Listen for online/offline events
    window.addEventListener('online', updateAppInfo);
    window.addEventListener('offline', updateAppInfo);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', updateAppInfo);
      window.removeEventListener('offline', updateAppInfo);
    };
  }, []);

  const getStatusIcon = () => {
    if (appInfo.isInstalled) {
      return <Smartphone className="h-4 w-4 text-green-600" />;
    }
    
    if (appInfo.isOnline) {
      return <Wifi className="h-4 w-4 text-blue-600" />;
    }
    
    return <WifiOff className="h-4 w-4 text-red-600" />;
  };

  const getStatusText = () => {
    if (appInfo.isInstalled) {
      return 'App Installed';
    }
    
    if (appInfo.isOnline) {
      return 'Online';
    }
    
    return 'Offline';
  };

  const getStatusColor = () => {
    if (appInfo.isInstalled) {
      return 'text-green-600 bg-green-100';
    }
    
    if (appInfo.isOnline) {
      return 'text-blue-600 bg-blue-100';
    }
    
    return 'text-red-600 bg-red-100';
  };

  const handleInstall = () => {
    pwaService.installApp();
  };

  const handleSync = () => {
    pwaService.syncOfflineData();
  };

  const handleClearQueue = () => {
    pwaService.clearOfflineQueue();
    setAppInfo(pwaService.getAppInfo());
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor().split(' ')[0]}`}>
          {getStatusText()}
        </span>
        {appInfo.offlineQueueLength > 0 && (
          <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
            {appInfo.offlineQueueLength} pending
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Monitor className="h-5 w-5" />
          <span>App Status</span>
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-600"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-3">
          {appInfo.isOnline ? (
            <Cloud className="h-6 w-6 text-green-600" />
          ) : (
            <CloudOff className="h-6 w-6 text-red-600" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">
              {appInfo.isOnline ? 'Online' : 'Offline'}
            </p>
            <p className="text-xs text-gray-500">
              {appInfo.isOnline ? 'Connected to server' : 'Working offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {appInfo.isInstalled ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : (
            <AlertCircle className="h-6 w-6 text-yellow-600" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">
              {appInfo.isInstalled ? 'Installed' : 'Web App'}
            </p>
            <p className="text-xs text-gray-500">
              {appInfo.isInstalled ? 'Running as app' : 'Running in browser'}
            </p>
          </div>
        </div>
      </div>

      {/* Offline Queue Status */}
      {appInfo.offlineQueueLength > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                {appInfo.offlineQueueLength} pending sync
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSync}
                className="text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700"
              >
                Sync Now
              </button>
              <button
                onClick={handleClearQueue}
                className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install Button */}
      {pwaService.canInstall() && !appInfo.isInstalled && (
        <div className="mb-4">
          <button
            onClick={handleInstall}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Install App</span>
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Install for better performance and offline access
          </p>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t pt-4 space-y-3">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">System Information</h4>
            <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Platform:</span>
                <span>{appInfo.platform}</span>
              </div>
              <div className="flex justify-between">
                <span>Language:</span>
                <span>{appInfo.language}</span>
              </div>
              <div className="flex justify-between">
                <span>Cookies:</span>
                <span>{appInfo.cookieEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex justify-between">
                <span>Connection:</span>
                <span>{appInfo.onLine ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Offline Features</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>View cached tournaments</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Browse player profiles</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Check standings history</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Create new tournaments</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">Progressive Web App</p>
                <p>
                  This app works offline and can be installed on your device for a native app experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PWAStatus;
