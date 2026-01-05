# Mobile Card Consistency Guide

## Overview

This document describes the unified mobile card system implemented across the PolyWolyTroly app. It exists to prevent UI inconsistencies between similar components and to provide a reference for future development.

**Created:** January 4, 2026
**Related files:**
- `frontend/src/styles/cardStyles.ts` - Shared card styles and utilities
- `frontend/src/components/WhaleTable.tsx` - Whale cards
- `frontend/src/components/AlertFeed.tsx` - Alert cards

---

## The Problem (What We Fixed)

Before this update, the WhaleTable and AlertFeed components had inconsistent mobile card designs:

| Element | WhaleTable (Before) | AlertFeed (Before) | Problem |
|---------|---------------------|-------------------|---------|
| **Hover glow** | Cyan border + translateY + boxShadow | None | Missing from Alerts |
| **Arrow indicator** | None | Had `→` | Inconsistent affordance |
| **Time format** | "Today", "Yesterday", "3d ago" | "2m ago", "1h ago" | Different formats |
| **Header context** | Sort pills + count badge | Filter pill only | Missing count badge |
| **Stats layout** | 2-col grid with labels | Single prominent amount | Different hierarchy |
| **Icon size** | 42px | 40px | Slightly different |

---

## The Solution: Unified Mobile Card System

### Core Principles

1. **One card pattern** - All cards share the same structural bones
2. **Contextual content** - What changes is the data, not the chrome
3. **Consistent interactions** - Same hover, touch, animation everywhere
4. **Unified time format** - Human-friendly relative dates
5. **No redundant indicators** - If it's clickable, it's clickable. No arrows.

### Card Structure

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌──────┐   0x1234...5678                      Today       │
│   │ ICON │   (address in cyan)           (time in muted)    │
│   │ 42px │                                                  │
│   └──────┘                                                  │
│                                                             │
│   ┌─────────────────────┐  ┌─────────────────────┐          │
│   │ LABEL (uppercase)   │  │ LABEL (uppercase)   │          │
│   │ VALUE (17px, bold)  │  │ VALUE (17px, bold)  │          │
│   └─────────────────────┘  └─────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Shared Specifications

| Property | Value | Notes |
|----------|-------|-------|
| Card border-radius | 14px | Consistent across all cards |
| Card padding | 16px | Standard spacing |
| Icon size | 42px x 42px | With 12px border-radius |
| Icon glow | `boxShadow: 0 0 20px {glowColor}` | Contextual color |
| Address font-size | 13px | Mono font, cyan color |
| Address text-shadow | `0 0 10px {cyanGlow}` | Subtle glow effect |
| Time pill background | `{void}80` | Semi-transparent |
| Time pill font-size | 11px | Mono font, muted color |
| Stat label font-size | 10px | Uppercase, 0.08em letter-spacing |
| Stat value font-size | 17px | Bold, mono font |
| Stats grid | 2 columns, 16px gap | Always two columns |

### Interaction States

**Touch (mobile):**
- `onTouchStart`: `transform: scale(0.98)`, `background: surfaceHover`
- `onTouchEnd`: Reset to normal

**Hover (desktop with hover capability):**
- `onMouseEnter`: `transform: translateY(-2px)`, cyan border, box-shadow glow
- `onMouseLeave`: Reset to normal

**Animation:**
- New items use `scaleIn` animation (0.4s cubic-bezier)
- `onAnimationEnd`: Clear animation to prevent re-triggering

---

## Unified Time Formatting

All cards use `formatCardTime()` from `cardStyles.ts`:

```typescript
// Under 1 minute: "Just now"
// Under 1 hour: "Xm ago"
// Same day: "Xh ago"
// Yesterday: "Yesterday"
// This week: "Xd ago"
// Older: "Mon DD" format
```

**Why this format?**
- Human-friendly (not "1705420800000")
- Consistent across all card types
- Appropriate granularity for each time range

---

## Header Consistency

Both WhaleTable and AlertFeed mobile headers should have:

1. **Left side:** Icon + Title (e.g., "🐋 Whales" or "⚡ Alerts")
2. **Right side:** Count badge (with glow) + optional Live indicator
3. **Search bar:** Same styling, same focus glow
4. **Context pills:** Sort pills for Whales, filter indicator for Alerts

---

## Implementation Checklist

When creating a new mobile card component, verify:

- [ ] Uses 14px border-radius
- [ ] Uses 16px padding
- [ ] Icon is 42x42px with 12px border-radius and glow
- [ ] Address is 13px mono, cyan with text-shadow
- [ ] Time pill uses `formatCardTime()` and pill styling
- [ ] Stats use 2-column grid with 10px uppercase labels
- [ ] Stat values are 17px bold mono
- [ ] Touch handlers for scale(0.98) feedback
- [ ] Hover handlers for translateY(-2px) + glow (desktop only)
- [ ] Animation end handler to clear animation
- [ ] No redundant arrow indicators
- [ ] Header has count badge with glow

---

## Files Changed (January 4, 2026)

1. **Created:** `frontend/src/styles/cardStyles.ts`
   - `formatCardTime()` - unified time formatting
   - `mobileCardStyles` - shared style objects
   - `getCardInteractionHandlers()` - unified event handlers

2. **Updated:** `frontend/src/components/AlertFeed.tsx`
   - Added hover glow effect (onMouseEnter/onMouseLeave)
   - Removed arrow indicator (→)
   - Changed to 2-column stats grid
   - Updated to use `formatCardTime()`
   - Added count badge in header
   - Icon size changed 40px → 42px

3. **Updated:** `frontend/src/components/WhaleTable.tsx`
   - Updated to import and use `formatCardTime()`
   - Removed local `formatDate()` function

---

## Lessons Learned

1. **Create shared utilities first** - When building similar components, extract common patterns to shared files upfront.

2. **Document design decisions** - This guide exists because inconsistencies crept in over time. Document patterns as you create them.

3. **Visual audit across components** - Periodically compare similar components side-by-side to catch drift.

4. **Interaction consistency matters** - Users expect the same tap/hover behavior across similar elements.

5. **Time formatting is a UX detail** - Inconsistent time formats create cognitive load. Pick one format and stick to it.
