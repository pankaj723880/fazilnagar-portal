import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import API from "../api";
import { openGoogleMapsDirections } from "../utils/directions";
import {
  MapPin,
  ShieldCheck,
  PlusCircle,
  Compass,
  LayoutGrid,
  Menu,
  X,
  Home,
  Grid,
  Map,
  Store,
  Bell,
  BookOpen,
  Plus,
  Search,
  ArrowRight,
  ChevronRight,
  Landmark,
  Navigation,
  GraduationCap,
  Stethoscope,
  Pill,
  Cake,
  Sun,
  Moon,
  Utensils,
  ShoppingBag,
  Bed,
  Building2,
  PhoneCall,
  Sparkles,
  Bus,
  Layers,
  Clock,
  Phone,
  Check,
  Calendar,
  Edit3,
  CalendarPlus,
  CheckCircle,
  ExternalLink,
  Info,
  SlidersHorizontal,
  Coffee,
  HeartPulse,
  Flame,
  Shield,
  Briefcase,
  AlertCircle,
} from "lucide-react";

// The 21 Required Categories from Master Design Prompt
const EXPLORE_21_CATEGORIES = [
  { id: "schools", name: "Schools & Colleges", query: "Schools & Colleges", icon: GraduationCap, count: 6 },
  { id: "hospitals", name: "Hospitals", query: "Hospitals & Clinics", icon: HeartPulse, count: 6 },
  { id: "clinics", name: "Clinics", query: "Hospitals & Clinics", icon: Stethoscope, count: 3 },
  { id: "doctors", name: "Doctors", query: "Hospitals & Clinics", icon: Stethoscope, count: 4 },
  { id: "medical-stores", name: "Medical Stores", query: "Medical Stores & Pharmacies", icon: Pill, count: 5 },
  { id: "sweet-shops", name: "Sweet Shops", query: "Sweet Shops & Bakeries", icon: Cake, count: 6 },
  { id: "bakeries", name: "Bakeries", query: "Sweet Shops & Bakeries", icon: Coffee, count: 2 },
  { id: "temples", name: "Temples", query: "Religious Places", icon: Sun, count: 3 },
  { id: "mosques", name: "Mosques", query: "Religious Places", icon: Moon, count: 2 },
  { id: "other-religious", name: "Other Religious Places", query: "Religious Places", icon: Sparkles, count: 2 },
  { id: "restaurants", name: "Restaurants & Cafes", query: "Shopping & Services", icon: Utensils, count: 4 },
  { id: "street-food", name: "Street Food", query: "Sweet Shops & Bakeries", icon: Flame, count: 5 },
  { id: "markets", name: "Markets & Shopping", query: "Shopping & Services", icon: ShoppingBag, count: 6 },
  { id: "banks", name: "Banks & ATMs", query: "Public Facilities", icon: Landmark, count: 4 },
  { id: "hotels", name: "Hotels & Accommodation", query: "Shopping & Services", icon: Bed, count: 2 },
  { id: "govt-offices", name: "Government Offices", query: "Public Facilities", icon: Building2, count: 4 },
  { id: "coaching", name: "Coaching Centres", query: "Schools & Colleges", icon: BookOpen, count: 3 },
  { id: "libraries", name: "Libraries", query: "Public Facilities", icon: BookOpen, count: 2 },
  { id: "transport", name: "Transport & Travel", query: "Transport & Travel", icon: Bus, count: 3 },
  { id: "emergency", name: "Emergency Services", query: "Public Facilities", icon: PhoneCall, count: 4 },
  { id: "all-places", name: "All Places", query: "all", icon: Layers, count: 37 },
];

// Curated Real Town Establishments
const VERIFIED_TOWN_PLACES = [
  {
    id: "fz-1",
    name: "Pawanagar Mahavir Jain Mandir",
    nameHindi: "पावानगर भगवान महावीर दिगंबर जैन मंदिर",
    category: "Religious Places",
    subcategory: "Temples",
    address: "Pawanagar Tirth Marg, Fazilnagar - 274401",
    landmark: "Kasya-Tamkuhi Link, Fazilnagar",
    lat: 26.6835,
    lng: 84.0489,
    hours: "06:00 AM – 08:30 PM",
    phone: "+91 94520 89540",
    desc: "Ancient shrine and Manasthamba commemorating Lord Mahavira's nirvana tradition in ancient Pawa (Pawanagar).",
    badge: "Heritage",
  },
  {
    id: "fz-2",
    name: "Community Health Centre (CHC) Fazilnagar",
    nameHindi: "सामुदायिक स्वास्थ्य केंद्र (सीएचसी) फाजिलनगर",
    category: "Hospitals & Clinics",
    subcategory: "Public Hospital",
    address: "Hospital Road, Fazilnagar - 274401",
    landmark: "Near Block Office link, Fazilnagar",
    lat: 26.6818,
    lng: 84.0531,
    hours: "24x7 Emergency Services",
    phone: "+91 5564 222102",
    desc: "30-bed public healthcare institution providing primary medical, emergency ambulance, and maternal health services.",
    badge: "Government",
  },
  {
    id: "fz-3",
    name: "Sanskar Central Academy",
    nameHindi: "संस्कार सेंट्रल एकेडमी",
    category: "Schools & Colleges",
    subcategory: "CBSE School",
    address: "Durga Bhawan Campus, College Road, Fazilnagar - 274401",
    landmark: "Near Durga Bhawan, Fazilnagar",
    lat: 26.6852,
    lng: 84.0508,
    hours: "08:00 AM – 02:30 PM",
    phone: "+91 94520 89540",
    desc: "Premier English-medium secondary school offering modern smart classrooms, science labs, and sports amenities.",
    badge: "CBSE",
  },
  {
    id: "fz-4",
    name: "Pawanagar Mahavir Inter College",
    nameHindi: "पावानगर महावीर इंटर कॉलेज",
    category: "Schools & Colleges",
    subcategory: "Intermediate College",
    address: "College Road, Fazilnagar - 274401",
    landmark: "College Road Landmark Corridor, Fazilnagar",
    lat: 26.6848,
    lng: 84.0510,
    hours: "08:30 AM – 03:00 PM",
    phone: "+91 5564 222115",
    desc: "Historic educational anchor institution of Fazilnagar town providing secondary and senior secondary education.",
    badge: "UP Board",
  },
  {
    id: "fz-5",
    name: "State Bank of India (SBI) & ATM Fazilnagar",
    nameHindi: "भारतीय स्टेट बैंक एवं 24x7 एटीएम",
    category: "Public Facilities",
    subcategory: "Banks & ATMs",
    address: "College Road (Branch Code 02542), Fazilnagar - 274401",
    landmark: "College Road Junction, Fazilnagar",
    lat: 26.6850,
    lng: 84.0507,
    hours: "10:00 AM – 04:00 PM (ATM 24x7)",
    phone: "1800 1234",
    desc: "Primary nationalized commercial banking branch with locker facilities, foreign exchange, and multi-kiosk ATMs.",
    badge: "Banking",
  },
  {
    id: "fz-6",
    name: "Prashant Sweet House",
    nameHindi: "प्रशांत स्वीट हाउस एवं चाट भंडार",
    category: "Sweet Shops & Bakeries",
    subcategory: "Mithai & Chaat",
    address: "Main Market, NH-27 Chowk, Fazilnagar - 274401",
    landmark: "Central Highway Chowk, Fazilnagar",
    lat: 26.6833,
    lng: 84.0502,
    hours: "07:30 AM – 09:30 PM",
    phone: "+91 98392 45678",
    desc: "Famous local confectionery known for pure desi ghee peda, rasgulla, morning samosas, and evening chaat.",
    badge: "Traditional",
  },
  {
    id: "fz-7",
    name: "Amit Medical Store",
    nameHindi: "अमित मेडिकल स्टोर",
    category: "Medical Stores & Pharmacies",
    subcategory: "Retail Pharmacy",
    address: "College Road, Fazilnagar - 274401",
    landmark: "Near SBI Crossing, Fazilnagar",
    lat: 26.6846,
    lng: 84.0503,
    hours: "08:00 AM – 09:30 PM",
    phone: "+91 94508 12345",
    desc: "Licensed pharmacy dispensing allopathic prescription drugs, baby food, surgical consumables, and OTC formulations.",
    badge: "Pharmacy",
  },
  {
    id: "fz-8",
    name: "Fazilnagar Police Chowki (Pataherwa PS)",
    nameHindi: "फाजिलनगर पुलिस चौकी",
    category: "Public Facilities",
    subcategory: "Emergency Services",
    address: "NH-27 Highway Chowk, Fazilnagar - 274401",
    landmark: "Highway Kasya-Tamkuhi Junction",
    lat: 26.6839,
    lng: 84.0501,
    hours: "24x7 Law Enforcement",
    phone: "112 / +91 5564 222100",
    desc: "Local police administration and security outpost maintaining traffic regulation, law and order across Fazilnagar town.",
    badge: "Police",
  },
  {
    id: "fz-9",
    name: "Jama Masjid (Masjid-e-Darool Uloom)",
    nameHindi: "जामा मस्जिद (दारुल उलूम) फाजिलनगर",
    category: "Religious Places",
    subcategory: "Mosques",
    address: "Hospital Road, Purani Basti Link, Fazilnagar - 274401",
    landmark: "Purani Basti Road Link, Fazilnagar",
    lat: 26.6815,
    lng: 84.0492,
    hours: "Open during daily prayer times",
    phone: "Local Masjid Committee",
    desc: "Central Friday congregational mosque and historic spiritual center for the town's Muslim community.",
    badge: "Mosque",
  },
  {
    id: "fz-10",
    name: "Fazilnagar Sub Post Office (PIN 274401)",
    nameHindi: "उप डाकघर फाजिलनगर",
    category: "Public Facilities",
    subcategory: "Postal & Speed Post",
    address: "Block Road, Fazilnagar - 274401",
    landmark: "Near BDO Complex, Fazilnagar",
    lat: 26.6816,
    lng: 84.0471,
    hours: "09:00 AM – 05:00 PM (Mon-Sat)",
    phone: "+91 5564 222120",
    desc: "Department of Posts India sub-post office offering Speed Post, parcel booking, Postal Life Insurance, and savings accounts.",
    badge: "Postal",
  },
];

