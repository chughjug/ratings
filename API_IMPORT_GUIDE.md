# API Import Guide: How Players Are Imported Into Tournaments

This guide explains how the chess tournament API handles player imports, including the different methods available and how they work.

## Overview

The API supports multiple ways to import players into tournaments:

1. **Single Player Registration** - Register one player at a time
2. **Bulk API Import** - Import multiple players via API
3. **CSV File Import** - Upload CSV files with player data
4. **Excel File Import** - Upload Excel files (.xlsx, .xls) with player data
5. **Real-time Registration** - Web-based registration forms

## Getting the Tournament API URL

### Development Environment
- **Default URL**: `http://localhost:3001` (or `http://localhost:5000` for backend-only)
- **Frontend**: `http://localhost:3000` (with proxy to backend)
- **Backend API**: `http://localhost:5000/api`

### Production Environment
- **Heroku**: `https://your-app-name.herokuapp.com`
- **Custom Domain**: `https://your-domain.com`
- **API Base**: Add `/api` to your domain (e.g., `https://your-domain.com/api`)

### Environment Configuration
The API URL is determined by:

1. **Environment Variables**:
   ```bash
   # For client (React)
   REACT_APP_API_URL=https://your-api.com
   
   # For server
   PORT=5000
   NODE_ENV=production
   ```

2. **Configuration Files**:
   ```json
   // api-config.json
   {
     "production": {
       "apiBaseUrl": "https://your-production-api.com"
     },
     "staging": {
       "apiBaseUrl": "https://staging-api.com"
     }
   }
   ```

3. **Auto-detection**:
   - Development: Uses relative URLs (`/api`)
   - Production: Uses relative URLs with proxy
   - Heroku: Uses `https://app-name.herokuapp.com`

### Finding Your Tournament ID
1. **Via Web Interface**: Go to tournament details page, ID is in URL
2. **Via API**: `GET /api/tournaments` to list all tournaments
3. **Via Database**: Check `tournaments` table in SQLite database

## API Endpoints

### 1. Single Player Registration
```
POST /api/players/register/:tournamentId
```

**Purpose**: Register a single player into a tournament

