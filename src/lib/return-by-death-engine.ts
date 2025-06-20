/**
 * Return by Death Engine
 * 
 * Specialized implementation for Subaru's "Return by Death" ability,
 * integrating with the temporal loop system and managing psychological effects.
 */

import type {
  CharacterProfile,
  StructuredStoryState,
  ReturnByDeathAbility,
  PsychologicalProgressionTracker,
  PsychologicalStage,
  CopingMechanism,
  TemporalGameState,
  TemporalSaveState,
  MemoryRetentionEntry,
  AbilityUsageRecord,
  DeathTriggerCondition
} from '@/types/story';
import {
  initializeTemporalLoop,
  triggerTimeLoop,
  createTemporalSaveState,
  calculateMemoryRetention
} from '@/lib/temporal-loop-engine';
import { generateUUID } from '@/lib/utils';

// === RETURN BY DEATH INITIALIZATION ===

export function createReturnByDeathAbility(
  characterName: string,
  seriesName: string = 'Re:Zero'
): ReturnByDeathAbility {
  return {
    id: 'return_by_death',
    name: 'Return by Death',
    description: 'Upon death, return to a previous point in time with retained memories and knowledge.',
    category: 'time_loop',
    rarity: 'divine',
    seriesOrigin: seriesName,
    
    powerLevel: 95, // Extremely powerful but with severe restrictions
    
    balanceMechanisms: [
      {
        type: 'psychological_cost',
        severity: 'severe',
        description: 'Each death and loop causes severe psychological trauma',
        mechanicalEffect: 'Reduces sanity and increases trauma accumulation'
      },
      {
        type: 'narrative_restriction',
        severity: 'major',
        description: 'Cannot reveal the ability to others without severe consequences',
        mechanicalEffect: 'Attempting to reveal triggers Witch\'s scent and potential death'
      },
      {
        type: 'story_consequence',
        severity: 'major',
        description: 'Overuse leads to isolation and psychological breakdown',
        mechanicalEffect: 'Affects relationship building and character development'
      }
    ],
    
    activationConditions: [
      {
        type: 'death',
        description: 'Automatically activates upon character death',
        isControllable: false
      },
      {
        type: 'extreme_emotion',
        threshold: 90,
        description: 'Can trigger during extreme despair or determination',
        isControllable: false
      }
    ],
    
    cooldownInfo: {
      type: 'emotional_recovery',
      duration: 0, // No mechanical cooldown, but psychological effects accumulate
      description: 'No cooldown, but psychological effects worsen with each use',
      canBeReduced: false
    },
    
    costs: [
      {
        type: 'sanity',
        amount: 15,
        description: 'Severe psychological trauma from experiencing death',
        isPermanent: false
      },
      {
        type: 'memory',
        amount: 5,
        description: 'Some memories may become fragmented or unclear',
        isPermanent: false
      }
    ],
    
    effects: [
      {
        type: 'timeline_reset',
        scope: 'world',
        description: 'Resets world state to previous save point',
        mechanicalImplementation: 'Restores story state from temporal save'
      },
      {
        type: 'knowledge_retention',
        scope: 'self',
        description: 'Retains memories and knowledge from previous loops',
        mechanicalImplementation: 'Preserves character knowledge and relationship insights'
      }
    ],
    
    narrativeRestrictions: [
      {
        type: 'cannot_reveal',
        description: 'Cannot directly tell others about the ability',
        severity: 'major',
        workarounds: ['Indirect hints', 'Demonstrating knowledge', 'Behavioral changes']
      },
      {
        type: 'disbelief',
        description: 'Others will not believe claims about time loops',
        severity: 'moderate',
        workarounds: ['Proving knowledge of future events', 'Consistent predictions']
      }
    ],
    
    psychologicalEffects: [
      {
        type: 'trauma',
        severity: 'severe',
        description: 'Accumulating trauma from repeated deaths',
        duration: 'permanent',
        effects: ['Decreased sanity', 'Increased anxiety', 'Emotional numbness']
      }
    ],
    
    isUnlocked: true, // Subaru starts with this ability
    isActive: false,
    usageHistory: [],
    
    // Return by Death specific properties
    temporalMechanics: {
      savePointType: 'story_beats',
      savePointFrequency: 3, // Every 3 major story events
      maxRetainedLoops: 10,
      temporalStabilityDecay: 2,
      realityAnchorPoints: ['Witch\'s scent detection', 'Major character deaths', 'Covenant violations']
    },
    
    memoryRetention: {
      baseRetentionRate: 85,
      emotionalMemoryBonus: 15,
      traumaticMemoryPenalty: -10,
      relationshipMemoryPersistence: true,
      skillMemoryRetention: false, // Skills don't carry over
      fragmentedMemoryChance: 20
    },
    
    psychologicalProgression: initializePsychologicalProgression(),
    
    deathTriggers: [
      {
        type: 'health_zero',
        description: 'Character health reaches zero',
        canBeAvoided: true,
        avoidanceMethods: ['Healing items', 'Avoiding combat', 'Better strategy']
      },
      {
        type: 'instant_death',
        description: 'Certain attacks or events cause instant death',
        canBeAvoided: false
      },
      {
        type: 'story_failure',
        description: 'Critical story objectives fail catastrophically',
        canBeAvoided: true,
        avoidanceMethods: ['Better choices', 'Information gathering', 'Relationship building']
      }
    ],
    
    loopLimitations: [
      {
        type: 'knowledge_restriction',
        description: 'Cannot directly share loop knowledge',
        severity: 'major',
        workarounds: ['Indirect communication', 'Behavioral demonstration']
      },
      {
        type: 'fate_resistance',
        description: 'Some events are difficult or impossible to change',
        severity: 'moderate',
        workarounds: ['Finding alternative approaches', 'Changing circumstances']
      }
    ]
  };
}

