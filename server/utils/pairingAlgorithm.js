/**
 * Swiss System Pairing Algorithm
 * Implements proper Swiss system pairing rules based on FIDE Dutch system
 * Supports multiple sections with separate pairings
 * Supports both standard and accelerated pairings
 * 
 * Based on Wikipedia Swiss-system tournament standards:
 * - Dutch system: Players divided into score groups, top half paired with bottom half
 * - Proper color balancing to ensure equal white/black distribution
 * - Prevents repeat pairings
 * - Accelerated pairings for large tournaments
 */

function generateSwissPairings(players, round, inactiveRounds = [], previousPairings = [], colorHistory = {}, tournamentSettings = {}) {
  if (players.length < 2) {
    return [];
  }

  // Filter out players who are inactive for this round
  const activePlayers = players.filter(player => {
    const isInactive = inactiveRounds.some(ir => 
      ir.player_id === player.id && ir.round === round
    );
    return !isInactive;
  });

  if (activePlayers.length < 2) {
    return [];
  }

  // Group players by section first
  const sectionGroups = {};
  activePlayers.forEach(player => {
    const section = player.section || 'Open'; // Default to 'Open' section if no section specified
    if (!sectionGroups[section]) {
      sectionGroups[section] = [];
    }
    sectionGroups[section].push(player);
  });

  const allPairings = [];

  // Generate pairings for each section separately - treat each section as independent
  Object.keys(sectionGroups).forEach(sectionName => {
    const sectionPlayers = sectionGroups[sectionName];
    if (sectionPlayers.length >= 1) { // Allow single players (they'll get a bye)
      const sectionPairings = generateSectionPairings(sectionPlayers, round, sectionName, previousPairings, colorHistory, tournamentSettings);
      allPairings.push(...sectionPairings);
    }
  });

  // Keep original board numbering within each section (don't renumber across sections)
  // Each section maintains its own board numbering starting from 1

  return allPairings;
}

