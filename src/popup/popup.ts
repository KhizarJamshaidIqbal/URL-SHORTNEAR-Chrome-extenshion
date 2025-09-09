import { URLShortenerAPI } from '../shared/api';
import { StorageManager } from '../shared/storage';
import { isValidUrl, isImageUrl, getUrlType } from '../shared/validators';
import { ShortenedURL } from '../shared/types';
import QRCode from 'qrcode';

class PopupManager {
  private urlInput!: HTMLInputElement;
  private shortenBtn!: HTMLButtonElement;
  private resultDiv!: HTMLElement;
  private shortUrlInput!: HTMLInputElement;
  private copyBtn!: HTMLButtonElement;
  private openBtn!: HTMLButtonElement;
  private qrBtn!: HTMLButtonElement;
  private qrCanvas!: HTMLCanvasElement;
  private historyList!: HTMLElement;
  private toast!: HTMLElement;
  private errorSpan!: HTMLElement;
  private optionsLink!: HTMLElement;
  private historyLink!: HTMLElement;
  private helpLink!: HTMLElement;
  private urlTypeIndicator!: HTMLElement;

  constructor() {
    this.initElements();
    this.bindEvents();
    this.loadCurrentTab();
    this.loadHistory();
  }

  private initElements(): void {
    this.urlInput = document.getElementById('url-input') as HTMLInputElement;
    this.shortenBtn = document.getElementById('shorten-btn') as HTMLButtonElement;
    this.resultDiv = document.getElementById('result') as HTMLElement;
    this.shortUrlInput = document.getElementById('short-url') as HTMLInputElement;
    this.copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
    this.openBtn = document.getElementById('open-btn') as HTMLButtonElement;
    this.qrBtn = document.getElementById('qr-btn') as HTMLButtonElement;
    this.qrCanvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
    this.historyList = document.getElementById('history-list') as HTMLElement;
    this.toast = document.getElementById('toast') as HTMLElement;
    this.errorSpan = document.getElementById('url-error') as HTMLElement;
    this.optionsLink = document.getElementById('options-link') as HTMLElement;
    this.historyLink = document.getElementById('history-link') as HTMLElement;
    this.helpLink = document.getElementById('help-link') as HTMLElement;
    this.urlTypeIndicator = document.getElementById('url-type-indicator') as HTMLElement;
  }

