/**
 * Enhanced Pairing Algorithm
 * Extends the base Swiss system with advanced features:
 * - Manual pairing override
 * - Pairing history visualization
 * - Color preferences
 * - Accelerated pairings
 * - Real-time pairing validation
 * - Knockout tournaments
 * - Blitz/Rapid events
 * - Simultaneous exhibitions
 * - Multi-day events
 */

const { createPairingSystem } = require('./enhancedPairingSystem');

/**
 * Universal FIDE Dutch pairing system
 * This is the only pairing system supported
 */
function generateEnhancedSwissPairings(players, round, options = {}) {
  const {
    inactiveRounds = [],
    previousPairings = [],
    colorHistory = {},
    tournamentSettings = {},
    teamInfo = {},
    manualOverrides = [],
    colorPreferences = {},
    enableValidation = true
  } = options;

  // Filter data by section to ensure complete independence
  const section = options.section || 'Open';
  const sectionPreviousPairings = previousPairings.filter(pairing => 
    pairing.section === section && pairing.round < round
  );
  
  const sectionColorHistory = {};
  players.forEach(player => {
    if (colorHistory[player.id]) {
      sectionColorHistory[player.id] = colorHistory[player.id];
    }
  });
  
  const sectionInactiveRounds = inactiveRounds.filter(ir => 
    players.some(p => p.id === ir.player_id)
  );

  // Always use FIDE Dutch system - no other options
  const enhancedSystem = createPairingSystem(players, {
    pairingSystem: 'fide_dutch',
    previousPairings: sectionPreviousPairings,
    colorHistory: sectionColorHistory,
    round,
    section: section,
    tiebreakerOrder: options.tiebreakerOrder || ['buchholz', 'sonneborn_berger', 'direct_encounter'],
    colorBalanceRules: options.colorBalanceRules || 'fide',
    accelerationSettings: options.accelerationSettings || {
      enabled: false,
      type: 'standard',
      rounds: 2,
      threshold: null
    },
    byeSettings: options.byeSettings || {
      fullPointBye: true,
      avoidUnratedDropping: true
    }
  });

  let pairings = enhancedSystem.generatePairings();
  
  // Apply manual overrides
  if (manualOverrides.length > 0) {
    pairings = applyManualOverrides(pairings, manualOverrides, round);
  }

  // Apply color preferences
  if (Object.keys(colorPreferences).length > 0) {
    pairings = applyColorPreferences(pairings, colorPreferences, colorHistory);
  }

  // Validate pairings if enabled
  if (enableValidation) {
    const validation = validateEnhancedPairings(pairings, players, round, sectionPreviousPairings, sectionColorHistory);
    if (!validation.is_valid) {
      console.warn('Pairing validation failed:', validation.errors);
    }
  }

  return {
    pairings,
    validation: enableValidation ? validateEnhancedPairings(pairings, players, round, sectionPreviousPairings, sectionColorHistory) : null
  };
}

/**
 * Generate knockout tournament pairings
 */
function generateKnockoutPairings(players, round, tournamentSettings = {}) {
  const { knockout_settings = {} } = tournamentSettings.settings || {};
  const { seeding_method = 'rating', consolation_bracket = false, third_place_playoff = false } = knockout_settings;

  if (players.length < 2) {
    return { pairings: [], bracket: [] };
  }

  // Seed players
  const seededPlayers = seedPlayers(players, seeding_method);
  
  // Generate bracket
  const bracket = generateBracket(seededPlayers, round);
  
  // Generate pairings for current round
  const pairings = generateKnockoutRoundPairings(bracket, round);

  return {
    pairings,
    bracket,
    totalRounds: Math.ceil(Math.log2(players.length))
  };
}

/**
 * Generate blitz/rapid tournament pairings
 */
