import { updateItemStatus, processDocumentHandler } from '../functions';
import { supabaseAdmin } from '../../supabase-admin';
import { ParserFactory } from '../../ai/factory';

// Mock dependencies
jest.mock('../../supabase-admin', () => {
    // Helper to create a chainable mock
    const createChain = () => {
        const chain: any = {
            data: null,
            error: null
        };
        chain.update = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.select = jest.fn().mockReturnValue(chain);
        chain.single = jest.fn().mockReturnValue(chain);
        chain.maybeSingle = jest.fn();
        chain.download = jest.fn();
        chain.from = jest.fn().mockReturnValue(chain);
        chain.storage = {
            from: jest.fn().mockReturnValue(chain)
        };
        return chain;
    };

    const mockInstance = createChain();

    return {
        supabaseAdmin: {
            from: jest.fn(() => mockInstance),
            storage: {
                from: jest.fn(() => mockInstance)
            }
        }
    };
});

jest.mock('../../ai/factory', () => ({
    ParserFactory: {
        getParser: jest.fn()
    }
}));

describe('Airlock Inngest Functions', () => {
    let mockChain: any;

    beforeEach(() => {
        jest.clearAllMocks();
        // Access the mock chain
        mockChain = (supabaseAdmin.from as jest.Mock)();

        // Reset properties
        mockChain.error = null;
        mockChain.data = null;

        // Reset specific method behaviors
        mockChain.maybeSingle.mockResolvedValue({ data: { id: 'item-123' }, error: null });
        mockChain.download.mockResolvedValue({
            data: { arrayBuffer: async () => new ArrayBuffer(8) },
            error: null
        });

        // Mock Parser
        (ParserFactory.getParser as jest.Mock).mockReturnValue({
            parse: jest.fn().mockResolvedValue([{ some: 'data' }])
        });
    });

    describe('updateItemStatus', () => {
        it('should update status using supabaseAdmin', async () => {
            await updateItemStatus('item-123', 'PROCESSING');

            expect(supabaseAdmin.from).toHaveBeenCalledWith('airlock_items');
            expect(mockChain.update).toHaveBeenCalledWith({ status: 'PROCESSING' });
            expect(mockChain.eq).toHaveBeenCalledWith('id', 'item-123');
        });

        it('should include error message if provided', async () => {
            await updateItemStatus('item-123', 'ERROR', 'Something went wrong');

            expect(mockChain.update).toHaveBeenCalledWith({
                status: 'ERROR',
                ai_payload: { error: 'Something went wrong' }
            });
        });
    });

    describe('processDocumentHandler', () => {
        const mockStep = {
            run: jest.fn(async (name, fn) => fn()) // Execute step immediately
        };
        const mockEvent = {
            data: {
                file_path: 'test.pdf',
                asset_id: 'asset-1',
                user_id: 'user-1'
            }
        };

        it('should process successfully', async () => {
            await processDocumentHandler({ event: mockEvent, step: mockStep } as any);

            // 1. Resolve ID
            expect(mockChain.maybeSingle).toHaveBeenCalled();

            // 2. Update Processing
            expect(mockChain.update).toHaveBeenCalledWith({ status: 'PROCESSING' });

            // 3. Download
            expect(supabaseAdmin.storage.from).toHaveBeenCalledWith('raw-documents');
            expect(mockChain.download).toHaveBeenCalledWith('test.pdf');

            // 4. Parse
            expect(ParserFactory.getParser).toHaveBeenCalled();

            // 5. Save Results
            expect(mockChain.update).toHaveBeenCalledWith({
                status: 'REVIEW_NEEDED',
                ai_payload: { transactions: [{ some: 'data' }] }
            });
        });

        it('should use provided airlock_item_id if available', async () => {
            const eventWithId = {
                data: { ...mockEvent.data, airlock_item_id: 'provided-id' }
            };
            await processDocumentHandler({ event: eventWithId, step: mockStep } as any);

            expect(mockChain.maybeSingle).not.toHaveBeenCalled();
            expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'PROCESSING' }));
            expect(mockChain.eq).toHaveBeenCalledWith('id', 'provided-id');
        });

        it('should handle missing item', async () => {
            mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });

            await expect(processDocumentHandler({ event: mockEvent, step: mockStep } as any))
                .rejects.toThrow('No airlock_items found');
        });

        it('should handle download error', async () => {
            mockChain.download.mockResolvedValue({ data: null, error: { message: 'S3 Error' } });

            await processDocumentHandler({ event: mockEvent, step: mockStep } as any);

            // Should catch and update status to ERROR
            expect(mockChain.update).toHaveBeenCalledWith({
                status: 'ERROR',
                ai_payload: { error: expect.stringContaining('S3 Error') }
            });
        });
    });
});
