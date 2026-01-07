# Trading Features Implementation Plan
## 10 Steps with Verification Checkpoints

This document breaks down the "sonnet Integration Plan" into 10 discrete implementation steps, each small enough to be completed and visually verified in the browser before moving to the next.

---

## Step 1: Backend - Polymarket API Types & Service Methods ✅ COMPLETED
**Goal:** Establish type definitions and add trading data fetching methods to the backend

### Tasks:
1. Create `src/types/polymarket.ts` with:
   - `Position` interface
   - `Activity` interface
   - `Trade` interface
   - `PortfolioValue` interface
   - `UserProfile` interface (from Gamma API)
   - `TradingMetrics` interface (pnl, winRate, portfolioValue, activePositions, totalTrades)

2. Enhance `src/services/polymarketApi.ts`:
   - Add `getPositions(address, limit)` - fetch from data-api.polymarket.com/positions
   - Add `getActivity(address, limit)` - fetch from data-api.polymarket.com/activity
   - Add `getValue(address)` - fetch from data-api.polymarket.com/value
   - Add `getProfile(address)` - fetch from gamma-api.polymarket.com/public-profile
   - Add `calculateTradingMetrics(positions, activity)` helper

3. Create `src/services/polymarketTradingCache.ts`:
   - Redis/memory cache layer with TTLs:
     - Positions: 5 min
     - Activity: 10 min
     - Profile: 1 hour
     - Metrics: 5 min

4. Add new endpoint to `src/api/server.ts`:
   - `GET /api/wallets/:address/trading` - returns metrics, positions, activity, profile

### Verification:
- [x] Start backend server
- [x] Test endpoint with curl: `curl http://localhost:3001/api/wallets/0x.../trading`
- [x] Verify JSON response contains trading metrics, positions array, activity array, and profile object
- [x] Check that caching works (second request should be faster)

---

## Step 2: Frontend - Types & API Service Extension ✅ COMPLETED
**Goal:** Mirror backend types in frontend and extend API service

### Tasks:
1. Create new type files:
   - `frontend/src/types/polymarket.ts` - mirror of backend polymarket types
   - `frontend/src/types/position.ts` - Position interface with market info
   - `frontend/src/types/activity.ts` - Activity interface with type configs (buy/sell/deposit/etc)
   - `frontend/src/types/profile.ts` - UserProfile interface (name, pseudonym, avatar, verified, twitter)

2. Update `frontend/src/types/whale.ts`:
   - Add fields: `pnl`, `winRate`, `portfolioValue`, `totalTrades`, `lastActivityAt`
   - Add type: `WhaleSortField` union including new fields
   - Add type: `WhaleFilterOption = 'all' | 'profitable' | 'losing' | 'live'`

3. Extend `frontend/src/services/api.ts`:
   - Add `fetchTradingData(address)` - calls our backend `/api/wallets/:address/trading`
   - Add direct Polymarket calls (for real-time updates):
     - `fetchPositionsDirect(address)`
     - `fetchActivityDirect(address)`
     - `fetchProfileDirect(address)`

### Verification:
- [x] TypeScript compiles without errors
- [x] No type mismatches in existing code
- [x] Console log test: call `fetchTradingData` with a known whale address and log result

---

## Step 3: Frontend - Trading Data Hooks ✅ COMPLETED
**Goal:** Create React hooks for fetching and managing trading data

### Tasks:
1. Create `frontend/src/hooks/usePositions.ts`:
   - Fetch positions for a wallet address
   - Handle loading, error states
   - Pagination support

2. Create `frontend/src/hooks/useActivity.ts`:
   - Fetch activity history for a wallet
   - Pagination with "load more"
   - Filter by activity type

3. Create `frontend/src/hooks/useProfile.ts`:
   - Fetch Gamma API profile
   - Handle missing profiles gracefully (return null)

4. Create `frontend/src/hooks/usePolymarketTrading.ts`:
   - Combined hook that fetches all trading data
   - Returns: `{ metrics, positions, activity, profile, isLoading, error }`
   - Uses our backend endpoint for efficiency

5. Update `frontend/src/hooks/useWhales.ts`:
   - Add `filter` parameter support for profitability/live filtering

