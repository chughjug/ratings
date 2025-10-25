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

      {/* Hero Section */}
      <div className={`brand-background border-b brand-border ${
        brandingState.layout.headerStyle === 'hero' ? 'py-16' : 'py-8'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Tournament Title */}
            <h1 className={`font-bold brand-text mb-4 ${
              brandingState.layout.headerStyle === 'hero' 
                ? 'text-4xl md:text-6xl' 
                : 'text-3xl md:text-4xl'
            }`}>
              {tournament.name}
            </h1>
            
            {/* Tournament Meta */}
            <div className="flex flex-wrap items-center justify-center gap-8 mb-8 text-sm brand-secondary">
              <div className="flex items-center space-x-2">
                <span className="font-medium">Round {currentRound} of {tournament.rounds}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="capitalize">{tournament.format.replace('-', ' ')} Tournament</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  tournament.status === 'active' ? 'bg-green-500' : 
                  tournament.status === 'completed' ? 'bg-blue-500' : 'bg-gray-400'
                }`}></div>
                <span>{tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={`/register/${tournament.id}`}
                className="btn-brand"
              >
                <Users className="h-4 w-4" />
                <span>Register</span>
              </a>
              
              <button
                onClick={handleShare}
                className="btn-brand-outline"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
              
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`btn-brand-ghost ${
                  autoRefresh ? 'bg-brand-hover' : ''
                }`}
              >
                <RefreshCw className="h-4 w-4" />
                <span>Auto refresh</span>
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="btn-brand-ghost"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tournament Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-brand text-center">
              <div className="text-2xl font-bold brand-primary">{stats.totalPlayers}</div>
              <div className="text-sm brand-secondary">Players</div>
            </div>
            <div className="card-brand text-center">
              <div className="text-2xl font-bold brand-primary">{stats.totalGames}</div>
              <div className="text-sm brand-secondary">Games</div>
            </div>
            <div className="card-brand text-center">
              <div className="text-2xl font-bold brand-primary">{stats.completedGames}</div>
              <div className="text-sm brand-secondary">Completed</div>
            </div>
            <div className="card-brand text-center">
              <div className="text-2xl font-bold brand-primary">{stats.averageRating}</div>
              <div className="text-sm brand-secondary">Avg Rating</div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b brand-border mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'pairings', label: 'Pairings', icon: Users },
              { id: 'standings', label: 'Standings', icon: Trophy },
              { id: 'teams', label: 'Teams', icon: Crown },
              { id: 'prizes', label: 'Prizes', icon: Award },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Current Round Pairings */}
              <div className="card-brand">
                <h3 className="text-lg font-semibold mb-4 brand-text">Current Round Pairings</h3>
                <ChessStandingsTable
                  pairings={pairings}
                  showRatings={displayOptions.showRatings}
                  showUscfIds={displayOptions.showUscfIds}
                  boardNumbers={displayOptions.boardNumbers}
                  displayFormat={displayOptions.displayFormat}
                />
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
                
                <ChessStandingsTable
                  standings={getFilteredStandings(standings)}
                  showRatings={displayOptions.showRatings}
                  showUscfIds={displayOptions.showUscfIds}
                  displayFormat={displayOptions.displayFormat}
                />
              </div>
            </div>
          )}

          {/* Add other tab content here */}
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
