'use client';
import { useState, useMemo, useTransition } from 'react';
import { createTransaction } from '@/app/actions/erp-actions';
import { useRouter } from 'next/navigation';

interface Item {
  id: string; // React listesi için benzersiz anahtar
  product_id: string;
  quantity: number;
  unit_price: number;
  tax_rate: number; // Mevzuat Uyumu
}

export function TransactionForm({ products, contacts }: { products: any[], contacts: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [contactId, setContactId] = useState('');
  const [docNo, setDocNo] = useState('');
  const [type, setType] = useState<'purchase' | 'sale'>('purchase');
  
  // Başlangıç satırı (%20 KDV varsayılan)
  const [items, setItems] = useState<Item[]>([
    { id: crypto.randomUUID(), product_id: '', quantity: 1, unit_price: 0, tax_rate: 20 }
  ]);

  const isSale = type === 'sale';

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), product_id: '', quantity: 1, unit_price: 0, tax_rate: 20 }]);
  };
  
  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof Item, value: any) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id !== id) return item;

      const updatedItem = { ...item, [field]: value };

      // Ürün seçildiğinde fiyatı ve KDV'yi otomatik doldur
      if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        if (product) {
          updatedItem.unit_price = isSale ? product.sell_price : product.purchase_price;
          updatedItem.tax_rate = product.tax_rate || 20;
        }
      }
      return updatedItem;
    }));
  };

  // --- MEVZUAT UYUMLU TOPLAM HESAPLAMA ---
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
    const taxTotal = items.reduce((sum, item) => {
      return sum + (Number(item.quantity || 0) * Number(item.unit_price || 0) * (item.tax_rate / 100));
    }, 0);
    return {
      subtotal,
      taxTotal,
      grandTotal: subtotal + taxTotal
    };
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactId) return alert("Lütfen bir cari seçin.");
    if (items.some(i => !i.product_id || i.quantity <= 0)) {
      return alert("Lütfen ürünleri ve miktarları kontrol edin.");
    }

    startTransition(async () => {
      const result = await createTransaction({
        contact_id: contactId,
        type,
        invoice_type: 'SATIS',
        doc_no: docNo || `MEM-${Date.now().toString(36).toUpperCase()}`,
        description: `Memonex ERP — ${isSale ? 'Satış' : 'Alım'} [${docNo || 'OTOMATİK'}]`,
        items: items.map(({ product_id, quantity, unit_price, tax_rate }) => ({
          product_id,
          quantity: Number(quantity),
          unit_price: Number(unit_price),
          tax_rate: Number(tax_rate)
        }))
      });

      if (result.success) {
        alert("İşlem başarıyla tamamlandı.");
        setItems([{ id: crypto.randomUUID(), product_id: '', quantity: 1, unit_price: 0, tax_rate: 20 }]);
        setContactId('');
        setDocNo('');
        router.refresh();
      } else {
        alert("Hata: " + result.error);
      }
    });
  };

  return (
    <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] border-2 border-slate-100 shadow-2xl shadow-slate-200/60 text-slate-900 max-w-6xl mx-auto transition-all">
      {/* Üst Başlık */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b-2 border-slate-50 pb-8 gap-6">
        <div>
          <h2 className="text-2xl font-black tracking-tighter flex items-center gap-3 uppercase italic">
            <span className={`w-12 h-12 flex items-center justify-center rounded-[18px] text-xl text-white shadow-lg ${isSale ? 'bg-blue-600 shadow-blue-100' : 'bg-emerald-600 shadow-emerald-100'}`}>
              {isSale ? '🧾' : '📦'}
            </span> 
            Fatura & Belge Girişi
          </h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2 italic">
            Memonex Stok Hareket Merkezi
          </p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 w-full md:w-auto">
          <button 
            type="button"
            onClick={() => setType('purchase')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black transition-all ${type === 'purchase' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}
          >
            STOK GİRİŞİ (ALIM)
          </button>
          <button 
            type="button"
            onClick={() => setType('sale')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black transition-all ${type === 'sale' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}
          >
            STOK ÇIKIŞI (SATIŞ)
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Cari ve Belge */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">İlgili Cari</label>
            <select 
              required
              className="w-full border-2 border-slate-50 p-4 rounded-2xl bg-slate-50 focus:border-slate-900 focus:bg-white outline-none font-bold transition-all shadow-sm text-slate-900"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
            >
              <option value="">Cari Hesap Seçiniz...</option>
              {contacts?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name?.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Evrak / Seri No</label>
            <input 
              className="w-full border-2 border-slate-50 p-4 rounded-2xl bg-slate-50 focus:border-slate-900 focus:bg-white outline-none font-bold transition-all shadow-sm text-slate-900"
              placeholder="Örn: MEM2026001"
              value={docNo}
              onChange={(e) => setDocNo(e.target.value)}
            />
          </div>
        </div>

        {/* Kalemler */}
        <div className="space-y-4">
          <label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] ml-2">Kalemler / Parçalar</label>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="group flex flex-col md:flex-row gap-4 items-start md:items-end bg-slate-50/50 p-5 rounded-[24px] border-2 border-transparent hover:border-slate-200 transition-all">
                <div className="flex-[4] w-full space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase ml-1">Parça / SKU</span>
                  <select 
                    required
                    className="w-full border-2 border-white p-3.5 rounded-xl bg-white text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
                    value={item.product_id}
                    onChange={(e) => updateItem(item.id, 'product_id', e.target.value)}
                  >
                    <option value="">Parça Seç...</option>
                    {products?.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name?.toUpperCase()} ({p.stock_count} Adet)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1 w-full space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase text-center block">Miktar</span>
                  <input 
                    type="number" required min="1"
                    className="w-full border-2 border-white p-3.5 rounded-xl bg-white text-sm font-black shadow-sm text-center outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                  />
                </div>

                <div className="flex-1 w-full space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase text-center block">KDV %</span>
                  <select 
                    className="w-full border-2 border-white p-3.5 rounded-xl bg-white text-sm font-black shadow-sm text-center outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
                    value={item.tax_rate}
                    onChange={(e) => updateItem(item.id, 'tax_rate', Number(e.target.value))}
                  >
                    <option value={20}>%20</option>
                    <option value={10}>%10</option>
                    <option value={0}>%0</option>
                  </select>
                </div>

                <div className="flex-2 w-full space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase text-right block">Birim Fiyat (TL)</span>
                  <input 
                    type="number" step="0.01" required
                    className="w-full border-2 border-white p-3.5 rounded-xl bg-white text-sm font-black shadow-sm text-right outline-none focus:ring-2 focus:ring-slate-900 text-blue-600"
                    value={item.unit_price}
                    onChange={(e) => updateItem(item.id, 'unit_price', Number(e.target.value))}
                  />
                </div>

                <button 
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="bg-white border border-slate-100 text-slate-300 hover:text-red-600 p-3.5 rounded-xl transition-all shadow-sm active:scale-90"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Alt Toplam ve Butonlar */}
        <div className="mt-8 pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <button 
            type="button"
            onClick={addItem}
            className="w-full md:w-auto text-[10px] bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest"
          >
            + YENİ KALEM EKLE
          </button>
          
          <div className="bg-slate-50 px-8 py-6 rounded-[30px] border border-slate-100 text-right min-w-[300px] w-full md:w-auto space-y-1">
            <div className="flex justify-between text-slate-400 font-bold text-[10px] uppercase">
              <span>Ara Toplam:</span>
              <span>{totals.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
            </div>
            <div className="flex justify-between text-slate-400 font-bold text-[10px] uppercase border-b border-slate-200 pb-1 mb-1">
              <span>Toplam KDV:</span>
              <span>{totals.taxTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block">Genel Toplam</span>
            <p className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">
              {totals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-sm font-bold text-blue-600 not-italic">TL</span>
            </p>
          </div>
        </div>

        <button 
          type="submit"
          disabled={isPending}
          className={`w-full mt-12 py-6 rounded-[28px] font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl flex items-center justify-center gap-4 ${
            isSale 
            ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700' 
            : 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700'
          } ${isPending ? 'opacity-70 cursor-not-allowed scale-98' : 'active:scale-95'}`}
        >
          {isPending ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>{isSale ? 'SATIŞI ONAYLA VE STOKTAN DÜŞ' : 'ALIMI ONAYLA VE STOĞA EKLE'} →</>
          )}
        </button>
      </form>
    </div>
  );
}