import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * GET /api/clubs/[slug]/events
 * ────────────────────────────
 * Kulübün etkinlik takvimini ve LCV (Katılım) durumlarını listeler.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const token = extractBearerToken(request.headers.get('Authorization'));
  const slug = params.slug;

  try {
    const { data: club, error: clubErr } = await supabaseAdmin
      .from('clubs')
      .select('id')
      .eq('slug', slug)
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    const { data: events, error: eventsErr } = await supabaseAdmin
      .from('club_events')
      .select('*')
      .eq('club_id', club.id)
      .order('event_date', { ascending: true });

    if (eventsErr) throw eventsErr;

    // Her etkinlik için LCV sayılarını ve istek yapan kullanıcının kendi LCV durumunu çekelim
    let currentUserUid: string | null = null;
    if (token) {
      try {
        const decoded = await verifyFirebaseToken(token);
        currentUserUid = decoded.uid;
      } catch (e) {}
    }

    const eventsWithRsvps = await Promise.all(
      (events || []).map(async (ev) => {
        // LCV sayıları
        const { data: yesRsvps } = await supabaseAdmin
          .from('club_event_rsvps')
          .select('user_id')
          .eq('event_id', ev.id)
          .eq('status', 'yes');

        const { data: maybeRsvps } = await supabaseAdmin
          .from('club_event_rsvps')
          .select('user_id')
          .eq('event_id', ev.id)
          .eq('status', 'maybe');

        // Kullanıcının kendi durumu
        let myStatus: string | null = null;
        if (currentUserUid) {
          const { data: myRsvp } = await supabaseAdmin
            .from('club_event_rsvps')
            .select('status')
            .eq('event_id', ev.id)
            .eq('user_id', currentUserUid)
            .maybeSingle();
          if (myRsvp) myStatus = myRsvp.status;
        }

        return {
          ...ev,
          rsvp_yes_count: yesRsvps?.length || 0,
          rsvp_maybe_count: maybeRsvps?.length || 0,
          my_rsvp_status: myStatus,
        };
      })
    );

    return NextResponse.json({ events: eventsWithRsvps });
  } catch (err: any) {
    console.error('[Club Events GET] Hata:', err.message || err);
    return NextResponse.json({ error: 'Etkinlikler yüklenemedi' }, { status: 500 });
  }
}

/**
 * POST /api/clubs/[slug]/events
 * ────────────────────────────
 * 1. Yeni etkinlik ekler (Sadece Kulüp Başkanı).
 * 2. `action: 'rsvp'` verilirse kullanıcı LCV kaydeder/günceller.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const token = extractBearerToken(request.headers.get('Authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz: Oturum açmalısınız' }, { status: 401 });
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    const slug = params.slug;

    const { data: club, error: clubErr } = await supabaseAdmin
      .from('clubs')
      .select('id, president_id')
      .eq('slug', slug)
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    const body = await request.json();
    const { action, eventId, rsvpStatus, title, description, location, eventDate } = body as {
      action?: 'rsvp';
      eventId?: string;
      rsvpStatus?: 'yes' | 'no' | 'maybe';
      title?: string;
      description?: string;
      location?: string;
      eventDate?: string;
    };

    // --- CASE A: LCV (Katılım) İşlemi ---
    if (action === 'rsvp') {
      if (!eventId || !rsvpStatus) {
        return NextResponse.json({ error: 'Etkinlik ID ve katılım durumu (yes/no/maybe) gereklidir' }, { status: 400 });
      }

      // RSVP kaydını ekle veya güncelle (UPSERT)
      const { data: rsvp, error: rsvpErr } = await supabaseAdmin
        .from('club_event_rsvps')
        .upsert({
          event_id: eventId,
          user_id: decoded.uid,
          status: rsvpStatus,
          created_at: new Date().toISOString(),
        }, { onConflict: 'event_id,user_id' })
        .select('*')
        .single();

      if (rsvpErr) throw rsvpErr;
      return NextResponse.json({ rsvp });
    }

    // --- CASE B: Yeni Etkinlik Ekleme ---
    if (club.president_id !== decoded.uid) {
      return NextResponse.json({ error: 'Yetkisiz: Sadece Kulüp Başkanı yeni etkinlik oluşturabilir' }, { status: 403 });
    }

    if (!title || !eventDate) {
      return NextResponse.json({ error: 'Etkinlik başlığı ve tarihi zorunludur' }, { status: 400 });
    }

    const { data: newEvent, error: insertErr } = await supabaseAdmin
      .from('club_events')
      .insert({
        club_id: club.id,
        title: title.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        event_date: new Date(eventDate).toISOString(),
      })
      .select('*')
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({ event: newEvent });
  } catch (err: any) {
    console.error('[Club Events POST] Hata:', err.message || err);
    return NextResponse.json({ error: 'İşlem gerçekleştirilemedi' }, { status: 500 });
  }
}

/**
 * DELETE /api/clubs/[slug]/events
 * ──────────────────────────────
 * Etkinliği siler (Sadece Kulüp Başkanı).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const token = extractBearerToken(request.headers.get('Authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz: Oturum açmalısınız' }, { status: 401 });
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    const slug = params.slug;

    const { data: club, error: clubErr } = await supabaseAdmin
      .from('clubs')
      .select('id, president_id')
      .eq('slug', slug)
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    if (club.president_id !== decoded.uid) {
      return NextResponse.json({ error: 'Yetkisiz: Sadece Kulüp Başkanı etkinlikleri silebilir' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Silinecek etkinlik ID gereklidir' }, { status: 400 });
    }

    const { error: deleteErr } = await supabaseAdmin
      .from('club_events')
      .delete()
      .eq('id', eventId)
      .eq('club_id', club.id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Club Events DELETE] Hata:', err.message || err);
    return NextResponse.json({ error: 'Etkinlik silinemedi' }, { status: 500 });
  }
}