function initializePsychologicalProgression(): PsychologicalProgressionTracker {
  return {
    currentSanity: 100,
    maxSanity: 100,
    traumaAccumulation: 0,
    desensitizationLevel: 0,
    determinationLevel: 50,
    isolationLevel: 0,
    
    currentStage: 'denial',
    stageProgression: 0,
    availableCopingMechanisms: [
      {
        id: 'denial_mechanism',
        name: 'Denial',
        description: 'Refusing to accept the reality of the situation',
        type: 'unhealthy',
        effectiveness: 30,
        sideEffects: ['Delayed processing', 'Poor decision making'],
        unlockConditions: ['First death']
      }
    ]
  };
}

// === RETURN BY DEATH EXECUTION ===

export function executeReturnByDeath(
  character: CharacterProfile,
  storyState: StructuredStoryState,
  deathReason: string,
  turnId: string
): {
  success: boolean;
  character: CharacterProfile;
  storyState: StructuredStoryState;
  loopInfo: {
    loopNumber: number;
    savePointReached: string;
    memoryRetention: number;
    psychologicalImpact: number;
  };
  error?: string;
} {
  const rbdAbility = character.returnByDeathAbility;
  if (!rbdAbility) {
    return {
      success: false,
      character,
      storyState,
      loopInfo: { loopNumber: 0, savePointReached: '', memoryRetention: 0, psychologicalImpact: 0 },
      error: 'Return by Death ability not found'
    };
  }

  // Initialize temporal loop if not already active
  let updatedStoryState = storyState;
  if (!storyState.temporalState?.loopMechanicsActive) {
    updatedStoryState = initializeTemporalLoop(deathReason, storyState);
  }

  // Execute the temporal loop
  const loopResult = triggerTimeLoop(updatedStoryState, deathReason);

  // Calculate psychological impact
  const psychologicalImpact = calculateDeathPsychologicalImpact(rbdAbility, deathReason);
  
  // Update psychological progression
  const updatedPsychProgression = updatePsychologicalProgression(
    rbdAbility.psychologicalProgression,
    psychologicalImpact,
    deathReason
  );

  // Calculate memory retention for this loop
  const memoryRetention = calculateLoopMemoryRetention(rbdAbility, deathReason, psychologicalImpact);

  // Record the usage
  const usageRecord: AbilityUsageRecord = {
    usageId: generateUUID(),
    timestamp: new Date().toISOString(),
    turnId,
    triggerReason: deathReason,
    stateBeforeUsage: { character, storyState },
    stateAfterUsage: { character, storyState: loopResult },
    psychologicalImpact,
    narrativeConsequences: [
      'Timeline reset to previous save point',
      'Memories retained with some fragmentation',
      'Psychological trauma accumulated'
    ]
  };

  // Update the ability
  const updatedAbility: ReturnByDeathAbility = {
    ...rbdAbility,
    psychologicalProgression: updatedPsychProgression,
    usageHistory: [...rbdAbility.usageHistory, usageRecord]
  };

  // Update character
  const updatedCharacter: CharacterProfile = {
    ...character,
    returnByDeathAbility: updatedAbility,
    // Reset health but keep psychological effects
    health: character.maxHealth,
    mana: character.maxMana
  };

  return {
    success: true,
    character: updatedCharacter,
    storyState: loopResult,
    loopInfo: {
      loopNumber: loopResult.temporalState?.totalLoops || 1,
      savePointReached: loopResult.temporalState?.loopTriggerEvent || 'Unknown',
      memoryRetention,
      psychologicalImpact
    }
  };
}

// === PSYCHOLOGICAL PROGRESSION ===

