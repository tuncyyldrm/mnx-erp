'use client';

import './globals.css';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inter } from 'next/font/google';
import { supabase } from '@/lib/supabase'; // Supabase istemcinizi buraya eklediğinizden emin olun

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // Oturum durumunu takip et
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Route değiştiğinde menüyü kapat
  useEffect(() => {
    setIsActionMenuOpen(false);
  }, [pathname]);

  // Giriş yapılmış mı ve login sayfasında değil miyiz kontrolü
  const isLoginPage = pathname === '/login';
  const showNavigation = session && !isLoginPage;

  return (
    <html lang="tr">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased pb-24 md:pb-0`}>
        
        {/* ÜST NAVIGASYON - Sadece oturum varsa ve login sayfası değilse */}
        {showNavigation && (
          <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-[100] print:hidden">
            <div className="max-w-[1600px] mx-auto px-4 md:px-8 flex h-16 md:h-20 items-center justify-between">
              
              {/* SOL: LOGO & ANA MENÜ */}
              <div className="flex items-center gap-4 md:gap-12">
                <Link href="/" className="group flex items-center gap-2 md:gap-3 transition-all active:scale-95">
                  <div className="bg-brand-dark text-white w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-[12px] font-black text-xl shadow-lg group-hover:bg-brand-blue transition-all italic">
                    M
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="font-black text-base md:text-xl tracking-tighter uppercase italic">MEMONEX</span>
                    <span className="text-[8px] md:text-[10px] font-black text-brand-blue tracking-[0.3em] ml-0.5">SYSTEMS</span>
                  </div>
                </Link>

                {/* Masaüstü Navigasyon */}
                <div className="hidden lg:flex items-center gap-1 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/40">
                  <NavLink href="/" label="Panel" active={pathname === "/"} />
                  <NavLink href="/stok" label="Envanter" active={pathname.startsWith("/stok")} />
                  <NavLink href="/cariler" label="Cari Kartlar" active={pathname.startsWith("/cariler")} />
                  <NavLink href="/finans" label="Kasa Defteri" active={pathname.startsWith("/finans")} isSpecial />
                </div>
              </div>

              {/* SAĞ: DURUM & HIZLI İŞLEM (MASAÜSTÜ) */}
              <div className="flex items-center gap-3 md:gap-6">
                {/* Çıkış Yap Butonu (Opsiyonel) */}
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="hidden md:block text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                >
                  ÇIKIŞ
                </button>

                <button 
                  onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                  className={`hidden md:flex items-center gap-3 px-6 py-3 rounded-2xl font-black italic text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95
                    ${isActionMenuOpen ? 'bg-red-500 text-white shadow-red-200' : 'bg-brand-dark text-white hover:bg-brand-blue shadow-slate-200'}`}
                >
                  {isActionMenuOpen ? 'VAZGEÇ' : 'HIZLI İŞLEM'}
                  <span className={`text-lg leading-none transition-transform duration-300 ${isActionMenuOpen ? 'rotate-45' : ''}`}>+</span>
                </button>

                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm select-none">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </div>
                  <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest text-slate-500">Isparta-HQ</span>
                </div>
              </div>
            </div>
          </nav>
        )}

        {/* --- ORTAK AKSİYON PANELİ --- */}
        {showNavigation && isActionMenuOpen && (
          <div className="fixed inset-0 z-[110]">
            <div 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
              onClick={() => setIsActionMenuOpen(false)}
            />
            <div className="absolute bottom-28 md:bottom-auto md:top-24 right-4 left-4 md:left-auto md:right-8 md:w-[380px] flex flex-col gap-3 animate-in slide-in-from-bottom-8 md:slide-in-from-top-8 duration-300">
              <ActionCard href="/alis/yeni" icon="📦" title="Sanal Depo" desc="Yeni Stok Girişi Yap" color="orange" />
              <ActionCard href="/satis/yeni" icon="💰" title="Sevkiyat" desc="Yeni Satış Faturası Kes" color="emerald" />
              <div className="text-center md:hidden">
                <button 
                  onClick={() => setIsActionMenuOpen(false)}
                  className="mt-2 text-[10px] font-black text-white/70 uppercase tracking-widest"
                >
                  Kapatmak için dokun
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- MOBİL ALT NAVİGASYON --- */}
        {showNavigation && (
          <div className="print:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100 px-6 py-2 flex justify-between items-center z-[120] md:hidden shadow-[0_-10px_40px_-10px_rgba(15,23,42,0.15)] rounded-t-[32px]">
            <MobileTabItem href="/" icon={<DashboardIcon />} label="Panel" active={pathname === "/"} />
            <MobileTabItem href="/stok" icon={<BoxIcon />} label="Stok" active={pathname.startsWith("/stok")} />
            <div className="relative -mt-14">
                <button 
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                className={`${isActionMenuOpen ? 'bg-red-500 rotate-45' : 'bg-brand-dark'} text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40 border-[6px] border-slate-50 scale-110 active:scale-95 transition-all duration-300`}
                >
                  <span className="text-4xl font-light">+</span>
                </button>
            </div>
            <MobileTabItem href="/cariler" icon={<UserIcon />} label="Cari" active={pathname.startsWith("/cariler")} />
            <MobileTabItem href="/finans" icon={<WalletIcon />} label="Kasa" active={pathname.startsWith("/finans")} />
          </div>
        )}

        {/* ANA İÇERİK - children her zaman render edilir */}
        <main className={`min-h-screen max-w-[1600px] mx-auto ${showNavigation ? 'p-4 md:p-8' : ''}`}>
          {children}
        </main>

        {/* MASAÜSTÜ FOOTER */}
        {showNavigation && (
          <footer className="hidden md:block border-t border-slate-100 bg-white py-12 print:hidden">
            <div className="max-w-[1600px] mx-auto px-8 flex justify-between items-center opacity-50 hover:opacity-100 transition-opacity">
              <p className="text-[10px] font-black uppercase tracking-[0.4em]">Memonex ERP Systems • 2026</p>
              <div className="flex items-center gap-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-black text-brand-blue bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">STABLE BUILD v1.2.5</span>
              </div>
            </div>
          </footer>
        )}
      </body>
    </html>
  );
}

// --- YARDIMCI BİLEŞENLER (Değişmedi) ---

function ActionCard({ href, icon, title, desc, color }: any) {
  const colorStyles: any = {
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100"
  };

  return (
    <Link href={href} className="bg-white border border-slate-100 rounded-[24px] p-4 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${colorStyles[color]}`}>
          {icon}
        </div>
        <div className="text-left">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
          <p className="font-black italic text-slate-900 uppercase leading-tight">{desc}</p>
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-brand-dark group-hover:text-white transition-all">
        →
      </div>
    </Link>
  );
}

function NavLink({ href, label, isSpecial = false, active = false }: any) {
  return (
    <Link 
      href={href} 
      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
        ${active 
          ? 'bg-white text-brand-blue shadow-sm ring-1 ring-slate-100' 
          : isSpecial 
            ? 'text-brand-blue hover:bg-brand-blue/5' 
            : 'text-slate-400 hover:text-brand-dark hover:bg-white'}`}
    >
      {label}
    </Link>
  );
}

function MobileTabItem({ href, icon, label, active = false }: any) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center py-2 px-2 transition-all active:scale-90 group`}>
      <div className={`${active ? 'text-brand-blue scale-110' : 'text-slate-400'} transition-all`}>
        {icon}
      </div>
      <span className={`text-[8px] font-black uppercase tracking-widest mt-1 transition-all ${active ? 'text-brand-dark' : 'text-slate-400'}`}>
        {label}
      </span>
    </Link>
  );
}

const DashboardIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const BoxIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
const UserIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const WalletIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;