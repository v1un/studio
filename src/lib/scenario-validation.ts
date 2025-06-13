/**
 * Scenario Validation System
 * 
 * Comprehensive validation and testing system for scenario generation
 * to ensure all components are working correctly and integrated properly.
 */

import type { StructuredStoryState, CharacterProfile, Quest, NPCProfile } from '@/types/story';
import type { IntegratedScenarioResult } from '@/lib/scenario-integration-engine';

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  warnings: ValidationWarning[];
  errors: ValidationError[];
  recommendations: string[];
  systemStatus: {
    coreGeneration: 'pass' | 'warning' | 'fail';
    stateTracking: 'pass' | 'warning' | 'fail';
    gameplayIntegration: 'pass' | 'warning' | 'fail';
    seriesCompliance: 'pass' | 'warning' | 'fail';
    balanceValidation: 'pass' | 'warning' | 'fail';
  };
}

export interface ValidationWarning {
  category: 'state' | 'gameplay' | 'series' | 'balance' | 'integration';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion?: string;
}

export interface ValidationError {
  category: 'critical' | 'functional' | 'data' | 'integration';
  message: string;
  fix?: string;
}

export class ScenarioValidator {
  private warnings: ValidationWarning[] = [];
  private errors: ValidationError[] = [];
  private recommendations: string[] = [];

  async validateScenario(scenario: IntegratedScenarioResult): Promise<ValidationResult> {
    console.log('[ScenarioValidator] Starting comprehensive validation');
    
    // Reset validation state
    this.warnings = [];
    this.errors = [];
    this.recommendations = [];

    // Core generation validation
    const coreStatus = this.validateCoreGeneration(scenario);
    
    // State tracking validation
    const stateStatus = this.validateStateTracking(scenario);
    
    // Gameplay integration validation
    const gameplayStatus = this.validateGameplayIntegration(scenario);
    
    // Series compliance validation
    const seriesStatus = this.validateSeriesCompliance(scenario);
    
    // Balance validation
    const balanceStatus = this.validateBalance(scenario);
    
    // Calculate overall score
    const score = this.calculateOverallScore(coreStatus, stateStatus, gameplayStatus, seriesStatus, balanceStatus);
    
    // Determine if scenario is valid
    const isValid = this.errors.length === 0 && score >= 70;
    
    // Generate recommendations
    this.generateRecommendations(scenario);
    
    const result: ValidationResult = {
      isValid,
      score,
      warnings: this.warnings,
      errors: this.errors,
      recommendations: this.recommendations,
      systemStatus: {
        coreGeneration: coreStatus,
        stateTracking: stateStatus,
        gameplayIntegration: gameplayStatus,
        seriesCompliance: seriesStatus,
        balanceValidation: balanceStatus,
      },
    };

    console.log(`[ScenarioValidator] Validation complete - Score: ${score}/100, Valid: ${isValid}`);
    return result;
  }

  private validateCoreGeneration(scenario: IntegratedScenarioResult): 'pass' | 'warning' | 'fail' {
    let issues = 0;

    // Check required fields
    if (!scenario.sceneDescription || scenario.sceneDescription.length < 50) {
      this.errors.push({
        category: 'data',
        message: 'Scene description is missing or too short',
        fix: 'Regenerate the Character & Scene phase',
      });
      issues++;
    }

    if (!scenario.characterProfile || !scenario.characterProfile.name) {
      this.errors.push({
        category: 'critical',
        message: 'Character profile is missing or incomplete',
        fix: 'Regenerate the Character & Scene phase',
      });
      issues++;
    }

    if (!scenario.quests || scenario.quests.length === 0) {
      this.warnings.push({
        category: 'gameplay',
        severity: 'high',
        message: 'No quests generated',
        suggestion: 'Regenerate the Quests & Story Arcs phase',
      });
      issues++;
    }

    if (!scenario.trackedNPCs || scenario.trackedNPCs.length === 0) {
      this.warnings.push({
        category: 'state',
        severity: 'medium',
        message: 'No NPCs generated',
        suggestion: 'Regenerate the NPCs phase',
      });
    }

    if (issues >= 2) return 'fail';
    if (issues >= 1) return 'warning';
    return 'pass';
  }

