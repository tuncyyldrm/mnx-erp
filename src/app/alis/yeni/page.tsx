import { supabase } from '@/lib/supabase';
import AdvancedSalesClient from '@/components/AdvancedSalesClient';

export const revalidate = 0;

export default async function AlisPage() {
  // Verileri paralel çekiyoruz
  const [productsRes, contactsRes] = await Promise.all([
    supabase.from('products').select('*').eq('is_deleted', false).order('name'),
    supabase.from('contacts').select('*').eq('is_deleted', false).order('name')
  ]);

  return (
    <AdvancedSalesClient 
      products={productsRes.data || []} 
      contacts={contactsRes.data || []} 
      mode="purchase" // Kritik fark: Bu bir alış işlemidir
    />
  );
}