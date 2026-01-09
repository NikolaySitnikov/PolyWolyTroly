/**
 * PositionsTable Component
 *
 * Desktop table view for displaying trading positions.
 * Columns: Market, Position, Size, Avg Price, Current, P&L
 *
 * @see Design docs/TRADING_FEATURES_DESIGN_GUIDE.md - Section 7
 */

import { useState, useMemo, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';
import { Pagination } from './Pagination';
import { Tooltip } from './Tooltip';
import { CategoryTag, inferCategory, getSportEmoji, type MarketCategory } from './CategoryTag';
import type { Position, PositionSortField } from '../types/position';
import { sortPositions } from '../types/position';

type SortDirection = 'asc' | 'desc';

/**
 * Size display mode - toggle between dollar value and shares count
 */
export type SizeDisplayMode = 'value' | 'shares';

interface PositionsTableProps {
  /** Array of positions to display */
  positions: Position[];
  /** Loading state */
  loading?: boolean;
  /** Items per page */
  itemsPerPage?: number;
  /** Callback when a position is clicked */
  onPositionClick?: (position: Position) => void;
  /** Size display mode - controlled externally for cross-component sync */
  sizeDisplayMode?: SizeDisplayMode;
  /** Callback to toggle size display mode */
  onSizeToggle?: () => void;
}

const DEFAULT_ITEMS_PER_PAGE = 10;

/**
 * TruncatedText - Shows styled tooltip only when text is actually truncated
 */
function TruncatedText({ text, style }: { text: string; style?: CSSProperties }) {
  const textRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const checkTruncation = useCallback(() => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    checkTruncation();
    // Re-check on resize
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [checkTruncation, text]);

  const textElement = (
    <div
      ref={textRef}
      style={{
        fontWeight: 500,
        lineHeight: 1.4,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {text}
    </div>
  );

  if (isTruncated) {
    return (
      <Tooltip content={text} placement="top" variant="title">
        {textElement}
      </Tooltip>
    );
  }

  return textElement;
}

/**
 * Format a number as USD with K/M suffix
 */
function formatUSD(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  }
  return `$${num.toFixed(0)}`;
}

/**
 * Format price as cents (0-1 -> 0-100)
 */
function formatPrice(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

/**
 * Format P&L with + prefix for positive
 */
function formatPnl(pnl: number): string {
  if (pnl === 0) return '$0';
  const formatted = formatUSD(Math.abs(pnl));
  return pnl > 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Get P&L color based on value
 */
function getPnlColor(pnl: number): string {
  if (pnl > 0) return tokens.colors.profit;
  if (pnl < 0) return tokens.colors.loss;
  return tokens.colors.neutral;
}

/**
 * Get outcome color based on the type of outcome
 * - Yes/Over outcomes → Green
 * - No/Under outcomes → Red
 * - Team names and other outcomes → Gold (warm accent)
 */
function getOutcomeColor(outcome: string): string {
  const normalized = outcome?.toUpperCase()?.trim() || '';

  // Yes/Over outcomes → Green
  if (normalized === 'YES' || normalized === 'OVER') {
    return tokens.colors.profit;
  }

  // No/Under outcomes → Red
  if (normalized === 'NO' || normalized === 'UNDER') {
    return tokens.colors.loss;
  }

  // All other outcomes (team names, player names, etc.) → Gold accent
  return '#f59e0b'; // Amber/gold color for team names etc.
}

/**
 * Outcome badge component - supports all outcome types
 * (Yes, No, Over, Under, team names, etc.)
 */
function OutcomeBadge({ outcome }: { outcome: string }) {
  const color = getOutcomeColor(outcome);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        background: `${color}15`,
        border: `1px solid ${color}40`,
        borderRadius: '4px',
        fontFamily: tokens.fonts.mono,
        fontSize: '11px',
        fontWeight: 600,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {outcome}
    </span>
  );
}

/**
 * Status indicator dot
 * Uses a larger hit area (16x16) for easier hover/touch while keeping visual dot small (6x6)
 */
function StatusDot({ status }: { status: 'active' | 'redeemable' }) {
  const config = {
    active: { color: tokens.colors.live, label: 'Active - Market is live' },
    redeemable: { color: tokens.colors.purple, label: 'Redeemable - Claim your winnings' },
  };

  const { color, label } = config[status];

  return (
    <Tooltip content={label} placement="top">
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          marginLeft: '4px',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </span>
    </Tooltip>
  );
}

/**
 * Sortable column header
 */
function SortableHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
  align = 'left',
}: {
  label: string;
  field: PositionSortField;
  currentField: PositionSortField;
  currentDir: SortDirection;
  onSort: (field: PositionSortField) => void;
  align?: 'left' | 'right';
}) {
  const isActive = currentField === field;

  const headerStyle: CSSProperties = {
    padding: '12px 16px',
    fontFamily: tokens.fonts.mono,
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: isActive ? tokens.colors.cyan : tokens.colors.textMuted,
    cursor: 'pointer',
    textAlign: align,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    transition: 'color 0.15s ease',
  };

  return (
    <th
      style={headerStyle}
      onClick={() => onSort(field)}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = tokens.colors.textPrimary;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = tokens.colors.textMuted;
        }
      }}
    >
      {label}
      {isActive && (
        <span style={{ marginLeft: '4px' }}>{currentDir === 'desc' ? '↓' : '↑'}</span>
      )}
    </th>
  );
}

