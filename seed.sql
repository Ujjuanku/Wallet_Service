
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Assets
CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    scale INTEGER DEFAULT 2,
    created_at TIMESTAMP DEFAULT now()
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- 3. Wallets
CREATE TYPE wallet_type_enum AS ENUM ('USER', 'SYSTEM');

CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    asset_id VARCHAR REFERENCES assets(id),
    type wallet_type_enum DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(user_id, asset_id)
);

-- 4. Transactions
CREATE TYPE transaction_type_enum AS ENUM ('TOPUP', 'BONUS', 'SPEND');
CREATE TYPE transaction_status_enum AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idempotency_key VARCHAR UNIQUE,
    type transaction_type_enum NOT NULL,
    status transaction_status_enum DEFAULT 'PENDING',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT now()
);

-- 5. Ledger Entries
CREATE TYPE ledger_entry_type_enum AS ENUM ('CREDIT', 'DEBIT');

CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id),
    wallet_id UUID REFERENCES wallets(id),
    amount DECIMAL(20, 2) NOT NULL,
    balance_after DECIMAL(20, 2),
    type ledger_entry_type_enum NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- DATA SEEDING

-- Assets
INSERT INTO assets (id, name, scale) VALUES ('GOLD', 'Gold Coins', 2) ON CONFLICT DO NOTHING;
INSERT INTO assets (id, name, scale) VALUES ('DIAMOND', 'Diamonds', 2) ON CONFLICT DO NOTHING;

-- Users
-- System User (Internal Treasury)
INSERT INTO users (id, username) VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'system_treasury') ON CONFLICT DO NOTHING;
-- Normal Users
INSERT INTO users (id, username) VALUES ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'alice') ON CONFLICT DO NOTHING;
INSERT INTO users (id, username) VALUES ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 'bob') ON CONFLICT DO NOTHING;

-- Wallets
-- System Wallets (Source of funds)
INSERT INTO wallets (id, user_id, asset_id, type) VALUES ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'GOLD', 'SYSTEM') ON CONFLICT DO NOTHING;
INSERT INTO wallets (id, user_id, asset_id, type) VALUES ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DIAMOND', 'SYSTEM') ON CONFLICT DO NOTHING;

-- User Wallets
INSERT INTO wallets (id, user_id, asset_id, type) VALUES ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'GOLD', 'USER') ON CONFLICT DO NOTHING; -- Alice Gold
INSERT INTO wallets (id, user_id, asset_id, type) VALUES ('06eebc99-9c0b-4ef8-bb6d-6bb9bd380077', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 'GOLD', 'USER') ON CONFLICT DO NOTHING; -- Bob Gold
-- FIXED UUID: Replaced 'g' with '0' in last segment.

-- Transaction 1: Grant Alice 100 Gold
INSERT INTO transactions (id, type, status, metadata) VALUES ('17eebc99-9c0b-4ef8-bb6d-6bb9bd380188', 'BONUS', 'COMPLETED', '{"reason": "seed"}') ON CONFLICT DO NOTHING;
-- FIXED UUID: Replaced 'h' with '1'.

-- Ledger Entry 1: Debit System (Negative)
INSERT INTO ledger_entries (id, transaction_id, wallet_id, amount, balance_after, type) 
VALUES ('28eebc99-9c0b-4ef8-bb6d-6bb9bd380299', '17eebc99-9c0b-4ef8-bb6d-6bb9bd380188', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', -100.00, -100.00, 'DEBIT') ON CONFLICT DO NOTHING;
-- FIXED UUID: Replaced 'i' with '2'.

-- Ledger Entry 2: Credit Alice (Positive)
INSERT INTO ledger_entries (id, transaction_id, wallet_id, amount, balance_after, type) 
VALUES ('39eebc99-9c0b-4ef8-bb6d-6bb9bd380300', '17eebc99-9c0b-4ef8-bb6d-6bb9bd380188', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', 100.00, 100.00, 'CREDIT') ON CONFLICT DO NOTHING;
-- FIXED UUID: Replaced 'j' with '3'.


-- Transaction 2: Grant Bob 50 Gold
INSERT INTO transactions (id, type, status, metadata) VALUES ('40eebc99-9c0b-4ef8-bb6d-6bb9bd380411', 'BONUS', 'COMPLETED', '{"reason": "seed"}') ON CONFLICT DO NOTHING;
-- FIXED UUID: Replaced 'k' with '4'.

-- Ledger Entry 1: Debit System (Negative)
INSERT INTO ledger_entries (id, transaction_id, wallet_id, amount, balance_after, type) 
VALUES ('51eebc99-9c0b-4ef8-bb6d-6bb9bd380522', '40eebc99-9c0b-4ef8-bb6d-6bb9bd380411', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', -50.00, -150.00, 'DEBIT') ON CONFLICT DO NOTHING;
-- FIXED UUID: Replaced 'l' with '5'.

-- Ledger Entry 2: Credit Bob (Positive)
INSERT INTO ledger_entries (id, transaction_id, wallet_id, amount, balance_after, type) 
VALUES ('62eebc99-9c0b-4ef8-bb6d-6bb9bd380633', '40eebc99-9c0b-4ef8-bb6d-6bb9bd380411', '06eebc99-9c0b-4ef8-bb6d-6bb9bd380077', 50.00, 50.00, 'CREDIT') ON CONFLICT DO NOTHING;
-- FIXED UUID: Replaced 'm' with '6'.
