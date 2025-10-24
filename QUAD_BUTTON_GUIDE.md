# Quad Tournament Button - User Guide

## What Was Added

A beautiful "Generate Quads" button in the Tournament Detail page that automatically generates quad pairings for quad-format tournaments.

## Location

The button appears in the **Pairings Tab** when viewing a quad tournament:

```
Tournament Detail → Pairings Tab → [⚡ Quad Tournament Section] → [Generate Quads Button]
```

## Button Features

### Visual Design
- **Icon**: 🎯 (target/bullseye)
- **Color**: Gradient purple to blue
- **Hover**: Darkens gradient on hover
- **State**: Shows "Generating..." while processing

### When It Appears
- Only visible for tournaments with `format: 'quad'`
- Always available during pairing management
- Works for any round of the tournament

## How to Use

### Step 1: Open Tournament
1. Go to your Quad Tournament
2. Navigate to **Pairings** tab

### Step 2: Click Generate Quads
- Click the **"🎯 Generate Quads"** button
- Button text changes to "Generating..." while processing

### Step 3: View Results
- Success message shows:
  - Number of quads created
  - Total games generated
  - Number of byes (if any)

### Step 4: View Pairings
- Below the button, you'll see pairings organized by quad
- Expand each quad to see matchups
- All 4 players in each quad will have round-robin assignments

## What Happens Behind the Scenes

When you click "Generate Quads":

1. **Algorithm runs:**
   - Fetches all active players
   - Sorts by rating (highest first)
   - Creates quads of 4 using snake pattern
   - Generates round-robin pairings

2. **Database updated:**
   - Pairings stored with quad ID
   - Section field = quad identifier
   - All pairings for the round created

3. **UI refreshes:**
   - Shows results and standings
   - Displays each quad's pairings
   - Ready for results entry

## Example Flow

### Before Clicking:
```
Tournament: Spring Quad Tournament (20 players)
Round: 1
Status: No pairings yet
```

### After Clicking Generate Quads:
```
✅ Quad pairings generated!

Quads: 5
Games: 30
Byes: 0

Now showing:
├─ Quad 1: Players ranked 1,5,9,13
├─ Quad 2: Players ranked 2,6,10,14
├─ Quad 3: Players ranked 3,7,11,15
├─ Quad 4: Players ranked 4,8,12,16
└─ Quad 5: Players ranked 17,18,19,20
```

## Features

✅ **One-Click Generation** - No complex form filling
✅ **Automatic Seeding** - Players grouped by rating
✅ **Round-Robin Ready** - Pairings optimized for each quad
✅ **Smart Byes** - Handles odd numbers automatically
✅ **Real-time Feedback** - Shows count of quads/games/byes
✅ **Error Handling** - Clear error messages if something fails

## Error Handling

### Possible Errors & Solutions

**"No active players found for quad pairing"**
- Add players to tournament first
- Ensure players are marked as "active"

**"Tournament not found"**
- Refresh the page
- Verify tournament ID

**"Failed to generate quad pairings"**
- Check server logs
- Verify network connection
- Try again or contact administrator

## Multi-Round Usage

For multi-round tournaments:

1. **Round 1**: Click "Generate Quads" with default settings
2. **Round 2**: Quads remain the same, new round-robin pairings generated
3. **Round 3**: Repeat for final round

Each round generates fresh pairings within the same quads.

## Resetting Quads

If you need to regenerate (rare):

1. Click button with existing pairings
2. System detects pairings exist
3. Shows confirmation or regenerate option

## Visual Example

```
┌─────────────────────────────────────────────────────────────┐
│ PAIRINGS TAB                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ⚡ Quad Tournament                    [🎯 Generate Quads]  │
│ Generate pairings by grouping players into quads of 4      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ QUAD 1                                                      │
│ ├─ Round 1: Player A vs B, C vs D                          │
│ ├─ Round 2: Player A vs C, B vs D                          │
│ └─ Round 3: Player A vs D, B vs C                          │
│                                                             │
│ QUAD 2                                                      │
│ ├─ Round 1: Player E vs F, G vs H                          │
│ └─ ...                                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Next Steps

After generating quads:

1. **View Pairings** - See matchups for each quad
2. **Enter Results** - Record game outcomes
3. **Check Standings** - View scores within each quad
4. **Next Round** - Generate pairings for Round 2
5. **Complete Tournament** - Finish all rounds

---

**Version**: 1.0
**Added**: October 24, 2025
**Feature**: Quad Tournament Button for Easy Pairing Generation
