'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function UrunHareketPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    const { data: prodData } = await supabase.from('products').select('*').eq('id', id).single();
    const { data: moveData } = await supabase
      .from('transaction_items')
      .select(`id, quantity, unit_price, line_total, created_at, transactions (type, doc_no, contacts (name))`)
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
    <div className="min-h-screen flex items-center justify-center bg-[#fafbfc]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-black uppercase italic text-xs tracking-widest text-slate-400">Analiz Hazırlanıyor...</p>
      </div>
    </div>
  );

  if (!product) return <div className="p-20 text-center font-black text-red-500 uppercase">Ürün Bulunamadı!</div>;

  const totalIn = movements.filter(m => ['purchase', 'return_in'].includes(m.transactions?.type)).reduce((acc, curr) => acc + curr.quantity, 0);
  const totalOut = movements.filter(m => ['sale', 'return_out'].includes(m.transactions?.type)).reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto text-slate-900 bg-[#fafbfc] min-h-screen">
      
      {/* Üst Panel: Navigasyon ve Başlık */}
      <div className="flex flex-col gap-6 mb-10">
        <button 
          onClick={() => router.back()} 
          className="group flex items-center gap-3 text-slate-400 hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-widest"
        >
          <span className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">←</span>
          STOK LİSTESİ
        </button>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
          <div className="w-full lg:w-auto">
            <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-[0.2em] mb-3 inline-block">
              {product.sku}
            </span>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] break-words">
              {product.name}
            </h1>
            <p className="text-slate-400 font-bold uppercase italic text-xs md:text-sm mt-3 border-l-4 border-blue-500 pl-3">
              {product.brand} <span className="mx-2 text-slate-200">//</span> {product.category}
            </p>
          </div>

          {/* İstatistik Kartları - Mobilde Grid, Masaüstünde Flex */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full lg:w-auto">
            <StatCard label="TOPLAM GİRİŞ" value={totalIn} color="emerald" symbol="+" />
            <StatCard label="TOPLAM ÇIKIŞ" value={totalOut} color="red" symbol="-" />
            <div className="col-span-2 md:col-span-1 bg-slate-900 p-5 rounded-[24px] text-center shadow-xl shadow-slate-200">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">MEVCUT STOK</span>
                <span className="text-3xl font-black text-white tracking-tighter italic">{product.stock_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hareket Listesi */}
      <div className="bg-white border-2 border-slate-100 rounded-[32px] md:rounded-[48px] shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-50 bg-white flex justify-between items-center">
            <h2 className="font-black italic uppercase tracking-tighter text-lg md:text-xl text-slate-900">Kronoloji</h2>
            <div className="text-[9px] font-black uppercase text-slate-400 italic px-3 py-1 bg-slate-50 rounded-full">
              {movements.length} İŞLEM
            </div>
        </div>

        {/* Masaüstü Görünümü (Tablo) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 border-b border-slate-50">
                <th className="p-8">Tarih</th>
                <th className="p-8">İşlem / Cari</th>
                <th className="p-8 text-center">Miktar</th>
                <th className="p-8 text-right">Birim Fiyat</th>
                <th className="p-8 text-right">Toplam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {movements.map((m) => <DesktopRow key={m.id} m={m} />)}
            </tbody>
          </table>
        </div>

        {/* Mobil Görünümü (Kartlar) */}
        <div className="md:hidden divide-y divide-slate-50">
          {movements.map((m) => <MobileRow key={m.id} m={m} />)}
        </div>

        {movements.length === 0 && (
          <div className="p-20 text-center text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">
            Henüz hareket kaydı yok.
          </div>
        )}
      </div>
    </div>
  );
}

// --- ALT BİLEŞENLER ---

function StatCard({ label, value, color, symbol }: any) {
  const colors: any = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
    red: "bg-red-50 border-red-100 text-red-600"
  };
  return (
    <div className={`${colors[color]} border-2 p-5 rounded-[24px] text-center`}>
        <span className="block text-[9px] font-black uppercase tracking-widest mb-1 opacity-80">{label}</span>
        <span className="text-2xl font-black tracking-tighter">{symbol}{value}</span>
    </div>
  );
}

function MobileRow({ m }: any) {
  const isOut = ['sale', 'return_out'].includes(m.transactions?.type);
  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[8px] font-black border ${isOut ? 'border-red-100 text-red-600 bg-red-50' : 'border-emerald-100 text-emerald-600 bg-emerald-50'}`}>
            {isOut ? 'ÇIKIŞ' : 'GİRİŞ'}
          </div>
          <div>
            <p className="font-black uppercase text-slate-800 text-xs leading-tight">{m.transactions?.contacts?.name || 'GENEL HAREKET'}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase italic">{new Date(m.created_at).toLocaleDateString('tr-TR')}</p>
          </div>
        </div>
        <div className={`text-xl font-black italic tracking-tighter ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
          {isOut ? '-' : '+'}{m.quantity}
        </div>
      </div>
      <div className="flex justify-between items-end bg-slate-50 p-3 rounded-xl">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-400 uppercase">Birim</span>
          <span className="font-bold text-xs italic">{m.unit_price?.toLocaleString('tr-TR')} TL</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[8px] font-black text-slate-400 uppercase">Toplam Satır</span>
          <span className="font-black text-sm text-slate-900">{m.line_total?.toLocaleString('tr-TR')} TL</span>
        </div>
      </div>
    </div>
  );
}

function DesktopRow({ m }: any) {
  const isOut = ['sale', 'return_out'].includes(m.transactions?.type);
  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="p-8 font-black text-sm tracking-tighter italic text-slate-400">
        {new Date(m.created_at).toLocaleDateString('tr-TR')}
      </td>
      <td className="p-8">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[9px] font-black border-2 ${isOut ? 'border-red-100 text-red-600' : 'border-emerald-100 text-emerald-600'}`}>
            {isOut ? 'ÇIKIŞ' : 'GİRİŞ'}
          </div>
          <div>
            <div className="font-black uppercase text-slate-800 tracking-tight">{m.transactions?.contacts?.name || 'GENEL HAREKET'}</div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {m.transactions?.type === 'sale' ? 'SATIŞ' : m.transactions?.type === 'purchase' ? 'ALIM' : 'İADE'} // NO: {m.transactions?.doc_no || '---'}
            </div>
          </div>
        </div>
      </td>
      <td className="p-8 text-center">
        <span className={`text-xl font-black italic tracking-tighter ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
            {isOut ? '-' : '+'}{m.quantity}
        </span>
      </td>
      <td className="p-8 text-right font-bold text-slate-400 text-sm italic">
        {m.unit_price?.toLocaleString('tr-TR')} TL
      </td>
      <td className="p-8 text-right">
        <div className="text-lg font-black tracking-tighter text-slate-900 group-hover:scale-110 transition-transform origin-right">
          {m.line_total?.toLocaleString('tr-TR')} <small className="text-[10px]">TL</small>
        </div>
      </td>
    </tr>
  );
}