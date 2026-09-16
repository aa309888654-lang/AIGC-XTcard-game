CREATE TABLE IF NOT EXISTS cloud_guilds (
  id UUID PRIMARY KEY,
  name VARCHAR(24) NOT NULL,
  name_key VARCHAR(24) NOT NULL UNIQUE,
  tag VARCHAR(6) NOT NULL UNIQUE,
  description VARCHAR(180) NOT NULL DEFAULT '',
  notice VARCHAR(240) NOT NULL DEFAULT '',
  invite_code VARCHAR(12) NOT NULL UNIQUE,
  owner_player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE RESTRICT,
  member_limit SMALLINT NOT NULL DEFAULT 32 CHECK (member_limit BETWEEN 2 AND 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cloud_guild_members (
  guild_id UUID NOT NULL REFERENCES cloud_guilds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  role VARCHAR(12) NOT NULL CHECK (role IN ('leader', 'officer', 'member')),
  weekly_contribution INTEGER NOT NULL DEFAULT 0 CHECK (weekly_contribution >= 0),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guild_id, player_id),
  UNIQUE (player_id)
);

CREATE TABLE IF NOT EXISTS cloud_guild_applications (
  id UUID PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES cloud_guilds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES cloud_players(id) ON DELETE CASCADE,
  message VARCHAR(120) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (guild_id, player_id)
);

CREATE INDEX IF NOT EXISTS cloud_guild_members_guild_idx ON cloud_guild_members(guild_id, role, weekly_contribution DESC);
