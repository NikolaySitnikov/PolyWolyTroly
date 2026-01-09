# Market Category Tags — Design Specification

## Overview

Market category tags provide quick visual categorization for prediction markets, helping users scan and filter by topic area. Categories are inferred from market titles using comprehensive keyword matching since the Polymarket API does not provide category metadata for closed positions.

---

## Category Taxonomy

| Category          | Icon | Color                      | Hex Code   | Use Cases                                         |
| ----------------- | ---- | -------------------------- | ---------- | ------------------------------------------------- |
| **Politics**      | 🏛️  | Red                        | `#ef4444`  | Elections, legislation, government, world leaders |
| **Crypto**        | ₿    | Bitcoin Orange             | `#f7931a`  | Bitcoin, Ethereum, DeFi, token sales, L1/L2       |
| **Sports**        | ⚽    | Green                      | `#22c55e`  | Games, championships, player stats                |
| **Finance**       | 📈   | Blue                       | `#3b82f6`  | Stocks, Fed rates, economic indicators            |
| **Tech**          | 💻   | Purple                     | `#a855f7`  | Product launches, AI models, semiconductors       |
| **Entertainment** | 🎬   | Pink                       | `#ec4899`  | Awards, releases, celebrity                       |
| **Science**       | 🔬   | Cyan                       | `#06b6d4`  | Research, space, climate                          |
| **World**         | 🌍   | Teal                       | `#14b8a6`  | Geopolitics, international conflicts              |
| **Other**         | 📌   | Gray                       | `#6b7280`  | Uncategorized markets                             |

### Color Design Principles

Colors are chosen to be visually distinct from each other:
- **Politics (Red)** vs **Crypto (Orange)**: Different hue families
- **World (Teal)** vs **Science (Cyan)**: Teal is warmer/greener
- **Tech (Purple)** vs **Entertainment (Pink)**: Purple is cooler
- **Other (Gray)**: Neutral, doesn't compete with other categories

---

## Category Inference

Since the Polymarket API doesn't provide category data for closed positions, categories are inferred from market title text using the `inferCategory()` function in `CategoryTag.tsx`.

### Detection Priority Order

Categories are checked in this order (first match wins):

1. **Politics** - elections, politicians, world leaders
2. **Crypto** - cryptocurrencies, blockchain projects, token sales
3. **Sports** - leagues, teams, athletes (comprehensive database)
4. **Finance** - markets, rates, economic indicators
5. **Tech** - companies, AI models/labs, semiconductors
6. **Entertainment** - awards, movies, music
7. **Science** - research, space, health
8. **World** - geopolitics, conflicts, international affairs
9. **Other** - fallback for unmatched markets

### Politics Detection

```regex
trump|biden|election|president|congress|senate|governor|vote|democrat|republican|
nominee|cabinet|administration|maduro|zelensky|putin|xi jinping|netanyahu|macron|
trudeau|milei|lula|modi|bolsonaro|erdogan|orban|scholz|starmer|sunak|meloni|
impeach|regime|dictator
```

**World Leaders Included:**
- US: Trump, Biden
- Latin America: Maduro, Milei, Lula, Bolsonaro
- Europe: Macron, Scholz, Starmer, Sunak, Meloni, Orban
- Russia/Ukraine: Putin, Zelensky
- Middle East: Netanyahu
- Asia: Xi Jinping, Modi, Erdogan

### Crypto Detection

```regex
bitcoin|btc|ethereum|eth|crypto|defi|blockchain|solana|altcoin|polymarket|token|
airdrop|ico|ido|public sale|fdv|market cap|tge|mainnet|testnet|l1|l2|layer 1|
layer 2|nft|dao|staking|liquidity|dex|cex|binance|coinbase|arbitrum|optimism|
polygon|avalanche|cardano|polkadot|cosmos|near|aptos|sui|sei|monad|berachain|
eclipse|movement|zksync|starknet|scroll|linea|base|blast|manta|mantle|hyperliquid|
jupiter|raydium|uniswap|aave|compound|maker|lido|eigenlayer|celestia|worldcoin|
pyth|jito|tensor|magic eden|opensea|blur|pudgy|azuki|bayc|degen|farcaster|lens|
friend.tech|pump.fun|meme coin|memecoin|shib|doge|pepe|bonk|wif|floki|solomon|
lighter|parcl|drift|vertex|gmx
```

**Categories:**
- Major coins: Bitcoin, Ethereum, Solana
- L1/L2 chains: Arbitrum, Optimism, Base, Blast, zkSync, Starknet
- DeFi protocols: Uniswap, Aave, Compound, Hyperliquid, Jupiter
- NFT/Social: OpenSea, Blur, Farcaster, Lens
- Memecoins: DOGE, PEPE, BONK, WIF, FLOKI
- Prediction markets: Polymarket, Solomon, Lighter

### Tech Detection

