# Programmatic Player Import API

This document describes the API endpoint for programmatically importing players into chess tournaments.

## Overview

The API allows external systems to import players into tournaments using a simple REST endpoint with JSON payloads. This is useful for integrating with registration systems, tournament management software, or other chess-related applications.

## Authentication

The API uses API key authentication. Include your API key in the request body.

**Default API Key:** `demo-key-123` (for development/testing)

**Production Setup:** Set the `API_KEYS` environment variable with comma-separated valid keys:
```bash
export API_KEYS="your-key-1,your-key-2,your-key-3"
```

## Endpoint

```
POST /api/players/api-import/{tournamentId}
```

### URL Parameters

- `tournamentId` (required): The unique identifier of the tournament

### Headers

```
Content-Type: application/json
```

### Request Body

```json
{
  "api_key": "your-api-key",
  "players": [
    {
      "name": "John Doe",
      "uscf_id": "12345678",
      "rating": 1800,
      "section": "Open"
    },
    {
      "name": "Jane Smith",
      "uscf_id": "87654321",
      "rating": 1600,
      "section": "Reserve"
    }
  ],
  "lookup_ratings": true,
  "auto_assign_sections": true
}
```

### Request Parameters

#### Required Fields

- `api_key` (string): Your API key for authentication
- `players` (array): Array of player objects to import

#### Player Object Fields

- `name` (string, required): Player's full name
- `uscf_id` (string, optional): USCF member ID for rating lookup
- `fide_id` (string, optional): FIDE member ID
- `rating` (number, optional): Player's rating (0-3000)
- `section` (string, optional): Tournament section name
- `status` (string, optional): Player status ("active", "withdrawn", "bye")
- `state` (string, optional): Player's state/province
- `city` (string, optional): Player's city
- `email` (string, optional): Player's email address
- `phone` (string, optional): Player's phone number
- `notes` (string, optional): Additional notes about the player

#### Optional Parameters

- `lookup_ratings` (boolean, default: true): Whether to lookup ratings for players with USCF IDs
- `auto_assign_sections` (boolean, default: true): Whether to automatically assign sections based on ratings

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Successfully imported 2 players",
  "data": {
    "tournament_id": "tournament-uuid",
    "tournament_name": "Chess Championship 2024",
    "imported_count": 2,
    "player_ids": ["player-uuid-1", "player-uuid-2"],
    "rating_lookup_results": [
      {
        "name": "John Doe",
        "uscf_id": "12345678",
        "success": true,
        "rating": 1800,
        "expirationDate": "2024-12-31",
        "isActive": true,
        "error": null
      }
    ],
    "import_errors": [],
    "validation_errors": []
  }
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Tournament not found"
}
```

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Players array is required and must not be empty"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to import players via API"
}
```

## Usage Examples

### cURL

```bash
curl -X POST "https://your-domain.com/api/players/api-import/tournament-uuid" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "demo-key-123",
    "players": [
      {
        "name": "John Doe",
        "uscf_id": "12345678",
        "rating": 1800,
        "section": "Open"
      }
    ],
    "lookup_ratings": true,
    "auto_assign_sections": true
  }'
```

### JavaScript (Fetch API)

```javascript
const response = await fetch('https://your-domain.com/api/players/api-import/tournament-uuid', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    api_key: 'demo-key-123',
    players: [
      {
        name: 'John Doe',
        uscf_id: '12345678',
        rating: 1800,
        section: 'Open'
      }
    ],
    lookup_ratings: true,
    auto_assign_sections: true
  })
});

const data = await response.json();
console.log(data);
```

### Python (requests)

```python
import requests

url = 'https://your-domain.com/api/players/api-import/tournament-uuid'
payload = {
    'api_key': 'demo-key-123',
    'players': [
        {
            'name': 'John Doe',
            'uscf_id': '12345678',
            'rating': 1800,
            'section': 'Open'
        }
    ],
    'lookup_ratings': True,
    'auto_assign_sections': True
}

response = requests.post(url, json=payload)
data = response.json()
print(data)
```

### PHP (cURL)

```php
<?php
$url = 'https://your-domain.com/api/players/api-import/tournament-uuid';
$data = [
    'api_key' => 'demo-key-123',
    'players' => [
        [
            'name' => 'John Doe',
            'uscf_id' => '12345678',
            'rating' => 1800,
            'section' => 'Open'
        ]
    ],
    'lookup_ratings' => true,
    'auto_assign_sections' => true
];

$options = [
    'http' => [
        'header' => "Content-type: application/json\r\n",
        'method' => 'POST',
        'content' => json_encode($data)
    ]
];

$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);
$response = json_decode($result, true);
?>
```

## Features

### Automatic Rating Lookup

When `lookup_ratings` is enabled and players have USCF IDs, the system will:
- Look up current ratings from the US Chess database
- Update player ratings with the latest information
- Set rating expiration dates
- Mark players as active/inactive based on membership status

### Automatic Section Assignment

When `auto_assign_sections` is enabled, the system will:
- Analyze tournament section settings
- Assign players to appropriate sections based on their ratings
- Override manual section assignments if ratings are looked up

### Data Validation

The API performs comprehensive validation:
- Required fields are present and valid
- Rating values are within acceptable ranges (0-3000)
- USCF IDs are numeric when provided
- Player names are not empty
- Tournament exists and is accessible

### Error Handling

The API provides detailed error information:
- Validation errors for individual players
- Import errors for failed operations
- Rating lookup results with success/failure status
- Comprehensive error messages for debugging

## Rate Limiting

Currently, no rate limiting is implemented. In production, consider implementing:
- Request rate limiting per API key
- Daily/monthly usage quotas
- Burst protection for high-volume imports

## Security Considerations

1. **API Key Management**: Store API keys securely and rotate them regularly
2. **HTTPS Only**: Always use HTTPS in production
3. **Input Validation**: All inputs are validated and sanitized
4. **Error Information**: Avoid exposing sensitive system information in error messages
5. **Access Logging**: Log all API requests for monitoring and debugging

## Integration Tips

1. **Batch Imports**: Import players in batches of 50-100 for optimal performance
2. **Error Handling**: Always check the response for errors and handle them appropriately
3. **Rating Lookup**: Use rating lookup for accurate player data, but be aware it may slow down imports
4. **Section Assignment**: Let the system auto-assign sections unless you have specific requirements
5. **Testing**: Test with small batches before importing large numbers of players

## Support

For technical support or questions about the API:
- Check the tournament dashboard for the API Import button
- Review error messages in API responses
- Test with the provided examples
- Contact system administrators for API key management

