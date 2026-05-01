const express = require('express');
const router = express.Router();
const costEstimationService = require('../services/costEstimationService');

/**
 * POST /api/cost/estimate
 * Estimate treatment cost for a condition
 * 
 * Request body:
 * {
 *   "conditionId": "cond_001",        // Required
 *   "city": "Nagpur",                 // Default: Nagpur
 *   "hospitalTier": "Mid-tier",       // Premium, Mid-tier, Budget
 *   "age": 55,                        // Optional
 *   "comorbidities": ["diabetes"],    // Optional array
 *   "includeICU": true                // Default: true
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "condition": {...},
 *   "breakdown": {...},
 *   "totals": {...},
 *   "notes": [...]
 * }
 */
router.post('/estimate', (req, res) => {
  try {
    const { 
      conditionId,
      city = 'Nagpur',
      hospitalTier = 'Mid-tier',
      age,
      comorbidities = [],
      includeICU = true
    } = req.body;
    
    if (!conditionId) {
      return res.status(400).json({
        success: false,
        error: 'conditionId is required'
      });
    }
    
    const estimate = costEstimationService.estimateCost({
      conditionId,
      city,
      hospitalTier,
      age,
      comorbidities,
      includeICU
    });
    
    res.json(estimate);
  } catch (error) {
    console.error('Cost Estimation Error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during cost estimation'
    });
  }
});

/**
 * POST /api/cost/compare
 * Compare costs across multiple cities and hospital tiers
 * 
 * Request body:
 * {
 *   "conditionId": "cond_001",
 *   "cities": ["Mumbai", "Nagpur", "Bangalore"],
 *   "hospitalTiers": ["Budget", "Mid-tier", "Premium"],
 *   "age": 55,
 *   "comorbidities": ["diabetes"]
 * }
 */
router.post('/compare', (req, res) => {
  try {
    const {
      conditionId,
      cities = ['Mumbai', 'Nagpur', 'Bangalore'],
      hospitalTiers = ['Budget', 'Mid-tier', 'Premium'],
      age,
      comorbidities = []
    } = req.body;
    
    if (!conditionId) {
      return res.status(400).json({
        success: false,
        error: 'conditionId is required'
      });
    }
    
    const comparison = costEstimationService.compareCosts({
      conditionId,
      cities,
      hospitalTiers,
      age,
      comorbidities
    });
    
    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Cost Comparison Error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during cost comparison'
    });
  }
});

/**
 * GET /api/cost/breakdown/:conditionId
 * Get base cost breakdown for a condition
 */
router.get('/breakdown/:conditionId', (req, res) => {
  try {
    const { conditionId } = req.params;
    
    // Get estimate with default parameters for breakdown info
    const estimate = costEstimationService.estimateCost({
      conditionId,
      city: 'Nagpur',
      hospitalTier: 'Mid-tier'
    });
    
    if (!estimate.success) {
      return res.status(404).json(estimate);
    }
    
    // Return just the breakdown
    res.json({
      success: true,
      condition: estimate.condition,
      breakdown: estimate.breakdown,
      baselineCity: 'Nagpur',
      baselineHospitalTier: 'Mid-tier'
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
 * GET /api/cost/adjustment-factors/:conditionId
 * Get adjustment factors that affect cost for a condition
 */
router.get('/adjustment-factors/:conditionId', (req, res) => {
  try {
    const { conditionId } = req.params;
    
    const factors = {
      geographic: {
        tier1_metro: 1.3,
        tier2_major: 1.0,
        tier3_secondary: 0.85,
        tier4_small: 0.7
      },
      hospitalTier: {
        'Premium': 1.35,
        'Mid-tier': 1.0,
        'Budget': 0.75
      },
      age: {
        'Below 50': 0.9,
        '50-65': 1.0,
        '65-75': 1.2,
        'Above 75': 1.35
      },
      severity: {
        low: 0.8,
        medium: 1.0,
        high: 1.25,
        critical: 1.5
      }
    };
    
    res.json({
      success: true,
      factors,
      note: 'These multipliers are applied to base costs to calculate final estimates'
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
 * POST /api/cost/scenario
 * Run multiple scenarios for cost estimation
 * 
 * Request body:
 * {
 *   "conditionId": "cond_001",
 *   "scenarios": [
 *     { "city": "Mumbai", "hospitalTier": "Premium", "age": 50 },
 *     { "city": "Nagpur", "hospitalTier": "Budget", "age": 65 }
 *   ]
 * }
 */
router.post('/scenario', (req, res) => {
  try {
    const { conditionId, scenarios = [] } = req.body;
    
    if (!conditionId || scenarios.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'conditionId and scenarios array are required'
      });
    }
    
    const results = scenarios.map(scenario => 
      costEstimationService.estimateCost({
        conditionId,
        city: scenario.city,
        hospitalTier: scenario.hospitalTier,
        age: scenario.age,
        comorbidities: scenario.comorbidities
      })
    );
    
    res.json({
      success: true,
      scenarios: results.filter(r => r.success),
      failures: results.filter(r => !r.success)
    });
  } catch (error) {
    console.error('Cost Scenario Error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred'
    });
  }
});

module.exports = router;
