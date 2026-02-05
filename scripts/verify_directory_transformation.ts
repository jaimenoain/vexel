import { buildDirectoryTree } from '../lib/directory';
import assert from 'assert';

console.log('Running directory transformation verification...');

// Mock Data representing Supabase response
const mockData = [
  {
    id: 'entity-1',
    name: 'My Family',
    type: 'FAMILY',
    assets: [
      {
        id: 'asset-1',
        name: 'Chase Bank',
        type: 'BANK',
        currency: 'USD',
        entity_id: 'entity-1',
      },
      {
        id: 'asset-2',
        name: 'Beach House',
        type: 'PROPERTY',
        currency: 'USD',
        entity_id: 'entity-1',
      }
    ]
  },
  {
    id: 'entity-2',
    name: 'My Company',
    type: 'COMPANY',
    assets: [] // No assets visible or empty
  }
];

// Expected Output
const expectedOutput = [
  {
    id: 'entity-1',
    name: 'My Family',
    type: 'FAMILY',
    assets: [
      {
        id: 'asset-1',
        name: 'Chase Bank',
        type: 'BANK',
        currency: 'USD',
        net_worth: 0
      },
      {
        id: 'asset-2',
        name: 'Beach House',
        type: 'PROPERTY',
        currency: 'USD',
        net_worth: 0
      }
    ]
  },
  {
    id: 'entity-2',
    name: 'My Company',
    type: 'COMPANY',
    assets: []
  }
];

try {
  const result = buildDirectoryTree(mockData);

  // Verify structure deep equality
  assert.deepStrictEqual(result, expectedOutput, 'Transformation output does not match expected output');

  console.log('✅ Transformation logic verified successfully.');
} catch (error) {
  console.error('❌ Verification failed:', error);
  process.exit(1);
}
