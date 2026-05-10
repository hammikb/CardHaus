import { supabaseServiceRole } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabaseServiceRole
      .from("cards")
      .select("id, name, card_number, image_url, created_at");

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: cards, error } = await query
      .order("name")
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const { count } = await supabaseServiceRole
      .from("cards")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      cards,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Cards fetch error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
