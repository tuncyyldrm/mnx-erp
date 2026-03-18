import { supabase } from '@/lib/supabase';
import { QuickSale } from '@/components/QuickSale';
import Link from 'next/link';

interface TransactionWithContact {
  id: string;
  type: 'sale' | 'purchase' | 'return_in' | 'return_out';
  total_amount: number;
  doc_no: string | null;
  created_at: string;
  contacts: {
    name: string;
  } | null;
}

export const metadata = {
  title: 'Dashboard | Memonex ERP',
};

// Bileşeni async olarak tanımlıyoruz
export default async function HomePage({ 
  searchParams 
}: { 
  // searchParams artık bir Promise'dir
  searchParams: Promise<{ msg?: string }> 
}) {
  
  // --- KRİTİK DÜZELTME: searchParams'ı bekliyoruz ---
  const sParams = await searchParams;
  
  // 1. Veri Çekme
  const [productsRes, contactsRes, transRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, sku, name, purchase_price, sell_price, stock_count, critical_limit, shelf_no')
      .eq('is_deleted', false),
    supabase
      .from('contacts')
      .select('id, name, balance')
      .eq('is_deleted', false),
    supabase
      .from('transactions')
      .select('*, contacts(name)')
      .order('created_at', { ascending: false })
      .limit(10)
  ]);

  const products = (productsRes.data || []).map(p => ({
    ...p,
    sell_price: p.sell_price || 0,
    purchase_price: p.purchase_price || 0
  }));

  const contacts = (contactsRes.data || []).map(c => ({
    ...c,
    balance: c.balance || 0
  }));

  const lastTransactions = (transRes.data as unknown as TransactionWithContact[]) || [];

  // 3. İstatistikler
  const totalStockValue = products.reduce((acc, p) => acc + (Number(p.purchase_price) * Number(p.stock_count)), 0);
  const criticalItems = products.filter(p => (Number(p.stock_count)) <= (Number(p.critical_limit || 5))).length;

  return (
    <main className="p-8 max-w-[1600px] mx-auto text-slate-900 font-sans min-h-screen bg-[#fafbfc]">
      
      {/* BİLDİRİM PANELİ - Artık sParams kullanıyoruz */}
      {sParams.msg === 'cancelled' && (
        <div className="mb-8 p-4 bg-red-50 border-2 border-red-100 rounded-[24px] flex items-center gap-4 animate-in fade-in zoom-in duration-300">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-200 font-black">!</div>
          <div>
            <p className="text-red-600 font-black text-xs uppercase tracking-widest">İşlem İptal Edildi</p>
            <p className="text-red-400 text-[10px] font-bold uppercase mt-0.5">Envanter ve cari bakiyeler düzeltildi.</p>
          </div>
        </div>
      )}

      {/* ... Geri kalan UI kodun (Dashboard Kartları vb.) aynı kalabilir ... */}
      
      {/* ÜST: Stratejik Kokpit */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white border-2 border-slate-100 p-6 rounded-[32px] shadow-sm hover:border-blue-200 transition-all group">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 group-hover:text-blue-600 transition-colors">Depo Değeri (Maliyet)</span>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black tracking-tighter italic text-slate-800">
              {totalStockValue.toLocaleString('tr-TR')}
            </p>
            <span className="text-blue-600 text-xs font-black mb-1.5 uppercase">TL</span>
          </div>
        </div>

        <Link href="/stok" className={`p-6 rounded-[32px] border-2 transition-all shadow-sm group ${criticalItems > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100 hover:border-red-200'}`}>
          <span className={`${criticalItems > 0 ? 'text-red-500' : 'text-slate-400'} text-[10px] font-black uppercase tracking-[0.2em] block mb-2`}>Kritik Stoklar</span>
          <div className="flex items-end gap-2">
            <p className={`text-3xl font-black tracking-tighter ${criticalItems > 0 ? 'text-red-600' : 'text-slate-900'}`}>{criticalItems}</p>
            <span className="text-slate-400 text-[10px] font-bold mb-1.5 uppercase italic px-1 group-hover:text-red-400 transition-colors">Ürünü İncele →</span>
          </div>
        </Link>

        <div className="bg-white border-2 border-slate-100 p-6 rounded-[32px] shadow-sm flex flex-col justify-center">
          <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] block mb-2">Aktif Cariler</span>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black tracking-tighter">{contacts.length}</p>
            <span className="text-slate-400 text-[10px] font-bold mb-1.5 uppercase italic">Kayıtlı Cari</span>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-[32px] shadow-2xl shadow-slate-200 flex flex-col justify-between border-b-4 border-blue-600 relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Sistem Durumu</span>
            <div className="flex items-center gap-2 text-emerald-400 mt-1">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
              <p className="text-lg font-black tracking-widest uppercase italic leading-none">Canlı</p>
            </div>
          </div>
          <div className="absolute right-[-10%] bottom-[-20%] text-6xl opacity-10 grayscale italic font-black">M</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="sticky top-28">
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] italic flex items-center gap-2">
                <span className="w-2 h-4 bg-blue-600 rounded-full"></span>
                Hızlı Satış Tezgahı
              </h2>
            </div>
            <div className="bg-white border-2 border-slate-100 p-2 rounded-[40px] shadow-xl shadow-slate-200/40">
              <QuickSale products={products} contacts={contacts} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 xl:col-span-8">
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] italic flex items-center gap-2">
              <span className="w-2 h-4 bg-slate-900 rounded-full"></span>
              Son Hareketler (Alış & Satış)
            </h2>
          </div>

          <div className="bg-white border-2 border-slate-100 rounded-[40px] shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {lastTransactions.length === 0 ? (
                <div className="p-32 text-center bg-slate-50/20 text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">İşlem bulunamadı</div>
              ) : (
                lastTransactions.map((t) => {
                  const isSale = t.type === 'sale';
                  return (
                    <div key={t.id} className="group flex justify-between items-center p-6 hover:bg-slate-50 transition-all duration-300">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-[22px] flex flex-col items-center justify-center font-black border-2 transition-all group-hover:scale-105 ${
                          isSale ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                        }`}>
                          <span className="text-[8px] leading-none mb-1 opacity-60">TİP</span>
                          <span className="text-[10px] leading-none">{isSale ? 'SATIŞ' : 'ALIM'}</span>
                        </div>
                        
                        <div>
                          <p className="font-black text-slate-900 tracking-tight text-base uppercase italic leading-none mb-1">
                            {t.contacts?.name || 'Genel Cari'}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                              {new Date(t.created_at).toLocaleDateString('tr-TR')} • {new Date(t.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <span className="text-[9px] text-slate-300 font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                              {t.doc_no || '---'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className={`text-xl font-black tracking-tighter italic ${isSale ? 'text-blue-600' : 'text-orange-600'}`}>
                            {isSale ? '-' : '+'}{Number(t.total_amount).toLocaleString('tr-TR')} 
                            <span className="text-[10px] ml-1 not-italic opacity-60">TL</span>
                          </div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                            {isSale ? 'Çıkan Tutar' : 'Giren Maliyet'}
                          </div>
                        </div>

                        <Link 
                          href={isSale ? `/satis/izle/${t.id}` : `/alis/izle/${t.id}`}
                          className="p-3 bg-white border-2 border-slate-100 rounded-2xl opacity-0 group-hover:opacity-100 hover:border-slate-900 transition-all shadow-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}