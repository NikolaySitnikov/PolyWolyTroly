# Polymarket Whale Tracker

Real-time monitoring of large USDC deposits to Polymarket on Polygon. Sends Telegram alerts when whales deposit, distinguishing between first-time users and returning traders.

## Features

- Monitors USDC transfers to Polymarket Exchange contract in real-time via WebSocket
- Configurable minimum deposit threshold (default: $5,000)
- Detects truly new Polymarket users by checking historical activity via Polymarket API
- Sends Telegram notifications with wallet links and deposit details
- Tracks all deposits in PostgreSQL for historical analysis
- Uses Redis for fast wallet lookups and deduplication

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (copy .env.example to .env and fill in values)
cp .env.example .env

# Set up database schema
npm run db:setup

# Run the tracker
npx tsx src/index.ts
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ALCHEMY_WSS_URL` | Polygon WebSocket RPC endpoint (Alchemy) |
| `ALCHEMY_HTTP_URL` | Polygon HTTP RPC endpoint (Alchemy) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | Telegram chat ID to send alerts to |
| `MIN_DEPOSIT_AMOUNT` | Minimum deposit in USD to trigger alert (default: 5000) |

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
# Run tests
npm test

# Run with hot-reload
npm run dev

# Build for production
npm run build
npm start
```

## Tech Stack

- **Runtime**: Node.js with TypeScript (tsx)
- **Blockchain**: viem for Polygon RPC
- **Database**: PostgreSQL (pg)
- **Cache**: Redis (ioredis)
- **Notifications**: Telegram Bot API
- **Testing**: Vitest
