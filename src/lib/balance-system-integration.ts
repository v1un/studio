/**
 * Balance System Integration
 * 
 * Main integration point for the comprehensive game balance and difficulty system:
 * - Coordinates all balance subsystems
 * - Provides unified interface for balance operations
 * - Manages system state and updates
 * - Integrates with existing game systems
 */

import type {
  GameBalanceSettings,
  PlayerPerformanceMetrics,
  StructuredStoryState,
  CharacterProfile,
  Quest,
  CombatResult,
  FailureRecoveryRecord
} from '@/types/story';

import {
  initializeGameBalance,
  initializePlayerPerformanceMetrics,
  calculateCurrentDifficulty,
  updateCombatPerformance,
  updateResourcePerformance,
  generateBalanceRecommendations,
  applyDifficultyToEncounter
} from './game-balance-engine';

import { ResourceScarcityManager } from './resource-scarcity-manager';
import { RiskRewardCalculator } from './risk-reward-calculator';
import { FailureRecoverySystem } from './failure-recovery-system';

// === MAIN BALANCE SYSTEM CLASS ===

export class GameBalanceSystem {
  private balanceSettings: GameBalanceSettings;
  private performanceMetrics: PlayerPerformanceMetrics;
  private resourceManager: ResourceScarcityManager;
  private riskRewardCalculator: RiskRewardCalculator;
  private failureRecoverySystem: FailureRecoverySystem;

  constructor(
    existingSettings?: GameBalanceSettings,
    existingMetrics?: PlayerPerformanceMetrics
  ) {
    this.balanceSettings = existingSettings || initializeGameBalance();
    this.performanceMetrics = existingMetrics || initializePlayerPerformanceMetrics();
    
    this.resourceManager = new ResourceScarcityManager(this.balanceSettings.resourceScarcity);
    this.riskRewardCalculator = new RiskRewardCalculator(this.balanceSettings.riskRewardBalance);
    this.failureRecoverySystem = new FailureRecoverySystem(this.balanceSettings.failureRecovery);
  }

  // === MAIN SYSTEM OPERATIONS ===

  /**
   * Process a player action and update all balance systems accordingly
   */
  processPlayerAction(
    action: string,
    outcome: string,
    context: {
      storyState: StructuredStoryState;
      actionType: 'combat' | 'quest' | 'social' | 'exploration' | 'resource';
      success: boolean;
      riskLevel?: number;
      resourcesUsed?: Record<string, number>;
      timeSpent?: number;
      combatResult?: CombatResult;
    }
  ): {
    updatedMetrics: PlayerPerformanceMetrics;
    balanceAdjustments: any;
    scarcityEvents: any[];
    recoveryOptions: any[];
    recommendations: string[];
  } {
    // Update performance metrics based on action
    this.updatePerformanceMetrics(context);

    // Check for scarcity events
    const scarcityEvents = this.resourceManager.checkForScarcityEvents(context.storyState);
    scarcityEvents.forEach(event => this.resourceManager.addScarcityEvent(event));

    // Check for failures and generate recovery options
    const failure = this.failureRecoverySystem.detectFailure(action, outcome, {
      questId: context.storyState.quests.find(q => q.status === 'active')?.id,
      combatResult: context.combatResult?.outcome,
      location: context.storyState.currentLocation,
    });

    const recoveryOptions = failure 
      ? this.failureRecoverySystem.generateRecoveryOptions(failure, context.storyState)
      : [];

    // Generate balance recommendations
    const recommendations = generateBalanceRecommendations(
      this.balanceSettings,
      this.performanceMetrics
    );

    // Calculate difficulty adjustments
    const balanceAdjustments = calculateCurrentDifficulty(
      this.balanceSettings,
      this.performanceMetrics
    );

    return {
      updatedMetrics: this.performanceMetrics,
      balanceAdjustments,
      scarcityEvents,
      recoveryOptions,
      recommendations,
    };
  }

  /**
   * Apply balance settings to a combat encounter
   */
  balanceCombatEncounter(
    baseEnemyStats: any,
    encounterContext: {
      playerLevel: number;
      location: string;
      questImportance: 'minor' | 'major' | 'critical';
      playerCondition: 'excellent' | 'good' | 'poor' | 'critical';
    }
  ): any {
    const currentDifficulty = calculateCurrentDifficulty(
      this.balanceSettings,
      this.performanceMetrics
    );

    // Apply base difficulty scaling
    let balancedStats = applyDifficultyToEncounter(
      baseEnemyStats,
      currentDifficulty,
      'combat'
    );

    // Apply contextual adjustments
    if (encounterContext.questImportance === 'critical') {
      balancedStats = {
        ...balancedStats,
        health: Math.floor(balancedStats.health * 1.2),
        attack: Math.floor(balancedStats.attack * 1.1),
      };
    }

    if (encounterContext.playerCondition === 'poor') {
      balancedStats = {
        ...balancedStats,
        health: Math.floor(balancedStats.health * 0.9),
        attack: Math.floor(balancedStats.attack * 0.9),
      };
    }

    return balancedStats;
  }

  /**
   * Calculate rewards with risk/reward balance applied
   */
  calculateBalancedRewards(
    baseRewards: {
      experience?: number;
      currency?: number;
      items?: any[];
      reputation?: number;
    },
    actionContext: {
      riskLevel: number;
      difficultyMultiplier: number;
      timeConstraints?: number;
      creativeSolution?: boolean;
    }
  ): typeof baseRewards {
    const timeBonus = actionContext.timeConstraints ? 
      Math.max(0, (5 - actionContext.timeConstraints) / 5) : 0;
    
    const creativityBonus = actionContext.creativeSolution ? 0.2 : 0;
    
    return this.riskRewardCalculator.calculateReward(
      baseRewards,
      actionContext.riskLevel,
      actionContext.difficultyMultiplier,
      timeBonus + creativityBonus
    );
  }

