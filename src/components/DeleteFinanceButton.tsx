'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteFinanceEntry } from '@/app/actions/erp-actions';

interface DeleteFinanceButtonProps {
  id: string;
}

export function DeleteFinanceButton({ id }: DeleteFinanceButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Alt elemanlara tıklamayı engelle
    startTransition(async () => {
      try {
        const result = await deleteFinanceEntry(id);
        
        if (result.success) {
          setIsConfirming(false);
          // UI'ı sessizce güncelle (Server Actions + Router Refresh mükemmel ikilidir)
          router.refresh();
        } else {
          alert("Hata: " + (result.error || "İşlem tamamlanamadı."));
          setIsConfirming(false);
        }
      } catch (err) {
        alert("Sistem Hatası: Bağlantınızı kontrol edip tekrar deneyin.");
        setIsConfirming(false);
      }
    });
  };

  // --- ONAY MODU ---
  if (isConfirming) {
    return (
      <div 
        className="flex items-center gap-1.5 bg-red-600 p-1.5 rounded-xl shadow-lg shadow-red-100 animate-in zoom-in-95 duration-200 z-30 border border-red-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col px-1.5 leading-none">
          <span className="text-[7px] font-black text-red-200 uppercase tracking-[0.2em] mb-0.5">KRİTİK</span>
          <span className="text-[9px] font-black text-white uppercase italic whitespace-nowrap tracking-tighter">
            {isPending ? 'SİLİNİYOR...' : 'EMİN MİSİN?'}
          </span>
        </div>
        
        <div className="flex gap-1">
          <button 
            onClick={handleDelete}
            disabled={isPending}
            className="bg-white text-red-600 h-7 px-3 rounded-lg text-[10px] font-black hover:bg-red-50 active:scale-90 transition-all disabled:opacity-50 uppercase italic"
          >
            {isPending ? '...' : 'EVET'}
          </button>
          
          <button 
            onClick={() => setIsConfirming(false)}
            disabled={isPending}
            className="text-white h-7 px-3 rounded-lg text-[10px] font-black hover:bg-red-700 transition-all uppercase italic"
          >
            İPTAL
          </button>
        </div>
      </div>
    );
  }

  // --- NORMAL DURUM ---
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        setIsConfirming(true);
      }}
      className="w-9 h-9 flex items-center justify-center bg-white text-slate-300 hover:bg-red-600 hover:text-white rounded-xl transition-all border border-slate-100 hover:border-red-500 group shadow-sm active:scale-90"
      title="Finansal Kaydı Sil"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4.5 w-4.5 group-hover:scale-110 transition-transform" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2.5} 
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
        />
      </svg>
    </button>
  );
}