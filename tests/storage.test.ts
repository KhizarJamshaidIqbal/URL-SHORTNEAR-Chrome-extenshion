import { StorageManager } from '../src/shared/storage';
import { DEFAULT_SETTINGS } from '../src/shared/constants';

// Mock Chrome storage
const mockChromeStorage = chrome.storage.sync as jest.Mocked<typeof chrome.storage.sync>;

describe('StorageManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    test('should return default settings when no settings exist', async () => {
      mockChromeStorage.get.mockResolvedValueOnce({});

      const settings = await StorageManager.getSettings();
      
      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(mockChromeStorage.get).toHaveBeenCalledWith('quickshort_settings');
    });

    test('should return stored settings when they exist', async () => {
      const storedSettings = {
        provider: 'bitly' as const,
        apiKey: 'test-key',
        autoCopy: false,
        history: [],
        analytics: true,
      };
      
      mockChromeStorage.get.mockResolvedValueOnce({
        quickshort_settings: storedSettings,
      });

      const settings = await StorageManager.getSettings();
      
      expect(settings).toEqual(storedSettings);
    });
  });

  describe('saveSettings', () => {
    test('should merge new settings with existing ones', async () => {
      const existingSettings = {
        provider: 'tinyurl' as const,
        autoCopy: true,
        history: [],
        analytics: false,
      };
      
      mockChromeStorage.get.mockResolvedValueOnce({
        quickshort_settings: existingSettings,
      });

      const newSettings = {
        provider: 'bitly' as const,
        apiKey: 'new-key',
      };

      await StorageManager.saveSettings(newSettings);
      
      expect(mockChromeStorage.set).toHaveBeenCalledWith({
        quickshort_settings: {
          ...existingSettings,
          ...newSettings,
        },
      });
    });
  });

  describe('addToHistory', () => {
    test('should add new item to beginning of history', async () => {
      const existingSettings = {
        provider: 'tinyurl' as const,
        autoCopy: true,
        history: [
          {
            id: '1',
            originalUrl: 'https://old.com',
            shortUrl: 'https://tinyurl.com/old',
            timestamp: 1000,
            provider: 'tinyurl' as const,
          },
        ],
        analytics: false,
      };
      
      mockChromeStorage.get.mockResolvedValueOnce({
        quickshort_settings: existingSettings,
      });

      const newItem = {
        id: '2',
        originalUrl: 'https://new.com',
        shortUrl: 'https://tinyurl.com/new',
        timestamp: 2000,
        provider: 'tinyurl' as const,
      };

      await StorageManager.addToHistory(newItem);
      
      expect(mockChromeStorage.set).toHaveBeenCalledWith({
        quickshort_settings: {
          ...existingSettings,
          history: [newItem, existingSettings.history[0]],
        },
      });
    });

    test('should limit history to MAX_HISTORY_ITEMS', async () => {
      // Create history with maximum items
      const fullHistory = Array.from({ length: 10 }, (_, i) => ({
        id: i.toString(),
        originalUrl: `https://example${i}.com`,
        shortUrl: `https://tinyurl.com/test${i}`,
        timestamp: i * 1000,
        provider: 'tinyurl' as const,
      }));

      const existingSettings = {
        provider: 'tinyurl' as const,
        autoCopy: true,
        history: fullHistory,
        analytics: false,
      };
      
      mockChromeStorage.get.mockResolvedValueOnce({
        quickshort_settings: existingSettings,
      });

      const newItem = {
        id: '11',
        originalUrl: 'https://new.com',
        shortUrl: 'https://tinyurl.com/new',
        timestamp: 11000,
        provider: 'tinyurl' as const,
      };

      await StorageManager.addToHistory(newItem);
      
      const expectedHistory = [newItem, ...fullHistory.slice(0, 9)];
      
      expect(mockChromeStorage.set).toHaveBeenCalledWith({
        quickshort_settings: {
          ...existingSettings,
          history: expectedHistory,
        },
      });
      expect(expectedHistory).toHaveLength(10);
    });

    test('should replace existing item with same ID', async () => {
      const existingItem = {
        id: '1',
        originalUrl: 'https://old.com',
        shortUrl: 'https://tinyurl.com/old',
        timestamp: 1000,
        provider: 'tinyurl' as const,
      };

      const existingSettings = {
        provider: 'tinyurl' as const,
        autoCopy: true,
        history: [existingItem],
        analytics: false,
      };
      
      mockChromeStorage.get.mockResolvedValueOnce({
        quickshort_settings: existingSettings,
      });

      const updatedItem = {
        id: '1', // Same ID
        originalUrl: 'https://updated.com',
        shortUrl: 'https://tinyurl.com/updated',
        timestamp: 2000,
        provider: 'bitly' as const,
      };

      await StorageManager.addToHistory(updatedItem);
      
      expect(mockChromeStorage.set).toHaveBeenCalledWith({
        quickshort_settings: {
          ...existingSettings,
          history: [updatedItem], // Should only have the updated item
        },
      });
    });
  });

  describe('clearHistory', () => {
    test('should clear all history', async () => {
      const existingSettings = {
        provider: 'tinyurl' as const,
        autoCopy: true,
        history: [
          {
            id: '1',
            originalUrl: 'https://example.com',
            shortUrl: 'https://tinyurl.com/test',
            timestamp: 1000,
            provider: 'tinyurl' as const,
          },
        ],
        analytics: false,
      };
      
      mockChromeStorage.get.mockResolvedValueOnce({
        quickshort_settings: existingSettings,
      });

      await StorageManager.clearHistory();
      
      expect(mockChromeStorage.set).toHaveBeenCalledWith({
        quickshort_settings: {
          ...existingSettings,
          history: [],
        },
      });
    });
  });

  describe('exportSettings', () => {
    test('should export settings without API key', async () => {
      const settings = {
        provider: 'bitly' as const,
        apiKey: 'secret-key',
        autoCopy: true,
        history: [],
        analytics: false,
      };
      
      mockChromeStorage.get.mockResolvedValueOnce({
        quickshort_settings: settings,
      });

      const exported = await StorageManager.exportSettings();
      const parsed = JSON.parse(exported);
      
      expect(parsed.apiKey).toBeUndefined();
      expect(parsed.provider).toBe('bitly');
      expect(parsed.autoCopy).toBe(true);
    });
  });

  describe('importSettings', () => {
    test('should import valid settings', async () => {
      const validSettings = {
        provider: 'bitly',
        autoCopy: false,
        analytics: true,
      };
      
      mockChromeStorage.get.mockResolvedValueOnce({
        quickshort_settings: DEFAULT_SETTINGS,
      });

      await StorageManager.importSettings(JSON.stringify(validSettings));
      
      expect(mockChromeStorage.set).toHaveBeenCalledWith({
        quickshort_settings: {
          ...DEFAULT_SETTINGS,
          ...validSettings,
        },
      });
    });

    test('should reject invalid settings', async () => {
      const invalidSettings = {
        provider: 'invalid-provider',
      };

      await expect(
        StorageManager.importSettings(JSON.stringify(invalidSettings))
      ).rejects.toThrow('Failed to import settings: Invalid settings format');
    });

    test('should reject malformed JSON', async () => {
      await expect(
        StorageManager.importSettings('invalid json')
      ).rejects.toThrow('Failed to import settings:');
    });
  });
});