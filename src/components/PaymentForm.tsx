'use client';

import { useState, useEffect, useId, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

interface PaymentFormProps {
  contacts: any[];
  initialContactId?: string;
  initialType?: 'collection' | 'payment';
  editData?: any;
  trigger?: React.ReactNode;
}

const formatForInput = (isoString: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function PaymentForm({ 
  contacts, 
  initialContactId: propContactId, 
  initialType: propType, 
  editData, 
  trigger 
}: PaymentFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId().replace(/:/g, "");
  
  // URL parametrelerini her zaman güncel tut
  const urlContactId = searchParams.get('cariId');
  const urlType = searchParams.get('type') as 'collection' | 'payment' | null;

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [displayDate, setDisplayDate] = useState("");

  // Formun başlangıç ve senkronizasyon değerini hesapla
  const activeContactId = editData?.contact_id || urlContactId || propContactId || '';
  const activeType = editData?.type || urlType || propType || 'collection';

  const [formData, setFormData] = useState({
    contact_id: activeContactId,
    type: activeType,
    amount: editData?.amount || '',
    payment_method: editData?.payment_method || 'cash',
    description: editData?.description || '',
    created_at: editData?.created_at || new Date().toISOString()
  });

  // URL veya Proplar değiştiğinde formu güncelle (DİNAMİK SENKRONİZASYON)
  useEffect(() => {
    // Düzenleme modunda değilsek URL/Prop değişikliklerini yansıt
    if (!editData) {
      setFormData(prev => ({
        ...prev,
        contact_id: activeContactId,
        type: activeType as 'collection' | 'payment'
      }));
    }
  }, [activeContactId, activeType, editData]);

  // Modal açıldığında veya tarih değiştiğinde displayDate'i güncelle
  useEffect(() => {
    if (isOpen || !trigger) {
      const targetDate = editData?.created_at || formData.created_at;
      setDisplayDate(formatForInput(targetDate));
    }
  }, [isOpen, trigger, editData, formData.created_at]);

  // Manuel tarih girişi işleme
  const handleManualDateChange = (val: string) => {
    setDisplayDate(val);
    if (val.length >= 16) {
      const [datePart, timePart] = val.split(' ');
      if (!datePart || !timePart) return;
      const [d, m, y] = datePart.split('-');
      const iso = `${y}-${m}-${d}T${timePart}:00`;
      if (!isNaN(new Date(iso).getTime())) {
        setFormData(prev => ({ ...prev, created_at: new Date(iso).toISOString() }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contact_id || !formData.amount) return alert("Lütfen cari ve tutar alanlarını doldurun.");
    setLoading(true);

    try {
      const { id, ...cleanPayload } = {
        ...formData,
        amount: Number(formData.amount)
      } as any;

      if (editData?.id) {
        const { error } = await supabase.from('finance_logs').update(cleanPayload).eq('id', editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('finance_logs').insert([cleanPayload]);
        if (error) throw error;
        
        // Yeni kayıttan sonra temizlik (Sadece inline form ise)
        if (!trigger) {
          setFormData(prev => ({ 
            ...prev, 
            amount: '', 
            description: '', 
            created_at: new Date().toISOString() 
          }));
        }
      }

      setIsOpen(false);
      router.refresh(); 
    } catch (error: any) {
      alert("Hata: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ... (Geri kalan FormContent ve return kısımları aynı kalıyor)

  const FormContent = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* TİP SEÇİCİ */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-[20px] border border-slate-200/50 shadow-inner">
        <button type="button" onClick={() => setFormData({...formData, type: 'collection'})}
          className={`flex-1 py-3 rounded-[14px] font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${formData.type === 'collection' ? 'bg-white text-emerald-600 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
          Tahsilat (+)
        </button>
        <button type="button" onClick={() => setFormData({...formData, type: 'payment'})}
          className={`flex-1 py-3 rounded-[14px] font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${formData.type === 'payment' ? 'bg-white text-red-600 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
          Ödeme (-)
        </button>
      </div>

      {/* CARİ SEÇİMİ */}
      <div className="space-y-1.5 text-left">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block">İşlem Yapılacak Cari</label>
        <select required value={formData.contact_id} onChange={(e) => setFormData({...formData, contact_id: e.target.value})}
          className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs uppercase outline-none focus:border-blue-600 transition-all cursor-pointer appearance-none">
          <option value="">Cari Seçiniz...</option>
          {contacts.map(c => (
            <option key={c.id} value={c.id}>
              {c.name.toUpperCase()} {c.balance !== 0 ? `| ${c.balance.toLocaleString('tr-TR')} TL` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TUTAR */}
        <div className="space-y-1.5 text-left">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block">Tutar (TL)</label>
          <div className="relative group">
            <input type="number" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl italic tracking-tighter outline-none focus:border-blue-600 transition-all" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-[10px] italic pointer-events-none group-focus-within:text-blue-600 transition-colors uppercase">TRY</span>
          </div>
        </div>

        {/* TARİH */}
        <div className="space-y-1.5 text-left">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block">İşlem Tarihi</label>
          <div className="relative group flex items-center">
            <input type="text" value={displayDate} onChange={(e) => handleManualDateChange(e.target.value)}
              placeholder="GG-AA-YYYY SS:DD"
              className="w-full p-4 pr-12 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs outline-none focus:border-blue-600 transition-all" />
            <div className="absolute right-4 cursor-pointer hover:scale-110 transition-transform flex items-center">
                <span className="text-lg" onClick={() => (document.getElementById(`picker-${formId}`) as any).showPicker()}>📅</span>
                <input id={`picker-${formId}`} type="datetime-local" className="absolute opacity-0 w-0 h-0 pointer-events-none"
                 onChange={(e) => {
                   if (e.target.value) {
                     const iso = new Date(e.target.value).toISOString();
                     setFormData(prev => ({ ...prev, created_at: iso }));
                     setDisplayDate(formatForInput(iso));
                   }
                 }} />
            </div>
          </div>
        </div>
      </div>
      {/* ÖDEME YÖNTEMİ SEÇİCİ - EKSİK OLAN KISIM */}
      <div className="space-y-1.5 text-left">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block">Ödeme Yöntemi</label>
        <select 
          value={formData.payment_method} 
          onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
          className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs uppercase outline-none focus:border-blue-600 transition-all cursor-pointer appearance-none"
        >
          <option value="cash">Nakit</option>
          <option value="bank_transfer">Banka Havalesi / EFT</option>
          <option value="credit_card">Kredi Kartı</option>
        </select>
      </div>
      {/* AÇIKLAMA */}
      <div className="space-y-1.5 text-left">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block">İşlem Notu</label>
        <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs italic outline-none focus:border-blue-600 h-20 resize-none transition-all" />
      </div>

      <button disabled={loading} className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3
          ${loading ? 'bg-slate-200 text-slate-400' : (formData.type === 'payment' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-[#1e293b] hover:bg-blue-600 shadow-blue-100')} text-white`}>
        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (editData ? 'DEĞİŞİKLİKLERİ KAYDET' : 'İŞLEMİ SİSTEME İŞLE')}
      </button>
    </form>
  );

  if (trigger) {
    return (
      <>
        <div onClick={() => setIsOpen(true)} className="cursor-pointer">{trigger}</div>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsOpen(false)} />
            <div className="relative bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95">
               <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Finans Modülü</span>
                    <h3 className="font-black uppercase italic text-xl tracking-tighter">
                      {editData ? 'Kayıt Düzenle' : 'Hızlı İşlem'}
                    </h3>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 font-bold transition-all shadow-sm">✕</button>
               </div>
               <div className="p-8">{FormContent}</div>
            </div>
          </div>
        )}
      </>
    );
  }

  return <div className="bg-transparent">{FormContent}</div>;
}