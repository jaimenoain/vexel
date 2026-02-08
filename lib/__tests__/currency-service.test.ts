import { CurrencyService } from '../currency-service';

describe('CurrencyService', () => {
  it('should normalize USD to USD correctly (1:1)', () => {
    const amount = 100;
    const result = CurrencyService.normalizeToUserBase(amount, 'USD', 'USD');
    expect(result).toBe(100);
  });

  it('should normalize EUR to USD correctly (1:1.08)', () => {
    const amount = 100;
    const result = CurrencyService.normalizeToUserBase(amount, 'EUR', 'USD');
    expect(result).toBe(108);
  });

  it('should normalize GBP to USD correctly (1:1.27)', () => {
    const amount = 100;
    const result = CurrencyService.normalizeToUserBase(amount, 'GBP', 'USD');
    expect(result).toBe(127);
  });

  it('should normalize USD to EUR correctly (1/1.08)', () => {
    const amount = 108;
    const result = CurrencyService.normalizeToUserBase(amount, 'USD', 'EUR');
    expect(result).toBeCloseTo(100);
  });

  it('should normalize EUR to GBP correctly', () => {
    // 100 EUR = 108 USD.
    // 108 USD to GBP = 108 / 1.27 = 85.039...
    const amount = 100;
    const result = CurrencyService.normalizeToUserBase(amount, 'EUR', 'GBP');
    expect(result).toBeCloseTo(100 * 1.08 / 1.27);
  });

  it('should handle unknown currencies by falling back to 1.0 rate (USD)', () => {
    const amount = 100;
    const result = CurrencyService.normalizeToUserBase(amount, 'UNKNOWN', 'USD');
    expect(result).toBe(100);
  });

  it('should handle unknown user base currency by falling back to 1.0 rate (USD)', () => {
    const amount = 100;
    const result = CurrencyService.normalizeToUserBase(amount, 'USD', 'UNKNOWN');
    expect(result).toBe(100);
  });
});