**Required Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "api_key": "your-api-key",
  "name": "John Doe",
  "uscf_id": "12345678",
  "fide_id": "1234567",
  "rating": 1800,
  "section": "Open",
  "school": "Chess Academy",
  "grade": "12",
  "email": "john@example.com",
  "phone": "555-1234",
  "state": "CA",
  "city": "San Francisco",
  "notes": "First tournament",
  "parent_name": "Jane Doe",
  "parent_email": "jane@example.com",
  "parent_phone": "555-5678",
  "emergency_contact": "Jane Doe",
  "emergency_phone": "555-5678",
  "tshirt_size": "L",
  "dietary_restrictions": "None",
  "special_needs": "None",
  "lookup_ratings": true,
  "auto_assign_sections": true,
  "source": "registration_form"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Player registered successfully",
  "data": {
    "player_id": "uuid-here",
    "player": {
      "id": "uuid-here",
      "name": "John Doe",
      "rating": 1800,
      "section": "Open",
      "uscf_id": "12345678"
    },
    "rating_lookup_result": {
      "success": true,
      "rating": 1800,
      "expiration_date": "2024-12-31"
    }
  }
}
```

### 2. Bulk API Import
```
POST /api/players/api-import/:tournamentId
```

**Purpose**: Import multiple players at once via API

**Request Body**:
```json
{
  "api_key": "your-api-key",
  "players": [
    {
      "name": "Player 1",
      "uscf_id": "11111111",
      "rating": 1600,
      "section": "Reserve"
    },
    {
      "name": "Player 2",
      "uscf_id": "22222222",
      "rating": 1400,
      "section": "U1600"
    }
  ],
  "lookup_ratings": true,
  "auto_assign_sections": true,
  "source": "api",
  "webhook_url": "https://your-webhook.com/endpoint"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully imported 2 players",
  "data": {
    "tournament_id": "tournament-uuid",
    "tournament_name": "Chess Championship 2024",
    "imported_count": 2,
    "player_ids": ["uuid1", "uuid2"],
    "rating_lookup_results": [
      {
        "success": true,
        "rating": 1600,
        "expiration_date": "2024-12-31"
      },
      {
        "success": true,
        "rating": 1400,
        "expiration_date": "2024-12-31"
      }
    ],
    "import_errors": [],
    "validation_errors": []
  }
}
```

### 3. CSV File Import
```
POST /api/players/csv-upload
Content-Type: multipart/form-data
```

**Purpose**: Upload and parse CSV files with player data

**Form Data**:
- `csvFile`: CSV file
- `tournament_id`: Tournament ID
- `lookup_ratings`: boolean (optional, default: true)

**CSV Format**:
```csv
name,uscf_id,rating,section,school,email
John Doe,12345678,1800,Open,Chess Academy,john@example.com
Jane Smith,87654321,1600,Reserve,Chess Academy,jane@example.com
```

**Response**:
```json
{
  "success": true,
  "totalRows": 2,
  "validPlayers": 2,
  "players": [
    {
      "name": "John Doe",
      "uscf_id": "12345678",
      "rating": 1800,
      "section": "Open"
    }
  ],
  "parseErrors": [],
  "validationErrors": []
}
```

### 4. Excel File Import
```
POST /api/players/excel-upload
Content-Type: multipart/form-data
```

**Purpose**: Upload and parse Excel files (.xlsx, .xls) with player data

**Form Data**:
- `excelFile`: Excel file (.xlsx or .xls)
- `tournament_id`: Tournament ID
- `lookup_ratings`: boolean (optional, default: true)

**Excel Format**:
The Excel file should have a "Players" worksheet (or the first worksheet will be used) with the following columns:

| Name | USCF ID | FIDE ID | Rating | Section | Team | Status | State | City | Email | Phone | Bye Rounds | Expiration Date | Notes |
|------|---------|---------|--------|---------|------|--------|-------|------|-------|-------|------------|-----------------|-------|
| John Doe | 12345678 | 987654321 | 1800 | Open | Chess Club A | active | CA | San Francisco | john@example.com | 555-1234 | 1,3 | 2024-12-31 | Club champion |
| Jane Smith | 87654321 | | 1600 | Reserve | Chess Club B | active | NY | New York | jane@example.com | 555-5678 | | | |

**Response**:
```json
{
  "success": true,
  "totalRows": 2,
  "validPlayers": 2,
  "players": [
    {
      "name": "John Doe",
      "uscf_id": "12345678",
      "rating": 1800,
      "section": "Open"
    }
  ],
  "parseErrors": [],
  "validationErrors": []
}
```

**Template Downloads**:
- CSV Template: `GET /api/players/csv-template`
- Excel Template: `GET /api/players/excel-template`

## How the Import Process Works

### 1. Authentication
- All API endpoints require an `api_key`
- API keys are validated against environment variables
- Default demo key: `demo-key-123`

### 2. Tournament Validation
- System checks if tournament exists
- Validates tournament is active and accepting registrations

### 3. Player Data Validation
- **Required**: `name` (must be non-empty string)
- **Optional**: All other fields including `section`
- **USCF ID**: Must be numeric if provided
- **FIDE ID**: Must be numeric if provided
- **Rating**: Must be between 0-3000 if provided
- **Section**: Not required - can be auto-assigned based on rating

### 4. Rating Lookup (Optional)
- If `lookup_ratings: true` and player has USCF ID
- System queries US Chess database for current rating
- Updates player rating with official data
- Caches results for performance

### 5. Section Assignment (Optional)
- If `auto_assign_sections: true` and player has rating
- System matches player rating to tournament sections
- Assigns appropriate section based on rating ranges
- Falls back to "Open" section if no match

### 6. Database Storage
- Generates unique UUID for each player
- Stores player data in `players` table
- Links player to tournament via `tournament_id`
- Sets default status to "active"

### 7. Response Generation
- Returns success/failure status
- Includes player IDs for reference
- Provides rating lookup results
- Lists any validation errors

## Supported Player Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Player's full name |
| `uscf_id` | string | No | US Chess Federation ID |
| `fide_id` | string | No | FIDE ID |
| `rating` | number | No | Player's rating (0-3000) |
| `section` | string | No | Tournament section |
| `school` | string | No | School or organization |
| `grade` | string | No | Grade level |
| `email` | string | No | Email address |
| `phone` | string | No | Phone number |
| `state` | string | No | State/province |
| `city` | string | No | City |
| `notes` | string | No | Additional notes |
| `parent_name` | string | No | Parent/guardian name |
| `parent_email` | string | No | Parent email |
| `parent_phone` | string | No | Parent phone |
| `emergency_contact` | string | No | Emergency contact name |
| `emergency_phone` | string | No | Emergency contact phone |
| `tshirt_size` | string | No | T-shirt size |
| `dietary_restrictions` | string | No | Dietary restrictions |
| `special_needs` | string | No | Special needs |
| `expiration_date` | string | No | USCF membership expiration date |
| `intentional_bye_rounds` | string | No | Comma-separated list of bye rounds |
| `uscf_regular_rating_date` | string | No | USCF regular rating date |
| `uscf_name` | string | No | Official USCF name |
| `created_at` | string | No | Player creation date (ISO format) |
| `source` | string | No | Import source (default: "api") |

## Error Handling

### Common Error Responses

**401 Unauthorized**:
```json
{
  "success": false,
  "error": "API key is required"
}
```

**404 Not Found**:
```json
{
  "success": false,
  "error": "Tournament not found"
}
```

**400 Bad Request**:
```json
{
  "success": false,
  "error": "Player at index 0 must have a valid name"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Failed to import players via API"
}
```

## Performance Features

### 1. Rating Lookup Optimization
- **Caching**: Results are cached to avoid duplicate lookups
- **Worker Threads**: Parallel processing for bulk imports
- **Batch Processing**: Groups requests for efficiency

### 2. Database Optimization
- **Prepared Statements**: Prevents SQL injection
- **Transaction Batching**: Groups database operations
- **Indexing**: Optimized queries on tournament_id

### 3. Memory Management
- **Streaming**: Large CSV files processed in chunks
- **Garbage Collection**: Automatic cleanup of temporary data
- **Resource Limits**: File size and memory limits enforced

## Usage Examples

### Using the Simple API Script
```bash
# Interactive mode
node simple-api.js --interactive

