'use client';
import { useState, useMemo, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTransaction } from '@/app/actions/erp-actions';

export function QuickSale({ products = [], contacts = [] }: { products: any[], contacts: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({ contact_id: '', product_id: '', qty: 1 });
  
  const contactSelectRef = useRef<HTMLSelectElement>(null);
  const productSelectRef = useRef<HTMLSelectElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Kısayol Desteği (F1: Müşteri, F2: Ürünü Sıfırla/Odakla)
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
    return products.find((p: any) => String(p.id) === String(formData.product_id));
  }, [products, formData.product_id]);

  const totalAmount = useMemo(() => 
    (Number(selectedProduct?.sell_price) || 0) * formData.qty, 
    [selectedProduct, formData.qty]
  );

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value.trim();
    setFormData(prev => ({ ...prev, product_id: val, qty: 1 }));
    if (val) {
      // DOM'un güncellenmesi için mikro task
      setTimeout(() => qtyInputRef.current?.focus(), 50);
    }
  };

  const handleSale = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.contact_id || !formData.product_id || !selectedProduct) return;

    if (formData.qty > (selectedProduct.stock_count || 0)) {
      alert(`⚠️ STOK YETERSİZ!\nMevcut: ${selectedProduct.stock_count} Adet\nRaf: ${selectedProduct.shelf_no || 'Belirsiz'}`);
      return;
    }

    startTransition(async () => {
      try {
        const result = await createTransaction({
          contact_id: formData.contact_id,
          type: 'sale',
          items: [{ 
            product_id: formData.product_id, 
            quantity: formData.qty, 
            unit_price: Number(selectedProduct.sell_price) 
          }],
          description: `Hızlı Satış: ${selectedProduct.sku}`
        });

        if (result.success) {
          // Ürünü temizle ama müşteriyi tut (Seri satış için)
          setFormData(prev => ({ ...prev, product_id: '', qty: 1 }));
          router.refresh(); 
          productSelectRef.current?.focus();
        } else {
          alert("Hata: " + result.error);
        }
      } catch (error) {
        alert('Bağlantı Hatası! Lütfen internetinizi kontrol edin.');
      }
    });
  };

  return (
    <form onSubmit={handleSale} className="bg-white p-6 rounded-[40px] space-y-6 text-slate-900 shadow-2xl shadow-slate-200/50 border border-slate-50 max-w-md mx-auto">
      
      {/* Header Panel */}
      <div className="flex justify-between items-start border-b border-slate-100 pb-5">
        <div>
          <h3 className="font-black text-slate-900 flex items-center gap-2 tracking-tighter uppercase italic text-lg leading-none">
            <span className="bg-blue-600 text-white w-8 h-8 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center text-[10px] not-italic">FX</span>
            Hızlı Satış
          </h3>
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1 italic">Isparta / Memonex Terminal</p>
        </div>
        <div className={`text-[8px] font-black px-2 py-1 rounded-md border tracking-tighter ${isPending ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
          {isPending ? 'İŞLENİYOR...' : 'SİSTEM AKTİF'}
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Müşteri Seçimi */}
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

        {/* Ürün Seçimi */}
        <div className="group space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
            Parça / SKU (F2)
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

      {/* Dinamik Bilgi Paneli */}
      <div className="h-[72px]">
        {selectedProduct ? (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in zoom-in-95 duration-200">
            <div className={`p-3 rounded-2xl border-2 flex flex-col justify-center ${Number(selectedProduct.stock_count) <= Number(selectedProduct.critical_limit) ? 'bg-red-50 border-red-100' : 'bg-blue-50/50 border-blue-100'}`}>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5 leading-none">Mevcut Stok</span>
              <span className={`text-[11px] font-black italic ${Number(selectedProduct.stock_count) <= Number(selectedProduct.critical_limit) ? 'text-red-600' : 'text-blue-600'}`}>
                 {selectedProduct.stock_count || 0} ADET {Number(selectedProduct.stock_count) <= Number(selectedProduct.critical_limit) && '⚠️'}
              </span>
            </div>
            <div className="p-3 rounded-2xl border-2 border-slate-100 bg-slate-50/50 flex flex-col justify-center">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5 leading-none">Raf Konumu</span>
              <span className="text-[11px] font-black text-slate-700 italic uppercase">LOC: {selectedProduct.shelf_no || 'YOK'}</span>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/20 italic text-[9px] font-black text-slate-300 uppercase tracking-widest">
            Ürün Bekleniyor...
          </div>
        )}
      </div>

      {/* Finansal Panel */}
      <div className="bg-slate-900 p-5 rounded-[32px] shadow-xl shadow-blue-100 flex items-center justify-between group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
        
        <div className="w-20 relative z-10">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">Miktar</label>
          <input 
            ref={qtyInputRef}
            disabled={isPending || !selectedProduct}
            type="number" 
            min="1"
            value={formData.qty}
            onFocus={(e) => e.target.select()}
            className="w-full bg-slate-800 border-none rounded-xl py-2 text-center font-black text-white outline-none ring-2 ring-slate-700 focus:ring-blue-500 transition-all text-lg"
            onChange={(e) => setFormData({...formData, qty: Math.max(1, Number(e.target.value))})}
          />
        </div>

        <div className="text-right relative z-10">
          <span className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] block mb-0.5">Ödenecek Tutar</span>
          <div className="flex items-end gap-1 leading-none">
            <span className="text-2xl font-black tracking-tighter text-white italic">
              {totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-blue-500 font-black text-[10px] mb-1">TL</span>
          </div>
        </div>
      </div>

      <button 
        type="submit"
        disabled={isPending || !selectedProduct}
        className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all disabled:opacity-30 disabled:grayscale"
      >
        {isPending ? 'İŞLENİYOR...' : 'SATIŞI TAMAMLA →'}
      </button>
    </form>
  );
}