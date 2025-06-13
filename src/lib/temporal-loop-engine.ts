/**
 * Temporal Loop Engine
 * 
 * Implements time loop mechanics (Re:Zero style) with:
 * - Save state system preserving relationship progress and consequences
 * - Memory retention mechanics with fragment preservation
 * - Loop-specific consequence tracking and psychological effects
 * - Temporal paradox handling for loop knowledge conflicts
 */

import type {
  StructuredStoryState,
  TemporalSaveState,
  TemporalGameState,
  MemoryRetentionEntry,
  LoopMemoryEntry,
  PsychologicalEffect,
  LoopKnowledgeEntry,
  LoopConsequenceVariation,
  RelationshipEntry,
  ChoiceConsequence
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === LOOP INITIALIZATION ===

export function initializeTemporalLoop(
  triggerEvent: string,
  storyState: StructuredStoryState
): StructuredStoryState {
  const loopId = generateUUID();
  const temporalState: TemporalGameState = {
    currentLoopId: loopId,
    currentIteration: 1,
    loopStartTime: new Date().toISOString(),
    loopTriggerEvent: triggerEvent,
    totalLoops: 1,
    maxRetainedMemories: calculateMaxMemories(storyState),
    temporalStabilityLevel: 100,
    protagonistAwareness: 'unaware',
    loopMechanicsActive: true,
  };

  // Create initial save state
  const saveState = createTemporalSaveState(storyState, loopId, 1, 'loop_start');

  return {
    ...storyState,
    temporalState,
    loopHistory: [saveState],
    retainedMemories: [],
    psychologicalEffects: [],
  };
}

export function triggerTimeLoop(
  triggerReason: string,
  storyState: StructuredStoryState,
  preserveMemories: boolean = true
): StructuredStoryState {
  if (!storyState.temporalState?.loopMechanicsActive) {
    return storyState;
  }

  const currentLoop = storyState.temporalState;
  const newIteration = currentLoop.currentIteration + 1;
  
  // Calculate memory retention
  const retainedMemories = preserveMemories 
    ? calculateMemoryRetention(storyState, triggerReason)
    : [];

  // Calculate psychological effects
  const psychologicalEffects = calculatePsychologicalEffects(storyState, triggerReason);

  // Find the loop start save state
  const loopStartSave = storyState.loopHistory?.find(
    save => save.loopId === currentLoop.currentLoopId && save.savePointType === 'loop_start'
  );

  if (!loopStartSave) {
    console.error('No loop start save state found');
    return storyState;
  }

  // Restore state to loop beginning with retained memories
  const restoredState = restoreFromTemporalSave(loopStartSave, retainedMemories, psychologicalEffects);

  // Update temporal state
  const updatedTemporalState: TemporalGameState = {
    ...currentLoop,
    currentIteration: newIteration,
    totalLoops: currentLoop.totalLoops + 1,
    temporalStabilityLevel: Math.max(0, currentLoop.temporalStabilityLevel - 5),
    protagonistAwareness: calculateAwarenessLevel(newIteration, retainedMemories),
  };

  return {
    ...restoredState,
    temporalState: updatedTemporalState,
    retainedMemories,
    psychologicalEffects,
  };
}

// === MEMORY RETENTION SYSTEM ===

export function calculateMemoryRetention(
  storyState: StructuredStoryState,
  triggerReason: string
): MemoryRetentionEntry[] {
  const memories: MemoryRetentionEntry[] = [];
  const maxMemories = storyState.temporalState?.maxRetainedMemories || 5;

  // Retain traumatic events with high strength
  if (triggerReason.includes('death') || triggerReason.includes('failure')) {
    memories.push({
      memoryType: 'trauma',
      content: `Traumatic loop end: ${triggerReason}`,
      retentionStrength: 90,
      loopOrigin: storyState.temporalState?.currentLoopId || '',
      degradationRate: 2,
      triggerConditions: ['similar_situation', 'high_stress'],
    });
  }

  // Retain important relationship moments
  const significantRelationships = storyState.npcRelationships.filter(
    rel => Math.abs(rel.relationshipScore) > 50 || rel.romanticStatus
  );

  for (const rel of significantRelationships.slice(0, 3)) {
    const recentHistory = rel.relationshipHistory.slice(-2);
    for (const history of recentHistory) {
      if (history.emotionalImpact === 'bonding' || history.emotionalImpact === 'romantic_tension') {
        memories.push({
          memoryType: 'relationship',
          content: `${rel.npcName}: ${history.description}`,
          retentionStrength: 70,
          loopOrigin: storyState.temporalState?.currentLoopId || '',
          degradationRate: 5,
          triggerConditions: [`interact_with_${rel.npcId}`, 'emotional_moment'],
        });
      }
    }
  }

  // Retain critical knowledge
  const criticalConsequences = storyState.choiceConsequences.filter(
    c => c.severity === 'critical' || c.severity === 'major'
  );

  for (const consequence of criticalConsequences.slice(0, 2)) {
    memories.push({
      memoryType: 'knowledge',
      content: `Critical outcome: ${consequence.description}`,
      retentionStrength: 80,
      loopOrigin: storyState.temporalState?.currentLoopId || '',
      degradationRate: 3,
      triggerConditions: ['similar_choice', 'high_stakes_decision'],
    });
  }

  // Sort by retention strength and limit to max memories
  return memories
    .sort((a, b) => b.retentionStrength - a.retentionStrength)
    .slice(0, maxMemories);
}

export function processMemoryTrigger(
  triggerCondition: string,
  storyState: StructuredStoryState,
  currentTurnId: string
): { triggeredMemories: MemoryRetentionEntry[], updatedState: StructuredStoryState } {
  const retainedMemories = storyState.retainedMemories || [];
  const triggeredMemories: MemoryRetentionEntry[] = [];

  for (const memory of retainedMemories) {
    if (memory.triggerConditions.includes(triggerCondition)) {
      // Check if memory survives degradation
      const survivalChance = memory.retentionStrength - (memory.degradationRate * (storyState.temporalState?.currentIteration || 1));
      
      if (Math.random() * 100 < survivalChance) {
        triggeredMemories.push(memory);
      }
    }
  }

  // Update protagonist awareness based on triggered memories
  let updatedState = storyState;
  if (triggeredMemories.length > 0) {
    updatedState = updateProtagonistAwareness(triggeredMemories, storyState);
  }

  return { triggeredMemories, updatedState };
}

// === PSYCHOLOGICAL EFFECTS ===

export function calculatePsychologicalEffects(
  storyState: StructuredStoryState,
  triggerReason: string
): PsychologicalEffect[] {
  const effects: PsychologicalEffect[] = [...(storyState.psychologicalEffects || [])];
  const currentIteration = storyState.temporalState?.currentIteration || 1;

  // Trauma accumulation from repeated deaths
  if (triggerReason.includes('death')) {
    const existingTrauma = effects.find(e => e.effectType === 'trauma_accumulation');
    if (existingTrauma) {
      existingTrauma.intensity = Math.min(100, existingTrauma.intensity + 15);
      existingTrauma.cumulativeLoops += 1;
    } else {
      effects.push({
        id: generateUUID(),
        effectType: 'trauma_accumulation',
        intensity: 25,
        description: 'Psychological trauma from repeated deaths',
        manifestations: ['nightmares', 'hypervigilance', 'emotional_numbness'],
        cumulativeLoops: 1,
        recoveryConditions: ['successful_loop_completion', 'emotional_healing'],
      });
    }
  }

  // Determination from repeated attempts
  if (currentIteration > 3) {
    const existingDetermination = effects.find(e => e.effectType === 'determination');
    if (existingDetermination) {
      existingDetermination.intensity = Math.min(100, existingDetermination.intensity + 10);
    } else {
      effects.push({
        id: generateUUID(),
        effectType: 'determination',
        intensity: 40,
        description: 'Growing determination to break the loop',
        manifestations: ['increased_focus', 'risk_taking', 'strategic_thinking'],
        cumulativeLoops: currentIteration,
        recoveryConditions: ['loop_resolution'],
      });
    }
  }

  // Emotional numbness from repeated trauma
  if (currentIteration > 5) {
    const existingNumbness = effects.find(e => e.effectType === 'emotional_numbness');
    if (!existingNumbness) {
      effects.push({
        id: generateUUID(),
        effectType: 'emotional_numbness',
        intensity: 30,
        description: 'Emotional detachment from repeated experiences',
        manifestations: ['reduced_empathy', 'clinical_decision_making', 'social_withdrawal'],
        cumulativeLoops: currentIteration,
        recoveryConditions: ['meaningful_connection', 'emotional_breakthrough'],
      });
    }
  }

  return effects;
}

// === TEMPORAL PARADOX HANDLING ===

export function handleTemporalParadox(
  loopKnowledge: LoopKnowledgeEntry,
  currentChoice: string,
  storyState: StructuredStoryState
): { paradoxDetected: boolean, resolution: string, updatedState: StructuredStoryState } {
  // Check if using loop knowledge creates inconsistencies
  const knowledgeReliability = loopKnowledge.reliability;
  const usageCount = loopKnowledge.usageCount;
  
  // Knowledge becomes less reliable with overuse
  const adjustedReliability = Math.max(0, knowledgeReliability - (usageCount * 10));
  
  if (adjustedReliability < 30) {
    // High chance of paradox
    const paradoxDetected = Math.random() * 100 > adjustedReliability;
    
    if (paradoxDetected) {
      const resolution = generateParadoxResolution(loopKnowledge, currentChoice);
      const updatedState = applyParadoxEffects(storyState, loopKnowledge, resolution);
      
      return { paradoxDetected: true, resolution, updatedState };
    }
  }

  // Update usage count
  const updatedKnowledge = {
    ...loopKnowledge,
    usageCount: usageCount + 1,
    reliability: Math.max(0, loopKnowledge.reliability - 2), // Slight degradation
  };

  return { 
    paradoxDetected: false, 
    resolution: 'Knowledge applied successfully', 
    updatedState: storyState 
  };
}

// === SAVE STATE MANAGEMENT ===

export function createTemporalSaveState(
  storyState: StructuredStoryState,
  loopId: string,
  iteration: number,
  saveType: TemporalSaveState['savePointType']
): TemporalSaveState {
  return {
    id: generateUUID(),
    loopId,
    iteration,
    savePointType: saveType,
    timestamp: new Date().toISOString(),
    storyState: { ...storyState },
    preservedMemories: storyState.retainedMemories || [],
    psychologicalEffects: storyState.psychologicalEffects || [],
    loopKnowledge: [], // Will be populated as player gains knowledge
  };
}

export function restoreFromTemporalSave(
  saveState: TemporalSaveState,
  retainedMemories: MemoryRetentionEntry[],
  psychologicalEffects: PsychologicalEffect[]
): StructuredStoryState {
  const restoredState = { ...saveState.storyState };
  
  // Apply retained memories to relationships
  for (const memory of retainedMemories) {
    if (memory.memoryType === 'relationship') {
      restoredState.npcRelationships = applyMemoryToRelationships(
        memory,
        restoredState.npcRelationships
      );
    }
  }

  return {
    ...restoredState,
    retainedMemories,
    psychologicalEffects,
  };
}

// === HELPER FUNCTIONS ===

function calculateMaxMemories(storyState: StructuredStoryState): number {
  const baseMemories = 3;
  const characterLevel = storyState.character.level || 1;
  const wisdomBonus = Math.floor((storyState.character.wisdom || 10) / 5);
  
  return baseMemories + Math.floor(characterLevel / 3) + wisdomBonus;
}

function calculateAwarenessLevel(
  iteration: number,
  memories: MemoryRetentionEntry[]
): TemporalGameState['protagonistAwareness'] {
  const memoryCount = memories.length;
  const traumaMemories = memories.filter(m => m.memoryType === 'trauma').length;
  
  if (iteration === 1) return 'unaware';
  if (iteration <= 3 && memoryCount < 2) return 'suspicious';
  if (iteration <= 5 || traumaMemories < 2) return 'partially_aware';
  return 'fully_aware';
}

function updateProtagonistAwareness(
  triggeredMemories: MemoryRetentionEntry[],
  storyState: StructuredStoryState
): StructuredStoryState {
  if (!storyState.temporalState) return storyState;
  
  const traumaMemories = triggeredMemories.filter(m => m.memoryType === 'trauma');
  const currentAwareness = storyState.temporalState.protagonistAwareness;
  
  let newAwareness = currentAwareness;
  
  if (traumaMemories.length >= 2 && currentAwareness === 'suspicious') {
    newAwareness = 'partially_aware';
  } else if (triggeredMemories.length >= 3 && currentAwareness === 'partially_aware') {
    newAwareness = 'fully_aware';
  }
  
  return {
    ...storyState,
    temporalState: {
      ...storyState.temporalState,
      protagonistAwareness: newAwareness,
    },
  };
}

function generateParadoxResolution(
  knowledge: LoopKnowledgeEntry,
  currentChoice: string
): string {
  const resolutions = [
    'Timeline shifts slightly, knowledge becomes outdated',
    'Other characters react differently than expected',
    'Unforeseen consequences alter the situation',
    'Knowledge proves incomplete or misleading',
    'Temporal interference causes deviation',
  ];
  
  return resolutions[Math.floor(Math.random() * resolutions.length)];
}

function applyParadoxEffects(
  storyState: StructuredStoryState,
  knowledge: LoopKnowledgeEntry,
  resolution: string
): StructuredStoryState {
  // Reduce temporal stability
  const updatedTemporalState = storyState.temporalState ? {
    ...storyState.temporalState,
    temporalStabilityLevel: Math.max(0, storyState.temporalState.temporalStabilityLevel - 15),
  } : undefined;

  return {
    ...storyState,
    temporalState: updatedTemporalState,
  };
}

function applyMemoryToRelationships(
  memory: MemoryRetentionEntry,
  relationships: RelationshipEntry[]
): RelationshipEntry[] {
  // Extract NPC ID from memory content (simplified)
  const npcMatch = memory.content.match(/^([^:]+):/);
  if (!npcMatch) return relationships;
  
  const npcName = npcMatch[1];
  const relationshipIndex = relationships.findIndex(rel => rel.npcName === npcName);
  
  if (relationshipIndex >= 0) {
    const relationship = relationships[relationshipIndex];
    const updatedRelationships = [...relationships];
    
    // Add memory as a special history entry
    updatedRelationships[relationshipIndex] = {
      ...relationship,
      relationshipHistory: [
        ...relationship.relationshipHistory,
        {
          turnId: 'memory_restoration',
          timestamp: new Date().toISOString(),
          interactionType: 'temporal_event',
          relationshipChange: 0,
          emotionalImpact: 'neutral',
          description: `Retained memory: ${memory.content}`,
          consequences: [],
          temporalContext: {
            loopId: memory.loopOrigin,
            loopIteration: 0,
            timelineVariant: 'memory_fragment',
            temporalStability: memory.retentionStrength,
            memoryRetentionLevel: 'fragments',
          },
        }
      ].slice(-10),
    };
    
    return updatedRelationships;
  }
  
  return relationships;
}
