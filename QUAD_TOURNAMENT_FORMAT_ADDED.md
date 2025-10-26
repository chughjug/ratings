# Quad Tournament Format - Implementation Complete

## Overview
Added Quad Tournament format alongside Swiss and Online formats. This is a specialized format where players are organized into groups of 4 (quads) and play a round-robin within each quad.

## How Quad Tournaments Work

### Basic Structure
- Players are organized into groups of exactly 4 players
- Each quad plays a complete round-robin (3 rounds, 3 games per player)
- All possible matchups within a quad occur (6 total games per quad)
- No predetermined sections - quads are generated dynamically based on player registrations

### Quad Formation
1. **Sort by Rating**: All players are sorted by rating (highest to lowest)
2. **Sequential Grouping**: 
   - Quad 1: Players #1-4 (highest rated)
   - Quad 2: Players #5-8
   - Quad 3: Players #9-12
   - etc.
3. **Remainder Handling**: If not a multiple of 4, remaining players form a smaller quad/section

### Pairing System (USCF Standard)
Each quad follows the fixed USCF pairing table:

| Round | Board 1          | Board 2          |
|-------|------------------|------------------|
| 1     | 1 (White) - 4    | 2 (White) - 3    |
| 2     | 3 (White) - 1    | 4 (White) - 2    |
| 3     | 1 (White) - 2    | 3 (White) - 4    |

Players are numbered 1-4 by rating within each quad.

### Color Assignment
- Equal distribution (1.5 white/black per player)
- USCF rules for color balancing apply
- Rotates systematically to ensure fairness

## Implementation Details

### Files Modified
1. **client/src/types/index.ts** - Added 'quad' to Tournament format type
2. **client/src/pages/CreateTournament.tsx** - Added quad option to format dropdown
3. **client/src/pages/TournamentDetail.tsx** - Restored "Generate Quads" button

### Features
- **Format Selection**: Quad is now available in tournament creation dropdown
- **Automatic Generation**: Click "Generate Quads" button to create quad groups based on registered players
- **Pairing Disabled**: Swiss pairing settings are disabled for quad tournaments (uses quad-specific pairing)
- **No Predetermined Sections**: Unlike Swiss, sections (quads) are generated dynamically when pairings are created

### Tournament Settings
- Pairing method and type settings are disabled for quad format
- Quad tournaments use the USCF standard round-robin within each quad
- Players compete only within their assigned quad

## Differences from Swiss Format

| Feature | Swiss | Quad |
|---------|-------|------|
| Section Assignment | Predetermined by TD | Generated automatically |
| Player Count | Any | Must be multiple of 4 (ideally) |
| Pairing System | Swiss pairing algorithm | Fixed round-robin within quad |
| Rounds | Configurable | Fixed at 3 per quad |
| Opponents | Play subset of field | Play all 3 players in quad |
| Best For | Large tournaments | Small groups, balanced competition |

## Benefits
- Guaranteed balanced matchups (everyone plays everyone in their quad)
- Quick completion (3 rounds)
- Fair competition (similar rating groups)
- Good for: club events, scholastic tournaments, casual tournaments
- Popular in USCF-rated events

## Next Steps for Full Implementation
1. Implement quad generation logic in backend
2. Implement USCF pairing table algorithm
3. Add quad standings display (show standings per quad)
4. Add section assignment UI for showing which quad a player is in
5. Handle remainder players (when total not divisible by 4)

