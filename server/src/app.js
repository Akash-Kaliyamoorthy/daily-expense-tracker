'use strict';

/**
 * The Express application (no listening here, so Supertest can import it).
 * server.js is what migrates the DB and starts the HTTP server.
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const { query } = require('./config/db');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimit');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

const app = express();
app.disable('x-powered-by');

// Render (and most hosts) sit behind a reverse proxy. Trusting one hop gives
// the rate limiter the real client IP and lets Express see HTTPS.
if (env.isProduction) app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        // The built React app only loads its own scripts/styles. Charts draw
        // on <canvas>, and React sets inline style attributes.
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        // Don't force https:// for sub-resources when running locally over http.
        'upgrade-insecure-requests': env.isProduction ? [] : null,
      },
    },
  }),
);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // No Origin header = same-origin browser request, curl, or Postman.
      if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
  }),
);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Health check for Render. Also verifies the database is reachable.
app.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({
      success: true,
      data: { status: 'ok', uptime: Math.round(process.uptime()) },
      message: 'OK',
    });
  } catch {
    res.status(503).json({ success: false, data: null, message: 'Database unavailable' });
  }
});

// Never cache API responses: they are per-user.
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/api', apiLimiter, routes);
app.use('/api', notFound); // unknown /api/* -> JSON 404, never the React page

// Serve the built React app (production / after `npm run build`).
if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  // Hashed asset files can be cached for a year; index.html must always revalidate.
  app.use(
    '/assets',
    express.static(path.join(CLIENT_DIST, 'assets'), { immutable: true, maxAge: '1y' }),
  );
  app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }));
  // SPA fallback: any other GET returns index.html so React Router can handle it.
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use(errorHandler);

module.exports = app;
