import React, { useState, useEffect } from 'react';
import { Search, User, Mail, Phone, Trophy, Clock, CheckCircle, AlertCircle, X } from 'lucide-react';
import { playerApi, registrationApi } from '../services/api';

interface PlayerSearchResult {
  name: string;
  memberId: string;
  state: string;
  ratings: {
    regular: number | null;
    quick: number | null;
    blitz: number | null;
    online_regular: number | null;
    online_quick: number | null;
    online_blitz: number | null;
  };
  uscf_id: string;
  rating: number | null;
  email?: string;
  phone?: string;
}

interface TournamentInfo {
  id: string;
  name: string;
  format: string;
  rounds: number;
  start_date?: string;
  end_date?: string;
  sections: Array<{
    name: string;
    min_rating?: number;
    max_rating?: number;
    description?: string;
  }>;
}

interface RegistrationFormProps {
  tournamentId: string;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ tournamentId }) => {
  const [tournamentInfo, setTournamentInfo] = useState<TournamentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Player search states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    player_name: '',
    uscf_id: '',
    rating: '' as number | '',
    email: '',
    phone: '',
    section: '',
    bye_requests: [] as number[],
    notes: ''
  });

  // Load tournament information
  useEffect(() => {
    const loadTournamentInfo = async () => {
      try {
        const response = await registrationApi.getTournamentInfo(tournamentId);
        
        if (response.data.success) {
          setTournamentInfo(response.data.data);
        } else {
          setError(response.data.error || 'Failed to load tournament information');
        }
      } catch (err: any) {
        console.error('Error loading tournament info:', err);
        setError('Failed to load tournament information');
      } finally {
        setLoading(false);
      }
    };

    loadTournamentInfo();
  }, [tournamentId]);

  // Search for players
  const searchPlayers = async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      return;
    }

    setSearching(true);
    try {
      const response = await registrationApi.searchPlayers(searchTerm.trim(), 10);
      if (response.data.success) {
        setSearchResults(response.data.data.players);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Handle player selection
  const handlePlayerSelect = (player: PlayerSearchResult) => {
    setSelectedPlayer(player);
    setFormData(prev => ({
      ...prev,
      player_name: player.name,
      uscf_id: player.uscf_id || player.memberId,
      rating: player.rating || '',
      email: player.email || prev.email, // Use player email if available, otherwise keep existing
      phone: player.phone || prev.phone   // Use player phone if available, otherwise keep existing
    }));
    setShowSearchResults(false);
    setSearchTerm('');
  };

  // Handle bye request toggle
  const toggleByeRequest = (round: number) => {
    setFormData(prev => ({
      ...prev,
      bye_requests: prev.bye_requests.includes(round)
        ? prev.bye_requests.filter(r => r !== round)
        : [...prev.bye_requests, round]
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.player_name || !formData.email) {
      setError('Player name and email are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await registrationApi.submitRegistration({
        tournament_id: tournamentId,
        player_name: formData.player_name,
        uscf_id: formData.uscf_id,
        email: formData.email,
        phone: formData.phone,
        section: formData.section,
        bye_requests: formData.bye_requests,
        notes: formData.notes
      });

      if (response.data.success) {
        setRegistrationId(response.data.data.registration_id);
        setSubmitted(true);
      } else {
        setError(response.data.error || 'Failed to submit registration');
      }
    } catch (err: any) {
      console.error('Registration submission error:', err);
      setError('Failed to submit registration');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-black mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading tournament information...</p>
        </div>
      </div>
    );
  }

  if (submitted && registrationId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md mx-auto px-6">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold text-black mb-2">Registration submitted</h2>
            <p className="text-gray-600 mb-6">
              Thank you for registering for {tournamentInfo?.name}. Your registration has been submitted and is pending approval by the Tournament Director.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-6">
              <p className="text-sm text-gray-800">
                <strong>Registration ID:</strong> {registrationId}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                You can check your registration status using this ID.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors text-sm"
            >
              Submit another registration
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!tournamentInfo) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded">
            <p className="font-medium mb-2">Error</p>
            <p className="text-sm">Tournament not found or registration is not available.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-black mb-2">Tournament Registration</h1>
          <h2 className="text-lg text-black mb-4">{tournamentInfo.name}</h2>
          <div className="text-sm text-gray-600">
            <p>Format: {tournamentInfo.format.toUpperCase()} • {tournamentInfo.rounds} rounds</p>
            {tournamentInfo.start_date && (
              <p>Date: {new Date(tournamentInfo.start_date).toLocaleDateString()}</p>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            <p className="text-sm">{error}</p>
          </div>
        )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Player Search Section */}
        <div className="bg-white border border-gray-200 rounded p-6">
          <h3 className="text-lg font-semibold text-black mb-3">Find your player information</h3>
          <p className="text-sm text-gray-600 mb-4">
            Search for your name to automatically fill in your USCF information, or enter your details manually.
          </p>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Enter your name to search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchPlayers())}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <button
              type="button"
              onClick={searchPlayers}
              disabled={searching || !searchTerm.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              {searching ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-black"></div>
              ) : (
                <span className="text-sm">Search</span>
              )}
            </button>
          </div>

          {showSearchResults && searchResults.length > 0 && (
            <div className="mt-3 border border-gray-200 rounded bg-white max-h-48 overflow-y-auto">
              {searchResults.map((player, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handlePlayerSelect(player)}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-black">{player.name}</div>
                  <div className="text-sm text-gray-600">
                    USCF ID: {player.uscf_id || player.memberId} • 
                    {player.state && ` ${player.state} •`}
                    {player.rating && ` Rating: ${player.rating}`}
                  </div>
                  {(player.email || player.phone) && (
                    <div className="text-xs text-gray-500 mt-1">
                      {player.email && <span className="flex items-center"><Mail className="h-3 w-3 mr-1" />{player.email}</span>}
                      {player.phone && <span className="flex items-center"><Phone className="h-3 w-3 mr-1" />{player.phone}</span>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedPlayer && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-800 text-sm">Selected Player:</p>
                  <p className="text-sm text-green-700">
                    {selectedPlayer.name} • USCF ID: {selectedPlayer.uscf_id || selectedPlayer.memberId}
                    {selectedPlayer.rating && ` • Rating: ${selectedPlayer.rating}`}
                  </p>
                  {(selectedPlayer.email || selectedPlayer.phone) && (
                    <div className="text-xs text-green-600 mt-1">
                      {selectedPlayer.email && <span className="flex items-center"><Mail className="h-3 w-3 mr-1" />{selectedPlayer.email}</span>}
                      {selectedPlayer.phone && <span className="flex items-center"><Phone className="h-3 w-3 mr-1" />{selectedPlayer.phone}</span>}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlayer(null);
                    setFormData(prev => ({ ...prev, player_name: '', uscf_id: '' }));
                  }}
                  className="text-green-600 hover:text-green-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Player Information */}
        <div className="bg-white border border-gray-200 rounded p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Player Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Player Name *
              </label>
              <input
                type="text"
                required
                value={formData.player_name}
                onChange={(e) => setFormData(prev => ({ ...prev, player_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                US Chess ID
              </label>
              <input
                type="text"
                value={formData.uscf_id}
                onChange={(e) => setFormData(prev => ({ ...prev, uscf_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                placeholder="Enter your USCF ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating
              </label>
              <input
                type="number"
                value={formData.rating || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, rating: e.target.value ? parseInt(e.target.value) : '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                placeholder="Enter your rating"
                min="0"
                max="3000"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white border border-gray-200 rounded p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Contact Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                placeholder="your.email@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Playing Section */}
        {tournamentInfo.sections.length > 0 && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h3 className="text-lg font-semibold text-black mb-3">Playing Section</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select your preferred section. The Tournament Director reserves the right to adjust section assignments.
            </p>
            
            <select
              value={formData.section}
              onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="">- select one -</option>
              {tournamentInfo.sections.map((section, index) => (
                <option key={index} value={section.name}>
                  {section.name}
                  {section.min_rating && section.max_rating && 
                    ` (${section.min_rating} - ${section.max_rating})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Bye Requests */}
        <div className="bg-white border border-gray-200 rounded p-6">
          <h3 className="text-lg font-semibold text-black mb-3">Request BYE(s)</h3>
          <p className="text-sm text-gray-600 mb-4">
            A "bye" is a request to skip a round. Do not select a bye if you intend to be present for all games.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {Array.from({ length: tournamentInfo.rounds }, (_, i) => i + 1).map((round) => (
              <label key={round} className="flex items-center space-x-2 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.bye_requests.includes(round)}
                  onChange={() => toggleByeRequest(round)}
                  className="rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="text-sm font-medium">Rd. {round}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-white border border-gray-200 rounded p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
            placeholder="Any additional information or special requests..."
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting || !formData.player_name || !formData.email}
            className="w-full bg-black text-white py-3 px-6 rounded font-medium hover:bg-gray-800 focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-white mr-2"></div>
                Submitting Registration...
              </div>
            ) : (
              'Submit Registration'
            )}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default RegistrationForm;


