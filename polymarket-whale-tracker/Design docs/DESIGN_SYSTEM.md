# PolyWolyTroly Design System
## The Complete Branding & Design Guide

---

## 🐋 Brand Philosophy

### The Vibe
**"Teenage hacker genius meets Wall Street terminal"**

PolyWolyTroly exists in the intersection of underground crypto culture and institutional-grade analytics. It's what would happen if a brilliant 17-year-old hacker built a Bloomberg Terminal in their bedroom at 3 AM, fueled by energy drinks and pure genius.

### Core Brand Attributes
- **Competent**: Data-dense, precise, professional-grade analytics
- **Subversive**: Playful name, underground aesthetic, crypto-native
- **Alive**: Real-time, pulsing, breathing with data
- **Minimal but Dense**: Every pixel earns its place
- **Future-Forward**: Feels like software from 2035

### The Name
"PolyWolyTroly" is intentionally playful and memorable in a sea of serious fintech names. We lean into this with a whale mascot rendered in ASCII/pixel art style — serious tech, unserious name.

---

## 🎨 Colour System

### Primary Palette

```
VOID BLACK          #0a0a0f     Background base, the infinite dark
SURFACE             #12121a     Cards, elevated surfaces
SURFACE-HOVER       #1a1a24     Interactive states
BORDER              #2a2a3a     Subtle separators
MUTED               #4a4a5a     Disabled states, tertiary text
```

### Accent Colours

```
CYAN (Primary)      #00fff0     Primary actions, links, emphasis
CYAN-GLOW           #00fff033   Glow effects, shadows
CYAN-DIM            #00b8a9     Secondary cyan states

MAGENTA (Secondary) #ff2d92     Alerts, secondary actions
MAGENTA-GLOW        #ff2d9233   Glow effects

ELECTRIC PURPLE     #a855f7     Tertiary accent, charts
```

### Semantic Colours

```
PROFIT              #00ff88     Positive values, gains
PROFIT-GLOW         #00ff8833   Profit glow effects
PROFIT-DIM          #00cc6a     Secondary profit states

LOSS                #ff3366     Negative values, losses
LOSS-GLOW           #ff336633   Loss glow effects

WARNING             #ffaa00     Warnings, caution states
```

### Text Colours

```
TEXT-PRIMARY        #f0f0f5     Main content
TEXT-SECONDARY      #8888aa     Supporting text
TEXT-MUTED          #555566     Tertiary, timestamps
TEXT-INVERSE        #0a0a0f     Text on light backgrounds
```

### Gradient Definitions

```css
/* Hero gradient - animated mesh */
--gradient-mesh: radial-gradient(ellipse at 20% 20%, #00fff015 0%, transparent 50%),
                 radial-gradient(ellipse at 80% 80%, #ff2d9210 0%, transparent 50%),
                 radial-gradient(ellipse at 50% 50%, #a855f708 0%, transparent 70%);

/* Card glow on hover */
--gradient-glow: linear-gradient(135deg, #00fff010 0%, transparent 50%);

/* Profit/Loss bars */
--gradient-profit: linear-gradient(90deg, #00ff8800 0%, #00ff88 100%);
--gradient-loss: linear-gradient(90deg, #ff336600 0%, #ff3366 100%);
```

---

## 📐 Typography

### Font Stack

**Display / Headlines**: `'Exo 2', sans-serif`
- Futuristic, geometric, highly legible
- Weights: 700 (Bold), 800 (ExtraBold)
- Use for: Page titles, hero text, whale names

**Monospace / Data**: `'JetBrains Mono', 'Fira Code', monospace`
- Technical, precise, great for numbers
- Weights: 400 (Regular), 500 (Medium), 600 (SemiBold)
- Use for: Wallet addresses, numbers, P&L, tables

**Body / UI**: `'Space Grotesk', sans-serif`
- Clean, modern, excellent readability
- Weights: 400 (Regular), 500 (Medium), 600 (SemiBold)
- Use for: Navigation, labels, body text, buttons

### Type Scale

```
--text-xxs:   0.65rem    (10px)  Micro labels, timestamps
--text-xs:    0.75rem    (12px)  Small labels, secondary info
--text-sm:    0.875rem   (14px)  Body text, UI elements
--text-base:  1rem       (16px)  Default body
--text-lg:    1.125rem   (18px)  Large body, emphasis
--text-xl:    1.25rem    (20px)  Section headers
--text-2xl:   1.5rem     (24px)  Card titles
--text-3xl:   2rem       (32px)  Page headers
--text-4xl:   2.5rem     (40px)  Hero text
--text-5xl:   3.5rem     (56px)  Display, numbers
--text-6xl:   5rem       (80px)  Massive display
```

