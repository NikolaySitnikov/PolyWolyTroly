# PolyWolyTroly Frontend Implementation Plan

## Overview

This plan breaks down the frontend implementation into 10 incremental steps. Each step is testable and provides visible progress.

---

## Project Context

**Design Documentation Location:** `Design docs/`
- `DESIGN_SYSTEM.md` - Colors, typography, spacing, animations, component patterns
- `BRAND_GUIDELINES_EXTENDED.md` - Voice, tone, iconography, layout grids
- `App.jsx` - Complete sample React components with all UI elements (uses mock data)

**Backend Services:** `src/services/`
- `database.ts` - PostgreSQL with wallets and deposits tables
- `cache.ts` - Redis cache for wallet tracking
- `polymarketApi.ts` - Polymarket Data API integration
- `blockchain.ts` - Blockchain listener for deposit events
- `notifications.ts` - Telegram notifications
- `walletTracker.ts` - Wallet processing logic

**Key APIs:**
- Polymarket Data API: `https://data-api.polymarket.com`
- Database tables: `wallets`, `deposits`, `notifications`

---

## 10-Step Implementation Plan

### Step 1: Create React App with Vite + TypeScript, Design Tokens
**What to build:**
- Initialize Vite React TypeScript project in `frontend/` directory
- Create CSS design tokens from DESIGN_SYSTEM.md
- Set up Google Fonts (Exo 2, JetBrains Mono, Space Grotesk)
- Base global styles (void black background, scrollbar styling)

**What you'll see:**
- App running at localhost with brand colors
- Void black background with subtle gradient mesh
- Fonts loading correctly

**Test:** `npm run dev` → See branded empty shell

---

### Step 2: Build Header, Navigation, Mobile Bottom Nav
**What to build:**
- `Header.tsx` - Logo, navigation tabs, live indicator, connect button
- `MobileNav.tsx` - Fixed bottom navigation for mobile
- Responsive breakpoints (768px threshold)
- Navigation state management

**What you'll see:**
- PolyWolyTroly logo with whale emoji
- Clickable navigation tabs (Dashboard, Whales, Alerts, Settings)
- Mobile bottom nav on smaller screens
- Active tab highlighting with cyan glow

**Test:** Click between tabs, resize window to see mobile nav

---

### Step 3: Create Express API Backend with REST Endpoints
**What to build:**
- `src/api/server.ts` - Express server
- REST endpoints:
  - `GET /api/health` - Health check
  - `GET /api/wallets` - List all tracked wallets
  - `GET /api/wallets/:address` - Get wallet details
  - `GET /api/deposits` - Recent deposits
  - `GET /api/stats` - Dashboard statistics
- CORS configuration for frontend

**What you'll see:**
- API responding at `http://localhost:3001/api/health`
- Real data from PostgreSQL database

**Test:** `curl http://localhost:3001/api/wallets` → See JSON response

---

### Step 4: Build Dashboard View with StatCards (Mock Data)
**What to build:**
- `Dashboard.tsx` - Main dashboard layout
- `StatCard.tsx` - Animated stat card component
- Hero section with title
- Stats grid (4 columns desktop, 2 mobile)
- Fade-in animations, glow effects

**What you'll see:**
- "Whale Intelligence Dashboard" title with glow
- 4 stat cards with icons, values, trends
- Smooth fade-in animations on load
- Accent glow bars on cards

**Test:** Refresh page → See animations, hover cards for effects

---

### Step 5: Connect Dashboard to Real Backend Data
**What to build:**
- `src/hooks/useApi.ts` - API fetching hooks
- `src/services/api.ts` - API client
- Connect StatCards to real data:
  - Whales Tracked (from wallets count)
  - Total Volume (sum of deposits)
  - Alerts Today (deposits in last 24h)
  - Avg Win Rate (placeholder for now)
- Loading states

**What you'll see:**
- Real numbers from your database
- Loading skeleton while fetching
- Data updates on refresh

**Test:** Add a deposit via backend → Refresh dashboard → See updated numbers

---

### Step 6: Build Whale List/Table with Search & Sort
**What to build:**
- `WhaleTable.tsx` - Desktop table view
- `WhaleCard.tsx` - Mobile card view
- Search input with filter
- Sortable columns (deposits, P&L, win rate, etc.)
- Pagination or infinite scroll
- Click row → navigate to profile

