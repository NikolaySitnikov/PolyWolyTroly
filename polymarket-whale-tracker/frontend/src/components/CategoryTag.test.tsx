/**
 * CategoryTag Component Tests
 *
 * Tests for the market category tag component.
 * @see Design docs/CATEGORY TAGS.md
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryTag, inferCategory } from './CategoryTag';

describe('CategoryTag Component', () => {
  describe('Rendering', () => {
    it('should render with category icon and label', () => {
      render(<CategoryTag category="politics" />);

      const tag = screen.getByTestId('category-tag-politics');
      expect(tag).toBeInTheDocument();
      expect(tag).toHaveTextContent('🏛️');
      expect(tag).toHaveTextContent('Politics');
    });

    it('should render crypto category with Bitcoin symbol', () => {
      render(<CategoryTag category="crypto" />);

      const tag = screen.getByTestId('category-tag-crypto');
      expect(tag).toHaveTextContent('₿');
      expect(tag).toHaveTextContent('Crypto');
    });

    it('should render all category types', () => {
      const categories = [
        'politics', 'crypto', 'sports', 'finance',
        'tech', 'entertainment', 'science', 'world', 'other'
      ] as const;

      categories.forEach(category => {
        const { unmount } = render(<CategoryTag category={category} />);
        expect(screen.getByTestId(`category-tag-${category}`)).toBeInTheDocument();
        unmount();
      });
    });

    it('should hide icon when hideIcon is true', () => {
      render(<CategoryTag category="sports" hideIcon />);

      const tag = screen.getByTestId('category-tag-sports');
      expect(tag).toHaveTextContent('Sports');
      expect(tag).not.toHaveTextContent('⚽');
    });
  });

  describe('Sizing', () => {
    it('should render small size by default', () => {
      render(<CategoryTag category="finance" />);

      const tag = screen.getByTestId('category-tag-finance');
      expect(tag.style.height).toBe('20px');
      expect(tag.style.fontSize).toBe('10px');
    });

    it('should render default size', () => {
      render(<CategoryTag category="finance" size="default" />);

      const tag = screen.getByTestId('category-tag-finance');
      expect(tag.style.height).toBe('26px');
      expect(tag.style.fontSize).toBe('12px');
    });

    it('should render large size', () => {
      render(<CategoryTag category="finance" size="large" />);

      const tag = screen.getByTestId('category-tag-finance');
      expect(tag.style.height).toBe('32px');
      expect(tag.style.fontSize).toBe('13px');
    });
  });

  describe('Colors', () => {
    it('should use category-specific color', () => {
      render(<CategoryTag category="politics" />);

      const tag = screen.getByTestId('category-tag-politics');
      // Politics color is #ff6b35
      expect(tag.style.color).toBe('rgb(255, 107, 53)');
    });

    it('should have different colors for different categories', () => {
      const { rerender } = render(<CategoryTag category="crypto" />);
      const cryptoTag = screen.getByTestId('category-tag-crypto');
      const cryptoColor = cryptoTag.style.color;

      rerender(<CategoryTag category="sports" />);
      const sportsTag = screen.getByTestId('category-tag-sports');
      const sportsColor = sportsTag.style.color;

      expect(cryptoColor).not.toBe(sportsColor);
    });
  });

  describe('Active State', () => {
    it('should apply active styles when active prop is true', () => {
      render(<CategoryTag category="tech" active />);

      const tag = screen.getByTestId('category-tag-tech');
      // Active state uses category color as background
      expect(tag.style.background).toBe('rgb(168, 85, 247)');
    });

    it('should not apply active styles by default', () => {
      render(<CategoryTag category="tech" />);

      const tag = screen.getByTestId('category-tag-tech');
      // Non-active state uses transparent background with color overlay
      expect(tag.style.background).not.toBe('rgb(168, 85, 247)');
    });
  });

  describe('Interactivity', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<CategoryTag category="entertainment" onClick={handleClick} />);

      const tag = screen.getByTestId('category-tag-entertainment');
      fireEvent.click(tag);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have role="button" when clickable', () => {
      render(<CategoryTag category="science" onClick={() => {}} />);

      const tag = screen.getByTestId('category-tag-science');
      expect(tag).toHaveAttribute('role', 'button');
    });

    it('should not have role="button" when not clickable', () => {
      render(<CategoryTag category="world" />);

      const tag = screen.getByTestId('category-tag-world');
      expect(tag).not.toHaveAttribute('role', 'button');
    });

    it('should be keyboard accessible when clickable', () => {
      const handleClick = vi.fn();
      render(<CategoryTag category="other" onClick={handleClick} />);

      const tag = screen.getByTestId('category-tag-other');
      expect(tag).toHaveAttribute('tabIndex', '0');

      fireEvent.keyDown(tag, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(tag, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('should have cursor pointer when clickable', () => {
      render(<CategoryTag category="politics" onClick={() => {}} />);

      const tag = screen.getByTestId('category-tag-politics');
      expect(tag.style.cursor).toBe('pointer');
    });

    it('should have default cursor when not clickable', () => {
      render(<CategoryTag category="politics" />);

      const tag = screen.getByTestId('category-tag-politics');
      expect(tag.style.cursor).toBe('default');
    });
  });
});

describe('inferCategory', () => {
  it('should infer politics from election-related questions', () => {
    expect(inferCategory('Will Trump win the 2024 election?')).toBe('politics');
    expect(inferCategory('Will Biden run for re-election?')).toBe('politics');
    expect(inferCategory('Will Democrats win the Senate?')).toBe('politics');
  });

  it('should infer crypto from cryptocurrency questions', () => {
    expect(inferCategory('Will Bitcoin reach $100k?')).toBe('crypto');
    expect(inferCategory('Will ETH flip BTC by market cap?')).toBe('crypto');
    expect(inferCategory('Will Solana hit new ATH?')).toBe('crypto');
  });

  it('should infer sports from game-related questions', () => {
    expect(inferCategory('Will the Lakers win the NBA championship?')).toBe('sports');
    expect(inferCategory('Who will win the NFL championship?')).toBe('sports');
    expect(inferCategory('Will Messi score in the World Cup?')).toBe('sports');
  });

  it('should infer finance from market-related questions', () => {
    expect(inferCategory('Will the Fed cut rates in March?')).toBe('finance');
    expect(inferCategory('Will S&P 500 reach 5000?')).toBe('finance');
    expect(inferCategory('Will stock prices rise?')).toBe('finance');
  });

  it('should infer tech from technology questions', () => {
    expect(inferCategory('Will Apple release Vision Pro 2?')).toBe('tech');
    expect(inferCategory('Will GPT-5 launch in 2024?')).toBe('tech');
    expect(inferCategory('Will Google announce new AI model?')).toBe('tech');
  });

  it('should infer entertainment from media questions', () => {
    expect(inferCategory('Will Oppenheimer win the Oscar?')).toBe('entertainment');
    expect(inferCategory('Will Taylor Swift win Grammy?')).toBe('entertainment');
    expect(inferCategory('Will Netflix release new movie?')).toBe('entertainment');
  });

  it('should infer science from research questions', () => {
    expect(inferCategory('Will NASA land on Mars by 2030?')).toBe('science');
    expect(inferCategory('Will new vaccine be approved?')).toBe('science');
    expect(inferCategory('Will climate targets be met?')).toBe('science');
  });

  it('should infer world from geopolitical questions', () => {
    expect(inferCategory('Will the war end by December?')).toBe('world');
    expect(inferCategory('Will NATO expand?')).toBe('world');
    expect(inferCategory('Will UN pass resolution?')).toBe('world');
  });

  it('should return other for unrecognized questions', () => {
    expect(inferCategory('Will cats be popular?')).toBe('other');
    expect(inferCategory('What is the best pizza topping?')).toBe('other');
  });
});
