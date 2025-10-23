const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'chess_tournaments.db');
const db = new sqlite3.Database(dbPath);

// Example: Change the theme colors
const newCustomization = {
  theme: {
    primaryColor: '#2563EB',      // Changed to blue
    secondaryColor: '#1E40AF',    // Changed to darker blue
    backgroundColor: '#FFFFFF',   // White background
    textColor: '#1F2937',         // Dark gray text
    accentColor: '#F59E0B',       // Orange accent
    borderColor: '#E5E7EB',       // Light gray borders
    hoverColor: '#F3F4F6',        // Light gray hover
    borderRadius: '8px',          // Smaller border radius
    spacing: '16px'               // Standard spacing
  },
  branding: {
    logoUrl: 'https://via.placeholder.com/100x100/2563EB/FFFFFF?text=Chess',
    faviconUrl: 'https://via.placeholder.com/32x32/2563EB/FFFFFF?text=C',
    customFont: 'Inter',
    headerText: 'Chess Masters Club',
    tagline: 'Where Strategy Meets Excellence',
    customCss: `
      .custom-header {
        background: linear-gradient(135deg, #2563EB 0%, #1E40AF 100%);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
      }
      .tournament-card {
        border-left: 4px solid #2563EB;
        transition: all 0.3s ease;
      }
      .tournament-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(37, 99, 235, 0.1);
      }
    `
  },
  layout: {
    headerStyle: 'default',
    cardStyle: 'modern',
    showStats: true,
    showSocialLinks: true,
    showBreadcrumbs: true,
    showSearch: true,
    showFilters: true,
    gridColumns: 3,
    animationStyle: 'slide'
  },
  content: {
    showAnnouncements: true,
    showCalendar: true,
    showNews: true,
    showContactInfo: true,
    customFooter: '© 2024 Chess Masters Club. Promoting strategic thinking and community engagement.',
    welcomeMessage: 'Welcome to Chess Masters Club - where every move matters.',
    aboutSection: 'The Chess Masters Club is dedicated to promoting the ancient game of chess through tournaments, education, and community engagement. Join us for strategic thinking and competitive play.'
  },
  social: {
    facebook: 'https://facebook.com/chessmastersclub',
    twitter: 'https://twitter.com/chessmasters',
    instagram: 'https://instagram.com/chessmastersclub',
    youtube: 'https://youtube.com/chessmastersclub',
    discord: 'https://discord.gg/chessmasters',
    linkedin: 'https://linkedin.com/company/chess-masters-club'
  },
  seo: {
    metaTitle: 'Chess Masters Club - Strategic Thinking & Competitive Play',
    metaDescription: 'Join the Chess Masters Club for tournaments, training, and community events. Promoting strategic thinking and competitive chess.',
    metaKeywords: 'chess club, chess tournaments, strategic thinking, competitive chess, chess training',
    ogImage: 'https://via.placeholder.com/1200x630/2563EB/FFFFFF?text=Chess+Masters+Club',
    robotsIndex: true
  },
  advanced: {
    enableDarkMode: true,
    enableRtl: false,
    enablePwa: false
  }
};

// Update the organization with new customization
const updateQuery = `
  UPDATE organizations 
  SET settings = ?, 
      logo_url = ?,
      description = ?
  WHERE slug = 'police'
`;

db.run(updateQuery, [
  JSON.stringify(newCustomization),
  newCustomization.branding.logoUrl,
  newCustomization.content.aboutSection
], function(err) {
  if (err) {
    console.error('Error updating organization:', err);
  } else {
    console.log('✅ Successfully updated organization with new customization!');
    console.log('🎨 Applied new blue theme with modern styling');
    console.log('🏗️ Set default header style with modern cards');
    console.log('📱 Updated social media links and branding');
    console.log('\n🌐 Visit http://localhost:3000/public/organizations/police to see the changes!');
  }
  
  db.close();
});

console.log('🔄 Updating organization customization...');
