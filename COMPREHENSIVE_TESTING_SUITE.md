# 🧪 Comprehensive Chess Tournament API Testing Suite

This document describes the comprehensive testing system for the chess tournament API, including user authentication, API key management, player registration, bulk import/export, and Google Sheets integration.

## 📋 Overview

The testing suite provides multiple ways to test the chess tournament API system:

1. **Interactive Web Interface** - `api-testing-suite.html`
2. **Command Line Script** - `comprehensive-api-test.js`
3. **User Profile Management** - Built into the React application
4. **API Key Management** - Integrated with user accounts

## 🚀 Quick Start

### 1. Interactive Web Testing

Open `api-testing-suite.html` in your browser:

```bash
# Serve the file locally
python -m http.server 8000
# Then open http://localhost:8000/api-testing-suite.html
```

**Features:**
- Visual testing interface
- Real-time API testing
- Player registration forms
- Bulk import testing
- Live results display
- Copy-to-clipboard functionality

### 2. Command Line Testing

```bash
# Basic test
node comprehensive-api-test.js --username admin --password admin123 --tournament <tournament-id>

# Verbose testing
node comprehensive-api-test.js --username admin --password admin123 --tournament <tournament-id> --verbose

# Specific test types
node comprehensive-api-test.js --test auth
node comprehensive-api-test.js --test api-keys
node comprehensive-api-test.js --test players
node comprehensive-api-test.js --test bulk
node comprehensive-api-test.js --test sheets
```

### 3. User Profile Management

Access the user profile page in the React application to:
- Generate new API keys
- Manage existing API keys
- View usage statistics
- Set permissions and rate limits
- Revoke API keys

## 🔑 API Key Management

### Complex API Key System

The system now supports sophisticated API key management:

#### **Key Features:**
- **User-specific API keys** - Each user can generate multiple API keys
- **Complex key format** - `ctk_` prefix with 64-character hex string
- **Permission system** - Read, write, or read+write permissions
- **Rate limiting** - Configurable requests per hour
- **Usage tracking** - Monitor API key usage and statistics
- **Expiration dates** - Set expiration dates for security
- **Key naming** - Name and describe API keys for organization

#### **API Key Format:**
```
ctk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### **Permissions:**
- `read` - Can only read data
- `write` - Can only write data  
- `read,write` - Can read and write data

#### **Rate Limits:**
- Default: 1000 requests per hour
- Configurable per API key
- Tracked and enforced

### Database Schema

#### **Users Table (Enhanced):**
```sql
ALTER TABLE users ADD COLUMN api_key TEXT;
ALTER TABLE users ADD COLUMN api_key_created_at DATETIME;
ALTER TABLE users ADD COLUMN api_key_last_used DATETIME;
ALTER TABLE users ADD COLUMN api_key_usage_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN api_key_permissions TEXT DEFAULT "read,write";
ALTER TABLE users ADD COLUMN api_key_rate_limit INTEGER DEFAULT 1000;
ALTER TABLE users ADD COLUMN api_key_expires_at DATETIME;
```

#### **User API Keys Table:**
```sql
CREATE TABLE user_api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT DEFAULT "read,write",
  rate_limit INTEGER DEFAULT 1000,
  usage_count INTEGER DEFAULT 0,
  last_used DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

## 🧪 Testing Components

### 1. Interactive Web Interface (`api-testing-suite.html`)

**Features:**
- **Configuration Panel** - Set API URL, tournament ID, credentials
- **Authentication** - Login and generate API keys
- **Player Registration** - Test single player registration
- **Bulk Import** - Test bulk player import
- **Real-time Testing** - Live API testing with results
- **Player Management** - View and manage registered players
- **Activity Logging** - Comprehensive logging of all actions

**Usage:**
1. Open the HTML file in a browser
2. Enter your API base URL and tournament ID
3. Login with your credentials
4. Generate an API key
5. Test player registration and bulk import
6. View results and manage players

### 2. Command Line Script (`comprehensive-api-test.js`)

**Features:**
- **Automated Testing** - Run comprehensive test suites
- **Multiple Test Types** - Auth, API keys, players, bulk, sheets
- **Detailed Reporting** - JSON results with timestamps
- **Error Handling** - Comprehensive error reporting
- **Configurable** - Command line options for customization

**Command Line Options:**
```bash
--url <url>           API base URL (default: http://localhost:3001)
--username <user>     Username for authentication
--password <pass>     Password for authentication
--tournament <id>     Tournament ID for testing
--test <type>         Test type: auth, api-keys, players, bulk, sheets, all
--verbose             Enable verbose logging
--help                Show help
```

