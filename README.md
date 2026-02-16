# Wallet Service

A high-integrity, transactional ledger system designed to handle virtual currency operations with strict ACID compliance, double-entry accounting, and protection against concurrency anomolies.

**Live Demo API:** [https://walletservice-production-e07a.up.railway.app](https://walletservice-production-e07a.up.railway.app)

---

## 1. Problem Overview

In any virtual economy (gaming, loyalty, fintech), the integrity of user balances is paramount. A simple "update balance" approach is insufficient due to:
- **Race conditions**: Concurrent requests can lead to double-spending or lost updates.
- **Lack of Auditability**: A single balance column does not explain *how* the balance was reached.
- **Data Corruption**: System failures mid-transaction can leave the database in an inconsistent state.

This service solves these problems by implementing an **immutable ledger architecture** where balances are derived, not stored, and all state changes occur within strictly serialized database transactions.

---

## 2. System Architecture

The system follows a layered architecture using **Node.js (NestJS)** and **PostgreSQL**.

### Request Lifecycle
1.  **API Layer**: Receives HTTP request, validates payload (DTOs), and ensures idempotency key is present.
2.  **Service Layer**: Orchestrates the business logic.
3.  **Data Access Layer**: executes database operations via TypeORM.
    - **Transaction Boundary**: All updates for a single operation occur within a single ACID transaction.
    - **Concurrency Control**: A `PESSIMISTIC_WRITE` lock is acquired on the user's `Wallet` record (`SELECT FOR UPDATE`) at the start of the transaction. This acts as a mutex for that specific wallet, serializing all concurrent operations for that user to prevent race conditions.
    - **Double Entry**: Every `Transaction` results in two `LedgerEntry` records (Credit and Debit), ensuring the sum of all money in the system remains constant (or correctly accounted for).

---

## 3. Database Design

The schema is normalized to 3NF and optimized for data integrity.

### Entities
*   **`users`**: Identity management.
*   **`assets`**: Definitional table for currency types (e.g., GOLD, DIAMOND).
*   **`wallets`**: Links a User to an Asset.
    *   *Design Decision*: This table **does not store the balance**. It acts as the "Account Header" and the anchor for row-level locking. Storing balance here would violate the single source of truth principle vs the ledger.
*   **`transactions`**: Records the *intent* and metadata of an operation (e.g., "Bonus", "Spend").
    *   *Idempotency*: Converting the `idempotency_key` to a unique constraint ensures we never process the same request twice.
*   **`ledger_entries`**: The immutable source of truth.
    *   Contains `amount` (+/-), `wallet_id`, and `transaction_id`.
    *   **Balance Calculation**: `SELECT SUM(amount) FROM ledger_entries WHERE wallet_id = ?`

---

## 4. Consistency & Transaction Safety

We leverage PostgreSQL's ACID capabilities to ensure strict consistency:
*   **Atomicity**: Creating the Transaction record and the Ledger Entries happens in a single `COMMIT` block. If any part fails, the entire operation rolls back.
*   **Consistency**: Foreign key constraints enforce referential integrity between Users, Wallets, and ledgers.
*   **Isolation**: Used `READ COMMITTED` with explicit Row-Level Locking (`FOR UPDATE`) to simulate serializability for specific resources without locking the entire table.
*   **Durability**: Relies on Postgres WAL (Write-Ahead Logging).

---

## 5. Concurrency Handling

Handling concurrent "Spend" requests is critical to prevent going negative.

**Strategy: Pessimistic Locking**
When a transaction starts:
1.  We execute: `SELECT * FROM wallets WHERE id = ... FOR UPDATE`.
2.  Request A acquires the lock. Request B waits.
3.  Request A calculates the current balance (from ledger), checks if `balance >= amount`, inserts the new debit entry, and commits.
4.  Only after A commits does Request B acquire the lock. B then sees the *new* balance (reduced by A) and correctly fails if funds are now insufficient.

*Why not Optimistic Locking?*
Optimistic locking (versioning) causes high failure rates under contention (users have to retry). Pessimistic locking provides a smoother user experience (latency increase instead of failure) for high-frequency wallet operations.

## 6. Idempotency Handling

In distributed networks, a client might timeout waiting for a response even if the server processed the request. Retrying without idempotency leads to duplicate charges.

**Mechanism**:
- Clients send a unique `idempotency-key` header.
- The `transactions` table has a unique constraint on this key.
- If a duplicate key is received, the database throws a violation error, which we catch and return the existing transaction details (or a 409 Conflict), ensuring the balance is only mutated once.

---

## 7. Failure Scenarios Handled

*   **Insufficient Funds**: Checked inside the lock transaction. Guaranteed to be accurate.
*   **Concurrent Debits**: Handled via Locking => Serialized execution.
*   **Database Failure**: Transaction rolls back; no partial data (e.g., Transaction created but no Ledger Entry) is possible.
*   **Duplicate Requests**: Rejected via Idempotency Key.

---

## 8. API Endpoints

### Get Balance
```bash
curl https://walletservice-production-e07a.up.railway.app/wallet/b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22/balance
```

### Get Ledger History
```bash
curl https://walletservice-production-e07a.up.railway.app/wallet/b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22/ledger
```

### Top Up (Credit)
```bash
curl -X POST https://walletservice-production-e07a.up.railway.app/wallet/topup \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22",
    "amount": 100,
    "assetId": "GOLD",
    "idempotencyKey": "uniq-key-123"
  }'
```

### Spend (Debit)
```bash
curl -X POST https://walletservice-production-e07a.up.railway.app/wallet/spend \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22",
    "amount": 50,
    "assetId": "GOLD",
    "idempotencyKey": "uniq-key-456"
  }'
```

---

## 9. Local Setup

### Prerequisites
*   Node.js v18+
*   Docker & Docker Compose

### steps
1.  **Clone & Install**
    ```bash
    git clone https://github.com/Ujjuanku/Wallet_Service
    cd Wallet_Service
    npm install
    ```

2.  **Start Database & App (Docker)**
    ```bash
    docker-compose up --build
    ```
    This will start PostgreSQL on port 5433 (mapped) and the API on port 8080. It also runs the `seed.sql` script to initialize assets and users.

3.  **Run Locally (Dev Mode)**
    If you prefer running Node locally against the Docker DB:
    ```bash
    # Ensure Docker DB is up
    docker-compose up -d db

    # Install dependencies
    npm install

    # Start API with correct DB port
    npm run start:dev
    ```
    (Note: A `.env` file is included for local convenience).

---

## 10. Environment Variables

See `.env.example`:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_USER=wallet
DATABASE_PASSWORD=wallet
DATABASE_NAME=wallet_db
PORT=8080
```

---

## 11. Tradeoffs & Assumptions

*   **System Wallet Locking**: I chose purely strictly serialize operations on the **User Wallet** but assumed the **System Wallet** (the source of funds) has infinite capacity or is handled asynchronously to avoid it becoming a global bottleneck.
*   **Balance Calculation**: Calculating `SUM(amount)` on every read is O(N). For a production system with millions of transactions, we would implement **Snapshotting** (creating a periodic balance checkpoint) to keep reads O(1) relative to recent history.
*   **Authentication**: Authentication/Authorization layer was omitted to focus on the core transactional logic.

---

## 12. Production Improvements

*   **Caching**: Redis could be used for read-only balance checks (with TTL), though strict consistency requirements usually mandate DB reads for spending.
*   **Horizontal Scaling**: The stateless API layer scales easily. The database write throughput would be the bottleneck. We could shard `wallets` and `ledger_entries` by `user_id`.
*   **Async Processing**: "Bonus" or "Interest" payouts should be processed via a job queue (BullMQ/Kafka) rather than synchronous HTTP requests to improve system responsiveness.
