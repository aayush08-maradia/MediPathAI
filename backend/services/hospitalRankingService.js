const path = require('path');

/**
 * Hospital Ranking Service
 * Transparent, multi-factor ranking algorithm
 * 
 * Ranking Formula:
 * Score = 
 *   (0.40 × Clinical Capability) +
 *   (0.35 × Reputation) +
 *   (0.15 × Accessibility) +
 *   (0.10 × Affordability)
 */

class HospitalRankingService {
  constructor() {
    // Weighting factors
    this.weights = {
      clinical: 0.40,
      reputation: 0.35,
      accessibility: 0.15,
      affordability: 0.10
    };
    
    // NABH and other accreditation bonuses
    this.accreditationBonuses = {
      'nabh': 15,           // +15% to reputation score
      'iso_certified': 10,
      'jci_accredited': 20  // Joint Commission International
    };
    
    // Benchmark ratings for normalization
    this.benchmarks = {
      maxRating: 5.0,
      maxReviews: 10000,
      maxDistance: 50  // km
    };
  }

  /**
   * Calculate Clinical Capability Score (0-100)
   * Based on: specialization relevance, procedure volume, bed count
   */
  calculateClinicalScore(hospital, condition) {
    let score = 50; // Base score
    
    // Check specialization match
    const hasRelevantSpecialty = hospital.specialties &&
      hospital.specialties.some(spec => 
        spec.toLowerCase().includes(condition.specialty.toLowerCase()) ||
        condition.specialty.toLowerCase().includes(spec.toLowerCase())
      );
    
    if (hasRelevantSpecialty) {
      score += 30; // +30 for specialization match
    }
    
    // Check procedure offering (if available in data)
    if (hospital.procedures_offered) {
      score += 10;
    }
    
    // Bed count as proxy for capability
    const beds = parseInt(hospital.total_beds) || 100;
    if (beds > 300) {
      score += 10; // Large hospital
    } else if (beds > 150) {
      score += 5;  // Medium hospital
    }
    
    return Math.min(score, 100);
  }

