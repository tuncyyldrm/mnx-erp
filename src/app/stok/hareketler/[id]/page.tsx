'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function UrunHareketPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    // Ürün bilgilerini çek
    const { data: prodData } = await supabase.from('products').select('*').eq('id', id).single();
    
    // Hareketleri (Transaction Items) ve bağlı olduğu Transaction/Contact bilgilerini çek
    const { data: moveData } = await supabase
      .from('transaction_items')
      .select(`
        id, 
        quantity, 
        unit_price, 
        line_total, 
        created_at, 
        transactions (
          type, 
          doc_no, 
          contacts (name)
        )
      `)
      .eq('product_id', id)
      .order('created_at', { ascending: false });

    if (prodData) {
      setProduct(prodData);
      setMovements(moveData || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-center">
        <div className="w-16 h-16 border-8 border-slate-900 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
        <p className="font-black uppercase italic text-sm tracking-[0.3em] text-slate-900 animate-pulse">Analiz Hazırlanıyor...</p>
      </div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 bg-white">
      <span className="text-8xl mb-4">⚠️</span>
      <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Ürün Bulunamadı!</h2>
      <button onClick={() => router.push('/stok')} className="mt-6 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold">LİSTEYE DÖN</button>
    </div>
  );

  // İstatistiksel Hesaplamalar
  const totalIn = movements.filter(m => ['purchase', 'return_in'].includes(m.transactions?.type)).reduce((acc, curr) => acc + curr.quantity, 0);
  const totalOut = movements.filter(m => ['sale', 'return_out'].includes(m.transactions?.type)).reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto text-slate-900 bg-[#F8FAFC] min-h-screen font-sans">
      
      {/* ÜST PANEL: NAVİGASYON VE ÜRÜN ÖZETİ */}
      <div className="flex flex-col gap-8 mb-12">
        <button 
          onClick={() => router.back()} 
          className="group flex items-center gap-4 text-slate-400 hover:text-slate-900 transition-all font-black text-[11px] uppercase tracking-widest"
        >
          <span className="w-10 h-10 rounded-2xl border-2 border-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all shadow-sm">←</span>
          GERİ DÖN
        </button>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 bg-white p-6 md:p-10 rounded-[40px] border-2 border-slate-100 shadow-xl shadow-slate-200/40">
          <div className="flex items-center gap-6 md:gap-10 w-full lg:w-auto">
            {/* Ürün Görseli */}
            <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 bg-slate-100 rounded-[32px] overflow-hidden border-4 border-white shadow-2xl">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white font-black italic text-2xl">
                  {product.sku?.substring(0, 2)}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-blue-200">
                {product.sku}
              </span>
              <h1 className="text-1xl md:text-1xl font-black italic uppercase tracking-tighter leading-none text-slate-900">
                {product.name}
              </h1>
              <div className="flex items-center gap-3">
                 <span className="text-slate-400 font-bold uppercase italic text-xs md:text-sm">{product.brand}</span>
                 <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                 <span className="text-slate-400 font-bold uppercase italic text-xs md:text-sm">{product.category}</span>
              </div>
            </div>
          </div>

          {/* İstatistik Özet Kartları */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full lg:w-auto">
            <StatCard label="TOPLAM GİRİŞ" value={totalIn} color="emerald" symbol="+" unit={product.unit || 'Adet'} />
            <StatCard label="TOPLAM ÇIKIŞ" value={totalOut} color="red" symbol="-" unit={product.unit || 'Adet'} />
            <div className="col-span-2 md:col-span-1 bg-slate-900 p-6 rounded-[30px] text-center shadow-2xl shadow-slate-900/20 transform hover:scale-105 transition-transform">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GÜNCEL STOK</span>
                <span className="text-4xl font-black text-white tracking-tighter italic">{product.stock_count}</span>
                <span className="block text-[10px] font-bold text-blue-400 uppercase mt-1">{product.unit || 'ADET'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* HAREKET LİSTESİ (ZAMAN ÇİZELGESİ) */}
      <div className="bg-white border-2 border-slate-100 rounded-[40px] md:rounded-[56px] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="w-2 h-6 bg-slate-900 rounded-full"></div>
               <h2 className="font-black italic uppercase tracking-tighter text-2xl text-slate-900">İşlem Geçmişi</h2>
            </div>
            <div className="text-[10px] font-black uppercase text-white px-4 py-2 bg-slate-900 rounded-2xl shadow-lg">
              {movements.length} KAYITLI HAREKET
            </div>
        </div>

        {/* MASAÜSTÜ TABLO */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 bg-white">
                <th className="p-10">Tarih / Saat</th>
                <th className="p-10">İşlem Tipi & Cari Bilgisi</th>
                <th className="p-10 text-center">Miktar</th>
                <th className="p-10 text-right">Birim Fiyat</th>
                <th className="p-10 text-right">Satır Toplamı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {movements.map((m) => <DesktopRow key={m.id} m={m} />)}
            </tbody>
          </table>
        </div>

        {/* MOBİL KARTLAR */}
        <div className="md:hidden divide-y divide-slate-100">
          {movements.map((m) => <MobileRow key={m.id} m={m} />)}
        </div>

        {movements.length === 0 && (
          <div className="p-32 text-center flex flex-col items-center gap-4">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl grayscale opacity-50 italic">Empty</div>
             <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs">Henüz işlem kaydı bulunamadı.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- ALT BİLEŞENLER ---

function StatCard({ label, value, color, symbol, unit }: any) {
  const styles: any = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-emerald-100/50",
    red: "bg-red-50 border-red-100 text-red-600 shadow-red-100/50"
  };
  return (
    <div className={`${styles[color]} border-2 p-6 rounded-[30px] text-center shadow-lg transition-all hover:translate-y-[-4px]`}>
        <span className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">{label}</span>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-black tracking-tighter">{symbol}{value}</span>
          <span className="text-[10px] font-bold uppercase">{unit}</span>
        </div>
    </div>
  );
}

function DesktopRow({ m }: any) {
  const type = m.transactions?.type;
  const isOut = ['sale', 'return_out'].includes(type);
  
  // İşlem tipine göre renk ve metin belirleme
  const typeMap: any = {
    sale: { label: 'SATIŞ', color: 'text-red-600 bg-red-50' },
    purchase: { label: 'ALIM', color: 'text-emerald-600 bg-emerald-50' },
    return_in: { label: 'MÜŞT. İADE', color: 'text-blue-600 bg-blue-50' },
    return_out: { label: 'TED. İADE', color: 'text-amber-600 bg-amber-50' }
  };

  const currentType = typeMap[type] || { label: 'DİĞER', color: 'text-slate-400 bg-slate-50' };

  return (
    <tr className="hover:bg-blue-50/20 transition-all group">
      <td className="p-10">
        <div className="flex flex-col">
          <span className="font-black text-sm tracking-tighter text-slate-900">
            {new Date(m.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <span className="text-[10px] font-bold text-slate-400 italic">
            {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </td>
      <td className="p-10">
        <div className="flex items-center gap-5">
          <div className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 ${currentType.color} border-transparent group-hover:border-current transition-all`}>
            {currentType.label}
          </div>
          <div>
            <div className="font-black uppercase text-slate-800 tracking-tight leading-none mb-1 group-hover:text-blue-600 transition-colors">
              {m.transactions?.contacts?.name || 'GENEL HAREKET'}
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
              BELGE: {m.transactions?.doc_no || '---'}
            </div>
          </div>
        </div>
      </td>
      <td className="p-10 text-center">
        <span className={`text-2xl font-black italic tracking-tighter ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
            {isOut ? '-' : '+'}{m.quantity}
        </span>
      </td>
      <td className="p-10 text-right font-bold text-slate-400 text-sm italic">
        {m.unit_price?.toLocaleString('tr-TR')} TL
      </td>
      <td className="p-10 text-right">
        <div className="text-xl font-black tracking-tighter text-slate-900 group-hover:scale-110 transition-transform origin-right">
          {m.line_total?.toLocaleString('tr-TR')} <small className="text-[11px] opacity-50">TL</small>
        </div>
      </td>
    </tr>
  );
}

function MobileRow({ m }: any) {
  const isOut = ['sale', 'return_out'].includes(m.transactions?.type);
  return (
    <div className="p-6 space-y-5 bg-white">
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[10px] font-black border-2 ${isOut ? 'border-red-100 text-red-600 bg-red-50' : 'border-emerald-100 text-emerald-600 bg-emerald-50'}`}>
            {isOut ? 'ÇIKIŞ' : 'GİRİŞ'}
          </div>
          <div className="space-y-1">
            <p className="font-black uppercase text-slate-900 text-sm leading-tight">{m.transactions?.contacts?.name || 'GENEL HAREKET'}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase italic">
              {new Date(m.created_at).toLocaleDateString('tr-TR')} • {m.transactions?.doc_no || 'Faturasız'}
            </p>
          </div>
        </div>
        <div className={`text-2xl font-black italic tracking-tighter ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
          {isOut ? '-' : '+'}{m.quantity}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Birim Fiyat</span>
          <span className="font-bold text-sm italic text-slate-700">{m.unit_price?.toLocaleString('tr-TR')} TL</span>
        </div>
        <div className="flex flex-col text-right border-l border-slate-200 pl-3">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Satır Toplam</span>
          <span className="font-black text-base text-slate-900">{m.line_total?.toLocaleString('tr-TR')} TL</span>
        </div>
      </div>
    </div>
  );
}