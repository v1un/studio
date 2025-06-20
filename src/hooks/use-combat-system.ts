/**
 * Combat System Hook
 * 
 * React hook for managing combat state and interactions.
 * Provides a clean interface for combat operations including:
 * - Combat initialization and state management
 * - Action execution and validation
 * - Turn management and progression
 * - Combat end detection and cleanup
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  CombatState,
  CombatParticipant,
  CombatAction,
  CombatActionResult,
  CombatTurnResult,
  CombatEndResult,
  VictoryCondition,
  DefeatCondition,
  CombatEnvironment
} from '@/types/combat';
import {
  processCombatAction,
  calculateInitiative,
  checkCombatEnd
} from '@/lib/combat-engine';
import { generateUUID } from '@/lib/utils';

export interface UseCombatSystemOptions {
  onCombatEnd?: (result: CombatEndResult) => void;
  onTurnChange?: (newTurnId: string, phase: CombatState['phase']) => void;
  onActionExecuted?: (result: CombatActionResult) => void;
  autoAdvanceEnemyTurns?: boolean;
  turnTimeLimit?: number; // seconds
}

export interface CombatSystemState {
  combatState: CombatState | null;
  isPlayerTurn: boolean;
  availableActions: CombatAction[];
  isProcessingAction: boolean;
  lastActionResult: CombatActionResult | null;
  combatEndResult: CombatEndResult | null;
}

export function useCombatSystem(options: UseCombatSystemOptions = {}) {
  const [combatState, setCombatState] = useState<CombatState | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [lastActionResult, setLastActionResult] = useState<CombatActionResult | null>(null);
  const [combatEndResult, setCombatEndResult] = useState<CombatEndResult | null>(null);

  // === COMBAT INITIALIZATION ===

  const initiateCombat = useCallback((
    participants: CombatParticipant[],
    environment?: CombatEnvironment,
    victoryConditions?: VictoryCondition[],
    defeatConditions?: DefeatCondition[]
  ) => {
    const turnOrder = calculateInitiative(participants);
    const firstTurnId = turnOrder[0];
    const firstParticipant = participants.find(p => p.id === firstTurnId);

    const newCombatState: CombatState = {
      id: generateUUID(),
      isActive: true,
      phase: firstParticipant?.type === 'player' ? 'player_turn' : 'enemy_turn',
      participants: participants.map(p => ({
        ...p,
        actionPoints: p.maxActionPoints,
        statusEffects: [...p.statusEffects],
        availableSkills: p.availableSkills.map(s => ({ ...s, currentCooldown: 0 })),
      })),
      currentTurnId: firstTurnId,
      turnOrder,
      round: 1,
      environment,
      actionHistory: [],
      victoryConditions: victoryConditions || [
        {
          type: 'defeat_all_enemies',
          description: 'Defeat all enemies',
          completed: false,
        }
      ],
      defeatConditions: defeatConditions || [
        {
          type: 'player_death',
          description: 'Player is defeated',
          triggered: false,
        }
      ],
      startTime: new Date().toISOString(),
      turnStartTime: new Date().toISOString(),
      turnTimeLimit: options.turnTimeLimit,
    };

    setCombatState(newCombatState);
    setLastActionResult(null);
    setCombatEndResult(null);

    // Notify turn change
    if (options.onTurnChange) {
      options.onTurnChange(firstTurnId, newCombatState.phase);
    }
  }, [options]);

  // === ACTION EXECUTION ===

  const executeAction = useCallback(async (action: CombatAction): Promise<CombatTurnResult> => {
    if (!combatState || isProcessingAction) {
      return {
        success: false,
        error: 'Combat not active or action already processing',
        newState: combatState!,
      };
    }

    setIsProcessingAction(true);

    try {
      // Process the action
      const result = processCombatAction(combatState, action);
      
      if (result.success) {
        setCombatState(result.newState);
        setLastActionResult(result.actionResult || null);

        // Notify action executed
        if (result.actionResult && options.onActionExecuted) {
          options.onActionExecuted(result.actionResult);
        }

        // Check for combat end
        if (result.combatEnd) {
          setCombatEndResult(result.combatEnd);
          if (options.onCombatEnd) {
            options.onCombatEnd(result.combatEnd);
          }
        } else if (result.nextPhase && options.onTurnChange) {
          // Notify turn change
          options.onTurnChange(result.newState.currentTurnId, result.nextPhase);
        }
      }

      return result;
    } finally {
      setIsProcessingAction(false);
    }
  }, [combatState, isProcessingAction, options]);

  // === HELPER FUNCTIONS ===

  const getCurrentParticipant = useCallback((): CombatParticipant | null => {
    if (!combatState) return null;
    return combatState.participants.find(p => p.id === combatState.currentTurnId) || null;
  }, [combatState]);

  const getPlayerParticipant = useCallback((): CombatParticipant | null => {
    if (!combatState) return null;
    return combatState.participants.find(p => p.type === 'player') || null;
  }, [combatState]);

  const getEnemyParticipants = useCallback((): CombatParticipant[] => {
    if (!combatState) return [];
    return combatState.participants.filter(p => p.type === 'enemy');
  }, [combatState]);

  const getAllyParticipants = useCallback((): CombatParticipant[] => {
    if (!combatState) return [];
    return combatState.participants.filter(p => p.type === 'ally');
  }, [combatState]);

  const getAvailableActions = useCallback((): CombatAction[] => {
    const currentParticipant = getCurrentParticipant();
    if (!currentParticipant || currentParticipant.type !== 'player') {
      return [];
    }

    const actions: CombatAction[] = [];

    // Basic attack action
    if (currentParticipant.actionPoints >= 2) {
      actions.push({
        id: generateUUID(),
        type: 'attack',
        actorId: currentParticipant.id,
        actionPointCost: 2,
      });
    }

    // Defend action
    if (currentParticipant.actionPoints >= 1) {
      actions.push({
        id: generateUUID(),
        type: 'defend',
        actorId: currentParticipant.id,
        actionPointCost: 1,
      });
    }

    // Skill actions
    currentParticipant.availableSkills.forEach(skill => {
      if (
        currentParticipant.actionPoints >= skill.actionPointCost &&
        skill.currentCooldown === 0 &&
        (!skill.manaCost || (currentParticipant.mana && currentParticipant.mana >= skill.manaCost))
      ) {
        actions.push({
          id: generateUUID(),
          type: 'skill',
          actorId: currentParticipant.id,
          skillId: skill.id,
          actionPointCost: skill.actionPointCost,
          manaCost: skill.manaCost,
        });
      }
    });

    // Item actions
    currentParticipant.availableItems.forEach(item => {
      if (
        item.usableInCombat &&
        item.quantity > 0 &&
        currentParticipant.actionPoints >= item.actionPointCost
      ) {
        actions.push({
          id: generateUUID(),
          type: 'item',
          actorId: currentParticipant.id,
          itemId: item.id,
          actionPointCost: item.actionPointCost,
        });
      }
    });

    // Movement action
    if (currentParticipant.actionPoints >= 1) {
      actions.push({
        id: generateUUID(),
        type: 'move',
        actorId: currentParticipant.id,
        actionPointCost: 1,
      });
    }

    // Flee action
    if (currentParticipant.actionPoints >= 2) {
      actions.push({
        id: generateUUID(),
        type: 'flee',
        actorId: currentParticipant.id,
        actionPointCost: 2,
      });
    }

    // Wait action (always available)
    actions.push({
      id: generateUUID(),
      type: 'wait',
      actorId: currentParticipant.id,
      actionPointCost: 0,
    });

    return actions;
  }, [getCurrentParticipant]);

  const getValidTargets = useCallback((action: CombatAction): CombatParticipant[] => {
    if (!combatState) return [];

    const actor = combatState.participants.find(p => p.id === action.actorId);
    if (!actor) return [];

    switch (action.type) {
      case 'attack':
        return combatState.participants.filter(p => 
          p.type !== actor.type && p.health > 0 && p.id !== actor.id
        );

      case 'skill':
        if (action.skillId) {
          const skill = actor.availableSkills.find(s => s.id === action.skillId);
          if (skill) {
            switch (skill.targetType) {
              case 'self':
                return [actor];
              case 'single_ally':
                return combatState.participants.filter(p => 
                  p.type === actor.type && p.health > 0
                );
              case 'single_enemy':
                return combatState.participants.filter(p => 
                  p.type !== actor.type && p.health > 0
                );
              case 'any':
                return combatState.participants.filter(p => p.health > 0);
              default:
                return [];
            }
          }
        }
        return [];

      case 'item':
        if (action.itemId) {
          const item = actor.availableItems.find(i => i.id === action.itemId);
          if (item) {
            switch (item.targetType) {
              case 'self':
                return [actor];
              case 'single_ally':
                return combatState.participants.filter(p => 
                  p.type === actor.type && p.health > 0
                );
              case 'single_enemy':
                return combatState.participants.filter(p => 
                  p.type !== actor.type && p.health > 0
                );
              default:
                return [];
            }
          }
        }
        return [];

      default:
        return [];
    }
  }, [combatState]);

  const endCombat = useCallback(() => {
    setCombatState(null);
    setLastActionResult(null);
    setCombatEndResult(null);
    setIsProcessingAction(false);
  }, []);

  // === COMPUTED STATE ===

  const isPlayerTurn = combatState?.phase === 'player_turn';
  const availableActions = getAvailableActions();

  const systemState: CombatSystemState = {
    combatState,
    isPlayerTurn,
    availableActions,
    isProcessingAction,
    lastActionResult,
    combatEndResult,
  };

  return {
    // State
    ...systemState,
    
    // Actions
    initiateCombat,
    executeAction,
    endCombat,
    
    // Helpers
    getCurrentParticipant,
    getPlayerParticipant,
    getEnemyParticipants,
    getAllyParticipants,
    getValidTargets,
  };
}
