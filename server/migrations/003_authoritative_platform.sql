CREATE TABLE IF NOT EXISTS cloud_wallets (
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  currency_code VARCHAR(32) NOT NULL CHECK (currency_code IN ('starDust', 'guildMarks', 'arcaneDust')),
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, currency_code)
);

CREATE TABLE IF NOT EXISTS cloud_player_cards (
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  card_id VARCHAR(64) NOT NULL,
  copies SMALLINT NOT NULL DEFAULT 0 CHECK (copies BETWEEN 0 AND 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, card_id)
);

CREATE TABLE IF NOT EXISTS cloud_store_orders (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  product_id VARCHAR(64) NOT NULL,
  currency_code VARCHAR(32) NOT NULL,
  cost INTEGER NOT NULL CHECK (cost > 0),
  idempotency_key UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, idempotency_key),
  UNIQUE (player_id, product_id)
);

CREATE TABLE IF NOT EXISTS cloud_seasons (
  id UUID PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  title VARCHAR(80) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  reward_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS cloud_seasons_one_active_idx ON cloud_seasons(is_active) WHERE is_active;

CREATE TABLE IF NOT EXISTS cloud_season_players (
  season_id UUID NOT NULL REFERENCES cloud_seasons(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 1000 CHECK (rating >= 0),
  season_xp INTEGER NOT NULL DEFAULT 0 CHECK (season_xp >= 0),
  wins INTEGER NOT NULL DEFAULT 0 CHECK (wins >= 0),
  losses INTEGER NOT NULL DEFAULT 0 CHECK (losses >= 0),
  streak INTEGER NOT NULL DEFAULT 0 CHECK (streak >= 0),
  best_streak INTEGER NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (season_id, player_id)
);

CREATE TABLE IF NOT EXISTS cloud_season_reward_claims (
  season_id UUID NOT NULL REFERENCES cloud_seasons(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  reward_level SMALLINT NOT NULL CHECK (reward_level BETWEEN 1 AND 100),
  track VARCHAR(16) NOT NULL CHECK (track IN ('free', 'premium')),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (season_id, player_id, reward_level, track)
);

CREATE TABLE IF NOT EXISTS cloud_match_queue (
  player_id UUID PRIMARY KEY REFERENCES cloud_players(id) ON DELETE CASCADE,
  mode VARCHAR(24) NOT NULL CHECK (mode IN ('ranked', 'casual')),
  deck JSONB NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 0),
  ticket_id UUID NOT NULL UNIQUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS cloud_matches (
  id UUID PRIMARY KEY,
  mode VARCHAR(24) NOT NULL CHECK (mode IN ('ranked', 'casual')),
  status VARCHAR(24) NOT NULL CHECK (status IN ('waiting', 'active', 'finished', 'abandoned')),
  player_one_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE RESTRICT,
  player_two_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE RESTRICT,
  player_one_deck JSONB NOT NULL,
  player_two_deck JSONB NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  state_version INTEGER NOT NULL DEFAULT 1,
  turn_player_id UUID REFERENCES cloud_players(id) ON DELETE RESTRICT,
  turn_deadline_at TIMESTAMPTZ,
  winner_player_id UUID REFERENCES cloud_players(id) ON DELETE RESTRICT,
  finish_reason VARCHAR(32),
  seed BIGINT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  CHECK (player_one_id <> player_two_id)
);

CREATE TABLE IF NOT EXISTS cloud_match_events (
  match_id UUID NOT NULL REFERENCES cloud_matches(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  actor_player_id UUID REFERENCES cloud_players(id) ON DELETE SET NULL,
  event_type VARCHAR(48) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, sequence)
);

CREATE TABLE IF NOT EXISTS cloud_match_reports (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES cloud_matches(id) ON DELETE CASCADE,
  reporter_player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  reported_player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  reason VARCHAR(48) NOT NULL CHECK (reason IN ('abuse', 'cheat', 'afk', 'name', 'other')),
  detail VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, reporter_player_id)
);

CREATE TABLE IF NOT EXISTS cloud_platform_idempotency (
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  operation_key UUID NOT NULL,
  request_hash CHAR(64) NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, operation_key)
);

CREATE TABLE IF NOT EXISTS cloud_audit_events (
  id UUID PRIMARY KEY,
  player_id UUID REFERENCES cloud_players(id) ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  subject_type VARCHAR(48) NOT NULL,
  subject_id VARCHAR(128) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cloud_matches_player_one_idx ON cloud_matches(player_one_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS cloud_matches_player_two_idx ON cloud_matches(player_two_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS cloud_match_events_match_idx ON cloud_match_events(match_id, sequence);
CREATE INDEX IF NOT EXISTS cloud_season_players_rank_idx ON cloud_season_players(season_id, rating DESC, updated_at ASC);

INSERT INTO cloud_seasons(id, code, title, starts_at, ends_at, is_active, reward_config)
VALUES (
  '00000000-0000-4000-8000-000000000001', 'S01', '日蚀协议', '2026-08-01T00:00:00Z', '2026-10-01T00:00:00Z', TRUE,
  '[
    {"level":1,"track":"free","kind":"currency","currency":"starDust","amount":120},
    {"level":5,"track":"free","kind":"currency","currency":"arcaneDust","amount":40},
    {"level":10,"track":"free","kind":"currency","currency":"starDust","amount":240},
    {"level":20,"track":"free","kind":"currency","currency":"guildMarks","amount":25},
    {"level":30,"track":"free","kind":"currency","currency":"starDust","amount":360}
  ]'::jsonb
)
ON CONFLICT (code) DO NOTHING;
