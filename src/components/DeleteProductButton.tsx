'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProduct } from '@/app/actions/erp-actions';

interface DeleteProductButtonProps {
  id: string;
  name?: string;
}

export function DeleteProductButton({ id, name }: DeleteProductButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Kart veya satır tıklamasını engelle
    startTransition(async () => {
      try {
        const result = await deleteProduct(id);
        if (result.success) {
          setIsConfirming(false);
          // Sayfa verilerini sessizce tazele
          router.refresh(); 
        } else {
          alert("Hata: " + (result.error || "Ürün silinemedi."));
          setIsConfirming(false);
        }
      } catch (err) {
        alert("Sistem hatası: Bağlantınızı kontrol edin.");
        setIsConfirming(false);
      }
    });
  };

  // --- ONAY MODU ---
  if (isConfirming) {
    return (
      <div 
        className="flex items-center gap-1 bg-red-600 p-1 rounded-xl shadow-lg shadow-red-100 animate-in zoom-in-95 duration-200 z-30 border border-red-700"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={handleDelete}
          disabled={isPending}
          className="bg-white text-red-600 px-3 py-2 rounded-lg text-[10px] font-black hover:bg-red-50 transition-all active:scale-90 disabled:opacity-50 uppercase italic leading-none"
        >
          {isPending ? '...' : 'SİL'}
        </button>
        <button 
          onClick={() => setIsConfirming(false)}
          disabled={isPending}
          className="text-white px-2 py-2 rounded-lg text-[10px] font-black hover:bg-red-700 transition-all uppercase italic leading-none"
        >
          VAZGEÇ
        </button>
      </div>
    );
  }

  // --- VARSAYILAN DURUM ---
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        setIsConfirming(true);
      }}
      className="w-10 h-10 flex items-center justify-center bg-white text-slate-300 hover:bg-red-600 hover:text-white rounded-xl transition-all group border border-slate-100 shadow-sm hover:shadow-red-100 active:scale-90"
      title={`${name || 'Ürünü'} Sil`}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-5 w-5 group-hover:scale-110 transition-transform" 
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