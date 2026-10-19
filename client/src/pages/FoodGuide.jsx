import { useState } from "react";
import { usePageSEO } from "../utils/seo";

const FOOD_ITEMS = [
  {
    id: 1,
    category: "Local food",
    name: "Litti Chokha with Desi Ghee",
    type: "🌱 Vegetarian",
    famousAt: "Raju Litti Corner, Station Road",
    price: "₹60 / Plate",
    desc: "Roasted wheat balls stuffed with spiced sattu, served with roasted eggplant and potato chokha.",
  },
  {
    id: 2,
    category: "Street food",
    name: "Kulhad Matka Chaat & Samosa",
    type: "🌱 Vegetarian",
    famousAt: "Gupta Sweets, Main Chauraha",
    price: "₹30 / Plate",
    desc: "Crispy samosas mashed with hot pea curry, sweet tamarind chutney, and fresh curd in clay pots.",
  },
  {
    id: 3,
    category: "Non-veg",
    name: "Handi Mutton & Dehati Chicken Curry",
    type: "🍗 Non-veg",
    famousAt: "Pawa Highway Dhaba",
    price: "₹220 / Plate",
    desc: "Slow-cooked regional style meat prepared in clay pots with whole garlic and authentic spices.",
  },
];

export default function FoodGuide() {
  usePageSEO({
    title: "Fazilnagar Food Guide | Best Restaurants, Sweet Shops & Street Food",
    description: "Discover the best eateries, sweets, dhabas, tea stalls, and local dining spots in Fazilnagar, Kushinagar. Famous Litti Chokha, street food, and family restaurants.",
    canonicalPath: "/food",
  });
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "🍗 Non-veg", "🌱 Vegetarian", "🍕 Fast food", "🍵 Cafés", "🥘 Local food", "🍰 Bakeries", "🥤 Street food"];

  const filteredFood = FOOD_ITEMS.filter(
    (item) => selectedCategory === "All" || item.category === selectedCategory || item.type === selectedCategory
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-10 space-y-8 sm:space-y-10 pb-32 font-sans">
      <div className="bg-gradient-to-r from-slate-900 via-[#18232E] to-slate-900 text-white p-6 sm:p-8 lg:p-10 rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-3 border border-slate-800/80">
        <span className="bg-red-600/90 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Culinary Trail
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-heading">
          🍛 Fazilnagar Food Guide &amp; Restaurants
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
          Discover legendary street stalls, sweet shops, authentic regional Litti Chokha, cafes, and restaurants in Fazilnagar.
        </p>
      </div>

      {/* Discovery Widget */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-2 border border-amber-400/30">
        <h3 className="font-extrabold text-base">🤔 What should I eat in this city?</h3>
        <p className="text-xs text-amber-100">
          Must-try signature item: <strong>Litti Chokha with Desi Ghee</strong> at Station Road!
        </p>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                : "bg-white dark:bg-[#131823] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/8 hover:bg-slate-50 dark:hover:bg-[#1A2234]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Food Items Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {filteredFood.map((dish) => (
          <div key={dish.id} className="bg-white dark:bg-[#131823] p-6 sm:p-8 rounded-3xl border border-slate-200/60 dark:border-white/8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-3.5 hover:border-slate-300 dark:hover:border-white/20 transition">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40">
                {dish.category}
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{dish.type}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{dish.name}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{dish.desc}</p>
            <div className="bg-slate-50/70 dark:bg-slate-900/50 p-3.5 rounded-2xl text-xs space-y-1.5 border border-slate-100 dark:border-white/8 font-medium text-slate-700 dark:text-slate-300">
              <p>📍 Famous Spot: {dish.famousAt}</p>
              <p>💰 Price: {dish.price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}