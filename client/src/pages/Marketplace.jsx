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
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Shop Local First
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-2">🛍️ Fazilnagar Local Marketplace &amp; Shops</h1>
          <p className="text-slate-300 text-sm mt-1">
            Direct showcase for local stores, artisans, sweets, electronics, and handloom goods in Fazilnagar.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === cat ? "bg-red-700 text-white shadow-md" : "bg-white text-slate-700 border border-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredProducts.map((prod) => (
          <div key={prod.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                {prod.category}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-2">{prod.name}</h3>
              <p className="text-xs text-slate-500 font-medium">🏪 Seller: {prod.seller}</p>
              <p className="text-sm font-extrabold text-emerald-700 mt-2">💵 {prod.price}</p>
              <p className="text-xs text-slate-400 mt-1">📍 {prod.location}</p>
            </div>

            <a
              href={`tel:${prod.contact}`}
              className="block bg-slate-900 hover:bg-slate-800 text-white text-center font-bold text-xs py-2.5 rounded-xl transition-colors"
            >
              📞 Contact Seller ({prod.contact})
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}