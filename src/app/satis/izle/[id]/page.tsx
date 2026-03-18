'use client'; // Client bileşenine çeviriyoruz çünkü onay mekanizması state gerektirir

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
}

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isConfirming, setIsConfirming] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  // --- VERİ ÇEKME (Client Side) ---
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
        return;
      }
      
      router.push('/?msg=cancelled');
      router.refresh();
    });
  };

  if (loading || !transaction) return <div className="p-20 text-center font-black animate-pulse uppercase tracking-widest text-slate-300">Yükleniyor...</div>;

  return (
    <div className="p-4 md:p-12 max-w-5xl mx-auto bg-[#fafbfc] min-h-screen">
      
      {/* ÜST NAVİGASYON VE GÜVENLİ AKSİYONLAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 print:hidden">
        <Link href="/" className="group flex items-center gap-3 text-slate-400 hover:text-slate-900 transition-all">
          <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all text-xl">
            ←
          </div>
          <span className="font-black text-[11px] uppercase tracking-[0.2em]">Listeye Dön</span>
        </Link>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* ONAYLI İPTAL BUTONU */}
          {!isConfirming ? (
            <button 
              onClick={() => setIsConfirming(true)}
              className="flex-1 md:flex-none bg-white text-red-600 border-2 border-red-50 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm active:scale-95"
            >
              🚫 İşlemi İptal Et
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-600 p-1.5 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200">
              <span className="text-[9px] font-black text-white px-3 uppercase italic">Stoklar düzeltilsin mi?</span>
              <button 
                onClick={handleCancel}
                disabled={isPending}
                className="bg-white text-red-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-slate-50 transition-all active:scale-90 disabled:opacity-50"
              >
                {isPending ? '...' : 'EVET, İPTAL ET'}
              </button>
              <button 
                onClick={() => setIsConfirming(false)}
                className="text-white px-3 py-2 text-[10px] font-black hover:text-red-200"
              >
                VAZGEÇ
              </button>
            </div>
          )}
          <PrintButton /> 
        </div>
      </div>

      {/* BELGE GÖVDESİ */}
      <div id="printable-area" className="bg-white border-2 border-slate-100 rounded-[48px] shadow-2xl overflow-hidden print:border-none print:shadow-none">
        <div className={`h-4 w-full ${transaction.type === 'sale' ? 'bg-blue-600' : 'bg-amber-500'}`}></div>
        
        <div className="p-8 md:p-16">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-20">
            <div>
              <h1 className="text-5xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.9]">
                {transaction.type === 'sale' ? 'Satış' : 'Alım'} <br/>
                <span className={`${transaction.type === 'sale' ? 'text-blue-600' : 'text-amber-500'} not-italic`}>Belgesi</span>
              </h1>
              <div className="space-y-1 mt-6">
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Doküman No: {transaction.doc_no || '---'}</p>
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Tarih: {new Date(transaction.created_at).toLocaleDateString('tr-TR')} {new Date(transaction.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-8 rounded-[32px] border-2 border-slate-100 min-w-[300px]">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 italic underline decoration-blue-500 decoration-2 underline-offset-4">
                {transaction.type === 'sale' ? 'Müşteri Bilgileri' : 'Tedarikçi Bilgileri'}
              </span>
              <p className="text-xl font-black text-slate-900 italic uppercase">{transaction.contacts?.name}</p>
              <p className="text-sm text-slate-500 font-bold mt-2 tracking-tighter">{transaction.contacts?.phone || 'Telefon Belirtilmemiş'}</p>
              <p className="text-[10px] text-slate-400 uppercase mt-2 font-bold leading-relaxed">{transaction.contacts?.address || ''}</p>
            </div>
          </div>

          {/* Ürün Tablosu */}
          <div className="mb-20 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-black uppercase text-slate-400 border-b-4 border-slate-900">
                  <th className="pb-6 text-left">Parça / Ürün</th>
                  <th className="pb-6 text-center">Birim Fiyat</th>
                  <th className="pb-6 text-center">Miktar</th>
                  <th className="pb-6 text-right">Satır Toplamı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transaction.transaction_items?.map((item) => (
                  <tr key={item.id} className="italic group hover:bg-slate-50/50 transition-colors">
                    <td className="py-8">
                      <div className="font-black uppercase text-slate-900">{item.products?.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 not-italic uppercase tracking-tighter">SKU: {item.products?.sku}</div>
                    </td>
                    <td className="py-8 text-center font-bold text-slate-600">
                      {Number(item.unit_price).toLocaleString('tr-TR')} TL
                    </td>
                    <td className="py-8 text-center font-black text-slate-900">
                      {item.quantity} AD
                    </td>
                    <td className="py-8 text-right font-black text-slate-900">
                      {Number(item.line_total).toLocaleString('tr-TR')} TL
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Alt Toplam Özeti */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 pt-12 border-t-2 border-dashed border-slate-200">
            <div className="text-left hidden md:block">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 italic">Notlar / Açıklama</p>
              <p className="text-slate-600 text-sm font-bold italic max-w-xs leading-relaxed uppercase tracking-tighter">
                {transaction.description || 'Bu belge sistem tarafından otomatik oluşturulmuştur.'}
              </p>
            </div>
            
            <div className="text-right">
              <span className={`text-[12px] font-black uppercase block mb-2 italic ${transaction.type === 'sale' ? 'text-blue-600' : 'text-amber-500'}`}>
                {transaction.type === 'sale' ? 'Tahsil Edilecek Toplam' : 'Ödenecek Toplam'}
              </span>
              <div className="text-6xl md:text-8xl font-black italic tracking-tighter text-slate-900 leading-none">
                {Number(transaction.total_amount).toLocaleString('tr-TR')} <small className="text-2xl ml-[-10px]">TL</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden print:block mt-12 text-center border-t border-slate-100 pt-8">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Memonex ERP Systems • Dijital Arşiv Belgesi</p>
      </div>
    </div>
  );
}