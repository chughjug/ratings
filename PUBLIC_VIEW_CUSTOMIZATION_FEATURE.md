# Public View Customization Dashboard

## Overview

This feature adds a comprehensive dashboard to customize the public view of tournaments, including overlay settings, custom embeddable pages, and branding controls.

## Features Added

### 1. Public View Customization Component (`PublicViewCustomization.tsx`)

A full-featured modal component that allows tournament directors to:

#### **Overlay Settings Tab**
- **Display Controls**: Toggle visibility of header, footer, breadcrumbs, navigation, search, and statistics
- **Branding**: 
  - Logo URL upload/input
  - Color customization (Primary, Secondary, Background, Text, Accent)
  - Color picker interface
- **Custom Code**: 
  - Custom CSS injection
  - Custom JavaScript injection
  - Header HTML
  - Footer HTML

#### **Custom Pages Tab**
- Create unlimited custom pages with:
  - Name and URL slug
  - Full HTML content editor
  - Embedding toggle
  - Embed settings (min/max height, fullscreen, responsive)
- Edit and delete existing pages
- Preview functionality

#### **Embed Codes Tab**
- Automatic embed code generation for embeddable pages
- One-click copy to clipboard
- Ready-to-use iframe code

### 2. Integration with Tournament Detail Page

Added a new "Public View Customization" section in the tournament settings tab with:
- Prominent button to open the customization modal
- Informative description of capabilities
- Accessible from the INFO/Settings tab

### 3. Database Schema Updates

#### New Column in `tournaments` table:
- `public_display_config TEXT` - Stores JSON configuration for public view customization

#### Migration:
- Automatic column addition on database initialization
- Graceful handling for existing databases

### 4. API Enhancements

#### Tournament Update Endpoint
- Added support for `public_display_config` field
- Automatically handled in the tournament update route
- Properly serialized/deserialized as JSON

## Usage

### Accessing the Feature

1. Navigate to any tournament's detail page
2. Click on the "INFO" tab (settings)
3. Scroll to "Public View Customization" section
4. Click "Customize Public View" button

### Customizing the Public View

#### Overlay Settings:
1. Toggle display elements on/off
2. Upload/enter logo URL
3. Customize colors using color pickers
4. Add custom CSS and JavaScript
5. Save changes

#### Creating Custom Pages:
1. Click "Add Page" button
2. Enter page name and slug
3. Write HTML content
4. Enable embedding if needed
5. Configure embed settings
6. Save the page

#### Using Embed Codes:
1. Navigate to "Embed Codes" tab
2. Copy the generated iframe code
3. Paste into your website
4. The tournament content will be embedded

## Technical Details

### Component Structure

```
PublicViewCustomization
├── Header
│   └── Close button
├── Tabs
│   ├── Overlay Settings
│   ├── Custom Pages
│   └── Embed Codes
├── Content
│   └── Tab-specific forms
└── Footer
    ├── Preview button
    └── Save button
```

### Data Storage

Configuration is stored as JSON in the `public_display_config` field:

```json
{
  "overlayConfig": {
    "showHeader": true,
    "showFooter": true,
    "branding": {...},
    "customCSS": "...",
    "customJS": "..."
  },
  "customPages": [
    {
      "id": "...",
      "name": "...",
      "slug": "...",
      "content": "...",
      "isEmbeddable": true,
      "embedSettings": {...}
    }
  ]
}
```

### Example Embed Code

```html
<iframe 
  src="https://example.com/public/tournament/TOURNAMENT_ID/page/PAGE_SLUG"
  width="100%" 
  height="800" 
  frameborder="0" 
  allowfullscreen="true">
</iframe>
```

## Benefits

1. **Flexibility**: Complete control over public view appearance
2. **Branding**: Match tournament appearance to organization branding
3. **Embeddability**: Create custom content that can be embedded anywhere
4. **User Experience**: Intuitive interface for tournament directors
5. **Extensibility**: Easy to add new customization options

## Future Enhancements

- Custom page templates
- Drag-and-drop layout editor
- Preview mode with live updates
- Multiple theme presets
- Analytics integration for embedded pages

