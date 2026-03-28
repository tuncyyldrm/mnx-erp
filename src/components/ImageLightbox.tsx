'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt: string;
  sku: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, sku, onClose }: ImageLightboxProps) {
  // Modal açıkken scroll'u kilitle
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-950/98 backdrop-blur-2xl p-4 md:p-8 animate-in fade-in duration-300 cursor-pointer"
      onClick={onClose}
    >
      <button 
        className="absolute top-4 right-4 md:top-8 md:right-8 p-3 text-white/30 hover:text-white hover:bg-white/10 rounded-full transition-all z-[1001] cursor-default"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X size={36} strokeWidth={1.5} />
      </button>

      <div className="relative w-full max-w-6xl h-full flex flex-col items-center justify-center gap-4 md:gap-6 select-none">
        <div className="relative flex-1 min-h-0 w-full flex items-center justify-center">
          <img 
            src={src} 
            alt={alt} 
            className="max-w-full max-h-full object-contain rounded-xl md:rounded-[32px] shadow-[0_0_120px_rgba(0,0,0,0.9)] border border-white/5 animate-in zoom-in-95 duration-500 cursor-default"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
        
        <div 
          className="shrink-0 bg-white/5 border border-white/10 px-6 py-2 rounded-full backdrop-blur-md shadow-2xl mb-4 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="bg-blue-600/20 text-blue-400 text-[10px] md:text-xs font-black px-4 py-1.5 rounded-lg border border-blue-400/20 uppercase tracking-[0.2em]">
            {sku}
          </span>
        </div>
      </div>
    </div>
  );
}