/**
 * Enhanced State Manager
 * 
 * Utilities for managing the new enhanced tracking systems including:
 * - Relationship dynamics
 * - Emotional states
 * - Environmental context
 * - Narrative threads
 * - Player preferences
 * - System metrics
 */

import type {
  StructuredStoryState,
  EmotionalState,
  RelationshipEntry,
  FactionStanding,
  EnvironmentalContext,
  NarrativeThread,
  LongTermStorySummary,
  PlayerPreferences,
  ChoiceConsequence,
  SystemMetrics,
  NPCProfile,
  LocationDetails,
  WeatherConditions,
  TimeContext
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === INITIALIZATION FUNCTIONS ===

export function initializeEnhancedStoryState(baseState: StructuredStoryState): StructuredStoryState {
  const timestamp = new Date().toISOString();
  
  return {
    ...baseState,
    // Initialize new enhanced systems with defaults
    characterEmotionalState: initializeEmotionalState(),
    npcRelationships: initializeNPCRelationships(baseState.trackedNPCs),
    factionStandings: [],
    environmentalContext: initializeEnvironmentalContext(baseState.currentLocation),
    narrativeThreads: [],
    longTermStorySummary: initializeLongTermStorySummary(),
    playerPreferences: initializePlayerPreferences(),
    choiceConsequences: [],
    systemMetrics: initializeSystemMetrics(),
  };
}

export function initializeEmotionalState(): EmotionalState {
  return {
    primaryMood: 'content',
    stressLevel: 20,
    fatigueLevel: 10,
    mentalHealthScore: 80,
    traumaticEvents: [],
    moodModifiers: [],
    lastEmotionalUpdate: new Date().toISOString(),
  };
}

export function initializeNPCRelationships(npcs: NPCProfile[]): RelationshipEntry[] {
  return npcs.map(npc => ({
    npcId: npc.id,
    npcName: npc.name,
    relationshipScore: npc.relationshipStatus || 0, // Migrate from legacy field
    trustLevel: 50,
    fearLevel: 0,
    respectLevel: 50,
    lastInteractionTurn: npc.lastSeenTurnId,
    relationshipHistory: [],
    emotionalState: initializeEmotionalState(),
  }));
}

export function initializeEnvironmentalContext(currentLocation: string): EnvironmentalContext {
  return {
    currentLocation,
    locationDetails: initializeLocationDetails(currentLocation),
    weatherConditions: initializeWeatherConditions(),
    timeContext: initializeTimeContext(),
    environmentalHazards: [],
    atmosphericModifiers: [],
    locationHistory: [],
  };
}

export function initializeLocationDetails(locationName: string): LocationDetails {
  return {
    locationType: 'other',
    size: 'medium',
    safetyLevel: 50,
    wealthLevel: 50,
    magicalLevel: 50,
    politicalStability: 50,
    availableServices: [],
    notableFeatures: [],
    connectedLocations: [],
    persistentChanges: [],
  };
}

export function initializeWeatherConditions(): WeatherConditions {
  return {
    condition: 'clear',
    temperature: 'mild',
    visibility: 100,
    weatherEffects: [],
  };
}

export function initializeTimeContext(): TimeContext {
  return {
    timeOfDay: 'midday',
    timeEffects: [],
    availableActions: [],
    activeNPCs: [],
  };
}

export function initializeLongTermStorySummary(): LongTermStorySummary {
  return {
    overallNarrative: 'The adventure has just begun.',
    majorMilestones: [],
    characterDevelopmentArcs: [],
    worldStateChanges: [],
    unresolvedMysteries: [],
    establishedRelationships: [],
    significantChoices: [],
    thematicElements: [],
    lastUpdated: new Date().toISOString(),
  };
}

export function initializePlayerPreferences(): PlayerPreferences {
  return {
    playstyle: {
      combatVsDiplomacy: 0,
      explorationVsStory: 0,
      cautionVsRisk: 0,
      soloVsGroup: 0,
      planningVsImpulsive: 0,
      moralAlignment: 0,
      preferredApproaches: [],
      avoidedApproaches: [],
    },
    contentPreferences: {
      preferredQuestTypes: [],
      favoriteNPCTypes: [],
      preferredLocations: [],
      contentComplexity: 'moderate',
      pacePreference: 'moderate',
      detailLevel: 'moderate',
      humorLevel: 50,
      romanceInterest: 50,
      politicalInvolvement: 50,
    },
    difficultyPreferences: {
      combatDifficulty: 50,
      puzzleDifficulty: 50,
      socialDifficulty: 50,
      resourceManagement: 50,
      timePresure: 50,
      consequenceSeverity: 50,
      adaptiveDifficulty: true,
      preferredChallengeTypes: [],
    },
    narrativePreferences: {
      storyFocus: 'balanced',
      preferredThemes: [],
      emotionalIntensity: 50,
      moralComplexity: 50,
      mysteryLevel: 50,
      prophecyInterest: 50,
      characterBackstoryDepth: 50,
    },
    interactionHistory: [],
    adaptiveSettings: {
      autoAdjustDifficulty: true,
      autoAdjustPacing: true,
      autoAdjustContent: true,
      learningRate: 50,
      adaptationThreshold: 70,
      lastAdaptation: new Date().toISOString(),
      adaptationHistory: [],
    },
    lastAnalyzed: new Date().toISOString(),
  };
}

export function initializeSystemMetrics(): SystemMetrics {
  return {
    performanceMetrics: {
      averageGenerationTime: 0,
      successRate: 100,
      timeoutRate: 0,
      retryRate: 0,
      cacheHitRate: 0,
      totalTurns: 0,
      totalPlayTime: 0,
      lastPerformanceUpdate: new Date().toISOString(),
    },
    engagementMetrics: {
      sessionLength: 0,
      actionsPerSession: 0,
      preferredActionTypes: {},
      satisfactionIndicators: [],
      dropOffPoints: [],
      reEngagementTriggers: [],
    },
    contentMetrics: {
      questCompletionRate: 0,
      explorationCoverage: 0,
      npcInteractionDiversity: 0,
      storyProgressionRate: 0,
      contentUtilization: {},
      playerCreatedContent: 0,
    },
    errorTracking: {
      generationErrors: [],
      validationErrors: [],
      userReportedIssues: [],
      systemWarnings: [],
      recoverySuccessRate: 100,
    },
    lastUpdated: new Date().toISOString(),
  };
}

// === MIGRATION FUNCTIONS ===

export function migrateToEnhancedState(oldState: any): StructuredStoryState {
  // Check if state already has enhanced features
  if (oldState.characterEmotionalState && oldState.npcRelationships) {
    return oldState as StructuredStoryState;
  }

  // Migrate old state to new enhanced state
  const enhancedState = initializeEnhancedStoryState(oldState);
  
  // Preserve any existing data that can be migrated
  if (oldState.trackedNPCs) {
    enhancedState.npcRelationships = initializeNPCRelationships(oldState.trackedNPCs);
  }

  return enhancedState;
}

// === VALIDATION FUNCTIONS ===

export function validateEnhancedState(state: StructuredStoryState): string[] {
  const warnings: string[] = [];

  // Validate emotional state
  if (!state.characterEmotionalState) {
    warnings.push('Missing character emotional state');
  }

  // Validate NPC relationships
  if (!state.npcRelationships || !Array.isArray(state.npcRelationships)) {
    warnings.push('Missing or invalid NPC relationships');
  }

  // Validate environmental context
  if (!state.environmentalContext) {
    warnings.push('Missing environmental context');
  }

  // Validate player preferences
  if (!state.playerPreferences) {
    warnings.push('Missing player preferences');
  }

  // Validate system metrics
  if (!state.systemMetrics) {
    warnings.push('Missing system metrics');
  }

  return warnings;
}

// === UTILITY FUNCTIONS ===

export function findNPCRelationship(state: StructuredStoryState, npcId: string): RelationshipEntry | undefined {
  return state.npcRelationships?.find(rel => rel.npcId === npcId);
}

export function findFactionStanding(state: StructuredStoryState, factionId: string): FactionStanding | undefined {
  return state.factionStandings?.find(faction => faction.factionId === factionId);
}

export function findNarrativeThread(state: StructuredStoryState, threadId: string): NarrativeThread | undefined {
  return state.narrativeThreads?.find(thread => thread.id === threadId);
}

export function getActiveNarrativeThreads(state: StructuredStoryState): NarrativeThread[] {
  return state.narrativeThreads?.filter(thread => 
    thread.status === 'active' || thread.status === 'escalating'
  ) || [];
}

export function getHighPriorityNarrativeThreads(state: StructuredStoryState): NarrativeThread[] {
  return state.narrativeThreads?.filter(thread =>
    thread.priority === 'high' || thread.priority === 'critical'
  ) || [];
}

// === UPDATE FUNCTIONS ===

export function updateEmotionalState(
  state: StructuredStoryState,
  updates: Partial<EmotionalState>
): StructuredStoryState {
  return {
    ...state,
    characterEmotionalState: {
      ...state.characterEmotionalState,
      ...updates,
      lastEmotionalUpdate: new Date().toISOString(),
    },
  };
}

export function updateNPCRelationship(
  state: StructuredStoryState,
  npcId: string,
  relationshipChange: number,
  interactionType: string,
  description: string,
  turnId: string
): StructuredStoryState {
  const relationships = [...(state.npcRelationships || [])];
  const existingIndex = relationships.findIndex(rel => rel.npcId === npcId);

  if (existingIndex >= 0) {
    const existing = relationships[existingIndex];
    const newScore = Math.max(-100, Math.min(100, existing.relationshipScore + relationshipChange));

    relationships[existingIndex] = {
      ...existing,
      relationshipScore: newScore,
      lastInteractionTurn: turnId,
      relationshipHistory: [
        ...existing.relationshipHistory,
        {
          turnId,
          timestamp: new Date().toISOString(),
          interactionType: interactionType as any,
          relationshipChange,
          emotionalImpact: relationshipChange > 0 ? 'positive' : relationshipChange < 0 ? 'negative' : 'neutral',
          description,
          consequences: [],
        },
      ].slice(-10), // Keep last 10 interactions
    };
  }

  return {
    ...state,
    npcRelationships: relationships,
  };
}

export function updateFactionStanding(
  state: StructuredStoryState,
  factionId: string,
  factionName: string,
  reputationChange: number,
  action: string,
  turnId: string
): StructuredStoryState {
  const factions = [...(state.factionStandings || [])];
  const existingIndex = factions.findIndex(faction => faction.factionId === factionId);

  const getStandingLevel = (score: number): any => {
    if (score >= 75) return 'revered';
    if (score >= 25) return 'allied';
    if (score >= 0) return 'friendly';
    if (score >= -25) return 'neutral';
    if (score >= -75) return 'unfriendly';
    return 'hostile';
  };

  if (existingIndex >= 0) {
    const existing = factions[existingIndex];
    const newScore = Math.max(-100, Math.min(100, existing.reputationScore + reputationChange));
    const newStanding = getStandingLevel(newScore);

    factions[existingIndex] = {
      ...existing,
      reputationScore: newScore,
      standingLevel: newStanding,
      reputationHistory: [
        ...existing.reputationHistory,
        {
          turnId,
          timestamp: new Date().toISOString(),
          action,
          reputationChange,
          newStandingLevel: newStanding,
          consequences: [],
        },
      ].slice(-20), // Keep last 20 reputation changes
    };
  } else {
    // Create new faction standing
    const newScore = Math.max(-100, Math.min(100, reputationChange));
    const newStanding = getStandingLevel(newScore);

    factions.push({
      factionId,
      factionName,
      reputationScore: newScore,
      standingLevel: newStanding,
      knownBy: true,
      specialTitles: [],
      reputationHistory: [{
        turnId,
        timestamp: new Date().toISOString(),
        action,
        reputationChange,
        newStandingLevel: newStanding,
        consequences: [],
      }],
      currentConsequences: [],
    });
  }

  return {
    ...state,
    factionStandings: factions,
  };
}

export function updateEnvironmentalContext(
  state: StructuredStoryState,
  updates: Partial<EnvironmentalContext>
): StructuredStoryState {
  return {
    ...state,
    environmentalContext: {
      ...state.environmentalContext,
      ...updates,
    },
  };
}

export function addNarrativeThread(
  state: StructuredStoryState,
  thread: Omit<NarrativeThread, 'id'>
): StructuredStoryState {
  const newThread: NarrativeThread = {
    ...thread,
    id: generateUUID(),
  };

  return {
    ...state,
    narrativeThreads: [...(state.narrativeThreads || []), newThread],
  };
}

export function updateNarrativeThread(
  state: StructuredStoryState,
  threadId: string,
  updates: Partial<NarrativeThread>
): StructuredStoryState {
  const threads = [...(state.narrativeThreads || [])];
  const existingIndex = threads.findIndex(thread => thread.id === threadId);

  if (existingIndex >= 0) {
    threads[existingIndex] = {
      ...threads[existingIndex],
      ...updates,
    };
  }

  return {
    ...state,
    narrativeThreads: threads,
  };
}

export function addChoiceConsequence(
  state: StructuredStoryState,
  consequence: Omit<ChoiceConsequence, 'id'>
): StructuredStoryState {
  const newConsequence: ChoiceConsequence = {
    ...consequence,
    id: generateUUID(),
  };

  return {
    ...state,
    choiceConsequences: [...(state.choiceConsequences || []), newConsequence],
  };
}

export function updatePlayerPreferences(
  state: StructuredStoryState,
  updates: Partial<PlayerPreferences>
): StructuredStoryState {
  return {
    ...state,
    playerPreferences: {
      ...state.playerPreferences,
      ...updates,
      lastAnalyzed: new Date().toISOString(),
    },
  };
}

export function updateSystemMetrics(
  state: StructuredStoryState,
  updates: Partial<SystemMetrics>
): StructuredStoryState {
  return {
    ...state,
    systemMetrics: {
      ...state.systemMetrics,
      ...updates,
      lastUpdated: new Date().toISOString(),
    },
  };
}
