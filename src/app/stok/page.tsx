import { supabase } from '@/lib/supabase';
import { ProductModal } from '@/components/ProductModal';
import { SearchInput } from '@/components/SearchInput';
import { ViewSwitcher } from '@/components/ViewSwitcher'; // YENİ İMPORT
import Link from 'next/link';

interface StokPageProps {
  searchParams: Promise<{ q?: string; view?: string }>;
}

export default async function StokPage({ searchParams }: StokPageProps) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || '';
  const view = resolvedParams.view || 'list';

// 1. Veri Çekme - Kategori, SKU ve Ad sıralaması eklendi
  let sbQuery = supabase.from('products').select('*').eq('is_deleted', false);
  if (query) {
    sbQuery = sbQuery.or(`name.ilike.%${query}%,sku.ilike.%${query}%,oem_code.ilike.%${query}%,category.ilike.%${query}%,brand.ilike.%${query}%`);
  }

// 1. Kategori (A-Z), 2. Stok Kodu (A-Z), 3. Ürün Adı (A-Z)
const { data: rawProducts } = await sbQuery
 // .order('category', { ascending: false })
  .order('sku', { ascending: true })
  .order('name', { ascending: false });
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
            Memonex ERP Systems • <span className="text-slate-900 font-bold px-2 bg-slate-200/50 rounded">Isparta Merkez</span>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="flex-1 sm:min-w-[300px]">
            <SearchInput defaultValue={query} />
          </div>
          <ProductModal trigger={
            <button className="bg-slate-900 hover:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 group">
              <span className="text-xl group-hover:rotate-90 transition-transform">+</span> Yeni Ürün Tanımla
            </button>
          } />
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        <StatBox title="Çeşit" value={stats.totalItems} sub="Aktif Ürün" />
        <StatBox title="Kritik" value={stats.criticalItems} sub="Acil Tedarik" variant={stats.criticalItems > 0 ? "danger" : "default"} />
        <StatBox title="Toplam Adet" value={stats.totalQuantity.toLocaleString('tr-TR')} sub="Stok Mevcudu" variant="blue" />
        <StatBox title="Envanter Değeri" value={`${stats.totalValue.toLocaleString('tr-TR')} TL`} sub={`Ort. Kar: %${stats.avgMargin}`} variant="dark" />
      </div>

{/* GÖRÜNÜM SEÇİCİ BÖLÜMÜ - DEĞİŞTİ */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 italic">
          {view === 'grid' ? 'Katalog Görünümü' : 'Liste Görünümü'}
        </h3>
        
        <ViewSwitcher /> {/* HATA VEREN LİNKLERİN YERİNE GELDİ */}
      </div>

      {/* MAIN CONTENT */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[32px] md:rounded-[48px] overflow-hidden shadow-xl shadow-slate-200/50">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ürün Bilgisi</th>
                  <th className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Konum</th>
                  <th className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stok</th>
                  <th className="p-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fiyatlandırma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map((p) => <ProductRow key={p.id} p={p} />)}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-slate-100">
            {products.map((p) => <MobileProductCard key={p.id} p={p} />)}
          </div>
        </div>
      )}

      {products.length === 0 && (
        <div className="py-20 text-center space-y-3">
          <div className="text-4xl">🔍</div>
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Sonuç bulunamadı</p>
        </div>
      )}
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
  const taxRate = p.tax_rate || 20;
  const sellPriceWithTax = p.sell_price * (1 + taxRate / 100);

  return (
        <tr className={`group transition-all hover:bg-slate-50/80 border-b border-slate-100 ${isCritical ? 'bg-red-50/30' : ''}`}>
          <td>
            <Link href={`/stok/hareketler/${p.id}`} className="flex items-center gap-4 p-5 w-full h-full">
              {/* Resim alanı: Daha yumuşak köşeler ve temiz border */}
              <div className="w-26 h-26 shrink-0 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 group-hover:border-blue-400 transition-all shadow-sm">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                    {p.sku?.substring(0, 2)}
                  </span>
                )}
              </div>

              {/* Ürün Bilgisi: Font inceltildi, italik kaldırıldı, normal case yapıldı */}
              <div>
                <div className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors text-[14px] leading-tight mb-1">
                  {p.name}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/50">
                    {p.sku}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    {p.brand}
                  </span>
                </div>
              </div>
            </Link>
          </td>

          {/* Konum: İnce ve temiz yazı tipi */}
          <td className="p-5 text-center text-[12px] font-medium text-slate-500 uppercase tracking-wide">
            {p.shelf_no || '---'}
          </td>

          {/* Stok Adedi: Sadece sayısal değerde vurgu korunur, italik kaldırıldı */}
          <td className={`p-5 text-center font-bold text-lg tracking-tight ${isCritical ? 'text-red-600' : 'text-slate-700'}`}>
            {p.stock_count || 0}
          </td>

          {/* Fiyatlandırma: Daha net hiyerarşi */}
          <td className="p-5 text-right">
            <div className="text-base font-bold text-slate-900 leading-none tracking-tight">
              {p.sell_price?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
            </div>
            <div className="text-[10px] font-medium text-blue-500 bg-blue-50/50 inline-block px-2 py-0.5 rounded mt-1 border border-blue-100/30">
              KDV Dahil: {sellPriceWithTax.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
            </div>
          </td>
        </tr>
  );
}

