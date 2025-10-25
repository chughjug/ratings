# CSV Player Import Feature

This document describes the new CSV import functionality that allows you to bulk import players into your chess tournaments from CSV files.

## Features

- **Bulk Player Import**: Import multiple players at once from CSV files
- **Flexible Column Mapping**: Supports various column name formats (case-insensitive)
- **Data Validation**: Comprehensive validation with detailed error reporting
- **Rating Lookup**: Optional automatic rating lookup for players with USCF IDs
- **Preview Before Import**: Review and validate data before importing
- **Template Download**: Download a sample CSV template with proper formatting
- **Error Handling**: Detailed error reporting for invalid data

## CSV Format

### Required Columns
- **Name**: Player's full name (required)

### Optional Columns
- **USCF ID**: USCF member ID (numeric)
- **FIDE ID**: FIDE member ID (numeric)
- **Lichess Username**: Lichess username for online game creation (e.g., "magnuscarlsen")
- **Rating**: Player's rating (numeric, 0-3000)
- **Section**: Tournament section (e.g., "Open", "Reserve")
- **Status**: Player status ("active", "withdrawn", "bye")
- **State**: Player's state/province
- **City**: Player's city
- **Email**: Player's email address
- **Phone**: Player's phone number

### Supported Column Names (Case-Insensitive)
The system recognizes various column name formats:

| Data Type | Supported Column Names |
|-----------|------------------------|
| Name | `name`, `player name`, `full name` |
| USCF ID | `uscf_id`, `uscf id`, `uscf`, `member id` |
| FIDE ID | `fide_id`, `fide id`, `fide` |
| Lichess Username | `lichess_username`, `lichess username`, `lichess`, `lichess handle` |
| Rating | `rating`, `uscf rating`, `regular rating` |
| Section | `section`, `division`, `class` |
| Status | `status`, `player status` |
| State | `state`, `state/province` |
| City | `city`, `city/town` |
| Email | `email`, `email address` |
| Phone | `phone`, `phone number` |

## How to Use

### 1. Access CSV Import
1. Navigate to any tournament
2. Go to the "Players" tab
3. Click the "Import CSV" button (green button with upload icon)

### 2. Upload CSV File
1. Click "Download Template" to get a sample CSV file
2. Fill in your player data following the template format
3. Select your CSV file using the file picker
4. Choose whether to lookup ratings for players with USCF IDs
5. Click "Upload & Preview"

### 3. Review Data
1. Review the parsed data in the preview table
2. Check for any validation errors or warnings
3. Verify that all players look correct
4. Click "Import X Players" to proceed

### 4. Import Complete
1. View the import results
2. See how many players were successfully imported
3. Check rating lookup results if enabled
4. Click "Done" to close the modal

## API Endpoints

### 1. Download CSV Template
```
GET /api/players/csv-template
```
Returns a CSV template file with sample data.

### 2. Upload and Parse CSV
```
POST /api/players/csv-upload
Content-Type: multipart/form-data

Form Data:
- csvFile: CSV file
- tournament_id: Tournament ID
- lookup_ratings: boolean (optional, default: true)
```

**Response:**
```json
{
  "success": true,
  "totalRows": 5,
  "validPlayers": 4,
  "players": [...],
  "parseErrors": [],
  "validationErrors": [...],
  "tournament_id": "tournament-id",
  "lookup_ratings": true
}
```

### 3. Import Players
```
POST /api/players/csv-import
Content-Type: application/json

{
  "tournament_id": "tournament-id",
  "players": [...],
  "lookup_ratings": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully imported 4 players",
  "importedCount": 4,
  "playerIds": [...],
  "ratingLookupResults": [...],
  "importErrors": [],
  "validationErrors": []
}
```

## Data Validation

### Validation Rules
1. **Name**: Required, cannot be empty
2. **USCF ID**: If provided, must be numeric
3. **FIDE ID**: If provided, must be numeric
4. **Rating**: If provided, must be between 0 and 3000
5. **Status**: Must be one of: "active", "withdrawn", "bye"

### Error Types
- **Parse Errors**: Issues reading the CSV file
- **Validation Errors**: Data that doesn't meet validation rules
- **Import Errors**: Database insertion failures

## Sample CSV File

