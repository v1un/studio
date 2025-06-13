/**
 * Comprehensive Arc Manager
 * 
 * Main orchestration system for the enhanced Arc functionality that:
 * - Manages Arc lifecycle from creation to completion
 * - Coordinates all Arc subsystems (progression, difficulty, agency, etc.)
 * - Handles Arc transitions and state management
 * - Integrates with all game systems seamlessly
 * - Provides comprehensive Arc analytics and monitoring
 */

import type {
  StoryArc,
  StructuredStoryState,
  CharacterProfile,
  Quest,
  CombatState,
  ArcProgression,
  ArcPlayerChoice,
  ArcMilestone
} from '@/types/story';

import { 
  initializeEnhancedArc,
  updateArcProgression,
  adjustArcDifficulty,
  trackPlayerChoice,
  updateArcState,
  integrateWithCombatSystem,
  integrateWithProgressionSystem
} from './enhanced-arc-engine';

import {
  generateDynamicArc,
  type ArcGenerationInput,
  type ArcGenerationResult
} from './enhanced-arc-generation-engine';

import {
  detectArcFailures,
  generateRecoveryOptions,
  updateAdaptiveSupport,
  updateLearningSystem,
  type ArcFailureDetectionResult
} from './arc-failure-recovery-system';

import {
  integrateCombatWithArc,
  integrateProgressionWithArc,
  integrateQuestWithArc,
  integrateInventoryWithArc,
  integrateRelationshipWithArc,
  type ArcCombatIntegrationResult,
  type ArcProgressionIntegrationResult,
  type ArcQuestIntegrationResult,
  type ArcInventoryIntegrationResult,
  type ArcRelationshipIntegrationResult
} from './arc-integration-manager';

import { generateUUID } from '@/lib/utils';

// === MAIN ARC MANAGER ===

export class ComprehensiveArcManager {
  private activeArcs: Map<string, StoryArc> = new Map();
  private arcHistory: StoryArc[] = [];
  private globalArcMetrics: GlobalArcMetrics = this.initializeGlobalMetrics();

  // === ARC LIFECYCLE MANAGEMENT ===

  public async createNewArc(input: ArcGenerationInput): Promise<ArcCreationResult> {
    try {
      // Generate the arc using the advanced generation engine
      const generationResult = generateDynamicArc(input);
      
      // Initialize all enhanced systems
      const enhancedArc = initializeEnhancedArc(generationResult.arc);
      
      // Register the arc
      this.activeArcs.set(enhancedArc.id, enhancedArc);
      
      // Update global metrics
      this.updateGlobalMetrics('arc_created', enhancedArc);
      
      return {
        success: true,
        arc: enhancedArc,
        generationResult,
        integrationSuggestions: generationResult.integrationSuggestions,
        qualityMetrics: generationResult.qualityMetrics,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating arc',
      };
    }
  }

  public updateArc(
    arcId: string,
    character: CharacterProfile,
    storyState: StructuredStoryState,
    turnId: string,
    updateType: ArcUpdateType,
    updateData?: any
  ): ArcUpdateResult {
    const arc = this.activeArcs.get(arcId);
    if (!arc) {
      return { success: false, error: 'Arc not found' };
    }

    try {
      let updatedArc = arc;
      const updateResults: any[] = [];

      // Update arc progression
      updatedArc = updateArcProgression(updatedArc, storyState, turnId);
      
      // Adjust difficulty based on performance
      updatedArc = adjustArcDifficulty(updatedArc, character, storyState, turnId);
      
      // Detect and handle failures
      const failureDetection = detectArcFailures(updatedArc, character, storyState, turnId);
      if (failureDetection.failures.length > 0) {
        const recoveryOptions = generateRecoveryOptions(updatedArc, failureDetection.failures, character, storyState);
        updateResults.push({ type: 'failure_detection', failures: failureDetection.failures, recoveryOptions });
      }

      // Handle specific update types
      switch (updateType) {
        case 'player_choice':
          updatedArc = this.handlePlayerChoice(updatedArc, updateData, storyState);
          break;
        case 'combat_result':
          const combatResult = this.handleCombatResult(updatedArc, updateData, character, storyState);
          updatedArc = combatResult.updatedArc;
          updateResults.push(combatResult);
          break;
        case 'quest_event':
          const questResult = this.handleQuestEvent(updatedArc, updateData, character, storyState);
          updatedArc = questResult.updatedArc;
          updateResults.push(questResult);
          break;
        case 'progression_event':
          const progressionResult = this.handleProgressionEvent(updatedArc, updateData, character, storyState);
          updatedArc = progressionResult.updatedArc;
          updateResults.push(progressionResult);
          break;
      }

      // Update the arc in storage
      this.activeArcs.set(arcId, updatedArc);
      
      // Update global metrics
      this.updateGlobalMetrics('arc_updated', updatedArc);

      return {
        success: true,
        updatedArc,
        updateResults,
        failureDetection,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error updating arc',
      };
    }
  }

