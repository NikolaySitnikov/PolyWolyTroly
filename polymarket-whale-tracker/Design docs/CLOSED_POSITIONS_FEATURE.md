# Closed Positions Feature

## Overview

The Closed Positions feature displays historical/settled positions for whale wallets. These are positions that have been fully resolved and redeemed on Polymarket.

## Data Source

**API Endpoint**: `GET https://data-api.polymarket.com/v1/closed-positions`

### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | string | Wallet address (required) |
| `limit` | number | Max results per page (1-50, default 50) |
| `offset` | number | Pagination offset |
| `sortBy` | string | Sort field: `realizedpnl`, `timestamp`, `avgprice`, `totalbought` |
| `sortDir` | string | Sort direction: `ASC` or `DESC` |

### Response Fields
```typescript
interface PolymarketClosedPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  avgPrice: number;          // Entry price (0-1)
  totalBought: number;       // Total invested in USD
  realizedPnl: number;       // Realized profit/loss
  curPrice: number;          // Final price (1 = won, 0 = lost)
  title: string;             // Market question
  slug: string;
  icon: string;
  eventSlug: string;
  outcome: string;           // "Yes", "No", team name, player name, etc.
  outcomeIndex: number;
  oppositeOutcome: string;
  oppositeAsset: string;
  endDate: string;
  timestamp: number;         // When position was closed (Unix seconds)
}
```

## UI Components

### ClosedPositionCard

Located at: `frontend/src/components/ClosedPositionCard.tsx`

#### Layout
- **Mobile**: Card layout with stacked information
- **Desktop**: Row layout (table-like) for efficient scanning

#### Key Elements
1. **WON/LOST Badge** - Green or red badge based on realizedPnl
2. **Category Tag** - Inferred from market title with sport-specific emoji
3. **Market Title** - Truncated to 2 lines on mobile
4. **Outcome** - The whale's bet (team name, Yes/No, Over/Under)
5. **Entry Price** - Shown as cents (e.g., "@ 38¢")
6. **Total Invested** - Formatted with K/M suffix
7. **P&L** - Green for profit, red for loss
8. **Timestamp** - Relative time (e.g., "2w ago", "1mo ago")

### Color Scheme for Outcomes

```typescript
function getOutcomeColor(outcome: string): string {
  const normalized = outcome?.toUpperCase()?.trim() || '';

  // Yes/Over outcomes → Green (profit color)
  if (normalized === 'YES' || normalized === 'OVER') {
    return tokens.colors.profit;  // #00ff88
  }

  // No/Under outcomes → Red (loss color)
  if (normalized === 'NO' || normalized === 'UNDER') {
    return tokens.colors.loss;    // #ff3366
  }

  // Team names, player names, etc. → Gold accent
  return tokens.colors.gold;      // #f59e0b
}
```

## Category Inference

Since closed positions don't include enriched data from Gamma API, categories are inferred from market titles using `inferCategory()` in `CategoryTag.tsx`.

### Comprehensive Team Databases

As of January 2026, the system uses comprehensive regex databases for accurate sports detection:

#### Major Professional Leagues (Complete Team Coverage)
| League | Teams | Examples |
|--------|-------|----------|
| **NBA** | 30 teams | Celtics, Nets, Knicks, 76ers, Raptors, Bulls, Cavaliers, Pistons, Pacers, Bucks, Hawks, Hornets, Heat, Magic, Wizards, Nuggets, Timberwolves, Thunder, Trail Blazers, Jazz, Warriors, Clippers, Lakers, Suns, Kings, Mavericks, Rockets, Grizzlies, Pelicans, Spurs |
| **NFL** | 32 teams | 49ers, Bears, Bengals, Bills, Broncos, Browns, Buccaneers, Cardinals, Chargers, Chiefs, Colts, Commanders, Cowboys, Dolphins, Eagles, Falcons, Giants, Jaguars, Jets, Lions, Packers, Panthers, Patriots, Raiders, Rams, Ravens, Saints, Seahawks, Steelers, Texans, Titans, Vikings |
| **MLB** | 30 teams | Athletics, Orioles, Red Sox, White Sox, Guardians, Tigers, Astros, Royals, Angels, Twins, Yankees, Mariners, Rays, Rangers, Blue Jays, Diamondbacks, Braves, Cubs, Reds, Rockies, Dodgers, Marlins, Brewers, Mets, Phillies, Pirates, Padres, Giants, Cardinals |
| **NHL** | 32 teams | Ducks, Bruins, Sabres, Flames, Hurricanes, Blackhawks, Avalanche, Blue Jackets, Stars, Red Wings, Oilers, Panthers, Kings, Wild, Canadiens, Predators, Devils, Islanders, Rangers, Senators, Flyers, Penguins, Sharks, Kraken, Blues, Lightning, Maple Leafs, Utah Mammoth, Canucks, Golden Knights, Capitals, Jets |
| **MLS** | 30 teams | Atlanta United, CF Montreal, Charlotte FC, Chicago Fire, Columbus Crew, DC United, FC Cincinnati, Inter Miami, Nashville SC, New England Revolution, NYCFC, Red Bulls, Orlando City, Philadelphia Union, Toronto FC, Austin FC, Colorado Rapids, FC Dallas, Houston Dynamo, LA Galaxy, LAFC, Minnesota United, Portland Timbers, Real Salt Lake, San Diego FC, San Jose Earthquakes, Seattle Sounders, Sporting KC, St. Louis City, Vancouver Whitecaps |

