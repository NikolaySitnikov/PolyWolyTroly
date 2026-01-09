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
  politics: { icon: '🏛️', label: 'Politics', color: '#ef4444' },  // Red - government/elections
  crypto: { icon: '₿', label: 'Crypto', color: '#f7931a' },       // Bitcoin orange
  sports: { icon: '⚽', label: 'Sports', color: '#22c55e' },       // Green
  finance: { icon: '📈', label: 'Finance', color: '#3b82f6' },    // Blue
  tech: { icon: '💻', label: 'Tech', color: '#a855f7' },          // Purple
  entertainment: { icon: '🎬', label: 'Entertainment', color: '#ec4899' },  // Pink
  science: { icon: '🔬', label: 'Science', color: '#06b6d4' },    // Cyan
  world: { icon: '🌍', label: 'World', color: '#14b8a6' },        // Teal - international/geopolitics
  other: { icon: '📌', label: 'Other', color: '#6b7280' },        // Gray
};

// =============================================================================
// COMPREHENSIVE TEAM/LEAGUE DATABASES
// Researched from official sources (ESPN, Wikipedia, official league sites)
// =============================================================================

// NBA Teams (30 teams) - All current team names and nicknames
const NBA_TEAMS = /\b(nba|wnba|basketball|76ers|sixers|celtics|nets|knicks|raptors|bulls|cavaliers|cavs|pistons|pacers|bucks|hawks|hornets|heat|magic|wizards|nuggets|timberwolves|thunder|trail blazers|blazers|jazz|warriors|clippers|lakers|suns|kings|mavericks|mavs|rockets|grizzlies|pelicans|spurs)\b/i;

// NFL Teams (32 teams) - All current team names
const NFL_TEAMS = /\b(nfl|49ers|niners|bears|bengals|bills|broncos|browns|buccaneers|bucs|cardinals|chargers|chiefs|colts|commanders|cowboys|dolphins|eagles|falcons|giants|jaguars|jags|jets|lions|packers|panthers|patriots|pats|raiders|rams|ravens|saints|seahawks|hawks|steelers|texans|titans|vikings)\b/i;

// MLB Teams (30 teams) - All current team names
const MLB_TEAMS = /\b(mlb|baseball|world series|athletics|orioles|red sox|redsox|white sox|whitesox|guardians|tigers|astros|royals|angels|twins|yankees|mariners|rays|rangers|blue jays|diamondbacks|d-backs|braves|cubs|reds|rockies|dodgers|marlins|brewers|mets|phillies|pirates|padres|giants|cardinals)\b/i;

// NHL Teams (32 teams) - All current team names including Utah Mammoth (new)
const NHL_TEAMS = /\b(nhl|hockey|stanley cup|ducks|bruins|sabres|flames|hurricanes|canes|blackhawks|avalanche|avs|blue jackets|stars|red wings|oilers|panthers|kings|wild|canadiens|habs|predators|preds|devils|islanders|isles|rangers|senators|sens|flyers|penguins|pens|sharks|kraken|blues|lightning|bolts|maple leafs|leafs|utah mammoth|canucks|golden knights|knights|capitals|caps|jets|winnipeg jets)\b/i;

// MLS Teams (30 teams) - All current team names
const MLS_TEAMS = /\b(mls|atlanta united|cf montreal|charlotte fc|chicago fire|columbus crew|dc united|fc cincinnati|inter miami|nashville sc|new england revolution|new york city fc|nycfc|new york red bulls|red bulls|orlando city|philadelphia union|toronto fc|austin fc|colorado rapids|fc dallas|houston dynamo|la galaxy|galaxy|lafc|los angeles fc|minnesota united|portland timbers|timbers|real salt lake|rsl|san diego fc|san jose earthquakes|quakes|seattle sounders|sounders|sporting kansas city|skc|st louis city|vancouver whitecaps|whitecaps)\b/i;

// English Premier League Teams (20 teams) - Current season
const EPL_TEAMS = /\b(premier league|epl|arsenal|gunners|aston villa|villans|bournemouth|cherries|brentford|bees|brighton|seagulls|chelsea|blues|crystal palace|palace|everton|toffees|fulham|cottagers|ipswich|leeds|leeds united|liverpool|reds|manchester city|man city|city|manchester united|man utd|man united|newcastle|magpies|nottingham forest|forest|southampton|saints|tottenham|spurs|west ham|hammers|wolves|wolverhampton|burnley|clarets|sheffield united|blades|sheffield|luton|hatters|leicester|foxes|sunderland)\b/i;

