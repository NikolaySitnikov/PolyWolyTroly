Integration Plan: Polymarket Trading Features from PolyWolyTroly-frontend-sonnet
Overview
Integrate High and Medium priority features from the sonnet version into the existing polymarket-whale-tracker while keeping the current design system.
Features to Integrate
Priority	Feature	Effort
High	Polymarket Trading Data (P&L, Win Rate, Positions)	Large
High	Enhanced Whale Profile Page with Positions/Activity	Large
Medium	Gamma API Profile Integration (usernames, avatars)	Medium
Medium	Sort/Filter by Trading Performance	Medium
Medium	"Live" Status on Whale Cards	Small
Phase 1: Backend - Polymarket API Integration
1.1 Create Type Definitions
New file: src/types/polymarket.ts

// Position, Activity, Trade, Value, Profile types
// TradingMetrics interface with: pnl, winRate, portfolioValue, activePositions, totalTrades
1.2 Enhance Polymarket API Service
Modify: src/services/polymarketApi.ts Add methods:
* getPositions(address, limit) - from data-api.polymarket.com/positions
* getActivity(address, limit) - from data-api.polymarket.com/activity
* getTrades(address, limit) - from data-api.polymarket.com/trades
* getValue(address) - from data-api.polymarket.com/value
* getProfile(address) - from gamma-api.polymarket.com/public-profile
* calculateTradingMetrics(positions, activity)
1.3 Create Trading Data Cache
New file: src/services/polymarketTradingCache.ts Cache TTLs:
* Positions: 5 min
* Activity: 10 min
* Profile: 1 hour
* Metrics: 5 min
1.4 Database Schema Migration
New file: src/scripts/migrateAddTradingPerformance.ts Add columns to wallets table:
* pnl DECIMAL(20,6)
* win_rate DECIMAL(5,2)
* portfolio_value DECIMAL(20,6)
* total_trades INTEGER
* last_activity_at TIMESTAMP
Create indexes for sorting.
1.5 Background Sync Service
New file: src/services/tradingPerformanceSync.ts
* Runs every 15 minutes
* Batch processes whales to avoid rate limits
* Updates database with fresh trading data
1.6 API Endpoint Updates
Modify: src/api/server.ts New endpoint:
* GET /api/wallets/:address/trading - Returns metrics, positions, activity, profile
Enhanced endpoints:
* GET /api/wallets - Add sort fields: pnl, win_rate, portfolio_value, last_activity_at
* GET /api/wallets - Add filter param: all, profitable, losing, live
* GET /api/stats - Add: avgWinRate, totalPnl, liveWhalesCount

Phase 2: Frontend - Types & API
2.1 Create New Type Files
New files:
* frontend/src/types/polymarket.ts - Mirror backend types
* frontend/src/types/position.ts - Position interface
* frontend/src/types/activity.ts - Activity interface with type configs
* frontend/src/types/profile.ts - UserProfile interface
2.2 Update Whale Types
Modify: frontend/src/types/whale.ts Add fields:

pnl: number;
winRate: number;
portfolioValue: number;
totalTrades: number;
lastActivityAt: string | null;
Add types:

type WhaleSortField = ... | 'pnl' | 'winRate' | 'portfolioValue';
type WhaleFilterOption = 'all' | 'profitable' | 'losing' | 'live';
2.3 Extend API Service
Modify: frontend/src/services/api.ts Add functions:
* fetchPositions(address) - Direct call to Polymarket
* fetchActivity(address) - Direct call to Polymarket
* fetchProfile(address) - Direct call to Gamma API
* fetchTradingData(address) - Via our backend

Phase 3: Frontend - New Hooks
3.1 Create Hooks
New files:
* frontend/src/hooks/usePositions.ts - Fetch positions for wallet
* frontend/src/hooks/useActivity.ts - Fetch activity with pagination
* frontend/src/hooks/useProfile.ts - Fetch Gamma API profile
* frontend/src/hooks/usePolymarketTrading.ts - Combined trading data hook
3.2 Update Existing Hooks
Modify: frontend/src/hooks/useWhales.ts
* Add filter parameter support

Phase 4: Frontend - LiveBadge Component
4.1 Create LiveBadge
New file: frontend/src/components/LiveBadge.tsx Props:
* isLive: boolean
* lastActivityAt?: string
* size?: 'sm' | 'md' | 'lg'
* showLabel?: boolean
Features:
* Green pulsing dot animation
* "LIVE" text label (optional)
* Tooltip with last activity time
4.2 Create Utility
New file: frontend/src/utils/liveStatus.ts Functions:
* isWhaleLive(lastActivityAt) - Check if active in last 24h
* formatLastActivity(lastActivityAt) - Human-readable time

Phase 5: Frontend - Enhanced WalletProfile
5.1 Create New Components
New files:
* frontend/src/components/WalletProfileHeader.tsx - Avatar, username, live badge
* frontend/src/components/PositionsTable.tsx - Active positions table
* frontend/src/components/ActivityHistoryTable.tsx - Transaction history
* frontend/src/components/PositionCard.tsx - Mobile position card
* frontend/src/components/ActivityCard.tsx - Mobile activity card
5.2 Enhance WalletProfile
Modify: frontend/src/components/WalletProfile.tsx Structure:

WalletProfile
├── WalletProfileHeader (avatar, username, live badge)
├── MetricsGrid (6-8 stats including trading metrics)
├── PositionsTable (desktop) / PositionCards (mobile)
├── ActivityHistoryTable (desktop) / ActivityCards (mobile)
└── DepositHistory (existing, tabbed)
Metrics to display:
* Total Deposited (existing)
* Deposit Count (existing)
* First Seen (existing)
* Win Rate (new)
* Active Positions (new)
* Portfolio Value (new)
* P&L (new)
5.3 Profile Header Features
* Avatar from Gamma API with whale icon fallback
* Username (name > pseudonym > truncated address)
* Verified badge if present
* "LIVE" badge if active in 24h
* X/Twitter link if available

