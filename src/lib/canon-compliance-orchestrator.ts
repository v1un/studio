/**
 * Canon Compliance Orchestrator
 * 
 * Integrates all canon compliance systems to provide comprehensive
 * validation and enhancement for scenario generation.
 */

import { CharacterInitializationEngine, type CharacterInitializationInput } from './character-initialization-engine';
import { WorldStateValidationEngine, type WorldStateValidationInput } from './world-state-validation-engine';
import { LoreConsistencyEngine, type LoreConsistencyInput } from './lore-consistency-engine';
import { NarrativeAuthenticityEngine, type NarrativeAuthenticityInput } from './narrative-authenticity-engine';
import type { CharacterProfile, RawLoreEntry } from '@/types/story';

export interface CanonComplianceInput {
  seriesName: string;
  characterName?: string;
  characterClass?: string;
  useCanonicalStartingConditions: boolean;
  sceneDescription: string;
  currentLocation: string;
  worldFacts: string[];
  generatedLore: RawLoreEntry[];
  timelinePosition?: string;
}

export interface CanonComplianceResult {
  overallComplianceScore: number;
  isCanonCompliant: boolean;
  
  // Enhanced character with canon compliance
  characterProfile: CharacterProfile;
  startingInventory: any[];
  specialConditions: any;
  
  // Validated world state
  validatedWorldFacts: string[];
  worldStateViolations: any[];
  
  // Validated and enhanced lore
  validatedLore: any[];
  enhancedLore: any[];
  loreViolations: any[];
  
  // Narrative authenticity
  narrativeScore: number;
  narrativeViolations: any[];
  correctedNarrative?: string;
  
  // Comprehensive recommendations
  recommendations: string[];
  criticalIssues: string[];
  
  // Compliance breakdown
  complianceBreakdown: {
    characterCompliance: number;
    worldStateCompliance: number;
    loreCompliance: number;
    narrativeCompliance: number;
  };
}

export class CanonComplianceOrchestrator {
  private characterEngine: CharacterInitializationEngine;
  private worldStateEngine: WorldStateValidationEngine;
  private loreEngine: LoreConsistencyEngine;
  private narrativeEngine: NarrativeAuthenticityEngine;
  
  constructor(seriesName: string) {
    this.characterEngine = new CharacterInitializationEngine(seriesName);
    this.worldStateEngine = new WorldStateValidationEngine(seriesName);
    this.loreEngine = new LoreConsistencyEngine(seriesName);
    this.narrativeEngine = new NarrativeAuthenticityEngine(seriesName);
  }

  async validateAndEnhanceScenario(input: CanonComplianceInput): Promise<CanonComplianceResult> {
    console.log(`[CanonComplianceOrchestrator] Starting comprehensive validation for ${input.seriesName}`);
    
    // Phase 1: Character Initialization with Canon Compliance
    const characterResult = await this.validateCharacterCompliance(input);
    
    // Phase 2: World State Validation
    const worldStateResult = await this.validateWorldState(input, characterResult.characterProfile);
    
    // Phase 3: Lore Consistency Validation
    const loreResult = await this.validateLoreConsistency(input, characterResult.characterProfile);
    
    // Phase 4: Narrative Authenticity Validation
    const narrativeResult = await this.validateNarrativeAuthenticity(input, characterResult.characterProfile);
    
    // Phase 5: Compile comprehensive results
    return this.compileComprehensiveResults(
      input,
      characterResult,
      worldStateResult,
      loreResult,
      narrativeResult
    );
  }

  private async validateCharacterCompliance(input: CanonComplianceInput) {
    const characterInput: CharacterInitializationInput = {
      seriesName: input.seriesName,
      characterName: input.characterName,
      characterClass: input.characterClass,
      useCanonicalStartingConditions: input.useCanonicalStartingConditions,
    };
    
    return await this.characterEngine.initializeCharacter(characterInput);
  }

