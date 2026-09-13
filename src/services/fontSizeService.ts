/**
 * FontSizeService — Global flexible font size management for eyesight accessibility.
 *
 * Supported font size levels:
 *   - 'small':  85% / 14px base font size
 *   - 'medium': 100% / 16px base font size (Default)
 *   - 'large':  120% / 19px base font size (Enhanced readability for eyesight)
 *   - 'xlarge': 140% / 22px base font size (Maximum eyesight accessibility)
 *
 * Persisted in localStorage under storyquest_font_size.
 * Applied globally to <html data-font-size="...">.
 */

export type FontSizeLevel = 'small' | 'medium' | 'large' | 'xlarge';

const FONT_SIZE_KEY = 'storyquest_font_size';
const DEFAULT_FONT_SIZE: FontSizeLevel = 'medium';

export const FONT_SIZE_OPTIONS: { label: string; value: FontSizeLevel; desc: string }[] = [
  { label: 'Small',   value: 'small',   desc: 'Compact font size' },
  { label: 'Medium',  value: 'medium',  desc: 'Standard default font size' },
  { label: 'Large',   value: 'large',   desc: 'Enhanced readability for eyesight' },
  { label: 'X-Large', value: 'xlarge',  desc: 'Maximum eyesight accessibility font size' },
];

class FontSizeService {
  private currentSize: FontSizeLevel;

  constructor() {
    this.currentSize = this.loadSavedSize();
    this.applyToDOM(this.currentSize);
  }

  getFontSize(): FontSizeLevel {
    return this.currentSize;
  }

  setFontSize(size: FontSizeLevel): void {
    this.currentSize = size;
    this.applyToDOM(size);
    try {
      localStorage.setItem(FONT_SIZE_KEY, size);
    } catch { /* localStorage fallback */ }
  }

  init(): void {
    this.applyToDOM(this.currentSize);
  }

  private loadSavedSize(): FontSizeLevel {
    try {
      const saved = localStorage.getItem(FONT_SIZE_KEY) as FontSizeLevel | null;
      if (saved && ['small', 'medium', 'large', 'xlarge'].includes(saved)) {
        return saved;
      }
    } catch { /* fallback */ }
    return DEFAULT_FONT_SIZE;
  }

  private applyToDOM(size: FontSizeLevel): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-font-size', size);
    }
  }
}

export const fontSizeService = new FontSizeService();
