#!/usr/bin/env node

/**
 * Update Service Worker Cache Version Script
 * This script updates the BUILD_TIMESTAMP in sw.js to ensure
 * cache invalidation on each deployment
 */

const fs = require('fs');
const path = require('path');

const SW_FILE = path.join(__dirname, '../public/sw.js');
const TIMESTAMP = new Date().toISOString();

try {
  // Read the service worker file
  let swContent = fs.readFileSync(SW_FILE, 'utf8');
  
  // Replace the BUILD_TIMESTAMP line
  swContent = swContent.replace(
    /const BUILD_TIMESTAMP = '[^']+';/,
    `const BUILD_TIMESTAMP = '${TIMESTAMP}';`
  );
  
  // Write back to file
  fs.writeFileSync(SW_FILE, swContent);
  
  console.log(`✅ Service Worker cache version updated to: ${TIMESTAMP}`);
} catch (error) {
  console.error('❌ Error updating service worker version:', error);
  process.exit(1);
}

