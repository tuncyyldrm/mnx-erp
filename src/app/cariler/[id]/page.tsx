'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ContactModal } from '@/components/ContactModal';
import Link from 'next/link';
import { 
  ArrowLeft, Phone, MapPin, Briefcase, 
  ExternalLink, Calendar, Info,
  TrendingUp, TrendingDown, Printer, Edit3
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
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();

      if (contactError || !contactData) throw new Error("Cari bulunamadı.");

      const [transRes, financeRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
        supabase.from('finance_logs').select('*').eq('contact_id', id).order('created_at', { ascending: false })
      ]);

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

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const theme = useMemo(() => {
    if (!contact || contact.balance === 0) return { bg: 'bg-slate-900', color: '#0f172a', text: 'text-slate-900', border: 'border-slate-900' };
    return contact.balance > 0 
      ? { bg: 'bg-emerald-600', color: '#059669', text: 'text-emerald-600', border: 'border-emerald-600' }
      : { bg: 'bg-red-600', color: '#dc2626', text: 'text-red-600', border: 'border-red-600' };
  }, [contact]);

  if (loading) return <LoadingSpinner />;
  if (!contact) return <div className="p-20 text-center font-black uppercase italic tracking-widest opacity-20 text-slate-400">Cari bulunamadı.</div>;

  return (
    <div className="bg-[#F8FAFC] min-h-screen font-sans text-slate-900 selection:bg-blue-100 pb-20 print:bg-white print:pb-0">
      {/* GLOBAL PRINT STYLE - TAM ÇÖZÜM */}
      <style jsx global>{`
@media print {
  /* 1. TÜM GEREKSİZ MENÜ VE BUTONLARI GİZLE */
  .no-print, 
  nav, 
  footer:not(.print-footer), 
  button:not(.print-only),
  [role="navigation"],
  .fixed, /* Ekranın altında yüzen o menüyü yakalar */
  .sticky { 
    display: none !important; 
  }

  /* 2. SAYFA VE KENAR BOŞLUĞU AYARI */
  @page { 
    size: A4; 
    margin: 15mm; 
  }

  /* 3. İÇERİĞİ KAĞIDA YAY */
  body { 
    background: white !important; 
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* 4. KARMAŞAYI ENGELLE (GÖLGE VE RADIUS SIFIRLAMA) */
  * { 
    box-shadow: none !important; 
    text-shadow: none !important; 
  }

  /* Çok büyük border-radius değerlerini kağıt için makulleştir */
  .rounded-[64px], .rounded-[72px], [class*="rounded-"] {
    border-radius: 8px !important; 
  }

  /* 5. TABLO DÜZENİ */
  table { 
    page-break-inside: auto; 
    border-collapse: collapse !important;
  }
  tr { 
    page-break-inside: avoid !important; 
    page-break-after: auto; 
  }
  thead { 
    display: table-header-group !important; 
  }

  /* 6. FONT VE RENK KESKİNLİĞİ */
  h1, h2, p, span, td {
    color: #000 !important; /* Gri tonları bazen silik çıkar, siyaha zorla */
  }
}
        }
      `}</style>

      <div className="max-w-[1400px] mx-auto px-4 py-8 md:px-12 md:py-16 print:px-0 print:py-4">
        
        {/* ÜST BAR */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-16 print:mb-8">
          <div className="space-y-8 w-full">
            <button 
              onClick={() => router.push('/cariler')} 
              className="no-print flex items-center gap-3 text-slate-400 hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-[0.3em] bg-white py-3 px-6 rounded-2xl border border-slate-100 shadow-sm active:scale-95 group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> CARİ LİSTESİNE DÖN
            </button>
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <span className={`${theme.bg} text-white text-[9px] font-black px-4 py-1.5 rounded-xl uppercase tracking-widest italic shadow-lg print:shadow-none print:text-black print:border print:border-slate-200`}>
                  {contact.type === 'customer' ? 'Müşteri' : contact.type === 'supplier' ? 'Tedarikçi' : 'Hibrit İş Ortağı'}
                </span>
                <span className="text-slate-300 font-black text-[10px] uppercase tracking-[0.3em] italic print:text-slate-400">/ {contact.is_company ? 'Kurumsal' : 'Şahıs'} / {contact.invoice_scenario || 'Temel'}</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.85] text-slate-900 break-words max-w-4xl print:text-4xl">
                {contact.name}
              </h1>
              <p className="hidden print:block text-[10px] font-black text-slate-500 mt-4 uppercase tracking-[0.2em]">
                EKSTRE TARİHİ: {new Date().toLocaleString('tr-TR')}
              </p>
            </div>
          </div>

          <div className="no-print flex flex-wrap gap-3 w-full lg:w-auto">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 print:grid-cols-2 print:gap-4 print:mb-8">
          {/* BAKİYE KARTI - Print Sorunu Çözülmüş Hali */}
          <div 
            className={`${theme.bg} p-12 rounded-[64px] shadow-2xl relative overflow-hidden transition-all print:p-8 print:rounded-3xl print:shadow-none print:border-2 print:bg-white`}
            style={{ borderColor: theme.color }} // Yazdırmada kenarlık rengini zorla
          >
            <div className="flex justify-between items-start mb-10 relative z-10 print:mb-2">
              <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] italic print:text-slate-500">Mevcut Bakiye</span>
              <div className="no-print">
                {contact.balance > 0 ? <TrendingUp className="text-white/40" size={24} /> : <TrendingDown className="text-white/40" size={24} />}
              </div>
            </div>
            <p 
              className={`text-6xl md:text-7xl font-black italic tracking-tighter leading-none text-white relative z-10 print:text-4xl print:!text-slate-900`}
              style={{ color: typeof window !== 'undefined' && window.matchMedia('print').matches ? '#000' : '' }}
            >
              {Math.abs(contact.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 
              <small className="text-xl opacity-40 not-italic ml-3 uppercase print:text-slate-400">TL</small>
            </p>
            <div className="mt-10 relative z-10 print:mt-4">
              <div className="inline-flex items-center gap-3 bg-white/10 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] backdrop-blur-xl border border-white/20 text-white print:text-black print:border-slate-900 print:bg-slate-100">
                {contact.balance > 0 ? '↗ Alacaklıyız' : contact.balance < 0 ? '↘ Borçluyuz' : '• Hesap Dengede'}
              </div>
            </div>
          </div>
          
          <div className="bg-white border-2 border-slate-100 p-12 rounded-[64px] flex flex-col justify-center gap-8 print:p-8 print:rounded-3xl print:gap-2 print:border">
            <div className="flex items-center gap-6">
              <div className="no-print w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                <Phone size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1 print:text-slate-400">İletişim</p>
                <p className="text-2xl font-black italic text-slate-900 tracking-tighter print:text-lg">{contact.phone || 'GİRİLMEMİŞ'}</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <div className="no-print w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1 print:text-slate-400">Konum</p>
                <p className="text-xs font-bold text-slate-500 uppercase italic tracking-tight print:text-[10px] print:text-slate-700">
                  {contact.address ? `${contact.address} ${contact.district || ''} / ${contact.city || 'ISPARTA'}` : 'Adres kaydı bulunmuyor.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-100 p-12 rounded-[64px] flex flex-col justify-between print:p-8 print:rounded-3xl print:col-span-2 print:mt-4 print:border">
            <div className="space-y-6 print:space-y-1">
              <div className="flex items-center gap-3">
                <Briefcase size={16} className="text-slate-300 no-print" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic print:text-slate-400">Resmi Kayıtlar</span>
              </div>
              <p className="text-3xl font-black italic text-slate-900 uppercase tracking-tighter leading-none print:text-xl">
                {contact.tax_office || 'Bireysel Cari'}
              </p>
              <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl text-[12px] font-black tracking-widest inline-block print:bg-slate-100 print:text-slate-900 print:border print:py-2 print:px-4 print:rounded-lg">
                <span className="opacity-40 text-[9px]">VN:</span> {contact.tax_number || 'BELİRTİLMEMİŞ'}
              </div>
            </div>
            <p className="text-[9px] font-black text-slate-200 uppercase tracking-[0.5em] italic mt-4 print:text-slate-400">
              REF: {contact.id.split('-')[0]}
            </p>
          </div>
        </div>

        {/* HESAP HAREKETLERİ */}
        <div className="bg-white border-2 border-slate-100 rounded-[72px] shadow-sm overflow-hidden print:rounded-none print:border-none print:border-t-2 print:border-slate-900 print:mt-10">
          <div className="p-12 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 print:p-4 print:border-b-2 print:border-slate-900">
            <div>
              <h2 className="font-black italic uppercase tracking-tighter text-4xl text-slate-900 print:text-2xl">Hesap Hareketleri</h2>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic mt-2 print:text-slate-500">Memonex Industrial ERP / Finansal Akış</p>
            </div>
            <div className="no-print flex gap-4">
              <div className="flex items-center gap-3 bg-emerald-50 px-5 py-2.5 rounded-2xl border border-emerald-100 italic font-black text-[10px] text-emerald-700 uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> BORÇ (+)
              </div>
              <div className="flex items-center gap-3 bg-red-50 px-5 py-2.5 rounded-2xl border border-red-100 italic font-black text-[10px] text-red-700 uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-red-500"></div> ALACAK (-)
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 border-b border-slate-50 print:text-slate-900 print:border-b-2 print:border-slate-200">
                  <th className="px-12 py-8 print:px-4 print:py-4">İşlem Tarihi</th>
                  <th className="px-12 py-8 print:px-4 print:py-4">İşlem Türü</th>
                  <th className="px-12 py-8 print:px-4 print:py-4">Detay & Referans</th>
                  <th className="px-12 py-8 text-right print:px-4 print:py-4">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 print:divide-slate-200">
                {activities.map((act) => (
                  <ActivityRow key={act.id} act={act} />
                ))}
              </tbody>
            </table>
            {activities.length === 0 && <EmptyState />}
          </div>
        </div>

        <footer className="mt-32 pb-16 flex flex-col items-center gap-6 print:mt-10 print:pb-0">
          <div className="w-20 h-1 bg-slate-100 rounded-full print:bg-slate-900"></div>
          <p className="text-slate-200 font-black text-[11px] uppercase tracking-[1em] italic text-center print:text-slate-900 print:tracking-[0.5em]">
            MEMONEX INDUSTRIAL DYNAMICS
          </p>
        </footer>
      </div>

      <div className="no-print">
        {contact && (
          <ContactModal 
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={fetchCariData}
            contact={contact}
          />
        )}
      </div>
    </div>
  );
}

// --- YARDIMCI BİLEŞENLER ---

function ActivityRow({ act }: { act: Activity }) {
  const isDocumented = act.type === 'sale' || act.type === 'purchase';
  const viewLink = act.type === 'sale' ? `/satis/izle/${act.id}` : `/alis/izle/${act.id}`;

  return (
    <tr className="hover:bg-slate-50/80 transition-all group print:break-inside-avoid">
      <td className="px-12 py-12 print:px-4 print:py-4">
        <div className="flex items-center gap-4">
          <Calendar size={16} className="text-slate-200 no-print" />
          <span className="text-sm font-black text-slate-500 uppercase italic tracking-tight print:text-[10px] print:text-slate-900">
            {new Date(act.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        </div>
      </td>
      <td className="px-12 py-12 print:px-4 print:py-4">
        <Badge type={act.type} />
      </td>
      <td className="px-12 py-12 print:px-4 print:py-4">
        <p className="text-[13px] font-black text-slate-700 uppercase italic tracking-tighter print:text-[10px]">
          {act.description}
        </p>
        {act.doc_no && (
          <span className="text-[10px] font-bold text-slate-400 italic tracking-widest uppercase block mt-1 print:text-slate-500">
            #{act.doc_no}
          </span>
        )}
        {isDocumented && (
          <Link 
            href={viewLink}
            className="no-print inline-flex items-center gap-1.5 text-[9px] font-black text-blue-500 hover:text-blue-700 mt-2"
          >
            <ExternalLink size={10} /> BELGEYİ GÖR
          </Link>
        )}
      </td>
      <td className="px-12 py-12 text-right print:px-4 print:py-4">
        <p className={`text-4xl font-black italic tracking-tighter leading-none print:text-lg ${act.is_positive ? 'text-emerald-600' : 'text-red-600'}`}>
          {act.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 
          <small className="text-[12px] not-italic opacity-30 ml-2 print:text-[8px] print:opacity-100">TL</small>
        </p>
      </td>
    </tr>
  );
}

function Badge({ type }: { type: ActivityType }) {
  const configs = {
    sale: { label: 'SATIŞ', class: 'bg-emerald-50 text-emerald-600 border-emerald-100 print:text-emerald-700 print:border-emerald-700' },
    purchase: { label: 'ALIM', class: 'bg-red-50 text-red-600 border-red-100 print:text-red-700 print:border-red-700' },
    collection: { label: 'TAHSİLAT', class: 'bg-blue-50 text-blue-600 border-blue-100 print:text-blue-700 print:border-blue-700' },
    payment: { label: 'ÖDEME', class: 'bg-orange-50 text-orange-600 border-orange-100 print:text-orange-700 print:border-orange-700' }
  };
  const config = configs[type];
  return (
    <span className={`text-[9px] font-black px-4 py-2 rounded-xl border uppercase italic tracking-[0.2em] w-fit shadow-sm print:shadow-none print:text-[8px] print:px-2 print:py-1 ${config.class}`}>
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