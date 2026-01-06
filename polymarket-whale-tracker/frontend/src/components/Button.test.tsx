/**
 * Button Component Tests
 *
 * Tests for the reusable Button component with micro-interactions.
 * TDD: Write tests first, then implement.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  describe('Variants', () => {
    it('renders primary variant by default', () => {
      render(<Button>Primary</Button>);
      const button = screen.getByRole('button');
      // Primary buttons have cyan background
      expect(button).toBeInTheDocument();
    });

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders danger variant', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders medium size by default', () => {
      render(<Button>Medium</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders large size', () => {
      render(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Micro-interactions', () => {
    it('has pointer cursor', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button');
      expect(button.style.cursor).toBe('pointer');
    });

    it('has transition for smooth animations', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button');
      expect(button.style.transition).toContain('all');
    });

    it('changes transform on mouse down (click feedback)', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button');
      fireEvent.mouseDown(button);
      expect(button.style.transform).toBe('scale(0.98)');
    });

    it('resets transform on mouse up', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button');
      fireEvent.mouseDown(button);
      fireEvent.mouseUp(button);
      expect(button.style.transform).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('supports aria-label', () => {
      render(<Button aria-label="Close dialog">X</Button>);
      expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
    });

    it('supports type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });
  });

  describe('Full width', () => {
    it('renders full width when fullWidth is true', () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole('button');
      expect(button.style.width).toBe('100%');
    });
  });

  describe('Loading state', () => {
    it('shows loading indicator when loading', () => {
      render(<Button loading>Submit</Button>);
      expect(screen.getByTestId('button-spinner')).toBeInTheDocument();
    });

    it('is disabled when loading', () => {
      render(<Button loading>Submit</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });
});
