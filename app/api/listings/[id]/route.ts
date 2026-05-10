import { supabaseServiceRole } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listingId = parseInt(id);
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Must be authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { data: listing } = await supabaseServiceRole
      .from("listings")
      .select("seller_id")
      .eq("id", listingId)
      .single();

    if (!listing || listing.seller_id !== userId) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseServiceRole
      .from("listings")
      .update(body)
      .eq("id", listingId)
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error("Update listing error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listingId = parseInt(id);
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Must be authenticated" },
        { status: 401 }
      );
    }

    const { data: listing } = await supabaseServiceRole
      .from("listings")
      .select("seller_id")
      .eq("id", listingId)
      .single();

    if (!listing || listing.seller_id !== userId) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    const { error } = await supabaseServiceRole
      .from("listings")
      .delete()
      .eq("id", listingId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete listing error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
