/**
 * Combat Interface Component
 * 
 * Main interactive combat UI that provides:
 * - Real-time combat state display
 * - Player action selection and execution
 * - Turn management and progression
 * - Combat results and feedback
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  SwordsIcon,
  ShieldIcon,
  ZapIcon,
  HeartIcon,
  ClockIcon,
  UserIcon,
  BotIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from 'lucide-react';

import type {
  CombatState,
  CombatParticipant,
  CombatAction,
  CombatActionResult
} from '@/types/combat';
import { useCombatSystem } from '@/hooks/use-combat-system';
import ActionPanel from './ActionPanel';
import ParticipantsList from './ParticipantsList';
import StatusEffectsDisplay from './StatusEffectsDisplay';

interface CombatInterfaceProps {
  onCombatEnd?: (result: any) => void;
  onActionExecuted?: (result: CombatActionResult) => void;
  className?: string;
}

export default function CombatInterface({
  onCombatEnd,
  onActionExecuted,
  className = ''
}: CombatInterfaceProps) {
  const [selectedAction, setSelectedAction] = useState<CombatAction | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string>('');

  const {
    combatState,
    isPlayerTurn,
    availableActions,
    isProcessingAction,
    lastActionResult,
    combatEndResult,
    executeAction,
    getCurrentParticipant,
    getPlayerParticipant,
    getEnemyParticipants,
    getValidTargets,
  } = useCombatSystem({
    onCombatEnd,
    onActionExecuted,
    onTurnChange: (newTurnId, phase) => {
      setSelectedAction(null);
      setSelectedTarget(null);
      setActionFeedback('');
    },
  });

  // Handle action execution
  const handleExecuteAction = async () => {
    if (!selectedAction || !combatState) return;

    // Add target to action if required
    const actionToExecute = { ...selectedAction };
    if (selectedTarget) {
      actionToExecute.targetId = selectedTarget;
    }

    try {
      const result = await executeAction(actionToExecute);
      
      if (result.success) {
        setActionFeedback(result.actionResult?.description || 'Action executed successfully');
        setSelectedAction(null);
        setSelectedTarget(null);
      } else {
        setActionFeedback(result.error || 'Action failed');
      }
    } catch (error) {
      setActionFeedback('An error occurred while executing the action');
    }
  };

  // Clear feedback after a delay
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => setActionFeedback(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  if (!combatState) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No active combat</p>
        </CardContent>
      </Card>
    );
  }

  if (combatEndResult) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {combatEndResult.outcome === 'victory' ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-500" />
            )}
            Combat {combatEndResult.outcome === 'victory' ? 'Victory' : 'Defeat'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">{combatEndResult.reason}</p>
          
          {combatEndResult.rewards && combatEndResult.rewards.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Rewards:</h4>
              <ul className="space-y-1">
                {combatEndResult.rewards.map((reward, index) => (
                  <li key={index} className="text-sm">
                    {reward.description}: {reward.value}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {combatEndResult.consequences && combatEndResult.consequences.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Consequences:</h4>
              <ul className="space-y-1">
                {combatEndResult.consequences.map((consequence, index) => (
                  <li key={index} className="text-sm text-red-600">
                    {consequence.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const currentParticipant = getCurrentParticipant();
  const playerParticipant = getPlayerParticipant();
  const enemyParticipants = getEnemyParticipants();
  const validTargets = selectedAction ? getValidTargets(selectedAction) : [];

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SwordsIcon className="w-5 h-5" />
            Combat - Round {combatState.round}
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            <Badge variant={isPlayerTurn ? 'default' : 'secondary'}>
              {isPlayerTurn ? 'Your Turn' : `${currentParticipant?.name}'s Turn`}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Action Feedback */}
        {actionFeedback && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">{actionFeedback}</p>
          </div>
        )}

        {/* Combat Environment */}
        {combatState.environment && (
          <div className="p-3 bg-gray-50 rounded-md">
            <h4 className="font-semibold text-sm mb-1">{combatState.environment.name}</h4>
            <p className="text-xs text-gray-600">{combatState.environment.description}</p>
            {combatState.environment.effects.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium">Environmental Effects:</p>
                <ul className="text-xs text-gray-600 mt-1">
                  {combatState.environment.effects.map((effect, index) => (
                    <li key={index}>• {effect.description}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Participants Display */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Combat Participants
            </h3>
            
            <ParticipantsList
              participants={combatState.participants}
              currentTurnId={combatState.currentTurnId}
              selectedTargetId={selectedTarget}
              validTargetIds={validTargets.map(t => t.id)}
              onTargetSelect={setSelectedTarget}
            />
          </div>

          {/* Action Panel */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <ZapIcon className="w-4 h-4" />
              Actions
            </h3>
            
            {isPlayerTurn ? (
              <ActionPanel
                availableActions={availableActions}
                selectedAction={selectedAction}
                selectedTarget={selectedTarget}
                validTargets={validTargets}
                isProcessingAction={isProcessingAction}
                onActionSelect={setSelectedAction}
                onTargetSelect={setSelectedTarget}
                onExecute={handleExecuteAction}
              />
            ) : (
              <div className="p-4 bg-gray-50 rounded-md text-center">
                <BotIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Waiting for {currentParticipant?.name} to act...
                </p>
                {isProcessingAction && (
                  <div className="mt-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mx-auto"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status Effects */}
        {playerParticipant && playerParticipant.statusEffects.length > 0 && (
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <AlertTriangleIcon className="w-4 h-4" />
              Active Effects
            </h3>
            <StatusEffectsDisplay statusEffects={playerParticipant.statusEffects} />
          </div>
        )}

        {/* Combat Log */}
        {combatState.actionHistory.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Combat Log</h3>
            <ScrollArea className="h-32 border rounded-md p-3">
              <div className="space-y-2">
                {combatState.actionHistory.slice(-5).map((action, index) => (
                  <div key={action.id} className="text-sm">
                    <span className="text-gray-500">
                      Round {combatState.round - Math.floor((combatState.actionHistory.length - index - 1) / combatState.participants.length)}:
                    </span>
                    <span className="ml-2">{action.description}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
