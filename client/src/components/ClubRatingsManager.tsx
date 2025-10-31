import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, RefreshCw, Download, Search, BarChart3 } from 'lucide-react';
import { clubFeaturesApi } from '../services/api';
import { tournamentApi } from '../services/api';

interface RatingEntry {
  id: string;
  memberId: string;
  memberName: string;
  uscfId?: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  peakRating?: number;
  lastGameDate?: string;
}

interface ClubRatingsManagerProps {
  organizationId: string;
}

const ClubRatingsManager: React.FC<ClubRatingsManagerProps> = ({ organizationId }) => {
  const [ratings, setRatings] = useState<RatingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingType, setRatingType] = useState<string>('regular');
  const [searchTerm, setSearchTerm] = useState('');
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRatings();
    loadTournaments();
  }, [organizationId, ratingType]);

  const loadRatings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clubFeaturesApi.getRatings(organizationId, ratingType);
      if (response.data.success) {
        setRatings(response.data.data.leaderboard);
      } else {
        setError('Failed to load ratings');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load ratings');
    } finally {
      setLoading(false);
    }
  };

  const loadTournaments = async () => {
    try {
      const response = await tournamentApi.getAll();
      if (response.data.success) {
        const orgTournaments = response.data.data.filter(
          (t: any) => t.organization_id === organizationId && t.status === 'completed'
        );
        setTournaments(orgTournaments);
      }
    } catch (error) {
      console.error('Failed to load tournaments:', error);
    }
  };

  const handleGenerateRatings = async () => {
    if (!selectedTournament) {
      alert('Please select a tournament');
      return;
    }

    if (!window.confirm(`Generate club ratings from tournament results? This will process all completed games.`)) {
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      const response = await clubFeaturesApi.generateRatingsFromTournament(
        organizationId,
        selectedTournament,
        ratingType
      );
      if (response.data.success) {
        alert(response.data.message || 'Ratings generated successfully');
        loadRatings();
      } else {
        alert(response.data.error || 'Failed to generate ratings');
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to generate ratings');
    } finally {
      setGenerating(false);
    }
  };

  const filteredRatings = ratings.filter(rating =>
    rating.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rating.uscfId && rating.uscfId.includes(searchTerm))
  );

  if (loading && ratings.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Trophy className="h-6 w-6 text-yellow-600" />
          <h2 className="text-xl font-semibold text-gray-900">Club Ratings</h2>
          <span className="text-sm text-gray-500">({ratings.length} rated members)</span>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={ratingType}
            onChange={(e) => setRatingType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="regular">Regular Rating</option>
            <option value="quick">Quick Rating</option>
            <option value="blitz">Blitz Rating</option>
            <option value="tournament">Tournament Rating</option>
          </select>
          <button
            onClick={loadRatings}
            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Auto-Generate Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <span>Auto-Generate Ratings from Tournament</span>
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Automatically calculate club ratings based on completed tournament games. Ratings are updated using an Elo-style system.
            </p>
            <div className="flex items-center space-x-3">
              <select
                value={selectedTournament}
                onChange={(e) => setSelectedTournament(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select a completed tournament...</option>
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({new Date(t.start_date).toLocaleDateString()})
                  </option>
                ))}
              </select>
              <button
                onClick={handleGenerateRatings}
                disabled={!selectedTournament || generating}
                className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    <span>Generate Ratings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or USCF ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Ratings Leaderboard */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                USCF ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Games
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Record
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Peak Rating
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRatings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  {searchTerm ? 'No ratings found matching your search' : 'No ratings yet. Generate ratings from a tournament to get started.'}
                </td>
              </tr>
            ) : (
              filteredRatings.map((rating, index) => (
                <tr key={rating.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {index < 3 && (
                        <Trophy className={`h-5 w-5 mr-2 ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-orange-500'
                        }`} />
                      )}
                      <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{rating.memberName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{rating.uscfId || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-blue-600">{rating.rating}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{rating.gamesPlayed}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {rating.wins}-{rating.losses}-{rating.draws}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {rating.peakRating || '-'}
                      {rating.peakRating && rating.peakRating > rating.rating && (
                        <span className="ml-1 text-xs text-green-600">↑</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClubRatingsManager;

