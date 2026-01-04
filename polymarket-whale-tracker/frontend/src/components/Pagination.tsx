/**
 * Pagination Component
 *
 * Traditional pagination with page numbers, prev/next buttons,
 * and results summary. Follows PAGINATION_GUIDELINES.md specs.
 *
 * @see Design docs/PAGINATION_GUIDELINES.md
 */

import { useMemo } from 'react';
import { tokens } from '../styles/tokens';
import { useHover } from '../hooks/useHover';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  entityName?: string;
  isMobile?: boolean;
}

/**
 * Generate page numbers array with ellipsis truncation.
 * Shows max 7 page indicators per design spec.
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const maxVisible = 7;

  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];

  // Always show first page
  pages.push(1);

  // Calculate visible range around current page
  let rangeStart = Math.max(2, currentPage - 1);
  let rangeEnd = Math.min(totalPages - 1, currentPage + 1);

  // Adjust range to show more pages if we're near the start or end
  if (currentPage <= 3) {
    rangeEnd = Math.min(5, totalPages - 1);
  } else if (currentPage >= totalPages - 2) {
    rangeStart = Math.max(2, totalPages - 4);
  }

  // Left ellipsis
  if (rangeStart > 2) {
    pages.push('left-ellipsis');
  }

  // Middle pages
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  // Right ellipsis
  if (rangeEnd < totalPages - 1) {
    pages.push('right-ellipsis');
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

/**
 * Page number button
 */
function PageButton({
  page,
  isActive,
  onClick,
}: {
  page: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const { isHovered, hoverProps } = useHover();

  return (
    <button
      onClick={onClick}
      {...hoverProps}
      aria-label={`Page ${page}`}
      aria-current={isActive ? 'page' : undefined}
      style={{
        minWidth: '36px',
        height: '36px',
        padding: '0 12px',
        background: isActive ? tokens.colors.cyan : 'transparent',
        border: `1px solid ${isActive ? tokens.colors.cyan : isHovered ? tokens.colors.cyan : tokens.colors.border}`,
        borderRadius: '8px',
        fontFamily: tokens.fonts.mono,
        fontSize: '13px',
        fontWeight: isActive ? 600 : 500,
        color: isActive
          ? tokens.colors.void
          : isHovered
            ? tokens.colors.cyan
            : tokens.colors.textSecondary,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: isActive
          ? `0 0 20px ${tokens.colors.cyanGlow}`
          : isHovered
            ? `0 0 15px ${tokens.colors.cyanGlow}`
            : 'none',
      }}
    >
      {page}
    </button>
  );
}

/**
 * Previous/Next navigation button
 */
function NavButton({
  direction,
  onClick,
  disabled,
}: {
  direction: 'prev' | 'next';
  onClick: () => void;
  disabled: boolean;
}) {
  const { isHovered, hoverProps } = useHover({ disabled });
  const isPrev = direction === 'prev';

  return (
    <button
      onClick={onClick}
      {...hoverProps}
      disabled={disabled}
      aria-label={isPrev ? 'Previous page' : 'Next page'}
      style={{
        minWidth: '40px',
        height: '36px',
        padding: '0 14px',
        background: disabled
          ? 'transparent'
          : isHovered
            ? tokens.colors.cyan
            : tokens.colors.surface,
        border: `1px solid ${disabled ? tokens.colors.border : isHovered ? tokens.colors.cyan : tokens.colors.border}`,
        borderRadius: '8px',
        fontSize: '14px',
        color: disabled
          ? tokens.colors.muted
          : isHovered
            ? tokens.colors.void
            : tokens.colors.textSecondary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
        boxShadow: isHovered && !disabled ? `0 0 20px ${tokens.colors.cyanGlow}` : 'none',
        transform:
          isHovered && !disabled ? `translateX(${isPrev ? '-2px' : '2px'})` : 'translateX(0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isPrev ? '‹' : '›'}
    </button>
  );
}

/**
 * Ellipsis indicator for truncated pages
 */
function Ellipsis() {
  return (
    <span
      style={{
        minWidth: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: tokens.fonts.mono,
        fontSize: '14px',
        color: tokens.colors.textMuted,
        letterSpacing: '0.1em',
      }}
    >
      ...
    </span>
  );
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  entityName = 'items',
  isMobile = false,
}: PaginationProps) {
  // Don't render if only one page or no pages
  if (totalPages <= 1) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const pageNumbers = useMemo(() => getPageNumbers(currentPage, totalPages), [currentPage, totalPages]);

  // Mobile: Simplified layout
  if (isMobile) {
    return (
      <div
        data-testid="pagination"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          background: tokens.colors.surface,
          borderTop: `1px solid ${tokens.colors.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <NavButton
            direction="prev"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          />
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '13px',
              color: tokens.colors.textPrimary,
            }}
          >
            Page <span style={{ color: tokens.colors.cyan, fontWeight: 600 }}>{currentPage}</span>{' '}
            of {totalPages}
          </span>
          <NavButton
            direction="next"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          />
        </div>
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '12px',
            color: tokens.colors.textMuted,
          }}
        >
          Showing {startItem}-{endItem} of {totalItems}
        </span>
      </div>
    );
  }

  // Desktop: Full layout
  return (
    <div
      data-testid="pagination"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        background: tokens.colors.surface,
        borderTop: `1px solid ${tokens.colors.border}`,
      }}
    >
      {/* Left: Results summary */}
      <span
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: '12px',
          color: tokens.colors.textMuted,
          letterSpacing: '0.02em',
        }}
      >
        Showing{' '}
        <strong style={{ color: tokens.colors.textSecondary, fontWeight: 500 }}>
          {startItem}-{endItem}
        </strong>{' '}
        of{' '}
        <strong style={{ color: tokens.colors.textSecondary, fontWeight: 500 }}>
          {totalItems.toLocaleString()}
        </strong>{' '}
        {entityName}
      </span>

      {/* Right: Page controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <NavButton
          direction="prev"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        />

        {pageNumbers.map((page) =>
          typeof page === 'string' ? (
            <Ellipsis key={page} />
          ) : (
            <PageButton
              key={page}
              page={page}
              isActive={currentPage === page}
              onClick={() => onPageChange(page)}
            />
          )
        )}

        <NavButton
          direction="next"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        />
      </div>
    </div>
  );
}
