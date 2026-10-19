import { useState } from "react";
import { usePageSEO } from "../utils/seo";

const PRODUCTS = [
  {
    id: 1,
    category: "Handicrafts",
    name: "Handmade Terracotta Pottery & Statues",
    seller: "Pawa Artisan Guild",
    price: "₹350 - ₹1,200",
    contact: "+91 94152 66778",
    location: "Kapas Mandi, Fazilnagar",
  },
  {
    id: 2,
    category: "Sweets",
    name: "Authentic Desi Ghee Khaja & Pedha",
    seller: "Mahavir Sweets",
    price: "₹320 / kg",
    contact: "+91 98380 33221",
    location: "Main Market Chauraha",
  },
  {
    id: 3,
    category: "Clothes",
    name: "Handloom Cotton Sarees & Stoles",
    seller: "Varanasi Silk Emporium Branch",
    price: "₹850 - ₹3,500",
    contact: "+91 98110 55443",
    location: "Station Road Market",
  },
];

export default function Marketplace() {
  usePageSEO({
    title: "Fazilnagar Local Marketplace | Shops, Products & Artisan Goods",
    description: "Browse products from local shops and artisans in Fazilnagar, Kushinagar. Discover handicrafts, sweets, textiles, clothing, electronics, and daily essentials.",
    canonicalPath: "/marketplace",
  });
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Clothes", "Handicrafts", "Food", "Sweets", "Electronics", "Local products"];

  const filteredProducts = PRODUCTS.filter(
    (p) => activeCategory === "All" || p.category === activeCategory
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-10 space-y-8 sm:space-y-10 pb-32 font-sans">
      <div className="bg-gradient-to-r from-slate-900 via-[#18232E] to-slate-900 text-white p-6 sm:p-8 lg:p-10 rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="bg-red-600/90 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Shop Local First
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-3 tracking-tight font-heading">
            🛍️ Fazilnagar Local Marketplace &amp; Shops
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-xl leading-relaxed">
            Direct showcase for local stores, artisans, sweets, electronics, and handloom goods in Fazilnagar.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === cat
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                : "bg-white dark:bg-[#131823] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/8 hover:bg-slate-50 dark:hover:bg-[#1A2234]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {filteredProducts.map((prod) => (
          <div key={prod.id} className="bg-white dark:bg-[#131823] p-6 sm:p-7 rounded-3xl border border-slate-200/60 dark:border-white/8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full">
                {prod.category}
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white pt-1">{prod.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">🏪 Seller: {prod.seller}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">📞 {prod.contact}</p>
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 pt-1">💵 {prod.price}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">📍 {prod.location}</p>
            </div>

            <a
              href={`tel:${prod.contact}`}
              className="w-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-center font-bold text-xs py-2.5 px-3 rounded-xl transition shadow-xs min-h-[44px] flex items-center justify-center gap-1.5"
            >
              <span>📞</span>
              <span>Contact Seller</span>
              <span className="opacity-80 font-normal hidden min-[360px]:inline">({prod.contact})</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}