**Test Types:**
- `auth` - Test user authentication
- `api-keys` - Test API key management
- `players` - Test player registration and management
- `bulk` - Test bulk import/export
- `sheets` - Test Google Sheets integration
- `all` - Run all tests (default)

### 3. User Profile Management

**Features:**
- **API Key Generation** - Create new API keys with custom settings
- **Key Management** - View, update, and revoke API keys
- **Usage Statistics** - Monitor API key usage and performance
- **Permission Control** - Set read/write permissions
- **Rate Limiting** - Configure request limits
- **Security** - Secure key display and copying

## 📊 Test Results

### Test Output Format

The testing suite provides detailed results in multiple formats:

#### **Console Output:**
```
[2024-01-15T10:30:00.000Z] [INFO] Testing suite initialized. Ready to begin testing.
[2024-01-15T10:30:01.000Z] [INFO] ✅ User Login: Login successful
[2024-01-15T10:30:02.000Z] [INFO] ✅ Generate API Key: API key generated successfully
[2024-01-15T10:30:03.000Z] [INFO] ✅ Register Single Player: Player registered successfully
```

#### **JSON Results File:**
```json
{
  "config": {
    "apiBaseUrl": "http://localhost:3001",
    "username": "admin",
    "tournamentId": "tournament-uuid"
  },
  "summary": {
    "total": 15,
    "passed": 14,
    "failed": 1,
    "success_rate": 93.3
  },
  "tests": [
    {
      "name": "User Login",
      "passed": true,
      "message": "Login successful",
      "details": {
        "user": "admin",
        "role": "admin"
      },
      "timestamp": "2024-01-15T10:30:01.000Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:15.000Z"
}
```

## 🔧 API Endpoints

### User Management

#### **Generate API Key**
```http
POST /api/users/{userId}/api-key
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "My API Key",
  "description": "For testing purposes",
  "permissions": "read,write",
  "rate_limit": 1000
}
```

#### **List API Keys**
```http
GET /api/users/{userId}/api-keys
Authorization: Bearer {token}
```

#### **Update API Key**
```http
PUT /api/users/{userId}/api-keys/{keyId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated API Key",
  "description": "Updated description"
}
```

#### **Revoke API Key**
```http
DELETE /api/users/{userId}/api-keys/{keyId}
Authorization: Bearer {token}
```

### Player Management

#### **Register Single Player**
```http
POST /api/players/register/{tournamentId}
Content-Type: application/json

{
  "api_key": "ctk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "name": "John Doe",
  "uscf_id": "12345678",
  "rating": 1800,
  "section": "Open",
  "school": "Chess Academy",
  "email": "john@example.com",
  "lookup_ratings": true,
  "auto_assign_sections": true,
  "source": "testing_suite"
}
```

#### **Bulk Import Players**
```http
POST /api/players/api-import/{tournamentId}
Content-Type: application/json

{
  "api_key": "ctk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
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
  "source": "testing_suite"
}
```

## 🛠️ Setup and Installation

### 1. Database Migration

Run the API key migration:

```bash
node server/migrations/add-user-api-keys-fixed.js
```

### 2. Start the Server

```bash
# Development
npm run dev

# Production
npm start
```

### 3. Access Testing Interface

- **Web Interface**: Open `api-testing-suite.html` in browser
- **Command Line**: Run `node comprehensive-api-test.js --help`
- **User Profile**: Navigate to `/profile` in the React app

## 🔒 Security Features

### API Key Security

- **Complex Format** - 64-character hex string with prefix
- **User Isolation** - Each user's keys are separate
- **Permission Control** - Granular read/write permissions
- **Rate Limiting** - Configurable request limits
- **Expiration** - Optional key expiration dates
- **Usage Tracking** - Monitor and audit API usage
- **Revocation** - Immediate key revocation capability

### Authentication

- **JWT Tokens** - Secure user authentication
- **API Key Validation** - Real-time key validation
- **Permission Checks** - Verify permissions before operations
- **Rate Limiting** - Enforce rate limits per key
- **Audit Logging** - Track all API key operations

## 📈 Performance Monitoring

### Usage Statistics

Track API key performance:
- **Request Count** - Total requests per key
- **Last Used** - Most recent usage timestamp
- **Rate Limiting** - Current rate limit status
- **Error Rates** - Failed request tracking
- **Response Times** - Performance metrics

