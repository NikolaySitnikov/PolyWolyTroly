/**
 * API Server Entry Point
 *
 * Starts the Express REST API server for the Polymarket whale tracker.
 * Run with: npx tsx src/api/index.ts
 */

import { startServer } from "./server.js";

const PORT = parseInt(process.env.API_PORT || "3002", 10);

startServer(PORT);
