import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyFirebaseToken } from "@/lib/firebase/admin";
import { extractBearerToken } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { data: club, error: clubErr } = await supabaseAdmin.from("clubs").select("id").eq("slug", params.slug).single();
    if (clubErr || !club) return NextResponse.json({ error: "Kulup bulunamadi" }, { status: 404 });
    const { data: teams, error: teamsErr } = await supabaseAdmin.from("club_teams").select("*, leader:leader_id(id, username, display_name, avatar_url)").eq("club_id", club.id).order("created_at", { ascending: true });
    if (teamsErr) throw teamsErr;
    const teamsWithCount = await Promise.all((teams || []).map(async (team) => {
      const { count } = await supabaseAdmin.from("club_members").select("*", { count: "exact", head: true }).eq("club_id", club.id).eq("team_id", team.id).eq("status", "approved");
      return { ...team, member_count: count ?? 0 };
    }));
    return NextResponse.json({ teams: teamsWithCount });
  } catch (err: any) {
    return NextResponse.json({ error: "Takimlar yuklenemedi" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  const token = extractBearerToken(request.headers.get("Authorization"));
  if (!token) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  try {
    const decoded = await verifyFirebaseToken(token);
    const { data: club, error: clubErr } = await supabaseAdmin.from("clubs").select("id, president_id").eq("slug", params.slug).single();
    if (clubErr || !club) return NextResponse.json({ error: "Kulup bulunamadi" }, { status: 404 });
    if (club.president_id !== decoded.uid) return NextResponse.json({ error: "Yetkisiz: Sadece Baskan takim olusturabilir" }, { status: 403 });
    const body = await request.json();
    const { name, description, logoUrl, leaderId } = body as { name: string; description?: string; logoUrl?: string; leaderId?: string; };
    if (!name?.trim()) return NextResponse.json({ error: "Takim adi zorunludur" }, { status: 400 });
    if (leaderId) {
      const { data: lm } = await supabaseAdmin.from("club_members").select("id, role, status").eq("club_id", club.id).eq("user_id", leaderId).single();
      if (!lm || lm.status !== "approved") return NextResponse.json({ error: "Lider kulubun onayli uyesi degil" }, { status: 400 });
      await supabaseAdmin.from("club_members").update({ role: "leader", updated_at: new Date().toISOString() }).eq("club_id", club.id).eq("user_id", leaderId);
    }
    const { data: newTeam, error: insertErr } = await supabaseAdmin.from("club_teams").insert({ club_id: club.id, name: name.trim(), description: description?.trim() || null, logo_url: logoUrl?.trim() || null, leader_id: leaderId || null }).select("*").single();
    if (insertErr) { if (insertErr.code === "23505") return NextResponse.json({ error: "Bu isimde bir takim zaten mevcut" }, { status: 409 }); throw insertErr; }
    if (leaderId && newTeam) { await supabaseAdmin.from("club_members").update({ team_id: newTeam.id, team_name: name.trim(), updated_at: new Date().toISOString() }).eq("club_id", club.id).eq("user_id", leaderId); }
    return NextResponse.json({ team: newTeam }, { status: 201 });
  } catch (err: any) { console.error("[Club Teams POST]", err.message); return NextResponse.json({ error: "Takim olusturulamadi" }, { status: 500 }); }
}

export async function PUT(request: NextRequest, { params }: { params: { slug: string } }) {
  const token = extractBearerToken(request.headers.get("Authorization"));
  if (!token) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  try {
    const decoded = await verifyFirebaseToken(token);
    const { data: club, error: clubErr } = await supabaseAdmin.from("clubs").select("id, president_id").eq("slug", params.slug).single();
    if (clubErr || !club) return NextResponse.json({ error: "Kulup bulunamadi" }, { status: 404 });
    if (club.president_id !== decoded.uid) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    const body = await request.json();
    const { teamId, name, description, logoUrl, leaderId } = body as { teamId: string; name?: string; description?: string; logoUrl?: string; leaderId?: string | null; };
    if (!teamId) return NextResponse.json({ error: "Team ID gerekli" }, { status: 400 });
    const { data: existingTeam } = await supabaseAdmin.from("club_teams").select("id, leader_id, name").eq("id", teamId).eq("club_id", club.id).single();
    if (!existingTeam) return NextResponse.json({ error: "Takim bulunamadi" }, { status: 404 });
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updatePayload.name = name.trim();
    if (description !== undefined) updatePayload.description = description?.trim() || null;
    if (logoUrl !== undefined) updatePayload.logo_url = logoUrl?.trim() || null;
    if (leaderId !== undefined) {
      if (existingTeam.leader_id && existingTeam.leader_id !== leaderId) { await supabaseAdmin.from("club_members").update({ role: "member", updated_at: new Date().toISOString() }).eq("club_id", club.id).eq("user_id", existingTeam.leader_id).eq("role", "leader"); }
      if (leaderId) {
        const { data: newLm } = await supabaseAdmin.from("club_members").select("id, status").eq("club_id", club.id).eq("user_id", leaderId).single();
        if (!newLm || newLm.status !== "approved") return NextResponse.json({ error: "Lider kulubun onayli uyesi degil" }, { status: 400 });
        await supabaseAdmin.from("club_members").update({ role: "leader", team_id: teamId, team_name: name?.trim() || existingTeam.name, updated_at: new Date().toISOString() }).eq("club_id", club.id).eq("user_id", leaderId);
      }
      updatePayload.leader_id = leaderId;
    }
    const { data: updatedTeam, error: updateErr } = await supabaseAdmin.from("club_teams").update(updatePayload).eq("id", teamId).select("*").single();
    if (updateErr) throw updateErr;
    return NextResponse.json({ team: updatedTeam });
  } catch (err: any) { console.error("[Club Teams PUT]", err.message); return NextResponse.json({ error: "Takim guncellenemedi" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: { slug: string } }) {
  const token = extractBearerToken(request.headers.get("Authorization"));
  if (!token) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  try {
    const decoded = await verifyFirebaseToken(token);
    const { data: club, error: clubErr } = await supabaseAdmin.from("clubs").select("id, president_id").eq("slug", params.slug).single();
    if (clubErr || !club) return NextResponse.json({ error: "Kulup bulunamadi" }, { status: 404 });
    if (club.president_id !== decoded.uid) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    const teamId = request.nextUrl.searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "Team ID gerekli" }, { status: 400 });
    await supabaseAdmin.from("club_members").update({ team_id: null, team_name: null, role: "member", updated_at: new Date().toISOString() }).eq("club_id", club.id).eq("team_id", teamId);
    const { error: deleteErr } = await supabaseAdmin.from("club_teams").delete().eq("id", teamId).eq("club_id", club.id);
    if (deleteErr) throw deleteErr;
    return NextResponse.json({ success: true });
  } catch (err: any) { console.error("[Club Teams DELETE]", err.message); return NextResponse.json({ error: "Takim silinemedi" }, { status: 500 }); }
}