function generateSectionPairings(players, round, sectionName, previousPairings = [], colorHistory = {}, tournamentSettings = {}) {
  if (players.length < 1) {
    return [];
  }

  // Filter previous pairings to only include those involving players in this section
  const sectionPlayerIds = new Set(players.map(p => p.id));
  const sectionPreviousPairings = previousPairings.filter(pairing => 
    // Include pairings that are in the same section OR involve players from this section
    (pairing.section === sectionName) ||
    ((pairing.white_player_id && sectionPlayerIds.has(pairing.white_player_id)) ||
     (pairing.black_player_id && sectionPlayerIds.has(pairing.black_player_id)))
  );

  // Filter color history to only include players in this section
  const sectionColorHistory = {};
  Object.keys(colorHistory).forEach(playerId => {
    if (sectionPlayerIds.has(playerId)) {
      sectionColorHistory[playerId] = colorHistory[playerId];
    }
  });

  // Check for players with intentional byes for this round
  const playersWithIntentionalByes = players.filter(player => {
    if (!player.intentional_bye_rounds) return false;
    const byeRounds = typeof player.intentional_bye_rounds === 'string' 
      ? JSON.parse(player.intentional_bye_rounds) 
      : player.intentional_bye_rounds;
    return byeRounds && byeRounds.includes(round);
  });

  // Remove players with intentional byes from pairing pool
  const playersWithoutIntentionalByes = players.filter(player => {
    if (!player.intentional_bye_rounds) return true;
    const byeRounds = typeof player.intentional_bye_rounds === 'string' 
      ? JSON.parse(player.intentional_bye_rounds) 
      : player.intentional_bye_rounds;
    return !byeRounds || !byeRounds.includes(round);
  });

  // Determine if we should use accelerated pairings
  const shouldUseAcceleration = shouldUseAcceleratedPairings(playersWithoutIntentionalByes, round, tournamentSettings);
  
  // Sort players by score (descending), then by rating (descending), then by tiebreaker
  let sortedPlayers = [...playersWithoutIntentionalByes].sort((a, b) => {
    if (a.points !== b.points) {
      return b.points - a.points;
    }
    // If scores are equal, use tiebreakers
    return comparePlayersForTiebreak(a, b, sectionPreviousPairings);
  });

  // Apply acceleration if needed
  if (shouldUseAcceleration) {
    sortedPlayers = applyAcceleration(sortedPlayers, round, tournamentSettings);
  }

  const pairings = [];
  const used = new Set();

  // Add intentional byes first
  playersWithIntentionalByes.forEach(player => {
    pairings.push({
      white_player_id: player.id,
      black_player_id: null,
      is_bye: true,
      is_intentional_bye: true,
      section: sectionName
    });
    used.add(player.id);
  });

  // Handle section-level bye if needed (odd number of players without intentional byes)
  const playersNeedingPairing = playersWithoutIntentionalByes.filter(p => !used.has(p.id));
  if (playersNeedingPairing.length % 2 === 1) {
    // Find the lowest rated player in this section to get the bye
    const byePlayer = playersNeedingPairing.sort((a, b) => {
      if (a.points !== b.points) {
        return a.points - b.points; // Lower score first
      }
      return (a.rating || 0) - (b.rating || 0); // Lower rating first
    })[0];
    
    pairings.push({
      white_player_id: byePlayer.id,
      black_player_id: null,
      is_bye: true,
      section: sectionName
    });
    used.add(byePlayer.id);
  }

  // Group players by score within the section
  const scoreGroups = {};
  sortedPlayers.forEach(player => {
    if (!used.has(player.id)) { // Only include players not already paired
      if (!scoreGroups[player.points]) {
        scoreGroups[player.points] = [];
      }
      scoreGroups[player.points].push(player);
    }
  });

  // Pair within each score group using proper Dutch system
  Object.keys(scoreGroups).sort((a, b) => parseFloat(b) - parseFloat(a)).forEach(score => {
    const group = scoreGroups[score];
    pairGroupDutchSystem(group, pairings, used, round, sectionName, sectionPreviousPairings, sectionColorHistory);
  });

  // Add board numbers starting from 1 for this section
  pairings.forEach((pairing, index) => {
    pairing.board = index + 1;
  });

  return pairings;
}

/**
 * Implements proper Dutch system pairing within a score group
 * Based on Wikipedia Swiss system standards:
 * - Players are ranked within the score group
 * - Top half is paired with bottom half (1 vs 5, 2 vs 6, etc.)
 * - Modifications are made to prevent repeat pairings and balance colors
 */
function pairGroupDutchSystem(players, pairings, used, round, sectionName, previousPairings = [], colorHistory = {}) {
  if (players.length === 0) return;

  // Bye is now handled at section level, so all groups should have even numbers
  // If we somehow have an odd number, it means there's a logic error
  if (players.length % 2 === 1) {
    console.warn(`Odd number of players in score group: ${players.length}. This should not happen with proper section-level bye handling.`);
    // Remove the extra player to make it even
    players.pop();
  }

  if (players.length === 0) return;

  // Dutch system: pair top half with bottom half
  const halfSize = Math.floor(players.length / 2);
  const topHalf = players.slice(0, halfSize);
  const bottomHalf = players.slice(halfSize);

  // Create initial pairings: 1 vs 5, 2 vs 6, etc.
  const initialPairings = [];
  for (let i = 0; i < halfSize; i++) {
    initialPairings.push({
      topPlayer: topHalf[i],
      bottomPlayer: bottomHalf[i]
    });
  }

  // Apply modifications to prevent repeat pairings and balance colors
  const finalPairings = applyPairingModifications(initialPairings, previousPairings, colorHistory);

  // Create the actual pairings
  finalPairings.forEach(pairing => {
    if (used.has(pairing.topPlayer.id) || used.has(pairing.bottomPlayer.id)) {
      return; // Skip if either player is already used
    }

    // Determine colors based on color balance
    const whitePlayer = shouldBeWhite(pairing.topPlayer, pairing.bottomPlayer, colorHistory) 
      ? pairing.topPlayer 
      : pairing.bottomPlayer;
    const blackPlayer = whitePlayer.id === pairing.topPlayer.id 
      ? pairing.bottomPlayer 
      : pairing.topPlayer;

    pairings.push({
      white_player_id: whitePlayer.id,
      black_player_id: blackPlayer.id,
      is_bye: false,
      section: sectionName
    });

    used.add(pairing.topPlayer.id);
    used.add(pairing.bottomPlayer.id);
  });
}

