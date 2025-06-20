/**
 * World State Validation Engine
 * 
 * Ensures precise timeline accuracy and world state consistency
 * for canon-compliant scenario generation.
 */

import { getSeriesConfig, type WorldStateRule, type TimelineRule } from '@/lib/series-adapter';

export interface WorldStateValidationInput {
  seriesName: string;
  currentLocation: string;
  sceneDescription: string;
  worldFacts: string[];
  characterKnowledge: string[];
  timelinePosition?: string;
}

export interface WorldStateValidationResult {
  isValid: boolean;
  canonCompliance: {
    timelineAccuracy: 'accurate' | 'minor_deviation' | 'major_deviation';
    worldStateConsistency: 'consistent' | 'minor_issues' | 'major_issues';
    loreCompliance: 'compliant' | 'minor_violations' | 'major_violations';
  };
  violations: ValidationViolation[];
  recommendations: string[];
  correctedWorldFacts?: string[];
}

export interface ValidationViolation {
  category: 'timeline' | 'world_state' | 'lore' | 'character_knowledge';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedElement: string;
  suggestedFix: string;
}

export class WorldStateValidationEngine {
  private seriesConfig: any;
  
  constructor(seriesName: string) {
    this.seriesConfig = getSeriesConfig(seriesName);
  }

  async validateWorldState(input: WorldStateValidationInput): Promise<WorldStateValidationResult> {
    console.log(`[WorldStateValidationEngine] Validating world state for ${input.seriesName}`);
    
    const violations: ValidationViolation[] = [];
    const recommendations: string[] = [];
    
    // Validate timeline accuracy
    const timelineViolations = this.validateTimeline(input);
    violations.push(...timelineViolations);
    
    // Validate world state consistency
    const worldStateViolations = this.validateWorldStateConsistency(input);
    violations.push(...worldStateViolations);
    
    // Validate lore compliance
    const loreViolations = this.validateLoreCompliance(input);
    violations.push(...loreViolations);
    
    // Validate character knowledge consistency
    const knowledgeViolations = this.validateCharacterKnowledge(input);
    violations.push(...knowledgeViolations);
    
    // Generate recommendations
    recommendations.push(...this.generateRecommendations(violations, input));
    
    // Calculate compliance scores
    const canonCompliance = this.calculateComplianceScores(violations);
    
    // Generate corrected world facts if needed
    const correctedWorldFacts = violations.length > 0 ? 
      this.generateCorrectedWorldFacts(input, violations) : undefined;
    
    return {
      isValid: violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0,
      canonCompliance,
      violations,
      recommendations,
      correctedWorldFacts,
    };
  }

  private validateTimeline(input: WorldStateValidationInput): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    
    if (!this.seriesConfig.canonCompliance?.timelineAccuracy) {
      return violations;
    }

    const timelineRules = this.seriesConfig.canonCompliance.timelineAccuracy as TimelineRule[];
    
    for (const rule of timelineRules) {
      if (!rule.isExample) continue; // Only validate against examples for now
      
      // Check if character knowledge matches timeline position
      const hasPrerequisiteKnowledge = rule.characterKnowledgeState.some(knowledge =>
        input.characterKnowledge.some(charKnowledge => 
          charKnowledge.toLowerCase().includes(knowledge.toLowerCase())
        )
      );
      
      if (hasPrerequisiteKnowledge && rule.prerequisiteEvents.length > 0) {
        violations.push({
          category: 'timeline',
          severity: 'high',
          description: `Character has knowledge that shouldn't be available at ${rule.timelinePosition}`,
          affectedElement: 'Character Knowledge',
          suggestedFix: `Remove knowledge of: ${rule.characterKnowledgeState.join(', ')}`
        });
      }
      
      // Check world state requirements
      const missingWorldRequirements = rule.worldStateRequirements.filter(requirement =>
        !input.worldFacts.some(fact => 
          fact.toLowerCase().includes(requirement.toLowerCase())
        )
      );
      
      if (missingWorldRequirements.length > 0) {
        violations.push({
          category: 'world_state',
          severity: 'medium',
          description: `Missing required world state elements for ${rule.timelinePosition}`,
          affectedElement: 'World Facts',
          suggestedFix: `Add world facts about: ${missingWorldRequirements.join(', ')}`
        });
      }
    }
    