  private validateStateTracking(scenario: IntegratedScenarioResult): 'pass' | 'warning' | 'fail' {
    if (!scenario.enhancedStoryState) {
      this.errors.push({
        category: 'integration',
        message: 'Enhanced story state is missing',
        fix: 'Ensure enhanced state manager is properly integrated',
      });
      return 'fail';
    }

    const state = scenario.enhancedStoryState;
    let issues = 0;

    // Check emotional state
    if (!state.characterEmotionalState) {
      this.warnings.push({
        category: 'state',
        severity: 'medium',
        message: 'Character emotional state not initialized',
        suggestion: 'Check enhanced state manager initialization',
      });
      issues++;
    }

    // Check NPC relationships
    if (!state.npcRelationships || state.npcRelationships.length === 0) {
      this.warnings.push({
        category: 'state',
        severity: 'medium',
        message: 'NPC relationships not initialized',
        suggestion: 'Ensure NPCs are properly integrated with relationship system',
      });
      issues++;
    }

    // Check environmental context
    if (!state.environmentalContext) {
      this.warnings.push({
        category: 'state',
        severity: 'low',
        message: 'Environmental context not initialized',
        suggestion: 'Check environmental context initialization',
      });
    }

    // Check player preferences
    if (!state.playerPreferences) {
      this.warnings.push({
        category: 'state',
        severity: 'low',
        message: 'Player preferences not initialized',
        suggestion: 'Initialize player preferences for better adaptation',
      });
    }

    if (issues >= 2) return 'warning';
    return 'pass';
  }

  private validateGameplayIntegration(scenario: IntegratedScenarioResult): 'pass' | 'warning' | 'fail' {
    let integrationScore = 0;
    const maxIntegrations = 4; // combat, progression, crafting, balance

    // Check combat integration
    if (scenario.systemStatus.combatIntegration === 'active') {
      integrationScore++;
    } else if (scenario.systemStatus.combatIntegration === 'disabled') {
      this.warnings.push({
        category: 'gameplay',
        severity: 'medium',
        message: 'Combat system not integrated',
        suggestion: 'Enable combat generation for tactical gameplay',
      });
    }

    // Check progression integration
    if (scenario.systemStatus.progressionSystem === 'active') {
      integrationScore++;
    } else {
      this.warnings.push({
        category: 'gameplay',
        severity: 'medium',
        message: 'Progression system not integrated',
        suggestion: 'Enable progression system for character development',
      });
    }

    // Check crafting integration
    if (scenario.systemStatus.craftingSystem === 'active') {
      integrationScore++;
    } else {
      this.warnings.push({
        category: 'gameplay',
        severity: 'low',
        message: 'Crafting system not integrated',
        suggestion: 'Enable crafting system for item management',
      });
    }

    // Check balance integration
    if (scenario.systemStatus.balanceSystem === 'active') {
      integrationScore++;
    } else {
      this.warnings.push({
        category: 'balance',
        severity: 'medium',
        message: 'Balance system not integrated',
        suggestion: 'Enable balance system for difficulty management',
      });
    }

    const integrationPercentage = (integrationScore / maxIntegrations) * 100;
    
    if (integrationPercentage >= 75) return 'pass';
    if (integrationPercentage >= 50) return 'warning';
    return 'fail';
  }

  private validateSeriesCompliance(scenario: IntegratedScenarioResult): 'pass' | 'warning' | 'fail' {
    // Check series compatibility warnings
    if (scenario.seriesCompatibility && scenario.seriesCompatibility.length > 0) {
      for (const warning of scenario.seriesCompatibility) {
        this.warnings.push({
          category: 'series',
          severity: 'medium',
          message: warning,
          suggestion: 'Review character and quest design for series consistency',
        });
      }
    }

    // Check if series style guide exists
    if (!scenario.seriesStyleGuide || scenario.seriesStyleGuide.length < 100) {
      this.warnings.push({
        category: 'series',
        severity: 'high',
        message: 'Series style guide is missing or incomplete',
        suggestion: 'Regenerate Character & Scene phase for better series consistency',
      });
      return 'warning';
    }

    // Check if series plot summary exists
    if (!scenario.seriesPlotSummary || scenario.seriesPlotSummary.length < 200) {
      this.warnings.push({
        category: 'series',
        severity: 'medium',
        message: 'Series plot summary is missing or incomplete',
        suggestion: 'Regenerate Character & Scene phase for better context',
      });
    }

    if (scenario.seriesCompatibility && scenario.seriesCompatibility.length > 3) {
      return 'warning';
    }

    return 'pass';
  }

