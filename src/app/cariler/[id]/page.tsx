'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ContactModal } from '@/components/ContactModal';
import { 
  ArrowLeft, Phone, MapPin, Hash, FileText, 
  ExternalLink, Calendar, Calculator, Info,
  TrendingUp, TrendingDown, Printer, Edit3, Briefcase
} from 'lucide-react';

// --- TÜR TANIMLAMALARI ---
type ActivityType = 'sale' | 'purchase' | 'collection' | 'payment';

interface Activity {
  id: string;
  created_at: string;
  type: ActivityType;
  amount: number;
  description?: string;
  doc_no?: string;
  is_positive: boolean; 
}

interface Contact {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'both';
  balance: number;
  phone?: string;
  address?: string;
  tax_office?: string;
  tax_number?: string;
  city?: string;
  district?: string;
  is_company: boolean;
  invoice_scenario?: string;
}

export default function CariDetayPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchCariData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Cari Kart Bilgisi
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();

      if (contactError || !contactData) throw new Error("Cari bulunamadı.");

      // 2. İşlemler ve Finans Kayıtları
      const [transRes, financeRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
        supabase.from('finance_logs').select('*').eq('contact_id', id).order('created_at', { ascending: false })
      ]);

      // 3. Verileri Muhasebe Mantığına Göre Birleştir
      const combined: Activity[] = [
        ...(transRes.data || []).map(t => ({
          id: t.id,
          created_at: t.created_at,
          type: t.type as ActivityType,
          amount: Number(t.total_amount),
          doc_no: t.doc_no,
          description: t.description || (t.type === 'sale' ? 'Satış Faturası' : 'Alış Faturası'),
          is_positive: t.type === 'sale' 
        })),
        ...(financeRes.data || []).map(f => ({
          id: f.id,
          created_at: f.created_at,
          type: f.type as ActivityType,
          amount: Number(f.amount),
          description: f.description || (f.type === 'collection' ? 'Tahsilat Makbuzu' : 'Ödeme Kaydı'),
          doc_no: f.receipt_no,
          is_positive: f.type === 'payment' 
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setContact(contactData);
      setActivities(combined);
    } catch (err) {
      console.error("Memonex Detay Yükleme Hatası:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchCariData(); }, [fetchCariData]);

  // Yazdırma İşlemi
  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const theme = useMemo(() => {
    if (!contact || contact.balance === 0) return { color: 'slate', bg: 'bg-slate-900', shadow: 'shadow-slate-200' };
    return contact.balance > 0 
      ? { color: 'emerald', bg: 'bg-emerald-600', shadow: 'shadow-emerald-200' }
      : { color: 'red', bg: 'bg-red-600', shadow: 'shadow-red-200' };
  }, [contact]);

  if (loading) return <LoadingSpinner />;
  if (!contact) return <div className="p-20 text-center font-black uppercase italic tracking-widest opacity-20 text-slate-400">Cari bulunamadı.</div>;

  return (
    <div className="bg-[#F8FAFC] min-h-screen font-sans text-slate-900 selection:bg-blue-100 pb-20 print:bg-white">
      <div className="max-w-[1400px] mx-auto px-4 py-8 md:px-12 md:py-16">
        
        {/* ÜST BAR */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-16 print:hidden">
          <div className="space-y-8 w-full">
            <button 
              onClick={() => router.push('/cariler')} 
              className="flex items-center gap-3 text-slate-400 hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-[0.3em] bg-white py-3 px-6 rounded-2xl border border-slate-100 shadow-sm active:scale-95 group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> CARİ LİSTESİNE DÖN
            </button>
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <span className={`${theme.bg} text-white text-[9px] font-black px-4 py-1.5 rounded-xl uppercase tracking-widest italic shadow-lg`}>
                  {contact.type === 'customer' ? 'Müşteri' : contact.type === 'supplier' ? 'Tedarikçi' : 'Hibrit İş Ortağı'}
                </span>
                <span className="text-slate-300 font-black text-[10px] uppercase tracking-[0.3em] italic">/ {contact.is_company ? 'Kurumsal' : 'Şahıs'} / {contact.invoice_scenario || 'Temel'}</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.85] text-slate-900 break-words max-w-4xl">
                {contact.name}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <button 
              onClick={handlePrint}
              className="flex-1 lg:flex-none bg-white border-2 border-slate-100 px-8 py-5 rounded-[24px] flex items-center justify-center gap-3 hover:border-slate-900 transition-all shadow-sm active:scale-95"
            >
              <Printer size={18} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Ekstre Yazdır</span>
            </button>
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex-1 lg:flex-none bg-slate-900 text-white px-10 py-5 rounded-[24px] flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-2xl shadow-slate-200 active:scale-95"
            >
              <Edit3 size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Cariyi Düzenle</span>
            </button>
          </div>
        </div>

        {/* KPI & BİLGİ PANELİ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 print:mb-8">
          <div className={`${theme.bg} p-12 rounded-[64px] shadow-2xl ${theme.shadow} relative overflow-hidden group transition-all print:shadow-none print:border print:border-slate-200`}>
            <div className="absolute -right-10 -bottom-10 w-56 h-56 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700 print:hidden"></div>
            <div className="flex justify-between items-start mb-10 relative z-10">
              <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] italic print:text-slate-500">Mevcut Bakiye</span>
              {contact.balance > 0 ? <TrendingUp className="text-white/40" size={24} /> : <TrendingDown className="text-white/40" size={24} />}
            </div>
            <p className="text-6xl md:text-7xl font-black italic tracking-tighter leading-none text-white relative z-10 print:text-slate-900">
              {Math.abs(contact.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 
              <small className="text-xl opacity-40 not-italic ml-3 uppercase">TL</small>
            </p>
            <div className="mt-10 relative z-10">
              <div className="inline-flex items-center gap-3 bg-white/10 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] backdrop-blur-xl border border-white/20 text-white print:text-slate-900 print:border-slate-200">
                {contact.balance > 0 ? '↗ Alacaklıyız' : contact.balance < 0 ? '↘ Borçluyuz' : '• Hesap Dengede'}
              </div>
            </div>
          </div>
          
          <div className="bg-white border-2 border-slate-100 p-12 rounded-[64px] flex flex-col justify-center gap-8 print:p-6 print:rounded-3xl">
            <div className="flex items-center gap-6 group">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all shadow-sm print:hidden">
                <Phone size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Müşteri Hattı</p>
                <p className="text-2xl font-black italic text-slate-900 tracking-tighter">{contact.phone || 'GİRİLMEMİŞ'}</p>
              </div>
            </div>
            <div className="flex items-start gap-6 group">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-all shadow-sm shrink-0 print:hidden">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Konum Detayı</p>
                <p className="text-xs font-bold text-slate-500 uppercase leading-snug italic tracking-tight line-clamp-2">
                  {contact.address ? `${contact.address} ${contact.district || ''} / ${contact.city || 'ISPARTA'}` : 'Adres kaydı bulunmuyor.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-100 p-12 rounded-[64px] flex flex-col justify-between group print:p-6 print:rounded-3xl">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Briefcase size={16} className="text-slate-300" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Resmi Kayıtlar</span>
              </div>
              <p className="text-3xl font-black italic text-slate-900 uppercase tracking-tighter leading-none line-clamp-1">
                {contact.tax_office || 'Bireysel Cari'}
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl text-[12px] font-black tracking-widest shadow-xl print:bg-white print:text-slate-900 print:border print:border-slate-200 print:shadow-none">
                  <span className="opacity-40 text-[9px]">VN:</span> {contact.tax_number || 'BELİRTİLMEMİŞ'}
                </div>
              </div>
            </div>
            <p className="text-[9px] font-black text-slate-200 uppercase tracking-[0.5em] italic mt-4 print:text-slate-400">
              MEMONEX-REF: {contact.id.split('-')[0]}
            </p>
          </div>
        </div>

        {/* HESAP HAREKETLERİ */}
        <div className="bg-white border-2 border-slate-100 rounded-[72px] shadow-sm overflow-hidden print:border-none print:rounded-none">
          <div className="p-12 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 print:p-4">
            <div>
              <h2 className="font-black italic uppercase tracking-tighter text-4xl text-slate-900">Hesap Hareketleri</h2>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic mt-2">Memonex ERP / Finansal Akış Kaydı</p>
            </div>
            <div className="flex gap-4 print:hidden">
              <div className="flex items-center gap-3 bg-emerald-50 px-5 py-2.5 rounded-2xl border border-emerald-100">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 italic">Borçlandırıcı (+)</span>
              </div>
              <div className="flex items-center gap-3 bg-red-50 px-5 py-2.5 rounded-2xl border border-red-100">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-700 italic">Alacaklandırıcı (-)</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left hidden md:table">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 border-b border-slate-50">
                  <th className="px-12 py-8">İşlem Tarihi</th>
                  <th className="px-12 py-8">Tür & Referans</th>
                  <th className="px-12 py-8">İşlem Detayı</th>
                  <th className="px-12 py-8 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activities.map((act) => (
                  <ActivityRow key={act.id} act={act} />
                ))}
              </tbody>
            </table>

            <div className="md:hidden divide-y divide-slate-100 print:hidden">
              {activities.map((act) => (
                <div key={act.id} className="p-10 space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 italic">
                      {new Date(act.created_at).toLocaleDateString('tr-TR')}
                    </span>
                    <Badge type={act.type} />
                  </div>
                  <p className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-tight">
                    {act.description}
                  </p>
                  <div className="flex justify-between items-end pt-6 border-t border-slate-50">
                     <span className="text-[9px] font-black text-slate-300 uppercase italic tracking-widest">TUTAR</span>
                     <p className={`text-3xl font-black italic tracking-tighter ${act.is_positive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {act.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <small className="text-xs opacity-40">TL</small>
                     </p>
                  </div>
                </div>
              ))}
            </div>

            {activities.length === 0 && <EmptyState />}
          </div>
        </div>

        <footer className="mt-32 pb-16 flex flex-col items-center gap-6 print:mt-10">
          <div className="w-20 h-1 bg-slate-100 rounded-full"></div>
          <p className="text-slate-200 font-black text-[11px] uppercase tracking-[1em] italic text-center print:text-slate-400">
            MEMONEX INDUSTRIAL DYNAMICS
          </p>
        </footer>
      </div>

{/* MODALLAR */}
{contact && (
  <ContactModal 
    isOpen={isEditModalOpen}
    onClose={() => setIsEditModalOpen(false)}
    onSuccess={fetchCariData}
    contact={contact} // initialData yerine contact olarak değiştirildi
  />
)}
    </div>
  );
}

// --- ALT BİLEŞENLER ---

function ActivityRow({ act }: { act: Activity }) {
  return (
    <tr className="hover:bg-slate-50/80 transition-all group print:hover:bg-transparent">
      <td className="px-12 py-12 print:py-4 print:px-6">
        <div className="flex items-center gap-4">
          <Calendar size={16} className="text-slate-200 print:hidden" />
          <span className="text-sm font-black text-slate-500 uppercase italic tracking-tight">
            {new Date(act.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </td>
      <td className="px-12 py-12 print:py-4 print:px-6">
        <div className="flex flex-col gap-3">
          <Badge type={act.type} />
          {act.doc_no && (
            <div className="flex items-center gap-2 group/link w-fit">
              <span className="text-[10px] font-bold text-blue-500/60 italic tracking-widest uppercase print:text-slate-400">
                #{act.doc_no}
              </span>
            </div>
          )}
        </div>
      </td>
      <td className="px-12 py-12 print:py-4 print:px-6">
        <p className="text-[13px] font-black text-slate-700 uppercase italic tracking-tighter line-clamp-2 max-w-md">
          {act.description}
        </p>
      </td>
      <td className="px-12 py-12 text-right print:py-4 print:px-6">
        <div className="flex flex-col items-end gap-1">
          <p className={`text-4xl font-black italic tracking-tighter leading-none print:text-2xl ${act.is_positive ? 'text-emerald-600' : 'text-red-600'}`}>
            {act.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 
            <small className="text-[12px] not-italic opacity-30 ml-2">TL</small>
          </p>
          <span className={`text-[8px] font-black uppercase tracking-[0.3em] italic print:hidden ${act.is_positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {act.is_positive ? 'HESAP ARTIRIŞ' : 'HESAP AZALIŞ'}
          </span>
        </div>
      </td>
    </tr>
  );
}

function Badge({ type }: { type: ActivityType }) {
  const configs = {
    sale: { label: 'SATIŞ', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    purchase: { label: 'ALIM', class: 'bg-red-50 text-red-600 border-red-100' },
    collection: { label: 'TAHSİLAT', class: 'bg-blue-50 text-blue-600 border-blue-100' }, // Tahsilat mavi (para girişi)
    payment: { label: 'ÖDEME', class: 'bg-orange-50 text-orange-600 border-orange-100' } // Ödeme turuncu
  };
  const config = configs[type];
  return (
    <span className={`text-[9px] font-black px-4 py-2 rounded-xl border uppercase italic tracking-[0.2em] w-fit shadow-sm print:shadow-none print:border-slate-200 ${config.class}`}>
      {config.label}
    </span>
  );
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-8">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-[6px] border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-[6px] border-slate-900 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-[11px] font-black uppercase tracking-[1em] text-slate-300 italic animate-pulse">Memonex Sync</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-40 text-center flex flex-col items-center gap-8">
      <div className="w-28 h-28 bg-slate-50 rounded-[48px] flex items-center justify-center text-slate-100 shadow-inner">
        <Info size={48} />
      </div>
      <p className="text-slate-300 font-black italic uppercase tracking-[0.4em] text-xs">Henüz bir hareket kaydı bulunmuyor.</p>
    </div>
  );
}