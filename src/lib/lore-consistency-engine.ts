/**
 * Lore Consistency Engine
 * 
 * Validates and enforces strict canon compliance for lore generation
 * while maintaining generic design patterns for multiple series.
 */

import type { LoreEntry, RawLoreEntry } from '@/types/story';
import { getSeriesConfig, type LoreValidationRule } from '@/lib/series-adapter';
import { generateUUID } from '@/lib/utils';

export interface LoreConsistencyInput {
  seriesName: string;
  generatedLore: RawLoreEntry[];
  characterProfile: any;
  worldContext: {
    currentLocation: string;
    timelinePosition: string;
    establishedFacts: string[];
  };
}

export interface LoreConsistencyResult {
  validatedLore: LoreEntry[];
  consistencyReport: {
    overallScore: number;
    categoryScores: { [category: string]: number };
    violations: LoreViolation[];
    corrections: LoreCorrection[];
  };
  recommendations: string[];
  enhancedLore: LoreEntry[];
}

export interface LoreViolation {
  loreEntryId: string;
  category: string;
  violationType: 'factual_error' | 'timeline_inconsistency' | 'power_scaling_error' | 'cultural_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  conflictingCanon: string;
  suggestedFix: string;
}

export interface LoreCorrection {
  originalEntry: RawLoreEntry;
  correctedEntry: LoreEntry;
  changesApplied: string[];
  canonSource: string;
}

export class LoreConsistencyEngine {
  private seriesConfig: any;
  private loreValidationRules: LoreValidationRule[];
  
  constructor(seriesName: string) {
    this.seriesConfig = getSeriesConfig(seriesName);
    this.loreValidationRules = this.seriesConfig.canonCompliance?.loreConsistencyChecks || [];
  }

  async validateAndEnhanceLore(input: LoreConsistencyInput): Promise<LoreConsistencyResult> {
    console.log(`[LoreConsistencyEngine] Validating lore for ${input.seriesName}`);
    
    const violations: LoreViolation[] = [];
    const corrections: LoreCorrection[] = [];
    const validatedLore: LoreEntry[] = [];
    
    // Process each lore entry
    for (const rawEntry of input.generatedLore) {
      const validationResult = await this.validateLoreEntry(rawEntry, input);
      
      if (validationResult.violations.length > 0) {
        violations.push(...validationResult.violations);
        
        // Apply corrections if possible
        const correctedEntry = await this.correctLoreEntry(rawEntry, validationResult.violations, input);
        if (correctedEntry) {
          corrections.push({
            originalEntry: rawEntry,
            correctedEntry,
            changesApplied: validationResult.violations.map(v => v.suggestedFix),
            canonSource: 'Series canon compliance rules'
          });
          validatedLore.push(correctedEntry);
        } else {
          // Convert to LoreEntry even if not corrected
          validatedLore.push(this.convertToLoreEntry(rawEntry));
        }
      } else {
        validatedLore.push(this.convertToLoreEntry(rawEntry));
      }
    }
    
    // Generate enhanced lore entries for missing canon elements
    const enhancedLore = await this.generateEnhancedCanonLore(input, validatedLore);
    
    // Calculate consistency scores
    const categoryScores = this.calculateCategoryScores(violations);
    const overallScore = this.calculateOverallScore(categoryScores, violations);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(violations, input);
    
    return {
      validatedLore,
      consistencyReport: {
        overallScore,
        categoryScores,
        violations,
        corrections,
      },
      recommendations,
      enhancedLore,
    };
  }

  private async validateLoreEntry(entry: RawLoreEntry, context: LoreConsistencyInput): Promise<{
    violations: LoreViolation[];
    isValid: boolean;
  }> {
    const violations: LoreViolation[] = [];
    
    // Validate against each lore rule category
    for (const rule of this.loreValidationRules) {
      if (!rule.isExample) continue;
      
      // Check for common mistakes
      for (const mistake of rule.commonMistakes) {
        if (entry.content.toLowerCase().includes(mistake.toLowerCase()) ||
            entry.keyword.toLowerCase().includes(mistake.toLowerCase())) {
          violations.push({
            loreEntryId: entry.keyword,
            category: rule.category,
            violationType: 'factual_error',
            severity: 'high',
            description: `Lore entry contains common mistake: ${mistake}`,
            conflictingCanon: mistake,
            suggestedFix: `Apply correct implementation: ${rule.correctImplementation[0] || 'Review canon source'}`
          });
        }
      }
      
      // Validate against validation points
      const relevantValidationPoints = rule.validationPoints.filter(point =>
        entry.keyword.toLowerCase().includes(point.toLowerCase()) ||
        entry.content.toLowerCase().includes(point.toLowerCase())
      );
      
      if (relevantValidationPoints.length > 0) {
        // Check if the entry contradicts validation points
        const contradictions = rule.validationPoints.filter(point => {
          const entryText = (entry.content + ' ' + entry.keyword).toLowerCase();
          return entryText.includes('not ' + point.toLowerCase()) ||
                 entryText.includes('no ' + point.toLowerCase()) ||
                 entryText.includes('without ' + point.toLowerCase());
        });
        
        for (const contradiction of contradictions) {
          violations.push({
            loreEntryId: entry.keyword,
            category: rule.category,
            violationType: 'factual_error',
            severity: 'critical',
            description: `Lore entry contradicts established canon: ${contradiction}`,
            conflictingCanon: contradiction,
            suggestedFix: `Align with canon: ${contradiction}`
          });
        }
      }
    }
    
    // Check timeline consistency
    const timelineViolations = this.validateTimelineConsistency(entry, context);
    violations.push(...timelineViolations);
    
    // Check power scaling consistency
    const powerViolations = this.validatePowerScaling(entry, context);
    violations.push(...powerViolations);
    
    return {
      violations,
      isValid: violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0
    };
  }

