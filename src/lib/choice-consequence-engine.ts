/**
 * Choice Consequence Engine
 * 
 * Core utilities for managing choice consequences and their long-term effects:
 * - Choice tracking and analysis
 * - Consequence manifestation
 * - Moral alignment tracking
 * - Reputation management
 * - World state changes
 */

import type {
  PlayerChoice,
  ChoiceConsequence,
  ChoiceConsequenceTracking,
  ConsequenceEffect,
  MoralProfile,
  MoralAlignmentEvent,
  GroupReputation,
  WorldState,
  WorldStateHistory,
  StructuredStoryState,
  CharacterProfile,
  NPCProfile,
  QuestConsequence,
  BranchCondition
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === CHOICE TRACKING ===

export function recordPlayerChoice(
  choiceText: string,
  choiceDescription: string,
  alternatives: string[],
  context: any,
  questId: string | undefined,
  turnId: string,
  storyState: StructuredStoryState
): PlayerChoice {
  const choice: PlayerChoice = {
    id: generateUUID(),
    turnId: turnId,
    timestamp: new Date().toISOString(),
    questId: questId,
    choiceText: choiceText,
    choiceDescription: choiceDescription,
    context: {
      location: storyState.currentLocation,
      npcsPresent: storyState.trackedNPCs.map(npc => npc.id),
      timeOfDay: storyState.environmentalContext?.timeContext?.timeOfDay || 'unknown',
      stressLevel: storyState.characterEmotionalState?.stressLevel || 0,
      availableResources: storyState.inventory.map(item => item.name),
      knownInformation: storyState.worldFacts,
      unknownFactors: [], // Would be determined by AI
      pressureLevel: calculatePressureLevel(storyState)
    },
    alternatives: alternatives.map((alt, index) => ({
      id: generateUUID(),
      text: alt,
      requirements: [],
      difficultyLevel: 5, // Default
      wasAvailable: true,
      reasonUnavailable: undefined
    })),
    consequences: [],
    moralAlignment: determineMoralAlignment(choiceText),
    difficultyLevel: calculateChoiceDifficulty(choiceText, alternatives),
    confidence: 50 // Default, would be determined by player behavior analysis
  };

  return choice;
}

function calculatePressureLevel(storyState: StructuredStoryState): number {
  let pressure = 0;
  
  // Add pressure based on character state
  if (storyState.character.health < storyState.character.maxHealth * 0.3) {
    pressure += 30;
  }
  
  // Add pressure based on emotional state
  pressure += storyState.characterEmotionalState?.stressLevel || 0;
  
  // Add pressure based on active quests with time limits
  const urgentQuests = storyState.quests.filter(q => 
    q.status === 'active' && q.timeLimit
  );
  pressure += urgentQuests.length * 10;
  
  return Math.min(100, pressure);
}

function determineMoralAlignment(choiceText: string): 'good' | 'neutral' | 'evil' | 'complex' {
  const lowerChoice = choiceText.toLowerCase();
  
  // Simple keyword-based analysis
  const goodKeywords = ['help', 'save', 'protect', 'heal', 'donate', 'forgive', 'mercy'];
  const evilKeywords = ['kill', 'destroy', 'steal', 'betray', 'torture', 'abandon', 'lie'];
  const complexKeywords = ['sacrifice', 'compromise', 'necessary evil', 'greater good'];
  
  const hasGood = goodKeywords.some(keyword => lowerChoice.includes(keyword));
  const hasEvil = evilKeywords.some(keyword => lowerChoice.includes(keyword));
  const hasComplex = complexKeywords.some(keyword => lowerChoice.includes(keyword));
  
  if (hasComplex || (hasGood && hasEvil)) return 'complex';
  if (hasGood) return 'good';
  if (hasEvil) return 'evil';
  return 'neutral';
}

function calculateChoiceDifficulty(choiceText: string, alternatives: string[]): number {
  // Base difficulty on number of alternatives and complexity
  let difficulty = Math.min(10, alternatives.length);
  
  // Increase difficulty for moral dilemmas
  const moralKeywords = ['sacrifice', 'betray', 'choose between', 'difficult decision'];
  if (moralKeywords.some(keyword => choiceText.toLowerCase().includes(keyword))) {
    difficulty += 3;
  }
  
  return Math.min(10, difficulty);
}

// === CONSEQUENCE MANIFESTATION ===

export function manifestConsequence(
  consequence: QuestConsequence,
  choice: PlayerChoice,
  turnId: string,
  storyState: StructuredStoryState
): { updatedState: StructuredStoryState; manifestedEffects: string[] } {
  const manifestedEffects: string[] = [];
  let updatedState = { ...storyState };

  for (const effect of consequence.effects) {
    const result = applyConsequenceEffect(effect, updatedState, turnId);
    updatedState = result.updatedState;
    manifestedEffects.push(...result.effectDescriptions);
  }

  // Track the consequence manifestation
  const tracking: ChoiceConsequenceTracking = {
    consequenceId: consequence.id,
    type: consequence.type,
    manifestedAt: turnId,
    description: consequence.description,
    severity: consequence.severity,
    category: consequence.category,
    playerAwareness: consequence.visibilityToPlayer === 'obvious' ? 'fully_aware' : 
                    consequence.visibilityToPlayer === 'hinted' ? 'partially_aware' : 'unaware',
    ongoingEffects: manifestedEffects,
    futureImplications: [], // Would be determined by AI
    reversible: consequence.reversible
  };

  // Add to player choice consequences
  const updatedChoices = [...(updatedState.playerChoices || [])];
  const choiceIndex = updatedChoices.findIndex(c => c.id === choice.id);
  if (choiceIndex >= 0) {
    updatedChoices[choiceIndex] = {
      ...updatedChoices[choiceIndex],
      consequences: [...updatedChoices[choiceIndex].consequences, tracking]
    };
  }

  updatedState.playerChoices = updatedChoices;

  return { updatedState, manifestedEffects };
}

function applyConsequenceEffect(
  effect: ConsequenceEffect,
  storyState: StructuredStoryState,
  turnId: string
): { updatedState: StructuredStoryState; effectDescriptions: string[] } {
  const effectDescriptions: string[] = [];
  let updatedState = { ...storyState };

  switch (effect.type) {
    case 'stat_change':
      if (effect.targetId === 'player') {
        updatedState = applyStatChange(updatedState, effect);
        effectDescriptions.push(`Player ${effect.description}`);
      }
      break;

    case 'relationship_change':
      updatedState = applyRelationshipChange(updatedState, effect, turnId);
      effectDescriptions.push(`Relationship ${effect.description}`);
      break;

    case 'faction_change':
      updatedState = applyFactionChange(updatedState, effect, turnId);
      effectDescriptions.push(`Faction standing ${effect.description}`);
      break;

    case 'world_fact_change':
      updatedState = applyWorldFactChange(updatedState, effect);
      effectDescriptions.push(`World state ${effect.description}`);
      break;

    case 'quest_unlock':
      // Would trigger quest generation system
      effectDescriptions.push(`New quest available: ${effect.description}`);
      break;

    case 'quest_lock':
      updatedState = lockQuest(updatedState, effect.targetId || '');
      effectDescriptions.push(`Quest no longer available: ${effect.description}`);
      break;

    case 'item_gain':
      // Would add item to inventory
      effectDescriptions.push(`Gained item: ${effect.description}`);
      break;

    case 'item_loss':
      updatedState = removeItem(updatedState, effect.targetId || '');
      effectDescriptions.push(`Lost item: ${effect.description}`);
      break;

    case 'location_change':
      updatedState = applyLocationChange(updatedState, effect);
      effectDescriptions.push(`Location changed: ${effect.description}`);
      break;

    case 'npc_state_change':
      updatedState = applyNPCStateChange(updatedState, effect);
      effectDescriptions.push(`NPC state changed: ${effect.description}`);
      break;
  }

  return { updatedState, effectDescriptions };
}

function applyStatChange(
  storyState: StructuredStoryState,
  effect: ConsequenceEffect
): StructuredStoryState {
  const character = { ...storyState.character };
  const value = effect.value as number;

  // Apply stat changes based on target
  switch (effect.targetId) {
    case 'health':
      character.health = Math.max(0, Math.min(character.maxHealth, character.health + value));
      break;
    case 'mana':
      character.mana = Math.max(0, Math.min(character.maxMana || 0, (character.mana || 0) + value));
      break;
    case 'experience':
      character.experiencePoints += value;
      break;
    case 'currency':
      character.currency = Math.max(0, (character.currency || 0) + value);
      break;
    // Add other stats as needed
  }

  return { ...storyState, character };
}

function applyRelationshipChange(
  storyState: StructuredStoryState,
  effect: ConsequenceEffect,
  turnId: string
): StructuredStoryState {
  const relationships = [...(storyState.npcRelationships || [])];
  const relationshipIndex = relationships.findIndex(rel => rel.npcId === effect.targetId);
  const value = effect.value as number;

  if (relationshipIndex >= 0) {
    const relationship = relationships[relationshipIndex];
    relationships[relationshipIndex] = {
      ...relationship,
      relationshipScore: Math.max(-100, Math.min(100, relationship.relationshipScore + value)),
      lastInteractionTurn: turnId,
      relationshipHistory: [
        ...relationship.relationshipHistory,
        {
          turnId,
          timestamp: new Date().toISOString(),
          interactionType: 'consequence',
          relationshipChange: value,
          emotionalImpact: value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral',
          description: effect.description,
          consequences: []
        }
      ].slice(-10) // Keep last 10 interactions
    };
  }

  return { ...storyState, npcRelationships: relationships };
}

function applyFactionChange(
  storyState: StructuredStoryState,
  effect: ConsequenceEffect,
  turnId: string
): StructuredStoryState {
  const factions = [...(storyState.factionStandings || [])];
  const factionIndex = factions.findIndex(f => f.factionId === effect.targetId);
  const value = effect.value as number;

  if (factionIndex >= 0) {
    const faction = factions[factionIndex];
    const newScore = Math.max(-100, Math.min(100, faction.reputationScore + value));
    
    factions[factionIndex] = {
      ...faction,
      reputationScore: newScore,
      reputationHistory: [
        ...faction.reputationHistory,
        {
          turnId,
          timestamp: new Date().toISOString(),
          action: effect.description,
          reputationChange: value,
          newStandingLevel: getStandingLevel(newScore),
          consequences: []
        }
      ].slice(-20) // Keep last 20 changes
    };
  }

  return { ...storyState, factionStandings: factions };
}

function getStandingLevel(score: number): string {
  if (score >= 75) return 'revered';
  if (score >= 25) return 'allied';
  if (score >= 0) return 'friendly';
  if (score >= -25) return 'neutral';
  if (score >= -75) return 'unfriendly';
  return 'hostile';
}

function applyWorldFactChange(
  storyState: StructuredStoryState,
  effect: ConsequenceEffect
): StructuredStoryState {
  const worldFacts = [...storyState.worldFacts];
  
  if (effect.value === 'add') {
    worldFacts.push(effect.description);
  } else if (effect.value === 'remove') {
    const index = worldFacts.findIndex(fact => fact.includes(effect.targetId || ''));
    if (index >= 0) {
      worldFacts.splice(index, 1);
    }
  }

  return { ...storyState, worldFacts };
}

function lockQuest(storyState: StructuredStoryState, questId: string): StructuredStoryState {
  const quests = storyState.quests.map(quest => 
    quest.id === questId ? { ...quest, status: 'failed' as const } : quest
  );
  
  return { ...storyState, quests };
}

function removeItem(storyState: StructuredStoryState, itemId: string): StructuredStoryState {
  const inventory = storyState.inventory.filter(item => item.id !== itemId);
  
  // Also check equipped items
  const equippedItems = { ...storyState.equippedItems };
  Object.keys(equippedItems).forEach(slot => {
    if (equippedItems[slot as keyof typeof equippedItems]?.id === itemId) {
      equippedItems[slot as keyof typeof equippedItems] = null;
    }
  });

  return { ...storyState, inventory, equippedItems };
}

function applyLocationChange(
  storyState: StructuredStoryState,
  effect: ConsequenceEffect
): StructuredStoryState {
  // Update environmental context with location change
  const environmentalContext = {
    ...storyState.environmentalContext,
    currentLocation: effect.value as string,
    locationHistory: [
      ...(storyState.environmentalContext?.locationHistory || []),
      {
        turnId: generateUUID(),
        timestamp: new Date().toISOString(),
        significantEvents: [effect.description],
        npcsEncountered: [],
        questsProgressed: []
      }
    ]
  };

  return {
    ...storyState,
    currentLocation: effect.value as string,
    environmentalContext
  };
}

function applyNPCStateChange(
  storyState: StructuredStoryState,
  effect: ConsequenceEffect
): StructuredStoryState {
  const npcs = storyState.trackedNPCs.map(npc => 
    npc.id === effect.targetId 
      ? { ...npc, shortTermGoal: effect.description, updatedAt: new Date().toISOString() }
      : npc
  );

  return { ...storyState, trackedNPCs: npcs };
}

// === MORAL ALIGNMENT TRACKING ===

export function updateMoralProfile(
  choice: PlayerChoice,
  storyState: StructuredStoryState
): MoralProfile {
  const currentProfile = storyState.moralProfile || initializeMoralProfile();
  
  // Calculate alignment shift based on choice
  const alignmentShift = calculateAlignmentShift(choice, currentProfile);
  
  // Update alignment history
  const alignmentEvent: MoralAlignmentEvent = {
    turnId: choice.turnId,
    timestamp: choice.timestamp,
    choiceId: choice.id,
    previousAlignment: currentProfile.overallAlignment,
    newAlignment: calculateNewAlignment(currentProfile.overallAlignment, alignmentShift),
    alignmentShift: alignmentShift,
    triggeringAction: choice.choiceText,
    moralWeight: choice.moralAlignment === 'complex' ? 'major' : 'moderate'
  };

  return {
    ...currentProfile,
    overallAlignment: alignmentEvent.newAlignment as any,
    alignmentHistory: [...currentProfile.alignmentHistory, alignmentEvent].slice(-50), // Keep last 50 events
    consistencyScore: calculateConsistencyScore([...currentProfile.alignmentHistory, alignmentEvent])
  };
}

function initializeMoralProfile(): MoralProfile {
  return {
    overallAlignment: 'true_neutral',
    alignmentHistory: [],
    moralTraits: [],
    ethicalDilemmasEncountered: [],
    reputationByGroup: {},
    moralInfluenceFactors: [],
    consistencyScore: 100
  };
}

function calculateAlignmentShift(choice: PlayerChoice, profile: MoralProfile): number {
  let shift = 0;
  
  switch (choice.moralAlignment) {
    case 'good':
      shift = 2;
      break;
    case 'evil':
      shift = -2;
      break;
    case 'complex':
      shift = 0; // Complex choices don't shift alignment directly
      break;
    default:
      shift = 0;
  }
  
  // Modify based on difficulty and context
  shift *= (choice.difficultyLevel / 10);
  
  return Math.round(shift);
}

function calculateNewAlignment(currentAlignment: string, shift: number): string {
  // Simplified alignment calculation - in practice this would be more complex
  if (Math.abs(shift) < 1) return currentAlignment;
  
  if (shift > 0) {
    // Shift towards good
    switch (currentAlignment) {
      case 'chaotic_evil': return 'neutral_evil';
      case 'neutral_evil': return 'chaotic_neutral';
      case 'lawful_evil': return 'lawful_neutral';
      case 'chaotic_neutral': return 'chaotic_good';
      case 'true_neutral': return 'neutral_good';
      case 'lawful_neutral': return 'lawful_good';
      default: return currentAlignment;
    }
  } else {
    // Shift towards evil
    switch (currentAlignment) {
      case 'chaotic_good': return 'chaotic_neutral';
      case 'neutral_good': return 'true_neutral';
      case 'lawful_good': return 'lawful_neutral';
      case 'chaotic_neutral': return 'chaotic_evil';
      case 'true_neutral': return 'neutral_evil';
      case 'lawful_neutral': return 'lawful_evil';
      default: return currentAlignment;
    }
  }
}

function calculateConsistencyScore(alignmentHistory: MoralAlignmentEvent[]): number {
  if (alignmentHistory.length < 2) return 100;
  
  // Calculate how consistent the player's moral choices have been
  const recentEvents = alignmentHistory.slice(-10); // Last 10 events
  const alignmentChanges = recentEvents.filter(event => 
    event.previousAlignment !== event.newAlignment
  ).length;
  
  // More changes = less consistency
  return Math.max(0, 100 - (alignmentChanges * 10));
}

export { };
