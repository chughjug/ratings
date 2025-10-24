import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Trophy, Users, Calendar, Clock, RefreshCw, Download, Share2, 
  ArrowLeft, Search, ChevronLeft, ChevronRight, 
  Crown, Award, BarChart3, TrendingUp, Activity, Star, MapPin, 
  UserCheck, Timer, Gamepad2, Globe, Eye, EyeOff, Shield
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
  const [activeTab, setActiveTab] = useState<'overview' | 'pairings' | 'standings' | 'teams' | 'prizes' | 'analytics'>('overview');
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
    <div className="min-h-screen bg-white">
      {/* Clean Navigation Bar */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/public/tournaments" className="flex items-center">
              <PairCraftLogo size="sm" showText={true} />
            </Link>
            
            <Link
              to="/public/tournaments"
              className="inline-flex items-center space-x-2 text-gray-600 hover:text-black text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to tournaments</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            {/* Tournament Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
              {tournament.name}
            </h1>
            
            {/* Tournament Meta */}
            <div className="flex flex-wrap items-center justify-center gap-8 mb-8 text-sm text-gray-600">
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
                className="inline-flex items-center space-x-2 bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors text-sm"
              >
                <Users className="h-4 w-4" />
                <span>Register</span>
              </a>
              
              <button
                onClick={handleShare}
                className="inline-flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition-colors text-sm"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
              
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded transition-colors text-sm ${
                  autoRefresh 
                    ? 'bg-gray-100 text-gray-900 border border-gray-300' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <RefreshCw className="h-4 w-4" />
                <span>Auto refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Display Options Panel */}
      {showSettings && (
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-white rounded border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4 text-black">Display Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={displayOptions.showRatings}
                    onChange={(e) => updateDisplayOption('showRatings', e.target.checked)}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-2 focus:ring-black"
                  />
                  <span className="text-sm text-gray-700">Show Ratings</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={displayOptions.showUscfIds}
                    onChange={(e) => updateDisplayOption('showUscfIds', e.target.checked)}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-2 focus:ring-black"
                  />
                  <span className="text-sm text-gray-700">Show USCF IDs</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={displayOptions.boardNumbers}
                    onChange={(e) => updateDisplayOption('boardNumbers', e.target.checked)}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-2 focus:ring-black"
                  />
                  <span className="text-sm text-gray-700">Board Numbers</span>
                </label>
                
                <div className="flex items-center space-x-3">
                  <label className="text-sm text-gray-700">Format:</label>
                  <select
                    value={displayOptions.displayFormat}
                    onChange={(e) => updateDisplayOption('displayFormat', e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                  >
                    <option value="default">Default</option>
                    <option value="compact">Compact</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
              </div>
              
              {/* Additional Options */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="w-4 h-4 text-black border-gray-300 rounded focus:ring-2 focus:ring-black"
                    />
                    <span className="text-sm text-gray-700">Auto Refresh (30s)</span>
                  </label>
                  
                  {lastUpdated && (
                    <div className="text-sm text-gray-500">
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
        {/* Tournament Statistics */}
        {getTournamentStats() && (
          <div className="mb-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white border border-gray-200 rounded p-4 text-center">
                <div className="text-2xl font-bold text-black mb-1">{getTournamentStats()?.totalPlayers}</div>
                <div className="text-sm text-gray-600">Players</div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded p-4 text-center">
                <div className="text-2xl font-bold text-black mb-1">{getTournamentStats()?.totalGames}</div>
                <div className="text-sm text-gray-600">Games</div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded p-4 text-center">
                <div className="text-2xl font-bold text-black mb-1">{getTournamentStats()?.completedGames}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded p-4 text-center">
                <div className="text-2xl font-bold text-black mb-1">{getTournamentStats()?.averageRating}</div>
                <div className="text-sm text-gray-600">Avg Rating</div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded p-4 text-center">
                <div className="text-2xl font-bold text-black mb-1">{getTournamentStats()?.completionRate}%</div>
                <div className="text-sm text-gray-600">Complete</div>
              </div>
              
              {getTournamentStats() && getTournamentStats()!.totalTeams > 0 && (
                <div className="bg-white border border-gray-200 rounded p-4 text-center">
                  <div className="text-2xl font-bold text-black mb-1">{getTournamentStats()?.totalTeams}</div>
                  <div className="text-sm text-gray-600">Teams</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tournament Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Start Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {tournament.start_date 
                    ? new Date(tournament.start_date).toLocaleDateString()
                    : 'TBD'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg mr-4">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">End Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {tournament.end_date 
                    ? new Date(tournament.end_date).toLocaleDateString()
                    : 'TBD'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg mr-4">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Time Control</p>
                <p className="text-lg font-semibold text-gray-900">{tournament.time_control || 'TBD'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg mr-4">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Players</p>
                <p className="text-lg font-semibold text-gray-900">{standings.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* US Chess Tournament Details */}
        {(tournament.city || tournament.state || tournament.location || tournament.chief_td_name || tournament.website || tournament.expected_players) && (
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 mb-8">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-chess-board rounded-lg mr-4">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Tournament Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournament.city && tournament.state && (
                <div className="flex items-center">
                  <div className="h-6 w-6 text-gray-400 mr-3 flex items-center justify-center">
                    📍
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">{tournament.city}, {tournament.state}</p>
                    {tournament.location && (
                      <p className="text-sm text-gray-500">{tournament.location}</p>
                    )}
                  </div>
                </div>
              )}

              {tournament.chief_td_name && (
                <div className="flex items-center">
                  <div className="h-6 w-6 text-gray-400 mr-3 flex items-center justify-center">
                    👨‍💼
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Chief TD</p>
                    <p className="font-medium">{tournament.chief_td_name}</p>
                    {tournament.chief_td_uscf_id && (
                      <p className="text-sm text-gray-500">USCF ID: {tournament.chief_td_uscf_id}</p>
                    )}
                  </div>
                </div>
              )}

              {tournament.chief_arbiter_name && (
                <div className="flex items-center">
                  <div className="h-6 w-6 text-gray-400 mr-3 flex items-center justify-center">
                    ⚖️
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Chief Arbiter</p>
                    <p className="font-medium">{tournament.chief_arbiter_name}</p>
                    {tournament.chief_arbiter_fide_id && (
                      <p className="text-sm text-gray-500">FIDE ID: {tournament.chief_arbiter_fide_id}</p>
                    )}
                  </div>
                </div>
              )}

              {tournament.expected_players && (
                <div className="flex items-center">
                  <div className="h-6 w-6 text-gray-400 mr-3 flex items-center justify-center">
                    👥
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expected Players</p>
                    <p className="font-medium">{tournament.expected_players}</p>
                  </div>
                </div>
              )}

              {tournament.website && (
                <div className="flex items-center">
                  <div className="h-6 w-6 text-gray-400 mr-3 flex items-center justify-center">
                    🌐
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Website</p>
                    <a 
                      href={tournament.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      Visit Website
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <div className="h-6 w-6 text-gray-400 mr-3 flex items-center justify-center">
                  🏆
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rating</p>
                  <div className="flex space-x-2">
                    {tournament.uscf_rated && (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        USCF
                      </span>
                    )}
                    {tournament.fide_rated && (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        FIDE
                      </span>
                    )}
                    {!tournament.uscf_rated && !tournament.fide_rated && (
                      <span className="text-sm text-gray-500">Unrated</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clean Tab Navigation */}
        <div className="bg-white border border-gray-200 rounded mb-6">
          <div className="px-6 py-4">
            <nav className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-gray-100 text-black'
                    : 'text-gray-600 hover:text-black hover:bg-gray-50'
                }`}
              >
                Overview
              </button>
              
              <button
                onClick={() => setActiveTab('pairings')}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  activeTab === 'pairings'
                    ? 'bg-gray-100 text-black'
                    : 'text-gray-600 hover:text-black hover:bg-gray-50'
                }`}
              >
                Pairings
              </button>
              
              <button
                onClick={() => setActiveTab('standings')}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  activeTab === 'standings'
                    ? 'bg-gray-100 text-black'
                    : 'text-gray-600 hover:text-black hover:bg-gray-50'
                }`}
              >
                Standings
              </button>
              
              <button
                onClick={() => setActiveTab('teams')}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  activeTab === 'teams'
                    ? 'bg-gray-100 text-black'
                    : 'text-gray-600 hover:text-black hover:bg-gray-50'
                }`}
              >
                Teams
              </button>
              
              {data?.prizes && data.prizes.length > 0 && (
                <button
                  onClick={() => setActiveTab('prizes')}
                  className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                    activeTab === 'prizes'
                      ? 'bg-gray-100 text-black'
                      : 'text-gray-600 hover:text-black hover:bg-gray-50'
                  }`}
                >
                  Prizes
                </button>
              )}
              
              {data?.analytics && (
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                    activeTab === 'analytics'
                      ? 'bg-gray-100 text-black'
                      : 'text-gray-600 hover:text-black hover:bg-gray-50'
                  }`}
                >
                  Analytics
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
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
              <div>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <h2 className="text-xl font-semibold text-black">
                      Round {selectedRound} Pairings
                    </h2>
                    
                    {/* Round Selector */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedRound(Math.max(1, selectedRound - 1))}
                        disabled={selectedRound <= 1}
                        className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <select
                        value={selectedRound}
                        onChange={(e) => setSelectedRound(parseInt(e.target.value))}
                        className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
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
                        className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                    >
                      {getAvailableSections().map(section => (
                        <option key={section} value={section}>
                          {section === 'all' ? 'All Sections' : `${section} Section`}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    {(allRoundsData[selectedRound] || []).length} boards
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
                          <div key={sectionName} className="border border-gray-200 rounded mb-6">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                              <h3 className="text-lg font-semibold text-black">{sectionName} Section</h3>
                              <p className="text-sm text-gray-600">{sectionPairings.length} games</p>
                            </div>
                            
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      {displayOptions.boardNumbers ? 'Board' : '#'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      White
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Score
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Black
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Score
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Result
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {sectionPairings.map((pairing) => (
                          <tr key={pairing.id} className="hover:bg-gray-50 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                              {displayOptions.boardNumbers ? `Board ${pairing.board}` : pairing.board}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                              <div className="flex items-center">
                                <div className="w-4 h-4 bg-white border border-gray-300 rounded mr-3"></div>
                                {pairing.white_name || 'TBD'}
                                {displayOptions.showRatings && pairing.white_rating && (
                                  <span className="text-gray-600 ml-2">({pairing.white_rating})</span>
                                )}
                                {displayOptions.showUscfIds && pairing.white_uscf_id && (
                                  <span className="text-gray-500 ml-2">[{pairing.white_uscf_id}]</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-black text-center font-semibold">
                              {pairing.white_player_id ? calculatePlayerScores()[pairing.white_player_id] || 0 : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                              <div className="flex items-center">
                                <div className="w-4 h-4 bg-gray-800 border border-gray-300 rounded mr-3"></div>
                                {pairing.black_name || 'TBD'}
                                {displayOptions.showRatings && pairing.black_rating && (
                                  <span className="text-gray-600 ml-2">({pairing.black_rating})</span>
                                )}
                                {displayOptions.showUscfIds && pairing.black_uscf_id && (
                                  <span className="text-gray-500 ml-2">[{pairing.black_uscf_id}]</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-black text-center font-semibold">
                              {pairing.black_player_id ? calculatePlayerScores()[pairing.black_player_id] || 0 : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-black text-center">
                              <span className={`inline-flex px-3 py-1 text-xs font-medium rounded ${
                                pairing.result === '1-0' ? 'bg-green-100 text-green-800' :
                                pairing.result === '0-1' ? 'bg-red-100 text-red-800' :
                                pairing.result === '1/2-1/2' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {pairing.result || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                
                {!data?.teamStandings || data.teamStandings.length === 0 ? (
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
                        {data.teamStandings.map((team, index) => (
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

            {activeTab === 'prizes' && data?.prizes && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-black">Prize Information</h2>
                  <div className="text-sm text-gray-500">
                    {data.prizes.length} prizes
                  </div>
                </div>
                
                {data.prizes.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No prizes available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.prizes.map((prize) => (
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

            {activeTab === 'analytics' && data?.analytics && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-black">Tournament Analytics</h2>
                  <div className="text-sm text-gray-500">
                    Generated: {new Date(data.analytics.generatedAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="space-y-8">
                  {/* Overview Stats */}
                  {data.analytics.overview && (
                    <div className="p-6 rounded border border-gray-200 bg-white">
                      <h3 className="text-lg font-semibold mb-4 text-black">Overview</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(data.analytics.overview).map(([key, value]) => (
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
                  {data.analytics.topPerformers && data.analytics.topPerformers.length > 0 && (
                    <div className="p-6 rounded border border-gray-200 bg-white">
                      <h3 className="text-lg font-semibold mb-4 text-black">Top Performers</h3>
                      <div className="space-y-3">
                        {data.analytics.topPerformers.slice(0, 5).map((performer: any, index: number) => (
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
                  {data.analytics.playerPerformance && data.analytics.playerPerformance.length > 0 && (
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
    </div>
  );
};

export default PublicTournamentDisplay;

