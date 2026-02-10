import { TrafficLight } from '../types';
import { ExtractedData } from '../ai/types';

export interface GradingResult {
  status: TrafficLight;
  confidence?: number | 'LOW';
  message?: string;
}

export function gradeAirlockItem(
  payload: { transactions: ExtractedData[] },
  confidenceScore: number,
  assetId?: string | null
): GradingResult {
  try {
    // New Rule: Unknown Asset
    // If the asset_id is missing, the status is RED (CRITICAL).
    if (!assetId) {
      return {
        status: 'RED',
        confidence: 'LOW',
        message: 'Unknown Asset. Please assign manually.'
      };
    }

    if (!payload || !Array.isArray(payload.transactions)) {
      console.error('TrafficLight: Malformed payload');
      return { status: 'RED' };
    }

    const transactions = payload.transactions;

    // Rule 1: Integrity (Sum approx 0)
    // Calculate the sum of all Debits and Credits. If they do not match (Net != 0), the status is RED.
    let sum = 0;
    for (const tx of transactions) {
      if (typeof tx.amount !== 'number') {
        console.error('TrafficLight: Invalid amount type');
        return { status: 'RED' };
      }
      sum += tx.amount;
    }

    // Allow for floating point epsilon variance (< 0.01)
    if (Math.abs(sum) >= 0.01) {
      return { status: 'RED' };
    }

    // Rule 2: Data Validity
    // If the Transaction Date is missing, null, or invalid, the status is RED.
    for (const tx of transactions) {
      if (!tx.date) return { status: 'RED' };

      let isValidDate = false;
      if (tx.date instanceof Date) {
        isValidDate = !isNaN(tx.date.getTime());
      } else if (typeof tx.date === 'string') {
        isValidDate = !isNaN(Date.parse(tx.date));
      }

      if (!isValidDate) return { status: 'RED' };
    }

    // Rule 3: Low Confidence
    // If the AI provided confidence_score is less than 0.90, the status is YELLOW.
    if (confidenceScore < 0.90) {
      return { status: 'YELLOW' };
    }

    // Rule 4: Verified
    // If all math checks pass, dates are valid, and confidence is >= 0.90, the status is GREEN.
    return { status: 'GREEN' };

  } catch (error) {
    console.error('TrafficLight: Unexpected error', error);
    return { status: 'RED' };
  }
}
