/**
 * CategoryTag Component
 *
 * Visual tag for market categorization.
 * Displays category icon and label with category-specific colors.
 *
 * @see Design docs/CATEGORY TAGS.md
 */

import { tokens } from '../styles/tokens';

export type MarketCategory =
  | 'politics'
  | 'crypto'
  | 'sports'
  | 'finance'
  | 'tech'
  | 'entertainment'
  | 'science'
  | 'world'
  | 'other';

/** Valid category values for validation */
export const VALID_CATEGORIES: MarketCategory[] = [
  'politics', 'crypto', 'sports', 'finance', 'tech',
  'entertainment', 'science', 'world', 'other'
];

/**
 * Map Polymarket API tag labels to our category system.
 * Polymarket uses tags like "Politics", "Sports", "Crypto", etc.
 * Returns null if no mapping found (caller should use inferCategory as fallback).
 *
 * @see https://docs.polymarket.com/api-reference/tags/list-tags
 */
export function mapApiCategory(apiCategory: string | undefined): MarketCategory | null {
  if (!apiCategory) return null;

  const normalized = apiCategory.toLowerCase().trim();

  // Direct matches to our categories
  if (VALID_CATEGORIES.includes(normalized as MarketCategory) && normalized !== 'other') {
    return normalized as MarketCategory;
  }

  // Map common Polymarket tags to our categories
  const tagMappings: Record<string, MarketCategory> = {
    // Politics
    'politics': 'politics',
    'elections': 'politics',
    'us politics': 'politics',
    'trump': 'politics',
    'biden': 'politics',
    'government': 'politics',

    // Crypto
    'crypto': 'crypto',
    'cryptocurrency': 'crypto',
    'bitcoin': 'crypto',
    'ethereum': 'crypto',
    'defi': 'crypto',

    // Sports
    'sports': 'sports',
    'nba': 'sports',
    'nfl': 'sports',
    'mlb': 'sports',
    'nhl': 'sports',
    'soccer': 'sports',
    'football': 'sports',
    'basketball': 'sports',
    'baseball': 'sports',
    'ufc': 'sports',
    'boxing': 'sports',
    'f1': 'sports',
    'formula 1': 'sports',
    'tennis': 'sports',
    'golf': 'sports',

    // Finance
    'finance': 'finance',
    'business': 'finance',
    'economics': 'finance',
    'fed': 'finance',
    'markets': 'finance',
    'stocks': 'finance',

    // Tech
    'tech': 'tech',
    'technology': 'tech',
    'ai': 'tech',
    'artificial intelligence': 'tech',

    // Entertainment
    'entertainment': 'entertainment',
    'pop culture': 'entertainment',
    'movies': 'entertainment',
    'music': 'entertainment',
    'tv': 'entertainment',
    'television': 'entertainment',
    'celebrities': 'entertainment',
    'awards': 'entertainment',

    // Science
    'science': 'science',
    'space': 'science',
    'weather': 'science',
    'health': 'science',
    'medicine': 'science',

    // World
    'world': 'world',
    'geopolitics': 'world',
    'international': 'world',
    'global': 'world',
    'war': 'world',
    'conflict': 'world',
  };

  return tagMappings[normalized] || null;
}

type TagSize = 'small' | 'default' | 'large';

interface CategoryTagProps {
  /** Market category to display */
  category: MarketCategory;
  /** Tag size variant */
  size?: TagSize;
  /** If true, shows as selected/active */
  active?: boolean;
  /** If provided, tag is clickable */
  onClick?: () => void;
  /** Hide the icon, show only text */
  hideIcon?: boolean;
  /** Override the default icon (e.g., for sport-specific emojis) */
  iconOverride?: string;
}

/** Category configuration with icon, label, and color */
const CATEGORY_CONFIG: Record<MarketCategory, { icon: string; label: string; color: string }> = {
  politics: { icon: '🏛️', label: 'Politics', color: '#ff6b35' },
  crypto: { icon: '₿', label: 'Crypto', color: '#f7931a' },
  sports: { icon: '⚽', label: 'Sports', color: '#22c55e' },
  finance: { icon: '📈', label: 'Finance', color: '#3b82f6' },
  tech: { icon: '💻', label: 'Tech', color: '#a855f7' },
  entertainment: { icon: '🎬', label: 'Entertainment', color: '#ec4899' },
  science: { icon: '🔬', label: 'Science', color: '#06b6d4' },
  world: { icon: '🌍', label: 'World', color: '#64748b' },
  other: { icon: '📌', label: 'Other', color: '#6b7280' },
};