### Monitoring Dashboard

The user profile page provides:
- **Real-time Statistics** - Live usage data
- **Key Performance** - Individual key metrics
- **Usage Trends** - Historical usage patterns
- **Error Tracking** - Failed request analysis

## 🚀 Advanced Features

### Google Sheets Integration

- **Real-time Sync** - Automatic data synchronization
- **Custom Scripts** - Google Apps Script integration
- **Bulk Operations** - Efficient bulk data processing
- **Error Handling** - Robust error recovery
- **Status Tracking** - Operation status monitoring

### Webhook Support

- **Real-time Notifications** - Instant operation updates
- **Event Types** - Player registered, updated, withdrawn
- **Custom Endpoints** - Configurable webhook URLs
- **Retry Logic** - Automatic retry on failure
- **Security** - Secure webhook authentication

### Export/Import

- **Multiple Formats** - CSV, JSON, DBF support
- **Bulk Operations** - Efficient large-scale operations
- **Data Validation** - Comprehensive input validation
- **Error Reporting** - Detailed error information
- **Progress Tracking** - Real-time operation progress

## 📚 Examples

### Complete Testing Workflow

1. **Start Server**
   ```bash
   npm run dev
   ```

2. **Run Command Line Tests**
   ```bash
   node comprehensive-api-test.js --username admin --password admin123 --tournament <tournament-id> --verbose
   ```

3. **Open Web Interface**
   - Navigate to `api-testing-suite.html`
   - Configure API URL and tournament ID
   - Login and generate API key
   - Test player registration and bulk import

4. **Access User Profile**
   - Navigate to `/profile` in React app
   - Manage API keys
   - View usage statistics

### API Key Lifecycle

1. **Generate Key**
   ```javascript
   const response = await userApi.generateApiKey(userId, {
     name: 'Production API Key',
     description: 'For production use',
     permissions: 'read,write',
     rate_limit: 5000
   });
   ```

2. **Use Key**
   ```javascript
   const response = await fetch('/api/players/register/tournament-id', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       api_key: 'ctk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
       name: 'John Doe',
       // ... other player data
     })
   });
   ```

3. **Monitor Usage**
   ```javascript
   const stats = await userApi.getApiKeyStats(userId, keyId);
   console.log('Usage count:', stats.data.usage_count);
   ```

4. **Revoke Key**
   ```javascript
   await userApi.revokeApiKey(userId, keyId);
   ```

## 🎯 Best Practices

### API Key Management

- **Use Descriptive Names** - Name keys based on purpose
- **Set Appropriate Permissions** - Use least privilege principle
- **Monitor Usage** - Regularly check usage statistics
- **Rotate Keys** - Periodically generate new keys
- **Revoke Unused Keys** - Remove keys that are no longer needed

### Testing

- **Test Regularly** - Run tests before and after changes
- **Use Different Environments** - Test in dev, staging, and production
- **Monitor Performance** - Track response times and error rates
- **Document Issues** - Keep detailed logs of problems and solutions

### Security

- **Protect API Keys** - Never expose keys in client-side code
- **Use HTTPS** - Always use secure connections
- **Monitor Access** - Track who has access to keys
- **Implement Rate Limiting** - Prevent abuse and DoS attacks

## 🆘 Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Check if key is active and not expired
   - Verify permissions match required operation
   - Check rate limit hasn't been exceeded

2. **Authentication Failures**
   - Verify username and password are correct
   - Check if user account is active
   - Ensure JWT token is valid

3. **Player Registration Errors**
   - Verify tournament ID exists
   - Check required fields are provided
   - Ensure API key has write permissions

4. **Bulk Import Issues**
   - Check player data format
   - Verify all required fields are present
   - Check for duplicate players

### Debug Mode

Enable verbose logging for detailed debugging:

```bash
node comprehensive-api-test.js --verbose
```

### Log Files

Check server logs for detailed error information:
- `server.log` - General server logs
- `backend.log` - Backend-specific logs
- `frontend.log` - Frontend logs

## 📞 Support

For issues or questions:

1. **Check Documentation** - Review this guide and API documentation
2. **Run Tests** - Use the testing suite to identify issues
3. **Check Logs** - Review server and application logs
4. **Contact Support** - Reach out for additional help

---

**Happy Testing! 🧪✨**

The comprehensive testing suite provides everything you need to thoroughly test the chess tournament API system, from basic functionality to advanced features like API key management and Google Sheets integration.

