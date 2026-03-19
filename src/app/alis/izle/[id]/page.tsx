'use client';

import { supabase } from '@/lib/supabase';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PrintButton } from '@/components/PrintButton';
import { useState, useEffect, useTransition } from 'react';

// --- TÜR TANIMLAMALARI ---
interface TransactionItem {
  id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  products: { id: string; name: string; sku: string };
}

interface Transaction {
  id: string;
  type: 'sale' | 'purchase';
  doc_no: string;
  created_at: string;
  total_amount: number;
  description: string;
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
  const [isConfirming, setIsConfirming] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  // --- VERİ ÇEKME ---
  useEffect(() => {
    const fetchDetail = async () => {
      const resolvedParams = await params;
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          contacts (id, name, phone, address, balance),
          transaction_items (
            id, quantity, unit_price, line_total,
            products (id, name, sku)
          )
        `)
        .eq('id', resolvedParams.id)
        .maybeSingle();

      if (error || !data) return notFound();
      setTransaction(data as any);
      setLoading(false);
    };
    fetchDetail();
  }, [params]);

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
        return;
      }
      
      router.push('/?msg=cancelled');
      router.refresh();
    });
  };

  if (loading || !transaction) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafbfc]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-black uppercase tracking-widest text-slate-400 text-xs">Belge Hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  // --- DİNAMİK TEMA AYARLARI ---
  const isPurchase = transaction.type === 'purchase';
  const theme = {
    label: isPurchase ? 'Alım / Stok Girişi' : 'Satış / Çıkış',
    color: isPurchase ? 'bg-orange-600' : 'bg-blue-600',
    borderColor: isPurchase ? 'border-orange-100' : 'border-blue-100',
    textColor: isPurchase ? 'text-orange-600' : 'text-blue-600',
    subText: isPurchase ? 'Tedarikçi Bilgileri' : 'Müşteri Bilgileri'
  };

  return (
    <div className="p-4 md:p-12 max-w-5xl mx-auto bg-[#fafbfc] min-h-screen">
      
      {/* Üst Navigasyon ve Güvenli Aksiyonlar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 print:hidden">
        <button 
          onClick={() => router.back()} // Gerçek geri gitme fonksiyonu
          className="group flex items-center gap-4 text-slate-400 hover:text-slate-900 transition-all w-fit bg-transparent border-none p-0 cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl border-2 border-slate-100 flex items-center justify-center bg-white shadow-sm group-hover:bg-slate-900 group-hover:border-slate-900 group-hover:text-white transition-all duration-300 active:scale-90">
            <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span>
          </div>
          
          <div className="flex flex-col items-start leading-none text-left">
            <span className="font-black text-[10px] uppercase tracking-[0.3em] italic">Geri Dön</span>
            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.1em] mt-1 group-hover:text-blue-500 transition-colors">Önceki Sayfa</span>
          </div>
        </button>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {!isConfirming ? (
            <button 
              onClick={() => setIsConfirming(true)}
              className="flex-1 md:flex-none bg-white text-red-600 border-2 border-red-50 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
            >
              🚫 İşlemi İptal Et & Stok Düzelt
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-600 p-1.5 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200">
              <span className="text-[9px] font-black text-white px-3 uppercase italic">İptal edilsin mi?</span>
              <button 
                onClick={handleCancel}
                disabled={isPending}
                className="bg-white text-red-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-slate-50 transition-all active:scale-90"
              >
                {isPending ? '...' : 'EVET'}
              </button>
              <button 
                onClick={() => setIsConfirming(false)}
                className="text-white px-3 py-2 text-[10px] font-black hover:text-red-200 transition-colors uppercase italic"
              >
                VAZGEÇ
              </button>
            </div>
          )}
          <PrintButton /> 
        </div>
      </div>

      {/* Belge Gövdesi */}
      <div id="printable-area" className="bg-white border-2 border-slate-100 rounded-[48px] shadow-2xl overflow-hidden print:border-none print:shadow-none">
        {/* Dinamik Renk Şeridi */}
        <div className={`h-4 w-full ${theme.color}`}></div>
        
        <div className="p-8 md:p-16">
{/* Değişen Satır: flex-col kalsın ama print:flex-row ekle */}
<div className="flex flex-col md:flex-row print:flex-row justify-between items-start gap-8 print:gap-4 mb-20 print:mb-10">
  
  {/* SOL TARAF: Belge Başlığı ve No */}
  <div className="print:w-1/2">
    <h1 className="text-5xl print:text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.9]">
      {isPurchase ? 'Mal Alım' : 'Satış'} <br/>
      <span className={`${theme.textColor} not-italic`}>Belgesi</span>
    </h1>
    <div className="mt-6 print:mt-2 space-y-1">
      <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">
        Doküman No: {transaction.doc_no || '---'}
      </p>
      <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">
        Tarih: {new Date(transaction.created_at).toLocaleDateString('tr-TR')}
      </p>
    </div>
  </div>

  {/* SAĞ TARAF: Müşteri/Tedarikçi Bilgileri */}
  <div className={`bg-slate-50 print:bg-white p-8 print:p-4 rounded-[32px] print:rounded-none border-2 ${theme.borderColor} min-w-[300px] print:min-w-0 print:w-1/2 text-right`}>
    <span className={`text-[10px] font-black ${theme.textColor} uppercase tracking-widest block mb-4 print:mb-1 italic`}>
      {theme.subText}
    </span>
    <p className="text-xl print:text-lg font-black text-slate-900 italic uppercase">{transaction.contacts?.name}</p>
    <p className="text-sm print:text-xs text-slate-500 font-bold mt-2 print:mt-1">{transaction.contacts?.phone || 'Telefon Yok'}</p>
    <p className="text-[10px] text-slate-400 uppercase mt-2 font-bold leading-relaxed">{transaction.contacts?.address || ''}</p>
  </div>
</div>

          {/* Ürün Tablosu */}
          <div className="mb-20 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-black uppercase text-slate-400 border-b-4 border-slate-900">
                  <th className="pb-6 text-left tracking-widest">Parça / Ürün</th>
                  <th className="pb-6 text-center tracking-widest">Birim Fiyat</th>
                  <th className="pb-6 text-center tracking-widest">Miktar</th>
                  <th className="pb-6 text-right tracking-widest">Satır Toplamı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transaction.transaction_items?.map((item) => (
                  <tr key={item.id} className="italic group hover:bg-slate-50/50 transition-colors">
                    <td className="py-8">
                      <div className="font-black uppercase text-slate-900 text-base">{item.products?.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 not-italic uppercase tracking-tighter mt-1">SKU: {item.products?.sku}</div>
                    </td>
                    <td className="py-8 text-center font-bold text-slate-600">
                      {Number(item.unit_price).toLocaleString('tr-TR')} TL
                    </td>
                    <td className="py-8 text-center font-black text-slate-900">
                      {item.quantity} AD
                    </td>
                    <td className="py-8 text-right font-black text-slate-900 text-lg">
                      {Number(item.line_total).toLocaleString('tr-TR')} TL
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
{/* Alt Toplam Özeti - Memonex Optimized */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 pt-12 border-t-2 border-dashed border-slate-200">
            
            {/* SOL: Açıklama ve Ödeme Yöntemi */}
            <div className="text-left hidden md:block">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 italic">Notlar / Açıklama</p>
              <p className="text-slate-600 text-sm font-bold italic max-w-xs leading-relaxed uppercase tracking-tighter mb-4">
                {transaction.description || 'Bu belge sistem tarafından otomatik oluşturulmuştur.'}
              </p>
              <div className="flex items-center gap-2">
                 <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border border-slate-200">
                   💳 {transaction.payment_method || 'NAKİT'}
                 </span>
                 <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border border-blue-100">
                   📦 {transaction.transaction_items?.length || 0} KALEM
                 </span>
              </div>
            </div>
            
            {/* SAĞ: Finansal Detaylar ve Dev Toplam */}
            <div className="text-right w-full md:w-auto">
              <div className="space-y-1 mb-4 px-2">
                {/* Ara Toplam */}
                <div className="flex justify-end gap-12 text-[10px] font-black text-slate-400 uppercase italic tracking-widest">
                  <span>ARA TOPLAM</span>
                  <span className="text-slate-600">{Number(transaction.subtotal || 0).toLocaleString('tr-TR')} TL</span>
                </div>
                
                {/* İndirim (Eğer varsa göster) */}
                {Number(transaction.discount_total) > 0 && (
                  <div className="flex justify-end gap-12 text-[10px] font-black text-emerald-500 uppercase italic tracking-widest">
                    <span>TOPLAM İNDİRİM</span>
                    <span>-{Number(transaction.discount_total).toLocaleString('tr-TR')} TL</span>
                  </div>
                )}
                
                {/* KDV */}
                <div className="flex justify-end gap-12 text-[10px] font-black text-slate-400 uppercase italic tracking-widest">
                  <span>KDV TOPLAMI</span>
                  <span className="text-slate-600">{Number(transaction.tax_total || 0).toLocaleString('tr-TR')} TL</span>
                </div>
              </div>

              {/* ANA TOPLAM */}
              <span className={`text-[12px] font-black ${theme.textColor} uppercase block mb-1 italic tracking-widest`}>
                {isPurchase ? 'Ödenecek Toplam' : 'Tahsil Edilecek Toplam'}
              </span>
              <div className="text-6xl md:text-8xl font-black italic tracking-tighter text-slate-900 leading-none">
                {Number(transaction.total_amount).toLocaleString('tr-TR')} <small className="text-2xl ml-[-10px] not-italic">TL</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Baskı Alt Bilgisi */}
      <div className="hidden print:block mt-12 text-center border-t border-slate-100 pt-8">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Memonex ERP Systems • Dijital Arşiv Belgesi</p>
      </div>
    </div>
  );
}