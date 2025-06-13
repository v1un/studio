/**
 * Game Balance Engine
 * 
 * Core system for managing game balance and difficulty:
 * - Dynamic difficulty adjustment based on player performance
 * - Difficulty mode management (Easy/Normal/Hard/Custom)
 * - Performance metrics tracking and analysis
 * - Balance recommendations and automatic adjustments
 */

import type {
  GameBalanceSettings,
  CustomDifficultySettings,
  DynamicDifficultySettings,
  PlayerPerformanceMetrics,
  CombatPerformanceMetrics,
  ResourceManagementMetrics,
  QuestPerformanceMetrics,
  OverallPerformanceMetrics,
  CombatResult,
  StructuredStoryState,
  CharacterProfile
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === DIFFICULTY PRESETS ===

export const DIFFICULTY_PRESETS: Record<string, CustomDifficultySettings> = {
  easy: {
    combatScaling: 0.7,
    resourceScarcity: 0.6,
    consequenceSeverity: 0.5,
    timeConstraints: 0.8,
    enemyIntelligence: 0.6,
    lootRarity: 1.3,
    experienceGain: 1.2,
  },
  normal: {
    combatScaling: 1.0,
    resourceScarcity: 1.0,
    consequenceSeverity: 1.0,
    timeConstraints: 1.0,
    enemyIntelligence: 1.0,
    lootRarity: 1.0,
    experienceGain: 1.0,
  },
  hard: {
    combatScaling: 1.4,
    resourceScarcity: 1.5,
    consequenceSeverity: 1.3,
    timeConstraints: 1.2,
    enemyIntelligence: 1.3,
    lootRarity: 0.8,
    experienceGain: 0.9,
  },
};

// === INITIALIZATION ===

export function initializeGameBalance(): GameBalanceSettings {
  return {
    difficultyMode: 'normal',
    dynamicAdjustment: {
      enabled: true,
      adjustmentSensitivity: 50,
      performanceWindow: 10,
      maxAdjustmentPerSession: 0.2,
      adjustmentFactors: {
        winLossRatio: 0.3,
        resourceEfficiency: 0.2,
        questCompletionRate: 0.25,
        playerFrustrationIndicators: 0.15,
        sessionLength: 0.1,
      },
    },
    resourceScarcity: {
      enabled: true,
      scarcityLevel: 30,
      affectedResources: [],
      scarcityEvents: [],
      recoveryMechanics: [],
    },
    riskRewardBalance: {
      enabled: true,
      riskTolerance: 50,
      rewardScaling: {
        baseMultiplier: 1.0,
        riskBonusMultiplier: 0.2,
        difficultyBonusMultiplier: 0.15,
        rarityBonusMultiplier: 0.1,
        timeConstraintBonusMultiplier: 0.1,
      },
      riskFactors: [],
      tradeoffMechanics: [],
    },
    failureRecovery: {
      enabled: true,
      failureConsequenceSeverity: 50,
      recoveryDifficulty: 50,
      allowedFailureTypes: [],
      recoveryMechanics: [],
    },
  };
}

export function initializePlayerPerformanceMetrics(): PlayerPerformanceMetrics {
  return {
    combatMetrics: {
      winRate: 50,
      averageCombatDuration: 5,
      damageEfficiency: 50,
      resourceUsageEfficiency: 50,
      tacticalDecisionQuality: 50,
      recentCombats: [],
    },
    resourceMetrics: {
      efficiency: 50,
      wasteRate: 20,
      scarcityAdaptation: 50,
      investmentWisdom: 50,
      emergencyPreparedness: 50,
    },
    questMetrics: {
      completionRate: 70,
      averageAttemptsPerQuest: 1.2,
      timeManagement: 50,
      solutionCreativity: 50,
      consequenceAwareness: 50,
    },
    overallMetrics: {
      adaptabilityScore: 50,
      learningRate: 50,
      frustrationLevel: 20,
      engagementLevel: 70,
      preferredDifficultyRange: { min: 40, max: 60 },
    },
    lastUpdated: new Date().toISOString(),
  };
}

// === DIFFICULTY CALCULATION ===

export function calculateCurrentDifficulty(
  balanceSettings: GameBalanceSettings,
  performanceMetrics: PlayerPerformanceMetrics
): CustomDifficultySettings {
  let baseDifficulty = DIFFICULTY_PRESETS[balanceSettings.difficultyMode] || DIFFICULTY_PRESETS.normal;
  
  if (balanceSettings.customSettings) {
    baseDifficulty = balanceSettings.customSettings;
  }

  if (!balanceSettings.dynamicAdjustment.enabled) {
    return baseDifficulty;
  }

  // Calculate performance-based adjustments
  const adjustments = calculateDifficultyAdjustments(balanceSettings, performanceMetrics);
  
  return {
    combatScaling: Math.max(0.3, Math.min(2.0, baseDifficulty.combatScaling + adjustments.combat)),
    resourceScarcity: Math.max(0.3, Math.min(2.0, baseDifficulty.resourceScarcity + adjustments.resource)),
    consequenceSeverity: Math.max(0.3, Math.min(2.0, baseDifficulty.consequenceSeverity + adjustments.consequence)),
    timeConstraints: Math.max(0.3, Math.min(2.0, baseDifficulty.timeConstraints + adjustments.time)),
    enemyIntelligence: Math.max(0.3, Math.min(2.0, baseDifficulty.enemyIntelligence + adjustments.intelligence)),
    lootRarity: Math.max(0.3, Math.min(2.0, baseDifficulty.lootRarity + adjustments.loot)),
    experienceGain: Math.max(0.3, Math.min(2.0, baseDifficulty.experienceGain + adjustments.experience)),
  };
}

function calculateDifficultyAdjustments(
  balanceSettings: GameBalanceSettings,
  performanceMetrics: PlayerPerformanceMetrics
): Record<string, number> {
  const factors = balanceSettings.dynamicAdjustment.adjustmentFactors;
  const sensitivity = balanceSettings.dynamicAdjustment.adjustmentSensitivity / 100;
  const maxAdjustment = balanceSettings.dynamicAdjustment.maxAdjustmentPerSession;

  // Calculate performance scores (0-100 scale, 50 is target)
  const combatScore = performanceMetrics.combatMetrics.winRate;
  const resourceScore = performanceMetrics.resourceMetrics.efficiency;
  const questScore = performanceMetrics.questMetrics.completionRate;
  const frustrationScore = 100 - performanceMetrics.overallMetrics.frustrationLevel;
  const engagementScore = performanceMetrics.overallMetrics.engagementLevel;

  // Calculate weighted performance score
  const overallPerformance = (
    combatScore * factors.winLossRatio +
    resourceScore * factors.resourceEfficiency +
    questScore * factors.questCompletionRate +
    frustrationScore * factors.playerFrustrationIndicators +
    engagementScore * factors.sessionLength
  );

  // Convert to adjustment factor (-1 to +1, where 0 means no change needed)
  const performanceDelta = (overallPerformance - 50) / 50; // -1 to +1
  const adjustmentMagnitude = performanceDelta * sensitivity * maxAdjustment;

  // If player is performing too well (positive delta), increase difficulty
  // If player is struggling (negative delta), decrease difficulty
  return {
    combat: -adjustmentMagnitude * 0.8, // Combat is most impactful
    resource: -adjustmentMagnitude * 0.6,
    consequence: -adjustmentMagnitude * 0.4,
    time: -adjustmentMagnitude * 0.3,
    intelligence: -adjustmentMagnitude * 0.5,
    loot: adjustmentMagnitude * 0.4, // Inverse for loot (better performance = better loot)
    experience: adjustmentMagnitude * 0.2, // Slight experience bonus for good performance
  };
}

// === PERFORMANCE TRACKING ===

export function updateCombatPerformance(
  currentMetrics: CombatPerformanceMetrics,
  combatResult: CombatResult
): CombatPerformanceMetrics {
  const recentCombats = [...currentMetrics.recentCombats, combatResult].slice(-10); // Keep last 10
  
  const winRate = (recentCombats.filter(c => c.outcome === 'victory').length / recentCombats.length) * 100;
  const averageDuration = recentCombats.reduce((sum, c) => sum + c.duration, 0) / recentCombats.length;

  return {
    ...currentMetrics,
    winRate,
    averageCombatDuration: averageDuration,
    recentCombats,
  };
}

export function updateResourcePerformance(
  currentMetrics: ResourceManagementMetrics,
  resourceAction: {
    type: 'use' | 'waste' | 'invest' | 'emergency';
    efficiency: number; // 0-100
    context: string;
  }
): ResourceManagementMetrics {
  // Simple moving average update
  const alpha = 0.1; // Learning rate
  
  let efficiencyUpdate = currentMetrics.efficiency;
  let wasteUpdate = currentMetrics.wasteRate;
  let investmentUpdate = currentMetrics.investmentWisdom;
  let emergencyUpdate = currentMetrics.emergencyPreparedness;

  switch (resourceAction.type) {
    case 'use':
      efficiencyUpdate = currentMetrics.efficiency * (1 - alpha) + resourceAction.efficiency * alpha;
      break;
    case 'waste':
      wasteUpdate = currentMetrics.wasteRate * (1 - alpha) + (100 - resourceAction.efficiency) * alpha;
      break;
    case 'invest':
      investmentUpdate = currentMetrics.investmentWisdom * (1 - alpha) + resourceAction.efficiency * alpha;
      break;
    case 'emergency':
      emergencyUpdate = currentMetrics.emergencyPreparedness * (1 - alpha) + resourceAction.efficiency * alpha;
      break;
  }

  return {
    ...currentMetrics,
    efficiency: efficiencyUpdate,
    wasteRate: wasteUpdate,
    investmentWisdom: investmentUpdate,
    emergencyPreparedness: emergencyUpdate,
  };
}

// === BALANCE RECOMMENDATIONS ===

export function generateBalanceRecommendations(
  balanceSettings: GameBalanceSettings,
  performanceMetrics: PlayerPerformanceMetrics
): string[] {
  const recommendations: string[] = [];
  
  // Check for performance issues
  if (performanceMetrics.combatMetrics.winRate < 30) {
    recommendations.push("Consider reducing combat difficulty - player is struggling with encounters");
  }
  
  if (performanceMetrics.combatMetrics.winRate > 80) {
    recommendations.push("Consider increasing combat difficulty - player may be finding encounters too easy");
  }
  
  if (performanceMetrics.overallMetrics.frustrationLevel > 70) {
    recommendations.push("High frustration detected - consider reducing overall difficulty");
  }
  
  if (performanceMetrics.overallMetrics.engagementLevel < 40) {
    recommendations.push("Low engagement detected - consider adding more varied challenges");
  }
  
  if (performanceMetrics.resourceMetrics.wasteRate > 60) {
    recommendations.push("Player is wasting resources - consider adding resource management tutorials");
  }
  
  if (performanceMetrics.questMetrics.completionRate < 50) {
    recommendations.push("Low quest completion rate - consider simplifying quest objectives or adding guidance");
  }

  return recommendations;
}

// === INTEGRATION HELPERS ===

export function applyDifficultyToEncounter(
  baseStats: any,
  difficulty: CustomDifficultySettings,
  encounterType: 'combat' | 'resource' | 'social' | 'exploration'
): any {
  switch (encounterType) {
    case 'combat':
      return {
        ...baseStats,
        health: Math.floor(baseStats.health * difficulty.combatScaling),
        attack: Math.floor(baseStats.attack * difficulty.combatScaling),
        defense: Math.floor(baseStats.defense * difficulty.combatScaling),
      };
    case 'resource':
      return {
        ...baseStats,
        scarcityMultiplier: difficulty.resourceScarcity,
        costMultiplier: difficulty.resourceScarcity,
      };
    default:
      return baseStats;
  }
}
