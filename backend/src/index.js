const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./db');
const { logger } = require('./middleware/logger');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3100;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(rateLimit({ windowMs: 60000, max: 100, message: { error: 'rate_limit', message: 'Too many requests' } }));

app.use('/api/v1/restrictions', require('./routes/restrictions'));
app.use('/api/v1/profiles', require('./routes/profiles'));
app.use('/api/v1/benchmark', require('./routes/benchmark'));
app.use('/api/v1/devices', require('./routes/devices'));
app.use('/api/v1/games', require('./routes/games'));
app.use('/api/v1/analytics', require('./routes/analytics'));
app.use('/api/v1/ddm', require('./routes/ddm'));
app.use('/api/v1/admin', require('./routes/admin'));
app.use('/api/v1/health', require('./routes/health'));

app.use(errorHandler);

async function start() {
  await initDB();
  app.listen(PORT, () => {
    logger.info(`iOS Perf API v1 running on port ${PORT}`);
    logger.info(`Health: http://localhost:${PORT}/api/v1/health`);
  });
}

start().catch(err => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
