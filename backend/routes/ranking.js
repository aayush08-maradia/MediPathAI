const express = require('express');
const router = express.Router();
const hospitalRankingService = require('../services/hospitalRankingService');
const path = require('path');

// Load hospital data
const hospitals = require(path.join(__dirname, '../data/hospitals.json'));

/**
 * POST /api/ranking/rank
 * Rank hospitals based on condition and user parameters
 * 
 * Request body:
 * {
 *   "condition": { "specialty": "Cardiology" },
 *   "userLat": 21.1458,
 *   "userLng": 79.0882,
 *   "estimatedCost": 200000,
 *   "userBudget": 300000,
 *   "topN": 10
 * }
 */
router.post('/rank', (req, res) => {
  try {
    const {
      condition = { specialty: 'General' },
      userLat = null,
      userLng = null,
      estimatedCost = null,
      userBudget = null,
      topN = 10
    } = req.body;
    
    if (!hospitals || hospitals.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Hospital data not available'
      });
    }
    
    const ranked = hospitalRankingService.rankHospitals(
      hospitals,
      {
        condition,
        userLat,
        userLng,
        estimatedCost,
        userBudget,
        topN
      }
    );
    
    res.json({
      success: true,
      count: ranked.length,
      hospitals: ranked,
      methodology: hospitalRankingService.getMethodology()
    });
  } catch (error) {
    console.error('Ranking Error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during ranking'
    });
  }
});

/**
 * POST /api/ranking/compare
 * Compare specific hospitals
 * 
 * Request body:
 * {
 *   "hospitalIds": ["hosp_001", "hosp_002", "hosp_003"],
 *   "condition": { "specialty": "Cardiology" },
 *   "userBudget": 300000
 * }
 */
router.post('/compare', (req, res) => {
  try {
    const { hospitalIds = [], condition = { specialty: 'General' }, userBudget = null } = req.body;
    
    if (hospitalIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one hospital ID is required'
      });
    }
    
    // Filter hospitals by ID
    const selectedHospitals = hospitals.filter(h => 
      hospitalIds.includes(h.hospital_id)
    );
    
    if (selectedHospitals.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No matching hospitals found'
      });
    }
    
    const comparison = hospitalRankingService.generateComparisonReport(
      selectedHospitals,
      { condition, userBudget }
    );
    
    res.json({
      success: true,
      comparison,
      methodology: hospitalRankingService.getMethodology()
    });
  } catch (error) {
    console.error('Comparison Error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during comparison'
    });
  }
});

/**
 * POST /api/ranking/score-breakdown
 * Get detailed score breakdown for a hospital
 * 
 * Request body:
 * {
 *   "hospitalId": "hosp_001",
 *   "condition": { "specialty": "Cardiology" },
 *   "userLat": 21.1458,
 *   "userLng": 79.0882,
 *   "estimatedCost": 200000,
 *   "userBudget": 300000
 * }
 */
router.post('/score-breakdown', (req, res) => {
  try {
    const {
      hospitalId,
      condition = { specialty: 'General' },
      userLat = null,
      userLng = null,
      estimatedCost = null,
      userBudget = null
    } = req.body;
    
    if (!hospitalId) {
      return res.status(400).json({
        success: false,
        error: 'hospitalId is required'
      });
    }
    
    const hospital = hospitals.find(h => h.hospital_id === hospitalId);
    
    if (!hospital) {
      return res.status(404).json({
        success: false,
        error: `Hospital "${hospitalId}" not found`
      });
    }
    
    // Calculate individual scores
    const clinicalScore = hospitalRankingService.calculateClinicalScore(hospital, condition);
    const reputationScore = hospitalRankingService.calculateReputationScore(hospital);
    const accessibilityScore = hospitalRankingService.calculateAccessibilityScore(
      hospital,
      userLat,
      userLng
    );
    const affordabilityScore = hospitalRankingService.calculateAffordabilityScore(
      hospital,
      estimatedCost,
      userBudget
    );
    
    const finalScore =
      (clinicalScore * 0.40) +
      (reputationScore * 0.35) +
      (accessibilityScore * 0.15) +
      (affordabilityScore * 0.10);
    
    res.json({
      success: true,
      hospital: {
        id: hospital.hospital_id,
        name: hospital.hospital_name,
        city: hospital.city,
        tier: hospital.tier
      },
      scores: {
        clinical: {
          score: Math.round(clinicalScore),
          weight: 0.40,
          factors: [
            'Specialization relevance',
            'Procedure volume',
            'Bed count'
          ]
        },
        reputation: {
          score: Math.round(reputationScore),
          weight: 0.35,
          factors: [
            `Google rating: ${hospital.google_rating || 'N/A'}`,
            `NABH accredited: ${hospital.nabh_accredited === 'TRUE' ? 'Yes' : 'No'}`,
            'Patient reviews'
          ]
        },
        accessibility: {
          score: Math.round(accessibilityScore),
          weight: 0.15,
          factors: [
            `Location accessibility`,
            'Hospital size',
            'Urban infrastructure'
          ]
        },
        affordability: {
          score: Math.round(affordabilityScore),
          weight: 0.10,
          factors: [
            `Hospital tier: ${hospital.tier || 'Mid-tier'}`,
            'Estimated cost match',
            'Budget compatibility'
          ]
        }
      },
      finalScore: Math.round(finalScore),
      explanation: hospitalRankingService.generateExplanation(
        clinicalScore,
        reputationScore,
        accessibilityScore,
        affordabilityScore,
        hospital
      )
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred'
    });
  }
});

/**
 * GET /api/ranking/methodology
 * Get ranking methodology documentation
 */
router.get('/methodology', (req, res) => {
  try {
    const methodology = hospitalRankingService.getMethodology();
    res.json({
      success: true,
      methodology
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred'
    });
  }
});

/**
 * POST /api/ranking/filter
 * Filter hospitals by criteria
 * 
 * Request body:
 * {
 *   "minRating": 4.0,
 *   "tier": "Mid-tier",
 *   "nabhOnly": true,
 *   "city": "Nagpur",
 *   "specialties": ["Cardiology"]
 * }
 */
router.post('/filter', (req, res) => {
  try {
    const {
      minRating = 0,
      tier = null,
      nabhOnly = false,
      city = null,
      specialties = [],
      topN = 50
    } = req.body;
    
    let filtered = hospitals;
    
    // Apply filters
    if (minRating > 0) {
      filtered = filtered.filter(h => 
        parseFloat(h.google_rating || 0) >= minRating
      );
    }
    
    if (tier) {
      filtered = filtered.filter(h => 
        h.tier && h.tier.toLowerCase() === tier.toLowerCase()
      );
    }
    
    if (nabhOnly) {
      filtered = filtered.filter(h => 
        h.nabh_accredited === 'TRUE' || h.nabh_accredited === true
      );
    }
    
    if (city) {
      filtered = filtered.filter(h => 
        h.city && h.city.toLowerCase() === city.toLowerCase()
      );
    }
    
    if (specialties.length > 0) {
      filtered = filtered.filter(h => 
        h.specializations && specialties.some(spec =>
          h.specializations.toLowerCase().includes(spec.toLowerCase())
        )
      );
    }
    
    res.json({
      success: true,
      count: filtered.length,
      hospitals: filtered.slice(0, topN)
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred'
    });
  }
});

module.exports = router;
