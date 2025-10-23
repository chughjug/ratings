import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Calendar } from 'lucide-react';
import { playerApi } from '../services/api';
import { PlayerInactiveRound } from '../types';

interface PlayerInactiveRoundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
  tournamentId: string;
  maxRounds: number;
}

const PlayerInactiveRoundsModal: React.FC<PlayerInactiveRoundsModalProps> = ({
  isOpen,
  onClose,
  playerId,
  playerName,
  tournamentId,
  maxRounds
}) => {
  const [inactiveRounds, setInactiveRounds] = useState<PlayerInactiveRound[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRound, setNewRound] = useState('');
  const [newReason, setNewReason] = useState('');

  const fetchInactiveRounds = useCallback(async () => {
    try {
      setLoading(true);
      const response = await playerApi.getInactiveRounds(playerId);
      if (response.data.success) {
        setInactiveRounds(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch inactive rounds:', error);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    if (isOpen && playerId) {
      fetchInactiveRounds();
    }
  }, [isOpen, playerId, fetchInactiveRounds]);

  const handleAddInactiveRound = async () => {
    const round = parseInt(newRound);
    if (isNaN(round) || round < 1 || round > maxRounds) {
      alert(`Please enter a valid round number between 1 and ${maxRounds}`);
      return;
    }

    if (inactiveRounds.some(ir => ir.round === round)) {
      alert('This round is already marked as inactive');
      return;
    }

    try {
      setLoading(true);
      const response = await playerApi.setInactiveRound(playerId, round, newReason || undefined);
      if (response.data.success) {
        await fetchInactiveRounds();
        setNewRound('');
        setNewReason('');
      } else {
        throw new Error(response.data.error || 'Failed to set inactive round');
      }
    } catch (error: any) {
      console.error('Failed to add inactive round:', error);
      alert(error.message || 'Failed to add inactive round');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveInactiveRound = async (round: number) => {
    try {
      setLoading(true);
      const response = await playerApi.removeInactiveRound(playerId, round);
      if (response.data.success) {
        await fetchInactiveRounds();
      } else {
        throw new Error(response.data.error || 'Failed to remove inactive round');
      }
    } catch (error: any) {
      console.error('Failed to remove inactive round:', error);
      alert(error.message || 'Failed to remove inactive round');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-chess-board" />
            <h2 className="text-xl font-semibold text-gray-900">
              Inactive Rounds - {playerName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Add new inactive round */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Add Inactive Round</h3>
            <div className="flex space-x-2">
              <input
                type="number"
                min="1"
                max={maxRounds}
                value={newRound}
                onChange={(e) => setNewRound(e.target.value)}
                placeholder={`Round (1-${maxRounds})`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
              />
              <button
                onClick={handleAddInactiveRound}
                disabled={loading || !newRound}
                className="flex items-center space-x-1 px-3 py-2 bg-chess-board text-white rounded-md hover:bg-chess-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                <span>Add</span>
              </button>
            </div>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
            />
          </div>

          {/* List of inactive rounds */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Current Inactive Rounds</h3>
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : inactiveRounds.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No inactive rounds</div>
            ) : (
              <div className="space-y-2">
                {inactiveRounds.map((inactiveRound) => (
                  <div
                    key={inactiveRound.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div>
                      <span className="font-medium">Round {inactiveRound.round}</span>
                      {inactiveRound.reason && (
                        <span className="text-sm text-gray-600 ml-2">
                          - {inactiveRound.reason}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveInactiveRound(inactiveRound.round)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerInactiveRoundsModal;
