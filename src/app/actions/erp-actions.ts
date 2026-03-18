'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// --- TİPLER ---
export type TransactionType = 'sale' | 'purchase' | 'return_in' | 'return_out'
export type FinanceType = 'collection' | 'payment'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card'

// Sayısal değerleri güvenli hale getiren yardımcı fonksiyon
const toNumber = (val: any) => (Number.isFinite(+val) ? +val : 0)

// --- ÜRÜN İŞLEMLERİ (STOK) ---
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
      image_url: data.image_url || null,
      // stock_count burada gönderilmiyor çünkü tetikleyiciler hareketlere göre hesaplayacak
      critical_limit: Math.floor(toNumber(data.critical_limit) || 5),
      shelf_no: data.shelf_no?.toUpperCase(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    })
    if (error) throw error
    revalidatePath('/stok')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: "Ürün kaydedilemedi: " + error.message }
  }
}

// --- CARİ İŞLEMLERİ ---
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
      is_deleted: false
      // balance gönderilmiyor, DB SUM ile hesaplıyor.
    })
    if (error) throw error
    revalidatePath('/cariler')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: "Cari kaydedilemedi: " + error.message }
  }
}

// --- FİNANS (TAHSİLAT / ÖDEME) ---
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

    // Sadece insert yapıyoruz. DB tetikleyicisi 'fn_recalc_contact_balance' 
    // anında carinin yeni bakiyesini hesaplayacak.
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

export async function deleteFinanceEntry(id: string) {
  try {
    // Kayıt silindiğinde DB tetikleyicisi bakiyeyi otomatik geri düzeltecek.
    const { error } = await supabase.from('finance_logs').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/finans')
    revalidatePath('/cariler')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// --- FATURA / İŞLEM (SATIŞ / ALIM) ---
export async function createTransaction(data: {
  contact_id: string
  type: TransactionType
  doc_no?: string
  description?: string
  items: { product_id: string; quantity: number; unit_price: number }[]
}) {
  try {
    if (!data.items?.length) throw new Error("Ürün seçilmedi.");

    const totalAmount = data.items.reduce((sum, i) => 
      sum + (toNumber(i.quantity) * toNumber(i.unit_price)), 0
    );

    // 1. Transaction Başlığı (Bakiye tetikleyicisi buraya bağlı)
    const { data: trans, error: tError } = await supabase
      .from('transactions')
      .insert([{
        contact_id: data.contact_id,
        type: data.type,
        doc_no: data.doc_no || `TR-${Date.now().toString(36).toUpperCase()}`,
        total_amount: totalAmount,
        description: data.description
      }])
      .select('id').single();

    if (tError) throw tError;

    // 2. Transaction Kalemleri (Stok tetikleyicisi buraya bağlı)
    const itemsPayload = data.items.map(i => ({
      transaction_id: trans.id,
      product_id: i.product_id,
      quantity: Math.floor(toNumber(i.quantity)),
      unit_price: toNumber(i.unit_price),
      line_total: toNumber(i.quantity) * toNumber(i.unit_price)
    }));

    const { error: iError } = await supabase.from('transaction_items').insert(itemsPayload);
    
    if (iError) {
      // Kalemler eklenemezse atomik yapıyı korumak için başlığı siliyoruz
      await supabase.from('transactions').delete().eq('id', trans.id);
      throw iError;
    }

    revalidatePath('/')
    revalidatePath('/stok')
    revalidatePath('/cariler')
    revalidatePath('/islemler')
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTransaction(id: string) {
  try {
    // SADECE SİLİYORUZ. DB'deki AFTER DELETE tetikleyicileri (Transactions ve Items üzerinde)
    // bakiyeyi ve stoğu otomatik olarak SIFIRDAN TEKRAR toplayacak.
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/cariler')
    revalidatePath('/stok')
    revalidatePath('/islemler')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// --- SİLME İŞLEMLERİ (SOFT DELETE) ---
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