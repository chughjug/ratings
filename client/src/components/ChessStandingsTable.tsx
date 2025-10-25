import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import '../styles/pairing-system.css';

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
  tournamentId?: string;
}

const ChessStandingsTable: React.FC<ChessStandingsTableProps> = ({
  standings,
  tournament,
  selectedSection = 'all',
  showTiebreakers = true,
  showPrizes = true,
  tournamentId
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // Use tournamentId from props, fallback to URL params
  const actualTournamentId = tournamentId || id;
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
            <table className="standings-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Player's Name</th>
            <th>USCF</th>
            <th>Rating</th>
            <th className="score">Pts</th>
            {roundColumns.map(round => (
              <th key={round}>Rnd{round}</th>
            ))}
            {showTiebreakers && (
              <>
                <th>BH</th>
                <th>SB</th>
                <th>Perf</th>
              </>
            )}
            {showPrizes && (
              <th>Prize</th>
            )}
          </tr>
        </thead>
              <tbody>
                {sectionStandings.map((player) => (
                  <tr key={player.id}>
                    <td>
                      {player.rank}.
                    </td>
                    <td className="player">
                      <button
                        onClick={() => navigate(`/tournaments/${actualTournamentId}/player/${player.id}`)}
                        className="underline hover:text-blue-600"
                      >
                        {formatPlayerName(player)}
                      </button>
                    </td>
                    <td>
                      {player.uscf_id || ''}
                    </td>
                    <td>
                      {formatRating(player.rating)}
                    </td>
                    <td className="score">
                      {formatPoints(player.total_points)}
                    </td>
                    {roundColumns.map(round => (
                      <td key={round} className="opponent">
                        {formatRoundResult(player.roundResults[round], round)}
                      </td>
                    ))}
                    {showTiebreakers && (
                      <>
                        <td>
                          {formatTiebreaker(player.tiebreakers.buchholz)}
                        </td>
                        <td>
                          {formatTiebreaker(player.tiebreakers.sonnebornBerger)}
                        </td>
                        <td>
                          {formatTiebreaker(player.tiebreakers.performanceRating)}
                        </td>
                      </>
                    )}
                    {showPrizes && (
                      <td>
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
