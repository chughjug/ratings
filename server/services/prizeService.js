/**
 * Prize Service (US Chess Compliant)
 * ----------------------------------
 * This module recalculates event prizes from scratch using tournament standings
 * and pairing data. It enforces US Chess Rule 32B3 (split pooled prizes without
 * exceeding the largest single prize), keeps one cash prize per player, and
 * supports position, rating-class, and general prizes.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Helpers
 */
const normalizeSectionName = (value) => {
  if (!value || typeof value !== 'string') {
    return 'open';
  }
  return value.trim().replace(/\s+section$/i, '').toLowerCase();
};

const runAsync = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const fetchAsync = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });

const DEFAULT_PAYOUTS = [
  { position: 1, percentage: 0.4, name: '1st Place' },
  { position: 2, percentage: 0.25, name: '2nd Place' },
  { position: 3, percentage: 0.15, name: '3rd Place' },
  { position: 4, percentage: 0.1, name: '4th Place' },
  { position: 5, percentage: 0.1, name: '5th Place' }
];

/**
 * Standings + Pairing extraction
 */
async function getTournamentStandings(tournamentId, db) {
  const players = await fetchAsync(
    db,
    'SELECT * FROM players WHERE tournament_id = ? AND status = "active"',
    [tournamentId]
  );

  const resultsByPlayer = new Map();
  const rawResults = await fetchAsync(
    db,
    'SELECT * FROM results WHERE tournament_id = ? ORDER BY round',
    [tournamentId]
  );
  rawResults.forEach(result => {
    if (!resultsByPlayer.has(result.player_id)) {
      resultsByPlayer.set(result.player_id, []);
    }
    resultsByPlayer.get(result.player_id).push(result);
  });

  const pairings = await fetchAsync(
    db,
    'SELECT white_player_id, black_player_id, section FROM pairings WHERE tournament_id = ? AND section IS NOT NULL',
    [tournamentId]
  );

  const sectionFrequency = new Map();
  pairings.forEach(({ white_player_id: whiteId, black_player_id: blackId, section }) => {
    const record = (playerId) => {
      if (!playerId || !section) return;
      if (!sectionFrequency.has(playerId)) {
        sectionFrequency.set(playerId, new Map());
      }
      const counts = sectionFrequency.get(playerId);
      counts.set(section, (counts.get(section) || 0) + 1);
    };
    record(whiteId);
    record(blackId);
  });

  const playersWithStandings = players.map(player => {
    const gameResults = resultsByPlayer.get(player.id) || [];
    const totalPoints = gameResults.reduce((sum, result) => sum + (result.points || 0), 0);
    const wins = gameResults.filter(r => r.points === 1).length;
    const losses = gameResults.filter(r => r.points === 0).length;
    const draws = gameResults.filter(r => r.points === 0.5).length;

    const sectionCounts = sectionFrequency.get(player.id);
    let finalSection = player.section || 'Open';
    if (sectionCounts && sectionCounts.size > 0) {
      let maxCount = -1;
      sectionCounts.forEach((count, section) => {
        if (count > maxCount) {
          maxCount = count;
          finalSection = section;
        }
      });
    }

    return {
      id: player.id,
      name: player.name,
      rating: player.rating,
      section: finalSection,
      total_points: totalPoints,
      wins,
      losses,
      draws,
      games_played: gameResults.length,
      tiebreakers: {},
      results: gameResults
    };
  });

  return playersWithStandings;
}

async function calculateBasicTiebreakers(tournamentId, standings, db) {
  const playerMap = new Map(standings.map(player => [player.id, player]));
  const opponentScores = new Map();
  standings.forEach(player => {
    opponentScores.set(player.id, 0);
  });

  const results = await fetchAsync(
    db,
    'SELECT player_id, opponent_id, points FROM results WHERE tournament_id = ?',
    [tournamentId]
  );

  results.forEach(result => {
    const opponent = playerMap.get(result.opponent_id);
    if (!opponent) return;
    opponentScores.set(result.player_id, opponentScores.get(result.player_id) + opponent.total_points);
  });

  standings.forEach(player => {
    player.tiebreakers = {
      buchholz: opponentScores.get(player.id) || 0
    };
  });

  return standings;
}

/**
 * Prize configuration normalization
 */
