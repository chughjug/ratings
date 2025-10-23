import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trophy, Calendar, Clock, MoreVertical, Building2, Filter, X } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { tournamentApi } from '../services/api';

const TournamentList: React.FC = () => {
  const { state, dispatch } = useTournament();
  const { state: orgState } = useOrganization();
  const [showOrgFilter, setShowOrgFilter] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        console.log('Fetching tournaments...');
        dispatch({ type: 'SET_LOADING', payload: true });
        const response = await tournamentApi.getAll();
        console.log('Tournaments response:', response);
        
        if (response.data.success) {
          console.log('Tournaments data:', response.data.data);
          dispatch({ type: 'SET_TOURNAMENTS', payload: response.data.data });
        } else {
          throw new Error('Failed to fetch tournaments');
        }
      } catch (error: any) {
        console.error('Error fetching tournaments:', error);
        console.error('Error details:', error.response?.data || error.message);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch tournaments' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    fetchTournaments();
  }, [dispatch]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString();
  };

  // Filter tournaments by organization
  const filteredTournaments = selectedOrgId 
    ? state.tournaments.filter(t => t.organization_id === selectedOrgId)
    : state.tournaments;

  // Get organization name by ID
  const getOrganizationName = (orgId?: string) => {
    if (!orgId) return 'No Organization';
    const org = orgState.organizations.find(o => o.id === orgId);
    return org?.name || 'Unknown Organization';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tournaments</h1>
          <p className="text-gray-600 mt-2">
            {selectedOrgId 
              ? `Tournaments for ${getOrganizationName(selectedOrgId)}` 
              : 'Manage all your chess tournaments'
            }
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowOrgFilter(true)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filter by Organization</span>
          </button>
          <Link
            to="/tournaments/new"
            className="flex items-center space-x-2 bg-chess-board text-white px-4 py-2 rounded-lg hover:bg-chess-dark transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>New Tournament</span>
          </Link>
        </div>
      </div>

      {state.loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-chess-board mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tournaments...</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedOrgId ? 'No tournaments for this organization' : 'No tournaments yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {selectedOrgId 
              ? 'This organization doesn\'t have any tournaments yet' 
              : 'Get started by creating your first tournament'
            }
          </p>
          <Link
            to="/tournaments/new"
            className="inline-flex items-center space-x-2 bg-chess-board text-white px-6 py-3 rounded-lg hover:bg-chess-dark transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Create Tournament</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {tournament.name}
                    </h3>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        tournament.status
                      )}`}
                    >
                      {tournament.status ? tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1) : 'Unknown'}
                    </span>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="h-4 w-4 mr-2" />
                    <span>{getOrganizationName(tournament.organization_id)}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Trophy className="h-4 w-4 mr-2" />
                    <span className="capitalize">{tournament.format.replace('-', ' ')}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{tournament.rounds} rounds</span>
                  </div>

                  {tournament.time_control && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{tournament.time_control}</span>
                    </div>
                  )}

                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>
                      {formatDate(tournament.start_date)} - {formatDate(tournament.end_date)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <Link
                    to={`/tournaments/${tournament.id}`}
                    className="block w-full text-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Organization Filter Modal */}
      {showOrgFilter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Filter by Organization</h2>
              <button
                onClick={() => setShowOrgFilter(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setSelectedOrgId(null);
                  setShowOrgFilter(false);
                }}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedOrgId === null
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Building2 className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">All Organizations</div>
                    <div className="text-sm text-gray-600">Show tournaments from all organizations</div>
                  </div>
                </div>
              </button>

              {orgState.organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setSelectedOrgId(org.id);
                    setShowOrgFilter(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedOrgId === org.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">{org.name}</div>
                      <div className="text-sm text-gray-600">{org.description || 'No description'}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowOrgFilter(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentList;
