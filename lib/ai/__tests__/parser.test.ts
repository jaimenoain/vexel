import { Readable } from 'stream';
import { ParserFactory } from '../factory';
import { MockParser } from '../mock-parser';
import { OpenAIParser } from '../openai-parser';

describe('AI Parser', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('ParserFactory', () => {
    it('should return MockParser by default', () => {
      delete process.env.AI_PROVIDER;
      const parser = ParserFactory.getParser();
      expect(parser).toBeInstanceOf(MockParser);
    });

    it('should return MockParser when AI_PROVIDER is MOCK', () => {
      process.env.AI_PROVIDER = 'MOCK';
      const parser = ParserFactory.getParser();
      expect(parser).toBeInstanceOf(MockParser);
    });

    it('should return OpenAIParser when AI_PROVIDER is OPENAI', () => {
      process.env.AI_PROVIDER = 'OPENAI';
      const parser = ParserFactory.getParser();
      expect(parser).toBeInstanceOf(OpenAIParser);
    });
  });

  describe('MockParser', () => {
    it('should return static data', async () => {
      const parser = new MockParser();
      const stream = Readable.from(['fake pdf content']);
      const result = await parser.parse(stream, 'application/pdf');

      expect(result).toHaveLength(2);
      expect(result[0].counterparty).toBe('Starbucks');
      expect(result[0].amount).toBe(5.50);
      expect(result[1].counterparty).toBe('Landlord');
    });
  });

  describe('OpenAIParser', () => {
      it('should return placeholder data', async () => {
          const parser = new OpenAIParser();
          const stream = Readable.from(['fake pdf content']);
          const result = await parser.parse(stream, 'application/pdf');

          expect(result).toHaveLength(1);
          expect(result[0].description).toContain('Placeholder');
      })
  })
});
