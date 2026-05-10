import { supabaseServiceRole } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId: productIdParam } = await params;
    const productId = parseInt(productIdParam);

    const { data: product, error: productError } = await supabaseServiceRole
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const { data: listings, error: listingsError } = await supabaseServiceRole
      .from("listings")
      .select(
        `*,
        seller:profiles(username, rating)`
      )
      .eq("product_id", productId)
      .eq("listing_type", "sealed")
      .eq("is_auction", false)
      .order("price");

    if (listingsError) throw listingsError;

    return NextResponse.json({
      product,
      listings,
    });
  } catch (error) {
    console.error("Product listings fetch error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