function generateBlitzRapidPairings(players, round, tournamentSettings = {}) {
  const { blitz_rapid_settings = {} } = tournamentSettings.settings || {};
  const { rounds_per_day = 1, pairing_interval = 30 } = blitz_rapid_settings;

  // For blitz/rapid, use standard Swiss but with different time controls
  const basePairings = generateSwissPairings(
    players,
    round,
    [],
    [],
    {},
    tournamentSettings,
    {}
  );

  // Add time control information to each pairing
  const enhancedPairings = basePairings.map(pairing => ({
    ...pairing,
    time_control: blitz_rapid_settings.time_control || '5+0',
    start_time: calculateStartTime(round, pairing.board, pairing_interval),
    break_duration: blitz_rapid_settings.break_duration || 0
  }));

  return enhancedPairings;
}

/**
 * Generate simultaneous exhibition pairings
 */
function generateSimultaneousPairings(players, round, tournamentSettings = {}) {
  const { simultaneous_settings = {} } = tournamentSettings.settings || {};
  const { max_boards = 20, simultaneous_type = 'single' } = simultaneous_settings;

  const pairings = [];
  const boards = Math.min(players.length, max_boards);

  for (let i = 0; i < boards; i++) {
    if (i < players.length) {
      pairings.push({
        white_player_id: players[i].id,
        black_player_id: null, // Simultaneous exhibitions are typically against a master
        is_simultaneous: true,
        board: i + 1,
        simultaneous_master: true,
        time_control: simultaneous_settings.time_control || 'G/30'
      });
    }
  }

  return pairings;
}

/**
 * Generate multi-day tournament pairings
 */
function generateMultiDayPairings(players, round, day, tournamentSettings = {}) {
  const { multi_day_schedule = [] } = tournamentSettings.settings || {};
  const currentDay = multi_day_schedule.find(d => d.day_number === day);
  
  if (!currentDay) {
    throw new Error(`No schedule found for day ${day}`);
  }

  // Check if this round is scheduled for this day
  if (!currentDay.rounds.includes(round)) {
    return { pairings: [], message: `Round ${round} not scheduled for day ${day}` };
  }

  // Generate standard pairings for this round
  const pairings = generateSwissPairings(
    players,
    round,
    [],
    [],
    {},
    tournamentSettings,
    {}
  );

  // Add day-specific information
  const enhancedPairings = pairings.map(pairing => ({
    ...pairing,
    day: day,
    day_date: currentDay.date,
    start_time: currentDay.start_time,
    location: currentDay.location
  }));

  return enhancedPairings;
}

/**
 * Apply manual pairing overrides
 */
function applyManualOverrides(pairings, overrides, round) {
  const roundOverrides = overrides.filter(override => override.round === round);
  
  if (roundOverrides.length === 0) {
    return pairings;
  }

  // Create a map of overrides by original pairing ID
  const overrideMap = new Map();
  roundOverrides.forEach(override => {
    overrideMap.set(override.original_pairing_id, override);
  });

  // Apply overrides
  return pairings.map(pairing => {
    const override = overrideMap.get(pairing.id);
    if (override) {
      return {
        ...pairing,
        white_player_id: override.new_white_player_id,
        black_player_id: override.new_black_player_id,
        is_manual_override: true,
        override_reason: override.reason,
        override_created_by: override.created_by
      };
    }
    return pairing;
  });
}

/**
 * Apply color preferences
 */
function applyColorPreferences(pairings, colorPreferences, colorHistory) {
  return pairings.map(pairing => {
    if (pairing.is_bye || pairing.is_simultaneous) {
      return pairing;
    }

    const whitePreference = colorPreferences[pairing.white_player_id];
    const blackPreference = colorPreferences[pairing.black_player_id];

    // If both players have preferences, try to satisfy them
    if (whitePreference && blackPreference) {
      if (whitePreference.preferred_color === 'white' && blackPreference.preferred_color === 'black') {
        return pairing; // Already correct
      } else if (whitePreference.preferred_color === 'black' && blackPreference.preferred_color === 'white') {
        // Swap colors
        return {
          ...pairing,
          white_player_id: pairing.black_player_id,
          black_player_id: pairing.white_player_id,
          color_swapped: true
        };
      }
    }

    // If only one player has a preference, try to satisfy it
    if (whitePreference && whitePreference.preferred_color === 'black') {
      return {
        ...pairing,
        white_player_id: pairing.black_player_id,
        black_player_id: pairing.white_player_id,
        color_swapped: true
      };
    }

    if (blackPreference && blackPreference.preferred_color === 'white') {
      return {
        ...pairing,
        white_player_id: pairing.black_player_id,
        black_player_id: pairing.white_player_id,
        color_swapped: true
      };
    }

    return pairing;
  });
}

