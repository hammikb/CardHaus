import { supabaseServiceRole } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabaseServiceRole
      .from("products")
      .select("id, name, product_type, set_name, image_url, msrp");

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: products, error } = await query
      .order("set_name")
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const { count } = await supabaseServiceRole
      .from("products")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      products,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Products fetch error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
