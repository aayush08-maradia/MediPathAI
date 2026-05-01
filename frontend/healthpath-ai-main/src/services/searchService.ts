/**
 * Search Service - Orchestrates the complete healthcare search pipeline
 * 
 * Flow: NLP → Cost Estimation → Hospital Ranking → Confidence Scoring
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export interface SearchRequest {
  symptomDescription: string;
  location: string;
  age?: number;
  gender?: string;
  comorbidities?: string[];
  budget?: { min: number; max: number };
}

export interface SearchResult {
  nlp: {
    success: boolean;
    topCondition: {
      name: string;
      icdCode: string;
      specialty: string;
      confidence: number;
    };
    alternatives: any[];
    extractedKeywords: string[];
    isEmergency: boolean;
    emergencyMessage?: string;
  };
  cost: {
    success: boolean;
    condition: string;
    location: string;
    estimates: Array<{
      hospital: string;
      estimatedMin: number;
      estimatedMax: number;
      breakdown: any;
    }>;
  };
  ranking: {
    success: boolean;
    hospitals: Array<{
      id: string;
      name: string;
      score: number;
      distance: number;
      rating: number;
    }>;
  };
  confidence: {
    success: boolean;
    overall: number;
    level: string;
    components: {
      clinical: { score: number; weight: number };
      affordability: { score: number; weight: number };
      accessibility: { score: number; weight: number };
      reputation: { score: number; weight: number };
      nabh: { score: number; weight: number };
    };
    breakdown: string[];
  };
  error?: string;
}

/**
 * Execute complete search pipeline
 */
export async function performSearch(request: SearchRequest): Promise<SearchResult> {
  try {
    // Step 1: NLP Processing
    console.log("🔍 Step 1: NLP Processing...");
    const nlpResult = await performNLPAnalysis(request.symptomDescription, request.location);
    
    if (!nlpResult.success) {
      throw new Error("NLP processing failed");
    }

    // Emergency check
    if (nlpResult.nlp.isEmergency) {
      return {
        nlp: nlpResult.nlp,
        cost: { success: false, estimates: [], condition: "", location: "" },
        ranking: { success: false, hospitals: [] },
        confidence: { success: false, overall: 0, level: "", components: {}, breakdown: [] },
        error: nlpResult.nlp.emergencyMessage
      };
    }

    // Step 2: Cost Estimation
    console.log("💰 Step 2: Cost Estimation...");
    const costResult = await estimateCosts({
      condition: nlpResult.nlp.topCondition.name,
      location: request.location,
      age: request.age,
      comorbidities: request.comorbidities,
      budget: request.budget
    });

    // Step 3: Hospital Ranking
    console.log("🏥 Step 3: Hospital Ranking...");
    const rankingResult = await rankHospitals({
      condition: nlpResult.nlp.topCondition.name,
      specialty: nlpResult.nlp.topCondition.specialty,
      location: request.location,
      budget: request.budget
    });

    // Step 4: Confidence Scoring
    console.log("📊 Step 4: Confidence Scoring...");
    const confidenceResult = await calculateConfidence({
      hospitals: rankingResult.ranking.hospitals,
      condition: {
        name: nlpResult.nlp.topCondition.name,
        specialty: nlpResult.nlp.topCondition.specialty,
        icdCode: nlpResult.nlp.topCondition.icdCode
      },
      costEstimate: costResult.cost,
      userInfo: {
        age: request.age,
        gender: request.gender,
        comorbidities: request.comorbidities,
        budget: request.budget,
        location: request.location
      }
    });

    console.log("✅ Search Complete!");

    return {
      nlp: nlpResult.nlp,
      cost: costResult.cost,
      ranking: rankingResult.ranking,
      confidence: confidenceResult.confidence
    };
  } catch (error) {
    console.error("❌ Search Error:", error);
    return {
      nlp: { success: false, topCondition: {}, alternatives: [], extractedKeywords: [], isEmergency: false },
      cost: { success: false, estimates: [], condition: "", location: "" },
      ranking: { success: false, hospitals: [] },
      confidence: { success: false, overall: 0, level: "", components: {}, breakdown: [] },
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Step 1: NLP Analysis
 */
async function performNLPAnalysis(symptomDescription: string, location: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/nlp/map-condition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symptoms: symptomDescription,
        location
      })
    });

    if (!response.ok) {
      throw new Error(`NLP API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      nlp: {
        success: data.success,
        topCondition: data.topCondition || {},
        alternatives: data.alternatives || [],
        extractedKeywords: data.extractedKeywords || [],
        isEmergency: data.isEmergency || false,
        emergencyMessage: data.emergencyMessage
      }
    };
  } catch (error) {
    console.error("NLP Error:", error);
    return {
      success: false,
      nlp: {
        success: false,
        topCondition: {},
        alternatives: [],
        extractedKeywords: [],
        isEmergency: false
      }
    };
  }
}

/**
 * Step 2: Cost Estimation
 */
async function estimateCosts(params: any) {
  try {
    const response = await fetch(`${API_BASE_URL}/cost/estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`Cost API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      cost: {
        success: data.success,
        condition: data.condition,
        location: data.location,
        estimates: data.estimates || [],
        totals: data.totals || {}
      }
    };
  } catch (error) {
    console.error("Cost Estimation Error:", error);
    return {
      success: false,
      cost: {
        success: false,
        condition: "",
        location: "",
        estimates: [],
        totals: {}
      }
    };
  }
}

/**
 * Step 3: Hospital Ranking
 */
async function rankHospitals(params: any) {
  try {
    const response = await fetch(`${API_BASE_URL}/ranking/rank`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`Ranking API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      ranking: {
        success: data.success,
        hospitals: data.hospitals || [],
        methodology: data.methodology
      }
    };
  } catch (error) {
    console.error("Hospital Ranking Error:", error);
    return {
      success: false,
      ranking: {
        success: false,
        hospitals: []
      }
    };
  }
}

