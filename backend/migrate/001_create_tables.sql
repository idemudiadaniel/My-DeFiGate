-- SQL (Postgres) migrations for DeFiGate schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  privy_wallet_id TEXT,
  kyc_status TEXT DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'active',
  is_verified BOOLEAN DEFAULT TRUE,
  balance_usd NUMERIC(18,2) NOT NULL DEFAULT 100.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_wallet_id TEXT UNIQUE,
  address TEXT,
  chain TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  provider_payment_id TEXT,
  amount_fiat NUMERIC(18,2),
  currency CHAR(3) DEFAULT 'NGN',
  status TEXT DEFAULT 'init',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crypto_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(id),
  user_id UUID REFERENCES users(id),
  amount_crypto NUMERIC(36,18),
  crypto_symbol VARCHAR(20),
  target_chain VARCHAR(50),
  status TEXT DEFAULT 'queued',
  tx_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(36,18) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  status TEXT DEFAULT 'pending',
  tx_hash TEXT,
  wallet_id UUID REFERENCES wallets(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_sender_id ON transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_transfers_recipient_id ON transfers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at DESC);
