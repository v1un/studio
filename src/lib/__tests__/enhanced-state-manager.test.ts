/**
 * Enhanced State Manager Tests
 * 
 * Tests for the enhanced tracking system functionality
 */

import {
  initializeEnhancedStoryState,
  migrateToEnhancedState,
  validateEnhancedState,
  updateEmotionalState,
  updateNPCRelationship,
  updateFactionStanding,
  addNarrativeThread,
  addChoiceConsequence,
  findNPCRelationship,
  findFactionStanding,
  getActiveNarrativeThreads,
} from '../enhanced-state-manager';
import type { StructuredStoryState, CharacterProfile } from '@/types/story';

// Mock data for testing
const mockBaseStoryState: any = {
  character: {
    id: 'test-char',
    name: 'Test Character',
    class: 'Warrior',
    level: 1,
    health: 100,
    maxHealth: 100,
    mana: 50,
    maxMana: 50,
    experiencePoints: 0,
    experienceToNextLevel: 100,
    currency: 100,
    languageReading: 50,
    languageSpeaking: 50,
    description: 'A test character',
    skillsAndAbilities: [],
    activeTemporaryEffects: [],
  },
  currentLocation: 'Test Location',
  inventory: [],
  equippedItems: {},
  quests: [],
  storyArcs: [],
  worldFacts: [],
  trackedNPCs: [
    {
      id: 'npc-1',
      name: 'Test NPC',
      description: 'A test NPC',
      relationshipStatus: 25,
      knownFacts: [],
    },
  ],
  storySummary: 'Test story summary',
};

