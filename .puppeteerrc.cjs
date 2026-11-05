// Puppeteer is only used by `npm run browser-check` (a real-browser test). To keep `npm install`
// light, Chrome for Testing is NOT downloaded automatically. Get it once with:
//   npx puppeteer browsers install chrome
// It's stored inside this project, in the git-ignored .cache folder.
const { join } = require('path');

module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  skipDownload: true,
};
