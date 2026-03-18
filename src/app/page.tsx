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

export default async function HomePage({ 
  searchParams 
}: { 
  searchParams: Promise<{ msg?: string }> 
}) {
  
  const sParams = await searchParams;
  
  // 1. Veri Çekme (Paralel)
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

  // 2. İstatistik Hesaplamaları
  const totalStockValue = products.reduce((acc, p) => acc + (Number(p.purchase_price) * Number(p.stock_count)), 0);
  const criticalItems = products.filter(p => (Number(p.stock_count)) <= (Number(p.critical_limit || 5))).length;

  return (
    <main className="p-4 md:p-8 max-w-[1600px] mx-auto text-slate-900 font-sans min-h-screen bg-[#fafbfc]">
      
      {/* BİLDİRİM PANELİ */}
      {sParams.msg === 'cancelled' && (
        <div className="mb-8 p-4 bg-red-50 border-2 border-red-100 rounded-[24px] flex items-center gap-4 animate-in fade-in zoom-in duration-300">
          <div className="w-10 h-10 shrink-0 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-200 font-black">!</div>
          <div>
            <p className="text-red-600 font-black text-xs uppercase tracking-widest">İşlem İptal Edildi</p>
            <p className="text-red-400 text-[10px] font-bold uppercase mt-0.5">Envanter ve cari bakiyeler korundu.</p>
          </div>
        </div>
      )}

      {/* ÜST: STRATEJİK KOKPİT (GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
        {/* Depo Değeri */}
        <div className="bg-white border-2 border-slate-100 p-6 rounded-[32px] shadow-sm hover:border-blue-200 transition-all group">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 group-hover:text-blue-600 transition-colors">Depo Değeri (Maliyet)</span>
          <div className="flex items-end gap-2">
            <p className="text-2xl md:text-3xl font-black tracking-tighter italic text-slate-800">
              {totalStockValue.toLocaleString('tr-TR')}
            </p>
            <span className="text-blue-600 text-xs font-black mb-1.5 uppercase font-mono">TL</span>
          </div>
        </div>

        {/* Kritik Stoklar */}
        <Link href="/stok" className={`p-6 rounded-[32px] border-2 transition-all shadow-sm group ${criticalItems > 0 ? 'bg-red-50 border-red-100 hover:bg-red-100' : 'bg-white border-slate-100 hover:border-red-200'}`}>
          <span className={`${criticalItems > 0 ? 'text-red-500' : 'text-slate-400'} text-[10px] font-black uppercase tracking-[0.2em] block mb-2`}>Kritik Stoklar</span>
          <div className="flex items-end gap-2">
            <p className={`text-2xl md:text-3xl font-black tracking-tighter ${criticalItems > 0 ? 'text-red-600' : 'text-slate-900'}`}>{criticalItems}</p>
            <span className="text-slate-400 text-[10px] font-bold mb-1.5 uppercase italic px-1 group-hover:translate-x-1 transition-transform">İncele →</span>
          </div>
        </Link>

        {/* Aktif Cariler */}
        <div className="bg-white border-2 border-slate-100 p-6 rounded-[32px] shadow-sm flex flex-col justify-center">
          <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] block mb-2">Aktif Cariler</span>
          <div className="flex items-end gap-2">
            <p className="text-2xl md:text-3xl font-black tracking-tighter">{contacts.length}</p>
            <span className="text-slate-400 text-[10px] font-bold mb-1.5 uppercase italic">Kayıtlı</span>
          </div>
        </div>

        {/* Sistem Durumu */}
        <div className="bg-slate-900 p-6 rounded-[32px] shadow-2xl shadow-slate-200 flex flex-col justify-between border-b-4 border-blue-600 relative overflow-hidden min-h-[120px]">
          <div className="relative z-10">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Sistem Durumu</span>
            <div className="flex items-center gap-2 text-emerald-400 mt-1">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <p className="text-lg font-black tracking-widest uppercase italic leading-none">Canlı</p>
            </div>
          </div>
          <div className="absolute right-[-5%] bottom-[-15%] text-7xl opacity-10 grayscale italic font-black text-white pointer-events-none">M</div>
        </div>
      </div>

      {/* ANA İÇERİK: SATIŞ VE LİSTELEME */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
        
        {/* SOL: HIZLI SATIŞ (Mobile: Üstte) */}
        <div className="lg:col-span-5 xl:col-span-4 order-1 lg:order-1">
          <div className="lg:sticky lg:top-8">
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

        {/* SAĞ: SON HAREKETLER (Mobile: Altta) */}
        <div className="lg:col-span-7 xl:col-span-8 order-2 lg:order-2">
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] italic flex items-center gap-2">
              <span className="w-2 h-4 bg-slate-900 rounded-full"></span>
              Son Hareketler
            </h2>
          </div>

          <div className="bg-white border-2 border-slate-100 rounded-[40px] shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {lastTransactions.length === 0 ? (
                <div className="p-20 text-center bg-slate-50/20 text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">
                  Henüz işlem kaydı bulunmuyor
                </div>
              ) : (
                lastTransactions.map((t) => {
                  const isSale = t.type === 'sale';
                  return (
                    <div key={t.id} className="group flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 md:p-6 hover:bg-slate-50 transition-all duration-300 gap-4">
                      <div className="flex items-center gap-4">
                        {/* Tip İkonu */}
                        <div className={`w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-[20px] flex flex-col items-center justify-center font-black border-2 transition-all group-hover:rotate-3 ${
                          isSale ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                        }`}>
                          <span className="text-[7px] leading-none mb-1 opacity-60">TİP</span>
                          <span className="text-[10px] leading-none">{isSale ? 'SATIŞ' : 'ALIM'}</span>
                        </div>
                        
                        {/* Bilgiler */}
                        <div>
                          <p className="font-black text-slate-900 tracking-tight text-sm md:text-base uppercase italic leading-none mb-1 line-clamp-1">
                            {t.contacts?.name || 'Genel Cari'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                              {new Date(t.created_at).toLocaleDateString('tr-TR')} • {new Date(t.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <span className="hidden sm:inline text-[9px] text-slate-300 font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                              #{t.doc_no || '---'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tutar ve Aksiyon */}
                      <div className="flex items-center justify-between w-full sm:w-auto gap-6 sm:pl-0 pl-[60px]">
                        <div className="text-left sm:text-right">
                          <div className={`text-lg md:text-xl font-black tracking-tighter italic leading-none ${isSale ? 'text-blue-600' : 'text-orange-600'}`}>
                            {isSale ? '-' : '+'}{Number(t.total_amount).toLocaleString('tr-TR')} 
                            <span className="text-[10px] ml-1 not-italic opacity-60">TL</span>
                          </div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mt-1">
                            {isSale ? 'Çıkan Tutar' : 'Giren Maliyet'}
                          </div>
                        </div>

                        <Link 
                          href={isSale ? `/satis/izle/${t.id}` : `/alis/izle/${t.id}`}
                          className="p-3 bg-white border-2 border-slate-100 rounded-2xl sm:opacity-0 group-hover:opacity-100 hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
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
          
          {/* Mobil Alt Bilgi */}
          <div className="mt-6 lg:hidden text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Memonex Cloud v3.0</p>
          </div>
        </div>
      </div>
    </main>
  );
}