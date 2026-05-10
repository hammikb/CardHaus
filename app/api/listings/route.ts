import { supabaseServiceRole } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Must be authenticated" },
        { status: 401 }
      );
    }

    const {
      card_variant_id,
      product_id,
      price,
      condition,
      quantity,
      listing_type,
    } = body;

    if (listing_type === "single" && !card_variant_id) {
      return NextResponse.json(
        { error: "Single listings require card_variant_id" },
        { status: 400 }
      );
    }
    if (listing_type === "sealed" && !product_id) {
      return NextResponse.json(
        { error: "Sealed listings require product_id" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServiceRole
      .from("listings")
      .insert({
        seller_id: userId,
        card_variant_id,
        product_id,
        price,
        condition,
        quantity,
        listing_type,
        is_auction: false,
      })
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Create listing error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "single";
    const limit = parseInt(searchParams.get("limit") || "50");

    const { data: listings, error } = await supabaseServiceRole
      .from("listings")
      .select(
        `*,
        seller:profiles(username, rating),
        card_variant:card_variants(set_name, language),
        product:products(name, set_name)`
      )
      .eq("listing_type", type)
      .eq("is_auction", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ listings });
  } catch (error) {
    console.error("List listings error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
