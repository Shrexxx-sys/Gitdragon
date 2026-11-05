// Starts the backend: `npm start`
require('dotenv').config({ quiet: true });
const { createApp } = require('./server');

const port = Number(process.env.PORT) || 3000;
const app = createApp();
app.listen(port, () => {
  console.log(`Git Autopsy backend running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});
