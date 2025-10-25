import React, { useState } from 'react';
import { X, Save, User, Search } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../services/api';
import PlayerSearchModal from './PlayerSearchModal';
import { getSectionOptions } from '../utils/sectionUtils';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
}

const AddPlayerModal: React.FC<AddPlayerModalProps> = ({ isOpen, onClose, tournamentId }) => {
  const { state, dispatch } = useTournament();
  const [loading, setLoading] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    uscf_id: '',
    fide_id: '',
    lichess_username: '',
    rating: '',
    section: '',
    team_name: '',
    intentional_bye_rounds: [] as number[]
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rating' ? (value ? parseInt(value) : '') : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const playerData = {
        tournament_id: tournamentId,
        name: formData.name,
        uscf_id: formData.uscf_id || undefined,
        fide_id: formData.fide_id || undefined,
        lichess_username: formData.lichess_username || undefined,
        rating: formData.rating ? parseInt(formData.rating) : undefined,
        section: formData.section || undefined,
        team_name: formData.team_name || undefined,
        status: 'active' as 'active' | 'withdrawn' | 'bye' | 'inactive', // Always default to active
        intentional_bye_rounds: formData.intentional_bye_rounds.length > 0 ? formData.intentional_bye_rounds : undefined
      };

      const response = await playerApi.create(playerData);
      if (response.data.success) {
        dispatch({ type: 'ADD_PLAYER', payload: response.data.data });
      } else {
        throw new Error(response.data.error || 'Failed to add player');
      }
      
      // Reset form
      setFormData({
        name: '',
        uscf_id: '',
        fide_id: '',
        lichess_username: '',
        rating: '',
        section: '',
        team_name: '',
        intentional_bye_rounds: []
      });
      
      onClose();
    } catch (error: any) {
      console.error('Failed to add player:', error);
      // You could add a toast notification here to show the error to the user
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      name: '',
      uscf_id: '',
      fide_id: '',
      lichess_username: '',
      rating: '',
      section: '',
      team_name: '',
      intentional_bye_rounds: []
    });
    setShowSearchModal(false);
    onClose();
  };

  const handlePlayerSearch = (player: any) => {
    setFormData(prev => ({
      ...prev,
      name: player.name,
      uscf_id: player.uscf_id,
      rating: player.rating ? player.rating.toString() : ''
    }));
    setShowSearchModal(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <User className="h-6 w-6 text-chess-board" />
            <h2 className="text-xl font-semibold text-gray-900">Add Player</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Player Name *
              </label>
              <button
                type="button"
                onClick={() => setShowSearchModal(true)}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Search className="h-4 w-4" />
                <span>Search US Chess</span>
              </button>
            </div>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
              placeholder="Enter player name or search US Chess"
            />
          </div>

          <div>
            <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-2">
              Rating
            </label>
            <input
              type="number"
              id="rating"
              name="rating"
              value={formData.rating}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
              placeholder="Enter rating (optional)"
            />
          </div>

          <div>
            <label htmlFor="uscf_id" className="block text-sm font-medium text-gray-700 mb-2">
              USCF ID
            </label>
            <input
              type="text"
              id="uscf_id"
              name="uscf_id"
              value={formData.uscf_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
              placeholder="Enter USCF ID (optional)"
            />
          </div>

          <div>
            <label htmlFor="fide_id" className="block text-sm font-medium text-gray-700 mb-2">
              FIDE ID
            </label>
            <input
              type="text"
              id="fide_id"
              name="fide_id"
              value={formData.fide_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
              placeholder="Enter FIDE ID (optional)"
            />
          </div>

          <div>
            <label htmlFor="lichess_username" className="block text-sm font-medium text-gray-700 mb-2">
              Lichess Username
            </label>
            <input
              type="text"
              id="lichess_username"
              name="lichess_username"
              value={formData.lichess_username}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
              placeholder="Enter Lichess username (e.g., magnuscarlsen)"
            />
          </div>

          <div>
            <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-2">
              Section
            </label>
            <select
              id="section"
              name="section"
              value={formData.section}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
            >
              <option value="">Select a section (optional)</option>
              {(() => {
                const tournament = state.tournaments.find((t: any) => t.id === tournamentId);
                if (!tournament) return null;
                return getSectionOptions(tournament, state.players).map(section => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ));
              })()}
            </select>
          </div>

          <div>
            <label htmlFor="team_name" className="block text-sm font-medium text-gray-700 mb-2">
              Team Name
            </label>
            <input
              type="text"
              id="team_name"
              name="team_name"
              value={formData.team_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
              placeholder="Enter team name (optional)"
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intentional Bye Rounds
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Enter round numbers (e.g., 1,3,5)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const rounds = input.value.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r));
                      if (rounds.length > 0) {
                        setFormData(prev => ({
                          ...prev,
                          intentional_bye_rounds: Array.from(new Set([...prev.intentional_bye_rounds, ...rounds])).sort((a, b) => a - b)
                        }));
                        input.value = '';
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder*="round numbers"]') as HTMLInputElement;
                    if (input) {
                      const rounds = input.value.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r));
                      if (rounds.length > 0) {
                        setFormData(prev => ({
                          ...prev,
                          intentional_bye_rounds: Array.from(new Set([...prev.intentional_bye_rounds, ...rounds])).sort((a, b) => a - b)
                        }));
                        input.value = '';
                      }
                    }
                  }}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Add
                </button>
              </div>
              {formData.intentional_bye_rounds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.intentional_bye_rounds.map((round, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                    >
                      Round {round}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            intentional_bye_rounds: prev.intentional_bye_rounds.filter((_, i) => i !== index)
                          }));
                        }}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 bg-chess-board text-white px-4 py-2 rounded-md hover:bg-chess-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Adding...' : 'Add Player'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Player Search Modal */}
      <PlayerSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectPlayer={handlePlayerSearch}
        tournamentId={tournamentId}
      />
    </div>
  );
};

export default AddPlayerModal;
