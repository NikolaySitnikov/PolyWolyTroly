# PolyWolyTroly Frontend

Real-time web dashboard for monitoring Polymarket whale activity. Built with React, TypeScript, and Vite, featuring a cyberpunk terminal aesthetic.

## Features

### Live Dashboard
- **Real-time Stats**: Whale count, total volume, daily alerts, new whales this week
- **WebSocket Updates**: Instant notifications when new deposits happen
- **Responsive Design**: Optimized layouts for desktop and mobile

### Whale Tracking
- **Searchable Table**: Filter whales by address with instant search
- **Sortable Columns**: Sort by deposits, total volume, or first/last seen
- **Pagination**: Navigate through whale records efficiently
- **Individual Profiles**: Detailed view for each wallet with transaction history

### Live Alert Feed
- **Real-time Notifications**: See new deposits as they happen
- **Status Indicators**: Distinguish between first-time and returning users
- **Rich Details**: Amount, wallet address, timestamps, transaction links

### Trending Markets
- **Top Markets**: See what prediction markets whales are betting on
- **Volume Tracking**: Total volume and recent activity per market
- **Direct Links**: Quick access to markets on Polymarket

### Settings
- **Theme Toggle**: Dark/light mode support
- **Notifications**: Enable/disable live alerts
- **Refresh Intervals**: Customize data polling frequency
- **Sound Alerts**: Optional audio notifications for new deposits

## Design System

**"Teenage hacker genius meets Wall Street terminal"**

### Color Palette
- **Void Black** (`#0a0a0f`): Background base
- **Cyan** (`#00fff0`): Primary accent, links, emphasis
- **Magenta** (`#ff2d92`): Alerts, secondary actions
- **Profit Green** (`#00ff88`): Positive values
- **Loss Red** (`#ff3366`): Negative values

### Typography
- **Display**: Exo 2 (futuristic, geometric)
- **Monospace**: JetBrains Mono (data, numbers)
- **Body**: Space Grotesk (clean, modern)

### Visual Effects
- CRT scanline overlay
- Gradient mesh backgrounds
- Glow effects on interactive elements
- Smooth animations and transitions

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast dev server and build tool
- **Vitest** - Testing framework
- **React Testing Library** - Component testing
- **WebSocket** - Real-time updates

## Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

### State Management
- **React Hooks**: Custom hooks for API calls and WebSocket connections
- **Context API**: Global settings management
- **URL Hash Routing**: Simple client-side navigation

### Custom Hooks
- `useStats()` - Dashboard statistics
- `useWhales()` - Whale list with pagination
- `useAlerts()` - Live alert feed
- `useWallet(address)` - Individual wallet details
- `useTrendingMarkets()` - Top markets by volume
- `useWebSocket()` - Real-time deposit events
- `useMobile()` - Responsive breakpoint detection

### API Integration
Backend API endpoints (default: `http://localhost:3001`):
- `GET /api/stats` - Dashboard statistics
- `GET /api/wallets` - Paginated whale list with search/sort
- `GET /api/wallets/:address` - Individual wallet details
- `GET /api/deposits` - Recent deposit history
- `GET /api/markets/trending` - Top prediction markets
- `WS /ws` - Real-time deposit events

### Component Structure
```
App.tsx                    # Main shell, routing, WebSocket
├── Header.tsx             # Logo, navigation, live indicator
├── MobileNav.tsx          # Bottom navigation for mobile
├── Dashboard.tsx          # Stats overview
│   └── StatCard.tsx       # Individual metric card
├── WhaleTable.tsx         # Searchable/sortable whale list
│   └── Pagination.tsx     # Page navigation controls
├── AlertFeed.tsx          # Live deposit notifications
├── TrendingMarkets.tsx    # Top markets list
├── WalletProfile.tsx      # Individual wallet details
└── Settings.tsx           # User preferences
```

## Testing

126 tests across all components and utilities:
- `App.test.tsx` - Main app routing and integration
- `Dashboard.test.tsx` - Stats display and layout
- `WhaleTable.test.tsx` - Search, sort, pagination
- `AlertFeed.test.tsx` - Real-time updates
- `Settings.test.tsx` - User preferences
- `tokens.test.ts` - Design system validation

Test coverage focuses on:
- Component rendering
- User interactions
- Responsive behavior
- Data formatting
- Error states

## Environment Variables

Create a `.env` file in the frontend directory:

```bash
# Backend API URL (optional, defaults to http://localhost:3001)
VITE_API_URL=http://localhost:3001
```

## Browser Support

- Modern browsers with ES2020+ support
- WebSocket support required for live updates
- Tested on Chrome, Firefox, Safari, Edge

## Design Documentation

For detailed design specifications, see:
- `../Design docs/DESIGN_SYSTEM.md` - Complete design system
- `../Design docs/BRAND_GUIDELINES_EXTENDED.md` - Branding guidelines
- `DEVELOPMENT_LOG.md` - Step-by-step build log with TDD approach

## Current State

The frontend is fully functional and connected to the backend API. All features are implemented with comprehensive test coverage. The design system is complete and consistently applied throughout the application.

### What Works
- ✅ Real-time dashboard with live WebSocket updates
- ✅ Searchable, sortable whale table with pagination
- ✅ Live alert feed with deposit notifications
- ✅ Individual wallet profiles with transaction history
- ✅ Trending markets integration
- ✅ Responsive mobile layout
- ✅ Settings panel with theme/notification controls
- ✅ Comprehensive test coverage (126 tests passing)

### Known Limitations
- Single-page application with hash routing (no server-side routing)
- No user authentication (read-only public dashboard)
- Limited historical data visualization (no charts/graphs yet)
