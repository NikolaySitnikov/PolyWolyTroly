# Context Document for AI Implementation Sessions

## Quick Project Overview

**Project Name**: PolyWolyTroly
**Type**: Real-time Polymarket whale tracking dashboard
**Tech Stack**: React 18 + TypeScript + Vite frontend, Node.js backend, PostgreSQL database
**Current State**: Functional MVP with basic features, undergoing major design system implementation

---

## Brand Identity

**Brand Vibe**: "Teenage hacker genius meets Wall Street terminal"

**Core Attributes**:
- Competent (data-dense, precise, professional-grade)
- Subversive (playful name, underground aesthetic, crypto-native)
- Alive (real-time, pulsing, breathing with data)
- Minimal but Dense (every pixel earns its place)
- Future-Forward (feels like software from 2035)

**Color Palette**:
- Void Black: `#0a0a0f` (background)
- Cyan: `#00fff0` (primary accent)
- Magenta: `#ff2d92` (alerts, secondary)
- Profit Green: `#00ff88` (positive values)
- Loss Red: `#ff3366` (negative values)

**Typography**:
- Display: Exo 2 (futuristic, geometric)
- Monospace: JetBrains Mono (data, numbers)
- Body: Space Grotesk (clean, modern)

**Visual Effects**:
- Glow effects on hover (cyan/magenta)
- Smooth animations (ease-out-expo)
- Gradient mesh backgrounds
- CRT scanline overlay (subtle)
- Shimmer loading states

---

## What We're Working On

A comprehensive designer review identified **major gaps** between the design system specifications and the actual implementation. We are systematically implementing all missing features in 5 groups:

### GROUP 1: Core Animations & Visual Effects ⚡
- Missing keyframe animations (tickUp, flashGreen/Red, activePulse)
- Hover glow effects on cards
- Value change flash animations
- UTF-8 character encoding fixes
- Keyboard navigation for pagination

### GROUP 2: Data Visualization & Charts 📊
- Sparklines in market cards (THE most important feature)
- Price change indicators (↑/↓)
- Chart library evaluation (Recharts vs Lightweight Charts)
- Historical data integration

### GROUP 3: Whale Mascot & Loading States 🐋
- Animated swimming whale for loading
- Whale expressions for error/success/empty states
- Playful loading copy
- ASCII whale art integration

### GROUP 4: Toast Notifications & Alerts 🔔
- Toast notification system for live events
- Alert badges on navigation
- WebSocket integration
- Auto-dismiss and stacking

### GROUP 5: Mobile Interactions & Polish ✨
- Swipe gestures
- Pull-to-refresh
- Bottom sheets
- Achievement badges
- Keyboard shortcuts
- Sound design (optional)

---

## Working Directory Structure

```
/Users/nikolaysitnikov/Documents/.../PolyWolyTroly/polymarket-whale-tracker/
├── Design docs/
│   ├── DESIGN_SYSTEM.md              # THE SOURCE OF TRUTH
│   └── BRAND_GUIDELINES_EXTENDED.md
├── frontend/
│   ├── src/
│   │   ├── components/               # All React components
│   │   ├── styles/
│   │   │   └── globals.css          # Global styles, animations
│   │   ├── utils/
│   │   │   └── tokens.ts            # Design tokens
│   │   └── hooks/                   # Custom React hooks
│   ├── package.json
│   └── README.md
├── backend/                          # Node.js API server
├── DESIGN_IMPLEMENTATION_ROADMAP.md  # Task breakdown (5 groups)
└── CONTEXT_FOR_AI.md                 # This file
```

**Current Working Directory**: `/Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday Life/AI/PolyWolyTroly/polymarket-whale-tracker`

---

## Implementation Workflow

### TDD Approach (MANDATORY)
1. **Write test first** - Describe expected behavior
2. **Implement feature** - Make test pass
3. **Verify in browser** - Use DevTools or Playwright MCP
4. **Test responsive** - Mobile + desktop
5. **Document** - Update comments, DEVELOPMENT_LOG.md
6. **Commit & push** - One feature = one commit

