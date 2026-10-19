import { useState, useEffect } from "react";
import { usePageSEO } from "../utils/seo";
import { getPublicServices } from "../services/cmsService";
import {
  Landmark,
  Search,
  Filter,
  ExternalLink,
  FileText,
  Clock,
  Phone,
  CheckCircle,
  HelpCircle,
  Building,
} from "lucide-react";

const FALLBACK_GOVT_SERVICES = [
  {
    title: "Birth & Death Certificate Registration",
    titleHindi: "जन्म एवं मृत्यु प्रमाण पत्र पंजीकरण",
    category: "Certificates & Revenue",
    officeName: "Nagar Panchayat Office / Municipal Desk",
    applicationUrl: "https://crsorgi.gov.in",
    requiredDocuments: ["Hospital discharge slip", "Aadhaar card of parents", "Applicant ID"],
    instructions: "Apply online at CRS portal within 21 days or visit the municipal desk with hospital record.",
    feeStructure: "Rs. 0 - 30",
    processingTimeDays: "7 to 15 days",
    contactPhone: "+91 5564 222102",
  },
  {
    title: "Property & Land Records (Bhulekh UP)",
    titleHindi: "भूलेख एवं खतौनी नकल (उ.प्र.)",
    category: "Certificates & Revenue",
    officeName: "Tehsil / Revenue Department, Govt of UP",
    applicationUrl: "https://upbhulekh.gov.in",
    requiredDocuments: ["Khata / Gata Number or owner name", "Aadhaar ID"],
    instructions: "Enter Tehsil details online to download verified Khasra-Khatauni copy.",
    feeStructure: "Free / Nominal Rs. 15 for certified copy",
    processingTimeDays: "Instant Online / 3 days",
    contactPhone: "+91 5564 222102",
  },
  {
    title: "Electricity Connection & Bill Payment",
    titleHindi: "विद्युत संयोजन एवं बिल भुगतान (UPPCL)",
    category: "Electricity & Utilities",
    officeName: "UPPCL (Urban/Rural Substation Fazilnagar)",
    applicationUrl: "https://www.uppclonline.com",
    requiredDocuments: ["Aadhaar Card", "Ownership proof / Registry / Rent deed", "Passport photo"],
    instructions: "Submit application on UPPCL portal or visit local Fazilnagar electricity office.",
    feeStructure: "As per tariff plan",
    processingTimeDays: "3 to 7 days",
    contactPhone: "1912",
  },
  {
    title: "Public Water Supply & Pipeline Desk",
    titleHindi: "पेयजल आपूर्ति एवं नल कनेक्शन",
    category: "Panchayat & Municipal",
    officeName: "Jal Nigam / Nagar Panchayat Fazilnagar",
    applicationUrl: "https://jn.upsdc.gov.in",
    requiredDocuments: ["House tax receipt", "Aadhaar ID", "Application letter"],
    instructions: "Submit official requisition form at Municipal office or raise online grievance.",
    feeStructure: "Municipal connection fees",
    processingTimeDays: "7 to 14 days",
    contactPhone: "+91 5564 222102",
  },
];

