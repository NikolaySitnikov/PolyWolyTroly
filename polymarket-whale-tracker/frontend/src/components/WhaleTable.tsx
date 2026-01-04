/**
 * WhaleTable Component
 *
 * Displays a list of tracked whale wallets.
 * Desktop: Table view with sortable columns
 * Mobile: Card stack view
 *
 * Design: Based on App.jsx reference from design expert
 */

import { useState, useMemo } from 'react';
import { tokens } from '../styles/tokens';
import { formatUSD } from '../utils/formatters';
import type { Whale, WhaleSortField, SortDirection } from '../types/whale';

interface WhaleTableProps {
  whales: Whale[];
  isMobile: boolean;
  onWhaleClick: (address: string) => void;
}

/**
 * Shorten an Ethereum address for display
 * Format: 0x1234...5678
 */
function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format a date as relative time or date string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function WhaleTable({ whales, isMobile, onWhaleClick }: WhaleTableProps) {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<WhaleSortField>('totalDeposited');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Filter and sort whales
  const sortedWhales = useMemo(() => {
    return [...whales]
      .filter((w) => w.address.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => {
        const mult = sortDir === 'desc' ? -1 : 1;
        switch (sortBy) {
          case 'totalDeposited':
            return (a.totalDeposited - b.totalDeposited) * mult;
          case 'depositCount':
            return (a.depositCount - b.depositCount) * mult;
          case 'firstSeenAt':
            return (new Date(a.firstSeenAt).getTime() - new Date(b.firstSeenAt).getTime()) * mult;
          default:
            return 0;
        }
      });
  }, [whales, filter, sortBy, sortDir]);

  // Handle column header click for sorting
  const handleSort = (field: WhaleSortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  // Empty state
  if (whales.length === 0) {
    return (
      <div
        data-testid="whale-table"
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: tokens.colors.surface,
        }}
      >
        <pre
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '10px',
            lineHeight: 1.2,
            color: tokens.colors.cyan,
            textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
            margin: '0 0 24px 0',
          }}
        >
{`        .
       ":"
     ___:____     |"\\/"|
   ,'        \`.    \\  /
   |  O        \\___/  |
 ~^~^~^~^~^~^~^~^~^~^~^~^~`}
        </pre>
        <div
          style={{
            fontFamily: tokens.fonts.display,
            fontSize: '24px',
            color: tokens.colors.textPrimary,
            marginBottom: '8px',
          }}
        >
          No whales tracked yet
        </div>
        <p
          style={{
            fontFamily: tokens.fonts.body,
            color: tokens.colors.textSecondary,
          }}
        >
          Whales will appear here once deposits are detected
        </p>
      </div>
    );
  }

  // No search results
  if (sortedWhales.length === 0 && filter) {
    return (
      <div
        data-testid="whale-table"
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: tokens.colors.surface,
        }}
      >
        {/* Search bar */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${tokens.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ color: tokens.colors.textMuted }}>🔍</span>
          {/* Search input container - keeps clear button close to text */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              maxWidth: '300px',
              flex: '0 1 300px',
            }}
          >
            <input
              type="text"
              placeholder="Search by address..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: tokens.fonts.body,
                fontSize: '14px',
                color: tokens.colors.textPrimary,
                minWidth: 0,
              }}
            />
            {filter && (
              <button
                onClick={() => setFilter('')}
                aria-label="Clear search"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: tokens.colors.textMuted,
                  fontSize: '16px',
                  lineHeight: 1,
                  borderRadius: '4px',
                  transition: 'color 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = tokens.colors.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = tokens.colors.textMuted;
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: tokens.colors.textSecondary,
          }}
        >
          No whales found matching "{filter}"
        </div>
      </div>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div
        data-testid="whale-table"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: tokens.colors.surface,
        }}
      >
        {/* Search */}
        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ color: tokens.colors.textMuted }}>🔍</span>
          <input
            type="text"
            placeholder="Search whales..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: tokens.fonts.body,
              fontSize: '14px',
              color: tokens.colors.textPrimary,
            }}
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              aria-label="Clear search"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 8px',
                cursor: 'pointer',
                color: tokens.colors.textMuted,
                fontSize: '18px',
                lineHeight: 1,
                borderRadius: '4px',
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Cards */}
        {sortedWhales.map((whale, i) => (
          <div
            key={whale.address}
            data-testid={`whale-card-${whale.address}`}
            onClick={() => onWhaleClick(whale.address)}
            style={{
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              animation: `fadeInUp 0.4s ${i * 0.05}s both cubic-bezier(0.16, 1, 0.3, 1)`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: `linear-gradient(135deg, ${tokens.colors.cyan}30, ${tokens.colors.magenta}30)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  🐋
                </div>
                <div
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: '11px',
                    color: tokens.colors.cyan,
                  }}
                >
                  {shortenAddress(whale.address)}
                </div>
              </div>
              <span
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: '11px',
                  color: tokens.colors.textMuted,
                }}
              >
                {formatDate(whale.firstSeenAt)}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    color: tokens.colors.textMuted,
                    marginBottom: '2px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Total Deposited
                </div>
                <div
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: '14px',
                    color: tokens.colors.profit,
                    fontWeight: 500,
                  }}
                >
                  {formatUSD(whale.totalDeposited)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    color: tokens.colors.textMuted,
                    marginBottom: '2px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Deposits
                </div>
                <div
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: '14px',
                    color: tokens.colors.textPrimary,
                  }}
                >
                  {whale.depositCount}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div
      data-testid="whale-table"
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: tokens.colors.surface,
      }}
    >
      {/* Search bar */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${tokens.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span style={{ color: tokens.colors.textMuted }}>🔍</span>
        {/* Search input container - keeps clear button close to text */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            maxWidth: '300px',
            flex: '0 1 300px',
          }}
        >
          <input
            type="text"
            placeholder="Search by address..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: tokens.fonts.body,
              fontSize: '14px',
              color: tokens.colors.textPrimary,
              minWidth: 0,
            }}
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              aria-label="Clear search"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 8px',
                cursor: 'pointer',
                color: tokens.colors.textMuted,
                fontSize: '16px',
                lineHeight: 1,
                borderRadius: '4px',
                transition: 'color 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = tokens.colors.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = tokens.colors.textMuted;
              }}
            >
              ×
            </button>
          )}
        </div>
        {/* Spacer to push whale count to the right */}
        <div style={{ flex: 1 }} />
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: `${tokens.colors.cyan}15`,
            border: `1px solid ${tokens.colors.cyan}`,
            borderRadius: '999px',
            fontSize: '12px',
            fontFamily: tokens.fonts.mono,
            fontWeight: 500,
            color: tokens.colors.cyan,
          }}
        >
          {sortedWhales.length} whales
        </span>
      </div>

      {/* Table */}
      <div>
        <table role="table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: tokens.colors.void }}>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '10px',
                  fontWeight: 500,
                  color: tokens.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  whiteSpace: 'nowrap',
                  width: '35%',
                }}
              >
                Wallet
              </th>
              <th
                data-testid="sort-totalDeposited"
                onClick={() => handleSort('totalDeposited')}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '10px',
                  fontWeight: 500,
                  color: sortBy === 'totalDeposited' ? tokens.colors.cyan : tokens.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  width: '25%',
                }}
              >
                Total Deposited {sortBy === 'totalDeposited' && (sortDir === 'desc' ? '↓' : '↑')}
              </th>
              <th
                data-testid="sort-depositCount"
                onClick={() => handleSort('depositCount')}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '10px',
                  fontWeight: 500,
                  color: sortBy === 'depositCount' ? tokens.colors.cyan : tokens.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  width: '20%',
                }}
              >
                Deposits {sortBy === 'depositCount' && (sortDir === 'desc' ? '↓' : '↑')}
              </th>
              <th
                data-testid="sort-firstSeenAt"
                onClick={() => handleSort('firstSeenAt')}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '10px',
                  fontWeight: 500,
                  color: sortBy === 'firstSeenAt' ? tokens.colors.cyan : tokens.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  width: '20%',
                }}
              >
                First Seen {sortBy === 'firstSeenAt' && (sortDir === 'desc' ? '↓' : '↑')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedWhales.map((whale, i) => (
              <tr
                key={whale.address}
                data-testid={`whale-row-${whale.address}`}
                onClick={() => onWhaleClick(whale.address)}
                style={{
                  borderBottom: `1px solid ${tokens.colors.border}`,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  animation: `fadeInUp 0.4s ${i * 0.03}s both cubic-bezier(0.16, 1, 0.3, 1)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = tokens.colors.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: `linear-gradient(135deg, ${tokens.colors.cyan}30, ${tokens.colors.magenta}30)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                      }}
                    >
                      🐋
                    </div>
                    <div
                      style={{
                        fontFamily: tokens.fonts.mono,
                        fontSize: '11px',
                        color: tokens.colors.cyan,
                      }}
                    >
                      {shortenAddress(whale.address)}
                    </div>
                  </div>
                </td>
                <td
                  style={{
                    padding: '14px 16px',
                    fontFamily: tokens.fonts.mono,
                    fontSize: '13px',
                    color: tokens.colors.profit,
                    fontWeight: 500,
                  }}
                >
                  {formatUSD(whale.totalDeposited)}
                </td>
                <td
                  style={{
                    padding: '14px 16px',
                    fontFamily: tokens.fonts.mono,
                    fontSize: '13px',
                    color: tokens.colors.textPrimary,
                  }}
                >
                  {whale.depositCount}
                </td>
                <td
                  style={{
                    padding: '14px 16px',
                    fontFamily: tokens.fonts.mono,
                    fontSize: '11px',
                    color: tokens.colors.textMuted,
                  }}
                >
                  {formatDate(whale.firstSeenAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
