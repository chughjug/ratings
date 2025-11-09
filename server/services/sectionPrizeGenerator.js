/**
 * Section Prize Generator
 * -----------------------
 * Lightweight prize distribution logic that runs when a tournament section
 * finishes its final round. This implementation intentionally does not rely on
 * the legacy prizeService module and instead derives winners directly from the
 * database using a simple, configurable template:
 *
 * Tournament settings can include a `newPrizeTemplates` array:
 * {
 *   "newPrizeTemplates": [
 *     {
 *       "section": "Open",
 *       "prizes": [
 *         { "name": "Champion", "position": 1, "amount": 150, "type": "cash" },
 *         { "name": "Runner-Up", "position": 2, "amount": 75 },
 *         { "name": "Top Under 1800", "position": 3 }
 *       ]
 *     }
 *   ]
 * }
 *
 * If no custom template is provided, a default three-place template is used.
 */

const DEFAULT_TEMPLATE = [
  { name: 'Champion', position: 1, share: 0.5, type: 'trophy' },
  { name: 'Runner-Up', position: 2, share: 0.3, type: 'medal' },
  { name: 'Third Place', position: 3, share: 0.2, type: 'medal' }
];

const normalizeSectionKey = (value) => {
  if (!value) return 'open';
  return value.toString().trim().toLowerCase();
};

const parseNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolveAwardType = (prize, computedAmount) => {
  if (prize.type && typeof prize.type === 'string') {
    return prize.type;
  }
  if (prize.awardType && typeof prize.awardType === 'string') {
    return prize.awardType;
  }
  if (computedAmount && computedAmount > 0) {
    return 'cash';
  }
  if (prize.position === 1) {
    return 'trophy';
  }
  if (prize.position === 2 || prize.position === 3) {
    return 'medal';
  }
  return 'recognition';
};

const sanitizePrizeTemplate = (template, fallbackCashPool) => {
  if (!Array.isArray(template) || template.length === 0) {
    return DEFAULT_TEMPLATE.map(item => ({ ...item }));
  }

  return template.map((prize, index) => {
    const amount = prize.amount !== undefined ? parseNumber(prize.amount) : null;
    const share = prize.share !== undefined ? parseNumber(prize.share) : null;

    let computedAmount = null;
    if (amount !== null && amount > 0) {
      computedAmount = amount;
    } else if (share !== null && share > 0 && fallbackCashPool > 0) {
      computedAmount = Math.round(fallbackCashPool * share * 100) / 100;
    }

    const awardType = resolveAwardType(prize, computedAmount);

    return {
      name: prize.name || prize.label || `Prize ${index + 1}`,
      position: prize.position || index + 1,
      amount: computedAmount,
      type: awardType,
      metadata: {
        ...(prize.metadata || {}),
        awardType
      }
    };
  });
};

