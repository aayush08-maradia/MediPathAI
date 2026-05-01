// Import kept for types only - data now comes from backend API
import hospitalsData from "@/data/hospitals.json";
import citiesMappingData from "@/data/cities-mapping.json";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export type Tier = "Premium" | "Mid-tier" | "Budget";

export type RawHospital = {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  rating: number;
  reviews: number;
  nabh: boolean;
  tier: Tier;
  specialties: string[];
};

export type EnrichedHospital = RawHospital & {
  distanceKm: number;
  costMin: number;
  costMax: number;
  stayDays: number;
  perDay: number;
};

export type ConditionInfo = {
  condition: string;
  icd10: string;
  procedure: string;
  specialty: string;
  confidence: number;
  baseConfidence: number; // Static confidence, before adjusting for results
  base: { min: number; max: number; stayDays: number; perDay: number; diagnostics: number; medicines: number; contingencyPct: number };
};

export type SearchFilters = {
  radiusKm: number;
  tiers: Tier[];     // empty = all
  nabhOnly: boolean;
  minRating: number; // 0..5
  maxBudget: number | null;
  sortBy: "distance" | "cost" | "rating";
};

export type CityData = {
  city: string;
  state: string;
  lat: number;
  lng: number;
  hospitalCount: number;
};

export const defaultFilters: SearchFilters = {
  radiusKm: 20,
  tiers: [],
  nabhOnly: false,
  minRating: 0,
  maxBudget: null,
  sortBy: "distance",
};

// Transform backend hospital format to frontend format
function transformHospital(rawHosp: any): RawHospital {
  // Handle both backend format (hospital_id, hospital_name, etc.) and frontend format (id, name, etc.)
  const id = rawHosp.id || rawHosp.hospital_id || "unknown";
  const name = rawHosp.name || rawHosp.hospital_name || "Unknown";
  const city = rawHosp.city || "Unknown";
  const state = rawHosp.state || "Unknown";
  
  // Parse coordinates - backend sends as strings, convert to numbers
  const lat = typeof rawHosp.lat === "number" 
    ? rawHosp.lat 
    : parseFloat(rawHosp.latitude || rawHosp.lat || "0");
  const lng = typeof rawHosp.lng === "number" 
    ? rawHosp.lng 
    : parseFloat(rawHosp.longitude || rawHosp.lng || "0");
  
  // Parse rating - backend sends as string
  const rating = typeof rawHosp.rating === "number" 
    ? rawHosp.rating 
    : parseFloat(rawHosp.google_rating || rawHosp.rating || "3.5");
  
  // Reviews count - use 0 if not available
  const reviews = rawHosp.reviews || parseInt(rawHosp.total_beds) || 100;
  
  // Parse NABH - backend sends as string "TRUE"/"FALSE"
  const nabh = rawHosp.nabh === true 
    ? true 
    : (rawHosp.nabh_accredited === "TRUE" || rawHosp.nabh === "true" ? true : false);
  
  // Normalize tier
  const tierRaw = (rawHosp.tier || "mid").toLowerCase();
  let tier: Tier = "Mid-tier";
  if (tierRaw.includes("premium")) tier = "Premium";
  else if (tierRaw.includes("budget")) tier = "Budget";
  else tier = "Mid-tier";
  
  // Parse specialties - backend sends as comma-separated string
  let specialties: string[] = [];
  if (Array.isArray(rawHosp.specialties)) {
    specialties = rawHosp.specialties;
  } else if (Array.isArray(rawHosp.specializations)) {
    specialties = typeof rawHosp.specializations === "string"
      ? rawHosp.specializations.split(",").map(s => s.trim().toLowerCase())
      : [];
  } else {
    specialties = [];
  }
  
  return {
    id,
    name,
    city,
    state,
    lat,
    lng,
    rating,
    reviews,
    nabh,
    tier,
    specialties,
  };
}

// --- Dynamic city data (extracted from hospitals data) ---
function extractCitiesFromHospitals(hospitals: any[]): { coords: Record<string, { lat: number; lng: number; state: string }>, statesCities: Record<string, string[]> } {
  const cityMap: Record<string, { lats: number[], lngs: number[], state: string }> = {};
  
  hospitals.forEach(h => {
    if (!h.city || !h.state) return;
    
    const cityKey = h.city;
    if (!cityMap[cityKey]) {
      cityMap[cityKey] = {
        lats: [],
        lngs: [],
        state: h.state,
      };
    }
    
    if (h.lat && h.lng) {
      cityMap[cityKey].lats.push(typeof h.lat === 'string' ? parseFloat(h.lat) : h.lat);
      cityMap[cityKey].lngs.push(typeof h.lng === 'string' ? parseFloat(h.lng) : h.lng);
    }
  });

  const cityCoords: Record<string, { lat: number; lng: number; state: string }> = {};
  const statesCities: Record<string, string[]> = {};

  Object.keys(cityMap).forEach(city => {
    const cityData = cityMap[city];
    const avgLat = cityData.lats.length > 0 ? cityData.lats.reduce((a, b) => a + b) / cityData.lats.length : 0;
    const avgLng = cityData.lngs.length > 0 ? cityData.lngs.reduce((a, b) => a + b) / cityData.lngs.length : 0;
    
    cityCoords[city] = {
      lat: avgLat,
      lng: avgLng,
      state: cityData.state,
    };

    if (!statesCities[cityData.state]) {
      statesCities[cityData.state] = [];
    }
    statesCities[cityData.state].push(city);
  });

  // Sort cities within each state
  Object.keys(statesCities).forEach(state => {
    statesCities[state].sort();
  });

  return { coords: cityCoords, statesCities };
}

export let CITY_COORDS: Record<string, { lat: number; lng: number; state: string }> = {};
export let STATES_WITH_CITIES: Record<string, string[]> = {};

