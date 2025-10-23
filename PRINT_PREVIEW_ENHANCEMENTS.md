# Print Preview Enhancements

This document describes the enhanced print preview functionality for the chess tournament management system, providing better visual presentation and separate page generation for different tournament sections.

## Features

### 1. Enhanced Print Styles (`client/src/styles/print.css`)

- **Improved Typography**: Better font choices, sizing, and spacing
- **Professional Layout**: Enhanced headers, section dividers, and table styling
- **Better Visual Hierarchy**: Clear distinction between different content sections
- **Responsive Design**: Optimized for different paper sizes and orientations
- **Page Break Control**: Intelligent page breaks to avoid splitting important content

### 2. Enhanced PrintableView Component (`client/src/components/PrintableView.tsx`)

- **Section Filtering**: Display specific sections or all sections
- **Separate Page Support**: Option to put each section on its own page
- **Improved Layout**: Better table containers and player row styling
- **Flexible Configuration**: Support for different view types and display options

### 3. Enhanced Print Preview Component (`client/src/components/EnhancedPrintPreview.tsx`)

- **Interactive Preview**: Real-time preview with section navigation
- **Section Selection**: Choose specific sections to preview or print
- **Page Navigation**: Navigate through separate pages when enabled
- **Print Settings**: Configure orientation, paper size, and other options
- **Export Options**: Direct PDF export with enhanced formatting

### 4. Enhanced PDF Export Service (`client/src/services/pdfExport.ts`)

- **Section-Specific Export**: Export individual sections or all sections
- **Separate Page Generation**: Create separate pages for each section
- **Improved Formatting**: Better headers, table styling, and layout
- **Enhanced Typography**: Professional fonts and spacing
- **Better Page Breaks**: Intelligent page break handling

## Usage

### Basic Print Preview

```tsx
import EnhancedPrintPreview from './components/EnhancedPrintPreview';

<EnhancedPrintPreview
  tournament={tournament}
  pairings={pairings}
  standings={standings}
  currentRound={currentRound}
  viewType="pairings"
  onClose={() => setShowPreview(false)}
/>
```

### Section-Specific Printing

```tsx
<PrintableView
  tournament={tournament}
  pairings={pairings}
  standings={standings}
  currentRound={currentRound}
  viewType="standings"
  selectedSection="U1600"
  separatePages={true}
/>
```

### PDF Export with Sections

```tsx
import { exportPairingsPDF } from './services/pdfExport';

// Export all sections with separate pages
await exportPairingsPDF(
  tournament,
  pairings,
  round,
  'tournament_pairings.pdf',
  'all',
  true
);

// Export specific section
await exportPairingsPDF(
  tournament,
  pairings,
  round,
  'u1600_pairings.pdf',
  'U1600',
  false
);
```

## Print Styles

### Key CSS Classes

- `.tournament-header`: Main tournament header with enhanced styling
- `.section-header`: Section headers with professional appearance
- `.pairings-table` / `.standings-table`: Enhanced table styling
- `.section-break`: Forces page breaks between sections
- `.table-container`: Prevents page breaks within tables
- `.player-row`: Prevents page breaks within player rows

### Print Media Queries

- `@media print`: Main print styles
- `@page`: Page setup and margins
- Responsive adjustments for different paper sizes

## Configuration Options

### PrintableView Props

- `selectedSection`: Filter to specific section ('all' for all sections)
- `separatePages`: Put each section on separate pages
- `viewType`: Type of view ('pairings', 'standings', 'report')

### EnhancedPrintPreview Props

- `tournament`: Tournament data
- `pairings`: Pairing data array
- `standings`: Standings data array
- `currentRound`: Current round number
- `viewType`: Type of view to preview
- `onClose`: Callback when preview is closed

## Benefits

1. **Professional Appearance**: Enhanced typography and layout for better readability
2. **Flexible Printing**: Choose specific sections or print all sections
3. **Better Organization**: Separate pages for different sections when needed
4. **Improved User Experience**: Interactive preview with navigation controls
5. **Consistent Formatting**: Standardized styling across all print outputs
6. **Print Optimization**: Optimized for different paper sizes and orientations

## Integration

To integrate these enhancements into existing components:

1. Import the `PrintPreviewIntegration` component
2. Pass the required props (tournament, pairings, standings, etc.)
3. The component will handle the print preview and print functionality

```tsx
import PrintPreviewIntegration from './components/PrintPreviewIntegration';

<PrintPreviewIntegration
  tournament={tournament}
  pairings={pairings}
  standings={standings}
  currentRound={currentRound}
  viewType="pairings"
/>
```

## Future Enhancements

- Custom print templates
- Print preview zoom controls
- Print quality settings
- Batch printing for multiple tournaments
- Print scheduling and automation
