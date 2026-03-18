import { supabase } from '@/lib/supabase';
// src/app/satis/yeni/page.tsx
import AdvancedSalesClient from '@/components/AdvancedSalesClient'; // Süslü parantez kalktı

// Sayfanın her seferinde güncel veri çekmesini sağlar
export const revalidate = 0;

export default async function Page() {
  // Verileri paralel çekerek hızı artırıyoruz
  const [productsRes, contactsRes] = await Promise.all([
    supabase.from('products').select('*').eq('is_deleted', false).order('name'),
    supabase.from('contacts').select('*').eq('is_deleted', false).order('name')
  ]);

  return (
    <AdvancedSalesClient 
      products={productsRes.data || []} 
      contacts={contactsRes.data || []} 
    />
  );
}