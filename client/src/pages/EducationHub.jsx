import { useState } from "react";
import { usePageSEO } from "../utils/seo";

const INSTITUTES = [
  {
    id: 1,
    category: "Colleges",
    name: "Sarvodaya Inter & Degree College",
    courses: "B.A., B.Sc., B.Com, Intermediate (Science & Arts)",
    fees: "₹3,500 - ₹8,000 / Year",
    admission: "Merit-based & Direct Application (June-August)",
    scholarship: "UP State Scholarship & Fee Reimbursement Eligible",
    hostel: "Off-campus tied hostels available nearby",
    contact: "+91 5564 224567",
    location: "College Road, Fazilnagar",
  },
  {
    id: 2,
    category: "Schools",
    name: "St. Joseph's Senior Secondary School",
    courses: "Nursery to Class 12th (CBSE Board)",
    fees: "₹1,200 - ₹2,500 / Month",
    admission: "Entrance evaluation & Interview (March-April)",
    scholarship: "Merit waivers for top 3 rankers",
    hostel: "Day Boarding Facilities",
    contact: "+91 5564 223456",
    location: "Tamkuhi Road, Fazilnagar",
  },
  {
    id: 3,
    category: "Computer Institutes",
    name: "National Computer Academy (NCA)",
    courses: "DCA, ADCA, CCC, MERN Web Dev, Tally Prime",
    fees: "₹500 - ₹1,500 / Month",
    admission: "Direct Enrollment Open Year-round",
    scholarship: "20% waiver for female students",
    hostel: "N/A",
    contact: "+91 98380 99887",
    location: "Main Market, Fazilnagar",
  },
  {
    id: 4,
    category: "Competitive-exam institutes",
    name: "Target Career Institute",
    courses: "UP Police, SSC, NEET/JEE Foundation, Railway",
    fees: "₹6,000 - ₹15,000 / Course",
    admission: "Batch Starts Every Month",
    scholarship: "Scholarship Test Every Sunday",
    hostel: "Partner PG rooms for outstation students",
    contact: "+91 94152 33445",
    location: "Near Bus Station, Fazilnagar",
  },
];

import { matchesSearchText, useDebouncedSearch } from "../utils/searchUtils";

export default function EducationHub() {
  usePageSEO({
    title: "Fazilnagar Education Guide | Schools, Degree Colleges & Coaching Institutes",
    description: "Explore top schools, intermediate colleges, degree colleges, computer academies, and competitive coaching centers in Fazilnagar, Kushinagar (PIN 274401).",
    canonicalPath: "/education",
  });
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedSearch(searchQuery, 200);

  const categories = [
    "All",
    "Schools",
    "Colleges",
    "Coaching centers",
    "Libraries",
    "Computer institutes",
    "Competitive-exam institutes",
  ];

  const filtered = INSTITUTES.filter((item) => {
    const matchesCat = activeCategory === "All" || item.category === activeCategory;
    const target = `${item.name} ${item.category} ${item.courses} ${item.location}`;
    const matchesSearch = matchesSearchText(target, debouncedSearch);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Student & Academic Portal
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-2">🎓 Fazilnagar Education Guide &amp; Colleges</h1>
          <p className="text-slate-300 text-sm mt-1">
            Discover schools, colleges, competitive exam centers, computer academies, and courses in Fazilnagar.
          </p>
        </div>

        <input
          type="text"
          placeholder="Search school, college, course..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-80 bg-slate-800 text-white placeholder-slate-400 px-4 py-3 rounded-2xl text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          aria-label="Search educational institutions"
        />
      </div>

      {/* Screen Reader Announcement */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {filtered.length === 0
          ? `No educational institutions found for "${searchQuery}".`
          : `${filtered.length} institutions available.`}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === cat
                ? "bg-red-700 text-white shadow-md"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Study in Fazilnagar Guide Header */}
      <div className="bg-red-50 border border-red-200 p-5 rounded-3xl flex items-center justify-between text-xs text-red-900">
        <div>
          <h3 className="font-extrabold text-sm">📖 Study in Fazilnagar Guide</h3>
          <p className="mt-0.5">
            Explore admission cycles, scholarships, hostelling, and accredited computer institutes.
          </p>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md mx-auto my-6">
          <p className="text-sm font-bold text-slate-800">No educational institutions found</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery ? `No schools or colleges match "${searchQuery}". Try searching in Hindi (e.g. 'स्कूल', 'कॉलेज') or resetting filters.` : "No institutions found in this category."}
          </p>
          <button
            onClick={() => { setActiveCategory("All"); setSearchQuery(""); }}
            className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* List of Educational Institutions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((inst) => (
          <div
            key={inst.id}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded">
                  {inst.category}
                </span>
                <span className="text-xs text-slate-500">📍 {inst.location}</span>
              </div>

              <h3 className="text-lg font-bold text-slate-900">{inst.name}</h3>

              <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-2 border border-slate-100 text-slate-700">
                <p><strong>📚 Courses:</strong> {inst.courses}</p>
                <p><strong>💵 Fees:</strong> {inst.fees}</p>
                <p><strong>📝 Admissions:</strong> {inst.admission}</p>
                <p><strong>🎓 Scholarships:</strong> {inst.scholarship}</p>
                <p><strong>🏠 Hostel:</strong> {inst.hostel}</p>
                <p><strong>📞 Helpline:</strong> {inst.contact}</p>
              </div>
            </div>

            <a
              href={`tel:${inst.contact}`}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-center font-bold text-xs py-2.5 px-3 rounded-xl transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
            >
              <span>📞</span>
              <span>Call Admission Desk</span>
              <span className="opacity-80 font-normal hidden min-[360px]:inline">({inst.contact})</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}