// La Liga Teams (20 teams) - Spanish First Division
const LA_LIGA_TEAMS = /\b(la liga|laliga|real madrid|barcelona|barca|atletico madrid|atleti|sevilla|real sociedad|villarreal|yellow submarine|real betis|athletic bilbao|athletic club|osasuna|celta vigo|celta|getafe|rayo vallecano|rayo|mallorca|las palmas|alaves|espanyol|valladolid|leganes|girona|valencia|cadiz|almeria|granada)\b/i;

// Bundesliga Teams (18 teams) - German First Division
const BUNDESLIGA_TEAMS = /\b(bundesliga|bayern munich|bayern|borussia dortmund|dortmund|bvb|bayer leverkusen|leverkusen|rb leipzig|leipzig|eintracht frankfurt|frankfurt|vfb stuttgart|stuttgart|sc freiburg|freiburg|werder bremen|bremen|borussia monchengladbach|gladbach|vfl wolfsburg|wolfsburg|tsg hoffenheim|hoffenheim|mainz|fc augsburg|augsburg|union berlin|hamburger sv|hamburg|hsv|fc koln|koln|cologne|st pauli|heidenheim|holstein kiel|bochum)\b/i;

// Serie A Teams (20 teams) - Italian First Division
const SERIE_A_TEAMS = /\b(serie a|inter milan|inter|internazionale|juventus|juve|napoli|ac milan|milan|rossoneri|atalanta|roma|as roma|lazio|fiorentina|viola|bologna|torino|toro|udinese|hellas verona|verona|cagliari|genoa|lecce|empoli|sassuolo|salernitana|spezia|sampdoria|monza|como|parma|frosinone|venezia)\b/i;

// Ligue 1 Teams (18 teams) - French First Division
const LIGUE_1_TEAMS = /\b(ligue 1|psg|paris saint germain|paris saint-germain|marseille|olympique marseille|om|lyon|olympique lyonnais|ol|monaco|as monaco|lille|losc|lens|rc lens|rennes|stade rennais|nice|ogc nice|strasbourg|nantes|montpellier|toulouse|reims|brest|lorient|clermont|auxerre|angers|metz|le havre)\b/i;

// Other European Clubs
const OTHER_EURO_CLUBS = /\b(benfica|sporting lisbon|sporting cp|porto|fc porto|ajax|psv eindhoven|psv|feyenoord|celtic|rangers|galatasaray|fenerbahce|besiktas|shakhtar donetsk|dynamo kyiv|red star belgrade|steaua bucharest|olympiacos|panathinaikos|anderlecht|club brugge|salzburg|rapid vienna|young boys|basel|zenit|cska moscow|spartak moscow)\b/i;

// College Football - FBS Schools (134 teams across all conferences)
// SEC Teams
const CFB_SEC = /\b(sec|alabama|crimson tide|auburn|tigers|lsu|georgia|bulldogs|tennessee|volunteers|vols|texas a&m|aggies|arkansas|razorbacks|hogs|missouri|mizzou|mississippi state|state|south carolina|gamecocks|kentucky|wildcats|vanderbilt|commodores|dores|florida|gators|ole miss|rebels|texas|longhorns)\b/i;

// Big Ten Teams
const CFB_BIG_TEN = /\b(big ten|big 10|ohio state|buckeyes|michigan|wolverines|penn state|nittany lions|michigan state|spartans|iowa|hawkeyes|wisconsin|badgers|nebraska|cornhuskers|huskers|minnesota|golden gophers|gophers|northwestern|wildcats|purdue|boilermakers|indiana|hoosiers|illinois|illini|maryland|terrapins|terps|rutgers|scarlet knights|usc|trojans|ucla|bruins|oregon|ducks|washington|huskies)\b/i;

// ACC Teams
const CFB_ACC = /\b(acc|clemson|tigers|florida state|seminoles|noles|miami|hurricanes|canes|virginia tech|hokies|virginia|cavaliers|wahoos|north carolina|tar heels|nc state|wolfpack|duke|blue devils|wake forest|demon deacons|syracuse|orange|pittsburgh|pitt|panthers|louisville|cardinals|boston college|eagles|georgia tech|yellow jackets|stanford|cardinal|cal|golden bears|smu|mustangs)\b/i;

// Big 12 Teams
const CFB_BIG_12 = /\b(big 12|big 12|oklahoma state|cowboys|pokes|texas tech|red raiders|tcu|horned frogs|baylor|bears|kansas|jayhawks|kansas state|wildcats|iowa state|cyclones|west virginia|mountaineers|byu|cougars|cincinnati|bearcats|ucf|knights|houston|cougars|arizona|wildcats|arizona state|sun devils|colorado|buffaloes|buffs|utah|utes)\b/i;

