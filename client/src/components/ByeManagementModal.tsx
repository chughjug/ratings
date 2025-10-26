import React, { useState, useEffect } from 'react';
import { X, Save, Check, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../services/api';

interface ByeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
}

const ByeManagementModal: React.FC<ByeManagementModalProps> = ({
  isOpen,
  onClose,
  tournamentId
}) => {
  const { state, dispatch } = useTournament();
  const [loading, setLoading] = useState(false);
  const [playerByeRounds, setPlayerByeRounds] = useState<Map<string, number[]>>(new Map());
  const [changedPlayers, setChangedPlayers] = useState<Set<string>>(new Set());

  // Initialize player bye rounds when modal opens
  useEffect(() => {
    if (isOpen && state.players) {
      const initialMap = new Map<string, number[]>();
      state.players.forEach(player => {
        // Handle both string and array formats for intentional_bye_rounds
        let byeRounds: number[] = [];
        if (player.intentional_bye_rounds) {
          // Check if it's already an array
          if (Array.isArray(player.intentional_bye_rounds)) {
            byeRounds = player.intentional_bye_rounds;
          } else if (typeof player.intentional_bye_rounds === 'string') {
            // Try to parse as JSON first
            try {
              byeRounds = JSON.parse(player.intentional_bye_rounds);
            } catch {
              // If not JSON, try comma-separated
              byeRounds = (player.intentional_bye_rounds as unknown as string)
                .split(',')
                .map(r => parseInt(r.trim()))
                .filter(r => !isNaN(r));
            }
          }
        }
        initialMap.set(player.id, byeRounds);
      });
      setPlayerByeRounds(initialMap);
      setChangedPlayers(new Set());
    }
  }, [isOpen, state.players]);

  const addByeRound = (playerId: string, round: number) => {
    const currentRounds = playerByeRounds.get(playerId) || [];
    if (!currentRounds.includes(round)) {
      const newRounds = [...currentRounds, round].sort((a, b) => a - b);
      setPlayerByeRounds(new Map(playerByeRounds.set(playerId, newRounds)));
      setChangedPlayers(new Set(changedPlayers).add(playerId));
    }
  };

  const removeByeRound = (playerId: string, round: number) => {
    const currentRounds = playerByeRounds.get(playerId) || [];
    const newRounds = currentRounds.filter(r => r !== round);
    setPlayerByeRounds(new Map(playerByeRounds.set(playerId, newRounds)));
    setChangedPlayers(new Set(changedPlayers).add(playerId));
  };

  const quickAddBye = (playerId: string) => {
    const tournament = state.currentTournament;
    if (!tournament) return;

    const totalRounds = tournament.rounds;
    const currentRounds = playerByeRounds.get(playerId) || [];
    
    // Find the first round that doesn't have a bye yet
    for (let i = 1; i <= totalRounds; i++) {
      if (!currentRounds.includes(i)) {
        addByeRound(playerId, i);
        break;
      }
    }
  };

  const clearAllByes = (playerId: string) => {
    setPlayerByeRounds(new Map(playerByeRounds.set(playerId, [])));
    setChangedPlayers(new Set(changedPlayers).add(playerId));
  };

  const handleSave = async () => {
    if (changedPlayers.size === 0) {
      onClose();
      return;
    }

    setLoading(true);

    try {
      const updatePromises = Array.from(changedPlayers).map(async (playerId) => {
        const byeRounds = playerByeRounds.get(playerId) || [];
        const player = state.players?.find(p => p.id === playerId);
        
        if (!player) return;

        const playerData = {
          name: player.name,
          uscf_id: player.uscf_id,
          fide_id: player.fide_id,
          rating: player.rating,
          section: player.section,
          status: player.status,
          intentional_bye_rounds: byeRounds.length > 0 ? byeRounds : undefined
        };

        const response = await playerApi.update(playerId, playerData);
        if (response.data.success) {
          dispatch({ type: 'UPDATE_PLAYER', payload: response.data.data });
        } else {
          throw new Error(response.data.error || 'Failed to update player');
        }
      });

      await Promise.all(updatePromises);
      
      alert(`Successfully updated byes for ${changedPlayers.size} player(s)`);
      onClose();
    } catch (error: any) {
      console.error('Failed to save byes:', error);
      alert(`Failed to save byes: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const tournament = state.currentTournament;
  const totalRounds = tournament?.rounds || 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            <h2 className="text-xl font-semibold text-gray-900">Manage Player Byes</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Instructions:</strong> Add bye rounds for players who will not be playing in specific rounds. 
              Byes are automatically assigned during pairing if a player has a bye scheduled for a round.
            </p>
          </div>

          {/* Player list */}
          <div className="space-y-3">
            {state.players
              ?.filter(player => player.status === 'active')
              .map(player => {
                const byeRounds = playerByeRounds.get(player.id) || [];
                const isChanged = changedPlayers.has(player.id);
                const hasExistingByes = byeRounds.length > 0;
                
                return (
                  <div 
                    key={player.id} 
                    className={`p-4 border rounded-lg ${isChanged ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">{player.name}</span>
                          {player.rating && (
                            <span className="text-sm text-gray-500">({player.rating})</span>
                          )}
                          {player.section && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {player.section}
                            </span>
                          )}
                          {isChanged && (
                            <span className="text-xs px-2 py-1 bg-yellow-200 text-yellow-800 rounded">
                              Modified
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => quickAddBye(player.id)}
                          className="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                          title="Add a bye for the next available round"
                        >
                          <Plus className="h-4 w-4 inline mr-1" />
                          Quick Add
                        </button>
                        {hasExistingByes && (
                          <button
                            onClick={() => clearAllByes(player.id)}
                            className="px-3 py-1 text-sm text-red-700 bg-white border border-red-300 rounded hover:bg-red-50 transition-colors"
                            title="Clear all byes for this player"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Current byes */}
                    {hasExistingByes && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-600 mb-2">Current Byes:</p>
                        <div className="flex flex-wrap gap-2">
                          {byeRounds.map(round => (
                            <button
                              key={round}
                              onClick={() => removeByeRound(player.id, round)}
                              className="inline-flex items-center space-x-1 px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-sm hover:bg-yellow-300 transition-colors"
                            >
                              <span>Round {round}</span>
                              <X className="h-3 w-3" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add byes section */}
                    {!hasExistingByes && (
                      <p className="text-sm text-gray-500 mb-2">No byes scheduled</p>
                    )}
                    
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-2">Available Rounds to Add Bye:</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: totalRounds }, (_, i) => i + 1).map(round => (
                          <button
                            key={round}
                            onClick={() => !byeRounds.includes(round) && addByeRound(player.id, round)}
                            disabled={byeRounds.includes(round)}
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                              byeRounds.includes(round)
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {byeRounds.includes(round) ? (
                              <span className="flex items-center">
                                <Check className="h-3 w-3 inline mr-1" />
                                Round {round}
                              </span>
                            ) : (
                              `Round ${round}`
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-chess-board disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || changedPlayers.size === 0}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Saving...' : `Save Changes (${changedPlayers.size})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ByeManagementModal;

