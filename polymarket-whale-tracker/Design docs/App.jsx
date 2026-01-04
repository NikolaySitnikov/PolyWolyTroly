import React, { useState, useEffect, useRef } from 'react';

// ============================================================================
// POLYWOLYTROLY - WHALE INTELLIGENCE PLATFORM
// A cyberpunk terminal for tracking smart money on Polymarket
// ============================================================================

// Design Tokens as CSS-in-JS
const tokens = {
  colors: {
    void: '#0a0a0f',
    surface: '#12121a',
    surfaceHover: '#1a1a24',
    border: '#2a2a3a',
    muted: '#4a4a5a',
    cyan: '#00fff0',
    cyanGlow: 'rgba(0, 255, 240, 0.2)',
    cyanDim: '#00b8a9',
    magenta: '#ff2d92',
    magentaGlow: 'rgba(255, 45, 146, 0.2)',
    purple: '#a855f7',
    profit: '#00ff88',
    profitGlow: 'rgba(0, 255, 136, 0.2)',
    loss: '#ff3366',
    lossGlow: 'rgba(255, 51, 102, 0.2)',
    warning: '#ffaa00',
    textPrimary: '#f0f0f5',
    textSecondary: '#8888aa',
    textMuted: '#555566',
  }
};

// Simulated whale data
const generateWhaleData = () => {
  const addresses = [
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    '0xdead000000000000000000000000000000000000',
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
    '0x1111111254fb6c44bac0bed2854e76f90643097d',
    '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
    '0x881d40237659c251811cec9c364ef91dc08d300c',
    '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f',
  ];
  
  return addresses.map((address, i) => ({
    address,
    alias: ['DeepWater.eth', 'WhaleHunter', 'CryptoLeviathan', 'MarketMaker_X', 'AlphaSeeker', 'YoloTrader69', 'InstitutionalFlow', 'SmartMoneyDAO'][i],
    totalDeposits: Math.floor(Math.random() * 5000000) + 100000,
    pnl: (Math.random() - 0.3) * 500000,
    pnlPercent: (Math.random() - 0.3) * 100,
    winRate: 45 + Math.random() * 40,
    trades: Math.floor(Math.random() * 500) + 50,
    lastActive: new Date(Date.now() - Math.random() * 86400000 * 7),
    positions: Math.floor(Math.random() * 15) + 1,
    isLive: Math.random() > 0.6,
  }));
};

const generateRecentAlerts = () => [
  { type: 'deposit', address: '0x7a25...88D', amount: 250000, time: '2 min ago', market: null },
  { type: 'trade', address: '0xdead...000', amount: 85000, time: '5 min ago', market: 'Trump 2024' },
  { type: 'deposit', address: '0x3fc9...fad', amount: 500000, time: '12 min ago', market: null },
  { type: 'trade', address: '0x1111...97d', amount: 42000, time: '18 min ago', market: 'Fed Rate Cut' },
  { type: 'withdrawal', address: '0x68b3...c45', amount: 175000, time: '25 min ago', market: null },
];

const generateTrendingMarkets = () => [
  { name: 'Trump wins 2024', whales: 23, volume: 4200000, sentiment: 67 },
  { name: 'Bitcoin > $100k by EOY', whales: 18, volume: 2800000, sentiment: 72 },
  { name: 'Fed cuts rates Jan', whales: 15, volume: 1950000, sentiment: 54 },
  { name: 'Ethereum flips BTC', whales: 12, volume: 890000, sentiment: 23 },
  { name: 'GPT-5 announced Q1', whales: 9, volume: 650000, sentiment: 81 },
];

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

const GlowText = ({ children, color = 'cyan', className = '' }) => (
  <span 
    className={className}
    style={{
      color: tokens.colors[color],
      textShadow: `0 0 20px ${tokens.colors[color]}40, 0 0 40px ${tokens.colors[color]}20`,
    }}
  >
    {children}
  </span>
);

