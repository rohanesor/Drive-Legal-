/**
 * Vazhi — Application Configuration
 *
 * Single source of truth for all app-level configuration.
 * The production API URL must ONLY exist here.
 */
export const CONFIG = {
  API_BASE_URL: 'https://vazhi.duckdns.org',
  REQUEST_TIMEOUT_MS: 15000,
  MAX_RETRIES: 2,
  RETRY_BASE_DELAY_MS: 1000,
  RETRY_MAX_DELAY_MS: 4000,
  HEALTH_CHECK_INTERVAL_MS: 60000,
  HEALTH_CHECK_RECOVERY_INTERVAL_MS: 10000,
  CACHE_STALE_THRESHOLD_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;
