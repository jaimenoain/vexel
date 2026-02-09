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
