'use client';
import { useState, useMemo, useEffect, useRef, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // searchParams eklendi
import { createTransaction } from '@/app/actions/erp-actions';

export function QuickSale({ products = [], contacts = [] }: { products: any[], contacts: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams(); // URL parametrelerini okur
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({ 
    contact_id: '', 
    product_id: '', 
    qty: 1, 
    tax_rate: 20,
    unit_price: 0 
  });
  
  const contactSelectRef = useRef<HTMLSelectElement>(null);
  const productSelectRef = useRef<HTMLSelectElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

// URL'den gelen cariId'yi yakala ve set et
  useEffect(() => {
    const cariIdFromUrl = searchParams.get('cariId');
    if (cariIdFromUrl) {
      // Cari listede var mı kontrol et
      const exists = contacts.find(c => String(c.id) === String(cariIdFromUrl));
      if (exists) {
        setFormData(prev => ({ ...prev, contact_id: cariIdFromUrl }));
        // Cari seçili geldiği için odağı direkt ürün seçimine atalım
        setTimeout(() => productSelectRef.current?.focus(), 300);
      }
    }
  }, [searchParams, contacts]);

// Kısayol Desteği (F1: Müşteri, F2: Ürünü Sıfırla ve Seç)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        contactSelectRef.current?.focus();
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setFormData(prev => ({ ...prev, product_id: '', qty: 1 }));
        productSelectRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

const selectedProduct = useMemo(() => {
  if (!formData.product_id) return null;
  const found = products.find((p: any) => String(p.id) === String(formData.product_id));
  
  if (found && !found.image_url) {
    console.warn(`DİKKAT: ${found.sku} ürünü bulundu ancak veritabanından image_url gelmedi!`);
  }
  return found;
}, [products, formData.product_id]);

  const totalAmount = useMemo(() => 
    (Number(selectedProduct?.sell_price) || 0) * formData.qty, 
    [selectedProduct, formData.qty]
  );

// handleProductChange içinde seçilen ürünün KDV'sini otomatik set et:
const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const val = e.target.value.trim();
  const prod = products.find((p: any) => String(p.id) === String(val));
  
  setFormData(prev => ({ 
    ...prev, 
    product_id: val, 
    qty: 1, 
    tax_rate: prod?.tax_rate || 20,
    unit_price: prod?.sell_price || 0 // Otomatik fiyatı buraya çekiyoruz
  }));
  
  if (val) {
    setTimeout(() => qtyInputRef.current?.focus(), 50);
  }
};

const handleSale = async (e?: React.FormEvent) => {
  e?.preventDefault();
  if (!formData.contact_id || !formData.product_id || !selectedProduct) return;

  if (formData.qty > (selectedProduct.stock_count || 0)) {
    alert(`⚠️ STOK YETERSİZ!\nMevcut: ${selectedProduct.stock_count} Adet`);
    return;
  }

  startTransition(async () => {
    try {
      const result = await createTransaction({
        contact_id: formData.contact_id,
        type: 'sale',
        invoice_type: 'SATIS',
items: [{ 
  product_id: formData.product_id, 
  quantity: formData.qty, 
  unit_price: Number(formData.unit_price), // Artık statik seçili ürün değil, state'deki fiyat gidiyor
  tax_rate: Number(formData.tax_rate) 
}],
        description: `Hızlı Satış: ${selectedProduct.sku}`
      });

      if (result.success) {
        // Formu temizle ve odaklan
        setFormData(prev => ({ ...prev, product_id: '', qty: 1 }));
        router.refresh(); 
        setTimeout(() => productSelectRef.current?.focus(), 150);
      } else {
        alert("İşlem Başarısız: " + (result.error || "Bilinmeyen hata."));
      }
    } catch (error) {
      console.error("Satış Hatası:", error);
      alert('Bağlantı Hatası!');
    }
  });
};

  return (
    <form onSubmit={handleSale} className="bg-white p-6 rounded-[40px] space-y-6 text-slate-900 shadow-2xl shadow-slate-200/50 border border-slate-50 max-w-md mx-auto">
      
      {/* Üst Bilgi Paneli */}
      <div className="flex justify-between items-start border-b border-slate-100 pb-5">
        <div>
          <h3 className="font-black text-slate-900 flex items-center gap-2 tracking-tighter uppercase italic text-lg leading-none">
            <span className="bg-blue-600 text-white w-8 h-8 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center text-[10px] not-italic">FX</span>
            Hızlı Satış
          </h3>
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1 italic">Isparta / Memonex Terminal</p>
        </div>
        <div className={`text-[8px] font-black px-2 py-1 rounded-md border tracking-tighter transition-colors ${isPending ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
          {isPending ? 'İŞLENİYOR...' : 'SİSTEM AKTİF'}
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Müşteri Seçimi (F1) */}
        <div className="group space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
            Cari Kart (F1)
          </label>
          <select 
            ref={contactSelectRef}
            disabled={isPending}
            required
            value={formData.contact_id}
            className="w-full border-2 border-slate-100 rounded-2xl p-3.5 text-sm bg-slate-50/30 focus:border-blue-600 focus:bg-white outline-none transition-all font-bold"
            onChange={(e) => setFormData({...formData, contact_id: e.target.value})}
          >
            <option value="">Müşteri Seçin...</option>
            {contacts.map((c: any) => (
              <option key={c.id} value={c.id}>
                {(c.name || "İsimsiz").toUpperCase()} — {Number(c.balance || 0).toLocaleString('tr-TR')} TL
              </option>
            ))}
          </select>
        </div>

        {/* Ürün Seçimi (F2) */}
        <div className="group space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
            Ürün / SKU (F2)
          </label>
          <select 
            ref={productSelectRef}
            disabled={isPending || !formData.contact_id}
            required
            value={formData.product_id}
            className="w-full border-2 border-slate-100 rounded-2xl p-3.5 text-sm bg-slate-50/30 focus:border-blue-600 focus:bg-white outline-none transition-all font-bold disabled:opacity-50"
            onChange={handleProductChange}
          >
            <option value="">Ürün Seçin...</option>
            {products.map((p: any) => (
              <option key={p.id} value={p.id} disabled={(p.stock_count || 0) <= 0}>
                {p.sku} — {(p.name || 'İsimsiz').toUpperCase()} ({p.stock_count} AD)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dinamik Stok ve Raf Bilgisi Paneli */}
<div className="h-[90px]">
  {selectedProduct ? (
    <div className="grid grid-cols-12 gap-2 h-full animate-in fade-in zoom-in-95 duration-200">  
{/* SOL: Ürün Görseli (Tam Kare ve Boşluksuz) */}
<div className="col-span-4 relative group overflow-hidden rounded-2xl border-2 border-slate-100 bg-white flex items-center justify-center h-[100px] aspect-square shadow-sm">
  {selectedProduct.image_url ? (
    <img 
      key={selectedProduct.id} 
      src={selectedProduct.image_url} 
      alt={selectedProduct.name} 
      /* object-cover: Görseli kutuya yayar, boşluk bırakmaz (uzun resimleri ortadan kırpar) */
      /* p-0: Kenar boşluğunu sıfırlar */
      className="w-full h-full object-cover p-0 animate-in fade-in zoom-in-95 duration-500"
      onError={(e) => {
        (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/f8fafc/cbd5e1?text=Hata';
      }}
    />
  ) : (
    <div className="flex flex-col items-center justify-center text-slate-300">
       <span className="text-xl">📦</span>
       <span className="text-[7px] font-black uppercase mt-1 text-center leading-none">Görsel<br/>Verisi Yok</span>
    </div>
  )}

  {/* SKU Etiketi - Resmin üzerine binen şık alt bant */}
  <div className="absolute bottom-0 inset-x-0 bg-slate-900/40 backdrop-blur-[2px] py-1 text-center">
    <span className="text-[8px] text-white font-black tracking-widest uppercase truncate px-1 block">
      {selectedProduct.sku}
    </span>
  </div>
</div>

      {/* SAĞ: Stok ve Konum Bilgileri */}
      <div className="col-span-8 grid grid-rows-2 gap-2">
        <div className={`p-2 rounded-xl border-2 flex flex-col justify-center transition-all ${
          Number(selectedProduct.stock_count) <= Number(selectedProduct.critical_limit) 
            ? 'bg-red-50 border-red-200' 
            : 'bg-emerald-50/50 border-emerald-100'
        }`}>
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Mevcut Stok</span>
          <span className={`text-[13px] font-black italic ${Number(selectedProduct.stock_count) <= Number(selectedProduct.critical_limit) ? 'text-red-600' : 'text-emerald-600'}`}>
             {selectedProduct.stock_count || 0} ADET {Number(selectedProduct.stock_count) <= Number(selectedProduct.critical_limit) ? '⚠️' : '✅'}
          </span>
        </div>
        
        <div className="p-2 rounded-xl border-2 border-slate-100 bg-slate-50 flex flex-col justify-center">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Raf Konumu</span>
          <span className="text-[12px] font-black text-slate-700 italic uppercase">
             {selectedProduct.shelf_no ? `LOC: ${selectedProduct.shelf_no}` : 'RAF TANIMSIZ'}
          </span>
        </div>
      </div>

    </div>
  ) : (
    <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-[24px] bg-slate-50/50 italic text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">
      Ürün Seçimi Bekleniyor...
    </div>
  )}
</div>

{/* Gelişmiş Dinamik Finansal Panel */}
<div className="bg-[#0f172a] p-6 rounded-[32px] shadow-2xl border border-slate-800 relative overflow-hidden text-white">
  
  {/* Üst Kısım: Giriş Alanları (3'lü Grid) */}
  <div className="grid grid-cols-3 gap-3 mb-6">
    {/* Miktar */}
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Miktar</label>
      <input 
        ref={qtyInputRef}
        type="number"
        value={formData.qty}
        className="w-full bg-slate-800/50 border-2 border-slate-700 rounded-2xl py-3 px-2 font-black text-lg outline-none focus:border-blue-500 text-center text-white transition-all"
        onChange={(e) => setFormData({...formData, qty: Math.max(1, Number(e.target.value))})}
      />
    </div>

    {/* BİRİM FİYAT (ELLE MÜDAHALE) */}
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1 italic">Birim Fiyat</label>
      <div className="relative">
        <input 
          type="number"
          step="0.01"
          value={formData.unit_price}
          className="w-full bg-slate-800/50 border-2 border-blue-900/50 rounded-2xl py-3 px-2 font-black text-lg outline-none focus:border-blue-400 text-center text-blue-100 transition-all"
          onChange={(e) => setFormData({...formData, unit_price: Number(e.target.value)})}
        />
      </div>
    </div>

    {/* KDV ORANI */}
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">KDV %</label>
      <select 
        value={formData.tax_rate}
        className="w-full bg-slate-800/50 border-2 border-slate-700 rounded-2xl py-3 px-2 font-black text-lg outline-none focus:border-blue-500 text-center text-white appearance-none cursor-pointer"
        onChange={(e) => setFormData({...formData, tax_rate: Number(e.target.value)})}
      >
        <option value="20">20</option>
        <option value="10">10</option>
        <option value="1">1</option>
        <option value="0">0</option>
      </select>
    </div>
  </div>

  {/* Orta Kısım: Karşılaştırmalı Özet */}
  <div className="bg-slate-800/30 rounded-[24px] p-4 border border-slate-700/50 mb-6 flex justify-between items-center">
    <div className="flex flex-col">
      <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-1">Satır Toplamı (Net)</span>
      <span className="text-sm font-bold text-slate-400">
        {(formData.unit_price * formData.qty).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
      </span>
    </div>
    <div className="h-8 w-[1px] bg-slate-700"></div>
    <div className="text-right flex flex-col">
      <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter mb-1">Genel Toplam (KDV'li)</span>
      <span className="text-2xl font-black text-blue-400 italic tracking-tighter">
        {(formData.unit_price * formData.qty * (1 + formData.tax_rate / 100)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <small className="text-xs not-italic">TL</small>
      </span>
    </div>
  </div>

  {/* Bilgi Notu */}
  {selectedProduct && formData.unit_price !== selectedProduct.sell_price && (
    <div className="absolute top-0 right-0 left-0 bg-amber-500/10 border-b border-amber-500/20 py-1 text-center">
      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">⚠️ Manuel Fiyat Girişi Aktif</span>
    </div>
  )}
</div>

      {/* Satış Butonu */}
      <button 
        type="submit"
        disabled={isPending || !selectedProduct}
        className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all disabled:opacity-30 disabled:grayscale active:scale-95"
      >
        {isPending ? 'İŞLENİYOR...' : 'SATIŞI TAMAMLA →'}
      </button>
    </form>
  );
}