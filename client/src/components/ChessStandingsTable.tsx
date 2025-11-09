import React from 'react';
import { Link, useParams } from 'react-router-dom';
import '../styles/pairing-system.css';

interface RoundResult {
  result: string;
  opponent_name: string;
  opponent_rating?: number;
  opponent_rank?: number;
  opponent_id?: string;
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
  showSectionHeader?: boolean;
  className?: string;
}

const ChessStandingsTable: React.FC<ChessStandingsTableProps> = ({
  standings,
  tournament,
  selectedSection = 'all',
  showTiebreakers = true,
  showPrizes = true,
  tournamentId,
  showSectionHeader = true,
  className
}) => {
  const { id } = useParams<{ id: string }>();

  const isPrintContext = className === 'print';
  
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
    const colorSymbol = color === 'white' ? '(w)' : '(b)'; // Show the player's actual color
    
    // Show opponent's rank if available, otherwise show TBD
    const opponentDisplay = opponent_rank ? opponent_rank.toString() : 'TBD';
    
    return `${resultSymbol}${opponentDisplay} ${colorSymbol}`;
  };

  // Format player name with title
  const formatPlayerName = (player: PlayerStanding) => {
    // Return the name as-is, preserving titles
    return player.name;
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
  const sanitizeSectionName = (value?: string) => {
    if (!value) return 'open';
    return value.trim().replace(/\s+section$/i, '').toLowerCase();
  };

  const getSectionLabel = (section?: string) => {
    const raw = (section || 'Open').trim();
    const noSuffix = raw.replace(/\s+section$/i, '').trim();
    return noSuffix === '' ? 'Open' : noSuffix;
  };

  const normalizedSelectedSection = sanitizeSectionName(selectedSection || '');
  const shouldFilterBySection =
    normalizedSelectedSection !== '' &&
    normalizedSelectedSection !== 'open' &&
    normalizedSelectedSection !== 'all' &&
    normalizedSelectedSection !== 'all sections';

  const totalRounds = Math.max(0, Number(tournament?.rounds) || 0);
  const roundColumns = Array.from({ length: totalRounds }, (_, i) => i + 1);

  const filteredStandings = shouldFilterBySection
    ? standings.filter(player => sanitizeSectionName(player.section) === normalizedSelectedSection)
    : standings;

  const groupedStandingsMap = filteredStandings.reduce((acc, player) => {
    const key = sanitizeSectionName(player.section);
    if (!acc[key]) {
      acc[key] = {
        label: getSectionLabel(player.section),
        players: [] as PlayerStanding[]
      };
    }
    acc[key].players.push(player);
    return acc;
  }, {} as Record<string, { label: string; players: PlayerStanding[] }>);

  const sectionOrder = Object.values(groupedStandingsMap)
    .map(group => group.label)
    .sort((a, b) => {
      if (a.toLowerCase() === 'open') return -1;
      if (b.toLowerCase() === 'open') return 1;
      return a.localeCompare(b);
    });

  const sectionLookup = new Map(sectionOrder.map(label => [label, groupedStandingsMap[sanitizeSectionName(label)].players]));

  const containerClassName = [
    'space-y-6 overflow-visible',
    className === 'print' ? 'print-standings-table' : className
  ].filter(Boolean).join(' ');

  if (sectionOrder.length === 0) {
    return null;
  }

  return (
    <div className={containerClassName}>
      {sectionOrder.map(sectionName => {
        const sectionStandings = sectionLookup.get(sectionName) || [];

        const playersByRank = new Map<number, PlayerStanding>();
        sectionStandings.forEach(sectionPlayer => {
          if ((sectionPlayer as PlayerStanding).rank != null) {
            playersByRank.set(
              Number((sectionPlayer as PlayerStanding).rank),
              sectionPlayer as PlayerStanding
            );
          }
        });

        return (
          <div
            key={sectionName}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            {showSectionHeader && (
              <div className="flex flex-col gap-1 border-b border-gray-200 bg-gray-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {sectionName} Section
                </h3>
                <span className="text-sm font-medium text-gray-500">
                  {sectionStandings.length} {sectionStandings.length === 1 ? 'player' : 'players'}
                </span>
              </div>
            )}

            <div className="relative">
              <div className="overflow-x-auto">
                <table className="standings-table min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      <th scope="col" className="px-4 py-3 text-center">No.</th>
                      <th scope="col" className="px-4 py-3 text-left">Player</th>
                      <th scope="col" className="px-4 py-3 text-left">USCF</th>
                      <th scope="col" className="px-4 py-3 text-center">Rating</th>
                      <th scope="col" className="px-4 py-3 text-center">Pts</th>
                      {roundColumns.map(round => (
                        <th key={round} scope="col" className="px-3 py-3 text-center">
                          Rnd {round}
                        </th>
                      ))}
                      {showTiebreakers && (
                        <>
                          <th scope="col" className="px-3 py-3 text-center">BH</th>
                          <th scope="col" className="px-3 py-3 text-center">SB</th>
                          <th scope="col" className="px-3 py-3 text-center">Perf</th>
                        </>
                      )}
                      {showPrizes && (
                        <th scope="col" className="px-4 py-3 text-center">Prize</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {sectionStandings.map(player => (
                      <tr
                        key={player.id}
                        className="transition-colors even:bg-gray-50 hover:bg-blue-50/60"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-900">
                          {player.rank}.
                        </td>
                        <td className={`whitespace-nowrap px-4 py-3 text-left ${isPrintContext ? 'text-xs font-semibold text-black' : ''}`}>
                          {actualTournamentId && !isPrintContext ? (
                            <Link
                              to={`/tournaments/${actualTournamentId}/player/${player.id}`}
                              className="text-left text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              {formatPlayerName(player)}
                            </Link>
                          ) : (
                            <span className={isPrintContext ? 'text-xs font-semibold text-black' : 'text-sm font-semibold text-gray-900'}>
                              {formatPlayerName(player)}
                            </span>
                          )}
                          {player.games_played !== undefined && (
                            <span className={`block text-xs ${isPrintContext ? 'text-black' : 'text-gray-500'}`}>
                              {player.games_played} games • {player.wins || 0}W {player.draws || 0}D {player.losses || 0}L
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-left text-sm text-gray-700">
                          {player.uscf_id || '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-medium text-gray-900">
                          {player.rating ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-semibold text-blue-600">
                          {formatPoints(player.total_points)}
                        </td>
                        {roundColumns.map(round => {
                          const roundResult = player.roundResults?.[round];
                          const opponent =
                            roundResult?.opponent_id
                              ? sectionStandings.find(sectionPlayer => sectionPlayer.id === roundResult.opponent_id)
                              : roundResult?.opponent_rank
                                ? playersByRank.get(roundResult.opponent_rank)
                                : undefined;
                          const roundLabel = formatRoundResult(roundResult, round);
                          const opponentLink =
                            actualTournamentId && opponent
                              ? `/tournaments/${actualTournamentId}/player/${opponent.id}`
                              : undefined;

                          return (
                            <td
                              key={round}
                              className={`whitespace-nowrap px-3 py-3 text-center text-xs font-medium ${
                                isPrintContext ? 'text-black' : 'text-gray-700'
                              }`}
                            >
                              {opponentLink && !isPrintContext ? (
                                <Link
                                  to={opponentLink}
                                  className="rounded-full bg-blue-50 px-2 py-1 text-blue-700 transition hover:bg-blue-100"
                                >
                                  {roundLabel}
                                </Link>
                              ) : (
                                roundLabel
                              )}
                            </td>
                          );
                        })}
                        {showTiebreakers && (
                          <>
                            <td className={`whitespace-nowrap px-3 py-3 text-center text-xs ${isPrintContext ? 'text-black' : 'text-gray-600'}`}>
                              {formatTiebreaker(player.tiebreakers?.buchholz)}
                            </td>
                            <td className={`whitespace-nowrap px-3 py-3 text-center text-xs ${isPrintContext ? 'text-black' : 'text-gray-600'}`}>
                              {formatTiebreaker(player.tiebreakers?.sonnebornBerger)}
                            </td>
                            <td className={`whitespace-nowrap px-3 py-3 text-center text-xs ${isPrintContext ? 'text-black' : 'text-gray-600'}`}>
                              {formatTiebreaker(player.tiebreakers?.performanceRating)}
                            </td>
                          </>
                        )}
                        {showPrizes && (
                          <td className={`whitespace-nowrap px-4 py-3 text-center text-sm ${isPrintContext ? 'text-black' : 'text-gray-700'}`}>
                            {player.prize || '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChessStandingsTable;
