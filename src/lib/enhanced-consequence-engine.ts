/**
 * Enhanced Consequence Engine
 * 
 * Implements multi-layered consequence chains for butterfly effect storytelling:
 * - Cascading consequence system with ripple effects
 * - Short-term, medium-term, and long-term consequence tracking
 * - Cross-thread consequence connections
 * - Magnitude scaling from minor choices to major story shifts
 */

import type {
  StructuredStoryState,
  PlayerChoice,
  ChoiceConsequence,
  ButterflyEffectChain,
  ConsequenceConnection,
  CascadeEffect,
  NarrativeThread,
  RelationshipEntry,
  FactionStanding
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === CONSEQUENCE CHAIN MANAGEMENT ===

export function createConsequenceChain(
  originChoice: PlayerChoice,
  storyState: StructuredStoryState
): ButterflyEffectChain {
  return {
    id: generateUUID(),
    originChoiceId: originChoice.id,
    originDescription: originChoice.choiceText,
    chainLevel: 0,
    consequences: [],
    affectedThreads: [],
    magnitude: calculateInitialMagnitude(originChoice),
    isActive: true,
  };
}

export function addConsequenceToChain(
  chainId: string,
  consequence: ChoiceConsequence,
  storyState: StructuredStoryState
): StructuredStoryState {
  const chains = storyState.butterflyEffects || [];
  const chainIndex = chains.findIndex(chain => chain.id === chainId);
  
  if (chainIndex >= 0) {
    const updatedChain = {
      ...chains[chainIndex],
      consequences: [...chains[chainIndex].consequences, consequence],
      magnitude: chains[chainIndex].magnitude * consequence.magnitudeScaling,
    };
    
    const updatedChains = [...chains];
    updatedChains[chainIndex] = updatedChain;
    
    return {
      ...storyState,
      butterflyEffects: updatedChains,
    };
  }
  
  return storyState;
}

// === RIPPLE EFFECT CALCULATION ===

export function calculateRippleEffects(
  consequence: ChoiceConsequence,
  storyState: StructuredStoryState
): CascadeEffect[] {
  const rippleEffects: CascadeEffect[] = [];
  
  // Relationship ripples
  if (consequence.relatedNPCs) {
    for (const npcId of consequence.relatedNPCs) {
      const relationship = storyState.npcRelationships.find(rel => rel.npcId === npcId);
      if (relationship?.connectedRelationships) {
        for (const connectedNpcId of relationship.connectedRelationships) {
          rippleEffects.push({
            targetType: 'npc',
            targetId: connectedNpcId,
            effectType: 'relationship_change',
            magnitude: Math.floor(consequence.magnitudeScaling * 0.3), // Reduced effect
            delay: calculateRippleDelay(consequence.consequenceType),
            description: `Indirect effect from ${relationship.npcName}'s relationship change`,
            probability: 70,
          });
        }
      }
    }
  }
  
  // Faction ripples
  if (consequence.relatedFactions) {
    for (const factionId of consequence.relatedFactions) {
      const faction = storyState.enhancedFactions?.find(f => f.id === factionId);
      if (faction?.relationships) {
        for (const relationship of faction.relationships) {
          rippleEffects.push({
            targetType: 'faction',
            targetId: relationship.factionId,
            effectType: 'reputation_change',
            magnitude: Math.floor(consequence.magnitudeScaling * 0.2),
            delay: calculateRippleDelay(consequence.consequenceType) + 1,
            description: `Political ripple effect from ${faction.name}'s involvement`,
            probability: 60,
          });
        }
      }
    }
  }
  
  // Narrative thread ripples
  const activeThreads = storyState.narrativeThreads.filter(thread => thread.status === 'active');
  for (const thread of activeThreads) {
    if (hasThreadConnection(consequence, thread)) {
      rippleEffects.push({
        targetType: 'quest',
        targetId: thread.id,
        effectType: 'story_branch',
        magnitude: Math.floor(consequence.magnitudeScaling * 0.4),
        delay: calculateRippleDelay(consequence.consequenceType) + 2,
        description: `Butterfly effect on ${thread.title}`,
        probability: 50,
      });
    }
  }
  
  return rippleEffects;
}

// === CROSS-THREAD CONNECTIONS ===

export function createCrossThreadConnection(
  consequence: ChoiceConsequence,
  targetThreadId: string,
  connectionType: ConsequenceConnection['connectionType'],
  storyState: StructuredStoryState
): ConsequenceConnection {
  return {
    connectedThreadId: targetThreadId,
    connectionType,
    influenceStrength: calculateInfluenceStrength(consequence, connectionType),
    description: generateConnectionDescription(consequence, targetThreadId, connectionType, storyState),
    manifestationConditions: generateManifestationConditions(consequence, connectionType),
  };
}

export function processConsequenceManifestation(
  consequence: ChoiceConsequence,
  storyState: StructuredStoryState,
  currentTurnId: string
): StructuredStoryState {
  let updatedState = { ...storyState };
  
  // Mark consequence as manifested
  const updatedConsequences = storyState.choiceConsequences.map(c =>
    c.id === consequence.id
      ? { ...c, manifestationTurnId: currentTurnId, isActive: true }
      : c
  );
  
  updatedState.choiceConsequences = updatedConsequences;
  
  // Apply ripple effects
  const rippleEffects = calculateRippleEffects(consequence, storyState);
  for (const ripple of rippleEffects) {
    if (Math.random() * 100 < ripple.probability) {
      updatedState = applyRippleEffect(ripple, updatedState, currentTurnId);
    }
  }
  
  // Update consequence chains
  const chainId = findConsequenceChain(consequence.id, storyState);
  if (chainId) {
    updatedState = addConsequenceToChain(chainId, consequence, updatedState);
  }
  
  return updatedState;
}

// === MAGNITUDE SCALING ===

export function calculateConsequenceMagnitude(
  choice: PlayerChoice,
  consequenceType: ChoiceConsequence['consequenceType'],
  affectedSystems: string[]
): number {
  let baseMagnitude = 1.0;
  
  // Scale by consequence type
  switch (consequenceType) {
    case 'immediate':
      baseMagnitude = 0.5;
      break;
    case 'short_term':
      baseMagnitude = 0.8;
      break;
    case 'medium_term':
      baseMagnitude = 1.2;
      break;
    case 'long_term':
      baseMagnitude = 1.8;
      break;
    case 'permanent':
      baseMagnitude = 2.5;
      break;
    case 'butterfly_effect':
      baseMagnitude = 3.0;
      break;
  }
  
  // Scale by number of affected systems
  const systemMultiplier = 1 + (affectedSystems.length * 0.2);
  
  // Scale by choice moral complexity
  const moralMultiplier = choice.moralAlignment === 'complex' ? 1.5 : 1.0;
  
  return baseMagnitude * systemMultiplier * moralMultiplier;
}

// === HELPER FUNCTIONS ===

function calculateInitialMagnitude(choice: PlayerChoice): number {
  const baseFactors = [
    choice.moralAlignment === 'complex' ? 1.5 : 1.0,
    choice.context?.stressLevel ? choice.context.stressLevel / 100 : 0.5,
    choice.alternatives?.length ? choice.alternatives.length * 0.1 : 0.1,
  ];
  
  return baseFactors.reduce((acc, factor) => acc * factor, 1.0);
}

function calculateRippleDelay(consequenceType: ChoiceConsequence['consequenceType']): number {
  switch (consequenceType) {
    case 'immediate': return 0;
    case 'short_term': return 1;
    case 'medium_term': return 3;
    case 'long_term': return 7;
    case 'permanent': return 10;
    case 'butterfly_effect': return 5;
    default: return 2;
  }
}

function hasThreadConnection(consequence: ChoiceConsequence, thread: NarrativeThread): boolean {
  // Check for shared characters
  if (consequence.relatedNPCs?.some(npcId => thread.relatedCharacters.includes(npcId))) {
    return true;
  }
  
  // Check for shared locations
  if (consequence.relatedLocations?.some(location => thread.relatedLocations.includes(location))) {
    return true;
  }
  
  // Check for shared factions
  if (consequence.relatedFactions?.some(factionId => thread.relatedFactions.includes(factionId))) {
    return true;
  }
  
  return false;
}

function calculateInfluenceStrength(
  consequence: ChoiceConsequence,
  connectionType: ConsequenceConnection['connectionType']
): number {
  const baseStrength = consequence.magnitudeScaling * 20;
  
  switch (connectionType) {
    case 'butterfly_effect': return Math.min(100, baseStrength * 1.5);
    case 'shared_character': return Math.min(100, baseStrength * 1.2);
    case 'shared_location': return Math.min(100, baseStrength * 1.0);
    case 'shared_resource': return Math.min(100, baseStrength * 0.8);
    case 'thematic_link': return Math.min(100, baseStrength * 0.6);
    default: return Math.min(100, baseStrength);
  }
}

function generateConnectionDescription(
  consequence: ChoiceConsequence,
  targetThreadId: string,
  connectionType: ConsequenceConnection['connectionType'],
  storyState: StructuredStoryState
): string {
  const targetThread = storyState.narrativeThreads.find(t => t.id === targetThreadId);
  const threadName = targetThread?.title || 'Unknown Thread';
  
  switch (connectionType) {
    case 'butterfly_effect':
      return `Unexpected consequences ripple into ${threadName}`;
    case 'shared_character':
      return `Character involvement connects to ${threadName}`;
    case 'shared_location':
      return `Location-based connection affects ${threadName}`;
    case 'shared_resource':
      return `Resource implications impact ${threadName}`;
    case 'thematic_link':
      return `Thematic resonance with ${threadName}`;
    default:
      return `Unknown connection to ${threadName}`;
  }
}

function generateManifestationConditions(
  consequence: ChoiceConsequence,
  connectionType: ConsequenceConnection['connectionType']
): string[] {
  const conditions: string[] = [];
  
  switch (connectionType) {
    case 'butterfly_effect':
      conditions.push('Time delay of 2-5 turns', 'Player unaware of connection');
      break;
    case 'shared_character':
      conditions.push('Character must be present', 'Relationship threshold met');
      break;
    case 'shared_location':
      conditions.push('Player visits location', 'Environmental conditions met');
      break;
    case 'shared_resource':
      conditions.push('Resource scarcity triggered', 'Economic conditions met');
      break;
    case 'thematic_link':
      conditions.push('Narrative momentum aligned', 'Player choices consistent');
      break;
  }
  
  return conditions;
}

function findConsequenceChain(consequenceId: string, storyState: StructuredStoryState): string | null {
  const chains = storyState.butterflyEffects || [];
  const chain = chains.find(c => c.consequences.some(cons => cons.id === consequenceId));
  return chain?.id || null;
}

function applyRippleEffect(
  ripple: CascadeEffect,
  storyState: StructuredStoryState,
  currentTurnId: string
): StructuredStoryState {
  // Implementation would depend on the specific effect type
  // This is a simplified version
  let updatedState = { ...storyState };
  
  switch (ripple.effectType) {
    case 'relationship_change':
      updatedState = applyRelationshipRipple(ripple, updatedState, currentTurnId);
      break;
    case 'reputation_change':
      updatedState = applyReputationRipple(ripple, updatedState, currentTurnId);
      break;
    case 'story_branch':
      updatedState = applyStoryBranchRipple(ripple, updatedState, currentTurnId);
      break;
  }
  
  return updatedState;
}

function applyRelationshipRipple(
  ripple: CascadeEffect,
  storyState: StructuredStoryState,
  currentTurnId: string
): StructuredStoryState {
  const relationships = [...storyState.npcRelationships];
  const relationshipIndex = relationships.findIndex(rel => rel.npcId === ripple.targetId);
  
  if (relationshipIndex >= 0) {
    const relationship = relationships[relationshipIndex];
    relationships[relationshipIndex] = {
      ...relationship,
      relationshipScore: Math.max(-100, Math.min(100, relationship.relationshipScore + ripple.magnitude)),
      lastInteractionTurn: currentTurnId,
      relationshipHistory: [
        ...relationship.relationshipHistory,
        {
          turnId: currentTurnId,
          timestamp: new Date().toISOString(),
          interactionType: 'consequence',
          relationshipChange: ripple.magnitude,
          emotionalImpact: ripple.magnitude > 0 ? 'positive' : 'negative',
          description: ripple.description,
          consequences: [],
        }
      ].slice(-10)
    };
  }
  
  return { ...storyState, npcRelationships: relationships };
}

function applyReputationRipple(
  ripple: CascadeEffect,
  storyState: StructuredStoryState,
  currentTurnId: string
): StructuredStoryState {
  // Similar implementation for faction reputation changes
  return storyState;
}

function applyStoryBranchRipple(
  ripple: CascadeEffect,
  storyState: StructuredStoryState,
  currentTurnId: string
): StructuredStoryState {
  // Implementation for story branch modifications
  return storyState;
}
