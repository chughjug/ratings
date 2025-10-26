import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Trophy, Users, Calendar, Clock, RefreshCw, Download, Share2, 
  ArrowLeft, Search, ChevronLeft, ChevronRight, 
  Crown, Award, BarChart3, TrendingUp, Activity, Star, MapPin, 
  UserCheck, Timer, Gamepad2, Globe, Eye, EyeOff, Shield, Settings
} from 'lucide-react';
import { tournamentApi, pairingApi } from '../services/api';
import { exportPairingsPDF, exportStandingsPDF } from '../services/pdfExport';
import { CrosstableService } from '../services/crosstableService';
import ChessStandingsTable from '../components/ChessStandingsTable';
import BrandedHeader from '../components/BrandedHeader';
import BrandedFooter from '../components/BrandedFooter';
import { BrandingProvider, useBranding } from '../contexts/BrandingContext';
import '../styles/branding.css';

interface PublicDisplayData {
  tournament: any;
  pairings: any[];
  standings: any[];
  currentRound: number;
  teamStandings?: any[];
  prizes?: any[];
  analytics?: any;
  activePlayersList?: any[];
  organization?: any;
}

interface DisplayOptions {
  showRatings: boolean;
  showUscfIds: boolean;
  boardNumbers: boolean;
  displayFormat: 'default' | 'compact' | 'detailed';
}

interface BrandedPublicTournamentDisplayProps {
  isEmbedded?: boolean;
  embedSettings?: {
    allowFullscreen?: boolean;
    allowResize?: boolean;
    minHeight?: number;
    maxHeight?: number;
    responsive?: boolean;
  };
}

