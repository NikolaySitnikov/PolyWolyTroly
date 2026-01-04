# PolyWolyTroly - Design Implementation Roadmap

## Project Context

**Project**: PolyWolyTroly - A real-time Polymarket whale tracking dashboard
**Brand Vibe**: "Teenage hacker genius meets Wall Street terminal"
**Current State**: Functional MVP with basic design system, but missing many brand-defining features
**Goal**: Implement all design system specifications to create the "best looking tool ever"

---

## Design Gaps Summary

A comprehensive designer review identified **major gaps** between the DESIGN_SYSTEM.md specifications and the actual implementation. The application is functional but lacks:

1. **Missing animations** (tickUp, flashGreen/Red, scanline, swimming whale)
2. **Underutilized visual effects** (hover glows, card variants, micro-interactions)
3. **No data visualization** (charts, sparklines - critical for Bloomberg Terminal vibe)
4. **Missing mobile interactions** (swipe gestures, pull-to-refresh, bottom sheets)
5. **No notification system** (toasts for live events)
6. **Character encoding bugs** (garbled Unicode in multiple files)
7. **Empty mascot personality** (whale should be animated, expressive)
8. **No keyboard navigation** (arrow keys, shortcuts)
9. **Missing UI polish** (achievement badges, alert counts, status indicators)
10. **No sound design** (optional but brand-defining)

---

## Task Groups Breakdown

### 📋 GROUP 1: Core Animations & Visual Effects
**Focus**: Make the app feel "alive" with missing animations and hover effects
**Impact**: HIGH - Brand-defining animations
**Effort**: Medium

**Tasks**:
1. Add missing keyframe animations to globals.css (tickUp, flashGreen, flashRed, activePulse, scanline)
2. Implement hover glow effects on StatCard component
3. Implement hover effects on whale cards in WhaleTable
4. Implement hover effects on market cards in TrendingMarkets
5. Add value change flash animations (green/red) when P&L updates via WebSocket
6. Add active page pulse animation to Pagination component
7. Fix all UTF-8 character encoding issues across components (←, →, ‹, ›, 🐋, 📊, 🔥, 📈)
8. Add keyboard navigation to Pagination (Arrow keys ← →)
9. Add page change fade effect coordination between Pagination and table content

**Acceptance Criteria**:
- Cards lift and glow on hover with cyan border
- Numbers flash green/red when values change
- Active pagination button pulses
- All Unicode characters display correctly
- Arrow keys navigate pagination
- Hover effects only apply on desktop (`@media (hover: hover)`)

---

### 📋 GROUP 2: Data Visualization & Charts
**Focus**: Add sparklines and charts - THE difference between "nice dashboard" and "pro trading tool"
**Impact**: CRITICAL - Most impactful visual upgrade
**Effort**: High

**Tasks**:
1. Evaluate and test both Recharts and Lightweight Charts libraries
2. Implement sparklines in TrendingMarkets component (1px thin, inline with data)
3. Add price change indicators (↑/↓ arrows with percentages, color-coded)
4. Add market category/tags to market cards
5. Create historical data points for sparklines (mock data if needed)
6. Add chart styling per design system (2px strokes, gradient fills, glow on hover)
7. Implement sparkline hover interactions
8. Add sparklines to whale cards showing deposit activity over time

