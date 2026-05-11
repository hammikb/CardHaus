import { supabaseServiceRole } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Must be authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      card_type,
      card_variant_id,
      product_id,
      price,
      condition,
      grade,
      grade_company,
      images = [],
      product_type = "single",
      sealed_type,
      quantity = 1,
      listing_type,
    } = body;

    const listingType = listing_type ?? product_type;

    if (!title || !price || !card_type || !condition) {
      return NextResponse.json(
        { error: "Title, price, card type, and condition are required" },
        { status: 400 }
      );
    }

    if (listingType === "single" && !card_variant_id) {
      return NextResponse.json(
        { error: "Choose a card from the card database before listing a single" },
        { status: 400 }
      );
    }
    if (listingType === "sealed" && !product_id) {
      return NextResponse.json(
        { error: "Sealed listings require product_id" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServiceRole
      .from("listings")
      .insert({
        seller_id: user.id,
        title,
        description: description || null,
        card_type,
        card_variant_id,
        product_id,
        price,
        condition,
        grade: grade || null,
        grade_company: grade_company || null,
        images,
        product_type,
        sealed_type: sealed_type || null,
        quantity,
        listing_type: listingType,
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
    const productType = searchParams.get("product_type") || searchParams.get("type") || "single";
    const cardType = searchParams.get("card_type");
    const condition = searchParams.get("condition");
    const searchQuery = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "50");
    const mine = searchParams.get("mine") === "1";

    let query = supabaseServiceRole
      .from("listings")
      .select(
        `*,
        profiles(username, verified_vendor),
        card_variant:card_variants(set_name, language, image_url, cards(name, image_url)),
        product:products(name, set_name)`
      )
      .eq("status", "active")
      .eq("product_type", productType)
      .eq("is_auction", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (mine) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: "Must be authenticated" },
          { status: 401 }
        );
      }

      query = query.eq("seller_id", user.id);
    }

    if (cardType) query = query.eq("card_type", cardType);
    if (condition) query = query.eq("condition", condition);
    if (searchQuery) query = query.ilike("title", `%${searchQuery}%`);

    const { data: listings, error } = await query;

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
