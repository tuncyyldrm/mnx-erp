'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ContactModal } from '@/components/ContactModal';
import { DeleteContactButton } from '@/components/DeleteContactButton';

// --- TÜR TANIMLAMALARI (TypeScript Güvenliği) ---
interface Contact {
  id: string;
  name: string;
  type: 'customer' | 'vendor';
  balance: number;
  phone?: string;
  address?: string;
  tax_office?: string;
  tax_number?: string;
}

interface StatCardProps {
  title: string;
  value: number;
  color: 'emerald' | 'red' | 'blue' | 'slate';
  icon: string;
  isCount?: boolean;
}

interface CariCardProps {
  c: Contact;
  onEdit: () => void;
  onSuccess: () => void;
  onNavigate: (path: string) => void;
}

export default function CarilerPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // --- VERİ ÇEKME ---
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('is_deleted', false)
        .order('name', { ascending: true });
      
      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      console.error("Cari listesi yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // --- ARAMA FİLTRESİ ---
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery) ||
      c.tax_number?.includes(searchQuery)
    );
  }, [contacts, searchQuery]);

  // --- İSTATİSTİK HESAPLAMA ---
  const stats = useMemo(() => {
    return contacts.reduce((acc, curr) => {
      const bal = Number(curr.balance) || 0;
      if (bal > 0) acc.receivable += bal;
      else if (bal < 0) acc.payable += Math.abs(bal);
      return acc;
    }, { receivable: 0, payable: 0 });
  }, [contacts]);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto text-slate-900 font-sans min-h-screen bg-[#F8FAFC]">
      
      <ContactModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        contact={selectedContact}
        onSuccess={() => {
          fetchContacts();
          setIsModalOpen(false);
        }}
      />

      {/* ÜST BAŞLIK VE AKSİYONLAR */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest italic shadow-lg shadow-blue-100">
              REHBER SİSTEMİ
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase text-slate-900 leading-none">
              Cariler
            </h1>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic ml-1">
            Memonex Otomotiv • Finansal Paydaş Yönetimi
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          <div className="relative flex-1 sm:min-w-[350px]">
            <input 
              type="text"
              placeholder="İsim, telefon veya vergi no ile ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-slate-100 rounded-[24px] px-6 py-4 text-sm font-bold focus:border-blue-500 focus:outline-none transition-all shadow-sm"
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl grayscale opacity-50">🔍</span>
          </div>

          <button 
            onClick={() => { setSelectedContact(null); setIsModalOpen(true); }}
            className="bg-slate-900 text-white px-8 py-4 rounded-[24px] font-black text-[11px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="text-lg">+</span> YENİ CARİ KAYDI
          </button>
        </div>
      </div>

      {/* İSTATİSTİKLER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
        <StatCard title="Piyasadan Alacak" value={stats.receivable} color="emerald" icon="💰" />
        <StatCard title="Toptancıya Borç" value={stats.payable} color="red" icon="📦" />
        <StatCard title="Net Durum" value={stats.receivable - stats.payable} color="blue" icon="⚖️" />
        <StatCard title="Toplam Kayıt" value={contacts.length} color="slate" icon="👥" isCount />
      </div>

      {/* LİSTELEME */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-[400px] bg-white border-2 border-slate-100 rounded-[48px] animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {filteredContacts.map((c) => (
            <CariCard 
              key={c.id} 
              c={c} 
              onEdit={() => { setSelectedContact(c); setIsModalOpen(true); }}
              onSuccess={fetchContacts}
              onNavigate={(path: string) => router.push(path)}
            />
          ))}
        </div>
      )}

      {!loading && filteredContacts.length === 0 && (
        <div className="text-center py-40 bg-white border-2 border-dashed border-slate-200 rounded-[48px]">
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Sonuç bulunamadı.</p>
        </div>
      )}

      <footer className="mt-20 pb-10 text-center text-slate-300 font-black text-[10px] uppercase tracking-[0.5em] italic">
        Memonex Güvenli Veri Altyapısı
      </footer>
    </div>
  );
}

// --- YARDIMCI BİLEŞENLER ---