  private validateTimelineConsistency(entry: RawLoreEntry, context: LoreConsistencyInput): LoreViolation[] {
    const violations: LoreViolation[] = [];
    
    // Check for anachronistic elements
    const futureEvents = ['royal selection', 'witch cult attack', 'white whale defeat'];
    const entryText = entry.content.toLowerCase();
    
    for (const event of futureEvents) {
      if (entryText.includes(event) && context.worldContext.timelinePosition === 'Series beginning') {
        violations.push({
          loreEntryId: entry.keyword,
          category: 'Timeline',
          violationType: 'timeline_inconsistency',
          severity: 'high',
          description: `Lore entry references future event: ${event}`,
          conflictingCanon: `${event} hasn't occurred yet at ${context.worldContext.timelinePosition}`,
          suggestedFix: `Remove reference to ${event} or adjust timeline context`
        });
      }
    }
    
    return violations;
  }

  private validatePowerScaling(entry: RawLoreEntry, context: LoreConsistencyInput): LoreViolation[] {
    const violations: LoreViolation[] = [];
    
    // Check for power scaling issues
    const overpoweredTerms = ['omnipotent', 'unlimited power', 'infinite', 'invincible'];
    const entryText = entry.content.toLowerCase();
    
    for (const term of overpoweredTerms) {
      if (entryText.includes(term)) {
        violations.push({
          loreEntryId: entry.keyword,
          category: 'Power System',
          violationType: 'power_scaling_error',
          severity: 'medium',
          description: `Lore entry contains overpowered description: ${term}`,
          conflictingCanon: 'Series maintains balanced power scaling',
          suggestedFix: `Replace ${term} with more balanced description`
        });
      }
    }
    
    return violations;
  }

  private async correctLoreEntry(
    entry: RawLoreEntry, 
    violations: LoreViolation[], 
    context: LoreConsistencyInput
  ): Promise<LoreEntry | null> {
    let correctedContent = entry.content;
    let correctedKeyword = entry.keyword;
    
    // Apply corrections based on violations
    for (const violation of violations) {
      if (violation.severity === 'critical' || violation.severity === 'high') {
        // Apply specific corrections
        switch (violation.violationType) {
          case 'factual_error':
            correctedContent = this.applyFactualCorrection(correctedContent, violation);
            break;
          case 'timeline_inconsistency':
            correctedContent = this.applyTimelineCorrection(correctedContent, violation);
            break;
          case 'power_scaling_error':
            correctedContent = this.applyPowerScalingCorrection(correctedContent, violation);
            break;
        }
      }
    }
    
    // Only return corrected entry if significant changes were made
    if (correctedContent !== entry.content || correctedKeyword !== entry.keyword) {
      return {
        id: generateUUID(),
        keyword: correctedKeyword,
        content: correctedContent,
        category: entry.category,
        source: 'AI-Generated-Canon-Corrected',
        createdAt: new Date().toISOString(),
      };
    }
    
    return null;
  }

  private applyFactualCorrection(content: string, violation: LoreViolation): string {
    // Apply specific factual corrections based on canon rules
    const corrections = {
      'magic without gate': 'magic through spirit contracts',
      'unlimited mana': 'limited mana reserves',
      'instant magic': 'magic requiring incantation and focus',
    };
    
    let correctedContent = content;
    for (const [incorrect, correct] of Object.entries(corrections)) {
      if (content.toLowerCase().includes(incorrect)) {
        correctedContent = correctedContent.replace(new RegExp(incorrect, 'gi'), correct);
      }
    }
    
    return correctedContent;
  }

  private applyTimelineCorrection(content: string, violation: LoreViolation): string {
    // Remove or modify timeline-inconsistent references
    const timelineCorrections = {
      'royal selection': 'upcoming political process',
      'witch cult attack': 'potential cult activity',
      'white whale defeat': 'white whale threat',
    };
    
    let correctedContent = content;
    for (const [future, present] of Object.entries(timelineCorrections)) {
      correctedContent = correctedContent.replace(new RegExp(future, 'gi'), present);
    }
    
    return correctedContent;
  }

  private applyPowerScalingCorrection(content: string, violation: LoreViolation): string {
    // Balance overpowered descriptions
    const powerCorrections = {
      'omnipotent': 'extremely powerful',
      'unlimited power': 'great power',
      'infinite': 'vast',
      'invincible': 'very difficult to defeat',
    };
    
    let correctedContent = content;
    for (const [overpowered, balanced] of Object.entries(powerCorrections)) {
      correctedContent = correctedContent.replace(new RegExp(overpowered, 'gi'), balanced);
    }
    
    return correctedContent;
  }

