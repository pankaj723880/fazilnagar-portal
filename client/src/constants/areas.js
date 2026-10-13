// Shared Fazilnagar Town Areas & Localities Specification (27 exact options)
export const ALL_WARDS_FILTER = "All Wards / Areas";

export const FAZILNAGAR_AREAS = [
  "College Road",
  "Highway Corridor",
  "Main Market",
  "Kasya Road",
  "Purani Basti",
  "Bus Stand Area",
  "Main Chowk",
  "NH-27 Highway",
  "Hospital Road",
  "Main Chowk Link",
  "Block Campus",
  "NH-27 Junction",
  "Highway Chowk",
  "Block Road",
  "Pawanagar",
  "Babu Bazar",
  "Central Ward",
  "Block Outskirts",
  "Garahiya More",
  "Town Center",
  "Pawanagar Tirth Marg",
  "Pawanagar Marg",
  "Cinema Hall Road",
  "Unconfirmed",
  "NH-28 Service Road",
  "Outer Border Sector",
];

// Complete 27-option list for UI filtering
export const ALL_AREA_OPTIONS = [
  ALL_WARDS_FILTER,
  ...FAZILNAGAR_AREAS,
];

// Areas that require manual admin review verification
export const REVIEW_FLAG_AREAS = [
  "Unconfirmed",
  "Block Outskirts",
  "Outer Border Sector",
];

// Allowed categories for community submissions (excluding protected official institutions)
export const COMMUNITY_ALLOWED_CATEGORIES = [
  { id: "Shops", name: "Shops & Stores", hint: "Retail, General store, Grocery, Clothing, Stationery" },
  { id: "Restaurants", name: "Restaurants & Dhabas", hint: "Food stalls, Family restaurants, Sweet cafes" },
  { id: "Hotels", name: "Hotels & Lodges", hint: "Guest houses, Lodging, Tourist accommodation" },
  { id: "Offices", name: "Offices & Agencies", hint: "Corporate offices, Property dealer, Distributors" },
  { id: "Banks", name: "Banks & Financial", hint: "Commercial banks, Co-operative societies" },
  { id: "ATMs", name: "ATMs & Cash Points", hint: "24/7 Cash withdrawal points" },
  { id: "Temples", name: "Temples & Places of Worship", hint: "Mandir, Ashram, Religious shrines" },
  { id: "Salons", name: "Salons & Parlours", hint: "Hair styling, Beauty parlours, Grooming centers" },
  { id: "Repair Services", name: "Repair Services & Workshops", hint: "Automobile garage, Mobile/TV repair, Electrician" },
  { id: "Coaching Centres", name: "Coaching Centres & Tuition", hint: "Competitive prep, Skill training, Academic tuition" },
  { id: "Community Facilities", name: "Community Facilities", hint: "Community hall, Public recreation, Dharamshala" },
  { id: "Other Businesses", name: "Other Businesses", hint: "Manufacturing, Fabrication, Services" },
  { id: "General Public Places", name: "General Public Places", hint: "Parks, Ground, Landmarks" },
];

// Fazilnagar Town GPS Bounding Box
export const FAZILNAGAR_BOUNDS = {
  minLat: 26.6500,
  maxLat: 26.7200,
  minLng: 84.0200,
  maxLng: 84.0900,
};

export function isWithinTownBoundary(lat, lng) {
  const nLat = parseFloat(lat);
  const nLng = parseFloat(lng);
  if (isNaN(nLat) || isNaN(nLng)) return false;
  return (
    nLat >= FAZILNAGAR_BOUNDS.minLat &&
    nLat <= FAZILNAGAR_BOUNDS.maxLat &&
    nLng >= FAZILNAGAR_BOUNDS.minLng &&
    nLng <= FAZILNAGAR_BOUNDS.maxLng
  );
}
