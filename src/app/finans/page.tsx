import { supabase } from '@/lib/supabase';
import { PaymentForm } from '@/components/PaymentForm';
import { DeleteFinanceButton } from '@/components/DeleteFinanceButton';

// Tip tanımlamaları
interface Contact {
  id: string;
  name: string;
  balance: number;
}

interface FinanceLog {
  id: string;
  type: 'collection' | 'payment';
  amount: number;
  description?: string;
  created_at: string;
  contact_id?: string; // Edit ve eşleşme için kritik
  contacts: { name: string } | null;
}

export const revalidate = 0;

// Page bileşeni searchParams alacak şekilde güncellendi
export default async function FinancePage({
  searchParams,
}: {
  searchParams: { cariId?: string; type?: string; mode?: string };
}) {
  const { cariId, type, mode } = searchParams;

  const [contactsResponse, logsResponse] = await Promise.all([
    supabase.from('contacts').select('id, name, balance').order('name'),
    supabase.from('finance_logs')
      .select('*, contacts(name)')
      .order('created_at', { ascending: false })
      .limit(50)
  ]);

  const contacts: Contact[] = contactsResponse.data || [];
  const logs: FinanceLog[] = logsResponse.data || [];

  if (contactsResponse.error || logsResponse.error) {
    return <div className="p-20 text-center font-bold text-red-500">Veri yükleme hatası!</div>;
  }

  // Özet Hesaplamaları
  const totalIn = logs.filter(l => l.type === 'collection').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalOut = logs.filter(l => l.type === 'payment').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const netStatus = totalIn - totalOut;

  // URL'den gelen cariId ile eşleşen ismi bulalım (Başlık için)
  const targetContactName = contacts.find(c => c.id === cariId)?.name;

  return (
    <main className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-[#fafafa] animate-in fade-in duration-500">
      
      {/* ÜST PANEL: ÖZET */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 md:mb-12">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-2 md:mb-4">
            <span className="w-8 md:w-10 h-[3px] bg-blue-600 rounded-full"></span>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-blue-600">
              Memonex Finance OS {mode === 'new' && '• HIZLI KAYIT'}
            </span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-slate-900 leading-[0.8]">
            Kasa <span className="text-slate-300">Akışı</span>
          </h1>
          {targetContactName && (
             <p className="mt-4 text-blue-600 font-black italic uppercase text-sm tracking-widest">
                Şu an: {targetContactName} için işlem yapılıyor
             </p>
          )}
        </div>

        {/* Özet Kartları */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full lg:w-auto">
          <div className="bg-white border-2 border-slate-900/5 p-4 md:p-5 rounded-[25px] md:rounded-[30px] shadow-sm text-center">
            <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase block mb-1">Net Durum</span>
            <div className={`text-xl md:text-2xl font-black italic tracking-tighter ${netStatus >= 0 ? 'text-slate-900' : 'text-red-500'}`}>
              {netStatus.toLocaleString('tr-TR')} TL
            </div>
          </div>
          
          <div className="bg-emerald-50 border-2 border-emerald-100 p-4 md:p-5 rounded-[25px] md:rounded-[30px] shadow-sm text-center">
            <span className="text-[8px] md:text-[9px] font-black text-emerald-600 uppercase block mb-1">Giriş</span>
            <div className="text-xl md:text-2xl font-black italic tracking-tighter text-emerald-700">
              +{totalIn.toLocaleString('tr-TR')}
            </div>
          </div>

          <div className="bg-red-50 border-2 border-red-100 p-4 md:p-5 rounded-[25px] md:rounded-[30px] shadow-sm text-center col-span-2 md:col-span-1">
            <span className="text-[8px] md:text-[9px] font-black text-red-600 uppercase block mb-1">Çıkış</span>
            <div className="text-xl md:text-2xl font-black italic tracking-tighter text-red-700">
              -{totalOut.toLocaleString('tr-TR')}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        
        {/* SOL: FORM ALANI */}
        <div className="lg:col-span-4 order-2 lg:order-1">
          <div className="lg:sticky lg:top-8 bg-white border-2 border-slate-900 rounded-[35px] md:rounded-[40px] shadow-2xl overflow-hidden transform transition-all duration-500 hover:shadow-blue-500/10">
            {/* Dinamik Başlık Rengi: Ödeme ise Kırmızı, Tahsilat ise Siyah */}
            <div className={`p-5 md:p-6 text-white flex items-center justify-between transition-colors duration-500 ${
              type === 'payment' ? 'bg-red-600' : 'bg-slate-900'
            }`}>
              <div className="flex flex-col">
                <span className="font-black uppercase text-[10px] tracking-widest opacity-60">Finansal İşlem</span>
                <span className="font-black uppercase text-xs tracking-widest leading-none">
                  {type === 'payment' ? 'ÖDEME YAPILIYOR' : 'TAHSİLAT ALINIYOR'}
                </span>
              </div>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-white/20"></span>
                <span className="w-2 h-2 rounded-full bg-white/20"></span>
                <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse"></span>
              </div>
            </div>
            <div className="p-6 md:p-8">
              {/* PaymentForm'a başlangıç değerlerini prop olarak geçiyoruz */}
              <PaymentForm 
                contacts={contacts} 
                initialContactId={cariId}
                initialType={type as 'collection' | 'payment'}
              />
            </div>
          </div>
        </div>

        {/* SAĞ: LİSTE ALANI */}
        <div className="lg:col-span-8 order-1 lg:order-2">
          <div className="bg-white border-2 border-slate-100 rounded-[35px] md:rounded-[45px] overflow-hidden shadow-sm">
            <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
              <h2 className="font-black uppercase text-lg md:text-xl italic tracking-tighter text-slate-900">Hareketler</h2>
              <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500 italic uppercase">
                Son {logs.length} İşlem
              </span>
            </div>

            <div className="divide-y divide-slate-50">
              {logs.length === 0 ? (
                <div className="p-20 text-center text-slate-300 font-bold uppercase italic tracking-widest">Kayıt Bulunmuyor</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className={`group p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 transition-all gap-4 ${
                    log.contact_id === cariId ? 'bg-blue-50/30' : ''
                  }`}>
                    
                    <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto">
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-black text-[9px] border-2 shrink-0 ${
                        log.type === 'collection' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {log.type === 'collection' ? 'GİRİŞ' : 'ÇIKIŞ'}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black uppercase text-slate-900 text-base md:text-lg truncate">
                          {log.contacts?.name || 'BİLİNMEYEN CARİ'}
                        </h3>
                        
                        <div className="flex flex-col gap-1 mt-0.5">
                          <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase italic tracking-widest">
                            {new Date(log.created_at).toLocaleString('tr-TR', {day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          
                          {log.description && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] font-medium text-slate-500 italic truncate max-w-md bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/50">
                                {log.description}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 md:gap-8 border-t sm:border-t-0 border-slate-50 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <p className={`text-2xl md:text-3xl font-black italic tracking-tighter ${log.type === 'collection' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {log.type === 'collection' ? '+' : '-'}{log.amount.toLocaleString('tr-TR')} TL
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <PaymentForm 
                          contacts={contacts} 
                          editData={log} 
                          trigger={
                            <button className="p-3 bg-white text-slate-400 border border-slate-200 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                              <EditIcon />
                            </button>
                          } 
                        />
                        <DeleteFinanceButton id={log.id} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);