'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface PaymentFormProps {
  contacts: any[];
  editData?: any;
  trigger?: React.ReactNode;
}

export function PaymentForm({ contacts, editData, trigger }: PaymentFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contact_id: editData?.contact_id || '',
    type: editData?.type || 'collection',
    amount: editData?.amount || '',
    payment_method: editData?.payment_method || 'cash',
    description: editData?.description || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contact_id || !formData.amount) return alert("Lütfen tüm alanları doldurun.");
    setLoading(true);

    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount)
      };

      if (editData?.id) {
        const { error } = await supabase.from('finance_logs').update(payload).eq('id', editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('finance_logs').insert([payload]);
        if (error) throw error;
        setFormData({ ...formData, amount: '', description: '' });
      }

      setIsOpen(false);
      router.refresh();
    } catch (error: any) {
      alert("Hata: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const FormContent = (
    <form onSubmit={handleSubmit} className="space-y-5 p-2 md:p-4">
      {/* İŞLEM TİPİ SEÇİCİ */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-[20px] border border-slate-200/50 shadow-inner">
        <button 
          type="button" 
          className={`flex-1 py-3 rounded-[14px] font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${
            formData.type === 'collection' 
            ? 'bg-white text-emerald-600 shadow-md ring-1 ring-slate-200' 
            : 'text-slate-400 hover:text-slate-600'}`}
          onClick={() => setFormData({...formData, type: 'collection'})}
        >
          Tahsilat (+)
        </button>
        <button 
          type="button" 
          className={`flex-1 py-3 rounded-[14px] font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${
            formData.type === 'payment' 
            ? 'bg-white text-red-600 shadow-md ring-1 ring-slate-200' 
            : 'text-slate-400 hover:text-slate-600'}`}
          onClick={() => setFormData({...formData, type: 'payment'})}
        >
          Ödeme (-)
        </button>
      </div>

      {/* CARİ SEÇİMİ */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">İşlem Yapılacak Cari</label>
        <select 
          required
          value={formData.contact_id}
          onChange={(e) => setFormData({...formData, contact_id: e.target.value})}
          className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs uppercase tracking-tight outline-none focus:border-blue-600 focus:bg-white transition-all appearance-none cursor-pointer"
        >
          <option value="">Cari Seçiniz...</option>
          {contacts.map(c => (
            <option key={c.id} value={c.id}>
              {c.name.toUpperCase()} {c.balance !== 0 ? `| BAKİYE: ${c.balance.toLocaleString('tr-TR')} TL` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* TUTAR GİRİŞİ */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">İşlem Tutarı (TL)</label>
        <div className="relative group">
          <input 
            type="number" 
            required 
            placeholder="0,00"
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
            className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-3xl italic tracking-tighter outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-200"
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xs italic tracking-widest pointer-events-none group-focus-within:text-blue-600 transition-colors uppercase">TRY</span>
        </div>
      </div>

      {/* AÇIKLAMA */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Not / Açıklama</label>
        <textarea 
          placeholder="İşleme dair not ekleyin..."
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs italic outline-none focus:border-blue-600 focus:bg-white transition-all resize-none h-24"
        />
      </div>

      {/* KAYDET BUTONU */}
      <button 
        disabled={loading}
        className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3
          ${loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-brand-dark text-white hover:bg-brand-blue shadow-slate-200'}`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <>
            {editData ? 'Güncellemeyi Tamamla' : 'Sisteme Kaydet'}
            <span className="text-lg leading-none opacity-50">→</span>
          </>
        )}
      </button>
    </form>
  );

  if (trigger) {
    return (
      <>
        <div onClick={() => setIsOpen(true)} className="cursor-pointer">{trigger}</div>
        {isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsOpen(false)} />
            <div className="relative bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
               <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Finans Modülü</span>
                    <h3 className="font-black uppercase italic text-xl tracking-tighter">Kaydı Güncelle</h3>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-100 text-slate-400 hover:text-red-500 transition-colors shadow-sm font-bold">X</button>
               </div>
               <div className="p-4">{FormContent}</div>
            </div>
          </div>
        )}
      </>
    );
  }

  return <div className="bg-transparent">{FormContent}</div>;
}