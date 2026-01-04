# PolyWolyTroly Extended Brand Guidelines
## Voice, Tone, Iconography & Detailed Specifications

---

## 🎙️ Voice & Tone

### Brand Voice
PolyWolyTroly speaks with the confidence of a seasoned trader and the accessibility of a friend who knows their stuff. We're the "cool cousin who works in crypto and actually explains things well."

### Voice Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| **Confident** | We know our data is accurate | "DeepWater.eth just deposited $500K" not "It appears that..." |
| **Concise** | No fluff, just signal | "↑ $24K (12%)" not "The position has increased..." |
| **Clever** | Wit without trying too hard | Empty state: "No whales in sight... yet 🐋" |
| **Accessible** | No gatekeeping | "P&L" not "Profit and Loss Aggregation" |

### Microcopy Examples

**Button Labels**
- ✓ "Track This Whale"
- ✗ "Add to Tracking List"

**Empty States**
- ✓ "No positions yet. This whale is lurking."
- ✗ "No data to display"

**Loading States**
- ✓ "Scanning the depths..."
- ✓ "Hunting for whales..."
- ✗ "Loading..."

**Success Messages**
- ✓ "🔔 You're now tracking this whale"
- ✗ "Wallet successfully added to tracking list"

**Error Messages**
- ✓ "Lost signal. Retry?"
- ✗ "An error occurred. Please try again."

---

## 🎨 Extended Colour Specifications

### Colour Usage Guidelines

