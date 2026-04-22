-- ============================================================
-- MIGRATION 002: Verification & Auth Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS verifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                TEXT NOT NULL
                             CHECK (type IN ('email','selfie_capture','photo_match')),
    status              TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','in_review','passed','failed','expired')),
    failure_reason      TEXT,
    attempt_count       SMALLINT NOT NULL DEFAULT 0,
    verified_at         TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verifications_user_type ON verifications(user_id, type);

CREATE TABLE IF NOT EXISTS email_otp (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    otp_hash    TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otp_user ON email_otp(user_id, used);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id, revoked);