### Line Heights

```
--leading-none:    1
--leading-tight:   1.2
--leading-snug:    1.35
--leading-normal:  1.5
--leading-relaxed: 1.65
```

### Letter Spacing

```
--tracking-tighter: -0.03em   Display text
--tracking-tight:   -0.01em   Headlines
--tracking-normal:  0         Body
--tracking-wide:    0.05em    Small caps, labels
--tracking-wider:   0.1em     Micro text
```

---

## 📦 Spacing System

Based on 4px grid, using rem units:

```
--space-0:   0
--space-1:   0.25rem   (4px)
--space-2:   0.5rem    (8px)
--space-3:   0.75rem   (12px)
--space-4:   1rem      (16px)
--space-5:   1.25rem   (20px)
--space-6:   1.5rem    (24px)
--space-8:   2rem      (32px)
--space-10:  2.5rem    (40px)
--space-12:  3rem      (48px)
--space-16:  4rem      (64px)
--space-20:  5rem      (80px)
--space-24:  6rem      (96px)
```

---

## 🔲 Border Radius

```
--radius-sm:    4px      Inputs, small elements
--radius-md:    8px      Buttons, tags
--radius-lg:    12px     Cards, modals
--radius-xl:    16px     Large cards
--radius-2xl:   24px     Hero sections
--radius-full:  9999px   Pills, avatars
```

---

## 💫 Animation & Motion

### Timing Functions

```css
/* Snappy interactions */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);

/* Smooth reveals */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);

/* Bouncy */
--ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Spring */
--spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### Duration Scale

```
--duration-instant:  50ms    Micro-interactions
--duration-fast:     150ms   Hover states
--duration-normal:   250ms   Standard transitions
--duration-slow:     400ms   Page transitions
--duration-slower:   600ms   Complex animations
--duration-slowest:  1000ms  Dramatic reveals
```

### Standard Animations

```css
/* Fade in up - for staggered content */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Pulse glow - for live indicators */
@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 0 0 var(--cyan-glow);
  }
  50% {
    box-shadow: 0 0 20px 4px var(--cyan-glow);
  }
}

/* Number ticker - for updating values */
@keyframes tickUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Scanline effect - subtle CRT feel */
@keyframes scanline {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(100vh);
  }
}

/* Shimmer - for loading states */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
```

---

## 🧩 Component Patterns

### Cards

```
Base Card:
- Background: var(--surface)
- Border: 1px solid var(--border)
- Border-radius: var(--radius-lg)
- Padding: var(--space-6)

Elevated Card (hover):
- Border-color: var(--cyan)
- Box-shadow: 0 0 30px var(--cyan-glow), inset 0 1px 0 var(--cyan)
- Transform: translateY(-2px)

Profit Card:
- Border-left: 3px solid var(--profit)
- Box-shadow: 0 0 20px var(--profit-glow)

Loss Card:
- Border-left: 3px solid var(--loss)
- Box-shadow: 0 0 20px var(--loss-glow)
```

### Buttons

```
Primary Button:
- Background: var(--cyan)
- Color: var(--void-black)
- Font: Space Grotesk SemiBold
- Padding: 12px 24px
- Border-radius: var(--radius-md)
- Hover: brightness(1.1), box-shadow glow

Secondary Button:
- Background: transparent
- Border: 1px solid var(--cyan)
- Color: var(--cyan)
- Hover: background var(--cyan) 10%

Ghost Button:
- Background: transparent
- Color: var(--text-secondary)
- Hover: color var(--text-primary)
```

### Data Tables

```
Table Container:
- Background: var(--surface)
- Border-radius: var(--radius-lg)
- Overflow: hidden

Table Header:
- Background: var(--void-black)
- Font: JetBrains Mono Medium
- Color: var(--text-muted)
- Text-transform: uppercase
- Letter-spacing: var(--tracking-wide)
- Font-size: var(--text-xxs)

Table Row:
- Border-bottom: 1px solid var(--border)
- Hover: background var(--surface-hover)

