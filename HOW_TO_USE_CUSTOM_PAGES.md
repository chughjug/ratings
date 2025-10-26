# How to Use Custom Pages in Public Tournament Views

## Overview

Custom pages allow you to add additional content tabs to the public tournament display. These pages appear alongside the standard "Overview", "Pairings", "Standings" tabs.

## Quick Start

### 1. Create a Custom Page

Use the API to create a custom page for your tournament:

```bash
curl -X POST https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/custom-pages \
  -H "Content-Type: application/json" \
  -d '{
    "tournament_id": "0d40d92c-ed28-44df-aa91-f2e992e89d86",
    "title": "Schedule",
    "slug": "schedule",
    "content": "<h2>Tournament Schedule</h2><p>Round 1: 9:00 AM</p><p>Round 2: 12:00 PM</p>",
    "order_index": 0,
    "is_active": true,
    "icon": "📅"
  }'
```

### 2. View Your Custom Page

Visit your public tournament page:
```
https://chess-tournament-director-6ce5e76147d7.herokuapp.com/public/tournament/0d40d92c-ed28-44df-aa91-f2e992e89d86
```

Your custom page will appear as a new tab with the title "Schedule" and the 📅 icon.

## API Endpoints

### Create Custom Page
```http
POST /api/custom-pages
Content-Type: application/json

{
  "tournament_id": "tournament-id",
  "title": "Page Title",
  "slug": "page-slug",
  "content": "<h2>Your HTML content here</h2>",
  "order_index": 0,
  "is_active": true,
  "icon": "📅"
}
```

### Get All Custom Pages for Tournament
```http
GET /api/custom-pages/tournament/:tournamentId
```

### Update Custom Page
```http
PUT /api/custom-pages/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "<p>Updated content</p>",
  "is_active": true
}
```

### Delete Custom Page
```http
DELETE /api/custom-pages/:id
```

## Field Descriptions

- **tournament_id**: The ID of the tournament this page belongs to
- **title**: The display name of the page (appears in the tab)
- **slug**: URL-friendly identifier (must be unique per tournament)
- **content**: HTML content to display in the page
- **order_index**: Controls the order of tabs (0 = first, 1 = second, etc.)
- **is_active**: Whether the page is visible (true/false)
- **icon**: Optional emoji or icon to display next to the title

## Example Use Cases

### Tournament Schedule
```json
{
  "title": "Schedule",
  "slug": "schedule",
  "content": "<h2>Tournament Schedule</h2><table border='1'><tr><th>Round</th><th>Time</th></tr><tr><td>Round 1</td><td>9:00 AM</td></tr><tr><td>Round 2</td><td>12:00 PM</td></tr></table>",
  "order_index": 0,
  "is_active": true,
  "icon": "📅"
}
```

### Rules and Regulations
```json
{
  "title": "Rules",
  "slug": "rules",
  "content": "<h2>Tournament Rules</h2><ul><li>USCF rules apply</li><li>No talking during games</li><li>Cell phones must be silenced</li><li>Touch-move rule applies</li></ul>",
  "order_index": 1,
  "is_active": true,
  "icon": "📋"
}
```

### Contact Information
```json
{
  "title": "Contact",
  "slug": "contact",
  "content": "<h2>Contact Information</h2><p><strong>Tournament Director:</strong> John Doe</p><p><strong>Email:</strong> john@example.com</p><p><strong>Phone:</strong> (555) 123-4567</p>",
  "order_index": 2,
  "is_active": true,
  "icon": "📞"
}
```

### Live Updates
```json
{
  "title": "Updates",
  "slug": "updates",
  "content": "<h2>Tournament Updates</h2><div style='border-left: 4px solid #3b82f6; padding: 1rem; margin: 1rem 0;'><p><strong>10:30 AM</strong> - Round 1 pairings posted!</p></div><div style='border-left: 4px solid #3b82f6; padding: 1rem; margin: 1rem 0;'><p><strong>9:00 AM</strong> - Tournament begins</p></div>",
  "order_index": 3,
  "is_active": true,
  "icon": "📢"
}
```

## HTML Content Tips

You can use any HTML in the content field, including:
- Headings (`<h1>`, `<h2>`, etc.)
- Paragraphs (`<p>`)
- Lists (`<ul>`, `<ol>`)
- Tables (`<table>`)
- Links (`<a href>`)
- Images (`<img src>`)
- Inline styles (`style="color: red;"`)
- Divs with classes

### Responsive Tables
```html
<div style="overflow-x: auto;">
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background: #f3f4f6;">
        <th style="padding: 0.5rem; border: 1px solid #d1d5db;">Round</th>
        <th style="padding: 0.5rem; border: 1px solid #d1d5db;">Time</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 0.5rem; border: 1px solid #d1d5db;">Round 1</td>
        <td style="padding: 0.5rem; border: 1px solid #d1d5db;">9:00 AM</td>
      </tr>
    </tbody>
  </table>
</div>
```

## Available Icons

You can use any emoji as an icon:
- 📅 Calendar (for schedules)
- 📋 Clipboard (for rules)
- 📞 Phone (for contact)
- 📢 Megaphone (for announcements)
- 🏆 Trophy (for prizes)
- 👥 People (for participants)
- ⚠️ Warning (for important info)
- ✅ Check (for checklist)
- 🎉 Party (for special events)
- 📍 Location (for venue info)

## Ordering Pages

The `order_index` field controls tab order:
- `0` - First tab (appears after default tabs)
- `1` - Second custom tab
- `2` - Third custom tab
- etc.

Tabs appear in this order:
1. Overview (default)
2. Info (default)
3. Pairings (default)
4. Standings (default)
5. Teams (default)
6. Prizes (if applicable)
7. **Your custom pages (ordered by order_index)**
8. Preregistered (if applicable)

## Debugging

If your custom pages aren't showing up:

1. **Check they were created**: 
   ```bash
   curl https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/custom-pages/tournament/YOUR_TOURNAMENT_ID
   ```

2. **Verify they're active**: Make sure `is_active: true`

3. **Check the browser console**: Open DevTools and look for console logs showing:
   - "Public API response:"
   - "Custom pages from API:"

4. **Try a different tournament**: Test with a tournament you know exists

## Admin UI (Coming Soon)

An admin interface is available at `client/src/components/CustomPagesManager.tsx` for managing custom pages through the web interface. To use it:

1. Import the component in your tournament management page
2. Pass the tournament ID
3. Users can create, edit, and delete custom pages

## Troubleshooting

### Pages aren't showing up
- Verify `is_active` is `true`
- Check that content exists
- Verify the tournament exists and is public
- Check browser console for errors

### Wrong order
- Adjust `order_index` values
- Lower numbers appear first

### HTML not rendering
- Check HTML syntax
- Validate that tags are properly closed
- Consider using inline styles instead of external CSS

## Next Steps

1. Create custom pages for your tournaments
2. Test them in the public view
3. Share feedback on what content would be most useful
4. Consider integrating the admin UI component

