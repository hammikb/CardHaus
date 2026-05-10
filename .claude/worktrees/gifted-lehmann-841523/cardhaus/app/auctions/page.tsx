"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Auction {
  id: number;
  title: string;
  image_url: string;
  starting_bid: number;
  current_bid: number;
  ends_at: string;
  seller: { username: string; rating: number };
}

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuctions();
  }, []);

  async function fetchAuctions() {
    setLoading(true);
    const res = await fetch("/api/auctions?limit=50");
    const data = await res.json();
    setAuctions(data.auctions || []);
    setLoading(false);
  }

  const getTimeRemaining = (endsAt: string) => {
    const now = new Date();
    const end = new Date(endsAt);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "Ended";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m left`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h left`;
    return `${Math.floor(diff / 86400000)}d left`;
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold mb-8">Auctions</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.isArray(auctions) && auctions.length > 0 ? (
          auctions.map((auction) => (
            <div
              key={auction.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer overflow-hidden"
            >
              <div className="relative w-full h-64">
                {auction.image_url && (
                  <Image
                    src={auction.image_url}
                    alt={auction.title}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm truncate">{auction.title}</h3>
                <p className="text-green-600 font-bold mt-2">
                  ${auction.current_bid.toFixed(2)}
                </p>
                <p className="text-gray-500 text-xs">
                  Started: ${auction.starting_bid.toFixed(2)}
                </p>
                <p className="text-red-600 text-xs font-semibold mt-2">
                  {getTimeRemaining(auction.ends_at)}
                </p>
                <p className="text-gray-600 text-xs mt-2">
                  By: {auction.seller.username}
                </p>
                <button className="w-full mt-3 bg-blue-600 text-white text-sm py-1 rounded hover:bg-blue-700">
                  Bid
                </button>
              </div>
            </div>
          ))
        ) : (
          <p>No auctions</p>
        )}
      </div>
    </div>
  );
}
