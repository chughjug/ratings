# Enhanced Chess Tournament API System

This document describes the comprehensive API system for chess tournament management with real-time registration, Google Sheets integration, and webhook support.

## 🚀 Overview

The enhanced API system provides multiple ways to integrate with chess tournaments:

1. **Real-time Player Registration** - Single player registration via API
2. **Bulk Player Import** - Import multiple players at once
3. **Google Sheets Integration** - Sync data with Google Sheets
4. **Webhook Support** - Real-time notifications
5. **Registration Forms** - Ready-to-use HTML forms

## 📋 API Endpoints

### 1. Single Player Registration
```
POST /api/players/register/{tournamentId}
```

**Purpose**: Register a single player in real-time

**Request Body**:
```json
{
  "api_key": "your-api-key",
  "name": "John Doe",
  "uscf_id": "12345678",
  "fide_id": "87654321",
  "rating": 1800,
  "section": "Open",
  "school": "Chess Academy",
  "grade": "12",
  "email": "john@example.com",
  "phone": "(555) 123-4567",
  "state": "CA",
  "city": "San Francisco",
  "parent_name": "Jane Doe",
  "parent_email": "jane@example.com",
  "parent_phone": "(555) 123-4568",
  "emergency_contact": "Emergency Contact",
  "emergency_phone": "(555) 123-4569",
  "tshirt_size": "L",
  "dietary_restrictions": "Vegetarian",
  "special_needs": "Wheelchair accessible",
  "notes": "Additional notes",
  "lookup_ratings": true,
  "auto_assign_sections": true,
  "webhook_url": "https://your-webhook-url.com/notify"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Player registered successfully",
  "data": {
    "player_id": "uuid-here",
    "tournament_id": "tournament-uuid",
    "tournament_name": "Chess Championship 2024",
    "player": {
      "name": "John Doe",
      "uscf_id": "12345678",
      "rating": 1800,
      "section": "Open",
      "school": "Chess Academy",
      "email": "john@example.com"
    },
    "rating_lookup": {
      "success": true,
      "rating": 1800,
      "expirationDate": "2024-12-31",
      "isActive": true
    },
    "auto_assigned_section": true
  }
}
```

### 2. Bulk Player Import
```
POST /api/players/api-import/{tournamentId}
```

**Purpose**: Import multiple players at once

**Request Body**:
```json
{
  "api_key": "your-api-key",
  "players": [
    {
      "name": "John Doe",
      "uscf_id": "12345678",
      "rating": 1800,
      "section": "Open",
      "school": "Chess Academy"
    },
    {
      "name": "Jane Smith",
      "uscf_id": "87654321",
      "rating": 1600,
      "section": "Reserve",
      "school": "Chess Academy"
    }
  ],
  "lookup_ratings": true,
  "auto_assign_sections": true,
  "source": "google_sheets",
  "webhook_url": "https://your-webhook-url.com/notify"
}
```

### 3. Get Tournament Registration Info
```
GET /api/players/tournament/{tournamentId}/registration-info?api_key=your-key
```

**Purpose**: Get all registration information and API details for a tournament

