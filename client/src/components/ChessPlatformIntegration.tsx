import React, { useState, useEffect } from 'react';
import { 
  Search, 
  User, 
  Trophy, 
  Clock, 
  Puzzle,
  Users,
  ExternalLink,
  Download,
  RefreshCw,
  Star,
  Globe,
  Target,
  TrendingUp,
  Award,
  Activity,
  Zap,
  Crown,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { chessIntegrationApi } from '../services/api';

interface ChessPlatformIntegrationProps {
  tournamentId?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PlayerProfile {
  username: string;
  name: string;
  rating: number;
  title?: string;
  country?: string;
  avatar?: string;
  platform: 'chesscom' | 'lichess';
  stats?: any;
  recentGames?: any[];
}

interface SearchResult {
  username: string;
  name: string;
  rating: number;
  title?: string;
  country?: string;
  source: 'chess.com' | 'lichess';
}

const ChessPlatformIntegration: React.FC<ChessPlatformIntegrationProps> = ({ 
  tournamentId, 
  isOpen, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'profiles' | 'live' | 'puzzles' | 'leaderboards'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<'chesscom' | 'lichess'>('chesscom');
  const [loading, setLoading] = useState(false);
  const [playerProfiles, setPlayerProfiles] = useState<PlayerProfile[]>([]);
  const [liveGames, setLiveGames] = useState<any[]>([]);
  const [puzzles, setPuzzles] = useState<any[]>([]);
  const [leaderboards, setLeaderboards] = useState<any>({});
  const [platformStatus, setPlatformStatus] = useState<any>({});

  useEffect(() => {
    if (isOpen) {
      loadPlatformStatus();
      loadLeaderboards();
      loadPuzzles();
    }
  }, [isOpen]);

  const loadPlatformStatus = async () => {
    try {
      const response = await chessIntegrationApi.getStatus();
      setPlatformStatus(response.data.data);
    } catch (error) {
      console.error('Failed to load platform status:', error);
    }
  };

  const loadLeaderboards = async () => {
    try {
      const response = await chessIntegrationApi.getLeaderboards();
      setLeaderboards(response.data.data);
    } catch (error) {
      console.error('Failed to load leaderboards:', error);
    }
  };

  const loadPuzzles = async () => {
    try {
      const [chessComPuzzle, lichessPuzzle] = await Promise.all([
        chessIntegrationApi.getChessComPuzzle().catch(() => null),
        chessIntegrationApi.getLichessPuzzle().catch(() => null)
      ]);

      const puzzles = [];
      if (chessComPuzzle?.data?.success) {
        puzzles.push({ ...chessComPuzzle.data.data, platform: 'chess.com' });
      }
      if (lichessPuzzle?.data?.success) {
        puzzles.push({ ...lichessPuzzle.data.data, platform: 'lichess' });
      }
      setPuzzles(puzzles);
    } catch (error) {
      console.error('Failed to load puzzles:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await chessIntegrationApi.searchPlayers(searchQuery, selectedPlatform);
      if (response.data.success) {
        setSearchResults(response.data.data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportPlayer = async (username: string, platform: 'chesscom' | 'lichess') => {
    if (!tournamentId) {
      alert('Tournament ID is required for importing players');
      return;
    }

    setLoading(true);
    try {
      const response = await chessIntegrationApi.importPlayer(username, platform, tournamentId);
      if (response.data.success) {
        const playerData = response.data.data;
        setPlayerProfiles(prev => [...prev, playerData]);
        alert(`Player ${playerData.name} imported successfully!`);
      }
    } catch (error: any) {
      alert(`Import failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = async (username: string, platform: 'chesscom' | 'lichess') => {
    setLoading(true);
    try {
      const response = await chessIntegrationApi.getPlayerProfile(username, platform);
      if (response.data.success) {
        const profile = response.data.data;
        setPlayerProfiles(prev => {
          const existing = prev.find(p => p.username === username && p.platform === platform);
          if (existing) {
            return prev.map(p => p.username === username && p.platform === platform ? profile : p);
          }
          return [...prev, profile];
        });
      }
    } catch (error) {
      console.error('Failed to load player profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'chess.com':
        return <Globe className="h-4 w-4 text-blue-600" />;
      case 'lichess':
        return <Globe className="h-4 w-4 text-green-600" />;
      default:
        return <Globe className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'chess.com':
        return 'bg-blue-100 text-blue-800';
      case 'lichess':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: any) => {
    if (status?.success) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const formatRating = (rating: number) => {
    return rating ? rating.toLocaleString() : 'N/A';
  };

  const formatTimeControl = (timeControl: string) => {
    if (!timeControl) return 'N/A';
    return timeControl;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Chess Platform Integration</h2>
              <div className="flex items-center space-x-2">
                {getStatusIcon(platformStatus.chesscom)}
                <span className="text-sm text-gray-600">Chess.com</span>
                {getStatusIcon(platformStatus.lichess)}
                <span className="text-sm text-gray-600">Lichess</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'search', label: 'Search Players', icon: Search },
              { id: 'profiles', label: 'Player Profiles', icon: User },
              { id: 'live', label: 'Live Games', icon: Activity },
              { id: 'puzzles', label: 'Puzzles', icon: Puzzle },
              { id: 'leaderboards', label: 'Leaderboards', icon: Trophy }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for players..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value as 'chesscom' | 'lichess')}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="chesscom">Chess.com</option>
                  <option value="lichess">Lichess</option>
                </select>
                <button
                  onClick={handleSearch}
                  disabled={loading || !searchQuery.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Search Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.map((result, index) => (
                      <div key={index} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getPlatformIcon(result.source)}
                            <div>
                              <h4 className="font-medium text-gray-900">{result.name}</h4>
                              <p className="text-sm text-gray-600">@{result.username}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {formatRating(result.rating)}
                                </span>
                                {result.title && (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                    {result.title}
                                  </span>
                                )}
                                <span className={`text-xs px-2 py-1 rounded ${getPlatformColor(result.source)}`}>
                                  {result.source}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewProfile(result.username, result.source === 'chess.com' ? 'chesscom' : 'lichess')}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              View
                            </button>
                            {tournamentId && (
                              <button
                                onClick={() => handleImportPlayer(result.username, result.source === 'chess.com' ? 'chesscom' : 'lichess')}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Import
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Player Profiles Tab */}
          {activeTab === 'profiles' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Player Profiles</h3>
              {playerProfiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playerProfiles.map((profile, index) => (
                    <div key={index} className="bg-white border rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={profile.name} className="w-12 h-12 rounded-full" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900">{profile.name}</h4>
                          <p className="text-sm text-gray-600">@{profile.username}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {getPlatformIcon(profile.platform)}
                            <span className="text-sm font-medium text-gray-900">
                              {formatRating(profile.stats?.currentRating || profile.rating)}
                            </span>
                            {profile.title && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                {profile.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {profile.stats && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Rapid:</span>
                            <span className="font-medium">{formatRating(profile.stats.rapid?.rating)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Blitz:</span>
                            <span className="font-medium">{formatRating(profile.stats.blitz?.rating)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Bullet:</span>
                            <span className="font-medium">{formatRating(profile.stats.bullet?.rating)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Games:</span>
                            <span className="font-medium">{profile.stats.totalGames || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No player profiles loaded yet</p>
                  <p className="text-sm text-gray-400">Search for players and view their profiles</p>
                </div>
              )}
            </div>
          )}

          {/* Live Games Tab */}
          {activeTab === 'live' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Live Games</h3>
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Live games feature coming soon</p>
                <p className="text-sm text-gray-400">This will show live games from Chess.com and Lichess</p>
              </div>
            </div>
          )}

          {/* Puzzles Tab */}
          {activeTab === 'puzzles' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Puzzles of the Day</h3>
              {puzzles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {puzzles.map((puzzle, index) => (
                    <div key={index} className="bg-white border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{puzzle.title || 'Puzzle of the Day'}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${getPlatformColor(puzzle.platform)}`}>
                          {puzzle.platform}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Rating:</span>
                          <span className="font-medium">{formatRating(puzzle.rating)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Plays:</span>
                          <span className="font-medium">{puzzle.plays || puzzle.nbPlays || 0}</span>
                        </div>
                        {puzzle.themes && puzzle.themes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {puzzle.themes.slice(0, 3).map((theme: string, i: number) => (
                              <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {theme}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex space-x-2 mt-3">
                          <a
                            href={puzzle.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            <ExternalLink className="h-4 w-4 inline mr-1" />
                            Solve
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Puzzle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No puzzles available</p>
                </div>
              )}
            </div>
          )}

          {/* Leaderboards Tab */}
          {activeTab === 'leaderboards' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Leaderboards</h3>
              {Object.keys(leaderboards).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(leaderboards).map(([platform, players]: [string, any]) => (
                    <div key={platform} className="bg-white border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        {getPlatformIcon(platform)}
                        <h4 className="font-medium text-gray-900 capitalize">{platform}</h4>
                      </div>
                      {Array.isArray(players) ? (
                        <div className="space-y-2">
                          {players.slice(0, 10).map((player: any, index: number) => (
                            <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                                <div>
                                  <span className="font-medium text-gray-900">{player.name}</span>
                                  <span className="text-sm text-gray-600 ml-2">@{player.username}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{formatRating(player.rating)}</span>
                                {player.title && (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                    {player.title}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">{players.error || 'No data available'}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No leaderboard data available</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Chess Platform Integration - Search and import players from Chess.com and Lichess
            </div>
            <div className="flex space-x-3">
              <button
                onClick={loadPlatformStatus}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 inline mr-1" />
                Refresh Status
              </button>
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

export default ChessPlatformIntegration;
