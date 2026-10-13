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
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Commerce & Employment
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-2">
            💼 Fazilnagar Jobs &amp; Business Directory
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Browse local openings or claim and list your business.
          </p>
        </div>

        <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "jobs"
                ? "bg-red-700 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            👔 Local Jobs
          </button>
          <button
            onClick={() => setActiveTab("directory")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "directory"
                ? "bg-red-700 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🏪 Businesses
          </button>
        </div>
      </div>

      {activeTab === "jobs" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LOCAL_JOBS.map((job) => (
            <div
              key={job.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3"
            >
              <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded border border-emerald-200">
                {job.type}
              </span>
              <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {job.company} — 📍 {job.location}
              </p>
              <p className="text-xs font-bold text-slate-800">💰 {job.salary}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BUSINESS_DIRECTORY.map((biz) => (
            <div
              key={biz.id}
              className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2"
            >
              <h3 className="font-bold text-slate-900">{biz.name}</h3>
              <p className="text-xs text-slate-500">📍 {biz.address}</p>
              <p className="text-xs text-slate-700 font-medium">📞 {biz.phone}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}