/**
 * Get sport-specific emoji based on series slug or question text.
 * Maps league/series prefixes to appropriate sport emojis.
 * Returns default sports emoji (🏆) if no match found.
 *
 * @param seriesSlug - Series slug from Polymarket (e.g., "nba-2026", "premier-league-2025")
 * @param question - Optional market question text as fallback for keyword matching
 * @returns Sport-specific emoji
 */
export function getSportEmoji(seriesSlug: string | null | undefined, question?: string): string {
  // Build slug from seriesSlug or question for matching
  const slug = seriesSlug?.toLowerCase() || '';
  const q = question?.toLowerCase() || '';

  // Boxing/MMA - check first since fighters like Jake Paul, etc. should show boxing
  if (slug.includes('ufc') || slug.includes('boxing') || slug.includes('mma') ||
      /\b(ufc|boxing|mma|fight|knockout|jake paul|anthony joshua|tyson|fury|canelo|mayweather|mcgregor|heavyweight|middleweight|lightweight|title fight|round \d+)\b/i.test(q)) {
    return '🥊';
  }

  // Basketball - NBA teams
  if (slug.startsWith('nba') || slug.includes('basketball') || slug.includes('ncaa-basketball') || slug.includes('wnba') ||
      /\b(nba|wnba|basketball|76ers|sixers|blazers|bucks|bulls|cavaliers|cavs|celtics|clippers|grizzlies|hawks|heat|hornets|jazz|kings|knicks|lakers|magic|mavericks|mavs|nets|nuggets|pacers|pelicans|pistons|raptors|rockets|spurs|suns|thunder|timberwolves|warriors|wizards)\b/i.test(q)) {
    return '🏀';
  }

  // American Football - NFL teams
  if (slug.startsWith('nfl') || slug.includes('ncaa-football') || slug.includes('college-football') ||
      slug.includes('super-bowl') || slug.includes('super bowl') ||
      /\b(nfl|super bowl|ncaa football|college football|49ers|bears|bengals|bills|broncos|browns|buccaneers|cardinals|chargers|chiefs|colts|commanders|cowboys|dolphins|eagles|falcons|giants|jaguars|jets|lions|packers|panthers|patriots|raiders|rams|ravens|saints|seahawks|steelers|texans|titans|vikings)\b/i.test(q) ||
      /\b(volunteers|crimson tide|bulldogs|gators|wildcats|longhorns|buckeyes|wolverines|trojans|fighting irish|seminoles|aggies|cougars|huskies|cornhuskers|hawkeyes|jayhawks|mountaineers|razorbacks|sooners|tar heels)\b/i.test(q) ||
      /\b(fresno state|utah state|boise state|san diego state|colorado state|ohio state|penn state|michigan state|florida state|arizona state|nc state|iowa state|kansas state|oklahoma state|oregon state|washington state)\b/i.test(q)) {
    return '🏈';
  }

  // Soccer/Football
  if (slug.includes('premier-league') || slug.includes('la-liga') || slug.includes('bundesliga') ||
      slug.includes('serie-a') || slug.includes('ligue-1') || slug.includes('mls') ||
      slug.includes('champions-league') || slug.includes('world-cup') || slug.includes('euro-') ||
      slug.includes('soccer') || slug.includes('epl') ||
      /\b(soccer|premier league|la liga|bundesliga|serie a|ligue 1|champions league|world cup|euro 202)\b/i.test(q) ||
      // English Premier League teams
      /\b(manchester|liverpool|chelsea|arsenal|tottenham|newcastle|brighton|aston villa|west ham|bournemouth|fulham|brentford|crystal palace|wolves|wolverhampton|everton|nottingham forest|luton|burnley|sheffield united|sheffield)\b/i.test(q) ||
      // Other top European clubs
      /\b(barcelona|real madrid|atletico madrid|bayern|borussia dortmund|juventus|napoli|roma|lazio|psg|paris saint|marseille|lyon|inter milan|ac milan|benfica|porto|sporting|ajax|feyenoord)\b/i.test(q) ||
      // Generic football/soccer terms
      /\b(fc|united fc|city fc|\.fc\b|football club)\b/i.test(q)) {
    return '⚽';
  }

  // Baseball - MLB teams
  if (slug.startsWith('mlb') || slug.includes('baseball') || slug.includes('world-series') ||
      /\b(mlb|baseball|world series|astros|athletics|blue jays|braves|brewers|cardinals|cubs|diamondbacks|dodgers|giants|guardians|mariners|marlins|mets|nationals|orioles|padres|phillies|pirates|rangers|rays|red sox|reds|rockies|royals|tigers|twins|white sox|yankees)\b/i.test(q)) {
    return '⚾';
  }

  // Hockey - NHL teams
  if (slug.startsWith('nhl') || slug.includes('hockey') || slug.includes('stanley-cup') ||
      /\b(nhl|hockey|stanley cup|avalanche|blackhawks|blue jackets|blues|bruins|canadiens|canucks|capitals|coyotes|devils|ducks|flames|flyers|golden knights|hurricanes|islanders|kraken|lightning|maple leafs|oilers|penguins|predators|red wings|sabres|senators|sharks|stars|wild)\b/i.test(q)) {
    return '🏒';
  }

  // Tennis
  if (slug.includes('tennis') || slug.includes('wimbledon') || slug.includes('us-open') ||
      slug.includes('french-open') || slug.includes('australian-open') || slug.includes('atp') || slug.includes('wta') ||
      /\b(tennis|wimbledon|us open|french open|australian open|atp|wta|djokovic|nadal|federer|alcaraz|sinner|swiatek|sabalenka)\b/i.test(q)) {
    return '🎾';
  }

  // Golf
  if (slug.includes('golf') || slug.includes('pga') || slug.includes('masters') || slug.includes('ryder-cup') ||
      /\b(golf|pga|masters|ryder cup|lpga|british open|us open golf)\b/i.test(q)) {
    return '⛳';
  }

  // Racing
  if (slug.includes('f1') || slug.includes('formula') || slug.includes('nascar') || slug.includes('racing') ||
      /\b(f1|formula 1|formula1|nascar|racing|grand prix|verstappen|hamilton|leclerc)\b/i.test(q)) {
    return '🏎️';
  }

  // Cricket
  if (slug.includes('cricket') || slug.includes('ipl') || slug.includes('t20') ||
      /\b(cricket|ipl|t20|test match|ashes)\b/i.test(q)) {
    return '🏏';
  }

  // Rugby
  if (slug.includes('rugby') || /\b(rugby|six nations)\b/i.test(q)) {
    return '🏉';
  }

  // Esports
  if (slug.includes('esports') || slug.includes('league-of-legends') || slug.includes('dota') || slug.includes('csgo') ||
      /\b(esports|e-sports|league of legends|dota|csgo|cs2|valorant|overwatch)\b/i.test(q)) {
    return '🎮';
  }

  return '🏆'; // Default to trophy for unknown sports
}

