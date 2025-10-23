import React, { useState, useEffect } from 'react';
import { Trophy, Users, Award, TrendingUp } from 'lucide-react';
import TeamStandingsTable from './TeamStandingsTable';

interface TeamPlayer {
  name: string;
  points: number;
  rating?: number;
}

interface TeamStanding {
  team_name: string;
  team_id: string;
  rank?: number;
  score: number;
  team_total_points: number;
  total_members: number;
  counted_players: number;
  progressive_scores?: number[]; // Round-by-round cumulative scores
  match_points?: number;
  game_points?: number;
  total_game_points?: number;
  avg_game_points?: number;
  games_played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  member_count?: number;
  buchholz?: number;
  sonneborn_berger?: number;
  team_performance_rating?: number;
  top_player_score?: number;
  top_2_sum?: number;
  top_3_sum?: number;
  progressive_tiebreaker?: string;
  players?: TeamPlayer[];
}

interface TeamStandingsProps {
  tournamentId: string;
  isVisible: boolean;
  onClose: () => void;
}

const TeamStandings: React.FC<TeamStandingsProps> = ({ tournamentId, isVisible, onClose }) => {
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoringMethod, setScoringMethod] = useState('top_4');
  const [topN, setTopN] = useState(4);

  useEffect(() => {
    if (isVisible && tournamentId) {
      fetchTeamStandings();
    }
  }, [isVisible, tournamentId, scoringMethod, topN]);

  const fetchTeamStandings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/teams/tournament/${tournamentId}/standings?scoring_method=${scoringMethod}&top_n=${topN}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch team standings');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStandings(data.standings || []);
      } else {
        throw new Error(data.error || 'Failed to fetch team standings');
      }
    } catch (err: any) {
      console.error('Error fetching team standings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: number | undefined) => {
    if (score === undefined || score === null) return '0.0';
    return score.toFixed(1);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Award className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 text-center text-sm font-medium text-gray-500">{index + 1}</span>;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Team Standings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Controls */}
          <div className="mb-6 flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <label htmlFor="scoring-method" className="text-sm font-medium text-gray-700">
                Scoring Method:
              </label>
              <select
                id="scoring-method"
                value={scoringMethod}
                onChange={(e) => setScoringMethod(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="top_4">Top 4 Players</option>
                <option value="top_3">Top 3 Players</option>
                <option value="top_2">Top 2 Players</option>
                <option value="all_players">All Players</option>
              </select>
            </div>
            
            {scoringMethod.startsWith('top_') && (
              <div className="flex items-center space-x-2">
                <label htmlFor="top-n" className="text-sm font-medium text-gray-700">
                  Count:
                </label>
                <input
                  id="top-n"
                  type="number"
                  min="1"
                  max="10"
                  value={topN}
                  onChange={(e) => setTopN(parseInt(e.target.value) || 4)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm w-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            <button
              onClick={fetchTeamStandings}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Team Standings Table */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : standings.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No team standings available</p>
              <p className="text-gray-400 text-sm">Teams need to be created and players assigned to see standings</p>
            </div>
          ) : (
            <TeamStandingsTable
              standings={standings}
              tournamentFormat="individual-team-swiss"
              scoringMethod={scoringMethod === 'top_4' ? 'top_players' : 'all_players'}
              topN={topN}
              showTiebreakers={true}
              totalRounds={standings[0]?.progressive_scores?.length || 7}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamStandings;