/**
 * Basic pairing validation
 */
function validatePairings(pairings, players, round, previousPairings, colorHistory) {
  const errors = [];
  const warnings = [];
  
  // Basic validation checks
  if (!Array.isArray(pairings)) {
    errors.push('Pairings must be an array');
    return { is_valid: errors.length === 0, errors, warnings };
  }
  
  if (pairings.length === 0) {
    warnings.push('No pairings generated');
    return { is_valid: true, errors, warnings };
  }
  
  // Check for duplicate pairings
  const seenPairs = new Set();
  pairings.forEach((pairing, index) => {
    if (pairing.white_player_id && pairing.black_player_id) {
      const pairKey = `${pairing.white_player_id}-${pairing.black_player_id}`;
      const reversePairKey = `${pairing.black_player_id}-${pairing.white_player_id}`;
      
      if (seenPairs.has(pairKey) || seenPairs.has(reversePairKey)) {
        errors.push(`Duplicate pairing at index ${index}`);
      }
      seenPairs.add(pairKey);
    }
  });
  
  return { is_valid: errors.length === 0, errors, warnings };
}

/**
 * Enhanced pairing validation
 */
function validateEnhancedPairings(pairings, players, round, previousPairings, colorHistory) {
  const baseValidation = validatePairings(pairings, players, round, previousPairings, colorHistory);
  
  const enhancedValidation = {
    ...baseValidation,
    color_preference_violations: [],
    manual_override_issues: [],
    time_control_issues: [],
    multi_day_issues: []
  };

  // Check for color preference violations
  pairings.forEach((pairing, index) => {
    if (pairing.color_swapped && pairing.color_swapped_reason) {
      enhancedValidation.color_preference_violations.push(
        `Board ${index + 1}: Colors swapped due to ${pairing.color_swapped_reason}`
      );
    }
  });

  // Check for manual override issues
  pairings.forEach((pairing, index) => {
    if (pairing.is_manual_override) {
      // Validate that the override doesn't create impossible situations
      if (pairing.white_player_id === pairing.black_player_id) {
        enhancedValidation.manual_override_issues.push(
          `Board ${index + 1}: Manual override creates self-pairing`
        );
      }
    }
  });

  // Check for time control issues
  pairings.forEach((pairing, index) => {
    if (pairing.time_control && !isValidTimeControl(pairing.time_control)) {
      enhancedValidation.time_control_issues.push(
        `Board ${index + 1}: Invalid time control format: ${pairing.time_control}`
      );
    }
  });

  // Check for multi-day issues
  pairings.forEach((pairing, index) => {
    if (pairing.day && pairing.day_date) {
      const dayDate = new Date(pairing.day_date);
      const today = new Date();
      if (dayDate < today) {
        enhancedValidation.multi_day_issues.push(
          `Board ${index + 1}: Scheduled for past date: ${pairing.day_date}`
        );
      }
    }
  });

  // Update overall validity
  enhancedValidation.is_valid = baseValidation.is_valid && 
    enhancedValidation.color_preference_violations.length === 0 &&
    enhancedValidation.manual_override_issues.length === 0 &&
    enhancedValidation.time_control_issues.length === 0 &&
    enhancedValidation.multi_day_issues.length === 0;

  return enhancedValidation;
}

/**
 * Seed players for knockout tournaments
 */
