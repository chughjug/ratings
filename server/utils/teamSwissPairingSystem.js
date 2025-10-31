/**
 * Team Swiss Pairing System
 * Implements board-by-board team tournaments using Swiss system pairing
 * 
 * How it works:
 * - Teams are paired using Swiss system based on team match scores
 * - Each team vs team match consists of multiple board games
 * - Players are assigned to boards by rating (board 1 = strongest)
 * - Board 1 vs Board 1, Board 2 vs Board 2, etc.
 * - Team wins the match by winning more individual boards
 */

const { EnhancedPairingSystem } = require('./enhancedPairingSystem');

class TeamSwissPairingSystem {
  constructor(teams, options = {}) {
    this.teams = teams; // Array of teams with members
    this.options = {
      minBoards: 4,
      maxBoards: 6,
      pairingSystem: 'fide_dutch',
      previousPairings: [],
      ...options
    };
    this.teamScores = {};
    this.colorHistory = {};
  }

  /**
   * Generate pairings for a round of team Swiss tournament
   */
  generatePairingsForRound(round) {
    if (!this.teams || this.teams.length < 2) {
      return [];
    }

    // Calculate current team standings/scores
    this.calculateTeamScores();

    // Pair teams using Swiss system
    const teamPairings = this.pairTeams(round);

    // Generate board-by-board pairings for each team match
    const individualPairings = [];

    teamPairings.forEach((teamMatch, index) => {
      const boardPairings = this.generateBoardPairings(teamMatch, round);
      individualPairings.push(...boardPairings);
    });

    return individualPairings;
  }

  /**
   * Calculate team scores from previous results
   */
  calculateTeamScores() {
    this.teams.forEach(team => {
      // Initialize score if not set
      if (!this.teamScores[team.id]) {
        this.teamScores[team.id] = {
          matchPoints: 0,
          gamePoints: 0,
          matchWins: 0,
          matchDraws: 0,
          matchLosses: 0
        };
      }
    });
  }

  /**
   * Pair teams using Swiss system
   */
  pairTeams(round) {
    const teams = [...this.teams];
    const pairings = [];

    // Sort teams by score (match points, then game points)
    teams.sort((a, b) => {
      const scoreA = this.teamScores[a.id] || { matchPoints: 0, gamePoints: 0 };
      const scoreB = this.teamScores[b.id] || { matchPoints: 0, gamePoints: 0 };

      if (scoreA.matchPoints !== scoreB.matchPoints) {
        return scoreB.matchPoints - scoreA.matchPoints;
      }
      return scoreB.gamePoints - scoreA.gamePoints;
    });

    // Handle bye for odd number of teams
    const needsBye = teams.length % 2 === 1;
    if (needsBye) {
      // Lowest scoring team gets bye
      const byeTeam = teams.pop();
      pairings.push({
        team1Id: byeTeam.id,
        team1Name: byeTeam.name,
        team2Id: null,
        team2Name: null,
        isBye: true,
        boardCount: 0
      });
    }

    // Pair teams in score groups
    const pairedIndices = new Set();
    
    for (let i = 0; i < teams.length; i++) {
      if (pairedIndices.has(i)) continue;

      // Find opponent in same or adjacent score group
      let opponentIndex = this.findOpponent(i, teams, pairedIndices, round);

      if (opponentIndex !== -1) {
        const team1 = teams[i];
        const team2 = teams[opponentIndex];
        
        pairings.push({
          team1Id: team1.id,
          team1Name: team1.name,
          team2Id: team2.id,
          team2Name: team2.name,
          isBye: false,
          boardCount: this.getBoardCount(team1, team2)
        });

        pairedIndices.add(i);
        pairedIndices.add(opponentIndex);
      }
    }

    return pairings;
  }

