'use client';

import { useState, useEffect } from 'react';
import { X, Maximize2 } from 'lucide-react';

interface ClickableImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ClickableImage({ src, alt, className }: ClickableImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  // ESC ile kapatma ve Scroll engelleme
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* Küçük Görsel (Tetikleyici) */}
      <div 
        onClick={() => setIsOpen(true)}
        className={`relative group cursor-zoom-in overflow-hidden ${className}`}
      >
        <img src={src} alt={alt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Maximize2 size={24} className="text-white" />
        </div>
      </div>

      {/* Lightbox Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/98 backdrop-blur-2xl p-4 cursor-pointer animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        >
          <button 
            className="absolute top-6 right-6 p-3 text-white/30 hover:text-white hover:bg-white/10 rounded-full transition-all z-[10001]"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <X size={32} />
          </button>

          <img 
            src={src} 
            alt={alt} 
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/5 animate-in zoom-in-95 duration-500 cursor-default"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </>
  );
}