### Testing Commands
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run dev           # Start dev server (localhost:5173)
```

### Commit Format
Use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `style:` - UI/design changes
- `test:` - Adding tests
- `docs:` - Documentation

Example: `feat: add hover glow effects to StatCard component`

### After Each Feature
- [ ] Tests pass (`npm test`)
- [ ] Visual verification in browser
- [ ] Responsive check (mobile + desktop)
- [ ] Accessibility check (keyboard nav, ARIA)
- [ ] Update DEVELOPMENT_LOG.md
- [ ] Commit and push

---

## Key Design System Rules

### Animations
- **Only use** `transform` and `opacity` for performance
- **Durations**: fast (150ms), normal (250ms), slow (400ms)
- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo)
- **Respect**: `@media (prefers-reduced-motion: reduce)`

### Hover Effects (Desktop Only)
```css
@media (hover: hover) {
  &:hover {
    transform: translateY(-2px);
    border-color: var(--color-cyan);
    box-shadow: 0 0 30px var(--color-cyan-glow);
  }
}
```

### Card Variants
- **Base**: 1px border, surface background
- **Hover**: Cyan border, glow shadow, lift 2px
- **Profit**: 3px left border (green), green glow
- **Loss**: 3px left border (red), red glow

### Typography Patterns
- **Wallet addresses**: JetBrains Mono, cyan color
- **Numbers/Data**: JetBrains Mono, tabular-nums
- **Headers**: Exo 2, bold/extrabold
- **Body**: Space Grotesk

### Accessibility Requirements
- 4.5:1 contrast minimum
- All interactive elements keyboard navigable
- Focus visible (2px cyan outline)
- ARIA labels on icons
- Touch targets 44x44px minimum

---

## Performance Targets

- **LCP** < 2.5s (Largest Contentful Paint)
- **FID** < 100ms (First Input Delay)
- **CLS** < 0.1 (Cumulative Layout Shift)
- 60fps animations
- Code split by route
- Lazy load charts

---

## Common Patterns

### Adding a New Animation
1. Add keyframe to `frontend/src/styles/globals.css`
2. Use in component with inline style or CSS class
3. Test with `prefers-reduced-motion`

### Adding a New Component
1. Create in `frontend/src/components/`
2. Import design tokens from `utils/tokens.ts`
3. Write test file (`.test.tsx`)
4. Add to component exports

### Integrating with Design Tokens
```typescript
import { tokens } from '../utils/tokens';

// Use tokens for consistency
const styles = {
  color: tokens.colors.cyan,
  fontFamily: tokens.fonts.mono,
  borderRadius: tokens.radii.lg,
  transition: `all ${tokens.animation.duration.normal}ms ${tokens.animation.ease.outExpo}`,
};
```

### WebSocket Integration
```typescript
import { useWebSocket } from '../hooks/useWebSocket';

// Listen for deposit events
const { lastDeposit } = useWebSocket();