  private async validateWorldState(input: CanonComplianceInput, characterProfile: CharacterProfile) {
    const worldStateInput: WorldStateValidationInput = {
      seriesName: input.seriesName,
      currentLocation: input.currentLocation,
      sceneDescription: input.sceneDescription,
      worldFacts: input.worldFacts,
      characterKnowledge: characterProfile.skillsAndAbilities?.map(skill => skill.name) || [],
      timelinePosition: input.timelinePosition || 'Series beginning',
    };
    
    return await this.worldStateEngine.validateWorldState(worldStateInput);
  }

  private async validateLoreConsistency(input: CanonComplianceInput, characterProfile: CharacterProfile) {
    const loreInput: LoreConsistencyInput = {
      seriesName: input.seriesName,
      generatedLore: input.generatedLore,
      characterProfile,
      worldContext: {
        currentLocation: input.currentLocation,
        timelinePosition: input.timelinePosition || 'Series beginning',
        establishedFacts: input.worldFacts,
      },
    };
    
    return await this.loreEngine.validateAndEnhanceLore(loreInput);
  }

  private async validateNarrativeAuthenticity(input: CanonComplianceInput, characterProfile: CharacterProfile) {
    const narrativeInput: NarrativeAuthenticityInput = {
      seriesName: input.seriesName,
      sceneDescription: input.sceneDescription,
      characterProfile,
      informationRevealed: input.worldFacts,
      characterPerspective: characterProfile.description || '',
    };
    
    return await this.narrativeEngine.validateNarrativeAuthenticity(narrativeInput);
  }

  private compileComprehensiveResults(
    input: CanonComplianceInput,
    characterResult: any,
    worldStateResult: any,
    loreResult: any,
    narrativeResult: any
  ): CanonComplianceResult {
    
    // Calculate compliance scores
    const characterCompliance = characterResult.canonCompliance.isCanonical ? 100 : 70;
    const worldStateCompliance = this.calculateWorldStateScore(worldStateResult);
    const loreCompliance = loreResult.consistencyReport.overallScore;
    const narrativeCompliance = narrativeResult.authenticityScore;
    
    // Calculate overall compliance score
    const overallComplianceScore = this.calculateOverallScore({
      characterCompliance,
      worldStateCompliance,
      loreCompliance,
      narrativeCompliance,
    });
    
    // Determine if scenario is canon compliant
    const isCanonCompliant = overallComplianceScore >= 80 && 
      this.hasNoCriticalIssues(characterResult, worldStateResult, loreResult, narrativeResult);
    
    // Compile all recommendations
    const recommendations = this.compileRecommendations(
      characterResult,
      worldStateResult,
      loreResult,
      narrativeResult
    );
    
    // Identify critical issues
    const criticalIssues = this.identifyCriticalIssues(
      characterResult,
      worldStateResult,
      loreResult,
      narrativeResult
    );
    
    return {
      overallComplianceScore,
      isCanonCompliant,
      
      characterProfile: characterResult.characterProfile,
      startingInventory: characterResult.startingInventory,
      specialConditions: characterResult.specialConditions,
      
      validatedWorldFacts: worldStateResult.correctedWorldFacts || input.worldFacts,
      worldStateViolations: worldStateResult.violations,
      
      validatedLore: loreResult.validatedLore,
      enhancedLore: loreResult.enhancedLore,
      loreViolations: loreResult.consistencyReport.violations,
      
      narrativeScore: narrativeResult.authenticityScore,
      narrativeViolations: narrativeResult.violations,
      correctedNarrative: narrativeResult.correctedNarrative,
      
      recommendations,
      criticalIssues,
      
      complianceBreakdown: {
        characterCompliance,
        worldStateCompliance,
        loreCompliance,
        narrativeCompliance,
      },
    };
  }

  private calculateWorldStateScore(worldStateResult: any): number {
    const { canonCompliance } = worldStateResult;
    
    let score = 100;
    
    if (canonCompliance.timelineAccuracy === 'major_deviation') score -= 30;
    else if (canonCompliance.timelineAccuracy === 'minor_deviation') score -= 15;
    
    if (canonCompliance.worldStateConsistency === 'major_issues') score -= 25;
    else if (canonCompliance.worldStateConsistency === 'minor_issues') score -= 10;
    
    if (canonCompliance.loreCompliance === 'major_violations') score -= 20;
    else if (canonCompliance.loreCompliance === 'minor_violations') score -= 8;
    
    return Math.max(0, score);
  }