  private bindEvents(): void {
    this.shortenBtn.addEventListener('click', () => this.handleShorten());
    this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    this.openBtn.addEventListener('click', () => this.openInNewTab());
    this.qrBtn.addEventListener('click', () => this.toggleQRCode());
    this.optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.openSettings();
    });
    this.historyLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showHistory();
    });
    this.helpLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showHelp();
    });
    this.urlInput.addEventListener('input', () => {
      this.clearError();
      this.updateUrlTypeIndicator();
    });
    this.urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleShorten();
    });
  }

  private async loadCurrentTab(): Promise<void> {
    try {
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      console.log('Current tab:', tab);
      
      if (tab?.url) {
        // Filter out chrome:// and extension:// URLs
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
          this.urlInput.placeholder = 'Enter URL to shorten (current page cannot be shortened)';
          console.log('Cannot shorten browser internal pages');
          return;
        }
        
        // Check if URL is valid
        if (isValidUrl(tab.url)) {
          this.urlInput.value = tab.url;
          this.urlInput.placeholder = 'Current page URL auto-filled';
          console.log('Auto-filled URL:', tab.url);
        } else {
          this.urlInput.placeholder = 'Enter a valid URL to shorten';
          console.log('Invalid URL detected:', tab.url);
        }
      } else {
        this.urlInput.placeholder = 'Enter URL to shorten';
        console.log('No URL found in current tab');
      }
    } catch (error) {
      console.error('Failed to get current tab:', error);
      this.urlInput.placeholder = 'Enter URL to shorten';
      
      // Fallback: try to get URL using alternative method
      try {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
          if (tabs[0]?.url && isValidUrl(tabs[0].url)) {
            this.urlInput.value = tabs[0].url;
            console.log('Fallback URL detection successful:', tabs[0].url);
          }
        });
      } catch (fallbackError) {
        console.error('Fallback URL detection also failed:', fallbackError);
      }
    }
  }

  private async loadHistory(): Promise<void> {
    const settings = await StorageManager.getSettings();
    this.renderHistory(settings.history);
  }

  private renderHistory(history: ShortenedURL[]): void {
    if (history.length === 0) {
      this.historyList.innerHTML = '<li class="history-item">No recent URLs</li>';
      return;
    }

    this.historyList.innerHTML = history
      .slice(0, 5)
      .map(
        (item) => `
        <li class="history-item" data-url="${item.shortUrl}">
          <a href="${item.shortUrl}" class="history-item-url" target="_blank">
            ${item.shortUrl}
          </a>
          <span class="history-item-date">
            ${new Date(item.timestamp).toLocaleDateString()}
          </span>
        </li>
      `
      )
      .join('');

    // Add click handlers to history items
    this.historyList.querySelectorAll('.history-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).tagName !== 'A') {
          const url = item.getAttribute('data-url');
          if (url) {
            this.shortUrlInput.value = url;
            this.resultDiv.classList.remove('hidden');
            this.copyToClipboard();
          }
        }
      });
    });
  }

  private async handleShorten(): Promise<void> {
    console.log('Shorten button clicked');
    const url = this.urlInput.value.trim();
    console.log('URL to shorten:', url);

    if (!url) {
      console.log('No URL provided');
      this.showError('Please enter a URL');
      return;
    }

    if (!isValidUrl(url)) {
      console.log('Invalid URL format:', url);
      this.showError('Please enter a valid URL (must start with http:// or https://)');
      return;
    }

    // Check if it's an image URL and warn the user
    if (isImageUrl(url)) {
      const confirmShorten = confirm(
        '⚠️ Image URL Detected!\n\n' +
        'Shortened image URLs may not display properly in Markdown editors and documents.\n\n' +
        'Recommendation: Use the original image URL for better compatibility.\n\n' +
        'Do you still want to shorten this image URL?'
      );
      
      if (!confirmShorten) {
        this.setLoading(false);
        return;
      }
    }

    console.log('Starting URL shortening process...');
    this.setLoading(true);
    this.clearError();

    try {
      const settings = await StorageManager.getSettings();
      console.log('Current settings:', settings);
      
      const result = await URLShortenerAPI.shorten(
        url,
        settings.provider,
        settings.apiKey,
        settings.customEndpoint
      );
      
      console.log('API result:', result);

      if (result.success && result.shortUrl) {
        console.log('URL shortened successfully:', result.shortUrl);
        
        // Display result
        this.shortUrlInput.value = result.shortUrl;
        this.resultDiv.classList.remove('hidden');

        // Show tip for image URLs
        if (isImageUrl(url)) {
          this.showToast('⚠️ Image URL shortened! May not display in Markdown editors.', 'warning');
        } else {
          this.showToast('URL shortened successfully!');
        }

        // Save to history
        const shortenedUrl: ShortenedURL = {
          id: Date.now().toString(),
          originalUrl: url,
          shortUrl: result.shortUrl,
          timestamp: Date.now(),
          provider: settings.provider,
        };

        await StorageManager.addToHistory(shortenedUrl);
        await this.loadHistory();

        // Auto-copy if enabled
        if (settings.autoCopy) {
          this.copyToClipboard();
        }
      } else {
        console.error('Failed to shorten URL:', result.error);
        this.showError(result.error || 'Failed to shorten URL');
      }
    } catch (error) {
      console.error('Unexpected error during shortening:', error);
      this.showError('An unexpected error occurred. Please try again.');
    } finally {
      this.setLoading(false);
      console.log('Shortening process completed');
    }
  }

  private copyToClipboard(): void {
    navigator.clipboard
      .writeText(this.shortUrlInput.value)
      .then(() => {
        this.showToast('Copied to clipboard!');
      })
      .catch(() => {
        this.showToast('Failed to copy', 'error');
      });
  }

  private openInNewTab(): void {
    chrome.tabs.create({ url: this.shortUrlInput.value });
  }

  private async toggleQRCode(): Promise<void> {
    if (this.qrCanvas.classList.contains('hidden')) {
      try {
        await QRCode.toCanvas(this.qrCanvas, this.shortUrlInput.value, {
          width: 200,
          margin: 2,
        });
        this.qrCanvas.classList.remove('hidden');
      } catch (error) {
        this.showToast('Failed to generate QR code', 'error');
      }
    } else {
      this.qrCanvas.classList.add('hidden');
    }
  }

  private openSettings(): void {
    chrome.runtime.openOptionsPage();
  }

  private showHistory(): void {
    // For now, just show a toast with history info
    // In a full implementation, you might want to show a modal or redirect
    this.showToast('History feature - Recent URLs shown below');
  }

  private showHelp(): void {
    // Open help documentation or show help modal
    const helpUrl = 'https://github.com/yourusername/quickshort#readme';
    chrome.tabs.create({ url: helpUrl });
  }

  private setLoading(loading: boolean): void {
    this.shortenBtn.disabled = loading;
    this.urlInput.disabled = loading;

    const btnText = this.shortenBtn.querySelector('.btn-text') as HTMLElement;
    if (loading) {
      this.shortenBtn.classList.add('loading');
      btnText.textContent = '✨ Shortening...';
    } else {
      this.shortenBtn.classList.remove('loading');
      btnText.textContent = '✨ Shorten URL';
    }
  }

  private showError(message: string): void {
    this.errorSpan.textContent = message;
    this.urlInput.classList.add('error');
  }

  private clearError(): void {
    this.errorSpan.textContent = '';
    this.urlInput.classList.remove('error');
  }

  private updateUrlTypeIndicator(): void {
    const url = this.urlInput.value.trim();
    
    if (!url || !isValidUrl(url)) {
      this.urlTypeIndicator.classList.add('hidden');
      return;
    }

    const urlType = getUrlType(url);
    const icons = {
      image: '🖼️',
      video: '🎥',
      document: '📄',
      web: '🌐'
    };

    this.urlTypeIndicator.textContent = icons[urlType];
    this.urlTypeIndicator.className = `url-type-indicator ${urlType}`;
    this.urlTypeIndicator.title = `${urlType.charAt(0).toUpperCase() + urlType.slice(1)} URL`;
  }

  private showToast(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    this.toast.textContent = message;
    
    const colors = {
      success: 'var(--success-500)',
      error: 'var(--error-500)',
      warning: 'var(--warning-500)'
    };
    
    this.toast.style.background = colors[type];
    this.toast.classList.remove('hidden');

    setTimeout(() => {
      this.toast.classList.add('hidden');
    }, type === 'warning' ? 5000 : 3000); // Show warnings longer
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});