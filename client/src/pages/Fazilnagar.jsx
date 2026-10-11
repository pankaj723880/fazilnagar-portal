import { useState, useEffect } from "react";

// Carousel Banner Images
const CAROUSEL_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=1200&auto=format&fit=crop",
    title: "Welcome to Fazilnagar (Pawa Nagar)",
    subtitle: "Sacred land where Bhagwan Mahavira attained Nirvana",
  },
  {
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop",
    title: "Heritage & Culture of Kushinagar District",
    subtitle: "Explore ancient temples, stupas, and peaceful gardens",
  },
  {
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop",
    title: "Flavors of Fazilnagar",
    subtitle: "Discover authentic local dhabas, sweets, and street food",
  },
];

// Tourist Spots Data (Instagram Post Style)
const TOURIST_POSTS = [
  {
    id: 1,
    username: "pawanagar_jain_tirth",
    location: "Fazilnagar Main Town",
    userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop",
    image: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=800&auto=format&fit=crop",
    likes: 2430,
    title: "Pawa Nagar Jain Temple (पावा नगर जैन मंदिर)",
    caption:
      "Fazilnagar is historically identified as Pawa Nagar, the sacred site where the 24th Jain Tirthankara, Lord Mahavira, delivered his last sermon and attained Nirvana in 527 BCE. A serene pilgrimage center for Digambar & Swetambar followers.",
    tags: "#PawaNagar #JainTirth #LordMahavira #Fazilnagar #Heritage",
  },
  {
    id: 2,
    username: "kushinagar_explore",
    location: "Kushinagar (15 km from Fazilnagar)",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop",
    image: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?q=80&w=800&auto=format&fit=crop",
    likes: 1890,
    title: "Mahaparinirvana Stupa & Temple",
    caption:
      "Located just a short drive from Fazilnagar block, this world-renowned Buddhist site marks the place where Gautam Buddha attained Parinirvana. Features a famous 6.1m long reclining Buddha statue.",
    tags: "#Buddhism #Parinirvana #Kushinagar #TravelDiaries",
  },
  {
    id: 3,
    username: "fazilnagar_nature",
    location: "Kakodha Ghat / Kukutta River",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop",
    likes: 1210,
    title: "Kakodha River & Local Pokhra",
    caption:
      "Ancient scriptures mention the Kakodha Ghat along the Kukutta river where pilgrims rest on their journey through the holy circuit between Vaishali, Pawa Nagar, and Kushinagar.",
    tags: "#Nature #Riverside #History #FazilnagarBlock",
  },
];

// Food Outlets Data (Instagram Post Style)
const FOOD_POSTS = [
  {
    id: 1,
    username: "fazilnagar_foodie",
    location: "Fazilnagar Main Market",
    userAvatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800&auto=format&fit=crop",
    likes: 3120,
    title: "Famous Local Samosa & Desi Rabri",
    caption:
      "Nothing beats the morning breakfast in Fazilnagar! Fresh piping hot crispy Samosas served with spicy chole chutney, followed by traditional kulhad Rabri.",
    tags: "#StreetFood #DesiFlavors #FazilnagarMarket #SamosaLove",
  },
  {
    id: 2,
    username: "nh28_dhaba_diaries",
    location: "NH-27 / NH-28 Highway, Fazilnagar",
    userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=800&auto=format&fit=crop",
    likes: 2750,
    title: "Highway Dhabas - Paneer Butter Masala & Tandoori Roti",
    caption:
      "The line of dhabas running along the Fazilnagar highway route offers mouthwatering North Indian meals, dal tadka, fresh butter naan, and sweet lassi.",
    tags: "#HighwayFood #NorthIndianFood #DhabaStyle #FazilnagarHighway",
  },
];