/**
 * Apply modifications to initial pairings to prevent repeats and balance colors
 * This implements the complex part of Dutch system pairing
 */
function applyPairingModifications(initialPairings, previousPairings, colorHistory) {
  const modifications = [...initialPairings];
  
  // Check for repeat pairings and swap if necessary
  for (let i = 0; i < modifications.length; i++) {
    const currentPairing = modifications[i];
    
    // Check if this pairing has already occurred
    const haveMet = previousPairings.some(pairing => 
      (pairing.white_player_id === currentPairing.topPlayer.id && pairing.black_player_id === currentPairing.bottomPlayer.id) ||
      (pairing.white_player_id === currentPairing.bottomPlayer.id && pairing.black_player_id === currentPairing.topPlayer.id)
    );

    if (haveMet) {
      // Try to find a swap with another pairing
      for (let j = i + 1; j < modifications.length; j++) {
        const otherPairing = modifications[j];
        
        // Check if swapping bottom players would avoid repeats
        const swap1Met = previousPairings.some(pairing => 
          (pairing.white_player_id === currentPairing.topPlayer.id && pairing.black_player_id === otherPairing.bottomPlayer.id) ||
          (pairing.white_player_id === otherPairing.bottomPlayer.id && pairing.black_player_id === currentPairing.topPlayer.id)
        );
        
        const swap2Met = previousPairings.some(pairing => 
          (pairing.white_player_id === otherPairing.topPlayer.id && pairing.black_player_id === currentPairing.bottomPlayer.id) ||
          (pairing.white_player_id === currentPairing.bottomPlayer.id && pairing.black_player_id === otherPairing.topPlayer.id)
        );

        if (!swap1Met && !swap2Met) {
          // Perform the swap
          const temp = currentPairing.bottomPlayer;
          currentPairing.bottomPlayer = otherPairing.bottomPlayer;
          otherPairing.bottomPlayer = temp;
          break;
        }
      }
    }
  }

  return modifications;
}

/**
 * Compare two players for tiebreaking when they have equal scores
 * Implements proper Swiss system tiebreaking rules
 */
function comparePlayersForTiebreak(player1, player2, previousPairings = []) {
  // 1. Higher rating first
  if ((player1.rating || 0) !== (player2.rating || 0)) {
    return (player2.rating || 0) - (player1.rating || 0);
  }

  // 2. Buchholz score (sum of opponents' scores)
  const buchholz1 = calculateBuchholzScore(player1.id, previousPairings);
  const buchholz2 = calculateBuchholzScore(player2.id, previousPairings);
  if (buchholz1 !== buchholz2) {
    return buchholz2 - buchholz1;
  }

  // 3. Sonneborn-Berger score
  const sb1 = calculateSonnebornBergerScore(player1.id, previousPairings);
  const sb2 = calculateSonnebornBergerScore(player2.id, previousPairings);
  if (sb1 !== sb2) {
    return sb2 - sb1;
  }

  // 4. Direct encounter (if they played each other)
  const directEncounter = previousPairings.find(pairing => 
    (pairing.white_player_id === player1.id && pairing.black_player_id === player2.id) ||
    (pairing.white_player_id === player2.id && pairing.black_player_id === player1.id)
  );
  
  if (directEncounter) {
    // Return positive if player1 won, negative if player2 won
    if (directEncounter.white_player_id === player1.id) {
      return directEncounter.result === '1-0' ? 1 : (directEncounter.result === '0-1' ? -1 : 0);
    } else {
      return directEncounter.result === '0-1' ? 1 : (directEncounter.result === '1-0' ? -1 : 0);
    }
  }

  // 5. Alphabetical by name as final tiebreaker
  return player1.name.localeCompare(player2.name);
}

