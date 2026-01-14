/**
 * PriceChart Component
 *
 * Displays price history as a simple line chart.
 * Used for showing MTM context and price movements around suspicious trades.
 */

import { tokens } from '../../styles/tokens';
import { Skeleton } from '../Skeleton';
import type { PriceHistoryPoint } from '../../types/detection';

interface PriceChartProps {
  prices: PriceHistoryPoint[];
  loading?: boolean;
  error?: string | null;
  height?: number;
  showLabels?: boolean;
  highlightTime?: Date;
  isMobile?: boolean;
}

/**
 * Calculate chart dimensions and scales
 */
function getChartMetrics(
  prices: PriceHistoryPoint[],
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number }
) {
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  if (prices.length === 0) {
    return {
      chartWidth,
      chartHeight,
      minPrice: 0,
      maxPrice: 1,
      minTime: 0,
      maxTime: 1,
      xScale: () => 0,
      yScale: () => 0,
    };
  }

  const priceValues = prices.map((p) => p.price);
  const timeValues = prices.map((p) => new Date(p.recordedAt).getTime());

  const minPrice = Math.min(...priceValues);
  const maxPrice = Math.max(...priceValues);
  const minTime = Math.min(...timeValues);
  const maxTime = Math.max(...timeValues);

  // Add 5% padding to price range
  const priceRange = maxPrice - minPrice || 0.1;
  const paddedMinPrice = Math.max(0, minPrice - priceRange * 0.05);
  const paddedMaxPrice = Math.min(1, maxPrice + priceRange * 0.05);

  const xScale = (time: number) => {
    if (maxTime === minTime) return chartWidth / 2;
    return ((time - minTime) / (maxTime - minTime)) * chartWidth;
  };

  const yScale = (price: number) => {
    if (paddedMaxPrice === paddedMinPrice) return chartHeight / 2;
    return chartHeight - ((price - paddedMinPrice) / (paddedMaxPrice - paddedMinPrice)) * chartHeight;
  };

  return {
    chartWidth,
    chartHeight,
    minPrice: paddedMinPrice,
    maxPrice: paddedMaxPrice,
    minTime,
    maxTime,
    xScale,
    yScale,
  };
}

/**
 * Generate SVG path for price line
 */
