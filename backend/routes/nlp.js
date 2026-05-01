const express = require('express');
const router = express.Router();
const nlpService = require('../services/nlpService');

/**
 * POST /api/nlp/map-condition
 * Map user symptoms to medical conditions
 * 
 * Request body:
 * {
 *   "input": "chest pain while walking"  // Can be English or Hindi
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "topCondition": { ... },
 *   "alternatives": [ ... ],
 *   "confidence": 85,
 *   "emergency": { "isEmergency": false }
 * }
 */
router.post('/map-condition', (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a symptom description in the "input" field'
      });
    }
    
    const result = nlpService.mapSymptomsToConditions(input.trim());
    
    // If it's an emergency, respond with appropriate status
    if (result.emergency && result.emergency.isEmergency) {
      return res.status(200).json({
        success: true,
        emergency: result.emergency,
        shouldEscalate: true,
        message: result.emergency.message
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('NLP Error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while processing your request'
    });
  }
});

/**
 * GET /api/nlp/condition/:conditionId
 * Get full details of a specific condition
 */
router.get('/condition/:conditionId', (req, res) => {
  try {
    const { conditionId } = req.params;
    const condition = nlpService.getCondition(conditionId);
    
    if (!condition) {
      return res.status(404).json({
        success: false,
        error: `Condition "${conditionId}" not found`
      });
    }
    
    res.json({
      success: true,
      condition
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
 * GET /api/nlp/specialties
 * Get all available medical specialties
 */
router.get('/specialties', (req, res) => {
  try {
    const specialties = nlpService.getSpecialties();
    res.json({
      success: true,
      specialties
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
 * GET /api/nlp/specialty/:specialty
 * Get all conditions for a specific specialty
 */
router.get('/specialty/:specialty', (req, res) => {
  try {
    const { specialty } = req.params;
    const conditions = nlpService.getConditionsBySpecialty(specialty);
    
    res.json({
      success: true,
      specialty,
      count: conditions.length,
      conditions
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
 * POST /api/nlp/validate-input
 * Validate user input without returning full mapping (for pre-flight checks)
 */
router.post('/validate-input', (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return res.status(400).json({
        valid: false,
        message: 'Input cannot be empty'
      });
    }
    
    // Check for emergency
    const emergency = nlpService.detectEmergency(input);
    
    res.json({
      valid: true,
      length: input.length,
      isEmergency: emergency.isEmergency,
      emergencyMessage: emergency.message || null
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      valid: false,
      message: 'An error occurred'
    });
  }
});

module.exports = router;
