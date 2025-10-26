import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Trophy, Users, Calendar, Clock, RefreshCw, Download, Share2, 
  ArrowLeft, Search, ChevronLeft, ChevronRight, 
  Crown, Award, BarChart3, TrendingUp, Activity, Star, MapPin, 
  UserCheck, Timer, Gamepad2, Globe, Eye, EyeOff, Shield,
  Settings, Filter, ChevronDown, ChevronUp, Maximize2, 
  Minimize2, Smartphone, Monitor, Tablet, Wifi, WifiOff, X
} from 'lucide-react';
import { tournamentApi, pairingApi } from '../services/api';
import { exportPairingsPDF, exportStandingsPDF } from '../services/pdfExport';
import { CrosstableService } from '../services/crosstableService';
import ChessStandingsTable from '../components/ChessStandingsTable';
import PairCraftLogo from '../components/PairCraftLogo';

interface PublicDisplayData {
  tournament: any;
  pairings: any[];
  standings: any[];
  currentRound: number;
  teamStandings?: any[];
  prizes?: any[];
  analytics?: any;
  activePlayersList?: any[];
}

interface DisplayOptions {
  showRatings: boolean;
  showUscfIds: boolean;
  boardNumbers: boolean;
  displayFormat: 'default' | 'compact' | 'detailed';
}

