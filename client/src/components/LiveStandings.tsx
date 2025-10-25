import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Users, 
  Clock, 
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  EyeOff,
  Settings,
  Zap
} from 'lucide-react';
import { liveStandingsApi } from '../services/api';

interface LiveStandingsProps {
  tournamentId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface StandingsData {
  tournamentId: string;
  currentRound: number;
  totalRounds: number;
  standings: Array<{
    rank: number;
    player: {
      id: string;
      name: string;
      rating: number;
    };
    score: number;
    tiebreaks: {
      buchholz: number;
      sonneborn: number;
    };
    roundResults: string[];
  }>;
  lastUpdated: string;
}

interface LiveStandingsState {
  isConnected: boolean;
  isSubscribed: boolean;
  standings: StandingsData | null;
  lastUpdate: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
  connectedClients: number;
  autoRefresh: boolean;
  refreshInterval: number;
}

const LiveStandings: React.FC<LiveStandingsProps> = ({ tournamentId, isOpen, onClose }) => {
  const [state, setState] = useState<LiveStandingsState>({
    isConnected: false,
    isSubscribed: false,
    standings: null,
    lastUpdate: null,
    connectionStatus: 'disconnected',
    error: null,
    connectedClients: 0,
    autoRefresh: true,
    refreshInterval: 5000
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && tournamentId) {
      connectWebSocket();
      loadInitialData();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isOpen, tournamentId]);

  useEffect(() => {
    if (state.autoRefresh && state.isConnected) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [state.autoRefresh, state.isConnected]);

  const connectWebSocket = () => {
    try {
      const wsUrl = process.env.REACT_APP_WS_URL || `ws://localhost:5000/ws/standings`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          connectionStatus: 'connected',
          error: null
        }));
        
        // Subscribe to tournament
        subscribeToTournament();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setState(prev => ({
          ...prev,
          isConnected: false,
          isSubscribed: false,
          connectionStatus: 'disconnected'
        }));
        
        // Attempt to reconnect after 3 seconds
        if (isOpen) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: 'Connection error occurred'
        }));
      };
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: 'Failed to connect to live standings'
      }));
    }
  };

  const disconnectWebSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isSubscribed: false,
      connectionStatus: 'disconnected'
    }));
  };

  const subscribeToTournament = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        tournamentId
      }));
    }
  };

  const unsubscribeFromTournament = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        tournamentId
      }));
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'standings_update':
        setState(prev => ({
          ...prev,
          standings: data.data,
          lastUpdate: new Date().toISOString(),
          isSubscribed: true
        }));
        break;
      case 'pong':
        // Connection is alive
        break;
      case 'error':
        setState(prev => ({
          ...prev,
          error: data.error
        }));
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const loadInitialData = async () => {
    try {
      const response = await liveStandingsApi.getStandings(tournamentId);
      if (response.data.success) {
        setState(prev => ({
          ...prev,
          standings: response.data.data,
          lastUpdate: response.data.data.lastUpdated
        }));
      }
    } catch (error) {
      console.error('Failed to load initial standings:', error);
    }

    try {
      const response = await liveStandingsApi.getClientCount(tournamentId);
      if (response.data.success) {
        setState(prev => ({
          ...prev,
          connectedClients: response.data.data.connectedClients
        }));
      }
    } catch (error) {
      console.error('Failed to load client count:', error);
    }
  };

  const triggerManualUpdate = async () => {
    try {
      await liveStandingsApi.triggerUpdate(tournamentId);
    } catch (error) {
      console.error('Failed to trigger update:', error);
    }
  };

  const startAutoRefresh = () => {
    stopAutoRefresh();
    refreshIntervalRef.current = setInterval(() => {
      if (state.isConnected) {
        triggerManualUpdate();
      }
    }, state.refreshInterval);
  };

  const stopAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  const getConnectionStatusIcon = () => {
    switch (state.connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />;
      case 'error':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (state.connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'W':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'L':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'D':
        return <Minus className="h-4 w-4 text-gray-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Zap className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Live Standings</h2>
              <div className="flex items-center space-x-2">
                {getConnectionStatusIcon()}
                <span className={`text-sm font-medium ${
                  state.connectionStatus === 'connected' ? 'text-green-600' :
                  state.connectionStatus === 'error' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {getConnectionStatusText()}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{state.connectedClients} viewers</span>
              </div>
              {state.lastUpdate && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{formatTimeAgo(state.lastUpdate)}</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <WifiOff className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={triggerManualUpdate}
                disabled={!state.isConnected}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Now</span>
              </button>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={state.autoRefresh}
                  onChange={(e) => setState(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoRefresh" className="text-sm text-gray-700">
                  Auto-refresh
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-700">Interval:</label>
                <select
                  value={state.refreshInterval}
                  onChange={(e) => setState(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) }))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value={1000}>1s</option>
                  <option value={3000}>3s</option>
                  <option value={5000}>5s</option>
                  <option value={10000}>10s</option>
                  <option value={30000}>30s</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className={`w-2 h-2 rounded-full ${
                state.isSubscribed ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
              <span>{state.isSubscribed ? 'Subscribed' : 'Not subscribed'}</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200">
            <div className="flex items-center space-x-2 text-red-800">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">{state.error}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {state.standings ? (
            <div className="space-y-6">
              {/* Tournament Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-blue-900">
                      Round {state.standings.currentRound} of {state.standings.totalRounds}
                    </h3>
                    <p className="text-sm text-blue-700">
                      {state.standings.standings.length} players
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-700">
                      Last updated: {formatTimeAgo(state.standings.lastUpdated)}
                    </p>
                    <p className="text-xs text-blue-600">
                      Live updates {state.isConnected ? 'enabled' : 'disabled'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Standings Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Buchholz
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Results
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {state.standings.standings.map((player, index) => (
                      <tr key={player.player.id} className={index < 3 ? 'bg-yellow-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {index === 0 && <Trophy className="h-5 w-5 text-yellow-500 mr-2" />}
                            <span className={`text-sm font-medium ${
                              index < 3 ? 'text-yellow-800' : 'text-gray-900'
                            }`}>
                              {player.rank}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {player.player.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {player.player.rating}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-gray-900">
                            {player.score}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {player.tiebreaks.buchholz}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-1">
                            {player.roundResults.map((result, roundIndex) => (
                              <div key={roundIndex} className="flex items-center">
                                {getResultIcon(result)}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-gray-500">Loading live standings...</p>
                {!state.isConnected && (
                  <p className="text-sm text-gray-400 mt-2">
                    Waiting for connection...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Live standings update every {state.refreshInterval / 1000}s
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStandings;
