import { UserSettings, ShortenedURL } from './types';
import { STORAGE_KEYS, MAX_HISTORY_ITEMS, DEFAULT_SETTINGS } from './constants';

export class StorageManager {
  static async getSettings(): Promise<UserSettings> {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
    return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
  }

  static async saveSettings(settings: Partial<UserSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: updated });
  }

  static async addToHistory(item: ShortenedURL): Promise<void> {
    const settings = await this.getSettings();
    const history = [item, ...settings.history.filter((h) => h.id !== item.id)];

    if (history.length > MAX_HISTORY_ITEMS) {
      history.length = MAX_HISTORY_ITEMS;
    }

    await this.saveSettings({ history });
  }

  static async clearHistory(): Promise<void> {
    await this.saveSettings({ history: [] });
  }

  static async exportSettings(): Promise<string> {
    const settings = await this.getSettings();
    // Remove sensitive data from export
    const exportData = { ...settings, apiKey: undefined };
    return JSON.stringify(exportData, null, 2);
  }

  static async importSettings(jsonString: string): Promise<void> {
    try {
      const imported = JSON.parse(jsonString);
      // Validate imported data
      if (
        imported.provider &&
        ['bitly', 'tinyurl', 'custom'].includes(imported.provider)
      ) {
        await this.saveSettings(imported);
      } else {
        throw new Error('Invalid settings format');
      }
    } catch (error) {
      throw new Error(`Failed to import settings: ${(error as Error).message}`);
    }
  }
}