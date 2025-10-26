import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trophy, Users, Calendar, TrendingUp, Building2, User, 
  Search, X, Plus, ArrowRight, Filter, MapPin, Clock, 
  Activity, Star, Zap, BarChart3 
} from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { tournamentApi } from '../services/api';
import NotificationButton from '../components/NotificationButton';
import { getAllTournamentNotifications } from '../utils/notificationUtils';

interface TeamStanding {
  team_name: string;
  team_id: string;
  score: number;
  rank?: number;
}

interface TournamentTeamStandings {
  tournamentId: string;
  tournamentName: string;
  standings: TeamStanding[];
}

const Dashboard: React.FC = () => {
  const { state, dispatch } = useTournament();
  const { user } = useAuth();
  const { state: orgState } = useOrganization();
  const navigate = useNavigate();
  
  const [teamStandingsData, setTeamStandingsData] = useState<TournamentTeamStandings[]>([]);
  const [loadingTeamStandings, setLoadingTeamStandings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOrganization, setFilterOrganization] = useState<string>('all');
  const [showOrgFilter, setShowOrgFilter] = useState(false);
  const [view, setView] = useState<'tournaments' | 'organizations'>('tournaments');

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const response = await tournamentApi.getAll();
        
        if (response.data.success) {
          dispatch({ type: 'SET_TOURNAMENTS', payload: response.data.data });
        } else {
          throw new Error('Failed to fetch tournaments');
        }
      } catch (error: any) {
        console.error('Error fetching tournaments:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch tournaments' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    fetchTournaments();
  }, [dispatch]);

  // Fetch team standings for team-based tournaments
  useEffect(() => {
    const fetchTeamStandings = async () => {
      const teamTournaments = state.tournaments.filter(t => 
        t.format && (t.format === 'team-swiss' || t.format.includes('team'))
      );

      if (teamTournaments.length === 0) {
        setTeamStandingsData([]);
        return;
      }

      setLoadingTeamStandings(true);
      try {
        const standings = await Promise.all(
          teamTournaments.map(async (tournament) => {
            try {
              const response = await fetch(
                `/api/teams/tournament/${tournament.id}/standings?scoring_method=all_players&top_n=4`
              );
              
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.standings) {
                  return {
                    tournamentId: tournament.id,
                    tournamentName: tournament.name,
                    standings: data.standings.slice(0, 3)
                  };
                }
              }
            } catch (error) {
              console.error(`Error fetching team standings:`, error);
            }
            return null;
          })
        );

        setTeamStandingsData(standings.filter((s): s is TournamentTeamStandings => s !== null));
      } catch (error) {
        console.error('Error fetching team standings:', error);
      } finally {
        setLoadingTeamStandings(false);
      }
    };

    if (state.tournaments.length > 0) {
      fetchTeamStandings();
    }
  }, [state.tournaments]);

  // Filter logic
  const filteredTournaments = state.tournaments.filter(tournament => {
    const matchesSearch = !searchQuery || 
      tournament.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || tournament.status === filterStatus;
    
    const matchesOrganization = filterOrganization === 'all' || tournament.organization_id === filterOrganization;
    
    return matchesSearch && matchesStatus && matchesOrganization;
  });

  const activeTournaments = state.tournaments.filter(t => t.status === 'active');
  
  const getNotifications = (): any[] => {
    const allNotificationsList: any[] = [];
    state.tournaments.forEach(tournament => {
      const tournamentPlayers = state.players.filter(p => p.tournament_id === tournament.id);
      const warnings = tournamentPlayers
        .filter(player => player.expiration_date)
        .map(player => {
          const now = new Date();
          const expirationDate = new Date(player.expiration_date!);
          const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiration < 0) {
            return { type: 'expired' as const, player: player.name, message: `${player.name}'s USCF ID has expired` };
          } else if (daysUntilExpiration <= 30) {
            return { type: 'expiring' as const, player: player.name, message: `${player.name}'s USCF ID expires in ${daysUntilExpiration} days` };
          }
          return null;
        })
        .filter((warning): warning is { type: 'expired' | 'expiring'; player: string; message: string } => warning !== null);
      
      const tournamentNotifications = getAllTournamentNotifications(tournament, tournamentPlayers, warnings);
      allNotificationsList.push(...tournamentNotifications);
    });
    
    return allNotificationsList;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString();
  };

  const getOrganizationName = (orgId?: string) => {
    if (!orgId) return 'No Organization';
    const org = orgState.organizations.find(o => o.id === orgId);
    return org?.name || 'Unknown Organization';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 backdrop-blur-lg bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Welcome back, {user?.firstName || user?.username || 'User'}! 👋
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Manage your chess tournaments and organizations</p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {orgState.currentOrganization && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">
                    {orgState.currentOrganization.name}
                  </span>
                </div>
              )}
              <NotificationButton
                notifications={getNotifications()}
                onDismiss={() => {}}
                onMarkAsRead={() => {}}
                onViewPlayer={(name) => {
                  const tournament = state.tournaments.find(t => 
                    state.players.some(p => p.tournament_id === t.id && p.name === name)
                  );
                  if (tournament) window.location.href = `/tournaments/${tournament.id}`;
                }}
              />
              <Link
                to="/profile"
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-xl transition-all border border-gray-200 hover:border-gray-300 shadow-sm"
              >
                <User className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Profile</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{state.tournaments.length}</p>
                <p className="text-xs text-gray-500 mt-1">Tournaments</p>
              </div>
              <div className="p-4 bg-blue-100 rounded-xl">
                <Trophy className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{activeTournaments.length}</p>
                <p className="text-xs text-gray-500 mt-1">Running Now</p>
              </div>
              <div className="p-4 bg-green-100 rounded-xl">
                <Activity className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Players</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{state.players.length}</p>
                <p className="text-xs text-gray-500 mt-1">Total Registered</p>
              </div>
              <div className="p-4 bg-purple-100 rounded-xl">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {state.tournaments.filter(t => t.status === 'completed').length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Finished</p>
              </div>
              <div className="p-4 bg-orange-100 rounded-xl">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            to="/tournaments/new"
            className="group relative bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Plus className="h-6 w-6" />
                </div>
                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-2">Create Tournament</h3>
              <p className="text-blue-100">Start organizing your chess event</p>
            </div>
          </Link>

          <Link
            to="/public/organizations"
            className="group relative bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Building2 className="h-6 w-6" />
                </div>
                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-2">Find Organizations</h3>
              <p className="text-green-100">Discover chess groups near you</p>
            </div>
          </Link>

          <Link
            to="/tournaments"
            className="group relative bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Zap className="h-6 w-6" />
                </div>
                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-2">Browse All</h3>
              <p className="text-purple-100">View and manage tournaments</p>
            </div>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tournaments by name..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterStatus === 'active'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterStatus === 'completed'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Completed
              </button>
              {orgState.organizations.length > 0 && (
                <button
                  onClick={() => setShowOrgFilter(true)}
                  className="px-4 py-2 rounded-xl font-medium bg-purple-600 text-white hover:bg-purple-700 transition-all flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Organizations
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tournaments Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="h-6 w-6 text-blue-600" />
                Your Tournaments
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {filteredTournaments.length} tournament{filteredTournaments.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <Link
              to="/tournaments"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-2"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="p-6">
            {state.loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading tournaments...</p>
              </div>
            ) : filteredTournaments.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {searchQuery || filterStatus !== 'all' || filterOrganization !== 'all' 
                    ? 'No tournaments match your filters' 
                    : 'No tournaments yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || filterStatus !== 'all' || filterOrganization !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first tournament'
                  }
                </p>
                {searchQuery || filterStatus !== 'all' || filterOrganization !== 'all' ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStatus('all');
                      setFilterOrganization('all');
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-colors"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <Link
                    to="/tournaments/new"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition-colors"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Tournament
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTournaments.slice(0, 6).map((tournament) => (
                  <Link
                    key={tournament.id}
                    to={`/tournaments/${tournament.id}`}
                    className="group block p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex-1 text-lg">
                        {tournament.name}
                      </h3>
                      <span
                        className={`ml-3 px-3 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                          tournament.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : tournament.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {tournament.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        <span className="capitalize font-medium">{tournament.format}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{tournament.rounds} rounds</span>
                      </div>
                      {tournament.organization_id && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span className="truncate">{getOrganizationName(tournament.organization_id)}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex items-center text-blue-600 group-hover:text-blue-700 font-medium">
                      <span>View Details</span>
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Organizations Section */}
        {orgState.organizations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
            <div className="px-6 py-5 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="h-6 w-6 text-purple-600" />
                Your Organizations
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orgState.organizations.slice(0, 3).map((org) => (
                  <Link
                    key={org.id}
                    to={`/organizations/${org.id}/settings`}
                    className="group p-6 bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-purple-100 rounded-xl group-hover:scale-110 transition-transform">
                        <Building2 className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                          {org.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">{org.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        org.role === 'owner'
                          ? 'bg-purple-100 text-purple-800'
                          : org.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {org.role}
                      </span>
                      <ArrowRight className="h-5 w-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Organization Filter Modal */}
        {showOrgFilter && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
              <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Filter by Organization</h2>
                <button
                  onClick={() => setShowOrgFilter(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setFilterOrganization('all');
                      setShowOrgFilter(false);
                    }}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      filterOrganization === 'all'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Building2 className="h-6 w-6 text-blue-600" />
                      <div>
                        <div className="font-semibold text-gray-900">All Organizations</div>
                        <div className="text-sm text-gray-600">Show tournaments from all organizations</div>
                      </div>
                    </div>
                  </button>

                  {orgState.organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        setFilterOrganization(org.id);
                        setShowOrgFilter(false);
                      }}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        filterOrganization === org.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Building2 className="h-6 w-6 text-purple-600" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{org.name}</div>
                          <div className="text-sm text-gray-600">{org.description || 'No description'}</div>
                        </div>
                        {orgState.currentOrganization?.id === org.id && (
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
