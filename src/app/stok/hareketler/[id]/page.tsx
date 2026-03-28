'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ProductModal } from '@/components/ProductModal';
import { DeleteProductButton } from '@/components/DeleteProductButton';
import { SupplierOfferTable } from '@/components/SupplierOfferTable';
import { ClickableImage } from '@/components/ClickableImage'; // Yeni bileşen
import { 
  ArrowLeft, 
  Package, 
  Calendar, 
  Hash, 
  Info,
  ArrowRight, 
  Box
} from 'lucide-react';

export default function UrunHareketPage() {
  const { id } = useParams();
  const router = useRouter();
  
  // --- STATE YÖNETİMİ ---
  const [product, setProduct] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'offers'>('history');

  // --- VERİ ÇEKME FONKSİYONU ---
  const fetchAllData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [prodRes, moveRes, offerRes, supplierRes] = await Promise.all([
        supabase.from('products').select('*').eq('id', id).single(),
        supabase.from('stock_movements').select(`
          id, type, quantity, prev_stock, next_stock, description, source_type, created_at, 
          transaction_items (unit_price, line_total, transactions (id, type, doc_no, contacts (name)))
        `).eq('product_id', id).order('created_at', { ascending: false }),
        supabase.from('product_supplier_offers').select(`*, contacts:supplier_id (name)`).eq('product_id', id).order('unit_price', { ascending: true }),
        supabase.from('contacts').select('id, name').or('type.eq.supplier,type.eq.both').eq('is_deleted', false)
      ]);

      const realTransactions = (moveRes.data || []).filter(m => {
        const isInvoice = m.transaction_items !== null;
        const isAdjustment = m.source_type === 'ADJUSTMENT' || m.type === 'ADJUSTMENT' || 
                             m.description?.toUpperCase().includes('DÜZELTME') ||
                             m.description?.toUpperCase().includes('SAYIM');
        const isNotSystemLog = !m.description?.toUpperCase().includes('SİSTEM') && 
                               !m.description?.toUpperCase().includes('DELETE') &&
                               m.source_type !== 'SYSTEM';
        return (isInvoice || isAdjustment) && isNotSystemLog;
      });

      if (prodRes.data) {
        setProduct(prodRes.data);
        setMovements(realTransactions);
        setOffers(offerRes.data || []);
        setSuppliers(supplierRes.data || []);
      }
    } catch (err) {
      console.error("Memonex Sistem Hatası:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const totalIn = movements.filter(m => m.type === 'IN').reduce((acc, curr) => acc + curr.quantity, 0);
  const totalOut = movements.filter(m => m.type === 'OUT').reduce((acc, curr) => acc + Math.abs(curr.quantity), 0);

  if (loading) return <LoadingSpinner />;
  if (!product) return <ProductNotFoundState router={router} />;

  return (
    <div className="p-4 md:p-12 max-w-[1500px] mx-auto text-slate-900 bg-[#F8FAFC] min-h-screen font-sans text-left">
      
      {/* ÜST PANEL: NAVİGASYON */}
      <div className="flex flex-col gap-10 mb-12">
        <button 
          onClick={() => router.back()} 
          className="group flex items-center gap-4 text-slate-400 hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-[0.3em]"
        >
          <div className="w-12 h-12 rounded-[18px] border-2 border-slate-100 bg-white flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all shadow-sm">
            <ArrowLeft size={18} />
          </div>
          GERİ DÖN
        </button>

        {/* ÜRÜN BİLGİ KARTI */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-3 md:p-5 rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
          <div className="absolute top-6 left-8 transform -translate-y-1/2 bg-slate-900 text-white px-4 py-1 rounded-full text-[7px] font-black tracking-[0.2em] uppercase italic z-10">
            ÜRÜN KARTI
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full lg:w-[65%]">
            {/* Görsel Alanı - ClickableImage ile revize edildi */}
            <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 bg-white rounded-[24px] md:rounded-[32px] overflow-hidden border-4 border-white shadow-2xl relative group ring-1 ring-slate-100">
              {product.image_url ? (
                <ClickableImage 
                  src={product.image_url} 
                  alt={product.name} 
                  className="w-full h-full" 
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white italic">
                  <span className="font-black text-3xl">{product.sku?.substring(0, 2)}</span>
                  <span className="text-[8px] font-bold tracking-widest opacity-40 uppercase mt-1">GÖRSEL YOK</span>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center w-full text-left text-left">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-blue-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-blue-200">
                    <Hash size={10} /> {product.sku}
                  </span>
                  <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase">
                    {product.brand || 'MARKASIZ'}
                  </span>
                  <span className="text-slate-400 font-bold text-[9px] uppercase italic tracking-tighter">
                    / {product.category}
                  </span>
                </div>

                <h1 className="text-l md:text-1xl font-black leading-[1.1] text-slate-900 uppercase italic tracking-tight text-left">
                  {product.name}
                </h1>

                <div className="grid grid-cols-3 gap-4 py-2 my-1 border-y border-slate-50">
                  <div className="flex flex-col text-left">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">OEM KODU</span>
                    <span className="text-[11px] font-bold text-slate-700 truncate">{product.oem_code || '---'}</span>
                  </div>
                  <div className="flex flex-col border-l border-slate-100 pl-4 text-left">
                    <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest">RAF KONUMU</span>
                    <span className="text-[11px] font-black text-slate-900 italic">{product.shelf_no || '---'}</span>
                  </div>
                  <div className="flex flex-col border-l border-slate-100 pl-4 text-left">
                    <span className="text-[7px] font-black text-red-500 uppercase tracking-widest">KRİTİK STOK</span>
                    <span className="text-[11px] font-bold text-slate-700">{product.critical_limit} <small className="text-[9px] opacity-60">{product.unit}</small></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <ProductModal editData={product} trigger={
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-blue-600 transition-all font-black text-[10px] uppercase tracking-widest">
                      DÜZENLE <ArrowRight size={12} />
                    </button>
                  } />
                  <div className="flex-1 md:flex-none">
                    <DeleteProductButton id={product.id} name={product.name} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full lg:w-[30%]">
            <div className="bg-gradient-to-br from-blue-50/50 to-transparent p-3 rounded-2xl border border-blue-100/50 flex justify-between items-center text-left">
              <div className="text-left">
                <span className="block text-[7px] font-black text-blue-400 uppercase mb-0.5">SATIŞ FİYATI</span>
                <span className="text-xl font-black text-blue-600 italic leading-none text-left">
                  {product.sell_price?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <small className="text-[10px] ml-0.5 font-bold">TL</small>
                </span>
              </div>
              <div className="text-right border-l border-blue-100/50 pl-3">
                <span className="block text-[7px] font-bold text-slate-400 uppercase">KDV (%{product.tax_rate})</span>
                <span className="text-[10px] font-black text-slate-500 italic">
                  {(product.sell_price * (1 + product.tax_rate / 100)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
                <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
                    <span className="block text-[7px] font-black text-emerald-500 uppercase mb-0.5">GİRİŞ</span>
                    <span className="text-xs font-black text-slate-700">{totalIn} <small className="text-[8px] text-slate-400">{product.unit}</small></span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
                    <span className="block text-[7px] font-black text-red-500 uppercase mb-0.5">ÇIKIŞ</span>
                    <span className="text-xs font-black text-slate-700">{totalOut} <small className="text-[8px] text-slate-400">{product.unit}</small></span>
                </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl text-center relative group overflow-hidden shadow-lg text-left">
                <Box size={50} className="absolute -right-3 -bottom-3 text-white/[0.03] -rotate-12" />
                <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5 relative z-10">MEVCUT STOK</span>
                <div className="flex items-center justify-center gap-1 relative z-10">
                  <span className="text-3xl font-black text-white italic tracking-tighter">
                    {product.stock_count}
                  </span>
                  <span className="text-[9px] font-black text-blue-400 uppercase italic self-end mb-1">{product.unit}</span>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* ANA TAB PANELİ */}
      <div className="bg-white border-2 border-slate-100 rounded-[64px] shadow-sm overflow-hidden mb-20 text-left">
        <div className="p-10 border-b-2 border-slate-50 bg-slate-50/20 flex flex-col md:flex-row justify-between items-center gap-8 text-left">
          <div className="flex flex-wrap gap-8 md:gap-16 text-left">
            <button onClick={() => setActiveTab('history')} className="flex items-center gap-4 group cursor-pointer text-left">
              <div className={`w-3 h-10 rounded-full transition-all duration-500 transform ${activeTab === 'history' ? 'bg-slate-900 scale-y-110 shadow-[0_0_15px_rgba(15,23,42,0.3)]' : 'bg-slate-200 group-hover:bg-slate-400 group-hover:scale-y-90'}`}></div>
              <div className="flex flex-col items-start text-left">
                <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${activeTab === 'history' ? 'text-slate-400' : 'text-slate-200'}`}>KAYITLAR</span>
                <h2 className={`font-black italic uppercase tracking-tighter text-3xl transition-all ${activeTab === 'history' ? 'text-slate-900 translate-x-1' : 'text-slate-300'} text-left`}>İŞLEM GEÇMİŞİ</h2>
              </div>
            </button>

            <button onClick={() => setActiveTab('offers')} className="flex items-center gap-4 group cursor-pointer text-left">
              <div className={`w-3 h-10 rounded-full transition-all duration-500 transform ${activeTab === 'offers' ? 'bg-blue-600 scale-y-110 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-200 group-hover:bg-slate-400 group-hover:scale-y-90'}`}></div>
              <div className="flex flex-col items-start text-left text-left">
                <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${activeTab === 'offers' ? 'text-blue-400' : 'text-slate-200'}`}>ANALİZ</span>
                <h2 className={`font-black italic uppercase tracking-tighter text-3xl transition-all ${activeTab === 'offers' ? 'text-slate-900 translate-x-1' : 'text-slate-300'} text-left`}>TEKLİFLER</h2>
              </div>
            </button>
          </div>
          <div className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest animate-pulse text-left">
            {activeTab === 'offers' ? 'Tedarik fiyatları listeleniyor...' : 'Sistem hareketleri listeleniyor...'}
          </div>
        </div>

        <div className="min-h-[400px] text-left">
          {activeTab === 'history' ? (
            <>
              <div className="hidden md:block overflow-x-auto text-left">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 border-b border-slate-50 bg-white text-left">
                      <th className="p-12">Tarih / Saat</th>
                      <th className="p-12">İşlem & Cari Detay</th>
                      <th className="p-12 text-center">Miktar</th>
                      <th className="p-12 text-right">Birim Fiyat</th>
                      <th className="p-12 text-right">Satır Toplamı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-left">
                    {movements.map((m) => <DesktopRow key={m.id} m={m} />)}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-slate-100 text-left">
                {movements.map((m) => <MobileRow key={m.id} m={m} />)}
              </div>
              {movements.length === 0 && <EmptyState />}
            </>
          ) : (
            <div className="p-4 text-left">
              <SupplierOfferTable productId={product.id} offers={offers} suppliers={suppliers} onRefresh={fetchAllData} />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// --- YARDIMCI BİLEŞENLER ---

function DesktopRow({ m }: any) {
  const tItem = m.transaction_items; 
  const trans = tItem?.transactions;
  const isOut = m.type === 'OUT' || (m.type === 'ADJUSTMENT' && m.quantity < 0);
  const viewLink = trans ? (['sale', 'return_in'].includes(trans.type) ? `/satis/izle/${trans.id}` : `/alis/izle/${trans.id}`) : '#';

  const typeMap: any = {
    IN: { label: 'GİRİŞ', color: 'bg-emerald-50 text-emerald-600' },
    OUT: { label: 'ÇIKIŞ', color: 'bg-red-50 text-red-600' },
    ADJUSTMENT: { label: 'DÜZELTME', color: 'bg-slate-100 text-slate-600' }
  };
  const currentType = typeMap[m.type] || { label: 'DİĞER', color: 'bg-slate-50 text-slate-400' };

  return (
    <tr className="hover:bg-slate-50/80 transition-all group border-b border-slate-50 text-left">
      <td className="p-12 text-left">
        <div className="flex flex-col gap-1 text-left">
          <div className="flex items-center gap-2 font-black text-sm tracking-tighter text-slate-900 italic text-left">
            <Calendar size={14} className="text-slate-200" />
            {new Date(m.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <span className="text-[10px] font-bold text-slate-300 uppercase italic ml-6 text-left">
            {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </td>
      <td className="p-12 text-left">
        <div className="flex items-center gap-6 text-left">
          <div className={`px-4 py-2 rounded-xl text-[9px] font-black border uppercase italic tracking-widest ${currentType.color} border-current/10`}>
            {currentType.label}
          </div>
          <div className="text-left">
            <div className="font-black uppercase text-slate-900 tracking-tight text-base mb-1 italic text-left">
              {trans?.contacts?.name || m.description || 'GENEL HAREKET'}
            </div>
            {trans && (
              <Link href={viewLink} className="inline-flex bg-blue-50 text-blue-600 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-blue-100">
                BELGE: {trans.doc_no || 'İZLE'}
              </Link>
            )}
          </div>
        </div>
      </td>
      <td className="p-12 text-center text-left">
        <div className="flex flex-col items-center text-left">
          <span className={`text-3xl font-black italic tracking-tighter ${isOut ? 'text-red-600' : 'text-emerald-600'} text-left`}>
              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
          </span>
          <div className="text-[9px] font-bold text-slate-400 mt-1 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 text-left">
              {m.prev_stock} <span className="mx-2 text-blue-400">→</span> {m.next_stock}
          </div>
        </div>
      </td>
      <td className="p-12 text-right font-bold text-slate-400 text-sm italic text-left">
        {tItem?.unit_price ? `${Number(tItem.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL` : '---'}
      </td>
      <td className="p-12 text-right font-black tracking-tighter text-slate-900 italic text-2xl text-left">
        {tItem?.line_total ? `${Number(tItem.line_total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL` : '---'}
      </td>
    </tr>
  );
}

function MobileRow({ m }: any) {
  const tItem = m.transaction_items;
  const trans = tItem?.transactions;
  const isOut = m.type === 'OUT' || (m.type === 'ADJUSTMENT' && m.quantity < 0);
  
  // Belge linki yönlendirmesi
  const viewLink = trans ? (['sale', 'return_in'].includes(trans.type) ? `/satis/izle/${trans.id}` : `/alis/izle/${trans.id}`) : '#';
  
  return (
    <div className="p-8 space-y-6 bg-white border-b border-slate-100 text-left">
      <div className="flex justify-between items-start text-left">
        <div className="flex gap-5 text-left">
          {/* İşlem Tipi İkonu */}
          <div className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-[10px] font-black border-2 ${isOut ? 'border-red-100 text-red-600 bg-red-50' : 'border-emerald-100 text-emerald-600 bg-emerald-50'}`}>
            {m.type === 'ADJUSTMENT' ? 'DZLT' : m.type}
          </div>
          
          <div className="space-y-2 text-left">
            {/* Cari Adı veya Açıklama */}
            <p className="font-black uppercase text-slate-900 text-base leading-tight italic text-left">
              {trans?.contacts?.name || m.description || 'GENEL HAREKET'}
            </p>
            
            {/* Tarih Bilgisi */}
            <p className="text-[10px] font-bold text-slate-400 uppercase italic text-left">
              {new Date(m.created_at).toLocaleDateString('tr-TR')} - {new Date(m.created_at).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
            </p>

            {/* MOBİL BELGE NO ALANI (YENİ EKLENDİ) */}
            {trans && (
              <Link href={viewLink} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-blue-100 mt-1 active:scale-95 transition-transform">
                <Hash size={10} />
                BELGE: {trans.doc_no || 'DETAY'}
              </Link>
            )}
          </div>
        </div>

        {/* Miktar ve Stok Değişimi */}
        <div className="flex flex-col items-end text-left shrink-0">
          <div className={`text-3xl font-black italic tracking-tighter ${isOut ? 'text-red-600' : 'text-emerald-600'} text-left`}>
            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
          </div>
          <div className="text-[10px] font-bold text-slate-300 italic text-left">
            {m.prev_stock} <span className="text-blue-200">→</span> {m.next_stock}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-left">
      <div className="flex flex-col items-center gap-8 text-left text-left">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-[8px] border-slate-100 rounded-full text-left"></div>
          <div className="absolute inset-0 border-[8px] border-slate-900 rounded-full border-t-blue-600 animate-spin text-left"></div>
        </div>
        <p className="text-[12px] font-black uppercase tracking-[1em] text-slate-400 italic animate-pulse text-left">Memonex Analiz</p>
      </div>
    </div>
  );
}

function ProductNotFoundState({ router }: { router: any }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 bg-white text-center text-left">
      <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 text-left"><Info size={48} /></div>
      <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 text-left">Ürün Bulunamadı!</h2>
      <button onClick={() => router.push('/stok')} className="mt-6 bg-slate-900 text-white px-10 py-4 rounded-[20px] font-black uppercase tracking-widest text-[11px] text-left">STOK LİSTESİNE DÖN</button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-40 text-center flex flex-col items-center gap-6 text-left">
       <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200 text-left"><Package size={40} /></div>
       <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-xs italic text-left">Henüz bir hareket kaydı bulunmuyor.</p>
    </div>
  );
}