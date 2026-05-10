"use client";

import { useEffect, useState } from "react";
import { MarketplaceCard } from "@/components/MarketplaceCard";
import { MarketplaceFilters } from "@/components/MarketplaceFilters";

interface Card {
  id: number;
  name: string;
  image_url: string;
}

interface CardVariant {
  id: number;
  set_name: string;
  language: string;
  listings: Array<{ price: number }>;
}

export default function MarketplacePage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [variants, setVariants] = useState<CardVariant[]>([]);

  useEffect(() => {
    fetchCards();
  }, [search]);

  async function fetchCards() {
    setLoading(true);
    const res = await fetch(`/api/cards?search=${search}&limit=50`);
    const data = await res.json();
    setCards(data.cards || []);
    setLoading(false);
  }

  async function handleSelectCard(card: Card) {
    setSelectedCard(card);
    const res = await fetch(`/api/cards/${card.id}/variants`);
    const data = await res.json();
    setVariants(data.variants || []);
  }

  const getLowestPrice = (card: Card) => {
    let lowest = Infinity;
    variants.forEach((v) => {
      if (v.listings && v.listings.length > 0) {
        const minListing = Math.min(...v.listings.map((l) => l.price));
        lowest = Math.min(lowest, minListing);
      }
    });
    return lowest === Infinity ? 0 : lowest;
  };

  const getTotalListings = (card: Card) => {
    return variants.reduce((sum, v) => sum + (v.listings?.length || 0), 0);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold mb-8">Marketplace</h1>

      <MarketplaceFilters
        onSearch={setSearch}
        onFilter={() => {}}
      />

      {selectedCard && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <button
            onClick={() => setSelectedCard(null)}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold">{selectedCard.name}</h2>
          <div className="mt-4 space-y-4">
            {Array.isArray(variants) && variants.length > 0 ? (
              variants.map((variant) => (
                <div key={variant.id} className="border-b pb-4">
                  <h3 className="font-semibold">
                    {variant.set_name} - {variant.language}
                  </h3>
                  {variant.listings && variant.listings.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {variant.listings
                        .sort((a, b) => a.price - b.price)
                        .slice(0, 5)
                        .map((listing, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>${listing.price.toFixed(2)}</span>
                            <button className="text-blue-600">View</button>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm mt-2">No listings</p>
                  )}
                </div>
              ))
            ) : (
              <p>No variants</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.isArray(cards) && cards.length > 0 ? (
          cards.map((card) => (
            <MarketplaceCard
              key={card.id}
              card={card}
              lowestPrice={getLowestPrice(card)}
              listingCount={getTotalListings(card)}
              onSelect={() => handleSelectCard(card)}
            />
          ))
        ) : (
          <p>No cards found</p>
        )}
      </div>
    </div>
  );
}
