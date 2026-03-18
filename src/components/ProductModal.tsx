'use client';

import { useState, useEffect } from 'react';
import { saveProduct } from '@/app/actions/erp-actions';
import { useRouter } from 'next/navigation';
// 6. satırdaki hatalı yolu bununla değiştir:
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';

export function ProductModal({ trigger, editData }: { trigger: React.ReactNode; editData?: any }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const initialForm = {
    id: undefined,
    sku: '',
    oem_code: '',
    name: '',
    brand: '',
    category: '',
    shelf_no: '',
    purchase_price: 0,
    sell_price: 0,
    tax_rate: 20,
    unit: 'Adet',
    stock_count: 0,
    critical_limit: 5,
    is_active: true,
    image_url: '' // Yeni eklenen alan
  };

  const [formData, setFormData] = useState(initialForm);

  // Görsel Yükleme Fonksiyonu
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);

      // 1. Görsel Sıkıştırma (Browser-side)
      const options = {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1000,
        useWebWorker: true,
        fileType: 'image/webp'
      };
      const compressedFile = await imageCompression(file, options);

      // 2. Storage'a Yükleme
      const fileName = `${formData.sku || 'prod'}-${Date.now()}.webp`;
const { data, error } = await supabase.storage
  .from('product-images')
  .upload(fileName, compressedFile, {
    contentType: 'image/webp', // Dosya tipini açıkça belirt
    upsert: true               // Aynı isimde dosya varsa üzerine yaz
  });

      if (error) throw error;

      // 3. Public URL'i Al ve Form State'ine Yaz
const { data: { publicUrl } } = supabase.storage
  .from('product-images')
  .getPublicUrl(fileName);
const cacheBusterUrl = `${publicUrl}?t=${Date.now()}`;
setFormData(prev => ({ ...prev, image_url: cacheBusterUrl }));

    } catch (err: any) {
      alert("Görsel yüklenemedi: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (editData && isOpen) {
      setFormData({
        ...initialForm,
        ...editData,
        purchase_price: Number(editData.purchase_price) || 0,
        sell_price: Number(editData.sell_price) || 0,
        tax_rate: Number(editData.tax_rate) || 20,
        stock_count: Number(editData.stock_count) || 0,
        critical_limit: Number(editData.critical_limit) || 5,
        image_url: editData.image_url || ''
      });
    } else if (!isOpen) {
      setFormData(initialForm);
    }
  }, [editData, isOpen]);

  const margin = formData.purchase_price > 0 
    ? (((formData.sell_price - formData.purchase_price) / formData.purchase_price) * 100).toFixed(0) 
    : 0;