const Pill = ({ children, variant = 'default', glow = false }) => {
  const variants = {
    default: { bg: tokens.colors.surface, border: tokens.colors.border, color: tokens.colors.textSecondary },
    cyan: { bg: `${tokens.colors.cyan}15`, border: tokens.colors.cyan, color: tokens.colors.cyan },
    profit: { bg: `${tokens.colors.profit}15`, border: tokens.colors.profit, color: tokens.colors.profit },
    loss: { bg: `${tokens.colors.loss}15`, border: tokens.colors.loss, color: tokens.colors.loss },
    magenta: { bg: `${tokens.colors.magenta}15`, border: tokens.colors.magenta, color: tokens.colors.magenta },
  };
  
  const v = variants[variant];
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      background: v.bg,
      border: `1px solid ${v.border}`,
      borderRadius: '999px',
      fontSize: '12px',
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 500,
      color: v.color,
      boxShadow: glow ? `0 0 15px ${v.border}30` : 'none',
    }}>
      {children}
    </span>
  );
};

const LiveIndicator = () => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontFamily: "'JetBrains Mono', monospace",
    color: tokens.colors.profit,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  }}>
    <span style={{
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: tokens.colors.profit,
      boxShadow: `0 0 10px ${tokens.colors.profit}`,
      animation: 'pulse 2s ease-in-out infinite',
    }} />
    LIVE
  </span>
);

const WalletAddress = ({ address, short = true, onClick }) => {
  const display = short ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
  
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        background: `${tokens.colors.cyan}10`,
        border: 'none',
        borderRadius: '6px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '13px',
        color: tokens.colors.cyan,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.target.style.background = `${tokens.colors.cyan}20`;
        e.target.style.boxShadow = `0 0 15px ${tokens.colors.cyanGlow}`;
      }}
      onMouseLeave={(e) => {
        e.target.style.background = `${tokens.colors.cyan}10`;
        e.target.style.boxShadow = 'none';
      }}
    >
      {display}
    </button>
  );
};

const formatUSD = (num) => {
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (Math.abs(num) >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
};

const formatPercent = (num) => {
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
};

// ============================================================================
// ASCII WHALE
// ============================================================================

const AsciiWhale = ({ size = 'md', animated = false }) => {
  const scales = { sm: 0.5, md: 1, lg: 1.5 };
  const scale = scales[size];
  
  return (
    <pre style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: `${10 * scale}px`,
      lineHeight: 1.2,
      color: tokens.colors.cyan,
      textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
      margin: 0,
      animation: animated ? 'float 3s ease-in-out infinite' : 'none',
    }}>
{`        .
       ":"
     ___:____     |"\\/"|
   ,'        \`.    \\  /
   |  O        \\___/  |
 ~^~^~^~^~^~^~^~^~^~^~^~^~`}
    </pre>
  );
};

// ============================================================================
// HEADER COMPONENT
// ============================================================================

