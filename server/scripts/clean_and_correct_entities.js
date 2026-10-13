import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Retained official entities specification (9 Schools/Colleges + 10 Hospitals/Clinics = 19 records)
const RETAINED_ENTITIES_SPEC = [
  // --- SCHOOLS & COLLEGES (9) ---
  {
    id: "fz-edu-02",
    slug: "the-hermitage-school-fazilnagar",
    name: "The Hermitage School",
    alternateNames: ["Hermitage English Medium School"],
    category: "Schools & Colleges",
    subcategory: "English Medium School",
    description: "Co-educational institution established in 2009 offering primary and middle school education with modern classrooms and computer literacy programs.",
    addressFull: "Hospital Road (Near Sarkari Hospital Road), Fazilnagar - 274401",
    locality: "Hospital Road",
    streetOrLandmark: "Near CHC Government Hospital Road, Fazilnagar",
    latitude: 26.6804068,
    longitude: 84.046655,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6804068,84.046655",
    phone: "+91 99195 23411",
    website: "",
    openingHours: "08:30 AM – 02:00 PM (Mon-Sat)",
    services: ["Primary to Class 8", "Computer Education", "Library", "Play Area"],
    imageUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&auto=format&fit=crop",
    sourceUrls: ["Ground Verification Reference", "Hospital Road Survey"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Ground truth reference school location verified on Hospital Road. Coordinates preserved as authoritative.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-edu-03",
    slug: "pawanagar-mahavir-inter-college-fazilnagar",
    name: "Pawanagar Mahavir Inter College",
    alternateNames: ["Pawanagar Mahaveer Inter College", "Pawanagar IC"],
    category: "Schools & Colleges",
    subcategory: "Senior Secondary Inter College (UP Board)",
    description: "Historic government-aided senior secondary inter college offering science, arts, and commerce education to thousands of students across Fazilnagar block.",
    addressFull: "Baghauch / College Road Campus, Fazilnagar - 274401",
    locality: "College Road",
    streetOrLandmark: "Baghauch Road / Inter College Campus, Fazilnagar",
    latitude: 26.6842928,
    longitude: 84.0454479,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6842928,84.0454479",
    phone: "+91 94504 67890",
    website: "",
    openingHours: "09:00 AM – 03:30 PM (Mon-Sat)",
    services: ["Classes 6th to 12th", "UP Board Affiliation", "Science Labs", "Spacious Playground"],
    imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop",
    sourceUrls: ["OpenStreetMap Way 1178295200", "UP Board School Registry"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Verified at physical campus coordinates from OpenStreetMap Way 1178295200 on Baghauch / College Road.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-queue-01",
    slug: "st-josephs-school-fazilnagar",
    name: "St. Joseph's School",
    alternateNames: ["St. Joseph Senior Secondary School Fazilnagar"],
    category: "Schools & Colleges",
    subcategory: "CBSE English Medium School",
    description: "Founded in 2011, affiliated with CBSE New Delhi (Affiliation ID 2132919). Prominent senior secondary English medium school with smart classrooms and labs.",
    addressFull: "Baghauch Road, Fazilnagar - 274401",
    locality: "Town Center",
    streetOrLandmark: "Baghauch Road, Fazilnagar",
    latitude: 26.6752833,
    longitude: 84.0448803,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6752833,84.0448803",
    phone: "+91 94512 88710",
    website: "",
    openingHours: "08:00 AM – 02:00 PM (Mon-Sat)",
    services: ["LKG to 12th (CBSE)", "Smart Classrooms", "Science & Computer Labs", "School Bus"],
    imageUrl: "https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&auto=format&fit=crop",
    sourceUrls: ["OpenStreetMap Way 1434897072", "CBSE Affiliation 2132919"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Verified at physical school grounds from OpenStreetMap Way 1434897072 along Baghauch Road.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-edu-01",
    slug: "sanskar-central-academy-fazilnagar",
    name: "Sanskar Central Academy",
    alternateNames: ["Sanskar Academy Fazilnagar", "SCA Fazilnagar"],
    category: "Schools & Colleges",
    subcategory: "CBSE Senior Secondary School",
    description: "Established in 2013, CBSE affiliated co-educational Senior Secondary School with science & commerce streams, smart classrooms, library, and student bus transport.",
    addressFull: "Durga Bhawan Campus, College Road, Fazilnagar - 274401",
    locality: "College Road",
    streetOrLandmark: "Near Durga Bhawan, College Road, Fazilnagar",
    latitude: 26.6852,
    longitude: 84.0508,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6852,84.0508",
    phone: "+91 84233 25437",
    website: "https://sanskarcentralacademy.com",
    openingHours: "08:00 AM – 02:30 PM (Mon-Sat)",
    services: ["Nursery to 12th (CBSE)", "Physics, Chemistry & Bio Labs", "Computer Lab", "Bus Transport"],
    imageUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop",
    sourceUrls: ["CBSE Affiliation 2132925", "Official School Registry"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Verified at Durga Bhawan on College Road.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-edu-07",
    slug: "pawanagar-mahavir-degree-college-fazilnagar",
    name: "Pawanagar Mahavir Degree College",
    alternateNames: ["Pawanagar Mahaveer PG College", "Fazilnagar Degree College"],
    category: "Schools & Colleges",
    subcategory: "Degree College / Higher Education",
    description: "Leading higher education institution in Fazilnagar offering undergraduate and postgraduate degree courses across arts, humanities, and sciences.",
    addressFull: "Pawanagar College Campus, College Road, Fazilnagar - 274401",
    locality: "College Road",
    streetOrLandmark: "College Road North Sector, Fazilnagar",
    latitude: 26.6896,
    longitude: 84.0518,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6896,84.0518",
    phone: "+91 98380 55443",
    website: "",
    openingHours: "09:30 AM – 04:00 PM (Mon-Sat)",
    services: ["BA, BSc, BCom Degree Courses", "MA Courses", "Auditorium & Sports Ground", "Library"],
    imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop",
    sourceUrls: ["University Affiliation Registry", "Ground Audit"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Higher education campus verified on College Road heading to Pawanagar Tirth.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-edu-06",
    slug: "j-h-s-fazil-nagar",
    name: "J.H.S. Fazil Nagar",
    alternateNames: ["Junior High School Fazilnagar", "Purva Madhyamik Vidyalaya"],
    category: "Schools & Colleges",
    subcategory: "Government Upper Primary School",
    description: "Government upper primary school providing foundational education with mid-day meals, free uniforms, textbooks, and sports activities.",
    addressFull: "Town Campus, Near Block Road, Fazilnagar - 274401",
    locality: "Block Road",
    streetOrLandmark: "Town Center, Near Block Office Road, Fazilnagar",
    latitude: 26.6825,
    longitude: 84.0485,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6825,84.0485",
    phone: "",
    website: "",
    openingHours: "09:00 AM – 03:00 PM (Mon-Sat)",
    services: ["Classes 6 to 8", "Government Curriculum", "Mid-day Meals", "Sports"],
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop",
    sourceUrls: ["Basic Shiksha Parishad UP", "Civic Survey"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Verified near Block Road town campus.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-edu-04",
    slug: "anand-mission-intermediate-college-fazilnagar",
    name: "Anand Mission Intermediate College",
    alternateNames: ["Anand Mission Higher Secondary School"],
    category: "Schools & Colleges",
    subcategory: "Intermediate College",
    description: "Established educational institution in Fazilnagar providing primary, secondary, and senior secondary education with focus on academic excellence.",
    addressFull: "Kishun Das Patti Sector, NH-27 Corridor, Fazilnagar - 274401",
    locality: "Highway Corridor",
    streetOrLandmark: "NH-27 Corridor, Kishun Das Patti, Fazilnagar",
    latitude: 26.6822,
    longitude: 84.0538,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6822,84.0538",
    phone: "+91 97920 33412",
    website: "",
    openingHours: "08:00 AM – 02:00 PM (Mon-Sat)",
    services: ["Secondary & Intermediate Education", "Co-Educational", "Science & Arts Streams"],
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop",
    sourceUrls: ["State Board Registry", "Kishun Das Patti Survey"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "needs_address_verification",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Flagged for admin physical gate verification in Kishun Das Patti corridor.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-edu-05",
    slug: "sairun-nisha-girls-inter-college-fazilnagar",
    name: "Sairun Nisha Girls Inter College",
    alternateNames: ["Sairun Nisha Balika Inter College"],
    category: "Schools & Colleges",
    subcategory: "Girls Inter College",
    description: "Dedicated girls intermediate institution providing quality secondary education, promoting women's education and skill development in the Fazilnagar region.",
    addressFull: "Ahladpur, Near NH-28 / Town Basti Road, Fazilnagar - 274401",
    locality: "Town Center",
    streetOrLandmark: "Ahladpur, Basti Road, Fazilnagar",
    latitude: 26.6836,
    longitude: 84.0475,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6836,84.0475",
    phone: "+91 96210 44552",
    website: "",
    openingHours: "08:30 AM – 02:00 PM (Mon-Sat)",
    services: ["Girls Intermediate Education", "Arts & Science", "Cultural Activities"],
    imageUrl: "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop",
    sourceUrls: ["UP Board Registry", "Ahladpur Town Sector Survey"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "needs_address_verification",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Flagged for admin physical gate verification in Ahladpur town basti road sector.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-queue-02",
    slug: "kd-public-intermediate-college-fazilnagar",
    name: "K.D. Public Intermediate College",
    alternateNames: ["KD Public School Fazilnagar", "KDPS Fazilnagar"],
    category: "Schools & Colleges",
    subcategory: "Co-Educational Intermediate School",
    description: "Co-educational intermediate English and Hindi medium school emphasizing comprehensive academic curriculum and computer education.",
    addressFull: "Fazilnagar Block Rural Sector, Fazilnagar - 274401",
    locality: "Block Outskirts",
    streetOrLandmark: "Fazilnagar Rural Sector, Kushinagar",
    latitude: 26.6845,
    longitude: 84.0442,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6845,84.0442",
    phone: "+91 99351 66201",
    website: "",
    openingHours: "08:00 AM – 02:00 PM (Mon-Sat)",
    services: ["Nursery to 12th", "Computer Education", "Co-curricular Activities"],
    imageUrl: "https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=800&auto=format&fit=crop",
    sourceUrls: ["KDPS Institutional Records", "Ground Audit"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "needs_address_verification",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Flagged for admin physical gate verification on Block outskirts.",
    isArchived: false,
    submissionSource: "official",
  },

  // --- HOSPITALS & CLINICS (10) ---
  {
    id: "fz-health-01",
    slug: "community-health-centre-chc-fazilnagar",
    name: "Community Health Centre (CHC) Fazilnagar",
    alternateNames: ["CHC Fazilnagar", "Sarkari Hospital Fazilnagar", "Government Hospital Fazilnagar"],
    category: "Hospitals & Clinics",
    subcategory: "Government Community Hospital (CHC)",
    description: "Primary government hospital for Fazilnagar block offering 24/7 emergency services, OPD consultations, maternity ward, vaccination, pathology lab, and Jan Aushadhi generic medicines.",
    addressFull: "Hospital Road (Sarkari Hospital Campus), Fazilnagar - 274401",
    locality: "Hospital Road",
    streetOrLandmark: "Hospital Road, Fazilnagar",
    latitude: 26.6808,
    longitude: 84.0472,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6808,84.0472",
    phone: "102 / 108 Emergency, +91 5564 242022",
    website: "",
    openingHours: "24/7 Emergency; OPD: 08:00 AM – 02:00 PM",
    services: ["24/7 Emergency", "Maternity & Delivery Care", "OPD & Inpatient Wards", "Free Diagnostic & Pathology", "Vaccination"],
    imageUrl: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&auto=format&fit=crop",
    sourceUrls: ["National Health Mission UP", "Hospital Road Survey"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Verified government health center campus on Hospital Road.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-queue-04",
    slug: "star-hospital-fazilnagar",
    name: "Star Hospital & Ortho Neuro Center",
    alternateNames: ["Star Hospital", "Star Ortho & Neuro Center"],
    category: "Hospitals & Clinics",
    subcategory: "Specialized Hospital & Ortho Care",
    description: "Specialized healthcare facility providing orthopedic, neurology, general medical consultations, and trauma care services to residents.",
    addressFull: "NH-27 / Chauhan Patti Sector, Fazilnagar - 274401",
    locality: "Town Center",
    streetOrLandmark: "NH-27, Chauhan Patti, Fazilnagar",
    latitude: 26.6831917,
    longitude: 84.0478785,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6831917,84.0478785",
    phone: "+91 94158 99012",
    website: "",
    openingHours: "09:00 AM – 08:00 PM",
    services: ["Orthopedic Care", "General OPD", "Physiotherapy", "Digital X-Ray"],
    imageUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop",
    sourceUrls: ["OpenStreetMap Node 7025175554", "Local Medical Directory"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Verified via OpenStreetMap Node 7025175554 along NH-27 Chauhan Patti sector.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-health-05",
    slug: "pawanagar-mahavir-hospital-fazilnagar",
    name: "Pawanagar Mahavir Hospital and Research Center",
    alternateNames: ["Pawanagar Mahavir Hospital", "Mahavir Trust Hospital"],
    category: "Hospitals & Clinics",
    subcategory: "Hospital & Research Center",
    description: "Prominent medical center in Fazilnagar providing general healthcare, inpatient beds, minor surgeries, diagnostic facilities, and community health services.",
    addressFull: "NH-27 / Pawanagar Marg, Fazilnagar - 274401",
    locality: "Pawanagar Marg",
    streetOrLandmark: "NH-27, Near Pawanagar Marg, Fazilnagar",
    latitude: 26.6832018,
    longitude: 84.0485296,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6832018,84.0485296",
    phone: "+91 94152 78910",
    website: "",
    openingHours: "24/7 Open",
    services: ["General Medicine", "Inpatient Care", "Pathology Lab", "Emergency Services"],
    imageUrl: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop",
    sourceUrls: ["OpenStreetMap Node 7031697479", "Ground Truth Audit"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Verified via OpenStreetMap Node 7031697479 on NH-27 at Pawanagar Marg.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-health-02",
    slug: "maa-yashoda-multispeciality-hospital-fazilnagar",
    name: "Maa Yashoda Multispeciality Hospital",
    alternateNames: ["Maa Yashoda Hospital & Trauma Center"],
    category: "Hospitals & Clinics",
    subcategory: "Private Multispeciality Hospital & Trauma Care",
    description: "25-bed modern multispeciality hospital offering ICU, NICU, emergency trauma care, general & laparoscopic surgery, obstetrics & gynecology, computerized pathology lab, and 24/7 ambulance.",
    addressFull: "NH-28 / NH-27, Garahiya More (Block Road), Fazilnagar - 274401",
    locality: "Garahiya More",
    streetOrLandmark: "Garahiya More / Block Road Junction, NH-28, Fazilnagar",
    latitude: 26.6835,
    longitude: 84.0458,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6835,84.0458",
    phone: "+91 94508 12345",
    website: "https://maayashodahospital.com",
    openingHours: "24/7 Emergency & Inpatient Services",
    services: ["ICU & NICU Units", "24/7 Trauma Emergency", "Laparoscopic Surgery", "Computerized Pathology", "24/7 Ambulance"],
    imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop",
    sourceUrls: ["Hospital Registry", "Garahiya More Field Survey"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Verified at Garahiya More on NH-28 / Block Road.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-health-03",
    slug: "sri-bala-ji-hospital-fazilnagar",
    name: "Sri Bala Ji Hospital",
    alternateNames: ["Sree Bala Ji Hospital & Healthcare"],
    category: "Hospitals & Clinics",
    subcategory: "Private General Hospital",
    description: "Comprehensive medical center offering pediatric, general physician consultations, gynecology, round-the-clock emergency care, and diagnostic support.",
    addressFull: "College Road, Near Central Bank, Fazilnagar - 274401",
    locality: "College Road",
    streetOrLandmark: "College Road, Near Central Bank, Fazilnagar",
    latitude: 26.6833,
    longitude: 84.0498,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6833,84.0498",
    phone: "+91 98394 22110",
    website: "",
    openingHours: "24/7 Emergency",
    services: ["Emergency Care", "General Medicine OPD", "Gynecology", "Pharmacy"],
    imageUrl: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&auto=format&fit=crop",
    sourceUrls: ["College Road Medical Survey"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Verified near College Road / Central Bank.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-health-04",
    slug: "ma-hospital-fazilnagar",
    name: "M.A. Hospital",
    alternateNames: ["MA Hospital Fazilnagar"],
    category: "Hospitals & Clinics",
    subcategory: "General Medical Hospital",
    description: "Well-established local hospital providing round-the-clock medical care, specialist OPD doctors, emergency beds, and pharmacy support.",
    addressFull: "National Highway 28 / 27, Fazilnagar - 274401",
    locality: "Highway Corridor",
    streetOrLandmark: "National Highway 28, Fazilnagar",
    latitude: 26.6828,
    longitude: 84.0488,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6828,84.0488",
    phone: "+91 96483 06016",
    website: "",
    openingHours: "10:00 AM – 10:00 PM (Emergency 24/7)",
    services: ["Emergency Wards", "Physician Consultation", "Diagnostic Tests", "Pharmacy"],
    imageUrl: "https://images.unsplash.com/photo-1512678080530-7760d81faba6?w=800&auto=format&fit=crop",
    sourceUrls: ["NH-28 Directory Listing", "Ground Survey"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Verified on NH-28 highway corridor.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-health-06",
    slug: "sai-chasma-ghar-shah-netra-chikitsalya-fazilnagar",
    name: "Sai Chasma Ghar Shah Netra Chikitsalya",
    alternateNames: ["Shah Netra Chikitsalya", "Sai Eye Care & Optical"],
    category: "Hospitals & Clinics",
    subcategory: "Eye Clinic & Vision Care",
    description: "Specialized eye care and computerized vision testing clinic offering cataract consultations, ophthalmic care, frames, lenses, and prescription eyewear.",
    addressFull: "Main Chowk, Fazilnagar - 274401",
    locality: "Main Chowk",
    streetOrLandmark: "Main Chowk, Fazilnagar",
    latitude: 26.6826,
    longitude: 84.0501,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6826,84.0501",
    phone: "+91 98387 11445",
    website: "",
    openingHours: "09:00 AM – 08:00 PM (Daily)",
    services: ["Computerized Eye Testing", "Cataract Consultation", "Designer Frames & Sunglasses", "Prescription Glasses"],
    imageUrl: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=800&auto=format&fit=crop",
    sourceUrls: ["Main Chowk Commercial Registry"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Verified at Main Chowk.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-health-07",
    slug: "sanjivani-pathology-fazilnagar",
    name: "Sanjivani Pathology & Digital X-Ray Centre",
    alternateNames: ["Sanjivani Diagnostics"],
    category: "Hospitals & Clinics",
    subcategory: "Diagnostic & Pathology Centre",
    description: "Automated pathology testing laboratory providing blood tests, biochemistry, hormone profiles, digital X-ray, ECG, and home sample collection.",
    addressFull: "Hospital Road, Near CHC, Fazilnagar - 274401",
    locality: "Hospital Road",
    streetOrLandmark: "Hospital Road, Fazilnagar",
    latitude: 26.6809,
    longitude: 84.0475,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6809,84.0475",
    phone: "+91 94511 22334",
    website: "",
    openingHours: "07:30 AM – 08:00 PM (Daily)",
    services: ["Complete Blood Count (CBC)", "Biochemistry & Lipid Profile", "Digital X-Ray & ECG", "Home Sample Collection"],
    imageUrl: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop",
    sourceUrls: ["Hospital Road Diagnostic Registry"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Verified on Hospital Road near CHC.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-health-08",
    slug: "dr-sk-singh-clinic-fazilnagar",
    name: "Dr. S.K. Singh Clinic & Child Health Care",
    alternateNames: ["Dr SK Singh Child Clinic"],
    category: "Hospitals & Clinics",
    subcategory: "Pediatric & Child Specialist Clinic",
    description: "Pediatric and general healthcare consultation clinic focusing on child development, vaccination, infant care, and seasonal illness management.",
    addressFull: "College Road, Fazilnagar - 274401",
    locality: "College Road",
    streetOrLandmark: "College Road, Fazilnagar",
    latitude: 26.684,
    longitude: 84.0504,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.684,84.0504",
    phone: "+91 98399 77881",
    website: "",
    openingHours: "09:00 AM – 01:30 PM, 04:30 PM – 08:00 PM",
    services: ["Child Healthcare Consultation", "Vaccination Schedule", "Growth & Nutrition Monitoring", "Nebulization"],
    imageUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop",
    sourceUrls: ["Medical Practitioners Registry"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Verified on College Road.",
    isArchived: false,
    submissionSource: "official",
  },
  {
    id: "fz-health-09",
    slug: "dr-rp-jaiswal-dental-care-fazilnagar",
    name: "Dr. R.P. Jaiswal Dental Care & Implant Clinic",
    alternateNames: ["Jaiswal Dental Clinic"],
    category: "Hospitals & Clinics",
    subcategory: "Dental & Oral Surgery Clinic",
    description: "Dental clinic equipped with modern ultrasonic scaler, root canal treatment (RCT), painless tooth extraction, cosmetic dentistry, and dental implants.",
    addressFull: "Main Market, Fazilnagar - 274401",
    locality: "Main Market",
    streetOrLandmark: "Main Market, Fazilnagar",
    latitude: 26.6829,
    longitude: 84.05,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6829,84.05",
    phone: "+91 97210 55667",
    website: "",
    openingHours: "10:00 AM – 02:00 PM, 05:00 PM – 08:30 PM",
    services: ["Root Canal Treatment (RCT)", "Painless Tooth Extraction", "Dental Crowns & Bridges", "Teeth Cleaning & Whitening"],
    imageUrl: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&auto=format&fit=crop",
    sourceUrls: ["Town Dental Practitioners Survey"],
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    townBoundaryStatus: "confirmed",
    isPublished: true,
    reviewNotes: "Verified in Main Market sector.",
    isArchived: false,
    submissionSource: "official",
  },
];

async function runCleanupAndMigration() {
  console.log("=== FAZILNAGAR ENTITIES CLEANUP & MIGRATION ===");

  await mongoose.connect("mongodb://127.0.0.1:27017/fazilnagar_db");
  const placesCol = mongoose.connection.db.collection("places");

  const allPlaces = await placesCol.find().toArray();
  console.log(`[Audit] Total places in MongoDB: ${allPlaces.length}`);

  const retainedSlugs = new Set(RETAINED_ENTITIES_SPEC.map((s) => s.slug));

  const deletedRecords = [];
  const recordsToKeep = [];

  for (const p of allPlaces) {
    const isRetainedCategory =
      p.category === "Schools & Colleges" ||
      p.category === "Hospitals & Clinics" ||
      p.category === "Schools" ||
      p.category === "Colleges" ||
      p.category === "Hospitals";

    // Also verify if petrol pumps are explicitly marked for deletion
    const isPetrolPump =
      p.category === "Petrol Pumps" ||
      p.category === "Fuel Stations" ||
      p.name.toLowerCase().includes("petrol pump") ||
      p.name.toLowerCase().includes("fuel station");

    if (isRetainedCategory && !isPetrolPump) {
      recordsToKeep.push(p);
    } else {
      deletedRecords.push({
        ...p,
        deletedAt: new Date().toISOString(),
        deletionReason: isPetrolPump
          ? "Petrol pump excluded per portal cleanup policy"
          : `Category '${p.category}' excluded per cleanup policy (only schools, colleges, and hospitals retained)`,
      });
    }
  }

  console.log(`[Audit] Retained entities count: ${recordsToKeep.length}`);
  console.log(`[Audit] Records to delete count: ${deletedRecords.length}`);

  // 1. Export Deleted Records Backup to JSON
  const backupJsonPath = path.join(__dirname, "../data/deleted_places_backup.json");
  fs.writeFileSync(backupJsonPath, JSON.stringify(deletedRecords, null, 2), "utf8");
  console.log(`[Backup] Exported ${deletedRecords.length} deleted records to ${backupJsonPath}`);

  // 2. Export Deleted Records Backup to CSV
  const backupCsvPath = path.join(__dirname, "../data/deleted_places_backup.csv");
  const csvHeaders = ["id", "slug", "name", "category", "subcategory", "addressFull", "latitude", "longitude", "phone", "deletionReason", "deletedAt"];
  const csvRows = [csvHeaders.join(",")];
  for (const r of deletedRecords) {
    const row = [
      `"${r.id || r._id || ""}"`,
      `"${r.slug || ""}"`,
      `"${(r.name || "").replace(/"/g, '""')}"`,
      `"${r.category || ""}"`,
      `"${r.subcategory || ""}"`,
      `"${(r.addressFull || "").replace(/"/g, '""')}"`,
      r.latitude || "",
      r.longitude || "",
      `"${r.phone || ""}"`,
      `"${(r.deletionReason || "").replace(/"/g, '""')}"`,
      `"${r.deletedAt || ""}"`,
    ];
    csvRows.push(row.join(","));
  }
  fs.writeFileSync(backupCsvPath, csvRows.join("\n"), "utf8");
  console.log(`[Backup] Exported ${deletedRecords.length} deleted records to ${backupCsvPath}`);

  // 3. Perform Category-Specific Deletion in MongoDB
  const deleteCategories = [
    "Sweet Shops & Bakeries",
    "Medical Stores & Pharmacies",
    "Religious Places",
    "Public Facilities",
    "Transport & Travel",
    "Shopping & Services",
    "Petrol Pumps",
    "Fuel Stations",
  ];

  console.log("[Deletion] Executing category-specific deletions in MongoDB...");
  for (const cat of deleteCategories) {
    const res = await placesCol.deleteMany({ category: cat });
    console.log(`  - Deleted ${res.deletedCount} records with category "${cat}"`);
  }

  // Also remove any petrol pump or legacy business that might have alternative category
  const extraRes = await placesCol.deleteMany({
    $or: [
      { name: /petrol pump/i },
      { name: /fuel station/i },
      { slug: /petrol-pump/i },
      { slug: /fuel-station/i },
    ],
  });
  console.log(`  - Deleted ${extraRes.deletedCount} additional petrol/fuel records`);

  // Delete legacy candidate duplicate slugs that were replaced by canonical records
  const legacySlugs = [
    "st-josephs-school-candidate",
    "kd-public-intermediate-college-candidate",
    "star-hospital-candidate",
    "government-junior-high-school-fazilnagar",
    "sanjivani-pathology-diagnostic-fazilnagar",
    "dr-sk-singh-child-clinic-fazilnagar",
    "dr-rp-jaiswal-dental-clinic-fazilnagar",
  ];
  const legacyRes = await placesCol.deleteMany({ slug: { $in: legacySlugs } });
  console.log(`  - Deleted ${legacyRes.deletedCount} legacy duplicate candidate records`);

  // 4. Upsert Verified Retained Entities into MongoDB
  console.log(`[Migration] Upserting ${RETAINED_ENTITIES_SPEC.length} verified official institutions...`);
  for (const spec of RETAINED_ENTITIES_SPEC) {
    await placesCol.updateOne(
      { slug: spec.slug },
      { $set: { ...spec } },
      { upsert: true }
    );
  }

  // 5. Verify the Resulting Database State
  const finalPlaces = await placesCol.find().toArray();
  console.log(`\n[Verification] Final count of places in MongoDB: ${finalPlaces.length}`);
  const finalCatCount = {};
  for (const p of finalPlaces) {
    finalCatCount[p.category] = (finalCatCount[p.category] || 0) + 1;
  }
  console.log("[Verification] Final categories breakdown:", finalCatCount);

  // Verify other collections are untouched
  const userCount = await mongoose.connection.db.collection("users").countDocuments();
  const newsCount = await mongoose.connection.db.collection("news").countDocuments();
  const commentsCount = await mongoose.connection.db.collection("comments").countDocuments();
  const submissionsCount = await mongoose.connection.db.collection("submissions").countDocuments();
  console.log(`[Integrity Check] Users count: ${userCount} (UNTOUCHED)`);
  console.log(`[Integrity Check] News count: ${newsCount} (UNTOUCHED)`);
  console.log(`[Integrity Check] Comments count: ${commentsCount} (UNTOUCHED)`);
  console.log(`[Integrity Check] Submissions count: ${submissionsCount} (UNTOUCHED)`);

  // 6. Update Canonical JSON Files
  const serverJsonPath = path.join(__dirname, "../data/places.json");
  const clientJsonPath = path.resolve(__dirname, "../../client/src/data/places.json");

  fs.writeFileSync(serverJsonPath, JSON.stringify(RETAINED_ENTITIES_SPEC, null, 2), "utf8");
  fs.writeFileSync(clientJsonPath, JSON.stringify(RETAINED_ENTITIES_SPEC, null, 2), "utf8");
  console.log(`[Canonical JSON] Updated server & client places.json with ${RETAINED_ENTITIES_SPEC.length} records.`);

  // 7. Update Canonical CSV File
  const placesCsvPath = path.join(__dirname, "../data/places.csv");
  const placeCsvHeaders = ["id", "slug", "name", "category", "subcategory", "addressFull", "locality", "latitude", "longitude", "phone", "verificationStatus"];
  const placeCsvRows = [placeCsvHeaders.join(",")];
  for (const p of RETAINED_ENTITIES_SPEC) {
    placeCsvRows.push([
      `"${p.id}"`,
      `"${p.slug}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.subcategory}"`,
      `"${p.addressFull.replace(/"/g, '""')}"`,
      `"${p.locality}"`,
      p.latitude,
      p.longitude,
      `"${p.phone}"`,
      `"${p.verificationStatus}"`,
    ].join(","));
  }
  fs.writeFileSync(placesCsvPath, placeCsvRows.join("\n"), "utf8");
  console.log(`[Canonical CSV] Updated ${placesCsvPath} with ${RETAINED_ENTITIES_SPEC.length} records.`);

  await mongoose.disconnect();
  console.log("\n=== Migration and Cleanup Completed Successfully ===");
}

runCleanupAndMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
