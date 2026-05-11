-- Migration: 003_community_social.sql
-- Extends community tables for LinkedIn-style social features

-- Extend posts with media, edit tracking, reply count
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS media_urls   TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS edited_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reply_count  INTEGER     NOT NULL DEFAULT 0;

-- Extend replies with parent threading and likes
ALTER TABLE community_replies
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES community_replies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS likes     INTEGER NOT NULL DEFAULT 0;

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'reply')),
  post_id     UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notif_unread_idx ON notifications (user_id, is_read) WHERE is_read = FALSE;

-- Sync reply_count on insert
CREATE OR REPLACE FUNCTION sync_reply_count_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_posts SET reply_count = reply_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reply_count_insert ON community_replies;
CREATE TRIGGER trg_reply_count_insert
AFTER INSERT ON community_replies
FOR EACH ROW EXECUTE FUNCTION sync_reply_count_insert();

-- Sync reply_count on delete
CREATE OR REPLACE FUNCTION sync_reply_count_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_posts SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reply_count_delete ON community_replies;
CREATE TRIGGER trg_reply_count_delete
AFTER DELETE ON community_replies
FOR EACH ROW EXECUTE FUNCTION sync_reply_count_delete();

-- Backfill reply_count for existing posts
UPDATE community_posts p
SET reply_count = (
  SELECT COUNT(*) FROM community_replies r WHERE r.post_id = p.id
);
