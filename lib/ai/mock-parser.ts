import { Readable } from 'stream';
import { IDocumentParser, ExtractedData } from './types';

export class MockParser implements IDocumentParser {
  async parse(fileStream: Readable, mimeType: string): Promise<ExtractedData[]> {
    // Determine the data based on simple logic or return static data
    // For the purpose of this mock, we return a fixed set of transactions

    return [
      {
        date: '2023-10-27T10:00:00Z',
        amount: 5.50,
        currency: 'USD',
        description: 'Morning Coffee',
        counterparty: 'Starbucks',
        confidence: 0.99
      },
      {
        date: '2023-10-01T00:00:00Z',
        amount: 1200.00,
        currency: 'USD',
        description: 'Monthly Rent',
        counterparty: 'Landlord',
        confidence: 0.98
      }
    ];
  }
}
