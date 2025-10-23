import React, { useState } from 'react';
import { playerApi } from '../services/api';

interface PlayerSearchResult {
  name: string;
  memberId: string;
  state: string | null;
  ratings: {
    regular?: number | null;
    quick?: number | null;
    blitz?: number | null;
    online_regular?: number | null;
    online_quick?: number | null;
    online_blitz?: number | null;
  };
  uscf_id: string;
  rating: number | null;
  email?: string;
  phone?: string;
}

interface PlayerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlayer: (player: PlayerSearchResult) => void;
  tournamentId: string;
}

const PlayerSearchModal: React.FC<PlayerSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelectPlayer, 
  tournamentId 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null);

  // Manual search function
  const performSearch = async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setError('Please enter at least 2 characters to search');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const startTime = Date.now();
    
    try {
      const response = await playerApi.search(searchTerm.trim(), 10);
      const duration = Date.now() - startTime;
      
      if (response.data.success) {
        setSearchResults(response.data.data.players);
        console.log(`Search completed in ${duration}ms`);
      } else {
        setError(response.data.error || 'Failed to search players');
        setSearchResults([]);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      
      // Handle different types of errors
      let errorMessage = 'Failed to search players. Please try again.';
      
      if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNABORTED') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again in a moment.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Search service not available. Please try again later.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press in search input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  const handleSelectPlayer = (player: PlayerSearchResult) => {
    setSelectedPlayer(player);
  };

  const handleImportPlayer = () => {
    if (selectedPlayer) {
      onSelectPlayer(selectedPlayer);
      onClose();
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedPlayer(null);
    setError(null);
    onClose();
  };

  const formatRating = (rating: number | null | undefined) => {
    if (rating === null || rating === undefined) return 'N/A';
    return rating.toString();
  };

  const getPrimaryRating = (ratings: PlayerSearchResult['ratings']) => {
    return ratings.regular || ratings.quick || ratings.blitz || null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Search US Chess Players</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Search for players by name to import them into your tournament
          </p>
        </div>

        <div className="p-6">
          {/* Search Input */}
          <div className="mb-6">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search by Player Name
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter player name (minimum 2 characters)..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={performSearch}
                disabled={loading || searchTerm.trim().length < 2}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  loading || searchTerm.trim().length < 2
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                }`}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}


          {/* Loading Indicator */}
          {loading && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
              Searching players...
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Search Results ({searchResults.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((player, index) => (
                  <div
                    key={`${player.memberId}-${index}`}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPlayer?.memberId === player.memberId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectPlayer(player)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{player.name}</h4>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">USCF ID:</span> {player.memberId}
                          {player.state && (
                            <>
                              <span className="mx-2">•</span>
                              <span className="font-medium">State:</span> {player.state}
                            </>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Primary Rating:</span> {formatRating(getPrimaryRating(player.ratings))}
                        </div>
                        {(player.email || player.phone) && (
                          <div className="text-xs text-gray-500 mt-2">
                            {player.email && (
                              <div className="flex items-center">
                                <span className="font-medium mr-1">Email:</span>
                                <span>{player.email}</span>
                              </div>
                            )}
                            {player.phone && (
                              <div className="flex items-center">
                                <span className="font-medium mr-1">Phone:</span>
                                <span>{player.phone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {selectedPlayer?.memberId === player.memberId && (
                          <span className="text-blue-600 font-medium">Selected</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Detailed Ratings */}
                    <div className="mt-2 text-xs text-gray-500">
                      <div className="flex flex-wrap gap-4">
                        {player.ratings.regular && (
                          <span>Regular: {player.ratings.regular}</span>
                        )}
                        {player.ratings.quick && (
                          <span>Quick: {player.ratings.quick}</span>
                        )}
                        {player.ratings.blitz && (
                          <span>Blitz: {player.ratings.blitz}</span>
                        )}
                        {player.ratings.online_regular && (
                          <span>Online Regular: {player.ratings.online_regular}</span>
                        )}
                        {player.ratings.online_quick && (
                          <span>Online Quick: {player.ratings.online_quick}</span>
                        )}
                        {player.ratings.online_blitz && (
                          <span>Online Blitz: {player.ratings.online_blitz}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {searchResults.length === 0 && !loading && !error && searchTerm.trim().length >= 2 && (
            <div className="mb-6 p-4 bg-gray-100 border border-gray-300 rounded-lg text-center">
              <p className="text-gray-600">No players found matching "{searchTerm}"</p>
              <p className="text-sm text-gray-500 mt-1">Try a different search term or check the spelling</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImportPlayer}
              disabled={!selectedPlayer}
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedPlayer
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Import Selected Player
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerSearchModal;

