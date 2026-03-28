'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Printer, Receipt, 
  CreditCard, Edit3, X, Save, Clock, Calendar
} from 'lucide-react';
function CompactPrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        @page {
          size: A4 portrait;
          margin: 0mm !important; /* Kenarlarda nefes alacak alan */
          top:0mm;
        }

        /* Tüm UI kalabalığını kaldır */
        .no-print, .print\:hidden, button, nav, header, footer { display: none !important; }

        body { 
          background: white !important; 
          color: black !important; 
          margin: 0 !important; 
          padding: 0 !important;
        }

        /* Ana Konteynırı Kağıda Tam Yay */
        #printable-area {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
        }

        /* İÇ İÇE GEÇME ÇÖZÜMÜ: Float Kullanımı */
        .print-row {
          display: block !important;
          width: 100% !important;
          clear: both !important;
          margin-bottom: 25px !important;
          overflow: hidden !important; /* Taşıyıcıyı floatlara göre genişletir */
        }

        .print-col-left {
          float: left !important;
          width: 50% !important; /* Cari kısmı sol yarısı */
          text-align: left !important;
        }

        .print-col-right {
          float: right !important;
          width: 45% !important; /* Tarih kısmı sağ yarısı */
          text-align: right !important;
        }

        /* Tutar Alanı: Yukarıdakilerin bitmesini bekle ve tam genişlik ol */
        .amount-section-print {
          clear: both !important;
          display: block !important;
          width: 100% !important;
          border: 1px dashed black !important;
          margin: 15px 0 !important;
          padding: 10px 0 !important;
          text-align: center !important;
        }

        /* Yazıcıda fontları netleştir */
        h1 { font-size: 12pt !important; font-weight: 900 !important; margin-bottom: 10px !important; }
        .text-7xl, .text-8xl { font-size: 45pt !important; font-weight: 900 !important; }
        
        /* Gereksiz yuvarlamaları ve gölgeleri kaldır */
        .rounded-[48px], .rounded-[40px], .shadow-2xl { border-radius: 0 !important; box-shadow: none !important; }
      }
    `}</style>
  );
}
const PAYMENT_METHODS: { [key: string]: string } = {
  'cash': 'Nakit',
  'bank_transfer': 'Banka Havalesi / EFT',
  'credit_card': 'Kredi Kartı'
};
// --- BİLEŞEN 1: PAYMENT FORM (Merkezi Form Bileşeni) ---
interface PaymentFormProps {
  contacts: any[];
  initialContactId?: string;
  initialType?: 'collection' | 'payment';
  editData?: any;
  trigger?: React.ReactNode;
  onSuccess?: () => void; // İşlem sonrası sayfayı yenilemek için ekledik
}

const formatForInput = (isoString: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function PaymentForm({ contacts, initialContactId, initialType, editData, trigger, onSuccess }: PaymentFormProps) {
  const router = useRouter();
  const formId = useId().replace(/:/g, "");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [displayDate, setDisplayDate] = useState("");
  const [formData, setFormData] = useState({
    contact_id: editData?.contact_id || initialContactId || '',
    type: editData?.type || initialType || 'collection',
    amount: editData?.amount || '',
    payment_method: editData?.payment_method || 'Nakit',
    description: editData?.description || '',
    created_at: editData?.created_at || new Date().toISOString()
  });

  useEffect(() => {
    if (isOpen || !trigger || initialContactId || initialType) {
      const targetDate = editData?.created_at || new Date().toISOString();
      setFormData({
        contact_id: editData?.contact_id || initialContactId || '',
        type: editData?.type || initialType || 'collection',
        amount: editData?.amount || '',
        payment_method: editData?.payment_method || 'Nakit',
        description: editData?.description || '',
        created_at: targetDate
      });
      setDisplayDate(formatForInput(targetDate));
    }
  }, [editData, isOpen, trigger, initialContactId, initialType]);

  const handleManualDateChange = (val: string) => {
    setDisplayDate(val);
    if (val.length >= 16) {
      try {
        const [datePart, timePart] = val.split(' ');
        const [d, m, y] = datePart.split('-');
        const iso = `${y}-${m}-${d}T${timePart}:00`;
        if (!isNaN(new Date(iso).getTime())) {
          setFormData(prev => ({ ...prev, created_at: new Date(iso).toISOString() }));
        }
      } catch (e) {}
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contact_id || !formData.amount) return alert("Lütfen alanları doldurun.");
    setLoading(true);

    try {
      const payload = { ...formData, amount: Number(formData.amount) };
      if (editData?.id) {
        const { error } = await supabase.from('finance_logs').update(payload).eq('id', editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('finance_logs').insert([payload]);
        if (error) throw error;
      }

      setIsOpen(false);
      if (onSuccess) onSuccess();
      router.refresh(); 
    } catch (error: any) {
      alert("Hata: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const FormContent = (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex bg-slate-100/80 p-1.5 rounded-[20px] border border-slate-200/50 shadow-inner">
        <button type="button" onClick={() => setFormData({...formData, type: 'collection'})}
          className={`flex-1 py-3 rounded-[14px] font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${formData.type === 'collection' ? 'bg-white text-emerald-600 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
          Tahsilat (+)
        </button>
        <button type="button" onClick={() => setFormData({...formData, type: 'payment'})}
          className={`flex-1 py-3 rounded-[14px] font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${formData.type === 'payment' ? 'bg-white text-red-600 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
          Ödeme (-)
        </button>
      </div>

      {/* ÖDEME YÖNTEMİ SEÇİCİ */}
      <div className="space-y-1.5 text-left">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block">Ödeme Yöntemi</label>
        <select 
          required 
          value={formData.payment_method} 
          onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
          className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs uppercase outline-none focus:border-blue-600 transition-all cursor-pointer appearance-none"
        >
          <option value="cash">Nakit (Cash)</option>
          <option value="bank_transfer">Banka Havalesi / EFT</option>
          <option value="credit_card">Kredi Kartı</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 text-left">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block">Tutar (TL)</label>
          <input type="number" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})}
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl italic tracking-tighter outline-none focus:border-blue-600 transition-all" />
        </div>
        <div className="space-y-1.5 text-left">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block">İşlem Tarihi</label>
          <div className="relative group flex items-center">
            <input type="text" value={displayDate} onChange={(e) => handleManualDateChange(e.target.value)}
              placeholder="GG-AA-YYYY SS:DD"
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs outline-none focus:border-blue-600 transition-all" />
            <div className="absolute right-4 cursor-pointer" onClick={() => (document.getElementById(`picker-${formId}`) as any).showPicker()}>📅</div>
            <input id={`picker-${formId}`} type="datetime-local" className="absolute opacity-0 w-0 h-0 pointer-events-none"
              onChange={(e) => {
                if (e.target.value) {
                  const iso = new Date(e.target.value).toISOString();
                  setFormData(prev => ({ ...prev, created_at: iso }));
                  setDisplayDate(formatForInput(iso));
                }
              }} />
          </div>
        </div>
      </div>

      <div className="space-y-1.5 text-left">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block">İşlem Notu</label>
        <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs italic outline-none focus:border-blue-600 h-20 resize-none transition-all" />
      </div>

      <button disabled={loading} className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3
          ${loading ? 'bg-slate-200 text-slate-400' : (formData.type === 'payment' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-slate-900 hover:bg-blue-600 shadow-blue-100')} text-white`}>
        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (editData ? 'DEĞİŞİKLİKLERİ KAYDET' : 'İŞLEMİ SİSTEME İŞLE')}
      </button>
    </form>
  );

  if (trigger) {
    return (
      <>
        <div onClick={() => setIsOpen(true)} className="cursor-pointer">{trigger}</div>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsOpen(false)} />
            <div className="relative bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 border-2 border-slate-900">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                   <div className="flex flex-col text-left">
                     <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Finans Modülü</span>
                     <h3 className="font-black uppercase italic text-xl tracking-tighter">{editData ? 'Kayıt Düzenle' : 'Hızlı İşlem'}</h3>
                   </div>
                   <button onClick={() => setIsOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 transition-all shadow-sm">✕</button>
                </div>
                <div className="p-8">{FormContent}</div>
            </div>
          </div>
        )}
      </>
    );
  }

  return <div className="bg-transparent">{FormContent}</div>;
}