// City coordinates mapping for all 285 cities
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Andhra Pradesh
  Visakhapatnam: { lat: 17.6869, lng: 83.2185 }, Vijayawada: { lat: 16.5062, lng: 80.6480 }, Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Guntur: { lat: 16.2833, lng: 80.4472 }, Nellore: { lat: 14.4426, lng: 79.9864 }, Tirupati: { lat: 13.1939, lng: 79.8941 },
  Vizag: { lat: 17.6869, lng: 83.2185 }, Rajahmundry: { lat: 16.9891, lng: 81.8044 }, Kurnool: { lat: 15.8281, lng: 78.6355 },
  Kadapa: { lat: 14.4676, lng: 78.8239 }, Ongole: { lat: 15.5057, lng: 80.0449 }, Rajamundry: { lat: 16.9891, lng: 81.8044 },
  Karimnagar: { lat: 18.4386, lng: 79.1288 }, Warangal: { lat: 17.9689, lng: 79.5941 }, Khammam: { lat: 17.2696, lng: 80.6340 },
  Ananthapur: { lat: 13.6298, lng: 77.6022 }, Chittoor: { lat: 13.1939, lng: 79.1065 }, Madanapalle: { lat: 13.7268, lng: 79.1406 },
  Tenali: { lat: 16.2402, lng: 80.6489 }, Hindupur: { lat: 13.6317, lng: 77.2867 }, Kothagudem: { lat: 17.2897, lng: 80.6164 },
  Miryalaguda: { lat: 17.3356, lng: 79.2113 }, Nalgonda: { lat: 17.0535, lng: 79.1316 }, Shamshabad: { lat: 17.3297, lng: 78.6722 },
  Secunderabad: { lat: 17.3699, lng: 78.5044 }, Kukatpally: { lat: 17.4687, lng: 78.4277 }, Rangareddy: { lat: 17.2500, lng: 78.3667 },
  Eldurga: { lat: 15.5667, lng: 76.9333 }, Gajuwaka: { lat: 17.7044, lng: 83.3158 }, Gudivada: { lat: 16.3819, lng: 80.8928 },
  Eastgodavari: { lat: 17.0107, lng: 81.7853 }, Westgodavari: { lat: 16.1852, lng: 80.8663 }, Eluru: { lat: 16.7099, lng: 81.0899 },
  Machlipatanam: { lat: 16.1844, lng: 80.8444 }, Tadepalligudam: { lat: 16.4667, lng: 80.7000 }, Krishna: { lat: 16.2550, lng: 80.8750 },
  Himayatnagar: { lat: 17.3483, lng: 78.9908 }, Pattan: { lat: 15.0000, lng: 80.0000 }, Porbandar: { lat: 21.6420, lng: 69.6093 },

  // Assam
  Guwahati: { lat: 26.1445, lng: 91.7362 }, Dibrugarh: { lat: 27.4728, lng: 94.9142 }, Silchar: { lat: 24.8333, lng: 88.6333 },
  Tinsukia: { lat: 27.4884, lng: 95.3603 }, Sonitpur: { lat: 26.9333, lng: 93.0000 },

  // Bihar
  Patna: { lat: 25.5941, lng: 85.1376 }, Bihar: { lat: 25.5941, lng: 85.1376 },

  // Chattisgarh
  Raipur: { lat: 21.2514, lng: 81.6296 }, Bilaspur: { lat: 22.0796, lng: 82.1506 }, Durg: { lat: 21.1911, lng: 81.2864 },
  Bhilai: { lat: 21.1864, lng: 81.4048 }, Korba: { lat: 22.3596, lng: 82.7421 },

  // Delhi
  "New Delhi": { lat: 28.5355, lng: 77.3910 }, Delhi: { lat: 28.7041, lng: 77.1025 }, Nangloi: { lat: 28.6781, lng: 77.0565 },

  // Goa
  Margao: { lat: 15.2993, lng: 73.8343 }, Goa: { lat: 15.2993, lng: 73.8343 },

  // Gujarat
  Ahmedabad: { lat: 23.0225, lng: 72.5714 }, Surat: { lat: 21.1702, lng: 72.8311 }, Vadodara: { lat: 22.3072, lng: 73.1812 },
  Rajkot: { lat: 22.3039, lng: 70.8022 }, Jamnagar: { lat: 22.4707, lng: 70.0883 }, Baroda: { lat: 22.3072, lng: 73.1812 },
  Gandhinagar: { lat: 23.2156, lng: 72.6369 }, Bhavnagar: { lat: 21.7645, lng: 71.9520 }, Porbandar: { lat: 21.6420, lng: 69.6093 },
  Kutch: { lat: 22.2500, lng: 70.3500 }, Mehsana: { lat: 23.5904, lng: 72.4427 }, Nadiad: { lat: 22.6407, lng: 72.8640 },
  Patan: { lat: 23.8584, lng: 72.1121 }, Bharuch: { lat: 21.6117, lng: 72.9962 }, Godhra: { lat: 22.7758, lng: 73.6050 },
  Amraiwadi: { lat: 23.0580, lng: 72.5810 },

  // Haryana
  Faridabad: { lat: 28.4089, lng: 77.3178 }, Gurgaon: { lat: 28.4595, lng: 77.0266 }, Hisar: { lat: 29.1539, lng: 75.7400 },
  Rohtak: { lat: 28.8955, lng: 76.5656 }, Panipat: { lat: 29.3910, lng: 76.9589 }, Karnal: { lat: 29.6200, lng: 77.1051 },
  Ambala: { lat: 30.3776, lng: 76.7748 }, Panchkula: { lat: 30.6396, lng: 76.6553 }, Kurukshetra: { lat: 29.9689, lng: 76.8738 },
  Sonepat: { lat: 28.9957, lng: 77.0071 }, Yamunanagar: { lat: 30.1230, lng: 76.9805 }, Ballabgarh: { lat: 28.3667, lng: 77.3167 },
  Hissar: { lat: 29.1539, lng: 75.7400 }, Jhajjar: { lat: 28.6167, lng: 76.6500 }, Jind: { lat: 29.3161, lng: 76.3167 },
  Ranipat: { lat: 29.0222, lng: 76.9289 }, Rewari: { lat: 28.0314, lng: 76.6844 },

  // Himachal Pradesh
  Shimla: { lat: 31.7724, lng: 77.1025 }, Kullu: { lat: 32.2206, lng: 77.1103 }, Nahan: { lat: 30.5479, lng: 77.2908 },
  Mandi: { lat: 31.5885, lng: 76.9270 },

  // Jammu & Kashmir
  Srinagar: { lat: 34.0837, lng: 74.7973 }, Jammu: { lat: 32.7214, lng: 74.8479 },

  // Jharkhand
  Ranchi: { lat: 23.3441, lng: 85.3096 }, Dhanbad: { lat: 23.7957, lng: 86.4304 }, Jamshedpur: { lat: 22.8046, lng: 86.1829 },

  // Karnataka
  Bengaluru: { lat: 12.9716, lng: 77.5946 }, Mangalore: { lat: 12.8656, lng: 74.8450 }, Mysore: { lat: 12.2958, lng: 76.6394 },
  Hubli: { lat: 15.3647, lng: 75.1240 }, Belgaum: { lat: 15.8497, lng: 74.4977 }, Davangere: { lat: 14.4644, lng: 75.9218 },
  Tumkur: { lat: 13.2167, lng: 77.1333 }, Gulbarga: { lat: 17.3297, lng: 76.4940 }, Hassan: { lat: 13.3333, lng: 75.7167 },
  Shimoga: { lat: 13.9299, lng: 75.5681 }, Udupi: { lat: 13.3357, lng: 74.7421 }, Raichur: { lat: 16.2120, lng: 77.3567 },
  Bijapur: { lat: 16.8303, lng: 75.7097 }, Bidar: { lat: 17.9689, lng: 77.5245 }, Chickmagalur: { lat: 13.3186, lng: 75.7697 },
  Kolar: { lat: 13.1439, lng: 78.1304 }, Karwar: { lat: 14.8092, lng: 74.1239 }, Anekal: { lat: 12.7167, lng: 77.7000 },
  Chikkaballapur: { lat: 13.4333, lng: 77.9833 }, Chitradurga: { lat: 14.2167, lng: 75.9167 }, Bagalkot: { lat: 15.9136, lng: 75.6714 },
  Ankola: { lat: 14.6333, lng: 74.6500 }, Bantwal: { lat: 12.8833, lng: 74.9833 }, Belthangady: { lat: 13.1500, lng: 75.1833 },
  Bhadravathi: { lat: 13.8442, lng: 75.4681 }, Chanapatna: { lat: 12.6667, lng: 77.2667 }, Channarayapatna: { lat: 12.9333, lng: 76.4333 },
  Chellakere: { lat: 13.5167, lng: 76.3833 }, Dakshinakannada: { lat: 12.8000, lng: 74.8000 }, Gangavathi: { lat: 15.3167, lng: 75.6500 },
  Guttahalli: { lat: 15.3667, lng: 75.4167 }, "Hsr Layout": { lat: 12.9352, lng: 77.6245 }, Kadur: { lat: 13.8333, lng: 75.5000 },
  Kumta: { lat: 14.4236, lng: 74.6400 }, Kundalahalli: { lat: 12.9333, lng: 77.5833 }, Kundapur: { lat: 13.6282, lng: 74.6733 },
  Mandya: { lat: 12.5333, lng: 76.8833 }, Nagarbhavi: { lat: 12.9500, lng: 77.5500 }, Puttur: { lat: 12.7647, lng: 75.2342 },
  Ramanagaram: { lat: 12.7333, lng: 77.3167 }, Ranbennur: { lat: 14.5333, lng: 75.4333 }, Ujjire: { lat: 13.7333, lng: 75.6000 },
  Virajpet: { lat: 12.0833, lng: 75.8333 },

  // Kerala
  Kochi: { lat: 9.9312, lng: 76.2673 }, Cochin: { lat: 9.9312, lng: 76.2673 }, Thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
  Trivandrum: { lat: 8.5241, lng: 76.9366 }, Thrissur: { lat: 10.5276, lng: 76.2144 }, Trichur: { lat: 10.5276, lng: 76.2144 },
  Kozhikode: { lat: 11.2588, lng: 75.7804 }, Kozhicode: { lat: 11.2588, lng: 75.7804 }, Calicut: { lat: 11.2588, lng: 75.7804 },
  Ernakulam: { lat: 9.9312, lng: 76.2673 }, Kannur: { lat: 11.8745, lng: 75.3704 }, Kasaragod: { lat: 12.4817, lng: 75.2341 },
  Pathanamthitta: { lat: 9.2741, lng: 76.7871 }, Kottayam: { lat: 9.5941, lng: 76.5214 }, Kollam: { lat: 8.8932, lng: 76.6100 },
  Alleppey: { lat: 9.4867, lng: 76.3419 }, Palakkad: { lat: 10.7867, lng: 76.6550 }, Alappuzha: { lat: 9.4867, lng: 76.3419 },
  Idukki: { lat: 9.8500, lng: 76.9167 }, Malappuram: { lat: 11.0079, lng: 76.0408 }, Malapuram: { lat: 11.0079, lng: 76.0408 },
  Wayanad: { lat: 11.6000, lng: 75.9500 }, Aluva: { lat: 10.1108, lng: 76.3464 }, Kayamkulam: { lat: 9.1460, lng: 76.4243 },
  Koratty: { lat: 10.2167, lng: 76.3833 }, Kunnamkulam: { lat: 10.4000, lng: 76.1167 }, Manacaud: { lat: 8.4789, lng: 76.9629 },

  // Madhya Pradesh
  Indore: { lat: 22.7196, lng: 75.8577 }, Bhopal: { lat: 23.1815, lng: 79.9864 }, Gwalior: { lat: 26.2183, lng: 78.1629 },
  Jabalpur: { lat: 23.1815, lng: 79.9864 }, Ujjain: { lat: 23.1808, lng: 75.7728 }, Ratlam: { lat: 23.4117, lng: 75.0417 },
  Sagar: { lat: 23.8360, lng: 78.7374 }, Dewas: { lat: 22.9719, lng: 75.8203 }, Scheme: { lat: 22.0000, lng: 75.0000 },

  // Maharashtra
  Mumbai: { lat: 19.0760, lng: 72.8777 }, Pune: { lat: 18.5204, lng: 73.8567 }, Nagpur: { lat: 21.1458, lng: 79.0882 },
  Ahmednagar: { lat: 19.0960, lng: 74.7421 }, Aurangabad: { lat: 19.8762, lng: 75.3433 }, Nashik: { lat: 19.9975, lng: 73.7898 },
  Thane: { lat: 19.2183, lng: 72.9781 }, Kolhapur: { lat: 17.6599, lng: 73.7997 }, Solapur: { lat: 17.6599, lng: 75.9064 },
  Sholapur: { lat: 17.6599, lng: 75.9064 }, Amravati: { lat: 20.8449, lng: 77.7539 }, Raigad: { lat: 18.4981, lng: 73.3516 },
  "Navi Mumbai": { lat: 19.0330, lng: 73.0297 }, "Mira Road": { lat: 19.2813, lng: 72.8289 }, Bhiwandi: { lat: 19.2881, lng: 73.0508 },
  Badlapur: { lat: 19.1686, lng: 73.2833 }, Ulhasnagar: { lat: 19.2139, lng: 73.1333 }, Jalgaon: { lat: 21.1458, lng: 75.5644 },
  Parbhani: { lat: 19.2681, lng: 76.7597 }, Baramati: { lat: 18.6333, lng: 73.8333 }, Buldana: { lat: 20.5305, lng: 76.1726 },
  Kheda: { lat: 22.2667, lng: 72.7333 }, Ratnagiri: { lat: 16.9891, lng: 73.3168 }, Sangli: { lat: 16.8628, lng: 74.5654 },
  Sindhudurga: { lat: 16.1667, lng: 73.8333 }, Wardha: { lat: 20.7505, lng: 78.6000 }, Uran: { lat: 19.1333, lng: 72.9167 },
  Bhosari: { lat: 18.6356, lng: 73.8097 }, Jamkhed: { lat: 18.0833, lng: 74.8833 }, Koparkhairane: { lat: 19.0853, lng: 73.1067 },
  Malegaon: { lat: 20.5595, lng: 74.6181 }, Nalasopara: { lat: 19.3959, lng: 72.7640 },

  // Orissa
  Bhubaneswar: { lat: 20.2961, lng: 85.8245 }, Cuttack: { lat: 20.4625, lng: 85.8830 }, Rourkela: { lat: 22.2261, lng: 84.8737 },
  Berhamapur: { lat: 19.3155, lng: 84.7941 }, Bargarh: { lat: 21.5000, lng: 83.5000 }, Bhubneshwar: { lat: 20.2961, lng: 85.8245 },
  Dhenkanal: { lat: 20.6833, lng: 85.5833 }, Jagatsinghapur: { lat: 20.0500, lng: 86.4500 }, Kendrapada: { lat: 20.5167, lng: 86.4000 },
  Khurda: { lat: 19.9833, lng: 85.6667 }, Sambalpur: { lat: 21.4667, lng: 83.9833 },

  // Punjab
  Chandigarh: { lat: 30.7333, lng: 76.7794 }, Ludhiana: { lat: 30.9010, lng: 75.8573 }, Amritsar: { lat: 31.6340, lng: 74.8723 },
  Patiala: { lat: 30.3398, lng: 76.3868 }, Jalandhar: { lat: 31.7264, lng: 75.5761 }, Bhatinda: { lat: 29.9679, lng: 74.9597 },
  Sangrur: { lat: 30.2667, lng: 75.5500 }, Ferozepur: { lat: 30.9667, lng: 74.5500 }, Gurdaspur: { lat: 32.1807, lng: 75.4054 },
  Mohali: { lat: 30.6435, lng: 76.8012 }, Muktsar: { lat: 30.1936, lng: 74.5383 }, Barnala: { lat: 30.1333, lng: 75.5333 },

  // Rajasthan
  Jaipur: { lat: 26.9124, lng: 75.7873 }, Jodhpur: { lat: 26.2389, lng: 73.0243 }, Udaipur: { lat: 24.5854, lng: 73.7125 },
  Kota: { lat: 25.2138, lng: 75.8648 }, Ajmer: { lat: 26.4499, lng: 74.6399 }, Bikaner: { lat: 28.0229, lng: 71.8324 },
  Alwar: { lat: 27.5719, lng: 76.6289 }, Bharatpur: { lat: 27.2141, lng: 77.4872 }, Chittorgarh: { lat: 24.8934, lng: 74.6289 },
  Jhalawar: { lat: 24.6400, lng: 75.6186 }, Sriganganagar: { lat: 29.9117, lng: 71.8844 },

  // Tamilnadu
  Chennai: { lat: 13.0827, lng: 80.2707 }, Coimbatore: { lat: 11.0066, lng: 76.9485 }, Madurai: { lat: 9.9252, lng: 78.1198 },
  Salem: { lat: 11.6643, lng: 78.1460 }, Trichy: { lat: 10.7905, lng: 78.7047 }, Tiruchirapalli: { lat: 10.7905, lng: 78.7047 },
  Tiruppur: { lat: 11.1085, lng: 77.3411 }, Tirupur: { lat: 11.1085, lng: 77.3411 }, Erode: { lat: 11.3919, lng: 77.7175 },
  Nagercoil: { lat: 8.1928, lng: 77.4244 }, Tirunelveli: { lat: 8.7139, lng: 77.7567 }, Kanyakumari: { lat: 8.0883, lng: 77.5385 },
  Vellore: { lat: 12.9689, lng: 79.1288 }, Krishnagiri: { lat: 12.5193, lng: 78.8978 }, Dharmapuri: { lat: 12.1725, lng: 78.5696 },
  Chengalpattu: { lat: 12.6667, lng: 80.1667 }, Kanchipuram: { lat: 12.8342, lng: 79.7029 }, Thiruvallur: { lat: 13.1288, lng: 79.8997 },
  Villupuram: { lat: 12.9675, lng: 79.4914 }, Cuddalore: { lat: 11.7502, lng: 79.7604 }, Pondicherry: { lat: 11.9416, lng: 79.8083 },
  Karaikudi: { lat: 10.2667, lng: 78.7667 }, Karur: { lat: 10.9597, lng: 78.0855 }, Kumbakonam: { lat: 10.9597, lng: 79.3833 },
  Tanjore: { lat: 10.7870, lng: 79.1378 }, Sivagangai: { lat: 9.8667, lng: 78.4667 }, Sivakasi: { lat: 9.2508, lng: 77.7697 },
  Theni: { lat: 10.0188, lng: 77.4667 }, Hosur: { lat: 12.7396, lng: 77.8303 }, Pollachi: { lat: 10.6703, lng: 76.7442 },
  "Ashok Nagar": { lat: 13.0905, lng: 80.2361 }, Nanganallur: { lat: 12.9352, lng: 80.2245 }, Tiruchendur: { lat: 8.1897, lng: 77.2754 },
  Tuticorin: { lat: 8.8007, lng: 78.1963 }, Valapady: { lat: 10.5667, lng: 76.5667 }, Virudhunagar: { lat: 9.5369, lng: 77.9533 },
  Dindigul: { lat: 10.3669, lng: 77.9814 }, Nagercoil: { lat: 8.1928, lng: 77.4244 }, Kuzhithurai: { lat: 8.3333, lng: 77.2500 },

  // Uttar Pradesh
  Lucknow: { lat: 26.8467, lng: 80.9462 }, Kanpur: { lat: 26.4499, lng: 80.3319 }, Varanasi: { lat: 25.3176, lng: 82.9739 },
  Agra: { lat: 27.1767, lng: 78.0081 }, Ghaziabad: { lat: 28.6692, lng: 77.4538 }, Meerut: { lat: 28.9845, lng: 77.7064 },
  Noida: { lat: 28.5355, lng: 77.3910 }, Bareilly: { lat: 28.3670, lng: 79.4304 }, Moradabad: { lat: 28.8385, lng: 77.7597 },
  Aligarh: { lat: 27.8974, lng: 77.8920 }, Allahabad: { lat: 25.4358, lng: 81.8463 }, Azamgarh: { lat: 26.0733, lng: 83.1857 },
  Bijnor: { lat: 29.3842, lng: 78.1302 }, Hapur: { lat: 28.7403, lng: 77.7719 }, Vaishali: { lat: 25.9269, lng: 85.1157 },

  // Uttarakhand
  Dehradun: { lat: 30.3165, lng: 78.0322 }, Haldwani: { lat: 29.2168, lng: 79.5136 }, Hardwar: { lat: 29.9457, lng: 78.1644 },
  Nainital: { lat: 29.3919, lng: 79.4504 },

  // Uttaranchal (same as Uttarakhand)
  // Already covered above

  // West Bengal
  Kolkata: { lat: 22.5726, lng: 88.3639 }, Siliguri: { lat: 26.7271, lng: 88.4230 }, Darjeeling: { lat: 27.0360, lng: 88.2605 },
  Howrah: { lat: 22.5958, lng: 88.2636 }, Durgapur: { lat: 23.8103, lng: 87.3118 }, Burdwan: { lat: 23.2500, lng: 87.8667 },
  Asansol: { lat: 23.6840, lng: 86.9641 }, Jalpaiguri: { lat: 26.5203, lng: 88.7253 }, "Cooch Behar": { lat: 26.3230, lng: 88.8000 },
  Malda: { lat: 25.2500, lng: 88.3833 }, Murshidabad: { lat: 24.1833, lng: 88.2500 }, Birbhum: { lat: 24.1000, lng: 87.6500 },
  Bankura: { lat: 23.8333, lng: 87.0667 }, Garia: { lat: 22.4667, lng: 88.4000 }, Hooghly: { lat: 22.8333, lng: 88.3833 },
  "North24Paraganas": { lat: 22.6333, lng: 88.5833 }, Titagarh: { lat: 22.7743, lng: 88.3882 },
};

