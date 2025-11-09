const { v4: uuidv4 } = require('uuid');
const { EnhancedPairingSystem } = require('../server/utils/enhancedPairingSystem');

const ITERATIONS = parseInt(process.env.STRESS_ITERATIONS || '100', 10);
const PLAYERS_PER_TOURNAMENT = parseInt(process.env.STRESS_PLAYER_COUNT || '32', 10);
const ROUNDS = parseInt(process.env.STRESS_ROUNDS || '5', 10);
const BYE_PROBABILITY = parseFloat(process.env.STRESS_BYE_CHANCE || '0.15');

function randomRating() {
  return 2400 - Math.floor(Math.random() * 1600);
}

function randomResult() {
  const roll = Math.random();
  if (roll < 0.45) return ['win', 'loss'];
  if (roll < 0.9) return ['loss', 'win'];
  return ['draw', 'draw'];
}

function formatByeRounds(rounds) {
  if (!rounds.length) {
    return undefined;
  }

  const formatType = Math.random();
  if (formatType < 0.25) {
    return rounds; // array
  }
  if (formatType < 0.5) {
    return rounds.length === 1 ? rounds[0] : rounds[0];
  }
  if (formatType < 0.75) {
    return JSON.stringify(rounds);
  }
  return rounds.join(',');
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
  const tournamentId = `sim-${iteration}-${uuidv4()}`;
  const section = 'Open';

  const players = Array.from({ length: PLAYERS_PER_TOURNAMENT }, (_, index) => ({
    id: uuidv4(),
    name: `Player ${iteration}-${index + 1}`,
    rating: randomRating(),
    status: 'active',
    matches: [],
  }));

  // Pre-assign intentional byes with varying formats
  for (const player of players) {
    const byeRounds = [];
    for (let round = 1; round <= ROUNDS; round += 1) {
      if (Math.random() < BYE_PROBABILITY) {
        byeRounds.push(round);
      }
    }
    player.intentional_bye_rounds = formatByeRounds(byeRounds);
    if (Math.random() < 0.1) {
      player.bye_rounds = formatByeRounds(byeRounds);
    }
  }

  let previousPairings = [];
  const colorHistory = {};

  for (let round = 1; round <= ROUNDS; round += 1) {
    // Refresh dynamic stats
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
    });

    const pairings = await system.generatePairings();

    pairings.forEach((pairing, index) => {
      pairing.id = pairing.id || uuidv4();
      pairing.generated_at_iteration = iteration;
      pairing.generated_round_index = round;
      pairing.generated_board_index = index + 1;
    });

    // Persist results into base player state
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
  console.log(`Running ${ITERATIONS} tournament simulations with ${PLAYERS_PER_TOURNAMENT} players, ${ROUNDS} rounds.`);

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