Phase 6: Frontend - WhaleTable Updates
6.1 Add Sort/Filter Controls
Modify: frontend/src/components/WhaleTable.tsx New sort options (mobile pills):
* P&L (icon: chart)
* Win Rate (icon: target)
* Portfolio (icon: wallet)
New filter row (pills):
* All Whales
* Profitable (green indicator)
* Losing (red indicator)
* Live (pulsing dot)
6.2 Add LiveBadge to Cards/Rows
* Show next to wallet address
* Pulsing green dot for active whales
6.3 Add Trading Stats to Cards
Mobile card stats grid:

Total Deposited | Deposits
P&L            | Win Rate

Phase 7: Frontend - Dashboard Updates
7.1 Add New Stat Cards
Modify: frontend/src/components/Dashboard.tsx New cards:
* Avg Win Rate
* Total P&L (color-coded profit/loss)
7.2 Create Icons
New files:
* frontend/src/components/icons/WinRateIcon.tsx
* frontend/src/components/icons/PnlIcon.tsx

Critical Files Summary
Backend (to modify/create)
* src/types/polymarket.ts (NEW)
* src/services/polymarketApi.ts (MODIFY - add trading methods)
* src/services/polymarketTradingCache.ts (NEW)
* src/services/tradingPerformanceSync.ts (NEW)
* src/services/database.ts (MODIFY - add trading columns/queries)
* src/api/server.ts (MODIFY - new endpoint, enhanced params)
Frontend Types (to modify/create)
* frontend/src/types/polymarket.ts (NEW)
* frontend/src/types/position.ts (NEW)
* frontend/src/types/activity.ts (NEW)
* frontend/src/types/profile.ts (NEW)
* frontend/src/types/whale.ts (MODIFY)
Frontend Hooks (to modify/create)
* frontend/src/hooks/usePositions.ts (NEW)
* frontend/src/hooks/useActivity.ts (NEW)
* frontend/src/hooks/useProfile.ts (NEW)
* frontend/src/hooks/usePolymarketTrading.ts (NEW)
* frontend/src/hooks/useWhales.ts (MODIFY)
Frontend Components (to modify/create)
* frontend/src/components/LiveBadge.tsx (NEW)
* frontend/src/components/WalletProfileHeader.tsx (NEW)
* frontend/src/components/PositionsTable.tsx (NEW)
* frontend/src/components/ActivityHistoryTable.tsx (NEW)
* frontend/src/components/WalletProfile.tsx (MODIFY)
* frontend/src/components/WhaleTable.tsx (MODIFY)
* frontend/src/components/Dashboard.tsx (MODIFY)
* frontend/src/services/api.ts (MODIFY)

Implementation Order (Phase by Phase)
MILESTONE 1: Backend Polymarket API Integration
Goal: Get trading data flowing from Polymarket APIs
1. Create src/types/polymarket.ts - Type definitions
2. Enhance src/services/polymarketApi.ts - Add trading methods (getPositions, getActivity, getValue, getProfile)
3. Create src/services/polymarketTradingCache.ts - Redis caching layer
4. Add /api/wallets/:address/trading endpoint to src/api/server.ts
5. Test endpoint manually with a known whale address
Deliverable: API endpoint returning trading metrics, positions, activity, profile

MILESTONE 2: Enhanced Whale Profile Page
Goal: Display trading data on WalletProfile
1. Create frontend types (position.ts, activity.ts, profile.ts)
2. Extend frontend/src/services/api.ts with new API calls
3. Create hooks (usePositions, useActivity, useProfile, usePolymarketTrading)
4. Create WalletProfileHeader.tsx - Avatar, username, live badge
5. Create PositionsTable.tsx + PositionCard.tsx - Active positions
6. Create ActivityHistoryTable.tsx + ActivityCard.tsx - Transaction history
7. Enhance WalletProfile.tsx - Integrate new components, expand metrics grid
Deliverable: WalletProfile showing full trading performance with positions and activity

MILESTONE 3: Sorting, Filtering & Live Status
Goal: Enable trading performance-based discovery
1. Database migration - Add trading columns to wallets table
2. Create background sync service tradingPerformanceSync.ts
3. Update database.ts - New sort/filter queries
4. Update GET /api/wallets - Add sort fields and filter param
5. Update GET /api/stats - Add avgWinRate, totalPnl, liveWhalesCount
6. Update frontend whale.ts types
7. Update useWhales.ts hook - Add filter support
8. Create LiveBadge.tsx component + liveStatus.ts utility
9. Update WhaleTable.tsx - Add sort pills, filter pills, live badges, trading stats
10. Update Dashboard.tsx - Add new stat cards with icons
Deliverable: Full sorting/filtering by trading performance, live status indicators everywhere

API Endpoints Reference
Polymarket Data API:
* GET https://data-api.polymarket.com/positions?user={address}
* GET https://data-api.polymarket.com/activity?user={address}
* GET https://data-api.polymarket.com/trades?user={address}
* GET https://data-api.polymarket.com/value?user={address}
Polymarket Gamma API:
* GET https://gamma-api.polymarket.com/public-profile?address={address}

Risk Mitigations
1. Rate Limits - Cache aggressively (5-60 min TTLs), batch background sync
2. Partial Failures - Trading data fetch failures don't break existing features
3. New Wallets - Handle null/0 trading data gracefully with "N/A" displays
4. Mobile Performance - Lazy load trading data on profile open
