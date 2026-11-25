export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS friends (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  birth_month INTEGER NOT NULL CHECK (birth_month BETWEEN 1 AND 12),
  birth_day   INTEGER NOT NULL CHECK (birth_day BETWEEN 1 AND 31),
  birth_year  INTEGER CHECK (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2100),
  gender      TEXT CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gifts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL UNIQUE,
  emoji         TEXT NOT NULL,
  category      TEXT NOT NULL,
  fit_for       TEXT NOT NULL,
  reason        TEXT NOT NULL,
  price_min     INTEGER NOT NULL CHECK (price_min >= 0),
  price_max     INTEGER NOT NULL CHECK (price_max >= price_min),
  gradient_from TEXT NOT NULL,
  gradient_to   TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  parent_id  INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_unique_name
  ON tags(name, COALESCE(parent_id, 0));

CREATE INDEX IF NOT EXISTS idx_tags_parent ON tags(parent_id);

CREATE TABLE IF NOT EXISTS gift_tags (
  gift_id INTEGER NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (gift_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_gift_tags_tag ON gift_tags(tag_id);

CREATE TABLE IF NOT EXISTS favorites (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  gift_id      INTEGER NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'wishlist' CHECK (status IN ('wishlist', 'gifted')),
  channel      TEXT,
  actual_price REAL CHECK (actual_price IS NULL OR actual_price >= 0),
  deleted_at   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_favorites_deleted ON favorites(deleted_at);

CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  gift_id    INTEGER NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  image_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reviews_gift ON reviews(gift_id);

CREATE TABLE IF NOT EXISTS app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`
