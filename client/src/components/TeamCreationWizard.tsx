import React, { useState, useEffect } from 'react';
import { X, Save, Users, Plus, Trash2, ArrowRight, ArrowLeft, UserPlus } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../services/api';

interface TeamCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
}

interface TeamMember {
  playerId: string;
  name: string;
  rating: number;
}

interface TeamData {
  name: string;
  members: TeamMember[];
}

const TeamCreationWizard: React.FC<TeamCreationWizardProps> = ({ isOpen, onClose, tournamentId }) => {
  const { state, dispatch } = useTournament();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [teamData, setTeamData] = useState<TeamData>({
    name: '',
    members: []
  });
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());

  const steps = [
    { number: 1, title: 'Team Name', description: 'Enter team name' },
    { number: 2, title: 'Select Players', description: 'Choose players for your team' },
    { number: 3, title: 'Review & Create', description: 'Review team details and create' }
  ];

  useEffect(() => {
    if (isOpen) {
      loadAvailablePlayers();
    }
  }, [isOpen, state.players]);

  const loadAvailablePlayers = () => {
    // Get players who are not already on teams
    const available = state.players.filter(player => 
      player.status === 'active' && (!player.team_name || player.team_name === '')
    );
    setAvailablePlayers(available);
  };

  const handleTeamDataChange = (field: keyof TeamData, value: any) => {
    setTeamData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePlayerSelect = (playerId: string, selected: boolean) => {
    if (selected) {
      setSelectedPlayers(prev => new Set(Array.from(prev).concat(playerId)));
    } else {
      setSelectedPlayers(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });
    }
  };

  const assignPlayersToTeam = () => {
    const selectedPlayerData = availablePlayers.filter(p => selectedPlayers.has(p.id));
    const members: TeamMember[] = selectedPlayerData.map((player) => ({
      playerId: player.id,
      name: player.name,
      rating: player.rating || 0
    }));

    setTeamData(prev => ({
      ...prev,
      members
    }));
  };

  const removeMember = (playerId: string) => {
    setTeamData(prev => ({
      ...prev,
      members: prev.members.filter(member => member.playerId !== playerId)
    }));
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      newSet.delete(playerId);
      return newSet;
    });
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Update players with team name
      for (const member of teamData.members) {
        await playerApi.update(member.playerId, { team_name: teamData.name });
      }

      // Refresh the player data to get updated team assignments
      const playersResponse = await playerApi.getByTournament(tournamentId);
      if (playersResponse.data.success) {
        dispatch({ type: 'SET_PLAYERS', payload: playersResponse.data.data });
      }

      // Clear cache to ensure fresh data
      dispatch({ type: 'CLEAR_CACHE' });

      onClose();
    } catch (error: any) {
      console.error('Failed to create team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setTeamData({
      name: '',
      members: []
    });
    setSelectedPlayers(new Set());
    onClose();
  };

  const createAnotherTeam = () => {
    setCurrentStep(1);
    setTeamData({
      name: '',
      members: []
    });
    setSelectedPlayers(new Set());
    // Refresh available players after team creation
    loadAvailablePlayers();
  };

  const nextStep = () => {
    if (currentStep === 2) {
      assignPlayersToTeam();
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-chess-board" />
            <h2 className="text-xl font-semibold text-gray-900">Create Team</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep >= step.number
                    ? 'bg-chess-board text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.number}
                </div>
                <div className="ml-3">
                  <div className={`text-sm font-medium ${
                    currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    currentStep > step.number ? 'bg-chess-board' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: Team Name */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={teamData.name}
                  onChange={(e) => handleTeamDataChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                  placeholder="Enter team name"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  Players will be assigned to this team by setting their team category.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Select Players */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Select Players ({selectedPlayers.size})
                </h3>
                <div className="text-sm text-gray-500">
                  {availablePlayers.length} available players
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {availablePlayers.map(player => (
                  <div
                    key={player.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPlayers.has(player.id)
                        ? 'border-chess-board bg-chess-board bg-opacity-10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePlayerSelect(player.id, !selectedPlayers.has(player.id))}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{player.name}</div>
                        <div className="text-sm text-gray-500">
                          {player.rating ? `Rating: ${player.rating}` : 'Unrated'}
                          {player.uscf_id && ` • USCF: ${player.uscf_id}`}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedPlayers.has(player.id)
                          ? 'border-chess-board bg-chess-board'
                          : 'border-gray-300'
                      }`}>
                        {selectedPlayers.has(player.id) && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {availablePlayers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No available players found. Add players to the tournament first.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review & Create */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Review Team Details</h3>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Team Name</div>
                    <div className="text-lg text-gray-900">{teamData.name}</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-600 mb-3">Team Members</div>
                <div className="space-y-2">
                  {teamData.members
                    .sort((a, b) => b.rating - a.rating) // Sort by rating instead of board number
                    .map(member => (
                    <div key={member.playerId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="font-medium text-gray-900">{member.name}</div>
                          <div className="text-sm text-gray-500">
                            {member.rating ? `Rating: ${member.rating}` : 'Unrated'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {currentStep < steps.length ? (
                <button
                  onClick={nextStep}
                  disabled={
                    (currentStep === 1 && !teamData.name) ||
                    (currentStep === 2 && selectedPlayers.size === 0)
                  }
                  className="flex items-center space-x-2 bg-chess-board text-white px-4 py-2 rounded-md hover:bg-chess-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading || teamData.members.length === 0}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Creating...' : 'Create Team'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamCreationWizard;