```regex
apple|google|microsoft|ai|gpt|openai|iphone|android|startup|meta|amazon|tesla|
gemini|claude|anthropic|mistral|llama|perplexity|copilot|chatgpt|sora|midjourney|
stable diffusion|nvidia|amd|intel|chip|semiconductor|robot|autopilot|self-driving|
xai|deepmind|inflection
```

**AI Models & Labs:**
- OpenAI: GPT, ChatGPT, Sora
- Google: Gemini, DeepMind
- Anthropic: Claude
- Other: Mistral, LLaMA, Perplexity, Midjourney, Stable Diffusion, xAI, Inflection

**Hardware:**
- NVIDIA, AMD, Intel, chip, semiconductor

### Sports Detection

Uses comprehensive team databases covering:
- **NBA**: 30 teams + WNBA
- **NFL**: 32 teams
- **MLB**: 30 teams
- **NHL**: 32 teams (including Utah Mammoth)
- **MLS**: 30 teams
- **European Soccer**: EPL (20), La Liga (20), Bundesliga (18), Serie A (20), Ligue 1 (18), Other (30+)
- **College Football**: 134 FBS teams across SEC, Big Ten, ACC, Big 12, and independents
- **Combat Sports**: UFC fighters, boxing champions, weight classes
- **Other**: Tennis, Golf, Racing (F1, NASCAR), Cricket, Rugby, Esports

See `CLOSED_POSITIONS_FEATURE.md` for complete team lists.

### Finance Detection

```regex
stock|fed|interest rate|inflation|gdp|earnings|ipo|s&p|nasdaq|dow|treasury|bond|bps
```

### Entertainment Detection

```regex
oscar|grammy|movie|film|album|award|netflix|disney|celebrity|stranger things|
season|episode|emmy|golden globe
```

### Science Detection

```regex
nasa|space|climate|research|study|vaccine|species|discovery|spacex|mars|moon
```

### World Detection

```regex
\bwar\b|treaty|country|nation|international|un|nato|summit|invade|military|
custody|venezuela|ukraine|russia|china|iran|israel
```

**Note:** Uses word boundary `\b` for "war" to prevent matching "Warriors" (sports team).

---

## Sport-Specific Emojis

For sports markets, the category tag shows a sport-specific emoji based on the detected sport type:

| Sport | Emoji | Detection Method |
|-------|-------|------------------|
| Boxing/MMA | 🥊 | UFC fighters, weight classes, fight terms |
| Basketball | 🏀 | NBA/WNBA teams |
| American Football | 🏈 | NFL teams, College Football teams, Super Bowl |
| Soccer | ⚽ | EPL, La Liga, Bundesliga, Serie A, Ligue 1, MLS, Champions League |
| Baseball | ⚾ | MLB teams, World Series |
| Hockey | 🏒 | NHL teams, Stanley Cup |
| Tennis | 🎾 | Players, Grand Slam tournaments |
| Golf | ⛳ | PGA/LPGA, major tournaments |
| Racing | 🏎️ | F1, NASCAR, drivers |
| Cricket | 🏏 | IPL teams, international |
| Rugby | 🏉 | Six Nations, international teams |
| Esports | 🎮 | LoL, Dota, CS2, Valorant teams |
| Default | 🏆 | Unknown sports |

---

## Tag Component Specs

### Anatomy

```
┌─────────────────┐
│ 🏛️ Politics    │
└─────────────────┘
  ↑       ↑
 Icon   Label
```

### Sizing

| Variant               | Height | Padding  | Font Size | Icon Size |
| --------------------- | ------ | -------- | --------- | --------- |
| **Small** (in cards)  | 20px   | 4px 8px  | 10px      | 11px      |
| **Default** (filters) | 26px   | 6px 12px | 12px      | 13px      |
| **Large** (headers)   | 32px   | 8px 16px | 13px      | 15px      |

### Color Application

Tags use a subtle, low-contrast style to avoid competing with market data:

```css
.category-tag {
  /* Background: category color at 15% opacity */
  background: ${categoryColor}15;

  /* Border: category color at 40% opacity */
  border: 1px solid ${categoryColor}40;

  /* Text: category color at full */
  color: ${categoryColor};
}

/* Hover: Increase intensity */
.category-tag:hover {
  background: ${categoryColor}25;
  border-color: ${categoryColor}60;
  box-shadow: 0 0 10px ${categoryColor}20;
}

/* Active/Selected state */
.category-tag.active {
  background: ${categoryColor};
  border-color: ${categoryColor};
  color: var(--void);  /* #0a0a0f */
  box-shadow: 0 0 15px ${categoryColor}40;
}
```

---

## Files

| File | Description |
|------|-------------|
| `frontend/src/components/CategoryTag.tsx` | Main component with `inferCategory()` and `getSportEmoji()` |
| `frontend/src/types/position.ts` | `CATEGORY_CONFIGS` constant (kept in sync) |

---

## Accessibility

- Tags have `role="button"` when clickable
- Keyboard navigation with Enter/Space
- Color is never the only indicator (always paired with icon + label)
- Focus-visible outline using cyan
- Screen reader announces category name