function seedPlayers(players, method) {
  switch (method) {
    case 'rating':
      return players.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'random':
      return shuffleArray([...players]);
    case 'manual':
      // For manual seeding, assume players are already in the desired order
      return players;
    default:
      return players.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
}

/**
 * Generate knockout bracket
 */
function generateBracket(seededPlayers, round) {
  const totalRounds = Math.ceil(Math.log2(seededPlayers.length));
  const bracket = [];
  
  // Generate first round matches
  for (let i = 0; i < seededPlayers.length; i += 2) {
    const match = {
      round: 1,
      match_number: Math.floor(i / 2) + 1,
      player1_id: seededPlayers[i].id,
      player2_id: seededPlayers[i + 1] ? seededPlayers[i + 1].id : null,
      is_bye: !seededPlayers[i + 1],
      board_number: Math.floor(i / 2) + 1
    };
    bracket.push(match);
  }

  // Generate subsequent rounds
  for (let r = 2; r <= totalRounds; r++) {
    const previousRoundMatches = bracket.filter(m => m.round === r - 1);
    const currentRoundMatches = [];
    
    for (let i = 0; i < previousRoundMatches.length; i += 2) {
      const match = {
        round: r,
        match_number: Math.floor(i / 2) + 1,
        player1_id: null, // Will be filled when previous round completes
        player2_id: null,
        is_bye: false,
        board_number: Math.floor(i / 2) + 1
      };
      currentRoundMatches.push(match);
    }
    
    bracket.push(...currentRoundMatches);
  }

  return bracket;
}

/**
 * Generate pairings for a specific knockout round
 */
function generateKnockoutRoundPairings(bracket, round) {
  const roundMatches = bracket.filter(match => match.round === round);
  
  return roundMatches.map(match => ({
    id: `knockout_${round}_${match.match_number}`,
    tournament_id: '', // Will be set by caller
    round: round,
    board: match.board_number,
    white_player_id: match.player1_id,
    black_player_id: match.player2_id,
    is_bye: match.is_bye,
    is_knockout: true,
    match_number: match.match_number
  }));
}

/**
 * Calculate start time for blitz/rapid tournaments
 */
function calculateStartTime(round, board, interval) {
  const baseTime = new Date();
  baseTime.setHours(9, 0, 0, 0); // Start at 9 AM
  
  const roundOffset = (round - 1) * 60; // 1 hour between rounds
  const boardOffset = (board - 1) * interval; // Interval between boards
  
  const totalMinutes = roundOffset + boardOffset;
  baseTime.setMinutes(baseTime.getMinutes() + totalMinutes);
  
  return baseTime.toISOString();
}

/**
 * Validate time control format
 */
function isValidTimeControl(timeControl) {
  // Basic validation for common time control formats
  const patterns = [
    /^\d+\+\d+$/, // e.g., "5+0", "3+2"
    /^G\/\d+$/, // e.g., "G/30", "G/60"
    /^\d+\/\d+\+\d+$/, // e.g., "40/90+30"
    /^\d+:\d+$/, // e.g., "5:00", "3:00"
  ];
  
  return patterns.some(pattern => pattern.test(timeControl));
}

/**
 * Shuffle array randomly
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get pairing history for visualization
 */
function getPairingHistory(tournamentId, playerId, rounds = null) {
  // This would typically query the database
  // For now, return a mock structure
  return {
    player_id: playerId,
    tournament_id: tournamentId,
    opponents: [],
    color_balance: 0,
    repeat_pairings: [],
    color_history: []
  };
}

/**
 * Generate QR codes for pairings
 */
function generatePairingQRCode(pairing, tournamentId) {
  const qrData = {
    tournament_id: tournamentId,
    round: pairing.round,
    board: pairing.board,
    white_player: pairing.white_name,
    black_player: pairing.black_name,
    time_control: pairing.time_control,
    start_time: pairing.start_time
  };
  
  // In a real implementation, you'd use a QR code library
  return `QR:${JSON.stringify(qrData)}`;
}

module.exports = {
  generateEnhancedSwissPairings,
  generateKnockoutPairings,
  generateBlitzRapidPairings,
  generateSimultaneousPairings,
  generateMultiDayPairings,
  applyManualOverrides,
  applyColorPreferences,
  validateEnhancedPairings,
  getPairingHistory,
  generatePairingQRCode
};
