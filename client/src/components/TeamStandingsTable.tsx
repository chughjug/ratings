import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

interface TeamPlayer {
  name: string;
  points?: number;
  player_points?: number;
  rating?: number;
  games_played?: number;
}

interface TeamStanding {
  team_name: string;
  team_id?: string;
  rank?: number;
  score: number;
  team_total_points?: number;
  total_members: number;
  counted_players?: number;
  progressive_scores?: number[]; // Round-by-round cumulative scores
  match_points?: number;
  game_points?: number;
  match_wins?: number;
  match_draws?: number;
  match_losses?: number;
  matches_played?: number;
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
  players?: TeamPlayer[];
  section?: string;
}

interface TeamStandingsTableProps {
  standings: TeamStanding[];
  tournamentFormat: 'team-swiss' | 'team-round-robin' | 'swiss' | 'online' | 'quad';
  scoringMethod?: 'all_players' | 'top_players';
  topN?: number;
  showTiebreakers?: boolean;
  totalRounds?: number;
}

const TeamStandingsTable: React.FC<TeamStandingsTableProps> = ({
  standings,
  tournamentFormat,
  scoringMethod = 'all_players',
  topN,
  showTiebreakers = true,
  totalRounds = 7
}) => {
  console.log('TeamStandingsTable props:', {
    standings,
    tournamentFormat,
    scoringMethod,
    topN,
    showTiebreakers,
    totalRounds
  });

  // Use actual standings data from the API
  const displayStandings = standings;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const formatScore = (score: number | undefined) => {
    if (score === undefined || score === null) return '0.0';
    return score.toFixed(1);
  };

  const formatTiebreaker = (value: number | undefined) => {
    if (value === undefined || value === null) return '';
    return value.toFixed(1);
  };

  // Generate round columns
  const roundColumns = Array.from({ length: totalRounds }, (_, i) => i + 1);

  // Format team name with member count
  const formatTeamName = (team: TeamStanding) => {
    const memberCount = team.total_members || team.member_count || 0;
    return `${team.team_name} (${memberCount})`;
  };

  // Format round result for display (cumulative score)
  const formatRoundResult = (team: TeamStanding, round: number) => {
    if (!team.progressive_scores || team.progressive_scores.length === 0) {
      return '';
    }
    // progressive_scores is 0-indexed, round is 1-indexed
    if (round <= team.progressive_scores.length) {
      const score = team.progressive_scores[round - 1];
      return score !== undefined && score !== null ? score.toFixed(1) : '';
    }
    return '';
  };

  // Group standings by section
  const groupedStandings = displayStandings.reduce((acc, team) => {
    const section = team.section || 'All Teams';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(team);
    return acc;
  }, {} as Record<string, TeamStanding[]>);

  return (
    <div className="space-y-8">
      {displayStandings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Standings Available</h3>
            <p className="text-gray-600 mb-4">
              Team standings will appear here once players are assigned to teams and games have been played.
            </p>
            <div className="text-sm text-gray-500">
              <p>To see team standings:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Assign players to teams by setting their team names</li>
                <li>Play some games to generate results</li>
                <li>Team standings will be calculated based on individual player results</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        Object.entries(groupedStandings).map(([sectionName, sectionTeams]) => (
        <div key={sectionName} className="bg-white rounded-lg shadow">
          {/* Section Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-lg">
            <h3 className="text-lg font-semibold text-white">
              {sectionName} Team Standings
              <span className="ml-2 text-green-200 text-sm">
                ({sectionTeams.length} teams)
              </span>
            </h3>
          </div>
          
          {/* Standings Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-300 chess-standings-table">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                    No.
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                    Team Name
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                    {tournamentFormat === 'team-swiss' ? 'Pts' : 'MP'}
                  </th>
                  {tournamentFormat === 'team-swiss' ? null : (
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      GP
                    </th>
                  )}
                  {roundColumns.map(round => (
                    <th key={round} className="px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Rnd{round}
                    </th>
                  ))}
                  {showTiebreakers && (
                    <>
                      <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        BH
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        SB
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        Perf
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sectionTeams.map((team, index) => {
                  const rank = team.rank || index + 1;
                  return (
                  <tr key={team.team_id || team.team_name} className="hover:bg-gray-50">
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-300">
                      <div className="flex items-center">
                        {getRankIcon(rank)}
                        <span className="ml-2">{rank}.</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 border-r border-gray-300">
                      <div className="font-semibold">
                        {formatTeamName(team)}
                      </div>
                      {team.players && team.players.length > 0 ? (
                        <div className="text-xs text-gray-600 mt-1">
                          {team.players.slice(0, 3).map((player: any, playerIndex: number) => (
                            <div key={playerIndex} className="ml-4">
                              {player.name} ({formatScore(player.points || player.player_points || 0)},{player.rating || 0})
                            </div>
                          ))}
                          {team.players.length > 3 && (
                            <div className="ml-4 text-gray-500 italic">
                              +{team.players.length - 3} more
                            </div>
                          )}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-300 text-center">
                      <span className="font-semibold">
                        {formatScore(team.team_total_points || team.score || team.match_points || 0)}
                      </span>
                    </td>
                    {tournamentFormat === 'team-swiss' ? null : (
                      <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-300 text-center">
                        <span className="text-gray-700">
                          {formatScore(team.game_points || 0)}
                        </span>
                      </td>
                    )}
                    {roundColumns.map(round => (
                      <td key={round} className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 border-r border-gray-300 text-center">
                        {formatRoundResult(team, round)}
                      </td>
                    ))}
                    {showTiebreakers && (
                      <>
                        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 border-r border-gray-300 text-center">
                          {formatTiebreaker(team.buchholz)}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 border-r border-gray-300 text-center">
                          {formatTiebreaker(team.sonneborn_berger)}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 border-r border-gray-300 text-center">
                          {team.team_performance_rating || ''}
                        </td>
                      </>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))
      )}
    </div>
  );
};

export default TeamStandingsTable;