**Primary Cyan (#00fff0)**
- Primary CTAs
- Links
- Active states
- Important data highlights
- Chart primary series

**Magenta (#ff2d92)**
- Secondary CTAs
- Notifications/alerts badges
- Hover accents
- Chart secondary series

**Profit Green (#00ff88)**
- Positive P&L
- Winning trades
- Deposits
- Upward trends
- YES positions

**Loss Red (#ff3366)**
- Negative P&L
- Losing trades
- Withdrawals
- Downward trends
- NO positions

### Colour Application Rules

1. **Never use colour alone** to convey meaning — always pair with icons or text
2. **Cyan reserved** for interactive elements and emphasis
3. **Gradients** only on featured elements (hero, top performer cards)
4. **Glow effects** sparingly — max 2-3 glowing elements per viewport
5. **Text on dark** must maintain 4.5:1 contrast minimum

---

## 🔤 Typography Deep Dive

### Font Loading Strategy

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@700;800&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
```

### Fallback Stack

```css
--font-display: 'Exo 2', 'SF Pro Display', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
--font-body: 'Space Grotesk', 'SF Pro Text', system-ui, sans-serif;
```

### Typography Patterns

**Hero Headlines**
```css
font-family: var(--font-display);
font-size: clamp(2rem, 5vw, 3.5rem);
font-weight: 800;
letter-spacing: -0.03em;
line-height: 1.1;
```

**Data Values (Large)**
```css
font-family: var(--font-mono);
font-size: 28px;
font-weight: 600;
font-feature-settings: 'tnum' 1;
letter-spacing: -0.01em;
```

**Table Headers**
```css
font-family: var(--font-mono);
font-size: 10px;
font-weight: 500;
text-transform: uppercase;
letter-spacing: 0.1em;
color: var(--text-muted);
```

**Wallet Addresses**
```css
font-family: var(--font-mono);
font-size: 13px;
font-weight: 400;
color: var(--cyan);
```

---

## 🎭 Icon System

### Icon Sources

**Primary**: [Phosphor Icons](https://phosphoricons.com/) — regular weight
**Secondary**: Native emoji for personality touches

### Icon Sizing

| Context | Size | Examples |
|---------|------|----------|
| Inline with text | 16px | Navigation items |
| Button icons | 18px | Action buttons |
| Card icons | 24px | Feature cards |
| Empty states | 48px | Whale mascot |
| Hero elements | 64px+ | Welcome whale |

### Icon Colour Rules

- **Interactive icons**: Inherit text colour
- **Decorative icons**: `var(--text-muted)` or emoji
- **Status icons**: Match semantic colour (profit/loss)
- **Hover state**: `var(--cyan)` or appropriate accent

### Custom Icons Needed

| Icon | Usage | Style |
|------|-------|-------|
| Whale | Logo, mascot, empty states | Geometric/minimal |
| Wave/water | Loading, decorative | Animated SVG |
| Signal | Live indicator | Pulsing dot |
| Deposit arrow | Transaction type | Downward arrow |
| Withdrawal arrow | Transaction type | Upward arrow |
| Position marker | Chart overlay | Pin/flag |

---

## 📐 Layout Grid

### Desktop Grid (1280px+)

```
Columns: 12
Gutter: 24px
Margin: 32px
Max content width: 1400px
```

### Tablet Grid (768px - 1279px)

```
Columns: 8
Gutter: 20px
Margin: 24px
```

### Mobile Grid (<768px)

```
Columns: 4
Gutter: 16px
Margin: 16px
```

### Common Layout Patterns

**Dashboard**
```
[Stats Row: 4 columns]
[Content: 6col + 6col]
[Featured: Full width]
```

**Whale List (Desktop)**
```
[Search + Filters: Full width]
[Table: Full width]
```

**Whale List (Mobile)**
```
[Search: Full width]
[Card stack: Full width]
```

**Wallet Profile**
```
[Header: Full width]
[Stats: 4 columns]
[Positions: Full width]
[History: Full width]
```

---

## ✨ Animation Specifications

### Entrance Animations

**Staggered List Items**
```css
animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
animation-delay: calc(var(--index) * 0.05s);
animation-fill-mode: both;
```

**Cards**
```css
animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
```

**Modal/Overlay**
```css
animation: fadeIn 0.2s ease-out, scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
```

### Interaction Animations

**Button Hover**
```css
transition: all 0.15s ease;
transform: translateY(-1px);
box-shadow: 0 4px 20px var(--cyan-glow);
```

**Card Hover**
```css
transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
transform: translateY(-2px);
border-color: var(--cyan);
box-shadow: 0 0 30px var(--cyan-glow);
```

**Table Row Hover**
```css
transition: background 0.15s ease;
background: var(--surface-hover);
```

### Data Updates

**Value Change (Positive)**
```css
animation: flashGreen 0.6s ease;
/* Flash green background, then fade */
```

**Value Change (Negative)**
```css
animation: flashRed 0.6s ease;
```

**Number Ticker**
```css
animation: tickUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
```

### Loading States

**Skeleton Shimmer**
```css
background: linear-gradient(
  90deg,
  var(--surface) 0%,
  var(--surface-hover) 50%,
  var(--surface) 100%
);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;
```

**Pulsing Dot (Live Indicator)**
```css
animation: pulse 2s ease-in-out infinite;
```

---

## 🖱️ Interaction States

### Focus States

All interactive elements must have visible focus:
```css
:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 2px;
}
```

### Touch Targets

- Minimum size: 44x44px
- Recommended: 48x48px for primary actions
- Spacing between targets: minimum 8px

### Hover vs Touch

- Hover effects: Desktop only (use `@media (hover: hover)`)
- Touch feedback: :active state for mobile
- Long-press: For context menus/copy actions

---

## 🔔 Notification Patterns

### Toast Notifications

```
Position: Top-right (desktop), Top-center (mobile)
Duration: 5 seconds (auto-dismiss)
Max stack: 3
Animation: Slide in from right/top
```

**Variants**
- Info (cyan border)
- Success (green border)
- Warning (yellow border)
- Error (red border)

### Alert Badges

**On navigation items**
```
Position: Top-right of icon
Size: 18px diameter (with count) or 8px dot (no count)
Color: var(--magenta)
Font: JetBrains Mono 10px
Max display: "99+"
```

---

## 📱 Mobile-Specific Patterns

### Bottom Sheet

For filters, details, and actions on mobile:
```
Border-radius: 24px 24px 0 0
Handle: 40px × 4px centered bar
Snap points: 40%, 90%
Backdrop: rgba(0, 0, 0, 0.6)
```

### Pull-to-Refresh

```
Threshold: 80px
Animation: Whale emerges from top
Loading: Whale swims in circle
Complete: Whale dives back down
```

### Swipe Actions (List Items)

```
Swipe right: Follow whale (green)
Swipe left: Hide from list (red)
Threshold: 30% of width
Haptic: Light impact on threshold
```

### Gestures

- **Pull down**: Refresh data
- **Swipe between tabs**: Navigate views
- **Long press on address**: Copy to clipboard
- **Pinch on charts**: Zoom

---

## 🌐 Responsive Breakpoint Behavior

### Navigation

| Breakpoint | Behavior |
|------------|----------|
| Desktop | Horizontal nav in header |
| Tablet | Horizontal nav, condensed |
| Mobile | Fixed bottom navigation |

### Data Tables

| Breakpoint | Behavior |
|------------|----------|
| Desktop | Full table with all columns |
| Tablet | Horizontal scroll, key columns |
| Mobile | Card stack view |

### Stats Cards

| Breakpoint | Behavior |
|------------|----------|
| Desktop | 4-column grid |
| Tablet | 2-column grid |
| Mobile | 2-column grid, smaller |

### Wallet Profile

| Breakpoint | Behavior |
|------------|----------|
| Desktop | Horizontal header, inline actions |
| Mobile | Stacked header, floating action |

---

## 🧪 Performance Guidelines

### Core Web Vitals Targets

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Image Optimization

- Use WebP format with JPEG fallback
- Lazy load below-the-fold images
- Provide srcset for responsive images
- Max initial payload: 200KB images

### Animation Performance

- Use `transform` and `opacity` only
- Avoid animating `width`, `height`, `top`, `left`
- Use `will-change` sparingly and remove after animation
- Respect `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Bundle Optimization

- Code split by route
- Lazy load heavy components (charts)
- Preload critical fonts
- Use service worker for caching

---

## ♿ Accessibility Checklist

### Colour
- [ ] 4.5:1 contrast for normal text
- [ ] 3:1 contrast for large text
- [ ] Colour not sole indicator of state

### Keyboard
- [ ] All interactive elements focusable
- [ ] Logical tab order
- [ ] Focus visible on all states
- [ ] Escape closes modals/dropdowns

### Screen Reader
- [ ] Semantic HTML structure
- [ ] ARIA labels on icons
- [ ] Live regions for updates
- [ ] Descriptive link text

### Motion
- [ ] Respects prefers-reduced-motion
- [ ] No flashing content (3x/sec)
- [ ] Pause option for auto-playing content

---

## 🐋 The Whale Mascot Specifications

### Personality

The PolyWolyTroly whale is:
- **Observant** — always watching, tracking
- **Wise** — represents smart money
- **Playful** — reflects the brand name
- **Mysterious** — emerges from the depths with data

### Usage Contexts

1. **Logo** — Minimal geometric outline
2. **Loading** — Swimming animation
3. **Empty states** — Full character with expressions
4. **Success** — Happy/celebrating pose
5. **Error** — Confused/lost pose
6. **Achievement badges** — Various accessories

### Animation Sequences

**Loading (2s loop)**
```
Frame 1-10: Tail swish left
Frame 11-20: Glide forward
Frame 21-30: Tail swish right
Frame 31-40: Glide forward
(Loop seamlessly)
```

**Success**
```
Frame 1-15: Emerge from bottom
Frame 16-25: Splash effect
Frame 26-40: Float with smile
```

---

## 📋 Component Inventory

### Atoms
- Button (Primary, Secondary, Ghost, Icon)
- Input (Text, Search, Number)
- Badge / Pill
- Live Indicator
- Wallet Address Display
- Avatar / Icon Container
- Tooltip
- Divider

### Molecules
- Stat Card
- Alert Item
- Market Card
- Whale Row (Table)
- Whale Card (Mobile)
- Position Item
- Trade Item
- Search Bar
- Tab Group
- Dropdown Menu

### Organisms
- Header / Navigation
- Mobile Bottom Nav
- Alert Feed
- Trending Markets List
- Whale Table
- Position Table
- Trade History
- Stats Grid
- Wallet Profile Header

### Templates
- Dashboard Layout
- List Layout
- Profile Layout
- Settings Layout
- Modal Layout
- Empty State

### Pages
- Dashboard
- Whale List
- Wallet Profile
- Alert Center
- Settings

---

*"The smartest money moves silently. We just make it visible."*

— PolyWolyTroly Brand Team