### Verification:
- [x] Create a simple test component that uses `usePolymarketTrading` hook
- [x] Verify data loads and displays in console
- [x] Test error handling by using an invalid address
- [x] Test that hooks re-fetch when address changes

---

## Step 4: Foundation Components - LiveBadge & Utilities ✅ COMPLETED
**Goal:** Create the LiveBadge component and supporting utilities

### Tasks:
1. Update `frontend/src/styles/tokens.ts`:
   - Add new colours: `live`, `liveGlow`, `livePulse`, `neutral`, `neutralGlow`
   - Add avatar gradient arrays

2. Create `frontend/src/utils/liveStatus.ts`:
   - `isWhaleLive(lastActivityAt)` - returns true if active in last 24h
   - `formatLastActivity(lastActivityAt)` - human-readable relative time ("2h ago")

3. Create `frontend/src/utils/avatar.ts`:
   - `getAvatarGradient(address)` - deterministic gradient from address hash
   - `getAvatarInitials(username, address)` - initials for avatar placeholder

4. Create `frontend/src/components/LiveBadge.tsx`:
   - Props: `isLive`, `lastActivityAt`, `size ('sm'|'md'|'lg')`, `showLabel`
   - Green pulsing dot with animation
   - "LIVE" text label for lg size
   - Tooltip showing last activity time

5. Update `frontend/src/styles/globals.css`:
   - Add `@keyframes livePulse` animation

### Verification:
- [x] Import LiveBadge in Dashboard or WalletProfile temporarily
- [x] Render `<LiveBadge isLive={true} size="lg" showLabel />`
- [x] Verify pulsing green dot animation
- [x] Verify "LIVE" label appears
- [x] Test all three sizes (sm, md, lg)
- [x] Hover and verify tooltip shows

---

## Step 5: Profile Header & Avatar Components
**Goal:** Create the enhanced wallet profile header with avatar and username

### Tasks:
1. Create `frontend/src/components/GeneratedAvatar.tsx`:
   - Props: `address`, `imageUrl?`, `size`, `username?`
   - If `imageUrl` exists, show actual avatar image
   - Otherwise, show gradient background with initials
   - Uses `getAvatarGradient` and `getAvatarInitials` utilities

2. Create `frontend/src/components/WalletProfileHeader.tsx`:
   - Props: `address`, `profile?`, `isLive`, `lastActivityAt`, `isMobile`, `onCopy`
   - Layout: Avatar | Username + Handle + Address + Actions | LiveBadge
   - Display name logic: name > pseudonym > truncated address
   - Verified badge if `profile.verified`
   - X/Twitter link if `profile.twitterHandle`
   - Copy address button
   - Polygonscan link button

3. Update `frontend/src/components/WalletProfile.tsx`:
   - Integrate `usePolymarketTrading` hook
   - Replace existing header with `WalletProfileHeader`
   - Pass profile data to new header

### Verification:
- [ ] Navigate to any whale profile page
- [ ] Verify avatar displays (gradient with initials if no Gamma profile)
- [ ] Verify LiveBadge shows correctly based on activity
- [ ] Verify username/pseudonym displays correctly
- [ ] Test copy address button works
- [ ] Test Polygonscan link opens correctly
- [ ] Compare mobile vs desktop layouts

---

## Step 6: Trading Metrics Grid & P&L Display
**Goal:** Add trading metrics to WalletProfile with P&L time window toggle

### Tasks:
1. Create `frontend/src/components/PnlToggle.tsx`:
   - Pill toggle with options: 7d | 30d | All
   - Props: `value`, `onChange`, `size?`
   - Styling matches existing sort pills

2. Create `frontend/src/components/TradingMetricsGrid.tsx`:
   - Grid of 6 stats (2x3 mobile, 6 columns desktop)
   - Stats: Total Deposited, P&L, Win Rate, Portfolio Value, Positions, Total Trades
   - P&L uses profit/loss colours with glow
   - Win Rate uses cyan

3. Create `frontend/src/components/icons/` directory with:
   - `WinRateIcon.tsx` - target/bullseye icon
   - `PnlIcon.tsx` - chart with arrow icon