**Response**:
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "tournament-uuid",
      "name": "Chess Championship 2024",
      "format": "swiss",
      "rounds": 5,
      "start_date": "2024-01-15",
      "end_date": "2024-01-15",
      "city": "San Francisco",
      "state": "CA",
      "location": "Convention Center"
    },
    "api_endpoints": {
      "register_player": "https://your-domain.com/api/players/register/tournament-uuid",
      "import_players": "https://your-domain.com/api/players/api-import/tournament-uuid",
      "get_players": "https://your-domain.com/api/players/tournament/tournament-uuid"
    },
    "registration_form_url": "https://your-domain.com/register/tournament-uuid",
    "public_tournament_url": "https://your-domain.com/public/tournaments/tournament-uuid",
    "api_key": "your-api-key",
    "webhook_support": true,
    "supported_fields": [
      "name", "uscf_id", "fide_id", "rating", "section", "school", "grade",
      "email", "phone", "state", "city", "notes", "parent_name", "parent_email",
      "parent_phone", "emergency_contact", "emergency_phone", "tshirt_size",
      "dietary_restrictions", "special_needs"
    ]
  }
}
```

## 🔗 Registration Forms

### Public Registration Form
```
GET /register/{tournamentId}
```

**Purpose**: Serve a ready-to-use HTML registration form

**Features**:
- Beautiful, responsive design
- Real-time API integration
- Form validation
- Copy-paste ready examples
- Mobile-friendly interface

## 📊 Google Sheets Integration

### 1. Google Apps Script Integration

**File**: `google-apps-script.js`

**Setup**:
1. Open your Google Sheet
2. Go to Extensions → Apps Script
3. Replace the default code with the provided script
4. Update the configuration section
5. Run the setup function

**Features**:
- Real-time sync with tournament system
- Automatic player data mapping
- Error handling and logging
- Custom menu for manual operations
- Status tracking

### 2. Node.js Integration Script

**File**: `google-sheets-integration.js`

**Usage**:
```bash
node google-sheets-integration.js <tournament-id> <spreadsheet-id> [sheet-name]
```

**Environment Variables**:
```bash
export API_BASE_URL="https://your-domain.com"
export API_KEY="your-api-key"
export GOOGLE_CREDENTIALS_PATH="./google-credentials.json"
```

**Features**:
- Command-line interface
- Batch processing
- Error handling
- Results logging
- Flexible column mapping

## 🔔 Webhook Support

### Webhook Payload
When a webhook URL is provided, the system sends real-time notifications:

```json
{
  "event": "player_registered",
  "tournament_id": "tournament-uuid",
  "tournament_name": "Chess Championship 2024",
  "player": {
    "id": "player-uuid",
    "name": "John Doe",
    "uscf_id": "12345678",
    "rating": 1800,
    "section": "Open",
    "school": "Chess Academy",
    "email": "john@example.com"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Webhook Events
- `player_registered` - New player registered
- `player_updated` - Player information updated
- `player_withdrawn` - Player withdrawn from tournament

## 🛠️ Setup and Configuration

### 1. Environment Variables
```bash
# API Keys (comma-separated)
export API_KEYS="key1,key2,key3"

# Default key for development
# Uses "demo-key-123" if not set

# Google Sheets (optional)
export GOOGLE_CREDENTIALS_PATH="./google-credentials.json"
```

### 2. Database Migration
Run the migration to add new player fields:
```bash
node server/migrations/add-player-fields.js
```

### 3. Google Sheets Setup
1. Enable Google Sheets API in Google Cloud Console
2. Create service account and download credentials JSON
3. Share your Google Sheet with the service account email
4. Set `GOOGLE_CREDENTIALS_PATH` environment variable

## 📱 Usage Examples

### 1. JavaScript (Browser)
```javascript
// Register a single player
const response = await fetch('https://your-domain.com/api/players/register/tournament-uuid', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    api_key: 'your-api-key',
    name: 'John Doe',
    uscf_id: '12345678',
    rating: 1800,
    school: 'Chess Academy',
    email: 'john@example.com',
    webhook_url: 'https://your-webhook-url.com/notify'
  })
});

const result = await response.json();
console.log(result);
```

### 2. Python
```python
import requests

# Register a single player
url = 'https://your-domain.com/api/players/register/tournament-uuid'
payload = {
    'api_key': 'your-api-key',
    'name': 'John Doe',
    'uscf_id': '12345678',
    'rating': 1800,
    'school': 'Chess Academy',
    'email': 'john@example.com',
    'webhook_url': 'https://your-webhook-url.com/notify'
}

response = requests.post(url, json=payload)
result = response.json()
print(result)
```

### 3. cURL
```bash
curl -X POST "https://your-domain.com/api/players/register/tournament-uuid" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "your-api-key",
    "name": "John Doe",
    "uscf_id": "12345678",
    "rating": 1800,
    "school": "Chess Academy",
    "email": "john@example.com"
  }'
```

## 🔧 Advanced Features

### 1. Automatic Rating Lookup
- Fetches current USCF ratings
- Updates player data with latest information
- Sets rating expiration dates
- Marks players as active/inactive

### 2. Smart Section Assignment
- Analyzes tournament section settings
- Assigns players to appropriate sections based on ratings
- Overrides manual assignments when ratings are looked up

### 3. Data Validation
- Comprehensive input validation
- Required field checking
- Data type validation
- Range validation for ratings

### 4. Error Handling
- Detailed error messages
- Graceful failure handling
- Partial success reporting
- Comprehensive logging

## 📈 Performance Considerations

### 1. Rate Limiting
- 1000 requests per 15 minutes per IP
- Configurable limits
- Graceful degradation

### 2. Bulk Processing
- Efficient database operations
- Transaction support
- Memory management
- Progress tracking

### 3. Caching
- Rating lookup caching
- Tournament data caching
- Response caching

## 🔒 Security Features

### 1. Authentication
- API key validation
- Environment-based key management
- Secure key storage

### 2. Input Validation
- SQL injection prevention
- XSS protection
- Data sanitization

### 3. Error Handling
- No sensitive information in errors
- Proper HTTP status codes
- Audit logging

## 🧪 Testing

### 1. Test Scripts
- `test-api-import.js` - Command-line testing
- `test-api-import.html` - Web-based testing
- `test-registration.js` - Registration testing

### 2. Test Data
- Sample player data
- Error scenarios
- Edge cases

## 📚 Integration Guides

### 1. Google Sheets
- Step-by-step setup
- Column mapping
- Error handling
- Automation

### 2. Web Forms
- HTML form integration
- JavaScript examples
- Styling guidelines
- Mobile optimization

### 3. Third-party Systems
- API integration patterns
- Webhook implementation
- Error handling
- Monitoring

## 🚀 Deployment

### 1. Environment Setup
- Environment variables
- Database migration
- File permissions

### 2. Production Considerations
- API key management
- Rate limiting
- Monitoring
- Logging

### 3. Scaling
- Load balancing
- Database optimization
- Caching strategies

## 📞 Support

For technical support or questions:
- Check the tournament dashboard for API information
- Review error messages in API responses
- Test with provided examples
- Contact system administrators for API key management

## 🔄 Updates and Maintenance

### 1. API Versioning
- Backward compatibility
- Deprecation notices
- Migration guides

### 2. Feature Updates
- New field support
- Enhanced validation
- Performance improvements

### 3. Bug Fixes
- Error corrections
- Security patches
- Performance fixes

This enhanced API system provides a comprehensive solution for chess tournament management with real-time registration, Google Sheets integration, and webhook support. The system is designed to be flexible, scalable, and easy to integrate with existing systems.