const Header = ({ currentView, setView, isMobile }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '◉' },
    { id: 'whales', label: 'Whales', icon: '🐋' },
    { id: 'alerts', label: 'Alerts', icon: '⚡' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
  ];

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: isMobile ? '60px' : '70px',
      background: `${tokens.colors.void}ee`,
      backdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${tokens.colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 16px' : '0 32px',
      zIndex: 1000,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: isMobile ? '32px' : '40px',
          height: isMobile ? '32px' : '40px',
          background: `linear-gradient(135deg, ${tokens.colors.cyan} 0%, ${tokens.colors.magenta} 100%)`,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isMobile ? '18px' : '22px',
          boxShadow: `0 0 30px ${tokens.colors.cyanGlow}`,
        }}>
          🐋
        </div>
        {!isMobile && (
          <div>
            <div style={{
              fontFamily: "'Exo 2', sans-serif",
              fontWeight: 800,
              fontSize: '18px',
              color: tokens.colors.textPrimary,
              letterSpacing: '-0.02em',
            }}>
              PolyWolyTroly
            </div>
            <div style={{
              fontSize: '10px',
              color: tokens.colors.textMuted,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Whale Intelligence
            </div>
          </div>
        )}
      </div>

      {/* Desktop Nav */}
      {!isMobile && (
        <nav style={{ display: 'flex', gap: '8px' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                background: currentView === item.id ? `${tokens.colors.cyan}15` : 'transparent',
                border: currentView === item.id ? `1px solid ${tokens.colors.cyan}50` : '1px solid transparent',
                borderRadius: '8px',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '14px',
                fontWeight: 500,
                color: currentView === item.id ? tokens.colors.cyan : tokens.colors.textSecondary,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (currentView !== item.id) {
                  e.target.style.background = `${tokens.colors.surface}`;
                  e.target.style.color = tokens.colors.textPrimary;
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== item.id) {
                  e.target.style.background = 'transparent';
                  e.target.style.color = tokens.colors.textSecondary;
                }
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      )}

      {/* Live Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <LiveIndicator />
        {!isMobile && (
          <button style={{
            padding: '10px 20px',
            background: tokens.colors.cyan,
            border: 'none',
            borderRadius: '8px',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '14px',
            fontWeight: 600,
            color: tokens.colors.void,
            cursor: 'pointer',
            boxShadow: `0 0 20px ${tokens.colors.cyanGlow}`,
            transition: 'all 0.15s ease',
          }}>
            Connect Telegram
          </button>
        )}
      </div>
    </header>
  );
};

// ============================================================================
// MOBILE BOTTOM NAV
// ============================================================================

const MobileNav = ({ currentView, setView }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: '◉' },
    { id: 'whales', label: 'Whales', icon: '🐋' },
    { id: 'alerts', label: 'Alerts', icon: '⚡' },
    { id: 'settings', label: 'More', icon: '⋯' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '70px',
      background: `${tokens.colors.void}ee`,
      backdropFilter: 'blur(20px)',
      borderTop: `1px solid ${tokens.colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 16px',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 1000,
    }}>
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => setView(item.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            color: currentView === item.id ? tokens.colors.cyan : tokens.colors.textMuted,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ 
            fontSize: '22px',
            filter: currentView === item.id ? `drop-shadow(0 0 8px ${tokens.colors.cyan})` : 'none',
          }}>
            {item.icon}
          </span>
          <span style={{
            fontSize: '10px',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: currentView === item.id ? 600 : 400,
            letterSpacing: '0.02em',
          }}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
};

// ============================================================================
// STAT CARD
// ============================================================================

const StatCard = ({ label, value, subValue, trend, icon, accentColor = 'cyan', delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div style={{
      background: tokens.colors.surface,
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: '12px',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      {/* Accent glow */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '3px',
        background: `linear-gradient(90deg, ${tokens.colors[accentColor]}, transparent)`,
        opacity: 0.8,
      }} />
      
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{
          fontSize: '11px',
          fontFamily: "'JetBrains Mono', monospace",
          color: tokens.colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          {label}
        </span>
        <span style={{ fontSize: '18px', opacity: 0.7 }}>{icon}</span>
      </div>
      
      <div style={{
        fontFamily: "'Exo 2', sans-serif",
        fontSize: '28px',
        fontWeight: 700,
        color: tokens.colors.textPrimary,
        marginBottom: '4px',
      }}>
        {value}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {trend !== undefined && (
          <span style={{
            color: trend >= 0 ? tokens.colors.profit : tokens.colors.loss,
            fontSize: '12px',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 500,
          }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
        {subValue && (
          <span style={{
            color: tokens.colors.textMuted,
            fontSize: '12px',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// ALERT FEED
// ============================================================================

const AlertFeed = ({ alerts, isMobile }) => {
  return (
    <div style={{
      background: tokens.colors.surface,
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${tokens.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>⚡</span>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            fontSize: '14px',
            color: tokens.colors.textPrimary,
          }}>
            Live Feed
          </span>
        </div>
        <LiveIndicator />
      </div>
      
      <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
        {alerts.map((alert, i) => (
          <div
            key={i}
            style={{
              padding: '14px 20px',
              borderBottom: `1px solid ${tokens.colors.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
              animation: `fadeInUp 0.4s ${i * 0.08}s both cubic-bezier(0.16, 1, 0.3, 1)`,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = tokens.colors.surfaceHover}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: alert.type === 'deposit' ? `${tokens.colors.profit}15` :
                         alert.type === 'trade' ? `${tokens.colors.cyan}15` :
                         `${tokens.colors.magenta}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}>
              {alert.type === 'deposit' ? '💰' : alert.type === 'trade' ? '📊' : '📤'}
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  color: tokens.colors.cyan,
                }}>
                  {alert.address}
                </span>
                <Pill variant={alert.type === 'deposit' ? 'profit' : alert.type === 'trade' ? 'cyan' : 'magenta'}>
                  {alert.type}
                </Pill>
              </div>
              <div style={{
                fontSize: '12px',
                color: tokens.colors.textSecondary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {formatUSD(alert.amount)} {alert.market && `→ ${alert.market}`}
              </div>
            </div>
            
            <span style={{
              fontSize: '11px',
              fontFamily: "'JetBrains Mono', monospace",
              color: tokens.colors.textMuted,
              whiteSpace: 'nowrap',
            }}>
              {alert.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// TRENDING MARKETS
// ============================================================================

const TrendingMarkets = ({ markets }) => {
  return (
    <div style={{
      background: tokens.colors.surface,
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${tokens.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ fontSize: '16px' }}>🔥</span>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          fontSize: '14px',
          color: tokens.colors.textPrimary,
        }}>
          Whale-Trending Markets
        </span>
      </div>
      
      <div>
        {markets.map((market, i) => (
          <div
            key={i}
            style={{
              padding: '14px 20px',
              borderBottom: `1px solid ${tokens.colors.border}`,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
              animation: `fadeInUp 0.4s ${i * 0.08}s both cubic-bezier(0.16, 1, 0.3, 1)`,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = tokens.colors.surfaceHover}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '14px',
                fontWeight: 500,
                color: tokens.colors.textPrimary,
              }}>
                {market.name}
              </span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '13px',
                color: tokens.colors.cyan,
              }}>
                {market.whales} 🐋
              </span>
            </div>
            
            {/* Sentiment bar */}
            <div style={{
              height: '4px',
              background: tokens.colors.border,
              borderRadius: '2px',
              overflow: 'hidden',
              marginBottom: '6px',
            }}>
              <div style={{
                width: `${market.sentiment}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${tokens.colors.profit}, ${tokens.colors.cyan})`,
                borderRadius: '2px',
                transition: 'width 0.5s ease',
              }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontSize: '11px',
                fontFamily: "'JetBrains Mono', monospace",
                color: tokens.colors.textMuted,
              }}>
                Vol: {formatUSD(market.volume)}
              </span>
              <span style={{
                fontSize: '11px',
                fontFamily: "'JetBrains Mono', monospace",
                color: market.sentiment >= 50 ? tokens.colors.profit : tokens.colors.loss,
              }}>
                {market.sentiment}% YES
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// WHALE TABLE
// ============================================================================

const WhaleTable = ({ whales, onSelectWhale, isMobile }) => {
  const [sortBy, setSortBy] = useState('totalDeposits');
  const [sortDir, setSortDir] = useState('desc');
  const [filter, setFilter] = useState('');

  const sortedWhales = [...whales]
    .filter(w => 
      w.address.toLowerCase().includes(filter.toLowerCase()) ||
      w.alias.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      const mult = sortDir === 'desc' ? -1 : 1;
      return (a[sortBy] - b[sortBy]) * mult;
    });

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Search */}
        <div style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
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
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '14px',
              color: tokens.colors.textPrimary,
            }}
          />
        </div>

        {/* Cards */}
        {sortedWhales.map((whale, i) => (
          <div
            key={whale.address}
            onClick={() => onSelectWhale(whale)}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: `linear-gradient(135deg, ${tokens.colors.cyan}30, ${tokens.colors.magenta}30)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}>
                  🐋
                </div>
                <div>
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                    fontSize: '14px',
                    color: tokens.colors.textPrimary,
                  }}>
                    {whale.alias}
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    color: tokens.colors.cyan,
                  }}>
                    {whale.address.slice(0, 8)}...{whale.address.slice(-6)}
                  </div>
                </div>
              </div>
              {whale.isLive && <LiveIndicator />}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}>
              <div>
                <div style={{ fontSize: '10px', color: tokens.colors.textMuted, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Deposits
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: tokens.colors.textPrimary, fontWeight: 500 }}>
                  {formatUSD(whale.totalDeposits)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: tokens.colors.textMuted, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  P&L
                </div>
                <div style={{ 
                  fontFamily: "'JetBrains Mono', monospace", 
                  fontSize: '14px', 
                  color: whale.pnl >= 0 ? tokens.colors.profit : tokens.colors.loss,
                  fontWeight: 500,
                }}>
                  {whale.pnl >= 0 ? '+' : ''}{formatUSD(whale.pnl)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: tokens.colors.textMuted, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Win Rate
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: tokens.colors.textPrimary }}>
                  {whale.winRate.toFixed(0)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: tokens.colors.textMuted, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Positions
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: tokens.colors.textPrimary }}>
                  {whale.positions}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop table
  return (
    <div style={{
      background: tokens.colors.surface,
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Search bar */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${tokens.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{ color: tokens.colors.textMuted }}>🔍</span>
        <input
          type="text"
          placeholder="Search by address or alias..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '14px',
            color: tokens.colors.textPrimary,
          }}
        />
        <Pill variant="cyan">{sortedWhales.length} whales</Pill>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: tokens.colors.void }}>
              {[
                { key: 'alias', label: 'Whale' },
                { key: 'totalDeposits', label: 'Deposits' },
                { key: 'pnl', label: 'P&L' },
                { key: 'pnlPercent', label: 'ROI' },
                { key: 'winRate', label: 'Win Rate' },
                { key: 'trades', label: 'Trades' },
                { key: 'positions', label: 'Positions' },
                { key: 'lastActive', label: 'Last Active' },
              ].map(col => (
                <th
                  key={col.key}
                  onClick={() => {
                    if (sortBy === col.key) {
                      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortBy(col.key);
                      setSortDir('desc');
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '10px',
                    fontWeight: 500,
                    color: sortBy === col.key ? tokens.colors.cyan : tokens.colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}
                >
                  {col.label} {sortBy === col.key && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedWhales.map((whale, i) => (
              <tr
                key={whale.address}
                onClick={() => onSelectWhale(whale)}
                style={{
                  borderBottom: `1px solid ${tokens.colors.border}`,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  animation: `fadeInUp 0.4s ${i * 0.03}s both cubic-bezier(0.16, 1, 0.3, 1)`,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = tokens.colors.surfaceHover}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `linear-gradient(135deg, ${tokens.colors.cyan}30, ${tokens.colors.magenta}30)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                    }}>
                      🐋
                    </div>
                    <div>
                      <div style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 500,
                        fontSize: '13px',
                        color: tokens.colors.textPrimary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        {whale.alias}
                        {whale.isLive && (
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: tokens.colors.profit,
                            boxShadow: `0 0 8px ${tokens.colors.profit}`,
                          }} />
                        )}
                      </div>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        color: tokens.colors.cyan,
                      }}>
                        {whale.address.slice(0, 6)}...{whale.address.slice(-4)}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: tokens.colors.textPrimary }}>
                  {formatUSD(whale.totalDeposits)}
                </td>
                <td style={{ 
                  padding: '14px 16px', 
                  fontFamily: "'JetBrains Mono', monospace", 
                  fontSize: '13px',
                  color: whale.pnl >= 0 ? tokens.colors.profit : tokens.colors.loss,
                  fontWeight: 500,
                }}>
                  {whale.pnl >= 0 ? '+' : ''}{formatUSD(whale.pnl)}
                </td>
                <td style={{ 
                  padding: '14px 16px', 
                  fontFamily: "'JetBrains Mono', monospace", 
                  fontSize: '13px',
                  color: whale.pnlPercent >= 0 ? tokens.colors.profit : tokens.colors.loss,
                }}>
                  {formatPercent(whale.pnlPercent)}
                </td>
                <td style={{ padding: '14px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: tokens.colors.textPrimary }}>
                  {whale.winRate.toFixed(0)}%
                </td>
                <td style={{ padding: '14px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: tokens.colors.textSecondary }}>
                  {whale.trades}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <Pill variant="cyan">{whale.positions}</Pill>
                </td>
                <td style={{ padding: '14px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: tokens.colors.textMuted }}>
                  {whale.lastActive.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// WALLET PROFILE VIEW
// ============================================================================

const WalletProfile = ({ whale, onBack, isMobile }) => {
  const positions = [
    { market: 'Trump wins 2024', side: 'YES', size: 85000, entry: 0.52, current: 0.58, pnl: 9800 },
    { market: 'Bitcoin > $100k EOY', side: 'YES', size: 42000, entry: 0.35, current: 0.42, pnl: 8400 },
    { market: 'Fed cuts Jan', side: 'NO', size: 28000, entry: 0.68, current: 0.54, pnl: 5712 },
    { market: 'ETH flips BTC', side: 'NO', size: 15000, entry: 0.85, current: 0.91, pnl: -1350 },
  ];

  const trades = [
    { time: '2 hours ago', market: 'Trump 2024', action: 'BUY', side: 'YES', amount: 15000, price: 0.58 },
    { time: '5 hours ago', market: 'Fed Rate', action: 'SELL', side: 'NO', amount: 8000, price: 0.54 },
    { time: '1 day ago', market: 'BTC $100k', action: 'BUY', side: 'YES', amount: 22000, price: 0.40 },
    { time: '2 days ago', market: 'GPT-5 Q1', action: 'BUY', side: 'YES', amount: 5000, price: 0.72 },
  ];

  return (
    <div style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 0',
          background: 'transparent',
          border: 'none',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '14px',
          color: tokens.colors.textSecondary,
          cursor: 'pointer',
          marginBottom: '20px',
        }}
      >
        ← Back to Whales
      </button>

      {/* Header */}
      <div style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '16px',
        padding: isMobile ? '20px' : '28px',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Gradient accent */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${tokens.colors.cyan}, ${tokens.colors.magenta})`,
        }} />

        <div style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '20px' : '0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${tokens.colors.cyan}40, ${tokens.colors.magenta}40)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              boxShadow: `0 0 30px ${tokens.colors.cyanGlow}`,
            }}>
              🐋
            </div>
            <div>
              <h1 style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: isMobile ? '24px' : '28px',
                fontWeight: 700,
                color: tokens.colors.textPrimary,
                margin: 0,
                marginBottom: '4px',
              }}>
                {whale.alias}
              </h1>
              <WalletAddress address={whale.address} short={isMobile} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{
              padding: '10px 20px',
              background: `${tokens.colors.cyan}15`,
              border: `1px solid ${tokens.colors.cyan}50`,
              borderRadius: '8px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '13px',
              fontWeight: 500,
              color: tokens.colors.cyan,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              🔔 Follow
            </button>
            <button style={{
              padding: '10px 20px',
              background: tokens.colors.cyan,
              border: 'none',
              borderRadius: '8px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '13px',
              fontWeight: 600,
              color: tokens.colors.void,
              cursor: 'pointer',
            }}>
              Copy Trades
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <StatCard
          label="Total P&L"
          value={`${whale.pnl >= 0 ? '+' : ''}${formatUSD(whale.pnl)}`}
          subValue={formatPercent(whale.pnlPercent)}
          icon="💰"
          accentColor={whale.pnl >= 0 ? 'profit' : 'loss'}
          delay={0}
        />
        <StatCard
          label="Win Rate"
          value={`${whale.winRate.toFixed(0)}%`}
          subValue={`${whale.trades} trades`}
          icon="🎯"
          accentColor="cyan"
          delay={50}
        />
        <StatCard
          label="Total Deposited"
          value={formatUSD(whale.totalDeposits)}
          icon="📥"
          accentColor="magenta"
          delay={100}
        />
        <StatCard
          label="Open Positions"
          value={whale.positions.toString()}
          subValue="across markets"
          icon="📊"
          accentColor="purple"
          delay={150}
        />
      </div>

      {/* Positions */}
      <div style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '20px',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${tokens.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ fontSize: '16px' }}>📊</span>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            fontSize: '14px',
            color: tokens.colors.textPrimary,
          }}>
            Open Positions
          </span>
        </div>

        {isMobile ? (
          <div style={{ padding: '12px' }}>
            {positions.map((pos, i) => (
              <div
                key={i}
                style={{
                  padding: '14px',
                  background: tokens.colors.void,
                  borderRadius: '10px',
                  marginBottom: i < positions.length - 1 ? '10px' : 0,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', color: tokens.colors.textPrimary, fontWeight: 500 }}>
                    {pos.market}
                  </span>
                  <Pill variant={pos.side === 'YES' ? 'profit' : 'loss'}>{pos.side}</Pill>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: tokens.colors.textMuted }}>Size: </span>
                    <span style={{ color: tokens.colors.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{formatUSD(pos.size)}</span>
                  </div>
                  <div>
                    <span style={{ color: tokens.colors.textMuted }}>Entry: </span>
                    <span style={{ color: tokens.colors.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{pos.entry}</span>
                  </div>
                  <div>
                    <span style={{ color: tokens.colors.textMuted }}>Current: </span>
                    <span style={{ color: tokens.colors.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{pos.current}</span>
                  </div>
                  <div>
                    <span style={{ color: tokens.colors.textMuted }}>P&L: </span>
                    <span style={{ 
                      fontFamily: "'JetBrains Mono', monospace",
                      color: pos.pnl >= 0 ? tokens.colors.profit : tokens.colors.loss,
                      fontWeight: 500,
                    }}>
                      {pos.pnl >= 0 ? '+' : ''}{formatUSD(pos.pnl)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: tokens.colors.void }}>
                {['Market', 'Side', 'Size', 'Entry', 'Current', 'Unrealized P&L'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '10px',
                    fontWeight: 500,
                    color: tokens.colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${tokens.colors.border}` }}>
                  <td style={{ padding: '14px 16px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', color: tokens.colors.textPrimary }}>
                    {pos.market}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Pill variant={pos.side === 'YES' ? 'profit' : 'loss'}>{pos.side}</Pill>
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: tokens.colors.textPrimary }}>
                    {formatUSD(pos.size)}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: tokens.colors.textSecondary }}>
                    {pos.entry}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: tokens.colors.textPrimary }}>
                    {pos.current}
                  </td>
                  <td style={{ 
                    padding: '14px 16px', 
                    fontFamily: "'JetBrains Mono', monospace", 
                    fontSize: '13px',
                    color: pos.pnl >= 0 ? tokens.colors.profit : tokens.colors.loss,
                    fontWeight: 500,
                  }}>
                    {pos.pnl >= 0 ? '+' : ''}{formatUSD(pos.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Trade History */}
      <div style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${tokens.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ fontSize: '16px' }}>📜</span>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            fontSize: '14px',
            color: tokens.colors.textPrimary,
          }}>
            Recent Trades
          </span>
        </div>

        <div>
          {trades.map((trade, i) => (
            <div
              key={i}
              style={{
                padding: '14px 20px',
                borderBottom: i < trades.length - 1 ? `1px solid ${tokens.colors.border}` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: trade.action === 'BUY' ? `${tokens.colors.profit}15` : `${tokens.colors.loss}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                }}>
                  {trade.action === 'BUY' ? '📈' : '📉'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: '13px',
                      color: tokens.colors.textPrimary,
                    }}>
                      {trade.market}
                    </span>
                    <Pill variant={trade.action === 'BUY' ? 'profit' : 'loss'}>{trade.action}</Pill>
                    <Pill variant="default">{trade.side}</Pill>
                  </div>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    color: tokens.colors.textMuted,
                  }}>
                    {trade.time}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  color: tokens.colors.textPrimary,
                }}>
                  {formatUSD(trade.amount)}
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  color: tokens.colors.textMuted,
                }}>
                  @ {trade.price}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DASHBOARD VIEW
// ============================================================================

const Dashboard = ({ whales, alerts, markets, isMobile, onSelectWhale }) => {
  return (
    <div>
      {/* Hero section */}
      <div style={{
        marginBottom: '32px',
        textAlign: isMobile ? 'center' : 'left',
      }}>
        <h1 style={{
          fontFamily: "'Exo 2', sans-serif",
          fontSize: isMobile ? '28px' : '36px',
          fontWeight: 800,
          color: tokens.colors.textPrimary,
          marginBottom: '8px',
          letterSpacing: '-0.02em',
        }}>
          Whale Intelligence <GlowText>Dashboard</GlowText>
        </h1>
        <p style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '15px',
          color: tokens.colors.textSecondary,
          margin: 0,
        }}>
          Tracking {whales.length} whales across Polymarket
        </p>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <StatCard
          label="Whales Tracked"
          value={whales.length.toString()}
          trend={12}
          icon="🐋"
          delay={0}
        />
        <StatCard
          label="Total Volume"
          value="$42.8M"
          trend={8.4}
          icon="📊"
          accentColor="magenta"
          delay={50}
        />
        <StatCard
          label="Alerts Today"
          value="156"
          subValue="24 deposits"
          icon="⚡"
          accentColor="purple"
          delay={100}
        />
        <StatCard
          label="Avg Win Rate"
          value="67%"
          trend={2.3}
          icon="🎯"
          accentColor="profit"
          delay={150}
        />
      </div>

      {/* Main grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '20px',
      }}>
        <AlertFeed alerts={alerts} isMobile={isMobile} />
        <TrendingMarkets markets={markets} />
      </div>

      {/* Top Whales preview */}
      <div style={{ marginTop: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <h2 style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: '18px',
            fontWeight: 700,
            color: tokens.colors.textPrimary,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            🏆 Top Performers
          </h2>
          <button style={{
            background: 'transparent',
            border: 'none',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '13px',
            color: tokens.colors.cyan,
            cursor: 'pointer',
          }}>
            View All →
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '12px',
        }}>
          {whales.slice(0, 3).map((whale, i) => (
            <div
              key={whale.address}
              onClick={() => onSelectWhale(whale)}
              style={{
                background: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                animation: `fadeInUp 0.4s ${i * 0.1}s both cubic-bezier(0.16, 1, 0.3, 1)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.cyan;
                e.currentTarget.style.boxShadow = `0 0 30px ${tokens.colors.cyanGlow}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: `linear-gradient(135deg, ${['#ffd700', '#c0c0c0', '#cd7f32'][i]}40, ${tokens.colors.cyan}20)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}>
                  {['🥇', '🥈', '🥉'][i]}
                </div>
                <div>
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                    fontSize: '14px',
                    color: tokens.colors.textPrimary,
                  }}>
                    {whale.alias}
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    color: tokens.colors.cyan,
                  }}>
                    {whale.address.slice(0, 6)}...{whale.address.slice(-4)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '10px', color: tokens.colors.textMuted, marginBottom: '2px' }}>P&L</div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '15px',
                    fontWeight: 600,
                    color: whale.pnl >= 0 ? tokens.colors.profit : tokens.colors.loss,
                  }}>
                    {whale.pnl >= 0 ? '+' : ''}{formatUSD(whale.pnl)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: tokens.colors.textMuted, marginBottom: '2px' }}>Win Rate</div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '15px',
                    fontWeight: 500,
                    color: tokens.colors.textPrimary,
                  }}>
                    {whale.winRate.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedWhale, setSelectedWhale] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  
  const whales = generateWhaleData();
  const alerts = generateRecentAlerts();
  const markets = generateTrendingMarkets();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSelectWhale = (whale) => {
    setSelectedWhale(whale);
    setCurrentView('profile');
  };

  const renderView = () => {
    if (currentView === 'profile' && selectedWhale) {
      return (
        <WalletProfile 
          whale={selectedWhale} 
          onBack={() => { setCurrentView('whales'); setSelectedWhale(null); }}
          isMobile={isMobile}
        />
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard whales={whales} alerts={alerts} markets={markets} isMobile={isMobile} onSelectWhale={handleSelectWhale} />;
      case 'whales':
        return <WhaleTable whales={whales} onSelectWhale={handleSelectWhale} isMobile={isMobile} />;
      case 'alerts':
        return (
          <div>
            <h1 style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: isMobile ? '24px' : '32px',
              fontWeight: 800,
              color: tokens.colors.textPrimary,
              marginBottom: '20px',
            }}>
              <GlowText>⚡</GlowText> Alert Center
            </h1>
            <AlertFeed alerts={[...alerts, ...alerts]} isMobile={isMobile} />
          </div>
        );
      case 'settings':
        return (
          <div style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
          }}>
            <AsciiWhale size="lg" animated />
            <h2 style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: '24px',
              color: tokens.colors.textPrimary,
              marginTop: '24px',
              marginBottom: '8px',
            }}>
              Settings Coming Soon
            </h2>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: tokens.colors.textSecondary,
            }}>
              Configure alerts, notifications, and preferences
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.colors.void,
      color: tokens.colors.textPrimary,
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      {/* Global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@700;800&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          background: ${tokens.colors.void};
          overflow-x: hidden;
        }
        
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${tokens.colors.void};
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${tokens.colors.border};
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${tokens.colors.muted};
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        ::selection {
          background: ${tokens.colors.cyan}40;
          color: ${tokens.colors.textPrimary};
        }
      `}</style>

      {/* Background effects */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(ellipse at 20% 20%, ${tokens.colors.cyan}08 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, ${tokens.colors.magenta}05 0%, transparent 50%)
        `,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Subtle scanlines */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      <Header currentView={currentView} setView={setCurrentView} isMobile={isMobile} />
      
      <main style={{
        paddingTop: isMobile ? '80px' : '100px',
        paddingBottom: isMobile ? '100px' : '40px',
        paddingLeft: isMobile ? '16px' : '32px',
        paddingRight: isMobile ? '16px' : '32px',
        maxWidth: '1400px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 2,
      }}>
        {renderView()}
      </main>

      {isMobile && <MobileNav currentView={currentView} setView={setCurrentView} />}
    </div>
  );
}