  public completeArc(
    arcId: string,
    character: CharacterProfile,
    storyState: StructuredStoryState,
    completionSummary: string
  ): ArcCompletionResult {
    const arc = this.activeArcs.get(arcId);
    if (!arc) {
      return { success: false, error: 'Arc not found' };
    }

    try {
      // Mark arc as completed
      const completedArc: StoryArc = {
        ...arc,
        isCompleted: true,
        completionSummary,
      };

      // Calculate final metrics
      const finalMetrics = this.calculateFinalArcMetrics(completedArc, character, storyState);
      
      // Generate completion rewards
      const completionRewards = this.generateCompletionRewards(completedArc, character, finalMetrics);
      
      // Move to history
      this.arcHistory.push(completedArc);
      this.activeArcs.delete(arcId);
      
      // Update global metrics
      this.updateGlobalMetrics('arc_completed', completedArc);

      return {
        success: true,
        completedArc,
        finalMetrics,
        completionRewards,
        nextArcSuggestions: this.generateNextArcSuggestions(completedArc, character, storyState),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error completing arc',
      };
    }
  }

  // === ARC EVENT HANDLERS ===

  private handlePlayerChoice(arc: StoryArc, choiceData: any, storyState: StructuredStoryState): StoryArc {
    const arcChoice: ArcPlayerChoice = {
      id: generateUUID(),
      turnId: choiceData.turnId,
      timestamp: new Date().toISOString(),
      phaseId: arc.progression?.currentPhase?.id || '',
      choiceText: choiceData.choiceText,
      choiceDescription: choiceData.choiceDescription,
      alternatives: choiceData.alternatives || [],
      consequences: choiceData.consequences || [],
      impactScope: choiceData.impactScope || 'phase',
      moralAlignment: choiceData.moralAlignment || 'neutral',
      difficultyInfluence: choiceData.difficultyInfluence || 0,
      agencyScore: choiceData.agencyScore || 5,
      narrativeWeight: choiceData.narrativeWeight || 5,
    };

    return trackPlayerChoice(arc, arcChoice, choiceData.alternatives || [], storyState);
  }

  private handleCombatResult(
    arc: StoryArc,
    combatData: any,
    character: CharacterProfile,
    storyState: StructuredStoryState
  ): ArcCombatIntegrationResult {
    return integrateCombatWithArc(arc, combatData.combatState, combatData.result, character, storyState);
  }

  private handleQuestEvent(
    arc: StoryArc,
    questData: any,
    character: CharacterProfile,
    storyState: StructuredStoryState
  ): ArcQuestIntegrationResult {
    return integrateQuestWithArc(arc, questData.quest, questData.event, character, storyState);
  }

  private handleProgressionEvent(
    arc: StoryArc,
    progressionData: any,
    character: CharacterProfile,
    storyState: StructuredStoryState
  ): ArcProgressionIntegrationResult {
    return integrateProgressionWithArc(arc, character, progressionData, storyState);
  }

  // === ARC ANALYTICS ===

