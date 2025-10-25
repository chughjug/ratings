# Branding and Embedding Features

This document describes the comprehensive branding and embedding system implemented for public tournament pages.

## Overview

The system allows organizations to fully customize the appearance and branding of their public tournament pages, and provides easy embedding capabilities for external websites.

## Features

### 🎨 **Complete Branding System**
- **Theme Customization**: Colors, fonts, spacing, borders, shadows
- **Logo & Branding**: Custom logos, header text, taglines
- **Layout Options**: Multiple header styles, card designs, responsive layouts
- **Content Customization**: Welcome messages, about sections, custom HTML
- **Social Media Integration**: Links to all major social platforms
- **SEO Optimization**: Meta tags, Open Graph, custom HTML head/body

### 🔗 **Embedding Capabilities**
- **Iframe Embedding**: Secure, responsive iframe integration
- **React Component**: Ready-to-use React component
- **Customization**: Full theme and branding control via URL parameters
- **Security**: Sandboxed iframe with proper security headers
- **Responsive Design**: Automatically adapts to container size

### 🛠 **Developer Tools**
- **Live Preview**: Real-time preview of changes
- **Code Generation**: Automatic HTML and React code generation
- **Copy to Clipboard**: Easy code copying functionality
- **Demo Page**: Interactive demo at `/embed-demo`

## File Structure

```
client/src/
├── contexts/
│   └── BrandingContext.tsx          # Branding state management
├── components/
│   ├── BrandedHeader.tsx            # Customizable header component
│   ├── BrandedFooter.tsx            # Customizable footer component
│   └── EmbeddableTournament.tsx     # Embeddable tournament component
├── pages/
│   ├── BrandedPublicTournamentDisplay.tsx  # Branded tournament page
│   ├── OrganizationBrandingSettings.tsx    # Branding settings page
│   └── EmbedDemo.tsx                # Embedding demo page
└── styles/
    └── branding.css                 # Branding CSS system
```

## Usage

### 1. Organization Branding Settings

Access the branding settings at `/organizations/:id/branding`:

```tsx
// Organization branding settings page
<OrganizationBrandingSettings />
```

**Features:**
- Theme color picker
- Logo upload and positioning
- Layout customization
- Content management
- Social media links
- SEO settings
- Live preview
- Code generation

### 2. Branded Tournament Pages

Public tournament pages automatically use organization branding:

```tsx
// Branded tournament display
<BrandedPublicTournamentDisplay 
  isEmbedded={false}
  embedSettings={{}}
/>
```

**Features:**
- Automatic organization branding
- Responsive design
- Real-time updates
- Customizable display options
- Social sharing

### 3. Embedding Tournament Pages

#### HTML/JavaScript Embedding

```html
<iframe 
  src="https://yourdomain.com/public/tournament/tournament-id?embedded=true&org=org-id"
  width="100%" 
  height="600" 
  frameborder="0" 
  allowfullscreen>
</iframe>
```

#### React Component Embedding

```tsx
import EmbeddableTournament from './components/EmbeddableTournament';

<EmbeddableTournament
  tournamentId="tournament-id"
  organizationId="org-id"
  width="100%"
  height={600}
  allowFullscreen={true}
  allowResize={true}
  responsive={true}
  theme={{
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    accentColor: '#f59e0b',
    borderColor: '#e5e7eb',
    hoverColor: '#f3f4f6',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    gradientColors: ['#3b82f6', '#1d4ed8'],
    borderRadius: '0.5rem',
    spacing: '1rem',
  }}
  branding={{
    logoUrl: 'https://example.com/logo.png',
    headerText: 'Chess Tournament',
    tagline: 'Professional chess tournament management',
    customFont: 'Inter',
    logoPosition: 'left',
    logoSize: 'medium',
  }}
  layout={{
    headerStyle: 'default',
    cardStyle: 'default',
    showStats: true,
    showSocialLinks: true,
    showSearch: true,
    showFilters: true,
    gridColumns: 3,
    animationStyle: 'fade',
  }}
/>
```

## API Parameters

### URL Parameters for Embedding

| Parameter | Type | Description |
|-----------|------|-------------|
| `embedded` | boolean | Enable embedded mode |
| `org` | string | Organization ID for branding |
| `theme_*` | string | Theme customization |
| `branding_*` | string | Branding customization |
| `layout_*` | string | Layout customization |
| `content_*` | string | Content customization |
| `social_*` | string | Social media links |
| `seo_*` | string | SEO settings |
| `advanced_*` | string | Advanced settings |

### Theme Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `theme_primaryColor` | Primary color | `#3b82f6` |
| `theme_secondaryColor` | Secondary color | `#64748b` |
| `theme_backgroundColor` | Background color | `#ffffff` |
| `theme_textColor` | Text color | `#1f2937` |
| `theme_accentColor` | Accent color | `#f59e0b` |
| `theme_borderColor` | Border color | `#e5e7eb` |
| `theme_hoverColor` | Hover color | `#f3f4f6` |
| `theme_shadowColor` | Shadow color | `rgba(0, 0, 0, 0.1)` |
| `theme_borderRadius` | Border radius | `0.5rem` |
| `theme_spacing` | Spacing | `1rem` |

