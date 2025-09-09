import { isValidUrl, sanitizeUrl, validateApiKey } from '../src/shared/validators';

describe('Validators', () => {
  describe('isValidUrl', () => {
    test('should return true for valid HTTP URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://www.google.com/search?q=test')).toBe(true);
    });

    test('should return false for invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('javascript:alert("xss")')).toBe(false);
    });

    test('should return false for malformed URLs', () => {
      expect(isValidUrl('http://')).toBe(false);
      expect(isValidUrl('https://')).toBe(false);
      expect(isValidUrl('://example.com')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    test('should remove tracking parameters', () => {
      const url = 'https://example.com?utm_source=test&utm_medium=email&normal=keep';
      const result = sanitizeUrl(url);
      expect(result).toBe('https://example.com/?normal=keep');
    });

    test('should remove Facebook click ID', () => {
      const url = 'https://example.com?fbclid=12345&other=keep';
      const result = sanitizeUrl(url);
      expect(result).toBe('https://example.com/?other=keep');
    });

    test('should remove Google click ID', () => {
      const url = 'https://example.com?gclid=67890&other=keep';
      const result = sanitizeUrl(url);
      expect(result).toBe('https://example.com/?other=keep');
    });

    test('should handle URLs without tracking parameters', () => {
      const url = 'https://example.com/path?normal=param';
      const result = sanitizeUrl(url);
      expect(result).toBe(url);
    });
  });

  describe('validateApiKey', () => {
    test('should validate Bitly API keys', () => {
      // Valid Bitly key (40 characters)
      const validKey = 'a'.repeat(40);
      expect(validateApiKey(validKey, 'bitly')).toBe(true);

      // Invalid Bitly keys
      expect(validateApiKey('short', 'bitly')).toBe(false);
      expect(validateApiKey('a'.repeat(39), 'bitly')).toBe(false);
      expect(validateApiKey('a'.repeat(41), 'bitly')).toBe(false);
      expect(validateApiKey('invalid-chars!@#', 'bitly')).toBe(false);
    });

    test('should return true for non-Bitly providers', () => {
      expect(validateApiKey('any-key', 'tinyurl')).toBe(true);
      expect(validateApiKey('any-key', 'custom')).toBe(true);
    });
  });
});