  /**
   * Get current resource availability with scarcity effects applied
   */
  getResourceAvailability(
    resourceId: string,
    baseAvailability: number,
    context: 'shop' | 'loot' | 'quest_reward' | 'crafting'
  ): {
    adjustedAvailability: number;
    costMultiplier: number;
    qualityMultiplier: number;
    warnings: string[];
  } {
    const availability = this.resourceManager.applyScarcityEffects(
      baseAvailability,
      resourceId,
      'availability'
    );

    const costMultiplier = this.resourceManager.applyScarcityEffects(
      1.0,
      resourceId,
      'cost'
    );

    const qualityMultiplier = this.resourceManager.applyScarcityEffects(
      1.0,
      resourceId,
      'quality'
    );

    const warnings = this.resourceManager.getActiveEvents()
      .filter(event => event.effects.some(effect => effect.resourceId === resourceId))
      .map(event => event.description);

    return {
      adjustedAvailability: availability,
      costMultiplier,
      qualityMultiplier,
      warnings,
    };
  }

  /**
   * Get available trade-offs for current situation
   */
  getAvailableTradeoffs(
    storyState: StructuredStoryState,
    currentSituation: string
  ): any[] {
    return this.riskRewardCalculator.getAvailableTradeoffs({
      playerHealth: storyState.character.health || 100,
      playerResources: storyState.character.currency || 0,
      currentSituation,
      timeConstraints: this.getTimeConstraints(storyState),
    });
  }

  /**
   * Execute a trade-off and return results
   */
  executeTradeoff(
    tradeoffId: string,
    storyState: StructuredStoryState
  ): {
    success: boolean;
    updatedState: StructuredStoryState;
    effects: string[];
    message: string;
  } {
    const result = this.riskRewardCalculator.executeTradeoff(tradeoffId, {
      playerHealth: storyState.character.health || 100,
      playerResources: storyState.character.currency || 0,
      playerStats: storyState.character,
    });

    if (result.success) {
      const updatedState = {
        ...storyState,
        character: {
          ...storyState.character,
          health: result.newState.playerHealth,
          currency: result.newState.playerResources,
        },
      };

      return {
        success: true,
        updatedState,
        effects: result.effects,
        message: result.message,
      };
    }

    return {
      success: false,
      updatedState: storyState,
      effects: [],
      message: result.message,
    };
  }

  // === SYSTEM STATE MANAGEMENT ===

  /**
   * Update the system with new story state
   */
  updateSystemState(storyState: StructuredStoryState): void {
    // Update resource manager
    this.resourceManager.updateActiveEvents(1);

    // Update performance metrics timestamp
    this.performanceMetrics.lastUpdated = new Date().toISOString();
  }

  /**
   * Get current system status and recommendations
   */
  getSystemStatus(): {
    currentDifficulty: any;
    performanceSummary: any;
    activeEvents: any[];
    recommendations: string[];
    playerResilience: any;
  } {
    const currentDifficulty = calculateCurrentDifficulty(
      this.balanceSettings,
      this.performanceMetrics
    );

    const recommendations = generateBalanceRecommendations(
      this.balanceSettings,
      this.performanceMetrics
    );

    const playerResilience = this.failureRecoverySystem.calculatePlayerResilience(
      this.failureRecoverySystem.getRecoveryHistory()
    );

    return {
      currentDifficulty,
      performanceSummary: {
        combatWinRate: this.performanceMetrics.combatMetrics.winRate,
        resourceEfficiency: this.performanceMetrics.resourceMetrics.efficiency,
        questCompletionRate: this.performanceMetrics.questMetrics.completionRate,
        overallEngagement: this.performanceMetrics.overallMetrics.engagementLevel,
        frustrationLevel: this.performanceMetrics.overallMetrics.frustrationLevel,
      },
      activeEvents: this.resourceManager.getActiveEvents(),
      recommendations,
      playerResilience,
    };
  }

  // === PRIVATE HELPER METHODS ===

  private updatePerformanceMetrics(context: any): void {
    // Update combat metrics
    if (context.combatResult) {
      this.performanceMetrics.combatMetrics = updateCombatPerformance(
        this.performanceMetrics.combatMetrics,
        context.combatResult
      );
    }

    // Update resource metrics
    if (context.resourcesUsed) {
      const efficiency = context.success ? 80 : 30;
      this.performanceMetrics.resourceMetrics = updateResourcePerformance(
        this.performanceMetrics.resourceMetrics,
        {
          type: 'use',
          efficiency,
          context: context.actionType,
        }
      );
    }

    // Update quest metrics (simplified)
    if (context.actionType === 'quest') {
      const alpha = 0.1;
      const newCompletionRate = context.success ? 100 : 0;
      this.performanceMetrics.questMetrics.completionRate = 
        this.performanceMetrics.questMetrics.completionRate * (1 - alpha) + 
        newCompletionRate * alpha;
    }
  }

  private getTimeConstraints(storyState: StructuredStoryState): number | undefined {
    // Check for time-sensitive quests
    const urgentQuests = storyState.quests.filter(quest => 
      quest.status === 'active' && 
      quest.description.toLowerCase().includes('urgent')
    );
    
    return urgentQuests.length > 0 ? 2 : undefined; // 2 turns for urgent quests
  }

  // === PUBLIC GETTERS ===

  getBalanceSettings(): GameBalanceSettings {
    return { ...this.balanceSettings };
  }

  getPerformanceMetrics(): PlayerPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  updateBalanceSettings(newSettings: Partial<GameBalanceSettings>): void {
    this.balanceSettings = { ...this.balanceSettings, ...newSettings };
  }
}