// --- BİLEŞEN 2: FINANS IZLE PAGE (Ana Sayfa Yapısı) ---
export default function FinansIzlePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res, error } = await supabase
        .from('finance_logs')
        .select(`*, contacts (id, name, tax_office, tax_number, address)`)
        .eq('id', id)
        .single();
      if (error) throw error;
      setData(res);

      const { data: cData } = await supabase.from('contacts').select('id, name').order('name');
      if (cData) setContacts(cData);
    } catch (err) {
      console.error("Hata:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handlePrint = () => { if (typeof window !== 'undefined') window.print(); };

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="p-20 text-center opacity-30 font-black italic uppercase text-slate-900">Kayıt Bulunamadı.</div>;

  const isCollection = data.type === 'collection';

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-20 print:bg-white print:pb-0 font-sans">
      <div className="max-w-4xl mx-auto px-6 py-12 print:px-0 print:py-0 print:max-w-none">
        <CompactPrintStyles />
        {/* ÜST ARAÇ ÇUBUĞU */}
        <div className="print:hidden flex justify-between items-center mb-12">
          <button onClick={() => router.push('/finans')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> GERİ DÖN
          </button>
          <div className="flex gap-3 " >
            {/* Düzenle butonu için PaymentForm'u trigger olarak kullanıyoruz */}
            <PaymentForm 
              contacts={contacts} 
              editData={data} 
              onSuccess={fetchDetail}
              trigger={
                <div className="bg-white border-2 border-slate-100 text-slate-900 px-6 py-4 rounded-2xl flex items-center gap-3 hover:border-slate-900 transition-all shadow-sm active:scale-95">
                  <Edit3 size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Düzenle</span>
                </div>
              } 
            />
            <button onClick={handlePrint} className="bg-slate-900 text-white px-8 py-4 rounded-2xl flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95">
              <Printer size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Yazdır</span>
            </button>
          </div>
        </div>

        {/* ANA MAKBUZ KARTI */}
        <div className="bg-white border-2 border-slate-900 rounded-[48px] shadow-2xl overflow-hidden receipt-card" id="printable-area">
          <div className={`p-5 text-white flex justify-between items-center transition-colors duration-500 ${isCollection ? 'bg-slate-900' : 'bg-red-600'}`}>
            <div className="flex flex-col text-left">
              <span className="font-black uppercase text-[10px] tracking-[0.4em] opacity-60 mb-1">Memonex</span>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{isCollection ? 'Tahsilat Makbuzu' : 'Ödeme Dekontu'}</h1>
            </div>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-[10px] border-2 border-white/20 bg-white/10 shrink-0 uppercase">{isCollection ? 'Giriş' : 'Çıkış'}</div>
          </div>
          
          <div className="p-12 space-y-12">
            {/* Cari ve Tarih/Saat Kapsayıcısı */}
            <div className="print-row flex flex-col md:flex-row justify-between items-start border-b border-slate-50 pb-5 gap-2 print:block print:border-none">
              
              {/* SOL KOLON */}
              <div className="print-col-left max-w-md text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cari Hesap / Müşteri</p>
                <p className="text-3xl font-black italic uppercase text-slate-900 tracking-tight leading-tight print:text-2xl print:not-italic">
                  {data.contacts?.name}
                </p>
                <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed">
                  {data.contacts?.address || 'Adres girilmemiş.'}
                </p>
              </div>

              {/* SAĞ KOLON */}
              <div className="print-col-right text-left md:text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">İşlem Zamanı</p>
                {/* Print'te flex yerine block kullanarak sağa yaslamayı garantiye alıyoruz */}
                <div className="print:block">
                  <div className="text-slate-900 font-black italic text-sm print:not-italic print:text-base">
                    {new Date(data.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="text-slate-400 font-black text-[11px] uppercase print:text-slate-900">
                    SAAT: {new Date(data.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

            </div>
            <div className="bg-slate-50 p-6 rounded-[40px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-4">Onaylanan Net Tutar</span>
               <p className={`text-3xl md:text-4xl font-black italic tracking-tighter ${isCollection ? 'text-emerald-600' : 'text-red-600'}`}>
                  {data.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-3xl ml-[-5px] not-italic">₺</span>
               </p>
            </div>

<div className="print-row flex flex-col md:flex-row justify-between items-stretch gap-6 print:block">
  
  {/* SOL: ÖDEME YÖNTEMİ */}
  <div className="print-col-left">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ödeme Yöntemi</p>
    <div className="flex items-center gap-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 h-full print:border-slate-200">
      <span className="text-sm font-black text-slate-900 uppercase italic print:not-italic">
        {/* Çeviri sözlüğünü kullanarak gösteriyoruz */}
        {PAYMENT_METHODS[data.payment_method] || data.payment_method || 'Nakit'}
      </span>
    </div>
  </div>

  {/* SAĞ: İŞLEM NOTU */}
  <div className="print-col-right">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">İşlem Notu / Açıklama</p>
    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 h-full print:border-slate-200">
      <p className="text-sm font-bold text-slate-600 italic uppercase leading-relaxed print:not-italic">
        {data.description || 'Açıklama yok.'}
      </p>
    </div>
  </div>

</div>
          </div>
          <div className="bg-slate-50 p-8 border-t border-slate-100 flex justify-between items-center grayscale opacity-40 print:hidden">
              <p className="text-[9px] font-black uppercase tracking-[0.4em]">Integrated Finance Logic — Memonex</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-6">
        <Receipt className="text-slate-200 animate-bounce" size={64} />
        <p className="text-[10px] font-black uppercase tracking-[1em] text-slate-300 italic animate-pulse">Memonex Sync</p>
      </div>
    </div>
  );
}