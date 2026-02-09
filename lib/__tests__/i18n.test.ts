import { formatCurrency } from '../formatting';
import enCommon from '../locales/en/common.json';
import esCommon from '../locales/es/common.json';
import frCommon from '../locales/fr/common.json';

describe('Internationalization QA', () => {
  const normalize = (str: string) => str.replace(/\u00a0/g, ' ').replace(/\u202f/g, ' ');

  describe('Currency Formatter', () => {
    // en-US: Expect $1,234.56
    it('formats 1234.56 correctly in en-US', () => {
      const result = formatCurrency(1234.56, 'USD', 'en-US');
      expect(normalize(result)).toBe('$1,234.56');
    });

    // es-ES: Expect 1.234,56 US$ or 1234,56 US$
    it('formats 1234.56 correctly in es-ES', () => {
      const result = formatCurrency(1234.56, 'USD', 'es-ES');
      // Normalize result: replace non-breaking space with regular space
      const normalized = normalize(result);

      // We expect the comma as decimal separator.
      // Depending on grouping, it might have a dot or not.
      // And "US$" suffix.
      // Regex: Start with 1, optional dot, 234, comma, 56, optional space, US$
      expect(normalized).toMatch(/^1\.?234,56\s?US\$/);
    });

    // fr-FR: Expect 1 234,56 $US or similar
    it('formats 1234.56 correctly in fr-FR', () => {
      const result = formatCurrency(1234.56, 'USD', 'fr-FR');
      const normalized = normalize(result);

      // We expect space as thousands separator (if present) and comma as decimal.
      // And "$US" or similar suffix.
      expect(normalized).toMatch(/^1\s?234,56\s?\$US/);
    });
  });

  describe('Resource Completeness', () => {
    test('locales have matching top-level keys', () => {
      const enKeys = Object.keys(enCommon).sort();
      const esKeys = Object.keys(esCommon).sort();
      const frKeys = Object.keys(frCommon).sort();

      expect(esKeys).toEqual(enKeys);
      expect(frKeys).toEqual(enKeys);
    });

    // Check nested keys for 'nav'
    test('locales have matching keys for "nav"', () => {
      // @ts-ignore
      const enNav = Object.keys(enCommon.nav || {}).sort();
      // @ts-ignore
      const esNav = Object.keys(esCommon.nav || {}).sort();
      // @ts-ignore
      const frNav = Object.keys(frCommon.nav || {}).sort();

      expect(esNav).toEqual(enNav);
      expect(frNav).toEqual(enNav);
    });

     // Check nested keys for 'dashboard'
    test('locales have matching keys for "dashboard"', () => {
      // @ts-ignore
      const enDash = Object.keys(enCommon.dashboard || {}).sort();
      // @ts-ignore
      const esDash = Object.keys(esCommon.dashboard || {}).sort();
      // @ts-ignore
      const frDash = Object.keys(frCommon.dashboard || {}).sort();

      expect(esDash).toEqual(enDash);
      expect(frDash).toEqual(enDash);
    });
  });
});
