# API Quick Reference Card

## 🎯 Required vs Optional Fields

### ✅ Required Fields
- **`name`** - Player's full name (string, non-empty)

### ❌ Optional Fields (All Others)
- **`section`** - Tournament section (can be auto-assigned)
- **`uscf_id`** - US Chess Federation ID (numeric if provided)
- **`fide_id`** - FIDE ID (numeric if provided)
- **`rating`** - Player rating (0-3000 if provided)
- **`school`** - School/organization
- **`email`** - Email address
- **`phone`** - Phone number
- **`state`** - State/province
- **`city`** - City
- **`notes`** - Additional notes
- **`parent_name`** - Parent/guardian name
- **`parent_email`** - Parent email
- **`parent_phone`** - Parent phone
- **`emergency_contact`** - Emergency contact name
- **`emergency_phone`** - Emergency contact phone
- **`tshirt_size`** - T-shirt size
- **`dietary_restrictions`** - Dietary restrictions
- **`special_needs`** - Special needs

## 🌐 API URLs

### Development
```bash
# Backend API
http://localhost:5000/api

# Frontend (with proxy)
http://localhost:3000
```

### Production
```bash
# Heroku
https://your-app-name.herokuapp.com/api

# Custom Domain
https://your-domain.com/api
```

## 🔑 API Key
- **Default**: `demo-key-123`
- **Environment**: Set `API_KEYS` environment variable
- **Format**: Comma-separated list of valid keys

## 📋 Quick Examples

### Minimal Player Registration
```json
{
  "api_key": "demo-key-123",
  "name": "John Doe"
}
```

### Complete Player Registration
```json
{
  "api_key": "demo-key-123",
  "name": "John Doe",
  "uscf_id": "12345678",
  "rating": 1800,
  "section": "Open",
  "school": "Chess Academy",
  "email": "john@example.com",
  "lookup_ratings": true,
  "auto_assign_sections": true
}
```

### Bulk Import
```json
{
  "api_key": "demo-key-123",
  "players": [
    {"name": "Player 1", "rating": 1600},
    {"name": "Player 2", "rating": 1400}
  ],
  "lookup_ratings": true,
  "auto_assign_sections": true
}
```

## 🚀 Quick Commands

### Using Simple API Script
```bash
# Interactive mode
node simple-api.js --interactive

# Quick test
node simple-api.js --test --tournament 123

# With custom URL
node simple-api.js --url https://api.example.com --interactive
```

### Using Wrapper Script
```bash
# Default environment
./api --interactive

# Production environment
./api production --test --tournament 456

# Staging environment
./api staging --interactive
```

### Using cURL
```bash
# Single player
curl -X POST http://localhost:5000/api/players/register/tournament-id \
  -H "Content-Type: application/json" \
  -d '{"api_key": "demo-key-123", "name": "John Doe"}'

# Bulk import
curl -X POST http://localhost:5000/api/players/api-import/tournament-id \
  -H "Content-Type: application/json" \
  -d '{"api_key": "demo-key-123", "players": [{"name": "Player 1"}]}'
```

## 🔍 Finding Tournament ID

### Method 1: Web Interface
1. Go to tournament details page
2. Tournament ID is in the URL: `/tournaments/{tournament-id}`

### Method 2: API Call
```bash
curl http://localhost:5000/api/tournaments
```

### Method 3: Database
```sql
SELECT id, name FROM tournaments;
```

## ⚡ Auto-Features

### Rating Lookup
- **Enable**: `"lookup_ratings": true`
- **Requires**: USCF ID
- **Result**: Updates player rating with official USCF data

### Section Assignment
- **Enable**: `"auto_assign_sections": true`
- **Requires**: Player rating
- **Result**: Automatically assigns appropriate tournament section

## 🛠️ Configuration

### Environment Variables
```bash
# Server
PORT=5000
NODE_ENV=production
API_KEYS=key1,key2,key3

# Client
REACT_APP_API_URL=https://your-api.com
```

### Configuration File (api-config.json)
```json
{
  "default": {
    "apiBaseUrl": "http://localhost:5000",
    "username": "admin",
    "password": "admin123"
  },
  "production": {
    "apiBaseUrl": "https://your-api.com",
    "username": "admin",
    "password": "your-password"
  }
}
```

## ❌ Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `API key is required` | Missing api_key | Add `"api_key": "demo-key-123"` |
| `Tournament not found` | Invalid tournament ID | Check tournament ID exists |
| `Name is required` | Missing name field | Add `"name": "Player Name"` |
| `Invalid API key` | Wrong API key | Use `demo-key-123` or set API_KEYS |
| `Too many requests` | Rate limit exceeded | Wait 15 minutes or increase limit |

## 📞 Support

- **Documentation**: See `API_IMPORT_GUIDE.md`
- **Examples**: See `simple-api.js`
- **Configuration**: See `api-config.json`
- **Testing**: Use `./api --interactive`
