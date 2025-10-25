import React, { useState, useEffect } from 'react';
import { ExternalLink, Users, Trophy, Gamepad2, RefreshCw, Settings, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';

interface LichessUser {
  id: string;
  username: string;
  title?: string;
  rating?: number;
  online?: boolean;
}

interface LichessTournament {
  id: string;
  name: string;
  status: string;
  nbPlayers: number;
  nbRounds: number;
  clock: {
    limit: number;
    increment: number;
  };
  startsAt?: string;
  finishedAt?: string;
}

interface LichessIntegrationProps {
  tournamentId: string;
  tournamentName: string;
  timeControl: string;
  rounds: number;
  players: Array<{
    id: string;
    name: string;
    lichess_username?: string;
    rating?: number;
  }>;
  onGamesCreated?: (games: any[]) => void;
}

const LichessIntegration: React.FC<LichessIntegrationProps> = ({
  tournamentId,
  tournamentName,
  timeControl,
  rounds,
  players,
  onGamesCreated
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<LichessUser | null>(null);
  const [lichessTournament, setLichessTournament] = useState<LichessTournament | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [playerMappings, setPlayerMappings] = useState<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'error'>('idle');

  // Parse time control (e.g., "G/30+0", "G/60+5")
  const parseTimeControl = (timeControl: string) => {
    const match = timeControl.match(/G\/(\d+)\+(\d+)/);
    if (match) {
      return {
        timeLimit: parseInt(match[1]),
        increment: parseInt(match[2])
      };
    }
    return { timeLimit: 30, increment: 0 };
  };

  const timeControlData = parseTimeControl(timeControl);

  // Check if user is already authenticated
  useEffect(() => {
    const storedToken = localStorage.getItem('lichess_access_token');
    const storedUser = localStorage.getItem('lichess_user');
    
    if (storedToken && storedUser) {
      setAccessToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  // Initialize player mappings
  useEffect(() => {
    const mappings: Record<string, string> = {};
    players.forEach(player => {
      if (player.lichess_username) {
        mappings[player.id] = player.lichess_username;
      }
    });
    setPlayerMappings(mappings);
  }, [players]);

  const handleAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/lichess/auth');
      const data = await response.json();

      if (data.success) {
        // Store state for verification
        localStorage.setItem('lichess_oauth_state', data.state);
        // Redirect to Lichess OAuth
        window.location.href = data.authUrl;
      } else {
        setError(data.error || 'Failed to initiate authentication');
      }
    } catch (err) {
      setError('Failed to connect to Lichess');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      setError(`Authentication failed: ${error}`);
      return;
    }

    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, []);

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const storedState = localStorage.getItem('lichess_oauth_state');
      if (state !== storedState) {
        throw new Error('Invalid state parameter');
      }

      const response = await fetch('/api/lichess/callback', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setAccessToken(data.accessToken);
        setUser(data.user);
        setIsAuthenticated(true);
        
        // Store in localStorage
        localStorage.setItem('lichess_access_token', data.accessToken);
        localStorage.setItem('lichess_user', JSON.stringify(data.user));
        
        setSuccess('Successfully authenticated with Lichess!');
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Failed to complete authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const createLichessTournament = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const tournamentData = {
        name: tournamentName,
        rounds: rounds,
        timeControl: timeControlData,
        description: `Chess tournament: ${tournamentName}`,
        startDate: new Date().toISOString()
      };

      const response = await fetch('/api/lichess/tournament/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken,
          tournamentData
        })
      });

      const data = await response.json();

      if (data.success) {
        setLichessTournament(data.lichessTournament);
        setSuccess('Lichess tournament created successfully!');
      } else {
        setError(data.error || 'Failed to create tournament');
      }
    } catch (err) {
      setError('Failed to create Lichess tournament');
    } finally {
      setIsLoading(false);
    }
  };

  const joinTournament = async () => {
    if (!lichessTournament) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/lichess/tournament/${lichessTournament.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accessToken })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Successfully joined the tournament!');
      } else {
        setError(data.error || 'Failed to join tournament');
      }
    } catch (err) {
      setError('Failed to join tournament');
    } finally {
      setIsLoading(false);
    }
  };

  const createChallenges = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get pairings for current round (you'll need to implement this)
      const pairings = await getCurrentRoundPairings();
      
      const challenges = pairings.map((pairing: any) => ({
        id: pairing.id,
        whitePlayer: {
          ...pairing.whitePlayer,
          lichess_username: playerMappings[pairing.whitePlayer.id]
        },
        blackPlayer: {
          ...pairing.blackPlayer,
          lichess_username: playerMappings[pairing.blackPlayer.id]
        }
      }));

      const response = await fetch('/api/lichess/challenges/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken,
          pairings: challenges,
          timeControl: timeControlData
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Created ${data.challenges.length} challenges!`);
        if (onGamesCreated) {
          onGamesCreated(data.challenges);
        }
      } else {
        setError(data.error || 'Failed to create challenges');
      }
    } catch (err) {
      setError('Failed to create challenges');
    } finally {
      setIsLoading(false);
    }
  };

  const syncResults = async () => {
    if (!lichessTournament) return;

    try {
      setIsLoading(true);
      setSyncStatus('syncing');
      setError(null);

      const response = await fetch(`/api/lichess/tournament/${lichessTournament.id}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tournamentId,
          accessToken
        })
      });

      const data = await response.json();

      if (data.success) {
        setSyncStatus('completed');
        setSuccess(`Synced ${data.syncedGames} games successfully!`);
      } else {
        setSyncStatus('error');
        setError(data.error || 'Failed to sync results');
      }
    } catch (err) {
      setSyncStatus('error');
      setError('Failed to sync results');
    } finally {
      setIsLoading(false);
    }
  };

  const searchLichessUser = async (query: string) => {
    try {
      const response = await fetch(`/api/lichess/users/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      return data.success ? data.users : [];
    } catch (err) {
      console.error('Error searching users:', err);
      return [];
    }
  };

  const getCurrentRoundPairings = async () => {
    // This would need to be implemented to get current round pairings
    // For now, return empty array
    return [];
  };

  const handlePlayerMappingChange = (playerId: string, lichessUsername: string) => {
    setPlayerMappings(prev => ({
      ...prev,
      [playerId]: lichessUsername
    }));
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setLichessTournament(null);
    localStorage.removeItem('lichess_access_token');
    localStorage.removeItem('lichess_user');
    localStorage.removeItem('lichess_oauth_state');
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Gamepad2 className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Lichess Integration</span>
          </div>
          
          <button
            onClick={handleAuth}
            disabled={isLoading}
            className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-3 h-3 mr-1" />
                Connect
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Gamepad2 className="w-4 h-4 mr-2 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Lichess Integration</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            <Settings className="w-3 h-3" />
          </button>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Logout
          </button>
        </div>
      </div>

      {user && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
          <div className="flex items-center">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mr-2">
              <span className="text-xs font-medium text-blue-600">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-900">
                {user.username}
                {user.title && <span className="ml-1 text-yellow-600">{user.title}</span>}
              </span>
              {user.rating && (
                <span className="ml-2 text-gray-500">
                  Rating: {user.rating}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs flex items-center">
          <AlertCircle className="w-3 h-3 text-red-500 mr-1" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs flex items-center">
          <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      <div className="space-y-3">
        {!lichessTournament ? (
          <div className="text-center py-2">
            <button
              onClick={createLichessTournament}
              disabled={isLoading}
              className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : `Create Swiss Tournament (${rounds} rounds)`}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="p-2 bg-blue-50 rounded text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-blue-900">{lichessTournament.name}</span>
                  <span className="ml-2 text-blue-700">
                    {lichessTournament.nbPlayers}p • {lichessTournament.nbRounds}r • 
                    {Math.floor(lichessTournament.clock.limit / 60)}m+{lichessTournament.clock.increment}s
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-700">{lichessTournament.status}</span>
                  <a
                    href={`https://lichess.org/swiss/${lichessTournament.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex space-x-1">
              <button
                onClick={joinTournament}
                disabled={isLoading}
                className="flex-1 bg-green-600 text-white px-2 py-1 text-xs rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
              >
                <Users className="w-3 h-3 mr-1" />
                Join
              </button>
              
              <button
                onClick={syncResults}
                disabled={isLoading || syncStatus === 'syncing'}
                className="flex-1 bg-purple-600 text-white px-2 py-1 text-xs rounded hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Sync
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Sync
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="border-t pt-2">
            <h4 className="text-xs font-medium text-gray-900 mb-2">Player Mappings</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {players.map(player => (
                <div key={player.id} className="flex items-center space-x-1">
                  <span className="text-xs text-gray-600 w-24 truncate">{player.name}</span>
                  <span className="text-gray-400 text-xs">→</span>
                  <input
                    type="text"
                    value={playerMappings[player.id] || ''}
                    onChange={(e) => handlePlayerMappingChange(player.id, e.target.value)}
                    placeholder="Lichess username"
                    className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LichessIntegration;
