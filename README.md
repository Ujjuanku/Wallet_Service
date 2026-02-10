
# Dino Wallet Service

**GitHub Repository**: [https://github.com/Ujjuanku/Wallet_Service](https://github.com/Ujjuanku/Wallet_Service)

This project is a production-grade **Internal Wallet Service** designed for high-traffic applications (gaming/loyalty), fully meeting the "Dino Ventures" backend engineering assignment requirements.

---

## 📄 Assignment Overview

### 1. Problem Statement
Build a wallet service for a high-traffic application like a gaming platform or a loyalty rewards system. This service keeps track of each user’s balance of application-specific credits or points (e.g., “Gold Coins” or “Reward Points”). Even though the currency is virtual, **data integrity is extremely important**: every credit added or spent must be recorded correctly, balances must never go negative, and no transactions can be lost.

### 2. Core Requirements Met
- **Data Seeding**: `seed.sql` provided to initialize Assets (Gold, Diamonds), System Treasury, and User Accounts.
- **Transactional Flows**:
    1.  **Wallet Top-up**: System → User (Credit).
    2.  **Bonus/Incentive**: System → User (Credit).
    3.  **Purchase/Spend**: User → System (Debit).
- **Critical Constraints**:
    - **Concurrency**: Handled via Row-Level Locking to prevent race conditions.
    - **Idempotency**: Handled via unique `idempotency_key`.

### 3. "Brownie Points" Achieved 🌟
- **Deadlock Avoidance**: Consistent locking order (User first) and timeouts.
- **Ledger-Based Architecture**: Implemented strictly. Balances are derived from immutable `ledger_entries` (Double-Entry Bookkeeping).
- **Containerization**: Full `Dockerfile` and `docker-compose.yml` setup.

---

## 🛠 Technology Stack (Choice & Reasoning)

- **Language**: **Node.js (NestJS)**
    - *Why*: Strong typing with TypeScript, excellent dependency injection, and standard for enterprise backend services.
- **Database**: **PostgreSQL 15**
    - *Why*: Robust ACID transaction support, native JSONB for metadata, and `uuid-ossp` for secure IDs. Best-in-class for financial data.
- **ORM**: **TypeORM**
    - *Why*: Provides fine-grained control over locking (`pessimistic_write`) which is crucial for this assignment.

---

## 🚀 How to Run

### Prerequisites
- Docker & Docker Compose

### One-Command Start
```bash
docker-compose up --build
```
This command will:
1.  Start PostgreSQL.
2.  Initialize the database with `seed.sql` (creating tables, assets, and users).
3.  Start the API service on port `8080`.

### Verify the Setup
The seed script creates the following users:
- **Alice**: `b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22`
- **Bob**: `c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33`

---

## 🔒 Concurrency Strategy

To strictly prevent race conditions (e.g., Double Spending):
1.  **Pessimistic Locking**: We use `SELECT ... FOR UPDATE` on the generic `wallets` row for the specific user and asset.
2.  **Serialization**: This forces all transactions for a single user's specific asset to execute sequentially, even if multiple requests arrive simultaneously.
3.  **Verification**: The `concurrency-test.js` script simulates parallel requests to prove balance integrity.

---

## 🧪 API Endpoints

### 1. Check Balance
```bash
curl "http://localhost:8080/wallet/b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22/balance"
```

### 2. Top-up / Bonus (System → User)
```bash
curl -X POST "http://localhost:8080/wallet/bonus" \
     -H "Content-Type: application/json" \
     -d '{
           "userId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22",
           "amount": 50,
           "assetId": "GOLD",
           "idempotencyKey": "unique-req-1"
         }'
```

### 3. Spend (User → System)
```bash
curl -X POST "http://localhost:8080/wallet/spend" \
     -H "Content-Type: application/json" \
     -d '{
           "userId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22",
           "amount": 20,
           "assetId": "GOLD",
           "idempotencyKey": "unique-req-2"
         }'
```

---

## 📂 Project Structure

```
├── src
│   ├── database
│   │   └── entities    # TypeORM Entities (User, Wallet, Transaction, LedgerEntry)
│   ├── wallet
│   │   ├── wallet.service.ts      # Core Transactional Logic
│   │   └── wallet.controller.ts   # API Endpoints
├── seed.sql            # Initial Data & Schema
├── docker-compose.yml  # Orchestration
├── Dockerfile          # Container definition
└── README.md           # This file
```
