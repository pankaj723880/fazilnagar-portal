import { useState } from "react";
import { usePageSEO } from "../utils/seo";

const LOCAL_JOBS = [
  {
    id: 1,
    title: "Full Stack Web Developer",
    company: "Pawa Digital Solutions",
    salary: "₹18,000 - ₹25,000 / Month",
    location: "Fazilnagar Market Square",
    type: "Full-time",
    skills: "React, Node.js, MongoDB, Tailwind CSS",
    contact: "jobs@pawadigital.in",
  },
  {
    id: 2,
    title: "Billing Accountant & Tally Operator",
    company: "Kisan Agro Supplies",
    salary: "₹12,000 - ₹15,000 / Month",
    location: "NH-27 Bypass Road",
    type: "Full-time",
    skills: "Tally Prime, GST filing, MS Excel",
    contact: "+91 98380 11223",
  },
];

const BUSINESS_DIRECTORY = [
  {
    id: 1,
    category: "Restaurants",
    name: "Pawa Highway Family Restaurant",
    address: "NH-27 Highway, Fazilnagar",
    phone: "+91 94152 78901",
    status: "Verified",
    claimed: true,
  },
  {
    id: 2,
    category: "Electronics",
    name: "Gupta Electronics & Appliances",
    address: "Main Market Chauraha",
    phone: "+91 98110 33445",
    status: "Unclaimed",
    claimed: false,
  },
];

export default function JobsAndBusiness() {
  usePageSEO({
    title: "Fazilnagar Jobs & Local Business Directory | Vacancies & Enterprises",
    description: "Find local jobs, career vacancies, and business listings in Fazilnagar, Kushinagar. Discover town enterprises, commercial shops, and local employment opportunities.",
    canonicalPath: "/jobs",
  });
  const [activeTab, setActiveTab] = useState("jobs");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-10 space-y-8 sm:space-y-10 pb-32 font-sans">
      <div className="bg-gradient-to-r from-slate-900 via-[#18232E] to-slate-900 text-white p-6 sm:p-8 lg:p-10 rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="bg-red-600/90 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Commerce & Employment
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-3 tracking-tight font-heading">
            💼 Fazilnagar Jobs &amp; Business Directory
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Browse local openings or claim and list your business.
          </p>
        </div>

        <div className="flex bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 shadow-xs">
          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "jobs"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            👔 Local Jobs
          </button>
          <button
            onClick={() => setActiveTab("directory")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "directory"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🏪 Businesses
          </button>
        </div>
      </div>

      {activeTab === "jobs" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {LOCAL_JOBS.map((job) => (
            <div
              key={job.id}
              className="bg-white dark:bg-[#131823] p-6 sm:p-8 rounded-3xl border border-slate-200/60 dark:border-white/8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-3"
            >
              <span className="text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                {job.type}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{job.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                {job.company} — 📍 {job.location}
              </p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">💰 {job.salary}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {BUSINESS_DIRECTORY.map((biz) => (
            <div
              key={biz.id}
              className="bg-white dark:bg-[#131823] p-6 sm:p-8 rounded-3xl border border-slate-200/60 dark:border-white/8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-2.5"
            >
              <h3 className="font-bold text-slate-900 dark:text-white text-base">{biz.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">📍 {biz.address}</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">📞 {biz.phone}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}