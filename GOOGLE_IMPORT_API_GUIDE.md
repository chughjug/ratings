# Google Sheets and Forms Import API Guide

This guide provides comprehensive documentation for importing player data from Google Sheets and Google Forms into your chess tournament management system.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Google Sheets Import](#google-sheets-import)
4. [Google Forms Import](#google-forms-import)
5. [Smart Import Features](#smart-import-features)
6. [API Endpoints](#api-endpoints)
7. [Field Mapping](#field-mapping)
8. [Error Handling](#error-handling)
9. [Examples](#examples)
10. [Troubleshooting](#troubleshooting)

## Overview

The Google Import API allows you to seamlessly import player data from:
- **Google Sheets**: Import from spreadsheets with flexible column mapping
- **Google Forms**: Import from form responses with automatic field detection
- **Smart Import**: Intelligent data mapping, validation, and recommendations

### Key Features

- ✅ **Flexible Field Mapping**: Automatically detects and maps various column names
- ✅ **Smart Data Validation**: Identifies data quality issues and provides recommendations
- ✅ **USCF Rating Lookup**: Automatically fetches current ratings for USCF members
- ✅ **Section Assignment**: Auto-assigns players to appropriate sections based on ratings
- ✅ **Error Reporting**: Detailed error reporting with specific row/response information
- ✅ **Preview Mode**: Preview data before importing
- ✅ **Bulk Processing**: Efficiently handles large datasets

## Authentication

All API endpoints require an API key for authentication.

### API Key

Include your API key in the request body:

```json
{
  "api_key": "your-api-key-here",
  // ... other parameters
}
```

**Demo Key**: Use `demo-key-123` for testing purposes.

## Google Sheets Import

### Basic Import

Import players from a Google Sheets spreadsheet.

**Endpoint**: `POST /api/google-import/sheets`

**Parameters**:
- `spreadsheet_id` (required): Google Sheets spreadsheet ID or full URL
- `tournament_id` (required): Target tournament ID
- `range` (optional): Sheet range (default: "Sheet1!A1:Z1000")
- `lookup_ratings` (optional): Enable USCF rating lookup (default: true)
- `auto_assign_sections` (optional): Auto-assign sections (default: true)
- `api_key` (required): Your API key

**Example Request**:
```bash
curl -X POST http://localhost:5000/api/google-import/sheets \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "tournament_id": "tournament-123",
    "range": "Sheet1!A1:Z1000",
    "lookup_ratings": true,
    "auto_assign_sections": true,
    "api_key": "demo-key-123"
  }'
```

### Smart Import

Use intelligent field mapping and data validation.

**Endpoint**: `POST /api/google-import/smart/sheets`

**Additional Features**:
- Automatic field detection and mapping
- Data quality analysis
- Intelligent recommendations
- Enhanced error reporting

**Example Request**:
```bash
curl -X POST http://localhost:5000/api/google-import/smart/sheets \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "tournament_id": "tournament-123",
    "range": "Sheet1!A1:Z1000",
    "lookup_ratings": true,
    "auto_assign_sections": true,
    "api_key": "demo-key-123"
  }'
```

### Preview Data

Preview data before importing.

**Endpoint**: `POST /api/google-import/sheets/preview`

**Example Request**:
```bash
curl -X POST http://localhost:5000/api/google-import/sheets/preview \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "range": "Sheet1!A1:Z1000",
    "api_key": "demo-key-123"
  }'
```

## Google Forms Import

### Basic Import

Import players from Google Forms responses.

**Endpoint**: `POST /api/google-import/forms`

**Parameters**:
- `form_id` (required): Google Forms form ID or full URL
- `tournament_id` (required): Target tournament ID
- `lookup_ratings` (optional): Enable USCF rating lookup (default: true)
- `auto_assign_sections` (optional): Auto-assign sections (default: true)
- `api_key` (required): Your API key

**Example Request**:
```bash
curl -X POST http://localhost:5000/api/google-import/forms \
  -H "Content-Type: application/json" \
  -d '{
    "form_id": "1FAIpQLSfExampleFormId",
    "tournament_id": "tournament-123",
    "lookup_ratings": true,
    "auto_assign_sections": true,
    "api_key": "demo-key-123"
  }'
```

### Smart Import

Use intelligent field mapping for forms.

**Endpoint**: `POST /api/google-import/smart/forms`

**Example Request**:
```bash
curl -X POST http://localhost:5000/api/google-import/smart/forms \
  -H "Content-Type: application/json" \
  -d '{
    "form_id": "1FAIpQLSfExampleFormId",
    "tournament_id": "tournament-123",
    "lookup_ratings": true,
    "auto_assign_sections": true,
    "api_key": "demo-key-123"
  }'
```

### Preview Data

Preview form responses before importing.

**Endpoint**: `POST /api/google-import/forms/preview`

**Example Request**:
```bash
curl -X POST http://localhost:5000/api/google-import/forms/preview \
  -H "Content-Type: application/json" \
  -d '{
    "form_id": "1FAIpQLSfExampleFormId",
    "api_key": "demo-key-123"
  }'
```

## Smart Import Features

### Intelligent Field Mapping

The smart import system automatically detects and maps various column names to standard fields:

| Field | Detected Variations |
|-------|-------------------|
| Name | name, player name, full name, first name, last name, player |
| USCF ID | uscf id, uscf_id, uscf, member id, member_id, id |
| FIDE ID | fide id, fide_id, fide |
| Rating | rating, uscf rating, regular rating, current rating, elo rating |
| Section | section, division, class, category, group, bracket |
| Team | team name, team_name, team, club, club name, organization |
| State | state, state/province, province, region, territory |
| City | city, city/town, town, municipality, location city |
| Email | email, email address, e-mail, email addr, contact email |
| Phone | phone, phone number, telephone, phone num, contact phone |
| School | school, institution, university, college, academy |
| Grade | grade, year, class year, school year, academic year |
| Notes | notes, comments, remarks, additional info, special notes |

### Data Quality Analysis

Smart import provides comprehensive data quality analysis:

- **Field Presence**: Tracks which fields are present and their completeness
- **Data Validation**: Identifies invalid data patterns
- **Duplicate Detection**: Finds potential duplicate entries
- **Suspicious Data**: Flags obviously fake or test data
- **Recommendations**: Provides actionable suggestions for data improvement

### Quality Metrics

- **Excellent**: 90%+ field completion
- **Good**: 70-89% field completion
- **Fair**: 50-69% field completion
- **Poor**: 1-49% field completion
- **Missing**: 0% field completion

## API Endpoints

### Google Sheets

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/google-import/sheets` | Basic import from Google Sheets |
| POST | `/api/google-import/smart/sheets` | Smart import from Google Sheets |
| POST | `/api/google-import/sheets/preview` | Preview Google Sheets data |
| GET | `/api/google-import/sheets/info` | Get spreadsheet information |

### Google Forms

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/google-import/forms` | Basic import from Google Forms |
| POST | `/api/google-import/smart/forms` | Smart import from Google Forms |
| POST | `/api/google-import/forms/preview` | Preview Google Forms data |
| GET | `/api/google-import/forms/info` | Get form information |

## Field Mapping

### Supported Fields

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| name | string | Player's full name | Yes |
| uscf_id | string | USCF membership ID | No |
| fide_id | string | FIDE ID | No |
| rating | number | Current rating | No |
| section | string | Tournament section | No |
| team_name | string | Team or club name | No |
| state | string | State or province | No |
| city | string | City or town | No |
| email | string | Email address | No |
| phone | string | Phone number | No |
| school | string | School or institution | No |
| grade | string | Grade or year | No |
| notes | string | Additional notes | No |
| parent_name | string | Parent/guardian name | No |
| parent_email | string | Parent/guardian email | No |
| parent_phone | string | Parent/guardian phone | No |

### Data Validation

- **Name**: Required, non-empty string
- **USCF ID**: Numeric string (if provided)
- **FIDE ID**: Numeric string (if provided)
- **Rating**: Number between 0-3000 (if provided)
- **Email**: Valid email format (if provided)
- **Phone**: Any non-empty string (if provided)

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Spreadsheet ID is required"
}
```

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

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to import from Google Sheets",
  "details": "Specific error message"
}
```

### Import Errors

Import errors are included in the response:

```json
{
  "success": true,
  "data": {
    "imported_count": 45,
    "import_errors": [
      {
        "row": 3,
        "error": "Missing or invalid player name",
        "data": ["", "12345", "1800"]
      }
    ],
    "validation_errors": [
      {
        "row": 7,
        "player": "John Doe",
        "errors": ["Invalid USCF ID format"]
      }
    ]
  }
}
```

## Examples

### Complete Import Workflow

#### 1. Preview Data
```bash
curl -X POST http://localhost:5000/api/google-import/sheets/preview \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "api_key": "demo-key-123"
  }'
```

#### 2. Import with Smart Features
```bash
curl -X POST http://localhost:5000/api/google-import/smart/sheets \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "tournament_id": "tournament-123",
    "lookup_ratings": true,
    "auto_assign_sections": true,
    "api_key": "demo-key-123"
  }'
```

#### 3. Check Results
```json
{
  "success": true,
  "message": "Successfully imported 45 players using smart import",
  "data": {
    "tournament_id": "tournament-123",
    "tournament_name": "Spring Chess Championship",
    "imported_count": 45,
    "player_ids": ["player-1", "player-2", ...],
    "rating_lookup_results": [
      {
        "name": "John Doe",
        "uscf_id": "12345",
        "success": true,
        "rating": 1850,
        "expirationDate": "2024-12-31",
        "isActive": true
      }
    ],
    "field_mapping": {
      "name": { "quality": "excellent", "percentage": 100 },
      "uscf_id": { "quality": "good", "percentage": 78 },
      "rating": { "quality": "fair", "percentage": 65 }
    },
    "data_analysis": {
      "totalPlayers": 45,
      "recommendations": [
        {
          "type": "info",
          "field": "email",
          "message": "No email addresses found. Consider collecting emails for tournament communications."
        }
      ]
    }
  }
}
```

### JavaScript Integration

```javascript
// Import players from Google Sheets
async function importFromGoogleSheets(spreadsheetId, tournamentId) {
  try {
    const response = await fetch('/api/google-import/smart/sheets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spreadsheet_id: spreadsheetId,
        tournament_id: tournamentId,
        lookup_ratings: true,
        auto_assign_sections: true,
        api_key: 'your-api-key'
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`Imported ${result.data.imported_count} players`);
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

// Usage
importFromGoogleSheets('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', 'tournament-123')
  .then(data => {
    console.log('Import successful:', data);
  })
  .catch(error => {
    console.error('Import failed:', error);
  });
```

### Python Integration

```python
import requests
import json

def import_from_google_sheets(spreadsheet_id, tournament_id, api_key):
    url = "http://localhost:5000/api/google-import/smart/sheets"
    
    payload = {
        "spreadsheet_id": spreadsheet_id,
        "tournament_id": tournament_id,
        "lookup_ratings": True,
        "auto_assign_sections": True,
        "api_key": api_key
    }
    
    response = requests.post(url, json=payload)
    result = response.json()
    
    if result["success"]:
        print(f"Imported {result['data']['imported_count']} players")
        return result["data"]
    else:
        raise Exception(result["error"])

# Usage
try:
    data = import_from_google_sheets(
        "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
        "tournament-123",
        "your-api-key"
    )
    print("Import successful:", data)
except Exception as e:
    print("Import failed:", e)
```

## Troubleshooting

### Common Issues

#### 1. "Google service account credentials file not found"
**Solution**: Ensure the Google service account JSON file is present at `/server/fluent-cinema-476115-a6-e76b30820fd1.json`

#### 2. "Spreadsheet not found" or "Form not found"
**Solutions**:
- Verify the spreadsheet/form ID is correct
- Ensure the spreadsheet/form is publicly accessible or shared with the service account
- Check that the spreadsheet/form exists and is not deleted

#### 3. "No data found in the specified range"
**Solutions**:
- Verify the range parameter includes data
- Check that the sheet name is correct
- Ensure the spreadsheet has data in the specified range

#### 4. "Invalid API key"
**Solutions**:
- Use the correct API key
- For testing, use `demo-key-123`
- Contact administrator for production API keys

#### 5. "Tournament not found"
**Solutions**:
- Verify the tournament ID exists
- Ensure the tournament is active
- Check that you have access to the tournament

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
DEBUG=google-import
```

### Performance Tips

1. **Use Smart Import**: More efficient and provides better error handling
2. **Limit Range**: Specify appropriate ranges instead of importing entire sheets
3. **Batch Processing**: For large datasets, consider splitting into smaller batches
4. **Preview First**: Always preview data before importing to catch issues early

### Support

For additional support or questions:
1. Check the server logs for detailed error messages
2. Use the preview endpoints to validate data before importing
3. Review the field mapping documentation for column name variations
4. Contact the system administrator for API key issues

---

## Quick Reference

### Required Setup
1. Google service account JSON file in `/server/` directory
2. Valid API key for authentication
3. Google Sheets/Forms with appropriate permissions

### Quick Start
1. Get your Google Sheets/Forms ID
2. Use the preview endpoint to check data
3. Use smart import for best results
4. Review the response for any errors or recommendations

### Best Practices
1. Always preview data before importing
2. Use smart import for automatic field mapping
3. Enable rating lookup and section assignment
4. Review data quality recommendations
5. Handle errors gracefully in your application
