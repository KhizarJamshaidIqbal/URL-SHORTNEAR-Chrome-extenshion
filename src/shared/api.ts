import { APIResponse, URLProvider } from './types';
import { API_ENDPOINTS } from './constants';
import { isValidUrl } from './validators';

export class URLShortenerAPI {
  static async shorten(
    url: string,
    provider: URLProvider,
    apiKey?: string,
    customEndpoint?: string
  ): Promise<APIResponse> {
    if (!isValidUrl(url)) {
      return { success: false, error: 'Invalid URL format' };
    }

    try {
      switch (provider) {
        case 'bitly':
          return await this.shortenWithBitly(url, apiKey!);
        case 'tinyurl':
          return await this.shortenWithTinyURL(url);
        case 'epsoldev':
          return await this.shortenWithEpsoldev(url);
        case 'custom':
          return await this.shortenWithCustom(url, customEndpoint!);
        default:
          return { success: false, error: 'Unknown provider' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  private static async shortenWithBitly(
    url: string,
    apiKey: string
  ): Promise<APIResponse> {
    if (!apiKey) {
      return { success: false, error: 'Bitly API key required' };
    }

    const response = await fetch(API_ENDPOINTS.BITLY, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ long_url: url }),
    });

    if (response.status === 429) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
      };
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: error.message || 'Bitly API error' };
    }

    const data = await response.json();
    return { success: true, shortUrl: data.link };
  }

  private static async shortenWithTinyURL(url: string): Promise<APIResponse> {
    const params = new URLSearchParams({ url });
    const response = await fetch(`${API_ENDPOINTS.TINYURL}?${params}`);

    if (!response.ok) {
      return { success: false, error: 'TinyURL service error' };
    }

    const shortUrl = await response.text();
    return { success: true, shortUrl };
  }

  private static async shortenWithEpsoldev(url: string): Promise<APIResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.EPSOLDEV, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        console.warn('Epsoldev service unavailable, falling back to TinyURL');
        return await this.shortenWithTinyURL(url);
      }

      const data = await response.json();
      return { success: true, shortUrl: data.shortUrl || data.short_url };
    } catch (error) {
      console.warn('Epsoldev service error, falling back to TinyURL:', error);
      return await this.shortenWithTinyURL(url);
    }
  }

  private static async shortenWithCustom(
    url: string,
    endpoint: string
  ): Promise<APIResponse> {
    if (!endpoint) {
      return { success: false, error: 'Custom endpoint not configured' };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      return { success: false, error: 'Custom API error' };
    }

    const data = await response.json();
    return { success: true, shortUrl: data.shortUrl || data.short_url };
  }
}