  public getArcAnalytics(arcId: string): ArcAnalytics | null {
    const arc = this.activeArcs.get(arcId) || this.arcHistory.find(a => a.id === arcId);
    if (!arc) return null;

    return {
      arcId: arc.id,
      title: arc.title,
      progressionMetrics: arc.progression?.progressionMetrics || this.getDefaultProgressionMetrics(),
      difficultyMetrics: this.calculateDifficultyMetrics(arc),
      playerAgencyMetrics: arc.playerAgencyMetrics || this.getDefaultAgencyMetrics(),
      integrationMetrics: this.calculateIntegrationMetrics(arc),
      qualityScore: this.calculateArcQualityScore(arc),
      playerSatisfactionEstimate: this.estimatePlayerSatisfaction(arc),
    };
  }

  public getGlobalArcMetrics(): GlobalArcMetrics {
    return { ...this.globalArcMetrics };
  }

  // === HELPER METHODS ===

  private initializeGlobalMetrics(): GlobalArcMetrics {
    return {
      totalArcsCreated: 0,
      totalArcsCompleted: 0,
      averageArcDuration: 0,
      averagePlayerSatisfaction: 0,
      averageDifficultyRating: 5,
      averageAgencyScore: 50,
      systemIntegrationScore: 0,
      failureRecoverySuccessRate: 0,
    };
  }

  private updateGlobalMetrics(eventType: string, arc: StoryArc): void {
    switch (eventType) {
      case 'arc_created':
        this.globalArcMetrics.totalArcsCreated++;
        break;
      case 'arc_completed':
        this.globalArcMetrics.totalArcsCompleted++;
        this.recalculateGlobalAverages();
        break;
      case 'arc_updated':
        // Update running averages
        break;
    }
  }

  private recalculateGlobalAverages(): void {
    if (this.arcHistory.length === 0) return;

    const completedArcs = this.arcHistory;
    
    this.globalArcMetrics.averageArcDuration = 
      completedArcs.reduce((sum, arc) => sum + (arc.progression?.progressionMetrics.timeSpent || 0), 0) / completedArcs.length;
    
    this.globalArcMetrics.averageAgencyScore = 
      completedArcs.reduce((sum, arc) => sum + (arc.playerAgencyMetrics?.overallAgencyScore || 50), 0) / completedArcs.length;
    
    this.globalArcMetrics.averageDifficultyRating = 
      completedArcs.reduce((sum, arc) => sum + (arc.difficultySettings?.currentDifficulty || 5), 0) / completedArcs.length;
  }

  private calculateFinalArcMetrics(arc: StoryArc, character: CharacterProfile, storyState: StructuredStoryState): any {
    return {
      totalDuration: arc.progression?.progressionMetrics.timeSpent || 0,
      choicesMade: arc.progression?.progressionMetrics.totalChoicesMade || 0,
      objectivesCompleted: arc.progression?.progressionMetrics.objectivesCompleted || 0,
      finalDifficulty: arc.difficultySettings?.currentDifficulty || 5,
      finalAgencyScore: arc.playerAgencyMetrics?.overallAgencyScore || 50,
      milestonesAchieved: arc.progression?.progressionMetrics.milestonesAchieved || 0,
    };
  }

  private generateCompletionRewards(arc: StoryArc, character: CharacterProfile, metrics: any): any[] {
    const rewards = [];
    
    // Base completion reward
    rewards.push({
      type: 'experience',
      amount: 500 + (metrics.finalDifficulty * 100),
      description: 'Arc completion experience',
    });

    // Agency bonus
    if (metrics.finalAgencyScore > 70) {
      rewards.push({
        type: 'skill_points',
        amount: 2,
        description: 'High player agency bonus',
      });
    }

    // Efficiency bonus
    if (metrics.totalDuration < 15) {
      rewards.push({
        type: 'currency',
        amount: 200,
        description: 'Efficient completion bonus',
      });
    }

    return rewards;
  }

  private generateNextArcSuggestions(arc: StoryArc, character: CharacterProfile, storyState: StructuredStoryState): string[] {
    const suggestions = [];
    
    // Based on completed arc themes
    if (arc.thematicElements?.includes('growth')) {
      suggestions.push('Consider a challenge-focused arc to test new abilities');
    }
    
    if (arc.thematicElements?.includes('relationships')) {
      suggestions.push('Explore political or faction-based storylines');
    }
    
    // Based on character development
    if (character.level >= 5) {
      suggestions.push('Ready for more complex multi-phase arcs');
    }
    
    return suggestions;
  }

