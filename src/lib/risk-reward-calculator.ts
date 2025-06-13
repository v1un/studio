/**
 * Risk/Reward Calculator
 * 
 * Manages risk/reward balance mechanics and trade-off systems:
 * - Dynamic reward scaling based on risk level
 * - Trade-off mechanics for strategic decisions
 * - Risk assessment for actions and choices
 * - Investment mechanics for resource allocation
 */

import type {
  RiskRewardSettings,
  RiskFactor,
  TradeoffMechanic,
  TradeoffCost,
  TradeoffBenefit,
  RewardScalingSettings,
  StructuredStoryState,
  CharacterProfile,
  Quest,
  Item
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === RISK FACTOR DEFINITIONS ===

export const DEFAULT_RISK_FACTORS: RiskFactor[] = [
  {
    id: 'combat_outnumbered',
    name: 'Outnumbered Combat',
    description: 'Fighting against superior numbers',
    category: 'combat',
    riskLevel: 75,
    potentialConsequences: ['Character death', 'Equipment loss', 'Resource depletion'],
    mitigationOptions: ['Better equipment', 'Tactical positioning', 'Allies'],
  },
  {
    id: 'resource_investment',
    name: 'High-Stakes Investment',
    description: 'Investing significant resources for potential gain',
    category: 'resource',
    riskLevel: 60,
    potentialConsequences: ['Resource loss', 'Opportunity cost', 'Delayed progress'],
    mitigationOptions: ['Diversification', 'Research', 'Gradual investment'],
  },
  {
    id: 'time_pressure',
    name: 'Time-Critical Decision',
    description: 'Making decisions under severe time constraints',
    category: 'time',
    riskLevel: 50,
    potentialConsequences: ['Suboptimal choices', 'Missed opportunities', 'Stress accumulation'],
    mitigationOptions: ['Preparation', 'Quick decision frameworks', 'Delegation'],
  },
  {
    id: 'social_reputation',
    name: 'Reputation Risk',
    description: 'Actions that could significantly impact social standing',
    category: 'social',
    riskLevel: 65,
    potentialConsequences: ['Faction hostility', 'Lost opportunities', 'Social isolation'],
    mitigationOptions: ['Careful diplomacy', 'Alliance building', 'Reputation management'],
  },
  {
    id: 'exploration_unknown',
    name: 'Unknown Territory',
    description: 'Venturing into unexplored or dangerous areas',
    category: 'exploration',
    riskLevel: 70,
    potentialConsequences: ['Getting lost', 'Unexpected encounters', 'Resource depletion'],
    mitigationOptions: ['Preparation', 'Guides', 'Emergency supplies'],
  },
];

// === TRADE-OFF MECHANIC TEMPLATES ===

export const DEFAULT_TRADEOFF_MECHANICS: Omit<TradeoffMechanic, 'id'>[] = [
  {
    name: 'Power at a Price',
    description: 'Sacrifice health for increased combat effectiveness',
    tradeoffType: 'resource_for_power',
    inputCost: {
      type: 'health',
      amount: 25,
      description: 'Lose 25% of current health',
    },
    outputBenefit: {
      type: 'stat_boost',
      amount: 50,
      duration: 5,
      description: '+50% damage for 5 turns',
    },
    cooldown: 10,
    limitations: ['Cannot use below 30% health', 'Once per combat'],
  },
  {
    name: 'Rush Job',
    description: 'Complete tasks faster but with reduced quality',
    tradeoffType: 'time_for_quality',
    inputCost: {
      type: 'opportunity',
      amount: 30,
      description: '30% chance of suboptimal outcome',
    },
    outputBenefit: {
      type: 'advantage',
      amount: 50,
      description: 'Complete task in half the time',
    },
    limitations: ['Quality may suffer', 'May require rework'],
  },
  {
    name: 'High-Risk Investment',
    description: 'Invest resources for potentially high returns',
    tradeoffType: 'risk_for_reward',
    inputCost: {
      type: 'resource',
      amount: 100,
      description: 'Invest significant currency',
    },
    outputBenefit: {
      type: 'resource_gain',
      amount: 300,
      description: 'Potential 300% return on investment',
    },
    limitations: ['50% chance of total loss', 'Results delayed'],
  },
  {
    name: 'Dangerous Shortcut',
    description: 'Take risks to reach destination faster',
    tradeoffType: 'safety_for_speed',
    inputCost: {
      type: 'health',
      amount: 15,
      description: 'Risk injury and resource loss',
    },
    outputBenefit: {
      type: 'advantage',
      amount: 75,
      description: 'Reach destination 75% faster',
    },
    limitations: ['Increased encounter chance', 'Potential equipment damage'],
  },
];

// === RISK/REWARD CALCULATOR ===

export class RiskRewardCalculator {
  private settings: RiskRewardSettings;
  private riskFactors: RiskFactor[];
  private tradeoffMechanics: TradeoffMechanic[];

  constructor(settings: RiskRewardSettings) {
    this.settings = settings;
    this.riskFactors = DEFAULT_RISK_FACTORS;
    this.tradeoffMechanics = DEFAULT_TRADEOFF_MECHANICS.map(template => ({
      id: generateUUID(),
      ...template,
    }));
  }

  // === RISK ASSESSMENT ===

  assessActionRisk(
    action: string,
    context: {
      playerLevel: number;
      currentHealth: number;
      resources: number;
      location: string;
      timeConstraints?: number;
      allies?: number;
    }
  ): { riskLevel: number; applicableFactors: RiskFactor[]; mitigations: string[] } {
    const applicableFactors: RiskFactor[] = [];
    let totalRisk = 0;

    // Analyze action for risk factors
    const actionLower = action.toLowerCase();

    // Combat risks
    if (actionLower.includes('fight') || actionLower.includes('attack') || actionLower.includes('combat')) {
      if (context.allies === 0 || (context.allies || 0) < 2) {
        applicableFactors.push(this.riskFactors.find(f => f.id === 'combat_outnumbered')!);
      }
    }

    // Resource risks
    if (actionLower.includes('invest') || actionLower.includes('spend') || actionLower.includes('trade')) {
      if (context.resources < 200) { // Low resources make investment riskier
        applicableFactors.push(this.riskFactors.find(f => f.id === 'resource_investment')!);
      }
    }

    // Time pressure risks
    if (context.timeConstraints && context.timeConstraints < 3) {
      applicableFactors.push(this.riskFactors.find(f => f.id === 'time_pressure')!);
    }

    // Social risks
    if (actionLower.includes('betray') || actionLower.includes('lie') || actionLower.includes('deceive')) {
      applicableFactors.push(this.riskFactors.find(f => f.id === 'social_reputation')!);
    }

    // Exploration risks
    if (actionLower.includes('explore') || actionLower.includes('venture') || context.location.includes('unknown')) {
      applicableFactors.push(this.riskFactors.find(f => f.id === 'exploration_unknown')!);
    }

    // Calculate total risk
    if (applicableFactors.length > 0) {
      totalRisk = applicableFactors.reduce((sum, factor) => sum + factor.riskLevel, 0) / applicableFactors.length;
      
      // Adjust for player condition
      if (context.currentHealth < 50) totalRisk *= 1.3;
      if (context.resources < 100) totalRisk *= 1.2;
      if (context.playerLevel < 5) totalRisk *= 1.1;
    }

    // Gather mitigation options
    const mitigations = applicableFactors.flatMap(factor => factor.mitigationOptions);

    return {
      riskLevel: Math.min(100, totalRisk),
      applicableFactors,
      mitigations: [...new Set(mitigations)], // Remove duplicates
    };
  }

  // === REWARD CALCULATION ===

  calculateReward(
    baseReward: {
      experience?: number;
      currency?: number;
      items?: Item[];
      reputation?: number;
    },
    riskLevel: number,
    difficultyMultiplier: number = 1.0,
    timeConstraintBonus: number = 0
  ): typeof baseReward {
    if (!this.settings.enabled) return baseReward;

    const scaling = this.settings.rewardScaling;
    
    // Calculate total multiplier
    const riskBonus = 1 + (riskLevel / 100) * scaling.riskBonusMultiplier;
    const difficultyBonus = 1 + (difficultyMultiplier - 1) * scaling.difficultyBonusMultiplier;
    const timeBonus = 1 + timeConstraintBonus * scaling.timeConstraintBonusMultiplier;
    
    const totalMultiplier = scaling.baseMultiplier * riskBonus * difficultyBonus * timeBonus;

    return {
      experience: baseReward.experience ? Math.floor(baseReward.experience * totalMultiplier) : undefined,
      currency: baseReward.currency ? Math.floor(baseReward.currency * totalMultiplier) : undefined,
      items: baseReward.items ? this.scaleItemRewards(baseReward.items, totalMultiplier) : undefined,
      reputation: baseReward.reputation ? Math.floor(baseReward.reputation * totalMultiplier) : undefined,
    };
  }

  private scaleItemRewards(items: Item[], multiplier: number): Item[] {
    // For high-risk actions, improve item quality or add bonus items
    if (multiplier > 1.5) {
      // Add a chance for bonus items
      const bonusChance = (multiplier - 1) * 0.3;
      if (Math.random() < bonusChance) {
        // Add a random bonus item (simplified)
        const bonusItem: Item = {
          id: generateUUID(),
          name: 'Risk Bonus Item',
          description: 'A bonus item earned through taking risks',
          quantity: 1,
          basePrice: Math.floor(50 * multiplier),
        };
        return [...items, bonusItem];
      }
    }
    
    return items;
  }

  // === TRADE-OFF MECHANICS ===

  getAvailableTradeoffs(
    context: {
      playerHealth: number;
      playerResources: number;
      currentSituation: string;
      timeConstraints?: number;
    }
  ): TradeoffMechanic[] {
    return this.tradeoffMechanics.filter(tradeoff => 
      this.canUseTradeoff(tradeoff, context)
    );
  }

  private canUseTradeoff(
    tradeoff: TradeoffMechanic,
    context: {
      playerHealth: number;
      playerResources: number;
      currentSituation: string;
      timeConstraints?: number;
    }
  ): boolean {
    // Check basic requirements
    switch (tradeoff.inputCost.type) {
      case 'health':
        const healthCost = (tradeoff.inputCost.amount / 100) * context.playerHealth;
        return context.playerHealth > healthCost + 10; // Keep minimum health
      
      case 'resource':
        return context.playerResources >= tradeoff.inputCost.amount;
      
      case 'time':
        return !context.timeConstraints || context.timeConstraints > 1;
      
      default:
        return true;
    }
  }

  executeTradeoff(
    tradeoffId: string,
    currentState: {
      playerHealth: number;
      playerResources: number;
      playerStats: any;
    }
  ): {
    success: boolean;
    newState: typeof currentState;
    effects: string[];
    message: string;
  } {
    const tradeoff = this.tradeoffMechanics.find(t => t.id === tradeoffId);
    if (!tradeoff) {
      return {
        success: false,
        newState: currentState,
        effects: [],
        message: 'Trade-off not found',
      };
    }

    const newState = { ...currentState };
    const effects: string[] = [];

    // Apply costs
    switch (tradeoff.inputCost.type) {
      case 'health':
        const healthLoss = (tradeoff.inputCost.amount / 100) * currentState.playerHealth;
        newState.playerHealth = Math.max(1, newState.playerHealth - healthLoss);
        effects.push(`Lost ${Math.floor(healthLoss)} health`);
        break;
      
      case 'resource':
        newState.playerResources = Math.max(0, newState.playerResources - tradeoff.inputCost.amount);
        effects.push(`Spent ${tradeoff.inputCost.amount} resources`);
        break;
    }

    // Apply benefits (simplified - would integrate with actual game systems)
    switch (tradeoff.outputBenefit.type) {
      case 'stat_boost':
        effects.push(`Gained ${tradeoff.outputBenefit.description}`);
        break;
      
      case 'resource_gain':
        // For investment-type tradeoffs, this might be delayed
        if (tradeoff.tradeoffType === 'risk_for_reward') {
          const success = Math.random() > 0.5; // 50% success rate
          if (success) {
            newState.playerResources += tradeoff.outputBenefit.amount;
            effects.push(`Investment succeeded! Gained ${tradeoff.outputBenefit.amount} resources`);
          } else {
            effects.push('Investment failed - resources lost');
          }
        }
        break;
      
      case 'advantage':
        effects.push(`Gained advantage: ${tradeoff.outputBenefit.description}`);
        break;
    }

    return {
      success: true,
      newState,
      effects,
      message: `${tradeoff.name}: ${effects.join(', ')}`,
    };
  }

  // === INVESTMENT MECHANICS ===

  calculateInvestmentReturn(
    investment: {
      amount: number;
      type: 'equipment' | 'skills' | 'resources' | 'relationships';
      riskLevel: number;
    },
    timeElapsed: number
  ): {
    baseReturn: number;
    riskAdjustedReturn: number;
    success: boolean;
    message: string;
  } {
    const baseReturnRate = 0.1; // 10% base return
    const riskMultiplier = 1 + (investment.riskLevel / 100);
    const timeMultiplier = Math.min(2.0, 1 + (timeElapsed * 0.1));

    const baseReturn = investment.amount * baseReturnRate * timeMultiplier;
    const riskAdjustedReturn = baseReturn * riskMultiplier;

    // Determine success based on risk level
    const successChance = Math.max(0.2, 1 - (investment.riskLevel / 150));
    const success = Math.random() < successChance;

    return {
      baseReturn,
      riskAdjustedReturn: success ? riskAdjustedReturn : -investment.amount * 0.5,
      success,
      message: success 
        ? `Investment in ${investment.type} paid off!`
        : `Investment in ${investment.type} failed`,
    };
  }

  // === RISK TOLERANCE ADJUSTMENT ===

  adjustRiskTolerance(
    currentTolerance: number,
    recentOutcomes: Array<{ risk: number; success: boolean; satisfaction: number }>
  ): number {
    if (recentOutcomes.length === 0) return currentTolerance;

    // Calculate average satisfaction with risky decisions
    const riskySatisfaction = recentOutcomes
      .filter(outcome => outcome.risk > 50)
      .reduce((sum, outcome) => sum + outcome.satisfaction, 0) / 
      recentOutcomes.filter(outcome => outcome.risk > 50).length || 50;

    // Adjust tolerance based on satisfaction
    const adjustment = (riskySatisfaction - 50) * 0.1; // Small adjustments
    
    return Math.max(0, Math.min(100, currentTolerance + adjustment));
  }
}
