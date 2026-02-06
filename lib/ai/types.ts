import { Readable } from 'stream';

export interface ExtractedData {
  date: string | Date;
  amount: number;
  currency: string;
  description: string;
  counterparty?: string;
  confidence: number;
}

export interface IDocumentParser {
  parse(fileStream: Readable, mimeType: string): Promise<ExtractedData[]>;
}
