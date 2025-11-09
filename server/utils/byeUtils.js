function normalizeByeRounds(input) {
  const rounds = new Set();

  const addRound = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return;
    }
    const round = Math.trunc(value);
    if (round > 0) {
      rounds.add(round);
    }
  };

  const process = (value) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(process);
      return;
    }

    if (typeof value === 'number') {
      addRound(value);
      return;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }

      try {
        const parsedJson = JSON.parse(trimmed);
        process(parsedJson);
        return;
      } catch (err) {
        // Not JSON, fall through to pattern parsing
      }

      const matches = trimmed.match(/\d+/g);
      if (matches) {
        matches.forEach((numStr) => {
          const parsed = parseInt(numStr, 10);
          if (!Number.isNaN(parsed)) {
            addRound(parsed);
          }
        });
      }
      return;
    }
  };

  process(input);

  return Array.from(rounds).sort((a, b) => a - b);
}

function byeRoundsToStorage(input) {
  const normalized = normalizeByeRounds(input);
  return normalized.length > 0 ? JSON.stringify(normalized) : null;
}

module.exports = {
  normalizeByeRounds,
  byeRoundsToStorage,
};

