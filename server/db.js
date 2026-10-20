import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(here, '..', 'data');
export const UPLOAD_DIR = join(DATA_DIR, 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, 'walk.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('owner','walker','both')),  -- both = 飼主兼遛狗者
  name TEXT NOT NULL,
  avatar TEXT,
  email TEXT, phone TEXT, district TEXT,
  bio TEXT, experience TEXT,
  password_hash TEXT,                                            -- scrypt "salt:hash"（server/auth.js）
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS walker_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  gender TEXT, age INTEGER, years INTEGER,
  transport TEXT,              -- JSON array
  mode TEXT DEFAULT 'both',    -- paid | free | both
  days TEXT,                   -- JSON array of weekday numbers (0 = Sun)
  start_time TEXT, end_time TEXT,
  base_rates TEXT,             -- JSON {30,60,90}
  rates TEXT,                  -- JSON condition add-ons {large,reactive,senior,extraPet}
  skills TEXT,                 -- JSON array
  verified TEXT, pending TEXT, -- JSON arrays
  qualification TEXT,
  areas TEXT,                  -- JSON array of districts served
  available INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS pets (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, type TEXT DEFAULT '犬', breed TEXT, birth TEXT, sex TEXT, neuter TEXT,
  weight REAL, chip_last4 TEXT, vaccine TEXT, energy TEXT, social TEXT, leash TEXT,
  intro TEXT, medical TEXT, emergency TEXT, clinic TEXT, photo_url TEXT
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  walker_id INTEGER REFERENCES users(id),     -- NULL = 公開任務，任何遛狗者可接
  pet_id INTEGER NOT NULL REFERENCES pets(id),
  start_at TEXT NOT NULL, duration INTEGER NOT NULL,
  mode TEXT DEFAULT 'paid',
  extras TEXT, conditions TEXT,               -- JSON
  address TEXT, district TEXT, route_id TEXT,
  photo_interval INTEGER DEFAULT 15,
  notes TEXT,
  bill TEXT,                                  -- JSON snapshot at booking time
  status TEXT NOT NULL DEFAULT 'requested',   -- open|requested|accepted|declined|in_progress|completed|settled|cancelled
  progress REAL DEFAULT 0,
  off_route INTEGER DEFAULT 0,
  on_time INTEGER,
  started_at TEXT, ended_at TEXT, settled_at TEXT,
  ai_report TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS gps_points (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  lat REAL, lng REAL, off_route INTEGER DEFAULT 0,
  at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS walk_updates (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  kind TEXT DEFAULT 'note',                   -- note|photo|alert|system
  text TEXT, photo_url TEXT, ai_label TEXT, ai_flag INTEGER DEFAULT 0,
  at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL, walker_id INTEGER NOT NULL, sender_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  owner_id INTEGER, walker_id INTEGER,
  stars REAL, safety INTEGER, punctual INTEGER, updates INTEGER, care INTEGER,
  text TEXT,
  at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY,
  walker_id INTEGER, booking_id INTEGER, reporter_id INTEGER,
  type TEXT,                                  -- no_show | late_cancel | care_issue | other
  description TEXT,
  status TEXT DEFAULT 'pending',              -- pending | confirmed | dismissed
  at TEXT DEFAULT (datetime('now'))
);
`;
db.exec(SCHEMA);
// Older databases were created before self-registration existed.
if (!db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'password_hash')) {
  db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
}

// Columns stored as JSON text, decoded on the way out.
const JSON_COLS = new Set(['transport', 'days', 'base_rates', 'rates', 'skills', 'verified', 'pending', 'areas', 'extras', 'conditions', 'bill']);

export function decode(row) {
  if (!row) return row;
  const out = { ...row };
  delete out.password_hash; // never leaves the server
  for (const k of Object.keys(out)) {
    if (JSON_COLS.has(k) && typeof out[k] === 'string') {
      try { out[k] = JSON.parse(out[k]); } catch { /* keep raw */ }
    }
  }
  return out;
}

export const all = (sql, ...params) => db.prepare(sql).all(...params).map(decode);
export const get = (sql, ...params) => decode(db.prepare(sql).get(...params));
export const run = (sql, ...params) => db.prepare(sql).run(...params);
export const j = (v) => JSON.stringify(v ?? null);
