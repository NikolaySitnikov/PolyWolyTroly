/**
 * Pagination Component Tests
 *
 * TDD: Tests for the pagination component following design specs.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    totalItems: 200,
    itemsPerPage: 20,
    onPageChange: vi.fn(),
    entityName: 'whales',
  };

  it('should render the pagination container', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
  });

  it('should display "Showing X-Y of Z" summary', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
    expect(screen.getByText('1-20')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText(/whales/)).toBeInTheDocument();
  });

  it('should display correct range for middle page', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    expect(screen.getByText('81-100')).toBeInTheDocument();
  });

  it('should display correct range for last page with partial items', () => {
    render(<Pagination {...defaultProps} currentPage={10} totalItems={195} />);
    expect(screen.getByText('181-195')).toBeInTheDocument();
  });

  it('should render prev and next buttons', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('should disable prev button on first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('should disable next button on last page', () => {
    render(<Pagination {...defaultProps} currentPage={10} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('should call onPageChange with previous page when clicking prev', async () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('should call onPageChange with next page when clicking next', async () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(6);
  });

  it('should render page number buttons', () => {
    render(<Pagination {...defaultProps} totalPages={5} />);
    expect(screen.getByRole('button', { name: /page 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /page 2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /page 5/i })).toBeInTheDocument();
  });

  it('should highlight current page button', () => {
    render(<Pagination {...defaultProps} currentPage={3} totalPages={5} />);
    const currentButton = screen.getByRole('button', { name: /page 3/i });
    expect(currentButton).toHaveAttribute('aria-current', 'page');
  });

  it('should call onPageChange when clicking a page number', async () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} totalPages={5} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole('button', { name: /page 3/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('should show ellipsis when there are many pages', () => {
    render(<Pagination {...defaultProps} currentPage={25} totalPages={50} />);
    const ellipses = screen.getAllByText('...');
    expect(ellipses.length).toBeGreaterThan(0);
  });

  it('should always show first and last page', () => {
    render(<Pagination {...defaultProps} currentPage={25} totalPages={50} />);
    expect(screen.getByRole('button', { name: /page 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /page 50/i })).toBeInTheDocument();
  });

  it('should not render if totalPages is 0', () => {
    const { container } = render(<Pagination {...defaultProps} totalPages={0} totalItems={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render if totalPages is 1', () => {
    const { container } = render(<Pagination {...defaultProps} totalPages={1} totalItems={15} />);
    expect(container.firstChild).toBeNull();
  });

  describe('Active Page Pulse Animation', () => {
    it('should apply activePulse animation to the active page button', () => {
      render(<Pagination {...defaultProps} currentPage={3} totalPages={5} />);
      const activeButton = screen.getByRole('button', { name: /page 3/i });
      expect(activeButton.style.animation).toContain('activePulse');
    });

    it('should NOT apply activePulse animation to inactive page buttons', () => {
      render(<Pagination {...defaultProps} currentPage={3} totalPages={5} />);
      const inactiveButton = screen.getByRole('button', { name: /page 1/i });
      expect(inactiveButton.style.animation).not.toContain('activePulse');
    });

    it('should apply activePulse animation with infinite iteration', () => {
      render(<Pagination {...defaultProps} currentPage={2} totalPages={5} />);
      const activeButton = screen.getByRole('button', { name: /page 2/i });
      expect(activeButton.style.animation).toContain('infinite');
    });
  });
});
