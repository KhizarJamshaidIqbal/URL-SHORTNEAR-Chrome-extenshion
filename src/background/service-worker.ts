import { URLShortenerAPI } from '../shared/api';
import { StorageManager } from '../shared/storage';
import { ShortenedURL } from '../shared/types';

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'quickshort-shorten',
    title: 'QuickShort: Shorten link',
    contexts: ['link', 'page'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'quickshort-shorten') return;

  const url = info.linkUrl || info.pageUrl || tab?.url;
  if (!url) return;

  try {
    const settings = await StorageManager.getSettings();
    const result = await URLShortenerAPI.shorten(
      url,
      settings.provider,
      settings.apiKey,
      settings.customEndpoint
    );

    if (result.success && result.shortUrl) {
      // Save to history
      const shortenedUrl: ShortenedURL = {
        id: Date.now().toString(),
        originalUrl: url,
        shortUrl: result.shortUrl,
        timestamp: Date.now(),
        provider: settings.provider,
      };

      await StorageManager.addToHistory(shortenedUrl);

      // Copy to clipboard if auto-copy is enabled
      if (settings.autoCopy && tab?.id) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (text: string) => {
              navigator.clipboard.writeText(text);
            },
            args: [result.shortUrl],
          });
        } catch (error) {
          console.error('Failed to copy to clipboard:', error);
        }
      }

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/src/assets/icon-48.png',
        title: 'URL Shortened!',
        message: `${result.shortUrl}${settings.autoCopy ? ' (copied)' : ''}`,
      });
    } else {
      // Show error notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/src/assets/icon-48.png',
        title: 'Error',
        message: result.error || 'Failed to shorten URL',
      });
    }
  } catch (error) {
    console.error('QuickShort error:', error);
  }
});

// Handle messages from popup and options
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'shorten') {
    URLShortenerAPI.shorten(
      message.url,
      message.provider,
      message.apiKey,
      message.customEndpoint
    ).then(sendResponse);
    return true; // Keep message channel open for async response
  }
});