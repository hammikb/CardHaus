"use client";

import { useState } from "react";

interface MarketplaceFiltersProps {
  onSearch: (search: string) => void;
  onFilter: (filters: { set?: string; language?: string; min?: number; max?: number }) => void;
}

export function MarketplaceFilters({ onSearch, onFilter }: MarketplaceFiltersProps) {
  const [search, setSearch] = useState("");
  const [set, setSet] = useState("");
  const [language, setLanguage] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const handleSearch = (value: string) => {
    setSearch(value);
    onSearch(value);
  };

  const handleFilter = () => {
    onFilter({
      set: set || undefined,
      language: language || undefined,
      min: minPrice ? parseFloat(minPrice) : undefined,
      max: maxPrice ? parseFloat(maxPrice) : undefined,
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <input
          type="text"
          placeholder="Search cards..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <select
          value={set}
          onChange={(e) => setSet(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All Sets</option>
        </select>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All Languages</option>
          <option value="English">English</option>
          <option value="Japanese">Japanese</option>
          <option value="French">French</option>
        </select>
        <input
          type="number"
          placeholder="Min price"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <input
          type="number"
          placeholder="Max price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      <button
        onClick={handleFilter}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        Filter
      </button>
    </div>
  );
}
