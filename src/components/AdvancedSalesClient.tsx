'use client';
import { useState, useMemo, useTransition } from 'react';
import { createTransaction } from '@/app/actions/erp-actions';
import { useRouter } from 'next/navigation';

interface BasketItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  stock_count: number;
  tax_rate: number; // Mevzuat için eklendi
}

interface AdvancedSalesProps {
  products: any[];
  contacts: any[];
  mode?: 'sale' | 'purchase'; 
}

export default function AdvancedSalesClient({ 
  products = [], 
  contacts = [], 
  mode = 'sale' 
}: AdvancedSalesProps) {
  
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isPurchase = mode === 'purchase';

  // --- TEMA AYARLARI ---
  const theme = {
    color: isPurchase ? 'orange' : 'blue',
    bg: isPurchase ? 'bg-orange-600' : 'bg-blue-600',
    hover: isPurchase ? 'hover:bg-orange-700' : 'hover:bg-blue-700',
    border: isPurchase ? 'focus:border-orange-500' : 'focus:border-blue-500',
    text: isPurchase ? 'text-orange-600' : 'text-blue-600',
    button: isPurchase ? '💾 STOK GİRİŞİNİ KAYDET' : '💾 SATIŞI ONAYLA VE YAZDIR'
  };

  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [selectedContact, setSelectedContact] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [docNo, setDocNo] = useState(`${isPurchase ? 'AL' : 'ST'}-${Date.now().toString().slice(-6)}`);

  const addToBasket = (product: any) => {
    const exists = basket.find(item => item.id === product.id);
    const defaultPrice = isPurchase ? (product.purchase_price || 0) : (product.sell_price || 0);

    if (exists) {
      setBasket(basket.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setBasket([{
        id: product.id,
        sku: product.sku,
        name: product.name,
        quantity: 1,
        unit_price: defaultPrice,
        stock_count: product.stock_count,
        tax_rate: product.tax_rate || 20 // Varsayılan KDV %20
      }, ...basket]);
    }
    setSearchQuery('');
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLocaleLowerCase('tr');
    if (!query) return [];
    return products.filter((p: any) => 
      p.name?.toLocaleLowerCase('tr').includes(query) ||
      p.sku?.toLocaleLowerCase('tr').includes(query)
    ).slice(0, 8);
  }, [products, searchQuery]);

  // --- MEVZUAT UYUMLU HESAPLAMA ---
  const totals = useMemo(() => {
    const subtotal = basket.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const taxTotal = basket.reduce((acc, item) => {
      return acc + (item.quantity * item.unit_price * (item.tax_rate / 100));
    }, 0);
    return {
      subtotal,
      taxTotal,
      grandTotal: subtotal + taxTotal
    };
  }, [basket]);

  const handleSave = async () => {
    if (!selectedContact) return alert("Lütfen bir Cari seçiniz!");
    if (basket.length === 0) return alert("Sepetiniz boş!");

    if (!isPurchase) {
      const outOfStock = basket.find(i => i.quantity > i.stock_count);
      if (outOfStock) return alert(`${outOfStock.name} için yeterli stok yok!`);
    }

    startTransition(async () => {
      const result = await createTransaction({
        contact_id: selectedContact,
        type: mode,
        invoice_type: 'SATIS', // GİB Standart Tip
        items: basket.map(i => ({ 
          product_id: i.id, 
          quantity: i.quantity, 
          unit_price: i.unit_price,
          tax_rate: i.tax_rate
        })),
        description: `${docNo} nolu belge ile sistem girişi yapıldı.`
      });

      if (result.success) {
        setBasket([]);
        setDocNo(`${isPurchase ? 'AL' : 'ST'}-${Date.now().toString().slice(-6)}`);
        router.refresh();
        alert(isPurchase ? "Alım başarıyla işlendi." : "Satış fişi oluşturuldu.");
        // İsteğe bağlı: Fatura ID'si ile PDF'e yönlendirilebilir -> router.push(`/satis/izle/${result.id}`)
      } else {
        alert("Hata oluştu: " + result.error);
      }
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-8 bg-slate-50 min-h-screen">
      
      {/* SOL: ÜRÜN SEÇİCİ */}
      <div className="lg:w-1/3 space-y-6">
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
          <h2 className={`font-black uppercase italic ${theme.text} mb-4 flex items-center gap-2`}>
            {isPurchase ? '📦 Mal Kabul' : '🛒 Ürün Çıkışı'}
          </h2>
          <input 
            className={`w-full p-4 bg-slate-100 rounded-2xl border-2 border-transparent ${theme.border} outline-none font-bold transition-all text-slate-900`}
            placeholder="SKU veya Ürün Ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-3">
{/* SOL: ÜRÜN SEÇİCİ - Kart Tasarımı Güncellendi */}
{filteredProducts.map((p: any) => (
  <div 
    key={p.id} 
    onClick={() => addToBasket(p)} 
    className="bg-white p-3 rounded-2xl border-2 border-white hover:border-slate-200 cursor-pointer shadow-sm active:scale-95 transition-all flex gap-3 items-center"
  >
    {/* Küçük Önizleme Görseli */}
    <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-50">
      {p.image_url ? (
        <img src={p.image_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-300 font-bold">YOK</div>
      )}
    </div>
    
    <div className="flex-grow overflow-hidden">
      <div className="flex justify-between items-start">
        <span className="text-[9px] font-black text-slate-400 truncate w-20 uppercase">{p.sku}</span>
        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${p.stock_count > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
           STOK: {p.stock_count}
        </span>
      </div>
      <p className="text-[11px] font-black uppercase text-slate-800 truncate leading-none mt-0.5">{p.name}</p>
    </div>
  </div>
))}
        </div>
      </div>

      {/* SAĞ: SEPET VE DETAYLAR */}
      <div className="lg:flex-1 bg-white p-6 md:p-10 rounded-[48px] shadow-2xl border border-slate-100 flex flex-col">
        
        {/* CARİ VE BELGE BİLGİSİ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">{isPurchase ? 'Tedarikçi' : 'Müşteri'}</label>
            <select 
              value={selectedContact} 
              onChange={(e) => setSelectedContact(e.target.value)} 
              className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-slate-700 outline-none focus:border-slate-900 transition-all"
            >
              <option value="">Cari Seçiniz...</option>
              {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Belge/Evrak No</label>
            <input 
              value={docNo} 
              onChange={(e) => setDocNo(e.target.value)} 
              className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-slate-700 uppercase" 
            />
          </div>
        </div>

        {/* SEPET LİSTESİ */}
        <div className="flex-grow overflow-x-auto">
          <table className="w-full min-w-[700px] border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-[11px] font-black uppercase text-slate-300">
                <th className="px-4 pb-2">Ürün Bilgisi</th>
                <th className="text-center pb-2">Miktar</th>
                <th className="text-center pb-2">KDV</th>
                <th className="text-right pb-2">Birim Fiyat</th>
                <th className="text-right pb-2">Toplam (KDVli)</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {basket.map(item => (
                <tr key={item.id} className="group">
                  <td className="bg-slate-50 p-4 rounded-l-2xl">
                    <p className="font-black text-xs text-slate-800 uppercase leading-none">{item.name}</p>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.sku}</span>
                  </td>
                  <td className="bg-slate-50 p-4 text-center">
                    <input 
                      type="number" 
                      value={item.quantity} 
                      onChange={(e) => setBasket(basket.map(i => i.id === item.id ? {...i, quantity: Math.max(1, +e.target.value)} : i))} 
                      className={`w-16 text-center p-2 rounded-xl font-black text-sm border-2 transition-all text-slate-900
                        ${!isPurchase && item.quantity > item.stock_count ? 'border-red-500 bg-red-50 text-red-600' : 'border-transparent bg-white'}
                      `} 
                    />
                  </td>
                  <td className="bg-slate-50 p-4 text-center">
                    <select 
                      value={item.tax_rate}
                      onChange={(e) => setBasket(basket.map(i => i.id === item.id ? {...i, tax_rate: +e.target.value} : i))}
                      className="bg-white p-2 rounded-xl font-black text-xs border-2 border-transparent focus:border-slate-300 text-slate-800"
                    >
                      <option value={20}>%20</option>
                      <option value={10}>%10</option>
                      <option value={0}>%0</option>
                    </select>
                  </td>
                  <td className="bg-slate-50 p-4 text-right">
                    <input 
                      type="number" 
                      value={item.unit_price} 
                      onChange={(e) => setBasket(basket.map(i => i.id === item.id ? {...i, unit_price: +e.target.value} : i))} 
                      className="w-24 text-right p-2 rounded-xl font-black text-sm bg-white border-2 border-transparent focus:border-slate-300 outline-none text-slate-900" 
                    />
                  </td>
                  <td className="bg-slate-50 p-4 text-right font-black text-slate-900">
                    {(item.quantity * item.unit_price * (1 + item.tax_rate / 100)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </td>
                  <td className="bg-slate-50 p-4 rounded-r-2xl text-center">
                    <button onClick={() => setBasket(basket.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-red-500 transition-colors font-bold">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {basket.length === 0 && <div className="text-center py-20 text-slate-300 font-black italic uppercase tracking-widest">Sepet Henüz Boş</div>}
        </div>

        {/* ALT TOPLAM VE AKSİYON */}
        <div className="mt-8 pt-8 border-t-4 border-slate-900 flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="space-y-1 text-right md:text-left w-full md:w-auto">
            <div className="flex justify-between md:justify-start md:gap-10 text-slate-400 font-bold text-xs uppercase">
              <span>Ara Toplam:</span>
              <span>{totals.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
            </div>
            <div className="flex justify-between md:justify-start md:gap-10 text-slate-400 font-bold text-xs uppercase">
              <span>Toplam KDV:</span>
              <span>{totals.taxTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
            </div>
            <p className={`text-[11px] font-black ${theme.text} uppercase tracking-[0.4em] pt-2`}>Genel Toplam</p>
            <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter text-slate-900 leading-none">
              {totals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-2xl not-italic font-bold text-slate-400">TL</span>
            </h2>
          </div>
          
          <button 
            disabled={isPending || basket.length === 0}
            onClick={handleSave}
            className={`w-full md:w-auto ${isPending ? 'bg-slate-200 cursor-not-allowed text-slate-400' : theme.bg + ' ' + theme.hover + ' text-white'} px-12 py-6 rounded-[28px] font-black text-xl shadow-2xl transition-all active:scale-95`}
          >
            {isPending ? 'KAYDEDİLİYOR...' : theme.button}
          </button>
        </div>
      </div>
    </div>
  );
}