/**
 * Step 4: Confidence Scoring (H-SCORE formula)
 */
async function calculateConfidence(params: any) {
  try {
    const response = await fetch(`${API_BASE_URL}/confidence/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hospitals: params.hospitals,
        condition: params.condition,
        costEstimate: params.costEstimate,
        userInfo: params.userInfo
      })
    });

    if (!response.ok) {
      throw new Error(`Confidence API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      confidence: {
        success: data.success,
        overall: data.confidence?.overall || 0,
        level: data.confidence?.level?.label || "Unknown",
        components: data.confidence?.components || {},
        breakdown: data.confidence?.breakdown || [],
        formula: data.confidence?.formula
      }
    };
  } catch (error) {
    console.error("Confidence Scoring Error:", error);
    return {
      success: false,
      confidence: {
        success: false,
        overall: 0,
        level: "Error",
        components: {},
        breakdown: ["Error calculating confidence score"]
      }
    };
  }
}

/**
 * Get confidence improvement suggestions
 */
export async function getConfidenceSuggestions(confidenceResult: any) {
  try {
    const response = await fetch(`${API_BASE_URL}/confidence/improve-suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confidenceResult })
    });

    if (!response.ok) {
      throw new Error("Failed to fetch suggestions");
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error("Suggestions Error:", error);
    return [];
  }
}

/**
 * Validate search input before processing
 */
export function validateSearchInput(request: SearchRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.symptomDescription || request.symptomDescription.trim().length < 3) {
    errors.push("Please describe your symptoms in at least 3 characters");
  }

  if (!request.location || request.location.trim().length < 2) {
    errors.push("Please specify your location");
  }

  if (request.age && (request.age < 1 || request.age > 120)) {
    errors.push("Age must be between 1 and 120");
  }

  if (request.budget?.min && request.budget?.max && request.budget.min > request.budget.max) {
    errors.push("Minimum budget cannot exceed maximum budget");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format cost values for display
 */
export function formatCost(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}K`;
  }
  return `₹${amount}`;
}

/**
 * Get confidence level color
 */
export function getConfidenceColor(score: number): string {
  if (score >= 80) return "green";
  if (score >= 60) return "orange";
  if (score >= 40) return "yellow";
  return "red";
}
