# PolyWolyTroly - Architecture & Data Flow

## What This System Does

PolyWolyTroly monitors the Polygon blockchain for large USDC deposits to Polymarket's Exchange contract. When someone deposits $9,000+ USDC, it:
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
│  • Filters deposits >= $9,000                                               │
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
                              │ Amount >= $9,000?
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

## Deduplication Strategy (Multi-Instance Safe)

The system is designed to run safely across multiple instances without sending duplicate alerts.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     THREE LAYERS OF DEDUPLICATION                            │
└─────────────────────────────────────────────────────────────────────────────┘

   Transaction arrives at Instance A and Instance B simultaneously
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │ LAYER 1: Redis Transaction Processed Check                          │
    │                                                                      │
    │    Key: tx_processed:{txHash}                                       │
    │    TTL: 7 days                                                       │
    │                                                                      │
    │    If key exists → Skip (already processed by another instance)     │
    └─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │ LAYER 2: Redis Distributed Lock (Race Condition Prevention)         │
    │                                                                      │
    │    Key: tx_lock:{txHash}                                            │
    │    TTL: 60 seconds                                                   │
    │    Uses SET NX (only set if not exists)                             │
    │                                                                      │
    │    Instance A acquires lock → Proceeds                               │
    │    Instance B fails to acquire → Skips (another instance handling)  │
    └─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │ LAYER 3: PostgreSQL UNIQUE Constraint (Database Level)              │
    │                                                                      │
    │    deposits.tx_hash is UNIQUE                                       │
    │    wallets.address has ON CONFLICT DO NOTHING                       │
    │                                                                      │
    │    If INSERT fails with code 23505 → Return null (duplicate)        │
    │    depositId = null → No notification sent                          │
    └─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │ AFTER SUCCESS: Mark Transaction as Processed                        │
    │                                                                      │
    │    Only after notification sent successfully:                       │
    │    SET tx_processed:{txHash} with 7-day TTL                         │
    │                                                                      │
    │    This ensures any other instances will skip in Layer 1            │
    └─────────────────────────────────────────────────────────────────────┘
```

**Result**: Even with multiple tracker instances running simultaneously (e.g., in different worktrees), each transaction is processed exactly once.

---

## Web Dashboard & API Server

The system includes a web-based dashboard for visualizing whale activity in real-time.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          WEB DASHBOARD ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────────────┐
    │  FRONTEND (React + TypeScript + Vite)                                │
    │                                                                       │
    │  • Dashboard: Real-time stats, whale count, volume, alerts           │
    │  • Whale Table: Searchable, sortable list with pagination            │
    │  • Alert Feed: Live deposit notifications via WebSocket              │
    │  • Wallet Profiles: Individual wallet details & transaction history  │
    │  • Trending Markets: Top prediction markets by volume                │
    │  • Settings: User preferences, theme, notifications                  │
    │                                                                       │
    │  Tech: React 18, TypeScript, Vite, Vitest (126 tests)               │
    │  Design: Cyberpunk terminal aesthetic ("teenage hacker meets         │
    │          Wall Street terminal")                                       │
    └────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 │ HTTP API + WebSocket
                                 ▼
    ┌──────────────────────────────────────────────────────────────────────┐
    │  BACKEND API SERVER (Express + WebSocket)                            │
    │                                                                       │
    │  REST Endpoints:                                                      │
    │  • GET /api/health          - Health check                           │
    │  • GET /api/stats           - Dashboard statistics                   │
    │  • GET /api/wallets         - Paginated whale list (search/sort)     │
    │  • GET /api/wallets/:addr   - Individual wallet details              │
    │  • GET /api/deposits        - Recent deposit history                 │
    │  • GET /api/markets/trending - Top markets by whale volume           │
    │                                                                       │
    │  WebSocket:                                                           │
    │  • WS /ws                   - Real-time deposit event stream         │
    │                                                                       │
    │  Integration:                                                         │
    │  • Queries PostgreSQL database (same as tracker)                     │
    │  • Fetches trending markets from Polymarket API                      │
    │  • Broadcasts new deposits to connected WebSocket clients            │
    └────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 │ Queries same database
                                 ▼
    ┌──────────────────────────────────────────────────────────────────────┐
    │  SHARED POSTGRESQL DATABASE                                          │
    │                                                                       │
    │  • Tracker writes deposits/wallets as they happen                    │
    │  • API server reads for dashboard queries                            │
    │  • No conflicts: tracker writes, API reads                           │
    └──────────────────────────────────────────────────────────────────────┘
```

### Frontend-Backend Data Flow

```
    User opens dashboard in browser
              │
              │ HTTP GET /api/stats
              ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │  API queries database:                                           │
    │  • Total whale count                                             │
    │  • Total volume deposited                                        │
    │  • Alerts sent today                                             │
    │  • New whales this week                                          │
    └─────────────────────────────────────────────────────────────────┘
              │
              │ Returns JSON
              ▼
    Dashboard displays stats
              │
              │ Establishes WebSocket connection
              ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │  New deposit detected by tracker:                               │
    │                                                                   │
    │  1. Tracker processes deposit (blockchain.ts)                   │
    │  2. Writes to database                                           │
    │  3. Sends Telegram alert                                         │
    │  4. Tracker emits event that API server can listen to           │
    │  5. API server broadcasts to all WebSocket clients              │
    └─────────────────────────────────────────────────────────────────┘
              │
              │ WebSocket message
              ▼
    Dashboard shows live alert in feed
    (without page refresh)
```

### Frontend Component Structure

```
frontend/src/
├── App.tsx                    # Main shell, routing, WebSocket
├── components/
│   ├── Dashboard.tsx          # Stats overview
│   ├── WhaleTable.tsx         # Searchable/sortable whale list
│   ├── AlertFeed.tsx          # Live deposit notifications
│   ├── WalletProfile.tsx      # Individual wallet details
│   ├── TrendingMarkets.tsx    # Top markets list
│   ├── Header.tsx             # Navigation
│   ├── MobileNav.tsx          # Mobile navigation
│   ├── Settings.tsx           # User preferences
│   └── ...                    # Supporting components
├── hooks/
│   ├── useStats.ts            # Dashboard statistics
│   ├── useWhales.ts           # Whale list with pagination
│   ├── useAlerts.ts           # Alert feed
│   ├── useWallet.ts           # Individual wallet data
│   ├── useTrendingMarkets.ts  # Markets data
│   └── useWebSocket.ts        # Real-time updates
├── styles/
│   ├── tokens.ts              # Design system tokens
│   └── globals.css            # Global styles
└── types/                     # TypeScript types
```

---

## Error Handling Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SCENARIO                          │  HANDLING                              │
├────────────────────────────────────┼────────────────────────────────────────┤
│  Blockchain WebSocket disconnects  │  Auto-reconnect (10 attempts)          │
│  Polymarket API timeout            │  Treat as unknown (not new) - safe     │
│  Telegram send fails               │  Log error, continue monitoring        │
│  Duplicate transaction detected    │  Skip gracefully (idempotent)          │
│  Database connection lost          │  Connection pool handles reconnect     │
│  Redis unavailable                 │  Continue with slower DB lookup        │
│  Multiple instances running        │  Redis lock prevents duplicate alerts  │
│  Frontend API request fails        │  Show error state, retry available     │
│  Frontend WebSocket drops          │  Auto-reconnect, resume live updates   │
└────────────────────────────────────┴────────────────────────────────────────┘
```
