import { updateItemStatus, processDocumentHandler, checkOverdueGovernanceHandler } from '../functions';
import { supabaseAdmin } from '../../supabase-admin';
import { ParserFactory } from '../../ai/factory';
import { gradeAirlockItem } from '../../airlock/traffic-light';
import { NotificationService } from '../../notification-service';

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
        chain.gt = jest.fn().mockReturnValue(chain);
        chain.in = jest.fn().mockReturnValue(chain);
        chain.rpc = jest.fn().mockReturnValue({ error: null });
        return chain;
    };

    const mockInstance = createChain();

    return {
        supabaseAdmin: {
            from: jest.fn(() => mockInstance),
            storage: {
                from: jest.fn(() => mockInstance)
            },
            rpc: jest.fn(() => ({ error: null }))
        }
    };
});

jest.mock('../../ai/factory', () => ({
    ParserFactory: {
        getParser: jest.fn()
    }
}));

jest.mock('../../airlock/traffic-light', () => ({
    gradeAirlockItem: jest.fn()
}));

const mockSendNotification = jest.fn();
jest.mock('../../notification-service', () => {
    return {
        NotificationService: jest.fn().mockImplementation(() => ({
            sendNotification: mockSendNotification
        }))
    };
});

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
        // Default behavior for gt/in is to return chain (builder pattern) unless overridden
        mockChain.gt.mockReturnValue(mockChain);
        mockChain.in.mockReturnValue(mockChain);

        // Mock Parser
        (ParserFactory.getParser as jest.Mock).mockReturnValue({
            parse: jest.fn().mockResolvedValue([{ some: 'data', confidence: 0.8 }])
        });

        // Mock Traffic Light
        (gradeAirlockItem as jest.Mock).mockReturnValue({ status: 'YELLOW' });
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
                ai_payload: { transactions: [{ some: 'data', confidence: 0.8 }] },
                confidence_score: 0.8,
                traffic_light: 'YELLOW'
            });

            expect(gradeAirlockItem).toHaveBeenCalledWith(
                { transactions: [{ some: 'data', confidence: 0.8 }] },
                0.8,
                'asset-1'
            );
        });

        it('should send notification on success', async () => {
             await processDocumentHandler({ event: mockEvent, step: mockStep } as any);
             expect(mockSendNotification).toHaveBeenCalledWith(
                 'user-1',
                 'AIRLOCK_READY',
                 {
                     filename: 'test.pdf',
                     link: 'http://localhost:3000/airlock?asset_id=asset-1'
                 }
             );
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

    describe('checkOverdueGovernanceHandler', () => {
        const mockStep = {
            run: jest.fn(async (name, fn) => fn())
        };

        it('should process overdue ghosts and send notifications for new tasks', async () => {
            // Mock RPC success
            (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({ error: null });

            // Mock fetch newly created tasks.
            mockChain.gt.mockResolvedValue({
                data: [
                    { id: 'task-1', asset_id: 'asset-A' },
                    { id: 'task-2', asset_id: 'asset-A' },
                    { id: 'task-3', asset_id: 'asset-B' }
                ],
                error: null
            });

            // Mock fetch access grants.
            mockChain.in
              .mockReturnValueOnce(mockChain) // First .in call returns the chain
              .mockResolvedValueOnce({        // Second .in call returns the data promise
                data: [
                    { user_id: 'user-1', asset_id: 'asset-A' }, // Owner of A
                    { user_id: 'user-2', asset_id: 'asset-A' }, // Editor of A
                    { user_id: 'user-1', asset_id: 'asset-B' }  // Owner of B
                ],
                error: null
            });

            await checkOverdueGovernanceHandler({ step: mockStep });

            // 1. RPC called
            expect(supabaseAdmin.rpc).toHaveBeenCalledWith('process_overdue_ghosts');

            // 2. Notifications sent
            // User 1 has 2 tasks from A and 1 from B = 3 tasks
            expect(mockSendNotification).toHaveBeenCalledWith(
                'user-1',
                'GOVERNANCE_ALERT',
                { count: 3, link: 'http://localhost:3000/dashboard' }
            );

            // User 2 has 2 tasks from A = 2 tasks
            expect(mockSendNotification).toHaveBeenCalledWith(
                'user-2',
                'GOVERNANCE_ALERT',
                { count: 2, link: 'http://localhost:3000/dashboard' }
            );
        });

        it('should do nothing if no new tasks found', async () => {
            // Mock RPC success
            (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({ error: null });

            // Mock fetch newly created tasks -> empty
            mockChain.gt.mockResolvedValue({ data: [], error: null });

            const result = await checkOverdueGovernanceHandler({ step: mockStep });

            expect(result).toEqual({ message: "No new tasks found." });
            expect(mockSendNotification).not.toHaveBeenCalled();
        });
    });
});