/** Size configuration for different tag variants */
const SIZE_CONFIG: Record<TagSize, {
  height: string;
  padding: string;
  fontSize: string;
  iconSize: string;
  gap: string;
}> = {
  small: { height: '20px', padding: '0 8px', fontSize: '10px', iconSize: '11px', gap: '3px' },
  default: { height: '26px', padding: '0 12px', fontSize: '12px', iconSize: '13px', gap: '5px' },
  large: { height: '32px', padding: '0 16px', fontSize: '13px', iconSize: '15px', gap: '6px' },
};

/**
 * CategoryTag component for displaying market category labels.
 */
export function CategoryTag({
  category,
  size = 'small',
  active = false,
  onClick,
  hideIcon = false,
  iconOverride,
}: CategoryTagProps) {
  const config = CATEGORY_CONFIG[category];
  const sizeConfig = SIZE_CONFIG[size];
  const isClickable = !!onClick;
  const displayIcon = iconOverride || config.icon;

  return (
    <span
      data-testid={`category-tag-${category}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeConfig.gap,
        height: sizeConfig.height,
        padding: sizeConfig.padding,

        background: active ? config.color : `${config.color}15`,
        border: `1px solid ${active ? config.color : `${config.color}40`}`,
        borderRadius: '4px',

        fontFamily: tokens.fonts.mono,
        fontSize: sizeConfig.fontSize,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: active ? tokens.colors.void : config.color,

        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        userSelect: 'none',

        ...(active && {
          boxShadow: `0 0 15px ${config.color}40`,
        }),
      }}
      onMouseEnter={(e) => {
        if (!active && isClickable) {
          e.currentTarget.style.background = `${config.color}25`;
          e.currentTarget.style.borderColor = `${config.color}60`;
          e.currentTarget.style.boxShadow = `0 0 10px ${config.color}20`;
        }
      }}
      onMouseLeave={(e) => {
        if (!active && isClickable) {
          e.currentTarget.style.background = `${config.color}15`;
          e.currentTarget.style.borderColor = `${config.color}40`;
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {!hideIcon && (
        <span style={{ fontSize: sizeConfig.iconSize, lineHeight: 1 }}>
          {displayIcon}
        </span>
      )}
      <span>{config.label}</span>
    </span>
  );
}

/**
 * Helper to infer category from market question using keyword matching.
 * Used as fallback when category is not provided by the API.
 *
 * @param question - Market question text
 * @returns Inferred category
 */
export function inferCategory(question: string): MarketCategory {
  const q = question.toLowerCase();

  // Politics - elections, politicians, government
  if (/trump|biden|election|president|congress|senate|governor|vote|democrat|republican|nominee|cabinet|administration/i.test(q)) {
    return 'politics';
  }
  // Crypto - cryptocurrencies and blockchain
  if (/bitcoin|btc|ethereum|eth|crypto|defi|blockchain|solana|altcoin/i.test(q)) {
    return 'crypto';
  }
  // Sports - leagues, teams, athletes, competitions, betting patterns
  // Check sports BEFORE world to prevent "Warriors" matching "war"
  if (
    // Betting patterns
    /^spread:|^o\/u\s|over\/under|\(\-?\d+\.?\d*\)|\bvs\.?\b/i.test(q) ||
    // Major leagues
    /\b(nfl|nba|mlb|nhl|ncaa|mls|ufc|pga|wwe|wnba|afl|epl|f1)\b/i.test(q) ||
    // Sports terms
    /\b(championship|playoff|playoffs|finals|super bowl|world series|stanley cup|world cup)\b/i.test(q) ||
    // NFL teams
    /\b(49ers|bears|bengals|bills|broncos|browns|buccaneers|cardinals|chargers|chiefs|colts|commanders|cowboys|dolphins|eagles|falcons|giants|jaguars|jets|lions|packers|panthers|patriots|raiders|rams|ravens|saints|seahawks|steelers|texans|titans|vikings)\b/i.test(q) ||
    // NBA teams
    /\b(76ers|sixers|blazers|bucks|bulls|cavaliers|cavs|celtics|clippers|grizzlies|hawks|heat|hornets|jazz|kings|knicks|lakers|magic|mavericks|mavs|nets|nuggets|pacers|pelicans|pistons|raptors|rockets|spurs|suns|thunder|timberwolves|warriors|wizards)\b/i.test(q) ||
    // MLB teams
    /\b(astros|athletics|blue jays|braves|brewers|cardinals|cubs|diamondbacks|dodgers|giants|guardians|mariners|marlins|mets|nationals|orioles|padres|phillies|pirates|rangers|rays|red sox|reds|rockies|royals|tigers|twins|white sox|yankees)\b/i.test(q) ||
    // NHL teams
    /\b(avalanche|blackhawks|blue jackets|blues|bruins|canadiens|canucks|capitals|coyotes|devils|ducks|flames|flyers|golden knights|hurricanes|islanders|kraken|kings|lightning|maple leafs|oilers|penguins|predators|red wings|sabres|senators|sharks|stars|wild|jets)\b/i.test(q) ||
    // College sports patterns (team names with state/school context)
    /\b(volunteers|crimson tide|bulldogs|gators|wildcats|longhorns|buckeyes|wolverines|trojans|fighting irish|seminoles|aggies|cougars|huskies|ducks|beavers|bruins|cardinal|cornhuskers|hawkeyes|jayhawks|mountaineers|razorbacks|sooners|tar heels|tigers|blue devils)\b/i.test(q) ||
    // College patterns
    /\b(fresno state|utah state|boise state|san diego state|colorado state|ohio state|penn state|michigan state|florida state|arizona state|nc state|iowa state|kansas state|oklahoma state|oregon state|washington state)\b/i.test(q) ||
    // General sports terms
    /\b(touchdown|field goal|home run|slam dunk|hat trick|knockout|round \d|game \d|match\b|bout\b|fight\b|title fight|heavyweight|middleweight|lightweight)\b/i.test(q)
  ) {
    return 'sports';
  }
  // Finance - markets, rates, economic indicators
  if (/stock|fed\b|interest rate|inflation|gdp|earnings|ipo|s&p|nasdaq|dow|treasury|bond|bps/i.test(q)) {
    return 'finance';
  }
  // Tech - companies, products, AI
  if (/apple|google|microsoft|ai\b|gpt|openai|iphone|android|startup|meta|amazon|tesla/i.test(q)) {
    return 'tech';
  }
  // Entertainment - shows, movies, music, awards
  if (/oscar|grammy|movie|film|album|award|netflix|disney|celebrity|stranger things|season|episode|emmy|golden globe/i.test(q)) {
    return 'entertainment';
  }
  // Science - research, space, health
  if (/nasa|space|climate|research|study|vaccine|species|discovery|spacex|mars|moon/i.test(q)) {
    return 'science';
  }
  // World - geopolitics, conflicts, international affairs
  // Use word boundary for "war" to prevent matching "Warriors"
  if (/\bwar\b|treaty|country|nation|international|un\b|nato|summit|invade|military|custody|venezuela|ukraine|russia|china|iran|israel/i.test(q)) {
    return 'world';
  }

  return 'other';
}