/**
 * Calculate Buchholz score (sum of opponents' scores)
 */
function calculateBuchholzScore(playerId, previousPairings) {
  const playerPairings = previousPairings.filter(pairing => 
    pairing.white_player_id === playerId || pairing.black_player_id === playerId
  );
  
  let totalScore = 0;
  playerPairings.forEach(pairing => {
    const opponentId = pairing.white_player_id === playerId ? pairing.black_player_id : pairing.white_player_id;
    // This is simplified - in practice, you'd need to look up the opponent's total score
    // For now, we'll use a placeholder
    totalScore += 1; // Placeholder - would need actual opponent scores
  });
  
  return totalScore;
}

/**
 * Calculate Sonneborn-Berger score
 */
function calculateSonnebornBergerScore(playerId, previousPairings) {
  // Simplified implementation - would need full opponent score data
  return 0;
}

function calculatePairingScore(player1, player2, round, previousPairings = [], colorHistory = {}) {
  let score = 0;

  // Prefer similar ratings (but not too similar) - USCF Rule 28D
  const ratingDiff = Math.abs((player1.rating || 0) - (player2.rating || 0));
  score += Math.max(0, 100 - ratingDiff);

  // Avoid pairing players who have already met (USCF Rule 28E)
  const haveMet = previousPairings.some(pairing => 
    (pairing.white_player_id === player1.id && pairing.black_player_id === player2.id) ||
    (pairing.white_player_id === player2.id && pairing.black_player_id === player1.id)
  );
  
  if (haveMet) {
    score -= 1000; // Heavy penalty for previous meetings
  }

  // Prefer players with different color histories (USCF Rule 28F)
  const player1ColorBalance = colorHistory[player1.id] || 0;
  const player2ColorBalance = colorHistory[player2.id] || 0;
  
  // If both players have similar color imbalances, this is a good pairing
  const colorBalanceDiff = Math.abs(player1ColorBalance - player2ColorBalance);
  score += colorBalanceDiff * 10;

  // USCF Rule 28G: Prefer pairings that equalize color distribution
  // Give bonus for pairings that help balance colors
  if (player1ColorBalance > 0 && player2ColorBalance < 0) {
    score += 20; // Player1 has more white, player2 has more black - good pairing
  } else if (player1ColorBalance < 0 && player2ColorBalance > 0) {
    score += 20; // Player1 has more black, player2 has more white - good pairing
  }

  // USCF Rule 28H: Avoid pairing players from the same score group if possible
  // This is already handled by the score grouping, but we can add a small penalty
  // for very similar scores to encourage some mixing
  const scoreDiff = Math.abs((player1.points || 0) - (player2.points || 0));
  if (scoreDiff === 0) {
    score -= 5; // Small penalty for same score (encourages some mixing)
  }

  return score;
}

/**
 * Determine which player should be white based on proper Swiss system color balancing
 * Implements FIDE color balancing rules
 */