function generateDefaultSection(sectionName, prizeFund = 0) {
  const prizes = [];
  if (prizeFund > 0) {
    DEFAULT_PAYOUTS.forEach(prize => {
      prizes.push({
        name: prize.name,
        type: 'cash',
        position: prize.position,
        amount: Math.round(prizeFund * prize.percentage * 100) / 100
      });
    });
  }

  prizes.push(
    { name: '1st Place Trophy', type: 'trophy', position: 1 },
    { name: '2nd Place Trophy', type: 'trophy', position: 2 },
    { name: '3rd Place Trophy', type: 'trophy', position: 3 }
  );

  return {
    name: sectionName,
    prizes
  };
}

function normalizePrizeSettings(tournament, standings, rawSettings) {
  const baseSettings = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
  const normalized = {
    enabled: Boolean(baseSettings.enabled),
    autoAssign: Boolean(baseSettings.autoAssign),
    sections: Array.isArray(baseSettings.sections) ? [...baseSettings.sections] : []
  };

  if (normalized.sections.length === 0) {
    const uniqueSections = new Map();
    standings.forEach(player => {
      const norm = normalizeSectionName(player.section || 'Open');
      if (!uniqueSections.has(norm)) {
        uniqueSections.set(norm, player.section || 'Open');
      }
    });
    uniqueSections.forEach(sectionName => {
      normalized.sections.push(generateDefaultSection(sectionName, tournament?.prize_fund || 0));
    });
  }

  normalized.sections = normalized.sections.map(section => {
    const prizeList = Array.isArray(section?.prizes) ? section.prizes.map(prize => ({ ...prize })) : [];
    const hasCash = prizeList.some(prize => prize.type === 'cash');
    if (!hasCash && section?.prizeFund) {
      DEFAULT_PAYOUTS.forEach(payout => {
        prizeList.push({
          name: payout.name,
          type: 'cash',
          position: payout.position,
          amount: Math.round(section.prizeFund * payout.percentage * 100) / 100
        });
      });
    }
    return {
      name: section?.name || 'Open',
      prizes: prizeList
    };
  });

  return normalized;
}

/**
 * Prize distribution helpers
 */
function splitCashPoolEvenly(totalCash, playerCount, maxPrize) {
  if (playerCount <= 0 || totalCash <= 0) {
    return {
      payouts: Array(playerCount).fill(0),
      distributableTotal: 0,
      rawShare: 0,
      capped: false
    };
  }

  const effectiveCap = typeof maxPrize === 'number' && maxPrize > 0 ? maxPrize : Number.POSITIVE_INFINITY;
  const distributable = Math.min(totalCash, effectiveCap * playerCount);
  const rawShare = distributable / playerCount;
  const baseShare = Math.floor(rawShare * 100) / 100;
  let remaining = Math.round((distributable - baseShare * playerCount) * 100);

  const payouts = Array.from({ length: playerCount }, (_, index) => {
    const extra = remaining > 0 ? 0.01 : 0;
    if (remaining > 0) remaining -= 1;
    return Math.round((baseShare + extra) * 100) / 100;
  });

  return {
    payouts,
    distributableTotal: distributable,
    rawShare,
    capped: distributable < totalCash
  };
}

function distributeTiedCashPrizes(tiedPlayers, cashPrizes, sectionName, basePosition) {
  const totalCash = cashPrizes.reduce((sum, prize) => sum + (prize.amount || 0), 0);
  const maxPrize = cashPrizes.reduce((max, prize) => Math.max(max, prize.amount || 0), 0);
  const split = splitCashPoolEvenly(totalCash, tiedPlayers.length, maxPrize);

  return tiedPlayers.map((player, index) => ({
    player_id: player.id,
    prize_name: cashPrizes.length === 1 ? cashPrizes[0].name : `Tied ${cashPrizes.map(p => p.name).join(' + ')}`,
    prize_type: 'cash',
    amount: split.payouts[index],
    position: basePosition,
    section: sectionName,
    tie_group: tiedPlayers.length > 1 ? 1 : undefined,
    original_prize_amounts: cashPrizes.map(p => p.amount || 0),
    is_pooled: tiedPlayers.length > 1
  }));
}

