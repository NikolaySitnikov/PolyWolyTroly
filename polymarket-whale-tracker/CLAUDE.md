# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend Tracker Development
npm run dev          # Run with hot-reload (nodemon + tsx)
npx tsx src/index.ts # Run directly without compilation
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled JS from dist/

# API Server (serves frontend dashboard)
npm run start:api    # Start API server on port 3001 (compiled)
npm run dev:api      # Start with hot-reload (nodemon + tsx)

# Frontend Development
cd frontend
npm run dev          # Start Vite dev server on port 5173
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run frontend tests (126 tests)

# Database
npm run db:setup     # Create PostgreSQL schema (wallets, deposits, notifications tables)

# Testing
npm test             # Run backend tests
npm run test:watch   # Run tests in watch mode
npm test -- src/services/blockchain.test.ts  # Run single test file
```

## Architecture

PolyWolyTroly - Real-time monitoring of large USDC deposits to Polymarket on Polygon. Has three main components:
1. **Backend Tracker**: Monitors blockchain, sends Telegram alerts
2. **API Server**: REST API + WebSocket server for web dashboard
3. **Frontend Dashboard**: React web app for visualizing whale activity

### Backend Tracker Data Flow
1. **blockchain.ts** - WebSocket listener (viem) watches USDC Transfer events to Polymarket Exchange
2. **walletTracker.ts** - Determines if depositor is new using 3-layer lookup:
   - Redis cache (fast path)
   - PostgreSQL database (our records)
   - Polymarket Data API (true historical activity)
3. **polymarketApi.ts** - Queries Polymarket's public API to check wallet history
4. **notifications.ts** - Sends Telegram alert with "FIRST TIME DEPOSIT" or "Returning user" status
5. **database.ts** - PostgreSQL persistence (pg) for wallets/deposits/notifications
6. **cache.ts** - Redis (ioredis) for fast wallet lookups, block tracking, and deduplication

### API Server (src/api/server.ts)
REST API + WebSocket server that powers the web dashboard:
- **GET /api/health** - Health check
- **GET /api/stats** - Dashboard statistics (whale count, volume, alerts)
- **GET /api/wallets** - Paginated whale list with search/sort
- **GET /api/wallets/:address** - Individual wallet details
- **GET /api/deposits** - Recent deposit history
- **GET /api/markets/trending** - Top prediction markets by whale volume
- **WS /ws** - Real-time deposit events via WebSocket

### Frontend (frontend/)
React + TypeScript + Vite dashboard with cyberpunk terminal aesthetic:
- **Dashboard**: Real-time stats with live WebSocket updates
- **Whale Table**: Searchable, sortable list with pagination
- **Alert Feed**: Live deposit notifications
- **Wallet Profiles**: Individual wallet details and transaction history
- **Trending Markets**: Top markets by whale activity
- **Settings**: User preferences, theme, notifications
- **126 tests** with Vitest + React Testing Library

### Key Services

#### polymarketApi.ts
Queries `https://data-api.polymarket.com/activity?user={address}` to determine if a wallet has ever used Polymarket:
- `hasHistoricalActivity(address)` - Returns true if wallet has any activity
- `getActivityCount(address)` - Returns number of activities (up to 500)
- `getFirstActivityTimestamp(address)` - Returns timestamp of first activity

#### walletTracker.ts
- `isNewWallet(address)` - 3-layer check: cache → database → Polymarket API
- `ensureWalletExists(address, amount, txHash)` - Creates wallet record if not in DB
- `processDeposit(address, amount, txHash, blockNumber)` - Main entry point, returns `{isNew, depositId}`

#### cache.ts (Deduplication)
- `acquireTransactionLock(txHash)` - Distributed lock (60s TTL, NX) prevents race conditions
- `isTransactionProcessed(txHash)` - Check if notification was already sent (7-day TTL)
- `markTransactionProcessed(txHash)` - Mark transaction as fully processed after notification

### Key Constants (src/utils/constants.ts)
- USDC contract: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- Polymarket Exchange: `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E`
- USDC has 6 decimals

### Required Environment Variables
- `ALCHEMY_WSS_URL` / `ALCHEMY_HTTP_URL` - Polygon RPC endpoints (PublicNode)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` - Alert destination
- `MIN_DEPOSIT_AMOUNT` - Threshold in USD (default: 9000)

## Testing Patterns

Tests use vitest with extensive mocking. Each service mock follows this pattern:
```typescript
const mockFn = vi.fn();
vi.mock("./service.js", () => ({ service: { method: mockFn } }));
```

Always use `vi.resetModules()` in `beforeEach` when testing modules with side effects.

Test files:
- `blockchain.test.ts` - 18 tests for event processing and WebSocket handling
- `walletTracker.test.ts` - 15 tests for new wallet detection with Polymarket API
- `polymarketApi.test.ts` - 13 tests for Polymarket Data API integration
- `notifications.test.ts` - 12 tests for Telegram alerts
- `database.test.ts` - Tests for PostgreSQL operations
- `cache.test.ts` - Tests for Redis operations
- `index.test.ts` - Tests for main application startup

## Module System

ES Modules with `.js` extensions in imports (e.g., `import { x } from "./file.js"`). The `main()` function in index.ts uses `decodeURIComponent(import.meta.url)` to handle paths with spaces and avoid auto-execution during tests.

## Common Issues

### Path with spaces
The project path contains spaces. The `import.meta.url` returns URL-encoded paths (`%20` for spaces), but `process.argv[1]` uses regular spaces. Fixed with `decodeURIComponent()`.

### Foreign key constraints
When recording deposits, wallet must exist in database first. `ensureWalletExists()` handles this by creating the wallet record if it doesn't exist, even for returning Polymarket users who aren't in our database yet.

### Output buffering
Use `console.log` instead of pino logger for immediate output visibility during development.