#### European Soccer Leagues (Complete Team Coverage)
| League | Teams | Examples |
|--------|-------|----------|
| **Premier League** | 20 teams | Arsenal, Aston Villa, Bournemouth, Brentford, Brighton, Chelsea, Crystal Palace, Everton, Fulham, Ipswich, Leeds, Leicester, Liverpool, Manchester City, Manchester United, Newcastle, Nottingham Forest, Southampton, Tottenham, West Ham, Wolves, Burnley, Sheffield United, Luton, Sunderland |
| **La Liga** | 20 teams | Real Madrid, Barcelona, Atletico Madrid, Sevilla, Real Sociedad, Villarreal, Real Betis, Athletic Bilbao, Osasuna, Celta Vigo, Getafe, Rayo Vallecano, Mallorca, Las Palmas, Alaves, Espanyol, Valladolid, Leganes, Girona, Valencia |
| **Bundesliga** | 18 teams | Bayern Munich, Borussia Dortmund, Bayer Leverkusen, RB Leipzig, Eintracht Frankfurt, VfB Stuttgart, SC Freiburg, Werder Bremen, Borussia Mönchengladbach, VfL Wolfsburg, TSG Hoffenheim, Mainz, FC Augsburg, Union Berlin, Hamburger SV, FC Köln, St. Pauli, Heidenheim |
| **Serie A** | 20 teams | Inter Milan, Juventus, Napoli, AC Milan, Atalanta, Roma, Lazio, Fiorentina, Bologna, Torino, Udinese, Hellas Verona, Cagliari, Genoa, Lecce, Empoli, Sassuolo, Monza, Como, Parma |
| **Ligue 1** | 18 teams | PSG, Marseille, Lyon, Monaco, Lille, Lens, Rennes, Nice, Strasbourg, Nantes, Montpellier, Toulouse, Reims, Brest, Lorient, Clermont, Auxerre, Le Havre |
| **Other European** | 30+ clubs | Benfica, Sporting Lisbon, Porto, Ajax, PSV, Feyenoord, Celtic, Rangers, Galatasaray, Fenerbahce, Besiktas, Shakhtar, Olympiacos, Anderlecht, Club Brugge, Salzburg, etc. |

#### College Football (134 FBS Teams)
| Conference | Teams |
|------------|-------|
| **SEC** | Alabama, Auburn, LSU, Georgia, Tennessee, Texas A&M, Arkansas, Missouri, Mississippi State, South Carolina, Kentucky, Vanderbilt, Florida, Ole Miss, Texas |
| **Big Ten** | Ohio State, Michigan, Penn State, Michigan State, Iowa, Wisconsin, Nebraska, Minnesota, Northwestern, Purdue, Indiana, Illinois, Maryland, Rutgers, USC, UCLA, Oregon, Washington |
| **ACC** | Clemson, Florida State, Miami, Virginia Tech, Virginia, North Carolina, NC State, Duke, Wake Forest, Syracuse, Pittsburgh, Louisville, Boston College, Georgia Tech, Stanford, Cal, SMU |
| **Big 12** | Oklahoma State, Texas Tech, TCU, Baylor, Kansas, Kansas State, Iowa State, West Virginia, BYU, Cincinnati, UCF, Houston, Arizona, Arizona State, Colorado, Utah |
| **Other FBS** | Notre Dame, Army, Navy, Boise State, Fresno State, San Diego State, Memphis, Tulane, Coastal Carolina, Appalachian State, James Madison, and 80+ more |

#### Combat Sports (UFC/Boxing)
- **UFC Fighters**: Islam Makhachev, Alex Pereira, Jon Jones, Israel Adesanya, Kamaru Usman, Leon Edwards, Sean O'Malley, Max Holloway, Ilia Topuria, Zhang Weili, Valentina Shevchenko, Amanda Nunes
- **Boxing**: Jake Paul, Logan Paul, Anthony Joshua, Tyson Fury, Deontay Wilder, Canelo Alvarez, GGG, Mayweather, Manny Pacquiao
- **Weight Classes**: Heavyweight, Middleweight, Welterweight, Lightweight, Featherweight, Bantamweight, Flyweight

