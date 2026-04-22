require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const logger     = require('./config/logger');

// Route modules
const authRoutes          = require('./modules/auth/auth.routes');
const tasksRoutes         = require('./modules/tasks/tasks.routes');
const projectsRoutes      = require('./modules/projects/projects.routes');
const usersRoutes         = require('./modules/users/users.routes');
const commentsRoutes      = require('./modules/comments/comments.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');

const app  = express();
const PORT = process.env.PORT || 5000;

/* ── Security & logging ───────────────── */
app.use(helmet());
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

/* ── CORS ─────────────────────────────── */
/* ── CORS ─────────────────────────────── */
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://mytherapy.minderytech.com',
  'https://minderytech.com',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.endsWith('.minderytech.com') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

/* ── Body parsing ─────────────────────── */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ── Health check ─────────────────────── */
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

/* ── API routes ───────────────────────── */
app.use('/api/auth',          authRoutes);
app.use('/api/tasks',         tasksRoutes);
app.use('/api/projects',      projectsRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/comments',      commentsRoutes);
app.use('/api/notifications', notificationsRoutes);

/* ── 404 handler ──────────────────────── */
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/* ── Global error handler ─────────────── */
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error: ' + err.message);
  logger.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

/* ── Start ────────────────────────────── */
app.listen(PORT, () => {
  logger.info(`TaskFlow API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
