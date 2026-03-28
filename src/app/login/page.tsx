'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  // 1. Giriş isteği gönder
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password,
  });

  if (error) {
    alert("Hata: " + error.message);
    setLoading(false);
    return;
  }

  // 2. KRİTİK DEĞİŞİKLİK: 
  // router.push('/') yerine window.location.href kullanıyoruz.
  // Bu sayede tarayıcı çerezleri tazeleyip ana sayfaya "temiz" bir giriş yapar.
  window.location.href = '/'; 
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 mb-4 font-black text-xl">
            FX
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase">Memonex Terminal</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sistem Giriş Yetkilendirmesi</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">E-Posta</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all"
              placeholder="admin@memonex.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Şifre</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            disabled={loading}
            className="w-full py-5 bg-[#1e293b] hover:bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {loading ? 'DOĞRULANIYOR...' : 'SİSTEME BAĞLAN →'}
          </button>
        </form>
      </div>
    </div>
  );
}