#### Other Sports
| Sport | Key Terms/Players |
|-------|-------------------|
| **Tennis** | Djokovic, Nadal, Federer, Alcaraz, Sinner, Medvedev, Swiatek, Sabalenka, Gauff, Wimbledon, US Open, French Open, Australian Open |
| **Golf** | Tiger Woods, Rory McIlroy, Scottie Scheffler, Jon Rahm, Brooks Koepka, Masters, PGA Championship, Ryder Cup, LIV Golf |
| **Racing** | Verstappen, Hamilton, Leclerc, Norris, Sainz, Alonso, Red Bull, Mercedes, Ferrari, McLaren, F1, NASCAR, IndyCar |
| **Cricket** | IPL teams (CSK, Mumbai Indians, RCB, KKR), Virat Kohli, MS Dhoni, Pat Cummins, The Ashes |
| **Rugby** | Six Nations, All Blacks, Springboks, Wallabies, Rugby World Cup |
| **Esports** | League of Legends, Dota, CS2, Valorant, T1, G2, Fnatic, Cloud9, Team Liquid, Faker |

### Sport Emoji Detection

`getSportEmoji()` returns sport-specific emojis based on the comprehensive databases:

| Sport | Emoji | Detection Method |
|-------|-------|------------------|
| Boxing/MMA | 🥊 | UFC_MMA database (fighters, weight classes, fight terms) |
| Basketball | 🏀 | NBA_TEAMS database (all 30 NBA teams + WNBA) |
| Football | 🏈 | NFL_TEAMS + CFB_SEC/BIG_TEN/ACC/BIG_12/OTHER databases |
| Soccer | ⚽ | EPL_TEAMS + LA_LIGA + BUNDESLIGA + SERIE_A + LIGUE_1 + MLS + OTHER_EURO_CLUBS |
| Baseball | ⚾ | MLB_TEAMS database (all 30 teams) |
| Hockey | 🏒 | NHL_TEAMS database (all 32 teams including Utah Mammoth) |
| Tennis | 🎾 | TENNIS database (players, tournaments) |
| Golf | ⛳ | GOLF database (players, tournaments) |
| Racing | 🏎️ | RACING database (F1, NASCAR, drivers, teams) |
| Cricket | 🏏 | CRICKET database (IPL, international) |
| Rugby | 🏉 | RUGBY database (Six Nations, teams) |
| Esports | 🎮 | ESPORTS database (games, teams, players) |
| Default | 🏆 | Unknown sports |

**Important**: Sports patterns are checked BEFORE world patterns to prevent "Warriors" from matching "war"

## Access Pattern

### Frontend Hook

```typescript
const {
  positions: closedPositions,
  loading: closedLoading,
  error: closedError,
  hasMore: closedHasMore,
  loadMore: loadMoreClosed,
  page: closedPage,
  setPage: setClosedPage,
} = useClosedPositions(wallet.address, {
  enabled: positionStatusFilter === 'closed',
  pageSize: 25,
});
```

### Lazy Loading

Closed positions are only fetched when the "Closed" filter is selected (`enabled: positionStatusFilter === 'closed'`). This prevents unnecessary API calls.

### Pagination

Uses "Load More" button for infinite scroll-style pagination rather than traditional page numbers.

## Backend Endpoint

**Route**: `GET /api/wallets/:address/closed-positions`

Located at: `src/api/server.ts`

### Query Parameters
- `limit` (default: 50, max: 50)
- `offset` (default: 0)
- `sortBy` (default: 'realizedpnl')
- `sortDir` (default: 'DESC')

### Response
```json
{
  "positions": [...],
  "pagination": {
    "limit": 25,
    "offset": 0,
    "count": 25,
    "hasMore": true
  }
}
```

## Files Changed

### New Files
- `frontend/src/components/ClosedPositionCard.tsx` - Card component for closed positions
- `frontend/src/hooks/useClosedPositions.ts` - Hook for fetching closed positions

### Modified Files
- `frontend/src/types/polymarket.ts` - Added `PolymarketClosedPosition` interface
- `frontend/src/services/api.ts` - Added `fetchClosedPositions()` function
- `frontend/src/components/WalletProfile.tsx` - Added "Closed" filter button and view
- `frontend/src/components/CategoryTag.tsx` - Enhanced `inferCategory()` and `getSportEmoji()`
- `src/api/server.ts` - Added `/api/wallets/:address/closed-positions` endpoint
- `src/services/polymarketApi.ts` - Added `getClosedPositions()` function
- `src/types/polymarket.ts` - Added backend `PolymarketClosedPosition` type

## Design Considerations

1. **No enriched data**: Unlike active positions, closed positions don't have Gamma API enrichment (no `sportsMarketType`, `seriesSlug`). All categorization relies on title keyword matching.

2. **Outcome colors**: We use a semantic color system:
   - Green for positive outcomes (Yes, Over)
   - Red for negative outcomes (No, Under)
   - Gold for neutral outcomes (team names, player names)

3. **Sport emoji fallback**: Since we don't have `seriesSlug` for closed positions, we rely entirely on title keyword matching for sport emoji selection.

4. **WON/LOST determination**: Based on `realizedPnl >= 0` rather than `curPrice`, which is more accurate for partial positions.
