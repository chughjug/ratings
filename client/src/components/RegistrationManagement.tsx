import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Mail, Phone, Calendar, AlertCircle, CheckCircle, Loader } from 'lucide-react';

type Props = {
  tournamentId?: string | number;
};

interface Tournament {
  id: string;
  name: string;
  format: string;
  rounds: number;
  start_date: string;
  end_date: string;
  sections: string[];
  allow_registration: boolean;
}

interface Player {
  name: string;
  uscf_id: string;
  rating: number;
  expiration_date?: string;
}

interface RegistrationForm {
  player_name: string;
  uscf_id: string;
  email: string;
  phone: string;
  section: string;
  bye_requests: number[];
  notes: string;
}

const RegistrationManagement: React.FC<Props> = ({ tournamentId }) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  const [form, setForm] = useState<RegistrationForm>({
    player_name: '',
    uscf_id: '',
    email: '',
    phone: '',
    section: '',
    bye_requests: [],
    notes: ''
  });

  // Helper function to determine if registration is open
  const isRegistrationOpen = (tournament: Tournament) => {
    // First check if registration is explicitly disabled
    if (tournament.allow_registration === false) {
      return false;
    }
    
    // If no start date, assume open (unless explicitly disabled)
    if (!tournament.start_date) {
      return true;
    }
    
    // Check if tournament has started
    const startDate = new Date(tournament.start_date);
    const now = new Date();
    return startDate > now; // Registration open if tournament hasn't started yet
  };

  // Fetch tournament data
  useEffect(() => {
    const fetchTournament = async () => {
      if (!tournamentId) {
        setError('No tournament ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/registrations/tournament/${tournamentId}/info?t=${Date.now()}`);
        const data = await response.json();
        
        if (data.success) {
          // Transform sections from array of objects to array of strings
          const transformedData = {
            ...data.data,
            sections: data.data.sections?.map((section: any) => 
              typeof section === 'string' ? section : section.name
            ) || []
          };
          setTournament(transformedData);
        } else {
          setError(data.error || 'Failed to load tournament');
        }
      } catch (err) {
        setError('Failed to connect to server');
        console.error('Error fetching tournament:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, [tournamentId]);

  // Search for players
  const searchPlayers = async (term: string) => {
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(`/api/registrations/search-players?q=${encodeURIComponent(term)}&limit=10`);
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data.players || []);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching players:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    searchPlayers(value);
  };

  // Select a player from search results
  const selectPlayer = (player: Player) => {
    setForm(prev => ({
      ...prev,
      player_name: player.name,
      uscf_id: player.uscf_id,
    }));
    setSearchTerm(player.name);
    setSearchResults([]);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tournamentId) {
      setSubmitMessage({type: 'error', text: 'No tournament ID provided'});
      return;
    }

    if (!form.player_name || !form.email) {
      setSubmitMessage({type: 'error', text: 'Player name and email are required'});
      return;
    }

    // Check if registration is open before attempting submission
    if (tournament && !isRegistrationOpen(tournament)) {
      setSubmitMessage({type: 'error', text: 'Registration is currently closed for this tournament. The tournament director has disabled registration.'});
      return;
    }

    try {
      setSubmitting(true);
      setSubmitMessage(null);

      const response = await fetch('/api/registrations/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournament_id: tournamentId,
          ...form
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSubmitMessage({type: 'success', text: data.message || 'Registration submitted successfully!'});
        setForm({
          player_name: '',
          uscf_id: '',
          email: '',
          phone: '',
          section: '',
          bye_requests: [],
          notes: ''
        });
        setSearchTerm('');
      } else {
        // Check if registration is closed due to TD disabling it
        if (data.error && data.error.includes('Registration is currently closed')) {
          setSubmitMessage({type: 'error', text: 'Registration is currently closed for this tournament. The tournament director has disabled registration.'});
        } else {
          setSubmitMessage({type: 'error', text: data.error || 'Failed to submit registration'});
        }
      }
    } catch (err) {
      // Check if it's a network error or server error
      if (err instanceof Error && err.message && err.message.includes('fetch')) {
        setSubmitMessage({type: 'error', text: 'Unable to connect to the server. Please check your internet connection and try again.'});
      } else if (err instanceof Error && err.message) {
        setSubmitMessage({type: 'error', text: err.message});
      } else {
        setSubmitMessage({type: 'error', text: 'Failed to submit registration. Please try again.'});
      }
      console.error('Error submitting registration:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading tournament...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
          <span className="text-yellow-700">Tournament not found or registration is not available.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tournament Info */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{tournament.name}</h2>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-gray-600">
              {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : 'TBD'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Format:</span> {tournament.format}
          </div>
          <div>
            <span className="font-medium">Rounds:</span> {tournament.rounds}
          </div>
          <div>
            <span className="font-medium">Registration:</span> 
            <span className={`ml-1 ${isRegistrationOpen(tournament) ? 'text-green-600' : 'text-red-600'}`}>
              {isRegistrationOpen(tournament) ? 'Open' : 'Closed'}
            </span>
            {!tournament.allow_registration && (
              <span className="ml-2 text-xs text-red-500">(Disabled by TD)</span>
            )}
          </div>
          <div>
            <span className="font-medium">Sections:</span> {tournament.sections?.join(', ') || 'Open'}
          </div>
        </div>
      </div>

      {/* Registration Form - Only show if registration is open */}
      {tournament && isRegistrationOpen(tournament) ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <UserPlus className="h-5 w-5 mr-2" />
            Register for Tournament
          </h3>

          {submitMessage && (
            <div className={`mb-4 p-4 rounded-lg flex items-center ${
              submitMessage.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {submitMessage.type === 'success' ? (
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2" />
              )}
              {submitMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Player Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Player Name *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search for player or enter name manually"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searching && (
                  <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((player, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectPlayer(player)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-gray-500">
                        USCF ID: {player.uscf_id} | Rating: {player.rating}
                        {player.expiration_date && (
                          <span className="ml-2">
                            | Expires: {new Date(player.expiration_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Entry Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Player Name *
                </label>
                <input
                  type="text"
                  value={form.player_name}
                  onChange={(e) => setForm(prev => ({ ...prev, player_name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  USCF ID
                </label>
                <input
                  type="text"
                  value={form.uscf_id}
                  onChange={(e) => setForm(prev => ({ ...prev, uscf_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section
                </label>
                <select
                  value={form.section}
                  onChange={(e) => setForm(prev => ({ ...prev, section: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Section</option>
                  {tournament.sections?.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any additional information..."
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || (tournament && !isRegistrationOpen(tournament))}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : tournament && !isRegistrationOpen(tournament) ? (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Registration Closed
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Submit Registration
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Registration Closed</h3>
              <p className="text-red-700">
                Registration is currently closed for this tournament.
                {!tournament.allow_registration && ' The tournament director has disabled registration.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationManagement;