describe('Enhanced State Manager', () => {
  describe('Initialization', () => {
    test('should initialize enhanced story state with all required fields', () => {
      const enhancedState = initializeEnhancedStoryState(mockBaseStoryState);

      expect(enhancedState.characterEmotionalState).toBeDefined();
      expect(enhancedState.npcRelationships).toBeDefined();
      expect(enhancedState.factionStandings).toBeDefined();
      expect(enhancedState.environmentalContext).toBeDefined();
      expect(enhancedState.narrativeThreads).toBeDefined();
      expect(enhancedState.longTermStorySummary).toBeDefined();
      expect(enhancedState.playerPreferences).toBeDefined();
      expect(enhancedState.choiceConsequences).toBeDefined();
      expect(enhancedState.systemMetrics).toBeDefined();
    });

    test('should migrate NPC relationships from legacy format', () => {
      const enhancedState = initializeEnhancedStoryState(mockBaseStoryState);
      
      expect(enhancedState.npcRelationships).toHaveLength(1);
      expect(enhancedState.npcRelationships[0].npcId).toBe('npc-1');
      expect(enhancedState.npcRelationships[0].npcName).toBe('Test NPC');
      expect(enhancedState.npcRelationships[0].relationshipScore).toBe(25);
    });

    test('should initialize emotional state with default values', () => {
      const enhancedState = initializeEnhancedStoryState(mockBaseStoryState);
      const emotionalState = enhancedState.characterEmotionalState;

      expect(emotionalState.primaryMood).toBe('content');
      expect(emotionalState.stressLevel).toBe(20);
      expect(emotionalState.fatigueLevel).toBe(10);
      expect(emotionalState.mentalHealthScore).toBe(80);
      expect(emotionalState.traumaticEvents).toEqual([]);
      expect(emotionalState.moodModifiers).toEqual([]);
    });
  });

  describe('Migration', () => {
    test('should migrate old state to enhanced state', () => {
      const migratedState = migrateToEnhancedState(mockBaseStoryState);

      expect(migratedState.characterEmotionalState).toBeDefined();
      expect(migratedState.npcRelationships).toBeDefined();
      expect(migratedState.environmentalContext).toBeDefined();
    });

    test('should preserve existing enhanced state', () => {
      const alreadyEnhanced = initializeEnhancedStoryState(mockBaseStoryState);
      const migratedState = migrateToEnhancedState(alreadyEnhanced);

      expect(migratedState).toEqual(alreadyEnhanced);
    });
  });

  describe('Validation', () => {
    test('should validate complete enhanced state without warnings', () => {
      const enhancedState = initializeEnhancedStoryState(mockBaseStoryState);
      const warnings = validateEnhancedState(enhancedState);

      expect(warnings).toEqual([]);
    });

    test('should detect missing enhanced state components', () => {
      const incompleteState = { ...mockBaseStoryState };
      const warnings = validateEnhancedState(incompleteState as any);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings).toContain('Missing character emotional state');
      expect(warnings).toContain('Missing or invalid NPC relationships');
    });
  });

  describe('Emotional State Updates', () => {
    test('should update emotional state correctly', () => {
      let state = initializeEnhancedStoryState(mockBaseStoryState);
      
      state = updateEmotionalState(state, {
        primaryMood: 'anxious',
        stressLevel: 75,
      });

      expect(state.characterEmotionalState.primaryMood).toBe('anxious');
      expect(state.characterEmotionalState.stressLevel).toBe(75);
      expect(state.characterEmotionalState.lastEmotionalUpdate).toBeDefined();
    });
  });

  describe('NPC Relationship Updates', () => {
    test('should update existing NPC relationship', () => {
      let state = initializeEnhancedStoryState(mockBaseStoryState);
      
      state = updateNPCRelationship(
        state,
        'npc-1',
        15,
        'conversation',
        'Had a pleasant conversation',
        'turn-1'
      );

      const relationship = findNPCRelationship(state, 'npc-1');
      expect(relationship?.relationshipScore).toBe(40); // 25 + 15
      expect(relationship?.relationshipHistory).toHaveLength(1);
      expect(relationship?.lastInteractionTurn).toBe('turn-1');
    });

    test('should cap relationship scores at -100 to +100', () => {
      let state = initializeEnhancedStoryState(mockBaseStoryState);
      
      // Test upper cap
      state = updateNPCRelationship(state, 'npc-1', 100, 'help', 'Saved their life', 'turn-1');
      let relationship = findNPCRelationship(state, 'npc-1');
      expect(relationship?.relationshipScore).toBe(100);

      // Test lower cap
      state = updateNPCRelationship(state, 'npc-1', -250, 'betrayal', 'Betrayed them', 'turn-2');
      relationship = findNPCRelationship(state, 'npc-1');
      expect(relationship?.relationshipScore).toBe(-100);
    });
  });

  describe('Faction Standing Updates', () => {
    test('should create new faction standing', () => {
      let state = initializeEnhancedStoryState(mockBaseStoryState);
      
      state = updateFactionStanding(
        state,
        'faction-1',
        'Test Faction',
        50,
        'Completed quest for faction',
        'turn-1'
      );

      const standing = findFactionStanding(state, 'faction-1');
      expect(standing?.factionName).toBe('Test Faction');
      expect(standing?.reputationScore).toBe(50);
      expect(standing?.standingLevel).toBe('friendly');
    });

    test('should update existing faction standing', () => {
      let state = initializeEnhancedStoryState(mockBaseStoryState);
      
      // Create initial standing
      state = updateFactionStanding(state, 'faction-1', 'Test Faction', 25, 'Initial action', 'turn-1');
      
      // Update standing
      state = updateFactionStanding(state, 'faction-1', 'Test Faction', 50, 'Major help', 'turn-2');

      const standing = findFactionStanding(state, 'faction-1');
      expect(standing?.reputationScore).toBe(75);
      expect(standing?.standingLevel).toBe('allied');
      expect(standing?.reputationHistory).toHaveLength(2);
    });
  });

  describe('Narrative Thread Management', () => {
    test('should add narrative thread', () => {
      let state = initializeEnhancedStoryState(mockBaseStoryState);
      
      state = addNarrativeThread(state, {
        title: 'Test Thread',
        description: 'A test narrative thread',
        category: 'main_plot',
        priority: 'high',
        status: 'active',
        timeSensitive: true,
        urgencyLevel: 75,
        relatedCharacters: ['npc-1'],
        relatedLocations: ['Test Location'],
        relatedFactions: [],
        keyEvents: [],
        potentialOutcomes: ['Success', 'Failure'],
        playerInfluence: 80,
        consequences: [],
      });

      const activeThreads = getActiveNarrativeThreads(state);
      expect(activeThreads).toHaveLength(1);
      expect(activeThreads[0].title).toBe('Test Thread');
      expect(activeThreads[0].priority).toBe('high');
    });
  });

  describe('Choice Consequence Tracking', () => {
    test('should add choice consequence', () => {
      let state = initializeEnhancedStoryState(mockBaseStoryState);
      
      state = addChoiceConsequence(state, {
        originalChoiceTurnId: 'turn-1',
        originalChoice: 'Chose to help the villagers',
        consequenceType: 'long_term',
        category: 'reputation',
        description: 'Villagers remember your kindness',
        severity: 'moderate',
        isActive: true,
        ongoingEffects: ['Positive reputation with villagers'],
        playerAwareness: 'fully_aware',
        futureImplications: ['May receive help from villagers later'],
      });

      expect(state.choiceConsequences).toHaveLength(1);
      expect(state.choiceConsequences[0].originalChoice).toBe('Chose to help the villagers');
      expect(state.choiceConsequences[0].isActive).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    test('should find NPC relationship by ID', () => {
      const state = initializeEnhancedStoryState(mockBaseStoryState);
      const relationship = findNPCRelationship(state, 'npc-1');

      expect(relationship).toBeDefined();
      expect(relationship?.npcId).toBe('npc-1');
    });

    test('should return undefined for non-existent NPC relationship', () => {
      const state = initializeEnhancedStoryState(mockBaseStoryState);
      const relationship = findNPCRelationship(state, 'non-existent');

      expect(relationship).toBeUndefined();
    });

    test('should get active narrative threads', () => {
      let state = initializeEnhancedStoryState(mockBaseStoryState);
      
      // Add active thread
      state = addNarrativeThread(state, {
        title: 'Active Thread',
        description: 'An active thread',
        category: 'main_plot',
        priority: 'medium',
        status: 'active',
        timeSensitive: false,
        urgencyLevel: 50,
        relatedCharacters: [],
        relatedLocations: [],
        relatedFactions: [],
        keyEvents: [],
        potentialOutcomes: [],
        playerInfluence: 50,
        consequences: [],
      });

      // Add dormant thread
      state = addNarrativeThread(state, {
        title: 'Dormant Thread',
        description: 'A dormant thread',
        category: 'character_development',
        priority: 'low',
        status: 'dormant',
        timeSensitive: false,
        urgencyLevel: 10,
        relatedCharacters: [],
        relatedLocations: [],
        relatedFactions: [],
        keyEvents: [],
        potentialOutcomes: [],
        playerInfluence: 30,
        consequences: [],
      });

      const activeThreads = getActiveNarrativeThreads(state);
      expect(activeThreads).toHaveLength(1);
      expect(activeThreads[0].title).toBe('Active Thread');
    });
  });
});