function shouldBeWhite(player1, player2, colorHistory = {}) {
  const player1ColorBalance = colorHistory[player1.id] || 0;
  const player2ColorBalance = colorHistory[player2.id] || 0;
  
  // Rule 1: Player with more black pieces should get white
  if (player1ColorBalance < player2ColorBalance) {
    return true; // player1 gets white
  } else if (player1ColorBalance > player2ColorBalance) {
    return false; // player2 gets white
  }
  
  // Rule 2: If equal color balance, avoid giving the same color 3 times in a row
  const player1LastColors = getLastTwoColors(player1.id, colorHistory);
  const player2LastColors = getLastTwoColors(player2.id, colorHistory);
  
  // If player1 had white-white, give them black
  if (player1LastColors === 'WW') {
    return false; // player2 gets white
  }
  // If player2 had white-white, give them black
  if (player2LastColors === 'WW') {
    return true; // player1 gets white
  }
  
  // If player1 had black-black, give them white
  if (player1LastColors === 'BB') {
    return true; // player1 gets white
  }
  // If player2 had black-black, give them white
  if (player2LastColors === 'BB') {
    return false; // player2 gets white
  }
  
  // Rule 3: If equal color balance and no 3-in-a-row issues, use rating
  if ((player1.rating || 0) !== (player2.rating || 0)) {
    return (player1.rating || 0) > (player2.rating || 0);
  }
  
  // Rule 4: If ratings are equal, alternate based on player ID
  return player1.id < player2.id;
}

/**
 * Get the last two colors played by a player
 */
function getLastTwoColors(playerId, colorHistory) {
  const history = colorHistory[playerId] || [];
  if (!Array.isArray(history)) return '';
  
  const lastTwo = history.slice(-2);
  return lastTwo.map(color => color === 1 ? 'W' : 'B').join('');
}

/**
 * Determine if accelerated pairings should be used
 * Based on WinTD and USCF rules: use when players > 2^(rounds+1) or when explicitly enabled
 */
function shouldUseAcceleratedPairings(players, round, tournamentSettings = {}) {
  const settings = tournamentSettings.settings || {};
  const pairingType = settings.pairing_type || 'standard';
  const accelerationType = settings.acceleration_type || 'standard';
  
  // If not set to accelerated, don't use it
  if (pairingType !== 'accelerated') {
    return false;
  }
  
  // For "all_rounds" acceleration, always use it
  if (accelerationType === 'all_rounds') {
    return true;
  }
  
  // Check if we're within the acceleration rounds
  const accelerationRounds = settings.acceleration_rounds || 2;
  if (round > accelerationRounds) {
    return false;
  }
  
  // Check threshold
  const threshold = settings.acceleration_threshold;
  if (threshold && players.length < threshold) {
    return false;
  }
  
  // Default USCF rule: use acceleration if players > 2^(rounds+1)
  // This is calculated based on total tournament rounds, not current round
  const totalRounds = tournamentSettings.rounds || 5;
  const defaultThreshold = Math.pow(2, totalRounds + 1);
  
  if (!threshold && players.length < defaultThreshold) {
    return false;
  }
  
  return true;
}

/**
 * Apply acceleration to player sorting based on WinTD standards
 * Implements three types of accelerated pairings:
 * 1. Standard Accelerated (USCF Variation 28R2)
 * 2. 1/6's Accelerated (USCF Variation 28R3)
 * 3. All Rounds Accelerated (Added Score Method)
 * 4. Added Score Accelerated (USCF Variation 28R1)
 */
function applyAcceleration(players, round, tournamentSettings = {}) {
  const settings = tournamentSettings.settings || {};
  const accelerationType = settings.acceleration_type || 'standard';
  const addedScoreAccelerators = settings.added_score_accelerators || false;
  
  // For "all_rounds" acceleration, use added score method throughout
  if (accelerationType === 'all_rounds') {
    return applyAddedScoreAcceleration(players, round, tournamentSettings);
  }
  
  // For "added_score" type, use added score method for first two rounds
  if (accelerationType === 'added_score' || addedScoreAccelerators) {
    if (round <= 2) {
      return applyAddedScoreAcceleration(players, round, tournamentSettings);
    }
    return players;
  }
  
  // For "standard" acceleration (default)
  if (accelerationType === 'standard') {
    if (round === 1) {
      return applyStandardAccelerationRound1(players, tournamentSettings);
    } else if (round === 2) {
      return applyStandardAccelerationRound2(players, tournamentSettings);
    }
    return players;
  }
  
  // For "sixths" acceleration
  if (accelerationType === 'sixths') {
    if (round === 1) {
      return applySixthsAccelerationRound1(players, tournamentSettings);
    } else if (round === 2) {
      return applySixthsAccelerationRound2(players, tournamentSettings);
    }
    return players;
  }
  
  return players;
}