export default function GovtServices() {
  usePageSEO({
    title: "Fazilnagar Public Utilities & Civic Services | Municipal & Citizen Services",
    description: "Citizen service portal for Fazilnagar, Kushinagar (PIN 274401). Access links and guidelines for municipal certificates, UP Bhulekh land records, UPPCL power connection, and Jal Nigam.",
    canonicalPath: "/govt",
  });

  const [services, setServices] = useState(FALLBACK_GOVT_SERVICES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = [
    "All",
    "Certificates & Revenue",
    "Aadhaar & Ration Card",
    "Electricity & Utilities",
    "Panchayat & Municipal",
    "Welfare Schemes & Pensions",
    "Police & Administration",
  ];

  useEffect(() => {
    getPublicServices()
      .then((data) => {
        if (Array.isArray(data)) {
          setServices(data);
        }
      })
      .catch((err) => {
        console.warn("Using fallback govt services:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filtered = services.filter((srv) => {
    const matchesCat = selectedCategory === "All" || srv.category === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      srv.title?.toLowerCase().includes(search.toLowerCase()) ||
      srv.titleHindi?.toLowerCase().includes(search.toLowerCase()) ||
      srv.officeName?.toLowerCase().includes(search.toLowerCase()) ||
      srv.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-8 sm:space-y-10 pb-32 max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#18232E] to-slate-900 text-white p-6 sm:p-8 lg:p-10 rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-3 border border-slate-800/80">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/90 text-white text-[10px] font-bold uppercase tracking-wider">
          <Landmark className="w-3.5 h-3.5" />
          <span>Public Administrative Portal</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-white tracking-tight">
          Fazilnagar Public &amp; Civic Utilities Guide
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
          Official procedures, municipal certificates, UP Bhulekh land records, electricity, e-District links, and citizen welfare schemes in Fazilnagar (PIN 274401, Kushinagar).
        </p>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white dark:bg-[#131823] p-4 sm:p-5 rounded-2xl border border-slate-200/60 dark:border-white/8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] flex flex-col md:flex-row items-center gap-3.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search citizen services (Birth certificate, Bhulekh, Electricity, Ration)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 text-sm sm:text-xs min-h-[44px] focus:ring-2 focus:ring-indigo-500 font-medium bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-auto px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 text-sm sm:text-xs min-h-[44px] focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-[#131823] font-medium text-slate-900 dark:text-white cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white dark:bg-[#131823] rounded-3xl border border-slate-200/60 dark:border-white/8 p-8 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
            <HelpCircle className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No public services matched your search.</p>
            <p className="text-xs text-slate-400 mt-1">Try selecting another category or resetting the search filter.</p>
          </div>
        ) : (
          filtered.map((srv, idx) => (
            <div
              key={srv._id || idx}
              className="bg-white dark:bg-[#131823] p-6 sm:p-8 rounded-3xl border border-slate-200/60 dark:border-white/8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200">
                    {srv.category || "Civic Service"}
                  </span>
                  {srv.feeStructure && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      💰 {srv.feeStructure}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#18232E] leading-snug">
                    {srv.title}
                  </h3>
                  {srv.titleHindi && (
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{srv.titleHindi}</p>
                  )}
                </div>

                {srv.description && (
                  <p className="text-xs text-slate-600 leading-relaxed">{srv.description}</p>
                )}

                <div className="bg-slate-50 p-3.5 rounded-2xl text-xs space-y-2 border border-slate-100 text-slate-700">
                  {srv.requiredDocuments?.length > 0 && (
                    <p>
                      <strong className="text-slate-800">📄 Required Documents:</strong>{" "}
                      {Array.isArray(srv.requiredDocuments)
                        ? srv.requiredDocuments.join(", ")
                        : srv.requiredDocuments}
                    </p>
                  )}
                  {srv.instructions && (
                    <p>
                      <strong className="text-slate-800">📋 Procedure:</strong> {srv.instructions}
                    </p>
                  )}
                  {srv.eligibility && (
                    <p>
                      <strong className="text-slate-800">🎯 Eligibility:</strong> {srv.eligibility}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                  {srv.officeName && (
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      <span>{srv.officeName}</span>
                    </span>
                  )}
                  {srv.processingTimeDays && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span>{srv.processingTimeDays}</span>
                    </span>
                  )}
                  {srv.contactPhone && (
                    <a
                      href={`tel:${srv.contactPhone}`}
                      className="flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{srv.contactPhone}</span>
                    </a>
                  )}
                </div>
              </div>

              {srv.applicationUrl && (
                <a
                  href={srv.applicationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block bg-slate-900 hover:bg-indigo-700 text-white text-center font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-1.5 mt-2 shadow-xs"
                >
                  <span>Visit Official Government Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}