import { useState } from "react";

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
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "🍗 Non-veg", "🌱 Vegetarian", "🍕 Fast food", "🍵 Cafés", "🥘 Local food", "🍰 Bakeries", "🥤 Street food"];

  const filteredFood = FOOD_ITEMS.filter(
    (item) => selectedCategory === "All" || item.category === selectedCategory || item.type === selectedCategory
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-2">
        <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Culinary Trail
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold">🍛 Local Food Guide</h1>
        <p className="text-slate-300 text-sm">
          Discover legendary street stalls, iconic regional dishes, cafes, and bakeries.
        </p>
      </div>

      {/* Discovery Widget */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-5 rounded-3xl space-y-2">
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
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat ? "bg-red-700 text-white shadow-md" : "bg-white text-slate-700 border border-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Food Items Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFood.map((dish) => (
          <div key={dish.id} className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded">
                {dish.category}
              </span>
              <span className="text-xs font-bold text-slate-700">{dish.type}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{dish.name}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{dish.desc}</p>
            <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1 border border-slate-100 font-semibold text-slate-700">
              <p>📍 Famous Spot: {dish.famousAt}</p>
              <p>💰 Price: {dish.price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}