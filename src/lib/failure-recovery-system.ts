/**
 * Failure Recovery System
 * 
 * Manages failure states and recovery mechanics:
 * - Failure state detection and classification
 * - Recovery option generation and management
 * - Alternative path creation for failed objectives
 * - Player resilience and learning tracking
 */

import type {
  FailureRecoverySettings,
  FailureType,
  FailureConsequence,
  FailureRecoveryMechanic,
  FailureRecoveryRecord,
  RecoveryRequirement,
  TradeoffCost,
  StructuredStoryState,
  CharacterProfile,
  Quest,
  QuestFailureRecord
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === FAILURE TYPE DEFINITIONS ===

export const DEFAULT_FAILURE_TYPES: FailureType[] = [
  {
    id: 'combat_defeat',
    name: 'Combat Defeat',
    description: 'Player was defeated in combat',
    category: 'combat',
    isGameOver: false,
    defaultConsequences: [
      {
        type: 'temporary_debuff',
        severity: 'moderate',
        duration: 3,
        description: 'Wounded and demoralized',
        reversible: true,
      },
      {
        type: 'resource_loss',
        severity: 'minor',
        description: 'Lost some equipment durability',
        reversible: true,
      },
    ],
    recoveryOptions: ['medical_treatment', 'rest_and_recovery', 'equipment_repair'],
  },
  {
    id: 'quest_failure',
    name: 'Quest Failure',
    description: 'Failed to complete a quest objective',
    category: 'quest',
    isGameOver: false,
    defaultConsequences: [
      {
        type: 'reputation_damage',
        severity: 'moderate',
        description: 'Lost standing with quest giver',
        reversible: true,
      },
      {
        type: 'opportunity_loss',
        severity: 'major',
        description: 'Missed quest rewards and follow-up opportunities',
        reversible: false,
      },
    ],
    recoveryOptions: ['alternative_completion', 'reputation_repair', 'new_opportunities'],
  },
  {
    id: 'social_blunder',
    name: 'Social Mistake',
    description: 'Made a significant social error',
    category: 'social',
    isGameOver: false,
    defaultConsequences: [
      {
        type: 'reputation_damage',
        severity: 'moderate',
        description: 'Damaged relationships with NPCs',
        reversible: true,
      },
    ],
    recoveryOptions: ['apology_and_amends', 'time_healing', 'mediator_assistance'],
  },
  {
    id: 'resource_depletion',
    name: 'Critical Resource Loss',
    description: 'Ran out of essential resources',
    category: 'resource',
    isGameOver: false,
    defaultConsequences: [
      {
        type: 'temporary_debuff',
        severity: 'major',
        duration: 5,
        description: 'Severely weakened by lack of resources',
        reversible: true,
      },
    ],
    recoveryOptions: ['emergency_acquisition', 'alternative_resources', 'assistance_seeking'],
  },
  {
    id: 'exploration_lost',
    name: 'Lost in Unknown Territory',
    description: 'Became lost during exploration',
    category: 'exploration',
    isGameOver: false,
    defaultConsequences: [
      {
        type: 'time_penalty',
        severity: 'moderate',
        description: 'Significant time lost finding way back',
        reversible: false,
      },
      {
        type: 'resource_loss',
        severity: 'minor',
        description: 'Consumed extra supplies while lost',
        reversible: false,
      },
    ],
    recoveryOptions: ['navigation_assistance', 'local_guide', 'emergency_beacon'],
  },
];

// === RECOVERY MECHANIC TEMPLATES ===

export const DEFAULT_RECOVERY_MECHANICS: Omit<FailureRecoveryMechanic, 'id'>[] = [
  {
    name: 'Medical Treatment',
    description: 'Seek professional healing to recover from injuries',
    applicableFailureTypes: ['combat_defeat'],
    recoveryType: 'resource_investment',
    requirements: [
      {
        type: 'resource',
        value: 'currency',
        description: 'Payment for medical services',
      },
      {
        type: 'location',
        value: 'town',
        description: 'Must be in a settlement with healers',
      },
    ],
    successChance: 90,
    cost: {
      type: 'resource',
      amount: 50,
      description: 'Medical treatment fee',
    },
    timeLimit: 24,
  },
  {
    name: 'Alternative Quest Path',
    description: 'Find an alternative way to achieve quest objectives',
    applicableFailureTypes: ['quest_failure'],
    recoveryType: 'alternative_path',
    requirements: [
      {
        type: 'skill',
        value: 'investigation',
        description: 'Ability to research alternatives',
      },
    ],
    successChance: 70,
    timeLimit: 48,
  },
  {
    name: 'Reputation Repair',
    description: 'Perform good deeds to restore damaged reputation',
    applicableFailureTypes: ['quest_failure', 'social_blunder'],
    recoveryType: 'time_investment',
    requirements: [
      {
        type: 'action',
        value: 'community_service',
        description: 'Must perform helpful actions for the community',
      },
    ],
    successChance: 80,
    timeLimit: 72,
  },
  {
    name: 'Emergency Resource Acquisition',
    description: 'Quickly acquire essential resources through various means',
    applicableFailureTypes: ['resource_depletion'],
    recoveryType: 'resource_investment',
    requirements: [
      {
        type: 'resource',
        value: 'currency',
        description: 'Money to purchase emergency supplies',
      },
    ],
    successChance: 85,
    cost: {
      type: 'resource',
      amount: 75,
      description: 'Emergency supply cost (premium pricing)',
    },
  },
  {
    name: 'Seek Guidance',
    description: 'Ask for help from knowledgeable NPCs or allies',
    applicableFailureTypes: ['exploration_lost', 'quest_failure'],
    recoveryType: 'help_seeking',
    requirements: [
      {
        type: 'resource',
        value: 'reputation',
        description: 'Must have positive relationships to call for help',
      },
    ],
    successChance: 75,
    cost: {
      type: 'reputation',
      amount: 10,
      description: 'Favor owed to helper',
    },
  },
];

// === FAILURE RECOVERY SYSTEM ===

export class FailureRecoverySystem {
  private settings: FailureRecoverySettings;
  private failureTypes: FailureType[];
  private recoveryMechanics: FailureRecoveryMechanic[];
  private recoveryHistory: FailureRecoveryRecord[];

  constructor(settings: FailureRecoverySettings) {
    this.settings = settings;
    this.failureTypes = DEFAULT_FAILURE_TYPES;
    this.recoveryMechanics = DEFAULT_RECOVERY_MECHANICS.map(template => ({
      id: generateUUID(),
      ...template,
    }));
    this.recoveryHistory = [];
  }

  // === FAILURE DETECTION ===

  detectFailure(
    action: string,
    outcome: string,
    context: {
      questId?: string;
      combatResult?: 'victory' | 'defeat' | 'flee';
      resourceLevels?: Record<string, number>;
      socialContext?: string;
      location?: string;
    }
  ): FailureType | null {
    const actionLower = action.toLowerCase();
    const outcomeLower = outcome.toLowerCase();

    // Combat failure detection
    if (context.combatResult === 'defeat') {
      return this.failureTypes.find(f => f.id === 'combat_defeat') || null;
    }

    // Quest failure detection
    if (context.questId && (outcomeLower.includes('fail') || outcomeLower.includes('unable'))) {
      return this.failureTypes.find(f => f.id === 'quest_failure') || null;
    }

    // Social failure detection
    if (context.socialContext && (outcomeLower.includes('offend') || outcomeLower.includes('anger'))) {
      return this.failureTypes.find(f => f.id === 'social_blunder') || null;
    }

    // Resource depletion detection
    if (context.resourceLevels) {
      const criticalResources = Object.entries(context.resourceLevels)
        .filter(([_, level]) => level <= 0);
      if (criticalResources.length > 0) {
        return this.failureTypes.find(f => f.id === 'resource_depletion') || null;
      }
    }

    // Exploration failure detection
    if (actionLower.includes('explore') && outcomeLower.includes('lost')) {
      return this.failureTypes.find(f => f.id === 'exploration_lost') || null;
    }

    return null;
  }

  // === RECOVERY OPTION GENERATION ===

  generateRecoveryOptions(
    failureType: FailureType,
    storyState: StructuredStoryState
  ): FailureRecoveryMechanic[] {
    if (!this.settings.enabled) return [];

    const applicableMechanics = this.recoveryMechanics.filter(mechanic =>
      mechanic.applicableFailureTypes.includes(failureType.id)
    );

    return applicableMechanics.filter(mechanic =>
      this.canUseRecoveryMechanic(mechanic, storyState)
    );
  }

  private canUseRecoveryMechanic(
    mechanic: FailureRecoveryMechanic,
    storyState: StructuredStoryState
  ): boolean {
    return mechanic.requirements.every(requirement => {
      switch (requirement.type) {
        case 'resource':
          if (requirement.value === 'currency') {
            return (storyState.character.currency || 0) >= (mechanic.cost?.amount || 0);
          }
          return true; // Simplified for other resources

        case 'location':
          return storyState.currentLocation.toLowerCase().includes(requirement.value as string);

        case 'skill':
          // Would check character skills - simplified for now
          return storyState.character.level >= 3;

        case 'action':
          // Would check if player can perform the required action
          return true;

        default:
          return true;
      }
    });
  }

  // === RECOVERY EXECUTION ===

  attemptRecovery(
    recoveryMechanicId: string,
    failureContext: {
      failureType: FailureType;
      originalFailureId: string;
      playerState: CharacterProfile;
    }
  ): {
    success: boolean;
    outcome: string;
    consequences: FailureConsequence[];
    newPlayerState: CharacterProfile;
    recoveryRecord: FailureRecoveryRecord;
  } {
    const mechanic = this.recoveryMechanics.find(m => m.id === recoveryMechanicId);
    if (!mechanic) {
      throw new Error(`Recovery mechanic ${recoveryMechanicId} not found`);
    }

    const success = Math.random() * 100 < mechanic.successChance;
    let newPlayerState = { ...failureContext.playerState };
    const consequences: FailureConsequence[] = [];

    // Apply costs
    if (mechanic.cost) {
      switch (mechanic.cost.type) {
        case 'resource':
          newPlayerState.currency = Math.max(0, (newPlayerState.currency || 0) - mechanic.cost.amount);
          break;
        case 'reputation':
          // Would modify reputation - simplified for now
          break;
      }
    }

    // Determine outcome
    let outcome: string;
    if (success) {
      outcome = `Successfully recovered using ${mechanic.name}`;
      
      // Remove or reduce failure consequences
      switch (mechanic.recoveryType) {
        case 'resource_investment':
          outcome += ' - Resources invested to resolve the situation';
          break;
        case 'alternative_path':
          outcome += ' - Found an alternative approach to achieve goals';
          break;
        case 'time_investment':
          outcome += ' - Time and effort gradually resolved the issue';
          break;
        case 'help_seeking':
          outcome += ' - Assistance from others helped overcome the failure';
          break;
      }
    } else {
      outcome = `Recovery attempt failed: ${mechanic.name} was unsuccessful`;
      
      // Add additional consequences for failed recovery
      consequences.push({
        type: 'resource_loss',
        severity: 'minor',
        description: 'Wasted resources on failed recovery attempt',
        reversible: false,
      });
    }

    // Create recovery record
    const recoveryRecord: FailureRecoveryRecord = {
      id: generateUUID(),
      originalFailureId: failureContext.originalFailureId,
      failureType: failureContext.failureType.id,
      recoveryMechanicUsed: mechanic.name,
      recoveryAttemptTimestamp: new Date().toISOString(),
      recoverySuccess: success,
      finalOutcome: outcome,
      lessonsLearned: this.generateLessonsLearned(failureContext.failureType, mechanic, success),
      playerSatisfaction: success ? 75 : 25, // Would be determined by player feedback
    };

    this.recoveryHistory.push(recoveryRecord);

    return {
      success,
      outcome,
      consequences,
      newPlayerState,
      recoveryRecord,
    };
  }

  private generateLessonsLearned(
    failureType: FailureType,
    mechanic: FailureRecoveryMechanic,
    success: boolean
  ): string[] {
    const lessons: string[] = [];

    if (success) {
      lessons.push(`${mechanic.name} is an effective recovery method for ${failureType.name}`);
      
      switch (mechanic.recoveryType) {
        case 'resource_investment':
          lessons.push('Having adequate resources enables quick problem resolution');
          break;
        case 'alternative_path':
          lessons.push('Creative thinking can overcome apparent dead ends');
          break;
        case 'help_seeking':
          lessons.push('Building relationships provides safety nets for failures');
          break;
      }
    } else {
      lessons.push(`${mechanic.name} may not always work for ${failureType.name}`);
      lessons.push('Having backup recovery plans is important');
    }

    // Category-specific lessons
    switch (failureType.category) {
      case 'combat':
        lessons.push('Better preparation and tactics could prevent future combat failures');
        break;
      case 'resource':
        lessons.push('Resource management and emergency reserves are crucial');
        break;
      case 'social':
        lessons.push('Understanding social dynamics helps avoid misunderstandings');
        break;
    }

    return lessons;
  }

  // === ALTERNATIVE PATH GENERATION ===

  generateAlternativePaths(
    originalObjective: string,
    failureReason: string,
    storyState: StructuredStoryState
  ): Array<{
    path: string;
    description: string;
    requirements: string[];
    difficulty: 'easier' | 'similar' | 'harder';
    tradeoffs: string[];
  }> {
    const alternatives = [];

    // Generate context-aware alternatives based on failure reason
    if (failureReason.includes('combat')) {
      alternatives.push({
        path: 'Diplomatic Solution',
        description: 'Negotiate instead of fighting',
        requirements: ['Good social skills', 'Understanding of opponent motivations'],
        difficulty: 'easier' as const,
        tradeoffs: ['May take longer', 'Requires compromise'],
      });

      alternatives.push({
        path: 'Stealth Approach',
        description: 'Avoid direct confrontation through stealth',
        requirements: ['Stealth abilities', 'Knowledge of area layout'],
        difficulty: 'similar' as const,
        tradeoffs: ['Higher risk if discovered', 'Limited options if caught'],
      });
    }

    if (failureReason.includes('resource')) {
      alternatives.push({
        path: 'Resource Substitution',
        description: 'Use alternative resources or methods',
        requirements: ['Creative problem-solving', 'Knowledge of alternatives'],
        difficulty: 'similar' as const,
        tradeoffs: ['May be less efficient', 'Could have different side effects'],
      });

      alternatives.push({
        path: 'Collaborative Effort',
        description: 'Partner with others to share resource burden',
        requirements: ['Good relationships', 'Negotiation skills'],
        difficulty: 'easier' as const,
        tradeoffs: ['Must share rewards', 'Dependent on others'],
      });
    }

    return alternatives;
  }

  // === RESILIENCE TRACKING ===

  calculatePlayerResilience(playerHistory: FailureRecoveryRecord[]): {
    resilienceScore: number;
    adaptabilityScore: number;
    learningRate: number;
    preferredRecoveryMethods: string[];
  } {
    if (playerHistory.length === 0) {
      return {
        resilienceScore: 50,
        adaptabilityScore: 50,
        learningRate: 50,
        preferredRecoveryMethods: [],
      };
    }

    const successRate = playerHistory.filter(r => r.recoverySuccess).length / playerHistory.length;
    const avgSatisfaction = playerHistory.reduce((sum, r) => sum + (r.playerSatisfaction || 50), 0) / playerHistory.length;
    
    // Calculate learning rate based on improvement over time
    const recentSuccessRate = playerHistory.slice(-5).filter(r => r.recoverySuccess).length / Math.min(5, playerHistory.length);
    const learningRate = Math.max(0, Math.min(100, (recentSuccessRate - successRate + 0.5) * 100));

    // Find preferred recovery methods
    const methodCounts = playerHistory.reduce((counts, record) => {
      counts[record.recoveryMechanicUsed] = (counts[record.recoveryMechanicUsed] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const preferredMethods = Object.entries(methodCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([method]) => method);

    return {
      resilienceScore: Math.min(100, successRate * 100 + 10),
      adaptabilityScore: Math.min(100, avgSatisfaction + 10),
      learningRate,
      preferredRecoveryMethods: preferredMethods,
    };
  }

  // === SYSTEM STATE ===

  getRecoveryHistory(): FailureRecoveryRecord[] {
    return [...this.recoveryHistory];
  }

  getFailureTypes(): FailureType[] {
    return [...this.failureTypes];
  }

  getRecoveryMechanics(): FailureRecoveryMechanic[] {
    return [...this.recoveryMechanics];
  }
}
