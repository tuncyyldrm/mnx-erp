'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// --- TİPLER ---
export type TransactionType = 'sale' | 'purchase' | 'return_in' | 'return_out'
export type FinanceType = 'collection' | 'payment'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card'

// Sayısal değerleri güvenli hale getiren yardımcı fonksiyon
const toNumber = (val: any) => (Number.isFinite(+val) ? +val : 0)

/**
 * --- ÜRÜN İŞLEMLERİ (STOK) ---
 * Ürün bilgilerini günceller veya yeni ürün ekler.
 * Stok miktarı (stock_count) burada dokunulmaz, DB hareketlerden hesaplar.
 */
export async function saveProduct(data: any) {
  try {
    const { error } = await supabase.from('products').upsert({
      id: data.id || undefined,
      sku: data.sku?.trim().toUpperCase(),
      oem_code: data.oem_code?.trim() || null,
      name: (data.name || 'İsimsiz Ürün').trim(),
      brand: data.brand?.trim(),
      category: data.category,
      purchase_price: toNumber(data.purchase_price),
      sell_price: toNumber(data.sell_price),
      tax_rate: toNumber(data.tax_rate) || 20,
      image_url: data.image_url || null,
      critical_limit: Math.floor(toNumber(data.critical_limit) || 5),
      shelf_no: data.shelf_no?.toUpperCase(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_active: true
    })

    if (error) throw error
    revalidatePath('/stok')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: "Ürün kaydedilemedi: " + error.message }
  }
}

/**
 * --- CARİ İŞLEMLERİ ---
 */
export async function saveContact(data: any) {
  try {
    const { error } = await supabase.from('contacts').upsert({
      id: data.id || undefined,
      name: (data.name || 'Genel Müşteri').trim(),
      type: data.type || 'customer',
      tax_office: data.tax_office,
      tax_number: data.tax_number,
      phone: data.phone,
      email: data.email,
      address: data.address,
      district: data.district,
      city: data.city,
      is_company: data.is_company ?? true,
      is_deleted: false
    })

    if (error) throw error
    revalidatePath('/cariler')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: "Cari kaydedilemedi: " + error.message }
  }
}

/**
 * --- FİNANS (TAHSİLAT / ÖDEME) ---
 */
export async function addFinanceEntry(data: {
  contact_id: string;
  type: FinanceType;
  amount: number;
  payment_method?: PaymentMethod;
  description?: string;
}) {
  try {
    const amount = Math.abs(toNumber(data.amount))
    if (amount <= 0) throw new Error("Geçerli bir tutar giriniz.")

    const { error } = await supabase.from('finance_logs').insert([{
      contact_id: data.contact_id,
      amount,
      type: data.type,
      payment_method: data.payment_method || 'cash',
      description: data.description,
    }])

    if (error) throw error

    revalidatePath('/finans')
    revalidatePath('/cariler')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * --- FATURA / İŞLEM (SATIŞ / ALIM) ---
 * Memonex ERP'nin kalbi. Hem Transaction hem Item kayıtlarını yapar.
 * Veritabanı tetikleyicileri sayesinde stok ve bakiye otomatik güncellenir.
 */
export async function createTransaction(data: {
  contact_id: string;
  type: TransactionType;
  invoice_type?: 'SATIS' | 'IADE' | 'TEVKIFAT' | 'ISTISNA';
  doc_no?: string;
  items: { 
    product_id: string; 
    quantity: number; 
    unit_price: number; 
    tax_rate: number; 
  }[];
  description?: string;
}) {
  try {
    if (!data.items?.length) throw new Error("İşlem için en az bir ürün seçilmelidir.");

    let subtotal = 0;
    let tax_total = 0;

    // 1. Kalemleri ve Toplamları Hesapla
    const itemsPayload = data.items.map(i => {
      const q = Math.abs(toNumber(i.quantity));
      const p = Math.abs(toNumber(i.unit_price));
      const tr = i.tax_rate ?? 20;
      
      const line_subtotal = q * p;
      const line_tax = (line_subtotal * tr) / 100;
      
      subtotal += line_subtotal;
      tax_total += line_tax;

      return {
        product_id: i.product_id,
        quantity: q,
        unit_price: p,
        tax_rate: tr,
        tax_amount: Number(line_tax.toFixed(2)),
        line_total: Number((line_subtotal + line_tax).toFixed(2)),
        net_unit_price: p // İndirim yoksa birim fiyat net fiyattır
      };
    });

    const grand_total = subtotal + tax_total;

    // 2. Transaction Başlığını Oluştur
    const { data: trans, error: tError } = await supabase
      .from('transactions')
      .insert([{
        contact_id: data.contact_id,
        type: data.type,
        invoice_type: data.invoice_type || 'SATIS',
        doc_no: data.doc_no || `MNX${new Date().getFullYear()}${Date.now().toString().slice(-6)}`,
        ett_no: crypto.randomUUID(), // E-Fatura uyumu için zorunlu
        subtotal: Number(subtotal.toFixed(2)),
        tax_total: Number(tax_total.toFixed(2)),
        total_amount: Number(grand_total.toFixed(2)),
        description: data.description || `Memonex ${data.type} işlemi`,
        status: 'onaylandi'
      }])
      .select('id').single();

    if (tError) throw tError;

    // 3. Kalemleri Kaydet (Transaction Items)
    const finalItems = itemsPayload.map(item => ({ 
      ...item, 
      transaction_id: trans.id 
    }));

    const { error: iError } = await supabase.from('transaction_items').insert(finalItems);
    
    if (iError) {
      // Kalemler eklenemezse başlığı sil (Rollback simülasyonu)
      await supabase.from('transactions').delete().eq('id', trans.id);
      throw iError;
    }

    // Yolları temizle (Cache Refresh)
    revalidatePath('/stok');
    revalidatePath('/cariler');
    revalidatePath('/islemler');
    
    return { success: true, id: trans.id };
  } catch (err: any) {
    console.error("Transaction Error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * --- SİLME İŞLEMLERİ (SOFT & HARD DELETE) ---
 */
export async function deleteTransaction(id: string) {
  try {
    // ÖNEMLİ: SQL'de ON DELETE CASCADE tanımlıysa tek hamlede her şey silinir.
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    
    if (error) {
      // Eğer hala FK hatası alıyorsan, bu mesaj kullanıcıya daha net bilgi verir.
      if (error.code === '23503') {
        throw new Error("Bu işleme bağlı stok hareketleri var. Lütfen önce veritabanında CASCADE ayarını yapın.");
      }
      throw error;
    }

    // Tüm etkilenen sayfaları tazele
    revalidatePath('/stok');
    revalidatePath('/cariler');
    revalidatePath('/islemler');
    revalidatePath('/finans'); 
    
    return { success: true };
  } catch (err: any) {
    console.error("Silme Hatası:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteContact(contactId: string) {
  try {
    const { error } = await supabase.from('contacts').update({ is_deleted: true }).eq('id', contactId)
    if (error) throw error
    revalidatePath('/cariler')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteProduct(productId: string) {
  try {
    const { error } = await supabase.from('products').update({ is_deleted: true }).eq('id', productId)
    if (error) throw error
    revalidatePath('/stok')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
// --- FİNANS (TAHSİLAT / ÖDEME) ---
export async function deleteFinanceEntry(id: string) { // <--- 'export' başında olmalı
  try {
    const { error } = await supabase.from('finance_logs').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/finans')
    revalidatePath('/cariler')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}