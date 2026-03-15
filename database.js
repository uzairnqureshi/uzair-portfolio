// database.js — SQLite setup with better-sqlite3
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'portfolio.db');
const db = new Database(DB_PATH);

// Performance pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── SCHEMA ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    ip          TEXT,
    user_agent  TEXT,
    read        INTEGER DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS visitors (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ip          TEXT,
    path        TEXT,
    referrer    TEXT,
    user_agent  TEXT,
    visited_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_visitors_visited ON visitors(visited_at DESC);
`);

// ── PREPARED STATEMENTS ──────────────────────────────────────────────────────

const stmts = {
  insertMessage: db.prepare(`
    INSERT INTO messages (name, email, message, ip, user_agent)
    VALUES (@name, @email, @message, @ip, @userAgent)
  `),

  getAllMessages: db.prepare(`
    SELECT id, name, email, message, read, created_at
    FROM messages ORDER BY created_at DESC
  `),

  getUnreadCount: db.prepare(`
    SELECT COUNT(*) as count FROM messages WHERE read = 0
  `),

  markRead: db.prepare(`
    UPDATE messages SET read = 1 WHERE id = @id
  `),

  markAllRead: db.prepare(`
    UPDATE messages SET read = 1
  `),

  deleteMessage: db.prepare(`
    DELETE FROM messages WHERE id = @id
  `),

  insertVisitor: db.prepare(`
    INSERT INTO visitors (ip, path, referrer, user_agent)
    VALUES (@ip, @path, @referrer, @userAgent)
  `),

  getVisitorStats: db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT ip) as unique_visitors,
      COUNT(CASE WHEN visited_at >= datetime('now', '-1 day') THEN 1 END) as last_24h,
      COUNT(CASE WHEN visited_at >= datetime('now', '-7 days') THEN 1 END) as last_7d
    FROM visitors
  `),

  getTopPaths: db.prepare(`
    SELECT path, COUNT(*) as hits
    FROM visitors
    GROUP BY path
    ORDER BY hits DESC
    LIMIT 10
  `)
};

module.exports = { db, stmts };
