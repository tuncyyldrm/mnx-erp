'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ContactModal } from '@/components/ContactModal';
import { DeleteContactButton } from '@/components/DeleteContactButton';
import { 
  Search, Plus, Wallet, TrendingUp, TrendingDown, 
  Users, MapPin, Phone, FileText, Building2, User as UserIcon,
  ChevronRight, Filter, Info, Briefcase, Hash
} from 'lucide-react';

// --- TÜR TANIMLAMALARI ---
type ContactType = 'customer' | 'supplier' | 'both';

interface Contact {
  id: string;
  name: string;
  type: ContactType;
  balance: number;
  phone?: string;
  email?: string;
  address?: string;
  tax_office?: string;
  tax_number?: string;
  is_company: boolean;
  city?: string;
  district?: string;
  invoice_scenario?: string;
  created_at: string;
}

export default function CarilerPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | ContactType>('all');

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

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // --- GELİŞMİŞ FİLTRELEME ---
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        c.name?.toLowerCase().includes(query) ||
        c.tax_number?.includes(query) ||
        c.phone?.includes(query) ||
        c.city?.toLowerCase().includes(query) ||
        c.district?.toLowerCase().includes(query);
      
      const matchesType = filterType === 'all' || c.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [contacts, searchQuery, filterType]);

  // --- FİNANSAL ÖZET HESAPLAMA ---
  const stats = useMemo(() => {
    return contacts.reduce((acc, curr) => {
      const bal = Number(curr.balance) || 0;
      if (bal > 0) acc.receivable += bal; // Alacaklıyız
      else if (bal < 0) acc.payable += Math.abs(bal); // Borçluyuz
      return acc;
    }, { receivable: 0, payable: 0 });
  }, [contacts]);

  return (
    <div className="bg-[#F8FAFC] min-h-screen font-sans text-slate-900 selection:bg-blue-100">
      <ContactModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        contact={selectedContact}
        onSuccess={() => {
          fetchContacts();
          setIsModalOpen(false);
        }}
      />

      <div className="max-w-[1600px] mx-auto px-4 py-8 md:px-10 md:py-12">
        
        {/* ÜST PANEL: BAŞLIK VE AKSİYONLAR */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-900 rounded-[20px] flex items-center justify-center text-white shadow-2xl rotate-3 shrink-0">
                <Users size={28} />
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tighter italic uppercase text-slate-900 leading-none">
                  CARİLER
                </h1>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2">
                  <Briefcase size={12} /> Memonex İş Ortağı Ağı
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
            {/* Arama & Filtre Grubu */}
            <div className="flex flex-1 md:flex-initial gap-2">
              <div className="relative group flex-1 md:w-80">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="text"
                  placeholder="İsim, Vergi No, Şehir..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border-2 border-slate-100 rounded-[24px] px-6 py-4 pl-14 text-sm font-bold focus:border-blue-500 outline-none transition-all shadow-sm focus:shadow-xl focus:shadow-blue-50/50"
                />
              </div>
              
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="appearance-none bg-white border-2 border-slate-100 rounded-[24px] px-10 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500 shadow-sm transition-all cursor-pointer"
                >
                  <option value="all">TÜMÜ</option>
                  <option value="customer">MÜŞTERİ</option>
                  <option value="supplier">TEDARİKÇİ</option>
                  <option value="both">HİBRİT</option>
                </select>
              </div>
            </div>

            <button 
              onClick={() => { setSelectedContact(null); setIsModalOpen(true); }}
              className="bg-blue-600 text-white px-10 py-4 rounded-[24px] font-black text-[11px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-2xl shadow-blue-200 flex items-center justify-center gap-3 active:scale-95 shrink-0"
            >
              <Plus size={20} strokeWidth={3} /> YENİ KAYIT
            </button>
          </div>
        </div>

        {/* FİNANSAL KPI PANELİ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <StatCard title="Piyasadan Alacak" value={stats.receivable} color="emerald" icon={<TrendingUp size={22}/>} />
          <StatCard title="Toptancıya Borç" value={stats.payable} color="red" icon={<TrendingDown size={22}/>} />
          <StatCard title="Net Finansal Durum" value={stats.receivable - stats.payable} color="blue" icon={<Wallet size={22}/>} />
          <StatCard title="Aktif Kayıtlar" value={contacts.length} color="slate" icon={<Users size={22}/>} isCount />
        </div>

        {/* CARİ LİSTESİ - MASONRY BENZERİ GRID */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[520px] bg-white border-2 border-slate-50 rounded-[56px] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
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

        {/* BOŞ DURUM */}
        {!loading && filteredContacts.length === 0 && (
          <div className="text-center py-40 bg-white border-2 border-dashed border-slate-200 rounded-[64px] flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Search size={40} className="text-slate-200" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs italic">
              Sonuç bulunamadı. Kriterleri değiştirmeyi deneyin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- KPI KARTI BİLEŞENİ ---
function StatCard({ title, value, color, icon, isCount }: any) {
  const isNegative = value < 0 && !isCount;
  
  const themes = {
    emerald: "border-emerald-100 text-emerald-700 bg-white shadow-emerald-100/40",
    red: "border-red-100 text-red-700 bg-white shadow-red-100/40",
    blue: "bg-blue-600 text-white border-blue-500 shadow-blue-200 shadow-2xl",
    slate: "bg-slate-900 text-white border-slate-800 shadow-slate-200 shadow-xl"
  };

  return (
    <div className={`p-8 rounded-[48px] border-2 transition-all hover:scale-[1.02] ${themes[color as keyof typeof themes]}`}>
      <div className="flex justify-between items-center mb-6">
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] italic ${color === 'blue' || color === 'slate' ? 'opacity-60' : 'opacity-40'}`}>
          {title}
        </span>
        <div className={color === 'blue' || color === 'slate' ? 'opacity-40' : 'opacity-20'}>{icon}</div>
      </div>
      <p className="text-4xl font-black tracking-tighter italic leading-none flex items-baseline gap-2">
        {isCount ? value : Math.abs(value).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 
        {!isCount && <span className="text-xs font-bold uppercase opacity-60">TL</span>}
      </p>
      {!isCount && value !== 0 && (
        <div className={`mt-4 text-[9px] font-black uppercase tracking-widest ${color === 'blue' || color === 'slate' ? 'text-white/40' : ''}`}>
          {value > 0 ? '↗ POZİTİF' : '↘ NEGATİF'}
        </div>
      )}
    </div>
  );
}

// --- CARİ KART BİLEŞENİ ---
function CariCard({ c, onEdit, onSuccess, onNavigate }: any) {
  const balance = Number(c.balance) || 0;
  
  const typeConfig = {
    customer: { label: 'MÜŞTERİ', class: 'bg-blue-50 text-blue-600 border-blue-100' },
    supplier: { label: 'TEDARİKÇİ', class: 'bg-amber-50 text-amber-600 border-amber-100' },
    both: { label: 'HİBRİT CARİ', class: 'bg-purple-50 text-purple-600 border-purple-100' }
  };

  return (
    <div className="group bg-white border-2 border-slate-50 p-10 rounded-[56px] hover:shadow-2xl hover:border-blue-500/30 transition-all duration-500 flex flex-col justify-between min-h-[580px] relative overflow-hidden">
      
      {/* Kart Üst Bölümü */}
      <div>
        <div className="flex justify-between items-start mb-8">
          <div className={`text-[9px] font-black px-4 py-2 rounded-xl border uppercase tracking-widest italic ${typeConfig[c.type as keyof typeof typeConfig].class}`}>
            {typeConfig[c.type as keyof typeof typeConfig].label}
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
            <button onClick={onEdit} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
              <FileText size={18} />
            </button>
            <DeleteContactButton id={c.id} name={c.name} onSuccess={onSuccess} />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2 h-2 rounded-full ${c.is_company ? 'bg-blue-500' : 'bg-amber-500 animate-pulse'}`}></div>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic">
            {c.is_company ? 'Kurumsal' : 'Şahıs'} • {c.invoice_scenario || 'Temel Fatura'}
          </span>
        </div>
        
        <h3 className="font-black text-3xl text-slate-900 tracking-tighter leading-[1.1] uppercase italic line-clamp-2 mb-6 group-hover:text-blue-600 transition-colors">
          {c.name}
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm font-black italic text-slate-600 group/item">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 group-hover/item:text-blue-500 transition-colors">
              <Phone size={14} />
            </div>
            {c.phone || '---'}
          </div>
          <div className="flex items-start gap-4 text-[10px] font-black text-slate-400 uppercase italic leading-tight group/item">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 group-hover/item:text-blue-500 transition-colors shrink-0">
              <MapPin size={14} />
            </div>
            <span className="mt-1">
              {c.district ? `${c.district} / ` : ''}{c.city || 'Isparta'}
            </span>
          </div>
          {c.tax_number && (
            <div className="flex items-center gap-4 text-[10px] font-black text-slate-300 uppercase italic group/item">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 group-hover/item:text-blue-500 transition-colors">
                <Hash size={14} />
              </div>
              VN: {c.tax_number}
            </div>
          )}
        </div>
      </div>

      {/* Bakiye ve Alt Aksiyonlar */}
      <div className="mt-10">
        <div className={`p-8 rounded-[40px] border-2 transition-all relative overflow-hidden ${
          balance < 0 ? 'bg-red-50 border-red-100 text-red-700' : 
          balance > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 
          'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
        }`}>
          <span className="text-[9px] font-black uppercase tracking-[0.3em] mb-2 block italic opacity-60">
            {balance < 0 ? 'ÖDEYECEĞİMİZ' : balance > 0 ? 'ALACAĞIMIZ' : 'HESAP DENGEDE'}
          </span>
          <p className="text-4xl font-black tracking-tighter italic leading-none">
            {Math.abs(balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 
            <small className="text-xs font-bold ml-1.5 opacity-40 italic">TL</small>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <button 
            onClick={() => onNavigate(`/finans?cariId=${c.id}`)}
            className="bg-slate-900 text-white py-5 rounded-[24px] font-black text-[10px] uppercase tracking-widest italic hover:bg-blue-600 transition-all flex items-center justify-center gap-2 group/btn shadow-xl shadow-slate-200"
          >
            İŞLEM <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={() => onNavigate(`/cariler/${c.id}`)}
            className="bg-white border-2 border-slate-100 text-slate-400 py-5 rounded-[24px] font-black text-[10px] uppercase tracking-widest italic hover:border-slate-900 hover:text-slate-900 transition-all"
          >
            ÖZET
          </button>
        </div>
      </div>
    </div>
  );
}