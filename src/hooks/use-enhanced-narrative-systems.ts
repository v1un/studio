/**
 * Enhanced Narrative Systems Hook
 * 
 * React hook that integrates all four enhanced narrative systems:
 * 1. Multi-layered Consequence Chains
 * 2. Complex Relationship Webs
 * 3. Temporal Loop Mechanics
 * 4. Integrated State Management
 * 
 * Provides a unified interface for managing advanced narrative mechanics
 * while maintaining compatibility with existing game systems.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  StructuredStoryState,
  PlayerChoice,
  ChoiceConsequence,
  RelationshipEntry,
  GroupDynamicsEntry,
  RomanticTension,
  TemporalSaveState,
  MemoryRetentionEntry,
  PsychologicalEffect
} from '@/types/story';

import {
  createNarrativeSystemsManager,
  type NarrativeSystemsManager,
  type RelationshipChange,
  type RomanticEvent,
  type LoopTriggerResult,
  type ValidationResult
} from '@/lib/narrative-systems-integration';

import {
  initializeTemporalLoop,
  triggerTimeLoop,
  processMemoryTrigger
} from '@/lib/temporal-loop-engine';

import {
  createRelationshipWeb,
  createRomanticTension,
  updateRomanticTension
} from '@/lib/enhanced-relationship-engine';

import {
  createConsequenceChain,
  processConsequenceManifestation
} from '@/lib/enhanced-consequence-engine';

// === HOOK INTERFACE ===

export interface EnhancedNarrativeSystemsHook {
  // System State
  isSystemActive: boolean;
  systemValidation: ValidationResult | null;
  
  // Consequence Chain Management
  processPlayerChoice: (choice: PlayerChoice, storyState: StructuredStoryState, currentTurnId: string) => Promise<StructuredStoryState>;
  manifestPendingConsequences: (storyState: StructuredStoryState, currentTurnId: string) => Promise<StructuredStoryState>;
  
  // Relationship Web Management
  updateRelationshipWebs: (changes: RelationshipChange[], storyState: StructuredStoryState, currentTurnId: string) => Promise<StructuredStoryState>;
  createLoveTriangle: (npc1Id: string, npc2Id: string, targetId: string, storyState: StructuredStoryState) => Promise<StructuredStoryState>;
  processJealousyEvent: (jealousNPCId: string, targetNPCId: string, triggerAction: string, storyState: StructuredStoryState, currentTurnId: string) => Promise<StructuredStoryState>;
  
  // Temporal Loop Management
  initializeTimeLoops: (triggerEvent: string, storyState: StructuredStoryState) => Promise<StructuredStoryState>;
  triggerLoop: (triggerReason: string, storyState: StructuredStoryState, preserveMemories?: boolean) => Promise<StructuredStoryState>;
  checkForLoopTriggers: (storyState: StructuredStoryState, currentEvents: string[]) => LoopTriggerResult;
  processMemoryEffects: (storyState: StructuredStoryState, currentTurnId: string) => Promise<StructuredStoryState>;
  
  // Integrated Management
  synchronizeAllSystems: (storyState: StructuredStoryState, currentTurnId: string) => Promise<StructuredStoryState>;
  validateSystemConsistency: (storyState: StructuredStoryState) => ValidationResult;
  
  // System Control
  activateSystem: () => void;
  deactivateSystem: () => void;
  resetSystem: () => void;
}

// === HOOK IMPLEMENTATION ===

export function useEnhancedNarrativeSystems(): EnhancedNarrativeSystemsHook {
  const [isSystemActive, setIsSystemActive] = useState(false);
  const [systemValidation, setSystemValidation] = useState<ValidationResult | null>(null);
  
  const narrativeManagerRef = useRef<NarrativeSystemsManager | null>(null);
  
  // Initialize the narrative systems manager
  useEffect(() => {
    if (isSystemActive && !narrativeManagerRef.current) {
      narrativeManagerRef.current = createNarrativeSystemsManager();
    }
  }, [isSystemActive]);
  
  // === CONSEQUENCE CHAIN MANAGEMENT ===
  
  const processPlayerChoice = useCallback(async (
    choice: PlayerChoice,
    storyState: StructuredStoryState,
    currentTurnId: string
  ): Promise<StructuredStoryState> => {
    if (!isSystemActive || !narrativeManagerRef.current) {
      return storyState;
    }
    
    try {
      const updatedState = narrativeManagerRef.current.processPlayerChoice(choice, storyState, currentTurnId);
      
      // Validate the updated state
      const validation = narrativeManagerRef.current.validateSystemConsistency(updatedState);
      setSystemValidation(validation);
      
      return updatedState;
    } catch (error) {
      console.error('Error processing player choice:', error);
      return storyState;
    }
  }, [isSystemActive]);
  
  const manifestPendingConsequences = useCallback(async (
    storyState: StructuredStoryState,
    currentTurnId: string
  ): Promise<StructuredStoryState> => {
    if (!isSystemActive || !narrativeManagerRef.current) {
      return storyState;
    }
    
    try {
      return narrativeManagerRef.current.manifestPendingConsequences(storyState, currentTurnId);
    } catch (error) {
      console.error('Error manifesting consequences:', error);
      return storyState;
    }
  }, [isSystemActive]);
  
  // === RELATIONSHIP WEB MANAGEMENT ===
  
  const updateRelationshipWebs = useCallback(async (
    changes: RelationshipChange[],
    storyState: StructuredStoryState,
    currentTurnId: string
  ): Promise<StructuredStoryState> => {
    if (!isSystemActive || !narrativeManagerRef.current) {
      return storyState;
    }
    
    try {
      return narrativeManagerRef.current.updateRelationshipWebs(changes, storyState, currentTurnId);
    } catch (error) {
      console.error('Error updating relationship webs:', error);
      return storyState;
    }
  }, [isSystemActive]);
  
  const createLoveTriangle = useCallback(async (
    npc1Id: string,
    npc2Id: string,
    targetId: string,
    storyState: StructuredStoryState
  ): Promise<StructuredStoryState> => {
    if (!isSystemActive) {
      return storyState;
    }
    
    try {
      // Create the romantic tension
      const tension = createRomanticTension(
        'love_triangle',
        [npc1Id, npc2Id, ...(targetId !== 'player' ? [targetId] : [])],
        targetId === 'player',
        storyState
      );
      
      // Add to state
      const updatedState = {
        ...storyState,
        activeRomanticTensions: [...(storyState.activeRomanticTensions || []), tension]
      };
      
      // Create or update relationship web
      const existingWeb = storyState.groupDynamics?.find(web => 
        web.memberIds.includes(npc1Id) && web.memberIds.includes(npc2Id)
      );
      
      if (!existingWeb) {
        const web = createRelationshipWeb([npc1Id, npc2Id], 'love_triangle', updatedState);
        return {
          ...updatedState,
          groupDynamics: [...(updatedState.groupDynamics || []), web]
        };
      }
      
      return updatedState;
    } catch (error) {
      console.error('Error creating love triangle:', error);
      return storyState;
    }
  }, [isSystemActive]);
  
  const processJealousyEvent = useCallback(async (
    jealousNPCId: string,
    targetNPCId: string,
    triggerAction: string,
    storyState: StructuredStoryState,
    currentTurnId: string
  ): Promise<StructuredStoryState> => {
    if (!isSystemActive) {
      return storyState;
    }
    
    try {
      const romanticEvent: RomanticEvent = {
        type: 'jealousy_trigger',
        involvedNPCIds: [jealousNPCId, targetNPCId],
        playerInvolved: true,
        description: triggerAction,
        intensity: 70
      };
      
      if (narrativeManagerRef.current) {
        return narrativeManagerRef.current.processRomanticDynamics([romanticEvent], storyState, currentTurnId);
      }
      
      return storyState;
    } catch (error) {
      console.error('Error processing jealousy event:', error);
      return storyState;
    }
  }, [isSystemActive]);
  
  // === TEMPORAL LOOP MANAGEMENT ===
  
  const initializeTimeLoops = useCallback(async (
    triggerEvent: string,
    storyState: StructuredStoryState
  ): Promise<StructuredStoryState> => {
    if (!isSystemActive) {
      return storyState;
    }
    
    try {
      return initializeTemporalLoop(triggerEvent, storyState);
    } catch (error) {
      console.error('Error initializing time loops:', error);
      return storyState;
    }
  }, [isSystemActive]);
  
  const triggerLoop = useCallback(async (
    triggerReason: string,
    storyState: StructuredStoryState,
    preserveMemories: boolean = true
  ): Promise<StructuredStoryState> => {
    if (!isSystemActive) {
      return storyState;
    }
    
    try {
      return triggerTimeLoop(triggerReason, storyState, preserveMemories);
    } catch (error) {
      console.error('Error triggering time loop:', error);
      return storyState;
    }
  }, [isSystemActive]);
  
  const checkForLoopTriggers = useCallback((
    storyState: StructuredStoryState,
    currentEvents: string[]
  ): LoopTriggerResult => {
    if (!isSystemActive || !narrativeManagerRef.current) {
      return {
        shouldTriggerLoop: false,
        preserveMemories: false,
        loopType: 'manual'
      };
    }
    
    return narrativeManagerRef.current.checkLoopTriggers(storyState, currentEvents);
  }, [isSystemActive]);
  
  const processMemoryEffects = useCallback(async (
    storyState: StructuredStoryState,
    currentTurnId: string
  ): Promise<StructuredStoryState> => {
    if (!isSystemActive || !narrativeManagerRef.current) {
      return storyState;
    }
    
    try {
      return narrativeManagerRef.current.processTemporalEffects(storyState, currentTurnId);
    } catch (error) {
      console.error('Error processing memory effects:', error);
      return storyState;
    }
  }, [isSystemActive]);
  
  // === INTEGRATED MANAGEMENT ===
  
  const synchronizeAllSystems = useCallback(async (
    storyState: StructuredStoryState,
    currentTurnId: string
  ): Promise<StructuredStoryState> => {
    if (!isSystemActive || !narrativeManagerRef.current) {
      return storyState;
    }
    
    try {
      const synchronizedState = narrativeManagerRef.current.synchronizeAllSystems(storyState, currentTurnId);
      
      // Update validation
      const validation = narrativeManagerRef.current.validateSystemConsistency(synchronizedState);
      setSystemValidation(validation);
      
      return synchronizedState;
    } catch (error) {
      console.error('Error synchronizing systems:', error);
      return storyState;
    }
  }, [isSystemActive]);
  
  const validateSystemConsistency = useCallback((
    storyState: StructuredStoryState
  ): ValidationResult => {
    if (!isSystemActive || !narrativeManagerRef.current) {
      return {
        isValid: true,
        warnings: [],
        errors: [],
        suggestions: []
      };
    }
    
    return narrativeManagerRef.current.validateSystemConsistency(storyState);
  }, [isSystemActive]);
  
  // === SYSTEM CONTROL ===
  
  const activateSystem = useCallback(() => {
    setIsSystemActive(true);
    console.log('Enhanced Narrative Systems activated');
  }, []);
  
  const deactivateSystem = useCallback(() => {
    setIsSystemActive(false);
    setSystemValidation(null);
    console.log('Enhanced Narrative Systems deactivated');
  }, []);
  
  const resetSystem = useCallback(() => {
    narrativeManagerRef.current = null;
    setSystemValidation(null);
    if (isSystemActive) {
      narrativeManagerRef.current = createNarrativeSystemsManager();
    }
    console.log('Enhanced Narrative Systems reset');
  }, [isSystemActive]);
  
  return {
    // System State
    isSystemActive,
    systemValidation,
    
    // Consequence Chain Management
    processPlayerChoice,
    manifestPendingConsequences,
    
    // Relationship Web Management
    updateRelationshipWebs,
    createLoveTriangle,
    processJealousyEvent,
    
    // Temporal Loop Management
    initializeTimeLoops,
    triggerLoop,
    checkForLoopTriggers,
    processMemoryEffects,
    
    // Integrated Management
    synchronizeAllSystems,
    validateSystemConsistency,
    
    // System Control
    activateSystem,
    deactivateSystem,
    resetSystem
  };
}
