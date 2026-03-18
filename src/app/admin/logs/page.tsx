"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  ArrowRight, User, Clock, Database, 
  Package, Users, CreditCard, FileText, 
  Plus, Trash2, RefreshCw, AlertCircle,
  X, Eye, ShieldCheck, RotateCcw, TrendingDown, TrendingUp, Hash
} from 'lucide-react';

export default function DenetimPaneli() {
  const [kayitlar, setKayitlar] = useState<any[]>([]);
  const [seciliKayit, setSeciliKayit] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    kayitlariGetir();
  }, []);

  const kayitlariGetir = async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setKayitlar(data || []);
    setYukleniyor(false);
  };

  // 📝 KAPSAMLI TÜRKÇE SÖZLÜK (TÜM SÜTUNLAR)
  const terimler: { [key: string]: string } = {
    balance: 'Cari Bakiye',
    stock_count: 'Stok Mevcudu',
    price: 'Birim Fiyat',
    purchase_price: 'Alış Fiyatı',
    sell_price: 'Satış Fiyatı',
    name: 'Ürün/Müşteri Adı',
    doc_no: 'Evrak/Fatura No',
    amount: 'Toplam Tutar',
    description: 'İşlem Açıklaması',
    type: 'Hareket Tipi',
    contact_id: 'Cari Kart No',
    product_id: 'Stok Kart No',
    created_at: 'Oluşturulma Tarihi',
    id: 'Sistem Kayıt ID',
    INSERT: 'YENİ VERİ GİRİŞİ',
    UPDATE: 'BİLGİ GÜNCELLEME',
    DELETE: 'KRİTİK VERİ SİLME'
  };

  const tabloCevir = (t: string) => ({
    products: 'STOK DEPOSU',
    contacts: 'CARİ REHBER',
    finance_logs: 'KASA VE FİNANS',
    transactions: 'RESMİ EVRAKLAR'
  }[t] || t);

  if (yukleniyor) return <div className="h-screen flex items-center justify-center font-black text-slate-300 animate-pulse">MEMONEX VERİLERİ ANALİZ EDİLİYOR...</div>;

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      
      {/* 🟢 ÜST PANEL: ÖZET VE DURUM */}
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <div className="flex items-center gap-3 mb-1">
             <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                <ShieldCheck size={24} />
             </div>
             <h1 className="text-4xl font-black italic tracking-tighter uppercase">Sistem Hareketleri</h1>
           </div>
           <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] ml-1">Tam Denetimli Kayıt Defteri v1.3.5</p>
        </div>
        
        <div className="flex gap-4">
            <div className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Canlı Durum</p>
                    <p className="text-xs font-bold text-slate-800 uppercase">Sistem İzleniyor</p>
                </div>
            </div>
        </div>
      </header>

      {/* 📋 HAREKET LİSTESİ */}
      <div className="space-y-4">
        {kayitlar.map((kayit) => (
          <div 
            key={kayit.id} 
            onClick={() => setSeciliKayit(kayit)}
            className="group relative bg-white border-2 border-slate-100 rounded-[32px] p-6 cursor-pointer hover:border-blue-600 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="flex items-center gap-6">
                {/* Sol İkon Alanı */}
                <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center transition-transform group-hover:rotate-12 ${
                    kayit.action === 'DELETE' ? 'bg-red-50 text-red-600' : 
                    kayit.action === 'INSERT' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                }`}>
                    {kayit.action === 'INSERT' ? <Plus size={28} strokeWidth={3} /> : kayit.action === 'DELETE' ? <Trash2 size={28} strokeWidth={3} /> : <RefreshCw size={28} strokeWidth={3} />}
                </div>

                {/* Başlık ve Alt Bilgi */}
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest italic">
                            {tabloCevir(kayit.table_name)}
                        </span>
                        <span className="text-slate-200 text-xs">|</span>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter italic">ID: {kayit.record_id.slice(-8)}</span>
                    </div>
                    <h3 className="font-black text-slate-800 uppercase text-xl tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                        {kayit.action === 'DELETE' ? 'Veri Silme İşlemi' : kayit.action === 'INSERT' ? 'Yeni Kayıt Girişi' : 'Bilgi Değişikliği'}
                    </h3>
                </div>
            </div>

            {/* Tarih ve Saat */}
            <div className="flex items-center gap-8 pl-2 md:pl-0">
                <div className="flex flex-col text-right">
                    <span className="text-xl font-black text-slate-900 leading-none">{format(new Date(kayit.created_at), 'HH:mm', {locale: tr})}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{format(new Date(kayit.created_at), 'dd MMMM yyyy', {locale: tr})}</span>
                </div>
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                    <Eye size={20} />
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* 🔍 AYRINTILI ANALİZ PANELİ (MODAL) */}
      {seciliKayit && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/90 backdrop-blur-sm transition-all overflow-hidden">
          <div className="bg-white w-full max-w-2xl rounded-t-[40px] md:rounded-[48px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            
            {/* Modal Üst Bölüm */}
            <div className={`p-10 flex justify-between items-start text-white relative overflow-hidden ${seciliKayit.action === 'DELETE' ? 'bg-red-600' : 'bg-slate-900'}`}>
                <div className="relative z-10">
                    <div className="bg-white/10 px-3 py-1 rounded-full w-fit mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                           <Clock size={12} /> {format(new Date(seciliKayit.created_at), 'PPP p', {locale: tr})}
                        </span>
                    </div>
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none mb-2">
                        {terimler[seciliKayit.action]}
                    </h2>
                    <p className="text-white/60 font-bold uppercase text-xs tracking-widest">{tabloCevir(seciliKayit.table_name)} Modülü İşlemi</p>
                </div>
                <button onClick={() => setSeciliKayit(null)} className="relative z-10 p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-90">
                    <X size={32} />
                </button>
                {/* Arkaplan Süsü */}
                <div className="absolute -right-10 -bottom-10 opacity-10">
                    {seciliKayit.action === 'DELETE' ? <Trash2 size={200} /> : <RefreshCw size={200} />}
                </div>
            </div>

            {/* Modal Gövdesi */}
            <div className="p-8 md:p-10 max-h-[70vh] overflow-y-auto bg-white">
                
                {/* Bilgi Kartları */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                    <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                        <div className="flex items-center gap-3 mb-2 text-slate-400">
                            <User size={16} />
                            <span className="text-[10px] font-black uppercase">İşlemi Gerçekleştiren</span>
                        </div>
                        <p className="text-lg font-black text-slate-800">SİSTEM YÖNETİCİSİ</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                        <div className="flex items-center gap-3 mb-2 text-slate-400">
                            <Hash size={16} />
                            <span className="text-[10px] font-black uppercase">İşlem İz Numarası</span>
                        </div>
                        <p className="text-lg font-mono font-black text-slate-800">{seciliKayit.id.slice(0, 12).toUpperCase()}</p>
                    </div>
                </div>

                {/* DEĞİŞİKLİK ANALİZİ */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <AlertCircle size={14} /> Kayıt Karşılaştırma Raporu
                        </h4>
                    </div>
                    
                    <div className="space-y-3">
                        {Object.entries(seciliKayit.action === 'DELETE' ? seciliKayit.old_data : seciliKayit.new_data || {}).map(([anahtar, deger]) => {
                            const eskiDeger = seciliKayit.old_data?.[anahtar];
                            const yeniDeger = seciliKayit.new_data?.[anahtar];
                            const degistiMi = seciliKayit.action === 'UPDATE' && JSON.stringify(eskiDeger) !== JSON.stringify(yeniDeger);

                            return (
                                <div key={anahtar} className={`group flex flex-col p-5 rounded-[24px] border-2 transition-all ${degistiMi ? 'bg-blue-50/30 border-blue-100' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                            {terimler[anahtar] || anahtar.replace('_', ' ')}
                                        </span>
                                        {degistiMi && (
                                            <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter italic">Güncellendi</span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        {seciliKayit.action === 'UPDATE' && degistiMi ? (
                                            <>
                                                <span className="text-sm font-bold text-slate-400 line-through italic">{String(eskiDeger ?? 'BOŞ')}</span>
                                                <ArrowRight size={16} className="text-blue-600 animate-pulse" />
                                                <span className="text-md font-black text-blue-700">{String(yeniDeger)}</span>
                                            </>
                                        ) : (
                                            <span className="text-md font-black text-slate-800">
                                                {deger === null ? '---' : String(deger)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 🟠 GERİ ALMA AKSİYONU */}
                <div className="mt-12 p-1 bg-slate-100 rounded-[30px]">
                    <button className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-6 rounded-[28px] flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-2xl uppercase italic tracking-tighter">
                        <RotateCcw size={24} />
                        Bu İşlemi Eski Haline Döndür
                    </button>
                </div>
                <p className="mt-4 text-center text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">Memonex Güvenlik Protokolü Aktif</p>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="mt-20 text-center text-slate-300 font-black text-[11px] uppercase tracking-[0.6em] italic">
        Memonex Endüstriyel Kayıt Defteri
      </footer>
    </div>
  );
}