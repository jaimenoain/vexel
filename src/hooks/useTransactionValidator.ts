import { useMemo } from 'react';
import { gradeAirlockItem } from '@/lib/airlock/grading-logic';
import { TrafficLight } from '@/lib/types';
import { TransactionRow } from '@/src/components/airlock/TransactionEditor';
import { ExtractedData } from '@/lib/ai/types';

interface ValidationResult {
  status: TrafficLight;
  isValid: boolean;
  errors: string[];
}

export function useTransactionValidator(
  transactions: TransactionRow[],
  initialConfidence: number = 0,
  isEdited: boolean = false,
  assetId?: string | null
): ValidationResult {
  return useMemo(() => {
    // 1. Convert TransactionRow to ExtractedData
    const extractedData: ExtractedData[] = transactions.map(tx => ({
      ...tx,
      // Handle amount conversion
      amount: parseFloat(tx.amount.toString()) || 0,
      // Ensure date is string or Date
      date: tx.date || ''
    }));

    // 2. Determine confidence to use
    // If edited, we treat it as 1.0 (verified), otherwise use initial
    const effectiveConfidence = isEdited ? 1.0 : initialConfidence;

    // 3. Grade
    const gradingResult = gradeAirlockItem({ transactions: extractedData }, effectiveConfidence, assetId);
    const status = gradingResult.status;

    // 4. Generate errors based on status/data
    const errors: string[] = [];

    if (gradingResult.message && status === 'RED') {
      errors.push(gradingResult.message);
    }

    if (status === 'RED') {
        // Check balance
        const sum = extractedData.reduce((acc, tx) => acc + tx.amount, 0);
        if (Math.abs(sum) >= 0.01) {
            errors.push('Credits and Debits do not match.');
        }

        // Check dates
        const hasInvalidDate = extractedData.some(tx => {
            if (!tx.date) return true;
            const dateStr = tx.date instanceof Date ? tx.date.toISOString() : tx.date;
            return isNaN(Date.parse(dateStr));
        });
        if (hasInvalidDate) {
            errors.push('One or more transactions have missing or invalid dates.');
        }

        // Fallback generic error if RED but no specific error found
        if (errors.length === 0) {
             // Maybe malformed payload or something else caught by gradeAirlockItem
            errors.push('Validation failed.');
        }
    }

    return {
      status,
      isValid: status === 'GREEN',
      errors
    };

  }, [transactions, initialConfidence, isEdited, assetId]);
}
