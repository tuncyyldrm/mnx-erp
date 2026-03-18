import { supabase } from '@/lib/supabase';
import { ProductModal } from '@/components/ProductModal';
import { DeleteProductButton } from '@/components/DeleteProductButton';
import { SearchInput } from '@/components/SearchInput';
import Link from 'next/link';

interface StokPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function StokPage({ searchParams }: StokPageProps) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || '';

  // 1. Veri Çekme (Server-side) - image_url artık çekiliyor
  let sbQuery = supabase.from('products').select('*').eq('is_deleted', false);
  if (query) {
    sbQuery = sbQuery.or(`name.ilike.%${query}%,sku.ilike.%${query}%,oem_code.ilike.%${query}%,category.ilike.%${query}%,brand.ilike.%${query}%`);
  }
  const { data: rawProducts } = await sbQuery.order('stock_count', { ascending: true });
  const products = rawProducts || [];

  // 2. İstatistik Hesaplamaları
  const stats = {
    totalItems: products.length,
    criticalItems: products.filter(p => p.stock_count <= (p.critical_limit || 5)).length,
    totalQuantity: products.reduce((acc, p) => acc + (p.stock_count || 0), 0),
    totalValue: products.reduce((acc, p) => acc + ((p.purchase_price || 0) * (p.stock_count || 0)), 0),
    avgMargin: products.length 
      ? (products.reduce((acc, p) => {
          const margin = p.purchase_price > 0 ? ((p.sell_price - p.purchase_price) / p.purchase_price * 100) : 0;
          return acc + margin;
        }, 0) / products.length).toFixed(1)
      : "0"
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto text-slate-900 font-sans min-h-screen bg-[#F8FAFC]">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-2 bg-blue-600 rounded-full italic shadow-[0_0_15px_rgba(37,99,235,0.4)]"></div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900">
              Envanter <span className="text-blue-600">&</span> Depo
            </h1>
          </div>
          <p className="text-slate-500 text-sm font-medium italic ml-5">
            Memonex Otomotiv • <span className="text-slate-900 font-bold px-2 bg-slate-200/50 rounded">Isparta Merkez</span>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="flex-1 sm:min-w-[300px]">
            <SearchInput defaultValue={query} />
          </div>
          <ProductModal trigger={
            <button className="bg-slate-900 hover:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 group">
              <span className="text-xl group-hover:rotate-90 transition-transform">+</span> Yeni Parça Tanımla
            </button>
          } />
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        <StatBox title="Çeşit" value={stats.totalItems} sub="Aktif Ürün" />
        <StatBox 
          title="Kritik" 
          value={stats.criticalItems} 
          sub="Acil Tedarik" 
          variant={stats.criticalItems > 0 ? "danger" : "default"} 
        />
        <StatBox title="Toplam Adet" value={stats.totalQuantity.toLocaleString('tr-TR')} sub="Stok Mevcudu" variant="blue" />
        <StatBox 
          title="Envanter Değeri" 
          value={`${stats.totalValue.toLocaleString('tr-TR')} TL`} 
          sub={`Ort. Kar: %${stats.avgMargin}`} 
          variant="dark" 
        />
      </div>

      {/* MAIN TABLE / LIST */}
      <div className="bg-white border border-slate-200 rounded-[32px] md:rounded-[48px] overflow-hidden shadow-xl shadow-slate-200/50">
        
        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Parça Bilgisi</th>
                <th className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Konum</th>
                <th className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stok</th>
                <th className="p-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fiyatlandırma</th>
                <th className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Yönetim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map((p) => (
                <ProductRow key={p.id} p={p} />
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE LIST */}
        <div className="md:hidden divide-y divide-slate-100">
          {products.map((p) => (
            <MobileProductCard key={p.id} p={p} />
          ))}
        </div>

        {products.length === 0 && (
          <div className="py-20 text-center space-y-3">
             <div className="text-4xl">🔍</div>
             <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Sonuç bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatBox({ title, value, sub, variant = "default" }: any) {
  const styles: any = {
    default: "bg-white border-slate-200 text-slate-900",
    danger: "bg-red-50 border-red-100 text-red-600 shadow-red-100/50 shadow-lg",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    dark: "bg-slate-900 border-slate-800 text-white shadow-slate-900/20 shadow-xl"
  };

  return (
    <div className={`p-6 rounded-[24px] md:rounded-[32px] border-2 transition-all hover:scale-[1.02] ${styles[variant]}`}>
      <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-1">{title}</span>
      <p className="text-3xl font-black tracking-tighter italic">{value}</p>
      <span className="text-[10px] font-bold uppercase opacity-80">{sub}</span>
    </div>
  );
}

function ProductRow({ p }: { p: any }) {
  const isCritical = (p.stock_count || 0) <= (p.critical_limit || 5);
  const margin = p.purchase_price > 0 ? (((p.sell_price - p.purchase_price) / p.purchase_price) * 100).toFixed(0) : 0;

  return (
    <tr className={`group transition-all hover:bg-blue-50/30 ${isCritical ? 'bg-red-50/20' : ''}`}>
      <td className="p-6">
        <div className="flex items-center gap-4">
          {/* GÜNCELLENEN GÖRSEL ALANI */}
          <div className="w-14 h-14 shrink-0 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200 group-hover:border-slate-900 transition-all shadow-sm bg-white">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center">
                 <span className="text-[10px] font-black italic text-slate-400 group-hover:text-slate-900">
                   {p.sku?.substring(0, 2).toUpperCase() || 'PZ'}
                 </span>
                 <span className="text-[8px] text-slate-300 font-bold tracking-tighter mt-0.5">FOTO YOK</span>
              </div>
            )}
          </div>
          <div>
            <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase italic leading-none">{p.name}</div>
            <div className="flex gap-2 mt-2">
              <span className="text-[9px] font-black text-blue-600 bg-blue-100/50 px-1.5 py-0.5 rounded">{p.sku}</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{p.brand}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="p-6 text-center">
        <span className="inline-block px-3 py-1 rounded-lg border-2 border-slate-100 text-[11px] font-black uppercase text-slate-600 group-hover:border-blue-200">
          {p.shelf_no || '---'}
        </span>
      </td>
      <td className="p-6 text-center">
        <div className="flex flex-col items-center gap-1">
          <span className={`text-xl font-black ${isCritical ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
            {p.stock_count || 0}
          </span>
          <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full ${isCritical ? 'bg-red-500' : 'bg-emerald-500'}`} 
              style={{ width: `${Math.min((p.stock_count / 20) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </td>
      <td className="p-6 text-right">
        <div className="text-lg font-black text-slate-900 italic">{p.sell_price?.toLocaleString('tr-TR')} TL</div>
        <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded-full mt-1">
          %{margin} Kâr
        </div>
      </td>
      <td className="p-6">
        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <ActionButtons p={p} />
        </div>
      </td>
    </tr>
  );
}

function MobileProductCard({ p }: { p: any }) {
  const isCritical = (p.stock_count || 0) <= (p.critical_limit || 5);
  return (
    <div className={`p-4 ${isCritical ? 'bg-red-50/30' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          {/* MOBİL GÖRSEL GÜNCELLEME */}
          <div className="w-12 h-12 shrink-0 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden bg-white shadow-sm">
             {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
             ) : (
                <span className="font-black italic text-[10px] text-slate-400 uppercase">{p.sku?.substring(0, 2)}</span>
             )}
          </div>
          <div>
            <h4 className="font-black text-sm uppercase italic text-slate-900 leading-tight">{p.name}</h4>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{p.sku} • {p.brand}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-black text-slate-900">{p.sell_price?.toLocaleString('tr-TR')} TL</div>
          <div className="text-[9px] font-bold text-blue-600 uppercase italic">Raf: {p.shelf_no || '-'}</div>
        </div>
      </div>
      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
        <div className="flex items-center gap-2">
          <span className={`font-black ${isCritical ? 'text-red-600' : 'text-slate-900'}`}>Stok: {p.stock_count}</span>
          {isCritical && <span className="bg-red-600 text-white text-[8px] px-1 rounded animate-bounce">KRİTİK</span>}
        </div>
        <div className="flex gap-2">
          <ActionButtons p={p} small />
        </div>
      </div>
    </div>
  );
}

function ActionButtons({ p, small }: { p: any, small?: boolean }) {
  const size = small ? "w-8 h-8 text-sm" : "w-10 h-10";
  return (
    <>
      <ProductModal editData={p} trigger={
        <button className={`${size} flex items-center justify-center bg-white text-blue-600 rounded-xl border border-slate-100 shadow-sm hover:bg-blue-600 hover:text-white transition-all`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </button>
      } />
      <Link href={`/stok/hareketler/${p.id}`} className={`${size} flex items-center justify-center bg-white text-emerald-600 rounded-xl border border-slate-100 shadow-sm hover:bg-emerald-600 hover:text-white transition-all`}>
        📊
      </Link>
      <DeleteProductButton id={p.id} name={p.name} />
    </>
  );
}