function ProductCard({ p }: { p: any }) {
  const isCritical = (p.stock_count || 0) <= (p.critical_limit || 5);
  const taxRate = p.tax_rate || 20;
  const sellPriceWithTax = p.sell_price * (1 + taxRate / 100);

  return (
<Link href={`/stok/hareketler/${p.id}`} className="group bg-white border border-slate-200 rounded-[32px] p-4 transition-all hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 flex flex-col h-full relative">
  
  {/* Ürün Görseli Alanı: Yuvarlatılmış köşeler ve Zoom efekti */}
  <div className="aspect-square w-full bg-slate-50 rounded-[24px] overflow-hidden border border-slate-100 relative mb-4">
    {p.image_url ? (
      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-3xl bg-slate-100 uppercase tracking-tighter">
        {p.sku?.substring(0, 2)}
      </div>
    )}
    
    {/* Stok Rozeti: Daha modern ve net konumlandırma */}
    <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-xl font-bold text-[10px] tracking-tight shadow-sm border ${
      isCritical 
        ? 'bg-red-600 border-red-500 text-white animate-pulse' 
        : 'bg-white/90 backdrop-blur-md border-slate-200 text-slate-900'
    }`}>
      {p.stock_count} ADET
    </div>
  </div>

  {/* Bilgi Alanı: Hiyerarşi düzenlendi */}
  <div className="flex-1 space-y-2 px-1">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100/50 uppercase tracking-wider">
        {p.sku}
      </span>
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
        {p.shelf_no || 'RAFSİZ'}
      </span>
    </div>
    
    <h3 className="font-semibold text-[15px] text-slate-800 leading-snug min-h-[40px] line-clamp-2">
      {p.name}
    </h3>
    
    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
      {p.brand}
    </p>
  </div>

  {/* Fiyat Alanı: Daha temiz tipografi */}
  <div className="mt-4 flex items-end justify-between px-1">
    <div className="flex flex-col">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">NET SATIŞ</span>
      <span className="text-lg font-bold text-slate-900 tracking-tight">
        {p.sell_price?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-xs ml-0.5">TL</span>
      </span>
    </div>
    
    <div className="text-right flex flex-col items-end">
      <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter mb-0.5">KDV DAHİL</span>
      <span className="text-sm font-semibold text-blue-600 tracking-tight">
        {sellPriceWithTax.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
      </span>
    </div>
  </div>
</Link>
  );
}

function MobileProductCard({ p }: { p: any }) {
  const isCritical = (p.stock_count || 0) <= (p.critical_limit || 5);
  const taxRate = p.tax_rate || 20;
  const sellPriceWithTax = p.sell_price * (1 + taxRate / 100);

  return (
<Link 
  href={`/stok/hareketler/${p.id}`} 
  className={`block p-4 active:bg-slate-50 border-b border-slate-100 transition-colors ${
    isCritical ? 'bg-red-50/30' : 'bg-white'
  }`}
>
  <div className="flex justify-between items-start gap-2 mb-3">
    <div className="flex gap-3 min-w-0"> {/* min-w-0 ismi sıkıştırır, fiyatı korur */}
      {/* Görsel Kutusu */}
      <div className="w-12 h-12 shrink-0 bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden shadow-sm">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-bold text-[9px] text-slate-400 uppercase tracking-tight">
            {p.sku?.substring(0, 2)}
          </span>
        )}
      </div>

      {/* İsim ve Raf Bilgisi */}
      <div className="min-w-0 flex flex-col justify-center">
        <h4 className="font-semibold text-sm text-slate-800 leading-tight truncate">
          {p.name}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/50">
            {p.sku}
          </span>
          {/* RAF NUMARASI: Daha ince ve net */}
          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate">
            {p.shelf_no ? `RAF: ${p.shelf_no}` : 'RAFSİZ'}
          </span>
        </div>
      </div>
    </div>

    {/* FİYAT BÖLÜMÜ: Taşmayı önlemek için sağa yaslı ve sabit genişlikte tutuldu */}
    <div className="text-right shrink-0 ml-2">
      <div className="text-[14px] font-bold text-slate-900 leading-none tracking-tight">
        {p.sell_price?.toLocaleString('tr-TR')} <span className="text-[10px]">TL</span>
      </div>
      <div className="text-[8px] font-semibold text-blue-500 mt-1 uppercase opacity-70">
        {sellPriceWithTax.toLocaleString('tr-TR')} <span className="text-slate-400">Brüt</span>
      </div>
    </div>
  </div>

  {/* Alt Stok Şeridi */}
  <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100 p-2.5 rounded-lg">
    <div className="flex items-baseline gap-1.5">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">STOK:</span>
      <span className={`font-bold text-lg tracking-tighter ${isCritical ? 'text-red-600' : 'text-slate-800'}`}>
        {p.stock_count} <span className="text-[10px] font-medium text-slate-400">ADET</span>
      </span>
    </div>
    
    <div className="flex items-center gap-1 text-blue-600 font-bold text-[9px] tracking-widest uppercase">
      DETAY <span className="text-sm">→</span>
    </div>
  </div>
</Link>
  );
}