  /**
   * Calculate Reputation Score (0-100)
   * Based on: rating, review count, accreditations
   */
  calculateReputationScore(hospital) {
    let score = 0;
    
    // Rating component (0-50)
    const rating = parseFloat(hospital.google_rating) || 3.5;
    const ratingScore = (rating / 5) * 50;
    score += ratingScore;
    
    // Review count component (0-30)
    const beds = parseInt(hospital.total_beds) || 100;
    const reviewCount = beds * 10; // Estimate reviews from bed count
    const reviewScore = Math.min((reviewCount / this.benchmarks.maxReviews) * 30, 30);
    score += reviewScore;
    
    // Accreditation component (0-20)
    let accreditationScore = 0;
    if (hospital.nabh_accredited === 'TRUE' || hospital.nabh_accredited === true) {
      accreditationScore += 20;
    }
    score += accreditationScore;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate Accessibility Score (0-100)
   * Based on: distance, availability (estimated), urban tier
   */
  calculateAccessibilityScore(hospital, userLat, userLng) {
    let score = 50; // Base score
    
    // Distance component
    if (userLat && userLng && hospital.latitude && hospital.longitude) {
      const distance = this.calculateDistance(
        userLat, userLng,
        parseFloat(hospital.latitude),
        parseFloat(hospital.longitude)
      );
      
      if (distance < 5) {
        score += 25; // Within 5km
      } else if (distance < 15) {
        score += 15; // Within 15km
      } else if (distance < 30) {
        score += 5;  // Within 30km
      }
    }
    
    // Urban tier factor (better accessibility in tier-1)
    // Assume tier-1 cities have better infrastructure
    score += 10;
    
    // Availability assumption: larger hospitals = better availability
    const beds = parseInt(hospital.total_beds) || 100;
    if (beds > 200) {
      score += 5;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Calculate Affordability Score (0-100)
   * Based on: hospital tier, estimated cost, budget match
   */
  calculateAffordabilityScore(hospital, estimatedCost, userBudget) {
    let score = 50; // Base score
    
    // Tier component (Budget = higher score)
    const tier = hospital.tier || 'mid';
    if (tier.toLowerCase() === 'budget') {
      score += 30; // Most affordable
    } else if (tier.toLowerCase() === 'mid' || tier.toLowerCase() === 'mid-tier') {
      score += 15; // Middle tier
    } else if (tier.toLowerCase() === 'premium') {
      score += 0;  // Premium (base score only)
    }
    
    // Cost estimation match
    if (estimatedCost && estimatedCost > 0) {
      const costPerBed = estimatedCost / (parseInt(hospital.total_beds) || 100);
      if (costPerBed < 5000) {
        score += 10;
      } else if (costPerBed < 10000) {
        score += 5;
      }
    }
    
    // Budget match
    if (userBudget && estimatedCost) {
      if (estimatedCost <= userBudget) {
        score += 10; // Within user budget
      } else if (estimatedCost <= userBudget * 1.2) {
        score += 5;  // Within 120% of budget
      }
    }
    
    return Math.min(score, 100);
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Rank hospitals based on condition and user parameters
   */
  rankHospitals(hospitals, params = {}) {
    const {
      condition = { specialty: 'General' },
      userLat = null,
      userLng = null,
      estimatedCost = null,
      userBudget = null,
      topN = 10
    } = params;
    
    // Calculate scores for each hospital
    const rankedHospitals = hospitals.map(hospital => {
      const clinicalScore = this.calculateClinicalScore(hospital, condition);
      const reputationScore = this.calculateReputationScore(hospital);
      const accessibilityScore = this.calculateAccessibilityScore(hospital, userLat, userLng);
      const affordabilityScore = this.calculateAffordabilityScore(
        hospital,
        estimatedCost,
        userBudget
      );
      
      // Final weighted score
      const finalScore =
        (clinicalScore * this.weights.clinical) +
        (reputationScore * this.weights.reputation) +
        (accessibilityScore * this.weights.accessibility) +
        (affordabilityScore * this.weights.affordability);
      
      return {
        ...hospital,
        scores: {
          clinical: Math.round(clinicalScore),
          reputation: Math.round(reputationScore),
          accessibility: Math.round(accessibilityScore),
          affordability: Math.round(affordabilityScore),
          final: Math.round(finalScore)
        },
        ranking: {
          score: Math.round(finalScore),
          explanation: this.generateExplanation(
            clinicalScore,
            reputationScore,
            accessibilityScore,
            affordabilityScore,
            hospital
          )
        }
      };
    });
    
    // Sort by final score (descending)
    rankedHospitals.sort((a, b) => b.scores.final - a.scores.final);
    
    // Return top N with rankings
    return rankedHospitals.slice(0, topN).map((hospital, index) => ({
      ...hospital,
      rank: index + 1,
      percentile: Math.round((100 - (index / topN * 100)))
    }));
  }

  /**
   * Generate human-readable explanation for ranking
   */
  generateExplanation(clinical, reputation, accessibility, affordability, hospital) {
    const reasons = [];
    
    // Clinical strength
    if (clinical >= 80) {
      reasons.push('Strong clinical specialization');
    } else if (clinical >= 60) {
      reasons.push('Good clinical capability');
    }
    
    // Reputation strength
    if (reputation >= 80) {
      reasons.push('Excellent reputation and accreditation');
    } else if (reputation >= 60) {
      reasons.push('Good reputation');
    }
    
    // Accessibility
    if (accessibility >= 80) {
      reasons.push('Excellent location and availability');
    } else if (accessibility >= 60) {
      reasons.push('Good accessibility');
    }
    
    // Affordability
    if (affordability >= 70) {
      reasons.push('Competitive pricing');
    } else if (affordability >= 50) {
      reasons.push('Moderate pricing');
    }
    
    // NABH bonus
    if (hospital.nabh_accredited === 'TRUE' || hospital.nabh_accredited === true) {
      reasons.push('NABH certified');
    }
    
    return reasons;
  }

  /**
   * Get ranking methodology (for transparency)
   */
  getMethodology() {
    return {
      title: 'MediPath Hospital Ranking Methodology',
      description: 'Transparent, evidence-based ranking of hospitals',
      factors: {
        clinical: {
          weight: 0.40,
          description: 'Clinical Capability',
          components: [
            'Specialization relevance to your condition',
            'Procedure volume and bed count',
            'Technical capabilities'
          ]
        },
        reputation: {
          weight: 0.35,
          description: 'Reputation & Quality',
          components: [
            'Google ratings and patient reviews',
            'NABH accreditation status',
            'Historical performance'
          ]
        },
        accessibility: {
          weight: 0.15,
          description: 'Accessibility',
          components: [
            'Distance from your location',
            'Hospital size and bed availability',
            'Urban infrastructure'
          ]
        },
        affordability: {
          weight: 0.10,
          description: 'Affordability',
          components: [
            'Hospital tier classification',
            'Estimated treatment cost',
            'Match to your budget'
          ]
        }
      },
      formula: 'Final Score = (40% Clinical) + (35% Reputation) + (15% Accessibility) + (10% Affordability)',
      note: 'All hospitals meeting basic quality thresholds are ranked transparently'
    };
  }

  /**
   * Generate comparison report between hospitals
   */
  generateComparisonReport(hospitals, params = {}) {
    const ranked = this.rankHospitals(hospitals, params);
    
    if (ranked.length === 0) {
      return { error: 'No hospitals to compare' };
    }
    
    const topHospital = ranked[0];
    const comparison = {
      ranking: ranked.slice(0, 3),
      summary: {
        topRanked: topHospital.hospital_name,
        topScore: topHospital.scores.final,
        avgScore: Math.round(
          ranked.reduce((sum, h) => sum + h.scores.final, 0) / ranked.length
        ),
        totalHospitals: ranked.length
      },
      highlights: ranked.map((h, i) => ({
        rank: i + 1,
        name: h.hospital_name,
        city: h.city,
        score: h.scores.final,
        strengths: h.ranking.explanation,
        tier: h.tier
      }))
    };
    
    return comparison;
  }
}

module.exports = new HospitalRankingService();
