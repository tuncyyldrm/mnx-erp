'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition, useEffect, useState, useRef } from 'react';
import { Search, Loader2, X, Command } from 'lucide-react';

export function SearchInput({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // URL değiştiğinde (örneğin geri gidildiğinde) inputu senkronize et
  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue]);

  // "/" tuşuyla aramaya odaklanma (Pro-User Shortcut)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams.toString());
    
    if (term.trim()) {
      params.set('q', term.trim());
      // Arama yapıldığında sayfa 1'e dönmek mantıklıdır (Pagination varsa)
      params.delete('page'); 
    } else {
      params.delete('q');
    }

    startTransition(() => {
      // scroll: false vererek sayfanın yukarı zıplamasını engelleyebilirsin
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="relative flex-1 md:w-96 group">
      {/* İkon ve Loader */}
      <div className="absolute left-5 top-1/2 -translate-y-1/2 z-10">
        {isPending ? (
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        ) : (
          <Search className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
        )}
      </div>
      
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSearch(inputValue);
          if (e.key === 'Escape') {
            setInputValue('');
            handleSearch('');
            inputRef.current?.blur();
          }
        }}
        placeholder="Parça adı, SKU veya OEM..."
        className="w-full bg-white border-2 border-slate-100 rounded-[22px] py-4 pl-14 pr-16 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold shadow-sm placeholder:font-medium placeholder:text-slate-400"
      />

      {/* Sağ Taraf: Kısayol İpucu veya Temizle Butonu */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {inputValue ? (
          <button
            type="button"
            onClick={() => { setInputValue(''); handleSearch(''); inputRef.current?.focus(); }}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md border border-slate-100 bg-slate-50 text-[10px] font-black text-slate-400 tracking-tighter shadow-sm pointer-events-none">
            <Command className="w-2.5 h-2.5" />
            <span>/</span>
          </div>
        )}
      </div>
    </div>
  );
}