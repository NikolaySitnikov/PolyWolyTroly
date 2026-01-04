# PolyWolyTroly

Real-time monitoring of large USDC deposits to Polymarket on Polygon. Sends Telegram alerts when whales deposit, distinguishing between first-time users and returning traders. Includes a web dashboard for visualizing whale activity.

## Components

1. **Backend Tracker** - Monitors blockchain, detects whale deposits, sends Telegram alerts
2. **API Server** - REST API + WebSocket server for the web dashboard
3. **Frontend Dashboard** - React web app with real-time whale activity visualization

## Features

### Backend Tracker
- Monitors USDC transfers to Polymarket Exchange contract in real-time via WebSocket
- Configurable minimum deposit threshold (default: $9,000)
- Detects truly new Polymarket users by checking historical activity via Polymarket API
- Sends Telegram notifications with wallet links and deposit details
- Tracks all deposits in PostgreSQL for historical analysis
- Uses Redis for fast wallet lookups and deduplication

### Web Dashboard
- Real-time stats: whale count, total volume, daily alerts
- Searchable, sortable whale table with pagination
- Live alert feed via WebSocket
- Individual wallet profiles with transaction history
- Trending markets by whale activity
- Cyberpunk terminal aesthetic with responsive design

## Quick Start

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Set up environment variables (copy .env.example to .env and fill in values)
cp .env.example .env

# Set up database schema
npm run db:setup

# Run the blockchain tracker (monitors deposits, sends Telegram alerts)
npm run dev

# Run the API server (in another terminal)
npm run dev:api

# Run the frontend (in another terminal)
cd frontend && npm run dev
```

Open http://localhost:5173 to view the dashboard.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ALCHEMY_WSS_URL` | Polygon WebSocket RPC endpoint (Alchemy) |
| `ALCHEMY_HTTP_URL` | Polygon HTTP RPC endpoint (Alchemy) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | Telegram chat ID to send alerts to |
| `MIN_DEPOSIT_AMOUNT` | Minimum deposit in USD to trigger alert (default: 9000) |

## How It Works

1. **WebSocket Listener**: Connects to Polygon via Alchemy WebSocket and watches for USDC Transfer events to Polymarket's Exchange contract (`0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E`)

2. **Wallet Detection**: For each deposit above threshold, determines if the wallet is new to Polymarket:
   - First checks Redis cache (fast path for recently seen wallets)
   - Then checks PostgreSQL database (wallets we've tracked)
   - Finally queries Polymarket Data API for historical activity

3. **Notifications**: Sends Telegram alert with:
   - Deposit amount
   - Wallet address
   - Status: "FIRST TIME DEPOSIT" or "Returning user"
   - Links to Polygonscan

4. **Persistence**: Records all deposits and wallets in PostgreSQL for analysis

## Alert Format

```
🐋 Whale Alert!

💰 Amount: $50,000 USDC
👛 Wallet: 0x1234...5678
✨ Status: FIRST TIME DEPOSIT

🔗 Links:
- View on Polygonscan
- Wallet History

⏰ Time: 1/3/2026, 4:30:00 PM
```

## Development

```bash
# Backend tracker with hot-reload
npm run dev

# API server with hot-reload
npm run dev:api

# Frontend dev server
cd frontend && npm run dev

# Run backend tests
npm test

# Run frontend tests
cd frontend && npm test

# Build for production
npm run build
```

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript (tsx)
- **Blockchain**: viem for Polygon RPC
- **Database**: PostgreSQL (pg)
- **Cache**: Redis (ioredis)
- **API**: Express + WebSocket (ws)
- **Notifications**: Telegram Bot API
- **Testing**: Vitest

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Testing**: Vitest + React Testing Library
- **Design**: Custom cyberpunk terminal aesthetic

## Project Structure

```
polymarket-whale-tracker/
├── src/
│   ├── index.ts           # Blockchain tracker entry point
│   ├── api/               # REST API + WebSocket server
│   │   ├── server.ts      # Express app
│   │   └── websocket.ts   # WebSocket for live updates
│   ├── services/          # Core business logic
│   └── config/            # Environment config
├── frontend/              # React dashboard
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks for API/WebSocket
│   │   └── styles/        # Design tokens & global CSS
│   └── package.json
└── package.json
```
