import fs from "fs";
import path from "path";

// Fazilnagar Centre Hub reference
export const FAZILNAGAR_CENTRE = {
  id: "fazilnagar-hub",
  name: "Fazilnagar Centre",
  hindiName: "फाजिलनगर (केंद्र)",
  sno: 1,
  type: "hub",
  category: "कस्बा / ब्लॉक मुख्यालय",
  lat: 26.6827,
  lng: 84.0498,
  sourceLatStr: "26.6827° N",
  sourceLngStr: "84.0498° E",
  block: "Fazilnagar",
  district: "Kushinagar",
  state: "Uttar Pradesh",
  distanceKm: 0,
  calculatedStraightLineKm: 0,
  sourceDistanceText: "0 km (केंद्र)",
  sourceDirection: "Center",
  distanceBand: "0-5 km",
  pinCode: "274401",
  description: "Official town hub & Block headquarters on NH-27 (formerly NH-28), Kushinagar district.",
  source: "Supplied Dataset (Item 1) & Census 2011",
  verificationStatus: "verified",
};

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function getCompassDirection(lat1, lon1, lat2, lon2) {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const angle = (Math.atan2(dLon, dLat) * 180) / Math.PI;
  const normalized = (angle + 360) % 360;

  if (normalized >= 337.5 || normalized < 22.5) return "N";
  if (normalized >= 22.5 && normalized < 67.5) return "NE";
  if (normalized >= 67.5 && normalized < 112.5) return "E";
  if (normalized >= 112.5 && normalized < 157.5) return "SE";
  if (normalized >= 157.5 && normalized < 202.5) return "S";
  if (normalized >= 202.5 && normalized < 247.5) return "SW";
  if (normalized >= 247.5 && normalized < 292.5) return "W";
  return "NW";
}

// Map Haversine distance to distance bands
export function getDistanceBand(distanceKm) {
  if (distanceKm <= 5) return "0-5 km";
  if (distanceKm <= 12) return "5-12 km";
  if (distanceKm <= 20) return "12-20 km";
  if (distanceKm <= 35) return "15-35 km";
  if (distanceKm <= 60) return "35-60 km";
  if (distanceKm <= 100) return "60-100 km";
  return "100+ km";
}

