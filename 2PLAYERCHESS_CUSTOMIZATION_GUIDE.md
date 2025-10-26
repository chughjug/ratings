# 2PlayerChess Customization Guide

## Overview
You can customize the look and styling of the 2PlayerChess application by modifying CSS and HTML files.

## Files to Edit

### 1. Main Stylesheet
**File**: `2PlayerChess-master/views/style.css`

This is the main CSS file containing all styling. You can customize:
- Colors (background, text, pieces, clocks)
- Fonts and sizes
- Layout and spacing
- Button styles
- Board appearance

### 2. HTML Template
**File**: `2PlayerChess-master/views/chess.html`

Contains the structure and some inline styles.

## Common Customizations

### 1. Color Scheme

#### Board Background
Locate `.chess-bgd` class and modify the background:
```css
.chess-bgd {
    background: black; /* Change to your color */
}
```

#### Text Colors
Find and modify these selectors:
```css
/* Gold/beige color for pieces */
.chesspieceW {
    color: #c9b375; /* Change to your preferred color */
}

/* Dark color for black pieces */
.chesspieceB {
    color: #2e2e2e; /* Change to your preferred color */
}
```

#### Clock Colors
Search for `#whiteclock` and `#blackclock` to modify timer colors:
```css
#whiteclock {
    color: white; /* Modify clock color */
}

#blackclock {
    color: black; /* Modify clock color */
}
```

### 2. Font Customization

#### Font Family
Add at the top of `style.css`:
```css
* {
    font-family: 'Your Font Name', sans-serif;
}
```

#### Font Sizes
Modify these classes for different text sizes:
```css
h4 {
    font-size: 24px; /* Title size */
}

.btn {
    font-size: 14px; /* Button text */
}
```

### 3. Button Styling

#### Button Colors
Find button classes and modify:
```css
.btn-success {
    background-color: #28a745; /* Green buttons */
}

.btn-danger {
    background-color: #dc3545; /* Red buttons */
}

.btn-secondary {
    background-color: #6c757d; /* Gray buttons */
}
```

#### Button Size
```css
.btn {
    padding: 10px 20px;
    border-radius: 5px; /* Rounded corners */
}
```

### 4. Layout Changes

#### Board Size
Modify the board container:
```css
#gameboard-column {
    width: 100%;
    height: 100%;
}
```

#### Controls Position
Adjust the controls layout:
```css
#game-controls-container {
    padding: 20px;
    height: auto;
}
```

### 5. Mobile Responsiveness

The CSS includes media queries for mobile devices starting at line 1:
```css
@media only screen and (max-device-width: 969px) {
    /* Mobile-specific styles */
}
```

## Steps to Customize

1. **Backup the original files**:
   ```bash
   cp 2PlayerChess-master/views/style.css 2PlayerChess-master/views/style.css.backup
   cp 2PlayerChess-master/views/chess.html 2PlayerChess-master/views/chess.html.backup
   ```

2. **Edit the CSS file**:
   ```bash
   # Use any text editor
   nano 2PlayerChess-master/views/style.css
   ```

3. **Test your changes**:
   - Restart the 2PlayerChess server
   - Open in browser
   - Use browser developer tools (F12) to inspect and test

4. **Deploy to production**:
   - After testing, commit and push changes
   - Redeploy to Heroku

## CSS Structure Overview

The stylesheet is organized into:
1. **Mobile responsive styles** (lines 1-400)
2. **Desktop styles** (lines 400-962)
3. **Layout and positioning**
4. **Color and typography**
5. **Interactive elements**

## Quick Color Scheme Example

To create a dark theme:
```css
/* Background */
body {
    background-color: #1a1a1a;
    color: #ffffff;
}

/* Board */
.chess-bgd {
    background: #2d2d2d;
}

/* Pieces */
.chesspieceW {
    color: #f0d9b5;
}

.chesspieceB {
    color: #b58863;
}

/* Buttons */
.btn {
    background-color: #3a3a3a;
    color: #ffffff;
}

.btn:hover {
    background-color: #4a4a4a;
}
```

## Logo/Branding Customization

To add a custom logo:

1. Add image to `2PlayerChess-master/views/` directory
2. Reference it in `chess.html`:
```html
<img src="your-logo.png" alt="Logo" class="logo" />
```

3. Style it in CSS:
```css
.logo {
    max-width: 150px;
    height: auto;
}
```

## Tips

1. **Use browser DevTools**: Right-click → Inspect to see which CSS rules apply
2. **Test incrementally**: Make one change at a time and test
3. **Check mobile view**: Ensure changes work on mobile devices
4. **Keep backups**: Always backup before making changes
5. **Use CSS variables**: For easy theme switching, use CSS custom properties:
   ```css
   :root {
       --primary-color: #c9b375;
       --secondary-color: #2e2e2e;
   }
   ```

## Advanced Customization

### Custom Theme Variables
Add at the top of `style.css`:
```css
:root {
    --bg-color: #1a1a1a;
    --text-color: #ffffff;
    --primary-accent: #c9b375;
    --secondary-accent: #2e2e2e;
    --button-color: #3a3a3a;
}

body {
    background-color: var(--bg-color);
    color: var(--text-color);
}
```

Then update throughout the file using these variables.

## Common Issues

1. **Styles not applying**: Clear browser cache or do a hard refresh (Ctrl+Shift+R)
2. **Layout breaking**: Check that you didn't remove important CSS rules
3. **Mobile issues**: Test responsive design with browser DevTools
4. **Conflicting styles**: Use `!important` sparingly and only when necessary

## Resources

- [CSS Reference](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [Color Palette Tools](https://coolors.co/)
- [Font Pairing](https://fonts.google.com/)
