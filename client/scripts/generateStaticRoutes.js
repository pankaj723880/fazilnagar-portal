import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "../dist");
const templatePath = path.join(distDir, "index.html");

if (!fs.existsSync(templatePath)) {
  console.error("Template dist/index.html not found. Run vite build first.");
  process.exit(1);
}

const template = fs.readFileSync(templatePath, "utf-8");

// Load places data to render static directory previews
let places = [];
try {
  const placesPath = path.join(__dirname, "../src/data/places.json");
  if (fs.existsSync(placesPath)) {
    places = JSON.parse(fs.readFileSync(placesPath, "utf-8"));
  }
} catch (e) {
  console.warn("Could not load places.json for static rendering:", e.message);
}

// Emergency services data
const emergencyServices = [
  { title: "Thana Fazilnagar & Highway Patrol", number: "112", altNumber: "+91 5564 222111", category: "Police", desc: "24/7 Emergency response, Highway Patrol NH-27, and town outpost." },
  { title: "Emergency Medical & CHC Ambulance", number: "108", altNumber: "102", category: "Ambulance", desc: "Free 24/7 Govt Ambulance service for critical emergencies & hospital transfer." },
  { title: "Kushinagar & Fazilnagar Fire Station", number: "101", altNumber: "+91 94152 99101", category: "Fire", desc: "Fire response unit, civil protection & rescue operations." },
  { title: "Community Health Centre (CHC) Emergency", number: "+91 5564 222100", altNumber: "05564-222102", category: "Hospitals", desc: "24/7 Emergency casualty ward, trauma doctor on-duty, and ambulance point." },
  { title: "Women Power Line & Childline 1098", number: "1090", altNumber: "1098", category: "Women & Child", desc: "Confidential 24/7 support for women distress, domestic alerts, and child rights." },
  { title: "Fazilnagar Power Substation Desk", number: "1912", altNumber: "+91 94152 00191", category: "Electricity", desc: "Transformer breakdown, live wire hazards, and line breakdown reporting." },
  { title: "Municipal Water Supply Helpline", number: "+91 5564 222188", altNumber: "1800 180 0101", category: "Water Supply", desc: "Town pipeline leakage alerts, tube-well fault, and tanker dispatch." },
];