// Raw dataset of all 117 records as supplied
export const RAW_SUPPLIED_RECORDS = [
  // भाग 1: फाजिलनगर एवं नजदीकी क्षेत्र (1 से 63)
  { sno: 1, name: "Fazilnagar Centre", hindiName: "फाजिलनगर (केंद्र)", category: "कस्बा / ब्लॉक मुख्यालय", latStr: "26.6827° N", lngStr: "84.0498° E", lat: 26.6827, lng: 84.0498, section: "Part 1 (0-20 km & Local)" },
  { sno: 2, name: "Pawanagar", hindiName: "पावा नगर (Pawanagar)", category: "ऐतिहासिक / धार्मिक क्षेत्र", latStr: "26.6852° N", lngStr: "84.0441° E", lat: 26.6852, lng: 84.0441, section: "Part 1 (0-20 km & Local)" },
  { sno: 3, name: "Garahia", hindiName: "गड़हिया (Garahia)", category: "गांव", latStr: "26.6830° N", lngStr: "84.0585° E", lat: 26.6830, lng: 84.0585, section: "Part 1 (0-20 km & Local)" },
  { sno: 4, name: "Sathiaon", hindiName: "साथियाओं (Sathiaon)", category: "गांव", latStr: "26.7015° N", lngStr: "84.0470° E", lat: 26.7015, lng: 84.0470, section: "Part 1 (0-20 km & Local)" },
  { sno: 5, name: "Bishunpura", hindiName: "बिशनपुरा (Bishunpura)", category: "गांव", latStr: "26.6620° N", lngStr: "84.0535° E", lat: 26.6620, lng: 84.0535, section: "Part 1 (0-20 km & Local)" },
  { sno: 6, name: "Piprahia", hindiName: "पिपरहिया (Piprahia)", category: "गांव", latStr: "26.6915° N", lngStr: "84.0620° E", lat: 26.6915, lng: 84.0620, section: "Part 1 (0-20 km & Local)" },
  { sno: 7, name: "Mahuawa", hindiName: "महुआवा (Mahuawa)", category: "गांव", latStr: "26.6690° N", lngStr: "84.0320° E", lat: 26.6690, lng: 84.0320, section: "Part 1 (0-20 km & Local)" },
  { sno: 8, name: "Pipra Kanak", hindiName: "पिपरा कनक (Pipra Kanak)", category: "गांव", latStr: "26.6510° N", lngStr: "84.0725° E", lat: 26.6510, lng: 84.0725, section: "Part 1 (0-20 km & Local)" },
  { sno: 9, name: "Patherwa", hindiName: "पटहेरवा (Patherwa)", category: "कस्बा / बाजार", latStr: "26.7115° N", lngStr: "84.1085° E", lat: 26.7115, lng: 84.1085, section: "Part 1 (0-20 km & Local)" },
  { sno: 10, name: "Haraiya", hindiName: "हरैया (Haraiya)", category: "गांव", latStr: "26.7080° N", lngStr: "84.0290° E", lat: 26.7080, lng: 84.0290, section: "Part 1 (0-20 km & Local)" },
  { sno: 11, name: "Dhanauji Kalan", hindiName: "धनौजी कलां (Dhanauji Kalan)", category: "गांव", latStr: "26.6450° N", lngStr: "84.0510° E", lat: 26.6450, lng: 84.0510, section: "Part 1 (0-20 km & Local)" },
  { sno: 12, name: "Jaura Bazar", hindiName: "जौहरा बाजार (Jaura Bazar)", category: "ग्रामीण कस्बा", latStr: "26.6540° N", lngStr: "84.0620° E", lat: 26.6540, lng: 84.0620, section: "Part 1 (0-20 km & Local)" },
  { sno: 13, name: "Amawa", hindiName: "अमवा (Amawa)", category: "गांव", latStr: "26.7320° N", lngStr: "84.0410° E", lat: 26.7320, lng: 84.0410, section: "Part 1 (0-20 km & Local)" },
  { sno: 14, name: "Asmanpur", hindiName: "आसमानपुर (Asmanpur)", category: "गांव", latStr: "26.7210° N", lngStr: "84.0850° E", lat: 26.7210, lng: 84.0850, section: "Part 1 (0-20 km & Local)" },
  { sno: 15, name: "Chandravta", hindiName: "चंद्रवता (Chandravta)", category: "गांव", latStr: "26.6910° N", lngStr: "83.9980° E", lat: 26.6910, lng: 83.9980, section: "Part 1 (0-20 km & Local)" },
  { sno: 16, name: "Badurawa", hindiName: "बदरहवा (Badurawa)", category: "गांव", latStr: "26.6230° N", lngStr: "84.0390° E", lat: 26.6230, lng: 84.0390, section: "Part 1 (0-20 km & Local)" },
  { sno: 17, name: "Samaur", hindiName: "समौर बाजार (Samaur)", category: "बाजार / कस्बा", latStr: "26.6210° N", lngStr: "84.1150° E", lat: 26.6210, lng: 84.1150, section: "Part 1 (0-20 km & Local)" },
  { sno: 18, name: "Parsauni", hindiName: "परसौनी (Parsauni)", category: "गांव", latStr: "26.7450° N", lngStr: "84.0610° E", lat: 26.7450, lng: 84.0610, section: "Part 1 (0-20 km & Local)" },
  { sno: 19, name: "Kathkuiyan", hindiName: "कठकुइयां रोड (Kathkuiyan)", category: "कस्बा / क्षेत्र", latStr: "26.7720° N", lngStr: "83.9950° E", lat: 26.7720, lng: 83.9950, section: "Part 1 (0-20 km & Local)" },
  { sno: 20, name: "Tamkuhi Raj", hindiName: "तमकुही राज (Tamkuhi Raj)", category: "कस्बा / तहसील", latStr: "26.6890° N", lngStr: "84.1840° E", lat: 26.6890, lng: 84.1840, section: "Part 1 (0-20 km & Local)" },
  { sno: 21, name: "Kasia", hindiName: "कसया बाजार (Kasia)", category: "नगर / कस्बा", latStr: "26.7450° N", lngStr: "83.8950° E", lat: 26.7450, lng: 83.8950, section: "Part 1 (0-20 km & Local)" },
  { sno: 22, name: "Kushinagar Stupa", hindiName: "कुशीनगर (स्तूप क्षेत्र)", category: "अंतरराष्ट्रीय तीर्थस्थल", latStr: "26.7399° N", lngStr: "83.8870° E", lat: 26.7399, lng: 83.8870, section: "Part 1 (0-20 km & Local)" },
  { sno: 23, name: "Pathardewa", hindiName: "पथरदेवा (Pathardewa)", category: "कस्बा (देवरिया)", latStr: "26.5890° N", lngStr: "83.9450° E", lat: 26.5890, lng: 83.9450, section: "Part 1 (0-20 km & Local)" },
  { sno: 24, name: "Tarya Sujan", hindiName: "तरया सुजान (Tarya Sujan)", category: "कस्बा / बाजार", latStr: "26.7120° N", lngStr: "84.2150° E", lat: 26.7120, lng: 84.2150, section: "Part 1 (0-20 km & Local)" },
  { sno: 25, name: "Hetimpur", hindiName: "हेतिमपुर (Hetimpur)", category: "गांव / बाजार", latStr: "26.7280° N", lngStr: "83.8420° E", lat: 26.7280, lng: 83.8420, section: "Part 1 (0-20 km & Local)" },
  { sno: 26, name: "Rampur Karkhana", hindiName: "रामपुर कारखाना (Rampur Karkhana)", category: "कस्बा (देवरिया)", latStr: "26.5780° N", lngStr: "83.8210° E", lat: 26.5780, lng: 83.8210, section: "Part 1 (0-20 km & Local)" },
  { sno: 27, name: "Narainpur", hindiName: "नरायनपुर (Narainpur)", category: "गांव", latStr: "26.6940° N", lngStr: "84.0580° E", lat: 26.6940, lng: 84.0580, section: "Part 1 (0-20 km & Local)" },
  { sno: 28, name: "Kasturba", hindiName: "कस्तूरबा (Kasturba)", category: "गांव", latStr: "26.6810° N", lngStr: "84.0310° E", lat: 26.6810, lng: 84.0310, section: "Part 1 (0-20 km & Local)" },
  { sno: 29, name: "Madhopur", hindiName: "माधोपुर (Madhopur)", category: "गांव", latStr: "26.6610° N", lngStr: "84.0490° E", lat: 26.6610, lng: 84.0490, section: "Part 1 (0-20 km & Local)" },
  { sno: 30, name: "Dhanauji Khurd", hindiName: "धनौजी खुर्द (Dhanauji Khurd)", category: "गांव", latStr: "26.6530° N", lngStr: "84.0530° E", lat: 26.6530, lng: 84.0530, section: "Part 1 (0-20 km & Local)" },
  { sno: 31, name: "Dehwa Patti", hindiName: "देहवा पट्टी (Dehwa Patti)", category: "गांव", latStr: "26.7120° N", lngStr: "84.0480° E", lat: 26.7120, lng: 84.0480, section: "Part 1 (0-20 km & Local)" },
  { sno: 32, name: "Dahari Patti", hindiName: "दहारी पट्टी (Dahari Patti)", category: "गांव", latStr: "26.7090° N", lngStr: "84.0240° E", lat: 26.7090, lng: 84.0240, section: "Part 1 (0-20 km & Local)" },
  { sno: 33, name: "Rudawalia", hindiName: "रुदावलिया (Rudawalia)", category: "गांव", latStr: "26.6850° N", lngStr: "84.0880° E", lat: 26.6850, lng: 84.0880, section: "Part 1 (0-20 km & Local)" },
  { sno: 34, name: "Lavkush Purab", hindiName: "लवकुश पूरब पट्टी (Lavkush Purab)", category: "गांव", latStr: "26.7110° N", lngStr: "84.0790° E", lat: 26.7110, lng: 84.0790, section: "Part 1 (0-20 km & Local)" },
  { sno: 35, name: "Lavkush Pashchim", hindiName: "लवकुश पश्चिम पट्टी (Lavkush Pashchim)", category: "गांव", latStr: "26.7130° N", lngStr: "84.0720° E", lat: 26.7130, lng: 84.0720, section: "Part 1 (0-20 km & Local)" },
  { sno: 36, name: "Jokwa Khurd", hindiName: "जोकवा खुर्द (Jokwa Khurd)", category: "गांव", latStr: "26.6790° N", lngStr: "84.0020° E", lat: 26.6790, lng: 84.0020, section: "Part 1 (0-20 km & Local)" },
  { sno: 37, name: "Jokwa Buzurg", hindiName: "जोकवा बुजुर्ग (Jokwa Buzurg)", category: "गांव", latStr: "26.6820° N", lngStr: "83.9960° E", lat: 26.6820, lng: 83.9960, section: "Part 1 (0-20 km & Local)" },
  { sno: 38, name: "Jaura Manrakhan", hindiName: "जौरा मनरखन (Jaura Manrakhan)", category: "गांव", latStr: "26.6490° N", lngStr: "84.0710° E", lat: 26.6490, lng: 84.0710, section: "Part 1 (0-20 km & Local)" },
  { sno: 39, name: "Rahasujanubi", hindiName: "रहसू जनूबी पट्टी (Rahasujanubi)", category: "गांव", latStr: "26.6410° N", lngStr: "84.0780° E", lat: 26.6410, lng: 84.0780, section: "Part 1 (0-20 km & Local)" },
  { sno: 40, name: "Dhundhwalia", hindiName: "धुंधवालिया (Dhundhwalia)", category: "गांव", latStr: "26.6290° N", lngStr: "84.0520° E", lat: 26.6290, lng: 84.0520, section: "Part 1 (0-20 km & Local)" },
  { sno: 41, name: "Bhathahi Buzurg", hindiName: "भठही बुजुर्ग (Bhathahi Buzurg)", category: "गांव", latStr: "26.7290° N", lngStr: "84.0890° E", lat: 26.7290, lng: 84.0890, section: "Part 1 (0-20 km & Local)" },
  { sno: 42, name: "Bhathahi Khurd", hindiName: "भठही खुर्द (Bhathahi Khurd)", category: "गांव", latStr: "26.7320° N", lngStr: "84.0950° E", lat: 26.7320, lng: 84.0950, section: "Part 1 (0-20 km & Local)" },
  { sno: 43, name: "Kanaura", hindiName: "कनौरा (Kanaura)", category: "गांव", latStr: "26.6410° N", lngStr: "84.0090° E", lat: 26.6410, lng: 84.0090, section: "Part 1 (0-20 km & Local)" },
  { sno: 44, name: "Baliawa", hindiName: "बलियावा (Baliawa)", category: "गांव", latStr: "26.7410° N", lngStr: "84.0390° E", lat: 26.7410, lng: 84.0390, section: "Part 1 (0-20 km & Local)" },
  { sno: 45, name: "Bhathawa", hindiName: "भठावा (Bhathawa)", category: "गांव", latStr: "26.7280° N", lngStr: "84.0040° E", lat: 26.7280, lng: 84.0040, section: "Part 1 (0-20 km & Local)" },
  { sno: 46, name: "Belwa Khurd", hindiName: "बेलवा खुर्द (Belwa Khurd)", category: "गांव", latStr: "26.6810° N", lngStr: "84.1190° E", lat: 26.6810, lng: 84.1190, section: "Part 1 (0-20 km & Local)" },
  { sno: 47, name: "Belwa Kalan", hindiName: "बेलवा कलां (Belwa Kalan)", category: "गांव", latStr: "26.6780° N", lngStr: "84.1250° E", lat: 26.6780, lng: 84.1250, section: "Part 1 (0-20 km & Local)" },
  { sno: 48, name: "Amwa Sri Dubey", hindiName: "अमवा श्री दुबे (Amwa Sri Dubey)", category: "गांव", latStr: "26.7480° N", lngStr: "84.0450° E", lat: 26.7480, lng: 84.0450, section: "Part 1 (0-20 km & Local)" },
  { sno: 49, name: "Avarwa Safiganja", hindiName: "अवरवा सफीगंजा (Avarwa Safiganja)", category: "गांव", latStr: "26.6120° N", lngStr: "84.0490° E", lat: 26.6120, lng: 84.0490, section: "Part 1 (0-20 km & Local)" },
  { sno: 50, name: "Koilaswa Buzurg", hindiName: "कोइलसवा बुजुर्ग (Koilaswa Buzurg)", category: "गांव", latStr: "26.7550° N", lngStr: "84.0520° E", lat: 26.7550, lng: 84.0520, section: "Part 1 (0-20 km & Local)" },
  { sno: 51, name: "Bankata Bazar", hindiName: "बनकटा बाजार (Bankata Bazar)", category: "गांव / बाजार", latStr: "26.6280° N", lngStr: "84.1180° E", lat: 26.6280, lng: 84.1180, section: "Part 1 (0-20 km & Local)" },
  { sno: 52, name: "Barahara", hindiName: "बरहरा (Barahara)", category: "गांव", latStr: "26.6050° N", lngStr: "84.0620° E", lat: 26.6050, lng: 84.0620, section: "Part 1 (0-20 km & Local)" },
  { sno: 53, name: "Loharwalia", hindiName: "लोहरवलिया (Loharwalia)", category: "गांव", latStr: "26.7390° N", lngStr: "83.9850° E", lat: 26.7390, lng: 83.9850, section: "Part 1 (0-20 km & Local)" },
  { sno: 54, name: "Gurwalia", hindiName: "गुरवलिया (Gurwalia)", category: "गांव", latStr: "26.7610° N", lngStr: "84.0410° E", lat: 26.7610, lng: 84.0410, section: "Part 1 (0-20 km & Local)" },
  { sno: 55, name: "Nakataha Mishra", hindiName: "नकटाहा मिश्र (Nakataha Mishra)", category: "गांव", latStr: "26.7490° N", lngStr: "84.1080° E", lat: 26.7490, lng: 84.1080, section: "Part 1 (0-20 km & Local)" },
  { sno: 56, name: "Chainpur", hindiName: "चैनपुर (Chainpur)", category: "गांव", latStr: "26.6210° N", lngStr: "83.9920° E", lat: 26.6210, lng: 83.9920, section: "Part 1 (0-20 km & Local)" },
  { sno: 57, name: "Laxmipur Misra", hindiName: "लक्ष्मीपुर मिश्रा (Laxmipur Misra)", category: "गांव", latStr: "26.7520° N", lngStr: "84.0950° E", lat: 26.7520, lng: 84.0950, section: "Part 1 (0-20 km & Local)" },
  { sno: 58, name: "Sumahi Buzurg", hindiName: "सुमाही बुजुर्ग (Sumahi Buzurg)", category: "गांव", latStr: "26.7480° N", lngStr: "83.9780° E", lat: 26.7480, lng: 83.9780, section: "Part 1 (0-20 km & Local)" },
  { sno: 59, name: "Chaura Ram", hindiName: "चौरा राम तवक्कलशाही (Chaura Ram)", category: "गांव", latStr: "26.6750° N", lngStr: "83.9520° E", lat: 26.6750, lng: 83.9520, section: "Part 1 (0-20 km & Local)" },
  { sno: 60, name: "Khairatia", hindiName: "खैरटिया (Khairatia)", category: "गांव", latStr: "26.5920° N", lngStr: "84.0480° E", lat: 26.5920, lng: 84.0480, section: "Part 1 (0-20 km & Local)" },
  { sno: 61, name: "Sohang", hindiName: "सोहंग (Sohang)", category: "गांव", latStr: "26.6080° N", lngStr: "83.9850° E", lat: 26.6080, lng: 83.9850, section: "Part 1 (0-20 km & Local)" },
  { sno: 62, name: "Hata", hindiName: "हाटा (Hata)", category: "कस्बा / तहसील", latStr: "26.7470° N", lngStr: "83.7430° E", lat: 26.7470, lng: 83.7430, section: "Part 1 (0-20 km & Local)" },
  { sno: 63, name: "Padrauna", hindiName: "पडरौना (Padrauna)", category: "जिला मुख्यालय (कुशीनगर)", latStr: "26.9025° N", lngStr: "83.9822° E", lat: 26.9025, lng: 83.9822, section: "Part 1 (0-20 km & Local)" },

  // भाग 2: 20 से 100 किमी के दायरे के प्रसिद्ध शहर व कस्बे (64 से 78)
  { sno: 64, name: "Deoria", hindiName: "देवरिया (Deoria)", category: "देवरिया, UP", latStr: "26.5020° N", lngStr: "83.7790° E", lat: 26.5020, lng: 83.7790, section: "Part 2 (20-100 km Radius)" },
  { sno: 65, name: "Kaptanganj / Ramkola", hindiName: "कप्तानगंज (Kaptanganj / Ramkola)", category: "कुशीनगर, UP", latStr: "26.9280° N", lngStr: "83.7180° E", lat: 26.9280, lng: 83.7180, section: "Part 2 (20-100 km Radius)" },
  { sno: 66, name: "Bhatni Bazar", hindiName: "भटनी (Bhatni Bazar)", category: "देवरिया, UP", latStr: "26.2570° N", lngStr: "83.9720° E", lat: 26.2570, lng: 83.9720, section: "Part 2 (20-100 km Radius)" },
  { sno: 67, name: "Salempur", hindiName: "सलेमपुर (Salempur)", category: "देवरिया, UP", latStr: "26.3020° N", lngStr: "83.9310° E", lat: 26.3020, lng: 83.9310, section: "Part 2 (20-100 km Radius)" },
  { sno: 68, name: "Barhaj", hindiName: "बरहज (Barhaj)", category: "देवरिया, UP", latStr: "26.2750° N", lngStr: "83.7530° E", lat: 26.2750, lng: 83.7530, section: "Part 2 (20-100 km Radius)" },
  { sno: 69, name: "Mirganj", hindiName: "मीरगंज (Mirganj)", category: "गोपालगंज, Bihar", latStr: "26.4350° N", lngStr: "84.3360° E", lat: 26.4350, lng: 84.3360, section: "Part 2 (20-100 km Radius)" },
  { sno: 70, name: "Gopalganj", hindiName: "गोपालगंज (Gopalganj)", category: "गोपालगंज, Bihar", latStr: "26.4687° N", lngStr: "84.4418° E", lat: 26.4687, lng: 84.4418, section: "Part 2 (20-100 km Radius)" },
  { sno: 71, name: "Bettiah", hindiName: "बेतिया (Bettiah)", category: "प. चंपारण, Bihar", latStr: "26.8020° N", lngStr: "84.5020° E", lat: 26.8020, lng: 84.5020, section: "Part 2 (20-100 km Radius)" },
  { sno: 72, name: "Bagaha", hindiName: "बगहा (Bagaha)", category: "प. चंपारण, Bihar", latStr: "27.0980° N", lngStr: "84.0900° E", lat: 27.0980, lng: 84.0900, section: "Part 2 (20-100 km Radius)" },
  { sno: 73, name: "Siwan", hindiName: "सिवान (Siwan)", category: "सिवान, Bihar", latStr: "26.2200° N", lngStr: "84.3600° E", lat: 26.2200, lng: 84.3600, section: "Part 2 (20-100 km Radius)" },
  { sno: 74, name: "Gorakhpur", hindiName: "गोरखपुर (Gorakhpur)", category: "गोरखपुर, UP", latStr: "26.7606° N", lngStr: "83.3732° E", lat: 26.7606, lng: 83.3732, section: "Part 2 (20-100 km Radius)" },
  { sno: 75, name: "Maharajganj", hindiName: "महराजगंज (Maharajganj)", category: "महराजगंज, UP", latStr: "27.1470° N", lngStr: "83.5610° E", lat: 27.1470, lng: 83.5610, section: "Part 2 (20-100 km Radius)" },
  { sno: 76, name: "Motihari", hindiName: "मोतीहारी (Motihari)", category: "पू. चंपारण, Bihar", latStr: "26.6470° N", lngStr: "84.9090° E", lat: 26.6470, lng: 84.9090, section: "Part 2 (20-100 km Radius)" },
  { sno: 77, name: "Khalilabad", hindiName: "खलीलाबाद (Khalilabad)", category: "संतकबीर नगर, UP", latStr: "26.7810° N", lngStr: "83.0710° E", lat: 26.7810, lng: 83.0710, section: "Part 2 (20-100 km Radius)" },
  { sno: 78, name: "Hathwa", hindiName: "हथुआ (Hathwa)", category: "गोपालगंज, Bihar", latStr: "26.3570° N", lngStr: "84.2980° E", lat: 26.3570, lng: 84.2980, section: "Part 2 (20-100 km Radius)" },

  // भाग 3: उत्तर प्रदेश के सीमावर्ती राज्यों के प्रमुख शहर (79 से 117)
  { sno: 79, name: "Patna", hindiName: "पटना (Patna)", category: "बिहार", latStr: "25.5941° N", lngStr: "85.1376° E", lat: 25.5941, lng: 85.1376, section: "Part 3 (Interstate Major Cities)" },
  { sno: 80, name: "Gaya", hindiName: "गया / बोधगया (Gaya)", category: "बिहार", latStr: "24.7914° N", lngStr: "85.0002° E", lat: 24.7914, lng: 85.0002, section: "Part 3 (Interstate Major Cities)" },
  { sno: 81, name: "Muzaffarpur", hindiName: "मुजफ्फरपुर (Muzaffarpur)", category: "बिहार", latStr: "26.1209° N", lngStr: "85.3647° E", lat: 26.1209, lng: 85.3647, section: "Part 3 (Interstate Major Cities)" },
  { sno: 82, name: "Bhagalpur", hindiName: "भागलपुर (Bhagalpur)", category: "बिहार", latStr: "25.2425° N", lngStr: "86.9842° E", lat: 25.2425, lng: 86.9842, section: "Part 3 (Interstate Major Cities)" },
  { sno: 83, name: "Buxar", hindiName: "बक्सर (Buxar)", category: "बिहार", latStr: "25.5647° N", lngStr: "83.9777° E", lat: 25.5647, lng: 83.9777, section: "Part 3 (Interstate Major Cities)" },
  { sno: 84, name: "Dehradun", hindiName: "देहरादून (Dehradun)", category: "उत्तराखंड", latStr: "30.3165° N", lngStr: "78.0322° E", lat: 30.3165, lng: 78.0322, section: "Part 3 (Interstate Major Cities)" },
  { sno: 85, name: "Haridwar", hindiName: "हरिद्वार (Haridwar)", category: "उत्तराखंड", latStr: "29.9457° N", lngStr: "78.1642° E", lat: 29.9457, lng: 78.1642, section: "Part 3 (Interstate Major Cities)" },
  { sno: 86, name: "Rishikesh", hindiName: "ऋषिकेश (Rishikesh)", category: "उत्तराखंड", latStr: "30.0869° N", lngStr: "78.2676° E", lat: 30.0869, lng: 78.2676, section: "Part 3 (Interstate Major Cities)" },
  { sno: 87, name: "Nainital", hindiName: "नैनीताल (Nainital)", category: "उत्तराखंड", latStr: "29.3919° N", lngStr: "79.4542° E", lat: 29.3919, lng: 79.4542, section: "Part 3 (Interstate Major Cities)" },
  { sno: 88, name: "Rudrapur", hindiName: "रुद्रपुर (Rudrapur)", category: "उत्तराखंड", latStr: "28.9800° N", lngStr: "79.4000° E", lat: 28.9800, lng: 79.4000, section: "Part 3 (Interstate Major Cities)" },
  { sno: 89, name: "Shimla", hindiName: "शिमला (Shimla)", category: "हिमाचल प्रदेश", latStr: "31.1048° N", lngStr: "77.1734° E", lat: 31.1048, lng: 77.1734, section: "Part 3 (Interstate Major Cities)" },
  { sno: 90, name: "Paonta Sahib", hindiName: "पांवटा साहिब (Paonta Sahib)", category: "हिमाचल प्रदेश", latStr: "30.4435° N", lngStr: "77.6245° E", lat: 30.4435, lng: 77.6245, section: "Part 3 (Interstate Major Cities)" },
  { sno: 91, name: "Dharamshala", hindiName: "धर्मशाला (Dharamshala)", category: "हिमाचल प्रदेश", latStr: "32.2190° N", lngStr: "76.3234° E", lat: 32.2190, lng: 76.3234, section: "Part 3 (Interstate Major Cities)" },
  { sno: 92, name: "New Delhi", hindiName: "नई दिल्ली (New Delhi)", category: "दिल्ली (NCT)", latStr: "28.6139° N", lngStr: "77.2090° E", lat: 28.6139, lng: 77.2090, section: "Part 3 (Interstate Major Cities)" },
  { sno: 93, name: "Gurugram", hindiName: "गुरुग्राम (Gurugram)", category: "हरियाणा", latStr: "28.4595° N", lngStr: "77.0266° E", lat: 28.4595, lng: 77.0266, section: "Part 3 (Interstate Major Cities)" },
  { sno: 94, name: "Faridabad", hindiName: "फरीदाबाद (Faridabad)", category: "हरियाणा", latStr: "28.4089° N", lngStr: "77.3178° E", lat: 28.4089, lng: 77.3178, section: "Part 3 (Interstate Major Cities)" },
  { sno: 95, name: "Panipat", hindiName: "पानीपत (Panipat)", category: "हरियाणा", latStr: "29.3909° N", lngStr: "76.9635° E", lat: 29.3909, lng: 76.9635, section: "Part 3 (Interstate Major Cities)" },
  { sno: 96, name: "Kurukshetra", hindiName: "कुरुक्षेत्र (Kurukshetra)", category: "हरियाणा", latStr: "29.9695° N", lngStr: "76.8783° E", lat: 29.9695, lng: 76.8783, section: "Part 3 (Interstate Major Cities)" },
  { sno: 97, name: "Jaipur", hindiName: "जयपुर (Jaipur)", category: "राजस्थान", latStr: "26.9124° N", lngStr: "75.7873° E", lat: 26.9124, lng: 75.7873, section: "Part 3 (Interstate Major Cities)" },
  { sno: 98, name: "Bharatpur", hindiName: "भरतपुर (Bharatpur)", category: "राजस्थान", latStr: "27.2152° N", lngStr: "77.5030° E", lat: 27.2152, lng: 77.5030, section: "Part 3 (Interstate Major Cities)" },
  { sno: 99, name: "Alwar", hindiName: "अलवर (Alwar)", category: "राजस्थान", latStr: "27.5530° N", lngStr: "76.6346° E", lat: 27.5530, lng: 76.6346, section: "Part 3 (Interstate Major Cities)" },
  { sno: 100, name: "Kota", hindiName: "कोटा (Kota)", category: "राजस्थान", latStr: "25.2138° N", lngStr: "75.8648° E", lat: 25.2138, lng: 75.8648, section: "Part 3 (Interstate Major Cities)" },
  { sno: 101, name: "Bhopal", hindiName: "भोपाल (Bhopal)", category: "मध्य प्रदेश", latStr: "23.2599° N", lngStr: "77.4126° E", lat: 23.2599, lng: 77.4126, section: "Part 3 (Interstate Major Cities)" },
  { sno: 102, name: "Gwalior", hindiName: "ग्वालियर (Gwalior)", category: "मध्य प्रदेश", latStr: "26.2183° N", lngStr: "78.1828° E", lat: 26.2183, lng: 78.1828, section: "Part 3 (Interstate Major Cities)" },
  { sno: 103, name: "Indore", hindiName: "इंदौर (Indore)", category: "मध्य प्रदेश", latStr: "22.7196° N", lngStr: "75.8577° E", lat: 22.7196, lng: 75.8577, section: "Part 3 (Interstate Major Cities)" },
  { sno: 104, name: "Jabalpur", hindiName: "जबलपुर (Jabalpur)", category: "मध्य प्रदेश", latStr: "23.1815° N", lngStr: "79.9864° E", lat: 23.1815, lng: 79.9864, section: "Part 3 (Interstate Major Cities)" },
  { sno: 105, name: "Ujjain", hindiName: "उज्जैन (Ujjain)", category: "मध्य प्रदेश", latStr: "23.1765° N", lngStr: "75.7885° E", lat: 23.1765, lng: 75.7885, section: "Part 3 (Interstate Major Cities)" },
  { sno: 106, name: "Khajuraho", hindiName: "खजुराहो (Khajuraho)", category: "मध्य प्रदेश", latStr: "24.8318° N", lngStr: "79.9199° E", lat: 24.8318, lng: 79.9199, section: "Part 3 (Interstate Major Cities)" },
  { sno: 107, name: "Rewa", hindiName: "रीवा (Rewa)", category: "मध्य प्रदेश", latStr: "24.5362° N", lngStr: "81.3037° E", lat: 24.5362, lng: 81.3037, section: "Part 3 (Interstate Major Cities)" },
  { sno: 108, name: "Raipur", hindiName: "रायपुर (Raipur)", category: "छत्तीसगढ़", latStr: "21.2514° N", lngStr: "81.6296° E", lat: 21.2514, lng: 81.6296, section: "Part 3 (Interstate Major Cities)" },
  { sno: 109, name: "Bilaspur", hindiName: "बिलासपुर (Bilaspur)", category: "छत्तीसगढ़", latStr: "22.0797° N", lngStr: "82.1409° E", lat: 22.0797, lng: 82.1409, section: "Part 3 (Interstate Major Cities)" },
  { sno: 110, name: "Ambikapur", hindiName: "अंबिकापुर (Ambikapur)", category: "छत्तीसगढ़", latStr: "23.1186° N", lngStr: "83.1979° E", lat: 23.1186, lng: 83.1979, section: "Part 3 (Interstate Major Cities)" },
  { sno: 111, name: "Ranchi", hindiName: "रांची (Ranchi)", category: "झारखंड", latStr: "23.3441° N", lngStr: "85.3096° E", lat: 23.3441, lng: 85.3096, section: "Part 3 (Interstate Major Cities)" },
  { sno: 112, name: "Jamshedpur", hindiName: "जमशेदपुर (Jamshedpur)", category: "झारखंड", latStr: "22.8046° N", lngStr: "86.2029° E", lat: 22.8046, lng: 86.2029, section: "Part 3 (Interstate Major Cities)" },
  { sno: 113, name: "Dhanbad", hindiName: "धनबाद (Dhanbad)", category: "झारखंड", latStr: "23.7957° N", lngStr: "86.4304° E", lat: 23.7957, lng: 86.4304, section: "Part 3 (Interstate Major Cities)" },
  { sno: 114, name: "Deoghar", hindiName: "देवघर (Deoghar)", category: "झारखंड", latStr: "24.4826° N", lngStr: "86.7000° E", lat: 24.4826, lng: 86.7000, section: "Part 3 (Interstate Major Cities)" },
  { sno: 115, name: "Garhwa", hindiName: "गढ़वा (Garhwa)", category: "झारखंड", latStr: "24.1627° N", lngStr: "83.8115° E", lat: 24.1627, lng: 83.8115, section: "Part 3 (Interstate Major Cities)" },
  { sno: 116, name: "Lucknow", hindiName: "लखनऊ (Lucknow)", category: "उत्तर प्रदेश (राजधानी)", latStr: "26.8467° N", lngStr: "80.9462° E", lat: 26.8467, lng: 80.9462, section: "Part 3 (Interstate Major Cities)" },
  { sno: 117, name: "Varanasi", hindiName: "वाराणसी (Varanasi)", category: "उत्तर प्रदेश", latStr: "25.3176° N", lngStr: "82.9739° E", lat: 25.3176, lng: 82.9739, section: "Part 3 (Interstate Major Cities)" },
];

console.log(`Total raw supplied records: ${RAW_SUPPLIED_RECORDS.length}`);
