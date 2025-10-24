import React, { useState, useEffect } from 'react';
import { Users, ChevronDown, ChevronUp, Trophy, Award } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  rating?: number;
  section?: string;
  points?: number;
}

interface Quad {
  id: string;
  number: number;
  players: Player[];
}

interface QuadPairing {
  id?: string;
  quadId: string;
  round: number;
  white_player_id: string;
  white_name: string;
  white_rating?: number;
  black_player_id: string | null;
  black_name: string;
  black_rating?: number;
  result?: string;
  is_bye?: boolean;
}

interface QuadTournamentDisplayProps {
  quads: Quad[];
  pairings: QuadPairing[];
  standings?: any[];
  currentRound: number;
  totalRounds?: number;
  onPairingUpdate?: (pairing: QuadPairing) => void;
}

const QuadTournamentDisplay: React.FC<QuadTournamentDisplayProps> = ({
  quads,
  pairings,
  standings,
  currentRound,
  totalRounds = 3,
  onPairingUpdate
}) => {
  const [expandedQuads, setExpandedQuads] = useState<Set<string>>(
    new Set(quads.map(q => q.id))
  );
  const [selectedQuad, setSelectedQuad] = useState<string | null>(quads[0]?.id || null);

  const toggleQuadExpansion = (quadId: string) => {
    const newExpanded = new Set(expandedQuads);
    if (newExpanded.has(quadId)) {
      newExpanded.delete(quadId);
    } else {
      newExpanded.add(quadId);
    }
    setExpandedQuads(newExpanded);
  };

  const getQuadPairings = (quadId: string, round: number) => {
    return pairings.filter(p => p.quadId === quadId && p.round === round);
  };

  const getQuadStandings = (quadId: string) => {
    const quad = quads.find(q => q.id === quadId);
    if (!quad) return [];

    const playerIds = new Set(quad.players.map(p => p.id));
    return (standings || [])
      .filter(s => playerIds.has(s.id))
      .sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Quads</p>
              <p className="text-2xl font-bold text-blue-900">{quads.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Total Players</p>
              <p className="text-2xl font-bold text-purple-900">
                {quads.reduce((sum, q) => sum + q.players.length, 0)}
              </p>
            </div>
            <Trophy className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Current Round</p>
              <p className="text-2xl font-bold text-green-900">
                {currentRound} of {totalRounds}
              </p>
            </div>
            <Award className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Quads Container */}
      <div className="space-y-4">
        {quads.map(quad => (
          <div
            key={quad.id}
            className={`border-2 rounded-lg overflow-hidden transition-all ${
              selectedQuad === quad.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            {/* Quad Header */}
            <div
              onClick={() => {
                setSelectedQuad(quad.id);
                toggleQuadExpansion(quad.id);
              }}
              className="cursor-pointer hover:bg-gray-50 p-4 flex items-center justify-between bg-gradient-to-r from-slate-50 to-slate-100"
            >
              <div className="flex items-center space-x-4 flex-1">
                <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
                  {quad.number}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Quad {quad.number}</h3>
                  <p className="text-sm text-gray-600">
                    {quad.players.length} players
                  </p>
                </div>
              </div>
              <div>
                {expandedQuads.has(quad.id) ? (
                  <ChevronUp className="h-6 w-6 text-gray-400" />
                ) : (
                  <ChevronDown className="h-6 w-6 text-gray-400" />
                )}
              </div>
            </div>

            {/* Quad Content */}
            {expandedQuads.has(quad.id) && (
              <div className="border-t border-gray-200 p-4 space-y-6">
                {/* Quad Players */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Players</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {quad.players.map(player => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{player.name}</p>
                          <p className="text-sm text-gray-600">
                            {player.rating ? `Rating: ${player.rating}` : 'Unrated'}
                          </p>
                        </div>
                        {player.points !== undefined && (
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-600">
                              {player.points}
                            </p>
                            <p className="text-xs text-gray-600">points</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quad Standings */}
                {standings && standings.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Standings</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-gray-300">
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">
                              Rank
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">
                              Player
                            </th>
                            <th className="px-3 py-2 text-center font-semibold text-gray-700">
                              Rating
                            </th>
                            <th className="px-3 py-2 text-center font-semibold text-gray-700">
                              Points
                            </th>
                            <th className="px-3 py-2 text-center font-semibold text-gray-700">
                              Games
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {getQuadStandings(quad.id).map((player, index) => (
                            <tr
                              key={player.id}
                              className="border-b border-gray-200 hover:bg-gray-50"
                            >
                              <td className="px-3 py-2 font-bold text-gray-700">
                                {index + 1}
                              </td>
                              <td className="px-3 py-2 text-gray-900">{player.name}</td>
                              <td className="px-3 py-2 text-center text-gray-600">
                                {player.rating || '—'}
                              </td>
                              <td className="px-3 py-2 text-center font-semibold text-blue-600">
                                {player.total_points || 0}
                              </td>
                              <td className="px-3 py-2 text-center text-gray-600">
                                {player.games_played || 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Quad Pairings */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Pairings - Round {currentRound}
                  </h4>
                  <div className="space-y-2">
                    {getQuadPairings(quad.id, currentRound).map((pairing, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {pairing.white_name}
                              </p>
                              {pairing.white_rating && (
                                <p className="text-xs text-gray-600">
                                  Rating: {pairing.white_rating}
                                </p>
                              )}
                            </div>
                            {pairing.is_bye ? (
                              <div className="px-4 font-semibold text-orange-600 text-center">
                                BYE
                              </div>
                            ) : (
                              <>
                                <span className="px-4 font-semibold text-gray-700">vs</span>
                                <div className="text-right">
                                  <p className="font-medium text-gray-900">
                                    {pairing.black_name}
                                  </p>
                                  {pairing.black_rating && (
                                    <p className="text-xs text-gray-600">
                                      Rating: {pairing.black_rating}
                                    </p>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        {pairing.result && (
                          <div className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded font-semibold text-sm">
                            {pairing.result}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuadTournamentDisplay;
