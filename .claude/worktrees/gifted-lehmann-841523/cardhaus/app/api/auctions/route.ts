import { supabaseServiceRole } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data: auctions, error } = await supabaseServiceRole
      .from("listings")
      .select(
        `*,
        seller:profiles(username),
        card_variant:card_variants(set_name, language),
        product:products(name, set_name)`
      )
      .eq("is_auction", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const { count } = await supabaseServiceRole
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("is_auction", true);

    return NextResponse.json({
      auctions,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Auctions fetch error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
