# 🎨 How to Edit Organization Customization Features

## Quick Start

### 1. **View the Current Customization**
Visit: http://localhost:3000/public/organizations/police

### 2. **Edit via Database Script**
```bash
# Run the edit script to change the theme
node edit-customization.js
```

### 3. **Edit via Code**
Modify the files in your editor:
- `client/src/components/OrganizationCustomization.tsx`
- `client/src/pages/PublicOrganizationPage.tsx`

## 📁 File Structure

```
client/src/
├── components/
│   ├── OrganizationCustomization.tsx    # Main customization interface
│   ├── AdvancedCustomization.tsx        # Advanced features & templates
│   └── WidgetManager.tsx                # Widget management system
├── pages/
│   └── PublicOrganizationPage.tsx       # Public page with dynamic styling
└── types/
    └── index.ts                         # Type definitions
```

## 🎨 Customization Categories

### 1. **Theme Customization**
Edit colors, spacing, borders in the database:

```json
{
  "theme": {
    "primaryColor": "#2563EB",      // Main brand color
    "secondaryColor": "#1E40AF",    // Secondary color
    "backgroundColor": "#FFFFFF",   // Background color
    "textColor": "#1F2937",         // Text color
    "accentColor": "#F59E0B",       // Accent color
    "borderColor": "#E5E7EB",       // Border color
    "hoverColor": "#F3F4F6",        // Hover color
    "borderRadius": "8px",          // Border radius
    "spacing": "16px"               // Spacing
  }
}
```

### 2. **Branding Customization**
```json
{
  "branding": {
    "logoUrl": "https://example.com/logo.png",
    "customFont": "Inter",
    "headerText": "Your Organization Name",
    "tagline": "Your Tagline",
    "customCss": "/* Your custom CSS */"
  }
}
```

### 3. **Layout Customization**
```json
{
  "layout": {
    "headerStyle": "default",        // default, minimal, hero, sidebar, floating
    "cardStyle": "modern",           // default, modern, classic, minimal, elevated
    "showStats": true,
    "showSocialLinks": true,
    "gridColumns": 3,
    "animationStyle": "fade"         // none, fade, slide, scale
  }
}
```

## 🔧 Editing Methods

### Method 1: Database Script (Quick Changes)

1. **Edit the script:**
```bash
nano edit-customization.js
```

2. **Modify the `newCustomization` object**

3. **Run the script:**
```bash
node edit-customization.js
```

### Method 2: Direct Database Access

1. **Access the database:**
```bash
sqlite3 server/chess_tournaments.db
```

2. **Update settings:**
```sql
UPDATE organizations 
SET settings = '{"theme":{"primaryColor":"#FF0000"}}' 
WHERE slug = 'police';
```

### Method 3: Code Editing

1. **Edit the customization component:**
```bash
# Open in your editor
code client/src/components/OrganizationCustomization.tsx
```

2. **Modify the default values or add new features**

3. **Edit the public page styling:**
```bash
# Open in your editor
code client/src/pages/PublicOrganizationPage.tsx
```

## 🎯 Common Edits

### Change Colors
```javascript
// In edit-customization.js
theme: {
  primaryColor: '#FF0000',    // Red
  secondaryColor: '#00FF00',  // Green
  backgroundColor: '#0000FF', // Blue
}
```

### Change Header Style
```javascript
layout: {
  headerStyle: 'hero',        // Options: default, minimal, hero, sidebar, floating
}
```

### Add Custom CSS
```javascript
branding: {
  customCss: `
    .my-custom-class {
      background: red;
      color: white;
    }
  `
}
```

### Change Card Style
```javascript
layout: {
  cardStyle: 'elevated',      // Options: default, modern, classic, minimal, elevated
}
```

## 🚀 Live Editing Tips

### 1. **Hot Reload**
The development server supports hot reload, so changes to the frontend will automatically refresh.

### 2. **Database Changes**
Database changes require refreshing the page to see updates.

### 3. **CSS Changes**
Custom CSS changes are applied immediately when saved to the database.

## 📱 Testing Your Changes

1. **Save your changes**
2. **Refresh the page**: http://localhost:3000/public/organizations/police
3. **Check different screen sizes** (mobile, tablet, desktop)
4. **Test different browsers**

## 🎨 Theme Examples

### Classic Chess Theme
```json
{
  "theme": {
    "primaryColor": "#8B4513",
    "secondaryColor": "#F5F5DC",
    "backgroundColor": "#FAFAFA",
    "textColor": "#2D3748"
  }
}
```

### Modern Blue Theme
```json
{
  "theme": {
    "primaryColor": "#2563EB",
    "secondaryColor": "#1E40AF",
    "backgroundColor": "#FFFFFF",
    "textColor": "#1F2937"
  }
}
```

### Dark Theme
```json
{
  "theme": {
    "primaryColor": "#3B82F6",
    "secondaryColor": "#1E40AF",
    "backgroundColor": "#1F2937",
    "textColor": "#F9FAFB"
  }
}
```

## 🔍 Troubleshooting

### Changes Not Showing?
1. **Check the database**: Make sure the settings were saved
2. **Clear browser cache**: Hard refresh (Ctrl+F5 or Cmd+Shift+R)
3. **Check console errors**: Open browser dev tools

### Database Connection Issues?
```bash
# Check if database exists
ls -la server/chess_tournaments.db

# Check database contents
sqlite3 server/chess_tournaments.db "SELECT * FROM organizations WHERE slug = 'police';"
```

### Server Not Running?
```bash
# Kill existing processes
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9

# Start servers
npm run dev
```

## 📚 Advanced Editing

### Add New Customization Options

1. **Update the TypeScript types** in `client/src/types/index.ts`
2. **Add UI controls** in `OrganizationCustomization.tsx`
3. **Apply styling** in `PublicOrganizationPage.tsx`
4. **Update the database schema** if needed

### Create Custom Widgets

1. **Add widget type** to `WidgetManager.tsx`
2. **Create widget component**
3. **Add to the widget rendering system**

---

**Happy Customizing!** 🎨✨
