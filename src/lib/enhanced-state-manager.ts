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
  TimeContext,
  // Enhanced Quest System Types
  Quest,
  QuestBranch,
  QuestChoice,
  QuestConsequence,
  PlayerChoice,
  MoralProfile,
  EnhancedFaction,
  WorldState,
  QuestGenerationSettings,
  QuestFailureRecord,
  TimeBasedEvent,
  ChoiceConsequenceTracking,
  // Balance System Types
  GameBalanceSettings,
  PlayerPerformanceMetrics,
  // Enhanced Narrative Systems Types
  GroupDynamicsEntry,
  RomanticTension,
  ButterflyEffectChain,
  ConsequenceConnection,
  TemporalGameState,
  TemporalSaveState,
  MemoryRetentionEntry,
  PsychologicalEffect
} from '@/types/story';
import { generateUUID } from '@/lib/utils';
import { initializeGameBalance, initializePlayerPerformanceMetrics } from '@/lib/game-balance-engine';

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

    // === ENHANCED QUEST AND CHOICE SYSTEM ===
    enhancedFactions: initializeEnhancedFactions(),
    worldStates: initializeWorldStates(),
    playerChoices: [],
    moralProfile: initializeMoralProfile(),
    questBranches: {},
    activeQuestChoices: {},
    questGenerationSettings: initializeQuestGenerationSettings(),
    questFailures: [],
    timeBasedEvents: [],

    // === GAME BALANCE AND DIFFICULTY SYSTEM ===
    gameBalance: initializeGameBalance(),
    playerPerformance: initializePlayerPerformanceMetrics(),
    activeResourceScarcity: [],
    activeTradeoffs: [],
    failureHistory: [],

    // === ENHANCED NARRATIVE SYSTEMS ===
    groupDynamics: [],
    activeRomanticTensions: [],
    socialCircles: {},
    consequenceChains: {},
    butterflyEffects: [],
    crossThreadConnections: [],
    temporalState: undefined, // Only initialized when time loops are activated
    loopHistory: [],
    retainedMemories: [],
    psychologicalEffects: [],
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

// === ENHANCED QUEST SYSTEM INITIALIZATION ===

export function initializeEnhancedFactions(): EnhancedFaction[] {
  // Import and initialize basic factions
  return [];
}

export function initializeWorldStates(): WorldState[] {
  return [];
}

