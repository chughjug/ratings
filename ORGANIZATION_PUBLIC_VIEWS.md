# Organization-Specific Public Views

This document describes the implementation of organization-specific public views for the chess tournament management system.

## Overview

The system now supports organization-specific public views where users can:
1. Search for chess organizations
2. View organization-specific tournament listings
3. Access tournaments through organization-specific URLs

## URL Structure

### Organization Search
- **URL**: `/public/organizations`
- **Description**: Landing page for searching and browsing chess organizations
- **Features**: 
  - Search organizations by name, location, or description
  - View organization details and tournament counts
  - Navigate to organization-specific pages

### Organization Page
- **URL**: `/public/organizations/:slug`
- **Description**: Organization-specific page showing all public tournaments
- **Features**:
  - Organization information and branding
  - List of public tournaments
  - Tournament registration links

### Organization Tournament Page
- **URL**: `/public/organizations/:slug/tournaments/:tournamentId`
- **Description**: Organization-specific tournament view
- **Features**:
  - Full tournament display with organization context
  - All standard tournament features (pairings, standings, etc.)
  - Organization branding and navigation

## API Endpoints

### Search Organizations
- **Endpoint**: `GET /api/organizations/search`
- **Query Parameters**:
  - `q`: Search query (optional)
  - `limit`: Maximum number of results (default: 50)
- **Response**: List of organizations with basic info and tournament counts

### Get Organization Public Tournaments
- **Endpoint**: `GET /api/organizations/:slug/tournaments/public`
- **Response**: Organization details and list of public tournaments

### Get Organization Public Tournament
- **Endpoint**: `GET /api/tournaments/public/organization/:orgSlug/:tournamentId`
- **Response**: Full tournament data with organization context

## Database Schema

The system uses the existing `organizations` table with the following key fields:
- `id`: Unique organization identifier
- `name`: Organization name
- `slug`: URL-friendly organization identifier
- `description`: Organization description
- `website`: Organization website URL
- `logo_url`: Organization logo URL
- `city`, `state`, `country`: Location information
- `is_active`: Whether the organization is active

## Frontend Components

### OrganizationSearch
- Main search page for organizations
- Search functionality with real-time filtering
- Organization cards with key information
- Navigation to organization pages

### PublicOrganizationPage
- Organization-specific landing page
- Tournament listings with organization branding
- Links to individual tournaments

### PublicOrganizationTournament
- Organization-specific tournament view
- Full tournament functionality with organization context
- Navigation back to organization page

## Features

### Search and Discovery
- Search organizations by name, location, or description
- Browse all available organizations
- View organization details and tournament counts

### Organization Branding
- Organization logos and information displayed
- Consistent branding across organization pages
- Organization-specific navigation

### Tournament Access
- Direct links to tournaments through organization URLs
- Organization context in tournament views
- Seamless navigation between organization and tournament pages

### Public Access
- No authentication required for public views
- All organization and tournament data publicly accessible
- Registration links for open tournaments

## Implementation Notes

### Security
- Only public tournaments are accessible through organization URLs
- Organization must be active to appear in search results
- No sensitive organization data exposed in public views

### Performance
- Efficient database queries with proper indexing
- Caching of organization data where appropriate
- Optimized search functionality

### SEO and URLs
- Clean, SEO-friendly URLs using organization slugs
- Consistent URL structure across all public views
- Proper meta tags and page titles

## Usage Examples

### Finding an Organization
1. Visit `/public/organizations`
2. Search for "Chess Club" or browse all organizations
3. Click on an organization to view their tournaments

### Viewing Organization Tournaments
1. Navigate to `/public/organizations/chess-club-america`
2. Browse available tournaments
3. Click on a tournament to view details

### Accessing a Specific Tournament
1. Go directly to `/public/organizations/chess-club-america/tournaments/tournament-123`
2. View full tournament details with organization context
3. Navigate back to organization page or other tournaments

## Future Enhancements

- Organization-specific tournament filtering
- Organization news and announcements
- Tournament calendar views
- Social media integration
- Advanced search filters (location, tournament type, etc.)