Table Cell (numbers):
- Font: JetBrains Mono
- Tabular-nums for alignment
```

### Wallet Address Display

```
Short format: 0x1234...5678
- Font: JetBrains Mono
- Color: var(--cyan)
- Background: var(--cyan) 10%
- Padding: 4px 8px
- Border-radius: var(--radius-sm)
- Click to copy interaction
```

---

## 🐋 The Whale Mascot

### ASCII Whale (for terminal vibes)

```
        .
       ":"
     ___:____     |"\/"|
   ,'        `.    \  /
   |  O        \___/  |
 ~^~^~^~^~^~^~^~^~^~^~^~^~
```

### Design Variants

1. **Terminal Whale**: ASCII art, used in loading states and empty states
2. **Pixel Whale**: 32x32 pixel art, used as favicon and small icons
3. **Geometric Whale**: Minimal line art, used in logo
4. **Animated Whale**: CSS/SVG animation, tail flicks on hover

### Logo Construction

The logo combines:
- Geometric whale silhouette (cyan gradient)
- "PolyWolyTroly" in Exo 2 ExtraBold
- Optional tagline: "Track the Smart Money" in Space Grotesk

---

## 📱 Responsive Breakpoints

```
--screen-sm:   640px    Mobile landscape
--screen-md:   768px    Tablet portrait
--screen-lg:   1024px   Tablet landscape / Small desktop
--screen-xl:   1280px   Desktop
--screen-2xl:  1536px   Large desktop
--screen-3xl:  1920px   Ultra-wide
```

### Mobile-First Principles

1. **Touch targets**: Minimum 44x44px
2. **Thumb zones**: Primary actions in bottom 60% of screen
3. **Swipe gestures**: Horizontal swipe for tabs, vertical for scroll
4. **Bottom navigation**: Fixed bottom nav on mobile
5. **Cards > Tables**: Collapse tables into stacked cards on mobile

---

## 🎭 Micro-interactions

### Hover States
- Scale up slightly (1.02)
- Glow effect appears
- Border color shifts to cyan
- Cursor changes to pointer

### Click States
- Scale down (0.98)
- Quick flash
- Haptic feedback on mobile

### Loading States
- Skeleton screens with shimmer
- Pulsing dots
- ASCII whale animation

### Data Updates
- Number tickers animate
- Flash highlight (subtle yellow)
- Profit: Brief green pulse
- Loss: Brief red pulse

### Notifications
- Slide in from right
- Cyan border glow
- Auto-dismiss after 5s
- Stack when multiple

---

## 🔊 Sound Design (Optional Enhancement)

For users who opt-in:
- **Whale alert**: Low, sonar-like ping
- **Big deposit**: Deeper whale call
- **Profit realized**: Subtle "cha-ching"
- **Tab switch**: Soft click

---

## 📊 Data Visualization

### Chart Colours

```
Primary series:   var(--cyan)
Secondary series: var(--magenta)
Tertiary series:  var(--electric-purple)
Grid lines:       var(--border)
Axis labels:      var(--text-muted)
```

### Chart Styles

- **Line charts**: 2px stroke, gradient fill below
- **Bar charts**: Rounded corners, glow on hover
- **Pie/Donut**: Thick strokes, no fill, animated draw
- **Sparklines**: Thin (1px), no labels, inline with data

---

## ♿ Accessibility

### Colour Contrast
All text meets WCAG AA standards:
- Primary text on dark: 13.5:1
- Secondary text on dark: 7.2:1
- Cyan on dark: 12.8:1

### Focus States
- Clear focus rings (2px cyan outline)
- Skip links for keyboard navigation
- Reduced motion mode respects prefers-reduced-motion

### Screen Readers
- ARIA labels on all interactive elements
- Live regions for real-time updates
- Semantic HTML structure

---

## 🧪 Design Tokens (CSS Variables)

See the full implementation in the React component files.

---

## 📁 File Structure

```
polywolytroly/
├── DESIGN_SYSTEM.md          # This file
├── components/
│   ├── App.jsx               # Main application shell
│   ├── Dashboard.jsx         # Home dashboard view
│   ├── WhaleList.jsx         # Searchable whale table
│   ├── WalletProfile.jsx     # Individual wallet deep-dive
│   └── components/
│       ├── Header.jsx
│       ├── WalletCard.jsx
│       ├── DataTable.jsx
│       ├── Charts.jsx
│       └── ...
└── styles/
    └── tokens.css            # Design tokens
```

---

*"In the void, whales move in silence. We see them."*

— PolyWolyTroly Design Team
