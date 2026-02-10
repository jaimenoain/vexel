'use server';

import { createClient } from '@/lib/supabase/server';
import { createManualTransaction } from '@/lib/ledger/service';
import { revalidatePath } from 'next/cache';

export async function addTransaction(prevState: any, formData: FormData) {
  const supabase = await createClient();

  const description = formData.get('description') as string;
  const date = formData.get('date') as string;
  const amountStr = formData.get('amount') as string;
  const sourceAssetId = formData.get('sourceAssetId') as string;
  const destAssetId = formData.get('destAssetId') as string;

  // Validation
  if (!description || !date || !amountStr || !sourceAssetId || !destAssetId) {
    return { success: false, error: 'All fields are required' };
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: 'Amount must be greater than 0' };
  }

  if (sourceAssetId === destAssetId) {
    return { success: false, error: 'Source and Destination assets must be different' };
  }

  try {
    await createManualTransaction(supabase, {
      description,
      date,
      lines: [
        // Destination (Debit) - Increases Asset/Expense
        {
          assetId: destAssetId,
          amount: amount,
          type: 'DEBIT'
        },
        // Source (Credit) - Decreases Asset
        {
          assetId: sourceAssetId,
          amount: -amount,
          type: 'CREDIT'
        }
      ]
    });

    revalidatePath('/ledger');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create transaction:', error);
    return { success: false, error: error.message || 'Failed to create transaction' };
  }
}
