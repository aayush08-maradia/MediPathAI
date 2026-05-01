const path = require('path');
const Fuse = require('fuse.js');

// Load conditions database
const conditions = require(path.join(__dirname, '../data/conditions.json'));

/**
 * NLP Service - Maps user symptoms to medical conditions
 * Supports English and Hindi input
 */

class NLPService {
  constructor() {
    this.conditions = conditions.conditions;
    this.procedures = conditions.procedures;
    this.specialties = conditions.specialties;
    
    // Build fuzzy search index for symptoms
    this.symptomIndex = this.buildSymptomIndex();
    
    // Emergency keywords that should trigger alerts
    this.emergencyKeywords = [
      'chest pain', 'difficulty breathing', 'unable to breathe', 'severe pain',
      'loss of consciousness', 'fainting', 'severe bleeding', 'difficulty swallowing',
      'stroke', 'heart attack', 'choking', 'poisoning', 'overdose',
      'सीने में दर्द', 'साँस लेने में कठिनाई', 'गंभीर दर्द', 'बेहोशी'
    ];
    
    // Hindi to English symptom mapping
    this.hindiMappings = {
      'सीने में दर्द': 'chest pain',
      'सीने में परेशानी': 'chest discomfort',
      'चलते समय दर्द': 'exertional pain',
      'साँस लेने में कठिनाई': 'shortness of breath',
      'पेट में दर्द': 'abdominal pain',
      'सिरदर्द': 'headache',
      'बुखार': 'fever',
      'खांसी': 'cough',
      'उल्टी': 'vomiting',
      'गले में दर्द': 'sore throat',
      'दस्त': 'diarrhea',
      'वजन में कमी': 'weight loss',
      'थकान': 'fatigue',
      'चक्कर आना': 'dizziness',
      'सूजन': 'swelling',
      'घुटने में दर्द': 'knee pain'
    };
  }

  /**
   * Build fuzzy search index from all symptoms
   */
  buildSymptomIndex() {
    const allSymptoms = [];
    
    this.conditions.forEach(condition => {
      condition.symptoms.forEach(symptom => {
        allSymptoms.push({
          text: symptom,
          conditionId: condition.id,
          type: 'english'
        });
      });
      
      if (condition.hindiSymptoms) {
        condition.hindiSymptoms.forEach(symptom => {
          allSymptoms.push({
            text: symptom,
            conditionId: condition.id,
            type: 'hindi'
          });
        });
      }
    });
    
    return new Fuse(allSymptoms, {
      keys: ['text'],
      threshold: 0.3,
      includeScore: true
    });
  }

  /**
   * Extract keywords from user input
   */
  extractKeywords(input) {
    // Remove special characters and split
    const keywords = input
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F]/g, '') // Keep Devanagari characters
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    return keywords;
  }

  /**
   * Translate Hindi to English
   */
  translateHindiSymptoms(input) {
    let translated = input;
    Object.keys(this.hindiMappings).forEach(hindi => {
      const regex = new RegExp(hindi, 'gi');
      translated = translated.replace(regex, this.hindiMappings[hindi]);
    });
    return translated;
  }

  /**
   * Check if input contains emergency keywords
   */
  detectEmergency(input) {
    const lowerInput = input.toLowerCase();
    
    for (const keyword of this.emergencyKeywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        return {
          isEmergency: true,
          keyword: keyword,
          message: 'This appears to be a medical emergency. Please call 112 (India) or visit the nearest hospital immediately.'
        };
      }
    }
    
    return { isEmergency: false };
  }

  /**
   * Map symptoms to conditions using fuzzy matching
   */
  mapSymptomsToConditions(input) {
    // Check for emergency first
    const emergency = this.detectEmergency(input);
    if (emergency.isEmergency) {
      return {
        success: true,
        emergency: emergency,
        conditions: [],
        confidence: 0
      };
    }
    
    // Translate Hindi to English
    const translated = this.translateHindiSymptoms(input);
    const keywords = this.extractKeywords(translated);
    
    if (keywords.length === 0) {
      return {
        success: false,
        error: 'Could not extract any symptoms from input. Please describe your symptoms clearly.',
        conditions: [],
        confidence: 0
      };
    }
    
    // Search for matching symptoms using fuzzy search
    const matches = [];
    const conditionScores = {};
    
    keywords.forEach(keyword => {
      const results = this.symptomIndex.search(keyword);
      
      results.forEach(result => {
        const { conditionId } = result.item;
        const relevanceScore = 1 - result.score; // Higher is better
        
        if (!conditionScores[conditionId]) {
          conditionScores[conditionId] = {
            score: 0,
            matchCount: 0,
            condition: this.conditions.find(c => c.id === conditionId)
          };
        }
        
        conditionScores[conditionId].score += relevanceScore;
        conditionScores[conditionId].matchCount += 1;
      });
    });
    
    // Calculate confidence and sort
    const rankedConditions = Object.values(conditionScores)
      .map(item => ({
        ...item.condition,
        matchCount: item.matchCount,
        relevanceScore: item.score,
        confidence: Math.round(
          Math.min(100, 
            (item.matchCount * 20 + item.score * 10) / keywords.length
          )
        )
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Return top 3
    
    if (rankedConditions.length === 0) {
      return {
        success: false,
        error: 'Could not map your symptoms to any known condition. Please consult a doctor.',
        conditions: [],
        confidence: 0
      };
    }
    
    // Get the top condition (most confident)
    const topCondition = rankedConditions[0];
    const overallConfidence = topCondition.confidence;
    
    return {
      success: true,
      emergency: { isEmergency: false },
      topCondition: {
        id: topCondition.id,
        name: topCondition.name,
        hindi: topCondition.hindi,
        icd10: topCondition.icd10,
        severity: topCondition.severity,
        specialty: topCondition.specialty,
        recommendedProcedures: topCondition.recommendedProcedures,
        costBase: topCondition.costBase,
        confidence: overallConfidence,
        matchedSymptoms: keywords
      },
      alternatives: rankedConditions.slice(1, 3).map(c => ({
        id: c.id,
        name: c.name,
        confidence: c.confidence
      })),
      confidence: overallConfidence,
      userInput: input,
      translatedInput: translated,
      extractedKeywords: keywords
    };
  }

  /**
   * Get a specific condition by ID
   */
  getCondition(conditionId) {
    return this.conditions.find(c => c.id === conditionId);
  }

  /**
   * Get a procedure by ID
   */
  getProcedure(procedureId) {
    return this.procedures.find(p => p.id === procedureId);
  }

  /**
   * Get all specialties
   */
  getSpecialties() {
    return this.specialties;
  }

  /**
   * Get conditions by specialty
   */
  getConditionsBySpecialty(specialty) {
    return this.conditions.filter(c => c.specialty === specialty);
  }
}

module.exports = new NLPService();
