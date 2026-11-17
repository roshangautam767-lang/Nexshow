'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone, sendTicketMessage } from '@/lib/whatsapp';

const UUID = /^[0-9a-f-]{36}$/i;

export async function resendWhatsApp(fd: FormData) {
  const id = String(fd.get('id') ?? '');
  const user = await requireUser(`/booking/${id}`);
  if (UUID.test(id)) {
    const { data: b } = await supabaseAdmin().from('bookings').select('id').eq('id', id).eq('user_id', user.id).eq('status', 'confirmed').maybeSingle();
    if (b) await sendTicketMessage(id, { retry: true });
  }
  revalidatePath(`/booking/${id}`);
  redirect(`/booking/${id}`);
}

// For someone who skipped WhatsApp at checkout: submitting this form is their consent.
export async function requestWhatsApp(fd: FormData) {
  const id = String(fd.get('id') ?? '');
  const user = await requireUser(`/booking/${id}`);
  const phone = String(fd.get('phone') ?? '').trim();
  if (UUID.test(id) && normalizePhone(phone)) {
    const db = supabaseAdmin();
    const { data: b } = await db.from('bookings').update({ phone, whatsapp_consent: true }).eq('id', id).eq('user_id', user.id).eq('status', 'confirmed').select('id').maybeSingle();
    if (b) await sendTicketMessage(id);
  }
  revalidatePath(`/booking/${id}`);
  redirect(`/booking/${id}`);
}
