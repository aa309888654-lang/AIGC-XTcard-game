-- Online community, operations and safety extensions. All reward grants are
-- expected to be created by server commands and paired with audit records.
CREATE TABLE IF NOT EXISTS cloud_guild_chat_messages (
  id UUID PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES cloud_guilds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  body VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS cloud_guild_chat_messages_guild_idx ON cloud_guild_chat_messages(guild_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cloud_friendships (
  requester_player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  addressee_player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  status VARCHAR(12) NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (requester_player_id, addressee_player_id),
  CHECK (requester_player_id <> addressee_player_id)
);

CREATE TABLE IF NOT EXISTS cloud_direct_messages (
  id UUID PRIMARY KEY,
  sender_player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  recipient_player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  body VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  CHECK (sender_player_id <> recipient_player_id)
);
CREATE INDEX IF NOT EXISTS cloud_direct_messages_inbox_idx ON cloud_direct_messages(recipient_player_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cloud_liveops_mail (
  id UUID PRIMARY KEY,
  audience VARCHAR(24) NOT NULL CHECK (audience IN ('all', 'player')),
  player_id UUID REFERENCES cloud_players(id) ON DELETE CASCADE,
  title VARCHAR(80) NOT NULL,
  body VARCHAR(1000) NOT NULL,
  attachment JSONB NOT NULL DEFAULT '[]'::jsonb,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cloud_liveops_mail_claims (
  mail_id UUID NOT NULL REFERENCES cloud_liveops_mail(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (mail_id, player_id)
);

CREATE TABLE IF NOT EXISTS cloud_security_events (
  id UUID PRIMARY KEY,
  player_id UUID REFERENCES cloud_players(id) ON DELETE SET NULL,
  category VARCHAR(32) NOT NULL CHECK (category IN ('telemetry', 'crash', 'anti_cheat', 'risk', 'support', 'moderation')),
  severity SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  fingerprint CHAR(64),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cloud_security_events_triage_idx ON cloud_security_events(category, severity DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS cloud_support_tickets (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  category VARCHAR(32) NOT NULL,
  subject VARCHAR(120) NOT NULL,
  detail VARCHAR(2000) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cloud_guild_contribution_ledger (
  id UUID PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES cloud_guilds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  source VARCHAR(32) NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  idempotency_key VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (guild_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS cloud_guild_contribution_rank_idx ON cloud_guild_contribution_ledger(guild_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cloud_guild_season_tasks (
  id UUID PRIMARY KEY,
  season_code VARCHAR(32) NOT NULL,
  title VARCHAR(100) NOT NULL,
  target INTEGER NOT NULL CHECK (target > 0),
  reward JSONB NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (season_code, title)
);

CREATE TABLE IF NOT EXISTS cloud_guild_task_progress (
  guild_id UUID NOT NULL REFERENCES cloud_guilds(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES cloud_guild_season_tasks(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guild_id, task_id)
);

CREATE TABLE IF NOT EXISTS cloud_guild_reward_claims (
  guild_id UUID NOT NULL REFERENCES cloud_guilds(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES cloud_guild_season_tasks(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guild_id, task_id, player_id)
);

CREATE TABLE IF NOT EXISTS cloud_parties (
  id UUID PRIMARY KEY,
  leader_player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  mode VARCHAR(24) NOT NULL CHECK (mode IN ('ranked', 'casual', 'pve')),
  max_members SMALLINT NOT NULL DEFAULT 2 CHECK (max_members BETWEEN 2 AND 4),
  status VARCHAR(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'queued', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cloud_party_members (
  party_id UUID NOT NULL REFERENCES cloud_parties(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (party_id, player_id),
  UNIQUE (player_id)
);

CREATE TABLE IF NOT EXISTS cloud_party_invites (
  id UUID PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES cloud_parties(id) ON DELETE CASCADE,
  inviter_player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  invitee_player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (party_id, invitee_player_id),
  CHECK (inviter_player_id <> invitee_player_id)
);

CREATE TABLE IF NOT EXISTS cloud_announcements (
  id UUID PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  body VARCHAR(3000) NOT NULL,
  client_min_version VARCHAR(32),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cloud_liveops_events (
  id UUID PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  title VARCHAR(100) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS cloud_redeem_codes (
  id UUID PRIMARY KEY,
  code_hash CHAR(64) NOT NULL UNIQUE,
  reward JSONB NOT NULL,
  max_claims INTEGER NOT NULL DEFAULT 1 CHECK (max_claims > 0),
  claim_count INTEGER NOT NULL DEFAULT 0 CHECK (claim_count >= 0),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cloud_redeem_code_claims (
  code_id UUID NOT NULL REFERENCES cloud_redeem_codes(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (code_id, player_id)
);

INSERT INTO cloud_guild_season_tasks(id, season_code, title, target, reward, starts_at, ends_at)
VALUES ('00000000-0000-4000-8000-000000000101', 'S01', '第七天门共鸣行动', 300, '[{"currency":"guildMarks","amount":20},{"currency":"starDust","amount":120}]'::jsonb, '2026-08-01T00:00:00Z', '2026-10-01T00:00:00Z')
ON CONFLICT (season_code, title) DO NOTHING;
