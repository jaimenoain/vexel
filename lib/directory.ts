import { SupabaseClient } from '@supabase/supabase-js';
import { Entity, Asset, EntityType, AssetType, Contact } from './types';

export function buildDirectoryTree(data: any[]): Entity[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item: any) => {
    // Ensure nested assets array exists
    const rawAssets = Array.isArray(item.assets) ? item.assets : [];

    const assets: Asset[] = rawAssets.map((asset: any) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type as AssetType,
      currency: asset.currency,
      net_worth: 0, // Injected placeholder as per requirement
    }));

    const entity: Entity = {
      id: item.id,
      name: item.name,
      type: item.type as EntityType,
      assets: assets,
    };

    return entity;
  });
}

export async function getContacts(supabase: SupabaseClient): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }

  return data as Contact[];
}

export async function createContact(
  supabase: SupabaseClient,
  contact: Pick<Contact, 'name' | 'role' | 'email'>
): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .insert(contact)
    .select()
    .single();

  if (error) {
    console.error('Error creating contact:', error);
    throw error;
  }

  return data as Contact;
}
