"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Auction {
  id: string;
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
    let cancelled = false;

    async function loadAuctions() {
      const res = await fetch("/api/auctions?limit=50");
      const data = await res.json();
      if (!cancelled) {
        setAuctions(Array.isArray(data) ? data : data.auctions || []);
        setLoading(false);
      }
    }

    loadAuctions();

    return () => {
      cancelled = true;
    };
  }, []);

  const getTimeRemaining = (endsAt: string) => {
    const now = new Date();
    const end = new Date(endsAt);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "Ended";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m left`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h left`;
    return `${Math.floor(diff / 86400000)}d left`;
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <p className="text-slate-600">Loading auctions...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-slate-950 mb-3">Live Auctions</h1>
          <p className="text-slate-600 text-lg">Bid on rare and exclusive cards</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {auctions.map((auction) => (
            <div
              key={auction.id}
              className="group rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              <div className="relative w-full aspect-square bg-slate-100 overflow-hidden">
                {auction.image_url && (
                  <Image
                    src={auction.image_url}
                    alt={auction.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm text-slate-900 line-clamp-2 mb-3">
                  {auction.title}
                </h3>
                <div className="space-y-2 mb-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Current bid</p>
                    <p className="text-xl font-black text-slate-950">
                      ${auction.current_bid.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-slate-500">Start</p>
                      <p className="text-sm text-slate-600">
                        ${auction.starting_bid.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        {getTimeRemaining(auction.ends_at)}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  By {auction.seller.username}
                </p>
                <button className="w-full bg-blue-600 text-white text-sm font-bold py-2.5 rounded-lg transition-all duration-200 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:translate-y-0.5">
                  Place Bid
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
