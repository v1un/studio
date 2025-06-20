/**
 * Narrative Authenticity Engine
 * 
 * Ensures generated narratives match the authentic tone, perspective,
 * and information revelation patterns of the source series.
 */

import { getSeriesConfig, type NarrativeAuthenticityRule } from '@/lib/series-adapter';

export interface NarrativeAuthenticityInput {
  seriesName: string;
  sceneDescription: string;
  characterProfile: any;
  dialogueExamples?: string[];
  narrativeStyle?: string;
  informationRevealed: string[];
  characterPerspective: string;
}

export interface NarrativeAuthenticityResult {
  authenticityScore: number;
  aspectScores: {
    toneMatching: number;
    perspectiveAccuracy: number;
    informationPacing: number;
    characterVoice: number;
    atmosphereConsistency: number;
  };
  violations: AuthenticityViolation[];
  enhancements: AuthenticityEnhancement[];
  recommendations: string[];
  correctedNarrative?: string;
}

export interface AuthenticityViolation {
  aspect: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  specificIssue: string;
  canonExample: string;
  suggestedFix: string;
}

export interface AuthenticityEnhancement {
  aspect: string;
  enhancement: string;
  canonBasis: string;
  implementationGuide: string;
}

export class NarrativeAuthenticityEngine {
  private seriesConfig: any;
  private authenticityRules: NarrativeAuthenticityRule[];
  
  constructor(seriesName: string) {
    this.seriesConfig = getSeriesConfig(seriesName);
    this.authenticityRules = this.seriesConfig.canonCompliance?.narrativeAuthenticity || [];
  }

  async validateNarrativeAuthenticity(input: NarrativeAuthenticityInput): Promise<NarrativeAuthenticityResult> {
    console.log(`[NarrativeAuthenticityEngine] Validating narrative for ${input.seriesName}`);
    
    const violations: AuthenticityViolation[] = [];
    const enhancements: AuthenticityEnhancement[] = [];
    
    // Validate each aspect of narrative authenticity
    const toneScore = this.validateToneMatching(input, violations);
    const perspectiveScore = this.validatePerspectiveAccuracy(input, violations);
    const pacingScore = this.validateInformationPacing(input, violations);
    const voiceScore = this.validateCharacterVoice(input, violations);
    const atmosphereScore = this.validateAtmosphereConsistency(input, violations);
    
    // Generate enhancements
    enhancements.push(...this.generateEnhancements(input));
    
    // Calculate overall score
    const aspectScores = {
      toneMatching: toneScore,
      perspectiveAccuracy: perspectiveScore,
      informationPacing: pacingScore,
      characterVoice: voiceScore,
      atmosphereConsistency: atmosphereScore,
    };
    
    const authenticityScore = this.calculateOverallScore(aspectScores, violations);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(violations, aspectScores);
    
    // Generate corrected narrative if needed
    const correctedNarrative = violations.length > 0 ? 
      this.generateCorrectedNarrative(input, violations) : undefined;
    
    return {
      authenticityScore,
      aspectScores,
      violations,
      enhancements,
      recommendations,
      correctedNarrative,
    };
  }

  private validateToneMatching(input: NarrativeAuthenticityInput, violations: AuthenticityViolation[]): number {
    let score = 100;
    const sceneText = input.sceneDescription.toLowerCase();
    
    // Get series-specific tone requirements
    const toneDescriptors = this.seriesConfig.toneDescriptors || [];
    
    if (input.seriesName === 'Re:Zero') {
      // Check for Re:Zero specific tone elements
      const hasHope = sceneText.includes('hope') || sceneText.includes('determination') || sceneText.includes('resolve');
      const hasDarkness = sceneText.includes('fear') || sceneText.includes('uncertainty') || sceneText.includes('danger');
      const hasEmotionalDepth = sceneText.includes('feel') || sceneText.includes('emotion') || sceneText.includes('heart');
      
      if (!hasHope && !hasDarkness) {
        violations.push({
          aspect: 'Tone Matching',
          severity: 'medium',
          description: 'Missing Re:Zero\'s characteristic balance of hope and darkness',
          specificIssue: 'Tone too neutral for series',
          canonExample: 'Re:Zero balances dark situations with underlying hope and determination',
          suggestedFix: 'Add elements of both struggle and determination to the narrative'
        });
        score -= 20;
      }
      
      if (!hasEmotionalDepth) {
        violations.push({
          aspect: 'Tone Matching',
          severity: 'medium',
          description: 'Missing emotional intensity characteristic of Re:Zero',
          specificIssue: 'Narrative lacks emotional depth',
          canonExample: 'Re:Zero focuses heavily on character emotions and psychological states',
          suggestedFix: 'Include more emotional and psychological elements in descriptions'
        });
        score -= 15;
      }
    }
    
    return Math.max(0, score);
  }

