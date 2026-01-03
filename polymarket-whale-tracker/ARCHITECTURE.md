# PolyWolyTroly - Architecture & Data Flow

## What This System Does

PolyWolyTroly monitors the Polygon blockchain for large USDC deposits to Polymarket's Exchange contract. When someone deposits $5,000+ USDC, it:
1. Detects the deposit in real-time
2. Determines if this is a **first-time Polymarket user** or a **returning trader**
3. Sends a Telegram alert with the details

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              POLYWOLYTROLY                                   │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │   Polygon    │
                              │  Blockchain  │
                              │   (Alchemy)  │
                              └──────┬───────┘
                                     │ WebSocket
                                     │ USDC Transfer Events
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BLOCKCHAIN SERVICE                                  │
│  • Listens for USDC transfers TO Polymarket Exchange                        │
│  • Filters deposits >= $5,000                                               │
│  • Extracts: wallet address, amount, tx hash                                │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          WALLET TRACKER                                      │
│  "Is this wallet NEW to Polymarket?"                                        │
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐                 │
│  │   Redis     │───▶│ PostgreSQL  │───▶│ Polymarket API  │                 │
│  │   Cache     │    │  Database   │    │ (Source of Truth)│                 │
│  └─────────────┘    └─────────────┘    └─────────────────┘                 │
│       30-day           Our own           Historical trade                   │
│       memory          records              history                          │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
           ┌───────────────┐              ┌───────────────┐
           │  NEW WALLET   │              │RETURNING USER │
           │      🚨       │              │      🐋       │
           └───────┬───────┘              └───────┬───────┘
                   │                              │
                   └──────────────┬───────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE SERVICE                                    │
│  • Store wallet record (if new to us)                                       │
│  • Record deposit transaction                                               │
│  • Update wallet totals                                                     │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NOTIFICATION SERVICE                                  │
│  • Format Telegram message                                                  │
│  • Send alert to configured chat                                            │
│  • Log notification result                                                  │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
                            ┌──────────────┐
                            │   Telegram   │
                            │     Chat     │
                            └──────────────┘
```

---

## The Complete Data Flow

### When a Whale Deposits USDC

```
                                    DEPOSIT DETECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    User sends USDC ────▶ Polymarket Exchange Contract
                              │
                              │ Emits "Transfer" event
                              ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │  Event Data:                                                         │
    │  • from: 0xABC... (depositor wallet)                                │
    │  • to: 0x4bF... (Polymarket Exchange)                               │
    │  • value: 50000000000 (raw units = $50,000)                         │
    │  • txHash: 0x123...                                                  │
    │  • blockNumber: 12345678                                             │
    └─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Amount >= $5,000?
                              ▼
                     ┌────────────────┐
                     │  YES: Process  │
                     │  NO: Ignore    │
                     └────────────────┘
```

```
                                 NEW WALLET CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    Is wallet 0xABC... new to Polymarket?

    ┌──────────────────────────────────────────────────────────────────┐
    │ LAYER 1: Redis Cache (fastest)                                   │
    │                                                                   │
    │    wallet:0xABC... exists?                                       │
    │         │                                                         │
    │         ├── YES ───▶ NOT NEW (stop here, return false)           │
    │         │                                                         │
    │         └── NO ────▶ Continue to Layer 2                         │
    └──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │ LAYER 2: PostgreSQL Database (our records)                       │
    │                                                                   │
    │    SELECT * FROM wallets WHERE address = '0xABC...'              │
    │         │                                                         │
    │         ├── FOUND ───▶ Add to Redis cache                        │
    │         │              NOT NEW (return false)                     │
    │         │                                                         │
    │         └── NOT FOUND ─▶ Continue to Layer 3                     │
    └──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │ LAYER 3: Polymarket Data API (source of truth)                   │
    │                                                                   │
    │    GET https://data-api.polymarket.com/activity?user=0xABC...    │
    │         │                                                         │
    │         ├── HAS TRADES ───▶ Add to Redis cache                   │
    │         │                   NOT NEW (return false)                │
    │         │                                                         │
    │         └── NO TRADES ────▶ TRULY NEW! (return true)             │
    └──────────────────────────────────────────────────────────────────┘