### Branding Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `branding_logoUrl` | Logo URL | - |
| `branding_headerText` | Header text | - |
| `branding_tagline` | Tagline | - |
| `branding_customFont` | Custom font | - |
| `branding_logoPosition` | Logo position | `left` |
| `branding_logoSize` | Logo size | `medium` |

## CSS Classes

The branding system provides utility classes for consistent styling:

```css
/* Brand utility classes */
.brand-primary { color: var(--brand-primary); }
.brand-secondary { color: var(--brand-secondary); }
.brand-background { background-color: var(--brand-background); }
.brand-text { color: var(--brand-text); }
.brand-accent { color: var(--brand-accent); }
.brand-border { border-color: var(--brand-border); }
.brand-hover:hover { background-color: var(--brand-hover); }
.brand-shadow { box-shadow: var(--brand-shadow-md); }
.brand-radius { border-radius: var(--brand-radius); }
.brand-gradient { background: var(--brand-gradient); }

/* Button styles */
.btn-brand { /* Primary button */ }
.btn-brand-outline { /* Outline button */ }
.btn-brand-ghost { /* Ghost button */ }

/* Card styles */
.card-brand { /* Default card */ }
.card-brand-elevated { /* Elevated card */ }
.card-brand-minimal { /* Minimal card */ }

/* Input styles */
.input-brand { /* Styled input */ }

/* Badge styles */
.badge-brand { /* Primary badge */ }
.badge-brand-secondary { /* Secondary badge */ }
.badge-brand-accent { /* Accent badge */ }
```

## Security Features

### Iframe Security
- **Sandbox Attributes**: `allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox`
- **Content Security Policy**: Proper CSP headers
- **X-Frame-Options**: Configurable frame options
- **Clickjacking Protection**: Frame busting when needed

### Data Validation
- **Input Sanitization**: All user inputs are sanitized
- **URL Validation**: Proper URL validation for external links
- **CSS Sanitization**: Custom CSS is sanitized before application

## Performance Optimizations

### CSS Optimization
- **CSS Variables**: Efficient theme switching
- **Minimal CSS**: Only necessary styles are loaded
- **Critical CSS**: Above-the-fold styles are inlined

### JavaScript Optimization
- **Lazy Loading**: Components are loaded on demand
- **Memoization**: Expensive calculations are memoized
- **Debouncing**: User input is debounced

### Embedding Optimization
- **Responsive Images**: Images adapt to container size
- **Lazy Loading**: Iframe content loads on demand
- **Caching**: Proper cache headers for static assets

## Browser Support

- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile Browsers**: iOS Safari 13+, Chrome Mobile 80+
- **Fallbacks**: Graceful degradation for older browsers

## Demo and Testing

### Demo Page
Visit `/embed-demo` to see the embedding system in action with:
- Live preview
- Configuration options
- Code generation
- Theme customization
- Branding options

### Testing Checklist
- [ ] Theme colors apply correctly
- [ ] Logo displays and positions properly
- [ ] Responsive design works on all devices
- [ ] Embedding works in iframe
- [ ] Social links function correctly
- [ ] SEO meta tags are generated
- [ ] Custom CSS applies without conflicts
- [ ] Performance is acceptable
- [ ] Security measures are in place

## Troubleshooting

### Common Issues

1. **Branding not applying**
   - Check if organization settings are saved
   - Verify CSS is loading correctly
   - Check browser console for errors

2. **Embedding not working**
   - Verify iframe src URL is correct
   - Check if organization ID is valid
   - Ensure iframe is not blocked by CSP

3. **Custom CSS conflicts**
   - Use more specific selectors
   - Check for CSS specificity issues
   - Validate CSS syntax

4. **Performance issues**
   - Optimize images and assets
   - Check for excessive DOM elements
   - Monitor network requests

### Debug Mode

Enable debug mode by adding `?debug=true` to the URL to see:
- Applied theme variables
- Active branding settings
- Performance metrics
- Error logs

## Future Enhancements

- [ ] **Theme Presets**: Pre-built theme templates
- [ ] **Advanced Animations**: More animation options
- [ ] **Custom Components**: User-defined components
- [ ] **A/B Testing**: Built-in A/B testing for themes
- [ ] **Analytics Integration**: Detailed usage analytics
- [ ] **Multi-language Support**: Internationalization
- [ ] **Dark Mode**: Automatic dark mode detection
- [ ] **Accessibility**: Enhanced accessibility features

## Support

For technical support or feature requests:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki
- Join the community Discord

---

*This branding and embedding system provides a comprehensive solution for customizing and embedding chess tournament pages with full control over appearance, functionality, and integration.*
