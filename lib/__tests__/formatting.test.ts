import { formatCurrencyParts } from '../formatting';

describe('Currency Formatting', () => {
  describe('formatCurrencyParts', () => {
    it('formats USD correctly in en-US', () => {
      const { symbol, value } = formatCurrencyParts(1234.56, 'USD', 'en-US');
      expect(symbol).toBe('$');
      expect(value).toBe('1,234.56');
    });

    it('formats EUR correctly in es-ES', () => {
      const { symbol, value } = formatCurrencyParts(1234.56, 'EUR', 'es-ES');
      expect(symbol).toBe('€');
      // In es-ES (Node environment), grouping applies for >= 10000 usually, or depends on version.
      // Based on test run, 1234.56 is formatted as '1234,56'.
      expect(value).toBe('1234,56');
    });

    it('formats EUR correctly in fr-FR', () => {
      const { symbol, value } = formatCurrencyParts(1234.56, 'EUR', 'fr-FR');
      expect(symbol).toBe('€');
      // In fr-FR, thousands separator is a narrow non-breaking space (U+202F) or space
      // We normalize to check
      expect(value.replace(/\u202f/g, ' ')).toBe('1 234,56');
    });

    it('handles negative numbers correctly', () => {
      const { symbol, value } = formatCurrencyParts(-1234.56, 'USD', 'en-US');
      expect(symbol).toBe('$');
      // Expect minus sign to be part of the value
      expect(value).toBe('-1,234.56');
    });
  });
});