// Initialize states and cities from comprehensive mapping
function initializeStatesAndCities() {
  STATES_WITH_CITIES = JSON.parse(JSON.stringify(citiesMappingData));
  
  // Generate CITY_COORDS with defaults
  Object.entries(STATES_WITH_CITIES).forEach(([state, cities]) => {
    cities.forEach(city => {
      if (CITY_COORDINATES[city]) {
        CITY_COORDS[city] = {
          lat: CITY_COORDINATES[city].lat,
          lng: CITY_COORDINATES[city].lng,
          state: state,
        };
      } else {
        // Provide a default coordinate if not found
        CITY_COORDS[city] = {
          lat: 20.5937 + Math.random() * 10,
          lng: 78.9629 + Math.random() * 10,
          state: state,
        };
      }
    });
  });
}

// Initialize cities from local hospitals data
let citiesLoaded = false;
export async function loadCitiesFromHospitals() {
  if (citiesLoaded) return;
  
  try {
    // Initialize with comprehensive cities mapping
    initializeStatesAndCities();
    console.log(`✓ Loaded ${Object.keys(CITY_COORDS).length} cities from cities mapping`);
    console.log(`✓ States: ${Object.keys(STATES_WITH_CITIES).length}`);

    // Then try to fetch from backend to get complete dataset with actual hospital data
    try {
      const response = await fetch(`${API_BASE_URL}/hospitals/cities`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data)) {
          const backendCoords: Record<string, { lat: number; lng: number; state: string }> = {};
          const backendStatesCities: Record<string, string[]> = {};
          
          result.data.forEach((city: CityData) => {
            backendCoords[city.city] = {
              lat: city.lat,
              lng: city.lng,
              state: city.state,
            };
            
            if (!backendStatesCities[city.state]) {
              backendStatesCities[city.state] = [];
            }
            backendStatesCities[city.state].push(city.city);
          });
          
          // Sort cities within each state
          Object.keys(backendStatesCities).forEach(state => {
            backendStatesCities[state].sort();
          });
          
          CITY_COORDS = backendCoords;
          STATES_WITH_CITIES = backendStatesCities;
          console.log(`✓ Enhanced: Loaded ${Object.keys(backendCoords).length} cities from backend API`);
        }
      }
    } catch (apiError) {
      console.warn("Backend cities API not available, using cities mapping:", apiError);
    }
  } catch (error) {
    console.error("Failed to load cities:", error);
  }
  
  citiesLoaded = true;
}

