const { v4: uuidv4 } = require('uuid');

/**
 * Club Rating Service
 * Implements custom club rating system with auto-generation
 * Uses a simplified rating system (similar to Elo/Glicko)
 */
class ClubRatingService {
  constructor(db) {
    this.db = db;
    this.INITIAL_RATING = 1500;
    this.INITIAL_DEVIATION = 350;
    this.K_FACTOR = 32; // Standard K-factor for rating adjustments
  }

  /**
   * Initialize rating for a member if it doesn't exist
   */
  async initializeRating(organizationId, memberId, ratingType = 'regular', initialRating = null) {
    return new Promise((resolve, reject) => {
      // Check if rating exists
      this.db.get(
        `SELECT id FROM club_ratings 
         WHERE organization_id = ? AND member_id = ? AND rating_type = ?`,
        [organizationId, memberId, ratingType],
        (err, existing) => {
          if (err) {
            reject(err);
            return;
          }

          if (existing) {
            resolve(existing);
            return;
          }

          // Create new rating
          const ratingId = uuidv4();
          const rating = initialRating || this.INITIAL_RATING;

          this.db.run(
            `INSERT INTO club_ratings 
              (id, organization_id, member_id, rating_type, rating, rating_deviation)
              VALUES (?, ?, ?, ?, ?, ?)`,
            [ratingId, organizationId, memberId, ratingType, rating, this.INITIAL_DEVIATION],
            function(insertErr) {
              if (insertErr) {
                reject(insertErr);
              } else {
                resolve({ id: ratingId, rating });
              }
            }
          );
        }
      );
    });
  }

  /**
   * Calculate expected score (probability of winning)
   */
  expectedScore(ratingA, ratingB) {
    const diff = ratingB - ratingA;
    return 1 / (1 + Math.pow(10, diff / 400));
  }

  /**
   * Calculate new rating after a game
   */
  calculateNewRating(currentRating, opponentRating, result, kFactor = null) {
    const k = kFactor || this.K_FACTOR;
    const expected = this.expectedScore(currentRating, opponentRating);
    
    // Result: 1 = win, 0.5 = draw, 0 = loss
    const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    
    const ratingChange = Math.round(k * (actualScore - expected));
    const newRating = Math.max(100, currentRating + ratingChange); // Minimum rating of 100
    
    return {
      newRating,
      ratingChange,
      expectedScore: expected,
      actualScore
    };
  }

  /**
   * Process game result and update ratings
   */
  async processGame(organizationId, memberId, opponentId, result, ratingType = 'regular', tournamentId = null, gameDate = null) {
    try {
      // Ensure both players have ratings
      await this.initializeRating(organizationId, memberId, ratingType);
      await this.initializeRating(organizationId, opponentId, ratingType);

      // Get current ratings
      const [memberRating, opponentRating] = await Promise.all([
        this.getRating(organizationId, memberId, ratingType),
        this.getRating(organizationId, opponentId, ratingType)
      ]);

      if (!memberRating || !opponentRating) {
        throw new Error('Ratings not found');
      }

      // Calculate new ratings
      const memberCalc = this.calculateNewRating(
        memberRating.rating,
        opponentRating.rating,
        result
      );

      // Calculate opponent's result (opposite)
      const opponentResult = result === 'win' ? 'loss' : result === 'loss' ? 'win' : 'draw';
      const opponentCalc = this.calculateNewRating(
        opponentRating.rating,
        memberRating.rating,
        opponentResult
      );

      // Update member rating
      await this.updateRating(
        organizationId,
        memberId,
        ratingType,
        memberCalc.newRating,
        memberRating,
        memberCalc,
        opponentId,
        result,
        tournamentId,
        gameDate
      );

      // Update opponent rating
      await this.updateRating(
        organizationId,
        opponentId,
        ratingType,
        opponentCalc.newRating,
        opponentRating,
        opponentCalc,
        memberId,
        opponentResult,
        tournamentId,
        gameDate
      );

      return {
        success: true,
        member: {
          ratingBefore: memberRating.rating,
          ratingAfter: memberCalc.newRating,
          change: memberCalc.ratingChange
        },
        opponent: {
          ratingBefore: opponentRating.rating,
          ratingAfter: opponentCalc.newRating,
          change: opponentCalc.ratingChange
        }
      };
    } catch (error) {
      console.error('Error processing game:', error);
      throw error;
    }
  }

