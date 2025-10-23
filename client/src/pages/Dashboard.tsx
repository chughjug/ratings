import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Calendar, TrendingUp, Building2, User, Plus, Palette } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { tournamentApi } from '../services/api';
// import TestAPI from '../TestAPI'; // Hidden

const Dashboard: React.FC = () => {
  const { state, dispatch } = useTournament();
  const { user } = useAuth();
  const { state: orgState } = useOrganization();
  const [networkStatus, setNetworkStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [lastError, setLastError] = useState<string | null>(null);

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
              {networkStatus === 'connected' && <Wifi className="w-5 h-5 text-green-500" />}
              {networkStatus === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
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