// --- Condition catalog (replaceable with Claude / backend later) ---
export const CONDITION_CATALOG: Record<string, ConditionInfo> = {
  knee: {
    condition: "Osteoarthritis of Knee",
    icd10: "M17.9",
    procedure: "Total Knee Replacement (TKR)",
    specialty: "orthopedics",
    baseConfidence: 92,
    confidence: 92,
    base: { min: 140000, max: 420000, stayDays: 5, perDay: 5500, diagnostics: 18000, medicines: 12000, contingencyPct: 10 },
  },
  cardiac: {
    condition: "Suspected Stable Angina (CAD)",
    icd10: "I20.9",
    procedure: "Cardiac Workup + Angiography",
    specialty: "cardiology",
    baseConfidence: 78,
    confidence: 78,
    base: { min: 18000, max: 85000, stayDays: 2, perDay: 6500, diagnostics: 14000, medicines: 4500, contingencyPct: 15 },
  },
  cancer: {
    condition: "Oncology Consultation & Treatment Planning",
    icd10: "C80.1",
    procedure: "Multidisciplinary Cancer Care",
    specialty: "oncology",
    baseConfidence: 84,
    confidence: 84,
    base: { min: 80000, max: 480000, stayDays: 7, perDay: 5000, diagnostics: 35000, medicines: 28000, contingencyPct: 12 },
  },
  neuro: {
    condition: "Neurological Evaluation",
    icd10: "G93.9",
    procedure: "Neuro Workup + Imaging",
    specialty: "neurology",
    baseConfidence: 76,
    confidence: 76,
    base: { min: 25000, max: 180000, stayDays: 3, perDay: 6000, diagnostics: 22000, medicines: 8000, contingencyPct: 12 },
  },
  respiratory: {
    condition: "Respiratory System Evaluation",
    icd10: "J99.9",
    procedure: "Pulmonary Assessment + Imaging",
    specialty: "pulmonology",
    baseConfidence: 75,
    confidence: 75,
    base: { min: 8000, max: 50000, stayDays: 1, perDay: 3000, diagnostics: 5000, medicines: 2500, contingencyPct: 12 },
  },
  digestive: {
    condition: "Gastrointestinal Disorder Assessment",
    icd10: "K92.9",
    procedure: "GI Evaluation + Diagnostic Tests",
    specialty: "gastroenterology",
    baseConfidence: 73,
    confidence: 73,
    base: { min: 6000, max: 45000, stayDays: 1, perDay: 2500, diagnostics: 4500, medicines: 2000, contingencyPct: 11 },
  },
  diabetes: {
    condition: "Diabetes Management & Control",
    icd10: "E11.9",
    procedure: "Diabetes Screening & Management",
    specialty: "endocrinology",
    baseConfidence: 80,
    confidence: 80,
    base: { min: 3000, max: 15000, stayDays: 0, perDay: 0, diagnostics: 2500, medicines: 1500, contingencyPct: 10 },
  },
  hypertension: {
    condition: "Hypertension Management",
    icd10: "I10",
    procedure: "Blood Pressure Management & Monitoring",
    specialty: "cardiology",
    baseConfidence: 78,
    confidence: 78,
    base: { min: 2000, max: 10000, stayDays: 0, perDay: 0, diagnostics: 1500, medicines: 1200, contingencyPct: 10 },
  },
  skin: {
    condition: "Dermatological Evaluation",
    icd10: "L98.9",
    procedure: "Skin Assessment & Treatment Planning",
    specialty: "dermatology",
    baseConfidence: 72,
    confidence: 72,
    base: { min: 2000, max: 25000, stayDays: 0, perDay: 0, diagnostics: 1500, medicines: 1000, contingencyPct: 10 },
  },
  eye: {
    condition: "Ophthalmology Consultation",
    icd10: "H57.9",
    procedure: "Eye Examination & Vision Assessment",
    specialty: "ophthalmology",
    baseConfidence: 74,
    confidence: 74,
    base: { min: 1500, max: 20000, stayDays: 0, perDay: 0, diagnostics: 1500, medicines: 500, contingencyPct: 10 },
  },
  mental: {
    condition: "Mental Health & Psychiatric Consultation",
    icd10: "F99",
    procedure: "Psychiatric Assessment & Management",
    specialty: "psychiatry",
    baseConfidence: 71,
    confidence: 71,
    base: { min: 2000, max: 15000, stayDays: 0, perDay: 2000, diagnostics: 1000, medicines: 1500, contingencyPct: 10 },
  },
  dental: {
    condition: "Dental Care & Consultation",
    icd10: "K00-K14",
    procedure: "Dental Examination & Treatment Planning",
    specialty: "dentistry",
    baseConfidence: 70,
    confidence: 70,
    base: { min: 500, max: 20000, stayDays: 0, perDay: 0, diagnostics: 1000, medicines: 200, contingencyPct: 10 },
  },
  fracture: {
    condition: "Bone Fracture & Trauma Assessment",
    icd10: "S72.9",
    procedure: "X-ray & Orthopedic Evaluation",
    specialty: "orthopedics",
    baseConfidence: 82,
    confidence: 82,
    base: { min: 25000, max: 150000, stayDays: 3, perDay: 4000, diagnostics: 8000, medicines: 5000, contingencyPct: 12 },
  },
  general: {
    condition: "General Health Consultation",
    icd10: "Z00.0",
    procedure: "Outpatient Diagnostic Evaluation",
    specialty: "general",
    baseConfidence: 70,
    confidence: 70,
    base: { min: 1500, max: 4500, stayDays: 0, perDay: 0, diagnostics: 3500, medicines: 1200, contingencyPct: 10 },
  },
};

