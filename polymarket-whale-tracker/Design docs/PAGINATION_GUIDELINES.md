# PolyWolyTroly Pagination & Data Loading Guidelines
## Component Specifications for Tables and Lists

---

## 📋 Overview & Recommendation

### When to Use What

| Component | Pattern | Reasoning |
|-----------|---------|-----------|
| **Whale Table** | Traditional Pagination | Users need precise control, want to see totals, may bookmark specific pages |
| **Alert Feed** | Infinite Scroll | Real-time stream, users scan chronologically, no need to "find" specific items |
| **Trade History** | Hybrid (Load More) | Finite dataset but benefits from progressive loading |
| **Position Tables** | No pagination | Typically < 20 items, show all |

---

## 🔢 Traditional Pagination Component

### Anatomy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   Showing 1-20 of 847 whales          ‹  1  2  3  ...  42  43  ›        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
     ↑                                       ↑
     Results summary                         Page controls
     (left-aligned)                          (right-aligned)
```

### Placement

- **Primary location**: Bottom of table, with 24px spacing from last row
- **Optional**: Duplicate at top for tables > 50 rows (improves UX for long tables)
- **Mobile**: Centered, stacked layout

---

## 🎨 Pagination Styling

### Container

```css
.pagination-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--surface);              /* #12121a */
  border-top: 1px solid var(--border);     /* #2a2a3a */
  border-radius: 0 0 12px 12px;            /* Matches table container */
}

/* Mobile: Stack vertically */
@media (max-width: 640px) {
  .pagination-container {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}
```

### Results Summary Text

```css
.pagination-summary {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-muted);                /* #555566 */
  letter-spacing: 0.02em;
}

.pagination-summary strong {
  color: var(--text-secondary);            /* #8888aa */
  font-weight: 500;
}
```

**Format**: `Showing 1-20 of 847 whales`
- Numbers in `<strong>` tags for emphasis
- Use entity name ("whales", "trades", "alerts")

### Page Controls Container

```css
.pagination-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}
```

---

## 🔘 Page Number Buttons

### Default State

```css
.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  
  background: transparent;
  border: 1px solid var(--border);         /* #2a2a3a */
  border-radius: 8px;
  
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);            /* #8888aa */
  
  cursor: pointer;
  transition: all 0.15s ease;
}
```

### Hover State

```css
.page-btn:hover {
  background: var(--surface-hover);        /* #1a1a24 */
  border-color: var(--cyan);               /* #00fff0 */
  color: var(--cyan);
  box-shadow: 0 0 15px var(--cyan-glow);   /* rgba(0,255,240,0.2) */
}
```

### Active/Current Page

```css
.page-btn.active {
  background: var(--cyan);                 /* #00fff0 */
  border-color: var(--cyan);
  color: var(--void);                      /* #0a0a0f */
  font-weight: 600;
  box-shadow: 0 0 20px var(--cyan-glow);
  
  /* Subtle pulse animation */
  animation: activePulse 2s ease-in-out infinite;
}

@keyframes activePulse {
  0%, 100% { box-shadow: 0 0 15px var(--cyan-glow); }
  50% { box-shadow: 0 0 25px var(--cyan-glow); }
}
```

### Disabled State (Prev on page 1, Next on last page)

```css
.page-btn:disabled {
  background: transparent;
  border-color: var(--border);
  color: var(--muted);                     /* #4a4a5a */
  cursor: not-allowed;
  opacity: 0.5;
}

.page-btn:disabled:hover {
  box-shadow: none;
  border-color: var(--border);
}
```

### Focus State (Keyboard Navigation)

```css
.page-btn:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 2px;
}
```

---

## ◀️ Previous / Next Buttons

### Arrow Design

Use chevron icons (not text) for cleaner look:

```css
.page-btn-nav {
  min-width: 40px;
  height: 36px;
  padding: 0 14px;
  
  /* Same base styles as page-btn */
  background: var(--surface);              /* #12121a - slightly elevated */
  border: 1px solid var(--border);
  border-radius: 8px;
  
  font-size: 14px;
  color: var(--text-secondary);
  
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  
  cursor: pointer;
  transition: all 0.15s ease;
}

