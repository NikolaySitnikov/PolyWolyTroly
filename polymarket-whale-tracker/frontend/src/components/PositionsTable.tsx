/**
 * PositionsTable Component
 *
 * Desktop table view for displaying trading positions.
 * Columns: Market, Position, Size, Avg Price, Current, P&L
 *
 * @see Design docs/TRADING_FEATURES_DESIGN_GUIDE.md - Section 7
 */

import { useState, useMemo, type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';
import { Pagination } from './Pagination';
import { CategoryTag, inferCategory, getSportEmoji, type MarketCategory } from './CategoryTag';
import type { Position, PositionSortField } from '../types/position';
import { sortPositions } from '../types/position';

type SortDirection = 'asc' | 'desc';

interface PositionsTableProps {
  /** Array of positions to display */
  positions: Position[];
  /** Loading state */
  loading?: boolean;
  /** Items per page */
  itemsPerPage?: number;
  /** Callback when a position is clicked */
  onPositionClick?: (position: Position) => void;
}

const DEFAULT_ITEMS_PER_PAGE = 10;

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
 * Outcome badge component (YES/NO)
 */
function OutcomeBadge({ outcome }: { outcome: 'YES' | 'NO' }) {
  const isYes = outcome === 'YES';
  const color = isYes ? tokens.colors.profit : tokens.colors.loss;

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
      }}
    >
      {outcome}
    </span>
  );
}

/**
 * Status indicator dot
 */
function StatusDot({ status }: { status: 'active' | 'resolved' | 'expired' }) {
  const config = {
    active: { color: tokens.colors.live, title: 'Active' },
    resolved: { color: tokens.colors.purple, title: 'Resolved' },
    expired: { color: tokens.colors.textMuted, title: 'Expired' },
  };

  const { color, title } = config[status];

  return (
    <span
      title={title}
      style={{
        display: 'inline-block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: color,
        boxShadow: status === 'active' ? `0 0 6px ${color}` : 'none',
        marginLeft: '8px',
      }}
    />
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
 * PositionsTable - Desktop table for displaying positions
 */
export function PositionsTable({
  positions,
  loading = false,
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  onPositionClick,
}: PositionsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<PositionSortField>('pnl');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Sort positions
  const sortedPositions = useMemo(() => {
    return sortPositions(positions, sortField, sortDir);
  }, [positions, sortField, sortDir]);

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

  // Table styles
  const containerStyle: CSSProperties = {
    background: tokens.colors.surface,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '12px',
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
            <tr style={{ borderBottom: `1px solid ${tokens.colors.border}` }}>
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
                  width: '35%',
                }}
              >
                Market
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
                  textAlign: 'left',
                  width: '10%',
                }}
              >
                Position
              </th>
              <SortableHeader
                label="Size"
                field="currentValue"
                currentField={sortField}
                currentDir={sortDir}
                onSort={handleSort}
                align="right"
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
                    key={position.conditionId}
                    data-testid={`position-row-${position.conditionId}`}
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
                        <div
                          style={{
                            fontWeight: 500,
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={position.title}
                        >
                          {position.title}
                        </div>
                      </div>
                    </td>

                    {/* Position (YES/NO) */}
                    <td style={{ ...cellStyle, width: '10%' }}>
                      <OutcomeBadge outcome={position.normalizedOutcome} />
                    </td>

                    {/* Size */}
                    <td
                      style={{
                        ...cellStyle,
                        textAlign: 'right',
                        fontFamily: tokens.fonts.mono,
                        width: '12%',
                      }}
                    >
                      {formatUSD(position.currentValue)}
                    </td>

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
          itemLabel="positions"
        />
      )}
    </div>
  );
}
