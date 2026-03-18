'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Activity {
  id: string;
  created_at: string;
  type: 'sale' | 'purchase' | 'collection' | 'payment';
  amount: number;
  description?: string;
  doc_no?: string;
}

export default function CariDetayPage() {
  const { id } = useParams();
  const router = useRouter();
  const [contact, setContact] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCariData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: contactData } = await supabase.from('contacts').select('*').eq('id', id).single();
      if (!contactData) throw new Error("Cari bulunamadı.");

      const [transRes, financeRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('contact_id', id),
        supabase.from('finance_logs').select('*').eq('contact_id', id)
      ]);

      const combined: Activity[] = [
        ...(transRes.data || []).map(t => ({ id: t.id, created_at: t.created_at, type: t.type, amount: t.total_amount, doc_no: t.doc_no, description: t.description })),
        ...(financeRes.data || []).map(f => ({ id: f.id, created_at: f.created_at, type: f.type, amount: f.amount, description: f.description }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setContact(contactData);
      setActivities(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchCariData(); }, [fetchCariData]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafbfc]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
    </div>
  );

  return (
    <div className="bg-[#fafbfc] min-h-screen px-4 py-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* ÜST NAVİGASYON - Mobilde daha kompakt */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()} 
            className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-widest bg-white py-2 px-4 rounded-full border border-slate-100 shadow-sm"
          >
            ← GERİ
          </button>
          <div className="w-full md:w-auto text-left md:text-right">
            <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight break-words">
              {contact.name}
            </h1>
            <p className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mt-1 italic">
              Cari Hesap Özeti
            </p>
          </div>
        </div>

        {/* ÖZET KARTLARI - Mobilde Stack, Masaüstünde Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10">
          {/* Bakiye Kartı */}
          <div className="bg-slate-900 text-white p-6 md:p-8 rounded-[32px] shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Net Bakiye</span>
            <p className="text-4xl md:text-5xl font-black italic tracking-tighter mt-2">
              {Math.abs(contact.balance).toLocaleString('tr-TR')} <small className="text-sm opacity-50 not-italic">TL</small>
            </p>
            <div className={`mt-4 px-3 py-1 rounded-lg text-[9px] font-black uppercase inline-block border ${
              contact.balance > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
              contact.balance < 0 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-slate-700 text-slate-400'
            }`}>
              {contact.balance > 0 ? '↗ ALACAKLIYIZ' : contact.balance < 0 ? '↘ BORÇLUYUZ' : '• SIFIR HESAP'}
            </div>
          </div>
          
          {/* İletişim & Konum */}
          <div className="bg-white border-2 border-slate-50 p-6 md:p-8 rounded-[32px] shadow-sm">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-2">İletişim</span>
            <p className="text-lg font-black italic text-slate-900 truncate">{contact.phone || 'N/A'}</p>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase leading-relaxed line-clamp-2">{contact.address || 'Adres Girilmemiş'}</p>
          </div>

          {/* Vergi Bilgileri */}
          <div className="bg-white border-2 border-slate-50 p-6 md:p-8 rounded-[32px] shadow-sm">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-2">Kurumsal</span>
            <p className="text-lg font-black italic text-slate-900 truncate uppercase">{contact.tax_office || 'ŞAHIS'}</p>
            <p className="text-[10px] font-bold text-blue-600 mt-1 tracking-widest">{contact.tax_number || '---'}</p>
          </div>
        </div>

        {/* HAREKET LİSTESİ - Mobilde Kart Görünümü, Masaüstünde Tablo */}
        <div className="bg-white border-2 border-slate-50 rounded-[40px] shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-50 bg-white sticky top-0 z-10">
            <h2 className="font-black italic uppercase tracking-tighter text-xl text-slate-900">İşlem Geçmişi</h2>
          </div>

          <div className="overflow-x-auto">
            {/* Masaüstü Tablo Görünümü */}
            <table className="w-full text-left hidden md:table">
              <thead className="bg-slate-50/50">
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                  <th className="p-8">Tarih</th>
                  <th className="p-8">İşlem / Belge</th>
                  <th className="p-8">Açıklama</th>
                  <th className="p-8 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activities.map((act) => (
                  <ActivityRow key={act.id} act={act} />
                ))}
              </tbody>
            </table>

            {/* Mobil Kart Görünümü */}
            <div className="md:hidden divide-y divide-slate-50">
              {activities.map((act) => (
                <div key={act.id} className="p-6 flex flex-col gap-3 active:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-slate-400 italic">
                      {new Date(act.created_at).toLocaleDateString('tr-TR')}
                    </span>
                    <Badge type={act.type} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase italic tracking-tighter leading-tight">
                      {act.description || 'SİSTEM KAYDI'}
                    </p>
                    {act.doc_no && <p className="text-[9px] font-bold text-slate-400 mt-1 italic"># {act.doc_no}</p>}
                  </div>
                  <div className="flex justify-between items-end pt-2 border-t border-slate-50">
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">İşlem Tutarı</span>
                     <p className="text-xl font-black italic tracking-tighter text-slate-900">
                        {act.amount.toLocaleString('tr-TR')} <small className="text-[10px] not-italic opacity-40">TL</small>
                     </p>
                  </div>
                </div>
              ))}
            </div>

            {activities.length === 0 && (
              <div className="p-20 text-center">
                <p className="text-slate-400 font-black italic uppercase tracking-widest text-xs">Kayıt bulunamadı.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ALT BİLEŞENLER ---

function Badge({ type }: { type: string }) {
  const styles = {
    sale: 'bg-blue-50 border-blue-100 text-blue-600',
    purchase: 'bg-amber-50 border-amber-100 text-amber-600',
    collection: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    payment: 'bg-red-50 border-red-100 text-red-600'
  };
  const labels = { sale: 'SATIŞ', purchase: 'ALIM', collection: 'TAHSİLAT', payment: 'ÖDEME' };

  return (
    <span className={`text-[8px] font-black px-2 py-0.5 rounded-md border uppercase italic ${styles[type as keyof typeof styles]}`}>
      {labels[type as keyof typeof labels]}
    </span>
  );
}

function ActivityRow({ act }: { act: Activity }) {
  const isPositive = ['purchase', 'collection'].includes(act.type);
  
  // Belge tipine göre yönlendirme URL'ini belirle
  const getDetailLink = (docNo: string | undefined) => {
    if (!docNo) return null;
    if (docNo.startsWith('ST-')) return `/satis/izle/${act.id}`; // Satış detay sayfası
    if (docNo.startsWith('AL-')) return `/alis/izle/${act.id}`;  // Alış detay sayfası
    return null;
  };

  const detailLink = getDetailLink(act.doc_no);

  return (
    <tr className="hover:bg-slate-50/80 transition-all group">
      <td className="p-8 text-[11px] font-black text-slate-400 uppercase italic">
        {new Date(act.created_at).toLocaleDateString('tr-TR')}
      </td>
      <td className="p-8">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <Badge type={act.type} />
            {act.doc_no && (
              <span className="text-[10px] font-bold text-slate-400 ml-1 italic tracking-widest">
                # {act.doc_no}
              </span>
            )}
          </div>
          
          {/* Belge Numarası Varsa İncele Butonu Göster */}
          {detailLink && (
            <Link 
              href={detailLink}
              className="p-2 bg-white border-2 border-slate-100 rounded-xl opacity-0 group-hover:opacity-100 hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
              title="Belgeyi Görüntüle"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </Link>
          )}
        </div>
      </td>
      <td className="p-8">
        <p className="text-sm font-black text-slate-700 uppercase italic tracking-tighter">
          {act.description || 'SİSTEM KAYDI'}
        </p>
      </td>
      <td className="p-8 text-right">
        <div className="flex flex-col items-end">
          <p className={`text-xl font-black italic tracking-tighter leading-none ${isPositive ? 'text-emerald-600' : 'text-slate-900'}`}>
            {act.amount.toLocaleString('tr-TR')} <small className="text-[10px] not-italic opacity-40">TL</small>
          </p>
          <span className={`text-[8px] font-black mt-1 uppercase tracking-widest ${isPositive ? 'text-emerald-500' : 'text-slate-400'}`}>
            {isPositive ? 'HESABA GİRİŞ' : 'HESAPTAN ÇIKIŞ'}
          </span>
        </div>
      </td>
    </tr>
  );
}