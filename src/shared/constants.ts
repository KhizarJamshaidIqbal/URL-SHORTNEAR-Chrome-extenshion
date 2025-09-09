export const STORAGE_KEYS = {
  SETTINGS: 'quickshort_settings',
  HISTORY: 'quickshort_history',
} as const;

export const MAX_HISTORY_ITEMS = 10;

export const API_ENDPOINTS = {
  BITLY: 'https://api-ssl.bitly.com/v4/shorten',
  TINYURL: 'https://tinyurl.com/api-create.php',
  EPSOLDEV: 'https://api.epsoldev.com/shorten',
} as const;

export const DEFAULT_SETTINGS = {
  provider: 'epsoldev' as const,
  autoCopy: true,
  history: [],
  analytics: false,
};