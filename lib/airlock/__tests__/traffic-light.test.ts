import { gradeAirlockItem, updateTrafficLightStatus } from '../traffic-light';
import { supabaseAdmin } from '../../supabase-admin';

// Mock supabaseAdmin
jest.mock('../../supabase-admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

describe('Traffic Light Service', () => {
  describe('gradeAirlockItem', () => {
    it('should return RED if sum is not zero (Rule 1)', () => {
      const payload = {
        transactions: [
          { amount: 100, date: '2023-01-01', currency: 'USD', description: 'test', confidence: 0.95 },
          { amount: -50, date: '2023-01-01', currency: 'USD', description: 'test', confidence: 0.95 }
        ]
      };
      // Sum = 50 -> RED
      expect(gradeAirlockItem(payload, 0.95)).toBe('RED');
    });

    it('should return RED if date is invalid (Rule 2)', () => {
      const payload = {
        transactions: [
          { amount: 100, date: 'invalid-date', currency: 'USD', description: 'test', confidence: 0.95 },
          { amount: -100, date: '2023-01-01', currency: 'USD', description: 'test', confidence: 0.95 }
        ]
      };
      // Sum = 0, but invalid date -> RED
      expect(gradeAirlockItem(payload, 0.95)).toBe('RED');
    });

    it('should return RED if date is missing (Rule 2)', () => {
        const payload = {
          transactions: [
            { amount: 100, currency: 'USD', description: 'test', confidence: 0.95 },
            { amount: -100, date: '2023-01-01', currency: 'USD', description: 'test', confidence: 0.95 }
          ]
        } as any;
        expect(gradeAirlockItem(payload, 0.95)).toBe('RED');
    });

    it('should return YELLOW if confidence is low (Rule 3)', () => {
      const payload = {
        transactions: [
          { amount: 100, date: '2023-01-01', currency: 'USD', description: 'test', confidence: 0.8 },
          { amount: -100, date: '2023-01-01', currency: 'USD', description: 'test', confidence: 0.8 }
        ]
      };
      // Sum = 0, Date valid, but Global Confidence passed is low
      expect(gradeAirlockItem(payload, 0.89)).toBe('YELLOW');
    });

    it('should return GREEN if all checks pass (Rule 4)', () => {
      const payload = {
        transactions: [
          { amount: 100, date: '2023-01-01', currency: 'USD', description: 'test', confidence: 0.99 },
          { amount: -100, date: '2023-01-01', currency: 'USD', description: 'test', confidence: 0.99 }
        ]
      };
      expect(gradeAirlockItem(payload, 0.95)).toBe('GREEN');
    });

    it('should return RED if payload is malformed', () => {
      expect(gradeAirlockItem({} as any, 0.95)).toBe('RED');
      expect(gradeAirlockItem(null as any, 0.95)).toBe('RED');
      expect(gradeAirlockItem({ transactions: 'not-an-array' } as any, 0.95)).toBe('RED');
    });

    it('should allow small floating point variance', () => {
         const payload = {
        transactions: [
          { amount: 10.004, date: '2023-01-01', currency: 'USD', description: 'test', confidence: 0.99 },
          { amount: -10.000, date: '2023-01-01', currency: 'USD', description: 'test', confidence: 0.99 }
        ]
      };
      // Sum = 0.004 < 0.01 -> Pass
      expect(gradeAirlockItem(payload, 0.95)).toBe('GREEN');
    });
     it('should reject large floating point variance', () => {
         const payload = {
        transactions: [
          { amount: 10.011, date: '2023-01-01', currency: 'USD', description: 'test', confidence: 0.99 },
          { amount: -10.000, date: '2023-01-01', currency: 'USD', description: 'test', confidence: 0.99 }
        ]
      };
      // Sum = 0.011 > 0.01 -> RED
      expect(gradeAirlockItem(payload, 0.95)).toBe('RED');
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
