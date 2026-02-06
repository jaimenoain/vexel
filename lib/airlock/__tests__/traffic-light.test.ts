import { gradeAirlockItem, updateTrafficLightStatus } from '../traffic-light';
import { supabaseAdmin } from '../../supabase-admin';

// Mock supabaseAdmin
jest.mock('../../supabase-admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

describe('Traffic Light Service', () => {
  describe('gradeAirlockItem - Verification Checklist', () => {

    // 1. Test Case: Unbalanced Transaction
    // Mock a payload where Debits = 100 and Credits = 90. Assert result is RED.
    it('should return RED for Unbalanced Transaction (Debits=100, Credits=90)', () => {
      const payload = {
        transactions: [
          { amount: 100, date: '2023-01-01', currency: 'USD', description: 'Debit', confidence: 0.99 },
          { amount: -90, date: '2023-01-01', currency: 'USD', description: 'Credit', confidence: 0.99 }
        ]
      };
      // Net sum = 10 -> RED
      expect(gradeAirlockItem(payload, 0.99)).toBe('RED');
    });

    // 2. Test Case: Missing Date
    // Mock a payload with valid amounts but date: null. Assert result is RED.
    it('should return RED for Missing Date (date: null)', () => {
      const payload = {
        transactions: [
          { amount: 100, date: null as any, currency: 'USD', description: 'Debit', confidence: 0.99 },
          { amount: -100, date: '2023-01-01', currency: 'USD', description: 'Credit', confidence: 0.99 }
        ]
      };
      expect(gradeAirlockItem(payload, 0.99)).toBe('RED');
    });

    // 3. Test Case: Low Confidence
    // Mock a perfect transaction but with confidence_score: 0.85. Assert result is YELLOW.
    it('should return YELLOW for Low Confidence (score: 0.85)', () => {
      const payload = {
        transactions: [
          { amount: 100, date: '2023-01-01', currency: 'USD', description: 'Debit', confidence: 0.99 },
          { amount: -100, date: '2023-01-01', currency: 'USD', description: 'Credit', confidence: 0.99 }
        ]
      };
      // Passed confidence_score is 0.85
      expect(gradeAirlockItem(payload, 0.85)).toBe('YELLOW');
    });

    // 4. Test Case: The Happy Path
    // Mock a balanced transaction (Debits = 100, Credits = 100) with confidence_score: 0.99. Assert result is GREEN.
    it('should return GREEN for The Happy Path (Balanced, High Confidence)', () => {
      const payload = {
        transactions: [
          { amount: 100, date: '2023-01-01', currency: 'USD', description: 'Debit', confidence: 0.99 },
          { amount: -100, date: '2023-01-01', currency: 'USD', description: 'Credit', confidence: 0.99 }
        ]
      };
      expect(gradeAirlockItem(payload, 0.99)).toBe('GREEN');
    });

    // 5. Test Case: Edge Case
    // Mock a transaction with floating point math (e.g., 0.1 + 0.2) to ensure the epsilon check works and doesn't flag false REDs.
    it('should return GREEN for Floating Point Edge Case (0.1 + 0.2 - 0.3)', () => {
      // 0.1 + 0.2 is typically 0.30000000000000004
      // So 0.1 + 0.2 - 0.3 is 0.00000000000000004
      // This is < 0.01, so it should be GREEN.
      const payload = {
        transactions: [
          { amount: 0.1, date: '2023-01-01', currency: 'USD', description: 'Part 1', confidence: 0.99 },
          { amount: 0.2, date: '2023-01-01', currency: 'USD', description: 'Part 2', confidence: 0.99 },
          { amount: -0.3, date: '2023-01-01', currency: 'USD', description: 'Total', confidence: 0.99 }
        ]
      };
      expect(gradeAirlockItem(payload, 0.99)).toBe('GREEN');
    });

  });

  describe('Additional Robustness Tests', () => {
    it('should return RED if payload is malformed', () => {
      expect(gradeAirlockItem({} as any, 0.95)).toBe('RED');
      expect(gradeAirlockItem(null as any, 0.95)).toBe('RED');
      expect(gradeAirlockItem({ transactions: 'not-an-array' } as any, 0.95)).toBe('RED');
    });

    it('should return RED if invalid date string is provided', () => {
        const payload = {
            transactions: [
              { amount: 100, date: 'invalid-date-string', currency: 'USD', description: 'Debit', confidence: 0.99 },
              { amount: -100, date: '2023-01-01', currency: 'USD', description: 'Credit', confidence: 0.99 }
            ]
          };
          expect(gradeAirlockItem(payload, 0.99)).toBe('RED');
    });

    it('should prioritize RED over YELLOW (Precedence Logic)', () => {
      const payload = {
        transactions: [
          { amount: 100, date: '2023-01-01', currency: 'USD', description: 'Debit', confidence: 0.8 },
          { amount: -90, date: '2023-01-01', currency: 'USD', description: 'Credit', confidence: 0.8 }
        ]
      };
      // Sum = 10 (RED condition), Confidence = 0.8 (YELLOW condition) -> RED wins
      expect(gradeAirlockItem(payload, 0.8)).toBe('RED');
    });
  });

  describe('updateTrafficLightStatus', () => {
    it('should update airlock_items with status and confidence', async () => {
        const mockEq = jest.fn().mockResolvedValue({ error: null });
        const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
        (supabaseAdmin.from as jest.Mock).mockReturnValue({ update: mockUpdate });

        await updateTrafficLightStatus('item-123', 'GREEN', 0.95);

        expect(supabaseAdmin.from).toHaveBeenCalledWith('airlock_items');
        expect(mockUpdate).toHaveBeenCalledWith({
            traffic_light: 'GREEN',
            confidence_score: 0.95
        });
        expect(mockEq).toHaveBeenCalledWith('id', 'item-123');
    });

    it('should throw error if update fails', async () => {
        const mockEq = jest.fn().mockResolvedValue({ error: { message: 'DB Error' } });
        const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
        (supabaseAdmin.from as jest.Mock).mockReturnValue({ update: mockUpdate });

        await expect(updateTrafficLightStatus('item-123', 'GREEN', 0.95))
            .rejects.toThrow('Failed to update traffic light status: DB Error');
    });
  });
});
