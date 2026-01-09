/**
 * ActivityHistoryTable Component
 *
 * Desktop table view for displaying activity/transaction history.
 * Columns: Type, Market, Amount, Price, Value, Time
 * Includes filter pills for activity type filtering.
 *
 * @see Design docs/TRADING_FEATURES_DESIGN_GUIDE.md - Section 8
 */

import { useState, useMemo, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';
import { Pagination } from './Pagination';
import { Tooltip } from './Tooltip';
import {
  type Activity,
  type ActivityFilterOption,
  ACTIVITY_FILTER_OPTIONS,
} from '../types/activity';

type SortDirection = 'asc' | 'desc';
type ActivitySortField = 'timestamp' | 'usdcSize';

interface ActivityHistoryTableProps {
  /** Array of activities to display */
  activities: Activity[];
  /** Loading state */
  loading?: boolean;
  /** Items per page */
  itemsPerPage?: number;
  /** Current filter */
  filter?: ActivityFilterOption;
  /** Callback when filter changes */
  onFilterChange?: (filter: ActivityFilterOption) => void;
  /** Callback when an activity is clicked */
  onActivityClick?: (activity: Activity) => void;
  /** Whether live WebSocket is connected */
  liveConnected?: boolean;
  /** Number of new trades received via WebSocket */
  newTradesCount?: number;
}

const DEFAULT_ITEMS_PER_PAGE = 20;

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
 * Format timestamp as relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return diffSec <= 1 ? 'just now' : `${diffSec}s ago`;
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }
  if (diffDay < 30) {
    return `${diffDay}d ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Format transaction hash for display (truncate)
 */
function formatTxHash(hash: string): string {
  if (!hash) return '';
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

/**
 * Activity type badge component
 */
function ActivityTypeBadge({ activity }: { activity: Activity }) {
  const { config } = activity;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        background: config.bgColor,
        border: `1px solid ${config.color}30`,
        borderRadius: '6px',
        fontFamily: tokens.fonts.mono,
        fontSize: '11px',
        fontWeight: 600,
        color: config.color,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

/**
 * Live status indicator
 */
function LiveIndicator({ connected }: { connected: boolean }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        background: connected ? `${tokens.colors.profit}15` : `${tokens.colors.textMuted}10`,
        border: `1px solid ${connected ? tokens.colors.profit : tokens.colors.border}`,
        borderRadius: '12px',
        fontSize: '11px',
        fontFamily: tokens.fonts.mono,
        fontWeight: 500,
        color: connected ? tokens.colors.profit : tokens.colors.textMuted,
        whiteSpace: 'nowrap',
      }}
      title={connected ? 'Live updates active - new trades appear instantly' : 'Connecting to live feed...'}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: connected ? tokens.colors.profit : tokens.colors.textMuted,
          boxShadow: connected ? `0 0 8px ${tokens.colors.profit}` : 'none',
          animation: connected ? 'pulse 2s ease-in-out infinite' : 'none',
        }}
      />
      {connected ? 'LIVE' : 'Connecting...'}
    </div>
  );
}

/**
 * Filter pills component
 */
function FilterPills({
  activeFilter,
  onChange,
  liveConnected,
}: {
  activeFilter: ActivityFilterOption;
  onChange: (filter: ActivityFilterOption) => void;
  liveConnected?: boolean;
}) {
  const filters: ActivityFilterOption[] = ['all', 'trades', 'buys', 'sells'];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '12px 16px',
        borderBottom: `1px solid ${tokens.colors.border}`,
        background: tokens.colors.void,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <div style={{ display: 'flex', gap: '8px' }}>
      {filters.map((filter) => {
        const isActive = activeFilter === filter;
        const config = ACTIVITY_FILTER_OPTIONS[filter];

        return (
          <button
            key={filter}
            type="button"
            onClick={() => onChange(filter)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: isActive ? `${tokens.colors.cyan}15` : 'transparent',
              border: `1px solid ${isActive ? tokens.colors.cyan : tokens.colors.border}`,
              borderRadius: '8px',
              fontFamily: tokens.fonts.body,
              fontSize: '13px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? tokens.colors.cyan : tokens.colors.textSecondary,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {config.label}
          </button>
        );
      })}
      </div>
      {liveConnected !== undefined && (
        <LiveIndicator connected={liveConnected} />
      )}
    </div>
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
  field: ActivitySortField;
  currentField: ActivitySortField;
  currentDir: SortDirection;
  onSort: (field: ActivitySortField) => void;
  align?: 'left' | 'right';
}) {
  const isActive = currentField === field;

  return (
    <th
      style={{
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
      }}
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
    padding: '14px 16px',
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
        <div style={{ ...skeletonStyle, width: '80px' }} />
      </td>
      <td style={cellStyle}>
        <div style={{ ...skeletonStyle, width: '200px' }} />
      </td>
      <td style={cellStyle}>
        <div style={{ ...skeletonStyle, width: '80px' }} />
      </td>
      <td style={cellStyle}>
        <div style={{ ...skeletonStyle, width: '50px' }} />
      </td>
      <td style={cellStyle}>
        <div style={{ ...skeletonStyle, width: '60px' }} />
      </td>
      <td style={cellStyle}>
        <div style={{ ...skeletonStyle, width: '60px' }} />
      </td>
    </tr>
  );
}

/**
 * Sort activities by field
 */
function sortActivities(
  activities: Activity[],
  field: ActivitySortField,
  direction: SortDirection
): Activity[] {
  return [...activities].sort((a, b) => {
    let comparison = 0;

    if (field === 'timestamp') {
      comparison = a.timestamp - b.timestamp;
    } else if (field === 'usdcSize') {
      comparison = (a.usdcSize ?? 0) - (b.usdcSize ?? 0);
    }

    return direction === 'desc' ? -comparison : comparison;
  });
}

/**
 * ActivityHistoryTable - Desktop table for displaying activity history
 */
export function ActivityHistoryTable({
  activities,
  loading = false,
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  filter: externalFilter,
  onFilterChange,
  onActivityClick,
  liveConnected,
  newTradesCount,
}: ActivityHistoryTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<ActivitySortField>('timestamp');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [internalFilter, setInternalFilter] = useState<ActivityFilterOption>('all');

  // Use external filter if provided
  const filter = externalFilter ?? internalFilter;
  const handleFilterChange = onFilterChange ?? setInternalFilter;

  // Reset to page 1 when activities or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activities.length, filter]);

  // Sort activities
  const sortedActivities = useMemo(() => {
    return sortActivities(activities, sortField, sortDir);
  }, [activities, sortField, sortDir]);

  // Paginate activities
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedActivities.slice(start, start + itemsPerPage);
  }, [sortedActivities, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(activities.length / itemsPerPage);

  // Handle sort
  const handleSort = (field: ActivitySortField) => {
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
    overflow: 'hidden',
  };

  const tableStyle: CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  };

  const rowStyle: CSSProperties = {
    borderBottom: `1px solid ${tokens.colors.border}`,
    cursor: onActivityClick ? 'pointer' : 'default',
    transition: 'background 0.15s ease',
  };

  const cellStyle: CSSProperties = {
    padding: '14px 16px',
    fontFamily: tokens.fonts.body,
    fontSize: '13px',
    color: tokens.colors.textPrimary,
    verticalAlign: 'middle',
  };

  // Empty state
  if (!loading && activities.length === 0) {
    return (
      <div style={containerStyle} data-testid="activity-table-empty">
        <FilterPills activeFilter={filter} onChange={handleFilterChange} liveConnected={liveConnected} />
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
            📜
          </div>
          <div
            style={{
              fontFamily: tokens.fonts.display,
              fontSize: '18px',
              color: tokens.colors.textPrimary,
              marginBottom: '8px',
            }}
          >
            No activity found
          </div>
          <p
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: '14px',
              color: tokens.colors.textSecondary,
              margin: 0,
            }}
          >
            {filter === 'all'
              ? 'This whale has no transaction history yet'
              : `No ${ACTIVITY_FILTER_OPTIONS[filter].label.toLowerCase()} found`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} data-testid="activity-history-table">
      {/* Filter Pills */}
      <FilterPills activeFilter={filter} onChange={handleFilterChange} liveConnected={liveConnected} />

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${tokens.colors.border}`, background: tokens.colors.void }}>
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
                  width: '12%',
                }}
              >
                Type
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
                  width: '30%',
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
                  width: '15%',
                }}
              >
                Amount
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
                Price
              </th>
              <SortableHeader
                label="Value"
                field="usdcSize"
                currentField={sortField}
                currentDir={sortDir}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                label="Time"
                field="timestamp"
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
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : (
              paginatedActivities.map((activity, index) => {
                const isTradeActivity = activity.normalizedType === 'buy' || activity.normalizedType === 'sell';
                const hasMarket = Boolean(activity.title);
                // Create stable unique key using multiple fields + index
                // Index is needed because same tx can have multiple activities (batch redemptions)
                const uniqueKey = `${activity.timestamp}-${activity.transactionHash || ''}-${activity.conditionId || ''}-${index}`;

                return (
                  <tr
                    key={uniqueKey}
                    data-testid={`activity-row-${activity.timestamp}`}
                    style={rowStyle}
                    onClick={() => onActivityClick?.(activity)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = tokens.colors.surfaceHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Type */}
                    <td style={{ ...cellStyle, width: '12%' }}>
                      <ActivityTypeBadge activity={activity} />
                    </td>

                    {/* Market */}
                    <td style={{ ...cellStyle, width: '30%' }}>
                      {hasMarket ? (
                        <TruncatedText text={activity.title!} />
                      ) : (
                        <span style={{ color: tokens.colors.textMuted }}>—</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td style={{ ...cellStyle, width: '15%' }}>
                      {isTradeActivity && activity.size ? (
                        <span
                          style={{
                            fontFamily: tokens.fonts.mono,
                            color: activity.config.color,
                          }}
                        >
                          {activity.size.toLocaleString()}{' '}
                          <span style={{ opacity: 0.8 }}>
                            {activity.outcome?.toUpperCase() || 'shares'}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: tokens.colors.textMuted }}>—</span>
                      )}
                    </td>

                    {/* Price */}
                    <td
                      style={{
                        ...cellStyle,
                        textAlign: 'right',
                        fontFamily: tokens.fonts.mono,
                        color: tokens.colors.textSecondary,
                        width: '10%',
                      }}
                    >
                      {activity.price ? formatPrice(activity.price) : '—'}
                    </td>

                    {/* Value */}
                    <td
                      style={{
                        ...cellStyle,
                        textAlign: 'right',
                        fontFamily: tokens.fonts.mono,
                        fontWeight: 600,
                        color: activity.config.color,
                        width: '13%',
                      }}
                    >
                      {activity.usdcSize ? (
                        <>
                          {activity.normalizedType === 'deposit' && '+'}
                          {activity.normalizedType === 'withdrawal' && '-'}
                          {formatUSD(activity.usdcSize)}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Time */}
                    <td
                      style={{
                        ...cellStyle,
                        textAlign: 'right',
                        width: '10%',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: '2px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: tokens.fonts.mono,
                            fontSize: '12px',
                            color: tokens.colors.textSecondary,
                          }}
                        >
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                        {activity.transactionHash && (
                          <a
                            href={`https://polygonscan.com/tx/${activity.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              fontFamily: tokens.fonts.mono,
                              fontSize: '10px',
                              color: tokens.colors.textMuted,
                              textDecoration: 'none',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = tokens.colors.cyan;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = tokens.colors.textMuted;
                            }}
                          >
                            {formatTxHash(activity.transactionHash)} ↗
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {activities.length > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={activities.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          entityName="activities"
        />
      )}
    </div>
  );
}
