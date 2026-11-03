import { createClient } from '@supabase/supabase-js';
import type { WasteRecord } from './types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

/* ═══════════════════════════════════════════════════════════════
 * Waste Records
 * ═══════════════════════════════════════════════════════════════ */

export async function fetchAllRecords(): Promise<WasteRecord[]> {
  const { data, error } = await supabase
    .from('waste_records')
    .select('*')
    .order('record_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw error;
  return (data ?? []) as WasteRecord[];
}

export async function insertRecord(
  record: Omit<WasteRecord, 'id' | 'created_at'>
): Promise<WasteRecord> {
  const { data, error } = await supabase
    .from('waste_records')
    .insert([record])
    .select()
    .single();
  if (error) throw error;
  return data as WasteRecord;
}

export function subscribeRecords(callback: (record: WasteRecord) => void) {
  const channel = supabase
    .channel('waste_changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'waste_records' },
      (payload) => callback(payload.new as WasteRecord)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function fetchRecordById(id: string): Promise<WasteRecord | null> {
  const { data, error } = await supabase
    .from('waste_records')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as WasteRecord;
}

export async function updateRecord(
  id: string,
  patch: Partial<WasteRecord>
): Promise<WasteRecord> {
  const { data, error } = await supabase
    .from('waste_records')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as WasteRecord;
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from('waste_records')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/* ═══════════════════════════════════════════════════════════════
 * Photo — บีบอัดก่อนอัปโหลด
 * ═══════════════════════════════════════════════════════════════ */

/**
 * บีบอัดรูปก่อนอัปโหลด — ลดขนาดไฟล์ 70-90%
 * - ถ้ารูปเล็กกว่า 500KB → ไม่บีบ (คืนไฟล์เดิม)
 * - ถ้าเป็น PNG/HEIC → แปลงเป็น JPEG
 * - ย่อขนาดไม่เกิน maxWidth px
 */
export async function compressImage(
  file: File,
  maxWidth = 1280,
  quality = 0.8
): Promise<File> {
  // ไฟล์เล็ก — คืนเดิม
  if (file.size < 500 * 1024) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = e => {
      img.onload = () => {
        // คำนวณขนาดใหม่
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        // วาดลง canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // แปลงเป็น Blob JPEG
        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error('Compression failed'));
              return;
            }
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.(png|heic|heif|webp)$/i, '.jpg'),
              { type: 'image/jpeg', lastModified: Date.now() }
            );
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * อัปโหลดรูป — บีบอัดอัตโนมัติก่อนส่งขึ้น Supabase Storage
 */
export async function uploadPhoto(file: File): Promise<string> {
  // ⭐ บีบอัดก่อน
  let compressed: File;
  try {
    compressed = await compressImage(file);
    console.log(
      `📸 บีบอัด: ${(file.size / 1024).toFixed(0)}KB → ${(
        compressed.size / 1024
      ).toFixed(0)}KB`
    );
  } catch (err) {
    console.warn('Compression failed, using original:', err);
    compressed = file;
  }

  const ext = compressed.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(7)}.${ext}`;
  const filePath = `photos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('waste-photos')
    .upload(filePath, compressed, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/jpeg'
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('waste-photos')
    .getPublicUrl(filePath);

  return data.publicUrl;
}