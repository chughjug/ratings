# Player Performance Page - Visual Guide

## Page Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Tournament                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Leonardo A Lemaisonett                              Start №   13  │
│  Tournament Name                                      Rating  1123  │
│  🔗 USCF Profile                                     Points  2.0   │
│                                                      Place     6   │
├─────────────────────────────────────────────────────────────────┤
│ Results                                                          │
├─────┬──────────┬────────────────────┬──────┬────────┬──────────┤
│ Rnd │ Result   │ Opponent           │ Club │ Rating │ Board    │
├─────┼──────────┼────────────────────┼──────┼────────┼──────────┤
│ 1   │ [WIN]    │ Mayank, Reyansh    │ -    │ 1505   │ 5        │
│ 2   │ [DRAW]   │ Ranga, Tanuj       │ -    │ 1299   │ 7        │
│ 3   │ [DRAW]   │ Li, Andrew         │ -    │ -      │ 5        │
└─────┴──────────┴────────────────────┴──────┴────────┴──────────┘
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Points   │ │ MMed     │ │ Solk     │ │ Cum      │          │
│  │   2.0    │ │   2.5    │ │   3.0    │ │   3.0    │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────┐        │
│  │ Record                 │  │ Position History       │        │
│  ├────────────────────────┤  ├────────────────────────┤        │
│  │ Wins        │    2     │  │ Start     │    5       │        │
│  │ Draws       │    1     │  │ Round 1   │    7       │        │
│  │ Losses      │    0     │  │ Round 2   │    7       │        │
│  │ Games Played│    3     │  │ Round 3   │   12       │        │
│  └────────────────────────┘  └────────────────────────┘        │
│                                                                  │
│ Final Standings (Top 20)                                        │
├─────┬────────────────────────┬────────┬────────┬───┬───┬──┐   │
│ Rk. │ Player                 │ Rating │ Points │ W │ D │ L │   │
├─────┼────────────────────────┼────────┼────────┼───┼───┼──┤   │
│ 1   │ Player Name            │ 1600   │   3.0  │ 3 │ 0 │ 0 │   │
│ 2   │ Another Player         │ 1550   │   2.5  │ 2 │ 1 │ 0 │   │
│ 3   │ Leonardo A Lemaisonett │ 1123   │   2.0  │ 2 │ 1 │ 0 │ ← Highlighted
│ ... │ ...                    │  ...   │  ...   │...│...│..│   │
└─────┴────────────────────────┴────────┴────────┴───┴───┴──┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Color Coding

### Result Badges
- 🟢 **WIN** - Green background (#22c55e)
- 🟡 **DRAW** - Yellow background (#eab308)
- 🔴 **LOSS** - Red background (#ef4444)
- ⚪ **TBD** - Gray background (#9ca3af)

### Player Information Section
- White background with shadow
- Large tournament name (h1)
- 2x2 grid of key stats on desktop
- Stack layout on mobile

### Statistics Cards
- Four cards in a row (responsive)
- Icons with colored backgrounds
- Large numbers for emphasis
- Tailored color for each stat

### Record Section
- Two columns on desktop
- Full width on mobile
- Clear label-value pairs
- Border separators

### Standings Table
- Horizontal scrolling on mobile
- Current player row highlighted in yellow
- Color-coded W/D/L columns
- Fixed column widths for readability

## Dark Mode Design

The page uses a dark gradient background:
- Primary: slate-900 (#0f172a)
- Secondary: slate-800 (#1e293b)
- Cards: white (#ffffff)
- Text: gray-900 (#111827) on white cards

## Responsive Breakpoints

### Mobile (< 768px)
- Single column layout
- Stacked header info
- Horizontal scroll tables
- Full-width cards

### Tablet (768px - 1024px)
- 2-column layout for stats
- Improved spacing
- Better table visibility

### Desktop (> 1024px)
- Multi-column layouts
- Side-by-side sections
- Optimal table display
- Large player information section

## Interactive Elements

### Clickable Elements
- Player names link to performance pages
- USCF ID link to official USCF profile
- Back button to tournament
- Standings table rows (hover effect)

### Hover States
- Player name link: blue-600 with underline
- Buttons: enhanced opacity
- Table rows: light gray background

## Navigation

### Back Button
- Located at top-left
- Back arrow icon + text
- Navigates to tournament standings
- Visible on all screen sizes

### URL Structure
- Private: `/tournaments/{tournamentId}/player/{playerId}`
- Public: `/public/tournaments/{tournamentId}/player/{playerId}`
- Shareable via URL copy

## Data Sections

### Header Info
- Player name (most prominent)
- Tournament name (subtitle)
- USCF profile link
- 4 key stats (Start №, Rating, Points, Place)

### Results Table
- Shows round-by-round performance
- Opponent information
- Color-coded results
- Board assignments
- Expandable for more details

### Statistics Cards
- Points (total accumulated)
- MMed (Modified Median)
- Solk (Solkoff)
- Cum (Cumulative)

### Record Summary
- Win/Draw/Loss breakdown
- Total games played
- Percentage calculations

### Position History
- Starting position
- Position after each round
- Final position
- Trend visualization

### Final Standings
- Top 20 players
- Comprehensive stats per player
- Current player highlighted
- Sortable columns (future enhancement)

## Print View

The page is optimized for printing:
- Color-preserved on print
- Table headers repeat
- Proper page breaks
- Readable font sizes

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- High contrast text
- Semantic HTML structure
- Color not the only indicator

## Performance Considerations

- Lazy loading for images
- Optimized database queries
- Client-side caching
- Responsive image loading
- Minimal JavaScript execution

## Future UI Enhancements

1. **Charts and Graphs**
   - Rating performance curve
   - Position trend line
   - Win rate by opponent rating

2. **Expandable Sections**
   - Detailed round analysis
   - Head-to-head history
   - Performance metrics

3. **Export Options**
   - PDF download
   - Share buttons
   - QR code for mobile

4. **Animations**
   - Smooth transitions
   - Loading skeletons
   - Data-driven reveals

5. **Comparison View**
   - Side-by-side player comparison
   - Statistical differences highlighted

---

**Design Framework:** Tailwind CSS
**Color Palette:** Professional Chess Tournament Standard
**Typography:** System fonts (responsive sizing)
**Icons:** Lucide React Icons
