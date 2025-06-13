/**
 * Arc Integration Manager
 * 
 * Comprehensive integration system that connects Arcs with all game systems:
 * - Combat system integration with narrative context
 * - Progression system integration with meaningful rewards
 * - Quest system integration with dynamic generation
 * - Inventory system integration with key items and crafting
 * - Relationship system integration with social dynamics
 * - Balance system integration with difficulty scaling
 */

import type {
  StoryArc,
  ArcSystemIntegration,
  ArcCombatIntegration,
  ArcProgressionIntegration,
  ArcQuestIntegration,
  ArcInventoryIntegration,
  ArcRelationshipIntegration,
  StructuredStoryState,
  CharacterProfile,
  Quest,
  CombatState,
  QuestConsequence,
  ArcSpecialEncounter,
  ArcSkillUnlock,
  ArcKeyItem,
  ArcKeyRelationship
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === COMBAT SYSTEM INTEGRATION ===

export function integrateCombatWithArc(
  arc: StoryArc,
  combatState: CombatState,
  combatResult: any,
  character: CharacterProfile,
  storyState: StructuredStoryState
): ArcCombatIntegrationResult {
  if (!arc.integrationPoints?.combatIntegration) {
    return { updatedArc: arc, combatModifications: [], narrativeImpacts: [] };
  }

  const integration = arc.integrationPoints.combatIntegration;
  
  // Scale combat difficulty based on arc settings
  const scaledCombat = scaleCombatDifficulty(combatState, arc, character);
  
  // Apply narrative context to combat
  const narrativeContext = applyNarrativeCombatContext(combatState, arc, storyState);
  
  // Process combat consequences for arc progression
  const arcConsequences = processCombatConsequencesForArc(combatResult, arc, character);
  
  // Update arc based on combat outcome
  const updatedArc = updateArcFromCombatOutcome(arc, combatResult, character);

  return {
    updatedArc,
    combatModifications: [scaledCombat],
    narrativeImpacts: [narrativeContext],
    arcConsequences,
  };
}

export interface ArcCombatIntegrationResult {
  updatedArc: StoryArc;
  combatModifications: any[];
  narrativeImpacts: any[];
  arcConsequences?: QuestConsequence[];
}

function scaleCombatDifficulty(combatState: CombatState, arc: StoryArc, character: CharacterProfile): any {
  const arcDifficulty = arc.difficultySettings?.currentDifficulty || 5;
  const scaling = arc.integrationPoints?.combatIntegration?.combatScaling;
  
  if (!scaling) return {};

  const scalingFactor = scaling.scalingFactor * (arcDifficulty / 5);
  const adjustedEnemyLevel = Math.floor(scaling.baseEnemyLevel * scalingFactor);

  return {
    type: 'difficulty_scaling',
    adjustedEnemyLevel,
    scalingFactor,
    reason: `Arc difficulty: ${arcDifficulty}`,
  };
}

function applyNarrativeCombatContext(combatState: CombatState, arc: StoryArc, storyState: StructuredStoryState): any {
  const currentPhase = arc.progression?.currentPhase;
  if (!currentPhase) return {};

  return {
    type: 'narrative_context',
    phaseContext: currentPhase.name,
    narrativeWeight: currentPhase.narrativeWeight,
    storyImportance: determineStoryImportance(currentPhase.narrativeWeight),
    contextualDescription: generateCombatContextDescription(currentPhase, arc),
  };
}

function determineStoryImportance(narrativeWeight: string): string {
  switch (narrativeWeight) {
    case 'climax': return 'climactic';
    case 'rising_action': return 'major';
    case 'falling_action': return 'moderate';
    default: return 'minor';
  }
}

function generateCombatContextDescription(phase: any, arc: StoryArc): string {
  return `This combat occurs during the ${phase.name} phase of ${arc.title}, ${phase.description.toLowerCase()}`;
}

function processCombatConsequencesForArc(combatResult: any, arc: StoryArc, character: CharacterProfile): QuestConsequence[] {
  const consequences: QuestConsequence[] = [];
  
  if (combatResult.victory) {
    consequences.push({
      id: generateUUID(),
      description: 'Combat victory advances arc progression',
      category: 'progression',
      effects: [
        {
          type: 'experience',
          targetId: character.id,
          value: calculateCombatExperienceBonus(arc, combatResult),
          description: 'Experience gained from narrative combat',
        },
      ],
      timing: 'immediate',
      scope: 'character',
      reversible: false,
    });
  } else {
    consequences.push({
      id: generateUUID(),
      description: 'Combat defeat creates narrative tension',
      category: 'setback',
      effects: [
        {
          type: 'narrative_flag',
          targetId: arc.id,
          value: 'combat_defeat',
          description: 'Combat defeat affects story progression',
        },
      ],
      timing: 'immediate',
      scope: 'arc',
      reversible: true,
    });
  }
  
  return consequences;
}

function calculateCombatExperienceBonus(arc: StoryArc, combatResult: any): number {
  const baseBonus = 50;
  const difficultyMultiplier = (arc.difficultySettings?.currentDifficulty || 5) / 5;
  const narrativeMultiplier = arc.progression?.currentPhase?.narrativeWeight === 'climax' ? 2 : 1;
  
  return Math.floor(baseBonus * difficultyMultiplier * narrativeMultiplier);
}

function updateArcFromCombatOutcome(arc: StoryArc, combatResult: any, character: CharacterProfile): StoryArc {
  if (!arc.integrationPoints?.combatIntegration) return arc;

  const newCombatConsequence = {
    combatOutcome: combatResult.victory ? 'victory' as const : 'defeat' as const,
    arcImpact: {
      scope: 'local' as const,
      magnitude: combatResult.significance || 3,
      duration: 'temporary' as const,
      description: `Combat ${combatResult.victory ? 'victory' : 'defeat'} affects arc progression`,
    },
    narrativeChanges: [
      combatResult.victory ? 'Player gains confidence' : 'Player faces setback',
    ],
    relationshipEffects: [],
    worldStateChanges: [],
  };

  return {
    ...arc,
    integrationPoints: {
      ...arc.integrationPoints,
      combatIntegration: {
        ...arc.integrationPoints.combatIntegration,
        combatConsequences: [
          ...arc.integrationPoints.combatIntegration.combatConsequences,
          newCombatConsequence,
        ],
      },
    },
  };
}

// === PROGRESSION SYSTEM INTEGRATION ===

export function integrateProgressionWithArc(
  arc: StoryArc,
  character: CharacterProfile,
  progressionEvent: any,
  storyState: StructuredStoryState
): ArcProgressionIntegrationResult {
  if (!arc.integrationPoints?.progressionIntegration) {
    return { updatedArc: arc, experienceModifications: [], skillUnlocks: [], specializationOpportunities: [] };
  }

  const integration = arc.integrationPoints.progressionIntegration;
  
  // Calculate experience bonuses based on arc context
  const experienceModifications = calculateArcExperienceModifications(integration, arc, progressionEvent);
  
  // Check for skill unlocks based on arc progression
  const skillUnlocks = checkArcSkillUnlocks(integration, arc, character, storyState);
  
  // Identify specialization opportunities
  const specializationOpportunities = identifyArcSpecializationOpportunities(integration, arc, character);
  
  // Update progression gates
  const updatedArc = updateProgressionGates(arc, character, storyState);

  return {
    updatedArc,
    experienceModifications,
    skillUnlocks,
    specializationOpportunities,
  };
}

export interface ArcProgressionIntegrationResult {
  updatedArc: StoryArc;
  experienceModifications: any[];
  skillUnlocks: ArcSkillUnlock[];
  specializationOpportunities: any[];
}

function calculateArcExperienceModifications(
  integration: ArcProgressionIntegration,
  arc: StoryArc,
  progressionEvent: any
): any[] {
  const scaling = integration.experienceScaling;
  const modifications = [];

  // Base experience multiplier
  if (scaling.baseExperienceMultiplier !== 1.0) {
    modifications.push({
      type: 'base_multiplier',
      multiplier: scaling.baseExperienceMultiplier,
      reason: 'Arc base experience scaling',
    });
  }

  // Difficulty bonus
  const difficultyBonus = (arc.difficultySettings?.currentDifficulty || 5) * scaling.difficultyBonus;
  if (difficultyBonus > 0) {
    modifications.push({
      type: 'difficulty_bonus',
      bonus: difficultyBonus,
      reason: `Arc difficulty: ${arc.difficultySettings?.currentDifficulty}`,
    });
  }

  // Choice quality bonus
  const agencyScore = arc.playerAgencyMetrics?.overallAgencyScore || 50;
  const choiceBonus = (agencyScore / 100) * scaling.choiceQualityBonus;
  if (choiceBonus > 0) {
    modifications.push({
      type: 'choice_quality_bonus',
      bonus: choiceBonus,
      reason: `Player agency score: ${agencyScore}`,
    });
  }

  return modifications;
}

function checkArcSkillUnlocks(
  integration: ArcProgressionIntegration,
  arc: StoryArc,
  character: CharacterProfile,
  storyState: StructuredStoryState
): ArcSkillUnlock[] {
  return integration.skillUnlocks.filter(unlock => {
    // Check if unlock conditions are met
    return unlock.unlockConditions.every(condition => 
      evaluateUnlockCondition(condition, arc, character, storyState)
    );
  });
}

function evaluateUnlockCondition(condition: any, arc: StoryArc, character: CharacterProfile, storyState: StructuredStoryState): boolean {
  // Simplified condition evaluation
  switch (condition.type) {
    case 'arc_progress':
      return (arc.progression?.totalProgress || 0) >= (condition.value as number);
    case 'character_level':
      return character.level >= (condition.value as number);
    case 'choice_made':
      return storyState.playerChoices?.some(choice => 
        choice.choiceText.includes(condition.value as string)
      ) || false;
    default:
      return false;
  }
}

function identifyArcSpecializationOpportunities(
  integration: ArcProgressionIntegration,
  arc: StoryArc,
  character: CharacterProfile
): any[] {
  return integration.specializationOpportunities.filter(opportunity => {
    // Check if opportunity conditions are met
    return opportunity.unlockConditions.every(condition => 
      evaluateUnlockCondition(condition, arc, character, {} as StructuredStoryState)
    );
  });
}

function updateProgressionGates(arc: StoryArc, character: CharacterProfile, storyState: StructuredStoryState): StoryArc {
  if (!arc.integrationPoints?.progressionIntegration) return arc;

  const integration = arc.integrationPoints.progressionIntegration;
  const updatedGates = integration.progressionGates.map(gate => {
    const isUnlocked = 
      character.level >= gate.requiredLevel &&
      gate.requiredSkills.every(skillId => 
        character.skillsAndAbilities?.some(skill => skill.id === skillId)
      ) &&
      Object.entries(gate.requiredAttributes).every(([attr, value]) => 
        (character as any)[attr] >= value
      );

    return {
      ...gate,
      isUnlocked,
    };
  });

  return {
    ...arc,
    integrationPoints: {
      ...arc.integrationPoints,
      progressionIntegration: {
        ...integration,
        progressionGates: updatedGates,
      },
    },
  };
}

// === QUEST SYSTEM INTEGRATION ===

export function integrateQuestWithArc(
  arc: StoryArc,
  quest: Quest,
  questEvent: any,
  character: CharacterProfile,
  storyState: StructuredStoryState
): ArcQuestIntegrationResult {
  if (!arc.integrationPoints?.questIntegration) {
    return { updatedArc: arc, questModifications: [], dynamicObjectives: [] };
  }

  const integration = arc.integrationPoints.questIntegration;
  
  // Check for quest modifications based on arc state
  const questModifications = checkQuestModifications(integration, arc, quest, storyState);
  
  // Generate dynamic objectives based on arc progression
  const dynamicObjectives = generateDynamicObjectives(integration, arc, character, storyState);
  
  // Update quest chaining
  const updatedArc = updateQuestChaining(arc, quest, questEvent);

  return {
    updatedArc,
    questModifications,
    dynamicObjectives,
  };
}

export interface ArcQuestIntegrationResult {
  updatedArc: StoryArc;
  questModifications: any[];
  dynamicObjectives: any[];
}

function checkQuestModifications(
  integration: ArcQuestIntegration,
  arc: StoryArc,
  quest: Quest,
  storyState: StructuredStoryState
): any[] {
  return integration.questModification.filter(modification => {
    // Check if modification trigger is met
    return evaluateUnlockCondition(modification.trigger, arc, {} as CharacterProfile, storyState);
  });
}

function generateDynamicObjectives(
  integration: ArcQuestIntegration,
  arc: StoryArc,
  character: CharacterProfile,
  storyState: StructuredStoryState
): any[] {
  return integration.dynamicObjectives.filter(objective => {
    // Check if objective should be generated
    return objective.adaptationTriggers.some(trigger => 
      evaluateUnlockCondition(trigger, arc, character, storyState)
    );
  });
}

function updateQuestChaining(arc: StoryArc, quest: Quest, questEvent: any): StoryArc {
  if (!arc.integrationPoints?.questIntegration) return arc;

  const integration = arc.integrationPoints.questIntegration;
  const chaining = integration.questChaining;

  // Add quest to sequence if it's part of the chain
  if (!chaining.questSequence.includes(quest.id)) {
    const updatedChaining = {
      ...chaining,
      questSequence: [...chaining.questSequence, quest.id],
    };

    return {
      ...arc,
      integrationPoints: {
        ...arc.integrationPoints,
        questIntegration: {
          ...integration,
          questChaining: updatedChaining,
        },
      },
    };
  }

  return arc;
}

// === INVENTORY SYSTEM INTEGRATION ===

export function integrateInventoryWithArc(
  arc: StoryArc,
  inventoryEvent: any,
  character: CharacterProfile,
  storyState: StructuredStoryState
): ArcInventoryIntegrationResult {
  if (!arc.integrationPoints?.inventoryIntegration) {
    return { updatedArc: arc, keyItemEvents: [], craftingOpportunities: [], equipmentProgression: [] };
  }

  const integration = arc.integrationPoints.inventoryIntegration;
  
  // Check for key item events
  const keyItemEvents = checkKeyItemEvents(integration, arc, inventoryEvent, storyState);
  
  // Identify crafting opportunities
  const craftingOpportunities = identifyCraftingOpportunities(integration, arc, character, storyState);
  
  // Update equipment progression
  const equipmentProgression = updateEquipmentProgression(integration, arc, character);

  return {
    updatedArc: arc,
    keyItemEvents,
    craftingOpportunities,
    equipmentProgression,
  };
}

export interface ArcInventoryIntegrationResult {
  updatedArc: StoryArc;
  keyItemEvents: any[];
  craftingOpportunities: any[];
  equipmentProgression: any[];
}

function checkKeyItemEvents(
  integration: ArcInventoryIntegration,
  arc: StoryArc,
  inventoryEvent: any,
  storyState: StructuredStoryState
): any[] {
  return integration.keyItems.filter(keyItem => {
    // Check if key item event should trigger
    return keyItem.unlockConditions.every(condition => 
      evaluateUnlockCondition(condition, arc, {} as CharacterProfile, storyState)
    );
  });
}

function identifyCraftingOpportunities(
  integration: ArcInventoryIntegration,
  arc: StoryArc,
  character: CharacterProfile,
  storyState: StructuredStoryState
): any[] {
  return integration.craftingOpportunities.filter(opportunity => {
    return opportunity.unlockConditions.every(condition => 
      evaluateUnlockCondition(condition, arc, character, storyState)
    );
  });
}

function updateEquipmentProgression(
  integration: ArcInventoryIntegration,
  arc: StoryArc,
  character: CharacterProfile
): any[] {
  return integration.equipmentProgression.map(progression => {
    const availableTiers = progression.progressionPath.filter(tier => {
      return tier.unlockConditions.every(condition => 
        evaluateUnlockCondition(condition, arc, character, {} as StructuredStoryState)
      );
    });

    return {
      ...progression,
      availableTiers,
      currentTier: availableTiers.length > 0 ? availableTiers[availableTiers.length - 1].tier : 0,
    };
  });
}

// === RELATIONSHIP SYSTEM INTEGRATION ===

export function integrateRelationshipWithArc(
  arc: StoryArc,
  relationshipEvent: any,
  character: CharacterProfile,
  storyState: StructuredStoryState
): ArcRelationshipIntegrationResult {
  if (!arc.integrationPoints?.relationshipIntegration) {
    return { updatedArc: arc, relationshipEvents: [], socialDynamics: [], emotionalBeats: [] };
  }

  const integration = arc.integrationPoints.relationshipIntegration;
  
  // Process relationship events
  const relationshipEvents = processRelationshipEvents(integration, arc, relationshipEvent, storyState);
  
  // Update social dynamics
  const socialDynamics = updateSocialDynamics(integration, arc, relationshipEvent, storyState);
  
  // Generate emotional beats
  const emotionalBeats = generateEmotionalBeats(integration, arc, relationshipEvent);

  return {
    updatedArc: arc,
    relationshipEvents,
    socialDynamics,
    emotionalBeats,
  };
}

export interface ArcRelationshipIntegrationResult {
  updatedArc: StoryArc;
  relationshipEvents: any[];
  socialDynamics: any[];
  emotionalBeats: any[];
}

function processRelationshipEvents(
  integration: ArcRelationshipIntegration,
  arc: StoryArc,
  relationshipEvent: any,
  storyState: StructuredStoryState
): any[] {
  return integration.keyRelationships.map(relationship => {
    // Process relationship development based on arc progression
    return {
      npcId: relationship.npcId,
      eventType: relationshipEvent.type,
      arcImpact: calculateRelationshipArcImpact(relationship, arc, relationshipEvent),
    };
  });
}

function calculateRelationshipArcImpact(relationship: ArcKeyRelationship, arc: StoryArc, event: any): any {
  return {
    importance: relationship.importance,
    phaseRelevance: arc.progression?.currentPhase?.name || 'unknown',
    developmentOpportunity: event.type === 'positive' ? 'growth' : 'challenge',
  };
}

function updateSocialDynamics(
  integration: ArcRelationshipIntegration,
  arc: StoryArc,
  relationshipEvent: any,
  storyState: StructuredStoryState
): any[] {
  return integration.socialDynamics.map(dynamic => {
    return {
      ...dynamic,
      currentState: updateDynamicState(dynamic, relationshipEvent),
      playerInfluence: calculatePlayerInfluenceOnDynamic(dynamic, relationshipEvent),
    };
  });
}

function updateDynamicState(dynamic: any, event: any): string {
  // Simplified dynamic state update
  return dynamic.currentState;
}

function calculatePlayerInfluenceOnDynamic(dynamic: any, event: any): number {
  // Calculate how much the player influenced this dynamic
  return dynamic.player_influence || 50;
}

function generateEmotionalBeats(
  integration: ArcRelationshipIntegration,
  arc: StoryArc,
  relationshipEvent: any
): any[] {
  return integration.emotionalBeats.filter(beat => {
    // Check if emotional beat should trigger
    return evaluateUnlockCondition(beat.trigger, arc, {} as CharacterProfile, {} as StructuredStoryState);
  });
}

export { };
