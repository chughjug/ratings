import React from 'react';
import { Users, Trophy } from 'lucide-react';

interface TeamPairing {
  id?: string;
  team_name: string;
  opponent_team_name?: string;
  board: number;
  is_bye: boolean;
  team_score?: number;
  opponent_score?: number;
  result?: 'win' | 'loss' | 'draw';
}

interface TeamPairingsTableProps {
  pairings: TeamPairing[];
  round: number;
  tournamentFormat: 'team-swiss' | 'team-round-robin' | 'individual-team-swiss';
  showResults?: boolean;
}

const TeamPairingsTable: React.FC<TeamPairingsTableProps> = ({
  pairings,
  round,
  tournamentFormat,
  showResults = false
}) => {
  const getResultIcon = (result?: string) => {
    switch (result) {
      case 'win':
        return <Trophy className="h-4 w-4 text-green-500" />;
      case 'loss':
        return <span className="text-red-500 font-bold">L</span>;
      case 'draw':
        return <span className="text-yellow-500 font-bold">D</span>;
      default:
        return null;
    }
  };

  const getResultColor = (result?: string) => {
    switch (result) {
      case 'win':
        return 'text-green-600 bg-green-50';
      case 'loss':
        return 'text-red-600 bg-red-50';
      case 'draw':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600';
    }
  };

  const formatScore = (score: number | undefined) => {
    if (score === undefined || score === null) return '-';
    return score.toFixed(1);
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Round {round} Team Pairings
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {tournamentFormat === 'individual-team-swiss' 
            ? 'Teams paired based on cumulative scores - individual players compete within team matchups'
            : 'Teams compete directly against each other'
          }
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Board
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team 1
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Result
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team 2
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pairings.map((pairing) => (
              <tr key={pairing.id || `${pairing.team_name}-${pairing.board}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Board {pairing.board}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {pairing.team_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {showResults ? formatScore(pairing.team_score) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {pairing.is_bye ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      1-0F
                    </span>
                  ) : showResults && pairing.result ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getResultColor(pairing.result)}`}>
                      {getResultIcon(pairing.result)}
                      <span className="ml-1">{pairing.result.toUpperCase()}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400">vs</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {showResults && !pairing.is_bye ? formatScore(pairing.opponent_score) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {pairing.is_bye ? (
                      <span className="text-gray-500 italic">1-0F</span>
                    ) : (
                      pairing.opponent_team_name || '1-0F'
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pairings.length === 0 && (
        <div className="px-6 py-8 text-center text-gray-500">
          No team pairings available for this round.
        </div>
      )}
    </div>
  );
};

export default TeamPairingsTable;