.page-btn-nav:hover:not(:disabled) {
  background: var(--cyan);
  border-color: var(--cyan);
  color: var(--void);
  box-shadow: 0 0 20px var(--cyan-glow);
  
  /* Arrow animation */
  transform: translateX(var(--arrow-direction, 0));
}

.page-btn-nav.prev:hover:not(:disabled) {
  --arrow-direction: -2px;
}

.page-btn-nav.next:hover:not(:disabled) {
  --arrow-direction: 2px;
}
```

### Icon Specification

```
Previous: ‹ (single chevron) or « (double for first page)
Next: › (single chevron) or » (double for last page)

Alternative: Use Phosphor Icons
- CaretLeft / CaretRight (regular)
- CaretDoubleLeft / CaretDoubleRight (first/last)
```

---

## ⋯ Ellipsis (Truncation)

When there are many pages, truncate with ellipsis:

```css
.page-ellipsis {
  min-width: 36px;
  height: 36px;
  
  display: flex;
  align-items: center;
  justify-content: center;
  
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: var(--text-muted);
  letter-spacing: 0.1em;
  
  /* Not interactive */
  cursor: default;
}
```

### Truncation Logic

Show max 7 page indicators:

```
Pages 1-7:        1  2  3  4  5  6  7
Page 1 of 50:     1  2  3  ...  49  50
Page 4 of 50:     1  2  3  4  5  ...  50
Page 25 of 50:    1  ...  24  25  26  ...  50
Page 48 of 50:    1  ...  46  47  48  49  50
Page 50 of 50:    1  ...  46  47  48  49  50
```

---

## 📱 Mobile Pagination

### Simplified Layout

On mobile (< 640px), use a condensed format:

```
┌─────────────────────────────────────┐
│                                     │
│      ‹   Page 3 of 43   ›          │
│                                     │
│      Showing 41-60 of 847          │
│                                     │
└─────────────────────────────────────┘
```

```css
.pagination-mobile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.pagination-mobile-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pagination-mobile-current {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--text-primary);
}

.pagination-mobile-current span {
  color: var(--cyan);
  font-weight: 600;
}
```

### Touch Targets

- Minimum button size: 44x44px on mobile
- Increase padding to 16px horizontal
- Add larger touch area with `::before` pseudo-element if needed

---

## 📊 Page Size Selector (Optional)

For power users who want to control items per page:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   Show: [20 ▾]    Showing 1-20 of 847        ‹  1  2  3  ...  ›        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dropdown Styling

```css
.page-size-select {
  appearance: none;
  
  min-width: 70px;
  height: 32px;
  padding: 0 28px 0 12px;
  
  background: var(--surface);
  background-image: url("data:image/svg+xml,..."); /* Chevron icon */
  background-repeat: no-repeat;
  background-position: right 10px center;
  
  border: 1px solid var(--border);
  border-radius: 6px;
  
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-primary);
  
  cursor: pointer;
  transition: all 0.15s ease;
}

.page-size-select:hover {
  border-color: var(--cyan);
}

.page-size-select:focus {
  outline: none;
  border-color: var(--cyan);
  box-shadow: 0 0 0 2px var(--cyan-glow);
}
```

### Options

```
20 (default)
50
100
All (only if total < 500)
```

---

## 🔄 Infinite Scroll (Alert Feed Pattern)

For the Alert Feed and similar real-time streams:

### Loading Indicator

```css
.infinite-scroll-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-muted);
}

.infinite-scroll-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border);
  border-top-color: var(--cyan);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Loading Text Options

- "Scanning deeper..."
- "Loading more whales..."
- "Fetching alerts..."

### End of List

```css
.infinite-scroll-end {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  
  color: var(--text-muted);
  text-align: center;
}

.infinite-scroll-end-icon {
  font-size: 24px;
  opacity: 0.5;
}

.infinite-scroll-end-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 13px;
}
```

**End message**: "You've reached the bottom 🐋" or "No more alerts"

### Scroll Trigger