// Other FBS Teams (Mountain West, Sun Belt, MAC, AAC, C-USA, Independents)
const CFB_OTHER = /\b(notre dame|fighting irish|army|black knights|navy|midshipmen|boise state|broncos|fresno state|bulldogs|san diego state|aztecs|colorado state|rams|utah state|aggies|nevada|wolf pack|wyoming|cowboys|air force|falcons|new mexico|lobos|unlv|rebels|hawaii|rainbow warriors|san jose state|spartans|memphis|tigers|tulane|green wave|smu|mustangs|temple|owls|south florida|bulls|tulsa|golden hurricane|east carolina|pirates|uab|blazers|charlotte|49ers|fau|owls|fiu|panthers|rice|owls|utsa|roadrunners|north texas|mean green|utep|miners|louisiana tech|bulldogs|middle tennessee|blue raiders|western kentucky|hilltoppers|marshall|thundering herd|old dominion|monarchs|southern miss|golden eagles|coastal carolina|chanticleers|appalachian state|mountaineers|james madison|dukes|georgia southern|eagles|georgia state|panthers|louisiana|ragin cajuns|arkansas state|red wolves|south alabama|jaguars|texas state|bobcats|troy|trojans|bowling green|falcons|buffalo|bulls|kent state|golden flashes|miami ohio|redhawks|ohio|bobcats|akron|zips|ball state|cardinals|central michigan|chippewas|eastern michigan|eagles|northern illinois|huskies|toledo|rockets|western michigan|broncos)\b/i;

