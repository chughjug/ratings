const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'chess_tournaments.db');
const db = new sqlite3.Database(dbPath);

// Test customization settings for the "police" organization
const testCustomization = {
  theme: {
    primaryColor: '#8B4513',
    secondaryColor: '#F5F5DC',
    backgroundColor: '#FAFAFA',
    textColor: '#2D3748',
    accentColor: '#D69E2E',
    borderColor: '#E5E7EB',
    hoverColor: '#F3F4F6',
    borderRadius: '12px',
    spacing: '20px'
  },
  branding: {
    logoUrl: 'https://via.placeholder.com/100x100/8B4513/FFFFFF?text=Police',
    faviconUrl: 'https://via.placeholder.com/32x32/8B4513/FFFFFF?text=P',
    customFont: 'Playfair Display',
    headerText: 'Police Chess Club',
    tagline: 'Strategic Thinking, Professional Excellence',
    customCss: `
      .custom-header {
        background: linear-gradient(135deg, #8B4513 0%, #F5F5DC 100%);
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .tournament-card {
        border-left: 4px solid #8B4513;
        transition: all 0.3s ease;
      }
      .tournament-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(139, 69, 19, 0.15);
      }
    `
  },
  layout: {
    headerStyle: 'hero',
    cardStyle: 'elevated',
    showStats: true,
    showSocialLinks: true,
    showBreadcrumbs: false,
    showSearch: true,
    showFilters: true,
    gridColumns: 3,
    animationStyle: 'fade'
  },
  content: {
    showAnnouncements: true,
    showCalendar: true,
    showNews: true,
    showContactInfo: true,
    customFooter: '© 2024 Police Chess Club. Promoting strategic thinking and community engagement.',
    welcomeMessage: 'Welcome to the Police Chess Club - where strategy meets service.',
    aboutSection: 'The Police Chess Club brings together law enforcement professionals and chess enthusiasts to promote strategic thinking, mental agility, and community engagement through the timeless game of chess.'
  },
  social: {
    facebook: 'https://facebook.com/policechessclub',
    twitter: 'https://twitter.com/policechess',
    instagram: 'https://instagram.com/policechessclub',
    youtube: 'https://youtube.com/policechessclub',
    discord: 'https://discord.gg/policechess',
    linkedin: 'https://linkedin.com/company/police-chess-club'
  },
  seo: {
    metaTitle: 'Police Chess Club - Strategic Thinking & Community Engagement',
    metaDescription: 'Join the Police Chess Club for tournaments, training, and community events. Promoting strategic thinking and mental agility.',
    metaKeywords: 'police chess, law enforcement chess, chess tournaments, strategic thinking, community chess',
    ogImage: 'https://via.placeholder.com/1200x630/8B4513/FFFFFF?text=Police+Chess+Club',
    robotsIndex: true
  },
  advanced: {
    enableDarkMode: true,
    enableRtl: false,
    enablePwa: false
  }
};

// Update the organization with test customization
const updateQuery = `
  UPDATE organizations 
  SET settings = ?, 
      logo_url = ?,
      description = ?
  WHERE slug = 'police'
`;

db.run(updateQuery, [
  JSON.stringify(testCustomization),
  testCustomization.branding.logoUrl,
  testCustomization.content.aboutSection
], function(err) {
  if (err) {
    console.error('Error updating organization:', err);
  } else {
    console.log('✅ Successfully updated Police Chess Club with test customization!');
    console.log('🎨 Applied custom theme with brown/gold colors');
    console.log('🏗️ Set hero header style with elevated cards');
    console.log('📱 Added custom CSS and social media links');
    console.log('🔍 Added SEO optimization');
    console.log('\n🌐 Visit http://localhost:3000/public/organizations/police to see the changes!');
  }
  
  db.close();
});