  /**
   * Get current rating
   */
  async getRating(organizationId, memberId, ratingType = 'regular') {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM club_ratings 
         WHERE organization_id = ? AND member_id = ? AND rating_type = ?`,
        [organizationId, memberId, ratingType],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  /**
   * Update rating and history
   */
  async updateRating(organizationId, memberId, ratingType, newRating, oldRating, calc, opponentId, result, tournamentId, gameDate) {
    return new Promise((resolve, reject) => {
      const historyId = uuidv4();
      const gameDateStr = gameDate || new Date().toISOString().split('T')[0];

      // Check if this is a new peak
      const isNewPeak = !oldRating.peak_rating || newRating > oldRating.peak_rating;

      this.db.serialize(() => {
        // Update rating
        this.db.run(
          `UPDATE club_ratings 
            SET rating = ?,
                games_played = games_played + 1,
                ${result === 'win' ? 'wins = wins + 1' : result === 'loss' ? 'losses = losses + 1' : 'draws = draws + 1'},
                last_game_date = ?,
                peak_rating = ?,
                peak_rating_date = CASE WHEN ? THEN ? ELSE peak_rating_date END,
                updated_at = CURRENT_TIMESTAMP
            WHERE organization_id = ? AND member_id = ? AND rating_type = ?`,
          [
            newRating,
            gameDateStr,
            isNewPeak ? newRating : oldRating.peak_rating,
            isNewPeak ? 1 : 0,
            gameDateStr,
            organizationId,
            memberId,
            ratingType
          ],
          (updateErr) => {
            if (updateErr) {
              reject(updateErr);
              return;
            }

            // Insert history record
            this.db.run(
              `INSERT INTO club_rating_history 
                (id, organization_id, member_id, rating_type, rating_before, rating_after, 
                 rating_change, tournament_id, opponent_id, result, game_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                historyId,
                organizationId,
                memberId,
                ratingType,
                oldRating.rating,
                newRating,
                calc.ratingChange,
                tournamentId || null,
                opponentId || null,
                result,
                gameDateStr
              ],
              (historyErr) => {
                if (historyErr) {
                  reject(historyErr);
                } else {
                  resolve({ success: true });
                }
              }
            );
          }
        );
      });
    });
  }

  /**
   * Auto-generate ratings from tournament results
   */
  async generateRatingsFromTournament(organizationId, tournamentId, ratingType = 'regular') {
    try {
      // Get all completed games from tournament
      const games = await new Promise((resolve, reject) => {
        this.db.all(
          `SELECT 
            p.id as pairing_id,
            p.white_player_id,
            p.black_player_id,
            p.result,
            p.round,
            white.name as white_name,
            black.name as black_name,
            white.uscf_id as white_uscf_id,
            black.uscf_id as black_uscf_id,
            t.start_date as game_date
          FROM pairings p
          JOIN players white ON p.white_player_id = white.id
          JOIN players black ON p.black_player_id = black.id
          JOIN tournaments t ON p.tournament_id = t.id
          WHERE p.tournament_id = ? 
            AND p.result IS NOT NULL 
            AND p.result != ''
            AND p.result NOT IN ('-', 'TBD')
            AND p.is_bye = 0
          ORDER BY p.round, p.board`,
          [tournamentId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      // Map players to club members by USCF ID or name
      const memberMap = new Map();
      for (const game of games) {
        // Try to find club members for white and black players
        const whiteMember = await this.findClubMemberByPlayer(organizationId, game.white_uscf_id, game.white_name);
        const blackMember = await this.findClubMemberByPlayer(organizationId, game.black_uscf_id, game.black_name);

        if (whiteMember && blackMember) {
          // Determine result
          let result;
          if (game.result === '1-0') {
            result = 'win'; // White wins
          } else if (game.result === '0-1') {
            result = 'loss'; // White loses (black wins)
          } else if (game.result === '1/2-1/2' || game.result === '0.5-0.5') {
            result = 'draw';
          } else {
            continue; // Skip invalid results
          }

          // Process game for white player
          await this.processGame(
            organizationId,
            whiteMember.id,
            blackMember.id,
            result,
            ratingType,
            tournamentId,
            game.game_date
          );

          console.log(`Processed game: ${game.white_name} vs ${game.black_name} - ${game.result}`);
        }
      }

      return {
        success: true,
        gamesProcessed: games.length,
        message: `Generated ratings from ${games.length} games`
      };
    } catch (error) {
      console.error('Error generating ratings:', error);
      throw error;
    }
  }

  /**
   * Find club member by player USCF ID or name
   */
  async findClubMemberByPlayer(organizationId, uscfId, playerName) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM club_members WHERE organization_id = ? AND (';
      const params = [organizationId];

      if (uscfId) {
        query += 'uscf_id = ? OR ';
        params.push(uscfId);
      }

      query += 'name LIKE ?) AND status = \'active\' LIMIT 1';
      params.push(`%${playerName}%`);

      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Get rating leaderboard
   */
  async getLeaderboard(organizationId, ratingType = 'regular', limit = 100) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT 
          cr.*,
          cm.name,
          cm.uscf_id
        FROM club_ratings cr
        JOIN club_members cm ON cr.member_id = cm.id
        WHERE cr.organization_id = ? 
          AND cr.rating_type = ?
          AND cm.status = 'active'
        ORDER BY cr.rating DESC, cr.games_played DESC
        LIMIT ?`,
        [organizationId, ratingType, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }
}

module.exports = ClubRatingService;

