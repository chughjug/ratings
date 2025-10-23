import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Trophy, Users, Calendar, Clock, RefreshCw, Download, Share2, 
  ArrowLeft, Search, ChevronLeft, ChevronRight, 
  Crown, Award, BarChart3, TrendingUp, Activity, Star, MapPin, 
  UserCheck, Timer, Gamepad2, Globe, Eye, EyeOff, Shield, Building2
} from 'lucide-react';
import { organizationApi } from '../services/organizationApi';
import { exportPairingsPDF, exportStandingsPDF } from '../services/pdfExport';
import { CrosstableService } from '../services/crosstableService';
import ChessStandingsTable from '../components/ChessStandingsTable';
import TeamPairingsTable from '../components/TeamPairingsTable';
import TeamStandingsTable from '../components/TeamStandingsTable';
// import PrizesTable from '../components/PrizesTable';
// import AnalyticsDashboard from '../components/AnalyticsDashboard';

interface PublicDisplayData {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  tournament: any;
  sections: any[];
  players: any[];
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

const PublicOrganizationTournament: React.FC = () => {
  const { orgSlug, tournamentId } = useParams<{ orgSlug: string; tournamentId: string }>();
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

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchPublicData = useCallback(async () => {
    if (!orgSlug || !tournamentId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await organizationApi.getPublicTournament(orgSlug, tournamentId);
      if (response.success) {
        setData(response.data);
        setLastUpdated(new Date());
        
        // Load all rounds data asynchronously (don't wait for it)
        fetchAllRoundsData(response.data.tournament.rounds).catch(err => {
          console.warn('Failed to fetch all rounds data:', err);
        });
      } else {
        throw new Error(response.error || 'Failed to load tournament data');
      }
    } catch (err: any) {
      console.error('Failed to fetch public tournament data:', err);
      setError(err.response?.data?.error || 'Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, tournamentId]);

  const fetchAllRoundsData = async (totalRounds: number) => {
    if (!orgSlug || !tournamentId) return;
    
    try {
      const roundsData: { [round: number]: any[] } = {};
      
      for (let round = 1; round <= totalRounds; round++) {
        try {
          // This would need a separate API endpoint for historical rounds
          // For now, we'll skip this functionality
          console.log(`Would fetch round ${round} data`);
        } catch (err) {
          console.warn(`Failed to fetch round ${round} data:`, err);
        }
      }
      
      setAllRoundsData(roundsData);
    } catch (err) {
      console.error('Failed to fetch all rounds data:', err);
    }
  };

  useEffect(() => {
    fetchPublicData();
  }, [fetchPublicData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !data) return;
    
    const interval = setInterval(() => {
      fetchPublicData();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh, data, fetchPublicData]);

  const handleExportPDF = async (type: 'pairings' | 'standings') => {
    if (!data) return;
    
    try {
      if (type === 'pairings') {
        await exportPairingsPDF(data.tournament, data.pairings, 1, undefined, selectedSection);
      } else if (type === 'standings') {
        await exportStandingsPDF(data.tournament, data.standings, undefined, selectedSection);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${data?.tournament.name} - ${data?.organization.name}`,
          text: `Check out this chess tournament: ${data?.tournament.name}`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'created':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const filteredPlayers = data?.players.filter(player => 
    !playerSearch || 
    `${player.first_name} ${player.last_name}`.toLowerCase().includes(playerSearch.toLowerCase()) ||
    player.uscf_id?.toLowerCase().includes(playerSearch.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tournament Not Found</h1>
          <p className="text-gray-600">The tournament you're looking for doesn't exist or is not public.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                to={`/public/organizations/${orgSlug}`}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to {data.organization.name}
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500"
              >
                {darkMode ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <Building2 className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium text-gray-500">{data.organization.name}</span>
              </div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                {data.tournament.name}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(data.tournament.status)}`}>
                  {data.tournament.status}
                </span>
                {data.tournament.start_date && (
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(data.tournament.start_date)}
                  </span>
                )}
                {data.tournament.location && (
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {data.tournament.location}
                  </span>
                )}
                {data.tournament.time_control && (
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {data.tournament.time_control}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-refresh
              </button>
              {lastUpdated && (
                <span className="text-xs text-gray-500">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} border-b border-gray-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Trophy },
              { id: 'pairings', label: 'Pairings', icon: Users },
              { id: 'standings', label: 'Standings', icon: BarChart3 },
              ...(data.tournament.format.includes('team') ? [{ id: 'teams', label: 'Teams', icon: Users }] : []),
              ...(data.prizes && data.prizes.length > 0 ? [{ id: 'prizes', label: 'Prizes', icon: Award }] : []),
              { id: 'analytics', label: 'Analytics', icon: TrendingUp }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2 inline" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Tournament Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Players</p>
                    <p className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {data.players.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
                <div className="flex items-center">
                  <Trophy className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Sections</p>
                    <p className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {data.sections.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Rounds</p>
                    <p className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {data.tournament.rounds}
                    </p>
                  </div>
                </div>
              </div>
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Current Round</p>
                    <p className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {data.currentRound}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow`}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Tournament Sections
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.sections.map((section) => (
                    <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{section.name}</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Players: {data.players.filter(p => p.section_id === section.id).length}</p>
                        {section.rating_min && section.rating_max && (
                          <p>Rating: {section.rating_min} - {section.rating_max}</p>
                        )}
                        {section.time_control && (
                          <p>Time Control: {section.time_control}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pairings' && (
          <div className="space-y-6">
            <TeamPairingsTable
              pairings={data.pairings}
              round={1}
              tournamentFormat="team-swiss"
              showResults={true}
            />
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="space-y-6">
            <ChessStandingsTable
              standings={data.standings}
              tournament={{
                rounds: data.tournament.rounds,
                name: data.tournament.name
              }}
              selectedSection={selectedSection}
              showTiebreakers={true}
              showPrizes={true}
            />
          </div>
        )}

        {activeTab === 'teams' && data.teamStandings && (
          <div className="space-y-6">
            <TeamStandingsTable
              standings={data.teamStandings}
              tournamentFormat="team-swiss"
              showTiebreakers={true}
              totalRounds={data.tournament.rounds}
            />
          </div>
        )}

        {activeTab === 'prizes' && data.prizes && (
          <div className="space-y-6">
            {/* <PrizesTable
              prizes={data.prizes}
              sections={data.sections}
              selectedSection={selectedSection}
              onSectionChange={setSelectedSection}
              darkMode={darkMode}
            /> */}
            <div className="text-center py-8 text-gray-500">
              Prizes table coming soon
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* <AnalyticsDashboard
              tournament={data.tournament}
              players={data.players}
              standings={data.standings}
              sections={data.sections}
              darkMode={darkMode}
            /> */}
            <div className="text-center py-8 text-gray-500">
              Analytics dashboard coming soon
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicOrganizationTournament;