    return violations;
  }

  private validateWorldStateConsistency(input: WorldStateValidationInput): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    
    if (!this.seriesConfig.canonCompliance?.worldStateValidation) {
      return violations;
    }

    const worldStateRules = this.seriesConfig.canonCompliance.worldStateValidation as WorldStateRule[];
    
    for (const rule of worldStateRules) {
      if (!rule.isExample) continue;
      
      // Check validation criteria
      const failedCriteria = rule.validationCriteria.filter(criteria =>
        !input.worldFacts.some(fact => 
          fact.toLowerCase().includes(criteria.toLowerCase())
        ) && !input.sceneDescription.toLowerCase().includes(criteria.toLowerCase())
      );
      
      if (failedCriteria.length > 0) {
        violations.push({
          category: 'world_state',
          severity: 'medium',
          description: `World state doesn't meet criteria for ${rule.ruleName}`,
          affectedElement: rule.affectedElements.join(', '),
          suggestedFix: `Ensure world state includes: ${failedCriteria.join(', ')}`
        });
      }
    }
    
    return violations;
  }

  private validateLoreCompliance(input: WorldStateValidationInput): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    
    if (!this.seriesConfig.canonCompliance?.loreConsistencyChecks) {
      return violations;
    }

    const loreRules = this.seriesConfig.canonCompliance.loreConsistencyChecks;
    
    for (const rule of loreRules) {
      if (!rule.isExample) continue;
      
      // Check for common mistakes
      for (const mistake of rule.commonMistakes) {
        const hasMistake = input.worldFacts.some(fact => 
          fact.toLowerCase().includes(mistake.toLowerCase())
        ) || input.sceneDescription.toLowerCase().includes(mistake.toLowerCase());
        
        if (hasMistake) {
          violations.push({
            category: 'lore',
            severity: 'high',
            description: `Common lore mistake detected in ${rule.category}`,
            affectedElement: mistake,
            suggestedFix: `Follow correct implementation: ${rule.correctImplementation.join(', ')}`
          });
        }
      }
      
      // Check validation points
      const missingValidationPoints = rule.validationPoints.filter(point =>
        !input.worldFacts.some(fact => 
          fact.toLowerCase().includes(point.toLowerCase())
        )
      );
      
      if (missingValidationPoints.length > rule.validationPoints.length / 2) {
        violations.push({
          category: 'lore',
          severity: 'medium',
          description: `Missing key lore elements for ${rule.category}`,
          affectedElement: rule.category,
          suggestedFix: `Include lore about: ${missingValidationPoints.join(', ')}`
        });
      }
    }
    
    return violations;
  }

  private validateCharacterKnowledge(input: WorldStateValidationInput): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    
    // Check for anachronistic knowledge
    const modernConcepts = ['internet', 'smartphone', 'computer', 'electricity'];
    const hasModernKnowledge = input.characterKnowledge.some(knowledge =>
      modernConcepts.some(concept => knowledge.toLowerCase().includes(concept))
    );
    
    if (hasModernKnowledge && !input.seriesName.toLowerCase().includes('isekai')) {
      violations.push({
        category: 'character_knowledge',
        severity: 'medium',
        description: 'Character has anachronistic modern world knowledge',
        affectedElement: 'Character Knowledge',
        suggestedFix: 'Remove modern world references or justify with isekai background'
      });
    }
    
    return violations;
  }

  private calculateComplianceScores(violations: ValidationViolation[]): any {
    const timelineViolations = violations.filter(v => v.category === 'timeline');
    const worldStateViolations = violations.filter(v => v.category === 'world_state');
    const loreViolations = violations.filter(v => v.category === 'lore');
    
    const calculateScore = (viols: ValidationViolation[]) => {
      const criticalCount = viols.filter(v => v.severity === 'critical').length;
      const highCount = viols.filter(v => v.severity === 'high').length;
      const mediumCount = viols.filter(v => v.severity === 'medium').length;
      
      if (criticalCount > 0) return 'major_deviation';
      if (highCount > 0) return 'minor_deviation';
      if (mediumCount > 2) return 'minor_deviation';
      return 'accurate';
    };
    
    return {
      timelineAccuracy: calculateScore(timelineViolations),
      worldStateConsistency: calculateScore(worldStateViolations),
      loreCompliance: calculateScore(loreViolations),
    };
  }

  private generateRecommendations(violations: ValidationViolation[], input: WorldStateValidationInput): string[] {
    const recommendations: string[] = [];
    
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      recommendations.push('Address critical canon violations before proceeding');
    }
    
    const timelineIssues = violations.filter(v => v.category === 'timeline');
    if (timelineIssues.length > 0) {
      recommendations.push('Review character starting knowledge and world timeline position');
    }
    
    const loreIssues = violations.filter(v => v.category === 'lore');
    if (loreIssues.length > 0) {
      recommendations.push('Consult series lore documentation for accurate world building');
    }
    
    if (violations.length === 0) {
      recommendations.push('World state validation passed - scenario is canon compliant');
    }
    
    return recommendations;
  }

  private generateCorrectedWorldFacts(input: WorldStateValidationInput, violations: ValidationViolation[]): string[] {
    const correctedFacts = [...input.worldFacts];
    
    // Apply fixes based on violations
    for (const violation of violations) {
      if (violation.category === 'world_state' && violation.suggestedFix.startsWith('Add world facts about:')) {
        const factsToAdd = violation.suggestedFix.replace('Add world facts about: ', '').split(', ');
        correctedFacts.push(...factsToAdd.map(fact => `${fact} (canon compliance correction)`));
      }
    }
    
    return correctedFacts;
  }
}

// Export convenience function
export async function validateWorldStateForCanonCompliance(
  input: WorldStateValidationInput
): Promise<WorldStateValidationResult> {
  const engine = new WorldStateValidationEngine(input.seriesName);
  return await engine.validateWorldState(input);
}
