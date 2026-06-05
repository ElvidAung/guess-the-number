// Initialize the SQLite database and the `users` table.
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

// `users` — one row per sign-up. Passwords are stored as plain text by request.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
