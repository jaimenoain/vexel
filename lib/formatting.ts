/**
 * Formats a number as a currency string according to the given locale.
 *
 * @param amount The numeric amount to format.
 * @param currencyCode The ISO 4217 currency code (e.g., 'USD', 'EUR').
 * @param locale The locale identifier (e.g., 'en-US', 'es-ES', 'fr-FR').
 * @returns The formatted currency string.
 */
export function formatCurrency(amount: number, currencyCode: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch (error) {
    // Fallback to en-US if something goes wrong (e.g., invalid locale)
    // Note: Invalid currency code will still throw.
    console.warn(`Error formatting currency with locale '${locale}':`, error);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  }
}

/**
 * Formats a number as a currency parts object (symbol and value) according to the given locale.
 * Useful for custom layouts where the symbol needs to be styled separately.
 *
 * @param amount The numeric amount to format.
 * @param currencyCode The ISO 4217 currency code.
 * @param locale The locale identifier.
 * @returns An object containing the currency symbol and the formatted value string (without symbol).
 */
export function formatCurrencyParts(amount: number, currencyCode: string, locale: string): { symbol: string; value: string } {
  let parts: Intl.NumberFormatPart[];
  try {
    parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).formatToParts(amount);
  } catch (error) {
    console.warn(`Error formatting currency parts with locale '${locale}':`, error);
    parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).formatToParts(amount);
  }

  const symbolPart = parts.find((p) => p.type === 'currency');
  const symbol = symbolPart ? symbolPart.value : currencyCode;

  // Filter out currency symbol and any literals (often spaces around the symbol)
  const value = parts
    .filter((p) => p.type !== 'currency' && p.type !== 'literal')
    .map((p) => p.value)
    .join('');

  return { symbol, value };
}
