"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  ArrowRight, User, Clock, Database, 
  Plus, Trash2, RefreshCw, AlertCircle,
  X, Eye, ShieldCheck, RotateCcw, Hash, Search, Filter,
  ChevronRight, HardDrive, LayoutGrid
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

export default function DenetimPaneli() {
  const [kayitlar, setKayitlar] = useState<any[]>([]);
  const [seciliKayit, setSeciliKayit] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtreAction, setFiltreAction] = useState<string>('HEPSİ');
  const [aramaTerimi, setAramaTerimi] = useState('');

  useEffect(() => {
    kayitlariGetir();
  }, []);

  const kayitlariGetir = async () => {
    setYukleniyor(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    
    if (error) toast.error("Veriler alınamadı");
    else setKayitlar(data || []);
    setYukleniyor(false);
  };

  // 📝 KAPSAMLI TÜRKÇE SÖZLÜK
  const terimler: { [key: string]: string } = {
    balance: 'Cari Bakiye',
    stock_count: 'Stok Mevcudu',
    purchase_price: 'Alış Fiyatı',
    sell_price: 'Satış Fiyatı',
    name: 'İsim/Unvan',
    doc_no: 'Belge No',
    amount: 'Tutar',
    tax_rate: 'KDV Oranı',
    INSERT: 'YENİ KAYIT',
    UPDATE: 'GÜNCELLEME',
    DELETE: 'SİLME'
  };

  const tabloCevir = (t: string) => ({
    products: 'STOK KARTLARI',
    contacts: 'CARİ HESAPLAR',
    finance_logs: 'KASA/BANKA',
    transactions: 'FATURALAR'
  }[t] || t.toUpperCase());

  // Filtreleme Mantığı
  const filtrelenmişKayitlar = useMemo(() => {
    return kayitlar.filter(k => {
      const aksiyonUyuyor = filtreAction === 'HEPSİ' || k.action === filtreAction;
      const aramaUyuyor = k.table_name.toLowerCase().includes(aramaTerimi.toLowerCase()) || 
                          k.record_id.includes(aramaTerimi);
      return aksiyonUyuyor && aramaUyuyor;
    });
  }, [kayitlar, filtreAction, aramaTerimi]);

  if (yukleniyor) return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-black text-slate-400">
      <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4"></div>
      MEMONEX VERİ ANALİZİ YAPILIYOR...
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <Toaster position="top-right" />
      
      {/* 🟢 ÜST PANEL */}
      <header className="mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Denetim İzi</h1>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-1 italic">Audit Log Management System</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {['HEPSİ', 'INSERT', 'UPDATE', 'DELETE'].map((act) => (
              <button
                key={act}
                onClick={() => setFiltreAction(act)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all ${
                  filtreAction === act 
                  ? 'bg-slate-900 text-white shadow-lg' 
                  : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {act === 'INSERT' ? 'EKLEMELER' : act === 'UPDATE' ? 'GÜNCELLEMELER' : act === 'DELETE' ? 'SİLMELER' : act}
              </button>
            ))}
          </div>
        </div>

        {/* Arama Çubuğu */}
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Tablo adı veya Kayıt ID ile ara..."
            className="w-full bg-white border-2 border-slate-100 rounded-[24px] py-5 pl-16 pr-6 font-bold text-slate-600 focus:border-blue-600 outline-none shadow-sm transition-all"
            value={aramaTerimi}
            onChange={(e) => setAramaTerimi(e.target.value)}
          />
        </div>
      </header>

      {/* 📋 LİSTELEME */}
      <div className="grid gap-4">
        {filtrelenmişKayitlar.length > 0 ? filtrelenmişKayitlar.map((kayit) => (
          <div 
            key={kayit.id} 
            onClick={() => setSeciliKayit(kayit)}
            className="group bg-white border border-slate-200 rounded-[28px] p-5 cursor-pointer hover:border-slate-900 hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row items-center gap-6"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
              kayit.action === 'DELETE' ? 'bg-red-50 text-red-600' : 
              kayit.action === 'INSERT' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {kayit.action === 'INSERT' ? <Plus size={24} /> : kayit.action === 'DELETE' ? <Trash2 size={24} /> : <RefreshCw size={24} />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tabloCevir(kayit.table_name)}</span>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-[10px] font-mono font-bold text-blue-600 truncate">#{kayit.record_id}</span>
              </div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">
                {kayit.action === 'DELETE' ? 'Kritik Veri Silindi' : kayit.action === 'INSERT' ? 'Yeni Veri Tanımlandı' : 'Mevcut Veri Değiştirildi'}
              </h3>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <div className="text-right">
                <p className="text-lg font-black text-slate-900 leading-none">{format(new Date(kayit.created_at), 'HH:mm')}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{format(new Date(kayit.created_at), 'dd MMM yyyy', {locale: tr})}</p>
              </div>
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all">
                <Eye size={20} />
              </div>
            </div>
          </div>
        )) : (
          <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase italic tracking-widest">
             Eşleşen kayıt bulunamadı
          </div>
        )}
      </div>

      {/* 🔍 MODAL ANALİZ */}
      {seciliKayit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className={`p-8 text-white flex justify-between items-start ${seciliKayit.action === 'DELETE' ? 'bg-red-600' : 'bg-slate-900'}`}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 mb-2">Sistem Analizi</p>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">{terimler[seciliKayit.action]}</h2>
                <div className="flex gap-4 mt-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded-full">
                        <Database size={12} /> {tabloCevir(seciliKayit.table_name)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded-full">
                        <Clock size={12} /> {format(new Date(seciliKayit.created_at), 'PPP p', {locale: tr})}
                    </div>
                </div>
              </div>
              <button onClick={() => setSeciliKayit(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-[#FDFDFD]">
              {/* Karşılaştırma Alanı */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-2 mb-6">
                    <LayoutGrid size={18} className="text-slate-400" />
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Veri Değişim Raporu</h4>
                </div>

                <div className="grid gap-3">
                  {Object.entries(seciliKayit.action === 'DELETE' ? seciliKayit.old_data : (seciliKayit.new_data || seciliKayit.old_data)).map(([key, value]) => {
                    const oldV = seciliKayit.old_data?.[key];
                    const newV = seciliKayit.new_data?.[key];
                    const isChanged = seciliKayit.action === 'UPDATE' && JSON.stringify(oldV) !== JSON.stringify(newV);

                    if (key === 'id' || key === 'created_at' || key === 'updated_at') return null;

                    return (
                      <div key={key} className={`p-5 rounded-[24px] border-2 transition-all ${isChanged ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-100'}`}>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase">{terimler[key] || key}</span>
                          {isChanged && <span className="text-[8px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase italic">Değişti</span>}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {isChanged ? (
                            <>
                              <span className="text-sm font-bold text-slate-300 line-through">{String(oldV || 'BOŞ')}</span>
                              <ArrowRight size={14} className="text-blue-600" />
                              <span className="text-base font-black text-blue-700">{String(newV || 'BOŞ')}</span>
                            </>
                          ) : (
                            <span className="text-base font-black text-slate-800">{String(value ?? '---')}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Kritik Geri Alma Butonu */}
              <div className="mt-10">
                <button 
                  disabled={seciliKayit.action === 'DELETE'} // Silme geri alma stratejisi farklıdır
                  className="w-full group relative overflow-hidden bg-slate-900 disabled:bg-slate-200 text-white font-black py-6 rounded-[30px] transition-all active:scale-95"
                  onClick={() => {
                    toast.success("Geri alma protokolü başlatıldı (Simülasyon)");
                  }}
                >
                  <div className="relative z-10 flex items-center justify-center gap-4 uppercase italic tracking-tighter text-xl">
                    <RotateCcw size={24} className="group-hover:-rotate-180 transition-transform duration-500" />
                    İşlemi Geri Al
                  </div>
                  <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
                <p className="text-center mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {seciliKayit.action === 'DELETE' 
                    ? '⚠️ Silinen kayıtlar manuel veritabanı müdahalesi gerektirir' 
                    : 'Geri alma işlemi eski veriyi üzerine yazar ve yeni bir log oluşturur'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-20 py-10 border-t border-slate-200 text-center">
         <p className="text-slate-300 font-black text-[10px] uppercase tracking-[0.5em] italic">Memonex Audit Engine v2.0</p>
      </footer>
    </div>
  );
}