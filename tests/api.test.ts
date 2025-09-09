import { URLShortenerAPI } from '../src/shared/api';

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('URLShortenerAPI', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('shorten', () => {
    test('should return error for invalid URL', async () => {
      const result = await URLShortenerAPI.shorten('invalid-url', 'tinyurl');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });

    test('should shorten with TinyURL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('https://tinyurl.com/test123'),
      } as Response);

      const result = await URLShortenerAPI.shorten('https://example.com', 'tinyurl');
      
      expect(result.success).toBe(true);
      expect(result.shortUrl).toBe('https://tinyurl.com/test123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://tinyurl.com/api-create.php?url=https%3A%2F%2Fexample.com'
      );
    });

    test('should shorten with Bitly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ link: 'https://bit.ly/test123' }),
      } as Response);

      const result = await URLShortenerAPI.shorten(
        'https://example.com',
        'bitly',
        'test-api-key'
      );
      
      expect(result.success).toBe(true);
      expect(result.shortUrl).toBe('https://bit.ly/test123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api-ssl.bitly.com/v4/shorten',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ long_url: 'https://example.com' }),
        })
      );
    });

    test('should return error for Bitly without API key', async () => {
      const result = await URLShortenerAPI.shorten('https://example.com', 'bitly');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Bitly API key required');
    });

    test('should handle Bitly rate limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({}),
      } as Response);

      const result = await URLShortenerAPI.shorten(
        'https://example.com',
        'bitly',
        'test-api-key'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded. Please try again later.');
    });

    test('should shorten with custom endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ shortUrl: 'https://custom.ly/abc123' }),
      } as Response);

      const result = await URLShortenerAPI.shorten(
        'https://example.com',
        'custom',
        undefined,
        'https://api.custom.com/shorten'
      );
      
      expect(result.success).toBe(true);
      expect(result.shortUrl).toBe('https://custom.ly/abc123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.custom.com/shorten',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://example.com' }),
        })
      );
    });

    test('should return error for custom provider without endpoint', async () => {
      const result = await URLShortenerAPI.shorten('https://example.com', 'custom');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Custom endpoint not configured');
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await URLShortenerAPI.shorten('https://example.com', 'tinyurl');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});