# Team Pairing Logic Guards

## Summary
Added validation to ensure team pairing logic is ONLY used for team tournaments and individual pairing logic is NOT used for team tournaments.

## Changes Made

### 1. `server/utils/enhancedPairingSystem.js`
**Added format check in `generateTournamentPairings()` method**

**Location**: Lines 106-118

**Guard Logic**:
```javascript
// Check tournament format - team tournaments should not use this system
const tournament = await new Promise((resolve, reject) => {
  db.get('SELECT format FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

if (!tournament) {
  throw new Error('Tournament not found');
}

// Team tournaments should use the team-swiss endpoint
if (tournament.format === 'team-swiss' || tournament.format === 'team-round-robin') {
  throw new Error(`This tournament is a team tournament (${tournament.format}). Use the team-swiss pairing endpoint instead.`);
}
```

**Purpose**: Prevents `EnhancedPairingSystem` from being used on team tournaments

### 2. `server/utils/teamSwissPairingSystem.js`
**Added format check in `generateTournamentTeamPairings()` method**

**Location**: Lines 327-347

**Guard Logic**:
```javascript
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
if (tournament.format !== 'team-swiss' && tournament.format !== 'team-round-robin') {
  reject(new Error(`This tournament is not a team tournament (format: ${tournament.format}). Use the individual pairing system instead.`));
  return;
}
```

**Purpose**: Prevents `TeamSwissPairingSystem` from being used on individual tournaments

### 3. `server/routes/pairings.js`
**Endpoint already had format check**

**Existing Guard** (Line 2757):
```javascript
if (tournament.format !== 'team-swiss') {
  return res.status(400).json({
    success: false,
    error: 'This endpoint is only for team-swiss format tournaments'
  });
}
```

**Purpose**: API endpoint level validation for team-swiss endpoint

## Protection Matrix

| System | Individual Tournaments | Team Tournaments | Error Message |
|--------|------------------------|------------------|---------------|
| `EnhancedPairingSystem` | ✅ Allowed | ❌ Blocked | "This tournament is a team tournament..." |
| `TeamSwissPairingSystem` | ❌ Blocked | ✅ Allowed | "This tournament is not a team tournament..." |
| `/api/pairings/generate/team-swiss` | ❌ Blocked | ✅ Allowed | "This endpoint is only for team-swiss..." |

## Tournament Formats

### Individual Tournament Formats (use EnhancedPairingSystem)
- `swiss` - Individual Swiss tournament
- `online` - Online Lichess tournament  
- `quad` - Quad groups of 4 players
- `round-robin` - Round-robin individual
- `knockout` - Single elimination

### Team Tournament Formats (use TeamSwissPairingSystem)
- `team-swiss` - Team Swiss with board-by-board games ✅
- `team-round-robin` - Team round-robin ✅

## Error Scenarios

### Scenario 1: Individual pairing called on team tournament
```javascript
// User creates a team-swiss tournament
POST /api/pairings/generate
{
  "tournamentId": "team-tournament-uuid",
  "round": 1
}

// EnhancedPairingSystem detects format and blocks
Response: 400 Error
"This tournament is a team tournament (team-swiss). Use the team-swiss pairing endpoint instead."
```

### Scenario 2: Team pairing called on individual tournament
```javascript
// User creates a swiss tournament
POST /api/pairings/generate/team-swiss
{
  "tournamentId": "swiss-tournament-uuid",
  "round": 1
}

// TeamSwissPairingSystem detects format and blocks
Response: 400 Error
"This tournament is not a team tournament (format: swiss). Use the individual pairing system instead."
```

### Scenario 3: Team-swiss endpoint called on wrong format
```javascript
// API endpoint validation (first line of defense)
if (tournament.format !== 'team-swiss') {
  return res.status(400).json({
    error: 'This endpoint is only for team-swiss format tournaments'
  });
}
```

## Defense in Depth

Three layers of protection:

1. **API Endpoint Level** (`server/routes/pairings.js`)
   - Checks format before processing request
   - Returns immediate 400 error

2. **System Class Level** (`EnhancedPairingSystem.js`, `TeamSwissPairingSystem.js`)
   - Each system checks format before generation
   - Throws descriptive error if format mismatch

3. **Database Level**
   - Tournament format stored in database
   - Source of truth for validation

## Testing Recommendations

```javascript
// Test 1: Individual tournament trying to use team endpoint
test('Individual tournament blocked from team endpoint', async () => {
  const tournament = await createTournament({ format: 'swiss' });
  const response = await request(app)
    .post('/api/pairings/generate/team-swiss')
    .send({ tournamentId: tournament.id, round: 1 });
  
  expect(response.status).toBe(400);
  expect(response.body.error).toContain('team-swiss format');
});

// Test 2: Team tournament trying to use individual endpoint
test('Team tournament blocked from individual endpoint', async () => {
  const tournament = await createTournament({ format: 'team-swiss' });
  const response = await request(app)
    .post('/api/pairings/generate')
    .send({ tournamentId: tournament.id, round: 1 });
  
  expect(response.status).toBe(400);
  expect(response.body.error).toContain('team tournament');
});

// Test 3: Correct pairing system succeeds
test('Team tournament uses team endpoint successfully', async () => {
  const tournament = await createTeamTournament({ format: 'team-swiss' });
  const response = await request(app)
    .post('/api/pairings/generate/team-swiss')
    .send({ tournamentId: tournament.id, round: 1 });
  
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
});
```

## Status

✅ Individual pairing system blocks team tournaments  
✅ Team pairing system blocks individual tournaments  
✅ API endpoint validates format  
✅ Clear error messages for debugging  
✅ Defense in depth with three layers  

## Summary

Team pairing logic is now **completely isolated** from individual tournaments:
- EnhancedPairingSystem will reject team tournaments
- TeamSwissPairingSystem will reject individual tournaments  
- API endpoint provides immediate validation
- Database is source of truth for format

No crossover possible between the two systems!
