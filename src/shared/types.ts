export interface ShortenedURL {
  id: string;
  originalUrl: string;
  shortUrl: string;
  timestamp: number;
  provider: URLProvider;
}

export type URLProvider = 'bitly' | 'tinyurl' | 'epsoldev' | 'custom';

export interface UserSettings {
  provider: URLProvider;
  apiKey?: string;
  customEndpoint?: string;
  autoCopy: boolean;
  history: ShortenedURL[];
  analytics: boolean;
}

export interface APIResponse {
  success: boolean;
  shortUrl?: string;
  error?: string;
}

export interface Message {
  action: 'shorten' | 'getHistory' | 'clearHistory' | 'updateSettings';
  data?: any;
}