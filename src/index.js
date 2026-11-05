// Starts the backend: `npm start`
require('dotenv').config({ quiet: true });
const { createApp } = require('./server');

const port = Number(process.env.PORT) || 3000;
const app = createApp();

// Note: in Express 5 this callback also runs when starting FAILS, so we must check `err`.
app.listen(port, (err) => {
  if (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nPort ${port} is already in use: another copy of the backend (or another app) is running.`);
      console.error(`Fix: close the other terminal running "npm start", or find and stop it:`);
      console.error(`  1. netstat -ano | findstr :${port}      (the last number on each line is the process ID)`);
      console.error(`  2. taskkill /PID <that number> /F`);
      console.error(`Or use another port: set PORT=3001 in .env (then also update the extension's backend URL).\n`);
    } else {
      console.error('Could not start the backend:', err.message);
    }
    process.exit(1);
  }
  console.log(`Git Autopsy backend running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`AI: ${process.env.AI_PROVIDER || 'auto'} | GitHub token: ${process.env.GITHUB_TOKEN ? 'yes' : 'no'}`);
});
