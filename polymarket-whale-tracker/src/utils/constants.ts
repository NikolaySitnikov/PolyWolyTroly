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

// ERC-1155 ABI for CTF (Conditional Token Framework) events
// Used for tracking outcome token transfers on Polymarket
export const ERC1155_ABI = [
  {
    type: "event",
    name: "TransferSingle",
    inputs: [
      { indexed: true, name: "operator", type: "address" },
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "id", type: "uint256" },
      { indexed: false, name: "value", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "TransferBatch",
    inputs: [
      { indexed: true, name: "operator", type: "address" },
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "ids", type: "uint256[]" },
      { indexed: false, name: "values", type: "uint256[]" },
    ],
  },
] as const;

// Zero address (used for minting/burning detection)
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
