-- ============================================================
-- MIGRATION 003: Matching, Discovery & Messaging
-- ============================================================

CREATE TABLE IF NOT EXISTS swipes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    swiper_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    swiped_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    direction   TEXT NOT NULL CHECK (direction IN ('like','pass')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(swiper_id, swiped_id)
);

CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON swipes(swiped_id);

CREATE TABLE IF NOT EXISTS matches (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status           TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','active','expired','unmatched')),
    matched_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
    first_message_at TIMESTAMPTZ,
    unmatched_by     UUID REFERENCES users(id),
    unmatch_reason   TEXT,
    match_score      NUMERIC(5,4),
    match_reasons    JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_a_id, user_b_id),
    CHECK (user_a_id < user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_user_a ON matches(user_a_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON matches(user_b_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_expires ON matches(expires_at) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS messages (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id          UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content           TEXT,
    content_type      TEXT NOT NULL DEFAULT 'text'
                           CHECK (content_type IN ('text','image','gif','system')),
    media_url         TEXT,
    is_deleted        BOOLEAN NOT NULL DEFAULT false,
    moderation_status TEXT NOT NULL DEFAULT 'approved'
                           CHECK (moderation_status IN ('approved','flagged','removed')),
    delivered_at      TIMESTAMPTZ,
    read_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

CREATE TABLE IF NOT EXISTS message_cooldowns (
    match_id          UUID PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
    user_a_intro_at   TIMESTAMPTZ,
    user_b_intro_at   TIMESTAMPTZ,
    cooldown_ends_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours')
);
