import React from 'react';
import { Trophy, Download, Printer } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  rating?: number;
  uscf_id?: string;
  section?: string;
}

interface GameResult {
  round: number;
  opponent_id: string;
  opponent_name: string;
  color: 'white' | 'black';
  result: '1-0' | '0-1' | '1/2-1/2' | '1-0F' | '0-1F' | '1/2-1/2F' | '';
  points: number;
}

interface CrosstableData {
  player: Player;
  games: GameResult[];
  total_points: number;
  buchholz: number;
  sonneborn_berger: number;
  rank: number;
}

interface CrosstableViewProps {
  tournament: {
    id: string;
    name: string;
    rounds: number;
    format: string;
    start_date?: string;
    end_date?: string;
  };
  crosstableData: CrosstableData[];
  onExport?: () => void;
  onPrint?: () => void;
}

const CrosstableView: React.FC<CrosstableViewProps> = ({
  tournament,
  crosstableData,
  onExport,
  onPrint
}) => {
  const getResultSymbol = (result: string) => {
    switch (result) {
      case '1-0': return '1';
      case '0-1': return '0';
      case '1/2-1/2': return '½';
      case '1-0F': return '+';
      case '0-1F': return '-';
      case '1/2-1/2F': return '=';
      default: return '';
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case '1-0':
      case '1-0F':
        return 'text-green-600 font-bold';
      case '0-1':
      case '0-1F':
        return 'text-red-600 font-bold';
      case '1/2-1/2':
      case '1/2-1/2F':
        return 'text-blue-600 font-bold';
      default:
        return 'text-gray-400';
    }
  };

  const getColorSymbol = (color: 'white' | 'black') => {
    return color === 'white' ? '♔' : '♚';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
            <h2 className="text-xl font-semibold text-gray-700 mt-2">Crosstable</h2>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <span>Format: {tournament.format}</span>
              <span>Rounds: {tournament.rounds}</span>
              <span>Players: {crosstableData.length}</span>
              {tournament.start_date && (
                <span>Start: {formatDate(tournament.start_date)}</span>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            {onPrint && (
              <button
                onClick={onPrint}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
            )}
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Crosstable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Points
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Buchholz
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  S-B
                </th>
                {/* Round columns hidden */}
                {/* {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(round => (
                  <th key={round} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    R{round}
                  </th>
                ))} */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {crosstableData.map((data, index) => (
                <tr key={data.player.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {data.rank}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {data.player.name}
                    </div>
                    {data.player.uscf_id && (
                      <div className="text-sm text-gray-500">
                        [{data.player.uscf_id}]
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.player.rating || 'Unrated'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-center text-gray-900">
                    {data.total_points}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                    {data.buchholz.toFixed(1)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                    {data.sonneborn_berger.toFixed(1)}
                  </td>
                  {/* Game results hidden */}
                  {/* {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(round => {
                    const game = data.games.find(g => g.round === round);
                    return (
                      <td key={round} className="px-2 py-4 whitespace-nowrap text-center">
                        {game ? (
                          <div className="flex flex-col items-center space-y-1">
                            <div className={`text-sm ${getResultColor(game.result)}`}>
                              {getResultSymbol(game.result)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {getColorSymbol(game.color)}
                            </div>
                            <div className="text-xs text-gray-400 truncate max-w-16">
                              {game.opponent_name.split(' ')[0]}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-300">-</div>
                        )}
                      </td>
                    );
                  })} */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">Results:</span>
            <ul className="mt-1 space-y-1">
              <li><span className="text-green-600 font-bold">1</span> = Win</li>
              <li><span className="text-red-600 font-bold">0</span> = Loss</li>
              <li><span className="text-blue-600 font-bold">½</span> = Draw</li>
            </ul>
          </div>
          <div>
            <span className="font-medium">Forfeits:</span>
            <ul className="mt-1 space-y-1">
              <li><span className="text-green-600 font-bold">+</span> = Win by forfeit</li>
              <li><span className="text-red-600 font-bold">-</span> = Loss by forfeit</li>
              <li><span className="text-blue-600 font-bold">=</span> = Draw by forfeit</li>
            </ul>
          </div>
          <div>
            <span className="font-medium">Colors:</span>
            <ul className="mt-1 space-y-1">
              <li><span className="text-gray-600">♔</span> = White</li>
              <li><span className="text-gray-600">♚</span> = Black</li>
            </ul>
          </div>
          <div>
            <span className="font-medium">Tiebreaks:</span>
            <ul className="mt-1 space-y-1">
              <li><span className="font-medium">Buchholz:</span> Sum of opponents' scores</li>
              <li><span className="font-medium">S-B:</span> Sonneborn-Berger score</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrosstableView;
