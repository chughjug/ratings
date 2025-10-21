# CSV Import Template Guide

This guide explains how to use the CSV import feature for adding players to chess tournaments.

## Template Download

Click the "Download Template" button in the CSV Import modal to get a properly formatted template file with sample data.

## CSV Template Format

The CSV template includes the following columns:

### Required Fields
- **Name** - Player's full name (required)

### Player Identification
- **USCF ID** - US Chess Federation member ID (numeric)
- **FIDE ID** - FIDE player ID (numeric)

### Tournament Information
- **Rating** - Player's current rating (0-3000)
- **Section** - Tournament section (e.g., "Open", "U1800", "Reserve")
- **Status** - Player status: `active`, `withdrawn`, `bye`, or `inactive`

### Contact Information
- **State** - State or province
- **City** - City or town
- **Email** - Email address
- **Phone** - Phone number

### Tournament Management
- **Bye Rounds** - Comma-separated round numbers for intentional byes (e.g., "1,3,5")
- **Expiration Date** - Membership expiration date (YYYY-MM-DD format)
- **Notes** - Additional notes or comments about the player

## Sample Data

The template includes sample data showing proper formatting:

```csv
Name,USCF ID,FIDE ID,Rating,Section,Status,State,City,Email,Phone,Bye Rounds,Expiration Date,Notes
"John Doe","12345678","987654321","1800","Open","active","CA","San Francisco","john@example.com","555-1234","1,3","2024-12-31","Club champion"
"Jane Smith","87654321","","1600","Reserve","active","NY","New York","jane@example.com","555-5678","","",""
"Bob Johnson","11223344","123456789","2000","Open","active","TX","Houston","bob@example.com","555-9999","2","2025-06-30","FIDE Master"
"Alice Brown","","","1400","U1800","active","FL","Miami","alice@example.com","555-7777","","","Unrated player"
```

## Field Guidelines

### Bye Rounds
- Use comma-separated round numbers (e.g., "1,3,5")
- Leave empty if no intentional byes
- Round numbers must be positive integers

### Expiration Date
- Use YYYY-MM-DD format (e.g., "2024-12-31")
- Leave empty if not applicable
- Must be a valid date

### Status Values
- `active` - Player is actively participating
- `withdrawn` - Player has withdrawn from tournament
- `bye` - Player is taking a bye
- `inactive` - Player is temporarily inactive

### Section Names
Common section names include:
- Open
- Reserve
- U1800, U1600, U1400, U1200
- Scholastic
- Senior
- Women's

## Validation Rules

The system validates the following:
- Name is required
- USCF ID must be numeric (if provided)
- FIDE ID must be numeric (if provided)
- Rating must be between 0 and 3000 (if provided)
- Status must be one of the valid values
- Bye rounds must be comma-separated positive numbers
- Expiration date must be valid (if provided)

## Tips for Success

1. **Use the template** - Always start with the downloaded template
2. **Check formatting** - Ensure dates are in YYYY-MM-DD format
3. **Validate data** - Review the preview before importing
4. **Test with small files** - Import a few players first to verify format
5. **Backup data** - Keep a copy of your CSV file

## Rating Lookup

When "Lookup ratings for players with USCF IDs" is enabled:
- The system will automatically fetch current ratings for players with valid USCF IDs
- This overwrites any ratings provided in the CSV
- Only works for players with valid, active USCF memberships

## Troubleshooting

### Common Issues
- **Invalid date format** - Use YYYY-MM-DD format for dates
- **Invalid bye rounds** - Use comma-separated numbers (e.g., "1,3,5")
- **Missing required fields** - Ensure all players have names
- **Invalid status** - Use only: active, withdrawn, bye, inactive

### Error Messages
The system will show validation errors in the preview step. Fix these before importing.

## Support

If you encounter issues with CSV import, check:
1. File format (must be .csv)
2. Column headers match the template
3. Data validation errors in preview
4. File size (very large files may timeout)