export default function Fazilnagar() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [likedPosts, setLikedPosts] = useState({});

  // Auto-play Carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const toggleLike = (postId) => {
    setLikedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div className="space-y-10 pb-12">
      {/* 1. HERO CAROUSEL */}
      <section className="relative h-[320px] sm:h-[420px] w-full rounded-3xl overflow-hidden shadow-xl">
        {CAROUSEL_SLIDES.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
            <div className="absolute bottom-8 left-6 right-6 text-white max-w-2xl">
              <span className="bg-red-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
                Fazilnagar Highlight
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                {slide.title}
              </h1>
              <p className="text-slate-200 text-sm sm:text-base mt-1">
                {slide.subtitle}
              </p>
            </div>
          </div>
        ))}

        {/* Carousel Indicators */}
        <div className="absolute bottom-4 right-6 z-20 flex space-x-2">
          {CAROUSEL_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2.5 rounded-full transition-all ${
                idx === currentSlide ? "w-8 bg-red-600" : "w-2.5 bg-white/60"
              }`}
            />
          ))}
        </div>
      </section>

      {/* 2. ABOUT FAZILNAGAR BLOCK SECTION */}
      <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 border-b border-slate-100 pb-3">
          About Fazilnagar Block (फ़ाज़िलनगर)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-600 text-sm leading-relaxed">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <h3 className="font-bold text-slate-800 text-base mb-1">📍 Geographical Significance</h3>
            <p>
              Fazilnagar is a major block and town located in the Kushinagar district of Uttar Pradesh, situated on National Highway 27 (NH-28). It acts as a primary commercial center connecting Tamkuhi Raj and Kasia.
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <h3 className="font-bold text-slate-800 text-base mb-1">🏛️ Historical & Religious Heritage</h3>
            <p>
              Renowned as <strong>Pawa Nagar</strong>, it holds immense importance in Jainism as the site of Lord Mahavira's final teachings and Nirvana. It lies directly on the ancient Buddhist-Jain pilgrimage corridor.
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <h3 className="font-bold text-slate-800 text-base mb-1">🌾 Culture & Economy</h3>
            <p>
              Surrounded by lush sugarcane fields and local markets, Fazilnagar is known for its vibrant community, educational institutions, agro-processing, and warm Eastern UP hospitality.
            </p>
          </div>
        </div>
      </section>

      {/* 3. TOURIST PLACES (INSTAGRAM POST LAYOUT) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">
            📸 Tourist & Heritage Places
          </h2>
          <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-3 py-1 rounded-full">
            Instagram View
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TOURIST_POSTS.map((post) => (
            <div
              key={post.id}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col"
            >
              {/* Post Header */}
              <div className="flex items-center space-x-3 p-4 border-b border-slate-100">
                <img
                  src={post.userAvatar}
                  alt={post.username}
                  className="w-10 h-10 rounded-full object-cover border border-red-500 p-0.5"
                />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">{post.username}</p>
                  <p className="text-slate-400">{post.location}</p>
                </div>
              </div>

              {/* Post Image */}
              <div className="relative h-64 bg-slate-100 overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Action Bar */}
              <div className="px-4 pt-3 flex items-center justify-between text-slate-700">
                <div className="flex items-center space-x-4 text-xl">
                  <button
                    onClick={() => toggleLike(`tourist_${post.id}`)}
                    className="focus:outline-none transition-transform active:scale-125"
                  >
                    {likedPosts[`tourist_${post.id}`] ? "❤️" : "🤍"}
                  </button>
                  <button>💬</button>
                  <button>🚀</button>
                </div>
                <button>🔖</button>
              </div>

              {/* Post Content */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {(post.likes + (likedPosts[`tourist_${post.id}`] ? 1 : 0)).toLocaleString()} likes
                  </p>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">
                    {post.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {post.caption}
                  </p>
                </div>
                <p className="text-[11px] font-semibold text-blue-600 mt-2">
                  {post.tags}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. BEST PLACES TO EAT (INSTAGRAM POST LAYOUT) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">
            🍔 Best Places to Eat & Food Highlights
          </h2>
          <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-3 py-1 rounded-full">
            Local Eats
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FOOD_POSTS.map((post) => (
            <div
              key={post.id}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col"
            >
              {/* Post Header */}
              <div className="flex items-center space-x-3 p-4 border-b border-slate-100">
                <img
                  src={post.userAvatar}
                  alt={post.username}
                  className="w-10 h-10 rounded-full object-cover border border-red-500 p-0.5"
                />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">{post.username}</p>
                  <p className="text-slate-400">{post.location}</p>
                </div>
              </div>

              {/* Post Image */}
              <div className="relative h-72 bg-slate-100 overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Action Bar */}
              <div className="px-4 pt-3 flex items-center justify-between text-slate-700">
                <div className="flex items-center space-x-4 text-xl">
                  <button
                    onClick={() => toggleLike(`food_${post.id}`)}
                    className="focus:outline-none transition-transform active:scale-125"
                  >
                    {likedPosts[`food_${post.id}`] ? "❤️" : "🤍"}
                  </button>
                  <button>💬</button>
                  <button>🚀</button>
                </div>
                <button>🔖</button>
              </div>

              {/* Post Content */}
              <div className="p-4 space-y-2">
                <p className="text-xs font-bold text-slate-800">
                  {(post.likes + (likedPosts[`food_${post.id}`] ? 1 : 0)).toLocaleString()} likes
                </p>
                <h3 className="font-bold text-slate-900 text-base">
                  {post.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {post.caption}
                </p>
                <p className="text-[11px] font-semibold text-blue-600">
                  {post.tags}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}