export function initializeMoralProfile(): MoralProfile {
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

export function initializeQuestGenerationSettings(): QuestGenerationSettings {
  return {
    dynamicQuestFrequency: 'medium',
    preferredQuestTypes: ['main', 'side', 'dynamic'],
    difficultyPreference: 'adaptive',
    branchingComplexity: 'moderate',
    consequenceSeverity: 'moderate',
    moralComplexityLevel: 50,
    timeConstraintPreference: 'moderate',
    failureToleranceLevel: 50,
    adaptiveGeneration: true,
    playerChoiceWeight: 70
  };
}

// === ENHANCED NARRATIVE SYSTEMS INITIALIZATION ===

export function initializeGroupDynamics(): GroupDynamicsEntry[] {
  return [];
}

export function initializeRomanticTensions(): RomanticTension[] {
  return [];
}

export function initializeButterflyEffects(): ButterflyEffectChain[] {
  return [];
}

export function initializeConsequenceConnections(): ConsequenceConnection[] {
  return [];
}

export function initializeTemporalState(): TemporalGameState | undefined {
  // Only initialize when time loops are activated
  return undefined;
}

export function initializeMemoryRetention(): MemoryRetentionEntry[] {
  return [];
}

export function initializePsychologicalEffects(): PsychologicalEffect[] {
  return [];
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

// === PRIORITY-BASED STATE UPDATE SYSTEM ===

export interface StateUpdate {
  type: 'relationship' | 'emotion' | 'environment' | 'narrative' | 'player_agency' | 'system';
  priority: number; // 1 = highest priority, 5 = lowest
  data: any;
  description: string;
  turnId: string;
}

export function updateStateWithPriority(
  state: StructuredStoryState,
  updates: StateUpdate[]
): StructuredStoryState {
  // Sort updates by priority (1 = highest, 5 = lowest)
  const sortedUpdates = [...updates].sort((a, b) => a.priority - b.priority);

  let updatedState = { ...state };

  for (const update of sortedUpdates) {
    switch (update.type) {
      case 'relationship':
        updatedState = applyRelationshipUpdate(updatedState, update);
        break;
      case 'emotion':
        updatedState = applyEmotionalUpdate(updatedState, update);
        break;
      case 'environment':
        updatedState = applyEnvironmentalUpdate(updatedState, update);
        break;
      case 'narrative':
        updatedState = applyNarrativeUpdate(updatedState, update);
        break;
      case 'player_agency':
        updatedState = applyPlayerAgencyUpdate(updatedState, update);
        break;
      case 'system':
        updatedState = applySystemUpdate(updatedState, update);
        break;
    }
  }

  return updatedState;
}

function applyRelationshipUpdate(state: StructuredStoryState, update: StateUpdate): StructuredStoryState {
  const { npcId, relationshipChange, interactionType, description } = update.data;

  return updateNPCRelationship(
    state,
    npcId,
    relationshipChange,
    interactionType,
    description,
    update.turnId
  );
}

function applyEmotionalUpdate(state: StructuredStoryState, update: StateUpdate): StructuredStoryState {
  const emotionalUpdates = update.data;

  return updateEmotionalState(state, {
    ...emotionalUpdates,
    lastEmotionalUpdate: new Date().toISOString(),
  });
}

function applyEnvironmentalUpdate(state: StructuredStoryState, update: StateUpdate): StructuredStoryState {
  const environmentalUpdates = update.data;

  return updateEnvironmentalContext(state, environmentalUpdates);
}

function applyNarrativeUpdate(state: StructuredStoryState, update: StateUpdate): StructuredStoryState {
  const { threadId, threadUpdates, newThread } = update.data;

  if (newThread) {
    return addNarrativeThread(state, newThread);
  } else if (threadId && threadUpdates) {
    return updateNarrativeThread(state, threadId, threadUpdates);
  }

  return state;
}

function applyPlayerAgencyUpdate(state: StructuredStoryState, update: StateUpdate): StructuredStoryState {
  const { preferenceUpdates, choiceRecord } = update.data;

  let updatedState = state;

  if (preferenceUpdates) {
    updatedState = {
      ...updatedState,
      playerPreferences: {
        ...updatedState.playerPreferences,
        ...preferenceUpdates,
        lastAnalyzed: new Date().toISOString(),
      },
    };
  }

  if (choiceRecord) {
    updatedState = {
      ...updatedState,
      playerChoices: [...(updatedState.playerChoices || []), choiceRecord],
    };
  }

  return updatedState;
}

function applySystemUpdate(state: StructuredStoryState, update: StateUpdate): StructuredStoryState {
  const { metricsUpdates } = update.data;

  if (metricsUpdates) {
    return {
      ...state,
      systemMetrics: {
        ...state.systemMetrics,
        ...metricsUpdates,
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  return state;
}

// === PRIORITY-BASED UPDATE HELPERS ===

export function createRelationshipUpdate(
  npcId: string,
  relationshipChange: number,
  interactionType: string,
  description: string,
  turnId: string
): StateUpdate {
  return {
    type: 'relationship',
    priority: 1, // Highest priority
    data: { npcId, relationshipChange, interactionType, description },
    description: `Relationship change with ${npcId}: ${relationshipChange > 0 ? '+' : ''}${relationshipChange}`,
    turnId,
  };
}

export function createEmotionalUpdate(
  emotionalChanges: Partial<EmotionalState>,
  description: string,
  turnId: string
): StateUpdate {
  return {
    type: 'emotion',
    priority: 1, // Highest priority (same as relationships)
    data: emotionalChanges,
    description,
    turnId,
  };
}

export function createEnvironmentalUpdate(
  environmentalChanges: Partial<EnvironmentalContext>,
  description: string,
  turnId: string
): StateUpdate {
  return {
    type: 'environment',
    priority: 2, // Second priority
    data: environmentalChanges,
    description,
    turnId,
  };
}

export function createNarrativeUpdate(
  threadData: { threadId?: string; threadUpdates?: Partial<NarrativeThread>; newThread?: Omit<NarrativeThread, 'id'> },
  description: string,
  turnId: string
): StateUpdate {
  return {
    type: 'narrative',
    priority: 3, // Third priority
    data: threadData,
    description,
    turnId,
  };
}

export function createPlayerAgencyUpdate(
  agencyData: { preferenceUpdates?: Partial<PlayerPreferences>; choiceRecord?: any },
  description: string,
  turnId: string
): StateUpdate {
  return {
    type: 'player_agency',
    priority: 4, // Fourth priority
    data: agencyData,
    description,
    turnId,
  };
}

export function createSystemUpdate(
  systemData: { metricsUpdates?: Partial<SystemMetrics> },
  description: string,
  turnId: string
): StateUpdate {
  return {
    type: 'system',
    priority: 5, // Lowest priority
    data: systemData,
    description,
    turnId,
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

// === ENHANCED QUEST SYSTEM UTILITIES ===

export function addPlayerChoice(
  state: StructuredStoryState,
  choice: Omit<PlayerChoice, 'id'>
): StructuredStoryState {
  const newChoice: PlayerChoice = {
    ...choice,
    id: generateUUID(),
  };

  return {
    ...state,
    playerChoices: [...(state.playerChoices || []), newChoice],
  };
}

export function updateQuestWithBranch(
  state: StructuredStoryState,
  questId: string,
  branchId: string,
  choice: QuestChoice
): StructuredStoryState {
  const quests = state.quests.map(quest => {
    if (quest.id === questId) {
      return {
        ...quest,
        currentBranch: branchId,
        choiceHistory: [...(quest.choiceHistory || []), choice],
        updatedAt: new Date().toISOString()
      };
    }
    return quest;
  });

  return {
    ...state,
    quests
  };
}

export function addQuestFailure(
  state: StructuredStoryState,
  failure: QuestFailureRecord
): StructuredStoryState {
  return {
    ...state,
    questFailures: [...(state.questFailures || []), failure]
  };
}

export function addTimeBasedEvent(
  state: StructuredStoryState,
  event: TimeBasedEvent
): StructuredStoryState {
  return {
    ...state,
    timeBasedEvents: [...(state.timeBasedEvents || []), event]
  };
}

export function updateMoralProfile(
  state: StructuredStoryState,
  updates: Partial<MoralProfile>
): StructuredStoryState {
  return {
    ...state,
    moralProfile: {
      ...state.moralProfile,
      ...updates
    }
  };
}

export function addWorldState(
  state: StructuredStoryState,
  worldState: WorldState
): StructuredStoryState {
  return {
    ...state,
    worldStates: [...(state.worldStates || []), worldState]
  };
}

export function updateWorldState(
  state: StructuredStoryState,
  worldStateId: string,
  updates: Partial<WorldState>
): StructuredStoryState {
  const worldStates = (state.worldStates || []).map(ws =>
    ws.id === worldStateId ? { ...ws, ...updates } : ws
  );

  return {
    ...state,
    worldStates
  };
}

export function findPlayerChoice(
  state: StructuredStoryState,
  choiceId: string
): PlayerChoice | undefined {
  return state.playerChoices?.find(choice => choice.id === choiceId);
}

export function getRecentPlayerChoices(
  state: StructuredStoryState,
  count: number = 5
): PlayerChoice[] {
  return (state.playerChoices || []).slice(-count);
}

export function getActiveTimeBasedEvents(
  state: StructuredStoryState
): TimeBasedEvent[] {
  const now = new Date().toISOString();
  return (state.timeBasedEvents || []).filter(event =>
    event.scheduledTime > now
  );
}

export function getOverdueTimeBasedEvents(
  state: StructuredStoryState
): TimeBasedEvent[] {
  const now = new Date().toISOString();
  return (state.timeBasedEvents || []).filter(event =>
    event.scheduledTime <= now
  );
}

export function updateQuestGenerationSettings(
  state: StructuredStoryState,
  updates: Partial<QuestGenerationSettings>
): StructuredStoryState {
  return {
    ...state,
    questGenerationSettings: {
      ...state.questGenerationSettings,
      ...updates
    }
  };
}