function sortStandings(standings, tiebreakers = ['buchholz']) {
  return [...standings].sort((a, b) => {
    if (a.total_points !== b.total_points) {
      return b.total_points - a.total_points;
    }
    for (const key of tiebreakers) {
      const aValue = a.tiebreakers?.[key] || 0;
      const bValue = b.tiebreakers?.[key] || 0;
      if (aValue !== bValue) {
        return bValue - aValue;
      }
    }
    return (b.rating || 0) - (a.rating || 0);
  });
}

function groupByScore(standings) {
  const groups = new Map();
  standings.forEach(player => {
    const score = player.total_points;
    if (!groups.has(score)) {
      groups.set(score, []);
    }
    groups.get(score).push(player);
  });
  return Array.from(groups.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, players]) => players);
}

function distributeSectionPrizes(sectionStandings, sectionConfig) {
  const distributions = [];
  const prizes = sectionConfig.prizes || [];

  const positionPrizes = prizes.filter(prize => prize.type === 'cash' && prize.position);
  const ratingPrizes = prizes.filter(prize => prize.ratingCategory && !prize.position);
  const generalPrizes = prizes.filter(prize => !prize.position && !prize.ratingCategory && prize.type !== 'cash');

  const cashWinners = new Set();
  const prizeRecipients = new Set();

  const addDistributions = (items) => {
    items.forEach(item => {
      distributions.push(item);
      if (item.prize_type === 'cash' && item.player_id) {
        cashWinners.add(item.player_id);
      }
      if (item.player_id) {
        prizeRecipients.add(item.player_id);
      }
    });
  };

  if (positionPrizes.length > 0) {
    const groupedByScore = groupByScore(sectionStandings);
    let currentPosition = 1;

    groupedByScore.forEach(scoreGroup => {
      const cashForGroup = positionPrizes.filter(prize => prize.position >= currentPosition && prize.position < currentPosition + scoreGroup.length);
      if (cashForGroup.length > 0) {
        const eligible = scoreGroup.filter(player => !cashWinners.has(player.id));
        if (eligible.length > 0) {
          addDistributions(distributeTiedCashPrizes(eligible, cashForGroup, sectionConfig.name, currentPosition));
        }
      }
      currentPosition += scoreGroup.length;
    });
  }

  if (ratingPrizes.length > 0) {
    ratingPrizes.forEach(prize => {
      const eligible = sectionStandings.filter(player => {
        const rating = player.rating || 0;
        const target = parseInt(prize.ratingCategory?.replace(/[^0-9]/g, ''), 10);
        return (!Number.isNaN(target) ? rating <= target : true) && !cashWinners.has(player.id);
      });

      const sortedEligible = sortStandings(eligible);
      if (sortedEligible.length > 0) {
        addDistributions([
          {
            player_id: sortedEligible[0].id,
            prize_name: prize.name,
            prize_type: prize.type || 'cash',
            amount: prize.amount || undefined,
            position: prize.position || undefined,
            section: sectionConfig.name,
            rating_category: prize.ratingCategory
          }
        ]);
      }
    });
  }

  if (generalPrizes.length > 0) {
    const sorted = sortStandings(sectionStandings).filter(player => !prizeRecipients.has(player.id));
    generalPrizes.forEach((prize, index) => {
      if (index < sorted.length) {
        addDistributions([
          {
            player_id: sorted[index].id,
            prize_name: prize.name,
            prize_type: prize.type,
            amount: prize.amount || undefined,
            position: prize.position || undefined,
            section: sectionConfig.name
          }
        ]);
      }
    });
  }

  return distributions;
}

/**
 * Persistence
 */
