import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type ListingRow = {
  id: string;
  card_variant_id: string;
  price: number;
  condition: string;
  quantity: number;
  seller_id: string;
  profiles:
    | { username: string; verified_vendor: boolean }
    | { username: string; verified_vendor: boolean }[]
    | null;
};

type CardVariantRow = {
  id: string;
  [key: string]: unknown;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;
    const supabase = await createServiceClient();

    const { data: cards, error: cardError } = await supabase
      .from("cards")
      .select("*")
      .eq("id", cardId);

    if (cardError || !cards || cards.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const card = cards[0];

    const { data: variants, error: variantsError } = await supabase
      .from("card_variants")
      .select("*")
      .eq("card_id", cardId)
      .order("set_name");

    if (variantsError) throw variantsError;

    // Fetch listings separately to ensure price field is available
    const variantIds = ((variants || []) as CardVariantRow[]).map((v) => v.id);
    let listingsMap: Record<string, ListingRow[]> = {};

    if (variantIds.length > 0) {
      const { data: listings, error: listingsError } = await supabase
        .from("listings")
        .select("id, card_variant_id, price, condition, quantity, seller_id, profiles(username, verified_vendor)")
        .in("card_variant_id", variantIds)
        .eq("status", "active");

      if (!listingsError && listings) {
        listingsMap = (listings as unknown as ListingRow[]).reduce<Record<string, ListingRow[]>>((map, listing) => {
          if (!map[listing.card_variant_id]) {
            map[listing.card_variant_id] = [];
          }
          map[listing.card_variant_id].push(listing);
          return map;
        }, {});
      }
    }

    const sortedVariants = ((variants || []) as CardVariantRow[]).map((v) => ({
      ...v,
      listings: (listingsMap[v.id] || []).sort((a, b) => a.price - b.price),
    }));

    return NextResponse.json({
      card,
      variants: sortedVariants,
    });
  } catch (error) {
    console.error("Card variants fetch error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
