# Custom Pages Feature

## Overview

The custom pages feature allows tournament organizers to add custom content pages that appear as tabs in the public tournament display. This enables you to add:
- Tournament schedules
- Rules and regulations
- Sponsors and prize information
- FAQs
- Contact information
- Live updates or announcements
- Any other custom content

## Database Schema

A new `custom_pages` table has been created with the following structure:

```sql
CREATE TABLE custom_pages (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  icon TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
  UNIQUE(tournament_id, slug)
)
```

## API Endpoints

### Get All Custom Pages for a Tournament
```
GET /api/custom-pages/tournament/:tournamentId
```

Returns all active custom pages for a tournament, ordered by `order_index`.

### Get a Single Custom Page
```
GET /api/custom-pages/:id
```

Returns details for a specific custom page.

### Create a Custom Page
```
POST /api/custom-pages
```

Body:
```json
{
  "tournament_id": "tournament-id",
  "title": "Schedule",
  "slug": "schedule",
  "content": "<h2>Tournament Schedule</h2><p>Round 1: 9:00 AM</p>",
  "order_index": 0,
  "is_active": true,
  "icon": "📅"
}
```

### Update a Custom Page
```
PUT /api/custom-pages/:id
```

Body: Any fields you want to update.

### Delete a Custom Page
```
DELETE /api/custom-pages/:id
```

## Usage in Public Tournament Display

### Automatic Display

Custom pages are automatically displayed as tabs in the public tournament view:

```tsx
// Custom pages are automatically added as tabs
{customPages.map((page) => (
  <button
    key={page.id}
    onClick={() => setActiveTab(page.slug)}
    className={/* styling */}
  >
    {page.icon && <span>{page.icon}</span>}
    <span>{page.title}</span>
  </button>
))}

// And their content is rendered
{customPages.map((page) => (
  activeTab === page.slug && (
    <div 
      dangerouslySetInnerHTML={{ __html: page.content }}
    />
  )
))}
```

### Included in Embed API

Custom pages are automatically included in the embeddable API response:

```json
{
  "customPages": [
    {
      "id": "page-id",
      "title": "Schedule",
      "slug": "schedule",
      "content": "<h2>Tournament Schedule</h2>...",
      "order_index": 0,
      "is_active": true,
      "icon": "📅"
    }
  ]
}
```

## Admin UI Component

A `CustomPagesManager` component is available for managing custom pages:

```tsx
import CustomPagesManager from '../components/CustomPagesManager';

// In your tournament management page
<CustomPagesManager tournamentId={tournamentId} />
```

This component provides:
- List of all custom pages
- Add new page button
- Edit/delete actions
- Toggle active/inactive status
- Reorder pages with order_index

## Example Use Cases

### Tournament Schedule Page
```javascript
{
  title: "Schedule",
  slug: "schedule",
  content: `
    <h2>Tournament Schedule</h2>
    <table>
      <tr><th>Round</th><th>Time</th></tr>
      <tr><td>Round 1</td><td>9:00 AM</td></tr>
      <tr><td>Round 2</td><td>12:00 PM</td></tr>
    </table>
  `,
  icon: "📅"
}
```

### Rules and Regulations
```javascript
{
  title: "Rules",
  slug: "rules",
  content: `
    <h2>Tournament Rules</h2>
    <ul>
      <li>USCF rules apply</li>
      <li>No talking during games</li>
      <li>Phones must be silenced</li>
    </ul>
  `,
  icon: "📋"
}
```

### Contact Information
```javascript
{
  title: "Contact",
  slug: "contact",
  content: `
    <h2>Contact Us</h2>
    <p><strong>Tournament Director:</strong> John Doe</p>
    <p><strong>Email:</strong> john@example.com</p>
    <p><strong>Phone:</strong> (555) 123-4567</p>
  `,
  icon: "📞"
}
```

### Live Updates
```javascript
{
  title: "Updates",
  slug: "updates",
  content: `
    <h2>Tournament Updates</h2>
    <div class="update">
      <p><strong>Latest:</strong> Round 1 pairings posted!</p>
      <p class="text-sm text-gray-600">Posted: 10:30 AM</p>
    </div>
  `,
  icon: "📢"
}
```

## Content Format

Custom page content supports HTML and can include:
- Text formatting (headings, paragraphs, lists)
- Tables
- Links
- Images
- Embedded videos (iframe)
- Custom CSS styling
- JavaScript (be careful!)

## Best Practices

1. **Keep slugs unique and readable**: Use lowercase, hyphens, no spaces
2. **Use icons sparingly**: One emoji per page for visual identification
3. **Order matters**: Set order_index to control tab position
4. **Test your HTML**: Make sure content displays correctly
5. **Keep it mobile-friendly**: Test on different screen sizes
6. **Update regularly**: Keep content fresh and relevant

## Integration with Embed API

When using the embeddable tournament API, custom pages are included:

```javascript
// Fetch tournament data including custom pages
const response = await fetch(`/api/tournaments/${tournamentId}/embed`);
const data = await response.json();

// Access custom pages
console.log(data.customPages);

// Display them in your custom view
data.customPages.forEach(page => {
  console.log(`${page.title} - ${page.slug}`);
  // Render page.content in your UI
});
```

## Next Steps

1. Add the `CustomPagesManager` component to your tournament management interface
2. Create custom pages for your tournaments
3. Custom pages will automatically appear in the public tournament display
4. Use the embed API to include custom pages in external websites

