'use client';

export function PrintButton() {
  return (
    <>
      <style jsx global>{`
        @media print {
          /* --- SAYFA YAPILANDIRMASI --- */
          @page {
            size: A4 portrait;
            margin: 15mm 10mm 15mm 10mm !important; /* Üst-Sağ-Alt-Sol resmi boşluklar */
          }

          html, body {
            -webkit-print-color-adjust: exact !important; /* Renklerin tam çıkmasını sağlar */
            print-color-adjust: exact !important;
            background-color: white !important;
            color: black !important;
            font-family: 'Arial', 'Helvetica', sans-serif !important;
            font-size: 10pt !important;
            width: 210mm;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          /* --- GÖRÜNÜRLÜK FİLTRESİ --- */
          /* Ekrandaki her şeyi gizle */
          body * {
            visibility: hidden;
            -webkit-print-color-adjust: exact;
          }

          /* Sadece fatura alanını ve içindekileri göster */
          #printable-area,
          #printable-area * {
            visibility: visible;
          }

          /* Yazdırılacak alanın konumunu sıfırla */
          #printable-area {
            position: absolute !important;
            left: 0;
            top: 0;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }

          /* --- RESMİ TABLO KURALLARI --- */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 5mm !important;
            table-layout: auto !important;
            page-break-inside: auto;
          }

          thead {
            display: table-header-group; /* Tablo başlığını her sayfada tekrar eder */
          }

          tr {
            page-break-inside: avoid !important; /* Satırın yarısının alt sayfaya geçmesini engeller */
            break-inside: avoid !important;
          }

          th {
            border: 0.5pt solid #000 !important;
            background-color: #f3f4f6 !important;
            padding: 3mm 2mm !important;
            font-size: 9pt !important;
            font-weight: bold !important;
            text-transform: uppercase;
          }

          td {
            border: 0.5pt solid #000 !important;
            padding: 2.5mm 2mm !important;
            vertical-align: middle !important;
            font-size: 9pt !important;
          }

          /* --- MALİ ÖZET ALANI --- */
          .totals-wrapper {
            display: flex !important;
            justify-content: flex-end !important;
            margin-top: 5mm;
            page-break-inside: avoid !important;
          }

          .totals-table {
            width: 90mm !important;
            border: none !important;
          }

          .totals-table td {
            border: 0.5pt solid #000 !important;
            padding: 2mm !important;
            font-size: 9pt !important;
          }

          .totals-table td:first-child {
            font-weight: bold !important;
            background-color: #f9fafb !important;
            text-align: left !important;
            width: 50%;
          }

          .grand-total {
            background-color: #000 !important;
            color: #fff !important;
            font-weight: bold !important;
            font-size: 11pt !important;
          }

          /* --- TEMİZLİK --- */
          .no-print, 
          .print-hidden,
          button,
          nav,
          footer {
            display: none !important;
          }

          /* Sayfa sonu boşluk engelleyici */
          #printable-area > div:last-child {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
          }
        }
      `}</style>
      
      <button 
        onClick={() => {
          if (typeof window !== 'undefined') {
            window.print();
          }
        }}
        className="group relative flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-2xl active:scale-95 border-b-4 border-black/20 print:hidden"
      >
        <span className="text-lg group-hover:rotate-12 transition-transform duration-300">📄</span>
        <div className="flex flex-col items-start leading-none text-left">
          <span className="font-bold">BELGEYİ</span>
          <span className="text-[8px] opacity-60">Yazdır / PDF</span>
        </div>
      </button>
    </>
  );
}