**Acceptance Criteria**:
- Each trending market shows a sparkline of recent price movement
- Green/red arrows indicate price direction
- Sparklines use cyan color (#00fff0) with 1px stroke
- Charts render performantly (< 50ms paint time)
- Mock data structure supports real historical data later
- Both libraries tested, best one selected with documented rationale

---

### 📋 GROUP 3: Whale Mascot & Loading States
**Focus**: Bring the whale mascot to life with personality and animation
**Impact**: HIGH - Core brand personality
**Effort**: Medium

**Tasks**:
1. Create CSS/SVG animated swimming whale for loading states
2. Implement whale animation in DashboardLoading component (replace generic text)
3. Implement whale animation in WalletProfileLoading component
4. Add playful loading copy ("Scanning the depths...", "Hunting for whales...")
5. Create whale expressions for error states (confused/lost pose)
6. Update DashboardError with whale mascot
7. Update WalletProfileError with whale mascot
8. Add whale emergence animation for empty states
9. Create whale tail flick animation on logo hover

**Acceptance Criteria**:
- Loading states show animated swimming whale (2s loop: tail swish left → glide → tail swish right → glide)
- Error states show confused whale with personality
- Empty states have unique whale poses per context
- Loading copy is playful and on-brand
- Animations respect `prefers-reduced-motion`

---

### 📋 GROUP 4: Toast Notifications & Alert System
**Focus**: Real-time notifications for live deposit events
**Impact**: HIGH - Core UX feature for live tracking
**Effort**: Medium

**Tasks**:
1. Create Toast component with 4 variants (info, success, warning, error)
2. Create useToast context and hook
3. Implement toast notification system (top-right desktop, top-center mobile)
4. Add toast animations (slide in from right/top)
5. Implement auto-dismiss after 5 seconds
6. Implement toast stacking (max 3 visible)
7. Integrate toasts with WebSocket deposit events
8. Add alert badges to navigation items (magenta dot with count)
9. Add "99+" max display for alert counts
10. Create notification preview in Settings

**Acceptance Criteria**:
- New deposits trigger toast notifications with whale emoji
- Toasts slide in smoothly and auto-dismiss
- Maximum 3 toasts stack vertically
- Nav items show unread alert count badges
- Toasts are accessible (ARIA live regions)
- Setting to enable/disable notifications works

---

### 📋 GROUP 5: Mobile Interactions & Polish
**Focus**: Advanced mobile UX and final UI polish
**Impact**: MEDIUM - Modern mobile experience + nice-to-haves
**Effort**: High

**Tasks**:
1. Implement swipe actions on whale cards (swipe right: follow, swipe left: hide)
2. Implement pull-to-refresh with whale animation (whale emerges, swims, dives)
3. Create bottom sheet component for mobile filters (24px rounded top, handle bar, snap points)
4. Add long-press to copy wallet addresses
5. Implement whale achievement badges (🥇 top depositor, 🔥 hot streak, 🆕 first-timer)
6. Add ranking badges to whale cards
7. Create tooltip component for hover explanations
8. Implement skeleton loading components (shaped like actual content)
9. Add color coding to markets (green/red price movement)
10. Add button micro-interactions (lift effect with glow)
11. Implement live ticker banner (horizontal scrolling whale activity)
12. Add "Whale of the Day" hero card feature
13. Implement keyboard shortcuts modal (press `?` to show)
14. Add sound design (optional toggle: sonar ping, whale call, cha-ching)
15. Implement Settings functionality (theme toggle, refresh intervals, sound preview)

**Acceptance Criteria**:
- Swipe gestures work on mobile whale cards
- Pull-to-refresh triggers data reload with whale animation
- Bottom sheet for filters snaps to 40% and 90%
- Long-press on address copies to clipboard with haptic feedback
- Top whales display achievement badges
- Tooltips appear on hover with explanations
- Skeleton loaders match content shape
- All Settings toggles are functional
- Keyboard shortcuts modal accessible with `?` key
- Sound effects play when enabled (with volume control)

---

## Implementation Guidelines

### Testing Approach
**TDD (Test-Driven Development)** - For each feature:
1. Write test first (describe expected behavior)
2. Implement feature to pass test
3. Verify in browser (DevTools or Playwright MCP)
4. Refactor if needed

### Documentation Approach
**Document as you implement**:
- Update component JSDoc comments
- Add inline code comments for complex logic
- Update DEVELOPMENT_LOG.md with progress
- Update README.md when features are complete

### Git Workflow
**Commit after each feature**:
- One feature = one commit
- Use conventional commit format: `feat:`, `fix:`, `style:`, `test:`
- Push after each group is complete
- Example: `feat: add hover glow effects to StatCard component`

### Verification
**After each feature**:
- Run tests: `npm test`
- Check in browser: Visual verification
- Test responsive: Mobile + desktop
- Test accessibility: Keyboard navigation, screen reader
- Use DevTools or Playwright MCP for automated checks

### Performance Targets
- **LCP** < 2.5s (Largest Contentful Paint)
- **FID** < 100ms (First Input Delay)
- **CLS** < 0.1 (Cumulative Layout Shift)
- Animations use `transform` and `opacity` only
- Code split by route
- Lazy load charts

### Accessibility Checklist
- [ ] All hover effects work with keyboard (`:focus-visible`)
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Color not sole indicator (pair with icons/text)
- [ ] 4.5:1 contrast for normal text
- [ ] Touch targets minimum 44x44px
- [ ] ARIA labels on all interactive elements

---

## Project File Structure

```
polymarket-whale-tracker/
├── Design docs/
│   ├── DESIGN_SYSTEM.md              # Complete design specifications
│   └── BRAND_GUIDELINES_EXTENDED.md  # Voice, tone, iconography
├── frontend/
│   ├── src/
│   │   ├── components/               # React components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── WhaleTable.tsx
│   │   │   ├── TrendingMarkets.tsx
│   │   │   ├── AlertFeed.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── DashboardLoading.tsx
│   │   │   ├── WalletProfileLoading.tsx
│   │   │   └── ...
│   │   ├── styles/
│   │   │   └── globals.css           # Global styles, keyframes
│   │   ├── utils/
│   │   │   └── tokens.ts             # Design tokens
│   │   └── hooks/                    # Custom React hooks
│   ├── package.json
│   └── README.md
├── backend/                          # API server
└── DESIGN_IMPLEMENTATION_ROADMAP.md  # This file
```

---

## Known Issues to Fix

### Critical Bugs
1. **UTF-8 Encoding** - Characters garbled in multiple files:
   - `â€¹` → `‹`
   - `â€º` → `›`
   - `â†` → `←`
   - `ðŸ‹` → `🐋`
   - `ðŸ"Š` → `📊`
   - `ðŸ"¥` → `🔥`
   - `ðŸ"ˆ` → `📈`

2. **Missing Chart Integration** - Zero data visualization currently

3. **No Toast System** - Live events have no visual notifications

### Design Gaps
1. StatCard has no hover state
2. Pagination has no keyboard navigation
3. Loading states show generic text instead of whale
4. No sparklines in TrendingMarkets
5. No achievement badges on whales
6. No tooltip component
7. Settings not fully functional

---

## Success Metrics

### Visual Quality
- [ ] All cards have hover glow effects
- [ ] Numbers flash when values change
- [ ] Sparklines on all market cards
- [ ] Animated whale in loading states
- [ ] Toast notifications for live events
- [ ] Achievement badges on top whales

### Performance
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Smooth 60fps animations

### Accessibility
- [ ] All components keyboard navigable
- [ ] ARIA labels on interactive elements
- [ ] Respects `prefers-reduced-motion`
- [ ] 4.5:1 text contrast

### Mobile
- [ ] Swipe gestures work
- [ ] Pull-to-refresh functional
- [ ] Bottom sheet filters
- [ ] Touch targets 44x44px minimum

---

## Technology Stack

**Frontend**:
- React 18 with TypeScript
- Vite (dev server + build)
- Vitest + React Testing Library
- WebSocket for real-time updates

**Charts** (to be evaluated):
- Recharts (React integration)
- Lightweight Charts (trading-style visualizations)

**Testing Tools Available**:
- DevTools MCP
- Playwright MCP

---

## Next Steps

1. **Start with GROUP 1** - Core animations establish the "alive" feel
2. **Then GROUP 2** - Charts are the biggest visual impact
3. **Then GROUP 3** - Whale personality is brand-defining
4. **Then GROUP 4** - Notifications complete the live experience
5. **Finally GROUP 5** - Polish and mobile UX

Each group is designed to be completed in one focused conversation session without running out of context.

---

*"In the void, whales move in silence. We see them."*
— PolyWolyTroly Design Team