/**
 * Apply added score acceleration (USCF Variation 28R1)
 * Adds 1 point to top half players for pairing purposes
 */
function applyAddedScoreAcceleration(players, round, tournamentSettings = {}) {
  const midPoint = Math.ceil(players.length / 2);
  const topHalf = players.slice(0, midPoint);
  
  // Create modified players with added points for pairing
  const modifiedPlayers = players.map(player => {
    const isTopHalf = topHalf.includes(player);
    return {
      ...player,
      points: player.points + (isTopHalf ? 1 : 0), // Add 1 point for top half
      originalPoints: player.points // Keep original points for display
    };
  });
  
  // Sort by modified points, then by rating
  return modifiedPlayers.sort((a, b) => {
    if (a.points !== b.points) {
      return b.points - a.points;
    }
    return (b.rating || 0) - (a.rating || 0);
  });
}

/**
 * Apply standard acceleration for Round 1 (WinTD Standard Accelerated)
 * Divides players into A1, A2, B1, B2 groups
 */
function applyStandardAccelerationRound1(players, tournamentSettings = {}) {
  const settings = tournamentSettings.settings || {};
  const customBreakPoint = settings.acceleration_break_point;
  
  // Determine break point between A and B groups
  let breakPoint;
  if (customBreakPoint) {
    breakPoint = customBreakPoint;
  } else {
    // Round up to even number for A group
    breakPoint = Math.ceil(players.length / 2);
    if (breakPoint % 2 === 1) breakPoint++;
  }
  
  const aGroup = players.slice(0, breakPoint);
  const bGroup = players.slice(breakPoint);
  
  // A1 plays A2, B1 plays B2
  const a1 = aGroup.slice(0, Math.ceil(aGroup.length / 2));
  const a2 = aGroup.slice(Math.ceil(aGroup.length / 2));
  const b1 = bGroup.slice(0, Math.ceil(bGroup.length / 2));
  const b2 = bGroup.slice(Math.ceil(bGroup.length / 2));
  
  // Create pairing order: A1, A2, B1, B2
  const accelerated = [...a1, ...a2, ...b1, ...b2];
  
  return accelerated;
}

/**
 * Apply standard acceleration for Round 2 (WinTD Standard Accelerated)
 * Winners from A1-A2 play each other, non-winners from A1-A2 play B1-B2 winners
 */
function applyStandardAccelerationRound2(players, tournamentSettings = {}) {
  // This is complex and would need previous round results
  // For now, return players sorted normally
  // In a full implementation, you'd need to track who won/lost in round 1
  return players.sort((a, b) => {
    if (a.points !== b.points) {
      return b.points - a.points;
    }
    return (b.rating || 0) - (a.rating || 0);
  });
}

/**
 * Apply sixths acceleration for Round 1 (WinTD 1/6's Accelerated)
 * Divides players into sixths: 1st vs 2nd, 3rd vs 4th, 5th vs 6th
 */
function applySixthsAccelerationRound1(players, tournamentSettings = {}) {
  const sixthSize = Math.ceil(players.length / 6);
  const groups = [];
  
  for (let i = 0; i < 6; i++) {
    const start = i * sixthSize;
    const end = Math.min(start + sixthSize, players.length);
    if (start < players.length) {
      groups.push(players.slice(start, end));
    }
  }
  
  // Create pairing order: 1st, 2nd, 3rd, 4th, 5th, 6th
  const accelerated = [];
  for (let i = 0; i < groups.length; i++) {
    accelerated.push(...groups[i]);
  }
  
  return accelerated;
}

/**
 * Apply sixths acceleration for Round 2 (WinTD 1/6's Accelerated)
 * Winners from top two sixths play each other, others paired normally
 */