/**
 * Generate dynamic consultation name based on symptom keywords
 */
function generateDynamicConsultation(query: string): ConditionInfo {
  const q = query.toLowerCase();
  const keywords = q.split(/\s+/);
  
  // Create a dynamic condition based on keywords
  const keywordStr = keywords.slice(0, 2).join(' ');
  const specialty = q.match(/doctor|physician/) ? 'medicine' : 'general';
  
  return {
    condition: `${keywordStr.charAt(0).toUpperCase() + keywordStr.slice(1)} Consultation`,
    icd10: "Z00.0",
    procedure: "Diagnostic Evaluation & Consultation",
    specialty,
    baseConfidence: 65,
    confidence: 65,
    base: { min: 2000, max: 8000, stayDays: 0, perDay: 0, diagnostics: 2500, medicines: 1000, contingencyPct: 10 },
  };
}

export function classifyQuery(query: string): ConditionInfo {
  const q = query.toLowerCase();
  
  // More specific patterns - check for knee specifically
  if (q.match(/knee|meniscus|arthritis.*knee|knee.*replacement|tkr/)) return CONDITION_CATALOG.knee;
  
  // Chest/Cardiac - specific patterns
  if (q.match(/chest|heart|angina|seene|cardiac|palpitation|arrhythmia|chest pain/)) return CONDITION_CATALOG.cardiac;
  
  // Cancer patterns
  if (q.match(/cancer|tumor|onco|lump|malignant|carcinoma/)) return CONDITION_CATALOG.cancer;
  
  // Neuro patterns
  if (q.match(/brain|stroke|neuro|migraine|headache|epilepsy|vertigo|paralysis/)) return CONDITION_CATALOG.neuro;
  
  // Respiratory patterns
  if (q.match(/cough|breath|asthma|respiratory|lung|pneumonia|bronch|wheez|shortness of breath/)) return CONDITION_CATALOG.respiratory;
  
  // Digestive patterns
  if (q.match(/stomach|abdomen|nausea|vomit|diarrhea|constipation|acidity|gerd|ulcer|gastric|intestin|bowel/)) return CONDITION_CATALOG.digestive;
  
  // Diabetes patterns
  if (q.match(/diabetes|sugar|glucose|insulin|thyroid|hormone|endocrine/)) return CONDITION_CATALOG.diabetes;
  
  // Hypertension patterns
  if (q.match(/blood pressure|hypertension|bp high|htn/)) return CONDITION_CATALOG.hypertension;
  
  // Skin patterns
  if (q.match(/skin|rash|acne|eczema|psoriasis|itching|dermatitis|mole|allergy/)) return CONDITION_CATALOG.skin;
  
  // Eye patterns
  if (q.match(/eye|vision|sight|glasses|cataract|glaucoma|conjunctivitis|blindness/)) return CONDITION_CATALOG.eye;
  
  // Mental health patterns
  if (q.match(/depression|anxiety|stress|mental|psychiatric|mood|panic|bipolar/)) return CONDITION_CATALOG.mental;
  
  // Dental patterns
  if (q.match(/tooth|teeth|gum|dental|cavity|toothache/)) return CONDITION_CATALOG.dental;
  
  // Fracture/Trauma patterns - MUST come after specific patterns
  if (q.match(/fracture|broken|sprain|injury|trauma|accident|fall|dislocation|bone.*break/)) return CONDITION_CATALOG.fracture;
  
  // Generic joint/orthopedic (non-knee)
  if (q.match(/joint|bone|orthop|spinal|back|shoulder|hip|ankle|wrist|hand.*pain/)) return CONDITION_CATALOG.fracture;
  
  // For any other query, generate dynamic consultation based on the input
  return generateDynamicConsultation(query);
}