```

```
                              RECORD & NOTIFY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ┌─────────────────────────────────────────────────────────────────┐
    │ DATABASE UPDATES                                                 │
    │                                                                   │
    │  1. Create wallet record (if not exists)                        │
    │     INSERT INTO wallets (address, first_deposit_amount, ...)    │
    │                                                                   │
    │  2. Record deposit                                               │
    │     INSERT INTO deposits (tx_hash, wallet_address, amount, ...) │
    │                                                                   │
    │  3. Update wallet totals                                         │
    │     UPDATE wallets SET total_deposited = total_deposited + X    │
    └─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │ TELEGRAM NOTIFICATION                                            │
    │                                                                   │
    │  🚨 NEW WHALE Alert! (or 🐋 for returning)                       │
    │                                                                   │
    │  💰 Amount: $50,000 USDC                                         │
    │  👛 Wallet: 0xABC...                                             │
    │  ✨ Status: FIRST TIME DEPOSIT                                   │
    │                                                                   │
    │  🔗 Links:                                                        │
    │  - View on Polygonscan                                           │
    │  - Wallet History                                                 │
    └─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │ LOG NOTIFICATION                                                 │
    │                                                                   │
    │  INSERT INTO notifications (wallet_address, message, success...)│
    │  (For audit trail and debugging)                                 │
    └─────────────────────────────────────────────────────────────────┘