const PublicTournamentDisplay: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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
  const [darkMode, setDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Responsive detection
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

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
      completionRate: totalGames > 0 ? Math.round((completedGames / totalGames) * 100) : 0,
      totalTeams
    };
  };

  // Get available sections for filtering
  const getAvailableSections = () => {
    if (!data) return ['all'];
    
    const sections = new Set<string>();
    sections.add('all'); // Add "All Sections" option
    
    // Get sections from pairings
    data.pairings?.forEach(pairing => {
      if (pairing.section) {
        sections.add(pairing.section);
      }
    });
    
    // Get sections from standings
    data.standings?.forEach(standing => {
      if (standing.section) {
        sections.add(standing.section);
      }
    });
    
    return Array.from(sections).sort();
  };

  const handleExport = async (type: 'pairings' | 'standings' | 'crosstable' | 'teams' | 'prizes' | 'analytics', format: 'pdf' | 'csv' | 'json' = 'pdf') => {
    if (!data) return;

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const tournamentName = data.tournament.name.replace(/[^a-zA-Z0-9]/g, '_');

      switch (type) {
        case 'pairings':
          if (format === 'pdf') {
            await exportPairingsPDF(
              data.tournament,
              allRoundsData[selectedRound] || data.pairings,
              selectedRound,
              `${tournamentName}_Round_${selectedRound}_Pairings_${timestamp}.pdf`
            );
          } else if (format === 'csv') {
            const pairingsData = allRoundsData[selectedRound] || data.pairings;
            const csvContent = [
              'Board,White Player,White Rating,Black Player,Black Rating,Result,Section',
              ...pairingsData.map(p => [
                p.board || '',
                p.white_name || '',
                p.white_rating || '',
                p.black_name || '',
                p.black_rating || '',
                p.result || '',
                p.section || 'Open'
              ].join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${tournamentName}_Round_${selectedRound}_Pairings_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else if (format === 'json') {
            const jsonData = {
              tournament: data.tournament,
              round: selectedRound,
              pairings: allRoundsData[selectedRound] || data.pairings,
              exportedAt: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${tournamentName}_Round_${selectedRound}_Pairings_${timestamp}.json`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          break;
        case 'standings':
          if (format === 'pdf') {
            await exportStandingsPDF(
              data.tournament,
              getFilteredStandings(data.standings),
              `${tournamentName}_Standings_${timestamp}.pdf`
            );
          } else if (format === 'csv') {
            const standingsData = getFilteredStandings(data.standings);
            const csvContent = [
              'Rank,Name,USCF ID,Rating,Section,Points,Games Played,Wins,Losses,Draws',
              ...standingsData.map(s => [
                s.rank || '',
                s.name || '',
                s.uscf_id || '',
                s.rating || '',
                s.section || 'Open',
                s.total_points || 0,
                s.games_played || 0,
                s.wins || 0,
                s.losses || 0,
                s.draws || 0
              ].join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${tournamentName}_Standings_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else if (format === 'json') {
            const jsonData = {
              tournament: data.tournament,
              standings: getFilteredStandings(data.standings),
              statistics: getTournamentStats(),
              exportedAt: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${tournamentName}_Standings_${timestamp}.json`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          break;
        case 'crosstable':
          const crosstableData = CrosstableService.generateCrosstable(
            data.standings.map(s => ({ id: s.id, name: s.name, rating: s.rating, uscf_id: s.uscf_id, section: s.section })),
            data.pairings,
            data.standings,
            data.tournament.rounds
          );
          
          if (format === 'csv') {
            const csvData = CrosstableService.exportCrosstableCSV(crosstableData, data.tournament.name, data.tournament.rounds);
            
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${tournamentName}_Crosstable_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else if (format === 'json') {
            const jsonData = {
              tournament: data.tournament,
              crosstable: crosstableData,
              exportedAt: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${tournamentName}_Crosstable_${timestamp}.json`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export. Please try again.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.tournament.name || 'Chess Tournament',
          text: `Check out this chess tournament: ${data?.tournament.name}`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-black mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded">
            <p className="font-medium mb-2">Error</p>
            <p className="text-sm">{error || 'Tournament not found'}</p>
          </div>
          <button
            onClick={fetchPublicData}
            className="inline-flex items-center space-x-2 bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  const { tournament, pairings, standings, currentRound } = data;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-gray-50 to-white text-gray-900'}`}>
      {/* Enhanced Navigation Bar */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md ${isScrolled ? 'bg-white/90 shadow-lg border-b border-gray-200' : 'bg-transparent'} transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/public/tournaments" className="flex items-center group">
              <PairCraftLogo size="sm" showText={true} />
            </Link>
            
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              {isMobile && (
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Toggle mobile menu"
                >
                  <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                    <div className={`h-0.5 bg-gray-600 transition-all ${showMobileMenu ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                    <div className={`h-0.5 bg-gray-600 transition-all ${showMobileMenu ? 'opacity-0' : ''}`}></div>
                    <div className={`h-0.5 bg-gray-600 transition-all ${showMobileMenu ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
                  </div>
                </button>
              )}
              
              {/* Desktop Actions */}
              {!isMobile && (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      autoRefresh 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                    aria-label={autoRefresh ? 'Disable auto refresh' : 'Enable auto refresh'}
                  >
                    <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Auto refresh</span>
                  </button>
                  
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition-all"
                    aria-label="Toggle display settings"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </button>
                  
                  <button
                    onClick={handleShare}
                    className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200 transition-all"
                    aria-label="Share tournament"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                </div>
              )}
              
              <Link
                to="/public/tournaments"
                className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to tournaments</span>
              </Link>
            </div>
          </div>
          
          {/* Mobile Menu */}
          {isMobile && showMobileMenu && (
            <div className="py-4 border-t border-gray-200 bg-white/95 backdrop-blur-md">
              <div className="space-y-3">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    autoRefresh 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                  <span>Auto refresh</span>
                </button>
                
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition-all"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>
                
                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200 transition-all"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Enhanced Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="text-center mb-12">
            {/* Tournament Status Badge */}
            <div className="inline-flex items-center space-x-2 mb-6">
              <div className={`w-3 h-3 rounded-full ${
                tournament.status === 'active' ? 'bg-green-500 animate-pulse' : 
                tournament.status === 'completed' ? 'bg-blue-500' : 'bg-gray-400'
              }`}></div>
              <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                {tournament.status === 'active' ? 'Live Tournament' : 
                 tournament.status === 'completed' ? 'Completed' : 'Upcoming'}
              </span>
            </div>
            
            {/* Tournament Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              {tournament.name}
            </h1>
            
            {/* Tournament Meta Info */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-8 text-sm text-gray-600">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="font-medium">
                  Round {currentRound} of {tournament.rounds}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                <Trophy className="h-4 w-4 text-yellow-600" />
                <span className="font-medium capitalize">
                  {tournament.format.replace('-', ' ')} Tournament
                </span>
              </div>
              
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                <Users className="h-4 w-4 text-green-600" />
                <span className="font-medium">{standings.length} Players</span>
              </div>
            </div>
            
            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              <a
                href={`/register/${tournament.id}`}
                className="group inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg"
              >
                <Users className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span>Register Now</span>
              </a>
              
              <button
                onClick={handleShare}
                className="group inline-flex items-center space-x-3 bg-white text-gray-700 px-8 py-4 rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg border border-gray-200"
              >
                <Share2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span>Share Tournament</span>
              </button>
            </div>
            
            {/* Quick Stats Preview */}
            {getTournamentStats() && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{getTournamentStats()?.totalPlayers}</div>
                  <div className="text-sm text-gray-600 font-medium">Total Players</div>
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{getTournamentStats()?.completedGames}</div>
                  <div className="text-sm text-gray-600 font-medium">Games Played</div>
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{getTournamentStats()?.averageRating}</div>
                  <div className="text-sm text-gray-600 font-medium">Avg Rating</div>
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{getTournamentStats()?.completionRate}%</div>
                  <div className="text-sm text-gray-600 font-medium">Complete</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Display Options Panel */}
      {showSettings && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-blue-600" />
                  Display Settings
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close settings"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Display Options</h4>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={displayOptions.showRatings}
                        onChange={(e) => updateDisplayOption('showRatings', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">Show Ratings</span>
                    </label>
                    
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={displayOptions.showUscfIds}
                        onChange={(e) => updateDisplayOption('showUscfIds', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">Show USCF IDs</span>
                    </label>
                    
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={displayOptions.boardNumbers}
                        onChange={(e) => updateDisplayOption('boardNumbers', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">Board Numbers</span>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Format</h4>
                  <div className="space-y-3">
                    <label className="text-sm text-gray-700">Display Format:</label>
                    <select
                      value={displayOptions.displayFormat}
                      onChange={(e) => updateDisplayOption('displayFormat', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="default">Default</option>
                      <option value="compact">Compact</option>
                      <option value="detailed">Detailed</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Auto Refresh</h4>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">Auto Refresh (30s)</span>
                    </label>
                    
                    {lastUpdated && (
                      <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>Last updated: {lastUpdated?.toLocaleTimeString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Device Info</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      {isMobile ? <Smartphone className="h-4 w-4" /> : isTablet ? <Tablet className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                      <span>{isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'} View</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Wifi className="h-4 w-4" />
                      <span>Online</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-8 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
            <nav className="flex flex-wrap gap-2" role="tablist">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                }`}
                role="tab"
                aria-selected={activeTab === 'overview'}
                aria-label="Tournament overview"
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Overview</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('pairings')}
                className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === 'pairings'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                }`}
                role="tab"
                aria-selected={activeTab === 'pairings'}
                aria-label="View pairings"
              >
                <div className="flex items-center space-x-2">
                  <Gamepad2 className="h-4 w-4" />
                  <span>Pairings</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('standings')}
                className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === 'standings'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                }`}
                role="tab"
                aria-selected={activeTab === 'standings'}
                aria-label="View standings"
              >
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4" />
                  <span>Standings</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('teams')}
                className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === 'teams'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                }`}
                role="tab"
                aria-selected={activeTab === 'teams'}
                aria-label="View team standings"
              >
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Teams</span>
                </div>
              </button>
              
              {data?.prizes && data?.prizes.length > 0 && (
                <button
                  onClick={() => setActiveTab('prizes')}
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === 'prizes'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                  }`}
                  role="tab"
                  aria-selected={activeTab === 'prizes'}
                  aria-label="View prizes"
                >
                  <div className="flex items-center space-x-2">
                    <Award className="h-4 w-4" />
                    <span>Prizes</span>
                  </div>
                </button>
              )}
              
              {data?.activePlayersList && data?.activePlayersList.length > 0 && (
                <button
                  onClick={() => setActiveTab('preregistered')}
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === 'preregistered'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                  }`}
                  role="tab"
                  aria-selected={activeTab === 'preregistered'}
                  aria-label="View registered players"
                >
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Players ({data?.activePlayersList?.length || 0})</span>
                  </div>
                </button>
              )}
              
              {data?.analytics && (
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === 'analytics'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                  }`}
                  role="tab"
                  aria-selected={activeTab === 'analytics'}
                  aria-label="View analytics"
                >
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Analytics</span>
                  </div>
                </button>
              )}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6" role="tabpanel">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Tournament Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Basic Info */}
                  <div className="bg-white border border-gray-200 rounded p-6">
                    <h3 className="text-lg font-semibold text-black mb-4">Schedule</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Start Date:</span>
                        <span className="text-black font-medium">
                          {tournament.start_date 
                            ? new Date(tournament.start_date).toLocaleDateString()
                            : 'TBD'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">End Date:</span>
                        <span className="text-black font-medium">
                          {tournament.end_date 
                            ? new Date(tournament.end_date).toLocaleDateString()
                            : 'TBD'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time Control:</span>
                        <span className="text-black font-medium">{tournament.time_control || 'TBD'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Location Info */}
                  {(tournament.city || tournament.state || tournament.location) && (
                    <div className="bg-white border border-gray-200 rounded p-6">
                      <h3 className="text-lg font-semibold text-black mb-4">Location</h3>
                      <div className="space-y-3">
                        {tournament.city && tournament.state && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">City:</span>
                            <span className="text-black font-medium">{tournament.city}, {tournament.state}</span>
                          </div>
                        )}
                        {tournament.location && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Venue:</span>
                            <span className="text-black font-medium">{tournament.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Officials */}
                  {(tournament.chief_td_name || tournament.chief_arbiter_name) && (
                    <div className="bg-white border border-gray-200 rounded p-6">
                      <h3 className="text-lg font-semibold text-black mb-4">Officials</h3>
                      <div className="space-y-3">
                        {tournament.chief_td_name && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Chief TD:</span>
                            <span className="text-black font-medium">{tournament.chief_td_name}</span>
                          </div>
                        )}
                        {tournament.chief_arbiter_name && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Arbiter:</span>
                            <span className="text-black font-medium">{tournament.chief_arbiter_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rating Info */}
                  {(tournament.uscf_rated || tournament.fide_rated) && (
                    <div className="bg-white border border-gray-200 rounded p-6">
                      <h3 className="text-lg font-semibold text-black mb-4">Rating</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">USCF:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tournament.uscf_rated ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {tournament.uscf_rated ? 'Rated' : 'Unrated'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">FIDE:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tournament.fide_rated ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {tournament.fide_rated ? 'Rated' : 'Unrated'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact Info */}
                  {tournament.website && (
                    <div className="bg-white border border-gray-200 rounded p-6">
                      <h3 className="text-lg font-semibold text-black mb-4">Contact</h3>
                      <div className="space-y-3">
                        <a 
                          href={tournament.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Globe className="h-4 w-4" />
                          <span className="text-sm">Visit Website</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white border border-gray-200 rounded p-6">
                  <h3 className="text-lg font-semibold text-black mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => setActiveTab('pairings')}
                      className="group flex flex-col items-center space-y-2 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300"
                    >
                      <Gamepad2 className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform" />
                      <span className="text-sm text-gray-900 font-medium">View Pairings</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('standings')}
                      className="group flex flex-col items-center space-y-2 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300"
                    >
                      <Trophy className="h-6 w-6 text-yellow-600 group-hover:scale-110 transition-transform" />
                      <span className="text-sm text-gray-900 font-medium">View Standings</span>
                    </button>
                    
                    <button
                      onClick={handleShare}
                      className="group flex flex-col items-center space-y-2 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300"
                    >
                      <Share2 className="h-6 w-6 text-green-600 group-hover:scale-110 transition-transform" />
                      <span className="text-sm text-gray-900 font-medium">Share Tournament</span>
                    </button>
                    
                    <a
                      href={`/register/${tournament.id}`}
                      className="group flex flex-col items-center space-y-2 p-4 bg-gradient-to-r from-orange-100 to-red-100 rounded-xl hover:from-orange-200 hover:to-red-200 transition-all duration-300 border border-orange-200"
                    >
                      <Users className="h-6 w-6 text-orange-600 group-hover:scale-110 transition-transform" />
                      <span className="text-sm text-gray-900 font-medium">Register Now</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pairings' && (
              <div className="space-y-6">
                {/* Enhanced Pairings Header */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Gamepad2 className="h-6 w-6 mr-2 text-blue-600" />
                        Round {selectedRound} Pairings
                      </h2>
                      
                      {/* Enhanced Round Selector */}
                      <div className="flex items-center space-x-2 bg-white rounded-lg p-2 shadow-sm border border-gray-200">
                        <button
                          onClick={() => setSelectedRound(Math.max(1, selectedRound - 1))}
                          disabled={selectedRound <= 1}
                          className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label="Previous round"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <select
                          value={selectedRound}
                          onChange={(e) => setSelectedRound(parseInt(e.target.value))}
                          className="px-3 py-2 border-0 bg-transparent text-sm font-medium focus:ring-2 focus:ring-blue-500 rounded"
                        >
                          {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(round => (
                            <option key={round} value={round}>
                              Round {round}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setSelectedRound(Math.min(tournament.rounds, selectedRound + 1))}
                          disabled={selectedRound >= tournament.rounds}
                          className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label="Next round"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Enhanced Section Filter */}
                      <div className="flex items-center space-x-2 bg-white rounded-lg p-2 shadow-sm border border-gray-200">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <select
                          value={selectedSection}
                          onChange={(e) => setSelectedSection(e.target.value)}
                          className="px-3 py-2 border-0 bg-transparent text-sm font-medium focus:ring-2 focus:ring-blue-500 rounded"
                        >
                          {getAvailableSections().map(section => (
                            <option key={section} value={section}>
                              {section === 'all' ? 'All Sections' : `${section} Section`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200">
                        <div className="text-sm text-gray-600">Total Boards</div>
                        <div className="text-lg font-bold text-gray-900">{(allRoundsData[selectedRound] || []).length}</div>
                      </div>
                      
                      {/* Mobile-friendly export button */}
                      <button
                        onClick={() => handleExport('pairings', 'pdf')}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        aria-label="Export pairings"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Export</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                {(allRoundsData[selectedRound] || []).length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No pairings available for this round</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(() => {
                      // Get pairings for selected round
                      const currentPairings = allRoundsData[selectedRound] || [];
                      
                      // Filter pairings by selected section
                      let filteredPairings = currentPairings;
                      if (selectedSection && selectedSection !== '') {
                        filteredPairings = currentPairings.filter(pairing => pairing.section === selectedSection);
                      }

                      // Group pairings by section
                      const pairingsBySection: { [key: string]: any[] } = {};
                      filteredPairings.forEach((pairing) => {
                        const section = pairing.section || 'Open';
                        if (!pairingsBySection[section]) {
                          pairingsBySection[section] = [];
                        }
                        pairingsBySection[section].push(pairing);
                      });

                      // Sort sections by name
                      const sortedSections = Object.keys(pairingsBySection).sort();

                      return sortedSections.map(sectionName => {
                        const sectionPairings = pairingsBySection[sectionName];
                        // Sort pairings by board number
                        sectionPairings.sort((a, b) => (a.board || 0) - (b.board || 0));

                        return (
                          <div key={sectionName} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-gray-700 to-gray-600 px-6 py-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">{sectionName} Section</h3>
                                <div className="flex items-center space-x-4">
                                  <span className="text-sm text-gray-200">{sectionPairings.length} games</span>
                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      {displayOptions.boardNumbers ? 'Board' : '#'}
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      White Player
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Score
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Black Player
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Score
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Result
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                  {sectionPairings.map((pairing) => (
                                    <tr key={pairing.id} className="hover:bg-blue-50 transition-colors duration-200 group">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                            {pairing.board}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded mr-3 shadow-sm"></div>
                                          <div>
                                            <div className="text-sm font-medium text-gray-900">{pairing.white_name || 'TBD'}</div>
                                            {displayOptions.showRatings && pairing.white_rating && (
                                              <div className="text-xs text-gray-500">Rating: {pairing.white_rating}</div>
                                            )}
                                            {displayOptions.showUscfIds && pairing.white_uscf_id && (
                                              <div className="text-xs text-gray-500">USCF: {pairing.white_uscf_id}</div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="text-lg font-bold text-gray-900">
                                          {pairing.white_player_id ? calculatePlayerScores()[pairing.white_player_id] || 0 : '-'}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className="w-4 h-4 bg-gray-800 border-2 border-gray-300 rounded mr-3 shadow-sm"></div>
                                          <div>
                                            <div className="text-sm font-medium text-gray-900">{pairing.black_name || 'TBD'}</div>
                                            {displayOptions.showRatings && pairing.black_rating && (
                                              <div className="text-xs text-gray-500">Rating: {pairing.black_rating}</div>
                                            )}
                                            {displayOptions.showUscfIds && pairing.black_uscf_id && (
                                              <div className="text-xs text-gray-500">USCF: {pairing.black_uscf_id}</div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="text-lg font-bold text-gray-900">
                                          {pairing.black_player_id ? calculatePlayerScores()[pairing.black_player_id] || 0 : '-'}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                                          pairing.result === '1-0' ? 'bg-green-100 text-green-800' :
                                          pairing.result === '0-1' ? 'bg-red-100 text-red-800' :
                                          pairing.result === '1/2-1/2' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {pairing.result || 'TBD'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            
                            {/* Mobile Card View */}
                            <div className="lg:hidden divide-y divide-gray-200">
                              {sectionPairings.map((pairing) => (
                                <div key={pairing.id} className="p-4 hover:bg-blue-50 transition-colors">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                        {pairing.board}
                                      </div>
                                      <span className="text-sm font-medium text-gray-600">Board {pairing.board}</span>
                                    </div>
                                    <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${
                                      pairing.result === '1-0' ? 'bg-green-100 text-green-800' :
                                      pairing.result === '0-1' ? 'bg-red-100 text-red-800' :
                                      pairing.result === '1/2-1/2' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {pairing.result || 'TBD'}
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    {/* White Player */}
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded shadow-sm"></div>
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">{pairing.white_name || 'TBD'}</div>
                                          {displayOptions.showRatings && pairing.white_rating && (
                                            <div className="text-xs text-gray-500">Rating: {pairing.white_rating}</div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-lg font-bold text-gray-900">
                                        {pairing.white_player_id ? calculatePlayerScores()[pairing.white_player_id] || 0 : '-'}
                                      </div>
                                    </div>
                                    
                                    {/* Black Player */}
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-4 h-4 bg-gray-800 border-2 border-gray-300 rounded shadow-sm"></div>
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">{pairing.black_name || 'TBD'}</div>
                                          {displayOptions.showRatings && pairing.black_rating && (
                                            <div className="text-xs text-gray-500">Rating: {pairing.black_rating}</div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-lg font-bold text-gray-900">
                                        {pairing.black_player_id ? calculatePlayerScores()[pairing.black_player_id] || 0 : '-'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'standings' && (
              <div>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <h2 className="text-xl font-semibold text-black">Current Standings</h2>
                    
                    {/* Player Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search players..."
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                    />
                    </div>
                    
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                    >
                      {getAvailableSections().map(section => (
                        <option key={section} value={section}>
                          {section === 'all' ? 'All Sections' : `${section} Section`}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    {getFilteredStandings(standings).length} players
                  </div>
                </div>
                
                {standings.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No standings available yet</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(() => {
                      // Filter standings by selected section and search
                      let filteredStandings = getFilteredStandings(standings);
                      if (selectedSection && selectedSection !== '') {
                        filteredStandings = filteredStandings.filter(standing => standing.section === selectedSection);
                      }

                      // Group standings by section
                      const standingsBySection: { [key: string]: any[] } = {};
                      filteredStandings.forEach((standing, index) => {
                        const section = standing.section || 'Open';
                        if (!standingsBySection[section]) {
                          standingsBySection[section] = [];
                        }
                        standingsBySection[section].push({ ...standing, originalIndex: index });
                      });

                      // Sort sections by name
                      const sortedSections = Object.keys(standingsBySection).sort();

                      return sortedSections.map(sectionName => {
                        const sectionStandings = standingsBySection[sectionName];
                        // Re-sort within section by points (descending)
                        sectionStandings.sort((a, b) => b.total_points - a.total_points);

                        return (
                          <div key={sectionName} className="border border-gray-200 rounded-lg">
                            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                              <h3 className="text-lg font-semibold text-gray-900">{sectionName} Section</h3>
                              <p className="text-sm text-gray-600">{sectionStandings.length} players</p>
                            </div>
                            
                            <div className="p-4">
                              <ChessStandingsTable
                                standings={sectionStandings.map(player => ({
                                  ...player,
                                  tiebreakers: {
                                    buchholz: 0, // Default values since tiebreakers aren't calculated in public API
                                    sonnebornBerger: 0,
                                    performanceRating: 0,
                                    modifiedBuchholz: 0,
                                    cumulative: 0
                                  }
                                }))}
                                tournament={data?.tournament}
                                selectedSection={sectionName}
                                showTiebreakers={false} // Hide tiebreakers since they're not calculated
                                showPrizes={true}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            )}


            {activeTab === 'teams' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-black">Team Standings</h2>
                  <div className="text-sm text-gray-500">
                    {data?.teamStandings?.length || 0} teams
                  </div>
                </div>
                
                {!data?.teamStandings || data?.teamStandings?.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No team standings available</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Match Points</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Game Points</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Buchholz</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data?.teamStandings?.map((team, index) => (
                          <tr key={team.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{team.name}</div>
                              {team.captain_name && (
                                <div className="text-sm text-gray-500">Captain: {team.captain_name}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                              {team.match_points || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                              {team.game_points || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                              {team.buchholz ? team.buchholz.toFixed(1) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                              {team.member_count || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'prizes' && data?.prizes && data?.prizes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-black">Prize Information</h2>
                  <div className="text-sm text-gray-500">
                    {data?.prizes?.length || 0} prizes
                  </div>
                </div>
                
                {data?.prizes?.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No prizes available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data?.prizes?.map((prize) => (
                      <div key={prize.id} className="p-6 rounded border border-gray-200 bg-white">
                        <div className="flex items-center mb-4">
                          <div className="p-3 bg-yellow-100 rounded-lg mr-4">
                            <Trophy className="h-6 w-6 text-yellow-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-black">
                              {prize.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {prize.type === 'cash' ? 'Cash Prize' : 
                               prize.type === 'trophy' ? 'Trophy' :
                               prize.type === 'medal' ? 'Medal' : 'Plaque'}
                            </p>
                          </div>
                        </div>
                        
                        {prize.position && (
                          <div className="text-sm text-gray-700 mb-2">
                            <span className="font-medium">Position:</span> {prize.position}
                            {prize.position === 1 && 'st'}
                            {prize.position === 2 && 'nd'}
                            {prize.position === 3 && 'rd'}
                            {prize.position > 3 && 'th'}
                          </div>
                        )}
                        
                        {prize.rating_category && (
                          <div className="text-sm text-gray-700 mb-2">
                            <span className="font-medium">Category:</span> {prize.rating_category}
                          </div>
                        )}
                        
                        {prize.section && (
                          <div className="text-sm text-gray-700 mb-2">
                            <span className="font-medium">Section:</span> {prize.section}
                          </div>
                        )}
                        
                        {prize.amount && (
                          <div className="text-lg font-bold text-green-600 mb-2">
                            ${prize.amount}
                          </div>
                        )}
                        
                        {prize.description && (
                          <p className="text-sm text-gray-600">
                            {prize.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'preregistered' && data?.activePlayersList && data?.activePlayersList.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-black">Tournament Players</h2>
                  <div className="text-sm text-gray-500">
                    {data?.activePlayersList?.length || 0} players
                  </div>
                </div>
                
                {data?.activePlayersList?.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No active players</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Group players by section */}
                    {(Array.from(
                      data?.activePlayersList?.reduce((acc, player) => {
                        const section = player.section || 'Unassigned';
                        if (!acc.has(section)) {
                          acc.set(section, []);
                        }
                        acc.get(section)!.push(player);
                        return acc;
                      }, new Map<string, any[]>())
                    ) as [string, any[]][])
                      .sort(([sectionA], [sectionB]) => sectionA.localeCompare(sectionB))
                      .map(([section, players]: [string, any[]]) => (
                        <div key={section} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Section Header */}
                          <div className="bg-gradient-to-r from-gray-700 to-gray-600 px-6 py-3">
                            <h3 className="text-lg font-semibold text-white">
                              {section} ({players.length} players)
                            </h3>
                          </div>
                          
                          {/* Section Players Table */}
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USCF ID</th>
                                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {players.map((player) => (
                                  <tr key={player.id} className="hover:bg-blue-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                      {player.uscf_id && player.uscf_id !== '0' ? (
                                        <a
                                          href={`https://www.uschess.org/msa/MbrDtlMain.php?${player.uscf_id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 hover:underline"
                                          title="View USCF Profile"
                                        >
                                          {player.name}
                                        </a>
                                      ) : (
                                        <span className="text-gray-900">{player.name}</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                      {player.uscf_id && player.uscf_id !== '0' ? (
                                        <a
                                          href={`https://www.uschess.org/msa/MbrDtlMain.php?${player.uscf_id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                                        >
                                          {player.uscf_id}
                                        </a>
                                      ) : (
                                        '-'
                                      )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-medium">
                                      {player.rating || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {new Date(player.created_at).toLocaleDateString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && data?.analytics && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-black">Tournament Analytics</h2>
                  <div className="text-sm text-gray-500">
                    Generated: {data?.analytics?.generatedAt ? new Date(data.analytics.generatedAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                
                <div className="space-y-8">
                  {/* Overview Stats */}
                  {data?.analytics?.overview && (
                    <div className="p-6 rounded border border-gray-200 bg-white">
                      <h3 className="text-lg font-semibold mb-4 text-black">Overview</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(data?.analytics?.overview || {}).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <div className="text-2xl font-bold text-black">
                              {typeof value === 'number' ? value.toLocaleString() : String(value)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Performers */}
                  {data?.analytics?.topPerformers && data?.analytics?.topPerformers.length > 0 && (
                    <div className="p-6 rounded border border-gray-200 bg-white">
                      <h3 className="text-lg font-semibold mb-4 text-black">Top Performers</h3>
                      <div className="space-y-3">
                        {data?.analytics?.topPerformers?.slice(0, 5).map((performer: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-medium text-black">
                                  {performer.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {performer.rating && `Rating: ${performer.rating}`}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm font-medium text-black">
                              {performer.points || performer.score || 0} points
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Performance Charts */}
                  {data?.analytics?.playerPerformance && data?.analytics?.playerPerformance.length > 0 && (
                    <div className="p-6 rounded border border-gray-200 bg-white">
                      <h3 className="text-lg font-semibold mb-4 text-black">Performance Analysis</h3>
                      <div className="text-center py-8">
                        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">
                          Performance charts would be displayed here
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-40 space-y-3">
        {/* Quick Register Button */}
        <a
          href={`/register/${tournament.id}`}
          className="group flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300"
          aria-label="Quick register for tournament"
        >
          <Users className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </a>
        
        {/* Share Button */}
        <button
          onClick={handleShare}
          className="group flex items-center justify-center w-12 h-12 bg-white text-gray-700 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 border border-gray-200"
          aria-label="Share tournament"
        >
          <Share2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
        </button>
        
        {/* Settings Toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="group flex items-center justify-center w-12 h-12 bg-white text-gray-700 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 border border-gray-200"
          aria-label="Toggle settings"
        >
          <Settings className="h-5 w-5 group-hover:scale-110 transition-transform" />
        </button>
        
        {/* Scroll to Top Button */}
        {isScrolled && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="group flex items-center justify-center w-12 h-12 bg-gray-800 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300"
            aria-label="Scroll to top"
          >
            <ChevronUp className="h-5 w-5 group-hover:scale-110 transition-transform" />
          </button>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
          <div className="flex items-center justify-around py-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                activeTab === 'overview' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
              }`}
              aria-label="Overview"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs font-medium">Overview</span>
            </button>
            
            <button
              onClick={() => setActiveTab('pairings')}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                activeTab === 'pairings' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
              }`}
              aria-label="Pairings"
            >
              <Gamepad2 className="h-5 w-5" />
              <span className="text-xs font-medium">Pairings</span>
            </button>
            
            <button
              onClick={() => setActiveTab('standings')}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                activeTab === 'standings' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
              }`}
              aria-label="Standings"
            >
              <Trophy className="h-5 w-5" />
              <span className="text-xs font-medium">Standings</span>
            </button>
            
            <a
              href={`/register/${tournament.id}`}
              className="flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors text-green-600 hover:bg-green-50"
              aria-label="Register"
            >
              <Users className="h-5 w-5" />
              <span className="text-xs font-medium">Register</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicTournamentDisplay;

