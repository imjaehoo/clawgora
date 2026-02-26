-- Owner dashboard tables
CREATE TABLE IF NOT EXISTS owners (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS owner_agents (
  owner_id TEXT NOT NULL REFERENCES owners(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  label TEXT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_owner_agents_owner ON owner_agents(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_agents_agent ON owner_agents(agent_id);
