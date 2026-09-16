CREATE TABLE IF NOT EXISTS cloud_players (
  id UUID PRIMARY KEY,
  public_code VARCHAR(24) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cloud_installations (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  secret_hash TEXT NOT NULL,
  token_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cloud_documents (
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  document_key VARCHAR(48) NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, document_key)
);

CREATE TABLE IF NOT EXISTS cloud_sync_operations (
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  idempotency_key UUID NOT NULL,
  request_hash CHAR(64) NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS cloud_asset_ledger (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  currency_code VARCHAR(32) NOT NULL,
  delta INTEGER NOT NULL CHECK (delta <> 0),
  idempotency_key VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS cloud_recovery_codes (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  code_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
