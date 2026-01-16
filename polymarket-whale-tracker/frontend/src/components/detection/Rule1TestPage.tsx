/**
 * Rule #1 Live Mode Page
 *
 * Real-time view of Rule #1: Fresh-Concentrated-Depth Impact
 * Shows live CTF transfers as they flow through with Rule #1 evaluation.
 *
 * Features:
 * - Live transaction feed via WebSocket
 * - Adjustable thresholds that affect live evaluation
 * - Real alerts created when Rule #1 triggers
 *
 * Access: #debug-rule1
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { tokens } from '../../styles/tokens';
import { GlowText } from '../GlowText';

interface Rule1Thresholds {
  maxWalletAgeDays: number;
  minConcentrationPct: number;
  minTradeSizeUsd: number;
  minDepthRatio: number;
}

interface Rule1LiveEvaluation {
  txHash: string;
  walletAddress: string;
  conditionId: string | null;
  tokenId: string;
  amount: string;
  outcome?: 'YES' | 'NO';
  blockNumber: number;
  timestamp: string;
  tradeSizeUsd: number;
  marketQuestion?: string;
  evaluated: boolean;
  triggered: boolean;
  checks: {
    tradeSize: { passed: boolean; value: number; threshold: number };
    walletAge: { passed: boolean; value: number | null; threshold: number };
    concentration: { passed: boolean; value: number; threshold: number };
    depthRatio: { passed: boolean; value: number | null; threshold: number };
  };
  confidence?: number;
  severity?: string;
  alertId?: number;
  reason?: string;
}

interface LiveStatus {
  ctfListenerRunning: boolean;
  ctfListenerHealthy: boolean;
  detectionEnabled: boolean;
  transfersProcessed: number;
  evaluationsProcessed: number;
  alertsTriggered: number;
  rule1Enabled: boolean;
  thresholds: Rule1Thresholds;
}

interface Props {
  isMobile: boolean;
}

const DEFAULT_THRESHOLDS: Rule1Thresholds = {
  maxWalletAgeDays: 14,
  minConcentrationPct: 85,
  minTradeSizeUsd: 3000,
  minDepthRatio: 3.0,
};

// Get API URL from env or derive from current host
function getApiUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return `http://${window.location.hostname}:3002`;
}

// Get WebSocket URL from API URL
function getWsUrl(): string {
  const apiUrl = getApiUrl();
  return apiUrl.replace(/^http/, 'ws');
}

// Filter options for minimum checks passed
type FilterOption = 'all' | '2plus' | '3plus';

export function Rule1TestPage({ isMobile }: Props) {
  // Live status
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [thresholds, setThresholds] = useState<Rule1Thresholds>(DEFAULT_THRESHOLDS);
  const [enabled, setEnabled] = useState(false);

  // Live feed
  const [evaluations, setEvaluations] = useState<Rule1LiveEvaluation[]>([]);
  const [connected, setConnected] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Filter: show transactions with minimum checks passed (radio buttons)
  const [filterOption, setFilterOption] = useState<FilterOption>('3plus');
  // Ref to access current filter in WebSocket handler
  const filterOptionRef = useRef<FilterOption>(filterOption);
  filterOptionRef.current = filterOption;

  // Clear evaluations when filter changes (they're filtered at storage time)
  const handleFilterChange = (newFilter: FilterOption) => {
    if (newFilter !== filterOption) {
      setEvaluations([]); // Clear since stored items may not match new filter
      setFilterOption(newFilter);
    }
  };

  // Track if thresholds have been initialized from server
  const thresholdsInitialized = useRef(false);

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);

  // Helper to count checks passed
  const countChecksPassed = (e: Rule1LiveEvaluation): number => {
    return [
      e.checks.tradeSize.passed,
      e.checks.walletAge.passed,
      e.checks.concentration.passed,
      e.checks.depthRatio.passed,
    ].filter(Boolean).length;
  };

  // Helper to check if evaluation matches current filter
  const matchesFilter = (e: Rule1LiveEvaluation, filter: FilterOption): boolean => {
    if (filter === 'all') return true;
    const checksCount = countChecksPassed(e);
    if (filter === '2plus') return checksCount >= 2;
    if (filter === '3plus') return checksCount >= 3;
    return true;
  };

  // Fetch initial status
  const fetchStatus = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/detection/rule1-live/status`);
      if (response.ok) {
        const data: LiveStatus = await response.json();
        setStatus(data);
        // Only set thresholds on initial load to avoid overwriting user's local changes
        if (!thresholdsInitialized.current) {
          setThresholds(data.thresholds);
          thresholdsInitialized.current = true;
        }
        setEnabled(data.rule1Enabled && data.detectionEnabled);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  }, []);

  // Update thresholds on server
  const updateThresholds = useCallback(async (newThresholds: Rule1Thresholds) => {
    setUpdating(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/detection/rule1-live/thresholds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newThresholds),
      });
      if (response.ok) {
        setThresholds(newThresholds);
      }
    } catch (err) {
      console.error('Failed to update thresholds:', err);
    } finally {
      setUpdating(false);
    }
  }, []);

  // Toggle enabled state
  const toggleEnabled = useCallback(async () => {
    setUpdating(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/detection/rule1-live/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (response.ok) {
        setEnabled(!enabled);
        // Refresh status
        await fetchStatus();
      }
    } catch (err) {
      console.error('Failed to toggle enabled:', err);
    } finally {
      setUpdating(false);
    }
  }, [enabled, fetchStatus]);

  // Fetch status on mount and periodically (every 5 seconds for live updates)
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Connect to WebSocket (separate effect, runs once on mount)
  useEffect(() => {
    const wsUrl = getWsUrl();
    console.log('[Rule1TestPage] Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Rule1TestPage] WebSocket connected');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'rule1_live_evaluation') {
          const evaluation: Rule1LiveEvaluation = message.data;

          // Only store if it matches the current filter
          const currentFilter = filterOptionRef.current;
          if (matchesFilter(evaluation, currentFilter)) {
            setEvaluations((prev) => {
              // Keep max 100 matching evaluations
              const updated = [evaluation, ...prev].slice(0, 100);
              return updated;
            });
          }

          // Note: Don't increment local counters - they sync from server via polling
          // This prevents counter jumps when local increments get overwritten by server values
        }
      } catch (err) {
        console.error('[Rule1TestPage] Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = (event) => {
      console.log('[Rule1TestPage] WebSocket closed:', event.code, event.reason);
      setConnected(false);
    };

    ws.onerror = (err) => {
      console.error('[Rule1TestPage] WebSocket error:', err);
      setConnected(false);
    };

    return () => {
      console.log('[Rule1TestPage] Cleaning up WebSocket');
      ws.close();
    };
  }, []); // Empty dependency array - only run once on mount

  // Debounced threshold update
  const handleThresholdChange = useCallback(
    (key: keyof Rule1Thresholds, value: number) => {
      const newThresholds = { ...thresholds, [key]: value };
      setThresholds(newThresholds);
      // Debounce the API call
      const timer = setTimeout(() => {
        updateThresholds(newThresholds);
      }, 500);
      return () => clearTimeout(timer);
    },
    [thresholds, updateThresholds]
  );

  // Slider styles
  const sliderContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const sliderValueStyle: React.CSSProperties = {
    minWidth: '70px',
    textAlign: 'right',
    fontFamily: tokens.fonts.mono,
    fontSize: tokens.fontSizes.base,
    color: tokens.colors.cyan,
    fontWeight: 600,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontFamily: tokens.fonts.body,
    fontSize: tokens.fontSizes.xs,
    color: tokens.colors.textSecondary,
    fontWeight: 500,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: tokens.spacing[4] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1
              style={{
                fontFamily: tokens.fonts.display,
                fontSize: isMobile ? tokens.fontSizes.xl : tokens.fontSizes['2xl'],
                fontWeight: tokens.fontWeights.extrabold,
                color: tokens.colors.textPrimary,
                marginBottom: tokens.spacing[1],
                letterSpacing: '-0.02em',
              }}
            >
              Rule #1 <GlowText>Live Mode</GlowText>
            </h1>
            <p
              style={{
                fontFamily: tokens.fonts.body,
                fontSize: tokens.fontSizes.xs,
                color: tokens.colors.textSecondary,
              }}
            >
              Fresh-Concentrated-Depth Impact - Real-Time Evaluation
            </p>
          </div>

          {/* Connection status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: connected ? `${tokens.colors.profit}20` : `${tokens.colors.loss}20`,
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: connected ? tokens.colors.profit : tokens.colors.loss,
                animation: connected ? 'pulse 2s infinite' : 'none',
              }}
            />
            <span
              style={{
                fontSize: tokens.fontSizes.xs,
                fontWeight: 500,
                color: connected ? tokens.colors.profit : tokens.colors.loss,
              }}
            >
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Controls Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
          gap: tokens.spacing[4],
          marginBottom: tokens.spacing[4],
        }}
      >
        {/* Thresholds Panel */}
        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            padding: tokens.spacing[4],
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[3] }}>
            <h2
              style={{
                fontFamily: tokens.fonts.display,
                fontSize: tokens.fontSizes.base,
                color: tokens.colors.textPrimary,
              }}
            >
              Thresholds
            </h2>
            {updating && (
              <span style={{ fontSize: tokens.fontSizes.xs, color: tokens.colors.cyan }}>
                Updating...
              </span>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: tokens.spacing[3],
            }}
          >
            {/* Wallet Age */}
            <div>
              <label style={labelStyle}>Max Wallet Age (days)</label>
              <div style={sliderContainerStyle}>
                <input
                  type="range"
                  min={1}
                  max={90}
                  value={thresholds.maxWalletAgeDays}
                  onChange={(e) => handleThresholdChange('maxWalletAgeDays', Number(e.target.value))}
                  style={{ flex: 1, cursor: 'pointer' }}
                />
                <span style={sliderValueStyle}>{thresholds.maxWalletAgeDays}d</span>
              </div>
            </div>

            {/* Concentration */}
            <div>
              <label style={labelStyle}>Min Concentration (%)</label>
              <div style={sliderContainerStyle}>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={thresholds.minConcentrationPct}
                  onChange={(e) => handleThresholdChange('minConcentrationPct', Number(e.target.value))}
                  style={{ flex: 1, cursor: 'pointer' }}
                />
                <span style={sliderValueStyle}>{thresholds.minConcentrationPct}%</span>
              </div>
            </div>

            {/* Trade Size */}
            <div>
              <label style={labelStyle}>Min Trade Size (USD)</label>
              <div style={sliderContainerStyle}>
                <input
                  type="range"
                  min={100}
                  max={50000}
                  step={100}
                  value={thresholds.minTradeSizeUsd}
                  onChange={(e) => handleThresholdChange('minTradeSizeUsd', Number(e.target.value))}
                  style={{ flex: 1, cursor: 'pointer' }}
                />
                <span style={sliderValueStyle}>${thresholds.minTradeSizeUsd >= 1000 ? `${(thresholds.minTradeSizeUsd / 1000).toFixed(0)}k` : thresholds.minTradeSizeUsd}</span>
              </div>
            </div>

            {/* Depth Ratio */}
            <div>
              <label style={labelStyle}>Min Depth Ratio (x)</label>
              <div style={sliderContainerStyle}>
                <input
                  type="range"
                  min={0.1}
                  max={20}
                  step={0.1}
                  value={thresholds.minDepthRatio}
                  onChange={(e) => handleThresholdChange('minDepthRatio', Number(e.target.value))}
                  style={{ flex: 1, cursor: 'pointer' }}
                />
                <span style={sliderValueStyle}>{thresholds.minDepthRatio.toFixed(1)}x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enable/Disable Panel */}
        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${enabled ? tokens.colors.profit : tokens.colors.border}`,
            borderRadius: '12px',
            padding: tokens.spacing[4],
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '180px',
          }}
        >
          <div
            style={{
              marginBottom: tokens.spacing[3],
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                marginBottom: tokens.spacing[1],
              }}
            >
              {enabled ? '🟢' : '🔴'}
            </div>
            <div
              style={{
                fontFamily: tokens.fonts.display,
                fontSize: tokens.fontSizes.lg,
                fontWeight: 700,
                color: enabled ? tokens.colors.profit : tokens.colors.loss,
              }}
            >
              {enabled ? 'LIVE' : 'OFF'}
            </div>
          </div>
          <button
            onClick={toggleEnabled}
            disabled={updating}
            style={{
              padding: '10px 24px',
              background: enabled ? tokens.colors.loss : tokens.colors.profit,
              border: 'none',
              borderRadius: '8px',
              fontFamily: tokens.fonts.body,
              fontSize: tokens.fontSizes.sm,
              fontWeight: 600,
              color: tokens.colors.void,
              cursor: updating ? 'not-allowed' : 'pointer',
              opacity: updating ? 0.5 : 1,
            }}
          >
            {enabled ? 'Disable' : 'Enable'}
          </button>
          {status && (
            <div style={{ marginTop: tokens.spacing[2], textAlign: 'center' }}>
              <div style={{ fontSize: tokens.fontSizes.xs, color: tokens.colors.textMuted }}>
                Alerts: {status.alertsTriggered}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      {status && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: tokens.spacing[3],
            marginBottom: tokens.spacing[4],
          }}
        >
          <StatCard
            label="CTF Listener"
            value={status.ctfListenerHealthy ? 'Healthy' : 'Unhealthy'}
            color={status.ctfListenerHealthy ? tokens.colors.profit : tokens.colors.loss}
          />
          <StatCard label="Transfers" value={status.transfersProcessed.toLocaleString()} color={tokens.colors.cyan} />
          <StatCard label="Evaluations" value={status.evaluationsProcessed.toLocaleString()} color={tokens.colors.cyan} />
          <StatCard
            label="Alerts"
            value={status.alertsTriggered.toString()}
            color={status.alertsTriggered > 0 ? tokens.colors.loss : tokens.colors.textSecondary}
            onClick={() => { window.location.hash = '#detection'; }}
          />
        </div>
      )}

      {/* Live Feed */}
      <div
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '12px',
          padding: tokens.spacing[4],
        }}
      >
        {(() => {
          // Evaluations are already filtered at storage time, so just use them directly
          const displayedEvaluations = evaluations;

          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[3] }}>
                <h2
                  style={{
                    fontFamily: tokens.fonts.display,
                    fontSize: tokens.fontSizes.base,
                    color: tokens.colors.textPrimary,
                  }}
                >
                  Live Transaction Feed
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
                  {/* Filter radio buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        fontSize: tokens.fontSizes.xs,
                        color: filterOption === 'all' ? tokens.colors.cyan : tokens.colors.textSecondary,
                      }}
                    >
                      <input
                        type="radio"
                        name="filterOption"
                        value="all"
                        checked={filterOption === 'all'}
                        onChange={() => handleFilterChange('all')}
                        style={{ cursor: 'pointer' }}
                      />
                      All
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        fontSize: tokens.fontSizes.xs,
                        color: filterOption === '2plus' ? tokens.colors.cyan : tokens.colors.textSecondary,
                      }}
                    >
                      <input
                        type="radio"
                        name="filterOption"
                        value="2plus"
                        checked={filterOption === '2plus'}
                        onChange={() => handleFilterChange('2plus')}
                        style={{ cursor: 'pointer' }}
                      />
                      2/4+
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        fontSize: tokens.fontSizes.xs,
                        color: filterOption === '3plus' ? tokens.colors.cyan : tokens.colors.textSecondary,
                      }}
                    >
                      <input
                        type="radio"
                        name="filterOption"
                        value="3plus"
                        checked={filterOption === '3plus'}
                        onChange={() => handleFilterChange('3plus')}
                        style={{ cursor: 'pointer' }}
                      />
                      3/4+
                    </label>
                  </div>
                  <span style={{ fontSize: tokens.fontSizes.xs, color: tokens.colors.textMuted }}>
                    {displayedEvaluations.length} / 100
                  </span>
                </div>
              </div>

              {!enabled && (
                <div
                  style={{
                    padding: tokens.spacing[6],
                    textAlign: 'center',
                    color: tokens.colors.textMuted,
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: tokens.spacing[2] }}>⏸️</div>
                  <div style={{ fontSize: tokens.fontSizes.lg, fontWeight: 600, marginBottom: tokens.spacing[1] }}>
                    Detection is paused
                  </div>
                  <div style={{ fontSize: tokens.fontSizes.sm }}>
                    Click "Enable" above to start receiving live Rule #1 evaluations
                  </div>
                </div>
              )}

              {enabled && displayedEvaluations.length === 0 && (
                <div
                  style={{
                    padding: tokens.spacing[6],
                    textAlign: 'center',
                    color: tokens.colors.textMuted,
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: tokens.spacing[2], animation: 'pulse 2s infinite' }}>👀</div>
                  <div style={{ fontSize: tokens.fontSizes.lg, fontWeight: 600, marginBottom: tokens.spacing[1] }}>
                    {filterOption !== 'all' ? 'Waiting for matching transactions...' : 'Waiting for transactions...'}
                  </div>
                  <div style={{ fontSize: tokens.fontSizes.sm }}>
                    {filterOption === '3plus'
                      ? 'Transactions with 3+ checks passing will appear here'
                      : filterOption === '2plus'
                      ? 'Transactions with 2+ checks passing will appear here'
                      : 'CTF transfers will appear here as they\'re processed'}
                  </div>
                </div>
              )}

              {displayedEvaluations.length > 0 && (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {displayedEvaluations.map((evaluation, index) => (
                    <EvaluationRow key={`${evaluation.txHash}-${index}`} evaluation={evaluation} isMobile={isMobile} />
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* CSS animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
}

// Stat card component
interface StatCardProps {
  label: string;
  value: string;
  color: string;
  onClick?: () => void;
}

function StatCard({ label, value, color, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: tokens.colors.void,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '8px',
        padding: tokens.spacing[3],
        textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default',
        transition: onClick ? 'border-color 0.2s, transform 0.1s' : 'none',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = tokens.colors.border;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      <div style={{ fontSize: tokens.fontSizes.xs, color: tokens.colors.textMuted, marginBottom: '4px' }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: tokens.fontSizes.lg,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </div>
      {onClick && (
        <div style={{ fontSize: '10px', color: tokens.colors.textMuted, marginTop: '4px' }}>
          Click to view
        </div>
      )}
    </div>
  );
}

// Evaluation row component
interface EvaluationRowProps {
  evaluation: Rule1LiveEvaluation;
  isMobile: boolean;
}

function EvaluationRow({ evaluation, isMobile }: EvaluationRowProps) {
  const [expanded, setExpanded] = useState(false);

  const checksCount = [
    evaluation.checks.tradeSize.passed,
    evaluation.checks.walletAge.passed,
    evaluation.checks.concentration.passed,
    evaluation.checks.depthRatio.passed,
  ].filter(Boolean).length;

  return (
    <div
      style={{
        borderBottom: `1px solid ${tokens.colors.border}`,
        padding: tokens.spacing[3],
        cursor: 'pointer',
        background: evaluation.triggered ? `${tokens.colors.loss}10` : 'transparent',
        transition: 'background 0.2s',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
        {/* Status icon */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: evaluation.triggered
              ? `${tokens.colors.loss}30`
              : checksCount >= 3
              ? `${tokens.colors.warning}30`
              : `${tokens.colors.textMuted}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            flexShrink: 0,
          }}
        >
          {evaluation.triggered ? '🚨' : checksCount >= 3 ? '⚠️' : '✓'}
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: tokens.fontSizes.sm,
                color: tokens.colors.textPrimary,
              }}
            >
              {evaluation.walletAddress.slice(0, 6)}...{evaluation.walletAddress.slice(-4)}
            </span>
            {evaluation.triggered && (
              <span
                style={{
                  padding: '2px 6px',
                  background: tokens.colors.loss,
                  color: tokens.colors.void,
                  borderRadius: '4px',
                  fontSize: tokens.fontSizes.xs,
                  fontWeight: 700,
                }}
              >
                ALERT
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: tokens.fontSizes.xs,
              color: tokens.colors.textMuted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {evaluation.marketQuestion || evaluation.conditionId?.slice(0, 20) || 'Unknown market'}
          </div>
        </div>

        {/* Trade size */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: tokens.fontSizes.sm,
              fontWeight: 600,
              color: evaluation.tradeSizeUsd >= evaluation.checks.tradeSize.threshold
                ? tokens.colors.profit
                : tokens.colors.textSecondary,
            }}
          >
            ${evaluation.tradeSizeUsd >= 1000
              ? `${(evaluation.tradeSizeUsd / 1000).toFixed(1)}k`
              : evaluation.tradeSizeUsd.toFixed(0)}
          </div>
          <div style={{ fontSize: tokens.fontSizes.xs, color: tokens.colors.textMuted }}>
            {checksCount}/4 checks
          </div>
        </div>

        {/* Expand icon */}
        <div style={{ color: tokens.colors.textMuted, fontSize: tokens.fontSizes.sm }}>
          {expanded ? '▼' : '▶'}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: tokens.spacing[3], paddingTop: tokens.spacing[3], borderTop: `1px solid ${tokens.colors.border}` }}>
          {/* Check cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: tokens.spacing[2],
              marginBottom: tokens.spacing[3],
            }}
          >
            <MiniCheckCard
              label="Trade"
              passed={evaluation.checks.tradeSize.passed}
              value={`$${evaluation.checks.tradeSize.value >= 1000 ? `${(evaluation.checks.tradeSize.value / 1000).toFixed(1)}k` : evaluation.checks.tradeSize.value.toFixed(0)}`}
              threshold={`$${evaluation.checks.tradeSize.threshold >= 1000 ? `${(evaluation.checks.tradeSize.threshold / 1000).toFixed(0)}k` : evaluation.checks.tradeSize.threshold}`}
            />
            <MiniCheckCard
              label="Age"
              passed={evaluation.checks.walletAge.passed}
              value={evaluation.checks.walletAge.value !== null ? `${evaluation.checks.walletAge.value}d` : 'New'}
              threshold={`≤${evaluation.checks.walletAge.threshold}d`}
            />
            <MiniCheckCard
              label="Conc."
              passed={evaluation.checks.concentration.passed}
              value={`${evaluation.checks.concentration.value.toFixed(0)}%`}
              threshold={`≥${evaluation.checks.concentration.threshold}%`}
            />
            <MiniCheckCard
              label="Depth"
              passed={evaluation.checks.depthRatio.passed}
              value={evaluation.checks.depthRatio.value !== null ? `${evaluation.checks.depthRatio.value.toFixed(1)}x` : 'N/A'}
              threshold={`≥${evaluation.checks.depthRatio.threshold.toFixed(1)}x`}
            />
          </div>

          {/* Additional info */}
          <div
            style={{
              display: 'flex',
              gap: tokens.spacing[4],
              fontSize: tokens.fontSizes.xs,
              color: tokens.colors.textMuted,
            }}
          >
            <span>
              Block: {evaluation.blockNumber}
            </span>
            <span>
              Tx: {evaluation.txHash.slice(0, 10)}...
            </span>
            {evaluation.alertId && (
              <span style={{ color: tokens.colors.loss }}>
                Alert #{evaluation.alertId}
              </span>
            )}
            {evaluation.reason && (
              <span style={{ color: tokens.colors.textSecondary }}>
                {evaluation.reason}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Mini check card for expanded view
interface MiniCheckCardProps {
  label: string;
  passed: boolean;
  value: string;
  threshold: string;
}

function MiniCheckCard({ label, passed, value, threshold }: MiniCheckCardProps) {
  return (
    <div
      style={{
        padding: '8px',
        background: passed ? `${tokens.colors.profit}15` : `${tokens.colors.loss}15`,
        borderRadius: '6px',
        border: `1px solid ${passed ? `${tokens.colors.profit}40` : `${tokens.colors.loss}40`}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: tokens.fontSizes.xs, color: tokens.colors.textSecondary }}>{label}</span>
        <span style={{ fontSize: '10px' }}>{passed ? '✓' : '✗'}</span>
      </div>
      <div
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: tokens.fontSizes.sm,
          fontWeight: 600,
          color: passed ? tokens.colors.profit : tokens.colors.loss,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '10px', color: tokens.colors.textMuted }}>{threshold}</div>
    </div>
  );
}
