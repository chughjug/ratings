const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { EnhancedPairingSystem } = require('../server/utils/enhancedPairingSystem');

const ITERATIONS = parseInt(process.env.STRESS_ITERATIONS || '20', 10);
const ROUNDS = parseInt(process.env.STRESS_ROUNDS || '5', 10);
const CSV_PATH = process.env.STRESS_PLAYERS_CSV || path.join(__dirname, '..', 'tournament_import.csv');
const SECTION_FILTER = process.env.STRESS_SECTION || 'CHAMPIONSHIP 3DAY';
const PLAYERS_PER_SECTION = parseInt(process.env.STRESS_PLAYER_COUNT || '19', 10);

function loadPlayersFromCSV(csvPath, section, limit) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const header = lines.shift();
  const columns = header.split(',');

  const players = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);

    const record = {};
    values.forEach((value, idx) => {
      const key = columns[idx]?.trim();
      if (key) {
        record[key] = value.trim();
      }
    });

    if (record.Section === section && record.Status === 'active') {
      players.push({
        id: uuidv4(),
        name: record.Name || `Player ${players.length + 1}`,
        rating: parseInt(record.Rating, 10) || 0,
        status: 'active',
        matches: [],
      });
    }
    if (players.length >= limit) break;
  }

  if (players.length < limit) {
    throw new Error(`Not enough players in section ${section}. Needed ${limit}, found ${players.length}.`);
  }

  return players;
}

function randomResult() {
  const roll = Math.random();
  if (roll < 0.45) return ['win', 'loss'];
  if (roll < 0.9) return ['loss', 'win'];
  return ['draw', 'draw'];
}

function computePoints(matches) {
  if (!Array.isArray(matches)) return 0;
  return matches.reduce((total, match) => {
    if (!match || !match.result) return total;
    switch (match.result) {
      case 'win':
      case 'bye':
      case 'unpaired':
        return total + 1;
      case 'half_point_bye':
      case 'draw':
        return total + 0.5;
      default:
        return total;
    }
  }, 0);
}

async function simulateTournament(iteration) {
  const basePlayers = loadPlayersFromCSV(CSV_PATH, SECTION_FILTER, PLAYERS_PER_SECTION);
  const players = basePlayers.map(player => ({ ...player, matches: [] }));

  const tournamentId = `sim-${iteration}-${uuidv4()}`;
  const section = SECTION_FILTER;

  let previousPairings = [];
  const colorHistory = {};

  for (let round = 1; round <= ROUNDS; round += 1) {
    for (const player of players) {
      player.points = computePoints(player.matches);
    }

    const roundPlayers = players.map(player => ({
      ...player,
      matches: Array.isArray(player.matches)
        ? player.matches.map(match => ({ ...match }))
        : [],
    }));

    const system = new EnhancedPairingSystem(roundPlayers, {
      round,
      section,
      tournamentId,
      colorHistory,
      previousPairings,
      pairingSystem: 'fide_dutch',
      useCPP: true,
      pointsForWin: 1,
      pointsForDraw: 0.5,
      pointsForLoss: 0,
    });

    const pairings = await system.generatePairings();

    pairings.forEach((pairing, index) => {
      pairing.id = pairing.id || uuidv4();
      pairing.simulation_iteration = iteration;
      pairing.simulation_round = round;
      pairing.board_assigned = index + 1;
    });

    for (const pairing of pairings) {
      const white = players.find(p => p.id === pairing.white_player_id);
      if (!white) {
        throw new Error(`White player ${pairing.white_player_id} missing in iteration ${iteration}, round ${round}`);
      }

      if (pairing.is_bye) {
        white.matches.push({
          round,
          gameWasPlayed: false,
          participatedInPairing: true,
          color: 'white',
          result: pairing.bye_type || 'bye',
          opponent: null,
        });
        colorHistory[white.id] = colorHistory[white.id] || [];
        colorHistory[white.id].push('white');
        continue;
      }

      const black = players.find(p => p.id === pairing.black_player_id);
      if (!black) {
        throw new Error(`Black player ${pairing.black_player_id} missing in iteration ${iteration}, round ${round}`);
      }

      const [whiteResult, blackResult] = randomResult();

      white.matches.push({
        round,
        gameWasPlayed: true,
        participatedInPairing: true,
        color: 'white',
        result: whiteResult,
        opponent: black.id,
      });

      black.matches.push({
        round,
        gameWasPlayed: true,
        participatedInPairing: true,
        color: 'black',
        result: blackResult,
        opponent: white.id,
      });

      colorHistory[white.id] = colorHistory[white.id] || [];
      colorHistory[white.id].push('white');
      colorHistory[black.id] = colorHistory[black.id] || [];
      colorHistory[black.id].push('black');
    }

    previousPairings = previousPairings.concat(pairings);
  }

  return {
    tournamentId,
    totalPairings: previousPairings.length,
    players: players.length,
    byeAssignments: players.filter(p => Array.isArray(p.matches) && p.matches.some(m => m.opponent === null)).length,
  };
}

(async () => {
  console.log(`Running ${ITERATIONS} tournament simulations with ${PLAYERS_PER_SECTION} players (section="${SECTION_FILTER}"), ${ROUNDS} rounds.`);

  const results = [];
  let failures = 0;

  for (let i = 1; i <= ITERATIONS; i += 1) {
    try {
      const summary = await simulateTournament(i);
      results.push(summary);
      console.log(`Iteration ${i}/${ITERATIONS}: ok (pairings=${summary.totalPairings}, byes=${summary.byeAssignments})`);
    } catch (error) {
      failures += 1;
      console.error(`Iteration ${i} failed: ${error.message}`);
    }
  }

  console.log('\nSimulation complete.');
  console.log(`  Successful runs: ${ITERATIONS - failures}`);
  console.log(`  Failed runs: ${failures}`);

  if (results.length) {
    const totalPairings = results.reduce((acc, item) => acc + item.totalPairings, 0);
    const totalByes = results.reduce((acc, item) => acc + item.byeAssignments, 0);
    console.log(`  Avg pairings/run: ${(totalPairings / results.length).toFixed(2)}`);
    console.log(`  Avg players with byes/run: ${(totalByes / results.length).toFixed(2)}`);
  }
})();