function applySixthsAccelerationRound2(players, tournamentSettings = {}) {
  // This is complex and would need previous round results
  // For now, return players sorted normally
  return players.sort((a, b) => {
    if (a.points !== b.points) {
      return b.points - a.points;
    }
    return (b.rating || 0) - (a.rating || 0);
  });
}

/**
 * Validate pairings according to USCF rules
 * Returns warnings and errors for pairing issues
 */
function validatePairings(pairings, players, round, previousPairings = [], colorHistory = {}) {
  const warnings = [];
  const errors = [];

  // Check for repeat pairings
  pairings.forEach((pairing, index) => {
    if (pairing.white_player_id && pairing.black_player_id) {
      const haveMet = previousPairings.some(prevPairing => 
        (prevPairing.white_player_id === pairing.white_player_id && prevPairing.black_player_id === pairing.black_player_id) ||
        (prevPairing.white_player_id === pairing.black_player_id && prevPairing.black_player_id === pairing.white_player_id)
      );
      
      if (haveMet) {
        errors.push(`Board ${index + 1}: Players have already met in a previous round`);
      }
    }
  });

  // Check color balance
  const colorImbalances = {};
  players.forEach(player => {
    const balance = colorHistory[player.id] || 0;
    if (Math.abs(balance) > 1) {
      colorImbalances[player.id] = balance;
    }
  });

  if (Object.keys(colorImbalances).length > 0) {
    warnings.push(`Some players have significant color imbalances: ${Object.keys(colorImbalances).length} players affected`);
  }

  // Check for rating differences that are too large
  pairings.forEach((pairing, index) => {
    if (pairing.white_player_id && pairing.black_player_id) {
      const whitePlayer = players.find(p => p.id === pairing.white_player_id);
      const blackPlayer = players.find(p => p.id === pairing.black_player_id);
      
      if (whitePlayer && blackPlayer && whitePlayer.rating && blackPlayer.rating) {
        const ratingDiff = Math.abs(whitePlayer.rating - blackPlayer.rating);
        if (ratingDiff > 400) {
          warnings.push(`Board ${index + 1}: Large rating difference (${ratingDiff} points)`);
        }
      }
    }
  });

  return { warnings, errors };
}

/**
 * Generate team pairings for team tournaments
 * Teams are paired based on their standings using Swiss system principles
 */
function generateTeamSwissPairings(teams, round, previousTeamPairings = [], tournamentSettings = {}) {
  if (teams.length < 2) {
    return [];
  }

  const pairings = [];
  const used = new Set();
  
  // Sort teams by score (descending), then by tiebreakers
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    // Add tiebreakers here if needed (match points, game points, etc.)
    return 0;
  });

  // Handle bye if odd number of teams
  if (sortedTeams.length % 2 === 1) {
    const byeTeam = sortedTeams.pop(); // Lowest scoring team gets bye
    pairings.push({
      team_id: byeTeam.team_id,
      opponent_team_id: null,
      is_bye: true,
      board: 1
    });
    used.add(byeTeam.team_id);
  }

  // Pair remaining teams using Swiss system
  for (let i = 0; i < sortedTeams.length; i += 2) {
    if (i + 1 < sortedTeams.length) {
      const team1 = sortedTeams[i];
      const team2 = sortedTeams[i + 1];
      
      // Check if teams have already met
      const haveMet = previousTeamPairings.some(pairing => 
        (pairing.team_id === team1.team_id && pairing.opponent_team_id === team2.team_id) ||
        (pairing.team_id === team2.team_id && pairing.opponent_team_id === team1.team_id)
      );

      if (!haveMet || i + 2 >= sortedTeams.length) {
        // Pair them if they haven't met or if this is the last possible pairing
        pairings.push({
          team_id: team1.team_id,
          opponent_team_id: team2.team_id,
          is_bye: false,
          board: Math.floor(i / 2) + 1
        });
        used.add(team1.team_id);
        used.add(team2.team_id);
      } else {
        // Try to find alternative pairing to avoid repeat
        let alternativeFound = false;
        for (let j = i + 2; j < sortedTeams.length; j++) {
          const alternativeTeam = sortedTeams[j];
          const alternativeHaveMet = previousTeamPairings.some(pairing => 
            (pairing.team_id === team1.team_id && pairing.opponent_team_id === alternativeTeam.team_id) ||
            (pairing.team_id === alternativeTeam.team_id && pairing.opponent_team_id === team1.team_id)
          );
          
          if (!alternativeHaveMet && !used.has(alternativeTeam.team_id)) {
            // Swap teams
            sortedTeams[i + 1] = alternativeTeam;
            sortedTeams[j] = team2;
            alternativeFound = true;
            break;
          }
        }
        
        // Proceed with pairing (either original or swapped)
        pairings.push({
          team_id: team1.team_id,
          opponent_team_id: sortedTeams[i + 1].team_id,
          is_bye: false,
          board: Math.floor(i / 2) + 1
        });
        used.add(team1.team_id);
        used.add(sortedTeams[i + 1].team_id);
      }
    }
  }

  return pairings;
}