// Haversine distance in km
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Calculate adjusted confidence based on search results
function calculateAdjustedConfidence(baseConfidence: number, hospitals: EnrichedHospital[]): number {
  if (hospitals.length === 0) return Math.max(baseConfidence - 20, 40); // Reduce confidence if no hospitals
  
  // Adjust confidence based on:
  // 1. Number of hospitals (more hospitals = higher confidence)
  // 2. Average rating (higher rating = higher confidence)
  // 3. Data availability
  
  const hospitalCountBonus = Math.min(hospitals.length / 10, 1) * 5; // Up to +5% for 10+ hospitals
  const avgRating = hospitals.reduce((sum, h) => sum + h.rating, 0) / hospitals.length;
  const ratingBonus = (avgRating / 5) * 8 - 8 + 8; // Scale 0-5 rating to 0-8 bonus
  const nabhCount = hospitals.filter(h => h.nabh).length;
  const nabhBonus = (nabhCount / Math.max(hospitals.length, 1)) * 3; // Up to +3% for NABH hospitals
  
  const adjustedConfidence = Math.min(
    baseConfidence + hospitalCountBonus + ratingBonus + nabhBonus,
    98 // Cap at 98% to maintain honest uncertainty
  );
  
  return Math.round(adjustedConfidence);
}

