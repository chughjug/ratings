import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, TrendingUp, Award, Users } from 'lucide-react';
import { tournamentApi } from '../services/api';

interface PlayerData {
  tournament: {
    id: string;
    name: string;
    rounds: number;
    format: string;
  };
  player: {
    id: string;
    name: string;
    rating: number;
    uscf_id: string;
    fide_id: string;
    section: string;
    start_number: number;
    totalPoints: number;
    place: number;
  };
  roundPerformance: Array<{
    round: number;
    result: string;
    opponent: {
      name: string;
      rating: number;
      id: string;
    };
    color: string;
    board: number;
    points: number;
  }>;
  positionHistory: Array<{
    round: string | number;
    position: number;
  }>;
  standings: Array<{
    id: string;
    name: string;
    rating: number;
    section: string;
    total_points: number;
    games_played: number;
    wins: number;
    losses: number;
    draws: number;
  }>;
  statistics: {
    gamesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
  };
}

const PlayerPerformance: React.FC = () => {
  const { tournamentId, playerId } = useParams<{ tournamentId: string; playerId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayerPerformance = async () => {
      if (!tournamentId || !playerId) return;
      
      try {
        setLoading(true);
        const response = await tournamentApi.getPlayerPerformance(tournamentId, playerId);
        if (response.data.success) {
          setData(response.data);
        }
        setError(null);
      } catch (err: any) {
        console.error('Error fetching player performance:', err);
        setError(err.response?.data?.error || 'Failed to load player performance');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerPerformance();
  }, [tournamentId, playerId]);

  if (!tournamentId || !playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
          <h2 className="text-red-800 text-lg font-bold mb-2">Error</h2>
          <p className="text-red-700">Invalid tournament or player ID</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white text-xl">Loading player performance...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
          <h2 className="text-red-800 text-lg font-bold mb-2">Error</h2>
          <p className="text-red-700">{error || 'Failed to load player performance'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const player = data.player;
  const stats = data.statistics;
  const roundPerf = data.roundPerformance;
  const positions = data.positionHistory;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
      {/* Header with back button */}
      <button
        onClick={() => navigate(`/tournaments/${tournamentId}`)}
        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Back to Tournament
      </button>

      {/* Main container */}
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6 border-b pb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{player.name}</h1>
              <p className="text-gray-600">{data.tournament.name}</p>
              {player.uscf_id && (
                <div className="flex items-center gap-2 mt-2">
                  <a
                    href={`https://www.uschess.org/player-search/?p=${player.uscf_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    USCF Profile
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 md:text-right">
              <div>
                <div className="text-sm text-gray-600">Start №</div>
                <div className="text-3xl font-bold text-gray-900">{player.start_number}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Rating</div>
                <div className="text-3xl font-bold text-gray-900">{player.rating}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Points</div>
                <div className="text-3xl font-bold text-green-600">{player.totalPoints}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Place</div>
                <div className="text-3xl font-bold text-blue-600">{player.place}</div>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Results</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-3 font-bold text-gray-700">Round</th>
                  <th className="text-left py-2 px-3 font-bold text-gray-700">Result</th>
                  <th className="text-left py-2 px-3 font-bold text-gray-700">Opponent</th>
                  <th className="text-center py-2 px-3 font-bold text-gray-700">Club</th>
                  <th className="text-right py-2 px-3 font-bold text-gray-700">Rating</th>
                  <th className="text-right py-2 px-3 font-bold text-gray-700">Board</th>
                </tr>
              </thead>
              <tbody>
                {roundPerf.map((round, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-3 font-semibold text-gray-900">Round {round.round}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-3 py-1 rounded font-bold text-white ${
                          round.result === '1-0' || round.result === '1-0F'
                            ? 'bg-green-500'
                            : round.result === '1/2-1/2' || round.result === '1/2-1/2F'
                            ? 'bg-yellow-500'
                            : round.result === '0-1' || round.result === '0-1F'
                            ? 'bg-red-500'
                            : 'bg-gray-400'
                        }`}
                      >
                        {round.result || 'TBD'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-900">{round.opponent.name || 'Bye'}</td>
                    <td className="py-3 px-3 text-center text-gray-600">-</td>
                    <td className="py-3 px-3 text-right text-gray-600">{round.opponent.rating || '-'}</td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-900">{round.board}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Points',
              value: player.totalPoints.toFixed(1),
              icon: Award,
              color: 'bg-green-500'
            },
            {
              label: 'MMed (Median)',
              value: '2.5',
              icon: TrendingUp,
              color: 'bg-blue-500'
            },
            {
              label: 'Solk',
              value: '3.0',
              icon: Users,
              color: 'bg-purple-500'
            },
            {
              label: 'Cum',
              value: '3.0',
              icon: TrendingUp,
              color: 'bg-indigo-500'
            }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-600 font-medium">{stat.label}</p>
                <div className={`${stat.color} p-2 rounded-lg`}>
                  <stat.icon className="text-white" size={20} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Record */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Record</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Wins</span>
                <span className="text-2xl font-bold text-green-600">{stats.wins}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Draws</span>
                <span className="text-2xl font-bold text-yellow-600">{stats.draws}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Losses</span>
                <span className="text-2xl font-bold text-red-600">{stats.losses}</span>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Games Played</span>
                  <span className="text-xl font-bold text-gray-900">{stats.gamesPlayed}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Placement History */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Position History</h3>
            <div className="space-y-2">
              {positions.map((pos, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-gray-600 font-medium">
                    Round {pos.round === 'start' ? 'Start' : pos.round}
                  </span>
                  <span className="text-lg font-bold text-gray-900">{pos.position}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Player in the standings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Final Standings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-3 font-bold text-gray-700 w-12">Rank</th>
                  <th className="text-left py-2 px-3 font-bold text-gray-700">Player</th>
                  <th className="text-right py-2 px-3 font-bold text-gray-700">Rating</th>
                  <th className="text-right py-2 px-3 font-bold text-gray-700">Points</th>
                  <th className="text-right py-2 px-3 font-bold text-gray-700">Games</th>
                  <th className="text-center py-2 px-3 font-bold text-gray-700">W</th>
                  <th className="text-center py-2 px-3 font-bold text-gray-700">D</th>
                  <th className="text-center py-2 px-3 font-bold text-gray-700">L</th>
                </tr>
              </thead>
              <tbody>
                {data.standings.slice(0, 20).map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-200 ${
                      p.id === playerId ? 'bg-yellow-50 font-bold' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="py-3 px-3">{idx + 1}</td>
                    <td className="py-3 px-3">{p.name}</td>
                    <td className="py-3 px-3 text-right text-gray-600">{p.rating}</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">{p.total_points}</td>
                    <td className="py-3 px-3 text-right text-gray-600">{p.games_played}</td>
                    <td className="py-3 px-3 text-center text-green-600 font-semibold">{p.wins}</td>
                    <td className="py-3 px-3 text-center text-yellow-600 font-semibold">{p.draws}</td>
                    <td className="py-3 px-3 text-center text-red-600 font-semibold">{p.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerPerformance;
