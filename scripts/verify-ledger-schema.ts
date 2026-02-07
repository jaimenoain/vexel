import { supabaseAdmin } from '../lib/supabase-admin';

/**
 * Verification script for Ledger Schema (Task 4.1)
 * run with: npx jest scripts/verify-ledger-schema.ts
 */

describe('Ledger Schema Verification', () => {
  let entityId: string;
  let assetId: string;

  // Helper to ensure we have a clean slate
  const generateUniqueName = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  beforeAll(async () => {
    // 1. Create Entity
    const entityRes = await supabaseAdmin
      .from('entities')
      .insert({
        name: generateUniqueName('Verification Entity'),
        type: 'FAMILY',
      })
      .select()
      .single();

    if (entityRes.error) {
      throw new Error(`Failed to create entity: ${entityRes.error.message}`);
    }
    entityId = entityRes.data.id;

    // 2. Create Asset
    const assetRes = await supabaseAdmin
      .from('assets')
      .insert({
        name: generateUniqueName('Verification Asset'),
        type: 'BANK',
        currency: 'USD',
        entity_id: entityId,
      })
      .select()
      .single();

    if (assetRes.error) {
      throw new Error(`Failed to create asset: ${assetRes.error.message}`);
    }
    assetId = assetRes.data.id;
  });

  afterAll(async () => {
    // Cleanup
    if (assetId) {
      await supabaseAdmin.from('assets').delete().eq('id', assetId);
    }
    if (entityId) {
      await supabaseAdmin.from('entities').delete().eq('id', entityId);
    }
  });

  it('should REJECT an unbalanced transaction (Debit 100, Credit 50)', async () => {
    // Create Header
    const txnRes = await supabaseAdmin
      .from('ledger_transactions')
      .insert({
        description: 'Test Unbalanced',
        date: new Date().toISOString(),
      })
      .select()
      .single();

    if (txnRes.error) {
      throw new Error(`Failed to create transaction header: ${txnRes.error.message}`);
    }
    const txnId = txnRes.data.id;

    // Attempt Insert Lines (Unbalanced: Sum = 150)
    const linesRes = await supabaseAdmin
      .from('ledger_lines')
      .insert([
        {
          transaction_id: txnId,
          asset_id: assetId,
          amount: 100,
          type: 'DEBIT',
        },
        {
          transaction_id: txnId,
          asset_id: assetId,
          amount: 50,
          type: 'CREDIT',
        },
      ]);

    // Cleanup Header (if lines failed, header still exists)
    await supabaseAdmin.from('ledger_transactions').delete().eq('id', txnId);

    // Assert Failure
    expect(linesRes.error).not.toBeNull();
    // The error message might vary, but should contain the custom exception text
    // "Ledger transaction ... is not balanced."
    expect(linesRes.error?.message).toMatch(/not balanced/i);
  });

  it('should ACCEPT a balanced transaction (Debit 100, Credit -100)', async () => {
    // Create Header
    const txnRes = await supabaseAdmin
      .from('ledger_transactions')
      .insert({
        description: 'Test Balanced',
        date: new Date().toISOString(),
      })
      .select()
      .single();

    if (txnRes.error) {
      throw new Error(`Failed to create transaction header: ${txnRes.error.message}`);
    }
    const txnId = txnRes.data.id;

    // Attempt Insert Lines (Balanced: Sum = 0)
    const linesRes = await supabaseAdmin
      .from('ledger_lines')
      .insert([
        {
          transaction_id: txnId,
          asset_id: assetId,
          amount: 100,
          type: 'DEBIT',
        },
        {
          transaction_id: txnId,
          asset_id: assetId,
          amount: -100,
          type: 'CREDIT',
        },
      ]);

    // Cleanup
    await supabaseAdmin.from('ledger_transactions').delete().eq('id', txnId);

    // Assert Success
    if (linesRes.error) {
        console.error('Balanced transaction failed:', linesRes.error);
    }
    expect(linesRes.error).toBeNull();
  });
});
