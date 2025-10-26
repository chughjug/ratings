# Tournament Format Fix

## Issue
When creating a new tournament from a template, the format was reverting to old formats. This was caused by:

1. **Backend validation missing 'team-swiss'**: The server validation only accepted 'swiss', 'online', 'quad' but not 'team-swiss'
2. **Invalid template formats**: Templates used formats like 'blitz', 'rapid', 'knockout', 'simultaneous', 'multi-day' which aren't supported
3. **No format validation on template selection**: When selecting templates with invalid formats, they weren't being validated or mapped

## Changes Made

### 1. Server Validation (`server/routes/tournaments.js`)
- Added 'team-swiss' to the allowed formats list in the PUT route (line 267)
- Added format validation to the POST route (lines 148-154)

**Before:**
```javascript
if (!['swiss', 'online', 'quad'].includes(format)) {
  // Error
}
```

**After:**
```javascript
if (!['swiss', 'online', 'quad', 'team-swiss'].includes(format)) {
  // Error
}
```

### 2. Template Service (`client/src/services/templateService.ts`)
- Fixed invalid formats in templates by changing to 'swiss':
  - 'blitz' → 'swiss'
  - 'rapid' → 'swiss'
  - 'knockout' → 'swiss'
  - 'simultaneous' → 'swiss'
  - 'multi-day' → 'swiss'

These templates still work correctly but now use valid formats while maintaining their specialized settings.

### 3. CreateTournament Component (`client/src/pages/CreateTournament.tsx`)
- Added format validation in `handleTemplateSelect` function
- Invalid formats now default to 'swiss' instead of being passed through
- Prevents errors when templates are loaded from localStorage with old invalid formats

## Valid Tournament Formats
The system now consistently uses these four formats:
1. **swiss** - Standard Swiss system tournament
2. **online** - Online Lichess integration
3. **quad** - Quad system (players in groups of 4)
4. **team-swiss** - Team-based Swiss system

## Testing
To verify the fix:
1. Create a new tournament
2. Select a template (any should work now)
3. Verify the format is set correctly and persists
4. Save the tournament - format should remain as selected
5. Edit the tournament - format should remain as initially set

## Notes
- Old tournaments with invalid formats in the database will still work but may need to be updated
- Templates loaded from localStorage will automatically default to 'swiss' if they have invalid formats
- The system now validates formats at creation and update to prevent future issues