  private calculateOverallScore(scores: any): number {
    const weights = {
      characterCompliance: 0.3,  // 30% - most important for starting conditions
      worldStateCompliance: 0.25, // 25% - critical for timeline accuracy
      loreCompliance: 0.25,      // 25% - essential for canon consistency
      narrativeCompliance: 0.2,  // 20% - important for authenticity
    };
    
    return Math.round(
      scores.characterCompliance * weights.characterCompliance +
      scores.worldStateCompliance * weights.worldStateCompliance +
      scores.loreCompliance * weights.loreCompliance +
      scores.narrativeCompliance * weights.narrativeCompliance
    );
  }

  private hasNoCriticalIssues(...results: any[]): boolean {
    for (const result of results) {
      if (result.violations) {
        const criticalViolations = result.violations.filter((v: any) => v.severity === 'critical');
        if (criticalViolations.length > 0) return false;
      }
      if (result.consistencyReport?.violations) {
        const criticalViolations = result.consistencyReport.violations.filter((v: any) => v.severity === 'critical');
        if (criticalViolations.length > 0) return false;
      }
    }
    return true;
  }

  private compileRecommendations(...results: any[]): string[] {
    const allRecommendations: string[] = [];
    
    for (const result of results) {
      if (result.recommendations) {
        allRecommendations.push(...result.recommendations);
      }
      if (result.canonCompliance?.validationNotes) {
        allRecommendations.push(...result.canonCompliance.validationNotes);
      }
    }
    
    // Remove duplicates and prioritize
    const uniqueRecommendations = Array.from(new Set(allRecommendations));
    
    // Sort by priority (critical issues first)
    return uniqueRecommendations.sort((a, b) => {
      const aPriority = a.toLowerCase().includes('critical') ? 0 : 
                      a.toLowerCase().includes('address') ? 1 : 2;
      const bPriority = b.toLowerCase().includes('critical') ? 0 : 
                      b.toLowerCase().includes('address') ? 1 : 2;
      return aPriority - bPriority;
    });
  }

  private identifyCriticalIssues(...results: any[]): string[] {
    const criticalIssues: string[] = [];
    
    for (const result of results) {
      if (result.violations) {
        const critical = result.violations.filter((v: any) => v.severity === 'critical');
        criticalIssues.push(...critical.map((v: any) => v.description));
      }
      if (result.consistencyReport?.violations) {
        const critical = result.consistencyReport.violations.filter((v: any) => v.severity === 'critical');
        criticalIssues.push(...critical.map((v: any) => v.description));
      }
    }
    
    return criticalIssues;
  }
}

// Export convenience function
export async function validateScenarioCanonCompliance(
  input: CanonComplianceInput
): Promise<CanonComplianceResult> {
  const orchestrator = new CanonComplianceOrchestrator(input.seriesName);
  return await orchestrator.validateAndEnhanceScenario(input);
}

// Export function to check if series supports canon compliance
export function seriesSupportsCanonCompliance(seriesName: string): boolean {
  const { getSeriesConfig } = require('./series-adapter');
  const config = getSeriesConfig(seriesName);
  return !!config.canonCompliance;
}

// Export function to get canon compliance features for a series
export function getCanonComplianceFeatures(seriesName: string): string[] {
  const { getSeriesConfig } = require('./series-adapter');
  const config = getSeriesConfig(seriesName);
  
  if (!config.canonCompliance) return [];
  
  const features: string[] = [];
  
  if (config.canonCompliance.characterStartingConditions?.length > 0) {
    features.push('Character Starting Conditions');
  }
  if (config.canonCompliance.worldStateValidation?.length > 0) {
    features.push('World State Validation');
  }
  if (config.canonCompliance.timelineAccuracy?.length > 0) {
    features.push('Timeline Accuracy');
  }
  if (config.canonCompliance.loreConsistencyChecks?.length > 0) {
    features.push('Lore Consistency Checks');
  }
  if (config.canonCompliance.narrativeAuthenticity?.length > 0) {
    features.push('Narrative Authenticity');
  }
  
  return features;
}