```

---

## External Services & What We Query

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL DEPENDENCIES                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  ALCHEMY (Polygon RPC Provider)                                             │
│                                                                              │
│  WebSocket: wss://polygon-mainnet.g.alchemy.com/v2/{KEY}                    │
│  └── Real-time listener for USDC Transfer events                            │
│                                                                              │
│  HTTP: https://polygon-mainnet.g.alchemy.com/v2/{KEY}                       │
│  └── One-off queries (e.g., get current block number at startup)            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  POLYMARKET DATA API                                                         │
│                                                                              │
│  Endpoint: https://data-api.polymarket.com/activity?user={address}          │
│                                                                              │
│  Purpose: Check if a wallet has ANY historical trading activity             │
│  Response: Array of trades (empty = new user, has items = returning user)   │
│                                                                              │
│  NOTE: This is the SOURCE OF TRUTH for "is this wallet new?"                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  TELEGRAM BOT API                                                            │
│                                                                              │
│  Endpoint: https://api.telegram.org/bot{TOKEN}/sendMessage                  │
│                                                                              │
│  Purpose: Send formatted whale alerts to configured chat                     │
│  Payload: { chat_id, text (Markdown), parse_mode, disable_web_page_preview }│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE TABLES                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  WALLETS - Every wallet we've ever tracked                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  address              VARCHAR(42)  PRIMARY KEY   "0xABC..."                 │
│  first_seen_at        TIMESTAMP                  When we first saw them     │
│  first_deposit_amount DECIMAL                    Their first deposit ($)    │
│  first_deposit_tx     VARCHAR(66)                First transaction hash     │
│  total_deposited      DECIMAL                    Cumulative deposits ($)    │
│  deposit_count        INTEGER                    Number of deposits         │
│  is_notified          BOOLEAN                    Did we alert about them?   │
│  created_at           TIMESTAMP                                              │
│  updated_at           TIMESTAMP                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ 1:many
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  DEPOSITS - Every deposit transaction                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  id                   SERIAL       PRIMARY KEY                               │
│  tx_hash              VARCHAR(66)  UNIQUE        Transaction hash           │
│  wallet_address       VARCHAR(42)  FK→wallets    Who deposited              │
│  amount               DECIMAL                    Amount in USD              │
│  block_number         BIGINT                     Polygon block number       │
│  block_timestamp      TIMESTAMP                  When it happened           │
│  created_at           TIMESTAMP                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ 1:many
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NOTIFICATIONS - Audit log of sent alerts                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  id                   SERIAL       PRIMARY KEY                               │
│  wallet_address       VARCHAR(42)                Who triggered the alert    │
│  deposit_id           INTEGER      FK→deposits   Which deposit              │
│  notification_type    VARCHAR(50)                "telegram"                 │
│  message              TEXT                       Full message text          │
│  sent_at              TIMESTAMP                  When we sent it            │
│  success              BOOLEAN                    Did Telegram accept it?    │
│  error_message        TEXT                       Error if failed            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Business Logic Decisions

### 1. What is a "New" Wallet?

```
    A wallet is considered NEW if it has NEVER traded on Polymarket before.

    ┌────────────────────────────────────────────────────────────────┐
    │  Scenario A: Wallet deposits for first time, never traded      │
    │  Result: NEW 🚨                                                 │
    │                                                                 │
    │  Scenario B: Wallet deposited before (we tracked), trades exist│
    │  Result: RETURNING 🐋                                           │
    │                                                                 │
    │  Scenario C: Wallet deposited before (we didn't track), trades │
    │  Result: RETURNING 🐋 (Polymarket API tells us)                 │
    │                                                                 │
    │  Scenario D: Wallet deposits, has NO trades on Polymarket      │
    │  Result: NEW 🚨 (even if they deposited before elsewhere)       │
    └────────────────────────────────────────────────────────────────┘
```

### 2. Why 3 Layers for Wallet Lookup?

```
    ┌─────────────────────────────────────────────────────────────────┐
    │  PROBLEM: Can't just check our database                         │
    │                                                                  │
    │  A wallet might be a returning Polymarket user that we've       │
    │  never tracked before (they used the platform before we         │
    │  started monitoring).                                            │
    │                                                                  │
    │  SOLUTION: Use Polymarket's API as source of truth              │
    │                                                                  │
    │  Layer 1 (Redis): Fast path for wallets we recently saw         │
    │  Layer 2 (PostgreSQL): Wallets we've tracked historically       │
    │  Layer 3 (Polymarket API): Ground truth for unknown wallets     │
    └─────────────────────────────────────────────────────────────────┘
```

### 3. Why Do We Store ALL Depositors?

```
    ┌─────────────────────────────────────────────────────────────────┐
    │  Even returning Polymarket users get stored in our database     │
    │                                                                  │
    │  WHY?                                                            │
    │  • Deposits table has foreign key to wallets table              │
    │  • Can't record a deposit without a wallet record               │
    │  • Enables historical analysis of ALL whale activity            │
    │  • Next time we see them, we know from our own records          │
    └─────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

```
┌──────────────────┬──────────────────────────────────────────────────────────┐
│  COMPONENT       │  RESPONSIBILITY                                          │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  index.ts        │  Entry point: loads config, tests Telegram, starts       │
│                  │  blockchain listener                                      │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  blockchain.ts   │  WebSocket listener for USDC Transfer events,            │
│                  │  orchestrates the full processing pipeline               │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  walletTracker.ts│  Business logic: determines if wallet is new,            │
│                  │  coordinates the 3-layer lookup                          │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  polymarketApi.ts│  Queries Polymarket Data API for wallet history          │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  database.ts     │  PostgreSQL operations: wallets, deposits, notifications │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  cache.ts        │  Redis operations: wallet seen cache, last block tracker │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  notifications.ts│  Formats and sends Telegram alerts, logs results         │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  config/index.ts │  Loads and validates environment variables               │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

---

## Smart Contracts We Monitor

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONTRACT                 │  ADDRESS                                        │
├───────────────────────────┼─────────────────────────────────────────────────┤
│  USDC Token (Polygon)     │  0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174     │
│  Polymarket Exchange      │  0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E     │
└───────────────────────────┴─────────────────────────────────────────────────┘

    We watch: USDC Transfer events WHERE "to" = Polymarket Exchange

    Event signature: Transfer(address indexed from, address indexed to, uint256 value)

    USDC has 6 decimals: 1,000,000 raw units = $1.00 USD
```

---

## Error Handling Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SCENARIO                          │  HANDLING                              │
├────────────────────────────────────┼────────────────────────────────────────┤
│  WebSocket disconnects             │  Auto-reconnect (10 attempts)          │
│  Polymarket API timeout            │  Treat as unknown (not new) - safe     │
│  Telegram send fails               │  Log error, continue monitoring        │
│  Duplicate transaction detected    │  Skip gracefully (idempotent)          │
│  Database connection lost          │  Connection pool handles reconnect     │
│  Redis unavailable                 │  Continue with slower DB lookup        │
└────────────────────────────────────┴────────────────────────────────────────┘
```