4. Update `frontend/src/components/WalletProfile.tsx`:
   - Add P&L time window state
   - Replace/enhance existing metrics grid with TradingMetricsGrid
   - Wire up PnlToggle

### Verification:
- [ ] Navigate to whale profile page
- [ ] Verify 6 metrics display in grid
- [ ] Verify P&L shows green for profit, red for loss, grey for zero
- [ ] Test P&L toggle switches between 7d/30d/All
- [ ] Verify Win Rate displays in cyan
- [ ] Compare mobile (2x3) vs desktop (1x6) layout

---

## Step 7: Positions Display (Table & Cards)
**Goal:** Display active positions on wallet profile

### Tasks:
1. Create `frontend/src/components/PositionCard.tsx`:
   - Mobile card layout with:
     - Category tag (reuse from TrendingMarkets)
     - Market question
     - Sparkline (price history - already exists in codebase)
     - Position info: YES/NO, size, avg price, current price, unrealized P&L
   - Outcome badge (YES = green, NO = red)

2. Create `frontend/src/components/PositionsTable.tsx`:
   - Desktop table with columns: Market, Position, Size, Avg Price, Current, P&L
   - Sortable by P&L, Size
   - Row includes mini sparkline
   - Pagination (10 per page)

3. Create `frontend/src/components/ProfileTabs.tsx`:
   - Tab component for: Positions | Activity | Deposits
   - Props: `activeTab`, `onChange`, `counts?`
   - Styled with cyan underline for active tab

4. Update `frontend/src/components/WalletProfile.tsx`:
   - Add ProfileTabs
   - Add positions tab content with PositionsTable (desktop) / PositionCard list (mobile)
   - Lazy load positions data when tab is active

### Verification:
- [ ] Navigate to whale profile with positions
- [ ] Verify tabs appear: Positions, Activity, Deposits
- [ ] Click Positions tab
- [ ] Verify positions display in table (desktop) or cards (mobile)
- [ ] Verify sparklines render for each position
- [ ] Verify P&L colours (green/red)
- [ ] Test pagination if >10 positions
- [ ] Switch between mobile and desktop views

---

## Step 8: Activity History Display
**Goal:** Display transaction history on wallet profile

### Tasks:
1. Create `frontend/src/components/ActivityCard.tsx`:
   - Mobile card for activity items
   - Activity type icon and label (buy/sell/deposit/withdrawal/redeem)
   - Market question (if applicable)
   - Amount and price info
   - Timestamp
   - Link to Polygonscan

2. Create `frontend/src/components/ActivityHistoryTable.tsx`:
   - Desktop table with columns: Type, Market, Amount, Price, Value, Time
   - Activity type icons with colours per ACTIVITY_CONFIG
   - Filter pills: All | Deposits | Buys | Sells
   - Pagination

3. Update `frontend/src/components/WalletProfile.tsx`:
   - Add Activity tab content with ActivityHistoryTable/ActivityCards
   - Integrate activity filter state
   - Move existing deposit history to "Deposits" tab (or merge)

### Verification:
- [ ] Navigate to whale profile
- [ ] Click Activity tab
- [ ] Verify activity items display with correct icons and colours
- [ ] Verify buy = cyan, sell = magenta, deposit = green, withdrawal = red
- [ ] Test filter pills work
- [ ] Verify timestamps show relative time
- [ ] Click Polygonscan link - verify it opens correct transaction
- [ ] Compare mobile card vs desktop table views

---

## Step 9: WhaleTable Enhancements - Filters, Sorts & Live Status
**Goal:** Add trading performance sorting/filtering and live badges to whale list

### Tasks:
1. Create `frontend/src/components/FilterPills.tsx`:
   - Filter options: All | Profitable | Losing | Live
   - Profitable has green dot, Losing has red dot, Live has pulsing green dot
   - Filters can stack (Profitable + Live = valid)
   - Props: `filters`, `onChange`

2. Update `frontend/src/components/WhaleTable.tsx`:
   - Add new sort options: P&L, Win Rate, Portfolio, Last Active
   - Integrate FilterPills component
   - Add LiveBadge next to whale address (size='sm')
   - Mobile cards: Add 2x2 stats grid with P&L and Win Rate
   - Desktop rows: Add new columns (P&L, Win Rate, Positions, Last Active)
   - Red left border on cards for losing whales

