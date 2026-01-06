/**
 * Skeleton Component Tests
 *
 * Tests for the reusable skeleton loading components.
 * TDD: Write tests first, then implement.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonCard, SkeletonRow, SkeletonText } from './Skeleton';

describe('Skeleton', () => {
  describe('Base Skeleton component', () => {
    it('renders with default props', () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });

    it('applies custom width and height', () => {
      render(<Skeleton width="100px" height="20px" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.style.width).toBe('100px');
      expect(skeleton.style.height).toBe('20px');
    });

    it('applies custom border radius', () => {
      render(<Skeleton borderRadius="8px" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.style.borderRadius).toBe('8px');
    });

    it('has shimmer animation', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.style.animation).toContain('shimmer');
    });
  });

  describe('SkeletonText component', () => {
    it('renders with appropriate height for text', () => {
      render(<SkeletonText data-testid="text-skeleton" />);
      const skeleton = screen.getByTestId('text-skeleton');
      expect(skeleton.style.height).toBe('14px');
    });

    it('supports different sizes', () => {
      const { rerender } = render(<SkeletonText size="sm" data-testid="text-skeleton" />);
      expect(screen.getByTestId('text-skeleton').style.height).toBe('12px');

      rerender(<SkeletonText size="lg" data-testid="text-skeleton" />);
      expect(screen.getByTestId('text-skeleton').style.height).toBe('18px');
    });

    it('applies custom width', () => {
      render(<SkeletonText width="80%" data-testid="text-skeleton" />);
      const skeleton = screen.getByTestId('text-skeleton');
      expect(skeleton.style.width).toBe('80%');
    });
  });

  describe('SkeletonCard component', () => {
    it('renders card-shaped skeleton', () => {
      render(<SkeletonCard data-testid="card-skeleton" />);
      expect(screen.getByTestId('card-skeleton')).toBeInTheDocument();
    });

    it('has card styling (border, border-radius)', () => {
      render(<SkeletonCard data-testid="card-skeleton" />);
      const card = screen.getByTestId('card-skeleton');
      expect(card.style.borderRadius).toBe('14px');
      expect(card.style.border).toContain('solid');
    });

    it('renders child skeleton elements', () => {
      render(<SkeletonCard data-testid="card-skeleton" />);
      const card = screen.getByTestId('card-skeleton');
      // Should have placeholder elements inside
      expect(card.children.length).toBeGreaterThan(0);
    });
  });

  describe('SkeletonRow component', () => {
    it('renders row-shaped skeleton for desktop tables', () => {
      render(<SkeletonRow data-testid="row-skeleton" />);
      expect(screen.getByTestId('row-skeleton')).toBeInTheDocument();
    });

    it('has row styling with border bottom', () => {
      render(<SkeletonRow data-testid="row-skeleton" />);
      const row = screen.getByTestId('row-skeleton');
      expect(row.style.borderBottom).toContain('solid');
    });

    it('renders placeholder cells', () => {
      render(<SkeletonRow data-testid="row-skeleton" />);
      const row = screen.getByTestId('row-skeleton');
      // Should have placeholder elements for cells
      expect(row.children.length).toBeGreaterThan(0);
    });
  });
});
