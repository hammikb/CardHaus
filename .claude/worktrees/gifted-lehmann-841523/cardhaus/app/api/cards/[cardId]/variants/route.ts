import { supabaseServiceRole } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { cardId: string } }
) {
  try {
    const cardId = parseInt(params.cardId);

    const { data: card, error: cardError } = await supabaseServiceRole
      .from("cards")
      .select("*")
      .eq("id", cardId)
      .single();

    if (cardError || !card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const { data: variants, error: variantsError } = await supabaseServiceRole
      .from("card_variants")
      .select(
        `*,
        listings (
          id,
          price,
          condition,
          quantity,
          seller_id,
          seller:profiles(username, rating)
        )`
      )
      .eq("card_id", cardId)
      .order("set_name");

    if (variantsError) throw variantsError;

    const sortedVariants = variants.map((v: any) => ({
      ...v,
      listings: (v.listings || []).sort((a: any, b: any) => a.price - b.price),
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
