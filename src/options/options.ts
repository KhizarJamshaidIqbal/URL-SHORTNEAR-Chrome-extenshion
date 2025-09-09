import { StorageManager } from '../shared/storage';
import { UserSettings } from '../shared/types';
import { validateApiKey } from '../shared/validators';

class OptionsManager {
  private providerInputs!: NodeListOf<HTMLInputElement>;
  private bitlyKeyInput!: HTMLInputElement;
  private customEndpointInput!: HTMLInputElement;
  private autoCopyCheckbox!: HTMLInputElement;
  private analyticsCheckbox!: HTMLInputElement;
  private saveBtn!: HTMLButtonElement;
  private clearHistoryBtn!: HTMLButtonElement;
  private exportBtn!: HTMLButtonElement;
  private importBtn!: HTMLButtonElement;
  private importFileInput!: HTMLInputElement;
  private saveStatus!: HTMLElement;
  private currentSettings: UserSettings | null = null;

  constructor() {
    this.initElements();
    this.bindEvents();
    this.loadSettings();
  }

  private initElements(): void {
    this.providerInputs = document.querySelectorAll('input[name="provider"]');
    this.bitlyKeyInput = document.getElementById('bitly-key') as HTMLInputElement;
    this.customEndpointInput = document.getElementById('custom-endpoint') as HTMLInputElement;
    this.autoCopyCheckbox = document.getElementById('auto-copy') as HTMLInputElement;
    this.analyticsCheckbox = document.getElementById('analytics') as HTMLInputElement;
    this.saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
    this.clearHistoryBtn = document.getElementById('clear-history') as HTMLButtonElement;
    this.exportBtn = document.getElementById('export-settings') as HTMLButtonElement;
    this.importBtn = document.getElementById('import-settings') as HTMLButtonElement;
    this.importFileInput = document.getElementById('import-file') as HTMLInputElement;
    this.saveStatus = document.getElementById('save-status') as HTMLElement;
  }

  private bindEvents(): void {
    this.providerInputs.forEach((input) => {
      input.addEventListener('change', () => this.handleProviderChange());
    });

    this.saveBtn.addEventListener('click', () => this.saveSettings());
    this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    this.exportBtn.addEventListener('click', () => this.exportSettings());
    this.importBtn.addEventListener('click', () => this.importFileInput.click());
    this.importFileInput.addEventListener('change', (e) => this.handleImport(e));
  }

  private async loadSettings(): Promise<void> {
    this.currentSettings = await StorageManager.getSettings();

    // Set provider
    const providerInput = document.getElementById(`provider-${this.currentSettings.provider}`) as HTMLInputElement;
    if (providerInput) {
      providerInput.checked = true;
    }

    // Set API key and endpoint
    if (this.currentSettings.apiKey) {
      this.bitlyKeyInput.value = this.currentSettings.apiKey;
    }
    if (this.currentSettings.customEndpoint) {
      this.customEndpointInput.value = this.currentSettings.customEndpoint;
    }

    // Set checkboxes
    this.autoCopyCheckbox.checked = this.currentSettings.autoCopy;
    this.analyticsCheckbox.checked = this.currentSettings.analytics;

    // Show provider config
    this.handleProviderChange();
  }

  private handleProviderChange(): void {
    const selectedProvider = document.querySelector('input[name="provider"]:checked') as HTMLInputElement;
    
    // Hide all config sections
    document.getElementById('bitly-config')?.classList.add('hidden');
    document.getElementById('custom-config')?.classList.add('hidden');

    // Show relevant config section
    if (selectedProvider?.value === 'bitly') {
      document.getElementById('bitly-config')?.classList.remove('hidden');
    } else if (selectedProvider?.value === 'custom') {
      document.getElementById('custom-config')?.classList.remove('hidden');
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const selectedProvider = document.querySelector('input[name="provider"]:checked') as HTMLInputElement;
      
      if (!selectedProvider) {
        this.showStatus('Please select a provider', 'error');
        return;
      }

      const provider = selectedProvider.value as 'bitly' | 'tinyurl' | 'custom';
      
      // Validate based on provider
      if (provider === 'bitly') {
        const apiKey = this.bitlyKeyInput.value.trim();
        if (!apiKey) {
          this.showStatus('Bitly API key is required', 'error');
          return;
        }
        if (!validateApiKey(apiKey, provider)) {
          this.showStatus('Invalid Bitly API key format', 'error');
          return;
        }
      }

      if (provider === 'custom') {
        const endpoint = this.customEndpointInput.value.trim();
        if (!endpoint) {
          this.showStatus('Custom endpoint is required', 'error');
          return;
        }
        try {
          new URL(endpoint);
        } catch {
          this.showStatus('Invalid endpoint URL', 'error');
          return;
        }
      }

      const settings: Partial<UserSettings> = {
        provider,
        apiKey: provider === 'bitly' ? this.bitlyKeyInput.value.trim() : undefined,
        customEndpoint: provider === 'custom' ? this.customEndpointInput.value.trim() : undefined,
        autoCopy: this.autoCopyCheckbox.checked,
        analytics: this.analyticsCheckbox.checked,
      };

      await StorageManager.saveSettings(settings);
      this.showStatus('Settings saved successfully!', 'success');
      
      // Reload settings to ensure consistency
      setTimeout(() => this.loadSettings(), 1000);
      
    } catch (error) {
      console.error('Save error:', error);
      this.showStatus('Failed to save settings', 'error');
    }
  }

  private async clearHistory(): Promise<void> {
    if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
      try {
        await StorageManager.clearHistory();
        this.showStatus('History cleared successfully!', 'success');
      } catch (error) {
        console.error('Clear history error:', error);
        this.showStatus('Failed to clear history', 'error');
      }
    }
  }

  private async exportSettings(): Promise<void> {
    try {
      const exportData = await StorageManager.exportSettings();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `quickshort-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showStatus('Settings exported successfully!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      this.showStatus('Failed to export settings', 'error');
    }
  }

  private async handleImport(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await StorageManager.importSettings(text);
      this.showStatus('Settings imported successfully!', 'success');
      
      // Reload the form with imported settings
      setTimeout(() => this.loadSettings(), 1000);
      
    } catch (error) {
      console.error('Import error:', error);
      this.showStatus((error as Error).message || 'Failed to import settings', 'error');
    }
  }

  private showStatus(message: string, type: 'success' | 'error'): void {
    this.saveStatus.textContent = message;
    this.saveStatus.style.color = type === 'success' ? 'var(--success-color)' : 'var(--error-color)';
    
    setTimeout(() => {
      this.saveStatus.textContent = '';
    }, 3000);
  }
}

// Initialize options page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});