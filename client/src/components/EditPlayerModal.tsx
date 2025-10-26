import React, { useState, useEffect } from 'react';
import { X, Save, User, Search } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../services/api';
import PlayerSearchModal from './PlayerSearchModal';
import { getSectionOptions } from '../utils/sectionUtils';

interface Player {
  id: string;
  name: string;
  uscf_id?: string;
  fide_id?: string;
  rating?: number;
  section?: string;
  team_name?: string;
  status: 'active' | 'withdrawn' | 'bye' | 'inactive';
  school?: string;
  grade?: string;
  email?: string;
  phone?: string;
  state?: string;
  city?: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  tshirt_size?: string;
  dietary_restrictions?: string;
  special_needs?: string;
  notes?: string;
  expiration_date?: string;
  intentional_bye_rounds?: number[];
  lichess_username?: string;
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
  const [formData, setFormData] = useState({
    name: '',
    uscf_id: '',
    fide_id: '',
    rating: '',
    section: '',
    team_name: '',
    school: '',
    grade: '',
    email: '',
    phone: '',
    state: '',
    city: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    emergency_contact: '',
    emergency_phone: '',
    tshirt_size: '',
    dietary_restrictions: '',
    special_needs: '',
    notes: '',
    status: 'active' as 'active' | 'withdrawn' | 'bye' | 'inactive',
    intentional_bye_rounds: [] as number[],
    lichess_username: ''
  });

  // Update form data when player changes
  useEffect(() => {
    if (player) {
      setFormData({
        name: player.name || '',
        uscf_id: player.uscf_id || '',
        fide_id: player.fide_id || '',
        rating: player.rating?.toString() || '',
        section: player.section || '',
        team_name: player.team_name || '',
        school: player.school || '',
        grade: player.grade || '',
        email: player.email || '',
        phone: player.phone || '',
        state: player.state || '',
        city: player.city || '',
        parent_name: player.parent_name || '',
        parent_email: player.parent_email || '',
        parent_phone: player.parent_phone || '',
        emergency_contact: player.emergency_contact || '',
        emergency_phone: player.emergency_phone || '',
        tshirt_size: player.tshirt_size || '',
        dietary_restrictions: player.dietary_restrictions || '',
        special_needs: player.special_needs || '',
        notes: player.notes || '',
        status: player.status || 'active',
        intentional_bye_rounds: player.intentional_bye_rounds || [],
        lichess_username: player.lichess_username || ''
      });
    }
  }, [player]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rating' ? (value ? parseInt(value) : '') : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player) return;
    
    setLoading(true);

    try {
      const playerData = {
        name: formData.name,
        uscf_id: formData.uscf_id || undefined,
        fide_id: formData.fide_id || undefined,
        lichess_username: formData.lichess_username || undefined,
        rating: formData.rating ? parseInt(formData.rating) : undefined,
        section: formData.section || undefined,
        team_name: formData.team_name || undefined,
        school: formData.school || undefined,
        grade: formData.grade || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        state: formData.state || undefined,
        city: formData.city || undefined,
        parent_name: formData.parent_name || undefined,
        parent_email: formData.parent_email || undefined,
        parent_phone: formData.parent_phone || undefined,
        emergency_contact: formData.emergency_contact || undefined,
        emergency_phone: formData.emergency_phone || undefined,
        tshirt_size: formData.tshirt_size || undefined,
        dietary_restrictions: formData.dietary_restrictions || undefined,
        special_needs: formData.special_needs || undefined,
        notes: formData.notes || undefined,
        status: formData.status,
        intentional_bye_rounds: formData.intentional_bye_rounds.length > 0 ? formData.intentional_bye_rounds : undefined
      };

      const response = await playerApi.update(player.id, playerData);
      if (response.data.success) {
        dispatch({ type: 'UPDATE_PLAYER', payload: response.data.data });
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
      rating: selectedPlayer.rating?.toString() || prev.rating,
      state: selectedPlayer.state || prev.state,
      city: selectedPlayer.city || prev.city
    }));
    setShowSearchModal(false);
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

  if (!isOpen || !player) return null;

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

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                  placeholder="Enter city"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                  placeholder="Enter state"
                />
              </div>
            </div>
          </div>

          {/* School Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">School Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-2">
                  School
                </label>
                <input
                  type="text"
                  id="school"
                  name="school"
                  value={formData.school}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                  placeholder="Enter school name"
                />
              </div>

              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">
                  Grade
                </label>
                <input
                  type="text"
                  id="grade"
                  name="grade"
                  value={formData.grade}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                  placeholder="Enter grade"
                />
              </div>
            </div>
          </div>

          {/* Parent/Guardian Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Parent/Guardian Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="parent_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Parent/Guardian Name
                </label>
                <input
                  type="text"
                  id="parent_name"
                  name="parent_name"
                  value={formData.parent_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                  placeholder="Enter parent/guardian name"
                />
              </div>

              <div>
                <label htmlFor="parent_email" className="block text-sm font-medium text-gray-700 mb-2">
                  Parent/Guardian Email
                </label>
                <input
                  type="email"
                  id="parent_email"
                  name="parent_email"
                  value={formData.parent_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                  placeholder="Enter parent/guardian email"
                />
              </div>

              <div>
                <label htmlFor="parent_phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Parent/Guardian Phone
                </label>
                <input
                  type="tel"
                  id="parent_phone"
                  name="parent_phone"
                  value={formData.parent_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                  placeholder="Enter parent/guardian phone"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="emergency_contact" className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  id="emergency_contact"
                  name="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                  placeholder="Enter emergency contact name"
                />
              </div>

              <div>
                <label htmlFor="emergency_phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  id="emergency_phone"
                  name="emergency_phone"
                  value={formData.emergency_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                  placeholder="Enter emergency contact phone"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tshirt_size" className="block text-sm font-medium text-gray-700 mb-2">
                  T-Shirt Size
                </label>
                <select
                  id="tshirt_size"
                  name="tshirt_size"
                  value={formData.tshirt_size}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                >
                  <option value="">Select Size</option>
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                  <option value="XXXL">XXXL</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="dietary_restrictions" className="block text-sm font-medium text-gray-700 mb-2">
                Dietary Restrictions
              </label>
              <textarea
                id="dietary_restrictions"
                name="dietary_restrictions"
                value={formData.dietary_restrictions}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Enter dietary restrictions"
              />
            </div>

            <div>
              <label htmlFor="special_needs" className="block text-sm font-medium text-gray-700 mb-2">
                Special Needs
              </label>
              <textarea
                id="special_needs"
                name="special_needs"
                value={formData.special_needs}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Enter special needs or accommodations"
              />
            </div>

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

