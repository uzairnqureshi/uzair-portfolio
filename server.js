// server.js — Uzair Qureshi Portfolio Backend
require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const validator  = require('validator');
const nodemailer = require('nodemailer');
const { stmts }  = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── TRUST PROXY (for Railway / Render) ─────────────────────────────────────
app.set('trust proxy', 1);

// ── SECURITY MIDDLEWARE ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST']
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// ── VISITOR TRACKING ────────────────────────────────────────────────────────
app.use((req, res, next) => {
  // Only track page visits, not assets
  if (req.path === '/' || req.path === '/index.html') {
    try {
      stmts.insertVisitor.run({
        ip:        req.ip,
        path:      req.path,
        referrer:  req.headers['referer'] || null,
        userAgent: req.headers['user-agent'] || null
      });
    } catch (_) { /* non-fatal */ }
  }
  next();
});

// ── RATE LIMITERS ───────────────────────────────────────────────────────────
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: { error: 'Too many messages sent. Please wait 15 minutes.' }
});

const adminLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { error: 'Too many admin requests.' }
});

// ── STATIC FILES ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API: CONTACT FORM ───────────────────────────────────────────────────────
app.post('/api/contact', contactLimiter, (req, res) => {
  const { name, email, message } = req.body;

  // Validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (!validator.isLength(name.trim(), { min: 1, max: 100 })) {
    return res.status(400).json({ error: 'Name must be between 1 and 100 characters.' });
  }
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!validator.isLength(message.trim(), { min: 5, max: 2000 })) {
    return res.status(400).json({ error: 'Message must be between 5 and 2000 characters.' });
  }

  // Sanitize
  const clean = {
    name:      validator.escape(name.trim()),
    email:     validator.normalizeEmail(email) || email.toLowerCase().trim(),
    message:   validator.escape(message.trim()),
    ip:        req.ip,
    userAgent: req.headers['user-agent'] || null
  };

  // Save to DB
  try {
    const result = stmts.insertMessage.run(clean);

    // Send email notification (optional — only if SMTP env vars are set)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      sendEmailNotification(clean).catch(err => {
        console.error('Email notification failed:', err.message);
      });
    }

    console.log(`📨 New message from ${clean.name} <${clean.email}> [id=${result.lastInsertRowid}]`);
    return res.status(201).json({ success: true, message: 'Message received!' });

  } catch (err) {
    console.error('DB insert error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── ADMIN MIDDLEWARE ─────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  const adminKey = process.env.ADMIN_KEY;

  if (!adminKey) {
    return res.status(503).json({ error: 'Admin key not configured.' });
  }
  if (!key || key !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

// ── API: ADMIN — GET MESSAGES ────────────────────────────────────────────────
app.get('/api/admin/messages', adminLimiter, requireAdmin, (req, res) => {
  try {
    const messages = stmts.getAllMessages.all();
    const { count: unread } = stmts.getUnreadCount.get();
    return res.json({ total: messages.length, unread, messages });
  } catch (err) {
    return res.status(500).json({ error: 'DB error.' });
  }
});

// ── API: ADMIN — MARK MESSAGE READ ──────────────────────────────────────────
app.post('/api/admin/messages/:id/read', adminLimiter, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' });
  stmts.markRead.run({ id });
  res.json({ success: true });
});

// ── API: ADMIN — MARK ALL READ ───────────────────────────────────────────────
app.post('/api/admin/messages/read-all', adminLimiter, requireAdmin, (req, res) => {
  stmts.markAllRead.run();
  res.json({ success: true });
});

// ── API: ADMIN — DELETE MESSAGE ──────────────────────────────────────────────
app.delete('/api/admin/messages/:id', adminLimiter, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' });
  stmts.deleteMessage.run({ id });
  res.json({ success: true });
});

// ── API: ADMIN — STATS ───────────────────────────────────────────────────────
app.get('/api/admin/stats', adminLimiter, requireAdmin, (req, res) => {
  try {
    const visitors  = stmts.getVisitorStats.get();
    const topPaths  = stmts.getTopPaths.all();
    const { count: unread } = stmts.getUnreadCount.get();
    return res.json({ visitors, topPaths, unread_messages: unread });
  } catch (err) {
    return res.status(500).json({ error: 'DB error.' });
  }
});

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime().toFixed(1) + 's' });
});

// ── CATCH-ALL → SPA ──────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── EMAIL HELPER ─────────────────────────────────────────────────────────────
async function sendEmailNotification({ name, email, message }) {
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from:    `"Portfolio Bot" <${process.env.SMTP_USER}>`,
    to:      process.env.NOTIFY_EMAIL || process.env.SMTP_USER,
    subject: `📨 New message from ${name}`,
    html: `
      <h2 style="font-family:sans-serif">New Contact Message</h2>
      <table style="font-family:sans-serif;border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Name</strong></td>
            <td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Email</strong></td>
            <td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Message</strong></td>
            <td style="padding:8px;border:1px solid #ddd">${message.replace(/\n/g, '<br>')}</td></tr>
      </table>
    `
  });
}

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════╗
  ║  🚀  Uzair Portfolio  LIVE         ║
  ║  🌐  http://localhost:${PORT}         ║
  ║  📊  Admin: /api/admin/messages    ║
  ╚════════════════════════════════════╝
  `);
});
