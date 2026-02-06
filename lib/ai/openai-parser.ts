import { Readable } from 'stream';
import { IDocumentParser, ExtractedData } from './types';

export class OpenAIParser implements IDocumentParser {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAIParser initialized without OPENAI_API_KEY');
    }
  }

  async parse(fileStream: Readable, mimeType: string): Promise<ExtractedData[]> {
    console.log(`[OpenAIParser] Processing file with mimeType: ${mimeType}`);

    // STUB: Convert stream to buffer or send to OpenAI API
    // const fileBuffer = await this.streamToBuffer(fileStream);

    // STUB: Call OpenAI API
    // const response = await openai.chat.completions.create({ ... });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Return placeholder data to indicate this parser was used
    return [
      {
        date: new Date().toISOString(),
        amount: 0,
        currency: 'USD',
        description: 'Placeholder OpenAI Extraction',
        confidence: 0.0
      }
    ];
  }

  // private async streamToBuffer(stream: Readable): Promise<Buffer> {
  //   const chunks = [];
  //   for await (const chunk of stream) {
  //     chunks.push(chunk);
  //   }
  //   return Buffer.concat(chunks);
  // }
}
