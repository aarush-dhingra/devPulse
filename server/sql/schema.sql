-- DevPulse PostgreSQL Schema
-- Run this once against your Supabase / Postgres instance.
-- All tables use UUID primary keys via pgcrypto's gen_random_uuid().

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id       BIGINT UNIQUE,
  username        TEXT UNIQUE NOT NULL,
  name            TEXT,
  avatar_url      TEXT,
  email           TEXT UNIQUE,
  password_hash   TEXT,
  auth_provider   TEXT NOT NULL DEFAULT 'github'
                  CHECK (auth_provider IN ('github','local')),
  bio             TEXT,
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  devscore        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Make existing schemas idempotently support new columns
ALTER TABLE users
  ALTER COLUMN github_id DROP NOT NULL;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'github';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage
                 WHERE table_name='users' AND constraint_name='users_email_key') THEN
    BEGIN
      ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
    EXCEPTION WHEN duplicate_table THEN NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_devscore_idx ON users (devscore DESC);
CREATE INDEX IF NOT EXISTS users_username_idx ON users (LOWER(username));

-- ─────────────────────────────────────────────────────────────────────────────
-- platforms (one row per (user, platform_name))
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platforms (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform_name     TEXT NOT NULL CHECK (platform_name IN
    ('github','leetcode','gfg','codeforces','codechef','atcoder','wakatime')),
  platform_username TEXT NOT NULL,
  api_key           TEXT,                       -- AES-256 ciphertext (Wakatime)
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('connected','error','pending')),
  last_synced       TIMESTAMPTZ,
  last_error        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform_name)
);

CREATE INDEX IF NOT EXISTS platforms_user_idx ON platforms (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- stats_snapshots (time-series of normalized stats per platform)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stats_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,
  raw_data      JSONB NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stats_snapshots_user_idx
  ON stats_snapshots (user_id, platform, created_at DESC);

-- We rely on application code to keep "latest" semantics; queries fetch
-- the most recent row per (user, platform).

-- ─────────────────────────────────────────────────────────────────────────────
-- follows
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS follows_follower_idx  ON follows (follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON follows (following_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- badges
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_slug  TEXT NOT NULL,
  awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_slug)
);

CREATE INDEX IF NOT EXISTS badges_user_idx ON badges (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- activity_events
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform   TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_events_user_idx
  ON activity_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_recent_idx
  ON activity_events (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- community_posts (user-authored status updates)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  likes       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_posts_user_idx
  ON community_posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_recent_idx
  ON community_posts (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- community_replies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_replies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_replies_post_idx
  ON community_replies (post_id, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- post_likes (per-user like tracking; idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_likes (
  post_id    UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- goals (user-defined growth goals — auto-tracked from latest snapshots)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 140),
  kind         TEXT NOT NULL CHECK (kind IN
                 ('leetcode_solves','github_commits','wakatime_hours','streak','custom')),
  target       INTEGER NOT NULL CHECK (target > 0),
  baseline     INTEGER NOT NULL DEFAULT 0,
  deadline     DATE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS goals_user_idx ON goals (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- pomodoro_sessions (focus timer log)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL CHECK (kind IN ('focus','short_break','long_break')),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  completed        BOOLEAN NOT NULL DEFAULT FALSE,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS pomodoro_sessions_user_day_idx
  ON pomodoro_sessions (user_id, started_at DESC);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS platforms_updated_at ON platforms;
CREATE TRIGGER platforms_updated_at BEFORE UPDATE ON platforms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
