import { useState } from "react";
import { usePageSEO } from "../utils/seo";
import { openGoogleMapsDirections } from "../utils/directions";

const HEALTHCARE_PLACES = [
  {
    id: 1,
    type: "Hospital",
    name: "Community Health Centre (CHC)",
    specialization: "General Surgery, Medicine & Inpatient Care",
    timing: "24/7 OPD & Emergency",
    emergency: true,
    location: "Hospital Road, Fazilnagar",
    addressFull: "Hospital Road, Fazilnagar - 274401",
    contact: "+91 5564 222100",
    latitude: 26.6818,
    longitude: 84.0531,
    lat: 26.6818,
    lng: 84.0531,
  },
  {
    id: 2,
    type: "Clinic",
    name: "Arogya Child & Family Clinic",
    specialization: "Pediatrics & Family Medicine",
    timing: "09:00 AM - 02:00 PM | 05:00 PM - 08:00 PM",
    emergency: false,
    location: "College Road, Fazilnagar",
    addressFull: "College Road, Fazilnagar - 274401",
    contact: "+91 98381 22334",
    latitude: 26.684,
    longitude: 84.0504,
    lat: 26.684,
    lng: 84.0504,
  },
  {
    id: 3,
    type: "Pharmacy",
    name: "Sanjivani Medical & General Stores",
    specialization: "24-Hour Medicines & Surgical Supplies",
    timing: "08:00 AM - 10:30 PM",
    emergency: true,
    location: "Main Market Chauraha, Fazilnagar",
    addressFull: "Main Market Chauraha, Fazilnagar - 274401",
    contact: "+91 94152 88776",
    latitude: 26.6836,
    longitude: 84.0507,
    lat: 26.6836,
    lng: 84.0507,
  },
  {
    id: 4,
    type: "Diagnostic Center",
    name: "Pawa City Pathology Lab & X-Ray",
    specialization: "Pathology, Blood Testing & Diagnostics",
    timing: "07:00 AM - 07:00 PM",
    emergency: false,
    location: "Hospital Road, Fazilnagar",
    addressFull: "Hospital Road, Fazilnagar - 274401",
    contact: "+91 98110 44556",
    latitude: 26.6822,
    longitude: 84.0518,
    lat: 26.6822,
    lng: 84.0518,
  },
];

export default function HealthcareDirectory() {
  usePageSEO({
    title: "Fazilnagar Healthcare Directory | Hospitals, Doctors, Clinics & Pharmacies",
    description: "Find hospitals, doctors, clinics, 24-hour pharmacies, and diagnostic centers in Fazilnagar, Kushinagar. Includes Community Health Centre (CHC) contact details and locations.",
    canonicalPath: "/healthcare",
  });
  const [activeType, setActiveType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const types = ["All", "Hospital", "Clinic", "Pharmacy", "Diagnostic Center"];

  const filteredHealthcare = HEALTHCARE_PLACES.filter((item) => {
    const matchesType = activeType === "All" || item.type === activeType;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Verified Medical Registry
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-2">
            🏥 Fazilnagar Healthcare &amp; Medical Directory
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Search Fazilnagar hospitals, Community Health Centre (CHC), clinics, pharmacies, and diagnostic labs.
          </p>
        </div>

        <input
          type="text"
          placeholder="Search facility name or service..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-80 bg-slate-800 text-white placeholder-slate-400 px-4 py-3 rounded-2xl text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {types.map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeType === type
                ? "bg-red-700 text-white shadow-md"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredHealthcare.map((place) => (
          <div
            key={place.id}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:border-red-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-red-700 bg-red-50 px-2.5 py-0.5 rounded">
                  {place.type}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                  {place.name}
                </h3>
              </div>

              {place.emergency && (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-300">
                  🚨 24/7 Emergency
                </span>
              )}
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl text-xs space-y-2 border border-slate-100">
              <p className="text-slate-700 font-medium flex items-center gap-1.5">
                <span>🩺</span>
                <span>{place.specialization}</span>
              </p>
              <div className="pt-2 border-t border-slate-200 text-slate-600 flex items-center gap-1.5">
                <span>🕒</span>
                <span>{place.timing}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>📍 {place.location}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <a
                href={`tel:${place.contact.replace(/\s+/g, "")}`}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl text-center"
              >
                📞 Call ({place.contact})
              </a>
              <button
                type="button"
                onClick={() => openGoogleMapsDirections(place)}
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold py-2.5 rounded-xl text-center cursor-pointer transition-colors"
              >
                🧭 Directions
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}