const path = require('path');
const Fuse = require('fuse.js');

const hospitals = require(path.join(__dirname, '../data/hospitals.json'));

// Helper function to transform backend hospital format to frontend format
function transformHospital(h) {
  const tier = h.tier === 'premium' ? 'Premium' 
    : h.tier === 'mid' ? 'Mid-tier' 
    : 'Budget';

  const specialties = h.specializations ? h.specializations.split(',').map(s => s.trim().toLowerCase()) : [];
  
  return {
    id: h.hospital_id,
    name: h.hospital_name,
    city: h.city,
    state: h.state,
    lat: parseFloat(h.latitude) || 0,
    lng: parseFloat(h.longitude) || 0,
    rating: parseFloat(h.google_rating) || 3.0,
    reviews: parseInt(h.total_beds) || 0,
    nabh: h.nabh_accredited === 'TRUE',
    tier: tier,
    specialties: specialties,
  };
}

exports.getAllHospitals = (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedHospitals = hospitals.slice(startIndex, endIndex).map(transformHospital);

    res.json({
      success: true,
      data: paginatedHospitals,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(hospitals.length / limit),
        totalHospitals: hospitals.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHospitalById = (req, res) => {
  try {
    const hospital = hospitals.find(h => String(h.hospital_id) === String(req.params.id));
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    res.json({ success: true, data: transformHospital(hospital) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchHospitals = (req, res) => {
  try {
    const query = req.query.q || req.query.query;
    if (!query) return res.status(400).json({ success: false, message: 'Search query required' });

    const fuseOptions = {
      keys: ['hospital_name', 'specializations', 'city', 'state'],
      threshold: 0.3
    };

    const fuse = new Fuse(hospitals, fuseOptions);
    const results = fuse.search(query).map(r => transformHospital(r.item));

    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.filterHospitals = (req, res) => {
  try {
    let filtered = [...hospitals];
    const { city, state, tier, nabh_accredited, minRating, specialization } = req.body;

    if (city) filtered = filtered.filter(h => h.city && h.city.toLowerCase().includes(city.toLowerCase()));
    if (state) filtered = filtered.filter(h => h.state && h.state.toLowerCase().includes(state.toLowerCase()));
    if (tier) filtered = filtered.filter(h => h.tier === tier);
    if (nabh_accredited !== undefined) filtered = filtered.filter(h => h.nabh_accredited === (nabh_accredited ? 'TRUE' : 'FALSE'));
    if (minRating) filtered = filtered.filter(h => parseFloat(h.google_rating) >= parseFloat(minRating));
    if (specialization) filtered = filtered.filter(h => h.specializations && h.specializations.toLowerCase().includes(specialization.toLowerCase()));

    res.json({ success: true, data: filtered.map(transformHospital), count: filtered.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHospitalsByCity = (req, res) => {
  try {
    const city = req.params.city;
    const filtered = hospitals.filter(h => h.city && h.city.toLowerCase() === city.toLowerCase());
    res.json({ success: true, data: filtered.map(transformHospital), count: filtered.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHospitalsBySpecialization = (req, res) => {
  try {
    const spec = req.params.spec;
    const filtered = hospitals.filter(h => h.specializations && h.specializations.toLowerCase().includes(spec.toLowerCase()));
    res.json({ success: true, data: filtered.map(transformHospital), count: filtered.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllCities = (req, res) => {
  try {
    // Group hospitals by city and calculate average coordinates
    const cityMap = {};
    
    hospitals.forEach(h => {
      if (!h.city || !h.state) return;
      
      const cityKey = h.city.toLowerCase();
      if (!cityMap[cityKey]) {
        cityMap[cityKey] = {
          city: h.city,
          state: h.state,
          lats: [],
          lngs: [],
          hospitalCount: 0
        };
      }
      
      if (h.latitude && h.longitude) {
        cityMap[cityKey].lats.push(parseFloat(h.latitude));
        cityMap[cityKey].lngs.push(parseFloat(h.longitude));
      }
      cityMap[cityKey].hospitalCount++;
    });

    // Convert to final format with average coordinates
    const citiesData = Object.values(cityMap)
      .filter(c => c.lats.length > 0)
      .map(c => ({
        city: c.city,
        state: c.state,
        lat: c.lats.reduce((a, b) => a + b, 0) / c.lats.length,
        lng: c.lngs.reduce((a, b) => a + b, 0) / c.lngs.length,
        hospitalCount: c.hospitalCount
      }))
      .sort((a, b) => a.city.localeCompare(b.city));

    res.json({ 
      success: true, 
      data: citiesData,
      count: citiesData.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