  private async generateEnhancedCanonLore(
    context: LoreConsistencyInput, 
    existingLore: LoreEntry[]
  ): Promise<LoreEntry[]> {
    const enhancedLore: LoreEntry[] = [];
    
    // Generate missing essential lore entries based on series
    const essentialConcepts = this.getEssentialConceptsForSeries(context.seriesName);
    
    for (const concept of essentialConcepts) {
      const exists = existingLore.some(entry => 
        entry.keyword.toLowerCase().includes(concept.toLowerCase()) ||
        entry.content.toLowerCase().includes(concept.toLowerCase())
      );
      
      if (!exists) {
        const enhancedEntry = await this.generateCanonLoreEntry(concept, context);
        if (enhancedEntry) {
          enhancedLore.push(enhancedEntry);
        }
      }
    }
    
    return enhancedLore;
  }

  private getEssentialConceptsForSeries(seriesName: string): string[] {
    if (seriesName === 'Re:Zero') {
      return [
        'Return by Death',
        'Witch\'s Scent',
        'Royal Selection',
        'Spirit Magic',
        'Divine Protections',
        'Lugunica Kingdom',
        'Demi-human Discrimination'
      ];
    }
    
    return [];
  }

  private async generateCanonLoreEntry(concept: string, context: LoreConsistencyInput): Promise<LoreEntry | null> {
    // Generate canon-compliant lore entry for missing concept
    const canonDefinitions: { [key: string]: string } = {
      'Return by Death': 'A mysterious ability that resets time upon the user\'s death, allowing them to return to a previous point with retained memories.',
      'Witch\'s Scent': 'A spiritual miasma that clings to those who use certain abilities, attracting mabeasts and causing unease in sensitive individuals.',
      'Royal Selection': 'The process by which the next ruler of Lugunica will be chosen from five candidates, each bearing a dragon insignia.',
      'Spirit Magic': 'Magic performed through contracts with spirits, bypassing the need for a functional gate.',
      'Divine Protections': 'Innate abilities granted by the world itself, ranging from minor conveniences to powerful combat abilities.',
    };
    
    const definition = canonDefinitions[concept];
    if (definition) {
      return {
        id: generateUUID(),
        keyword: concept,
        content: definition,
        category: 'Canon Essential',
        source: 'Canon-Compliance-Engine',
        createdAt: new Date().toISOString(),
      };
    }
    
    return null;
  }

  private convertToLoreEntry(rawEntry: RawLoreEntry): LoreEntry {
    return {
      id: generateUUID(),
      keyword: rawEntry.keyword,
      content: rawEntry.content,
      category: rawEntry.category,
      source: 'AI-Generated-Validated',
      createdAt: new Date().toISOString(),
    };
  }

  private calculateCategoryScores(violations: LoreViolation[]): { [category: string]: number } {
    const categories = ['Magic System', 'Timeline', 'Power System', 'Cultural', 'General'];
    const scores: { [category: string]: number } = {};
    
    for (const category of categories) {
      const categoryViolations = violations.filter(v => v.category === category);
      const criticalCount = categoryViolations.filter(v => v.severity === 'critical').length;
      const highCount = categoryViolations.filter(v => v.severity === 'high').length;
      const mediumCount = categoryViolations.filter(v => v.severity === 'medium').length;
      
      let score = 100;
      score -= criticalCount * 30;
      score -= highCount * 20;
      score -= mediumCount * 10;
      
      scores[category] = Math.max(0, score);
    }
    
    return scores;
  }

  private calculateOverallScore(categoryScores: { [category: string]: number }, violations: LoreViolation[]): number {
    const scores = Object.values(categoryScores);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Apply penalty for critical violations
    const criticalPenalty = violations.filter(v => v.severity === 'critical').length * 15;
    
    return Math.max(0, Math.min(100, averageScore - criticalPenalty));
  }

  private generateRecommendations(violations: LoreViolation[], context: LoreConsistencyInput): string[] {
    const recommendations: string[] = [];
    
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      recommendations.push('Address critical lore violations before using scenario');
    }
    
    const timelineIssues = violations.filter(v => v.violationType === 'timeline_inconsistency');
    if (timelineIssues.length > 0) {
      recommendations.push('Review timeline consistency for character starting position');
    }
    
    const powerIssues = violations.filter(v => v.violationType === 'power_scaling_error');
    if (powerIssues.length > 0) {
      recommendations.push('Balance power descriptions to match series scaling');
    }
    
    if (violations.length === 0) {
      recommendations.push('Lore validation passed - all entries are canon compliant');
    }
    
    return recommendations;
  }
}

// Export convenience function
export async function validateLoreConsistency(
  input: LoreConsistencyInput
): Promise<LoreConsistencyResult> {
  const engine = new LoreConsistencyEngine(input.seriesName);
  return await engine.validateAndEnhanceLore(input);
}
