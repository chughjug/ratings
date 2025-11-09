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

  const awards = [];
  templatePrizes.forEach((prize, index) => {
    const finalist = standings[index];
    if (!finalist) {
      return;
    }

    awards.push({
      tournamentId,
      section: targetSection,
      position: prize.position,
      prizeName: prize.name,
      prizeType: prize.type,
      prizeAmount: prize.amount,
      playerId: finalist.player_id,
      playerName: finalist.player_name,
      playerRating: finalist.player_rating,
      totalPoints: finalist.total_points,
      gamesPlayed: finalist.games_played,
      section: finalist.player_section || targetSection,
      player: {
        id: finalist.player_id,
        name: finalist.player_name,
        rating: finalist.player_rating,
        section: finalist.player_section || targetSection,
        totalPoints: finalist.total_points,
        gamesPlayed: finalist.games_played
      },
      history: standings.map(player => ({
        playerId: player.player_id,
        name: player.player_name,
        rating: player.player_rating,
        totalPoints: player.total_points,
        gamesPlayed: player.games_played
      })),
      metadata: {
        awardType: prize.type,
        ...(prize.metadata || {})
      }
    });
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
      templatePrizes
    }
  };
}

module.exports = {
  generateSectionPrizeDistribution
};

