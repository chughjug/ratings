import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Trophy, Target, Zap, BarChart3, CheckCircle, XCircle, Minus } from 'lucide-react';
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

const getResultIcon = (result: string) => {
  if (result === '1-0' || result === '1-0F') return <CheckCircle className="w-5 h-5 text-green-600" />;
  if (result === '0-1' || result === '0-1F') return <XCircle className="w-5 h-5 text-red-600" />;
  if (result === '1/2-1/2' || result === '1/2-1/2F') return <Minus className="w-5 h-5 text-yellow-600" />;
  return <Zap className="w-5 h-5 text-gray-400" />;
};

const getResultColor = (result: string) => {
  if (result === '1-0' || result === '1-0F') return 'bg-green-50 border-l-4 border-green-500';
  if (result === '0-1' || result === '0-1F') return 'bg-red-50 border-l-4 border-red-500';
  if (result === '1/2-1/2' || result === '1/2-1/2F') return 'bg-yellow-50 border-l-4 border-yellow-500';
  return 'bg-gray-50 border-l-4 border-gray-400';
};

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-lg p-8 max-w-md shadow-lg">
          <h2 className="text-red-800 text-lg font-bold mb-2">Error</h2>
          <p className="text-red-700 mb-4">Invalid tournament or player ID</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full animate-spin mb-4">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-gray-600 font-medium">Loading player performance...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-lg p-8 max-w-md shadow-lg">
          <h2 className="text-red-800 text-lg font-bold mb-2">Error</h2>
          <p className="text-red-700 mb-4">{error || 'Failed to load player performance'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition"
          >
            <ArrowLeft size={20} />
            Back to Tournament
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Player Header Card */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6 border-b pb-6">
            <div>
              <div className="flex items-baseline gap-3 mb-2">
                <h1 className="text-4xl font-bold text-gray-900">{player.name}</h1>
                {player.uscf_id && (
                  <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded">
                    ID: {player.uscf_id}
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-lg mb-4">{data.tournament.name}</p>
              <div className="flex flex-wrap gap-4">
                {player.uscf_id && (
                  <a
                    href={`https://www.uschess.org/msa/MbrDtlMain.php?${player.uscf_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <ExternalLink size={16} />
                    USCF Profile
                  </a>
                )}
                {player.fide_id && (
                  <a
                    href={`https://ratings.fide.com/profile/${player.fide_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <ExternalLink size={16} />
                    FIDE Profile
                  </a>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 uppercase tracking-wide font-semibold">Start №</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{player.start_number}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 uppercase tracking-wide font-semibold">Rating</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{player.rating}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 uppercase tracking-wide font-semibold">Points</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{player.totalPoints}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 uppercase tracking-wide font-semibold">Rank</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{player.place}</p>
              </div>
            </div>
          </div>

          {/* Player Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-gray-600 font-semibold mb-1">Section</p>
              <p className="text-gray-900">{player.section || 'Open'}</p>
            </div>
            {player.uscf_id && (
              <div>
                <p className="text-gray-600 font-semibold mb-1">USCF ID</p>
                <p className="text-gray-900 font-mono">{player.uscf_id}</p>
              </div>
            )}
            {player.fide_id && (
              <div>
                <p className="text-gray-600 font-semibold mb-1">FIDE ID</p>
                <p className="text-gray-900 font-mono">{player.fide_id}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Wins</h3>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-4xl font-bold text-green-600">{stats.wins}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Draws</h3>
              <Minus className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-4xl font-bold text-yellow-600">{stats.draws}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Losses</h3>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-4xl font-bold text-red-600">{stats.losses}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Games</h3>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-4xl font-bold text-blue-600">{stats.gamesPlayed}</p>
          </div>
        </div>

        {/* Round Results */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-blue-600" />
            Round Results
          </h2>
          <div className="space-y-3">
            {roundPerf.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No games played yet</p>
            ) : (
              roundPerf.map((round, idx) => (
                <div key={idx} className={`${getResultColor(round.result)} p-4 rounded-lg flex items-center justify-between`}>
                  <div className="flex items-center gap-4">
                    {getResultIcon(round.result)}
                    <div>
                      <p className="font-semibold text-gray-900">Round {round.round}</p>
                      <p className="text-sm text-gray-600">{round.opponent.name} ({round.opponent.rating}) - Board {round.board}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">{round.result}</p>
                    <p className="text-sm text-gray-600">{round.points} pts</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Standings */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Tournament Standings
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Rank</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Player</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-700">Rating</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-700">Points</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-700">W</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-700">D</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-700">L</th>
                </tr>
              </thead>
              <tbody>
                {data.standings.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-200 ${
                      p.id === playerId ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="py-3 px-4 text-gray-900">{idx + 1}</td>
                    <td className="py-3 px-4 text-gray-900">{p.name}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{p.rating}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">{p.total_points}</td>
                    <td className="py-3 px-4 text-center text-green-600 font-semibold">{p.wins}</td>
                    <td className="py-3 px-4 text-center text-yellow-600 font-semibold">{p.draws}</td>
                    <td className="py-3 px-4 text-center text-red-600 font-semibold">{p.losses}</td>
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
