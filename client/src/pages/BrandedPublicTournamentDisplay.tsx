import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import RegistrationFormWithPayment from '../components/RegistrationFormWithPayment';
import { 
  Trophy, Users, Calendar, Clock, RefreshCw, Download, Share2, 
  ArrowLeft, Search, ChevronLeft, ChevronRight, 
  Crown, Award, BarChart3, TrendingUp, Activity, Star, MapPin, 
  UserCheck, Timer, Gamepad2, Globe, Eye, EyeOff, Shield, Settings, CheckCircle
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
  const [activeTab, setActiveTab] = useState<string>('preregistered');
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
  const [registrationForm, setRegistrationForm] = useState({
    name: '',
    email: '',
    uscf_id: '',
    rating: '',
    phone: ''
  });
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

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

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 ${isEmbedded ? 'embed-mode' : ''}`} 
         style={isEmbedded ? { 
           minHeight: embedSettings?.minHeight || '400px',
           maxHeight: embedSettings?.maxHeight || 'none',
           overflow: 'auto'
         } : {}}>
      {/* Simple Header with Logo Space */}
      {!isEmbedded && (
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              {/* Company Logo Space */}
              <div className="flex items-center space-x-4">
                {organization?.logoUrl || tournament?.logo_url ? (
                  <img 
                    src={organization?.logoUrl || tournament?.logo_url} 
                    alt={organization?.name || tournament?.name}
                    className="h-12 w-auto"
                    onError={(e) => {
                      // Fallback to PairCraft logo if image fails to load
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTIwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiByeD0iNCIgZmlsbD0iIzE2NjNlYSIvPgo8dGV4dCB4PSI2MCIgeT0iMjQiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QYWlyQ3JhZnQ8L3RleHQ+Cjwvc3ZnPgo=';
                    }}
                  />
                ) : (
                  <img 
                    src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTIwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiByeD0iNCIgZmlsbD0iIzE2NjNlYSIvPgo8dGV4dCB4PSI2MCIgeT0iMjQiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QYWlyQ3JhZnQ8L3RleHQ+Cjwvc3ZnPgo="
                    alt="PairCraft"
                    className="h-12 w-auto"
                  />
                )}
                <div className="text-lg font-semibold text-gray-900">
                  {organization?.name || tournament?.name || 'Chess Tournament'}
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('preregistered')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'preregistered' 
                      ? 'bg-gray-900 text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Entries
                </button>
                <button
                  onClick={() => setActiveTab('pairings')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'pairings' 
                      ? 'bg-gray-900 text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Pairings
                </button>
                <button
                  onClick={() => setActiveTab('standings')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'standings' 
                      ? 'bg-gray-900 text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Standings
                </button>
                {tournament.allow_registration && (
                  <button
                    onClick={() => setActiveTab('register')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      activeTab === 'register' 
                        ? 'bg-gray-900 text-white shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Register
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('contact')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'contact' 
                      ? 'bg-gray-900 text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Contact
                </button>
                {/* Custom Pages */}
                {customPages && customPages.length > 0 && customPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setActiveTab(page.slug)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      activeTab === page.slug 
                        ? 'bg-gray-900 text-white shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page.name || page.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Header */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
                <div className="flex items-center space-x-6 text-sm text-gray-600 mt-2">
                  <span><strong>Date:</strong> {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : 'TBD'}</span>
                  {tournament.location && <span><strong>Location:</strong> {tournament.location}</span>}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  <strong>Total players:</strong> {stats?.totalPlayers || 0}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Round:</strong> {currentRound} of {tournament.rounds}
                </div>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {activeTab === 'preregistered' && 'Entries'}
            {activeTab === 'pairings' && 'Pairings'}
            {activeTab === 'standings' && 'Standings'}
            {activeTab === 'print' && 'Print View'}
            {activeTab === 'teams' && 'Teams'}
            {activeTab === 'prizes' && 'Prizes'}
            {activeTab === 'analytics' && 'Analytics'}
          </h2>
          
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
          {activeTab === 'print' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6 no-print">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setPrintView('pairings')}
                    className={`px-4 py-2 border rounded ${
                      printView === 'pairings' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Pairings
                  </button>
                  <button
                    onClick={() => setPrintView('standings')}
                    className={`px-4 py-2 border rounded ${
                      printView === 'standings' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Standings
                  </button>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Print</span>
                </button>
              </div>

              {/* Print-friendly Pairings View */}
              {printView === 'pairings' && (
                <div className="print-view bg-white p-8">
                  <div className="mb-6">
                    <h1 className="text-xl font-bold text-center mb-2">{tournament.name}</h1>
                    <h2 className="text-lg font-semibold text-center text-gray-700 mb-4">
                      Round {currentRound} Pairings
                    </h2>
                  </div>

                  {Object.keys(pairingsBySection).sort().map((sectionName) => {
                    const sectionPairings = pairingsBySection[sectionName]
                      .sort((a: any, b: any) => (a.board || 0) - (b.board || 0));
                    
                    // Create a flat list of all players with their color info
                    const allPlayers: any[] = [];
                    sectionPairings.forEach((pairing: any, idx: number) => {
                      if (pairing.white_player?.name && pairing.white_player.name !== 'TBD') {
                        allPlayers.push({
                          name: pairing.white_player.name,
                          playerId: pairing.white_player_id,
                          color: 'W',
                          board: pairing.board || idx + 1,
                          opponentName: pairing.black_player?.name,
                          opponentId: pairing.black_player_id,
                          opponentRating: pairing.black_player?.rating,
                          opponentPoints: pairing.black_player?.points,
                          pairing: pairing
                        });
                      }
                      if (pairing.black_player?.name && pairing.black_player.name !== 'TBD' && !pairing.is_bye) {
                        allPlayers.push({
                          name: pairing.black_player.name,
                          playerId: pairing.black_player_id,
                          color: 'B',
                          board: pairing.board || idx + 1,
                          opponentName: pairing.white_player?.name,
                          opponentId: pairing.white_player_id,
                          opponentRating: pairing.white_player?.rating,
                          opponentPoints: pairing.white_player?.points,
                          pairing: pairing
                        });
                      }
                    });

                    return (
                      <div key={sectionName} className="mb-8">
                        <h3 className="font-semibold text-lg mb-4 uppercase border-b-2 border-gray-300 pb-2">
                          {sectionName} Section
                        </h3>
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b-2 border-gray-800">
                              <th className="text-left py-2 px-4 font-semibold">Player</th>
                              <th className="text-center py-2 px-4 font-semibold">Color/Board</th>
                              <th className="text-left py-2 px-4 font-semibold">Opponent</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allPlayers.map((playerRow, idx) => (
                              <tr key={idx} className="border-b border-gray-300">
                                <td className="py-2 px-4">
                                  <div className="font-semibold">
                                    {playerRow.name}
                                    {getPlayerTeam(playerRow.playerId) && 
                                      ` (${getPlayerTeam(playerRow.playerId)})`}
                                  </div>
                                </td>
                                <td className="py-2 px-4 text-center font-semibold">
                                  {playerRow.color} {playerRow.board}
                                </td>
                                <td className="py-2 px-4">
                                  {playerRow.opponentName && playerRow.opponentName !== 'TBD' ? (
                                    <div className="text-xs">
                                      {playerRow.opponentName}
                                      {getPlayerTeam(playerRow.opponentId) && 
                                        `, ${getPlayerTeam(playerRow.opponentId)}`}, 
                                      ({playerRow.opponentPoints || 0}.0,
                                      {getPlayerTeam(playerRow.opponentId) || 'N/A'}, 
                                      {playerRow.opponentRating || 'nnnn'})
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 italic">Please Wait</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Print-friendly Standings View */}
              {printView === 'standings' && (
                <div className="print-view bg-white p-8">
                  <div className="mb-6">
                    <h1 className="text-xl font-bold text-center mb-2">{tournament.name}</h1>
                    <h2 className="text-lg font-semibold text-center text-gray-700 mb-4">
                      Tournament Standings
                    </h2>
                  </div>

                  {(() => {
                    const sections: { [key: string]: any[] } = {};
                    standings.forEach((player: any) => {
                      const section = player.section || 'Open';
                      if (!sections[section]) sections[section] = [];
                      sections[section].push(player);
                    });

                    return Object.keys(sections).sort().map((sectionName) => {
                      const sectionPlayers = sections[sectionName]
                        .sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

                      return (
                        <div key={sectionName} className="mb-8">
                          <h3 className="font-semibold text-lg mb-4 uppercase border-b-2 border-gray-300 pb-2">
                            {sectionName} Section ({sectionPlayers.length} players)
                          </h3>
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-gray-800 font-bold">
                                <th className="text-left py-2 px-2">No.</th>
                                <th className="text-left py-2 px-2">Name</th>
                                <th className="text-left py-2 px-2">Team</th>
                                <th className="text-left py-2 px-2">Rate</th>
                                <th className="text-left py-2 px-2">Pts</th>
                                <th className="text-left py-2 px-2">Ty</th>
                                {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(round => (
                                  <th key={round} className="text-center py-2 px-2">Rnd{round}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sectionPlayers.map((player: any, idx: number) => (
                                <tr key={player.id} className="border-b border-gray-300">
                                  <td className="py-2 px-2">{idx + 1}.</td>
                                  <td className="py-2 px-2 font-semibold">{player.name}</td>
                                  <td className="py-2 px-2">{getPlayerTeam(player.id) || '-'}</td>
                                  <td className="py-2 px-2">{player.rating || '-'}</td>
                                  <td className="py-2 px-2 font-bold">{player.total_points || 0}</td>
                                  <td className="py-2 px-2">-</td>
                                  {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(round => (
                                    <td key={round} className="text-center py-2 px-2">
                                      {getRoundResult(player, round, sectionPlayers)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}

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
                        {/* Section Filter Buttons */}
                        {sectionNames.length > 1 && (
                          <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-200">
                            <button
                              onClick={() => setSelectedSection('')}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                selectedSection === '' 
                                  ? 'bg-gray-900 text-white shadow-sm' 
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              All Sections
                            </button>
                            {sectionNames.map((sectionName) => (
                              <button
                                key={sectionName}
                                onClick={() => setSelectedSection(sectionName)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                  selectedSection === sectionName 
                                    ? 'bg-gray-900 text-white shadow-sm' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {sectionName}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {sectionNames.map((sectionName) => {
                          // Filter by selected section
                          if (selectedSection && selectedSection !== sectionName) return null;
                          const sectionPlayers = sections[sectionName];
                          if (!sectionPlayers || sectionPlayers.length === 0) return null;

                          return (
                            <div key={sectionName} className="space-y-4">
                              <h4 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
                                {sectionName} Section ({sectionPlayers.length} players)
                              </h4>
                              
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-xs border border-gray-300">
                                  <thead>
                                    <tr className="bg-gray-100 border-b-2 border-gray-500">
                                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-900 border-r border-gray-300">No.</th>
                                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-900 border-r border-gray-300">Player's Name</th>
                                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-900 border-r border-gray-300">USCF</th>
                                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-900 border-r border-gray-300">Rating</th>
                                      <th className="px-2 py-2 text-center text-xs font-bold text-gray-900 border-r border-gray-300">Pts</th>
                                      {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(round => (
                                        <th key={round} className="px-1 py-2 text-center text-xs font-bold text-gray-900 border-r border-gray-300">Rnd{round}</th>
                                      ))}
                                      <th className="px-2 py-2 text-center text-xs font-bold text-gray-900 border-r border-gray-300">BH</th>
                                      <th className="px-2 py-2 text-center text-xs font-bold text-gray-900 border-r border-gray-300">SB</th>
                                      <th className="px-2 py-2 text-center text-xs font-bold text-gray-900 border-r border-gray-300">Perf</th>
                                      <th className="px-2 py-2 text-center text-xs font-bold text-gray-900">Prize</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-300">
                                    {sectionPlayers.map((player, index) => (
                                      <tr key={player.id || index} className="hover:bg-gray-50 border-b border-gray-300">
                                        <td className="px-2 py-2 text-left text-xs text-gray-900 font-medium border-r border-gray-300">{index + 1}.</td>
                                        <td className="px-3 py-2 text-left text-xs text-gray-900 font-bold border-r border-gray-300">
                                          <a href="#player" className="hover:text-blue-600 hover:underline">{player.name || 'Unknown Player'}</a>
                                        </td>
                                        <td className="px-2 py-2 text-left text-xs text-gray-700 border-r border-gray-300">{player.uscf_id || '-'}</td>
                                        <td className="px-2 py-2 text-left text-xs text-gray-700 border-r border-gray-300">{player.rating || '-'}</td>
                                        <td className="px-2 py-2 text-center text-xs text-gray-900 font-bold border-r border-gray-300">{player.total_points || 0}</td>
                                        {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(round => (
                                          <td key={round} className="px-1 py-2 text-center text-xs text-gray-700 border-r border-gray-300 font-mono">
                                            {getRoundResult(player, round, sectionPlayers)}
                                          </td>
                                        ))}
                                        <td className="px-2 py-2 text-center text-xs text-gray-700 border-r border-gray-300">{player.tiebreakers?.buchholz?.toFixed(1) || '0.0'}</td>
                                        <td className="px-2 py-2 text-center text-xs text-gray-700 border-r border-gray-300">{player.tiebreakers?.sonneborn_berger?.toFixed(1) || '0.0'}</td>
                                        <td className="px-2 py-2 text-center text-xs text-gray-700 border-r border-gray-300">{player.performance_rating?.toFixed(1) || '0.0'}</td>
                                        <td className="px-2 py-2 text-center text-xs text-gray-700">{player.prize || ''}</td>
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

                      const sectionNames = Object.keys(roundPairingsBySection).sort();

                      return (
                        <div className="space-y-6">
                          {/* Section Filter Buttons */}
                          {sectionNames.length > 1 && (
                            <div className="flex flex-wrap gap-2 pb-4 px-6 border-b border-gray-200">
                              <button
                                onClick={() => setSelectedSection('')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                  selectedSection === '' 
                                    ? 'bg-gray-900 text-white shadow-sm' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                All Sections
                              </button>
                              {sectionNames.map((sectionName) => (
                                <button
                                  key={sectionName}
                                  onClick={() => setSelectedSection(sectionName)}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    selectedSection === sectionName 
                                      ? 'bg-gray-900 text-white shadow-sm' 
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {sectionName}
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {sectionNames.map((sectionName) => {
                            // Filter by selected section
                            if (selectedSection && selectedSection !== sectionName) return null;
                            
                            return (
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
                            );
                          })}
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
                {/* Page Title */}
                {(page.name || page.title) && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900">{page.name || page.title}</h2>
                    {page.description && (
                      <p className="text-gray-600 mt-2">{page.description}</p>
                    )}
                  </div>
                )}
                
                {/* Page Sections */}
                {page.sections && Array.isArray(page.sections) && page.sections.length > 0 && (
                  <div className="space-y-4">
                    {page.sections.map((section: any, index: number) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        {section.title && (
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">{section.title}</h3>
                        )}
                        {section.content && (
                          <div 
                            className="text-gray-700 prose max-w-none"
                            dangerouslySetInnerHTML={{ __html: section.content }}
                          />
                        )}
                        {section.text && (
                          <p className="text-gray-700 whitespace-pre-wrap">{section.text}</p>
                        )}
                        {section.links && Array.isArray(section.links) && section.links.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {section.links.map((link: any, linkIndex: number) => (
                              <a
                                key={linkIndex}
                                href={link.url}
                                target={link.external ? '_blank' : undefined}
                                rel={link.external ? 'noopener noreferrer' : undefined}
                                className="block text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {link.text || link.url}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Direct HTML Content (fallback for backwards compatibility) */}
                {page.content && (!page.sections || page.sections.length === 0) && (
                  <div 
                    className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                  />
                )}
                
                {/* Page Links */}
                {page.links && Array.isArray(page.links) && page.links.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Useful Links</h3>
                    <div className="space-y-2">
                      {page.links.map((link: any, index: number) => (
                        <a
                          key={index}
                          href={link.url}
                          target={link.external ? '_blank' : undefined}
                          rel={link.external ? 'noopener noreferrer' : undefined}
                          className="block text-blue-600 hover:text-blue-800 hover:underline py-2"
                        >
                          {link.icon && <span className="mr-2">{link.icon}</span>}
                          {link.text || link.url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ))}

          {/* Registration Tab */}
          {activeTab === 'register' && tournament.allow_registration && id && (
            <div className="space-y-6">
              <RegistrationFormWithPayment tournamentId={id} />
            </div>
          )}



          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
                  <h3 className="text-lg font-semibold text-white">Contact Tournament Director</h3>
                </div>
                <div className="p-6">
                  {formSubmitted ? (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                        <CheckCircle className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Sent!</h3>
                      <p className="text-gray-600">Thank you for contacting us. We'll get back to you soon.</p>
                      <button
                        onClick={() => {
                          setFormSubmitted(false);
                          setContactForm({
                            name: '',
                            email: '',
                            message: ''
                          });
                        }}
                        className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        Send Another Message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      setFormSubmitting(true);
                      try {
                        // TODO: Implement API call to submit contact form
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        setFormSubmitted(true);
                      } catch (error) {
                        console.error('Contact form error:', error);
                      } finally {
                        setFormSubmitting(false);
                      }
                    }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Your Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          placeholder="Enter your name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          placeholder="your.email@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={6}
                          value={contactForm.message}
                          onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          placeholder="Enter your message..."
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={formSubmitting}
                        className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {formSubmitting ? 'Sending...' : 'Send Message'}
                      </button>
                    </form>
                  )}
                </div>
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