- Trigger load when user is 200px from bottom
- Show loading indicator immediately
- Disable trigger while loading (prevent duplicate requests)

---

## ➕ Load More Button (Hybrid Pattern)

For Trade History and similar bounded lists:

```css
.load-more-btn {
  width: 100%;
  padding: 14px 24px;
  margin-top: 16px;
  
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: 8px;
  
  font-family: 'Space Grotesk', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  
  cursor: pointer;
  transition: all 0.2s ease;
}

.load-more-btn:hover {
  background: var(--surface-hover);
  border-style: solid;
  border-color: var(--cyan);
  color: var(--cyan);
}

.load-more-btn:active {
  transform: scale(0.98);
}

/* Loading state */
.load-more-btn.loading {
  pointer-events: none;
  color: var(--text-muted);
}

.load-more-btn.loading::before {
  content: '';
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-right: 8px;
  border: 2px solid var(--border);
  border-top-color: var(--cyan);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  vertical-align: middle;
}
```

**Button text**: "Load 20 more trades" (show count)
**Loading text**: "Loading..."

---

## 🎯 Keyboard Navigation

### Tab Order

```
1. Previous button
2. Page numbers (in order)
3. Next button
4. Page size selector (if present)
```

### Arrow Key Support

When focus is on pagination:
- `←` Move to previous page button
- `→` Move to next page button
- `Enter` / `Space` Activate current button

```javascript
// Keyboard handler
handleKeyDown(e) {
  if (e.key === 'ArrowLeft') {
    this.goToPrevPage();
  } else if (e.key === 'ArrowRight') {
    this.goToNextPage();
  }
}
```

---

## ✨ Animation & Transitions

### Page Change

When changing pages, the table content should:

```css
/* Fade out current content */
.table-content.loading {
  opacity: 0.5;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

/* Fade in new content */
.table-content {
  opacity: 1;
  transition: opacity 0.2s ease;
}
```

### Button Press Feedback

```css
.page-btn:active {
  transform: scale(0.95);
  transition: transform 0.1s ease;
}
```

### Page Number Appearance (Optional Polish)

When page numbers change (e.g., scrolling through many pages):

```css
@keyframes pageNumberEnter {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.page-btn.entering {
  animation: pageNumberEnter 0.2s ease;
}
```

---

## 📐 Spacing Reference

```
Container padding:        16px 20px
Gap between page buttons: 4px
Gap between nav and pages: 8px
Ellipsis width:           36px
Page button min-width:    36px
Page button height:       36px
Nav button padding:       0 14px
Mobile button size:       44px (touch target)
```

---

## 🧩 React Component Example

```jsx
const Pagination = ({ 
  currentPage, 
  totalPages, 
  totalItems, 
  itemsPerPage,
  onPageChange 
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  const getPageNumbers = () => {
    // Truncation logic here
    // Returns array like [1, 2, 3, '...', 49, 50]
  };

  return (
    <div className="pagination-container">
      <div className="pagination-summary">
        Showing <strong>{startItem}-{endItem}</strong> of{' '}
        <strong>{totalItems}</strong> whales
      </div>
      
      <div className="pagination-controls">
        <button 
          className="page-btn-nav prev"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          ‹
        </button>
        
        {getPageNumbers().map((page, i) => (
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="page-ellipsis">...</span>
          ) : (
            <button
              key={page}
              className={`page-btn ${currentPage === page ? 'active' : ''}`}
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          )
        ))}
        
        <button 
          className="page-btn-nav next"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
};
```

---

## ♿ Accessibility Requirements

- [ ] `aria-label` on Prev/Next buttons
- [ ] `aria-current="page"` on active page
- [ ] `aria-disabled` mirrors `:disabled` state
- [ ] Live region announces page changes
- [ ] Focus management: maintain focus on pagination after page change
- [ ] Sufficient colour contrast (already met with cyan on dark)

```jsx
// Announce page changes to screen readers
<div aria-live="polite" aria-atomic="true" className="sr-only">
  Page {currentPage} of {totalPages}
</div>
```

---

*"Navigate the depths with precision."*

— PolyWolyTroly Design Team
