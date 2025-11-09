import React, { useState, useEffect } from 'react';
import { X, Save, User, Search } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../services/api';
import PlayerSearchModal from './PlayerSearchModal';
import { getSectionOptions } from '../utils/sectionUtils';

const normalizeByeRounds = (value: unknown): number[] => {
  const rounds = new Set<number>();

  const addRound = (roundValue: number) => {
    if (!Number.isFinite(roundValue)) {
      return;
    }
    const round = Math.trunc(roundValue);
    if (round > 0) {
      rounds.add(round);
    }
  };

  const process = (input: unknown): void => {
    if (input === undefined || input === null) {
      return;
    }

    if (Array.isArray(input)) {
      input.forEach(process);
      return;
    }

    if (typeof input === 'number') {
      addRound(input);
      return;
    }

    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) {
        return;
      }

      try {
        const parsedJson = JSON.parse(trimmed);
        process(parsedJson);
        return;
      } catch {
        // Not JSON - fall through to pattern parsing
      }

      const matches = trimmed.match(/\d+/g);
      if (matches) {
        matches.forEach((numStr) => {
          const parsed = parseInt(numStr, 10);
          if (!Number.isNaN(parsed)) {
            addRound(parsed);
          }
        });
      }

      return;
    }
  };

  process(value);

  return Array.from(rounds).sort((a, b) => a - b);
};

const mergeByeRounds = (current: number[], incoming: number[]): number[] => {
  if (!Array.isArray(current) || current.length === 0) {
    return normalizeByeRounds(incoming);
  }

  const merged = new Set<number>(normalizeByeRounds(current));
  normalizeByeRounds(incoming).forEach((round) => merged.add(round));
  return Array.from(merged).sort((a, b) => a - b);
};

interface Player {
  id: string;
  name: string;
  uscf_id?: string;
  fide_id?: string;
  rating?: number;
  section?: string;
  team_name?: string;
  status: 'active' | 'withdrawn' | 'bye' | 'inactive';
  email?: string;
  phone?: string;
  notes?: string;
  expiration_date?: string;
  intentional_bye_rounds?: number[];
}

interface EditPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  tournamentId: string;
}

