import React from 'react';

interface RoundResult {
  result: string;
  opponent_name: string;
  opponent_rating?: number;
  opponent_rank?: number;
  points: number;
  color: string;
  board: number;
}

interface PlayerStanding {
  id: string;
  rank: number;
  name: string;
  rating?: number;
  uscf_id?: string;
  section?: string;
  total_points: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  tiebreakers: {
    buchholz?: number;
    sonnebornBerger?: number;
    performanceRating?: number;
    modifiedBuchholz?: number;
    cumulative?: number;
  };
  roundResults: { [round: number]: RoundResult };
  prize?: string;
}

interface ChessStandingsTableProps {
  standings: PlayerStanding[];
  tournament: {
    rounds: number;
    name: string;
  };
  selectedSection?: string;
  showTiebreakers?: boolean;
  showPrizes?: boolean;
}

const ChessStandingsTable: React.FC<ChessStandingsTableProps> = ({
  standings,
  tournament,
  selectedSection = 'all',
  showTiebreakers = true,
  showPrizes = true
}) => {
  // Format round result for display
  const formatRoundResult = (roundResult: RoundResult | undefined, round: number) => {
    if (!roundResult) {
      return '-';
    }

    const { result, opponent_rank, color } = roundResult;
    
    // Handle different result types
    // The 'result' field represents the game result from white player's perspective
    // We need to convert it to the current player's perspective based on their color
    let resultSymbol = '';
    
    if (result === '1/2-1/2' || result === '1/2-1/2F') {
      // Draw is the same for both players
      resultSymbol = 'D';
    } else if (result === '1-0' || result === '1-0F') {
      // White wins - if current player is white, they win; if black, they lose
      resultSymbol = color === 'white' ? 'W' : 'L';
    } else if (result === '0-1' || result === '0-1F') {
      // Black wins - if current player is black, they win; if white, they lose
      resultSymbol = color === 'black' ? 'W' : 'L';
    } else {
      return '-';
    }

    // Format opponent display - show opponent's position/rank number or TBD if not available
    const colorSymbol = color === 'white' ? '(b)' : '(w)'; // Note: color is the player's color, so opponent is opposite
    
    // Show opponent's rank if available, otherwise show TBD
    const opponentDisplay = opponent_rank ? opponent_rank.toString() : 'TBD';
    
    return `${resultSymbol}${opponentDisplay} ${colorSymbol}`;
  };

  // Format player name with title
  const formatPlayerName = (player: PlayerStanding) => {
    let name = player.name.toUpperCase();
    
    // Add common chess titles if not already present
    if (!name.includes('GM') && !name.includes('IM') && !name.includes('FM') && !name.includes('CM')) {
      // This is a simplified approach - in a real system you'd have a titles database
      if (player.rating && player.rating >= 2500) {
        name = `GM ${name}`;
      } else if (player.rating && player.rating >= 2400) {
        name = `IM ${name}`;
      } else if (player.rating && player.rating >= 2300) {
        name = `FM ${name}`;
      }
    }
    
    return name;
  };

  // Format rating display
  const formatRating = (rating?: number) => {
    if (!rating) return '';
    return rating.toString().padStart(4, ' ');
  };

  // Format points display
  const formatPoints = (points: number) => {
    return points.toString();
  };

  // Format tiebreaker values
  const formatTiebreaker = (value: number | undefined) => {
    if (value === undefined || value === null) return '';
    return value.toFixed(1);
  };

  // Generate round columns
  const roundColumns = Array.from({ length: tournament.rounds }, (_, i) => i + 1);

  // Group standings by section
  const groupedStandings = standings.reduce((acc, player) => {
    const section = player.section || 'Open';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(player);
    return acc;
  }, {} as Record<string, PlayerStanding[]>);

  // Filter standings by section if needed
  const filteredStandings = selectedSection === 'all' 
    ? standings 
    : standings.filter(player => (player.section || 'Open') === selectedSection);

  // If showing all sections, group them; otherwise show filtered list
  const displayData = selectedSection === 'all' ? groupedStandings : { [selectedSection]: filteredStandings };

  return (
    <div className="space-y-8">
      {Object.entries(displayData).map(([sectionName, sectionStandings]) => (
        <div key={sectionName} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {/* Section Header */}
          <div className="bg-gradient-to-r from-blue-600 to-slate-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">
              {sectionName} Section
              <span className="ml-2 text-blue-200 text-sm">
                ({sectionStandings.length} players)
              </span>
            </h3>
          </div>
          
          {/* Standings Table */}
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200 chess-standings-table">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200">
              No.
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200">
              Player's Name
            </th>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200">
              USCF
            </th>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200">
              Rating
            </th>
            <th className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200">
              Pts
            </th>
            {roundColumns.map(round => (
              <th key={round} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200">
                Rnd{round}
              </th>
            ))}
            {showTiebreakers && (
              <>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200">
                  BH
                </th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200">
                  SB
                </th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200">
                  Perf
                </th>
              </>
            )}
            {showPrizes && (
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Prize
              </th>
            )}
          </tr>
        </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sectionStandings.map((player) => (
                  <tr key={player.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                      {player.rank}.
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                      {formatPlayerName(player)}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                      {player.uscf_id || ''}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                      {formatRating(player.rating)}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm font-bold text-gray-900 border-r border-gray-200 text-center">
                      {formatPoints(player.total_points)}
                    </td>
                    {roundColumns.map(round => (
                      <td key={round} className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 text-center">
                        {formatRoundResult(player.roundResults[round], round)}
                      </td>
                    ))}
                    {showTiebreakers && (
                      <>
                        <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 text-center">
                          {formatTiebreaker(player.tiebreakers.buchholz)}
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 text-center">
                          {formatTiebreaker(player.tiebreakers.sonnebornBerger)}
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 text-center">
                          {formatTiebreaker(player.tiebreakers.performanceRating)}
                        </td>
                      </>
                    )}
                    {showPrizes && (
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {player.prize || ''}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChessStandingsTable;
