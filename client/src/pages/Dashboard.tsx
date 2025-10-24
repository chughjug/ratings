import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Calendar, TrendingUp, Building2, User, Palette } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { tournamentApi } from '../services/api';
import NotificationButton from '../components/NotificationButton';
import { getAllTournamentNotifications } from '../utils/notificationUtils';
// import TestAPI from '../TestAPI'; // Hidden

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
  const [networkStatus, setNetworkStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [lastError, setLastError] = useState<string | null>(null);
  const [teamStandingsData, setTeamStandingsData] = useState<TournamentTeamStandings[]>([]);
  const [loadingTeamStandings, setLoadingTeamStandings] = useState(false);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        console.log('Dashboard: Fetching tournaments...');
        setNetworkStatus('checking');
        dispatch({ type: 'SET_LOADING', payload: true });
        const response = await tournamentApi.getAll();
        console.log('Dashboard: Tournaments response:', response);
        
        if (response.data.success) {
          console.log('Dashboard: Tournaments data:', response.data.data);
          dispatch({ type: 'SET_TOURNAMENTS', payload: response.data.data });
          setNetworkStatus('connected');
          setLastError(null);
        } else {
          throw new Error('Failed to fetch tournaments');
        }
      } catch (error: any) {
        console.error('Dashboard: Error fetching tournaments:', error);
        console.error('Dashboard: Error details:', error.response?.data || error.message);
        setNetworkStatus('error');
        setLastError(error.message || 'Network error');
        dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch tournaments' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    fetchTournaments();
  }, [dispatch]);

  // Fetch team standings for tournaments with team-based formats
  useEffect(() => {
    const fetchTeamStandings = async () => {
      const teamTournaments = state.tournaments.filter(t => 
        t.format && (t.format.includes('team') || t.format === 'individual-team-swiss')
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
                    standings: data.standings.slice(0, 3) // Show top 3 teams
                  };
                }
              }
            } catch (error) {
              console.error(`Error fetching team standings for tournament ${tournament.id}:`, error);
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

  const testNetworkConnection = async () => {
    setNetworkStatus('checking');
    setLastError(null);
    
    try {
      console.log('🧪 Testing network connection...');
      const response = await tournamentApi.getAll();
      if (response.data.success) {
        setNetworkStatus('connected');
        setLastError(null);
        console.log('✅ Network test successful');
      } else {
        setNetworkStatus('error');
        setLastError('API returned error: ' + response.data.error);
      }
    } catch (error: any) {
      setNetworkStatus('error');
      setLastError('Network test failed: ' + error.message);
      console.error('❌ Network test failed:', error);
    }
  };

  const activeTournaments = state.tournaments.filter(t => t.status === 'active');
  const recentTournaments = state.tournaments.slice(0, 5);

  // Get all notifications across all tournaments
  const getAllNotifications = () => {
    const allNotifications: any[] = [];
    
    state.tournaments.forEach(tournament => {
      // Get players for this tournament (this would need to be fetched)
      const tournamentPlayers = state.players.filter(p => p.tournament_id === tournament.id);
      
      // Generate expiration warnings for this tournament
      const warnings = tournamentPlayers
        .filter(player => player.expiration_date)
        .map(player => {
          const now = new Date();
          const expirationDate = new Date(player.expiration_date!);
          const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiration < 0) {
            return {
              type: 'expired' as const,
              player: player.name,
              message: `${player.name}'s USCF ID has expired`
            };
          } else if (daysUntilExpiration <= 30) {
            return {
              type: 'expiring' as const,
              player: player.name,
              message: `${player.name}'s USCF ID expires in ${daysUntilExpiration} days`
            };
          }
          return null;
        })
        .filter((warning): warning is { type: 'expired' | 'expiring'; player: string; message: string } => warning !== null);
      
      const notifications = getAllTournamentNotifications(tournament, tournamentPlayers, warnings);
      allNotifications.push(...notifications);
    });
    
    return allNotifications;
  };

  const allNotifications = getAllNotifications();

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.firstName || user?.username || 'User'}!
            </h1>
            <p className="text-gray-600 mt-2">Manage your chess tournaments and organizations</p>
          </div>
          <div className="flex items-center space-x-4">
            {orgState.currentOrganization && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {orgState.currentOrganization.name}
                </span>
              </div>
            )}
            <Link
              to="/profile"
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <User className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Profile</span>
            </Link>
          </div>
        </div>
        {/* Network Status - Hidden */}
        {/* <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {networkStatus === 'connected' && <div className="w-5 h-5 bg-green-500 rounded-full" />}
              {networkStatus === 'error' && <div className="w-5 h-5 bg-red-500 rounded-full" />}
              {networkStatus === 'checking' && <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
              <span className="font-medium">
                Network Status: 
                <span className={`ml-2 ${
                  networkStatus === 'connected' ? 'text-green-600' : 
                  networkStatus === 'error' ? 'text-red-600' : 'text-blue-600'
                }`}>
                  {networkStatus === 'connected' ? 'Connected' : 
                   networkStatus === 'error' ? 'Error' : 'Checking...'}
                </span>
              </span>
            </div>
            <button
              onClick={testNetworkConnection}
              disabled={networkStatus === 'checking'}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              Test Connection
            </button>
          </div>
          {lastError && (
            <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
              <strong>Error:</strong> {lastError}
            </div>
          )}
        </div> */}

        {/* Debug Info - Hidden */}
        {/* <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
          <p className="text-sm"><strong>Debug Info:</strong></p>
          <p className="text-sm">Loading: {state.loading ? 'Yes' : 'No'}</p>
          <p className="text-sm">Error: {state.error || 'None'}</p>
          <p className="text-sm">Tournaments count: {state.tournaments.length}</p>
        </div> */}
        {/* TestAPI - Hidden */}
        {/* <div className="mt-4">
          <TestAPI />
        </div> */}
      </div>

      {/* Notification Button */}
      {allNotifications.length > 0 && (
        <div className="mb-8 flex justify-end">
          <NotificationButton
            notifications={allNotifications}
            onDismiss={(notificationId) => {
              console.log('Dismissed notification:', notificationId);
            }}
            onMarkAsRead={(notificationId) => {
              console.log('Marked as read:', notificationId);
            }}
            onViewPlayer={(playerName) => {
              // Find the tournament with this player and navigate to it
              const tournamentWithPlayer = state.tournaments.find(tournament => {
                const tournamentPlayers = state.players.filter(p => p.tournament_id === tournament.id);
                return tournamentPlayers.some(p => p.name === playerName);
              });
              
              if (tournamentWithPlayer) {
                window.location.href = `/tournaments/${tournamentWithPlayer.id}`;
              }
            }}
          />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Trophy className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tournaments</p>
              <p className="text-2xl font-bold text-gray-900">{state.tournaments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Tournaments</p>
              <p className="text-2xl font-bold text-gray-900">{activeTournaments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Players</p>
              <p className="text-2xl font-bold text-gray-900">{state.players.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {state.tournaments.filter(t => t.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Organizations Section */}
      {orgState.organizations.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Your Organizations</h2>
            <Link
              to="/profile"
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              Manage Organizations
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgState.organizations.slice(0, 3).map((org) => (
              <div
                key={org.id}
                className={`p-4 border rounded-lg transition-colors ${
                  orgState.currentOrganization?.id === org.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{org.name}</h3>
                    <p className="text-sm text-gray-600">{org.description || 'No description'}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        org.role === 'owner'
                          ? 'bg-purple-100 text-purple-800'
                          : org.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {org.role}
                      </span>
                      {(org.role === 'owner' || org.role === 'admin') && (
                        <Link
                          to={`/organizations/${org.id}/settings`}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 rounded-full hover:bg-purple-100 transition-colors"
                        >
                          <Palette className="h-3 w-3 mr-1" />
                          Customize
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/tournaments/new"
            className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-chess-board hover:bg-chess-light transition-colors"
          >
            <Trophy className="h-8 w-8 text-gray-400 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Create Tournament</p>
              <p className="text-sm text-gray-600">Start a new chess tournament</p>
            </div>
          </Link>

          <Link
            to="/tournaments"
            className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-chess-board hover:bg-chess-light transition-colors"
          >
            <Users className="h-8 w-8 text-gray-400 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Manage Tournaments</p>
              <p className="text-sm text-gray-600">View and edit existing tournaments</p>
            </div>
          </Link>

          <Link
            to="/profile"
            className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-chess-board hover:bg-chess-light transition-colors"
          >
            <Building2 className="h-8 w-8 text-gray-400 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Manage Organizations</p>
              <p className="text-sm text-gray-600">Create and manage organizations</p>
            </div>
          </Link>

          {orgState.currentOrganization && (orgState.currentOrganization.role === 'owner' || orgState.currentOrganization.role === 'admin') && (
            <Link
              to={`/organizations/${orgState.currentOrganization.id}/settings`}
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <Palette className="h-8 w-8 text-purple-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Customize Organization</p>
                <p className="text-sm text-gray-600">Design your public page</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Team Standings Section */}
      {teamStandingsData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Trophy className="h-6 w-6 text-yellow-500 mr-2" />
              Team Standings
            </h2>
            <Link
              to="/tournaments"
              className="text-chess-board hover:text-chess-dark font-medium text-sm"
            >
              View all
            </Link>
          </div>

          {loadingTeamStandings ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chess-board mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading team standings...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {teamStandingsData.map((tourData) => (
                <div key={tourData.tournamentId} className="border-t pt-6 first:border-t-0 first:pt-0">
                  <Link
                    to={`/tournaments/${tourData.tournamentId}`}
                    className="text-lg font-semibold text-gray-900 hover:text-chess-board transition-colors"
                  >
                    {tourData.tournamentName}
                  </Link>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 font-semibold text-gray-700">Rank</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700">Team</th>
                          <th className="text-right py-2 px-2 font-semibold text-gray-700">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tourData.standings.map((team, index) => (
                          <tr key={team.team_id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-2">
                              <div className="flex items-center">
                                {index === 0 && <Trophy className="h-4 w-4 text-yellow-500 mr-2" />}
                                {index === 1 && <Trophy className="h-4 w-4 text-gray-400 mr-2" />}
                                {index === 2 && <Trophy className="h-4 w-4 text-amber-600 mr-2" />}
                                {index > 2 && <span className="text-gray-500 font-medium mr-2">{index + 1}</span>}
                              </div>
                            </td>
                            <td className="py-2 px-2 font-medium text-gray-900">{team.team_name}</td>
                            <td className="py-2 px-2 text-right font-semibold text-gray-900">
                              {typeof team.score === 'number' ? team.score.toFixed(1) : team.score}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Link
                    to={`/tournaments/${tourData.tournamentId}`}
                    className="inline-block mt-3 text-chess-board hover:text-chess-dark font-medium text-sm"
                  >
                    View full standings →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Tournaments */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Tournaments</h2>
          <Link
            to="/tournaments"
            className="text-chess-board hover:text-chess-dark font-medium"
          >
            View all
          </Link>
        </div>
        
        {state.loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chess-board mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading tournaments...</p>
          </div>
        ) : recentTournaments.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tournaments yet</p>
            <Link
              to="/tournaments/new"
              className="text-chess-board hover:text-chess-dark font-medium"
            >
              Create your first tournament
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{tournament.name}</h3>
                  <p className="text-sm text-gray-600">
                    {tournament.format} • {tournament.rounds} rounds • {tournament.status}
                  </p>
                </div>
                <Link
                  to={`/tournaments/${tournament.id}`}
                  className="text-chess-board hover:text-chess-dark font-medium"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
