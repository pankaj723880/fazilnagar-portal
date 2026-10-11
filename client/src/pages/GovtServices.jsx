const GOVT_SERVICES = [
  {
    title: "Birth & Death Certificate Registration",
    department: "Municipal Board / Nagar Panchayat",
    link: "https://crsorgi.gov.in",
    docs: "Hospital discharge slip, Aadhaar card of parents, applicant ID.",
    steps: "Apply online at CRS portal within 21 days or visit the municipal desk with hospital record.",
  },
  {
    title: "Property & Land Records (Bhulekh UP)",
    department: "Revenue Department, Govt of UP",
    link: "https://upbhulekh.gov.in",
    docs: "Khata / Gata Number or owner name.",
    steps: "Enter Tehsil details online to download verified Khasra-Khatauni copy.",
  },
  {
    title: "Electricity Connection & Bill Payment",
    department: "UPPCL (Urban/Rural Power)",
    link: "https://www.uppclonline.com",
    docs: "Aadhaar Card, ownership proof / rent deed, passport photograph.",
    steps: "Submit application on UPPCL portal or visit local Fazilnagar electricity office.",
  },
  {
    title: "Public Water Supply & Pipeline Desk",
    department: "Jal Nigam / Municipal Board",
    link: "https://jn.upsdc.gov.in",
    docs: "House tax receipt, ID proof.",
    steps: "Submit official requisition form at Municipal office or raise online grievance.",
  },
];

export default function GovtServices() {
  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-2">
        <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Public Administrative Portal
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold">🏛️ Government Services & Forms</h1>
        <p className="text-slate-300 text-sm">
          Official guidelines, direct portal links, required documents, and municipal office contacts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GOVT_SERVICES.map((srv, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded">
                {srv.department}
              </span>
              <h3 className="text-lg font-bold text-slate-900">{srv.title}</h3>
              <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1.5 border border-slate-100 text-slate-700">
                <p><strong>📄 Required Documents:</strong> {srv.docs}</p>
                <p><strong>📋 Procedure:</strong> {srv.steps}</p>
              </div>
            </div>

            <a
              href={srv.link}
              target="_blank"
              rel="noreferrer"
              className="block bg-slate-900 hover:bg-slate-800 text-white text-center font-bold text-xs py-3 rounded-xl transition-colors mt-2"
            >
              🌐 Visit Official Portal →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}