const handleSubmit = async (e: React.ChangeEvent<any>) => {
  e.preventDefault();
  if (uploading) return alert("Görsel yüklenirken bekleyin...");
  
  setLoading(true);
  try {
    // Tüm formData'yı gönderdiğimizden emin oluyoruz
    const result = await saveProduct({
      ...formData, 
      sku: formData.sku.toUpperCase().trim(),
      // image_url zaten formData içinde olduğu için buraya otomatik dahil olur
    });

    if (result.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      alert(`Hata: ${result.error}`);
    }
  } catch (err) {
    alert("Sistem hatası oluştu.");
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="inline-block w-full md:w-auto">{trigger}</div>

      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsOpen(false)} />
          
          <div className="relative bg-white w-full max-w-4xl md:rounded-[40px] rounded-t-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
            
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Envanter Yönetimi</span>
                <h2 className="text-xl md:text-2xl font-black italic uppercase text-slate-900 tracking-tighter">
                  {formData.id ? `DÜZENLE: ${formData.sku}` : 'YENİ ÜRÜN KAYDI'}
                </h2>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-red-500 transition-colors">✕</button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 overflow-y-auto custom-scrollbar flex-grow text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Sol Bölüm: Tanımlama */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest italic">Ürün Görseli & Tanım</span>
                    <div className="h-px flex-grow bg-slate-100" />
                  </div>

                  {/* Görsel Yükleme Alanı */}
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 hover:border-blue-400 transition-all relative overflow-hidden">
                    <div className="w-20 h-20 bg-white rounded-2xl flex-shrink-0 border border-slate-100 flex items-center justify-center overflow-hidden">
                      {formData.image_url ? (
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">📸</span>
                      )}
                    </div>
                    <div className="flex-grow">
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Fotoğraf Yükle</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className="text-xs file:hidden cursor-pointer" 
                      />
                      {uploading && <p className="text-[8px] font-bold text-blue-600 animate-pulse mt-1">Sıkıştırılıyor...</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Ürün Adı / Açıklama</label>
                    <input 
                      className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold focus:border-blue-600 outline-none transition-all bg-slate-50 focus:bg-white"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Örn: Fren Balatası Ön"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">SKU (Kod)</label>
                      <input 
                        className="w-full border-2 border-slate-100 p-4 rounded-2xl font-black text-blue-600 tracking-widest focus:border-blue-600 outline-none bg-slate-50 focus:bg-white"
                        value={formData.sku || ''}
                        onChange={e => setFormData({...formData, sku: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">OEM Kodu</label>
                      <input 
                        className="w-full border-2 border-slate-100 p-4 rounded-2xl font-medium focus:border-blue-600 outline-none bg-slate-50 focus:bg-white"
                        value={formData.oem_code || ''}
                        onChange={e => setFormData({...formData, oem_code: e.target.value})}
                      />
                    </div>
                  </div>
                  {/* ... Diğer inputlar aynı kalıyor ... */}
                  
                  {/* Kategori ve Marka buraya gelecek */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Kategori</label>
                      <input 
                        className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold focus:border-blue-600 outline-none bg-slate-50 focus:bg-white"
                        value={formData.category || ''}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Marka</label>
                      <input 
                        className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold focus:border-blue-600 outline-none bg-slate-50 focus:bg-white"
                        value={formData.brand || ''}
                        onChange={e => setFormData({...formData, brand: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Sağ Bölüm: Finansal & Stok (Kodun devamı senin orijinal yapınla aynı) */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest italic">Finans & Depo</span>
                    <div className="h-px flex-grow bg-slate-100" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-5 bg-blue-50/50 rounded-[32px] border border-blue-100 relative">
                    <div className="absolute -top-3 right-6 bg-emerald-500 text-white text-[9px] font-black px-4 py-1 rounded-full shadow-lg">
                      %{margin} MARJ
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-blue-600 uppercase ml-2">Alış Fiyatı</label>
                      <input 
                        type="number" step="0.01"
                        className="w-full border-2 border-white p-3 rounded-xl font-black text-lg focus:border-blue-500 outline-none shadow-sm"
                        value={formData.purchase_price}
                        onChange={e => setFormData({...formData, purchase_price: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-blue-600 uppercase ml-2">Satış Fiyatı</label>
                      <input 
                        type="number" step="0.01"
                        className="w-full border-2 border-white p-3 rounded-xl font-black text-lg focus:border-blue-500 outline-none shadow-sm"
                        value={formData.sell_price}
                        onChange={e => setFormData({...formData, sell_price: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Stok</label>
                      <input 
                        type="number"
                        className="w-full border-2 border-slate-100 p-4 rounded-2xl font-black text-center focus:border-blue-600 outline-none"
                        value={formData.stock_count}
                        onChange={e => setFormData({...formData, stock_count: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-red-500 uppercase ml-2">Kritik</label>
                      <input 
                        type="number"
                        className="w-full border-2 border-red-50 p-4 rounded-2xl font-black text-center text-red-600 focus:border-red-500 outline-none bg-red-50/30"
                        value={formData.critical_limit}
                        onChange={e => setFormData({...formData, critical_limit: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">KDV %</label>
                      <input 
                        type="number"
                        className="w-full border-2 border-slate-100 p-4 rounded-2xl font-black text-center focus:border-blue-600 outline-none"
                        value={formData.tax_rate}
                        onChange={e => setFormData({...formData, tax_rate: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Raf / Konum</label>
                    <input 
                      className="w-full border-2 border-slate-100 p-4 rounded-2xl font-black tracking-widest uppercase focus:border-blue-600 outline-none bg-slate-50"
                      value={formData.shelf_no || ''}
                      onChange={e => setFormData({...formData, shelf_no: e.target.value})}
                      placeholder="B-01-A"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={loading || uploading}
                  className={`w-full py-6 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95
                    ${loading || uploading ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-blue-200 border-b-4 border-black/20'}`}
                >
                  {loading ? 'VERİLER YAZILIYOR...' : uploading ? 'GÖRSEL YÜKLENİYOR...' : (
                    <>
                      {formData.id ? 'DEĞİŞİKLİKLERİ KAYDET' : 'ÜRÜNÜ SİSTEME TANIMLA'}
                      <span className="text-xl">→</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}