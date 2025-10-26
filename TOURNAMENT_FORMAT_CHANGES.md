# Tournament Format Changes Summary

## Overview
Reduced tournament formats from 11 options to 2 options:
1. **Swiss** - Traditional Swiss system pairing (unchanged)
2. **Online** - Online tournament with Lichess integration (new)

## Files Modified

### 1. `client/src/types/index.ts`
- Changed Tournament interface format type from:
  ```typescript
  format: 'swiss' | 'round-robin' | 'knockout' | 'team-swiss' | 'team-round-robin' | 'individual-team-swiss' | 'blitz' | 'rapid' | 'simultaneous' | 'multi-day' | 'quad';
  ```
  to:
  ```typescript
  format: 'swiss' | 'online';
  ```

### 2. `client/src/pages/CreateTournament.tsx`
- Updated formData format field to only accept 'swiss' | 'online'
- Updated format dropdown to show only 2 options:
  - Swiss System
  - Online (Lichess)
- Disabled pairing method and pairing type fields when "Online" format is selected
  (since online tournaments use Lichess's pairing system)

## Removed Formats
- round-robin
- knockout
- team-swiss
- team-round-robin
- individual-team-swiss
- blitz
- rapid
- simultaneous
- multi-day
- quad

## Notes
- Swiss format functionality remains completely unchanged
- Online format integrates with existing Lichess integration components
- Backend code may still reference old formats for backward compatibility with existing tournaments
- The Lichess integration component (`LichessIntegration.tsx`) is already implemented and ready to use
