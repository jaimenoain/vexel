import { NotificationService } from '../lib/notification-service';

// Mock Supabase Client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSupabase: any = {
  from: (_table: string) => ({
    select: (_columns: string) => ({
      eq: (_column: string, value: string) => ({
        single: async () => {
          if (value === 'user_1') {
            return {
              data: {
                id: 'user_1',
                email: 'test@example.com',
                notification_settings: {
                  airlock_ready: true,
                  governance_alert: false,
                },
              },
              error: null,
            };
          }
          return { data: null, error: 'User not found' };
        },
      }),
    }),
  }),
};

// Mock Resend Client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockResend: any = {
  emails: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send: async (payload: any) => {
      console.log('Mock Resend send called with:', payload);
      return { id: 'mock_email_id', error: null };
    },
  },
};

async function runVerification() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new NotificationService(mockSupabase as any, mockResend);

  console.log('--- Test Case 1: AIRLOCK_READY (Enabled) ---');
  await service.sendNotification('user_1', 'AIRLOCK_READY', { filename: 'test_doc.pdf' });

  console.log('\n--- Test Case 2: GOVERNANCE_ALERT (Disabled) ---');
  await service.sendNotification('user_1', 'GOVERNANCE_ALERT', { count: 5 });
}

runVerification().catch(console.error);
