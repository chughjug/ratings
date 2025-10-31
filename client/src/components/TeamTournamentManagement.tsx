import React, { useState, useEffect } from 'react';
import { Plus, Users, X, Edit2, Trash2, UserPlus, Save, AlertCircle } from 'lucide-react';
import { Team, TeamMember, Player } from '../types';
import { playerApi } from '../services/api';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

interface TeamTournamentManagementProps {
  tournamentId: string;
  isVisible: boolean;
  onClose: () => void;
  players: Player[];
  onTeamsUpdated?: () => void;
}

interface TeamWithMembers extends Team {
  members: TeamMember[];
  member_count: number;
}

const TeamTournamentManagement: React.FC<TeamTournamentManagementProps> = ({ 
  tournamentId, 
  isVisible, 
  onClose,
  players,
  onTeamsUpdated 
}) => {
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [selectedPlayerToAdd, setSelectedPlayerToAdd] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible && tournamentId) {
      fetchTeams();
    }
  }, [isVisible, tournamentId]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/teams/team-tournament/${tournamentId}`);
      if (response.data.success) {
        setTeams(response.data.teams || []);
      } else {
        setError(response.data.error || 'Failed to fetch teams');
      }
    } catch (err: any) {
      console.error('Error fetching teams:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/teams/team-tournament/${tournamentId}/create`, {
        name: newTeamName.trim()
      });

      if (response.data.success) {
        setNewTeamName('');
        setShowCreateTeam(false);
        await fetchTeams();
        if (onTeamsUpdated) onTeamsUpdated();
      } else {
        setError(response.data.error || 'Failed to create team');
      }
    } catch (err: any) {
      console.error('Error creating team:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const updateTeam = async (teamId: string, name: string) => {
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(`${API_BASE_URL}/teams/team-tournament/${teamId}`, {
        name: name.trim()
      });

      if (response.data.success) {
        setEditingTeamId(null);
        setEditingTeamName('');
        await fetchTeams();
        if (onTeamsUpdated) onTeamsUpdated();
      } else {
        setError(response.data.error || 'Failed to update team');
      }
    } catch (err: any) {
      console.error('Error updating team:', err);
      setError(err.response?.data?.error || err.message || 'Failed to update team');
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!window.confirm('Are you sure you want to delete this team? All team members will be removed.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.delete(`${API_BASE_URL}/teams/team-tournament/${teamId}`);

      if (response.data.success) {
        await fetchTeams();
        if (onTeamsUpdated) onTeamsUpdated();
      } else {
        setError(response.data.error || 'Failed to delete team');
      }
    } catch (err: any) {
      console.error('Error deleting team:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete team');
    } finally {
      setLoading(false);
    }
  };

  const addPlayerToTeam = async (teamId: string, playerId: string, boardNumber?: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/teams/team-tournament/${teamId}/add-player`, {
        player_id: playerId,
        board_number: boardNumber || null
      });

      if (response.data.success) {
        await fetchTeams();
        setShowAddPlayerModal(false);
        setSelectedPlayerToAdd(null);
        if (onTeamsUpdated) onTeamsUpdated();
      } else {
        setError(response.data.error || 'Failed to add player to team');
      }
    } catch (err: any) {
      console.error('Error adding player to team:', err);
      setError(err.response?.data?.error || err.message || 'Failed to add player to team');
    } finally {
      setLoading(false);
    }
  };

  const removePlayerFromTeam = async (teamId: string, playerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.delete(`${API_BASE_URL}/teams/team-tournament/${teamId}/remove-player/${playerId}`);

      if (response.data.success) {
        await fetchTeams();
        if (onTeamsUpdated) onTeamsUpdated();
      } else {
        setError(response.data.error || 'Failed to remove player from team');
      }
    } catch (err: any) {
      console.error('Error removing player from team:', err);
      setError(err.response?.data?.error || err.message || 'Failed to remove player from team');
    } finally {
      setLoading(false);
    }
  };

  // Get players not in any team
  const getUnassignedPlayers = () => {
    const teamPlayerIds = new Set<string>();
    teams.forEach(team => {
      team.members?.forEach(member => {
        teamPlayerIds.add(member.player_id);
      });
    });
    return players.filter(p => !teamPlayerIds.has(p.id));
  };

  const unassignedPlayers = getUnassignedPlayers();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Team Tournament Management</h2>
              <p className="text-sm text-gray-500 mt-1">Manage teams and assign players to teams</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Create Team Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Teams ({teams.length})</h3>
              <button
                onClick={() => {
                  setShowCreateTeam(true);
                  setNewTeamName('');
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </button>
            </div>

            {/* Create Team Form */}
            {showCreateTeam && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <form onSubmit={createTeam} className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Team name"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateTeam(false);
                      setNewTeamName('');
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}

            {/* Teams List */}
            <div className="space-y-4">
              {loading && teams.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Loading teams...</div>
              ) : teams.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No teams yet. Create your first team to get started.
                </div>
              ) : (
                teams.map((team) => (
                  <div key={team.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        {editingTeamId === team.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editingTeamName}
                              onChange={(e) => setEditingTeamName(e.target.value)}
                              className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            <button
                              onClick={() => updateTeam(team.id, editingTeamName)}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingTeamId(null);
                                setEditingTeamName('');
                              }}
                              className="p-1 text-gray-600 hover:text-gray-800"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{team.name}</h4>
                            <p className="text-sm text-gray-500">
                              {team.member_count || 0} {team.member_count === 1 ? 'member' : 'members'}
                            </p>
                          </div>
                        )}
                      </div>
                      {editingTeamId !== team.id && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingTeamId(team.id);
                              setEditingTeamName(team.name);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit team name"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTeam(team.id);
                              setShowAddPlayerModal(true);
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Add player to team"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTeam(team.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete team"
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Team Members */}
                    <div className="mt-3 space-y-2">
                      {team.members && team.members.length > 0 ? (
                        team.members
                          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                          .map((member, index) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-2 bg-blue-50 rounded"
                            >
                              <div className="flex items-center space-x-3">
                                <span className="text-xs font-medium text-gray-500 w-8">
                                  #{index + 1}
                                </span>
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">
                                    {member.name || member.playerName || 'Unknown Player'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Rating: {member.rating || 'Unrated'}
                                    {member.board_number && ` • Board: ${member.board_number}`}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => removePlayerFromTeam(team.id, member.player_id)}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Remove from team"
                                disabled={loading}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                      ) : (
                        <div className="text-sm text-gray-400 italic">No members yet</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Unassigned Players */}
          {unassignedPlayers.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Unassigned Players ({unassignedPlayers.length})
              </h3>
              <div className="space-y-2">
                {unassignedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{player.name}</div>
                      <div className="text-sm text-gray-500">
                        Rating: {player.rating || 'Unrated'}
                        {player.uscf_id && ` • USCF: ${player.uscf_id}`}
                      </div>
                    </div>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addPlayerToTeam(e.target.value, player.id);
                        }
                      }}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="">Assign to team...</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamTournamentManagement;

