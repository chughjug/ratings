import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Trophy, Users, Calendar, Clock, RefreshCw, Download, Share2, 
  ArrowLeft, Search, ChevronLeft, ChevronRight, 
  Crown, Award, BarChart3, TrendingUp, Activity, Star, MapPin, 
  UserCheck, Timer, Gamepad2, Globe, Eye, EyeOff, Shield, Settings,
  Image as ImageIcon, Upload
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
  customPages?: any[];
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
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [customPages, setCustomPages] = useState<any[]>([]);
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
  const [printView, setPrintView] = useState<'pairings' | 'standings'>('pairings');

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
      console.log('Branded Public API response:', response.data);
      if (response.data.success) {
        setData(response.data.data);
        const customPagesData = response.data.data.customPages || [];
        console.log('Custom pages from API:', customPagesData);
        setCustomPages(customPagesData);
        setLastUpdated(new Date());
        
        // Load all rounds data asynchronously (don't wait for it)
        fetchAllRoundsData(response.data.data.tournament.rounds, response.data.data.standings).catch(err => {
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

  const fetchAllRoundsData = async (totalRounds: number, currentStandings?: any[]) => {
    if (!id) return;
    
    try {
      const roundsData: { [round: number]: any[] } = {};
      
      // Helper function to get player points from standings
      const getPlayerPointsForRound = (playerId: string) => {
        if (!currentStandings) return 0;
        const player = currentStandings.find((p: any) => p.id === playerId);
        return player ? player.total_points || 0 : 0;
      };
      
      // Fetch data for all rounds
      for (let round = 1; round <= totalRounds; round++) {
        try {
          const response = await pairingApi.getByRound(id, round);
          if (response.data && Array.isArray(response.data)) {
            // Transform pairing data to match expected format
            roundsData[round] = response.data.map((pairing: any) => ({
              id: pairing.id,
              board: pairing.board,
              round: pairing.round,
              result: pairing.result || 'TBD',
              section: pairing.section || 'Open',
              white_player: {
                id: pairing.white_player_id,
                name: pairing.white_name || pairing.white_player_name || 'TBD',
                rating: pairing.white_rating || pairing.white_player_rating,
                points: getPlayerPointsForRound(pairing.white_player_id)
              },
              black_player: {
                id: pairing.black_player_id,
                name: pairing.black_name || pairing.black_player_name || 'TBD',
                rating: pairing.black_rating || pairing.black_player_rating,
                points: getPlayerPointsForRound(pairing.black_player_id)
              },
              white_player_id: pairing.white_player_id,
              black_player_id: pairing.black_player_id
            }));
          } else {
            roundsData[round] = [];
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

  // Transform standings data to match ChessStandingsTable interface
  const transformStandingsData = (standings: any[]) => {
    if (!standings) return [];
    
    return standings.map((player, index) => ({
      id: player.id,
      rank: player.rank || index + 1,
      name: player.name,
      rating: player.rating,
      uscf_id: player.uscf_id,
      section: player.section || 'Open',
      total_points: player.total_points || 0,
      games_played: player.games_played || 0,
      wins: player.wins || 0,
      losses: player.losses || 0,
      draws: player.draws || 0,
      tiebreakers: {
        buchholz: 0,
        sonnebornBerger: 0,
        performanceRating: 0,
        modifiedBuchholz: 0,
        cumulative: 0
      },
      roundResults: player.roundResults || {},
      prize: player.prize
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

  // Helper function to get player team
  const getPlayerTeam = (playerId: string) => {
    const player = standings?.find((p: any) => p.id === playerId);
    return player?.team || '';
  };

  // Helper function to get round result for standings display
  const getRoundResult = (player: any, round: number, sectionPlayers?: any[]) => {
    if (!sectionPlayers) return '-';
    
    // Look for pairings in this round with this player
    const roundPairings = allRoundsData[round] || [];
    const pairing = roundPairings.find((p: any) => 
      p.white_player_id === player.id || p.black_player_id === player.id
    );
    
    if (!pairing) return '-';
    
    // Get opponent
    const isWhite = pairing.white_player_id === player.id;
    const opponentId = isWhite ? pairing.black_player_id : pairing.white_player_id;
    
    // Find opponent's rank in current standings (sort by points descending)
    const sortedPlayers = [...sectionPlayers].sort((a: any, b: any) => 
      (b.total_points || 0) - (a.total_points || 0)
    );
    const opponentIdx = sortedPlayers.findIndex((p: any) => p.id === opponentId);
    const opponentNum = opponentIdx !== undefined && opponentIdx !== -1 ? opponentIdx + 1 : '-';
    
    if (pairing.is_bye) {
      return '-B-';
    }
    
    if (!pairing.result || pairing.result === 'TBD') {
      return `A${opponentNum}`;
    }
    
    // Determine if player won, lost, or drew
    if (pairing.result === '1-0' || pairing.result === '1-0F') {
      return isWhite ? `W${opponentNum}` : `L${opponentNum}`;
    } else if (pairing.result === '0-1' || pairing.result === '0-1F') {
      return isWhite ? `L${opponentNum}` : `W${opponentNum}`;
    } else if (pairing.result === '1/2-1/2' || pairing.result === '1/2-1/2F') {
      return `D${opponentNum}`;
    }
    
    return 'TBD';
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
  
  // Helper function to get player points from standings
  const getPlayerPoints = (playerId: string) => {
    if (!standings) return 0;
    const player = standings.find((p: any) => p.id === playerId);
    return player ? player.total_points || 0 : 0;
  };
  
  // Transform current round pairings data and group by section
  const transformedPairings = pairings ? pairings.map((pairing: any) => ({
    id: pairing.id,
    board: pairing.board,
    round: pairing.round,
    result: pairing.result || 'TBD',
    section: pairing.section || 'Open',
    white_player: {
      id: pairing.white_player_id,
      name: pairing.white_name || pairing.white_player_name || 'TBD',
      rating: pairing.white_rating || pairing.white_player_rating,
      points: getPlayerPoints(pairing.white_player_id)
    },
    black_player: {
      id: pairing.black_player_id,
      name: pairing.black_name || pairing.black_player_name || 'TBD',
      rating: pairing.black_rating || pairing.black_player_rating,
      points: getPlayerPoints(pairing.black_player_id)
    },
    white_player_id: pairing.white_player_id,
    black_player_id: pairing.black_player_id
  })) : [];

  // Group pairings by section
  const pairingsBySection = transformedPairings.reduce((acc: any, pairing: any) => {
    const section = pairing.section || 'Open';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(pairing);
    return acc;
  }, {});

  // Get branding images from tournament config
  const getBrandingImage = (type: 'header' | 'sidebar' | 'hero' | 'footer') => {
    if (!tournament?.public_display_config) return null;
    try {
      const config = JSON.parse(tournament.public_display_config);
      return config.images?.[type];
    } catch (e) {
      return null;
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 ${isEmbedded ? 'embed-mode' : ''}`} 
         style={isEmbedded ? { 
           minHeight: embedSettings?.minHeight || '400px',
           maxHeight: embedSettings?.maxHeight || 'none',
           overflow: 'auto'
         } : {}}>
      {/* Modern Header with Banner Image */}
      {!isEmbedded && (
        <header className="relative bg-white shadow-lg">
          {/* Banner Image Area */}
          {getBrandingImage('header') && (
            <div className="relative h-32 overflow-hidden">
              <img 
                src={getBrandingImage('header')} 
                alt="Header Banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>
          )}
          
          {/* Logo and Navigation */}
          <div className="relative z-10 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between py-4">
                {/* Logo */}
                <div className="flex items-center space-x-4">
                  {organization?.logoUrl || tournament?.logo_url ? (
                    <img 
                      src={organization?.logoUrl || tournament?.logo_url} 
                      alt={organization?.name || tournament?.name}
                      className="h-14 w-auto drop-shadow-md"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTIwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiByeD0iNCIgZmlsbD0iIzE2NjNlYSIvPgo8dGV4dCB4PSI2MCIgeT0iMjQiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QYWlyQ3JhZnQ8L3RleHQ+Cjwvc3ZnPgo=';
                      }}
                    />
                  ) : (
                    <img 
                      src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTIwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiByeD0iNCIgZmlsbD0iIzE2NjNlYSIvPgo8dGV4dCB4PSI2MCIgeT0iMjQiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QYWlyQ3JhZnQ8L3RleHQ+Cjwvc3ZnPgo="
                      alt="PairCraft"
                      className="h-14 w-auto drop-shadow-md"
                    />
                  )}
                  <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {organization?.name || tournament?.name || 'Chess Tournament'}
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex space-x-1">
                  {[
                    { key: 'overview', label: 'INFO' },
                    { key: 'preregistered', label: 'ENTRIES' },
                    { key: 'pairings', label: 'PAIRINGS' },
                    { key: 'standings', label: 'STANDINGS' },
                    { key: 'standings', label: 'LIVE' },
                    { key: 'print', label: 'PRINT' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setActiveTab(item.key)}
                      className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded-lg transition-all duration-200 ${
                        activeTab === item.key 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Modern Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white overflow-hidden">
        {getBrandingImage('hero') && (
          <div className="absolute inset-0 opacity-20">
            <img 
              src={getBrandingImage('hero')} 
              alt="Hero Background"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg">{tournament.name}</h1>
              <div className="flex items-center space-x-6 text-lg">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>{tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : 'TBD'}</span>
                </div>
                {tournament.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>{tournament.location}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right space-y-2">
              <div className="text-sm opacity-90">Total Players</div>
              <div className="text-4xl font-bold drop-shadow-lg">{stats?.totalPlayers || 0}</div>
              <div className="text-sm opacity-90">Round {currentRound} of {tournament.rounds}</div>
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

      {/* Main Content with Modern Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              {activeTab === 'overview' && 'Tournament Information'}
              {activeTab === 'preregistered' && 'Tournament Entries'}
              {activeTab === 'pairings' && 'Round Pairings'}
              {activeTab === 'standings' && 'Current Standings'}
              {activeTab === 'teams' && 'Team Standings'}
              {activeTab === 'prizes' && 'Prize Information'}
              {activeTab === 'analytics' && 'Tournament Analytics'}
            </h2>
          </div>
          
          {activeTab === 'preregistered' && (
            <p className="text-sm text-gray-600 mt-1">
              Total players: <span className="font-bold text-gray-900">{stats?.totalPlayers || 0}</span>
            </p>
          )}

          {activeTab === 'pairings' && (
            <div className="flex items-center space-x-4 mt-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedRound(Math.max(1, selectedRound - 1))}
                  disabled={selectedRound <= 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium">Round {selectedRound}</span>
                <button
                  onClick={() => setSelectedRound(Math.min(tournament.rounds, selectedRound + 1))}
                  disabled={selectedRound >= tournament.rounds}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'preregistered' && (
            <div className="space-y-6">
              {/* Entries Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">CHAMP entries</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USCF</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bye</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {standings && standings.length > 0 ? (
                        standings.map((player, index) => (
                          <tr key={player.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {player.uscf_id || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {player.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {player.rating || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              -
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Confirmed
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            No entries available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Current Round Pairings */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Current Round Pairings</h3>
                </div>
                <div className="overflow-x-auto">
                  {Object.keys(pairingsBySection).length > 0 ? (
                    <div className="space-y-6">
                      {Object.keys(pairingsBySection).sort().map((sectionName) => (
                        <div key={sectionName} className="p-6">
                          <h4 className="text-md font-semibold text-gray-800 mb-4 uppercase">{sectionName} Section</h4>
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Board</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">White</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Black</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {pairingsBySection[sectionName].map((pairing: any, index: number) => (
                                <tr key={pairing.id || index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {pairing.board || index + 1}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <div className="flex flex-col">
                                      <span className="font-semibold">{pairing.white_player?.name || 'TBD'}</span>
                                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                        {pairing.white_player?.rating && (
                                          <span>({pairing.white_player.rating})</span>
                                        )}
                                        {pairing.white_player?.points !== undefined && (
                                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                            {pairing.white_player.points} pts
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <div className="flex flex-col">
                                      <span className="font-semibold">{pairing.black_player?.name || 'TBD'}</span>
                                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                        {pairing.black_player?.rating && (
                                          <span>({pairing.black_player.rating})</span>
                                        )}
                                        {pairing.black_player?.points !== undefined && (
                                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                            {pairing.black_player.points} pts
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {pairing.result || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-6 py-8 text-center text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No pairings available for current round</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'standings' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-slate-600">
                  <h3 className="text-lg font-semibold text-white">Tournament Standings</h3>
                </div>
                <div className="p-6">
                  {(() => {
                    // Simple, safe standings rendering
                    if (!standings || !Array.isArray(standings) || standings.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Standings Available</h3>
                          <p className="text-gray-600">Standings will appear once games are played.</p>
                        </div>
                      );
                    }

                    // Group players by section safely
                    const sections: { [key: string]: any[] } = {};
                    standings.forEach((player, index) => {
                      if (player && typeof player === 'object') {
                        const section = player.section || 'Open';
                        if (!sections[section]) {
                          sections[section] = [];
                        }
                        sections[section].push({ ...player, index });
                      }
                    });

                    const sectionNames = Object.keys(sections).sort();

                    return (
                      <div className="space-y-8">
                        {sectionNames.map((sectionName) => {
                          const sectionPlayers = sections[sectionName];
                          if (!sectionPlayers || sectionPlayers.length === 0) return null;

                          return (
                            <div key={sectionName} className="space-y-4">
                              <h4 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
                                {sectionName} Section ({sectionPlayers.length} players)
                              </h4>
                              
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm">
                                  <thead>
                                    <tr className="bg-gray-50">
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                        No.
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                        Player's Name
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                        USCF
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                        Rating
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                        Pts
                                      </th>
                                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                        BH
                                      </th>
                                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                        SB
                                      </th>
                                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                        Perf
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {sectionPlayers.map((player, index) => (
                                      <tr key={player.id || index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">
                                          {index + 1}.
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">
                                          {player.name || 'Unknown Player'}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                          {player.uscf_id || '-'}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                          {player.rating || '-'}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">
                                          {player.total_points || 0}
                                        </td>
                                        <td className="px-2 py-2 text-center text-sm text-gray-500">
                                          {player.tiebreakers?.buchholz || '0.0'}
                                        </td>
                                        <td className="px-2 py-2 text-center text-sm text-gray-500">
                                          {player.tiebreakers?.sonneborn_berger || '0.0'}
                                        </td>
                                        <td className="px-2 py-2 text-center text-sm text-gray-500">
                                          {player.performance_rating || '0.0'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pairings' && (
            <div className="space-y-6">
              {/* Pairings Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Round {selectedRound} Pairings</h3>
                </div>
                <div className="overflow-x-auto">
                  {allRoundsData[selectedRound] && allRoundsData[selectedRound].length > 0 ? (
                    (() => {
                      // Group pairings by section for this round
                      const roundPairingsBySection = allRoundsData[selectedRound].reduce((acc: any, pairing: any) => {
                        const section = pairing.section || 'Open';
                        if (!acc[section]) {
                          acc[section] = [];
                        }
                        acc[section].push(pairing);
                        return acc;
                      }, {});

                      return (
                        <div className="space-y-6">
                          {Object.keys(roundPairingsBySection).sort().map((sectionName) => (
                            <div key={sectionName} className="p-6">
                              <h4 className="text-md font-semibold text-gray-800 mb-4 uppercase">{sectionName} Section</h4>
                              <table className="w-full">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Board</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">White</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Black</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {roundPairingsBySection[sectionName].map((pairing: any, index: number) => (
                                    <tr key={pairing.id || index} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {pairing.board || index + 1}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="flex flex-col">
                                          <span className="font-semibold">{pairing.white_player?.name || 'TBD'}</span>
                                          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                            {pairing.white_player?.rating && (
                                              <span>({pairing.white_player.rating})</span>
                                            )}
                                            {pairing.white_player?.points !== undefined && (
                                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                                {pairing.white_player.points} pts
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="flex flex-col">
                                          <span className="font-semibold">{pairing.black_player?.name || 'TBD'}</span>
                                          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                            {pairing.black_player?.rating && (
                                              <span>({pairing.black_player.rating})</span>
                                            )}
                                            {pairing.black_player?.points !== undefined && (
                                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                                {pairing.black_player.points} pts
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {pairing.result || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="px-6 py-8 text-center text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No pairings available for round {selectedRound}</p>
                    </div>
                  )}
                </div>
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

          {/* Custom Pages Content */}
          {customPages && customPages.length > 0 && customPages.map((page) => (
            activeTab === page.slug && (
              <div key={page.id} className="space-y-6">
                <div 
                  className="bg-white border border-gray-200 rounded-lg p-6"
                  dangerouslySetInnerHTML={{ __html: page.content }}
                />
              </div>
            )
          ))}

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

      {/* Modern Footer with Optional Banner */}
      {!isEmbedded && getBrandingImage('footer') && (
        <footer className="relative mt-12">
          <div className="relative h-48 overflow-hidden">
            <img 
              src={getBrandingImage('footer')} 
              alt="Footer Banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 pb-6 px-4">
              <div className="max-w-7xl mx-auto text-white text-center">
                <p className="text-sm opacity-90">
                  © {new Date().getFullYear()} {organization?.name || tournament?.name || 'Chess Tournament'}. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </footer>
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