function calculateDeathPsychologicalImpact(
  ability: ReturnByDeathAbility,
  deathReason: string
): number {
  let baseImpact = 20; // Base psychological impact of death
  
  // Increase impact based on death type
  if (deathReason.includes('brutal') || deathReason.includes('torture')) {
    baseImpact += 15;
  }
  if (deathReason.includes('betrayal')) {
    baseImpact += 10;
  }
  if (deathReason.includes('failure to save')) {
    baseImpact += 12;
  }
  
  // Reduce impact based on desensitization
  const desensitizationReduction = ability.psychologicalProgression.desensitizationLevel * 0.3;
  
  return Math.max(5, baseImpact - desensitizationReduction);
}

function updatePsychologicalProgression(
  progression: PsychologicalProgressionTracker,
  impact: number,
  deathReason: string
): PsychologicalProgressionTracker {
  const newTrauma = progression.traumaAccumulation + impact;
  const newSanity = Math.max(0, progression.currentSanity - (impact * 0.5));
  const newDesensitization = Math.min(100, progression.desensitizationLevel + (impact * 0.2));
  
  // Determine stage progression
  const { newStage, newProgression } = calculateStageProgression(
    progression.currentStage,
    progression.stageProgression,
    newTrauma,
    newSanity
  );

  return {
    ...progression,
    currentSanity: newSanity,
    traumaAccumulation: newTrauma,
    desensitizationLevel: newDesensitization,
    currentStage: newStage,
    stageProgression: newProgression,
    isolationLevel: Math.min(100, progression.isolationLevel + (impact * 0.1))
  };
}

function calculateStageProgression(
  currentStage: PsychologicalStage,
  currentProgression: number,
  trauma: number,
  sanity: number
): { newStage: PsychologicalStage; newProgression: number } {
  // Simplified stage progression logic
  const stageOrder: PsychologicalStage[] = [
    'denial', 'panic', 'experimentation', 'determination', 
    'desperation', 'acceptance', 'mastery', 'transcendence'
  ];
  
  const currentIndex = stageOrder.indexOf(currentStage);
  let newProgression = currentProgression + 10; // Each death advances progression
  
  if (newProgression >= 100 && currentIndex < stageOrder.length - 1) {
    return {
      newStage: stageOrder[currentIndex + 1],
      newProgression: 0
    };
  }
  
  return {
    newStage: currentStage,
    newProgression: Math.min(100, newProgression)
  };
}

function calculateLoopMemoryRetention(
  ability: ReturnByDeathAbility,
  deathReason: string,
  psychologicalImpact: number
): number {
  let retention = ability.memoryRetention.baseRetentionRate;
  
  // Emotional events are better remembered
  if (deathReason.includes('emotional') || deathReason.includes('betrayal')) {
    retention += ability.memoryRetention.emotionalMemoryBonus;
  }
  
  // Traumatic events may be suppressed
  if (psychologicalImpact > 25) {
    retention += ability.memoryRetention.traumaticMemoryPenalty;
  }
  
  // Sanity affects memory clarity
  const sanityModifier = (ability.psychologicalProgression.currentSanity - 50) * 0.2;
  retention += sanityModifier;
  
  return Math.max(10, Math.min(100, retention));
}

// === SAVE POINT MANAGEMENT ===

export function shouldCreateSavePoint(
  storyState: StructuredStoryState,
  ability: ReturnByDeathAbility,
  turnId: string
): boolean {
  const temporalState = storyState.temporalState;
  if (!temporalState) return true; // First save point
  
  // Check if enough story beats have passed
  const turnsSinceLastSave = calculateTurnsSinceLastSave(storyState, turnId);
  
  return turnsSinceLastSave >= ability.temporalMechanics.savePointFrequency;
}

function calculateTurnsSinceLastSave(storyState: StructuredStoryState, currentTurnId: string): number {
  // Simplified calculation - in real implementation, would track turn history
  return 1;
}

// === ABILITY RESTRICTIONS ===

export function checkReturnByDeathRestrictions(
  character: CharacterProfile,
  action: string,
  context: string
): { allowed: boolean; consequence?: string; warning?: string } {
  const ability = character.returnByDeathAbility;
  if (!ability) return { allowed: true };
  
  // Check for revelation attempts
  if (action.includes('tell') && context.includes('time loop')) {
    return {
      allowed: false,
      consequence: 'Witch\'s scent intensifies, causing severe discomfort',
      warning: 'Something prevents you from speaking about this...'
    };
  }
  
  // Check for direct ability mentions
  if (action.includes('return by death') || action.includes('reset')) {
    return {
      allowed: false,
      consequence: 'An invisible force stops your words',
      warning: 'You feel a crushing weight preventing you from continuing...'
    };
  }
  
  return { allowed: true };
}
