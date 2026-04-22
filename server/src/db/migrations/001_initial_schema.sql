-- ============================================================
-- MIGRATION 001: Core User & Profile Tables
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT,
    auth_provider   TEXT CHECK (auth_provider IN ('email','google','apple')),
    auth_provider_id TEXT,
    role            TEXT NOT NULL DEFAULT 'user'
                         CHECK (role IN ('user','moderator','admin')),
    account_status  TEXT NOT NULL DEFAULT 'pending_verification'
                         CHECK (account_status IN ('active','suspended','banned','pending_verification')),
    verification_level TEXT NOT NULL DEFAULT 'none'
                         CHECK (verification_level IN ('none','email','partial','full')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at  TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name        TEXT NOT NULL,
    birth_date          DATE NOT NULL,
    gender              TEXT NOT NULL,
    looking_for         TEXT[] NOT NULL DEFAULT '{}',
    bio                 TEXT CHECK (char_length(bio) <= 500),
    occupation          TEXT,
    education           TEXT,
    height_cm           SMALLINT,
    location            GEOGRAPHY(POINT, 4326),
    city_display        TEXT,
    photos              JSONB NOT NULL DEFAULT '[]',
    prompts             JSONB NOT NULL DEFAULT '[]',
    interests           TEXT[] NOT NULL DEFAULT '{}',
    lifestyle           JSONB,
    match_distance_km   SMALLINT NOT NULL DEFAULT 50,
    age_pref_min        SMALLINT NOT NULL DEFAULT 18,
    age_pref_max        SMALLINT NOT NULL DEFAULT 99,
    is_discoverable     BOOLEAN NOT NULL DEFAULT true,
    profile_complete    BOOLEAN NOT NULL DEFAULT false,
    selfie_s3_key       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
