/**
 * useDetectionRules Hook
 *
 * React hook for fetching and managing detection rule configurations.
 * Provides methods to update rule enabled status and thresholds.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchDetectionRules,
  updateDetectionRule,
  evaluateDetectionRule,
} from '../services/api';
import type {
  DetectionRuleConfig,
  DetectionRuleName,
  RuleEvaluationResult,
} from '../types/detection';

// Poll every 30 seconds (rules don't change often)
const POLL_INTERVAL_MS = 30_000;

interface UseDetectionRulesResult {
  rules: DetectionRuleConfig[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  toggleRule: (ruleName: DetectionRuleName, enabled: boolean) => Promise<void>;
  updateThresholds: (
    ruleName: DetectionRuleName,
    thresholds: Record<string, number>
  ) => Promise<void>;
  evaluateRule: (
    ruleName: DetectionRuleName,
    target: { walletAddress?: string; conditionId?: string }
  ) => Promise<RuleEvaluationResult>;
  updating: DetectionRuleName | null;
}

export function useDetectionRules(): UseDetectionRulesResult {
  const [rules, setRules] = useState<DetectionRuleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<DetectionRuleName | null>(null);
  const isInitialLoad = useRef(true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (isInitialLoad.current) {
      setLoading(true);
    }

    try {
      const data = await fetchDetectionRules();
      setRules(data.rules);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up polling for updates
    pollIntervalRef.current = setInterval(fetchData, POLL_INTERVAL_MS);

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchData]);

  const toggleRule = useCallback(
    async (ruleName: DetectionRuleName, enabled: boolean) => {
      setUpdating(ruleName);
      setError(null);

      try {
        await updateDetectionRule(ruleName, { enabled });
        // Optimistic update
        setRules((prev) =>
          prev.map((rule) =>
            rule.name === ruleName ? { ...rule, enabled } : rule
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update rule');
        // Refresh to get correct state
        await fetchData();
      } finally {
        setUpdating(null);
      }
    },
    [fetchData]
  );

  const updateThresholds = useCallback(
    async (ruleName: DetectionRuleName, thresholds: Record<string, number>) => {
      setUpdating(ruleName);
      setError(null);

      try {
        await updateDetectionRule(ruleName, { thresholds });
        // Optimistic update
        setRules((prev) =>
          prev.map((rule) =>
            rule.name === ruleName
              ? { ...rule, thresholds: { ...rule.thresholds, ...thresholds } }
              : rule
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update thresholds');
        // Refresh to get correct state
        await fetchData();
      } finally {
        setUpdating(null);
      }
    },
    [fetchData]
  );

  const evaluateRule = useCallback(
    async (
      ruleName: DetectionRuleName,
      target: { walletAddress?: string; conditionId?: string }
    ): Promise<RuleEvaluationResult> => {
      return evaluateDetectionRule(ruleName, target);
    },
    []
  );

  return {
    rules,
    loading,
    error,
    refetch: fetchData,
    toggleRule,
    updateThresholds,
    evaluateRule,
    updating,
  };
}
