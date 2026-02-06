import { Readable } from 'stream';
import { ParserFactory } from '../factory';
import { MockParser } from '../mock-parser';
import { OpenAIParser } from '../openai-parser';
import { ExtractedData } from '../types';

describe('Document Parser Adapter Pattern QA', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const createDummyStream = () => Readable.from(['dummy content']);

  describe('1. Interface Compliance & Type Safety', () => {
    // Helper to verify ExtractedData structure at runtime
    const verifyExtractedDataStructure = (data: any) => {
      expect(data).toHaveProperty('date');
      expect(data).toHaveProperty('amount');
      expect(typeof data.amount).toBe('number');
      expect(data).toHaveProperty('currency');
      expect(typeof data.currency).toBe('string');
      expect(data).toHaveProperty('description');
      expect(typeof data.description).toBe('string');
      expect(data).toHaveProperty('confidence');
      expect(typeof data.confidence).toBe('number');

      // Counterparty is optional, but if present, must be string
      if (data.counterparty !== undefined) {
          expect(typeof data.counterparty).toBe('string');
      }
    };

    it('MockParser should adhere to IDocumentParser interface and return valid ExtractedData', async () => {
      const parser = new MockParser();
      const result = await parser.parse(createDummyStream(), 'application/pdf');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(verifyExtractedDataStructure);
    });

    it('OpenAIParser should adhere to IDocumentParser interface and return valid ExtractedData', async () => {
      const parser = new OpenAIParser();
      // Stubbing the internal calls is already handled by the skeleton implementation returning placeholder data
      const result = await parser.parse(createDummyStream(), 'application/pdf');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(verifyExtractedDataStructure);
    });
  });

  describe('2. Mock Data Integrity', () => {
    it('MockParser should return deterministic data for testing', async () => {
      const parser = new MockParser();
      const result = await parser.parse(createDummyStream(), 'image/png');

      // We expect specific data as defined in mock-parser.ts
      expect(result).toHaveLength(2);

      const item1 = result[0];
      expect(item1).toMatchObject({
        amount: 5.50,
        currency: 'USD',
        description: 'Morning Coffee',
        counterparty: 'Starbucks',
        confidence: 0.99
      });
      // Date verification can be tricky with string vs Date object, checking rough ISO match or value
      expect(new Date(item1.date as string | Date).toISOString()).toContain('2023-10-27');

      const item2 = result[1];
      expect(item2).toMatchObject({
        amount: 1200.00,
        currency: 'USD',
        description: 'Monthly Rent',
        counterparty: 'Landlord',
        confidence: 0.98
      });
    });
  });

  describe('3. Dependency Injection (ParserFactory)', () => {
    it('should inject MockParser when AI_PROVIDER is not set (default)', () => {
      delete process.env.AI_PROVIDER;
      const parser = ParserFactory.getParser();
      expect(parser).toBeInstanceOf(MockParser);
    });

    it('should inject MockParser when AI_PROVIDER is explicitly MOCK', () => {
      process.env.AI_PROVIDER = 'MOCK';
      const parser = ParserFactory.getParser();
      expect(parser).toBeInstanceOf(MockParser);
    });

    it('should inject OpenAIParser when AI_PROVIDER is OPENAI', () => {
      process.env.AI_PROVIDER = 'OPENAI';
      const parser = ParserFactory.getParser();
      expect(parser).toBeInstanceOf(OpenAIParser);
    });

    it('should fallback to MockParser for unknown providers', () => {
      process.env.AI_PROVIDER = 'UNKNOWN_PROVIDER';
      const parser = ParserFactory.getParser();
      expect(parser).toBeInstanceOf(MockParser);
    });
  });
});
