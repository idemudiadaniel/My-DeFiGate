-- Complete Database Schema for My-DeFiGate
-- Generated from Sequelize models
-- Tables: users, balances, wallets, transactions, transfers

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    wallet_address VARCHAR(255),
    phone VARCHAR(255),
    company VARCHAR(255),
    is_verified BOOLEAN DEFAULT true,
    email_verification_token VARCHAR(255),
    email_verified_at TIMESTAMP WITH TIME ZONE,
    kyc_status VARCHAR(255) DEFAULT 'pending',
    preferred_chain VARCHAR(255) DEFAULT 'solana',
    privy_wallet_id VARCHAR(255),
    status VARCHAR(255) DEFAULT 'active',
    balance_usd DECIMAL(18, 2) DEFAULT 100.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Balances table
CREATE TABLE IF NOT EXISTS balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    available_balance DECIMAL(20, 6) DEFAULT 0,
    pending_balance DECIMAL(20, 6) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(255) NOT NULL,
    provider_wallet_id VARCHAR(255),
    address VARCHAR(255),
    chain VARCHAR(255),
    encrypted_private_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(255) NOT NULL CHECK (type IN ('deposit', 'transfer', 'withdrawal')),
    amount DECIMAL(20, 6) NOT NULL,
    status VARCHAR(255) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    tx_hash VARCHAR(255),
    reference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transfers table
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(20, 6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_balances_user_id ON balances(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transfers_sender_id ON transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_transfers_receiver_id ON transfers(receiver_id);

-- Add constraints to prevent self-transfers
ALTER TABLE transfers ADD CONSTRAINT check_sender_receiver_different
    CHECK (sender_id != receiver_id);