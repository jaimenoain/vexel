import { IDocumentParser } from './types';
import { MockParser } from './mock-parser';
import { OpenAIParser } from './openai-parser';

export class ParserFactory {
  static getParser(): IDocumentParser {
    const provider = process.env.AI_PROVIDER || 'MOCK';

    switch (provider.toUpperCase()) {
      case 'OPENAI':
        return new OpenAIParser();
      case 'MOCK':
      default:
        console.log(`Using MockParser (Provider: ${provider})`);
        return new MockParser();
    }
  }
}
