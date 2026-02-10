
import {
  processDocumentHandler,
  checkOverdueGovernanceHandler,
} from '../../lib/inngest/functions';
import { NotificationService } from '../../lib/notification-service';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { Resend } from 'resend';

// Mock dependencies
jest.mock('resend');

jest.mock('../../lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    rpc: jest.fn(),
    storage: {
      from: jest.fn().mockReturnValue({
        download: jest.fn(),
      }),
    },
  },
}));

jest.mock('../../lib/ai/factory', () => ({
  ParserFactory: {
    getParser: jest.fn().mockReturnValue({
      parse: jest.fn().mockResolvedValue([{ confidence: 0.9, data: {} }]),
    }),
  },
}));

jest.mock('../../lib/airlock/traffic-light', () => ({
  gradeAirlockItem: jest.fn().mockReturnValue({ status: 'GREEN' }),
}));

jest.mock('@react-email/render', () => ({
  render: jest.fn().mockResolvedValue('<html>Mock Email</html>'),
}));

describe('Notification System Integration', () => {
  let mockSupabase: any;
  const originalEnv = process.env;
  let mockSend: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, RESEND_API_KEY: 're_123' };
    mockSupabase = supabaseAdmin;
    // Ensure default mock implementation for storage
    mockSupabase.storage.from.mockReturnValue({
      download: jest.fn(),
    });

    // Setup Resend mock
    mockSend = jest.fn().mockResolvedValue({ error: null });
    (Resend as unknown as jest.Mock).mockImplementation(() => {
      return {
        emails: {
          send: mockSend,
        },
      };
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // Helper to mock step execution
  const mockStep = {
    run: async (name: string, fn: () => Promise<any>) => await fn(),
  };

  describe('NotificationService Preferences', () => {
    it('sends email when preference is true (default)', async () => {
      const mockProfile = { email: 'user1@test.com', notification_settings: { airlock_ready: true } };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      const service = new NotificationService(mockSupabase);
      await service.sendNotification('user-1', 'AIRLOCK_READY', { filename: 'test.pdf', link: 'http://link' });

      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
          to: 'user1@test.com',
          subject: 'Document Ready for Review'
      }));
    });

    it('does NOT send email when preference is false', async () => {
      const mockProfile = { email: 'user1@test.com', notification_settings: { airlock_ready: false } };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      const service = new NotificationService(mockSupabase);
      await service.sendNotification('user-1', 'AIRLOCK_READY', { filename: 'test.pdf', link: 'http://link' });

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('Trigger A: PDF Processing', () => {
    it('sends notification after processing', async () => {
      // Mock storage download
      const mockBuffer = Buffer.from('test data');
      mockSupabase.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: {
            arrayBuffer: jest.fn().mockResolvedValue(mockBuffer.buffer),
          },
          error: null,
        }),
      });

      // Mock database calls
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'airlock_items') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'item-1' }, error: null }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'profiles') {
           return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { email: 'user1@test.com', notification_settings: { airlock_ready: true } }, error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      const event = {
        data: {
          file_path: 'test.pdf',
          asset_id: 'asset-1',
          user_id: 'user-1',
        },
      };

      await processDocumentHandler({ event, step: mockStep });

      // Check if sendNotification was called (which calls resend.emails.send)
      // Since we reset mockSend in beforeEach, we just check mockSend
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: 'user1@test.com',
        subject: 'Document Ready for Review',
      }));
    });
  });

  describe('Trigger B: Overdue Monitor (Batching)', () => {
    it('batches notifications for a single user', async () => {
       // 1. process_overdue_ghosts
       mockSupabase.rpc.mockResolvedValue({ error: null });

       const newTasks = [
         { id: 'task-1', asset_id: 'asset-1' },
         { id: 'task-2', asset_id: 'asset-1' },
         { id: 'task-3', asset_id: 'asset-2' },
       ];

       const grants = [
           { user_id: 'user-A', asset_id: 'asset-1' },
           { user_id: 'user-A', asset_id: 'asset-2' },
           { user_id: 'user-B', asset_id: 'asset-1' },
       ];

       mockSupabase.from.mockImplementation((table: string) => {
           if (table === 'governance_tasks') {
               return {
                   select: jest.fn().mockReturnValue({
                       gt: jest.fn().mockResolvedValue({ data: newTasks, error: null })
                   })
               };
           }
           if (table === 'access_grants') {
               return {
                   select: jest.fn().mockReturnValue({
                       in: jest.fn().mockReturnValue({
                           in: jest.fn().mockResolvedValue({ data: grants, error: null })
                       })
                   })
               };
           }
           if (table === 'profiles') {
               return {
                   select: jest.fn().mockReturnValue({
                       eq: jest.fn().mockImplementation((field, value) => {
                           const email = (value === 'user-A' || value === 'userA') ? 'userA@example.com' : 'userB@example.com';
                           return {
                               single: jest.fn().mockResolvedValue({
                                   data: { email, notification_settings: { governance_alert: true } },
                                   error: null
                               })
                           };
                       })
                   })
               };
           }
           return { select: jest.fn() };
       });

       await checkOverdueGovernanceHandler({ step: mockStep });

       // We should see 2 calls total
       expect(mockSend).toHaveBeenCalledTimes(2);

       // Check specific calls
       const calls = mockSend.mock.calls;
       const callA = calls.find((c: any) => c[0].to === 'userA@example.com');
       const callB = calls.find((c: any) => c[0].to === 'userB@example.com');

       expect(callA).toBeDefined();
       expect(callB).toBeDefined();
    });
  });
});
