# USCF Player Name Import Feature

## Overview

The system now automatically extracts player names from USCF ID lookups. When you import a player using their USCF ID, the system will fetch and populate:

- **Player Name** (from USCF page: "ID: NAME" format)
- **Rating** (Regular, Quick, Blitz, Online variants)
- **Expiration Date** (membership expiration)
- **Active Status** (determined by expiration date)

## HTML Format Parsed

The system extracts player names from the USCF Member Services Area (MSA) page where the name appears in the following format:

```html
<td align="center">
  <font size="+1"><b>14970943: AARUSH CHUGH</b></font>
</td>
```

The extraction process identifies the colon-separated format and cleanly extracts just the player name portion.

## Implementation Details

### Updated Services

#### `server/services/ratingLookup.js`

**Function: `getUSCFInfo(playerId)`**
- Now returns an object with the following properties:
  ```javascript
  {
    rating: number|null,
    expirationDate: string|null,    // Format: MM/DD/YYYY
    isActive: boolean,
    name: string|null,               // NEW: Player name extracted from USCF page
    error: string|null
  }
  ```

**Function: `lookupAndUpdatePlayer(db, playerId, uscfId)`**
- Updated to store the player name in the database
- Database update now includes: `name`, `rating`, `expiration_date`, and `status`
- Returns result with `name` field included

#### `server/services/csvImport.js`

**Function: `lookupRatingsUltraFast(playersWithUSCF)`**
- Now includes the USCF-extracted name in results
- Returns: `name` from USCF lookup (or original if lookup fails)

**Function: `processWorkerBatch(worker, players)`**
- Updated to use USCF name when available: `data.result.name || data.name`
- Provides fallback to original name if USCF lookup fails

### Cache Integration

The name is cached along with other player data:
```javascript
ratingCache.set(data.uscfId, {
  name: result.name,          // NEW
  rating: result.rating,
  expirationDate: result.expirationDate,
  isActive: result.isActive
});
```

## Extraction Algorithm

1. **Fetch USCF MSA Page** - Gets the player profile page from USCF
2. **Parse HTML** - Uses cheerio to load and parse the HTML
3. **Locate Name Row** - Finds the table row where the first cell contains the player ID
4. **Extract First Line** - Takes only the first line to avoid capturing subsequent page content
5. **Parse Colon Format** - Extracts the name using regex: `ID: NAME`
6. **Validate** - Ensures the extracted name is non-empty

### Example Extraction

**Input HTML:**
```html
<td align="center">
  <font size="+1"><b>14970943: AARUSH CHUGH</b></font>
</td>
```

**Extraction Steps:**
1. Find row with "14970943"
2. Get first line: "14970943: AARUSH CHUGH"
3. Extract after colon: "AARUSH CHUGH"
4. Store: `name = "AARUSH CHUGH"`

## Usage Examples

### CSV Import with USCF ID

When importing players via CSV with USCF ID:

```csv
Name,USCF ID
John Smith,12345678
```

The system will:
1. Use provided name if available
2. Look up USCF data using the ID
3. Update name from USCF if found: "JOHN SMITH"
4. Store the USCF name in the database

### Direct API Usage

```javascript
const result = await getUSCFInfo('14970943');
// Returns:
// {
//   name: 'AARUSH CHUGH',
//   rating: 1568,
//   expirationDate: '03/31/2026',
//   isActive: true,
//   error: null
// }
```

## Database Schema Updates

The `players` table now stores:
- `name` - Updated from USCF lookup
- `rating` - Rating from USCF
- `expiration_date` - Membership expiration
- `status` - 'active' or 'inactive' based on expiration

Update SQL:
```sql
UPDATE players 
SET name = ?, rating = ?, expiration_date = ?, status = ? 
WHERE id = ?
```

## Error Handling

If name extraction fails:
- Returns `name: null` but continues processing
- Falls back to provided name if available
- Logs error for debugging
- Rating and expiration date are still extracted and used

## Performance Characteristics

- **Cache Hit**: Instant (from LRU cache)
- **First Lookup**: ~2-5 seconds (HTTP request + parsing)
- **Batch Processing**: Uses worker threads for parallelization
- **LRU Cache TTL**: 30 minutes

## Testing

To verify the feature:

```javascript
const { getUSCFInfo } = require('./server/services/ratingLookup');

// Test with known USCF ID
const result = await getUSCFInfo('14970943');
console.log(result.name);  // Should output: "AARUSH CHUGH"
```

## Backward Compatibility

- Existing code continues to work
- `name` field is optional in return values
- If name extraction fails, other data (rating, expiration) is still returned
- Legacy systems can ignore the `name` field

## Notes

- Name extraction specifically looks for colon-separated format: "ID: NAME"
- Only the first line is parsed to avoid capturing subsequent page content
- The USCF name overwrites the provided name only if explicitly from USCF lookup
- Multiple rating types are extracted (Regular, Quick, Blitz, Online variants)
