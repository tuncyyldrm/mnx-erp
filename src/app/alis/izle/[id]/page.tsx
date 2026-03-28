'use client';

import { supabase } from '@/lib/supabase';
import { notFound, useRouter } from 'next/navigation';
import { PrintButton } from '@/components/PrintButton';
import { useState, useEffect, useTransition } from 'react';

// --- TÜR TANIMLAMALARI ---
interface TransactionItem {
  id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_id: string;
  products: { id: string; name: string; sku: string };
  tax_rate: number;   // Örn: 20
  tax_amount: number; // KDV tutarı
}

interface Transaction {
  id: string;
  type: 'sale' | 'purchase';
  doc_no: string;
  created_at: string;
  total_amount: number;
  description: string;
  contact_id: string;
  contacts: { id: string; name: string; phone: string; address: string; balance: number };
  transaction_items: TransactionItem[];
  subtotal: number;
  tax_total: number;
  discount_total: number;
  payment_method: string;
  status: 'taslak' | 'onaylandi' | 'gonderildi' | 'iptal' | 'reddedildi';
}

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [editData, setEditData] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

// --- VERİ ÇEKME (GÜZELTİLMİŞ) ---
const fetchDetail = async () => {
  try {
    setLoading(true);
    // 1. Params'ı çöz
    const resolvedParams = await params;
    
    if (!resolvedParams?.id) {
      console.error("ID bulunamadı");
      return;
    }

    // 2. Supabase sorgusu
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        contacts (id, name, phone, address, balance),
        transaction_items (
          id, 
          quantity, 
          unit_price, 
          line_total, 
          product_id,
          tax_rate,
          tax_amount,
          products (id, name, sku)
        )
      `)
      .eq('id', resolvedParams.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return notFound();
    
    setTransaction(data as any);
    setEditData(JSON.parse(JSON.stringify(data))); 
  } catch (err) {
    console.error("Veri çekme hatası:", err);
    alert("Veriler yüklenirken bir hata oluştu.");
  } finally {
    setLoading(false); // Hata olsa da olmasa da loading'i kapat
  }
};

  useEffect(() => { fetchDetail(); }, [params]);

// --- YARDIMCI: Tarih Formatla (G-A-Y S:D) ---
const formatForInput = (isoString: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  
  // Saniye atıldı: 28-03-2026 15:30
  return `${d}-${m}-${y} ${h}:${min}`;
};

  // --- KALEM GÜNCELLEME VE HESAPLAMA ---
const handleItemUpdate = (idx: number, field: 'quantity' | 'unit_price' | 'tax_rate', value: number) => {
  if (!editData) return;
  
  const newItems = [...editData.transaction_items];
  const item = { ...newItems[idx], [field]: value };
  
  // Ara toplam (KDV hariç)
  const rawLineTotal = item.quantity * item.unit_price;
  // KDV Tutarı (Satır bazlı)
  item.tax_amount = rawLineTotal * (item.tax_rate / 100);
  // Satır Toplamı (KDV dahil)
  item.line_total = rawLineTotal + item.tax_amount;
  
  newItems[idx] = item;

  // Fatura Geneli Hesaplama
  const newSubtotal = newItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
  const newTaxTotal = newItems.reduce((sum, i) => sum + i.tax_amount, 0);

  setEditData({
    ...editData,
    transaction_items: newItems,
    subtotal: newSubtotal,
    tax_total: newTaxTotal,
    total_amount: newSubtotal + newTaxTotal
  });
};
// --- KAYDETME AKSİYONU ---
const handleUpdate = async () => {
  if (!editData) return;
  
  startTransition(async () => {
    const { error } = await supabase.rpc('update_transaction_full_v2', {
      p_transaction_id: editData.id,
      p_header: {
        doc_no: editData.doc_no,
        created_at: editData.created_at,
        description: editData.description,
        payment_method: editData.payment_method,
        subtotal: editData.subtotal,
        tax_total: editData.tax_total,
        total_amount: editData.total_amount,
        status: editData.status
      },
      p_items: editData.transaction_items.map(item => ({
        product_id: item.product_id,
        quantity: Math.round(item.quantity), // Integer beklediği için yuvarladık
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        line_total: item.line_total
      }))
    });

    if (error) {
      alert("Hata Oluştu: " + error.message);
      console.error("Detay:", error);
      return;
    }

    setIsEditMode(false);
    await fetchDetail();
    router.refresh();
  });
};

  // --- İPTAL AKSİYONU ---
  const handleCancel = () => {
    startTransition(async () => {
      if (!transaction) return;
      const { error: cancelError } = await supabase.rpc('cancel_transaction', {
        p_transaction_id: transaction.id
      });

      if (cancelError) {
        alert("İptal Hatası: " + cancelError.message);
        setIsConfirming(false);
      } else {
        router.push('/?msg=cancelled');
        router.refresh();
      }
    });
  };

  if (loading || !transaction || !editData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafbfc]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-black uppercase tracking-widest text-slate-400 text-xs text-center">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const isPurchase = transaction.type === 'purchase';
  const theme = {
    color: isPurchase ? 'bg-orange-600' : 'bg-blue-600',
    textColor: isPurchase ? 'text-orange-600' : 'text-blue-600',
    borderColor: isPurchase ? 'border-orange-100' : 'border-blue-100',
    focus: isPurchase ? 'focus:ring-orange-500' : 'focus:ring-blue-500'
  };

  const displayData = isEditMode ? editData : transaction;

  return (
    <div className="p-4 md:p-12 max-w-5xl mx-auto bg-[#fafbfc] min-h-screen">
      
      {/* Üst Kontrol Paneli */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 print:hidden">
        <button onClick={() => router.back()} className="group flex items-center gap-4 text-slate-400 hover:text-slate-900 transition-all">
          <div className="w-11 h-11 rounded-2xl border-2 border-slate-100 flex items-center justify-center bg-white shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-all">←</div>
          <div className="text-left leading-none">
            <span className="font-black text-[10px] uppercase tracking-[0.3em] italic">Geri Dön</span>
          </div>
        </button>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {!isEditMode ? (
            <>
              <button onClick={() => setIsEditMode(true)} className="bg-white text-slate-600 border-2 border-slate-100 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                ✏️ Bilgileri Düzenle
              </button>
              {!isConfirming ? (
                <button onClick={() => setIsConfirming(true)} className="bg-white text-red-600 border-2 border-red-50 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm">
                  🚫 İptal & Stok Düzelt
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-red-600 p-1.5 rounded-2xl shadow-xl">
                  <span className="text-[9px] font-black text-white px-3 uppercase italic">İptal Edilsin mi?</span>
                  <button onClick={handleCancel} disabled={isPending} className="bg-white text-red-600 px-4 py-2 rounded-xl text-[10px] font-black">EVET</button>
                  <button onClick={() => setIsConfirming(false)} className="text-white px-3 py-2 text-[10px] font-black italic">VAZGEÇ</button>
                </div>
              )}
              <PrintButton />
            </>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={handleUpdate} disabled={isPending} className="bg-green-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg">
                {isPending ? 'KAYDEDİLİYOR...' : '✅ DEĞİŞİKLİKLERİ KAYDET'}
              </button>
              <button onClick={() => { setIsEditMode(false); setEditData(JSON.parse(JSON.stringify(transaction))); }} className="text-slate-400 font-black text-[10px] uppercase hover:text-slate-900 px-4">
                İptal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Belge Gövdesi */}
      <div id="printable-area" className="bg-white border-2 border-slate-100 rounded-[48px] shadow-2xl overflow-hidden">
        <div className={`h-4 w-full ${theme.color}`}></div>
        
        <div className="p-8 md:p-16">
          <div className="flex flex-col md:flex-row print:flex-row justify-between items-start gap-8 mb-20">
            <div className="print:w-1/2 flex-1">
              <h1 className="text-5xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.9]">
                {isPurchase ? 'Mal Alım' : 'Satış'} <br/>
                <span className={`${theme.textColor} not-italic`}>Belgesi</span>
              </h1>

              <div className="mt-8 space-y-4 max-w-xs">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Doküman No</label>
                  {isEditMode ? (
                    <input value={editData.doc_no || ''} onChange={e => setEditData({...editData, doc_no: e.target.value})} className={`w-full bg-slate-50 border-none rounded-xl p-3 font-black text-xs uppercase focus:ring-2 ${theme.focus}`} />
                  ) : (
                    <p className="text-slate-900 font-black uppercase text-xs tracking-widest">{transaction.doc_no || '---'}</p>
                  )}
                </div>
<div>
  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tarih</label>
  {isEditMode ? (
    <div className="flex gap-2">
      <div className="relative flex-1 group">
        <input 
          key={editData.created_at}
          type="text" 
          defaultValue={formatForInput(editData.created_at)} 
          placeholder="28-03-2026 15:30"
          onBlur={(e) => {
            const val = e.target.value;
            if (!val || !val.includes('-')) return;
            try {
              const [datePart, timePart] = val.split(' ');
              const [d, m, y] = datePart.split('-');
              const isoFriendly = `${y}-${m}-${d}T${timePart}`;
              const parsedDate = new Date(isoFriendly);
              if (!isNaN(parsedDate.getTime())) {
                setEditData({ ...editData, created_at: parsedDate.toISOString() });
              }
            } catch (e) { console.error("Format hatası"); }
          }}
          className={`w-full bg-slate-50 border-none rounded-xl p-3 pr-10 font-black text-xs focus:ring-2 ${theme.focus}`} 
        />
        
        {/* Gizli Takvim Tetikleyici */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform">
          <span className="text-lg" onClick={() => (document.getElementById('hidden-date-picker') as any).showPicker()}>📅</span>
          <input 
            id="hidden-date-picker"
            type="datetime-local"
            className="absolute opacity-0 pointer-events-none"
            onChange={(e) => {
              if (e.target.value) {
                setEditData({ ...editData, created_at: new Date(e.target.value).toISOString() });
              }
            }}
          />
        </div>
      </div>

      <button 
        type="button"
        onClick={() => setEditData({ ...editData, created_at: new Date().toISOString() })}
        className="bg-slate-200 text-slate-600 px-4 rounded-xl text-[10px] font-black hover:bg-slate-900 hover:text-white transition-all shadow-sm"
      >
        ŞİMDİ
      </button>
    </div>
  ) : (
    <p className="text-slate-900 font-black uppercase text-xs tracking-widest leading-none">
      {new Date(transaction.created_at).toLocaleString('tr-TR', { 
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
      })}
    </p>
  )}
</div>
              </div>
            </div>

            <div className={`bg-slate-50 p-8 rounded-[32px] border-2 ${theme.borderColor} min-w-[300px] text-right`}>
              <span className={`text-[10px] font-black ${theme.textColor} uppercase tracking-widest block mb-4 italic`}>
                {isPurchase ? 'Tedarikçi Bilgileri' : 'Müşteri Bilgileri'}
              </span>
              <p className="text-xl font-black text-slate-900 italic uppercase">{transaction.contacts?.name}</p>
              <p className="text-sm text-slate-500 font-bold mt-2">{transaction.contacts?.phone || '---'}</p>
              <p className="text-[10px] text-slate-400 uppercase mt-2 font-bold leading-relaxed max-w-[200px] ml-auto">{transaction.contacts?.address}</p>
            </div>
          </div>

          <div className="mb-20 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-black uppercase text-slate-400 border-b-4 border-slate-900">
                  <th className="pb-6 text-left tracking-widest">Ürün</th>
                  <th className="pb-6 text-center tracking-widest">Birim Fiyat</th>
                  <th className="pb-6 text-center tracking-widest  print:hidden">KDV</th>
                  <th className="pb-6 text-center tracking-widest">Miktar</th>
                  <th className="pb-6 text-right tracking-widest">Satır Toplamı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayData.transaction_items?.map((item, idx) => (
                  <tr key={item.id} className="italic group">
                    <td className="py-8">
                      <div className="font-black uppercase text-slate-900 text-base">{item.products?.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 not-italic uppercase mt-1">SKU: {item.products?.sku}</div>
                    </td>
                    
                    <td className="py-8 text-center">
                      {isEditMode ? (
                        <input type="number" value={item.unit_price} onChange={e => handleItemUpdate(idx, 'unit_price', Number(e.target.value))} className={`w-28 bg-slate-50 border-none rounded-xl p-2 font-bold text-center focus:ring-2 ${theme.focus}`} />
                      ) : (
                        <span className="font-bold text-slate-600">{Number(item.unit_price).toLocaleString('tr-TR')} TL</span>
                      )}
                    </td>
                    <td className="py-8 text-center  print:hidden">
                      {isEditMode ? (
                        <select 
                          value={item.tax_rate} 
                          onChange={e => handleItemUpdate(idx, 'tax_rate', Number(e.target.value))}
                          className="bg-slate-50 border-none rounded-xl p-2 font-black text-xs"
                        >
                          <option value={0}>%0</option>
                          <option value={10}>%10</option>
                          <option value={20}>%20</option>
                        </select>
                      ) : (
                        <span className="font-bold text-slate-500">%{item.tax_rate}</span>
                      )}
                    </td>
                    <td className="py-8 text-center">
                      {isEditMode ? (
                        <input type="number" value={item.quantity} onChange={e => handleItemUpdate(idx, 'quantity', Number(e.target.value))} className={`w-20 bg-slate-50 border-none rounded-xl p-2 font-black text-center focus:ring-2 ${theme.focus}`} />
                      ) : (
                        <span className="font-black text-slate-900">{item.quantity} AD</span>
                      )}
                    </td>
                    <td className="py-8 text-right font-black text-slate-900 text-lg">
                      {Number(item.line_total).toLocaleString('tr-TR')} TL
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-end gap-8 pt-12 border-t-2 border-dashed border-slate-200">
            <div className="text-left flex-1 print:hidden" >
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 italic">Açıklama</p>
              {isEditMode ? (
                <textarea value={editData.description || ''} onChange={e => setEditData({...editData, description: e.target.value})} className={`w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm uppercase italic focus:ring-2 ${theme.focus}`} rows={3} />
              ) : (
                <p className="text-slate-600 text-sm font-bold italic max-w-xs leading-relaxed uppercase tracking-tighter">
                  {transaction.description || 'Bu belge Memonex tarafından otomatik oluşturulmuştur.'}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                {isEditMode ? (
                  <select value={editData.payment_method} onChange={e => setEditData({...editData, payment_method: e.target.value})} className={`bg-slate-100 text-slate-900 text-[10px] font-black px-4 py-2 rounded-xl uppercase border-none focus:ring-2 ${theme.focus}`}>
                    <option value="NAKİT">NAKİT</option>
                    <option value="KREDİ KARTI">KREDİ KARTI</option>
                    <option value="HAVALE/EFT">HAVALE/EFT</option>
                  </select>
                ) : (
                  <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-3 py-1 rounded-full uppercase border border-slate-200">
                    💳 {transaction.payment_method || 'NAKİT'}
                  </span>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="space-y-1 mb-4">
                <div className="flex justify-end gap-12 text-[10px] font-black text-slate-400 uppercase italic tracking-widest">
                  <span>ARA TOPLAM</span>
                  <span className="text-slate-600">{Number(displayData.subtotal).toLocaleString('tr-TR')} TL</span>
                </div>
                <div className="flex justify-end gap-12 text-[10px] font-black text-slate-400 uppercase italic tracking-widest">
                  <span>KDV (%20)</span>
                  <span className="text-slate-600">{Number(displayData.tax_total).toLocaleString('tr-TR')} TL</span>
                </div>
              </div>
              <span className={`text-[12px] font-black ${theme.textColor} uppercase block mb-1 italic tracking-widest`}>Genel Toplam</span>
              <div className="text-6xl md:text-8xl font-black italic tracking-tighter text-slate-900 leading-none">
                {Number(displayData.total_amount).toLocaleString('tr-TR')} <small className="text-2xl ml-[-10px] not-italic">TL</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}