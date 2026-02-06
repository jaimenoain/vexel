import { processDocumentHandler } from '../functions';
import { supabaseAdmin } from '../../supabase-admin';
import { ParserFactory } from '../../ai/factory';

// Mock dependencies
jest.mock('../../supabase-admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

jest.mock('../../ai/factory', () => ({
  ParserFactory: {
    getParser: jest.fn(),
  },
}));

describe('processDocumentHandler', () => {
  const mockStep = {
    run: jest.fn(async (name, callback) => callback()),
  };

  const mockEvent = {
    data: {
      file_path: 'test-asset/file.pdf',
      asset_id: 'asset-123',
      user_id: 'user-123',
      airlock_item_id: 'item-123',
    },
  };

  const mockParser = {
    parse: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ParserFactory.getParser as jest.Mock).mockReturnValue(mockParser);
  });

  it('should successfully process a document and update status', async () => {
    // Setup Supabase mocks
    const mockEqUpdate = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqUpdate });

    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'item-123' }, error: null }),
        }),
      }),
    });

    (supabaseAdmin.from as jest.Mock).mockImplementation((table) => {
      if (table === 'airlock_items') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return {};
    });

    // Setup Storage mock
    const mockDownload = jest.fn().mockResolvedValue({
      data: {
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('fake content')),
      },
      error: null,
    });

    (supabaseAdmin.storage.from as jest.Mock).mockReturnValue({
      download: mockDownload,
    });

    // Setup Parser mock
    const expectedExtraction = [
      {
        date: '2023-01-01',
        amount: 100,
        currency: 'USD',
        description: 'Test Transaction',
        confidence: 0.9,
      },
    ];
    mockParser.parse.mockResolvedValue(expectedExtraction);

    // Execute
    const result = await processDocumentHandler({ event: mockEvent as any, step: mockStep as any });

    // Verify
    expect(result.success).toBe(true);
    expect(result.itemId).toBe('item-123');

    // Check status updates
    // We need to check what was passed to update().
    // Since mockUpdate returns an object with eq(), we check mockUpdate.calls

    // First update: PROCESSING
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'PROCESSING' });

    // Second update: REVIEW_NEEDED with payload
    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'REVIEW_NEEDED',
      ai_payload: { transactions: expectedExtraction },
    });

    // Check that we targeted the correct ID
    expect(mockEqUpdate).toHaveBeenCalledWith('id', 'item-123');

    // Check storage download
    expect(supabaseAdmin.storage.from).toHaveBeenCalledWith('raw-documents');
    expect(mockDownload).toHaveBeenCalledWith('test-asset/file.pdf');

    // Check parser
    expect(ParserFactory.getParser).toHaveBeenCalled();
    expect(mockParser.parse).toHaveBeenCalled();
  });

  it('should handle file not found error and update status to ERROR', async () => {
    // Setup Supabase mocks
    const mockEqUpdate = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqUpdate });

    (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'item-123' }, error: null }),
                })
            })
        }),
        update: mockUpdate,
    });

    // Setup Storage mock to fail
    const mockDownload = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Object not found' },
    });

    (supabaseAdmin.storage.from as jest.Mock).mockReturnValue({
      download: mockDownload,
    });

    // Execute
    await processDocumentHandler({ event: mockEvent as any, step: mockStep as any });

    // Verify
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'PROCESSING' });

    // Check error update
    const updateCalls = mockUpdate.mock.calls;
    const errorCall = updateCalls.find(call => call[0].status === 'ERROR');

    expect(errorCall).toBeDefined();
    expect(errorCall[0]).toEqual({
      status: 'ERROR',
      ai_payload: { error: expect.stringContaining('Download failed: Object not found') },
    });

    // Ensure we updated the correct item
    expect(mockEqUpdate).toHaveBeenCalledWith('id', 'item-123');
  });
});
