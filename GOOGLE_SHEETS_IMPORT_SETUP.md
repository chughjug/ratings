# Google Sheets Import Setup Guide

This guide explains how to set up and use the Google Sheets import functionality for importing player data into chess tournaments.

## Overview

The Google Sheets import feature allows you to:
- Import player data directly from Google Sheets spreadsheets
- Import player registrations from Google Forms responses
- Preview data before importing
- Use intelligent field mapping to automatically detect player information
- Test with demo data without requiring actual Google Sheets access

## Quick Start (Demo Mode)

For testing purposes, you can use demo data without setting up Google Sheets:

1. Open the Google Import modal
2. Select "Google Sheets" as the import type
3. Enter "demo" in the Spreadsheet ID field (or click "Use Demo Data" button)
4. Click "Preview Data" to see sample player data
5. Click "Import Players" to import the demo data

## Production Setup

To use real Google Sheets data, you need to set up Google API credentials:

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable Required APIs

Enable the following APIs in your Google Cloud project:
- Google Sheets API
- Google Forms API (if using Forms import)

### 3. Create Service Account Credentials

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Enter a name and description
4. Click "Create and Continue"
5. Skip role assignment for now
6. Click "Done"

### 4. Generate Service Account Key

1. Click on your newly created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Download the JSON file
6. Rename it to `fluent-cinema-476115-a6-e76b30820fd1.json`
7. Place it in the project root directory

### 5. Share Your Spreadsheet

1. Open your Google Sheets document
2. Click "Share" button
3. Add the service account email (found in the JSON file as `client_email`)
4. Give it "Viewer" permissions
5. Click "Send"

## Using the Import Feature

### Google Sheets Import

1. **Prepare Your Spreadsheet**
   - Create a spreadsheet with player data
   - Use clear column headers (Name, USCF ID, Rating, etc.)
   - Ensure the first row contains headers
   - Place data starting from row 2

2. **Import Process**
   - Open the tournament you want to import players to
   - Click "Import Players" > "Google Import"
   - Select "Google Sheets"
   - Enter your spreadsheet URL or ID
   - Configure import options
   - Click "Preview Data" to review
   - Click "Import Players" to complete

### Google Forms Import

1. **Prepare Your Form**
   - Create a Google Form for player registration
   - Include questions for player information
   - Use clear question titles

2. **Import Process**
   - Select "Google Forms" in the import modal
   - Enter your form URL or ID
   - Configure import options
   - Preview and import the data

## Field Mapping

The system automatically detects common field names:

### Player Information
- **Name**: name, player name, full name, first name, last name
- **USCF ID**: uscf id, uscf_id, uscf, member id, member_id, id
- **FIDE ID**: fide id, fide_id, fide, fide number
- **Rating**: rating, uscf rating, regular rating, current rating, elo rating

### Contact Information
- **Email**: email, email address, e-mail, contact email
- **Phone**: phone, phone number, telephone, contact phone
- **State**: state, state/province, province, region
- **City**: city, city/town, town, municipality

### Tournament Information
- **Section**: section, division, class, category, group
- **Team**: team name, team_name, team, club, club name
- **School**: school, institution, university, college
- **Grade**: grade, year, class year, school year

## Import Options

### Smart Import (Recommended)
- Automatically detects and maps fields
- Validates data quality
- Provides intelligent recommendations
- Handles various data formats

### Rating Lookup
- Automatically fetches current USCF ratings
- Updates player ratings based on USCF ID
- Can be disabled for faster imports

### Auto-assign Sections
- Automatically assigns players to sections based on ratings
- Uses tournament section configuration
- Can be disabled for manual section assignment

## Error Handling

The system provides detailed error messages for common issues:

### Authentication Errors
- **Invalid credentials**: Check your service account JSON file
- **API not enabled**: Enable Google Sheets API in Google Cloud Console
- **Access denied**: Share your spreadsheet with the service account email

### Data Errors
- **Invalid spreadsheet ID**: Check the spreadsheet URL or ID
- **No data found**: Ensure the spreadsheet has data in the specified range
- **Invalid range**: Check the range specification (e.g., Sheet1!A1:Z1000)

### Validation Errors
- **Missing names**: Ensure all players have names
- **Invalid ratings**: Check rating values (should be 0-3000)
- **Invalid USCF IDs**: Ensure USCF IDs are numeric

## Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Verify the service account JSON file is in the correct location
   - Check that the Google Sheets API is enabled
   - Ensure the service account has proper permissions

2. **"Access denied"**
   - Share your spreadsheet with the service account email
   - Check that the service account has at least "Viewer" permissions

3. **"Spreadsheet not found"**
   - Verify the spreadsheet ID is correct
   - Ensure the spreadsheet exists and is accessible

4. **"No data found"**
   - Check that the spreadsheet has data in the specified range
   - Verify the range specification is correct

### Debug Mode

To enable debug logging, set the environment variable:
```bash
DEBUG=google-sheets-import
```

## Security Considerations

- Keep your service account JSON file secure
- Never commit credentials to version control
- Use environment variables for production deployments
- Regularly rotate service account keys
- Limit service account permissions to minimum required

## API Reference

### Preview Endpoint
```
POST /api/google-import/sheets/preview
Content-Type: application/json

{
  "spreadsheet_id": "your-spreadsheet-id",
  "range": "Sheet1!A1:Z1000",
  "api_key": "your-api-key"
}
```

### Import Endpoint
```
POST /api/google-import/sheets
Content-Type: application/json

{
  "spreadsheet_id": "your-spreadsheet-id",
  "range": "Sheet1!A1:Z1000",
  "tournament_id": "tournament-id",
  "lookup_ratings": true,
  "auto_assign_sections": true,
  "api_key": "your-api-key"
}
```

## Support

If you encounter issues:

1. Check the error messages for specific guidance
2. Verify your Google Cloud setup
3. Test with demo data first
4. Check the server logs for detailed error information
5. Contact support with specific error messages and steps to reproduce

## Demo Data

The system includes demo data for testing:
- 5 sample players with various ratings
- Complete contact information
- Different sections and states
- Realistic USCF IDs and ratings

Use "demo" as the spreadsheet ID to test the import functionality without requiring actual Google Sheets access.