  private validateBalance(scenario: IntegratedScenarioResult): 'pass' | 'warning' | 'fail' {
    // Check character level vs quest difficulty
    const character = scenario.characterProfile;
    const quests = scenario.quests || [];
    
    if (character && quests.length > 0) {
      const characterLevel = character.level || 1;
      const hardQuests = quests.filter(q => q.difficulty === 'hard' || q.difficulty === 'extreme');
      
      if (characterLevel < 5 && hardQuests.length > 0) {
        this.warnings.push({
          category: 'balance',
          severity: 'high',
          message: 'High difficulty quests for low-level character',
          suggestion: 'Adjust quest difficulty or character starting level',
        });
        return 'warning';
      }
    }

    // Check inventory balance
    const inventory = scenario.inventory || [];
    const powerfulItems = inventory.filter(item => 
      item.rarity === 'epic' || item.rarity === 'legendary'
    );
    
    if (powerfulItems.length > 2) {
      this.warnings.push({
        category: 'balance',
        severity: 'medium',
        message: 'Too many powerful starting items',
        suggestion: 'Reduce starting item power for better progression',
      });
    }

    return 'pass';
  }

  private calculateOverallScore(
    core: 'pass' | 'warning' | 'fail',
    state: 'pass' | 'warning' | 'fail',
    gameplay: 'pass' | 'warning' | 'fail',
    series: 'pass' | 'warning' | 'fail',
    balance: 'pass' | 'warning' | 'fail'
  ): number {
    const scores = {
      pass: 100,
      warning: 70,
      fail: 30,
    };

    const weights = {
      core: 0.3,      // 30% - most important
      state: 0.25,    // 25% - very important
      gameplay: 0.2,  // 20% - important
      series: 0.15,   // 15% - important for immersion
      balance: 0.1,   // 10% - important for gameplay
    };

    const weightedScore = 
      scores[core] * weights.core +
      scores[state] * weights.state +
      scores[gameplay] * weights.gameplay +
      scores[series] * weights.series +
      scores[balance] * weights.balance;

    // Apply penalties for errors and warnings
    const errorPenalty = this.errors.length * 10;
    const warningPenalty = this.warnings.reduce((total, warning) => {
      const penalties = { low: 1, medium: 3, high: 5 };
      return total + penalties[warning.severity];
    }, 0);

    return Math.max(0, Math.min(100, weightedScore - errorPenalty - warningPenalty));
  }

  private generateRecommendations(scenario: IntegratedScenarioResult): void {
    // Generate recommendations based on validation results
    if (this.errors.length > 0) {
      this.recommendations.push('Fix critical errors before using the scenario');
    }

    const highWarnings = this.warnings.filter(w => w.severity === 'high');
    if (highWarnings.length > 0) {
      this.recommendations.push('Address high-severity warnings for better experience');
    }

    if (scenario.systemStatus.combatIntegration === 'disabled') {
      this.recommendations.push('Enable combat integration for tactical gameplay');
    }

    if (scenario.systemStatus.progressionSystem === 'disabled') {
      this.recommendations.push('Enable progression system for character development');
    }

    if (!scenario.enhancedStoryState?.playerPreferences) {
      this.recommendations.push('Initialize player preferences for adaptive gameplay');
    }

    if (scenario.integrationWarnings && scenario.integrationWarnings.length > 0) {
      this.recommendations.push('Review integration warnings for system optimization');
    }
  }
}

// Export convenience function
export async function validateScenario(scenario: IntegratedScenarioResult): Promise<ValidationResult> {
  const validator = new ScenarioValidator();
  return await validator.validateScenario(scenario);
}