// Tier-based cost multiplier so each hospital gets a realistic estimate vs the condition base
const TIER_MULT: Record<Tier, { min: number; max: number; perDay: number }> = {
  Premium:   { min: 1.4, max: 1.6, perDay: 1.55 },
  "Mid-tier":{ min: 1.0, max: 1.2, perDay: 1.0 },
  Budget:    { min: 0.55, max: 0.75, perDay: 0.6 },
};

function priceFor(condition: ConditionInfo, h: RawHospital): { costMin: number; costMax: number; stayDays: number; perDay: number } {
  const m = TIER_MULT[h.tier];
  return {
    costMin: Math.round(condition.base.min * m.min),
    costMax: Math.round(condition.base.max * m.max),
    stayDays: condition.base.stayDays,
    perDay: Math.round(condition.base.perDay * m.perDay),
  };
}

export type SearchInput = {
  query: string;
  origin: { lat: number; lng: number };
  filters: SearchFilters;
};

export type SearchOutput = {
  query: string;
  condition: ConditionInfo;
  hospitals: EnrichedHospital[];
  totalMatching: number;
};

/**
 * Call NLP API to intelligently map symptom to medical condition
 * Uses backend NLP service for accurate symptom analysis
 */
export async function processSymptomWithNLP(symptom: string): Promise<ConditionInfo | null> {
  try {
    console.log('📡 Calling NLP API for symptom:', symptom);
    
    const response = await fetch(`${API_BASE_URL}/nlp/map-condition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: symptom })
    });

    if (!response.ok) {
      console.warn('❌ NLP API failed with status', response.status, '- will use local classification');
      return null;
    }

    const data = await response.json();
    console.log('📊 NLP Response:', data);
    
    // If emergency is detected, return null so home page can handle it
    if (data.emergency && data.emergency.isEmergency) {
      console.warn('🚨 Emergency detected:', data.emergency.message);
      return null;
    }

    // Get the top condition from NLP response
    if (data.success && data.topCondition) {
      const topCondition = data.topCondition;
      
      // Map NLP result to our ConditionInfo format
      const mapped: ConditionInfo = {
        condition: topCondition.name || symptom,
        icd10: topCondition.icd10 || "Z00.0",
        procedure: topCondition.recommendedProcedures?.[0] || "Diagnostic Evaluation & Consultation",
        specialty: (topCondition.specialty || "general").toLowerCase(),
        confidence: data.confidence || topCondition.confidence || 65,
        baseConfidence: data.confidence || topCondition.confidence || 65,
        base: {
          min: topCondition.costBase?.min || 2000,
          max: topCondition.costBase?.max || 8000,
          stayDays: topCondition.costBase?.stayDays || 0,
          perDay: topCondition.costBase?.perDayRate || 0,
          diagnostics: topCondition.costBase?.diagnostics || 2500,
          medicines: topCondition.costBase?.medicines || 1000,
          contingencyPct: 10
        }
      };
      
      console.log('✅ NLP mapped successfully:', mapped.condition, '| Specialty:', mapped.specialty, '| Confidence:', mapped.confidence);
      return mapped;
    }
    
    console.warn('⚠️ NLP returned no conditions - will use local classification');
  } catch (error) {
    console.warn('❌ NLP API call failed:', error);
  }

  return null;
}

/**
 * Backend-integrated function: Calls the Express API to search hospitals
 * Falls back to local data if backend is unavailable
 */
export async function findHospitals(input: SearchInput): Promise<SearchOutput> {
  // Ensure cities are loaded from local hospitals data
  await loadCitiesFromHospitals();
  
  console.log('🔍 Starting hospital search for:', input.query);
  
  // First, try to use NLP to process the symptom
  let baseCondition = await processSymptomWithNLP(input.query);
  
  // Fallback to local keyword classification if NLP fails
  if (!baseCondition) {
    console.log('⚡ Using local keyword classification (NLP unavailable)');
    baseCondition = classifyQuery(input.query);
    console.log('📋 Local classification result:', baseCondition.condition, '| Specialty:', baseCondition.specialty);
  } else {
    console.log('🧠 Using NLP classification:', baseCondition.condition, '| Specialty:', baseCondition.specialty);
  }
  
  try {
    // Try to fetch from backend API
    const searchParams = new URLSearchParams({
      q: input.query,
      lat: input.origin.lat.toString(),
      lng: input.origin.lng.toString(),
      radiusKm: input.filters.radiusKm.toString(),
      minRating: input.filters.minRating.toString(),
    });

    if (input.filters.tiers.length > 0) {
      searchParams.append("tiers", input.filters.tiers.join(","));
    }
    if (input.filters.nabhOnly) {
      searchParams.append("nabhOnly", "true");
    }
    if (input.filters.maxBudget) {
      searchParams.append("maxBudget", input.filters.maxBudget.toString());
    }

    const response = await fetch(`${API_BASE_URL}/hospitals/search?${searchParams}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const apiData = await response.json();
    
    if (apiData.success && apiData.data) {
      const hospitals = apiData.data as EnrichedHospital[];
      
      // Calculate adjusted confidence based on results
      const adjustedConfidence = calculateAdjustedConfidence(baseCondition.baseConfidence, hospitals);
      const condition: ConditionInfo = { ...baseCondition, confidence: adjustedConfidence };
      
      // Apply sorting
      const f = input.filters;
      hospitals.sort((a, b) => {
        if (f.sortBy === "cost") return a.costMin - b.costMin;
        if (f.sortBy === "rating") return b.rating - a.rating;
        return a.distanceKm - b.distanceKm;
      });

      return { 
        query: input.query, 
        condition, 
        hospitals, 
        totalMatching: hospitals.length 
      };
    }
  } catch (error) {
    console.warn("Backend API failed, falling back to local data:", error);
  }

  // FALLBACK: Use local data if backend is unavailable
  const rawHospitals = (hospitalsData as any[]).map(transformHospital);
  const all = rawHospitals as RawHospital[];

  // First try to filter by specialty
  let enriched: EnrichedHospital[] = all
    .filter((h) => {
      if (baseCondition.specialty === "general") return true;
      // Check if any of hospital's specialties match the required specialty (case-insensitive)
      return h.specialties.some(s => s.toLowerCase().includes(baseCondition.specialty.toLowerCase()));
    })
    .map((h) => {
      const p = priceFor(baseCondition, h);
      return { ...h, distanceKm: +distanceKm(input.origin, h).toFixed(1), ...p };
    });

  // If no results and not a general query, fall back to all hospitals in the area
  if (enriched.length === 0 && baseCondition.specialty !== "general") {
    enriched = all
      .map((h) => {
        const p = priceFor(baseCondition, h);
        return { ...h, distanceKm: +distanceKm(input.origin, h).toFixed(1), ...p };
      });
  }

  const f = input.filters;
  let filtered = enriched
    .filter((h) => h.distanceKm <= f.radiusKm)
    .filter((h) => (f.tiers.length === 0 ? true : f.tiers.includes(h.tier)))
    .filter((h) => (f.nabhOnly ? h.nabh : true))
    .filter((h) => h.rating >= f.minRating)
    .filter((h) => (f.maxBudget == null ? true : h.costMin <= f.maxBudget));

  filtered.sort((a, b) => {
    if (f.sortBy === "cost") return a.costMin - b.costMin;
    if (f.sortBy === "rating") return b.rating - a.rating;
    return a.distanceKm - b.distanceKm;
  });

  // Calculate adjusted confidence based on filtered results
  const adjustedConfidence = calculateAdjustedConfidence(baseCondition.baseConfidence, filtered);
  const condition: ConditionInfo = { ...baseCondition, confidence: adjustedConfidence };

  // Simulate network latency for the "AI thinking" UX
  await new Promise((r) => setTimeout(r, 250));

  return { query: input.query, condition, hospitals: filtered, totalMatching: filtered.length };
}

export function formatINR(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}