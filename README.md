# Troll auth — small SQL sign-up / log-in

Replaces the `localStorage` user store in `../troll` with a real SQLite
database served from Node.js (same shape as W001's `bonsai-auth` server).

## What was added

```
W002/
├── server/
│   ├── package.json   # express, cors, better-sqlite3
│   ├── db.js          # creates database.db and the `users` table
│   └── server.js      # POST /signup, POST /login, GET /users
└── troll/troll.js     # now POSTs to /signup
```

`database.db` is created automatically the first time the server runs.

## `users` table

| column       | type    | notes                                    |
|--------------|---------|------------------------------------------|
| id           | INTEGER | primary key, auto-increment              |
| email        | TEXT    | not null, unique                         |
| password     | TEXT    | not null (plain text, by request)        |
| created_at   | TEXT    | UTC timestamp from `datetime('now')`     |

## Run it

```bash
cd W002/server
npm install
npm start          # starts on http://localhost:3000
```

Then open `../troll/troll.html` in a browser.

> The HTML page calls `http://localhost:3000`, so the server has to be running
> before you sign up.

## API

- `POST /signup` — body `{ "email": "...", "password": "..." }`
  - `200` → `{ ok: true, id }`
  - `400` invalid email / missing password
  - `409` email already registered
- `POST /login` — body `{ "email": "...", "password": "..." }`
  - `200` → `{ ok: true, id, email }`
  - `401` wrong email or password
- `GET /users` — list all registered users (handy for debugging)
