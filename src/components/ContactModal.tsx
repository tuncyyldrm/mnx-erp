'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, User, Phone, MapPin, Hash, Building2, Save } from 'lucide-react';

interface ContactModalProps {
  contact?: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Veri güncellendiğinde listeyi yenilemek için
}

export function ContactModal({ contact, isOpen, onClose, onSuccess }: ContactModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'customer',
    phone: '',
    address: '',
    tax_office: '',
    tax_number: '',
  });

  // Düzenleme modundaysak verileri doldur
  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        type: contact.type || 'customer',
        phone: contact.phone || '',
        address: contact.address || '',
        tax_office: contact.tax_office || '',
        tax_number: contact.tax_number || '',
      });
    } else {
      setFormData({
        name: '',
        type: 'customer',
        phone: '',
        address: '',
        tax_office: '',
        tax_number: '',
      });
    }
  }, [contact, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (contact?.id) {
        // GÜNCELLEME
        const { error } = await supabase
          .from('contacts')
          .update(formData)
          .eq('id', contact.id);
        if (error) throw error;
      } else {
        // YENİ KAYIT
        const { error } = await supabase
          .from('contacts')
          .insert([formData]);
        if (error) throw error;
      }
      
      onSuccess(); // Sayfayı yenilet
      onClose();   // Modalı kapat
    } catch (error: any) {
      alert('Hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 isolate">
      {/* Backdrop (Arka Plan Karartma) */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Gövdesi */}
      <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-2xl font-black tracking-tighter uppercase italic text-slate-900">
              {contact ? 'Cari Düzenle' : 'Yeni Cari Kaydı'}
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              {contact ? 'Mevcut bilgileri güncelliyorsunuz' : 'Sisteme yeni paydaş ekleyin'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form İçeriği */}
        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6 custom-scrollbar">
          
          {/* İsim ve Tip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Cari Adı / Ünvan</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  required
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                  placeholder="Örn: Memonex Otomotiv"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Cari Tipi</label>
              <div className="flex p-1 bg-slate-50 rounded-2xl border-2 border-slate-50">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: 'customer'})}
                  className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.type === 'customer' ? 'bg-white text-blue-600 shadow-sm border border-blue-50' : 'text-slate-400'}`}
                >
                  MÜŞTERİ
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: 'supplier'})}
                  className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.type === 'supplier' ? 'bg-white text-amber-600 shadow-sm border border-amber-50' : 'text-slate-400'}`}
                >
                  TEDARİKÇİ
                </button>
              </div>
            </div>
          </div>

          {/* Telefon ve Vergi No */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Telefon</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                  placeholder="05xx xxx xx xx"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Vergi Dairesi / No</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-4 pl-10 pr-2 focus:border-blue-500 focus:bg-white outline-none transition-all text-xs font-bold"
                    placeholder="V.D."
                    value={formData.tax_office}
                    onChange={(e) => setFormData({...formData, tax_office: e.target.value})}
                  />
                </div>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-4 pl-10 pr-2 focus:border-blue-500 focus:bg-white outline-none transition-all text-xs font-bold"
                    placeholder="V.No"
                    value={formData.tax_number}
                    onChange={(e) => setFormData({...formData, tax_number: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Adres */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Adres</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-6 text-slate-300" size={18} />
              <textarea 
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-3xl py-4 pl-12 pr-4 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold min-h-[120px] resize-none"
                placeholder="Açık adres bilgilerini buraya girin..."
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>
          </div>

          {/* Submit Butonu */}
          <div className="pt-4">
            <button 
              disabled={loading}
              className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  KAYDI TAMAMLA
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}