const EditPlayerModal: React.FC<EditPlayerModalProps> = ({ 
  isOpen, 
  onClose, 
  player, 
  tournamentId 
}) => {
  const { state, dispatch } = useTournament();
  const [loading, setLoading] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [byeInput, setByeInput] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    uscf_id: '',
    fide_id: '',
    rating: '',
    section: '',
    team_name: '',
    email: '',
    phone: '',
    notes: '',
    status: 'active' as 'active' | 'withdrawn' | 'bye' | 'inactive',
    intentional_bye_rounds: [] as number[]
  });
  const totalRounds = state.currentTournament?.rounds ?? 0;

  // Update form data when player changes
  useEffect(() => {
    if (player) {
      try {
        const safePlayer: any = player || {};
        const parsedByeRounds = normalizeByeRounds(
          safePlayer.intentional_bye_rounds ?? safePlayer.bye_rounds
        );
        setFormData({
          name: safePlayer.name || '',
          uscf_id: safePlayer.uscf_id || '',
          fide_id: safePlayer.fide_id || '',
          rating: safePlayer.rating ? String(safePlayer.rating) : '',
          section: safePlayer.section || '',
          team_name: safePlayer.team_name || '',
          email: safePlayer.email || '',
          phone: safePlayer.phone || '',
          notes: safePlayer.notes || '',
          status: safePlayer.status || 'active',
          intentional_bye_rounds: parsedByeRounds
        });
        setByeInput(parsedByeRounds.length > 0 ? parsedByeRounds.join(', ') : '');
      } catch (error) {
        console.error('Error updating form data:', error);
        // Reset form to safe defaults
        setFormData({
          name: player?.name || '',
          uscf_id: '',
          fide_id: '',
          rating: '',
          section: '',
          team_name: '',
          email: '',
          phone: '',
          notes: '',
          status: 'active',
          intentional_bye_rounds: []
        });
        setByeInput('');
      }
    } else {
      setByeInput('');
    }
  }, [player]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player) return;
    
    setLoading(true);

    try {
      const playerData: any = {
        name: formData.name,
        status: formData.status
      };

      // Only include fields that have values
      if (formData.uscf_id) playerData.uscf_id = formData.uscf_id;
      if (formData.fide_id) playerData.fide_id = formData.fide_id;
      if (formData.rating && formData.rating.trim() !== '') {
        const ratingNum = parseInt(formData.rating);
        if (!isNaN(ratingNum)) playerData.rating = ratingNum;
      }
      if (formData.section) playerData.section = formData.section;
      if (formData.team_name) playerData.team_name = formData.team_name;
      if (formData.email) playerData.email = formData.email;
      if (formData.phone) playerData.phone = formData.phone;
      if (formData.notes) playerData.notes = formData.notes;

      const normalizedByeRounds = normalizeByeRounds(formData.intentional_bye_rounds);
      playerData.intentional_bye_rounds = normalizedByeRounds;

      const response = await playerApi.update(player.id, playerData);
      if (response.data.success) {
        const updatedPlayer = response.data.data
          ? {
              ...player,
              ...response.data.data,
              intentional_bye_rounds: normalizeByeRounds(response.data.data.intentional_bye_rounds),
            }
          : player;
        dispatch({ type: 'UPDATE_PLAYER', payload: updatedPlayer });
        onClose();
      } else {
        throw new Error(response.data.error || 'Failed to update player');
      }
    } catch (error: any) {
      console.error('Failed to update player:', error);
      alert(`Failed to update player: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handlePlayerSelect = (selectedPlayer: any) => {
    setFormData(prev => ({
      ...prev,
      name: selectedPlayer.name || prev.name,
      uscf_id: selectedPlayer.uscf_id || prev.uscf_id,
      fide_id: selectedPlayer.fide_id || prev.fide_id,
      rating: selectedPlayer.rating?.toString() || prev.rating
    }));
    setShowSearchModal(false);
  };

  const handleToggleByeRound = (round: number) => {
    setFormData(prev => {
      if (prev.intentional_bye_rounds.includes(round)) {
        return {
          ...prev,
          intentional_bye_rounds: prev.intentional_bye_rounds.filter(r => r !== round),
        };
      }

      return {
        ...prev,
        intentional_bye_rounds: mergeByeRounds(prev.intentional_bye_rounds, [round]),
      };
    });
  };

  const handleRemoveByeRound = (round: number) => {
    setFormData(prev => ({
      ...prev,
      intentional_bye_rounds: prev.intentional_bye_rounds.filter(r => r !== round),
    }));
  };

  const handleByeInputSubmit = () => {
    if (!byeInput.trim()) {
      return;
    }
    const parsed = normalizeByeRounds(byeInput);
    if (parsed.length === 0) {
      setByeInput('');
      return;
    }
    setFormData(prev => ({
      ...prev,
      intentional_bye_rounds: mergeByeRounds(prev.intentional_bye_rounds, parsed),
    }));
    setByeInput('');
  };

  const handleByeInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleByeInputSubmit();
    }
  };

  const handleClearByeRounds = () => {
    setFormData(prev => ({
      ...prev,
      intentional_bye_rounds: [],
    }));
    setByeInput('');
  };

  const getAvailableSections = () => {
    if (!state.currentTournament || !state.players) return [];
    try {
      return getSectionOptions(state.currentTournament, state.players);
    } catch (error) {
      console.error('Error getting sections:', error);
      return [];
    }
  };

  // Early return if modal is closed or no player data
  if (!isOpen) return null;
  
  // If player data is not available yet, show loading state
  if (!player) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <p className="text-gray-600">Loading player data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <User className="h-6 w-6 text-chess-board" />
            <h2 className="text-xl font-semibold text-gray-900">Edit Player</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="Enter player name"
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
                  placeholder="Enter rating"
                  min="0"
                  max="3000"
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
                  placeholder="Enter USCF ID"
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
                  placeholder="Enter FIDE ID"
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
                  <option value="">Select Section</option>
                  {(() => {
                    try {
                      const sections = getAvailableSections();
                      return sections.map((section: string) => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ));
                    } catch (error) {
                      console.error('Error rendering section options:', error);
                      return <option value="">Error loading sections</option>;
                    }
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
                  placeholder="Enter team name"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="withdrawn">Withdrawn</option>
                  <option value="bye">Bye</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
          </div>

      {/* Bye Management */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Intentional Bye Rounds</h3>
        <p className="text-sm text-gray-600">
          Manage this player's requested byes. Toggle specific rounds or type them below.
        </p>

        {totalRounds > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: totalRounds }, (_, index) => {
              const round = index + 1;
              const isChecked = formData.intentional_bye_rounds.includes(round);
              return (
                <label
                  key={round}
                  className={`flex items-center space-x-2 border rounded px-3 py-2 text-sm cursor-pointer ${
                    isChecked ? 'border-chess-board bg-chess-board/5' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleByeRound(round)}
                    className="rounded border-gray-300 text-chess-board focus:ring-chess-board"
                  />
                  <span className="font-medium text-gray-700">Round {round}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Tournament rounds not available. Enter bye rounds manually below (e.g., <span className="font-mono">1,3,5</span>).
          </p>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-3 space-y-3 lg:space-y-0">
          <input
            type="text"
            value={byeInput}
            onChange={(e) => setByeInput(e.target.value)}
            onKeyDown={handleByeInputKeyDown}
            placeholder="Enter round numbers (e.g., 1,3,5)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
          />
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleByeInputSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Apply Rounds
            </button>
            <button
              type="button"
              onClick={handleClearByeRounds}
              disabled={formData.intentional_bye_rounds.length === 0 && !byeInput.trim()}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>
        </div>

        {formData.intentional_bye_rounds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.intentional_bye_rounds.map((round) => (
              <span
                key={round}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
              >
                Round {round}
                <button
                  type="button"
                  onClick={() => handleRemoveByeRound(round)}
                  className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                  aria-label={`Remove bye for round ${round}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Enter any additional notes"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-chess-board"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-chess-board rounded-md hover:bg-chess-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-chess-board disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Player Search Modal */}
      <PlayerSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectPlayer={handlePlayerSelect}
        tournamentId={tournamentId}
      />
    </div>
  );
};

export default EditPlayerModal;