  private calculateDifficultyMetrics(arc: StoryArc): any {
    return {
      currentDifficulty: arc.difficultySettings?.currentDifficulty || 5,
      adjustmentCount: arc.difficultySettings?.difficultyHistory?.length || 0,
      adaptiveScaling: arc.difficultySettings?.adaptiveScaling || false,
    };
  }

  private calculateIntegrationMetrics(arc: StoryArc): any {
    return {
      combatIntegration: !!arc.integrationPoints?.combatIntegration,
      progressionIntegration: !!arc.integrationPoints?.progressionIntegration,
      questIntegration: !!arc.integrationPoints?.questIntegration,
      inventoryIntegration: !!arc.integrationPoints?.inventoryIntegration,
      relationshipIntegration: !!arc.integrationPoints?.relationshipIntegration,
    };
  }

  private calculateArcQualityScore(arc: StoryArc): number {
    let score = 5; // Base score
    
    if (arc.progression?.progressionMetrics.efficiencyScore) {
      score += (arc.progression.progressionMetrics.efficiencyScore - 5);
    }
    
    if (arc.playerAgencyMetrics?.overallAgencyScore) {
      score += (arc.playerAgencyMetrics.overallAgencyScore - 50) / 10;
    }
    
    return Math.max(1, Math.min(10, score));
  }

  private estimatePlayerSatisfaction(arc: StoryArc): number {
    const agencyScore = arc.playerAgencyMetrics?.overallAgencyScore || 50;
    const difficultyBalance = 10 - Math.abs((arc.difficultySettings?.currentDifficulty || 5) - 5);
    const progressionSmooth = arc.progression?.progressionMetrics.efficiencyScore || 5;
    
    return (agencyScore + difficultyBalance * 10 + progressionSmooth * 10) / 3;
  }

  private getDefaultProgressionMetrics(): any {
    return {
      totalChoicesMade: 0,
      significantChoices: 0,
      playerAgencyAverage: 0,
      difficultyAdjustments: 0,
      objectivesCompleted: 0,
      objectivesFailed: 0,
      milestonesAchieved: 0,
      branchesExplored: [],
      timeSpent: 0,
      efficiencyScore: 5,
    };
  }

  private getDefaultAgencyMetrics(): any {
    return {
      overallAgencyScore: 50,
      choiceQuality: {
        averageAlternatives: 3,
        consequenceClarity: 5,
        choiceRelevance: 5,
        moralComplexity: 3,
        strategicDepth: 4,
      },
      impactfulDecisions: 0,
      meaningfulAlternatives: 0,
      playerInitiatedActions: 0,
      agencyTrends: [],
      constraintFactors: [],
    };
  }
}

// === TYPE DEFINITIONS ===

export type ArcUpdateType = 'player_choice' | 'combat_result' | 'quest_event' | 'progression_event' | 'relationship_event' | 'inventory_event';

export interface ArcCreationResult {
  success: boolean;
  arc?: StoryArc;
  generationResult?: ArcGenerationResult;
  integrationSuggestions?: string[];
  qualityMetrics?: any;
  error?: string;
}

export interface ArcUpdateResult {
  success: boolean;
  updatedArc?: StoryArc;
  updateResults?: any[];
  failureDetection?: ArcFailureDetectionResult;
  error?: string;
}

export interface ArcCompletionResult {
  success: boolean;
  completedArc?: StoryArc;
  finalMetrics?: any;
  completionRewards?: any[];
  nextArcSuggestions?: string[];
  error?: string;
}

export interface ArcAnalytics {
  arcId: string;
  title: string;
  progressionMetrics: any;
  difficultyMetrics: any;
  playerAgencyMetrics: any;
  integrationMetrics: any;
  qualityScore: number;
  playerSatisfactionEstimate: number;
}

export interface GlobalArcMetrics {
  totalArcsCreated: number;
  totalArcsCompleted: number;
  averageArcDuration: number;
  averagePlayerSatisfaction: number;
  averageDifficultyRating: number;
  averageAgencyScore: number;
  systemIntegrationScore: number;
  failureRecoverySuccessRate: number;
}

// Export singleton instance
export const arcManager = new ComprehensiveArcManager();

export { };
