-- ============================================================
-- MIGRATION 004: Safety, Reports & Moderation
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    report_type     TEXT NOT NULL
                         CHECK (report_type IN (
                             'fake_profile','harassment','inappropriate_content',
                             'underage','hate_speech','spam','scam','other')),
    description     TEXT,
    evidence        JSONB NOT NULL DEFAULT '[]',
    status          TEXT NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open','in_review','resolved','dismissed')),
    resolution      TEXT,
    moderator_id    UUID REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS trusted_contacts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safety_check_ins (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id          UUID REFERENCES matches(id),
    meeting_location  TEXT,
    meeting_time      TIMESTAMPTZ,
    check_in_token    TEXT UNIQUE NOT NULL,
    status            TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','checked_in','sos_triggered','expired')),
    sos_triggered_at  TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moderation_queue (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type    TEXT NOT NULL
                         CHECK (content_type IN ('profile_photo','message','profile_bio','report')),
    content_id      UUID NOT NULL,
    content_url     TEXT,
    content_text    TEXT,
    source          TEXT NOT NULL
                         CHECK (source IN ('ai_auto','user_report','scheduled_scan')),
    ai_score        NUMERIC(5,4),
    ai_categories   JSONB,
    priority        SMALLINT NOT NULL DEFAULT 5,
    status          TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','in_review','approved','removed','escalated')),
    action_taken    TEXT,
    moderator_id    UUID REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modq_pending ON moderation_queue(status, priority, created_at)
    WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS user_strikes (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    strike_type       TEXT NOT NULL,
    source_report_id  UUID REFERENCES reports(id),
    source_mod_id     UUID REFERENCES moderation_queue(id),
    issued_by         UUID REFERENCES users(id),
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id               UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier                  TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','premium')),
    stripe_customer_id    TEXT,
    stripe_sub_id         TEXT,
    current_period_start  TIMESTAMPTZ,
    current_period_end    TIMESTAMPTZ,
    cancel_at_end         BOOLEAN NOT NULL DEFAULT false,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
