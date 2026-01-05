/**
 * TrendingMarkets Component Tests
 *
 * Tests for the trending markets display component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrendingMarkets } from './TrendingMarkets';
import type { TrendingMarketResponse } from '../services/api';

const mockMarkets: TrendingMarketResponse[] = [
  {
    id: 'market-1',
    question: 'Will BTC reach $100k?',
    slug: 'btc-100k',
    eventSlug: 'btc-100k-event',
    yesPrice: 0.65,
    noPrice: 0.35,
    volume24hr: 500000,
    liquidity: 100000,
    endDate: '2025-12-31T00:00:00Z',
    category: 'Crypto',
    active: true,
    clobTokenId: '123456789',
    sportsMarketType: null,
    seriesSlug: null,
  },
  {
    id: 'market-2',
    question: 'Will ETH flip BTC?',
    slug: 'eth-flip-btc',
    eventSlug: 'eth-flip-btc-event',
    yesPrice: 0.25,
    noPrice: 0.75,
    volume24hr: 1500000,
    liquidity: 80000,
    endDate: '2025-06-30T00:00:00Z',
    category: 'Crypto',
    active: true,
    clobTokenId: '987654321',
    sportsMarketType: null,
    seriesSlug: null,
  },
];

describe('TrendingMarkets Component', () => {
  describe('Loading State', () => {
    it('should render loading skeletons when loading', () => {
      render(
        <TrendingMarkets
          markets={[]}
          loading={true}
          error={null}
          isMobile={false}
        />
      );

      expect(screen.getByTestId('trending-markets')).toBeInTheDocument();
      // Should show 4 loading skeletons on desktop
    });

    it('should render 2 skeletons on mobile when loading', () => {
      render(
        <TrendingMarkets
          markets={[]}
          loading={true}
          error={null}
          isMobile={true}
        />
      );

      expect(screen.getByTestId('trending-markets')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should render error message when error occurs', () => {
      render(
        <TrendingMarkets
          markets={[]}
          loading={false}
          error="Network error"
          isMobile={false}
        />
      );

      expect(screen.getByText(/Failed to load trending markets/)).toBeInTheDocument();
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });

    it('should render retry button when onRetry is provided', () => {
      const onRetry = vi.fn();

      render(
        <TrendingMarkets
          markets={[]}
          loading={false}
          error="Network error"
          isMobile={false}
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should not render retry button when onRetry is not provided', () => {
      render(
        <TrendingMarkets
          markets={[]}
          loading={false}
          error="Network error"
          isMobile={false}
        />
      );

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no markets and not loading', () => {
      render(
        <TrendingMarkets
          markets={[]}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      expect(screen.getByText(/No trending markets available/)).toBeInTheDocument();
    });
  });

  describe('With Markets', () => {
    it('should render market cards', () => {
      render(
        <TrendingMarkets
          markets={mockMarkets}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      expect(screen.getByText('Will BTC reach $100k?')).toBeInTheDocument();
      expect(screen.getByText('Will ETH flip BTC?')).toBeInTheDocument();
    });

    it('should display probability as percentage', () => {
      render(
        <TrendingMarkets
          markets={mockMarkets}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('should format volume correctly', () => {
      render(
        <TrendingMarkets
          markets={mockMarkets}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      expect(screen.getByText('$500K 24h')).toBeInTheDocument();
      expect(screen.getByText('$1.5M 24h')).toBeInTheDocument();
    });

    it('should link to Polymarket', () => {
      render(
        <TrendingMarkets
          markets={mockMarkets}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      const links = screen.getAllByTestId('market-card');
      expect(links[0]).toHaveAttribute('href', 'https://polymarket.com/event/btc-100k-event');
      expect(links[1]).toHaveAttribute('href', 'https://polymarket.com/event/eth-flip-btc-event');
    });

    it('should open links in new tab', () => {
      render(
        <TrendingMarkets
          markets={mockMarkets}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      const links = screen.getAllByTestId('market-card');
      expect(links[0]).toHaveAttribute('target', '_blank');
      expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Section Header', () => {
    it('should render section title', () => {
      render(
        <TrendingMarkets
          markets={mockMarkets}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      expect(screen.getByText('Trending Markets')).toBeInTheDocument();
    });

    it('should render "View all" link to Polymarket', () => {
      render(
        <TrendingMarkets
          markets={mockMarkets}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      const viewAllLink = screen.getByText(/View all/);
      expect(viewAllLink).toHaveAttribute('href', 'https://polymarket.com');
    });
  });

  describe('Hover Effects', () => {
    it('should have cursor pointer on market cards', () => {
      render(
        <TrendingMarkets
          markets={mockMarkets}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      const cards = screen.getAllByTestId('market-card');
      expect(cards[0]).toHaveStyle({ cursor: 'pointer' });
    });

    it('should have transition property on market cards for hover effects', () => {
      render(
        <TrendingMarkets
          markets={mockMarkets}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      const cards = screen.getAllByTestId('market-card');
      expect(cards[0].style.transition).toContain('all');
    });
  });

  describe('Sparklines', () => {
    it('should render sparkline for each market card when priceHistory is provided', () => {
      const marketsWithHistory = mockMarkets.map(market => ({
        ...market,
        priceHistory: [
          { t: 1704067200, p: 0.45 },
          { t: 1704153600, p: 0.50 },
          { t: 1704240000, p: 0.55 },
        ],
      }));

      render(
        <TrendingMarkets
          markets={marketsWithHistory}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      const sparklines = screen.getAllByTestId('sparkline');
      expect(sparklines).toHaveLength(2);
    });

    it('should show loading shimmer when sparkline data is loading', () => {
      const marketsWithLoading = mockMarkets.map(market => ({
        ...market,
        priceHistory: [],
        priceHistoryLoading: true,
      }));

      render(
        <TrendingMarkets
          markets={marketsWithLoading}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      const sparklines = screen.getAllByTestId('sparkline');
      expect(sparklines[0].style.animation).toContain('shimmer');
    });
  });

  describe('Price Change Indicators', () => {
    it('should show positive price change with up arrow and green color', () => {
      const marketsWithPositiveChange = [{
        ...mockMarkets[0],
        priceHistory: [
          { t: 1704067200, p: 0.50 },
          { t: 1704153600, p: 0.60 }, // 20% increase
        ],
      }];

      render(
        <TrendingMarkets
          markets={marketsWithPositiveChange}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      const priceChange = screen.getByTestId('price-change');
      expect(priceChange).toHaveTextContent('↑20%');
    });

    it('should show negative price change with down arrow and red color', () => {
      const marketsWithNegativeChange = [{
        ...mockMarkets[0],
        priceHistory: [
          { t: 1704067200, p: 0.60 },
          { t: 1704153600, p: 0.48 }, // 20% decrease
        ],
      }];

      render(
        <TrendingMarkets
          markets={marketsWithNegativeChange}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      const priceChange = screen.getByTestId('price-change');
      expect(priceChange).toHaveTextContent('↓20%');
    });

    it('should not show price change indicator when price history is empty', () => {
      const marketsWithoutHistory = [{
        ...mockMarkets[0],
        priceHistory: [],
      }];

      render(
        <TrendingMarkets
          markets={marketsWithoutHistory}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      expect(screen.queryByTestId('price-change')).not.toBeInTheDocument();
    });

    it('should format small changes with one decimal place', () => {
      const marketsWithSmallChange = [{
        ...mockMarkets[0],
        priceHistory: [
          { t: 1704067200, p: 0.50 },
          { t: 1704153600, p: 0.525 }, // 5% increase
        ],
      }];

      render(
        <TrendingMarkets
          markets={marketsWithSmallChange}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      const priceChange = screen.getByTestId('price-change');
      expect(priceChange).toHaveTextContent('↑5.0%');
    });

    it('should show neutral style for zero or near-zero change', () => {
      const marketsWithZeroChange = [{
        ...mockMarkets[0],
        priceHistory: [
          { t: 1704067200, p: 0.50 },
          { t: 1704153600, p: 0.50 }, // 0% change
        ],
      }];

      render(
        <TrendingMarkets
          markets={marketsWithZeroChange}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      const priceChange = screen.getByTestId('price-change');
      // Should show "0.0%" without arrow for neutral
      expect(priceChange).toHaveTextContent('0.0%');
      // Should NOT contain arrow
      expect(priceChange.textContent).not.toMatch(/[↑↓]/);
    });

    it('should show neutral style for very small changes within threshold', () => {
      const marketsWithTinyChange = [{
        ...mockMarkets[0],
        priceHistory: [
          { t: 1704067200, p: 0.50 },
          { t: 1704153600, p: 0.502 }, // 0.4% change - within neutral threshold
        ],
      }];

      render(
        <TrendingMarkets
          markets={marketsWithTinyChange}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      const priceChange = screen.getByTestId('price-change');
      // Should NOT contain arrow for near-zero
      expect(priceChange.textContent).not.toMatch(/[↑↓]/);
    });
  });

  describe('Category Tags', () => {
    it('should render category tag for each market card', () => {
      render(
        <TrendingMarkets
          markets={mockMarkets}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      // Both markets are crypto category
      const cryptoTags = screen.getAllByTestId('category-tag-crypto');
      expect(cryptoTags).toHaveLength(2);
    });

    it('should infer category from question when not provided by API', () => {
      const marketsWithoutCategory: TrendingMarketResponse[] = [{
        ...mockMarkets[0],
        category: '',
        question: 'Will Trump win the election?', // Should infer 'politics'
      }];

      render(
        <TrendingMarkets
          markets={marketsWithoutCategory}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      expect(screen.getByTestId('category-tag-politics')).toBeInTheDocument();
    });

    it('should use API category when provided', () => {
      const marketsWithCategory = [{
        ...mockMarkets[0],
        category: 'Sports', // API provides 'Sports'
        question: 'Will Bitcoin reach $100k?', // Would infer crypto without API category
      }];

      render(
        <TrendingMarkets
          markets={marketsWithCategory}
          loading={false}
          error={null}
          isMobile={false}
        />
      );

      expect(screen.getByTestId('category-tag-sports')).toBeInTheDocument();
    });
  });
});
