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
const BASE_URL = "https://www.fazilnagar.me";

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

// Canonical Heritage Sites (Twin Heritage Circuit)
const heritageSites = [
  {
    name: "Pawapuri Jain Tirth Kshetra (पावापुरी तीर्थ)",
    nameHindi: "पावा निर्वाण भूमि तीर्थ",
    category: "Jain Pilgrimage & Heritage",
    distance: "0 km (Town Center, NH-27 Corridor)",
    address: "Pawapuri Mandir Campus, Fazilnagar - 274401",
    hours: "05:30 AM - 08:30 PM",
    desc: "Sacred Nirvana Sthal of 24th Tirthankar Bhagwan Mahavira according to archaeological and Jain scriptural tradition (ancient Pawa, 527 BCE). Features marble temples, quiet meditation courtyards, and pilgrim dharamshala.",
  },
  {
    name: "Historic Kakodha Ghat & Archaeological Remains (ककोधा घाट)",
    nameHindi: "ककुत्था नदी तट एवं ककोधा",
    category: "Historical & Buddhist Circuit",
    distance: "2 km (Town Environs)",
    address: "Kakodha Ghat, Fazilnagar, Kushinagar",
    hours: "Open Daylight Hours",
    desc: "Revered site along ancient Kukuttha river where Lord Buddha bathed and drank clean water on his final sacred journey from Pawa towards Kushinagar. Ancient terracotta and brick remnants unearthed here.",
  },
  {
    name: "Mahaparinirvana Temple & Nirvana Stupa (Kushinagar Twin Axis)",
    nameHindi: "महापरिनिर्वाण मंदिर एवं स्तूप",
    category: "Buddhist Heritage Axis",
    distance: "18 km West (Direct NH-27 Corridor)",
    address: "Archaeological Park, Kushinagar - 274403",
    hours: "06:00 AM - 06:00 PM",
    desc: "Commemorating the sacred site where Gautam Buddha attained Mahaparinirvana in 483 BCE under the twin Sal trees. Directly linked with Fazilnagar along the historic pilgrimage axis.",
  },
  {
    name: "Ancient Ramabhar Stupa - Holy Cremation Mound",
    nameHindi: "रामाभार स्तूप (मुकुटबंधन चैत्य)",
    category: "Buddhist Pilgrimage Mound",
    distance: "19 km West",
    address: "Ramabhar, Kushinagar - 274403",
    hours: "06:00 AM - 06:00 PM",
    desc: "A 49-foot ancient brick stupa marking the holy cremation ground (Mukutbandhana Chaitya) of Gautam Buddha, maintained by the Archaeological Survey of India (ASI).",
  },
];

// Verified Local News Items
const newsStories = [
  {
    title: "Har Har Mahadev - Local Cultural & Heritage Bulletin",
    category: "Heritage & Culture",
    publishedAt: "Verified Update",
    author: "Fazilnagar Community Editorial Desk",
    summary: "Community coverage of sacred festivals, cultural events, and heritage activities in Fazilnagar town and Pavangarh corridor.",
  },
  {
    title: "NH-27 Highway Corridor & Town Connectivity Advisory",
    category: "Civic & Infrastructure",
    publishedAt: "Civic Bulletin",
    author: "Civic Information Desk",
    summary: "Smooth four-lane connectivity along NH-27 linking Fazilnagar directly with Kushinagar (18 km), Gorakhpur (70 km), and Tamkuhi Raj.",
  },
  {
    title: "Community Health Centre (CHC) Fazilnagar 24/7 Emergency Alert",
    category: "Healthcare Notice",
    publishedAt: "Health Desk",
    author: "CHC Medical Desk",
    summary: "24/7 emergency casualty ward, trauma on-call medical officers, neonatal care, and 108/102 ambulance dispatch operating at Hospital Road.",
  },
];

