// Vercel entry point: Vercel runs this file as a serverless function.
// The same Express app as `npm start`; settings come from Vercel's Environment Variables.
const { createApp } = require('../src/server');

module.exports = createApp();