// 17 Verified Landmark & Heritage Images of Kushinagar and Fazilnagar for Hero Carousel
const KUSHINAGAR_FAZILNAGAR_HERO_IMAGES = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1400&auto=format&fit=crop",
    fallback: "/images/hero/mahaparinirvana-temple-1.jpg",
    title: "Mahaparinirvana Temple & Stupa",
    location: "Kushinagar",
    caption: "Sacred historical site of Lord Buddha's Parinirvana with 5th-century reclining Buddha",
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?q=80&w=1400&auto=format&fit=crop",
    fallback: "/images/hero/stupa-ruins-kushinagar.jpg",
    title: "Ramabhar Stupa (Mukutbandhana)",
    location: "Kushinagar",
    caption: "Ancient 15-meter monumental brick stupa where last rites were performed",
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?q=80&w=1400&auto=format&fit=crop",
    fallback: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1400&auto=format&fit=crop",
    title: "Pawanagar Mahavir Jain Tirth",
    location: "Fazilnagar (Ancient Pawa)",
    caption: "Nirvana Bhoomi of 24th Tirthankara Lord Mahavira and historic Manasthambha",
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?q=80&w=1400&auto=format&fit=crop",
    fallback: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1400&auto=format&fit=crop",
    title: "Wat Thai Buddhist Monastery & Gardens",
    location: "Kushinagar",
    caption: "Siamese-style grand temple complex and serene meditation grounds",
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=1400&auto=format&fit=crop",
    fallback: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?q=80&w=1400&auto=format&fit=crop",
    title: "Indo-Japan Buddhist Lotus Stupa",
    location: "Kushinagar",
    caption: "Circular architectural marvel erected by Indo-Japanese cultural society",
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=1400&auto=format&fit=crop",
    fallback: "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?q=80&w=1400&auto=format&fit=crop",
    title: "Pawanagar Tirth Marg Gateway",
    location: "Fazilnagar",
    caption: "Heritage corridor connecting NH-27 to ancient Pawanagar temple complexes",
  },
  {
    id: 7,
    src: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=1400&auto=format&fit=crop",
    fallback: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1400&auto=format&fit=crop",
    title: "Chinese Buddhist Temple & Pagoda",
    location: "Kushinagar",
    caption: "Authentic East Asian Buddhist temple housing sacred marble statue",
  },
  {
    id: 8,
    src: "https://images.unsplash.com/photo-1590766940554-634a7ed41450?q=80&w=1400&auto=format&fit=crop",
    fallback: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?q=80&w=1400&auto=format&fit=crop",
    title: "Matha Kuar Shrine & Ancient Sal Grove",
    location: "Kushinagar",
    caption: "Colossal blue stone image of Lord Buddha in Bhumisparsha Mudra",
  },
  {
    id: 9,
    src: "https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=1400&auto=format&fit=crop",
    fallback: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=1400&auto=format&fit=crop",
    title: "Ancient Pawa Excavations & Monastic Viharas",
    location: "Fazilnagar & Kushinagar",
    caption: "ASI protected archaeological brick foundations and stupa ruins",
  },
  {
    id: 10,
    src: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1400&auto=format&fit=crop",
    fallback: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?q=80&w=1400&auto=format&fit=crop",
    title: "Tibetan Buddhist Temple & Prayer Wheels",
    location: "Kushinagar",
    caption: "Spiritual sanctuary decorated with traditional Tibetan thangka frescoes",
  },
  {
    id: 11,
    src: "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=1400&auto=format&fit=crop",
    fallback: "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=1400&auto=format&fit=crop",
    title: "Linh-Son Monastery & Meditation Hall",
    location: "Kushinagar",
    caption: "Vietnamese-style multi-tiered sanctum for peace and spiritual retreat",
  },
  {
    id: 12,
    src: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=1400&auto=format&fit=crop",
    fallback: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1400&auto=format&fit=crop",
    title: "Parinirvana Stupa Sunset Panorama",
    location: "Kushinagar",
    caption: "Golden evening hour over the world-renowned Buddhist pilgrimage hub",
  },
  {
    id: 13,
    src: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?q=80&w=1400&auto=format&fit=crop",
    fallback: "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?q=80&w=1400&auto=format&fit=crop",
    title: "Pawanagar Spiritual Heritage Grounds",
    location: "Fazilnagar",
    caption: "Peaceful sacred town center preserving historic Jain pilgrimage values",
  },
  {
    id: 14,
    src: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1400&auto=format&fit=crop",
    fallback: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1400&auto=format&fit=crop",
    title: "Kushinagar - Fazilnagar Pilgrimage Corridor",
    location: "NH-27 Heritage Axis",
    caption: "Historic transit corridor traversed by pilgrims from across the globe",
  },
  {
    id: 15,
    src: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1400&auto=format&fit=crop",
    fallback: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?q=80&w=1400&auto=format&fit=crop",
    title: "Archaeological Garden & Sal Tree Canopy",
    location: "Kushinagar & Pawa",
    caption: "Ancient Sal groves where historical events of 5th century BCE unfolded",
  },
  {
    id: 16,
    src: "/images/hero/mahaparinirvana-temple-1.jpg",
    fallback: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1400&auto=format&fit=crop",
    title: "Mahaparinirvana Temple Sanctum",
    location: "Kushinagar",
    caption: "ASI preserved sacred monolith housing the Nirvana Buddha statue",
  },
  {
    id: 17,
    src: "/images/hero/stupa-ruins-kushinagar.jpg",
    fallback: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?q=80&w=1400&auto=format&fit=crop",
    title: "Ancient Stupa Foundations & Relics",
    location: "Kushinagar & Fazilnagar",
    caption: "Timeless brick masonry depicting 2,500 years of civilization",
  }
];

