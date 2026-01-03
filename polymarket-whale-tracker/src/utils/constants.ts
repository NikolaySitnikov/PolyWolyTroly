// Polymarket Contracts on Polygon
export const CONTRACTS = {
  USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  POLYMARKET_EXCHANGE: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
  CTF_EXCHANGE: "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045",
} as const;

// USDC has 6 decimals
export const USDC_DECIMALS = 6;

// ERC20 Transfer event ABI
export const ERC20_TRANSFER_ABI = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
  },
] as const;