# Quick test with tournament
node simple-api.js --test --tournament 123

# Using wrapper script
./api --interactive
./api production --test --tournament 456
```

### Using cURL
```bash
# Single player registration
curl -X POST http://localhost:3001/api/players/register/tournament-id \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "demo-key-123",
    "name": "John Doe",
    "uscf_id": "12345678",
    "rating": 1800
  }'

# Bulk import
curl -X POST http://localhost:3001/api/players/api-import/tournament-id \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "demo-key-123",
    "players": [
      {"name": "Player 1", "rating": 1600},
      {"name": "Player 2", "rating": 1400}
    ]
  }'
```

### Using JavaScript/Node.js
```javascript
const { makeRequest, registerPlayer, bulkRegisterPlayers } = require('./simple-api.js');

// Single player
const result = await registerPlayer({
  name: 'John Doe',
  uscf_id: '12345678',
  rating: 1800
});

// Bulk import
const players = [
  { name: 'Player 1', rating: 1600 },
  { name: 'Player 2', rating: 1400 }
];
const bulkResult = await bulkRegisterPlayers(players);
```

## Best Practices

1. **Always validate data** before sending to API
2. **Use bulk import** for multiple players to improve performance
3. **Enable rating lookup** for accurate player ratings
4. **Use auto-assign sections** to automatically categorize players
5. **Handle errors gracefully** and provide user feedback
6. **Cache API keys** securely in your application
7. **Test with small batches** before large imports
8. **Monitor API responses** for validation errors

## Troubleshooting

### Common Issues
- **API key invalid**: Check environment variables or use demo key
- **Tournament not found**: Verify tournament ID exists
- **Validation errors**: Check required fields and data types
- **Rating lookup fails**: Ensure USCF ID is valid and numeric
- **Section assignment fails**: Check tournament section configuration

### Debug Mode
Enable verbose logging by setting environment variable:
```bash
DEBUG=api:import node simple-api.js --interactive
```
