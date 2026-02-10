'use client';

import React, { useEffect, useState } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { Button } from '@/src/components/common/Button';
import { Plus } from 'lucide-react';
import { AddContactModal } from '@/src/components/directory/AddContactModal';
import { createClient } from '@/lib/supabase/client';
import { Contact } from '@/lib/types';
import { useAuth } from '@/app/context/AuthContext';

export default function DirectoryPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function fetchContacts() {
      if (!session) return;
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .order('name');

        if (error) {
          console.error('Error fetching contacts:', error);
        } else {
          setContacts(data as Contact[]);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();
  }, [session, supabase]);

  const handleContactCreated = (newContact: Contact) => {
    setContacts((prev) => [...prev, newContact].sort((a, b) => a.name.localeCompare(b.name)));
  };

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-[#111111]">Directory</h1>
          <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="h-4 w-4" />}>
            Add Contact
          </Button>
        </div>

        {loading ? (
            <div className="text-zinc-500">Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-zinc-500 border-t border-[#E5E5E5]">
            <p>No contacts found.</p>
          </div>
        ) : (
          <div className="border border-[#E5E5E5] bg-white rounded-lg overflow-hidden">
             <table className="min-w-full divide-y divide-zinc-200">
               <thead className="bg-zinc-50">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Role</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-zinc-200">
                 {contacts.map((contact) => (
                   <tr key={contact.id}>
                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900">{contact.name}</td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{contact.role || '-'}</td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{contact.email || '-'}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}

        <AddContactModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onContactCreated={handleContactCreated}
        />
      </div>
    </Shell>
  );
}
