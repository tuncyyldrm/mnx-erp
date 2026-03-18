import { supabase } from '@/lib/supabase';
import { PaymentForm } from '@/components/PaymentForm';
import { DeleteFinanceButton } from '@/components/DeleteFinanceButton';

export const revalidate = 0; // Verilerin her zaman taze kalmasını sağlar

export default async function FinancePage() {
  const { data: contacts } = await supabase.from('contacts').select('id, name, balance').order('name');
  const { data: financeData } = await supabase.from('finance_logs').select('*, contacts(name)').order('created_at', { ascending: false }).limit(30);

  const logs = financeData || [];

  return (
    <main className="p-4 md:p-10 max-w-[1600px] mx-auto min-h-screen">
      
      {/* HEADER: Dinamik ve Endüstriyel */}
      <div className="flex flex-col mb-10 md:mb-16">
        <div className="flex items-center gap-4 mb-4">
           <div className="h-[2px] w-12 bg-blue-600"></div>
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Finansal Akış Paneli</span>
        </div>
        <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-slate-900 leading-[0.8]">
          Kasa <span className="text-slate-300 group-hover:text-blue-600 transition-colors">Defteri</span>
        </h1>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Isparta Yerel Nakit Akış Sistemi • Canlı Veri
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        
        {/* SOL PANEL: Yeni Kayıt Formu (Sticky) */}
        <div className="lg:col-span-4 order-2 lg:order-1">
          <div className="lg:sticky lg:top-28">
            <div className="bg-white border-2 border-slate-100 rounded-[40px] shadow-2xl shadow-slate-200/50 overflow-hidden">
              <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                 <div className="flex flex-col">
                    <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">İşlem Yap</h2>
                    <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">Tahsilat veya Ödeme Gir</span>
                 </div>
                 <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                 </div>
              </div>
              <div className="p-6 md:p-8">
                 <PaymentForm contacts={contacts || []} />
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ PANEL: Hareket Listesi */}
        <div className="lg:col-span-8 order-1 lg:order-2">
          <div className="bg-white border-2 border-slate-100 rounded-[40px] overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-100 flex justify-between items-end">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Hareketler</span>
                  <h2 className="font-black uppercase text-2xl italic tracking-tighter text-slate-900">Son İşlemler</h2>
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kayıt Sayısı</span>
                  <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[12px] font-black italic shadow-lg">
                    {logs.length}
                  </div>
               </div>
            </div>
            
            <div className="divide-y divide-slate-50">
              {logs.map((log: any) => (
                <div key={log.id} className="p-6 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50 transition-all group gap-6">
                  
                  {/* Bilgi Bloğu */}
                  <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-black text-[9px] border-2 shadow-sm transition-transform group-hover:scale-110 ${
                      log.type === 'collection' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {log.type === 'collection' ? 'TAHSİLAT' : 'ÖDEME'}
                    </div>
                    
                    <div className="flex-grow">
                      <p className="font-black uppercase text-slate-900 tracking-tight text-lg md:text-xl leading-none mb-2 group-hover:text-blue-600 transition-colors">
                        {log.contacts?.name || 'Bilinmeyen Cari'}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400 font-black uppercase italic tracking-tighter bg-slate-100 px-2 py-0.5 rounded">
                          {new Date(log.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                        {log.description && (
                          <span className="text-[11px] text-slate-500 font-bold italic opacity-60 line-clamp-1">
                            // {log.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tutar ve Aksiyonlar */}
                  <div className="flex items-center justify-between md:justify-end w-full md:w-auto md:gap-10 border-t border-slate-50 md:border-none pt-4 md:pt-0">
                    <div className="flex flex-col items-start md:items-end">
                      <p className={`text-2xl md:text-4xl font-black italic tracking-tighter ${log.type === 'collection' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {log.type === 'collection' ? '+' : '-'}{log.amount.toLocaleString('tr-TR')} 
                        <span className="text-xs ml-1 opacity-40 not-italic uppercase tracking-tighter">try</span>
                      </p>
                    </div>

                    <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-500">
                      <PaymentForm 
                        contacts={contacts || []} 
                        editData={log} 
                        trigger={
                          <button className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 border border-slate-100 rounded-2xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                        } 
                      />
                      <DeleteFinanceButton id={log.id} />
                    </div>
                  </div>
                </div>
              ))}
              
              {logs.length === 0 && (
                <div className="py-32 text-center bg-slate-50/30">
                  <div className="inline-block p-6 rounded-full bg-white shadow-xl mb-4 text-4xl">🧾</div>
                  <p className="text-slate-300 font-black italic uppercase tracking-[0.3em] text-[10px]">Veritabanında kayıtlı finansal hareket bulunamadı.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}