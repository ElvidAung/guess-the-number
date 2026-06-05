// Tiny API for sign-up and log-in backed by SQLite (better-sqlite3).
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Prepared statements (created once, reused on every request).
const insertUser = db.prepare(
  'INSERT INTO users (email, password) VALUES (?, ?)'
);
const findByEmail = db.prepare(
  'SELECT id, email, password FROM users WHERE email = ?'
);

const isValidEmail = (email) =>
  typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (pw) =>
  typeof pw === 'string' && pw.length >= 1;

// POST /signup  —  { email, password }  ->  { ok: true, id } | { ok: false, error }
app.post('/signup', (req, res) => {
  const { email, password } = req.body || {};

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email.' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ ok: false, error: 'Password is required.' });
  }

  if (findByEmail.get(email)) {
    return res
      .status(409)
      .json({ ok: false, error: 'That email is already registered.' });
  }

  const result = insertUser.run(email, password);
  res.json({ ok: true, id: result.lastInsertRowid });
});

// POST /login  —  { email, password }  ->  { ok: true, id } | { ok: false, error }
app.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = isValidEmail(email) ? findByEmail.get(email) : null;

  if (!user || user.password !== password) {
    return res
      .status(401)
      .json({ ok: false, error: 'Wrong email or password.' });
  }

  res.json({ ok: true, id: user.id, email: user.email });
});

// GET /users  —  handy for inspecting the DB while developing.
app.get('/users', (req, res) => {
  const rows = db
    .prepare('SELECT id, email, created_at FROM users ORDER BY id')
    .all();
  res.json(rows);
});

app.listen(PORT, () => {
  console.log(`Auth server listening on http://localhost:${PORT}`);
});