const ROUTES = [
  {
    path: "emergency",
    title: "Fazilnagar Emergency Numbers & 24/7 Helplines | Police, Ambulance, Fire",
    description: "Essential 24/7 emergency contacts for Fazilnagar and Kushinagar: Police (112), Ambulance (108/102), Fire (101), CHC Hospital, Women Helpline (1090), and Power Substation.",
    h1: "Fazilnagar Emergency Numbers & 24/7 Helplines",
    schemaType: "EmergencyService",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "EmergencyService",
      "name": "Fazilnagar Town Emergency Services",
      "areaServed": "Fazilnagar, Kushinagar, Uttar Pradesh",
      "telephone": "112",
      "url": "https://fazilnagar.vercel.app/emergency"
    },
    renderBody: () => `
      <main class="w-full max-w-[420px] mx-auto min-h-screen bg-slate-50/60 p-4">
        <header class="mb-4">
          <span class="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">24/7 LIVE HELPLINES</span>
          <h1 class="text-xl font-extrabold text-slate-900 mt-1">Fazilnagar Emergency Numbers &amp; 24/7 Helplines</h1>
          <p class="text-xs text-slate-600 mt-1">Verified instant-dial emergency contacts for Fazilnagar police, medical trauma, fire, women safety, and utility breakdowns.</p>
        </header>
        <section class="space-y-3">
          ${emergencyServices.map(s => `
            <article class="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span class="text-[10px] font-bold uppercase text-slate-500">${s.category}</span>
              <h2 class="text-sm font-bold text-slate-900">${s.title}</h2>
              <p class="text-xs text-slate-600 mb-2">${s.desc}</p>
              <div class="flex items-center gap-2">
                <a href="tel:${s.number.replace(/\s+/g, '')}" class="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold">Call ${s.number}</a>
                <a href="tel:${s.altNumber.replace(/\s+/g, '')}" class="text-xs font-semibold text-slate-600 underline">Alt: ${s.altNumber}</a>
              </div>
            </article>
          `).join("")}
        </section>
      </main>
    `
  },
  {
    path: "news",
    title: "Fazilnagar Local News, Bulletins & Community Updates",
    description: "Latest verified news, civic bulletins, weather alerts, development updates, and community reporting from Fazilnagar town and Kushinagar district.",
    h1: "Fazilnagar Local News & Civic Updates",
    schemaType: "NewsMediaOrganization",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "NewsMediaOrganization",
      "name": "Fazilnagar Community News",
      "url": "https://fazilnagar.vercel.app/news"
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4">
        <header class="mb-6">
          <span class="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded">LOCAL REPORTING</span>
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Fazilnagar Local News &amp; Civic Updates</h1>
          <p class="text-sm text-slate-600 mt-1">Verified local reporting, official press notices, traffic bulletins, and community achievements in Fazilnagar.</p>
        </header>
        <div class="p-4 bg-white rounded-xl border border-slate-200">
          <p class="text-sm text-slate-700">Loading latest community bulletins and verified news feeds...</p>
        </div>
      </main>
    `
  },
  {
    path: "directory",
    title: "Fazilnagar Town Directory | Verified Places, Shops & Institutions",
    description: "Explore verified local businesses, schools, healthcare centers, banks, markets, and municipal places in Fazilnagar (PIN 274401), Kushinagar.",
    h1: "Fazilnagar Town Directory & Civic Places",
    schemaType: "ItemList",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Fazilnagar Civic Directory",
      "url": "https://fazilnagar.vercel.app/directory"
    },
    renderBody: () => `
      <main class="w-full max-w-5xl mx-auto min-h-screen bg-slate-50 p-4">
        <header class="mb-6">
          <span class="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded">VERIFIED DIRECTORY</span>
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Fazilnagar Town Directory &amp; Civic Places</h1>
          <p class="text-sm text-slate-600 mt-1">Ground-truth verified establishments, educational centers, hospitals, and commercial hubs in Fazilnagar PIN 274401.</p>
        </header>
        <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${places.slice(0, 9).map(p => `
            <article class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span class="text-[10px] font-bold text-slate-500 uppercase">${p.category || 'General'}</span>
              <h2 class="text-base font-bold text-slate-900">${p.name}</h2>
              <p class="text-xs text-slate-600 mt-1">${p.addressFull || p.locality || 'Fazilnagar'}</p>
              ${p.phone ? `<a href="tel:${p.phone}" class="inline-block mt-2 text-xs font-semibold text-blue-600">📞 ${p.phone}</a>` : ''}
            </article>
          `).join("")}
        </section>
      </main>
    `
  },
  {
    path: "healthcare",
    title: "Healthcare & Clinics in Fazilnagar | Doctors, Hospitals & Pharmacies",
    description: "Verified directory of Community Health Centre (CHC) Fazilnagar, private hospitals, specialist doctors, diagnostic labs, and 24/7 medical stores in Fazilnagar.",
    h1: "Fazilnagar Healthcare Directory & Hospitals",
    schemaType: "MedicalOrganization",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "MedicalOrganization",
      "name": "Fazilnagar Healthcare Facilities",
      "url": "https://fazilnagar.vercel.app/healthcare"
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4">
        <header class="mb-6">
          <span class="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded">MEDICAL &amp; EMERGENCY</span>
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Fazilnagar Healthcare Directory &amp; Hospitals</h1>
          <p class="text-sm text-slate-600 mt-1">24/7 Casualty ward at CHC Fazilnagar, accredited private clinics, pediatricians, pathology labs, and emergency pharmacies.</p>
        </header>
        <section class="space-y-3">
          ${places.filter(p => (p.category || '').toLowerCase().includes('hospital') || (p.category || '').toLowerCase().includes('health')).slice(0, 6).map(h => `
            <article class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <h2 class="text-base font-bold text-slate-900">${h.name}</h2>
              <p class="text-xs text-slate-600 mt-1">${h.addressFull || h.locality || 'Fazilnagar'}</p>
              ${h.phone ? `<a href="tel:${h.phone}" class="inline-block mt-2 text-xs font-semibold text-emerald-600">Call Hospital: ${h.phone}</a>` : ''}
            </article>
          `).join("")}
        </section>
      </main>
    `
  },
  {
    path: "education",
    title: "Schools, Colleges & Coaching Institutes in Fazilnagar | Education Hub",
    description: "Comprehensive guide to government schools, inter colleges, degree colleges, computer coaching, and competitive exam centers in Fazilnagar, Kushinagar.",
    h1: "Fazilnagar Education Hub & Institutions",
    schemaType: "EducationalOrganization",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      "name": "Fazilnagar Educational Institutions",
      "url": "https://fazilnagar.vercel.app/education"
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4">
        <header class="mb-6">
          <span class="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded">ACADEMIC EXCELLENCE</span>
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Fazilnagar Education Hub &amp; Institutions</h1>
          <p class="text-sm text-slate-600 mt-1">Inter colleges, degree colleges, CBSE/UP Board secondary schools, and vocational institutes in Fazilnagar.</p>
        </header>
        <section class="space-y-3">
          ${places.filter(p => (p.category || '').toLowerCase().includes('school') || (p.category || '').toLowerCase().includes('college')).slice(0, 6).map(e => `
            <article class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <h2 class="text-base font-bold text-slate-900">${e.name}</h2>
              <p class="text-xs text-slate-600 mt-1">${e.addressFull || e.locality || 'Fazilnagar'}</p>
            </article>
          `).join("")}
        </section>
      </main>
    `
  },
  {
    path: "jobs",
    title: "Jobs, Employment & Business Opportunities in Fazilnagar",
    description: "Local job openings, business vacancies, trade listings, and employment updates in Fazilnagar town, Pavangarh, and nearby Kushinagar areas.",
    h1: "Fazilnagar Jobs & Local Business Opportunities",
    schemaType: "WebPage",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Fazilnagar Job Portal",
      "url": "https://fazilnagar.vercel.app/jobs"
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4">
        <header class="mb-6">
          <span class="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded">LOCAL EMPLOYMENT</span>
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Fazilnagar Jobs &amp; Local Business Opportunities</h1>
          <p class="text-sm text-slate-600 mt-1">Discover commercial opportunities, trade connections, and local vacancies in Fazilnagar.</p>
        </header>
      </main>
    `
  },
  {
    path: "govt",
    title: "Government Services, Nagar Panchayat & Public Offices | Fazilnagar",
    description: "Public utilities, Nagar Panchayat Fazilnagar office, Block Development office, police station, post office, and citizen welfare services in Fazilnagar.",
    h1: "Fazilnagar Government Services & Civic Administration",
    schemaType: "GovernmentOffice",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "GovernmentOffice",
      "name": "Fazilnagar Civic Offices & Public Services",
      "url": "https://fazilnagar.vercel.app/govt"
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4">
        <header class="mb-6">
          <span class="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">CIVIC ADMINISTRATION</span>
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Fazilnagar Government Services &amp; Civic Administration</h1>
          <p class="text-sm text-slate-600 mt-1">Directory of Block Development Office, Nagar Panchayat desk, Police Station, and public welfare centers.</p>
        </header>
      </main>
    `
  },
  {
    path: "food",
    title: "Food, Restaurants & Sweet Shops in Fazilnagar | Dining Guide",
    description: "Discover top sweet shops, restaurants, family dhabas, tea stalls, and local culinary specialties across Fazilnagar Market and NH-27.",
    h1: "Fazilnagar Food Guide & Restaurants",
    schemaType: "FoodEstablishment",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "FoodEstablishment",
      "name": "Fazilnagar Food Establishments",
      "url": "https://fazilnagar.vercel.app/food"
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4">
        <header class="mb-6">
          <span class="text-xs font-bold text-orange-700 bg-orange-100 px-2.5 py-1 rounded">CULINARY &amp; SWEETS</span>
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Fazilnagar Food Guide &amp; Restaurants</h1>
          <p class="text-sm text-slate-600 mt-1">Famous local sweets, family dining, tea points, and roadside eateries along NH-27 Fazilnagar.</p>
        </header>
      </main>
    `
  },
  {
    path: "tourism",
    title: "Tourism, Heritage & Historical Places in Fazilnagar & Kushinagar",
    description: "Explore Pawa Nagar (Jain Tirthankar Mahavira Mahaparinirvana site), ancient Kakodha, Buddhist circuit links, and local heritage in Fazilnagar.",
    h1: "Fazilnagar Heritage & Tourism Guide",
    schemaType: "TouristAttraction",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "TouristAttraction",
      "name": "Fazilnagar Heritage & Pilgrimage Circuit",
      "url": "https://fazilnagar.vercel.app/tourism"
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4">
        <header class="mb-6">
          <span class="text-xs font-bold text-teal-700 bg-teal-100 px-2.5 py-1 rounded">PILGRIMAGE &amp; HERITAGE</span>
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Fazilnagar Heritage &amp; Tourism Guide</h1>
          <p class="text-sm text-slate-600 mt-1">Historical significance of Pawa Nagar, Kakodha, and holy sites in Fazilnagar block.</p>
        </header>
      </main>
    `
  },
  {
    path: "transport",
    title: "Transportation, Bus Timings & Travel Guide | Fazilnagar",
    description: "Bus stops, Gorakhpur-Gopalganj roadways timings, auto stands, taxi services, and NH-27 highway connectivity for Fazilnagar town.",
    h1: "Fazilnagar Transportation & Transit Directory",
    schemaType: "BusStation",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "BusStation",
      "name": "Fazilnagar Bus Station & Transport Hub",
      "url": "https://fazilnagar.vercel.app/transport"
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4">
        <header class="mb-6">
          <span class="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded">TRANSIT &amp; HIGHWAY</span>
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Fazilnagar Transportation &amp; Transit Directory</h1>
          <p class="text-sm text-slate-600 mt-1">Roadways bus services, NH-27 highway connectivity, auto stands, and local transit information.</p>
        </header>
      </main>
    `
  },
  {
    path: "marketplace",
    title: "Local Marketplace, Mandi & Shopping in Fazilnagar",
    description: "Weekly town markets, sabzi mandi, electronics stores, cloth merchants, hardware, and retail shops in Main Market Fazilnagar.",
    h1: "Fazilnagar Marketplace & Local Shops",
    schemaType: "ShoppingCenter",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "ShoppingCenter",
      "name": "Fazilnagar Main Market",
      "url": "https://fazilnagar.vercel.app/marketplace"
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4">
        <header class="mb-6">
          <span class="text-xs font-bold text-violet-700 bg-violet-100 px-2.5 py-1 rounded">COMMERCE &amp; SHOPS</span>
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Fazilnagar Marketplace &amp; Local Shops</h1>
          <p class="text-sm text-slate-600 mt-1">Local traders, retail merchants, electronics, garments, agricultural supplies, and daily mandi in Fazilnagar.</p>
        </header>
      </main>
    `
  },
  {
    path: "about",
    title: "About Fazilnagar Town Portal | Unofficial Community Civic Directory",
    description: "Learn about the Fazilnagar Town Civic & Local Directory Portal: an independent, community-driven civic resource for residents and visitors of PIN 274401.",
    h1: "About Fazilnagar Town Portal",
    schemaType: "AboutPage",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "About Fazilnagar Town Portal",
      "url": "https://fazilnagar.vercel.app/about"
    },
    renderBody: () => `
      <main class="w-full max-w-3xl mx-auto min-h-screen bg-white p-6">
        <header class="mb-6 pb-4 border-b border-slate-200">
          <span class="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">UNOFFICIAL COMMUNITY PORTAL</span>
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">About Fazilnagar Town Portal</h1>
          <p class="text-sm text-slate-600 mt-1">An independent community-operated digital directory and information hub for Fazilnagar town, Kushinagar (PIN 274401).</p>
        </header>
        <section class="prose text-sm text-slate-700 space-y-3">
          <p><strong>Notice:</strong> This portal is a community-run public resource and is <strong>not</strong> an official government website of the Nagar Panchayat Fazilnagar or District Administration Kushinagar.</p>
        </section>
      </main>
    `
  },
  {
    path: "contact",
    title: "Contact Us & Report Inaccurate Information | Fazilnagar Civic Portal",
    description: "Contact the volunteer editorial desk of Fazilnagar Town Portal or report incorrect directory listings, closed businesses, or changed phone numbers.",
    h1: "Contact & Report Corrections",
    schemaType: "ContactPage",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "name": "Contact Fazilnagar Civic Portal",
      "url": "https://fazilnagar.vercel.app/contact"
    },
    renderBody: () => `
      <main class="w-full max-w-3xl mx-auto min-h-screen bg-white p-6">
        <header class="mb-6 pb-4 border-b border-slate-200">
          <span class="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded">COMMUNITY DESK</span>
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Contact Us &amp; Report Inaccurate Listings</h1>
          <p class="text-sm text-slate-600 mt-1">Help keep Fazilnagar’s directory 100% accurate. Reach the volunteer team or report corrections.</p>
        </header>
      </main>
    `
  },
  {
    path: "privacy",
    title: "Privacy Policy | Fazilnagar Town Civic & Directory Portal",
    description: "Privacy policy for the community-operated Fazilnagar Town Portal. Learn how citizen data, submissions, and session security cookies are handled.",
    h1: "Privacy Policy",
    schemaType: "WebPage",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Privacy Policy",
      "url": "https://fazilnagar.vercel.app/privacy"
    },
    renderBody: () => `
      <main class="w-full max-w-3xl mx-auto min-h-screen bg-white p-6">
        <header class="mb-6 pb-4 border-b border-slate-200">
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Privacy Policy</h1>
          <p class="text-sm text-slate-600 mt-1">Responsible community data stewardship and session cookie policies.</p>
        </header>
      </main>
    `
  },
  {
    path: "terms",
    title: "Terms of Service & Disclaimer | Fazilnagar Town Civic Portal",
    description: "Terms of service, community conduct guidelines, and non-governmental disclaimer for Fazilnagar Town Portal.",
    h1: "Terms of Service & Disclaimer",
    schemaType: "WebPage",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Terms of Service",
      "url": "https://fazilnagar.vercel.app/terms"
    },
    renderBody: () => `
      <main class="w-full max-w-3xl mx-auto min-h-screen bg-white p-6">
        <header class="mb-6 pb-4 border-b border-slate-200">
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Terms of Service &amp; Non-Governmental Disclaimer</h1>
          <p class="text-sm text-slate-600 mt-1">Official declaration of independent, unofficial, community-operated status.</p>
        </header>
      </main>
    `
  }
];

let generatedCount = 0;

for (const route of ROUTES) {
  const targetDir = path.join(distDir, route.path);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const canonicalUrl = `https://fazilnagar.vercel.app/${route.path}`;
  let html = template;

  // Replace Title
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${route.title}</title>`);

  // Replace Description
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${route.description}" />`);

  // Replace Canonical Link
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}" />`);

  // Replace Open Graph Tags
  html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
  html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${route.title}" />`);
  html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${route.description}" />`);

  // Replace Twitter Card Tags
  html = html.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${route.title}" />`);
  html = html.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${route.description}" />`);

  // Inject route-specific JSON-LD
  const jsonLdScript = `\n    <script type="application/ld+json">\n    ${JSON.stringify(route.schemaContent, null, 2)}\n    </script>\n`;
  html = html.replace("</head>", `${jsonLdScript}</head>`);

  // Inject pre-rendered initial HTML inside <div id="root">
  const initialBody = route.renderBody ? route.renderBody() : `<main style="padding:2rem;font-family:system-ui,sans-serif;"><h1>${route.h1}</h1><p>${route.description}</p></main>`;
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${initialBody}</div>`);

  // Remove the splash shell from static pre-rendered routes so pre-rendered content is 100% visible immediately
  html = html.replace(/<!-- Single Coordinated Launch Splash Shell[\s\S]*?<\/div>\s*<\/div>/i, "<!-- Static sub-route direct entry: splash shell bypassed -->");

  // Inject route-specific noscript fallback strictly into the body noscript (never head font fallback)
  const noscriptHtml = `<noscript id="fallback-noscript"><div style="max-width:800px;margin:2rem auto;padding:1.5rem;font-family:system-ui,sans-serif;color:#18232E;"><h1>${route.h1}</h1><p>${route.description}</p>${initialBody}</div></noscript>`;
  html = html.replace(/<noscript id="fallback-noscript">[\s\S]*?<\/noscript>/i, noscriptHtml);

  const destFile = path.join(targetDir, "index.html");
  fs.writeFileSync(destFile, html, "utf-8");
  generatedCount++;
}

console.log(`[Static Generation] Successfully generated ${generatedCount} route-specific HTML pages in dist/!`);