export default function TownPortal() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [places, setPlaces] = useState(VERIFIED_TOWN_PLACES);
  const [selectedPlace, setSelectedPlace] = useState(VERIFIED_TOWN_PLACES[0]);
  const [mapFilter, setMapFilter] = useState("all");
  const [mapViewMode, setMapViewMode] = useState("map"); // "map" | "list"
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [modalType, setModalType] = useState(null); // "business" | "correction" | "event" | null
  const [toastMsg, setToastMsg] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [liveNews, setLiveNews] = useState([]);
  const [aboutTab, setAboutTab] = useState("fazilnagar"); // "fazilnagar" | "kushinagar" | "connection"

  // Hero Background Carousel States (Changes automatically every 3.5 seconds)
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  // Auto-advance Carousel every 3.5 seconds
  useEffect(() => {
    if (isHeroHovered) return;
    const carouselTimer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % KUSHINAGAR_FAZILNAGAR_HERO_IMAGES.length);
    }, 3500);
    return () => clearInterval(carouselTimer);
  }, [isHeroHovered]);

  // Smooth scroll handler with visual landing glow pulse animation
  const handleSmoothScroll = (e, targetId) => {
    if (e && e.preventDefault) e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      element.classList.remove("section-highlight-active");
      void element.offsetWidth; // Force CSS reflow to re-trigger keyframe animation
      element.classList.add("section-highlight-active");
      setTimeout(() => {
        element.classList.remove("section-highlight-active");
      }, 2200);
    }
  };

  // If user arrives with a hash in URL, smoothly scroll and highlight target section
  useEffect(() => {
    if (window.location.hash) {
      const sectionId = window.location.hash.replace("#", "");
      setTimeout(() => {
        handleSmoothScroll(null, sectionId);
      }, 350);
    }
  }, []);

  useEffect(() => {
    const syncUser = () => {
      const saved = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      if (saved) {
        try {
          setCurrentUser(JSON.parse(saved));
          return;
        } catch (e) {}
      }
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
          if (payload) {
            const u = { name: payload.name || payload.email?.split("@")[0] || "Citizen", email: payload.email, id: payload.id };
            setCurrentUser(u);
            localStorage.setItem("user", JSON.stringify(u));
            return;
          }
        } catch (e) {}
      }
      setCurrentUser(null);
    };

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("auth-change", syncUser);
    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("auth-change", syncUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    setCurrentUser(null);
    window.dispatchEvent(new Event("auth-change"));
    window.dispatchEvent(new Event("storage"));
  };

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  // Fetch live places & news from backend if available
  useEffect(() => {
    API.get("/places?limit=100")
      .then((res) => {
        const rawList = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
        if (rawList.length > 0) {
          const apiPlaces = rawList.map((p) => ({
            id: p._id || p.id,
            name: p.name,
            nameHindi: p.alternateNames?.[0] || p.name,
            category: p.category,
            subcategory: p.subcategory,
            address: p.addressFull,
            landmark: p.streetOrLandmark || p.locality,
            lat: p.latitude || p.lat,
            lng: p.longitude || p.lng,
            hours: p.openingHours || "General Hours",
            phone: p.phone || "Public Listing",
            desc: p.description,
            badge: p.subcategory || p.category,
          }));
          setPlaces(apiPlaces);
          setSelectedPlace(apiPlaces[0]);
        }
      })
      .catch(() => {
        // Fallback to grounded local verified data
      });

    API.get("/news")
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setLiveNews(res.data);
        }
      })
      .catch((err) => {
        console.error("Live news fetch error:", err);
      });
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapContainerRef.current._leaflet_id && !mapInstanceRef.current) {
      delete mapContainerRef.current._leaflet_id;
    }

    if (!mapInstanceRef.current) {
      const townCenterLat = 26.6827;
      const townCenterLng = 84.0498;

      const map = L.map(mapContainerRef.current, {
        center: [townCenterLat, townCenterLng],
        zoom: 15,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    renderMarkers(places);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapViewMode]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      renderMarkers(places);
    }
  }, [places, mapFilter]);

  const renderMarkers = (items) => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach((m) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(m);
      }
    });
    markersRef.current = [];

    let filtered = items;
    if (mapFilter !== "all") {
      filtered = items.filter(
        (p) => p.category === mapFilter || p.subcategory === mapFilter
      );
    }

    const createTownMarkerIcon = () => {
      const svgHtml = `
        <div style="display:flex;align-items:center;justify-content:center;width:28px;height:36px;cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <svg viewBox="0 0 24 24" width="28" height="36" fill="#B8323C" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.8" fill="#ffffff" />
          </svg>
        </div>
      `;
      return L.divIcon({
        html: svgHtml,
        className: "townportal-custom-pin",
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -34],
      });
    };

    filtered.forEach((place) => {
      if (!place.lat || !place.lng) return;
      const marker = L.marker([place.lat, place.lng], {
        icon: createTownMarkerIcon(),
      }).addTo(mapInstanceRef.current);

      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; font-size: 12px; min-width: 180px; color: #18232E;">
          <span style="font-size: 9px; font-weight: 800; color: #B8323C; text-transform: uppercase; letter-spacing: 0.5px;">${place.category}</span>
          <h4 style="margin: 2px 0 4px; font-size: 13px; font-weight: 700; color: #18232E;">${place.name}</h4>
          <p style="margin: 0; font-size: 11px; color: #647180;">${place.landmark}</p>
        </div>
      `);

      marker.on("click", () => {
        setSelectedPlace(place);
      });

      markersRef.current.push(marker);
    });
  };

  // Search autocomplete matches
  const searchMatches = searchQuery.trim()
    ? places.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.landmark.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.subcategory && p.subcategory.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleSelectLocation = (place) => {
    setSelectedPlace(place);
    setSearchQuery("");
    setDropdownOpen(false);
    const mapSec = document.getElementById("town-map-section");
    if (mapSec) mapSec.scrollIntoView({ behavior: "smooth" });
    if (mapInstanceRef.current && place.lat && place.lng) {
      mapInstanceRef.current.flyTo([place.lat, place.lng], 16, { duration: 1.2 });
    }
  };

  const handleFormSubmit = async (e, type) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const payload = {
      type,
      title: formData.get("title") || "",
      category: formData.get("category") || "",
      phone: formData.get("phone") || "",
      landmark: formData.get("landmark") || "",
      venue: formData.get("venue") || "",
      eventDate: formData.get("eventDate") || "",
      organizer: formData.get("organizer") || "",
      details: formData.get("details") || "",
      submittedBy: {
        name: currentUser?.name || "Local Resident",
        email: currentUser?.email || "",
      },
    };

    try {
      await API.post("/submissions", payload);
      setModalType(null);
      let msg = "Establishment submitted to town admin review queue!";
      if (type === "correction") msg = "Thank you! Information correction submitted for Admin review.";
      if (type === "event") msg = "Event announcement submitted for Admin approval!";
      showToast(msg);
      form.reset();
    } catch (err) {
      console.error("Submission error:", err);
      showToast("Submission failed. Please check connection and try again.");
    }
  };

  // Filtered Schools preview
  const schoolsList = places.filter(
    (p) => p.category === "Schools & Colleges" || (p.subcategory && p.subcategory.includes("School"))
  );

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-[#F5F7F8] font-sans text-[#18232E] selection:bg-[#B8323C] selection:text-white">
      {/* ========================================================
          SECTION 1: STICKY NAVIGATION (Modern Civic & Editorial)
          ======================================================== */}
      <nav className="sticky top-0 z-50 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E1E6EA] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Wordmark Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-9 h-9 rounded-xl bg-[#18232E] flex items-center justify-center text-white font-extrabold text-base border border-slate-700 shadow-xs">
                F
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-[#18232E] leading-none block font-heading">
                  FAZIL<span className="text-[#B8323C]">NAGAR</span>
                </span>
                <span className="text-[10px] font-medium text-[#647180] tracking-wider block">
                  Your Town. Your Community.
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-5 text-xs font-semibold text-[#18232E]">
              <button
                onClick={(e) => handleSmoothScroll(e, "hero-section")}
                className="text-[#B8323C] font-bold cursor-pointer hover:opacity-80 transition"
              >
                Home
              </button>
              <button
                onClick={(e) => handleSmoothScroll(e, "explore-categories")}
                className="text-[#647180] hover:text-[#18232E] transition cursor-pointer"
              >
                Explore
              </button>
              <Link to="/directory" className="text-[#647180] hover:text-[#18232E] transition flex items-center gap-1">
                <span>Directory</span>
                <span className="text-[9px] bg-[#168568] text-white px-1.5 py-0.2 rounded-full font-bold">37</span>
              </Link>
              <button
                onClick={(e) => handleSmoothScroll(e, "town-map-section")}
                className="text-[#647180] hover:text-[#18232E] transition cursor-pointer"
              >
                Map
              </button>
              <button
                onClick={(e) => handleSmoothScroll(e, "local-updates-section")}
                className="text-[#647180] hover:text-[#18232E] transition cursor-pointer"
              >
                Local Updates
              </button>
              <button
                onClick={(e) => handleSmoothScroll(e, "about-fazilnagar-section")}
                className="text-[#647180] hover:text-[#18232E] transition cursor-pointer"
              >
                About
              </button>
            </div>

            {/* Primary Action & Citizen Auth Bar */}
            <div className="hidden sm:flex items-center gap-2.5 shrink-0">
              {currentUser ? (
                <>
                  {currentUser.role === "admin" && (
                    <Link
                      to="/admin/review"
                      className="bg-amber-100 hover:bg-amber-200 text-amber-900 hover:text-amber-950 border border-amber-300 text-xs font-extrabold px-3 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                      <span>Review Desk</span>
                    </Link>
                  )}
                  <span className="text-xs font-bold text-[#168568] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    {currentUser.role === "admin" ? "Admin" : (currentUser.name || currentUser.email)}
                  </span>
                  <Link
                    to="/create-news"
                    className="bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs flex items-center gap-1"
                  >
                    <span>✍️ Post News</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-xs font-bold text-[#18232E] hover:text-[#B8323C] px-3 py-2 transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs"
                  >
                    Register
                  </Link>
                  <Link
                    to="/directory"
                    className="bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Explore Town</span>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-[#18232E] hover:bg-slate-100"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-white border-t border-[#E1E6EA] py-3 px-2 space-y-1 text-xs font-semibold shadow-lg animate-slide-down">
              <button
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleSmoothScroll(e, "hero-section");
                }}
                className="w-full text-left block px-3 py-2 rounded-lg text-[#B8323C] font-bold bg-red-50 cursor-pointer"
              >
                Home
              </button>
              <button
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleSmoothScroll(e, "explore-categories");
                }}
                className="w-full text-left block px-3 py-2 rounded-lg text-[#18232E] hover:bg-slate-50 cursor-pointer"
              >
                Explore (21 Categories)
              </button>
              <Link
                to="/directory"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-[#18232E] hover:bg-slate-50"
              >
                Full Town Directory
              </Link>
              <button
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleSmoothScroll(e, "town-map-section");
                }}
                className="w-full text-left block px-3 py-2 rounded-lg text-[#18232E] hover:bg-slate-50 cursor-pointer"
              >
                Interactive Map
              </button>
              <button
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleSmoothScroll(e, "local-updates-section");
                }}
                className="w-full text-left block px-3 py-2 rounded-lg text-[#18232E] hover:bg-slate-50 cursor-pointer"
              >
                Local News & Events
              </button>
              <button
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleSmoothScroll(e, "about-fazilnagar-section");
                }}
                className="w-full text-left block px-3 py-2 rounded-lg text-[#18232E] hover:bg-slate-50 cursor-pointer"
              >
                About Fazilnagar
              </button>
              <button
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleSmoothScroll(e, "citizen-corner-section");
                }}
                className="w-full text-left block px-3 py-2 rounded-lg text-[#168568] font-bold hover:bg-slate-50 cursor-pointer"
              >
                Citizen Corner (Suggest & Report)
              </button>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                {currentUser ? (
                  <>
                    {currentUser.role === "admin" && (
                      <Link
                        to="/admin/review"
                        onClick={() => setMobileMenuOpen(false)}
                        className="bg-amber-100 border border-amber-300 text-amber-900 text-xs font-extrabold px-3 py-2 rounded-xl text-center shadow-xs"
                      >
                        🛡️ Review
                      </Link>
                    )}
                    <Link
                      to="/create-news"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 bg-[#B8323C] text-white text-xs font-bold py-2 rounded-xl text-center shadow-xs"
                    >
                      ✍️ Post News
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold py-2 rounded-xl text-center"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 bg-slate-900 text-white text-xs font-bold py-2 rounded-xl text-center shadow-xs"
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ========================================================
          SECTION 2: HERO SECTION (Dynamic Kushinagar & Fazilnagar Carousel)
          ======================================================== */}
      <section
        id="hero-section"
        onMouseEnter={() => setIsHeroHovered(true)}
        onMouseLeave={() => setIsHeroHovered(false)}
        className="relative bg-[#18232E] text-white py-16 sm:py-20 lg:py-24 overflow-hidden border-b border-slate-800"
      >
        {/* Dynamic Multi-Image Carousel of Kushinagar & Fazilnagar (17 Landmark Images, Auto-advancing every 3.5s) */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {KUSHINAGAR_FAZILNAGAR_HERO_IMAGES.map((img, idx) => (
            <div
              key={img.id || idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                idx === heroSlideIndex ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              <img
                src={img.src}
                alt={img.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  if (img.fallback && e.currentTarget.src !== img.fallback) {
                    e.currentTarget.src = img.fallback;
                  }
                }}
                className={`w-full h-full object-cover object-center ${
                  idx === heroSlideIndex ? "animate-ken-burns scale-105" : "scale-100"
                } transition-transform duration-1000 ease-out`}
              />
            </div>
          ))}

          {/* Elegant Multi-layered Dark Gradients ensuring crisp text readability while showcasing vibrant photography */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#101923] via-[#18232E]/80 to-[#101923]/88 z-20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#101923]/92 via-[#18232E]/60 to-[#101923]/92 z-20"></div>
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#E1E6EA_1px,transparent_1px)] [background-size:24px_24px] z-20"></div>
        </div>

        <div className="relative z-30 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Active Landmark Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs text-slate-200 font-medium mb-5 shadow-xl animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-amber-300 font-bold">📍 {KUSHINAGAR_FAZILNAGAR_HERO_IMAGES[heroSlideIndex].location}</span>
            <span className="text-slate-400">•</span>
            <span className="font-semibold text-white">{KUSHINAGAR_FAZILNAGAR_HERO_IMAGES[heroSlideIndex].title}</span>
          </div>

          {/* Master Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight font-heading drop-shadow-md">
            Apna Fazilnagar,{" "}
            <span className="text-[#B8323C] inline-block">Apni Pehchaan.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-200 max-w-2xl mx-auto mb-9 font-normal leading-relaxed drop-shadow-sm">
            Discover local places, essential services, businesses and everything happening in Fazilnagar — all in one place.
          </p>

          {/* Smart Search Bar */}
          <div className="max-w-2xl mx-auto relative text-left">
            <div className="bg-white rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row items-center gap-2 border border-[#E1E6EA]">
              <div className="flex items-center gap-3 w-full px-3 py-2 text-[#18232E]">
                <Search className="w-5 h-5 text-[#647180] flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search schools, hospitals, medical stores, sweet shops…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setDropdownOpen(Boolean(e.target.value.trim()));
                  }}
                  onFocus={() => {
                    if (searchQuery.trim()) setDropdownOpen(true);
                  }}
                  className="w-full text-xs sm:text-sm outline-none bg-transparent placeholder-slate-400 text-[#18232E] font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setDropdownOpen(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  if (!searchQuery.trim()) {
                    showToast("Please enter a keyword to search town directory.");
                    return;
                  }
                  navigate(`/directory?search=${encodeURIComponent(searchQuery)}`);
                }}
                className="w-full sm:w-auto bg-[#18232E] hover:bg-[#B8323C] text-white px-6 py-2.5 rounded-xl font-bold text-xs tracking-wide transition shadow-sm whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Search</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
              </button>
            </div>

            {/* Smart Search Suggestions Dropdown */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-[#E1E6EA] z-50 overflow-hidden max-h-80 overflow-y-auto animate-slide-down">
                <div className="p-3 border-b border-slate-100 text-[11px] font-bold text-[#647180] uppercase tracking-wider flex justify-between items-center">
                  <span>Verified Town Results</span>
                  <span className="text-[#168568] font-bold">{searchMatches.length} matches</span>
                </div>
                {searchMatches.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    <p className="text-xs font-semibold text-slate-800">No matching places found inside town boundary</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Search by category like "Schools", "Hospital", "Sweets", or road name "College Road".
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {searchMatches.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectLocation(item)}
                        className="p-3.5 hover:bg-slate-50 cursor-pointer transition flex items-center justify-between"
                      >
                        <div className="pr-2">
                          <span className="text-[10px] font-bold text-[#B8323C] uppercase tracking-wider block">
                            {item.category}
                          </span>
                          <h5 className="text-xs font-bold text-[#18232E]">{item.name}</h5>
                          <p className="text-[11px] text-[#647180] line-clamp-1">{item.landmark}</p>
                        </div>
                        <span className="text-xs font-semibold text-[#168568] flex items-center gap-1">
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Primary CTA Buttons with Smooth Animations */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={(e) => handleSmoothScroll(e, "explore-categories")}
              className="inline-flex items-center gap-2 bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-xl shadow-lg transition cursor-pointer hover:scale-105 active:scale-95 duration-200"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Town</span>
            </button>
            <button
              onClick={(e) => handleSmoothScroll(e, "town-map-section")}
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-semibold px-6 py-3 rounded-xl border border-white/25 backdrop-blur-md shadow-lg transition cursor-pointer hover:scale-105 active:scale-95 duration-200"
            >
              <Map className="w-4 h-4 text-emerald-400" />
              <span>View Map</span>
            </button>
          </div>

          {/* Carousel Progress Controls & Dot Indicators */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setHeroSlideIndex((prev) => (prev - 1 + KUSHINAGAR_FAZILNAGAR_HERO_IMAGES.length) % KUSHINAGAR_FAZILNAGAR_HERO_IMAGES.length)}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center text-sm backdrop-blur-md border border-white/20 transition cursor-pointer"
              aria-label="Previous Slide"
              title="Previous landmark"
            >
              ‹
            </button>

            {/* Dots */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
              {KUSHINAGAR_FAZILNAGAR_HERO_IMAGES.map((img, dotIdx) => (
                <button
                  key={img.id || dotIdx}
                  type="button"
                  onClick={() => setHeroSlideIndex(dotIdx)}
                  aria-label={`Jump to slide ${dotIdx + 1}: ${img.title}`}
                  title={`${img.location}: ${img.title}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    dotIdx === heroSlideIndex
                      ? "w-6 h-2 bg-[#B8323C] shadow-sm"
                      : "w-2 h-2 bg-white/40 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setHeroSlideIndex((prev) => (prev + 1) % KUSHINAGAR_FAZILNAGAR_HERO_IMAGES.length)}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center text-sm backdrop-blur-md border border-white/20 transition cursor-pointer"
              aria-label="Next Slide"
              title="Next landmark"
            >
              ›
            </button>

            <span className="text-[11px] text-slate-300 font-mono font-semibold bg-black/40 px-2 py-0.5 rounded-md border border-white/10">
              {heroSlideIndex + 1}/{KUSHINAGAR_FAZILNAGAR_HERO_IMAGES.length}
            </span>
          </div>

          {/* Town Trust Badges */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Strictly Inside Town Limits
            </span>
            <span className="flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-emerald-400" /> Exact Ground Coordinates
            </span>
            <span className="flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-amber-400" /> Ancient Pawanagar Heritage
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 3: EXPLORE FAZILNAGAR (21 Clickable Categories)
          ======================================================== */}
      <section id="explore-categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8323C] uppercase tracking-wider mb-1">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Civic Directory Index</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#18232E] tracking-tight font-heading">
              Explore Fazilnagar
            </h2>
            <p className="text-xs sm:text-sm text-[#647180] mt-1">
              Select any of the 21 town categories to access verified establishments.
            </p>
          </div>
          <Link
            to="/directory"
            className="text-xs font-bold px-4 py-2 rounded-xl bg-[#18232E] hover:bg-[#B8323C] text-white transition self-start md:self-auto"
          >
            Open Full Directory →
          </Link>
        </div>

        {/* 21 Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {EXPLORE_21_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.id}
                to={cat.query === "all" ? "/directory" : `/directory?category=${encodeURIComponent(cat.query)}`}
                className="group bg-white p-3.5 rounded-xl border border-[#E1E6EA] hover:border-[#CBD5E1] hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="w-9 h-9 rounded-lg bg-[#F5F7F8] text-[#18232E] flex items-center justify-center mb-2.5 group-hover:bg-[#18232E] group-hover:text-white transition">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#18232E] group-hover:text-[#B8323C] transition line-clamp-1 leading-snug">
                    {cat.name}
                  </h3>
                  <span className="text-[10px] text-[#647180] font-medium block mt-0.5">
                    {cat.count} listings
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ========================================================
          SECTION 4: ESSENTIAL SERVICES (High-Priority Civic Hub)
          ======================================================== */}
      <section className="bg-white py-16 border-y border-[#E1E6EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#168568] uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Public Welfare & Emergency</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18232E] tracking-tight font-heading">
              Essential Public Services
            </h2>
            <p className="text-xs sm:text-sm text-[#647180] mt-1">
              Emergency numbers, primary healthcare, pharmacy points, and administrative offices in Fazilnagar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CHC Government Hospital */}
            <div className="bg-[#F5F7F8] p-5 rounded-2xl border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-[#B8323C] uppercase tracking-wider block mb-1">
                  24/7 Healthcare
                </span>
                <h3 className="text-sm font-bold text-[#18232E]">Community Health Centre (CHC)</h3>
                <p className="text-xs text-[#647180] mt-1">Hospital Road, Fazilnagar - 274401</p>
                <p className="text-[11px] text-slate-600 mt-2">
                  Emergency ward, routine maternal delivery, vaccination and ambulance hub.
                </p>
              </div>
              <div className="pt-4 border-t border-[#E1E6EA] mt-4 flex items-center justify-between">
                <a href="tel:05564222102" className="text-xs font-bold text-[#18232E] hover:text-[#B8323C]">
                  📞 05564-222102
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "Community Health Centre (CHC)", lat: 26.6818, lng: 84.0531, landmark: "Hospital Road, Fazilnagar" })}
                  className="text-xs font-bold text-[#168568] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>

            {/* Police Chowki */}
            <div className="bg-[#F5F7F8] p-5 rounded-2xl border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-[#B8323C] uppercase tracking-wider block mb-1">
                  Law & Order
                </span>
                <h3 className="text-sm font-bold text-[#18232E]">Fazilnagar Police Chowki</h3>
                <p className="text-xs text-[#647180] mt-1">NH-27 Highway Chowk, Fazilnagar</p>
                <p className="text-[11px] text-slate-600 mt-2">
                  Emergency police assistance under Pataherwa PS jurisdiction.
                </p>
              </div>
              <div className="pt-4 border-t border-[#E1E6EA] mt-4 flex items-center justify-between">
                <a href="tel:112" className="text-xs font-bold text-[#18232E] hover:text-[#B8323C]">
                  🚨 Helpline: 112
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "Fazilnagar Police Chowki", lat: 26.6839, lng: 84.0501, landmark: "NH-27 Highway Chowk, Fazilnagar" })}
                  className="text-xs font-bold text-[#168568] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>

            {/* Sub Post Office */}
            <div className="bg-[#F5F7F8] p-5 rounded-2xl border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-[#168568] uppercase tracking-wider block mb-1">
                  Postal Services
                </span>
                <h3 className="text-sm font-bold text-[#18232E]">Fazilnagar Sub Post Office</h3>
                <p className="text-xs text-[#647180] mt-1">Block Road, Fazilnagar (PIN 274401)</p>
                <p className="text-[11px] text-slate-600 mt-2">
                  Speed Post, postal parcels, savings schemes, and Aadhaar-enabled payments.
                </p>
              </div>
              <div className="pt-4 border-t border-[#E1E6EA] mt-4 flex items-center justify-between">
                <a href="tel:05564222120" className="text-xs font-bold text-[#18232E] hover:text-[#B8323C]">
                  📞 05564-222120
                </a>
                <span className="text-[10px] text-slate-400 font-semibold">09:00–17:00</span>
              </div>
            </div>

            {/* Electricity Substation */}
            <div className="bg-[#F5F7F8] p-5 rounded-2xl border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-[#647180] uppercase tracking-wider block mb-1">
                  Power Utility
                </span>
                <h3 className="text-sm font-bold text-[#18232E]">UPPCL 33/11kV Substation</h3>
                <p className="text-xs text-[#647180] mt-1">Block Road Perimeter, Fazilnagar</p>
                <p className="text-[11px] text-slate-600 mt-2">
                  Electricity distribution control, billing queries, and transformer outages.
                </p>
              </div>
              <div className="pt-4 border-t border-[#E1E6EA] mt-4 flex items-center justify-between">
                <a href="tel:1912" className="text-xs font-bold text-[#18232E] hover:text-[#B8323C]">
                  ⚡ Helpline: 1912
                </a>
                <span className="text-[10px] text-emerald-700 font-semibold">24x7 Control</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 5: EXPLORE FAZILNAGAR ON MAP (Leaflet Synchronized)
          ======================================================== */}
      <section id="town-map-section" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#168568] uppercase tracking-wider mb-1">
                <Map className="w-3.5 h-3.5" />
                <span>Geospatial Verification</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18232E] tracking-tight font-heading">
                Explore Fazilnagar on Map
              </h2>
              <p className="text-xs sm:text-sm text-[#647180] mt-1">
                Every pin uses exact decimal coordinates along the NH-27, College Road, and Hospital Road axis.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Map & List View Toggle */}
              <div className="bg-white p-1 rounded-xl border border-[#E1E6EA] flex items-center text-xs font-semibold">
                <button
                  onClick={() => setMapViewMode("map")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    mapViewMode === "map" ? "bg-[#18232E] text-white" : "text-[#647180] hover:text-[#18232E]"
                  }`}
                >
                  Map View
                </button>
                <button
                  onClick={() => setMapViewMode("list")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    mapViewMode === "list" ? "bg-[#18232E] text-white" : "text-[#647180] hover:text-[#18232E]"
                  }`}
                >
                  List View
                </button>
              </div>

              <div className="text-[11px] text-[#18232E] bg-white px-3 py-1.5 rounded-xl border border-[#E1E6EA] font-semibold hidden sm:flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#168568] animate-pulse"></span>
                <span>26.6827° N, 84.0498° E</span>
              </div>
            </div>
          </div>

          {/* Map Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 text-xs font-semibold">
            {[
              { id: "all", label: "All Verified Places" },
              { id: "Schools & Colleges", label: "Schools & Colleges" },
              { id: "Hospitals & Clinics", label: "Hospitals & Healthcare" },
              { id: "Sweet Shops & Bakeries", label: "Sweets & Mithai" },
              { id: "Medical Stores & Pharmacies", label: "Medical Stores" },
              { id: "Religious Places", label: "Temples & Shrines" },
              { id: "Public Facilities", label: "Public & Banks" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMapFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition border ${
                  mapFilter === tab.id
                    ? "bg-[#18232E] text-white border-[#18232E]"
                    : "bg-white border-[#E1E6EA] text-[#647180] hover:bg-slate-50 hover:text-[#18232E]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Map Content */}
          {mapViewMode === "map" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Leaflet Map Frame */}
              <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden border border-[#E1E6EA] shadow-xs relative min-h-[440px]">
                <div ref={mapContainerRef} className="w-full h-full min-h-[440px] z-10" />
              </div>

              {/* Synchronized Detail Card */}
              <div
                key={selectedPlace.id}
                className="bg-white rounded-2xl p-5 border border-[#E1E6EA] shadow-xs flex flex-col justify-between animate-fade-in-up transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-red-50 text-[#B8323C]">
                      {selectedPlace.category}
                    </span>
                    <span className="text-[11px] font-semibold text-[#168568] flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Town Verified
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#18232E] mb-1 font-heading">{selectedPlace.name}</h3>
                  {selectedPlace.nameHindi && (
                    <p className="text-xs text-[#647180] mb-3">{selectedPlace.nameHindi}</p>
                  )}

                  <div className="space-y-2 text-xs text-[#647180] py-3 border-y border-[#E1E6EA]">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span>{selectedPlace.address}</span>
                    </div>
                    {selectedPlace.hours && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{selectedPlace.hours}</span>
                      </div>
                    )}
                    {selectedPlace.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{selectedPlace.phone}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">{selectedPlace.desc}</p>
                </div>

                <div className="pt-4 border-t border-[#E1E6EA] mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => openGoogleMapsDirections(selectedPlace)}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#168568] hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Get Directions in Google Maps</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Map Alternative List View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
              {places
                .filter((p) => mapFilter === "all" || p.category === mapFilter || p.subcategory === mapFilter)
                .map((p) => (
                  <div key={p.id} className="bg-white p-5 rounded-2xl border border-[#E1E6EA] shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-[10px] font-bold text-[#B8323C] uppercase">{p.category}</span>
                        <span className="text-[11px] text-[#168568] font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Verified
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#18232E] mb-1">{p.name}</h4>
                      <p className="text-xs text-[#647180] mb-2">{p.landmark}</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{p.desc}</p>
                    </div>
                    <div className="pt-3 border-t border-[#E1E6EA] mt-3 flex items-center justify-between text-xs">
                      <span className="text-[#647180] text-[11px]">{p.hours}</span>
                      <button
                        type="button"
                        onClick={() => openGoogleMapsDirections(p)}
                        className="text-[#168568] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Directions <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================
          SECTION 6: DISCOVER LOCAL BUSINESSES (Verified Shops)
          ======================================================== */}
      <section className="bg-white py-16 border-b border-[#E1E6EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8323C] uppercase tracking-wider mb-1">
                <Store className="w-3.5 h-3.5" />
                <span>Commerce & Retail</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18232E] tracking-tight font-heading">
                Discover Local Businesses
              </h2>
              <p className="text-xs sm:text-sm text-[#647180] mt-1">
                Authentic sweet houses, bakeries, medical stores, and retail markets serving Fazilnagar town.
              </p>
            </div>
            <Link
              to="/directory?category=Sweet%20Shops%20%26%20Bakeries"
              className="text-xs font-bold text-[#B8323C] hover:underline flex items-center gap-1"
            >
              <span>View All Shops</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Prashant Sweet House */}
            <div className="bg-[#F5F7F8] p-5 rounded-2xl border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#B8323C] uppercase">Sweet Shop & Chaat</span>
                <h4 className="text-sm font-bold text-[#18232E] mt-1">Prashant Sweet House</h4>
                <p className="text-xs text-[#647180] mt-0.5">Main Market, NH-27 Chowk</p>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  Famous for pure desi ghee peda, rasgulla, morning kachori-jalebi, and evening chaat snacks.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E1E6EA] mt-4 flex items-center justify-between text-xs">
                <a href="tel:09839245678" className="font-bold text-[#18232E] hover:text-[#B8323C]">
                  Call Shop
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "Prashant Sweet House", lat: 26.6833, lng: 84.0502, landmark: "Main Market, NH-27 Chowk, Fazilnagar" })}
                  className="font-bold text-[#168568] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>

            {/* Kanha Sweets */}
            <div className="bg-[#F5F7F8] p-5 rounded-2xl border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#B8323C] uppercase">Mithai & Snacks</span>
                <h4 className="text-sm font-bold text-[#18232E] mt-1">Kanha Sweets</h4>
                <p className="text-xs text-[#647180] mt-0.5">College Road Crossing</p>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  Specialty sweets, fresh milk paneer, and authentic namkeen prepared daily with verified purity.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E1E6EA] mt-4 flex items-center justify-between text-xs">
                <a href="tel:09450987654" className="font-bold text-[#18232E] hover:text-[#B8323C]">
                  Call Shop
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "Kanha Sweets", lat: 26.6844, lng: 84.0506, landmark: "College Road Crossing, Fazilnagar" })}
                  className="font-bold text-[#168568] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>

            {/* Amit Medical Store */}
            <div className="bg-[#F5F7F8] p-5 rounded-2xl border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#168568] uppercase">Retail Pharmacy</span>
                <h4 className="text-sm font-bold text-[#18232E] mt-1">Amit Medical Store</h4>
                <p className="text-xs text-[#647180] mt-0.5">College Road, Fazilnagar</p>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  Licensed retail chemist providing allopathic pharmaceuticals, surgical kits, and health monitors.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E1E6EA] mt-4 flex items-center justify-between text-xs">
                <a href="tel:09450812345" className="font-bold text-[#18232E] hover:text-[#B8323C]">
                  Call Chemist
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "Amit Medical Store", lat: 26.6846, lng: 84.0503, landmark: "College Road, Fazilnagar" })}
                  className="font-bold text-[#168568] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>

            {/* Maurya Electronics */}
            <div className="bg-[#F5F7F8] p-5 rounded-2xl border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#647180] uppercase">Electronics & Mobile</span>
                <h4 className="text-sm font-bold text-[#18232E] mt-1">Maurya Electronics & Mobile</h4>
                <p className="text-xs text-[#647180] mt-0.5">Babu Bazar, Fazilnagar</p>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  Smartphones, home appliances, inverter battery care, and chip-level device repair services.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E1E6EA] mt-4 flex items-center justify-between text-xs">
                <a href="tel:09838877665" className="font-bold text-[#18232E] hover:text-[#B8323C]">
                  Call Store
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "Maurya Electronics & Mobile", lat: 26.6827, lng: 84.0486, landmark: "Babu Bazar, Fazilnagar" })}
                  className="font-bold text-[#168568] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 7: SCHOOLS & COLLEGES (Education Preview)
          ======================================================== */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8323C] uppercase tracking-wider mb-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Education Directory</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18232E] tracking-tight font-heading">
                Schools & Colleges in Town
              </h2>
              <p className="text-xs sm:text-sm text-[#647180] mt-1">
                Verified educational institutions located within Fazilnagar town boundary.
              </p>
            </div>
            <Link
              to="/directory?category=Schools%20%26%20Colleges"
              className="text-xs font-bold bg-[#18232E] hover:bg-[#B8323C] text-white px-4 py-2.5 rounded-xl transition self-start md:self-auto"
            >
              View All Schools & Colleges →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Sanskar Central Academy */}
            <div className="bg-white p-5 rounded-2xl border border-[#E1E6EA] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[10px] font-bold text-[#B8323C] uppercase bg-red-50 px-2 py-0.5 rounded">
                    CBSE English Medium
                  </span>
                  <span className="text-[11px] text-[#168568] font-bold">Nursery – Class XII</span>
                </div>
                <h4 className="text-base font-bold text-[#18232E] mb-1">Sanskar Central Academy</h4>
                <p className="text-xs text-[#647180] mb-3">Durga Bhawan Campus, College Road</p>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  Established CBSE-affiliated co-educational academy with smart computer labs, audio-visual classes, and sports training.
                </p>
              </div>
              <div className="pt-4 border-t border-[#E1E6EA] mt-4 flex items-center justify-between text-xs">
                <a href="tel:09452089540" className="font-bold text-[#18232E] hover:text-[#B8323C]">
                  📞 094520 89540
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "Sanskar Central Academy", lat: 26.6852, lng: 84.0508, landmark: "Durga Bhawan Campus, College Road, Fazilnagar" })}
                  className="font-bold text-[#168568] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>

            {/* Pawanagar Mahavir Inter College */}
            <div className="bg-white p-5 rounded-2xl border border-[#E1E6EA] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[10px] font-bold text-slate-700 uppercase bg-slate-100 px-2 py-0.5 rounded">
                    UP Board Sr. Secondary
                  </span>
                  <span className="text-[11px] text-[#168568] font-bold">Class VI – XII</span>
                </div>
                <h4 className="text-base font-bold text-[#18232E] mb-1">Pawanagar Mahavir Inter College</h4>
                <p className="text-xs text-[#647180] mb-3">College Road, Fazilnagar</p>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  Historic town anchor college offering Science, Commerce, and Arts streams with extensive athletic grounds.
                </p>
              </div>
              <div className="pt-4 border-t border-[#E1E6EA] mt-4 flex items-center justify-between text-xs">
                <a href="tel:05564222115" className="font-bold text-[#18232E] hover:text-[#B8323C]">
                  📞 05564-222115
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "Pawanagar Mahavir Inter College", lat: 26.6848, lng: 84.0510, landmark: "College Road, Fazilnagar" })}
                  className="font-bold text-[#168568] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>

            {/* The Hermitage School */}
            <div className="bg-white p-5 rounded-2xl border border-[#E1E6EA] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded">
                    English Medium Primary
                  </span>
                  <span className="text-[11px] text-[#168568] font-bold">KG – Middle</span>
                </div>
                <h4 className="text-base font-bold text-[#18232E] mb-1">The Hermitage School</h4>
                <p className="text-xs text-[#647180] mb-3">Hospital Road (Near Sarkari Hospital)</p>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  Quality foundational school focusing on language fluency, cognitive development, and creative extracurriculars.
                </p>
              </div>
              <div className="pt-4 border-t border-[#E1E6EA] mt-4 flex items-center justify-between text-xs">
                <a href="tel:09919523411" className="font-bold text-[#18232E] hover:text-[#B8323C]">
                  📞 099195 23411
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "The Hermitage School", lat: 26.6821, lng: 84.0526, landmark: "Hospital Road, Fazilnagar" })}
                  className="font-bold text-[#168568] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 8: LOCAL NEWS & EVENTS (Dated & Credible)
          ======================================================== */}
      <section id="local-updates-section" className="bg-[#18232E] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
                <Bell className="w-3.5 h-3.5" />
                <span>Dated Community Bulletins</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">
                Local News & Events
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Official notices and community happenings verified from local organizers.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/news"
                className="text-red-400 hover:text-white text-xs font-bold inline-flex items-center gap-1 transition"
              >
                <span>View All Updates ({liveNews.length > 0 ? liveNews.length : 3}) →</span>
              </Link>
              <Link
                to="/create-news"
                className="inline-flex items-center gap-1.5 bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Post News</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {liveNews.length > 0 ? (
              liveNews.slice(0, 3).map((item) => (
                <div
                  key={item._id || item.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all group"
                >
                  {item.image && (
                    <div className="h-40 w-full overflow-hidden bg-slate-950">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider bg-red-950/60 px-2 py-0.5 rounded border border-red-800/40">
                          {item.category || "General"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })
                            : "Recent"}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-red-300 transition-colors line-clamp-2">
                        {item.title}
                      </h3>
                      {item.titleHi && (
                        <p className="text-xs text-slate-400 font-serif line-clamp-1 mb-1">
                          {item.titleHi}
                        </p>
                      )}
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    </div>
                    <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-slate-400 flex items-center justify-between">
                      <span className="truncate">By {item.author?.name || "Local Reporter"}</span>
                      <Link to="/news" className="text-red-400 hover:text-red-300 font-semibold shrink-0 ml-2">
                        Read Bulletin →
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <>
                {/* Event 1 */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-[10px] font-bold text-amber-400 uppercase">Cultural Heritage</span>
                      <span className="text-[11px] text-slate-400">Annual Festival</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5">
                      Kartik Poornima & Nirvana Mahotsav at Pawanagar
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Traditional annual pilgrimage gathering following Diwali celebrating the nirvana legacy of Lord Mahavira at the historic shrine.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800 mt-4 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Source: Pawanagar Trust</span>
                    <span className="text-emerald-400 font-semibold">Post-Diwali</span>
                  </div>
                </div>

                {/* Event 2 */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-[10px] font-bold text-[#168568] uppercase">Healthcare Routine</span>
                      <span className="text-[11px] text-slate-400">Every Wednesday</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5">
                      Weekly Immunization & Maternal Day at CHC Fazilnagar
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Public health team conducts designated infant immunizations, maternal nutrition checkups, and child wellness counseling.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800 mt-4 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Source: CHC Health Desk</span>
                    <span className="text-emerald-400 font-semibold">Weekly</span>
                  </div>
                </div>

                {/* Event 3 */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-[10px] font-bold text-blue-400 uppercase">Civic Works</span>
                      <span className="text-[11px] text-slate-400">Highway Corridor</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5">
                      NH-27 Highway Service Road Beautification & Lighting
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Town civic maintenance program underway for solar streetlight installation and pedestrian pathway clearing at Main Chowk.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800 mt-4 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Source: Town Civic Circle</span>
                    <span className="text-emerald-400 font-semibold">In Progress</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 9: ABOUT FAZILNAGAR & KUSHINAGAR (History & Culture)
          ======================================================== */}
      <section id="about-fazilnagar-section" className="py-16 bg-white border-t border-[#E1E6EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8323C] uppercase tracking-wider mb-2 bg-red-50 px-3 py-1 rounded-full border border-red-100">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Town Profile, Antiquity & Sacred Heritage</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#18232E] tracking-tight mb-3 font-heading">
              Fazilnagar & Kushinagar: The Sacred Twin Heritage
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Explore the deep 2,600-year-old antiquity, sacred spiritual milestones of Bhagwan Mahavira and Lord Buddha,
              and modern civic significance of the two historic capitals of the ancient Malla Republic.
            </p>

            {/* Interactive Tab Switcher */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6 p-1.5 bg-[#F5F7F8] rounded-2xl border border-[#E1E6EA] max-w-xl mx-auto">
              <button
                type="button"
                onClick={() => setAboutTab("fazilnagar")}
                className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  aboutTab === "fazilnagar"
                    ? "bg-[#18232E] text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <span>🏛️ Fazilnagar (Pawanagar)</span>
              </button>
              <button
                type="button"
                onClick={() => setAboutTab("kushinagar")}
                className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  aboutTab === "kushinagar"
                    ? "bg-[#18232E] text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <span>☸️ Kushinagar (Mahaparinirvana)</span>
              </button>
              <button
                type="button"
                onClick={() => setAboutTab("connection")}
                className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  aboutTab === "connection"
                    ? "bg-[#18232E] text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <span>✨ The Twin Sacred Bond</span>
              </button>
            </div>
          </div>

          {/* TAB 1: FAZILNAGAR (PAWANAGAR) */}
          {aboutTab === "fazilnagar" && (
            <div className="space-y-8 animate-fadeIn">
              {/* Image Gallery Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group relative rounded-2xl overflow-hidden shadow-lg border border-[#E1E6EA] bg-slate-900 aspect-16/10">
                  <img
                    src="/images/fazilnagar_pawanagar.jpg"
                    alt="Pawanagar Jain Mandir, Fazilnagar"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-600/50 px-2 py-0.5 rounded-full w-fit mb-1.5">
                      Jain Tirth & Nirvana Sthal
                    </span>
                    <h3 className="text-white font-bold text-base sm:text-lg">
                      Pawa Nagar Jain Temple & Shwetambar / Digambar Tirth
                    </h3>
                    <p className="text-slate-300 text-xs mt-1 line-clamp-2">
                      Sacred site where the 24th Tirthankara, Lord Mahavira, delivered his concluding sermons and attained Nirvana in 527 BCE.
                    </p>
                  </div>
                </div>

                <div className="group relative rounded-2xl overflow-hidden shadow-lg border border-[#E1E6EA] bg-slate-900 aspect-16/10">
                  <img
                    src="/images/fazilnagar_kakodha.jpg"
                    alt="Kakodha Ghat and Kukuttha River, Fazilnagar"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-600/50 px-2 py-0.5 rounded-full w-fit mb-1.5">
                      Ancient Kukuttha River
                    </span>
                    <h3 className="text-white font-bold text-base sm:text-lg">
                      Historic Kakodha Ghat & Brick Archaeological Remains
                    </h3>
                    <p className="text-slate-300 text-xs mt-1 line-clamp-2">
                      The revered river where Lord Buddha bathed and drank water on his holy journey from Pawa towards Kushinagar.
                    </p>
                  </div>
                </div>
              </div>

              {/* History & Importance Deep Dive */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#F5F7F8] p-6 sm:p-8 rounded-2xl border border-[#E1E6EA] space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#B8323C] uppercase tracking-wide">
                    <Landmark className="w-4 h-4" />
                    <span>Historical Significance of Fazilnagar (Pawanagar)</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#18232E] font-heading">
                    Ancient Capital of the Malla Republic & Lord Mahavira's Nirvana
                  </h3>
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
                    <p>
                      <strong>Fazilnagar</strong> is historically identified with ancient <strong>Pawa (Pawanagar)</strong>,
                      one of the two sovereign capitals of the ancient democratic <strong>Malla Mahajanapada</strong> (6th century BCE).
                      According to canonical Jain literature (Kalpa Sutra and Uttaradhyayana Sutra), the 24th Jain Tirthankara,{" "}
                      <strong>Lord Mahavira</strong>, spent his last monsoon retreat here, delivered his final immortal sermons at
                      King Hastipala's council, and attained ultimate <em>Nirvana</em> on the new moon night of Kartik (Kartik Amavasya) in 527 BCE.
                    </p>
                    <p>
                      To mark the departure of the supreme light of truth, the confederate kings of Kasi, Kosala, and the nine Malla chieftains
                      illuminated their homes and streets with rows of clay lamps—establishing the sacred origin of the festival of{" "}
                      <strong>Deepavali (Diwali)</strong>.
                    </p>
                    <p>
                      In Buddhist chronicles (Maha-parinibbana Sutta), Pawa holds equal reverence. Before his Parinirvana,{" "}
                      <strong>Gautam Buddha</strong> visited Pawa, stayed in the mango grove of Cunda the metalsmith, accepted his final meal,
                      and then walked past the tranquil <strong>Kakuttha (Kakodha) River</strong>, resting beneath trees on his path to Kushinagar.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#E1E6EA] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">Antiquity</span>
                      <span className="text-xs font-extrabold text-[#18232E]">2,600+ Years</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">Ancient Dynasty</span>
                      <span className="text-xs font-extrabold text-[#18232E]">Malla Republic</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">PIN Code</span>
                      <span className="text-xs font-extrabold text-[#18232E]">274401</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">Highway</span>
                      <span className="text-xs font-extrabold text-[#18232E]">NH-27 4-Lane</span>
                    </div>
                  </div>
                </div>

                {/* Modern Importance Column */}
                <div className="bg-white p-6 rounded-2xl border border-[#E1E6EA] space-y-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#168568] tracking-wider block mb-1">
                      Present-Day Importance
                    </span>
                    <h4 className="text-base font-bold text-[#18232E] font-heading mb-3">
                      Modern Civic, Educational & Commercial Hub
                    </h4>
                    <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="text-[#168568] font-bold text-sm">✓</span>
                        <span><strong>Education Center:</strong> Houses prominent institutions including Pawanagar Mahavir Inter College, Degree Colleges, and private academies serving 15+ surrounding gram panchayats.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#168568] font-bold text-sm">✓</span>
                        <span><strong>Strategic Highway Corridor:</strong> Directly situated on the Golden East-West corridor NH-27 (Old NH-28), connecting Gorakhpur with Bihar and Assam.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#168568] font-bold text-sm">✓</span>
                        <span><strong>Public Health Care:</strong> Community Health Centre (CHC) Fazilnagar provides 24/7 maternal, emergency ambulance, and immunization care.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#168568] font-bold text-sm">✓</span>
                        <span><strong>Grain & Trade Mandi:</strong> A prime marketplace for sugarcane, grains, electronics, fertilizers, and building materials.</span>
                      </li>
                    </ul>
                  </div>

                  <a
                    href="#town-map-section"
                    className="w-full bg-[#18232E] hover:bg-[#B8323C] text-white text-xs font-bold py-2.5 rounded-xl transition text-center block shadow-xs"
                  >
                    View Fazilnagar Landmarks on Map
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KUSHINAGAR (MAHAPARINIRVANA) */}
          {aboutTab === "kushinagar" && (
            <div className="space-y-8 animate-fadeIn">
              {/* Image Gallery Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group relative rounded-2xl overflow-hidden shadow-lg border border-[#E1E6EA] bg-slate-900 aspect-16/10">
                  <img
                    src="/images/kushinagar_mahaparinirvana.jpg"
                    alt="Mahaparinirvana Stupa and Temple, Kushinagar"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 bg-rose-950/80 border border-rose-600/50 px-2 py-0.5 rounded-full w-fit mb-1.5">
                      World Buddhist Pilgrimage
                    </span>
                    <h3 className="text-white font-bold text-base sm:text-lg">
                      Mahaparinirvana Stupa & Temple with 6.1m Reclining Buddha
                    </h3>
                    <p className="text-slate-300 text-xs mt-1 line-clamp-2">
                      The sacred sanctuary commemorating where Lord Gautam Buddha attained Mahaparinirvana in 483 BCE under the twin Sal trees.
                    </p>
                  </div>
                </div>

                <div className="group relative rounded-2xl overflow-hidden shadow-lg border border-[#E1E6EA] bg-slate-900 aspect-16/10">
                  <img
                    src="/images/kushinagar_ramabhar.jpg"
                    alt="Ramabhar Stupa, Kushinagar"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-600/50 px-2 py-0.5 rounded-full w-fit mb-1.5">
                      Mukutbandhana Chaitya
                    </span>
                    <h3 className="text-white font-bold text-base sm:text-lg">
                      Ancient Ramabhar Stupa — Holy Cremation Mound
                    </h3>
                    <p className="text-slate-300 text-xs mt-1 line-clamp-2">
                      A majestic 49-foot brick dome marking the exact site where the mortal remains of Buddha were cremated with supreme reverence by the Mallas.
                    </p>
                  </div>
                </div>
              </div>

              {/* History & Importance Deep Dive */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#F5F7F8] p-6 sm:p-8 rounded-2xl border border-[#E1E6EA] space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#B8323C] uppercase tracking-wide">
                    <Landmark className="w-4 h-4" />
                    <span>Sacred Antiquity of Kushinagar (Kusinara)</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#18232E] font-heading">
                    The Supreme Mahaparinirvana Sthal of Lord Gautam Buddha
                  </h3>
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
                    <p>
                      <strong>Kushinagar</strong> (anciently known as <em>Kushavati</em> and <em>Kusinara</em>) was the sister sovereign
                      seat of the Malla Republic, situated approximately <strong>18 km northwest of Fazilnagar</strong>.
                      It is revered worldwide by hundreds of millions of Buddhists as one of the four principal holy sites of Buddhism
                      (alongside Lumbini, Bodh Gaya, and Sarnath).
                    </p>
                    <p>
                      In 483 BCE, at the age of 80, <strong>Gautama Buddha</strong> reached the Upavattana grove of Sal trees along the
                      Hiranyavati River in Kusinara. Here, lying between two blossoming Sal trees with his head to the north, he delivered
                      his last discourse to his disciples, gave his final admonition:{" "}
                      <em>"Appamadena sampadetha" (Strive diligently for your liberation)</em>, and attained ultimate Parinirvana.
                    </p>
                    <p>
                      In 1876, British archaeologist <strong>A.C.L. Carlleyle</strong> and Sir Alexander Cunningham excavated the site,
                      unearthing the celebrated <strong>6.1-meter-long monolith red sandstone reclining Buddha statue</strong>,
                      sculpted during the 5th-century Gupta era with the inscription of craftsman Dinna of Mathura.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#E1E6EA] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">Distance from Town</span>
                      <span className="text-xs font-extrabold text-[#18232E]">18 km (~20 min)</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">International Airport</span>
                      <span className="text-xs font-extrabold text-[#18232E]">Operational</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">Buddhist Circuit</span>
                      <span className="text-xs font-extrabold text-[#18232E]">Global Hub</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">District HQ</span>
                      <span className="text-xs font-extrabold text-[#18232E]">Kushinagar</span>
                    </div>
                  </div>
                </div>

                {/* Key Monuments Column */}
                <div className="bg-white p-6 rounded-2xl border border-[#E1E6EA] space-y-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#B8323C] tracking-wider block mb-1">
                      Key Pilgrimage Monuments
                    </span>
                    <h4 className="text-base font-bold text-[#18232E] font-heading mb-3">
                      World Heritage Archaeological Wonders
                    </h4>
                    <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="text-[#B8323C] font-bold text-sm">☸</span>
                        <span><strong>Mahaparinirvana Temple:</strong> Rebuilt in 1956 for the 2500th Buddha Jayanti, housing the world-famous reclining Buddha.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#B8323C] font-bold text-sm">☸</span>
                        <span><strong>Ramabhar Stupa:</strong> Monumental brick chaitya standing 49 feet tall at the Buddha's holy cremation site.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#B8323C] font-bold text-sm">☸</span>
                        <span><strong>Matha Kuar Shrine:</strong> Features a colossal 10th-century blue-black stone Buddha in Bhumisparsha mudra.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#B8323C] font-bold text-sm">☸</span>
                        <span><strong>International Monasteries:</strong> Cultural monasteries built by Thailand, Myanmar, Japan, Sri Lanka, Tibet, China, Vietnam, and Cambodia.</span>
                      </li>
                    </ul>
                  </div>

                  <Link
                    to="/tourism"
                    className="w-full bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs font-bold py-2.5 rounded-xl transition text-center block shadow-xs"
                  >
                    Explore Tourism Guide & Itineraries
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TWIN SACRED BOND */}
          {aboutTab === "connection" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-gradient-to-br from-slate-900 to-[#18232E] text-white p-8 sm:p-10 rounded-3xl shadow-xl space-y-6">
                <div className="max-w-3xl">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-600/50 px-3 py-1 rounded-full">
                    A Confluence of Two World Religions
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold mt-3 font-heading text-white">
                    Pawa (Fazilnagar) & Kusinara (Kushinagar): The Twin Capitals of the Malla Republic
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm mt-3 leading-relaxed">
                    Nowhere else on Earth are the ultimate mortal milestones of two supreme world spiritual luminaries—Lord Mahavira
                    (Jainism) and Lord Gautam Buddha (Buddhism)—located in such intimate geographic and historic proximity.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-800 text-xs">
                  <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 space-y-2">
                    <span className="text-lg">🏛️</span>
                    <h4 className="font-bold text-amber-300 text-sm">The Malla Mahajanapada</h4>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Over 2,600 years ago, the Mallas established one of ancient India's earliest democratic oligarchic republics,
                      divided into two confederate capital regions: Pawa (modern Fazilnagar) and Kusinara (modern Kushinagar).
                    </p>
                  </div>

                  <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 space-y-2">
                    <span className="text-lg">🕯️</span>
                    <h4 className="font-bold text-amber-300 text-sm">Mahavira's Nirvana in Pawa</h4>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      In 527 BCE, the 24th Tirthankara Bhagwan Mahavira attained Nirvana at Pawa. The Malla chieftains lit deepams
                      to dispel the spiritual darkness, originating the eternal Diwali celebration observed to this day.
                    </p>
                  </div>

                  <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 space-y-2">
                    <span className="text-lg">☸️</span>
                    <h4 className="font-bold text-amber-300 text-sm">Buddha's Parinirvana in Kusinara</h4>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      In 483 BCE, Gautam Buddha accepted his final meal in Pawa's mango grove, rested by the Kakodha/Kukuttha river,
                      and walked the short 18 km route to Kushinagar to attain Mahaparinirvana under the twin Sal trees.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Connected seamlessly by 4-lane NH-27 (Distance: 18 km / Travel Time: 20 minutes)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to="/directory"
                      className="bg-[#B8323C] hover:bg-[#991B1B] text-white font-bold px-4 py-2 rounded-xl transition"
                    >
                      Browse Town Directory
                    </Link>
                    <Link
                      to="/tourism"
                      className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2 rounded-xl transition"
                    >
                      View Tourism Route
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================
          SECTION 10: CITIZEN CORNER (Actionable Forms)
          ======================================================== */}
      <section id="citizen-corner-section" className="bg-white py-16 border-t border-[#E1E6EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#168568] uppercase tracking-wider mb-1">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Community Participation</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18232E] tracking-tight font-heading">
              Citizen Corner
            </h2>
            <p className="text-xs sm:text-sm text-[#647180] mt-1">
              Help maintain accuracy by suggesting a local place, reporting an error, or broadcasting a town event.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Action 1 */}
            <div className="bg-[#F5F7F8] rounded-2xl p-6 border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-white text-[#18232E] flex items-center justify-center mb-3.5 border border-[#E1E6EA]">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#18232E] mb-1">Suggest a Business</h3>
                <p className="text-xs text-[#647180] leading-relaxed mb-5">
                  Are you a shopkeeper, doctor, or trade operator inside Fazilnagar town limits? Submit your details for verification.
                </p>
              </div>
              <button
                onClick={() => setModalType("business")}
                className="w-full bg-[#18232E] hover:bg-[#B8323C] text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Suggest Place</span>
              </button>
            </div>

            {/* Action 2 */}
            <div className="bg-[#F5F7F8] rounded-2xl p-6 border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-white text-amber-600 flex items-center justify-center mb-3.5 border border-[#E1E6EA]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#18232E] mb-1">Report Incorrect Info</h3>
                <p className="text-xs text-[#647180] leading-relaxed mb-5">
                  Noticed a wrong phone number, closed establishment, or village listing inside town directory? Report it to moderators.
                </p>
              </div>
              <button
                onClick={() => setModalType("correction")}
                className="w-full bg-white hover:bg-slate-50 text-[#18232E] border border-[#E1E6EA] font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Report Error</span>
              </button>
            </div>

            {/* Action 3 */}
            <div className="bg-[#F5F7F8] rounded-2xl p-6 border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-white text-[#168568] flex items-center justify-center mb-3.5 border border-[#E1E6EA]">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#18232E] mb-1">Submit a Local Event</h3>
                <p className="text-xs text-[#647180] leading-relaxed mb-5">
                  Organizing a public camp, inter-college competition, or cultural katha inside town? Submit the date and organizer.
                </p>
              </div>
              <button
                onClick={() => setModalType("event")}
                className="w-full bg-[#168568] hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Submit Event</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 11: FOOTER (Editorial Civic Footer)
          ======================================================== */}
      <footer className="bg-[#18232E] text-slate-400 text-xs border-t border-slate-800 pb-16 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Wordmark & Tagline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white text-[#18232E] flex items-center justify-center font-extrabold text-sm">
                F
              </div>
              <div>
                <span className="text-white font-extrabold text-sm tracking-tight font-heading block">
                  FAZIL<span className="text-[#B8323C]">NAGAR</span>
                </span>
                <span className="text-[10px] text-slate-400">Your Town. Your Community.</span>
              </div>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Fazilnagar Town Local Directory & Civic Information Platform. Ground-verified coordinates and transparent public data for residents and visitors.
            </p>
            <p className="text-[10px] text-slate-500 italic">
              Notice: An independent community directory for Fazilnagar town. Not affiliated with any official government ministry without explicit authorization.
            </p>
          </div>

          {/* Col 2: Quick Navigation */}
          <div className="space-y-2">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px] font-heading">
              Quick Navigation
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li><button onClick={(e) => handleSmoothScroll(e, "hero-section")} className="hover:text-white cursor-pointer transition">Home</button></li>
              <li><Link to="/directory" className="hover:text-white font-bold text-red-400">Town Directory (Map & List)</Link></li>
              <li><button onClick={(e) => handleSmoothScroll(e, "town-map-section")} className="hover:text-white cursor-pointer transition">Interactive OpenStreetMap</button></li>
              <li><button onClick={(e) => handleSmoothScroll(e, "local-updates-section")} className="hover:text-white cursor-pointer transition">Local Updates & Notices</button></li>
              <li><button onClick={(e) => handleSmoothScroll(e, "about-fazilnagar-section")} className="hover:text-white cursor-pointer transition">About Fazilnagar</button></li>
              <li><button onClick={(e) => handleSmoothScroll(e, "citizen-corner-section")} className="hover:text-white cursor-pointer transition">Citizen Corner</button></li>
            </ul>
          </div>

          {/* Col 3: Directory Categories */}
          <div className="space-y-2">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px] font-heading">
              Popular Categories
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li><Link to="/directory?category=Schools%20%26%20Colleges" className="hover:text-white">Schools & Colleges</Link></li>
              <li><Link to="/directory?category=Hospitals%20%26%20Clinics" className="hover:text-white">Hospitals & Clinics</Link></li>
              <li><Link to="/directory?category=Medical%20Stores%20%26%20Pharmacies" className="hover:text-white">Medical Stores</Link></li>
              <li><Link to="/directory?category=Sweet%20Shops%20%26%20Bakeries" className="hover:text-white">Sweet Shops & Bakeries</Link></li>
              <li><Link to="/directory?category=Religious%20Places" className="hover:text-white">Temples & Mosques</Link></li>
              <li><Link to="/directory?category=Public%20Facilities" className="hover:text-white">Banks & Post Office</Link></li>
            </ul>
          </div>

          {/* Col 4: Contact & Legal */}
          <div className="space-y-2">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px] font-heading">
              Support & Legal
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li><button onClick={() => setModalType("correction")} className="hover:text-white text-left cursor-pointer">Report Inaccurate Data</button></li>
              <li><button onClick={() => setModalType("business")} className="hover:text-white text-left cursor-pointer">Suggest New Place</button></li>
              <li><span className="text-slate-400">Postal Area: PIN 274401</span></li>
              <li><span className="text-slate-400">District: Kushinagar, UP</span></li>
              <li className="pt-2 text-[10px] text-slate-500">
                <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span> • <span className="hover:text-slate-400 cursor-pointer">Terms of Use</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 py-4 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} Fazilnagar Town Portal • Modern Civic & Editorial System. All rights reserved.
        </div>
      </footer>

      {/* ========================================================
          INTERACTIVE MODALS: SUGGESTION, CORRECTION & EVENT
          ======================================================== */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-[#E1E6EA] animate-modal-pop">
            <button
              onClick={() => setModalType(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            {modalType === "business" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-[#B8323C] flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#18232E] font-heading">Suggest a Place in Town</h3>
                    <p className="text-[11px] text-[#647180]">Listing must be located inside Fazilnagar town limits.</p>
                  </div>
                </div>

                <form onSubmit={(e) => handleFormSubmit(e, "business")} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#18232E] mb-1">Establishment Name *</label>
                    <input
                      type="text"
                      name="title"
                      required
                      placeholder="e.g. Mahavir Peda Bhandar, Sharma Optical"
                      className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-[#B8323C]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-[#18232E] mb-1">Category *</label>
                      <select name="category" required className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none bg-white">
                        <option value="">Select Category</option>
                        {EXPLORE_21_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-[#18232E] mb-1">Public Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Verified 10 digits"
                        className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-[#B8323C]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#18232E] mb-1">Town Landmark / Road *</label>
                    <input
                      type="text"
                      name="landmark"
                      required
                      placeholder="e.g. Near Kasya Highway Crossing, Babu Bazar"
                      className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-[#B8323C]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#18232E] hover:bg-[#B8323C] text-white font-bold py-2.5 rounded-xl transition mt-2 shadow-xs cursor-pointer"
                  >
                    Submit Place for Moderation
                  </button>
                </form>
              </>
            )}

            {modalType === "correction" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#18232E] font-heading">Report Incorrect Information</h3>
                    <p className="text-[11px] text-[#647180]">Help keep phone numbers and coordinates accurate.</p>
                  </div>
                </div>

                <form onSubmit={(e) => handleFormSubmit(e, "correction")} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#18232E] mb-1">Listing Name *</label>
                    <input
                      type="text"
                      name="title"
                      required
                      placeholder="Name of school, clinic, or shop"
                      className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-amber-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#18232E] mb-1">Correction Details *</label>
                    <textarea
                      rows={3}
                      name="details"
                      required
                      placeholder="Describe what is wrong (e.g. wrong phone number, closed, or located outside town boundary)..."
                      className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-amber-600"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#18232E] hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Send Correction Report
                  </button>
                </form>
              </>
            )}

            {modalType === "event" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#168568] flex items-center justify-center">
                    <CalendarPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#18232E] font-heading">Submit Local Event Announcement</h3>
                    <p className="text-[11px] text-[#647180]">Community, educational, or religious event in town.</p>
                  </div>
                </div>

                <form onSubmit={(e) => handleFormSubmit(e, "event")} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#18232E] mb-1">Event Title *</label>
                    <input
                      type="text"
                      name="title"
                      required
                      placeholder="e.g. Free Blood Donation Camp, Sports Meet"
                      className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-[#168568]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-[#18232E] mb-1">Date *</label>
                      <input
                        type="date"
                        name="eventDate"
                        required
                        className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-[#168568]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#18232E] mb-1">Venue in Town *</label>
                      <input
                        type="text"
                        name="venue"
                        required
                        placeholder="e.g. College Ground, CHC"
                        className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-[#168568]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#18232E] mb-1">Organizer / Source *</label>
                    <input
                      type="text"
                      name="organizer"
                      required
                      placeholder="Name of school, hospital, or trust"
                      className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-[#168568]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#168568] hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Broadcast Event
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Global Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18232E] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs border border-slate-700 animate-slide-down">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
