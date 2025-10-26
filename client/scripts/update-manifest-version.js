#!/usr/bin/env node

/**
 * Update Manifest Version Script
 * This script updates the version in manifest.json to ensure
 * service worker updates properly on new deployments
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_FILE = path.join(__dirname, '../public/manifest.json');
const TIMESTAMP = Date.now(); // Use timestamp as version

try {
  // Read the manifest file
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  
  // Update or add version
  manifest.version = `${Math.floor(TIMESTAMP / 1000)}`;
  manifest.short_name = `Chess Tour-${manifest.version.substring(-4)}`;
  
  // Write back to file
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n');
  
  console.log(`✅ Manifest version updated to: ${manifest.version}`);
} catch (error) {
  console.error('❌ Error updating manifest version:', error);
  process.exit(1);
}

