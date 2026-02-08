export class CurrencyService {
  // Hardcoded rates relative to USD (Base Currency)
  private static readonly RATES: Record<string, number> = {
    'USD': 1.0,
    'EUR': 1.08,
    'GBP': 1.27,
    // Add others as needed
  };

  /**
   * Normalizes an amount from asset currency to user base currency.
   * @param amount The amount in asset currency.
   * @param assetCurrency The currency code of the asset (e.g., 'EUR').
   * @param userBaseCurrency The user's base currency code (default: 'USD').
   * @returns The normalized amount in user base currency.
   */
  static normalizeToUserBase(amount: number, assetCurrency: string, userBaseCurrency: string = 'USD'): number {
    const rateToUSD = this.RATES[assetCurrency] || 1.0; // Default to 1.0 if not found
    const amountInUSD = amount * rateToUSD;

    const rateFromUSD = this.RATES[userBaseCurrency] || 1.0; // Default to 1.0 if not found

    return amountInUSD / rateFromUSD;
  }
}
