import React, { useState, useMemo } from 'react';

// ============================================================================
// POLYWOLYTROLY PAGINATION COMPONENTS
// Matching the cyberpunk terminal aesthetic
// ============================================================================

const tokens = {
  colors: {
    void: '#0a0a0f',
    surface: '#12121a',
    surfaceHover: '#1a1a24',
    border: '#2a2a3a',
    muted: '#4a4a5a',
    cyan: '#00fff0',
    cyanGlow: 'rgba(0, 255, 240, 0.2)',
    textPrimary: '#f0f0f5',
    textSecondary: '#8888aa',
    textMuted: '#555566',
  }
};

// ============================================================================
// TRADITIONAL PAGINATION
// ============================================================================

const Pagination = ({ 
  currentPage = 1, 
  totalPages = 1, 
  totalItems = 0, 
  itemsPerPage = 20,
  onPageChange,
  entityName = 'items',
  showPageSize = false,
  pageSizeOptions = [20, 50, 100],
  onPageSizeChange,
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  // Generate page numbers with ellipsis truncation
  const pageNumbers = useMemo(() => {
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const pages = [];
    const leftSiblings = 1;
    const rightSiblings = 1;
    
    const leftBound = Math.max(2, currentPage - leftSiblings);
    const rightBound = Math.min(totalPages - 1, currentPage + rightSiblings);
    
    // Always show first page
    pages.push(1);
    
    // Left ellipsis
    if (leftBound > 2) {
      pages.push('left-ellipsis');
    } else if (leftBound === 2) {
      pages.push(2);
    }
    
    // Middle pages
    for (let i = leftBound; i <= rightBound; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }
    
    // Right ellipsis
    if (rightBound < totalPages - 1) {
      pages.push('right-ellipsis');
    } else if (rightBound === totalPages - 1) {
      pages.push(totalPages - 1);
    }
    
    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  }, [currentPage, totalPages]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile simplified view
  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        background: tokens.colors.surface,
        borderTop: `1px solid ${tokens.colors.border}`,
        borderRadius: '0 0 12px 12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <NavButton 
            direction="prev" 
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px',
            color: tokens.colors.textPrimary,
          }}>
            Page <span style={{ color: tokens.colors.cyan, fontWeight: 600 }}>{currentPage}</span> of {totalPages}
          </span>
          <NavButton 
            direction="next" 
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          />
        </div>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
          color: tokens.colors.textMuted,
        }}>
          Showing {startItem}-{endItem} of {totalItems}
        </span>
      </div>
    );
  }

  // Desktop full view
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      background: tokens.colors.surface,
      borderTop: `1px solid ${tokens.colors.border}`,
      borderRadius: '0 0 12px 12px',
    }}>
      {/* Left: Page size + Results summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {showPageSize && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: tokens.colors.textMuted,
            }}>
              Show:
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              style={{
                appearance: 'none',
                minWidth: '70px',
                height: '32px',
                padding: '0 28px 0 12px',
                background: `${tokens.colors.surface} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238888aa' d='M2 4l4 4 4-4'/%3E%3C/svg%3E") no-repeat right 10px center`,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: '6px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
                color: tokens.colors.textPrimary,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => e.target.style.borderColor = tokens.colors.cyan}
              onMouseLeave={(e) => e.target.style.borderColor = tokens.colors.border}
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        )}
        
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
          color: tokens.colors.textMuted,
          letterSpacing: '0.02em',
        }}>
          Showing{' '}
          <strong style={{ color: tokens.colors.textSecondary, fontWeight: 500 }}>
            {startItem}-{endItem}
          </strong>
          {' '}of{' '}
          <strong style={{ color: tokens.colors.textSecondary, fontWeight: 500 }}>
            {totalItems.toLocaleString()}
          </strong>
          {' '}{entityName}
        </span>
      </div>

      {/* Right: Page controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <NavButton 
          direction="prev" 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        />
        
        {pageNumbers.map((page, i) => (
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
        ))}
        
        <NavButton 
          direction="next" 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        />
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const PageButton = ({ page, isActive, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Page ${page}`}
      aria-current={isActive ? 'page' : undefined}
      style={{
        minWidth: '36px',
        height: '36px',
        padding: '0 12px',
        background: isActive ? tokens.colors.cyan : 'transparent',
        border: `1px solid ${isActive ? tokens.colors.cyan : isHovered ? tokens.colors.cyan : tokens.colors.border}`,
        borderRadius: '8px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '13px',
        fontWeight: isActive ? 600 : 500,
        color: isActive ? tokens.colors.void : isHovered ? tokens.colors.cyan : tokens.colors.textSecondary,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: isActive 
          ? `0 0 20px ${tokens.colors.cyanGlow}` 
          : isHovered 
            ? `0 0 15px ${tokens.colors.cyanGlow}` 
            : 'none',
        transform: isHovered && !isActive ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      {page}
    </button>
  );
};

const NavButton = ({ direction, onClick, disabled }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isPrev = direction === 'prev';
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
        transform: isHovered && !disabled 
          ? `translateX(${isPrev ? '-2px' : '2px'})` 
          : 'translateX(0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isPrev ? '‹' : '›'}
    </button>
  );
};

const Ellipsis = () => (
  <span style={{
    minWidth: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '14px',
    color: tokens.colors.textMuted,
    letterSpacing: '0.1em',
  }}>
    ...
  </span>
);

// ============================================================================
// LOAD MORE BUTTON
// ============================================================================

const LoadMoreButton = ({ 
  onClick, 
  isLoading = false, 
  remainingCount = 0,
  entityName = 'items' 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      style={{
        width: '100%',
        padding: '14px 24px',
        marginTop: '16px',
        background: isHovered ? tokens.colors.surfaceHover : 'transparent',
        border: `1px ${isHovered ? 'solid' : 'dashed'} ${isHovered ? tokens.colors.cyan : tokens.colors.border}`,
        borderRadius: '8px',
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '13px',
        fontWeight: 500,
        color: isLoading ? tokens.colors.textMuted : isHovered ? tokens.colors.cyan : tokens.colors.textSecondary,
        cursor: isLoading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      {isLoading && (
        <span style={{
          width: '14px',
          height: '14px',
          border: `2px solid ${tokens.colors.border}`,
          borderTopColor: tokens.colors.cyan,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      )}
      {isLoading ? 'Loading...' : `Load ${remainingCount} more ${entityName}`}
    </button>
  );
};

// ============================================================================
// INFINITE SCROLL LOADER
// ============================================================================

const InfiniteScrollLoader = ({ isLoading, hasMore, loadingText = 'Loading more...' }) => {
  if (!isLoading && hasMore) return null;
  
  if (!hasMore) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '32px',
        color: tokens.colors.textMuted,
        textAlign: 'center',
      }}>
        <span style={{ fontSize: '24px', opacity: 0.5 }}>🐋</span>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '13px',
        }}>
          You've reached the bottom
        </span>
      </div>
    );
  }
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '24px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      color: tokens.colors.textMuted,
    }}>
      <span style={{
        width: '20px',
        height: '20px',
        border: `2px solid ${tokens.colors.border}`,
        borderTopColor: tokens.colors.cyan,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      {loadingText}
    </div>
  );
};

// ============================================================================
// DEMO APP
// ============================================================================

export default function PaginationDemo() {
  // Traditional pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const totalItems = 847;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Load more state
  const [loadedItems, setLoadedItems] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Infinite scroll state
  const [infiniteItems, setInfiniteItems] = useState(30);
  const [isInfiniteLoading, setIsInfiniteLoading] = useState(false);
  
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setLoadedItems(prev => Math.min(prev + 20, 100));
      setIsLoadingMore(false);
    }, 1000);
  };
  
  const simulateInfiniteLoad = () => {
    if (isInfiniteLoading || infiniteItems >= 150) return;
    setIsInfiniteLoading(true);
    setTimeout(() => {
      setInfiniteItems(prev => Math.min(prev + 20, 150));
      setIsInfiniteLoading(false);
    }, 1000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.colors.void,
      padding: '40px 20px',
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@700;800&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 15px ${tokens.colors.cyanGlow}; }
          50% { box-shadow: 0 0 25px ${tokens.colors.cyanGlow}; }
        }
      `}</style>
      
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <h1 style={{
          fontFamily: "'Exo 2', sans-serif",
          fontSize: '28px',
          fontWeight: 800,
          color: tokens.colors.textPrimary,
          marginBottom: '8px',
        }}>
          Pagination Components
        </h1>
        <p style={{
          fontSize: '14px',
          color: tokens.colors.textSecondary,
          marginBottom: '40px',
        }}>
          PolyWolyTroly design system pagination patterns
        </p>

        {/* Traditional Pagination Demo */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: '18px',
            fontWeight: 700,
            color: tokens.colors.cyan,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            🔢 Traditional Pagination
          </h2>
          
          {/* Fake table */}
          <div style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px 12px 0 0',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${tokens.colors.border}`,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: tokens.colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              Whale Table Preview
            </div>
            <div style={{
              height: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tokens.colors.textMuted,
              fontSize: '14px',
            }}>
              Page {currentPage} content would appear here
            </div>
          </div>
          
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            entityName="whales"
            showPageSize={true}
            onPageSizeChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
          />
        </section>

        {/* Load More Demo */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: '18px',
            fontWeight: 700,
            color: tokens.colors.magenta,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            ➕ Load More Pattern
          </h2>
          
          <div style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: tokens.colors.textMuted,
              marginBottom: '12px',
            }}>
              Showing {loadedItems} of 100 trades
            </div>
            
            <div style={{
              height: '120px',
              background: tokens.colors.void,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tokens.colors.textMuted,
              fontSize: '13px',
            }}>
              Trade history items...
            </div>
            
            {loadedItems < 100 && (
              <LoadMoreButton
                onClick={handleLoadMore}
                isLoading={isLoadingMore}
                remainingCount={Math.min(20, 100 - loadedItems)}
                entityName="trades"
              />
            )}
          </div>
        </section>

        {/* Infinite Scroll Demo */}
        <section>
          <h2 style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: '18px',
            fontWeight: 700,
            color: tokens.colors.purple,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            🔄 Infinite Scroll Pattern
          </h2>
          
          <div style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            maxHeight: '300px',
            overflow: 'auto',
          }}
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.target;
            if (scrollHeight - scrollTop - clientHeight < 100) {
              simulateInfiniteLoad();
            }
          }}
          >
            <div style={{ padding: '16px 20px' }}>
              {Array.from({ length: infiniteItems }).map((_, i) => (
                <div key={i} style={{
                  padding: '12px 0',
                  borderBottom: `1px solid ${tokens.colors.border}`,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  color: tokens.colors.textSecondary,
                }}>
                  Alert #{i + 1} — Whale activity detected
                </div>
              ))}
            </div>
            
            <InfiniteScrollLoader 
              isLoading={isInfiniteLoading}
              hasMore={infiniteItems < 150}
              loadingText="Scanning deeper..."
            />
          </div>
        </section>
      </div>
    </div>
  );
}