const BrandedPublicTournamentDisplayContent: React.FC<BrandedPublicTournamentDisplayProps> = ({
  isEmbedded = false,
  embedSettings = {}
}) => {
  const { id } = useParams<{ id: string }>();
  const { state: brandingState } = useBranding();
  const [data, setData] = useState<PublicDisplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pairings' | 'standings' | 'teams' | 'prizes' | 'analytics' | 'preregistered'>('overview');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [allRoundsData, setAllRoundsData] = useState<{ [round: number]: any[] }>({});
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({
    showRatings: true,
    showUscfIds: false,
    boardNumbers: true,
    displayFormat: 'default'
  });
  const [showSettings, setShowSettings] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  // Calculate player scores from all pairings
  const calculatePlayerScores = useCallback(() => {
    if (!data?.pairings) return {};
    
    const playerScores: Record<string, number> = {};
    
    // Initialize all players with 0 points
    if (data.tournament?.players) {
      data.tournament.players.forEach((player: any) => {
        playerScores[player.id] = 0;
      });
    }
    
    // Calculate scores from all pairings
    data.pairings.forEach((pairing: any) => {
      if (pairing.result && pairing.result !== 'TBD') {
        // White player score
        if (pairing.white_player_id) {
          if (pairing.result === '1-0' || pairing.result === '1-0F') {
            playerScores[pairing.white_player_id] = (playerScores[pairing.white_player_id] || 0) + 1;
          } else if (pairing.result === '1/2-1/2' || pairing.result === '1/2-1/2F') {
            playerScores[pairing.white_player_id] = (playerScores[pairing.white_player_id] || 0) + 0.5;
          }
        }
        
        // Black player score
        if (pairing.black_player_id) {
          if (pairing.result === '0-1' || pairing.result === '0-1F') {
            playerScores[pairing.black_player_id] = (playerScores[pairing.black_player_id] || 0) + 1;
          } else if (pairing.result === '1/2-1/2' || pairing.result === '1/2-1/2F') {
            playerScores[pairing.black_player_id] = (playerScores[pairing.black_player_id] || 0) + 0.5;
          }
        }
      }
    });
    
    return playerScores;
  }, [data?.pairings, data?.tournament?.players]);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchPublicData = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await tournamentApi.getPublic(id);
      if (response.data.success) {
        setData(response.data.data);
        setLastUpdated(new Date());
        
        // Load all rounds data asynchronously (don't wait for it)
        fetchAllRoundsData(response.data.data.tournament.rounds).catch(err => {
          console.warn('Failed to fetch all rounds data:', err);
        });
      } else {
        throw new Error(response.data.error || 'Failed to load tournament data');
      }
    } catch (err: any) {
      console.error('Failed to fetch public tournament data:', err);
      setError(err.response?.data?.error || 'Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPublicData();
  }, [fetchPublicData]);

  // Auto-refresh effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && id) {
      interval = setInterval(() => {
        fetchPublicData();
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, id, fetchPublicData]);

  const fetchAllRoundsData = async (totalRounds: number) => {
    if (!id) return;
    
    try {
      const roundsData: { [round: number]: any[] } = {};
      
      // Fetch data for all rounds
      for (let round = 1; round <= totalRounds; round++) {
        try {
          const response = await pairingApi.getByRound(id, round);
          if (response.data) {
            roundsData[round] = response.data;
          }
        } catch (err) {
          console.warn(`Failed to fetch round ${round} data:`, err);
          roundsData[round] = [];
        }
      }
      
      setAllRoundsData(roundsData);
    } catch (err) {
      console.error('Failed to fetch all rounds data:', err);
    }
  };

  const updateDisplayOption = (key: keyof DisplayOptions, value: any) => {
    setDisplayOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Filter standings by player search
  const getFilteredStandings = (standings: any[]) => {
    if (!playerSearch.trim()) return standings;
    return standings.filter(player => 
      player.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
      (player.uscf_id && player.uscf_id.toLowerCase().includes(playerSearch.toLowerCase()))
    );
  };

  // Get tournament statistics
  const getTournamentStats = () => {
    if (!data) return null;
    
    const { standings, pairings, teamStandings } = data;
    const totalPlayers = standings.length;
    const totalGames = pairings.length;
    const completedGames = pairings.filter(p => p.result && p.result !== '').length;
    const averageRating = standings.reduce((sum, p) => sum + (p.rating || 0), 0) / totalPlayers;
    const totalTeams = teamStandings ? teamStandings.length : 0;
    
    return {
      totalPlayers,
      totalGames,
      completedGames,
      averageRating: Math.round(averageRating),
      totalTeams
    };
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: data?.tournament?.name || 'Chess Tournament',
        text: `Check out this chess tournament: ${data?.tournament?.name}`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen brand-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-brand-primary mx-auto"></div>
          <p className="mt-4 brand-text text-sm">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen brand-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded">
            <p className="font-medium mb-2">Error</p>
            <p className="text-sm">{error || 'Tournament not found'}</p>
          </div>
          <button
            onClick={fetchPublicData}
            className="btn-brand"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  const { tournament, pairings, standings, currentRound, organization } = data;
  const stats = getTournamentStats();

  return (
    <div className={`min-h-screen brand-background ${isEmbedded ? 'embed-mode' : ''}`}>
      {/* Branded Header */}
      {!isEmbedded && (
        <BrandedHeader
          tournamentName={tournament.name}
          organizationName={organization?.name}
          logoUrl={organization?.logoUrl}
          showNavigation={brandingState.layout.showSearch}
          showSocialLinks={brandingState.layout.showSocialLinks}
        />
      )}

      {/* Tournament Header */}
      <div className="brand-background border-b brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tournament Info Tab */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-brand-primary text-white px-4 py-2 rounded-t-lg font-medium text-sm">
                  Tournament
                </div>
                <div className="flex items-center space-x-6">
                  <div>
                    <h1 className="text-2xl font-bold brand-text">{tournament.name}</h1>
                    <div className="flex items-center space-x-4 text-sm brand-secondary mt-1">
                      <span>{tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : 'TBD'}</span>
                      {tournament.location && <span>• {tournament.location}</span>}
                      <span>• Round {currentRound} of {tournament.rounds}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  tournament.status === 'active' ? 'bg-green-100 text-green-800' : 
                  tournament.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                </div>
                
                <a
                  href={`/register/${tournament.id}`}
                  className="btn-brand"
                >
                  <Users className="h-4 w-4" />
                  <span>Register</span>
                </a>
                
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="btn-brand-ghost"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Display Options Panel */}
      {showSettings && (
        <div className="border-b brand-border bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="card-brand">
              <h3 className="text-lg font-semibold mb-4 brand-text">Display Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={displayOptions.showRatings}
                    onChange={(e) => updateDisplayOption('showRatings', e.target.checked)}
                    className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-2 focus:ring-brand-primary"
                  />
                  <span className="text-sm brand-text">Show Ratings</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={displayOptions.showUscfIds}
                    onChange={(e) => updateDisplayOption('showUscfIds', e.target.checked)}
                    className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-2 focus:ring-brand-primary"
                  />
                  <span className="text-sm brand-text">Show USCF IDs</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={displayOptions.boardNumbers}
                    onChange={(e) => updateDisplayOption('boardNumbers', e.target.checked)}
                    className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-2 focus:ring-brand-primary"
                  />
                  <span className="text-sm brand-text">Board Numbers</span>
                </label>
                
                <div className="flex items-center space-x-3">
                  <label className="text-sm brand-text">Format:</label>
                  <select
                    value={displayOptions.displayFormat}
                    onChange={(e) => updateDisplayOption('displayFormat', e.target.value)}
                    className="input-brand"
                  >
                    <option value="default">Default</option>
                    <option value="compact">Compact</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
              </div>
              
              {/* Additional Options */}
              <div className="mt-6 pt-6 border-t brand-border">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-2 focus:ring-brand-primary"
                    />
                    <span className="text-sm brand-text">Auto Refresh (30s)</span>
                  </label>
                  
                  {lastUpdated && (
                    <div className="text-sm brand-secondary">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar - Tournament Navigation */}
          <div className="lg:col-span-3">
            <div className="card-brand">
              <h3 className="text-lg font-semibold brand-text mb-4">Tournament</h3>
              <nav className="space-y-2">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3, count: stats?.totalPlayers },
                  { id: 'pairings', label: 'Pairings', icon: Users, count: stats?.totalGames },
                  { id: 'standings', label: 'Standings', icon: Trophy, count: stats?.totalPlayers },
                  { id: 'teams', label: 'Teams', icon: Crown, count: stats?.totalTeams },
                  { id: 'prizes', label: 'Prizes', icon: Award },
                  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-brand-primary text-white'
                          : 'hover:bg-brand-hover brand-text'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{tab.label}</span>
                      </div>
                      {tab.count !== undefined && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          activeTab === tab.id ? 'bg-white bg-opacity-20' : 'bg-gray-100'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tournament Stats */}
            {stats && (
              <div className="card-brand mt-6">
                <h3 className="text-lg font-semibold brand-text mb-4">Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm brand-secondary">Total Players</span>
                    <span className="font-semibold brand-text">{stats.totalPlayers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm brand-secondary">Games Played</span>
                    <span className="font-semibold brand-text">{stats.totalGames}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm brand-secondary">Completed</span>
                    <span className="font-semibold brand-text">{stats.completedGames}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm brand-secondary">Avg Rating</span>
                    <span className="font-semibold brand-text">{stats.averageRating}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-6">
            {/* Section Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold brand-text uppercase">
                    {activeTab === 'overview' && 'OVERVIEW'}
                    {activeTab === 'pairings' && 'PAIRINGS'}
                    {activeTab === 'standings' && 'STANDINGS'}
                    {activeTab === 'teams' && 'TEAMS'}
                    {activeTab === 'prizes' && 'PRIZES'}
                    {activeTab === 'analytics' && 'ANALYTICS'}
                  </h2>
                  {activeTab === 'standings' && (
                    <p className="text-sm brand-secondary mt-1">
                      Total players: <span className="font-bold brand-text">{stats?.totalPlayers || 0}</span>
                    </p>
                  )}
                </div>
                
                {activeTab === 'pairings' && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedRound(Math.max(1, selectedRound - 1))}
                      disabled={selectedRound <= 1}
                      className="btn-brand-ghost disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm brand-text font-medium">Round {selectedRound}</span>
                    <button
                      onClick={() => setSelectedRound(Math.min(tournament.rounds, selectedRound + 1))}
                      disabled={selectedRound >= tournament.rounds}
                      className="btn-brand-ghost disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Current Round Pairings */}
              <div className="card-brand">
                <h3 className="text-lg font-semibold mb-4 brand-text">Current Round Pairings</h3>
                    {pairings && pairings.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b brand-border">
                              <th className="text-left py-2 brand-text">Board</th>
                              <th className="text-left py-2 brand-text">White</th>
                              <th className="text-left py-2 brand-text">Black</th>
                              <th className="text-left py-2 brand-text">Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pairings.map((pairing, index) => (
                              <tr key={index} className="border-b brand-border">
                                <td className="py-2 brand-text">{pairing.board || index + 1}</td>
                                <td className="py-2 brand-text">
                                  {pairing.white_player?.name || 'TBD'}
                                  {displayOptions.showRatings && pairing.white_player?.rating && (
                                    <span className="text-sm brand-secondary ml-2">({pairing.white_player.rating})</span>
                                  )}
                                </td>
                                <td className="py-2 brand-text">
                                  {pairing.black_player?.name || 'TBD'}
                                  {displayOptions.showRatings && pairing.black_player?.rating && (
                                    <span className="text-sm brand-secondary ml-2">({pairing.black_player.rating})</span>
                                  )}
                                </td>
                                <td className="py-2 brand-text">{pairing.result || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No pairings available for current round</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'standings' && (
            <div className="space-y-8">
              {/* Search */}
              <div className="card-brand">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search players..."
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      className="input-brand pl-10 w-full"
                    />
                  </div>
                </div>
                
                {standings && standings.length > 0 ? (
                  <ChessStandingsTable
                    standings={getFilteredStandings(standings)}
                    tournament={{
                      rounds: tournament.rounds,
                      name: tournament.name
                    }}
                    tournamentId={tournament.id}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No standings available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'pairings' && (
            <div className="space-y-8">
              {/* Round Selection */}
              <div className="card-brand">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold brand-text">Round Pairings</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedRound(Math.max(1, selectedRound - 1))}
                      disabled={selectedRound <= 1}
                      className="btn-brand-ghost disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm brand-text">Round {selectedRound}</span>
                    <button
                      onClick={() => setSelectedRound(Math.min(tournament.rounds, selectedRound + 1))}
                      disabled={selectedRound >= tournament.rounds}
                      className="btn-brand-ghost disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                        {allRoundsData[selectedRound] && allRoundsData[selectedRound].length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b brand-border">
                                  <th className="text-left py-2 brand-text">Board</th>
                                  <th className="text-left py-2 brand-text">White</th>
                                  <th className="text-left py-2 brand-text">Black</th>
                                  <th className="text-left py-2 brand-text">Result</th>
                                </tr>
                              </thead>
                              <tbody>
                                {allRoundsData[selectedRound].map((pairing, index) => (
                                  <tr key={index} className="border-b brand-border">
                                    <td className="py-2 brand-text">{pairing.board || index + 1}</td>
                                    <td className="py-2 brand-text">
                                      {pairing.white_player?.name || 'TBD'}
                                      {displayOptions.showRatings && pairing.white_player?.rating && (
                                        <span className="text-sm brand-secondary ml-2">({pairing.white_player.rating})</span>
                                      )}
                                    </td>
                                    <td className="py-2 brand-text">
                                      {pairing.black_player?.name || 'TBD'}
                                      {displayOptions.showRatings && pairing.black_player?.rating && (
                                        <span className="text-sm brand-secondary ml-2">({pairing.black_player.rating})</span>
                                      )}
                                    </td>
                                    <td className="py-2 brand-text">{pairing.result || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No pairings available for round {selectedRound}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-8">
              <div className="card-brand">
                <h3 className="text-lg font-semibold mb-4 brand-text">Team Standings</h3>
                {data.teamStandings && data.teamStandings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b brand-border">
                          <th className="text-left py-2 brand-text">Rank</th>
                          <th className="text-left py-2 brand-text">Team</th>
                          <th className="text-left py-2 brand-text">Points</th>
                          <th className="text-left py-2 brand-text">Games</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.teamStandings.map((team, index) => (
                          <tr key={team.id} className="border-b brand-border">
                            <td className="py-2 brand-text">{index + 1}</td>
                            <td className="py-2 brand-text">{team.name}</td>
                            <td className="py-2 brand-text">{team.points}</td>
                            <td className="py-2 brand-text">{team.games}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Crown className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No team standings available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'prizes' && (
            <div className="space-y-8">
              <div className="card-brand">
                <h3 className="text-lg font-semibold mb-4 brand-text">Prize Information</h3>
                {data.prizes && data.prizes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.prizes.map((prize) => (
                      <div key={prize.id} className="border brand-border rounded p-4">
                        <h4 className="font-medium brand-text mb-2">{prize.name}</h4>
                        <p className="text-sm brand-secondary">{prize.description}</p>
                        {prize.amount && (
                          <p className="text-sm brand-primary font-medium mt-2">${prize.amount}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No prize information available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-8">
              <div className="card-brand">
                <h3 className="text-lg font-semibold mb-4 brand-text">Tournament Analytics</h3>
                {data.analytics ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border brand-border rounded">
                        <div className="text-2xl font-bold brand-primary">{data.analytics.totalGames || 0}</div>
                        <div className="text-sm brand-secondary">Total Games</div>
                      </div>
                      <div className="text-center p-4 border brand-border rounded">
                        <div className="text-2xl font-bold brand-primary">{data.analytics.averageRating || 0}</div>
                        <div className="text-sm brand-secondary">Average Rating</div>
                      </div>
                      <div className="text-center p-4 border brand-border rounded">
                        <div className="text-2xl font-bold brand-primary">{data.analytics.completionRate || 0}%</div>
                        <div className="text-sm brand-secondary">Completion Rate</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No analytics data available</p>
                  </div>
                )}
              </div>
            </div>
          )}
            </div>
          </div>

          {/* Right Sidebar - Additional Info */}
          <div className="lg:col-span-3">
            {/* Quick Actions */}
            <div className="card-brand">
              <h3 className="text-lg font-semibold brand-text mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleShare}
                  className="w-full btn-brand-outline"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share Tournament</span>
                </button>
                
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`w-full ${
                    autoRefresh ? 'btn-brand' : 'btn-brand-outline'
                  }`}
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Auto Refresh</span>
                </button>
                
                <a
                  href={`/register/${tournament.id}`}
                  className="w-full btn-brand"
                >
                  <Users className="h-4 w-4" />
                  <span>Register</span>
                </a>
              </div>
            </div>

            {/* Tournament Details */}
            <div className="card-brand mt-6">
              <h3 className="text-lg font-semibold brand-text mb-4">Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm brand-secondary">Format:</span>
                  <p className="font-medium brand-text capitalize">{tournament.format.replace('-', ' ')}</p>
                </div>
                <div>
                  <span className="text-sm brand-secondary">Rounds:</span>
                  <p className="font-medium brand-text">{tournament.rounds}</p>
                </div>
                <div>
                  <span className="text-sm brand-secondary">Time Control:</span>
                  <p className="font-medium brand-text">{tournament.time_control || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm brand-secondary">Location:</span>
                  <p className="font-medium brand-text">{tournament.location || 'Not specified'}</p>
                </div>
                {tournament.entry_fee_amount && (
                  <div>
                    <span className="text-sm brand-secondary">Entry Fee:</span>
                    <p className="font-medium brand-text">${tournament.entry_fee_amount}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Organization Info */}
            {organization && (
              <div className="card-brand mt-6">
                <h3 className="text-lg font-semibold brand-text mb-4">Organization</h3>
                <div className="text-center">
                  {organization.logoUrl && (
                    <img 
                      src={organization.logoUrl} 
                      alt={organization.name}
                      className="h-16 w-16 mx-auto mb-3 rounded"
                    />
                  )}
                  <h4 className="font-medium brand-text">{organization.name}</h4>
                  {organization.description && (
                    <p className="text-sm brand-secondary mt-2">{organization.description}</p>
                  )}
                  <Link
                    to={`/public/organizations/${organization.slug || organization.id}`}
                    className="inline-flex items-center space-x-2 text-brand-primary hover:text-brand-primary mt-3 text-sm"
                  >
                    <Globe className="h-4 w-4" />
                    <span>View Organization</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Branded Footer */}
      {!isEmbedded && (
        <BrandedFooter
          organizationName={organization?.name}
          contactEmail={organization?.contactEmail}
          contactPhone={organization?.contactPhone}
          address={organization?.address}
          website={organization?.website}
        />
      )}
    </div>
  );
};

const BrandedPublicTournamentDisplay: React.FC<BrandedPublicTournamentDisplayProps> = (props) => {
  return (
    <BrandingProvider isEmbedded={props.isEmbedded} embedSettings={props.embedSettings}>
      <BrandedPublicTournamentDisplayContent {...props} />
    </BrandingProvider>
  );
};

export default BrandedPublicTournamentDisplay;