function StatCard({ title, value, color, icon, isCount = false }: StatCardProps) {
  const colors = {
    emerald: "border-emerald-100 text-emerald-700 bg-white shadow-emerald-50",
    red: "border-red-100 text-red-700 bg-white shadow-red-50",
    blue: "border-blue-100 text-blue-700 bg-white shadow-blue-50 shadow-xl",
    slate: "bg-slate-900 text-white border-slate-800"
  };

  return (
    <div className={`p-8 rounded-[40px] border-2 shadow-sm relative overflow-hidden group transition-all hover:scale-[1.02] ${colors[color]}`}>
      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{title}</span>
      <p className="text-3xl md:text-4xl font-black tracking-tighter mt-2 italic leading-none">
        {isCount ? value : value.toLocaleString('tr-TR')} 
        {!isCount && <small className="text-xs font-bold uppercase ml-1 opacity-50">TL</small>}
      </p>
      <div className="absolute -right-2 -bottom-2 text-6xl opacity-10 group-hover:scale-125 transition-transform">{icon}</div>
    </div>
  );
}

function CariCard({ c, onEdit, onSuccess, onNavigate }: CariCardProps) {
  const balance = Number(c.balance) || 0;
  
  return (
    <div className="group relative bg-white border-2 border-slate-100 p-6 md:p-8 rounded-[40px] md:rounded-[48px] shadow-sm hover:shadow-2xl hover:border-blue-500 transition-all duration-500 flex flex-col justify-between h-full">
      
      {/* KONTROL PANELİ: Mobilde Her Zaman Görünür, PC'de Hover */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 flex gap-2 
                      opacity-100 md:opacity-0 md:group-hover:opacity-100 
                      translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 
                      transition-all duration-300 z-20">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-md hover:bg-slate-900 hover:text-white transition-all active:scale-90"
        >
          <span className="text-sm">✏️</span>
        </button>
        <DeleteContactButton id={c.id} name={c.name} onSuccess={onSuccess} />
      </div>

      <div>
        {/* ÜST BİLGİ */}
        <div className="mb-6 pr-14 md:pr-0">
          <div className={`inline-block text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border mb-3 ${
            c.type === 'customer' ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-amber-200 text-amber-600 bg-amber-50'
          }`}>
            {c.type === 'customer' ? 'Müşteri' : 'Tedarikçi'}
          </div>
          <h3 className="font-black text-xl text-slate-900 tracking-tighter leading-tight group-hover:text-blue-600 transition-colors uppercase italic line-clamp-1">
            {c.name}
          </h3>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter italic">
            {c.tax_office ? `${c.tax_office} V.D. / ${c.tax_number}` : 'Bireysel / Şahıs Kaydı'}
          </p>
        </div>

        {/* İLETİŞİM */}
        <div className="space-y-2 mb-6 bg-slate-50/50 p-4 md:p-5 rounded-[24px] md:rounded-[28px] border border-slate-100/50">
          <div className="flex items-center gap-3 text-xs text-slate-700 font-black italic">
            <span className="grayscale opacity-50">📞</span> {c.phone || 'Girilmemiş'}
          </div>
          {c.address && (
            <div className="flex items-start gap-3 text-[10px] text-slate-500 font-bold leading-relaxed line-clamp-2 uppercase tracking-tighter italic">
              <span className="grayscale opacity-50">📍</span> {c.address}
            </div>
          )}
        </div>
      </div>

      <div>
        {/* BAKİYE DURUMU */}
        <div className={`p-5 md:p-6 rounded-[28px] md:rounded-[32px] border-2 transition-all duration-500 ${
          balance < 0 ? 'bg-red-50/50 border-red-100' : 
          balance > 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'
        }`}>
          <span className={`text-[9px] font-black uppercase tracking-widest ${
            balance < 0 ? 'text-red-500' : balance > 0 ? 'text-emerald-500' : 'text-slate-400'
          }`}>
            {balance < 0 ? 'BORCUMUZ' : balance > 0 ? 'ALACAĞIMIZ' : 'BAKİYE SIFIR'}
          </span>
          <div className="flex justify-between items-end mt-1">
            <p className={`text-2xl font-black tracking-tighter leading-none ${
              balance < 0 ? 'text-red-700' : balance > 0 ? 'text-emerald-700' : 'text-slate-900'
            }`}>
              {Math.abs(balance).toLocaleString('tr-TR')} <small className="text-[10px] opacity-40 italic">TL</small>
            </p>
            <span className="text-3xl opacity-20 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all">
              {balance < 0 ? '📦' : balance > 0 ? '💰' : '✅'}
            </span>
          </div>
        </div>

        {/* AKSİYON BUTONLARI */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button 
            onClick={() => onNavigate(`/finans?cariId=${c.id}`)}
            className="bg-slate-900 text-white py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"
          >
            Hızlı İşlem
          </button>
          <button 
            onClick={() => onNavigate(`/cariler/${c.id}`)}
            className="bg-white border-2 border-slate-100 text-slate-400 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 transition-all active:scale-95"
          >
            Özet
          </button>
        </div>
      </div>
    </div>
  );
}