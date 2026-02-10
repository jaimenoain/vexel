'use server';

import { createClient } from '@/lib/supabase/server';
import { createContact } from '@/lib/directory';
import { revalidatePath } from 'next/cache';

export async function createContactAction(prevState: any, formData: FormData) {
  const supabase = await createClient();

  const name = formData.get('name') as string;
  const role = formData.get('role') as string;
  const email = formData.get('email') as string;

  if (!name) {
    return { success: false, error: 'Name is required' };
  }

  try {
    const contact = await createContact(supabase, {
      name,
      role: role || null,
      email: email || null,
    });

    revalidatePath('/directory');
    return { success: true, contact };
  } catch (error: any) {
    console.error('Failed to create contact:', error);
    return { success: false, error: error.message || 'Failed to create contact' };
  }
}
