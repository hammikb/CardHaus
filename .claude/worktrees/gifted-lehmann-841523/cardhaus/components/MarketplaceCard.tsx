"use client";

import Image from "next/image";

interface CardProps {
  card: {
    id: number;
    name: string;
    image_url: string;
  };
  lowestPrice: number;
  listingCount: number;
  onSelect: () => void;
}

export function MarketplaceCard({ card, lowestPrice, listingCount, onSelect }: CardProps) {
  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer overflow-hidden"
    >
      <div className="relative w-full h-64">
        <Image
          src={card.image_url}
          alt={card.name}
          fill
          className="object-cover"
        />
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate">{card.name}</h3>
        <p className="text-green-600 font-bold mt-2">${lowestPrice.toFixed(2)}</p>
        <p className="text-gray-500 text-xs">{listingCount} listings</p>
      </div>
    </div>
  );
}