// UFC/MMA Fighters and Terms
const UFC_MMA = /\b(ufc|mma|bellator|pfl|one championship|jake paul|logan paul|anthony joshua|tyson fury|deontay wilder|canelo alvarez|ggg|gennady golovkin|mayweather|manny pacquiao|conor mcgregor|khabib|islam makhachev|alex pereira|jon jones|israel adesanya|izzy|kamaru usman|leon edwards|sean o'malley|dustin poirier|charles oliveira|max holloway|alexander volkanovski|ilia topuria|zhang weili|valentina shevchenko|amanda nunes|heavyweight|middleweight|welterweight|lightweight|featherweight|bantamweight|flyweight|title fight|knockout|ko|tko|submission|decision|round \d+|fight night|pay per view|ppv)\b/i;

// Tennis Players and Tournaments
const TENNIS = /\b(tennis|wimbledon|us open|french open|roland garros|australian open|atp|wta|grand slam|djokovic|novak|nadal|rafa|federer|roger|alcaraz|carlos|sinner|jannik|medvedev|zverev|tsitsipas|rublev|fritz|swiatek|iga|sabalenka|aryna|gauff|coco|osaka|serena williams|venus williams|raducanu|rybakina|pegula)\b/i;

// Golf Players and Tournaments
const GOLF = /\b(golf|pga|lpga|masters|us open golf|the open|british open|pga championship|ryder cup|presidents cup|liv golf|tiger woods|rory mcilroy|scottie scheffler|jon rahm|brooks koepka|dustin johnson|jordan spieth|xander schauffele|collin morikawa|viktor hovland|bryson dechambeau|phil mickelson|nelly korda|jin young ko)\b/i;

// Racing
const RACING = /\b(f1|formula 1|formula one|formula1|nascar|indycar|motogp|wrc|rally|grand prix|verstappen|max verstappen|hamilton|lewis hamilton|leclerc|charles leclerc|norris|lando norris|sainz|carlos sainz|perez|sergio perez|checo|alonso|fernando alonso|red bull racing|mercedes|ferrari|mclaren|aston martin|alpine|williams|haas|alfa romeo|alphatauri|kyle larson|kyle busch|denny hamlin|ross chastain|william byron|chase elliott|martin truex|christopher bell|joey logano)\b/i;

// Cricket
const CRICKET = /\b(cricket|ipl|t20|test match|odi|the ashes|world cup cricket|bbl|big bash|cpl|psl|csk|chennai super kings|mumbai indians|rcb|royal challengers|kolkata knight riders|kkr|delhi capitals|rajasthan royals|punjab kings|sunrisers|gt|gujarat titans|lsg|lucknow|virat kohli|rohit sharma|ms dhoni|sachin tendulkar|kane williamson|steve smith|joe root|ben stokes|pat cummins|jasprit bumrah|rashid khan)\b/i;

// Rugby
const RUGBY = /\b(rugby|six nations|rugby world cup|super rugby|premiership rugby|top 14|pro14|all blacks|springboks|wallabies|england rugby|ireland rugby|wales rugby|scotland rugby|france rugby|lions tour|british lions)\b/i;

// Esports
const ESPORTS = /\b(esports|e-sports|league of legends|lol|worlds|lcs|lec|lck|dota|the international|ti\d+|csgo|cs2|counter-strike|valorant|vct|overwatch|owl|call of duty|cod|cdl|fortnite|fncs|rocket league|rlcs|t1|g2|fnatic|cloud9|c9|team liquid|liquid|evil geniuses|eg|faze|100 thieves|100t|nrg|sentinels|gen\.g|drx|faker|caps|rekkles)\b/i;

/**
 * Get sport-specific emoji based on series slug or question text.
 * Maps league/series prefixes to appropriate sport emojis.
 * Returns default sports emoji (🏆) if no match found.
 *
 * Uses comprehensive databases of all teams from:
 * - NBA (30 teams), NFL (32 teams), MLB (30 teams), NHL (32 teams)
 * - MLS (30 teams), EPL (20 teams), La Liga (20 teams)
 * - Bundesliga (18 teams), Serie A (20 teams), Ligue 1 (18 teams)
 * - College Football (134 FBS teams across all conferences)
 * - UFC/Boxing fighters, Tennis players, Golf players, Racing drivers
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
  if (slug.includes('ufc') || slug.includes('boxing') || slug.includes('mma') || UFC_MMA.test(q)) {
    return '🥊';
  }

  // Basketball - NBA/WNBA teams
  if (slug.startsWith('nba') || slug.includes('basketball') || slug.includes('ncaa-basketball') || slug.includes('wnba') || NBA_TEAMS.test(q)) {
    return '🏀';
  }

  // American Football - NFL teams and College Football
  if (slug.startsWith('nfl') || slug.includes('ncaa-football') || slug.includes('college-football') ||
      slug.includes('super-bowl') || slug.includes('super bowl') || slug.includes('cfb') ||
      NFL_TEAMS.test(q) || CFB_SEC.test(q) || CFB_BIG_TEN.test(q) || CFB_ACC.test(q) || CFB_BIG_12.test(q) || CFB_OTHER.test(q) ||
      /\b(super bowl|ncaa football|college football|cfb|cfp|bowl game|college playoff|heisman)\b/i.test(q)) {
    return '🏈';
  }

  // Soccer/Football - All major leagues
  if (slug.includes('premier-league') || slug.includes('la-liga') || slug.includes('bundesliga') ||
      slug.includes('serie-a') || slug.includes('ligue-1') || slug.includes('mls') ||
      slug.includes('champions-league') || slug.includes('world-cup') || slug.includes('euro-') ||
      slug.includes('soccer') || slug.includes('epl') ||
      MLS_TEAMS.test(q) || EPL_TEAMS.test(q) || LA_LIGA_TEAMS.test(q) || BUNDESLIGA_TEAMS.test(q) ||
      SERIE_A_TEAMS.test(q) || LIGUE_1_TEAMS.test(q) || OTHER_EURO_CLUBS.test(q) ||
      /\b(soccer|premier league|la liga|bundesliga|serie a|ligue 1|champions league|europa league|world cup|euro 202|fa cup|carabao cup|copa del rey|dfb pokal|coppa italia|coupe de france)\b/i.test(q) ||
      /\b(fc|united fc|city fc|\.fc\b|football club)\b/i.test(q)) {
    return '⚽';
  }

  // Baseball - MLB teams
  if (slug.startsWith('mlb') || slug.includes('baseball') || slug.includes('world-series') || MLB_TEAMS.test(q)) {
    return '⚾';
  }

  // Hockey - NHL teams
  if (slug.startsWith('nhl') || slug.includes('hockey') || slug.includes('stanley-cup') || NHL_TEAMS.test(q)) {
    return '🏒';
  }

  // Tennis
  if (slug.includes('tennis') || slug.includes('wimbledon') || slug.includes('us-open') ||
      slug.includes('french-open') || slug.includes('australian-open') || slug.includes('atp') || slug.includes('wta') ||
      TENNIS.test(q)) {
    return '🎾';
  }

  // Golf
  if (slug.includes('golf') || slug.includes('pga') || slug.includes('masters') || slug.includes('ryder-cup') || GOLF.test(q)) {
    return '⛳';
  }

  // Racing
  if (slug.includes('f1') || slug.includes('formula') || slug.includes('nascar') || slug.includes('racing') || RACING.test(q)) {
    return '🏎️';
  }

  // Cricket
  if (slug.includes('cricket') || slug.includes('ipl') || slug.includes('t20') || CRICKET.test(q)) {
    return '🏏';
  }

  // Rugby
  if (slug.includes('rugby') || RUGBY.test(q)) {
    return '🏉';
  }

  // Esports
  if (slug.includes('esports') || slug.includes('league-of-legends') || slug.includes('dota') || slug.includes('csgo') || ESPORTS.test(q)) {
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
 * Uses the same comprehensive team databases as getSportEmoji() to ensure
 * accurate sports detection across all major leagues and teams.
 *
 * @param question - Market question text
 * @returns Inferred category
 */
export function inferCategory(question: string): MarketCategory {
  const q = question.toLowerCase();

  // Politics - elections, politicians, government, world leaders
  if (/trump|biden|election|president|congress|senate|governor|vote|democrat|republican|nominee|cabinet|administration|maduro|zelensky|putin|xi jinping|netanyahu|macron|trudeau|milei|lula|modi|bolsonaro|erdogan|orban|scholz|starmer|sunak|meloni|impeach|regime|dictator/i.test(q)) {
    return 'politics';
  }
  // Crypto - cryptocurrencies, blockchain, and crypto projects
  // Includes: major coins, DeFi, prediction markets, L1/L2 chains, token sales
  if (/bitcoin|btc|ethereum|eth\b|crypto|defi|blockchain|solana|altcoin|polymarket|token|airdrop|ico|ido|public sale|fdv|market cap|tge|mainnet|testnet|l1|l2|layer 1|layer 2|nft|dao|staking|liquidity|dex|cex|binance|coinbase|arbitrum|optimism|polygon|avalanche|cardano|polkadot|cosmos|near|aptos|sui|sei|monad|berachain|eclipse|movement|zksync|starknet|scroll|linea|base|blast|manta|mantle|hyperliquid|jupiter|raydium|uniswap|aave|compound|maker|lido|eigenlayer|celestia|worldcoin|pyth|jito|tensor|magic eden|opensea|blur|pudgy|azuki|bayc|degen|farcaster|lens|friend\.tech|pump\.fun|meme coin|memecoin|shib|doge|pepe|bonk|wif|floki|solomon|lighter|parcl|drift|vertex|gmx/i.test(q)) {
    return 'crypto';
  }
  // Sports - leagues, teams, athletes, competitions, betting patterns
  // Check sports BEFORE world to prevent "Warriors" matching "war"
  // Uses comprehensive team databases for accurate detection
  if (
    // Betting patterns
    /^spread:|^o\/u\s|over\/under|\(\-?\d+\.?\d*\)|\bvs\.?\b/i.test(q) ||
    // Major leagues and tournaments
    /\b(nfl|nba|mlb|nhl|ncaa|mls|ufc|pga|wwe|wnba|afl|epl|f1|championship|playoff|playoffs|finals|super bowl|world series|stanley cup|world cup|champions league|premier league|la liga|bundesliga|serie a|ligue 1)\b/i.test(q) ||
    // Use comprehensive team databases
    NBA_TEAMS.test(q) ||
    NFL_TEAMS.test(q) ||
    MLB_TEAMS.test(q) ||
    NHL_TEAMS.test(q) ||
    MLS_TEAMS.test(q) ||
    EPL_TEAMS.test(q) ||
    LA_LIGA_TEAMS.test(q) ||
    BUNDESLIGA_TEAMS.test(q) ||
    SERIE_A_TEAMS.test(q) ||
    LIGUE_1_TEAMS.test(q) ||
    OTHER_EURO_CLUBS.test(q) ||
    CFB_SEC.test(q) ||
    CFB_BIG_TEN.test(q) ||
    CFB_ACC.test(q) ||
    CFB_BIG_12.test(q) ||
    CFB_OTHER.test(q) ||
    UFC_MMA.test(q) ||
    TENNIS.test(q) ||
    GOLF.test(q) ||
    RACING.test(q) ||
    CRICKET.test(q) ||
    RUGBY.test(q) ||
    ESPORTS.test(q) ||
    // General sports terms
    /\b(touchdown|field goal|home run|slam dunk|hat trick|knockout|round \d|game \d|match\b|bout\b|fight\b|title fight|heisman|bowl game|cfp)\b/i.test(q)
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
