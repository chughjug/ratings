# Simple API Execution

This directory contains simplified tools for testing and interacting with the chess tournament API.

## Quick Start

### 1. Interactive Mode (Recommended)
```bash
node simple-api.js --interactive
```

### 2. Quick Test Mode
```bash
node simple-api.js --test --tournament <tournament-id>
```

### 3. Using the Wrapper Script
```bash
# Use default environment
./api --interactive

# Use specific environment
./api production --test --tournament 123

# Use staging environment
./api staging --interactive
```

## Files

- `simple-api.js` - Main API execution script
- `api-config.json` - Configuration file for different environments
- `api` - Wrapper script for easy execution
- `test-registration-api.js` - Original detailed test script
- `comprehensive-api-test.js` - Original comprehensive test script

## Features

### Simple API Script (`simple-api.js`)
- **Interactive Mode**: Step-by-step guided testing
- **Quick Test Mode**: Automated basic functionality test
- **Color-coded Output**: Easy to read results
- **Error Handling**: Clear error messages
- **Flexible Configuration**: Command-line options

### Configuration Management
- **Multiple Environments**: Default, production, staging
- **Easy Switching**: Use different configs with one command
- **Secure**: Keep credentials in config file

## Usage Examples

### Basic Testing
```bash
# Test API connection and authentication
node simple-api.js --test

# Test with specific tournament
node simple-api.js --test --tournament 123

# Interactive mode with custom credentials
node simple-api.js --interactive --username admin --password admin123
```

### Using Different Environments
```bash
# Edit api-config.json to add your environments
# Then use:
./api production --interactive
./api staging --test --tournament 456
```

### Common Operations in Interactive Mode
1. **Test Connection** - Verify API is reachable
2. **Register Single Player** - Add one player with custom details
3. **Bulk Register Players** - Add multiple test players
4. **Get Players** - List all players in tournament
5. **Get Tournament Info** - View tournament details
6. **Set Tournament ID** - Change active tournament

## Configuration

Edit `api-config.json` to add your environments:

```json
{
  "default": {
    "apiBaseUrl": "http://localhost:3001",
    "username": "admin",
    "password": "admin123",
    "tournamentId": null
  },
  "my-production": {
    "apiBaseUrl": "https://my-api.com",
    "username": "myuser",
    "password": "mypassword",
    "tournamentId": "123"
  }
}
```

## Command Line Options

```bash
node simple-api.js [options] [mode]

Options:
  --url <url>           API base URL
  --username <user>     Username for authentication
  --password <pass>     Password for authentication
  --tournament <id>     Tournament ID for testing

Modes:
  --interactive, -i     Interactive mode
  --test, -t            Quick test mode
  --help, -h            Show help
```

## Migration from Old Scripts

The old scripts (`test-registration-api.js` and `comprehensive-api-test.js`) are still available but the new `simple-api.js` provides:

- **Easier to use**: Interactive mode guides you through testing
- **Better error handling**: Clear, color-coded messages
- **More flexible**: Works with or without tournament ID
- **Cleaner code**: Focused on essential functionality
- **Configuration management**: Easy environment switching

## Troubleshooting

### Common Issues
1. **Connection Failed**: Check if the API server is running
2. **Login Failed**: Verify username/password in config
3. **Tournament Not Found**: Ensure tournament ID exists
4. **Permission Denied**: Check if user has API key permissions

### Getting Help
```bash
node simple-api.js --help
./api --help
```

## Development

The `simple-api.js` script exports functions that can be used in other scripts:

```javascript
const { makeRequest, login, registerPlayer } = require('./simple-api.js');

// Use in your own scripts
const authData = await login();
const result = await registerPlayer({ name: 'Test Player' });
```
