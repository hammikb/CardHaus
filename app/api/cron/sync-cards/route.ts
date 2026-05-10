import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface PokemonTCGCard {
  id: string;
  name: string;
  number?: string;
  images?: {
    small?: string;
    large?: string;
  };
  rarity?: string;
  set?: {
    id?: string;
    name?: string;
  };
  cardmarket?: {
    prices?: {
      averageSellPrice?: number;
      lowPrice?: number;
      trendPrice?: number;
    };
  };
}

async function fetchPokemonTCGCards(): Promise<PokemonTCGCard[]> {
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  if (!apiKey) throw new Error("POKEMON_TCG_API_KEY not set");

  const cards: PokemonTCGCard[] = [];
  let pageUrl = "https://api.pokemontcg.io/v2/cards?pageSize=100";

  while (pageUrl) {
    const res = await fetch(pageUrl, {
      headers: { "X-Api-Key": apiKey },
    });
    if (!res.ok) throw new Error(`Pokemon TCG API error: ${res.statusText}`);

    const data = await res.json();
    cards.push(...data.data);

    pageUrl = data.links?.next || "";
    if (cards.length >= 1000) break;
  }

  return cards;
}

async function syncCards(): Promise<{ inserted: number; updated: number }> {
  const supabaseServiceRole = await createServiceClient();
  const cards = await fetchPokemonTCGCards();
  let inserted = 0;
  let updated = 0;

  for (const card of cards) {
    const imageUrl = card.images?.large || card.images?.small;

    const { data: existingCard, error: selectError } = await supabaseServiceRole
      .from("cards")
      .select("id")
      .eq("pokemon_tcg_id", card.id)
      .maybeSingle();

    if (selectError) {
      console.error(`Error querying card ${card.id}:`, selectError);
      continue;
    }

    let cardId: number;

    if (existingCard) {
      const { error: updateError } = await supabaseServiceRole
        .from("cards")
        .update({
          name: card.name,
          card_number: card.number || null,
          image_url: imageUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingCard.id);

      if (updateError) {
        console.error(`Error updating card ${card.id}:`, updateError);
        continue;
      }

      cardId = existingCard.id;
      updated++;
    } else {
      const { data: insertedCard, error: insertError } = await supabaseServiceRole
        .from("cards")
        .insert({
          pokemon_tcg_id: card.id,
          name: card.name,
          card_number: card.number || null,
          game: "pokemon",
          image_url: imageUrl || null,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`Error inserting card ${card.id}:`, insertError);
        continue;
      }

      cardId = insertedCard!.id;
      inserted++;
    }

    if (card.set?.id) {
      const { error: variantError } = await supabaseServiceRole
        .from("card_variants")
        .upsert(
          {
            card_id: cardId,
            set_id: card.set.id,
            set_name: card.set.name || "Unknown",
            language: "English",
            edition: null,
            rarity: card.rarity || null,
            image_url: imageUrl || null,
          },
          { onConflict: "card_id,set_id,language,edition" }
        );

      if (variantError) {
        console.error(
          `Error upserting variant for card ${card.id}:`,
          variantError
        );
      }
    }
  }

  return { inserted, updated };
}

export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("authorization");
    if (!cronSecret || cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncCards();

    return NextResponse.json({
      success: true,
      message: `Synced cards. Inserted: ${result.inserted}, Updated: ${result.updated}`,
      ...result,
    });
  } catch (error) {
    console.error("Card sync error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