```csv
Name,USCF ID,FIDE ID,Rating,Section,Status,State,City,Email,Phone
"John Doe","12345678","987654321","1800","Open","active","CA","San Francisco","john@example.com","555-1234"
"Jane Smith","87654321","","1600","Reserve","active","NY","New York","jane@example.com","555-5678"
"Bob Johnson","11111111","","1400","Reserve","active","TX","Houston","bob@example.com","555-9012"
"Alice Brown","22222222","123456789","2000","Open","active","FL","Miami","alice@example.com","555-3456"
"Charlie Wilson","33333333","","1200","Reserve","active","WA","Seattle","charlie@example.com","555-7890"
```

## Technical Implementation

### Backend Components

1. **`server/services/csvImport.js`**: Core CSV processing logic
   - `parseCSVFile()`: Parse CSV files with flexible column mapping
   - `validateCSVData()`: Validate parsed data against business rules
   - `importPlayersFromCSV()`: Import validated players into database
   - `generateCSVTemplate()`: Generate sample CSV template

2. **`server/routes/players.js`**: API endpoints
   - `/csv-template`: Download CSV template
   - `/csv-upload`: Upload and parse CSV file
   - `/csv-import`: Import parsed players

### Frontend Components

1. **`CSVImportModal.tsx`**: Complete import workflow UI
   - File upload with drag-and-drop support
   - Data preview with validation errors
   - Step-by-step import process
   - Progress indicators and error handling

2. **`TournamentDetail.tsx`**: Integration with tournament management
   - "Import CSV" button in players section
   - Modal integration

### Dependencies

- **`csv-parser`**: Parse CSV files
- **`multer`**: Handle file uploads
- **`fs`**: File system operations

## Error Handling

### Common Issues and Solutions

1. **"Only CSV files are allowed"**
   - Ensure your file has a `.csv` extension
   - Check that the file is actually a CSV file

2. **"No valid players to import"**
   - Check that at least one player has a valid name
   - Review validation errors for data issues

3. **"Tournament ID is required"**
   - This is an internal error - contact support

4. **File upload fails**
   - Check file size (max 5MB)
   - Ensure file is not corrupted
   - Try a different CSV file

### Validation Error Examples

```json
{
  "row": 3,
  "player": "Invalid Player",
  "errors": [
    "USCF ID must be numeric",
    "Rating must be a number between 0 and 3000"
  ]
}
```

## Best Practices

### CSV File Preparation
1. **Use the template**: Download and use the provided template
2. **Check data quality**: Ensure all required fields are filled
3. **Validate USCF IDs**: Make sure USCF IDs are numeric
4. **Consistent formatting**: Use consistent status values
5. **Test with small files**: Start with a few players to test the process

### Data Management
1. **Backup before import**: Always backup your tournament data
2. **Review preview**: Always review the preview before importing
3. **Check ratings**: Verify that rating lookups worked correctly
4. **Handle errors**: Address validation errors before importing

## Performance Considerations

- **File size limit**: 5MB maximum file size
- **Batch processing**: Large files are processed in batches
- **Rating lookups**: Can be slow for many players - consider disabling for large imports
- **Memory usage**: Large CSV files are streamed to avoid memory issues

## Security Features

- **File type validation**: Only CSV files are accepted
- **File size limits**: Prevents large file uploads
- **Data sanitization**: All input data is cleaned and validated
- **Temporary file cleanup**: Uploaded files are automatically deleted after processing

## Future Enhancements

- **Excel support**: Import from Excel files (.xlsx)
- **Duplicate detection**: Detect and handle duplicate players
- **Advanced validation**: More sophisticated data validation rules
- **Import history**: Track and manage import history
- **Bulk operations**: Edit multiple players after import
- **Export functionality**: Export players to CSV format

## Troubleshooting

### Debug Mode
Enable debug logging by setting the environment variable:
```bash
DEBUG=csvImport node server/index.js
```

### Common Solutions
1. **CSV parsing issues**: Check file encoding (should be UTF-8)
2. **Validation errors**: Review the error messages and fix data
3. **Import failures**: Check database connectivity and permissions
4. **Rating lookup failures**: Verify USCF IDs are correct and valid

This CSV import feature significantly improves the efficiency of managing large tournaments by allowing bulk player import with comprehensive validation and error handling.

