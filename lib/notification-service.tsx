import { Resend } from 'resend';
import { render } from '@react-email/render';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase-admin';
import { AirlockReady } from './emails/AirlockReady';
import { GovernanceAlert } from './emails/GovernanceAlert';
import { Profile } from './types';
import * as React from 'react'; // Requirement for JSX in render

type AirlockPayload = { filename: string; link: string };
type GovernancePayload = { count: number; link: string };

export class NotificationService {
  private resend: Resend;
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient = supabaseAdmin, resendClient?: Resend) {
    this.resend = resendClient || new Resend(process.env.RESEND_API_KEY);
    this.supabase = supabaseClient;
  }

  async sendNotification(
    userId: string,
    type: 'AIRLOCK_READY' | 'GOVERNANCE_ALERT',
    payload: AirlockPayload | GovernancePayload
  ): Promise<void> {
    try {
      // 1. Fetch user profile
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        console.error(`Failed to fetch profile for user ${userId}:`, error);
        return;
      }

      const userProfile = profile as Profile;
      const settings = userProfile.notification_settings;

      // 2. Check settings
      // Default to true if settings are missing (backwards compatibility or default value logic)
      const airlockEnabled = settings?.airlock_ready ?? true;
      const governanceEnabled = settings?.governance_alert ?? true;

      if (type === 'AIRLOCK_READY' && !airlockEnabled) {
        console.log(`Notification ${type} disabled for user ${userId}`);
        return;
      }
      if (type === 'GOVERNANCE_ALERT' && !governanceEnabled) {
        console.log(`Notification ${type} disabled for user ${userId}`);
        return;
      }

      // 3. Render template
      let emailHtml: string;
      let subject: string;

      if (type === 'AIRLOCK_READY') {
        const p = payload as AirlockPayload;
        emailHtml = await render(<AirlockReady filename={p.filename} link={p.link} />);
        subject = 'Document Ready for Review';
      } else if (type === 'GOVERNANCE_ALERT') {
        const p = payload as GovernancePayload;
        emailHtml = await render(<GovernanceAlert count={p.count} link={p.link} />);
        subject = 'Action Required: Overdue Items';
      } else {
        console.error(`Unknown notification type: ${type}`);
        return;
      }

      // 4. Send email
      // Ensure we don't send if RESEND_API_KEY is not set (fail silently or log)
      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is not set. Email would have been sent:', {
            to: userProfile.email,
            subject,
            type
        });
        return;
      }

      const { error: sendError } = await this.resend.emails.send({
        from: 'Vexel <onboarding@resend.dev>', // Default Resend sender for testing, should be configured
        to: userProfile.email,
        subject: subject,
        html: emailHtml,
      });

      if (sendError) {
        console.error(`Failed to send email to ${userProfile.email}:`, sendError);
      } else {
        console.log(`Notification ${type} sent to ${userProfile.email}`);
      }
    } catch (err) {
      console.error('Unexpected error in sendNotification:', err);
    }
  }
}