  private validatePerspectiveAccuracy(input: NarrativeAuthenticityInput, violations: AuthenticityViolation[]): number {
    let score = 100;
    
    // Check for perspective consistency with character background
    if (input.seriesName === 'Re:Zero' && input.characterProfile.name === 'Natsuki Subaru') {
      const perspective = input.characterPerspective.toLowerCase();
      const sceneText = input.sceneDescription.toLowerCase();
      
      // Check for fish-out-of-water perspective
      const hasConfusion = sceneText.includes('confus') || sceneText.includes('uncertain') || sceneText.includes('unfamiliar');
      const hasModernReferences = sceneText.includes('game') || sceneText.includes('anime') || perspective.includes('modern');
      const hasOverconfidence = sceneText.includes('confident') || sceneText.includes('sure') || sceneText.includes('know exactly');
      
      if (!hasConfusion) {
        violations.push({
          aspect: 'Perspective Accuracy',
          severity: 'high',
          description: 'Missing Subaru\'s characteristic confusion in new world',
          specificIssue: 'Character too comfortable with unfamiliar environment',
          canonExample: 'Subaru is consistently confused and overwhelmed by the new world',
          suggestedFix: 'Add confusion and uncertainty about local customs and environment'
        });
        score -= 25;
      }
      
      if (hasOverconfidence && !hasModernReferences) {
        violations.push({
          aspect: 'Perspective Accuracy',
          severity: 'medium',
          description: 'Character too confident without basis in modern world knowledge',
          specificIssue: 'Overconfidence not grounded in character background',
          canonExample: 'Subaru\'s confidence comes from gaming/anime knowledge, not actual competence',
          suggestedFix: 'Base confidence on modern world knowledge or show it as misplaced bravado'
        });
        score -= 15;
      }
    }
    
    return Math.max(0, score);
  }

  private validateInformationPacing(input: NarrativeAuthenticityInput, violations: AuthenticityViolation[]): number {
    let score = 100;
    
    // Check for premature information revelation
    const revealedInfo = input.informationRevealed.join(' ').toLowerCase();
    
    if (input.seriesName === 'Re:Zero') {
      // Check for information that shouldn't be known at series start
      const prematureKnowledge = [
        'royal selection',
        'witch cult',
        'return by death',
        'satella',
        'witch of envy',
        'roswaal',
        'beatrice'
      ];
      
      for (const knowledge of prematureKnowledge) {
        if (revealedInfo.includes(knowledge)) {
          violations.push({
            aspect: 'Information Pacing',
            severity: 'high',
            description: `Premature revelation of ${knowledge}`,
            specificIssue: 'Information revealed too early in timeline',
            canonExample: `${knowledge} is revealed gradually through story progression`,
            suggestedFix: `Remove or hint at ${knowledge} without explicit revelation`
          });
          score -= 20;
        }
      }
    }
    
    return Math.max(0, score);
  }

  private validateCharacterVoice(input: NarrativeAuthenticityInput, violations: AuthenticityViolation[]): number {
    let score = 100;
    
    if (input.seriesName === 'Re:Zero' && input.characterProfile.name === 'Natsuki Subaru') {
      const sceneText = input.sceneDescription.toLowerCase();
      
      // Check for Subaru's characteristic speech patterns and thoughts
      const hasModernSlang = sceneText.includes('dude') || sceneText.includes('awesome') || sceneText.includes('cool');
      const hasGamingReferences = sceneText.includes('level') || sceneText.includes('quest') || sceneText.includes('rpg');
      const hasSelfDeprecation = sceneText.includes('useless') || sceneText.includes('pathetic') || sceneText.includes('weak');
      const hasOvercompensation = sceneText.includes('hero') || sceneText.includes('protagonist') || sceneText.includes('special');
      
      if (!hasModernSlang && !hasGamingReferences) {
        violations.push({
          aspect: 'Character Voice',
          severity: 'medium',
          description: 'Missing Subaru\'s modern world speech patterns',
          specificIssue: 'Character voice doesn\'t reflect modern Japanese teenager background',
          canonExample: 'Subaru frequently uses modern slang and gaming references',
          suggestedFix: 'Include modern speech patterns and gaming/anime references'
        });
        score -= 15;
      }
      
      if (!hasSelfDeprecation && !hasOvercompensation) {
        violations.push({
          aspect: 'Character Voice',
          severity: 'medium',
          description: 'Missing Subaru\'s psychological complexity',
          specificIssue: 'Character lacks internal conflict between self-doubt and bravado',
          canonExample: 'Subaru alternates between self-deprecation and overcompensating heroic behavior',
          suggestedFix: 'Show internal conflict between insecurity and desire to be heroic'
        });
        score -= 15;
      }
    }
    
    return Math.max(0, score);
  }