const ROUTES = [
  {
    path: "", // Root Homepage
    title: "Fazilnagar Town Civic & Local Directory Portal | Kushinagar, UP",
    description: "Official civic and local directory portal for Fazilnagar town (PIN 274401, Kushinagar, Uttar Pradesh). Verified town directory of schools, hospitals, local doctors, emergency helplines, shops, markets, and community news.",
    h1: "Fazilnagar Town Civic & Local Directory Portal",
    schemaType: "WebSite",
    schemaContent: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": `${BASE_URL}/#website`,
          "url": `${BASE_URL}/`,
          "name": "Fazilnagar Town Portal",
          "description": "Fazilnagar Town Civic & Local Directory Portal (PIN 274401, Kushinagar, Uttar Pradesh)",
          "publisher": {
            "@type": "Organization",
            "name": "Fazilnagar Civic Community Portal",
            "url": `${BASE_URL}/`,
            "logo": `${BASE_URL}/icon-512.svg`
          },
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": `${BASE_URL}/directory?search={search_term_string}`
            },
            "query-input": "required name=search_term_string"
          }
        },
        {
          "@type": "Place",
          "@id": `${BASE_URL}/#place`,
          "name": "Fazilnagar",
          "alternateName": ["फाजिलनगर", "Pawanagar", "Fazilnagar Kushinagar"],
          "description": "Town and nagar panchayat in Kushinagar district, Uttar Pradesh, India (PIN 274401)",
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": "26.6835",
            "longitude": "84.0489"
          },
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Fazilnagar",
            "addressRegion": "Uttar Pradesh",
            "postalCode": "274401",
            "addressCountry": "IN"
          }
        }
      ]
    },
    renderBody: () => `
      <main class="w-full max-w-5xl mx-auto min-h-screen bg-slate-50 p-4 sm:p-6 space-y-6">
        <header class="text-center py-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <span class="inline-block text-xs font-bold text-[#B8323C] bg-rose-50 border border-rose-200 px-3 py-1 rounded-full uppercase tracking-wider">PIN 274401 • Kushinagar, UP</span>
          <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 font-heading">Fazilnagar Town Civic &amp; Directory Portal</h1>
          <p class="text-sm text-slate-600 max-w-2xl mx-auto mt-2 leading-relaxed">
            Welcome to the community-driven civic and local directory portal for Fazilnagar town (फाजिलनगर), situated along NH-27 in Kushinagar district, Uttar Pradesh. Access verified listings for schools, hospitals, doctors, emergency aid, local businesses, and town news.
          </p>
        </header>

        <section class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span class="text-rose-600">🚨</span> 24/7 Essential Emergency Helplines
            </h2>
            <a href="/emergency" class="text-xs font-semibold text-rose-600 hover:underline">View All &rarr;</a>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            ${emergencyServices.slice(0, 4).map(s => `
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-[10px] font-bold text-slate-500 uppercase">${s.category}</span>
                <h3 class="text-sm font-bold text-slate-900">${s.title}</h3>
                <a href="tel:${s.number.replace(/\s+/g, '')}" class="inline-block mt-2 px-3 py-1 bg-[#B8323C] text-white text-xs font-bold rounded-lg">Call ${s.number}</a>
              </div>
            `).join("")}
          </div>
        </section>

        <section class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span class="text-emerald-600">🗺️</span> Verified Civic Directory (37 Places)
            </h2>
            <a href="/directory" class="text-xs font-semibold text-emerald-600 hover:underline">Full Directory &rarr;</a>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            ${places.slice(0, 6).map(p => `
              <article class="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-[10px] font-bold text-slate-500 uppercase">${p.category || 'General'}</span>
                <h3 class="text-sm font-bold text-slate-900">${p.name}</h3>
                <p class="text-xs text-slate-600 mt-1">${p.addressFull || p.locality || 'Fazilnagar'}</p>
                ${p.phone ? `<a href="tel:${p.phone}" class="inline-block mt-2 text-xs font-semibold text-blue-600">📞 ${p.phone}</a>` : ''}
              </article>
            `).join("")}
          </div>
        </section>

        <section class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span class="text-teal-600">🏛️</span> Twin Heritage Highlights (Fazilnagar &amp; Kushinagar)
            </h2>
            <a href="/tourism" class="text-xs font-semibold text-teal-600 hover:underline">Tourism Guide &rarr;</a>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${heritageSites.slice(0, 2).map(h => `
              <article class="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-[10px] font-bold text-teal-700 uppercase">${h.category}</span>
                <h3 class="text-sm font-bold text-slate-900">${h.name}</h3>
                <p class="text-xs text-slate-600 mt-1 leading-relaxed">${h.desc}</p>
              </article>
            `).join("")}
          </div>
        </section>

        <nav class="p-4 bg-white rounded-2xl border border-slate-200 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-2 justify-center">
          <a href="/directory" class="hover:text-slate-900 font-semibold">Town Directory</a>
          <span>•</span>
          <a href="/news" class="hover:text-slate-900 font-semibold">Local News</a>
          <span>•</span>
          <a href="/education" class="hover:text-slate-900 font-semibold">Education Hub</a>
          <span>•</span>
          <a href="/tourism" class="hover:text-slate-900 font-semibold">Tourism &amp; Heritage</a>
          <span>•</span>
          <a href="/healthcare" class="hover:text-slate-900 font-semibold">Healthcare</a>
          <span>•</span>
          <a href="/emergency" class="hover:text-slate-900 font-semibold">24/7 Helplines</a>
          <span>•</span>
          <a href="/about" class="hover:text-slate-900 font-semibold">About Us</a>
          <span>•</span>
          <a href="/contact" class="hover:text-slate-900 font-semibold">Contact &amp; Report</a>
        </nav>
      </main>
    `
  },
  {
    path: "directory",
    title: "Fazilnagar Town Directory | Verified Local Places, Shops & Institutions",
    description: "Browse the complete verified local directory of Fazilnagar (PIN 274401, Kushinagar, UP). Find schools, hospitals, doctors, pharmacies, shops, markets, banks, and essential civic facilities.",
    h1: "Fazilnagar Town Directory & Verified Places",
    schemaType: "ItemList",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Fazilnagar Civic Directory",
      "url": `${BASE_URL}/directory`,
      "numberOfItems": places.length || 37,
      "itemListElement": places.slice(0, 30).map((p, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "item": {
          "@type": "LocalBusiness",
          "name": p.name,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": p.addressFull || p.locality || "Fazilnagar",
            "addressLocality": "Fazilnagar",
            "addressRegion": "Uttar Pradesh",
            "postalCode": "274401",
            "addressCountry": "IN"
          },
          "telephone": p.phone || undefined
        }
      }))
    },
    renderBody: () => `
      <main class="w-full max-w-6xl mx-auto min-h-screen bg-slate-50 p-4 sm:p-6 space-y-6">
        <header class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <span class="inline-block text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">37 Verified Places • Ground Surveyed</span>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-heading">Fazilnagar Town Directory &amp; Verified Places</h1>
          <p class="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Ground-truth verified civic directory for Fazilnagar town, Kushinagar (PIN 274401). Includes hospitals, accredited schools, intermediate colleges, banks, pharmacies, grocery markets, and government administration offices.
          </p>
        </header>

        <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${places.map((p, idx) => `
            <article class="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
              <div class="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                <span>${p.category || 'Civic'}</span>
                <span class="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">#${idx + 1} Verified</span>
              </div>
              <h2 class="text-base font-bold text-slate-900 mt-1.5">${p.name}</h2>
              ${p.alternateNames && p.alternateNames.length > 0 ? `<p class="text-xs text-slate-500 font-medium">${p.alternateNames[0]}</p>` : ''}
              <p class="text-xs text-slate-600 mt-2 flex items-start gap-1.5 leading-relaxed">
                <span>📍</span>
                <span>${p.addressFull || p.locality || 'Fazilnagar, Kushinagar - 274401'}</span>
              </p>
              ${p.streetOrLandmark ? `<p class="text-[11px] text-slate-500 mt-1 italic pl-5">Near: ${p.streetOrLandmark}</p>` : ''}
              <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                ${p.phone ? `<a href="tel:${p.phone.replace(/\s+/g, '')}" class="text-xs font-bold text-blue-600 hover:underline">📞 Call: ${p.phone}</a>` : `<span class="text-[11px] text-slate-400">Walk-in listing</span>`}
                <span class="text-[10px] text-slate-400 font-mono">274401</span>
              </div>
            </article>
          `).join("")}
        </section>
      </main>
    `
  },
  {
    path: "news",
    title: "Fazilnagar News & Community Updates | Local Headlines & Bulletins",
    description: "Stay informed with real-time town news, civic announcements, local bulletins, public notices, and citizen reports from Fazilnagar, Kushinagar (PIN 274401).",
    h1: "Fazilnagar News & Community Updates",
    schemaType: "NewsMediaOrganization",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "NewsMediaOrganization",
      "name": "Fazilnagar Community News Desk",
      "url": `${BASE_URL}/news`,
      "description": "Verified local reporting, civic announcements, and community updates from Fazilnagar town, Kushinagar.",
      "publishingPrinciples": `${BASE_URL}/terms`,
      "areaServed": "Fazilnagar, Kushinagar, Uttar Pradesh"
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4 sm:p-6 space-y-6">
        <header class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <span class="inline-block text-xs font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-full uppercase tracking-wider">COMMUNITY REPORTING &amp; BULLETINS</span>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-heading">Fazilnagar News &amp; Community Updates</h1>
          <p class="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Stay informed with real-time town news, civic announcements, local bulletins, public notices, traffic alerts, and citizen reports from Fazilnagar, Kushinagar (PIN 274401).
          </p>
        </header>

        <section class="space-y-4">
          ${newsStories.map(story => `
            <article class="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-[#B8323C] uppercase">${story.category}</span>
                <span class="text-slate-500">${story.publishedAt}</span>
              </div>
              <h2 class="text-lg font-bold text-slate-900">${story.title}</h2>
              <p class="text-sm text-slate-600 leading-relaxed">${story.summary}</p>
              <div class="pt-2 text-xs text-slate-500 font-medium">Source: ${story.author}</div>
            </article>
          `).join("")}
        </section>

        <section class="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h3 class="font-bold text-sm text-emerald-900">Have a news story, public notice, or event to share?</h3>
            <p class="text-emerald-800 mt-0.5">Submit verified news to the Fazilnagar volunteer editorial desk.</p>
          </div>
          <a href="/create-news" class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold whitespace-nowrap transition">Submit News &rarr;</a>
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
      "url": `${BASE_URL}/education`,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Fazilnagar",
        "addressRegion": "Uttar Pradesh",
        "postalCode": "274401",
        "addressCountry": "IN"
      }
    },
    renderBody: () => {
      const educationPlaces = places.filter(p =>
        (p.category || '').toLowerCase().includes('school') ||
        (p.category || '').toLowerCase().includes('college') ||
        (p.category || '').toLowerCase().includes('education')
      );
      return `
        <main class="w-full max-w-5xl mx-auto min-h-screen bg-slate-50 p-4 sm:p-6 space-y-6">
          <header class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <span class="inline-block text-xs font-bold text-indigo-800 bg-indigo-100 px-3 py-1 rounded-full uppercase tracking-wider">ACADEMIC DIRECTORY &amp; INSTITUTES</span>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-heading">Fazilnagar Education Hub &amp; Institutions</h1>
            <p class="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Explore primary schools, CBSE / UP Board intermediate colleges, undergraduate degree colleges, computer coaching centers, and competitive preparation academies across Fazilnagar (PIN 274401).
            </p>
          </header>

          <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${educationPlaces.map(e => `
              <article class="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <span class="text-[10px] font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded">${e.category || 'Academic Institution'}</span>
                <h2 class="text-base font-bold text-slate-900">${e.name}</h2>
                ${e.alternateNames && e.alternateNames.length > 0 ? `<p class="text-xs text-slate-500">${e.alternateNames[0]}</p>` : ''}
                <p class="text-xs text-slate-600 leading-relaxed">📍 ${e.addressFull || e.locality || 'Fazilnagar'}</p>
                ${e.streetOrLandmark ? `<p class="text-[11px] text-slate-500 italic">Landmark: ${e.streetOrLandmark}</p>` : ''}
                ${e.phone ? `<div class="pt-2"><a href="tel:${e.phone.replace(/\s+/g, '')}" class="text-xs font-bold text-blue-600 hover:underline">📞 Contact: ${e.phone}</a></div>` : ''}
              </article>
            `).join("")}
          </section>
        </main>
      `;
    }
  },
  {
    path: "tourism",
    title: "Fazilnagar & Kushinagar Sacred Twin Heritage | Pawapuri & Tourism Guide",
    description: "Explore Fazilnagar tourism, ancient Pawapuri Jain Tirth, Sathiaon archaeological mound, Buddhist twin heritage axis, and local hospitality in Kushinagar district.",
    h1: "Fazilnagar Tourism & Sacred Twin Heritage Guide",
    schemaType: "TouristDestination",
    schemaContent: {
      "@context": "https://schema.org",
      "@type": "TouristDestination",
      "name": "Fazilnagar Heritage & Pilgrimage Circuit",
      "url": `${BASE_URL}/tourism`,
      "description": "Historical significance of Pawa Nagar, Kakodha Ghat, Mahaparinirvana Temple, and Ramabhar Stupa along the Buddhist-Jain sacred corridor.",
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "26.6827",
        "longitude": "84.0498"
      }
    },
    renderBody: () => `
      <main class="w-full max-w-5xl mx-auto min-h-screen bg-slate-50 p-4 sm:p-6 space-y-6">
        <header class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <span class="inline-block text-xs font-bold text-teal-800 bg-teal-100 px-3 py-1 rounded-full uppercase tracking-wider">SACRED PILGRIMAGE &amp; ANCIENT SITES</span>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-heading">Fazilnagar Tourism &amp; Sacred Twin Heritage Guide</h1>
          <p class="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Fazilnagar is identified with ancient Pawa (Pawapuri), a profound historical crossroads where Lord Mahavira attained Nirvana and Lord Buddha partook his last meal before his journey to Kushinagar. Discover the revered spiritual and archaeological axis connecting Fazilnagar and Kushinagar (18 km).
          </p>
        </header>

        <section class="space-y-4">
          ${heritageSites.map(site => `
            <article class="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded uppercase">${site.category}</span>
                <span class="text-xs text-slate-500 font-medium">Distance: ${site.distance}</span>
              </div>
              <h2 class="text-lg font-bold text-slate-900">${site.name}</h2>
              <p class="text-sm text-slate-700 leading-relaxed">${site.desc}</p>
              <div class="pt-2 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
                <span>📍 <strong>Location:</strong> ${site.address}</span>
                <span>⏱️ <strong>Timings:</strong> ${site.hours}</span>
              </div>
            </article>
          `).join("")}
        </section>
      </main>
    `
  },
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
      "url": `${BASE_URL}/emergency`
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4 sm:p-6 space-y-6">
        <header class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <span class="inline-block text-xs font-bold text-rose-800 bg-rose-100 px-3 py-1 rounded-full uppercase tracking-wider">24/7 VERIFIED CONTACTS</span>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-heading">Fazilnagar Emergency Numbers &amp; 24/7 Helplines</h1>
          <p class="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Instant-dial emergency contacts for Fazilnagar police, medical trauma, fire, women safety, and utility breakdowns in Kushinagar district.
          </p>
        </header>
        <section class="space-y-3">
          ${emergencyServices.map(s => `
            <article class="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span class="text-[10px] font-bold uppercase text-slate-500">${s.category}</span>
                <h2 class="text-base font-bold text-slate-900">${s.title}</h2>
                <p class="text-xs text-slate-600 mt-0.5">${s.desc}</p>
              </div>
              <div class="flex items-center gap-2">
                <a href="tel:${s.number.replace(/\s+/g, '')}" class="px-4 py-2 bg-[#B8323C] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-rose-700 transition">Call ${s.number}</a>
                ${s.altNumber ? `<a href="tel:${s.altNumber.replace(/\s+/g, '')}" class="text-xs font-semibold text-slate-600 underline">Alt: ${s.altNumber}</a>` : ''}
              </div>
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
      "url": `${BASE_URL}/healthcare`
    },
    renderBody: () => {
      const healthPlaces = places.filter(p =>
        (p.category || '').toLowerCase().includes('hospital') ||
        (p.category || '').toLowerCase().includes('health') ||
        (p.category || '').toLowerCase().includes('clinic') ||
        (p.category || '').toLowerCase().includes('medical')
      );
      return `
        <main class="w-full max-w-5xl mx-auto min-h-screen bg-slate-50 p-4 sm:p-6 space-y-6">
          <header class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <span class="inline-block text-xs font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-full uppercase tracking-wider">MEDICAL &amp; HEALTHCARE</span>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-heading">Fazilnagar Healthcare Directory &amp; Hospitals</h1>
            <p class="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              24/7 Casualty ward at CHC Fazilnagar, accredited private clinics, pediatricians, pathology labs, and emergency pharmacies.
            </p>
          </header>
          <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${healthPlaces.map(h => `
              <article class="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <span class="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded">${h.category || 'Hospital'}</span>
                <h2 class="text-base font-bold text-slate-900">${h.name}</h2>
                <p class="text-xs text-slate-600">📍 ${h.addressFull || h.locality || 'Fazilnagar'}</p>
                ${h.phone ? `<div class="pt-2"><a href="tel:${h.phone.replace(/\s+/g, '')}" class="text-xs font-bold text-emerald-600 hover:underline">📞 Call Hospital: ${h.phone}</a></div>` : ''}
              </article>
            `).join("")}
          </section>
        </main>
      `;
    }
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
      "url": `${BASE_URL}/jobs`
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4 sm:p-6 space-y-6">
        <header class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <span class="inline-block text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full uppercase tracking-wider">LOCAL EMPLOYMENT</span>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-heading">Fazilnagar Jobs &amp; Business Opportunities</h1>
          <p class="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Discover commercial opportunities, trade connections, and local vacancies across retail, education, healthcare, and services in Fazilnagar.
          </p>
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
      "url": `${BASE_URL}/govt`
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4 sm:p-6 space-y-6">
        <header class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <span class="inline-block text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">CIVIC ADMINISTRATION</span>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-heading">Fazilnagar Government Services &amp; Administration</h1>
          <p class="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Directory of Block Development Office, Nagar Panchayat desk, Police Station, and public welfare centers in Fazilnagar block.
          </p>
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
      "url": `${BASE_URL}/food`
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4 sm:p-6 space-y-6">
        <header class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <span class="inline-block text-xs font-bold text-orange-800 bg-orange-100 px-3 py-1 rounded-full uppercase tracking-wider">CULINARY &amp; SWEETS</span>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-heading">Fazilnagar Food Guide &amp; Restaurants</h1>
          <p class="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Famous local sweets, family dining, tea points, and roadside eateries along NH-27 Fazilnagar corridor.
          </p>
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
      "url": `${BASE_URL}/transport`
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4 sm:p-6 space-y-6">
        <header class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <span class="inline-block text-xs font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-full uppercase tracking-wider">TRANSIT &amp; HIGHWAY</span>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-heading">Fazilnagar Transportation &amp; Transit Directory</h1>
          <p class="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Roadways bus services, NH-27 highway connectivity, auto stands, and local transit information linking Gorakhpur, Kushinagar, and Bihar border.
          </p>
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
      "url": `${BASE_URL}/marketplace`
    },
    renderBody: () => `
      <main class="w-full max-w-4xl mx-auto min-h-screen bg-slate-50 p-4 sm:p-6 space-y-6">
        <header class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <span class="inline-block text-xs font-bold text-violet-800 bg-violet-100 px-3 py-1 rounded-full uppercase tracking-wider">COMMERCE &amp; SHOPS</span>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-heading">Fazilnagar Marketplace &amp; Local Shops</h1>
          <p class="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Local traders, retail merchants, electronics, garments, agricultural supplies, and daily mandi in Main Market Fazilnagar.
          </p>
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
      "url": `${BASE_URL}/about`
    },
    renderBody: () => `
      <main class="w-full max-w-3xl mx-auto min-h-screen bg-white p-6 space-y-4">
        <header class="mb-4 pb-4 border-b border-slate-200">
          <span class="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">UNOFFICIAL COMMUNITY PORTAL</span>
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">About Fazilnagar Town Portal</h1>
          <p class="text-sm text-slate-600 mt-1">An independent community-operated digital directory and information hub for Fazilnagar town, Kushinagar (PIN 274401).</p>
        </header>
        <section class="prose text-sm text-slate-700 space-y-3 leading-relaxed">
          <p><strong>Notice:</strong> This portal is a community-run public resource and is <strong>not</strong> an official government website of the Nagar Panchayat Fazilnagar or District Administration Kushinagar.</p>
          <p>Our goal is to provide verified, accessible civic information for residents, students, travelers, and local business owners in Fazilnagar.</p>
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
      "url": `${BASE_URL}/contact`
    },
    renderBody: () => `
      <main class="w-full max-w-3xl mx-auto min-h-screen bg-white p-6 space-y-4">
        <header class="mb-4 pb-4 border-b border-slate-200">
          <span class="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded">COMMUNITY DESK</span>
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Contact Us &amp; Report Inaccurate Listings</h1>
          <p class="text-sm text-slate-600 mt-1">Help keep Fazilnagar’s directory 100% accurate. Reach the volunteer editorial team or report corrections.</p>
        </header>
        <p class="text-xs text-slate-600">Email: editorial@fazilnagar.me • Location: Fazilnagar - 274401, Kushinagar, UP</p>
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
      "url": `${BASE_URL}/privacy`
    },
    renderBody: () => `
      <main class="w-full max-w-3xl mx-auto min-h-screen bg-white p-6 space-y-4">
        <header class="mb-4 pb-4 border-b border-slate-200">
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Privacy Policy</h1>
          <p class="text-sm text-slate-600 mt-1">Responsible community data stewardship and session cookie policies.</p>
        </header>
        <p class="text-xs text-slate-600">Fazilnagar Town Civic &amp; Local Directory Portal (https://www.fazilnagar.me) respects your privacy.</p>
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
      "url": `${BASE_URL}/terms`
    },
    renderBody: () => `
      <main class="w-full max-w-3xl mx-auto min-h-screen bg-white p-6 space-y-4">
        <header class="mb-4 pb-4 border-b border-slate-200">
          <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Terms of Service &amp; Non-Governmental Disclaimer</h1>
          <p class="text-sm text-slate-600 mt-1">Official declaration of independent, unofficial, community-operated status.</p>
        </header>
        <p class="text-xs text-slate-600">Operated independently for Fazilnagar PIN 274401, Kushinagar, Uttar Pradesh.</p>
      </main>
    `
  }
];

let generatedCount = 0;

for (const route of ROUTES) {
  const isRoot = route.path === "";
  const canonicalUrl = isRoot ? `${BASE_URL}/` : `${BASE_URL}/${route.path}`;
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

  // Pre-rendered initial body inside <div id="root">
  const initialBody = route.renderBody ? route.renderBody() : `<main style="padding:2rem;font-family:system-ui,sans-serif;"><h1>${route.h1}</h1><p>${route.description}</p></main>`;
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${initialBody}</div>`);

  if (!isRoot) {
    // For direct sub-routes: cleanly bypass the splash shell so the pre-rendered page content is instantly visible
    // Splash shell in index.html is wrapped from <!-- Single Coordinated Launch Splash Shell ... through </div> </div> </div> </div>
    html = html.replace(/<!-- Single Coordinated Launch Splash Shell[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/i, "<!-- Static sub-route direct entry: splash shell bypassed -->");
  }

  // Inject route-specific noscript fallback strictly into the body noscript (never head font fallback)
  const noscriptHtml = `<noscript id="fallback-noscript"><div style="max-width:800px;margin:2rem auto;padding:1.5rem;font-family:system-ui,sans-serif;color:#18232E;"><h1>${route.h1}</h1><p>${route.description}</p>${initialBody}</div></noscript>`;
  html = html.replace(/<noscript id="fallback-noscript">[\s\S]*?<\/noscript>/i, noscriptHtml);

  if (isRoot) {
    // Write back to dist/index.html so root / gets the pre-rendered content
    fs.writeFileSync(templatePath, html, "utf-8");
    generatedCount++;
  } else {
    // 1. Write to dist/{route.path}/index.html (handles /route/ with trailing slash)
    const targetDir = path.join(distDir, route.path);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const destIndexFile = path.join(targetDir, "index.html");
    fs.writeFileSync(destIndexFile, html, "utf-8");

    // 2. Write to dist/{route.path}.html (handles /route with cleanUrls: true)
    const destFlatFile = path.join(distDir, `${route.path}.html`);
    fs.writeFileSync(destFlatFile, html, "utf-8");

    generatedCount++;
  }
}

console.log(`[Static Generation] Successfully generated ${generatedCount} route-specific HTML pages in dist/!`);