**What you'll see:**
- Searchable table with real wallet addresses
- Sort by clicking column headers
- Mobile: Card stack instead of table
- Whale avatars with gradient backgrounds

**Test:** Search for address, sort columns, click a whale

---

### Step 7: Build Live Alert Feed with Real-Time Updates
**What to build:**
- `AlertFeed.tsx` - Live feed component
- `AlertItem.tsx` - Individual alert row
- Fetch recent deposits from API
- Auto-refresh every 10 seconds (or WebSocket later)
- Deposit/trade/withdrawal icons
- Time ago formatting

**What you'll see:**
- Live feed showing recent deposits
- "LIVE" indicator pulsing
- New alerts appear at top
- Click alert → navigate to wallet

**Test:** Trigger a deposit → See it appear in feed

---

### Step 8: Build Wallet Profile View
**What to build:**
- `WalletProfile.tsx` - Full wallet detail page
- Profile header with address, follow/copy buttons
- Stats grid (P&L, win rate, deposits, positions)
- Positions table (mock data initially)
- Trade history list
- Back navigation

**What you'll see:**
- Click whale → Full profile page
- Gradient header with whale avatar
- Copy address to clipboard
- Detailed stats and history

**Test:** Click whale in table → See profile, click back

---

### Step 9: Add Trending Markets with Polymarket API
**What to build:**
- `TrendingMarkets.tsx` - Market list component
- `polymarketApi.ts` (frontend) - Fetch trending markets
- Sentiment bars (YES/NO percentage)
- Whale count per market
- Volume display

**What you'll see:**
- "Whale-Trending Markets" section
- Markets sorted by whale activity
- Sentiment visualization bars
- Volume in USD

**Test:** See real Polymarket markets with whale data

---

### Step 10: Polish - Animations, Loading States, Error Handling
**What to build:**
- Loading skeletons (shimmer effect)
- Error boundaries and error states
- Empty states with ASCII whale
- Toast notifications
- Smooth page transitions
- `prefers-reduced-motion` support
- Final mobile responsiveness pass
- Performance optimization

**What you'll see:**
- Skeleton loaders during fetch
- Friendly error messages
- "No whales in sight..." empty states
- Smooth, polished interactions

**Test:** Disconnect API → See error handling, test all flows

---

## File Structure (Target)

```
polymarket-whale-tracker/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── AlertFeed.tsx
│   │   │   ├── WhaleTable.tsx
│   │   │   ├── WalletProfile.tsx
│   │   │   ├── TrendingMarkets.tsx
│   │   │   └── ui/
│   │   │       ├── Pill.tsx
│   │   │       ├── GlowText.tsx
│   │   │       ├── WalletAddress.tsx
│   │   │       ├── LiveIndicator.tsx
│   │   │       └── AsciiWhale.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Whales.tsx
│   │   │   ├── Alerts.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/
│   │   │   ├── useApi.ts
│   │   │   └── useMobile.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── styles/
│   │   │   ├── tokens.css
│   │   │   └── globals.css
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── src/
│   ├── api/
│   │   └── server.ts          # New Express API
│   ├── services/              # Existing backend services
│   └── ...
├── Design docs/
│   ├── DESIGN_SYSTEM.md
│   ├── BRAND_GUIDELINES_EXTENDED.md
│   └── App.jsx
└── IMPLEMENTATION_PLAN.md     # This file
```

---

## Design Tokens Reference

```css
/* Colors */
--void-black: #0a0a0f;
--surface: #12121a;
--surface-hover: #1a1a24;
--border: #2a2a3a;
--cyan: #00fff0;
--cyan-glow: rgba(0, 255, 240, 0.2);
--magenta: #ff2d92;
--profit: #00ff88;
--loss: #ff3366;
--text-primary: #f0f0f5;
--text-secondary: #8888aa;
--text-muted: #555566;

/* Fonts */
--font-display: 'Exo 2', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
--font-body: 'Space Grotesk', sans-serif;

/* Animation */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--duration-fast: 150ms;
--duration-normal: 250ms;
```

---

## Commands

```bash
# Frontend development
cd frontend && npm run dev

# Backend API (to be created)
npm run api

# Original tracker
npm run dev

# Run tests
npm test
```

---

*"In the void, whales move in silence. We see them."*