useEffect(() => {
  if (lastDeposit) {
    showToast({
      type: 'success',
      message: `🐋 New $${lastDeposit.amount} deposit!`
    });
  }
}, [lastDeposit]);
```

---

## Important Files to Know

### Design System Specs (READ THESE)
- `Design docs/DESIGN_SYSTEM.md` - Complete design system
- `Design docs/BRAND_GUIDELINES_EXTENDED.md` - Voice, tone, patterns
- `DESIGN_IMPLEMENTATION_ROADMAP.md` - Task breakdown

### Frontend Core
- `frontend/src/styles/globals.css` - Global styles, animations
- `frontend/src/utils/tokens.ts` - Design tokens
- `frontend/src/components/App.tsx` - Main app shell
- `frontend/src/components/Dashboard.tsx` - Home view
- `frontend/src/components/WhaleTable.tsx` - Whale list
- `frontend/src/components/TrendingMarkets.tsx` - Market cards

### Testing MCPs Available
- **DevTools MCP** - Browser automation, screenshots
- **Playwright MCP** - E2E testing, visual regression

---

## When Starting a New Group Session

### Step 1: Read the Context
1. Read `DESIGN_IMPLEMENTATION_ROADMAP.md` - Full task list
2. Identify which GROUP you're working on (1-5)
3. Read the specific tasks for that group

### Step 2: Read Design Specs
1. Read `Design docs/DESIGN_SYSTEM.md` - Understand specs
2. Read `Design docs/BRAND_GUIDELINES_EXTENDED.md` - Understand patterns

### Step 3: Read Current Implementation
1. Use Glob to find relevant component files
2. Read components that need changes
3. Understand current state before modifying

### Step 4: Plan & Execute
1. Create TodoWrite task list for the group
2. Implement one feature at a time
3. Test, verify, document, commit after each
4. Mark todos as completed as you go

### Step 5: Summary
1. Update DEVELOPMENT_LOG.md with progress
2. Create summary of what was implemented
3. List any blockers or questions
4. Commit and push all changes

---

## Critical Notes

### DO:
✅ Always use design tokens from `tokens.ts`
✅ Test responsive (mobile + desktop)
✅ Test accessibility (keyboard, ARIA)
✅ Respect `prefers-reduced-motion`
✅ Use TDD approach (test first)
✅ Document as you implement
✅ Commit after each feature
✅ Verify visually in browser

### DON'T:
❌ Skip tests
❌ Ignore design system specs
❌ Use arbitrary colors/fonts
❌ Animate width/height/top/left
❌ Forget mobile responsive
❌ Skip accessibility
❌ Batch commits
❌ Use generic copy (be playful!)

---

## Brand Voice Examples

### Loading States
- ✅ "Scanning the depths..."
- ✅ "Hunting for whales..."
- ❌ "Loading data..."

### Empty States
- ✅ "No whales in sight... yet 🐋"
- ✅ "This whale is lurking. No positions yet."
- ❌ "No data to display"

### Buttons
- ✅ "Track This Whale"
- ❌ "Add to Tracking List"

### Errors
- ✅ "Lost signal. Retry?"
- ❌ "An error occurred. Please try again."

---

## Quick Reference Commands

```bash
# Navigate to project
cd /Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday\ Life/AI/PolyWolyTroly/polymarket-whale-tracker

# Frontend development
cd frontend
npm install          # If needed
npm run dev          # Start dev server
npm test             # Run tests
npm run build        # Production build

# Backend (if needed)
cd backend
npm install
npm run dev

# Git
git status
git add .
git commit -m "feat: description"
git push
```

---

## Designer's Priority Ranking

| Priority | Feature | Impact |
|----------|---------|--------|
| 🔴 HIGH | Sparklines/charts in markets | Massive visual upgrade |
| 🔴 HIGH | Toast notifications for deposits | Core UX feature |
| 🔴 HIGH | Hover glow effects on cards | Brand consistency |
| 🟡 MED | Number flash on value changes | "Alive" feeling |
| 🟡 MED | Swimming whale loading | Brand personality |
| 🟡 MED | Mobile swipe actions | Modern UX |
| 🟡 MED | Alert badges on nav | Engagement |
| 🟢 LOW | Sound effects | Distinctive but niche |
| 🟢 LOW | Pull-to-refresh | Polish |
| 🟢 LOW | Bottom sheet filters | Advanced UX |

---

## Current Git Branch

Branch: `main`
Latest commit message will indicate current state.

Check with: `git log -1 --oneline`

---

## Questions to Ask Human

If you're unsure about:
1. **Behavior**: "Should this toast auto-dismiss or require manual close?"
2. **Data**: "Do we have historical price data for sparklines, or should I mock it?"
3. **Priority**: "Should I implement X before Y?"
4. **Design**: "The spec says cyan, but would magenta work better here?"

Always ask before making assumptions that affect UX!

---

*Ready to build the best-looking whale tracking tool ever! 🐋*

---

## How to Use This Document

### Starting a New Session
```
Hi! I'm working on GROUP [X] from the DESIGN_IMPLEMENTATION_ROADMAP.md.

Context:
- Project: PolyWolyTroly whale tracker
- Working on: [GROUP NAME]
- Already read: DESIGN_SYSTEM.md, BRAND_GUIDELINES_EXTENDED.md
- Working directory: /Users/nikolaysitnikov/.../polymarket-whale-tracker

Let's start by creating a TodoWrite list for this group and implementing features one by one with TDD approach.
```

Replace `[X]` and `[GROUP NAME]` with the group number and name you're working on.