function generatePath(
  prices: PriceHistoryPoint[],
  xScale: (time: number) => number,
  yScale: (price: number) => number
): string {
  if (prices.length === 0) return '';

  return prices
    .map((p, i) => {
      const x = xScale(new Date(p.recordedAt).getTime());
      const y = yScale(p.price);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

/**
 * Generate SVG path for gradient fill area
 */
function generateAreaPath(
  prices: PriceHistoryPoint[],
  xScale: (time: number) => number,
  yScale: (price: number) => number,
  chartHeight: number
): string {
  if (prices.length === 0) return '';

  const linePath = prices
    .map((p, i) => {
      const x = xScale(new Date(p.recordedAt).getTime());
      const y = yScale(p.price);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Close the path at the bottom
  const lastX = xScale(new Date(prices[prices.length - 1].recordedAt).getTime());
  const firstX = xScale(new Date(prices[0].recordedAt).getTime());

  return `${linePath} L ${lastX} ${chartHeight} L ${firstX} ${chartHeight} Z`;
}

export function PriceChart({
  prices,
  loading,
  error,
  height = 120,
  showLabels = true,
  highlightTime,
  isMobile = false,
}: PriceChartProps) {
  const width = isMobile ? 280 : 400;
  const padding = { top: 10, right: 10, bottom: showLabels ? 24 : 10, left: showLabels ? 40 : 10 };

  const {
    chartWidth,
    chartHeight,
    minPrice,
    maxPrice,
    minTime,
    maxTime,
    xScale,
    yScale,
  } = getChartMetrics(prices, width, height, padding);

  // Calculate price change
  const priceChange =
    prices.length >= 2
      ? ((prices[prices.length - 1].price - prices[0].price) / prices[0].price) * 100
      : 0;
  const isPositive = priceChange >= 0;
  const lineColor = isPositive ? tokens.colors.profit : tokens.colors.loss;

  // Loading state
  if (loading) {
    return (
      <div data-testid="price-chart-loading">
        <Skeleton width={`${width}px`} height={`${height}px`} style={{ borderRadius: '8px' }} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: tokens.colors.void,
          borderRadius: '8px',
          border: `1px solid ${tokens.colors.border}`,
        }}
      >
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: tokens.fontSizes.xs,
            color: tokens.colors.loss,
          }}
        >
          {error}
        </span>
      </div>
    );
  }

  // Empty state
  if (prices.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: tokens.colors.void,
          borderRadius: '8px',
          border: `1px solid ${tokens.colors.border}`,
        }}
      >
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: tokens.fontSizes.xs,
            color: tokens.colors.textMuted,
          }}
        >
          No price data
        </span>
      </div>
    );
  }

  // Find highlight point if specified
  let highlightX: number | null = null;
  let highlightY: number | null = null;
  let highlightPrice: number | null = null;

  if (highlightTime) {
    const highlightTimestamp = highlightTime.getTime();
    // Find closest price point
    let closestDiff = Infinity;
    for (const p of prices) {
      const t = new Date(p.recordedAt).getTime();
      const diff = Math.abs(t - highlightTimestamp);
      if (diff < closestDiff) {
        closestDiff = diff;
        highlightX = xScale(t);
        highlightY = yScale(p.price);
        highlightPrice = p.price;
      }
    }
  }

  const linePath = generatePath(prices, xScale, yScale);
  const areaPath = generateAreaPath(prices, xScale, yScale, chartHeight);

  return (
    <div data-testid="price-chart">
      {/* Header with price change */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: tokens.spacing[2],
        }}
      >
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: tokens.fontSizes.xs,
            color: tokens.colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Price History
        </span>
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: tokens.fontSizes.sm,
            fontWeight: 600,
            color: lineColor,
          }}
        >
          {isPositive ? '+' : ''}
          {priceChange.toFixed(1)}%
        </span>
      </div>

      {/* Chart SVG */}
      <svg
        width={width}
        height={height}
        style={{
          display: 'block',
          background: tokens.colors.void,
          borderRadius: '8px',
          border: `1px solid ${tokens.colors.border}`,
        }}
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Chart area */}
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Horizontal grid lines */}
          {showLabels && [0.25, 0.5, 0.75].map((pct) => {
            const price = minPrice + (maxPrice - minPrice) * pct;
            const y = yScale(price);
            return (
              <line
                key={pct}
                x1={0}
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke={tokens.colors.border}
                strokeDasharray="2,4"
              />
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#priceGradient)" />

          {/* Price line */}
          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Highlight point */}
          {highlightX !== null && highlightY !== null && (
            <>
              {/* Vertical line */}
              <line
                x1={highlightX}
                y1={0}
                x2={highlightX}
                y2={chartHeight}
                stroke={tokens.colors.cyan}
                strokeDasharray="4,4"
                opacity={0.5}
              />
              {/* Point */}
              <circle
                cx={highlightX}
                cy={highlightY}
                r={4}
                fill={tokens.colors.cyan}
                stroke={tokens.colors.void}
                strokeWidth={2}
              />
              {/* Price label */}
              {highlightPrice !== null && (
                <text
                  x={highlightX}
                  y={highlightY - 10}
                  textAnchor="middle"
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: '10px',
                    fill: tokens.colors.cyan,
                  }}
                >
                  ${highlightPrice.toFixed(2)}
                </text>
              )}
            </>
          )}

          {/* Current price point */}
          {prices.length > 0 && (
            <circle
              cx={xScale(new Date(prices[prices.length - 1].recordedAt).getTime())}
              cy={yScale(prices[prices.length - 1].price)}
              r={3}
              fill={lineColor}
            />
          )}
        </g>

        {/* Y-axis labels */}
        {showLabels && (
          <g>
            <text
              x={padding.left - 4}
              y={padding.top + 4}
              textAnchor="end"
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '10px',
                fill: tokens.colors.textMuted,
              }}
            >
              ${maxPrice.toFixed(2)}
            </text>
            <text
              x={padding.left - 4}
              y={height - padding.bottom}
              textAnchor="end"
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '10px',
                fill: tokens.colors.textMuted,
              }}
            >
              ${minPrice.toFixed(2)}
            </text>
          </g>
        )}

        {/* X-axis labels */}
        {showLabels && (
          <g>
            <text
              x={padding.left}
              y={height - 4}
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '10px',
                fill: tokens.colors.textMuted,
              }}
            >
              {new Date(minTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </text>
            <text
              x={width - padding.right}
              y={height - 4}
              textAnchor="end"
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '10px',
                fill: tokens.colors.textMuted,
              }}
            >
              {new Date(maxTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * Compact sparkline version for use in lists
 */
interface PriceSparklineProps {
  prices: PriceHistoryPoint[];
  width?: number;
  height?: number;
}

export function PriceSparkline({ prices, width = 80, height = 24 }: PriceSparklineProps) {
  if (prices.length < 2) {
    return (
      <div
        style={{
          width,
          height,
          background: tokens.colors.void,
          borderRadius: '4px',
        }}
      />
    );
  }

  const padding = { top: 2, right: 2, bottom: 2, left: 2 };
  const { xScale, yScale } = getChartMetrics(prices, width, height, padding);
  const linePath = generatePath(prices, xScale, yScale);

  const priceChange =
    ((prices[prices.length - 1].price - prices[0].price) / prices[0].price) * 100;
  const lineColor = priceChange >= 0 ? tokens.colors.profit : tokens.colors.loss;

  return (
    <svg
      width={width}
      height={height}
      style={{
        display: 'block',
      }}
    >
      <g transform={`translate(${padding.left}, ${padding.top})`}>
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