  private validateAtmosphereConsistency(input: NarrativeAuthenticityInput, violations: AuthenticityViolation[]): number {
    let score = 100;
    const sceneText = input.sceneDescription.toLowerCase();
    
    if (input.seriesName === 'Re:Zero') {
      // Check for Re:Zero's characteristic atmosphere
      const hasUndercurrent = sceneText.includes('tension') || sceneText.includes('unease') || sceneText.includes('ominous');
      const hasDetailedDescription = sceneText.length > 200; // Re:Zero is known for detailed descriptions
      const hasEmotionalUndertone = sceneText.includes('feel') || sceneText.includes('sense') || sceneText.includes('atmosphere');
      
      if (!hasUndercurrent) {
        violations.push({
          aspect: 'Atmosphere Consistency',
          severity: 'low',
          description: 'Missing subtle tension characteristic of Re:Zero',
          specificIssue: 'Atmosphere too straightforward',
          canonExample: 'Re:Zero maintains underlying tension even in peaceful moments',
          suggestedFix: 'Add subtle hints of underlying complexity or potential danger'
        });
        score -= 10;
      }
      
      if (!hasDetailedDescription) {
        violations.push({
          aspect: 'Atmosphere Consistency',
          severity: 'low',
          description: 'Insufficient descriptive detail for Re:Zero style',
          specificIssue: 'Scene description lacks depth',
          canonExample: 'Re:Zero provides rich, detailed environmental and emotional descriptions',
          suggestedFix: 'Expand scene description with more sensory and emotional details'
        });
        score -= 10;
      }
    }
    
    return Math.max(0, score);
  }

  private generateEnhancements(input: NarrativeAuthenticityInput): AuthenticityEnhancement[] {
    const enhancements: AuthenticityEnhancement[] = [];
    
    if (input.seriesName === 'Re:Zero') {
      enhancements.push({
        aspect: 'Character Psychology',
        enhancement: 'Add internal monologue showing Subaru\'s thought processes',
        canonBasis: 'Re:Zero frequently shows Subaru\'s internal struggles and rationalizations',
        implementationGuide: 'Include thoughts about gaming logic, self-doubt, and determination'
      });
      
      enhancements.push({
        aspect: 'Environmental Detail',
        enhancement: 'Expand sensory descriptions of the fantasy world',
        canonBasis: 'Re:Zero emphasizes the contrast between modern and fantasy elements',
        implementationGuide: 'Describe unfamiliar sights, sounds, and smells that highlight the world difference'
      });
      
      enhancements.push({
        aspect: 'Emotional Subtext',
        enhancement: 'Layer emotional complexity beneath surface actions',
        canonBasis: 'Re:Zero characters have complex emotional motivations',
        implementationGuide: 'Show conflicting emotions and hidden vulnerabilities'
      });
    }
    
    return enhancements;
  }

  private calculateOverallScore(aspectScores: any, violations: AuthenticityViolation[]): number {
    const scores = Object.values(aspectScores) as number[];
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Apply penalty for critical violations
    const criticalPenalty = violations.filter(v => v.severity === 'critical').length * 20;
    const highPenalty = violations.filter(v => v.severity === 'high').length * 10;
    
    return Math.max(0, Math.min(100, averageScore - criticalPenalty - highPenalty));
  }

  private generateRecommendations(violations: AuthenticityViolation[], aspectScores: any): string[] {
    const recommendations: string[] = [];
    
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      recommendations.push('Address critical narrative authenticity issues before proceeding');
    }
    
    if (aspectScores.toneMatching < 70) {
      recommendations.push('Review series tone requirements and adjust narrative atmosphere');
    }
    
    if (aspectScores.perspectiveAccuracy < 70) {
      recommendations.push('Ensure character perspective matches their canonical background and knowledge');
    }
    
    if (aspectScores.informationPacing < 70) {
      recommendations.push('Review information revelation timing for timeline consistency');
    }
    
    if (aspectScores.characterVoice < 70) {
      recommendations.push('Enhance character voice to match canonical speech patterns and personality');
    }
    
    if (violations.length === 0) {
      recommendations.push('Narrative authenticity validation passed - style matches series canon');
    }
    
    return recommendations;
  }

  private generateCorrectedNarrative(input: NarrativeAuthenticityInput, violations: AuthenticityViolation[]): string {
    let correctedNarrative = input.sceneDescription;
    
    // Apply corrections based on violations
    for (const violation of violations) {
      if (violation.severity === 'critical' || violation.severity === 'high') {
        // Apply specific narrative corrections
        correctedNarrative = this.applyNarrativeCorrection(correctedNarrative, violation);
      }
    }
    
    return correctedNarrative;
  }

  private applyNarrativeCorrection(narrative: string, violation: AuthenticityViolation): string {
    // Apply specific corrections based on violation type
    let corrected = narrative;
    
    switch (violation.aspect) {
      case 'Tone Matching':
        if (violation.description.includes('balance of hope and darkness')) {
          corrected += ' Despite the uncertainty, there was something that drove him forward - a stubborn determination that refused to be extinguished.';
        }
        break;
      case 'Perspective Accuracy':
        if (violation.description.includes('confusion')) {
          corrected = corrected.replace(/confident/g, 'uncertain');
          corrected += ' Everything here was so different from what he knew - like stepping into a game world, but real.';
        }
        break;
      case 'Character Voice':
        if (violation.description.includes('modern world speech')) {
          corrected += ' "This is like something straight out of an RPG," he thought to himself.';
        }
        break;
    }
    
    return corrected;
  }
}

// Export convenience function
export async function validateNarrativeAuthenticity(
  input: NarrativeAuthenticityInput
): Promise<NarrativeAuthenticityResult> {
  const engine = new NarrativeAuthenticityEngine(input.seriesName);
  return await engine.validateNarrativeAuthenticity(input);
}
