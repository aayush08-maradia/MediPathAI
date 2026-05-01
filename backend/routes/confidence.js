const express = require('express');
const router = express.Router();
const confidenceScoringService = require('../services/confidenceScoringService');

/**
 * POST /api/confidence/calculate
 * Calculate confidence score using H-SCORE formula
 * 
 * H = [C×0.30] + [A×0.25] + [X×0.15] + [R×0.20] + [N×0.10]
 * 
 * Request body:
 * {
 *   "hospitals": [ ... ],           // Available hospitals array
 *   "condition": {                  // Medical condition details
 *     "name": "Chest Pain",
 *     "specialty": "Cardiology",
 *     "icdCode": "R07"
 *   },
 *   "costEstimate": {               // Cost estimation result
 *     "totals": {
 *       "estimatedMin": 100000,
 *       "estimatedMax": 500000
 *     }
 *   },
 *   "userInfo": {                   // User-provided information
 *     "age": 55,
 *     "gender": "male",
 *     "comorbidities": ["diabetes"],
 *     "budget": { "min": 100000, "max": 300000 },
 *     "insuranceType": "private"
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "confidence": {
 *     "overall": 78,
 *     "level": { "label": "High", "color": "green" },
 *     "components": { C, A, X, R, N },
 *     "breakdown": [ ... ],
 *     "formula": "H = [C×0.30] + [A×0.25] + [X×0.15] + [R×0.20] + [N×0.10]"
 *   }
 * }
 */
router.post('/calculate', (req, res) => {
  try {
    const {
      hospitals = [],
      condition = {},
      costEstimate = {},
      userInfo = {}
    } = req.body;
    
    // Validate required inputs
    if (!hospitals || !Array.isArray(hospitals)) {
      return res.status(400).json({
        success: false,
        error: 'Hospitals array is required'
      });
    }
    
    const confidenceResult = confidenceScoringService.calculateConfidenceScore({
      hospitals,
      condition,
      costEstimate,
      userInfo
    });
    
    res.json({
      success: true,
      confidence: confidenceResult
    });
  } catch (error) {
    console.error('Confidence Calculation Error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during confidence calculation',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/confidence/improve-suggestions
 * Get suggestions to improve confidence score
 * 
 * Request body:
 * {
 *   "confidenceResult": { ... }  // Result from /calculate endpoint
 * }
 */
router.post('/improve-suggestions', (req, res) => {
  try {
    const { confidenceResult = {} } = req.body;
    
    if (!confidenceResult.components) {
      return res.status(400).json({
        success: false,
        error: 'Invalid confidence result provided'
      });
    }
    
    const suggestions = confidenceScoringService.getConfidenceImprovementSuggestions(
      confidenceResult
    );
    
    res.json({
      success: true,
      suggestions,
      message: 'Here are ways to improve the accuracy of our recommendations'
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
 * POST /api/confidence/quick-score
 * Calculate a quick confidence score with minimal input
 * 
 * Request body:
 * {
 *   "inputClarity": 85,
 *   "marketCoverage": 75,
 *   "dataCompleteness": 60
 * }
 */
router.post('/quick-score', (req, res) => {
  try {
    const {
      inputClarity = 70,
      dataCompleteness = 50,
      marketCoverage = 70
    } = req.body;
    
    // Quick calculation with defaults
    const confidenceResult = confidenceScoringService.calculateConfidenceScore({
      nlpResult: { confidence: inputClarity },
      userInfo: { completenessScore: dataCompleteness },
      hospitals: Array(Math.max(5, Math.floor(marketCoverage / 10))).fill({}),
      condition: {}
    });
    
    res.json({
      success: true,
      confidence: confidenceResult
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
 * GET /api/confidence/methodology
 * Get confidence scoring methodology
 */
router.get('/methodology', (req, res) => {
  try {
    const methodology = {
      title: 'MediPath Confidence Scoring',
      description: 'How confident should you be in our recommendations?',
      factors: {
        'Input Clarity (30%)': 'How well-defined is your medical condition?',
        'Data Completeness (25%)': 'How much personal health info did you provide?',
        'Market Coverage (20%)': 'How many hospitals are available in your area?',
        'Data Freshness (15%)': 'How current is our hospital and cost data?',
        'Historical Accuracy (10%)': 'How accurate were our past estimates?'
      },
      levels: {
        'High (80+%)': '✓ Highly reliable recommendations based on strong data',
        'Medium (60-79%)': '◐ Reasonably reliable, but verify with hospitals',
        'Low (40-59%)': '◑ Use with caution, consult medical professionals',
        'Very Low (<40%)': '✕ Insufficient data for reliable recommendations'
      },
      note: 'Confidence scores are for decision support only. Always consult qualified medical professionals.'
    };
    
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

module.exports = router;
