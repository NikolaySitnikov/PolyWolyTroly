# Phase 1.3 - Rule #1 Live Mode Debug Page

## Overview

Created a real-time debug page for Rule #1 (Fresh-Concentrated-Depth Impact) that allows monitoring of live CTF transfers as they flow through the detection engine.

**Access URL:** `http://localhost:5173/#debug-rule1`

## Features Implemented

### 1. Real-Time Transaction Feed
- Live WebSocket connection to backend for instant transaction updates
- Displays Rule #1 evaluation results for each CTF transfer
- Shows all 4 check results: Trade Size, Wallet Age, Concentration, Depth Ratio
- Expandable rows with detailed check values and thresholds

### 2. Filter System (Radio Buttons)
- **All**: Shows all evaluations
- **2/4+**: Shows transactions with 2 or more checks passing
- **3/4+**: Shows transactions with 3 or more checks passing (default)
- Filter applied at storage time - only matching items stored (up to 100)
- Changing filter clears stored items and starts fresh

### 3. Live Threshold Adjustment
- Sliders for all 4 thresholds:
  - Max Wallet Age (days)
  - Min Concentration (%)
  - Min Trade Size (USD)
  - Min Depth Ratio (x)
- Thresholds sync to server on change
- Local state preserved during editing (won't be overwritten by polling)

### 4. KPI Stats Panel
- **CTF Listener**: Health status (Healthy/Unhealthy)
- **Transfers**: Total CTF transfers processed
- **Evaluations**: Total detection evaluations run
- **Alerts**: Total alerts triggered (clickable - navigates to Detection page)
- Stats sync from server every 5 seconds

### 5. Enable/Disable Toggle
- Default state: **OFF** (user must explicitly enable)
- Shows LIVE/OFF status with visual indicator
- Controls both Rule #1 and detection engine state

## Technical Implementation

### Frontend (`Rule1TestPage.tsx`)

**Key State:**
```typescript
const [status, setStatus] = useState<LiveStatus | null>(null);
const [thresholds, setThresholds] = useState<Rule1Thresholds>(DEFAULT_THRESHOLDS);
const [enabled, setEnabled] = useState(false);
const [evaluations, setEvaluations] = useState<Rule1LiveEvaluation[]>([]);
const [filterOption, setFilterOption] = useState<FilterOption>('3plus');
```

**WebSocket Handler:**
- Connects to `ws://localhost:3002`
- Listens for `rule1_live_evaluation` messages
- Filters and stores matching evaluations (max 100)
- Does NOT increment local counters (prevents jumps when server syncs)

**Polling:**
- Fetches `/api/detection/rule1-live/status` every 5 seconds
- Syncs stats counters from server (authoritative source)
- Only sets thresholds on initial load (preserves local edits)

### Backend Endpoints

**GET `/api/detection/rule1-live/status`**
Returns:
```json
{
  "ctfListenerRunning": true,
  "ctfListenerHealthy": true,
  "detectionEnabled": false,
  "transfersProcessed": 14792,
  "evaluationsProcessed": 318,
  "alertsTriggered": 0,
  "rule1Enabled": false,
  "thresholds": {
    "maxWalletAgeDays": 14,
    "minConcentrationPct": 85,
    "minTradeSizeUsd": 3000,
    "minDepthRatio": 3
  }
}
```

**POST `/api/detection/rule1-live/thresholds`**
Updates Rule #1 thresholds in real-time.

**POST `/api/detection/rule1-live/enable`**
Enables/disables Rule #1 and detection engine.

### WebSocket Broadcasting (`ctfEventListener.ts`)

When a transfer is evaluated, broadcasts detailed Rule #1 result:
```typescript
broadcastRule1Evaluation({
  txHash, walletAddress, conditionId, tokenId, amount,
  outcome, blockNumber, timestamp, tradeSizeUsd,
  marketQuestion, evaluated, triggered,
  checks: {
    tradeSize: { passed, value, threshold },
    walletAge: { passed, value, threshold },
    concentration: { passed, value, threshold },
    depthRatio: { passed, value, threshold }
  },
  confidence, severity, alertId, reason
});
```

## Bug Fixes During Implementation

### 1. WebSocket Disconnection Loop
**Problem:** WebSocket constantly reconnected because `fetchStatus` was in useEffect dependency array.
**Fix:** Split into two separate useEffects - one for polling, one for WebSocket with empty deps `[]`.

### 2. Slider Reset Bug
**Problem:** Sliders would reset immediately after user moved them because `fetchStatus` polling overwrote local state.
**Fix:** Added `thresholdsInitialized` ref - only set thresholds on first fetch.

### 3. Counter Jumping/Decrementing
**Problem:** Local counter increments got overwritten by server sync, causing counts to jump around.
**Fix:** Removed local counter incrementing - stats now only sync from server via polling.

### 4. Disappearing Filtered Rows
**Problem:** With 3/4+ filter, rows would disappear as non-matching items pushed them out of the 100-item buffer.
**Fix:** Filter applied at storage time - only matching items stored (up to 100).

## Default State Changes

Changed default detection state to **OFF**:
- `ruleBase.ts`: `_enabled = false`
- `ctfEventListener.ts`: `detectionEnabled = false`

User must explicitly click "Enable" to start detection and receive live evaluations.

## Files Modified

- `frontend/src/components/detection/Rule1TestPage.tsx` - Main page component
- `frontend/src/components/detection/index.ts` - Export
- `frontend/src/types/navigation.ts` - Route type
- `src/api/server.ts` - Added Rule #1 live endpoints
- `src/api/websocket.ts` - Added broadcastRule1Evaluation
- `src/services/insiderDetection/ctfEventListener.ts` - Added _evaluateTransfer broadcasting
- `src/services/insiderDetection/rules/ruleBase.ts` - Default enabled to false

## Usage

1. Navigate to `http://localhost:5173/#debug-rule1`
2. Page loads with detection **OFF** by default
3. Click "Enable" to start receiving live evaluations
4. Select filter (All / 2/4+ / 3/4+) to focus on interesting transactions
5. Adjust thresholds with sliders to see how it affects evaluations
6. Click "Alerts" KPI to navigate to Detection page for full alert list
7. Expand rows to see detailed check values and reasons

## Transfers vs Evaluations Gap

The gap between Transfers and Evaluations exists because:
1. Detection must be enabled for evaluations to run
2. Not all transfers are "buys" (mints, burns, redemptions)
3. Market lookup failures skip evaluation

All transfers are recorded in `ctf_transfers` table regardless.
