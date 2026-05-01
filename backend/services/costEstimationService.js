const path = require('path');
const conditions = require(path.join(__dirname, '../data/conditions.json'));

/**
 * Cost Estimation Service
 * Calculates realistic medical treatment costs based on:
 * - Base procedure costs (from conditions database)
 * - Geographic adjustments (city tier)
 * - Hospital tier adjustments
 * - Age adjustments
 * - Comorbidity adjustments
 * - Complexity factors
 */

class CostEstimationService {
  constructor() {
    this.conditions = conditions.conditions;
    
    // Geographic pricing tiers for India (cost multiplier)
    this.geographicTiers = {
      'tier1_metro': { multiplier: 1.3, cities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'] },
      'tier2_major': { multiplier: 1.0, cities: ['Nagpur', 'Pune', 'Ahmedabad', 'Kolkata', 'Surat'] },
      'tier3_secondary': { multiplier: 0.85, cities: ['Indore', 'Jaipur', 'Lucknow', 'Kanpur'] },
      'tier4_small': { multiplier: 0.7, cities: ['smaller_towns', 'semi_urban'] }
    };
    
    // Hospital tier cost adjustments (relative to Mid-tier baseline)
    this.hospitalTierMultipliers = {
      'Premium': 1.35,
      'Mid-tier': 1.0,
      'Budget': 0.75
    };
  }

  /**
   * Determine geographic tier for a city
   */
  getGeographicTier(city) {
    for (const [tier, data] of Object.entries(this.geographicTiers)) {
      if (data.cities.some(c => c.toLowerCase() === city.toLowerCase())) {
        return { tier, multiplier: data.multiplier };
      }
    }
    // Default to Tier 2 for unknown cities
    return { tier: 'tier2_major', multiplier: 1.0 };
  }

  /**
   * Calculate cost adjustment based on age
   */
  calculateAgeAdjustment(age) {
    if (!age || age < 18 || age > 100) {
      return 1.0; // No adjustment for invalid ages
    }
    
    if (age < 50) return 0.9;
    if (age < 65) return 1.0;
    if (age < 75) return 1.2;
    return 1.35; // Age 75+
  }

  /**
   * Calculate cost adjustment based on comorbidities
   */
  calculateComorbidityAdjustment(conditionId, comorbidities = []) {
    const condition = this.conditions.find(c => c.id === conditionId);
    if (!condition) return 1.0;
    
    let adjustment = 1.0;
    
    comorbidities.forEach(comorbidity => {
      const factor = condition.comorbidityFactors?.[comorbidity.toLowerCase()] || 1.0;
      adjustment *= factor;
    });
    
    return Math.min(adjustment, 2.0); // Cap at 2x multiplier
  }

  /**
   * Calculate complexity adjustment based on severity and other factors
   */
  calculateComplexityAdjustment(conditionId, severity = null) {
    const condition = this.conditions.find(c => c.id === conditionId);
    if (!condition) return 1.0;
    
    const severityMultipliers = {
      'low': 0.8,
      'medium': 1.0,
      'high': 1.25,
      'critical': 1.5
    };
    
    return severityMultipliers[condition.severity] || 1.0;
  }

  /**
   * Calculate ICU stay probability and cost
   */
  calculateICUCost(conditionId, age = null, comorbidities = []) {
    const condition = this.conditions.find(c => c.id === conditionId);
    if (!condition) return { probability: 0, additionalCost: 0 };
    
    let icuProbability = 0.1; // Base 10% for any condition
    
    // High severity = higher ICU probability
    if (condition.severity === 'critical') icuProbability += 0.4;
    else if (condition.severity === 'high') icuProbability += 0.2;
    
    // Age factor
    if (age && age > 65) icuProbability += 0.15;
    
    // Comorbidity factor
    if (comorbidities.length > 0) icuProbability += 0.1;
    
    icuProbability = Math.min(icuProbability, 0.9); // Max 90%
    
    // ICU cost: higher than normal ward
    const ICU_PER_DAY = 30000; // Average ICU rate in India
    const estimatedICUDays = condition.costBase.stayDays || 2;
    const additionalCost = Math.round(icuProbability * estimatedICUDays * ICU_PER_DAY);
    
    return { probability: icuProbability, additionalCost };
  }

  /**
   * Main cost estimation function
   */
  estimateCost(params = {}) {
    const {
      conditionId,
      city = 'Nagpur',
      hospitalTier = 'Mid-tier',
      age = null,
      comorbidities = [],
      includeICU = true
    } = params;
    
    // Get condition
    const condition = this.conditions.find(c => c.id === conditionId);
    if (!condition) {
      return {
        success: false,
        error: `Condition "${conditionId}" not found`
      };
    }
    
    // Get base cost from condition
    const baseCost = { ...condition.costBase };
    
    // Calculate multipliers
    const geoData = this.getGeographicTier(city);
    const hospitalTierMult = this.hospitalTierMultipliers[hospitalTier] || 1.0;
    const ageMult = this.calculateAgeAdjustment(age);
    const comorbidityMult = this.calculateComorbidityAdjustment(conditionId, comorbidities);
    const complexityMult = this.calculateComplexityAdjustment(conditionId);
    
    // Calculate ICU costs
    const icuData = includeICU ? 
      this.calculateICUCost(conditionId, age, comorbidities) : 
      { probability: 0, additionalCost: 0 };
    
    // Apply multipliers to each component
    const procedureMin = Math.round(baseCost.min * geoData.multiplier * hospitalTierMult * complexityMult);
    const procedureMax = Math.round(baseCost.max * geoData.multiplier * hospitalTierMult * complexityMult);
    
    const stayDays = baseCost.stayDays;
    const perDay = Math.round(baseCost.perDay * geoData.multiplier * hospitalTierMult * ageMult);
    const stayCost = stayDays * perDay;
    
    const diagnostics = Math.round(baseCost.diagnostics * geoData.multiplier * hospitalTierMult);
    const medicines = Math.round(baseCost.medicines * geoData.multiplier * hospitalTierMult * comorbidityMult);
    
    // Calculate subtotals
    const subtotalMin = procedureMin + stayCost + diagnostics + medicines;
    const subtotalMax = procedureMax + stayCost + diagnostics + medicines;
    
    // Contingency buffer
    const contingencyPct = baseCost.contingencyPct;
    const contingencyMin = Math.round((subtotalMin * contingencyPct) / 100);
    const contingencyMax = Math.round((subtotalMax * contingencyPct) / 100);
    
    // Add ICU if applicable
    const totalMin = subtotalMin + contingencyMin + (icuData.probability > 0.5 ? icuData.additionalCost : 0);
    const totalMax = subtotalMax + contingencyMax + (icuData.probability > 0.5 ? icuData.additionalCost : 0);
    
    return {
      success: true,
      condition: {
        id: condition.id,
        name: condition.name,
        hindi: condition.hindi,
        icd10: condition.icd10,
        specialty: condition.specialty
      },
      location: {
        city,
        tier: geoData.tier,
        geographicMultiplier: geoData.multiplier
      },
      hospital: {
        tier: hospitalTier,
        tierMultiplier: hospitalTierMult
      },
      patient: {
        age: age || 'Not specified',
        ageMultiplier: ageMult,
        comorbidities: comorbidities.length > 0 ? comorbidities : 'None',
        comorbidityMultiplier: comorbidityMult
      },
      breakdown: {
        procedure: {
          min: procedureMin,
          max: procedureMax,
          label: 'Procedure/Surgery cost'
        },
        hospitalization: {
          days: stayDays,
          perDayRate: perDay,
          total: stayCost,
          label: 'Hospital stay'
        },
        diagnostics: {
          total: diagnostics,
          label: 'Pre and post-procedure tests'
        },
        medicines: {
          total: medicines,
          label: 'Medications and consumables'
        },
        contingency: {
          percentage: contingencyPct,
          min: contingencyMin,
          max: contingencyMax,
          label: 'Contingency buffer for complications'
        },
        icu: {
          probability: Math.round(icuData.probability * 100),
          additionalCost: icuData.additionalCost,
          label: 'Potential ICU charges if required'
        }
      },
      totals: {
        subtotalMin,
        subtotalMax,
        contingencyMin,
        contingencyMax,
        icuAdditional: icuData.additionalCost,
        estimatedMin: totalMin,
        estimatedMax: totalMax,
        midpoint: Math.round((totalMin + totalMax) / 2)
      },
      notes: [
        `These estimates are based on ${hospitalTier} hospitals in ${city}`,
        `Geographic adjustment: ${(geoData.multiplier * 100).toFixed(0)}% of base cost`,
        `Age adjustment: ${(ageMult * 100).toFixed(0)}% multiplier`,
        comorbidities.length > 0 ? `Comorbidity adjustment: ${(comorbidityMult * 100).toFixed(0)}% multiplier` : null,
        `ICU probability: ${Math.round(icuData.probability * 100)}%`,
        'Costs may vary based on individual case complexity and insurance coverage',
        'Always consult with the hospital for confirmed pricing'
      ].filter(Boolean),
      accuracy: {
        variance: '±20%',
        reasoning: 'Based on aggregated hospital data from major providers'
      }
    };
  }

  /**
   * Compare costs across different hospitals and cities
   */
  compareCosts(params = {}) {
    const {
      conditionId,
      cities = ['Mumbai', 'Nagpur', 'Bangalore'],
      hospitalTiers = ['Budget', 'Mid-tier', 'Premium'],
      age = null,
      comorbidities = []
    } = params;
    
    const comparison = {
      condition: conditions.conditions.find(c => c.id === conditionId)?.name,
      estimates: []
    };
    
    cities.forEach(city => {
      hospitalTiers.forEach(tier => {
        const estimate = this.estimateCost({
          conditionId,
          city,
          hospitalTier: tier,
          age,
          comorbidities
        });
        
        if (estimate.success) {
          comparison.estimates.push({
            city,
            tier,
            estimatedMin: estimate.totals.estimatedMin,
            estimatedMax: estimate.totals.estimatedMax,
            midpoint: estimate.totals.midpoint
          });
        }
      });
    });
    
    // Sort by price
    comparison.estimates.sort((a, b) => a.midpoint - b.midpoint);
    
    return comparison;
  }
}

module.exports = new CostEstimationService();