async function persistDistributions(tournamentId, db, distributions) {
  if (!Array.isArray(distributions) || distributions.length === 0) {
    return;
  }

  await runAsync(db, 'DELETE FROM prize_distributions WHERE tournament_id = ?', [tournamentId]);
  await runAsync(db, 'DELETE FROM prizes WHERE tournament_id = ?', [tournamentId]);

  const prizeEntries = [];
  const distributionEntries = [];
  const prizeKeyMap = new Map();

  distributions.forEach(dist => {
    const key = [
      dist.prize_name,
      dist.prize_type,
      dist.section || '',
      dist.position || '',
      dist.rating_category || ''
    ].join('::');

    if (!prizeKeyMap.has(key)) {
      const prizeId = uuidv4();
      prizeKeyMap.set(key, prizeId);
      prizeEntries.push({
        id: prizeId,
        tournament_id: tournamentId,
        name: dist.prize_name,
        type: dist.prize_type,
        position: dist.position || null,
        rating_category: dist.rating_category || null,
        section: dist.section || null,
        amount: dist.amount ?? null,
        description: dist.prize_name
      });
    }

    distributionEntries.push({
      id: uuidv4(),
      tournament_id: tournamentId,
      player_id: dist.player_id,
      prize_id: prizeKeyMap.get(key),
      prize_name: dist.prize_name,
      prize_type: dist.prize_type,
      amount: dist.amount ?? null,
      position: dist.position || null,
      rating_category: dist.rating_category || null,
      section: dist.section || null,
      tie_group: dist.tie_group || null
    });
  });

  await runAsync(db, 'BEGIN TRANSACTION');
  try {
    for (const prize of prizeEntries) {
      await runAsync(
        db,
        'INSERT INTO prizes (id, tournament_id, name, type, position, rating_category, section, amount, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          prize.id,
          prize.tournament_id,
          prize.name,
          prize.type,
          prize.position,
          prize.rating_category,
          prize.section,
          prize.amount,
          prize.description
        ]
      );
    }

    for (const dist of distributionEntries) {
      await runAsync(
        db,
        'INSERT INTO prize_distributions (id, tournament_id, player_id, prize_id, prize_name, prize_type, amount, position, rating_category, section, tie_group) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          dist.id,
          dist.tournament_id,
          dist.player_id,
          dist.prize_id,
          dist.prize_name,
          dist.prize_type,
          dist.amount,
          dist.position,
          dist.rating_category,
          dist.section,
          dist.tie_group
        ]
      );
    }

    await runAsync(db, 'COMMIT');
  } catch (error) {
    await runAsync(db, 'ROLLBACK');
    throw error;
  }
}

/**
 * Public API
 */
async function getStandingsForPrizes(tournamentId, db) {
  const standings = await getTournamentStandings(tournamentId, db);
  await calculateBasicTiebreakers(tournamentId, standings, db);
  return standings;
}

async function calculateAndDistributePrizes(tournamentId, db) {
  const tournament = await new Promise((resolve, reject) => {
    db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!tournament) {
    return [];
  }

  const settings = tournament.settings ? JSON.parse(tournament.settings) : {};
  const standings = await getStandingsForPrizes(tournamentId, db);

  const prizeSettings = normalizePrizeSettings(tournament, standings, settings.prizes);
  if (!prizeSettings.enabled || prizeSettings.sections.length === 0) {
    return [];
  }

  const actualSections = new Map();
  standings.forEach(player => {
    const raw = player.section || 'Open';
    const normalized = normalizeSectionName(raw);
    if (!actualSections.has(normalized)) {
      actualSections.set(normalized, raw);
    }
  });

  const distributions = [];
  prizeSettings.sections.forEach(sectionConfig => {
    const normalizedTarget = normalizeSectionName(sectionConfig.name);
    if (!actualSections.has(normalizedTarget)) {
      return;
    }

    const canonicalName = actualSections.get(normalizedTarget);
    const sectionStandings = standings.filter(player => normalizeSectionName(player.section) === normalizedTarget);
    if (sectionStandings.length === 0) {
      return;
    }

    const sectionPrizes = distributeSectionPrizes(sectionStandings, {
      ...sectionConfig,
      name: canonicalName
    });
    distributions.push(...sectionPrizes);
  });

  await persistDistributions(tournamentId, db, distributions);
  return distributions;
}

async function getPrizeDistributions(tournamentId, db) {
  return fetchAsync(
    db,
    'SELECT * FROM prize_distributions WHERE tournament_id = ? ORDER BY section, position',
    [tournamentId]
  );
}

async function autoAssignPrizesOnRoundCompletion(tournamentId, round, db) {
  const distributions = await calculateAndDistributePrizes(tournamentId, db);
  return distributions.length > 0;
}

module.exports = {
  calculateAndDistributePrizes,
  getPrizeDistributions,
  autoAssignPrizesOnRoundCompletion,
  getStandingsForPrizes
};
