const path = require('path');

/**
 * Confidence Scoring Service - H-SCORE Formula
 * H = [C×0.30] + [A×0.25] + [X×0.15] + [R×0.20] + [N×0.10]
 * 
 * Where:
 * C = Clinical Capability (30%) - Specialty match, procedure volume, bed count
 * A = Affordability Match (25%) - How well hospitals match user budget
 * X = Accessibility (15%) - Hospital availability in user's area
 * R = Reputation (20%) - Hospital ratings and reviews
 * N = NABH Accreditation (10%) - Quality certifications
 */

class ConfidenceScoringService {
  constructor() {
    this.weights = {
      clinical: 0.30,      // C - Clinical Capability
      affordability: 0.25, // A - Affordability Match
      accessibility: 0.15, // X - Accessibility
      reputation: 0.20,    // R - Reputation
      nabh: 0.10           // N - NABH Accreditation
    };
    
    // Thresholds for different confidence levels
    this.thresholds = {
      high: 80,      // >=80: High confidence
      medium: 60,    // 60-79: Medium confidence
      low: 40,       // 40-59: Low confidence
      veryLow: 0     // <40: Very low confidence
    };
  }

  /**
   * Calculate input clarity score (0-100)
   * Based on: symptom specificity, keyword count, medical terminology
   */
  calculateInputClarity(nlpResult) {
    let score = 50; // Base score
    
    // Confidence from NLP mapping
    if (nlpResult.confidence) {
      score = nlpResult.confidence;
    }
    
    // Bonus for specific symptoms
    if (nlpResult.topCondition) {
      // High confidence in condition = high clarity
      if (nlpResult.topCondition.confidence >= 80) {
        score += 20;
      } else if (nlpResult.topCondition.confidence >= 60) {
        score += 10;
      }
    }
    
    // Penalty for alternatives (indicates ambiguity)
    if (nlpResult.alternatives && nlpResult.alternatives.length > 1) {
      const confidenceDiff = 
        (nlpResult.topCondition?.confidence || 0) - 
        (nlpResult.alternatives[0]?.confidence || 0);
      
      if (confidenceDiff < 20) {
        score -= 15; // Close alternatives = lower clarity
      }
    }
    
    // Bonus for keyword count (more detail = clearer)
    const keywordCount = (nlpResult.extractedKeywords || []).length;
    if (keywordCount > 5) {
      score += 10;
    }
    
    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Calculate data completeness score (0-100)
   * Based on: patient info provided (age, comorbidities, budget)
   */
  calculateDataCompleteness(userInfo = {}) {
    let score = 20; // Base score for providing location
    
    // Age information
    if (userInfo.age) {
      score += 20;
    }
    
    // Gender information
    if (userInfo.gender) {
      score += 10;
    }
    
    // Comorbidities
    if (userInfo.comorbidities && userInfo.comorbidities.length > 0) {
      score += 20;
    }
    
    // Budget information
    if (userInfo.budget) {
      score += 15;
    }
    
    // Insurance information
    if (userInfo.insuranceType) {
      score += 10;
    }
    
    // Prior medical history
    if (userInfo.priorSurgeries || userInfo.allergies) {
      score += 5;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Calculate market coverage score (0-100)
   * Based on: number of hospitals, specialization availability
   */
  calculateMarketCoverage(hospitals = [], condition = {}) {
    let score = 30; // Base score
    
    // Hospital count in area
    if (hospitals.length >= 50) {
      score += 40; // Excellent coverage
    } else if (hospitals.length >= 20) {
      score += 25; // Good coverage
    } else if (hospitals.length >= 10) {
      score += 15; // Moderate coverage
    } else if (hospitals.length >= 5) {
      score += 10; // Limited coverage
    }
    
    // Specialty availability
    const specialty = condition.specialty;
    if (specialty) {
      const specializedHospitals = hospitals.filter(h =>
        h.specializations && 
        h.specializations.toLowerCase().includes(specialty.toLowerCase())
      );
      
      if (specializedHospitals.length >= 10) {
        score += 25;
      } else if (specializedHospitals.length >= 5) {
        score += 15;
      } else if (specializedHospitals.length >= 2) {
        score += 10;
      }
    }
    
    // NABH accredited hospitals
    const nabhHospitals = hospitals.filter(h => h.nabh_accredited === 'TRUE');
    if (nabhHospitals.length >= 5) {
      score += 5;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Calculate data freshness score (0-100)
   * Based on: age of hospital data, cost data, reviews
   */
  calculateDataFreshness() {
    // Since we don't have update timestamps, we'll use reasonable assumptions
    const hospitalDataAge = 0; // Assuming current
    const costDataAge = 7; // Assuming updated weekly
    const reviewDataAge = 30; // Assuming updated monthly
    
    let score = 100;
    
    // Penalties for old data
    if (hospitalDataAge > 90) score -= 20; // Very old
    if (costDataAge > 30) score -= 20;
    if (reviewDataAge > 90) score -= 15;
    
    return Math.max(score, 10); // Never go below 10
  }

  /**
   * Calculate historical accuracy score (0-100)
   * In production, this would track estimate vs. actual costs
   */
  calculateHistoricalAccuracy() {
    // This would be trained on real data over time
    // For now, using reasonable assumption
    return 75; // Conservative 75% accuracy estimate
  }

  /**
   * Calculate Clinical Capability score (0-100)
   * C = Specialty match, procedure volume, bed count
   */
  calculateClinical(hospitals = [], condition = {}) {
    let score = 50; // Base score
    if (!hospitals || hospitals.length === 0) return score;

    const specializedHospitals = hospitals.filter(h =>
      h.specialty_strength && h.specialty_strength.includes(condition.specialty)
    ).length;

    if (specializedHospitals / hospitals.length > 0.8) score += 30;
    else if (specializedHospitals / hospitals.length > 0.5) score += 15;
    else if (specializedHospitals / hospitals.length > 0.2) score += 5;

    const avgBedCount = hospitals.reduce((sum, h) => sum + (h.beds || 0), 0) / hospitals.length;
    if (avgBedCount > 500) score += 15;
    else if (avgBedCount > 200) score += 10;
    else if (avgBedCount > 100) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Calculate Affordability Match score (0-100)
   * A = How well estimated cost matches user budget
   */
  calculateAffordability(costEstimate = {}, userBudget = {}) {
    let score = 50; // Base score
    if (!costEstimate.totals || !userBudget.max) return score;

    const costMidpoint = (costEstimate.totals.estimatedMin + costEstimate.totals.estimatedMax) / 2;

    if (costMidpoint >= (userBudget.min || 0) && costMidpoint <= userBudget.max) {
      score += 40;
    } else if (costMidpoint <= userBudget.max * 1.5 && costMidpoint >= (userBudget.min || 0) * 0.5) {
      score += 20;
    } else {
      score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate Accessibility score (0-100)
   * X = Hospital availability and urban presence
   */
  calculateAccessibility(hospitals = []) {
    let score = 50; // Base score
    if (!hospitals || hospitals.length === 0) return score;

    if (hospitals.length >= 50) score += 30;
    else if (hospitals.length >= 20) score += 20;
    else if (hospitals.length >= 10) score += 10;

    const urbanHospitals = hospitals.filter(h => h.type && (h.type === 'Premium' || h.type === 'Mid-tier')).length;
    if (urbanHospitals / hospitals.length > 0.7) score += 15;
    else if (urbanHospitals / hospitals.length > 0.4) score += 8;

    return Math.min(score, 100);
  }

  /**
   * Calculate Reputation score (0-100)
   * R = Hospital ratings and reviews
   */
  calculateReputation(hospitals = []) {
    let score = 50; // Base score
    if (!hospitals || hospitals.length === 0) return score;

    const avgRating = hospitals.reduce((sum, h) => sum + (h.rating || 3.5), 0) / hospitals.length;
    if (avgRating >= 4.5) score += 30;
    else if (avgRating >= 4.0) score += 20;
    else if (avgRating >= 3.5) score += 10;

    const avgReviews = hospitals.reduce((sum, h) => sum + (h.reviews || 0), 0) / hospitals.length;
    if (avgReviews >= 500) score += 10;
    else if (avgReviews >= 100) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Calculate NABH Accreditation score (0-100)
   * N = Percentage of NABH-accredited hospitals
   */
  calculateNABH(hospitals = []) {
    let score = 40; // Base score
    if (!hospitals || hospitals.length === 0) return score;

    const nabhCount = hospitals.filter(h => h.nabh_accredited === 'TRUE' || h.nabh_accredited === true).length;
    const nabhPercentage = (nabhCount / hospitals.length) * 100;

    if (nabhPercentage >= 80) score += 60;
    else if (nabhPercentage >= 50) score += 40;
    else if (nabhPercentage >= 20) score += 20;
    else if (nabhPercentage > 0) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Calculate overall confidence score using H-SCORE formula
   * H = [C×0.30] + [A×0.25] + [X×0.15] + [R×0.20] + [N×0.10]
   */
  calculateConfidenceScore(params = {}) {
    const {
      hospitals = [],
      condition = {},
      costEstimate = {},
      userInfo = {}
    } = params;
    
    // Calculate component scores using H-SCORE formula
    const clinical = this.calculateClinical(hospitals, condition);
    const affordability = this.calculateAffordability(costEstimate, userInfo);
    const accessibility = this.calculateAccessibility(hospitals);
    const reputation = this.calculateReputation(hospitals);
    const nabh = this.calculateNABH(hospitals);
    
    // H-SCORE: [C×0.30] + [A×0.25] + [X×0.15] + [R×0.20] + [N×0.10]
    const confidenceScore = Math.round(
      (clinical * this.weights.clinical) +
      (affordability * this.weights.affordability) +
      (accessibility * this.weights.accessibility) +
      (reputation * this.weights.reputation) +
      (nabh * this.weights.nabh)
    );
    
    return {
      overall: confidenceScore,
      level: this.getConfidenceLevel(confidenceScore),
      components: {
        clinical: {
          score: clinical,
          weight: this.weights.clinical,
          description: 'Clinical Capability - Specialty match, procedure volume'
        },
        affordability: {
          score: affordability,
          weight: this.weights.affordability,
          description: 'Affordability Match - How well hospitals fit your budget'
        },
        accessibility: {
          score: accessibility,
          weight: this.weights.accessibility,
          description: 'Accessibility - Hospital availability in your area'
        },
        reputation: {
          score: reputation,
          weight: this.weights.reputation,
          description: 'Reputation - Hospital ratings and reviews'
        },
        nabh: {
          score: nabh,
          weight: this.weights.nabh,
          description: 'NABH Accreditation - Quality certifications'
        }
      },
      breakdown: this.generateConfidenceBreakdown(confidenceScore, { clinical, affordability, accessibility, reputation, nabh }),
      formula: 'H = [C×0.30] + [A×0.25] + [X×0.15] + [R×0.20] + [N×0.10]'
    };
  }

  /**
   * Get confidence level label
   */
  getConfidenceLevel(score) {
    if (score >= this.thresholds.high) {
      return { label: 'High', icon: '✓', color: 'green' };
    } else if (score >= this.thresholds.medium) {
      return { label: 'Medium', icon: '◐', color: 'orange' };
    } else if (score >= this.thresholds.low) {
      return { label: 'Low', icon: '◑', color: 'yellow' };
    } else {
      return { label: 'Very Low', icon: '✕', color: 'red' };
    }
  }

  /**
   * Generate human-readable breakdown of confidence score (H-SCORE based)
   */
  generateConfidenceBreakdown(overallScore, components = {}) {
    const { clinical = 0, affordability = 0, accessibility = 0, reputation = 0, nabh = 0 } = components;
    const points = [];
    
    // Clinical capability feedback
    if (clinical >= 80) {
      points.push('✓ Excellent clinical expertise available for your condition');
    } else if (clinical >= 60) {
      points.push('◐ Good clinical capability, but specialized options may be limited');
    } else {
      points.push('✕ Limited clinical expertise for your specific condition');
    }
    
    // Affordability feedback
    if (affordability >= 80) {
      points.push('✓ Hospital costs are well-aligned with your budget');
    } else if (affordability >= 60) {
      points.push('◐ Some hospitals exceed your budget. Consider negotiating or exploring insurance');
    } else {
      points.push('⚠ Most hospitals exceed your budget. Consider nearby areas or budget revision');
    }
    
    // Accessibility feedback
    if (accessibility >= 80) {
      points.push('✓ Excellent hospital availability and accessibility in your area');
    } else if (accessibility >= 60) {
      points.push('◐ Reasonable hospital options available within reasonable distance');
    } else {
      points.push('✕ Limited hospital accessibility in your area');
    }
    
    // Reputation feedback
    if (reputation >= 80) {
      points.push('✓ Highly-rated hospitals with excellent patient reviews');
    } else if (reputation >= 60) {
      points.push('◐ Decent hospital ratings and reviews');
    } else {
      points.push('◐ Hospital ratings available but may be limited');
    }
    
    // NABH accreditation feedback
    if (nabh >= 80) {
      points.push('✓ Most hospitals are NABH-accredited (government certified quality)');
    } else if (nabh >= 40) {
      points.push('◐ Some NABH-accredited hospitals available for your condition');
    } else {
      points.push('◐ Limited NABH-accredited options; check hospital certifications');
    }
    
    // Overall recommendation
    if (overallScore >= 80) {
      points.push('✓ Comprehensive, reliable recommendations. High confidence in results.');
    } else if (overallScore >= 60) {
      points.push('◐ Reasonably reliable recommendations. Verify hospital details before deciding.');
    } else {
      points.push('⚠ Recommendations have limited confidence. Consult medical professionals.');
    }
    
    return points;
  }

  /**
   * Get recommendations to improve confidence score (H-SCORE based)
   */
  getConfidenceImprovementSuggestions(confidenceResult) {
    const suggestions = [];
    const { components = {} } = confidenceResult;
    
    // Clinical capability improvements
    if (components.clinical && components.clinical.score < 70) {
      suggestions.push({
        category: 'Clinical Options',
        suggestions: [
          'Look for hospitals with specialized departments in your specialty',
          'Consider expanding your search to nearby cities for more options',
          'Check if major medical centers nearby have your specialty',
          'Verify hospital credentials and specialist availability'
        ]
      });
    }
    
    // Affordability improvements
    if (components.affordability && components.affordability.score < 70) {
      suggestions.push({
        category: 'Affordability',
        suggestions: [
          'Check if your hospital insurance covers recommended hospitals',
          'Explore payment plans or discounts from hospitals',
          'Consider government hospitals which may be more affordable',
          'Negotiate directly with hospitals for package rates'
        ]
      });
    }
    
    // Accessibility improvements
    if (components.accessibility && components.accessibility.score < 70) {
      suggestions.push({
        category: 'Location & Accessibility',
        suggestions: [
          'Consider telemedicine consultations if distance is an issue',
          'Check hospital transport or emergency services',
          'Look for nearby centers in adjacent cities',
          'Consider home-based recovery support services'
        ]
      });
    }
    
    // Reputation improvements
    if (components.reputation && components.reputation.score < 70) {
      suggestions.push({
        category: 'Hospital Reputation',
        suggestions: [
          'Check Google Maps and Practo reviews for hospitals',
          'Ask for referrals from your doctor',
          'Verify hospital accreditations and certifications',
          'Request patient testimonials from hospitals'
        ]
      });
    }
    
    // NABH accreditation improvements
    if (components.nabh && components.nabh.score < 50) {
      suggestions.push({
        category: 'Quality Certifications',
        suggestions: [
          'Prioritize NABH-accredited hospitals when possible',
          'Check for ISO certifications',
          'Verify hospitals have quality committees',
          'Ask about patient safety protocols'
        ]
      });
    }
    
    return suggestions;
  }
}

module.exports = new ConfidenceScoringService();
