/**
 * FilterPills Component
 *
 * A row of pill-shaped filter buttons for filtering whale data.
 * Supports multiple active filters (stackable) with visual indicators.
 *
 * Filters:
 * - All: Show all whales (clears other filters)
 * - Profitable: Only whales with positive P&L (green dot)
 * - Losing: Only whales with negative P&L (red dot)
 * - Live: Only whales active in last 24h (pulsing green dot)
 *
 * Design matches existing sort pills for consistency.
 */

import { tokens } from '../styles/tokens';

/** Available filter types */
export type WhaleFilter = 'all' | 'profitable' | 'losing' | 'live';

interface FilterPillsProps {
  /** Currently active filters */
  activeFilters: WhaleFilter[];
  /** Callback when filters change */
  onChange: (filters: WhaleFilter[]) => void;
  /** Optional className for container */
  className?: string;
}

/** Filter configuration with label and indicator color */
const FILTER_CONFIG: Record<WhaleFilter, { label: string; dotColor?: string; pulsing?: boolean }> = {
  all: { label: 'All' },
  profitable: { label: 'Profitable', dotColor: tokens.colors.profit },
  losing: { label: 'Losing', dotColor: tokens.colors.loss },
  live: { label: 'Live', dotColor: tokens.colors.live, pulsing: true },
};

/**
 * Indicator dot component for filter pills
 */
function FilterDot({ color, pulsing = false }: { color: string; pulsing?: boolean }) {
  return (
    <span
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: color,
        animation: pulsing ? 'livePulse 2s ease-in-out infinite' : undefined,
        boxShadow: `0 0 6px ${color}`,
      }}
    />
  );
}

export function FilterPills({ activeFilters, onChange, className }: FilterPillsProps) {
  const handleFilterClick = (filter: WhaleFilter) => {
    if (filter === 'all') {
      // "All" clears all other filters
      onChange(['all']);
      return;
    }

    // Remove 'all' if selecting a specific filter
    let newFilters: WhaleFilter[] = activeFilters.filter(f => f !== 'all');

    if (newFilters.includes(filter)) {
      // Remove filter if already active
      newFilters = newFilters.filter(f => f !== filter);
      // If no filters left, default to 'all'
      if (newFilters.length === 0) {
        newFilters = ['all'];
      }
    } else {
      // Profitable and Losing are mutually exclusive
      // (can't be both profitable AND losing at the same time)
      if (filter === 'profitable') {
        newFilters = newFilters.filter(f => f !== 'losing');
      } else if (filter === 'losing') {
        newFilters = newFilters.filter(f => f !== 'profitable');
      }
      // Add the new filter
      newFilters = [...newFilters, filter];
    }

    onChange(newFilters);
  };

  const filters: WhaleFilter[] = ['all', 'profitable', 'losing', 'live'];

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
        marginBottom: '-4px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {filters.map((filter) => {
        const config = FILTER_CONFIG[filter];
        const isActive = activeFilters.includes(filter);

        return (
          <button
            key={filter}
            onClick={() => handleFilterClick(filter)}
            data-testid={`filter-pill-${filter}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: isActive ? `${tokens.colors.cyan}20` : tokens.colors.surface,
              border: `1px solid ${isActive ? tokens.colors.cyan : tokens.colors.border}`,
              borderRadius: '20px',
              fontFamily: tokens.fonts.body,
              fontSize: '12px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? tokens.colors.cyan : tokens.colors.textSecondary,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              boxShadow: isActive ? `0 0 12px ${tokens.colors.cyanGlow}` : 'none',
              minHeight: '36px',
              flexShrink: 0,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {config.dotColor && (
              <FilterDot color={config.dotColor} pulsing={config.pulsing} />
            )}
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
