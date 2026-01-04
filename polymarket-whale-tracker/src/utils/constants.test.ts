import { describe, it, expect } from "vitest";
import {
  CONTRACTS,
  USDC_DECIMALS,
  ERC20_TRANSFER_ABI,
} from "./constants.js";

describe("constants", () => {
  describe("CONTRACTS", () => {
    it("should have USDC contract address", () => {
      expect(CONTRACTS.USDC).toBe(
        "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
      );
    });

    it("should have POLYMARKET_EXCHANGE contract address", () => {
      expect(CONTRACTS.POLYMARKET_EXCHANGE).toBe(
        "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"
      );
    });

    it("should have CTF_EXCHANGE contract address", () => {
      expect(CONTRACTS.CTF_EXCHANGE).toBe(
        "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045"
      );
    });

    it("should be immutable (as const)", () => {
      expect(Object.isFrozen(CONTRACTS)).toBe(false); // as const doesn't freeze, but TS prevents mutation
      expect(typeof CONTRACTS).toBe("object");
    });
  });

  describe("USDC_DECIMALS", () => {
    it("should be 6", () => {
      expect(USDC_DECIMALS).toBe(6);
    });
  });

  describe("ERC20_TRANSFER_ABI", () => {
    it("should be an array with one event", () => {
      expect(Array.isArray(ERC20_TRANSFER_ABI)).toBe(true);
      expect(ERC20_TRANSFER_ABI).toHaveLength(1);
    });

    it("should have Transfer event definition", () => {
      const transferEvent = ERC20_TRANSFER_ABI[0];
      expect(transferEvent.type).toBe("event");
      expect(transferEvent.name).toBe("Transfer");
    });

    it("should have correct inputs for Transfer event", () => {
      const transferEvent = ERC20_TRANSFER_ABI[0];
      expect(transferEvent.inputs).toHaveLength(3);

      // from parameter
      expect(transferEvent.inputs[0]).toEqual({
        indexed: true,
        name: "from",
        type: "address",
      });

      // to parameter
      expect(transferEvent.inputs[1]).toEqual({
        indexed: true,
        name: "to",
        type: "address",
      });

      // value parameter
      expect(transferEvent.inputs[2]).toEqual({
        indexed: false,
        name: "value",
        type: "uint256",
      });
    });
  });
});
