import React, { useState, useEffect } from 'react';
import { Plus, Users, X, Edit2, Trash2 } from 'lucide-react';

interface Team {
  team_name: string;
  member_count: number;
}

interface TeamMember {
  player_id: string;
  player_name: string;
  rating: number;
  uscf_id?: string;
  fide_id?: string;
  team_name: string | null;
  total_points: number;
  games_played: number;
}

interface TeamManagementProps {
  tournamentId: string;
  isVisible: boolean;
  onClose: () => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ tournamentId, isVisible, onClose }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'teams' | 'members'>('teams');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible && tournamentId) {
      fetchTeams();
      fetchMembers();
    }
  }, [isVisible, tournamentId]);

  const fetchTeams = async () => {
    try {
      const response = await fetch(`/api/teams/tournament/${tournamentId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTeams(data.teams || []);
        }
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/teams/tournament/${tournamentId}/members`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMembers(data.members || []);
        }
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setLoading(true);
    try {
      // Teams are now just categories - no API call needed
      // Just clear the form and refresh the teams list
      setNewTeamName('');
      setShowCreateTeam(false);
      fetchTeams();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const assignPlayerToTeam = async (playerId: string, teamName: string) => {
    try {
      const response = await fetch(`/api/players/${playerId}/assign-team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ team_name: teamName }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          fetchMembers();
          fetchTeams();
        } else {
          setError(data.error || 'Failed to assign player to team');
        }
      } else {
        setError('Failed to assign player to team');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const removePlayerFromTeam = async (playerId: string) => {
    try {
      const response = await fetch(`/api/players/${playerId}/team`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          fetchMembers();
          fetchTeams();
        } else {
          setError(data.error || 'Failed to remove player from team');
        }
      } else {
        setError('Failed to remove player from team');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const groupMembersByTeam = () => {
    const grouped: { [teamName: string]: TeamMember[] } = {};
    const unassigned: TeamMember[] = [];

    members.forEach(member => {
      if (member.team_name && member.team_name.trim() !== '') {
        if (!grouped[member.team_name]) {
          grouped[member.team_name] = [];
        }
        grouped[member.team_name].push(member);
      } else {
        unassigned.push(member);
      }
    });

    return { grouped, unassigned };
  };

  if (!isVisible) return null;

  const { grouped, unassigned } = groupMembersByTeam();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('teams')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'teams'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Teams ({teams.length})
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'members'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Team Members ({members.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-red-600 hover:text-red-800 text-sm"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Teams Tab */}
          {activeTab === 'teams' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Teams</h3>
                <button
                  onClick={() => setShowCreateTeam(true)}
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
                {teams.map((team) => (
                  <div key={team.team_name} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{team.team_name}</h4>
                        <p className="text-sm text-gray-500">
                          {team.member_count} members
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Team Category
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h3>

              {/* Unassigned Players */}
              {unassigned.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3">Unassigned Players</h4>
                  <div className="space-y-2">
                    {unassigned.map((member) => (
                      <div key={member.player_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{member.player_name}</div>
                          <div className="text-sm text-gray-500">
                            Rating: {member.rating} • Points: {member.total_points.toFixed(1)} • Games: {member.games_played}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                assignPlayerToTeam(member.player_id, e.target.value);
                              }
                            }}
                            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Assign to team...</option>
                            {teams.map((team) => (
                              <option key={team.team_name} value={team.team_name}>
                                {team.team_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Groups */}
              {Object.keys(grouped).map((teamName) => {
                const teamMembers = grouped[teamName];
                
                return (
                  <div key={teamName} className="mb-6">
                    <h4 className="text-md font-medium text-gray-700 mb-3">
                      {teamName} ({teamMembers.length} members)
                    </h4>
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <div key={member.player_id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{member.player_name}</div>
                            <div className="text-sm text-gray-500">
                              Rating: {member.rating} • Points: {member.total_points.toFixed(1)} • Games: {member.games_played}
                            </div>
                          </div>
                          <button
                            onClick={() => removePlayerFromTeam(member.player_id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;