  /**
   * Find appropriate opponent for a team
   */
  findOpponent(teamIndex, teams, pairedIndices, round) {
    const team = teams[teamIndex];
    const teamScore = this.teamScores[team.id] || { matchPoints: 0, gamePoints: 0 };
    const previousOpponents = this.getPreviousOpponents(team.id);

    // Try to find opponent in same score group
    for (let i = 0; i < teams.length; i++) {
      if (i === teamIndex || pairedIndices.has(i)) continue;

      const opponent = teams[i];
      const opponentScore = this.teamScores[opponent.id] || { matchPoints: 0, gamePoints: 0 };

      // Same score group
      if (teamScore.matchPoints === opponentScore.matchPoints) {
        // Haven't played before
        if (!previousOpponents.has(opponent.id)) {
          return i;
        }
      }
    }

    // If no same-score opponent available, try adjacent scores
    for (let diff = 1; diff <= 2; diff++) {
      for (let i = 0; i < teams.length; i++) {
        if (i === teamIndex || pairedIndices.has(i)) continue;

        const opponent = teams[i];
        const opponentScore = this.teamScores[opponent.id] || { matchPoints: 0, gamePoints: 0 };

        if (Math.abs(teamScore.matchPoints - opponentScore.matchPoints) === diff) {
          if (!previousOpponents.has(opponent.id)) {
            return i;
          }
        }
      }
    }

    // If still no opponent, take first unpaired team
    for (let i = 0; i < teams.length; i++) {
      if (i !== teamIndex && !pairedIndices.has(i)) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Get previous opponents for a team
   */
  getPreviousOpponents(teamId) {
    const opponents = new Set();
    
    this.options.previousPairings.forEach(pairing => {
      if (pairing.team1Id === teamId) {
        opponents.add(pairing.team2Id);
      } else if (pairing.team2Id === teamId) {
        opponents.add(pairing.team1Id);
      }
    });

    return opponents;
  }

  /**
   * Get number of boards for a team match
   */
  getBoardCount(team1, team2) {
    const count1 = team1.members ? team1.members.length : team1.member_count || 4;
    const count2 = team2.members ? team2.members.length : team2.member_count || 4;
    
    // Use minimum to ensure all boards can be filled
    return Math.min(count1, count2, this.options.maxBoards);
  }

  /**
   * Generate board-by-board pairings for a team match
   */
  generateBoardPairings(teamMatch, round) {
    if (teamMatch.isBye) {
      return this.generateByePairings(teamMatch);
    }

    const team1 = this.teams.find(t => t.id === teamMatch.team1Id);
    const team2 = this.teams.find(t => t.id === teamMatch.team2Id);

    if (!team1 || !team2) {
      return [];
    }

    const team1Members = this.getBoardOrderedPlayers(team1);
    const team2Members = this.getBoardOrderedPlayers(team2);
    const boardCount = teamMatch.boardCount;

    const pairings = [];

    for (let board = 1; board <= boardCount; board++) {
      const player1 = team1Members[board - 1];
      const player2 = team2Members[board - 1];

      if (!player1 || !player2) {
        continue; // Not enough players for this board
      }

      // Assign colors based on board number and round
      const { white, black } = this.assignColors(player1, player2, board, round);

      pairings.push({
        team1Id: team1.id,
        team1Name: team1.name,
        team2Id: team2.id,
        team2Name: team2.name,
        board: board,
        white_player_id: white.id,
        white_name: white.name,
        white_rating: white.rating,
        black_player_id: black.id,
        black_name: black.name,
        black_rating: black.rating,
        is_bye: false
      });
    }

    return pairings;
  }

  /**
   * Get players ordered by board (highest rated on board 1)
   */
  getBoardOrderedPlayers(team) {
    const members = team.members || [];
    return members.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  /**
   * Assign colors for a board pairing
   * Board 1 = top board, important match
   * Colors alternate: Board 1 Round 1 = team1 white
   * Board 2 Round 1 = team2 white, etc.
   */
  assignColors(player1, player2, board, round) {
    // Team 1 gets white on odd boards in odd rounds
    // Team 1 gets white on even boards in even rounds
    const team1White = (board % 2 === 1 && round % 2 === 1) || (board % 2 === 0 && round % 2 === 0);

    if (team1White) {
      return { white: player1, black: player2 };
    } else {
      return { white: player2, black: player1 };
    }
  }

  /**
   * Generate bye pairings (team plays itself on all boards)
   */
  generateByePairings(teamMatch) {
    const team = this.teams.find(t => t.id === teamMatch.team1Id);
    if (!team) return [];

    const members = this.getBoardOrderedPlayers(team);
    const pairings = [];

    members.forEach((player, index) => {
      pairings.push({
        team1Id: team.id,
        team1Name: team.name,
        team2Id: null,
        team2Name: null,
        board: index + 1,
        white_player_id: player.id,
        white_name: player.name,
        white_rating: player.rating,
        black_player_id: null,
        black_name: 'BYE',
        black_rating: 0,
        is_bye: true
      });
    });

    return pairings;
  }

  /**
   * Static method to generate tournament-wide team pairings
   */
  static async generateTournamentTeamPairings(tournamentId, round, db, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check tournament format - only team tournaments should use this system
        const tournament = await new Promise((resolve, reject) => {
          db.get('SELECT format FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        if (!tournament) {
          reject(new Error('Tournament not found'));
          return;
        }

        // Verify this is a team tournament
        if (tournament.format !== 'team-swiss' && tournament.format !== 'team-round-robin' && tournament.format !== 'team-tournament') {
          reject(new Error(`This tournament is not a team tournament (format: ${tournament.format}). Use the individual pairing system instead.`));
          return;
        }

        // Get all teams with members
        const teams = await new Promise((resolve, reject) => {
          db.all(
            `SELECT 
              t.id,
              t.name,
              t.tournament_id,
              GROUP_CONCAT(p.id) as member_ids
            FROM teams t
            LEFT JOIN team_members tm ON t.id = tm.team_id
            LEFT JOIN players p ON tm.player_id = p.id
            WHERE t.tournament_id = ? AND t.status = 'active'
            GROUP BY t.id, t.name
            HAVING COUNT(p.id) > 0`,
            [tournamentId],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        if (teams.length < 2) {
          reject(new Error('Need at least 2 teams for team tournament'));
          return;
        }

        // Get team members for each team
        const teamsWithMembers = await Promise.all(
          teams.map(async (team) => {
            const memberIds = team.member_ids ? team.member_ids.split(',') : [];
            
            if (memberIds.length === 0) {
              return null;
            }

            const members = await new Promise((resolve, reject) => {
              db.all(
                'SELECT id, name, rating, uscf_id FROM players WHERE id IN (' + memberIds.map(() => '?').join(',') + ') ORDER BY rating DESC',
                memberIds,
                (err, rows) => {
                  if (err) reject(err);
                  else resolve(rows);
                }
              );
            });

            return {
              ...team,
              members: members,
              member_count: members.length
            };
          })
        );

        const validTeams = teamsWithMembers.filter(t => t !== null);

        // Get previous team pairings
        const previousPairings = await new Promise((resolve, reject) => {
          db.all(
            `SELECT DISTINCT team1Id, team2Id FROM pairings 
             WHERE tournament_id = ? AND round < ? AND team1Id IS NOT NULL AND team2Id IS NOT NULL
             GROUP BY team1Id, team2Id`,
            [tournamentId, round],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        // Generate pairings
        const system = new TeamSwissPairingSystem(validTeams, {
          previousPairings: previousPairings,
          minBoards: 4,
          maxBoards: 6,
          pairingSystem: options.pairingSystem || 'fide_dutch'
        });

        const pairings = system.generatePairingsForRound(round);

        resolve({
          success: true,
          pairings: pairings,
          teamCount: validTeams.length,
          totalGames: pairings.filter(p => !p.is_bye).length,
          totalByes: pairings.filter(p => p.is_bye).length
        });

      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = TeamSwissPairingSystem;
