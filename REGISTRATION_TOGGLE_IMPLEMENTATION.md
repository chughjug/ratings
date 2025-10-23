# Registration Toggle Implementation

## Overview
Added an "Allow Registration" toggle feature that allows tournament directors to enable/disable player registration for tournaments.

## Changes Made

### 1. Database Schema Updates
- **File**: `server/database.js`
- **Changes**:
  - Added `allow_registration BOOLEAN DEFAULT 1` column to tournaments table
  - Added migration to add the column to existing databases
  - Default value is `1` (enabled) for backward compatibility

### 2. Backend API Updates

#### Tournament Routes (`server/routes/tournaments.js`)
- **Create Tournament**: Added `allow_registration` parameter handling
- **Update Tournament**: Added `allow_registration` parameter handling
- Both endpoints now accept and store the `allow_registration` field

#### Registration Routes (`server/routes/registrations.js`)
- **Tournament Info Endpoint**: Now returns `allow_registration` field
- **Registration Submission**: Added validation to check `allow_registration` flag
- Returns 403 error with message "Registration is currently closed for this tournament" when disabled

### 3. Frontend Updates

#### Type Definitions (`client/src/types/index.ts`)
- Added `allow_registration?: boolean` to Tournament interface

#### Create Tournament Page (`client/src/pages/CreateTournament.tsx`)
- Added "Allow Registration" checkbox in the tournament creation form
- Default value is `true` (enabled)
- Positioned after FIDE rated checkbox with descriptive text

#### Tournament Detail Page (`client/src/pages/TournamentDetail.tsx`)
- Added "Registration Settings" section with toggle switch
- Shows current registration status (Open/Closed)
- Allows tournament directors to toggle registration on/off
- Real-time updates when toggled

#### Registration Management Component (`client/src/components/RegistrationManagement.tsx`)
- Updated to use `allow_registration` field from tournament data
- Enhanced registration status display to show when disabled by TD
- Updated logic to check both `allow_registration` flag and tournament start date
- Improved error messages to distinguish between different closure reasons

## Features

### For Tournament Directors
1. **Create Tournament**: Can set registration status during tournament creation
2. **Manage Tournament**: Can toggle registration on/off from tournament detail page
3. **Visual Feedback**: Clear indication of current registration status
4. **Real-time Updates**: Changes take effect immediately

### For Players
1. **Clear Status**: Registration page shows if registration is open or closed
2. **Reason Display**: Shows if registration is disabled by TD vs. tournament started
3. **Blocked Submissions**: Cannot submit registration when disabled
4. **Error Messages**: Clear feedback when registration is not allowed

## Technical Details

### Database
- New column: `allow_registration BOOLEAN DEFAULT 1`
- Backward compatible with existing tournaments (defaults to enabled)
- Migration handles existing databases

### API Endpoints
- `POST /api/tournaments` - Accepts `allow_registration` parameter
- `PUT /api/tournaments/:id` - Accepts `allow_registration` parameter
- `GET /api/registrations/tournament/:id/info` - Returns `allow_registration` field
- `POST /api/registrations/submit` - Validates `allow_registration` before processing

### Frontend Components
- Toggle switch with smooth animations
- Color-coded status indicators (green for open, red for closed)
- Responsive design that works on all screen sizes
- Accessible with proper ARIA labels

## Testing
- Created `test_registration_toggle.js` for automated testing
- Tests cover:
  - Tournament creation with registration enabled
  - Registration submission when enabled
  - Disabling registration
  - Registration submission when disabled
  - API response validation

## Usage

### Enabling Registration
1. Go to tournament detail page
2. Find "Registration Settings" section
3. Toggle switch to "On" position
4. Status will show "Registration Open"

### Disabling Registration
1. Go to tournament detail page
2. Find "Registration Settings" section
3. Toggle switch to "Off" position
4. Status will show "Registration Closed"
5. Players will see "Registration has been disabled by the tournament director"

## Backward Compatibility
- All existing tournaments default to having registration enabled
- No breaking changes to existing API endpoints
- Existing frontend code continues to work without modification