3. Update backend if needed:
   - Ensure `/api/wallets` supports sort by pnl, winRate, portfolioValue, lastActivityAt
   - Ensure filter params work

### Verification:
- [ ] Navigate to Whales tab
- [ ] Verify new sort options appear (P&L, Win Rate, Portfolio, Active)
- [ ] Test sorting by each new field
- [ ] Verify filter pills appear
- [ ] Test "Profitable" filter - only profitable whales show
- [ ] Test "Losing" filter - only losing whales show
- [ ] Test "Live" filter - only active whales show
- [ ] Stack filters: Profitable + Live
- [ ] Verify LiveBadge appears on active whale cards
- [ ] Verify P&L colours on cards (green/red)
- [ ] Check losing whales have red left border
- [ ] Compare mobile vs desktop views

---

## Step 10: Dashboard Updates & Polish
**Goal:** Add trading stats to dashboard and final polish

### Tasks:
1. Create new icon components:
   - `frontend/src/components/icons/LiveIcon.tsx` - pulsing signal
   - `frontend/src/components/icons/TradesIcon.tsx` - exchange arrows

2. Update `frontend/src/components/Dashboard.tsx`:
   - Add secondary stats row (or expand to 6 cards):
     - Avg Win Rate (with WinRateIcon)
     - Total P&L (with PnlIcon, profit/loss coloured)
     - Live Whales (with LiveIcon)
     - Trades Today (with TradesIcon) - optional
   - Update backend `/api/stats` to return new aggregates

3. Final polish:
   - Verify all animations work (livePulse, pnlFlash)
   - Test error states for API failures
   - Ensure graceful handling of whales with no trading data
   - Performance check: ensure trading data lazy loads
   - Mobile scroll performance check

### Verification:
- [ ] Navigate to Dashboard
- [ ] Verify new stat cards appear (Avg Win Rate, Total P&L, Live Whales)
- [ ] Verify P&L shows correct colour (green if positive, red if negative)
- [ ] Verify Live Whales count matches filter count
- [ ] Full app walkthrough:
  - [ ] Dashboard loads without errors
  - [ ] Navigate to Whales tab, filters work
  - [ ] Click on a whale, profile loads with all trading data
  - [ ] Tabs work (Positions, Activity, Deposits)
  - [ ] Navigate back, state persists
  - [ ] Test on mobile viewport
  - [ ] No console errors
  - [ ] No visual regressions from original design

---

## Implementation Notes

### Order Dependencies
- Steps 1-3 (Backend + Types + Hooks) must complete before Steps 4-8
- Step 4 (LiveBadge) should complete before Step 5 (Header uses it)
- Steps 5-8 can be done in parallel to some extent
- Step 9 depends on filter/sort backend support from Step 1
- Step 10 is final integration and polish

### Error Handling
- All API calls should gracefully handle:
  - Rate limits (429 responses)
  - Missing data (new wallets with no trading history)
  - Network failures
- Show "N/A" or "--" for missing trading metrics

### Performance Considerations
- Trading data should lazy load (not on initial page load)
- Positions/Activity should paginate (10 items per page)
- Use React Query or SWR for caching in hooks
- Consider virtualization for long position/activity lists

### Testing
- Each step should include visual verification in browser
- No need for unit tests during initial implementation
- Focus on integration and visual correctness

---

## Estimated Complexity per Step

| Step | Complexity | New Files | Modified Files |
|------|------------|-----------|----------------|
| 1    | Large      | 3         | 2              |
| 2    | Medium     | 4         | 2              |
| 3    | Medium     | 5         | 1              |
| 4    | Small      | 3         | 2              |
| 5    | Medium     | 2         | 1              |
| 6    | Medium     | 4         | 1              |
| 7    | Large      | 3         | 1              |
| 8    | Large      | 2         | 1              |
| 9    | Large      | 1         | 2              |
| 10   | Medium     | 2         | 2              |

---

*Ready to begin implementation. Start with Step 5: Profile Header & Avatar Components.*
