'use client';

export function PrintButton() {
  return (
    <>
      <style jsx global>{`
        @media print {
          /* Tarayıcı varsayılan başlık/altlıklarını (URL, Tarih) gizlemeye çalışır */
          @page {
            margin: 0;
            size: auto;
          }

          /* Sayfadaki her şeyi temizle */
          body {
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden;
          }

          /* Yazdırılacak alanı (Fatura/Rapor) sayfanın merkezine ve en üstüne oturt */
          #printable-area, 
          #printable-area * {
            visibility: visible;
          }

          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 2cm !important; /* Standart fatura boşluğu */
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }

          /* Yazdırma sırasında gereksiz gölgeleri ve efektleri kaldır */
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      <button 
        onClick={() => window.print()}
        className="group relative flex items-center justify-center gap-3 bg-brand-dark text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-brand-blue transition-all shadow-2xl shadow-slate-200 active:scale-95 border-b-4 border-black/20"
      >
        <span className="text-lg group-hover:rotate-12 transition-transform duration-300">🖨️</span>
        <div className="flex flex-col items-start leading-none">
          <span>DÖKÜMAN OLUŞTUR</span>
          <span className="text-[7px] opacity-50 mt-1">YAZDIR / PDF OLARAK KAYDET</span>
        </div>
      </button>
    </>
  );
}