const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  // Use a more efficient browser for Heroku
  browser: 'chrome',
  // Skip download if already exists
  skipDownload: false,
  // Use system Chrome if available
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
};