/**
 * Loading skeleton row
 */
function SkeletonRow() {
  const cellStyle: CSSProperties = {
    padding: '16px',
  };

  const skeletonStyle: CSSProperties = {
    height: '16px',
    background: `linear-gradient(90deg, ${tokens.colors.surface} 25%, ${tokens.colors.surfaceHover} 50%, ${tokens.colors.surface} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '4px',
  };

  return (
    <tr>
      <td style={cellStyle}>
        <div style={{ ...skeletonStyle, width: '200px' }} />
      </td>
      <td style={cellStyle}>
        <div style={{ ...skeletonStyle, width: '40px' }} />
      </td>
      <td style={cellStyle}>
        <div style={{ ...skeletonStyle, width: '60px' }} />
      </td>
      <td style={cellStyle}>
        <div style={{ ...skeletonStyle, width: '40px' }} />
      </td>
      <td style={cellStyle}>
        <div style={{ ...skeletonStyle, width: '40px' }} />
      </td>
      <td style={cellStyle}>
        <div style={{ ...skeletonStyle, width: '60px' }} />
      </td>
    </tr>
  );
}

/**
 * Format shares count with K/M suffix
 */
function formatShares(shares: number): string {
  if (shares >= 1000000) {
    return `${(shares / 1000000).toFixed(2)}M`;
  }
  if (shares >= 1000) {
    return `${(shares / 1000).toFixed(1)}K`;
  }
  return shares.toFixed(1);
}

/**
 * Size cell component - shows $ value or shares
 * On hover (desktop): shows the alternate value with elegant crossfade
 * On click: toggles the display mode globally
 *
 * Design philosophy: The hover preview should feel like a subtle reveal,
 * not a jarring change. A small delay prevents accidental reveals, and
 * the crossfade animation makes the transition feel intentional and polished.
 */
function SizeCell({
  currentValue,
  shares,
  displayMode,
  onToggle,
  cellStyle,
}: {
  currentValue: number;
  shares: number;
  displayMode: SizeDisplayMode;
  onToggle: () => void;
  cellStyle: CSSProperties;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [showAlternate, setShowAlternate] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Primary value (what the mode dictates)
  const primaryText = displayMode === 'value'
    ? formatUSD(currentValue)
    : formatShares(shares);

  // Alternate value (shown on hover as preview)
  const alternateText = displayMode === 'value'
    ? formatShares(shares)
    : formatUSD(currentValue);

  // Handle hover with delay - prevents jarring flashes on accidental hovers
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    // Small delay before showing alternate value
    hoverTimeoutRef.current = setTimeout(() => {
      setShowAlternate(true);
    }, 150); // 150ms feels intentional but not sluggish
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    // Clear any pending timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowAlternate(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <td
      style={{
        ...cellStyle,
        textAlign: 'right',
        fontFamily: tokens.fonts.mono,
        width: '12%',
        cursor: 'pointer',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Crossfade container - both values exist, opacity controls visibility */}
      <span style={{ position: 'relative', display: 'inline-block' }}>
        {/* Primary value - fades out on hover */}
        <span
          style={{
            display: 'inline-block',
            color: tokens.colors.textPrimary,
            transition: 'opacity 0.2s ease-in-out',
            opacity: showAlternate ? 0 : 1,
          }}
        >
          {primaryText}
        </span>
        {/* Alternate value - fades in on hover, positioned over primary */}
        <span
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            display: 'inline-block',
            color: tokens.colors.textPrimary,
            transition: 'opacity 0.2s ease-in-out',
            opacity: showAlternate ? 1 : 0,
            pointerEvents: 'none',
          }}
        >
          {alternateText}
        </span>
      </span>
    </td>
  );
}

/**
 * PositionsTable - Desktop table for displaying positions
 */
export function PositionsTable({
  positions,
  loading = false,
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  onPositionClick,
  sizeDisplayMode: externalSizeMode,
  onSizeToggle: externalOnToggle,
}: PositionsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<PositionSortField>('pnl');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [internalSizeMode, setInternalSizeMode] = useState<SizeDisplayMode>('value');

  // Use external state if provided, otherwise use internal state
  const sizeDisplayMode = externalSizeMode ?? internalSizeMode;
  const toggleSizeDisplayMode = externalOnToggle ?? (() => setInternalSizeMode((prev) => (prev === 'value' ? 'shares' : 'value')));

  // Reset to page 1 when positions array changes (e.g., due to filtering)
  // This ensures the table properly re-renders with the new data
  useEffect(() => {
    setCurrentPage(1);
  }, [positions.length]);

  // Sort positions - use 'size' field when in shares mode and sorting by currentValue
  const sortedPositions = useMemo(() => {
    const effectiveSortField =
      sortField === 'currentValue' && sizeDisplayMode === 'shares'
        ? 'size'
        : sortField;
    return sortPositions(positions, effectiveSortField, sortDir);
  }, [positions, sortField, sortDir, sizeDisplayMode]);

  // Paginate positions
  const paginatedPositions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedPositions.slice(start, start + itemsPerPage);
  }, [sortedPositions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(positions.length / itemsPerPage);

  // Handle sort
  const handleSort = (field: PositionSortField) => {
    if (field === sortField) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Table styles - no border radius since it's inside tab panel
  const containerStyle: CSSProperties = {
    background: tokens.colors.surface,
    border: `1px solid ${tokens.colors.border}`,
    overflow: 'hidden',
  };

  const tableStyle: CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  };

  const rowStyle: CSSProperties = {
    borderBottom: `1px solid ${tokens.colors.border}`,
    cursor: onPositionClick ? 'pointer' : 'default',
    transition: 'background 0.15s ease',
  };

  const cellStyle: CSSProperties = {
    padding: '16px',
    fontFamily: tokens.fonts.body,
    fontSize: '13px',
    color: tokens.colors.textPrimary,
    verticalAlign: 'middle',
  };

  // Empty state
  if (!loading && positions.length === 0) {
    return (
      <div style={containerStyle} data-testid="positions-table-empty">
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '32px',
              marginBottom: '16px',
            }}
          >
            📊
          </div>
          <div
            style={{
              fontFamily: tokens.fonts.display,
              fontSize: '18px',
              color: tokens.colors.textPrimary,
              marginBottom: '8px',
            }}
          >
            No positions found
          </div>
          <p
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: '14px',
              color: tokens.colors.textSecondary,
              margin: 0,
            }}
          >
            This whale hasn't opened any positions yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} data-testid="positions-table">
      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${tokens.colors.border}`, background: tokens.colors.void }}>
              <SortableHeader
                label="Market"
                field="title"
                currentField={sortField}
                currentDir={sortDir}
                onSort={handleSort}
                align="left"
              />
              <th
                style={{
                  padding: '12px 16px',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: tokens.colors.textMuted,
                  textAlign: 'left',
                  width: '10%',
                }}
              >
                Position
              </th>
              {/* Size header - clickable to toggle between $ value and shares */}
              <th
                style={{
                  padding: '12px 16px',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: sortField === 'currentValue' ? tokens.colors.cyan : tokens.colors.textMuted,
                  textAlign: 'right',
                  width: '12%',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'color 0.15s ease',
                }}
                onClick={(e) => {
                  // Shift+click or just click toggles display mode
                  // Regular click also sorts
                  if (e.shiftKey) {
                    toggleSizeDisplayMode();
                  } else {
                    handleSort('currentValue');
                  }
                }}
                onContextMenu={(e) => {
                  // Right-click toggles display mode
                  e.preventDefault();
                  toggleSizeDisplayMode();
                }}
                onMouseEnter={(e) => {
                  if (sortField !== 'currentValue') {
                    e.currentTarget.style.color = tokens.colors.textPrimary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (sortField !== 'currentValue') {
                    e.currentTarget.style.color = tokens.colors.textMuted;
                  }
                }}
                title={`Click to sort, right-click or Shift+click to toggle ${sizeDisplayMode === 'value' ? 'shares' : 'value'}`}
              >
                {sizeDisplayMode === 'value' ? 'Size' : 'Shares'}
                {sortField === 'currentValue' && (
                  <span style={{ marginLeft: '4px' }}>{sortDir === 'desc' ? '↓' : '↑'}</span>
                )}
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: tokens.colors.textMuted,
                  textAlign: 'right',
                  width: '10%',
                }}
              >
                Avg
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: tokens.colors.textMuted,
                  textAlign: 'right',
                  width: '10%',
                }}
              >
                Current
              </th>
              <SortableHeader
                label="P&L"
                field="pnl"
                currentField={sortField}
                currentDir={sortDir}
                onSort={handleSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : (
              paginatedPositions.map((position) => {
                const category: MarketCategory =
                  position.normalizedCategory || inferCategory(position.title);
                const pnlColor = getPnlColor(position.pnl);
                // Get sport-specific emoji for sports markets using seriesSlug from Gamma API
                const sportEmoji = category === 'sports' ? getSportEmoji(position.seriesSlug, position.title) : undefined;

                return (
                  <tr
                    key={position.asset}
                    data-testid={`position-row-${position.asset}`}
                    style={rowStyle}
                    onClick={() => onPositionClick?.(position)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = tokens.colors.surfaceHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Market */}
                    <td style={{ ...cellStyle, width: '35%' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CategoryTag category={category} size="small" iconOverride={sportEmoji} />
                          <StatusDot status={position.status} />
                        </div>
                        <TruncatedText text={position.title} />
                      </div>
                    </td>

                    {/* Position (YES/NO) */}
                    <td style={{ ...cellStyle, width: '10%' }}>
                      <OutcomeBadge outcome={position.normalizedOutcome} />
                    </td>

                    {/* Size - toggleable between $ value and shares */}
                    {/* Hover shows alternate value, click toggles permanently */}
                    <SizeCell
                      currentValue={position.currentValue}
                      shares={position.size}
                      displayMode={sizeDisplayMode}
                      onToggle={toggleSizeDisplayMode}
                      cellStyle={cellStyle}
                    />

                    {/* Avg Price */}
                    <td
                      style={{
                        ...cellStyle,
                        textAlign: 'right',
                        fontFamily: tokens.fonts.mono,
                        color: tokens.colors.textSecondary,
                        width: '10%',
                      }}
                    >
                      {formatPrice(position.avgPrice)}
                    </td>

                    {/* Current Price */}
                    <td
                      style={{
                        ...cellStyle,
                        textAlign: 'right',
                        fontFamily: tokens.fonts.mono,
                        width: '10%',
                      }}
                    >
                      {formatPrice(position.currentPrice)}
                    </td>

                    {/* P&L */}
                    <td
                      style={{
                        ...cellStyle,
                        textAlign: 'right',
                        fontFamily: tokens.fonts.mono,
                        fontWeight: 600,
                        color: pnlColor,
                        textShadow:
                          position.pnl !== 0
                            ? `0 0 8px ${position.pnl > 0 ? tokens.colors.profitGlow : tokens.colors.lossGlow}`
                            : 'none',
                        width: '13%',
                      }}
                    >
                      {formatPnl(position.pnl)}
                      {position.pnlPercent !== 0 && (
                        <span style={{ marginLeft: '4px', opacity: 0.8 }}>
                          ({position.pnlPercent > 0 ? '+' : ''}{position.pnlPercent.toFixed(1)}%)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {positions.length > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={positions.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          entityName="positions"
        />
      )}
    </div>
  );
}