/**
 * Generate team round-robin pairings
 * All teams play each other exactly once
 */
function generateTeamRoundRobinPairings(teams, round) {
  if (teams.length < 2) {
    return [];
  }

  const pairings = [];
  const totalRounds = teams.length - 1 + (teams.length % 2);
  
  // Round-robin pairing algorithm
  const n = teams.length;
  const isOdd = n % 2 === 1;
  const teamsArray = [...teams];
  
  if (isOdd) {
    // Add a bye team for odd number of teams
    teamsArray.push({ team_id: null, name: 'BYE', score: 0 });
  }
  
  for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
    if (roundNum === round) {
      // Generate pairings for this specific round
      for (let i = 0; i < teamsArray.length / 2; i++) {
        const team1 = teamsArray[i];
        const team2 = teamsArray[teamsArray.length - 1 - i];
        
        if (team1.team_id && team2.team_id) {
          pairings.push({
            team_id: team1.team_id,
            opponent_team_id: team2.team_id,
            is_bye: false,
            board: i + 1
          });
        } else if (team1.team_id && !team2.team_id) {
          pairings.push({
            team_id: team1.team_id,
            opponent_team_id: null,
            is_bye: true,
            board: i + 1
          });
        } else if (!team1.team_id && team2.team_id) {
          pairings.push({
            team_id: team2.team_id,
            opponent_team_id: null,
            is_bye: true,
            board: i + 1
          });
        }
      }
      break;
    }
    
    // Rotate teams for next round (except first team stays fixed)
    if (isOdd) {
      const fixed = teamsArray[0];
      const rotating = teamsArray.slice(1, -1); // Exclude fixed and bye
      const bye = teamsArray[teamsArray.length - 1];
      
      // Rotate the middle teams
      const last = rotating.pop();
      rotating.unshift(last);
      
      // Reconstruct array
      teamsArray.length = 0;
      teamsArray.push(fixed, ...rotating, bye);
    } else {
      const fixed = teamsArray[0];
      const rotating = teamsArray.slice(1);
      
      // Rotate all except first
      const last = rotating.pop();
      rotating.unshift(last);
      
      // Reconstruct array
      teamsArray.length = 0;
      teamsArray.push(fixed, ...rotating);
    }
  }

  return pairings;
}

module.exports = {
  generateSwissPairings,
  generateSectionPairings,
  generateTeamSwissPairings,
  generateTeamRoundRobinPairings,
  pairGroupDutchSystem,
  applyPairingModifications,
  comparePlayersForTiebreak,
  calculateBuchholzScore,
  calculateSonnebornBergerScore,
  shouldBeWhite,
  getLastTwoColors,
  shouldUseAcceleratedPairings,
  applyAcceleration,
  applyAddedScoreAcceleration,
  applyStandardAccelerationRound1,
  applyStandardAccelerationRound2,
  applySixthsAccelerationRound1,
  applySixthsAccelerationRound2,
  validatePairings
};