const fetchTournament = (db, tournamentId) =>
  new Promise((resolve, reject) => {
    db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const fetchSectionStandings = (db, tournamentId, normalizedSection) =>
  new Promise((resolve, reject) => {
    db.all(
      `
        SELECT 
          p.id AS player_id,
          p.name AS player_name,
          p.rating AS player_rating,
          p.section AS player_section,
          COALESCE(SUM(r.points), 0) AS total_points,
          COUNT(CASE WHEN r.points IS NOT NULL THEN 1 END) AS games_played
        FROM players p
        LEFT JOIN results r 
          ON r.tournament_id = p.tournament_id 
          AND r.player_id = p.id
        WHERE 
          p.tournament_id = ? 
          AND (p.status = 'active' OR p.status IS NULL)
          AND LOWER(COALESCE(p.section, 'open')) = ?
        GROUP BY p.id
        ORDER BY total_points DESC, p.rating DESC, p.name ASC
      `,
      [tournamentId, normalizedSection],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

async function generateSectionPrizeDistribution(tournamentId, sectionName, db, options = {}) {
  if (!tournamentId) {
    throw new Error('tournamentId is required to generate prizes');
  }

  const targetSection = sectionName || 'Open';
  const normalizedSection = normalizeSectionKey(targetSection);
  const tournament = await fetchTournament(db, tournamentId);
  const customPrizes = Array.isArray(options?.prizes) ? options.prizes : null;

  if (!tournament) {
    return {
      tournamentId,
      section: targetSection,
      prizesAwarded: [],
      metadata: { reason: 'TOURNAMENT_NOT_FOUND' }
    };
  }

  let tournamentSettings = {};
  if (tournament.settings) {
    try {
      tournamentSettings = JSON.parse(tournament.settings);
    } catch (error) {
      console.warn(`[SectionPrizeGenerator] Failed to parse settings for tournament ${tournamentId}:`, error.message);
    }
  }

  const configuredTemplates = Array.isArray(tournamentSettings?.newPrizeTemplates)
    ? tournamentSettings.newPrizeTemplates
    : [];

  const matchingTemplate = configuredTemplates.find(sectionConfig => {
    const key = normalizeSectionKey(sectionConfig.section || sectionConfig.name);
    return key === normalizedSection;
  });

  const prizeFund = parseNumber(
    matchingTemplate?.prizeFund ??
    tournamentSettings?.prizeFund ??
    tournament.prize_fund
  );

  const effectiveTemplateSource = customPrizes && customPrizes.length > 0 ? customPrizes : matchingTemplate?.prizes;
  const templatePrizes = sanitizePrizeTemplate(effectiveTemplateSource, prizeFund);
  const standings = await fetchSectionStandings(db, tournamentId, normalizedSection);

  if (!standings || standings.length === 0) {
    return {
      tournamentId,
      section: targetSection,
      prizesAwarded: [],
      metadata: { reason: 'NO_ELIGIBLE_PLAYERS', evaluatedPlayers: 0 }
    };
  }

  const standingsSnapshot = standings.map(player => ({
    playerId: player.player_id,
    name: player.player_name,
    rating: player.player_rating,
    totalPoints: player.total_points,
    gamesPlayed: player.games_played
  }));

  const prizeQueue = [...templatePrizes].sort((a, b) => {
    const posA = typeof a.position === 'number' ? a.position : Number.MAX_SAFE_INTEGER;
    const posB = typeof b.position === 'number' ? b.position : Number.MAX_SAFE_INTEGER;
    if (posA !== posB) {
      return posA - posB;
    }
    if (a.type === 'cash' && b.type !== 'cash') return -1;
    if (a.type !== 'cash' && b.type === 'cash') return 1;
    return 0;
  });

  const awards = [];
  const cashWinners = new Set();
  const nonCashWinners = new Set();
  let prizeCursor = 0;
  let positionCursor = 1;

  const groupedByScore = standings.reduce((map, player) => {
    const score = player.total_points || 0;
    if (!map.has(score)) {
      map.set(score, []);
    }
    map.get(score).push(player);
    return map;
  }, new Map());

  const sortedScores = Array.from(groupedByScore.keys()).sort((a, b) => b - a);

  sortedScores.forEach(score => {
    const groupPlayers = groupedByScore.get(score) || [];
    if (groupPlayers.length === 0) {
      return;
    }

    const groupSize = groupPlayers.length;
    const groupEndPosition = positionCursor + groupSize - 1;
    const groupPrizes = [];

    while (prizeCursor < prizeQueue.length) {
      const nextPrize = prizeQueue[prizeCursor];
      const prizePosition = typeof nextPrize.position === 'number' ? nextPrize.position : null;

      if (prizePosition !== null && prizePosition < positionCursor) {
        prizeCursor += 1;
        continue;
      }

      if (prizePosition !== null && prizePosition <= groupEndPosition) {
        groupPrizes.push({ ...nextPrize });
        prizeCursor += 1;
      } else {
        break;
      }
    }

    const cashPrizes = groupPrizes.filter(prize => prize.type === 'cash' && parseNumber(prize.amount) > 0);
    const nonCashPrizes = groupPrizes.filter(prize => prize.type !== 'cash');

    if (cashPrizes.length > 0) {
      const totalCash = cashPrizes.reduce((sum, prize) => sum + parseNumber(prize.amount || 0), 0);
      const maxPrizeAmount = cashPrizes.reduce((max, prize) => Math.max(max, parseNumber(prize.amount || 0)), 0);

      if (totalCash > 0) {
        const baseShare = Math.floor((totalCash / groupSize) * 100) / 100;
        const amounts = Array(groupSize).fill(baseShare);
        let remainder = Math.round(totalCash * 100) - Math.round(baseShare * 100) * groupSize;
        let idx = 0;
        while (remainder > 0 && groupSize > 0) {
          amounts[idx] = Math.round((amounts[idx] + 0.01) * 100) / 100;
          remainder -= 1;
          idx = (idx + 1) % groupSize;
        }

        const cappedAmounts = amounts.map(amount => Math.min(amount, maxPrizeAmount));
        const cashPrizeLabel = cashPrizes.length === 1
          ? cashPrizes[0].name
          : `Tied ${cashPrizes.map(prize => prize.name).join(' + ')}`;
        const primaryPosition = cashPrizes.reduce(
          (min, prize) => typeof prize.position === 'number' ? Math.min(min, prize.position) : min,
          positionCursor
        );

        groupPlayers.forEach((player, index) => {
          if (cashWinners.has(player.player_id)) {
            return;
          }
          const share = cappedAmounts[index] || 0;
          if (share <= 0) {
            return;
          }

          cashWinners.add(player.player_id);
          awards.push({
            tournamentId,
            section: targetSection,
            position: primaryPosition,
            prizeName: cashPrizeLabel,
            prizeType: 'cash',
            prizeAmount: share,
            playerId: player.player_id,
            playerName: player.player_name,
            playerRating: player.player_rating,
            totalPoints: player.total_points,
            gamesPlayed: player.games_played,
            section: player.player_section || targetSection,
            player: {
              id: player.player_id,
              name: player.player_name,
              rating: player.player_rating,
              section: player.player_section || targetSection,
              totalPoints: player.total_points,
              gamesPlayed: player.games_played
            },
            history: standingsSnapshot,
            metadata: {
              awardType: 'cash',
              pooledAmount: totalCash,
              shareCount: groupSize,
              maxIndividualShare: maxPrizeAmount,
              scoreGroup: score,
              guideline: 'USCF 32B2-32B3 (pooled cash prizes)'
            }
          });
        });
      }
    }

    nonCashPrizes.forEach((prize, index) => {
      const player = groupPlayers[index];
      if (!player) {
        return;
      }
      if (nonCashWinners.has(player.player_id)) {
        return;
      }

      nonCashWinners.add(player.player_id);
      awards.push({
        tournamentId,
        section: targetSection,
        position: prize.position ?? positionCursor,
        prizeName: prize.name,
        prizeType: prize.type,
        prizeAmount: null,
        playerId: player.player_id,
        playerName: player.player_name,
        playerRating: player.player_rating,
        totalPoints: player.total_points,
        gamesPlayed: player.games_played,
        section: player.player_section || targetSection,
        player: {
          id: player.player_id,
          name: player.player_name,
          rating: player.player_rating,
          section: player.player_section || targetSection,
          totalPoints: player.total_points,
          gamesPlayed: player.games_played
        },
        history: standingsSnapshot,
        metadata: {
          awardType: prize.type,
          guideline: 'USCF 32F-32G (non-cash prize allocation)',
          ...(prize.metadata || {})
        }
      });
    });

    positionCursor += groupSize;
  });

  return {
    tournamentId,
    section: targetSection,
    prizesAwarded: awards,
    metadata: {
      evaluatedPlayers: standings.length,
      templateSize: templatePrizes.length,
      prizeFund: prizeFund > 0 ? prizeFund : null,
      customTemplateUsed: Boolean(customPrizes && customPrizes.length > 0),
      templatePrizes,
      guidelines: {
        standard: 'US Chess Official Rules (7th Ed., rev. Jan 1 2025)',
        references: ['32B-32G', '33D', '34B-34E'],
        notes: 'Cash prizes pooled and split by tied score groups; non-cash prizes assigned once per player.'
      }
    }
  };
}

module.exports = {
  generateSectionPrizeDistribution
};

