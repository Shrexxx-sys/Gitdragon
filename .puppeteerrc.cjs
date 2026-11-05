// Keep puppeteer's Chrome for Testing download inside this project (in the git-ignored .cache folder).
const { join } = require('path');

module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
