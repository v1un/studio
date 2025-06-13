/**
 * Action Panel Component
 * 
 * Interactive panel for selecting and executing combat actions.
 * Provides tactical decision-making interface with:
 * - Action type selection (attack, defend, skills, items)
 * - Target selection for targeted actions
 * - Action point and resource cost display
 * - Execution confirmation and feedback
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  SwordIcon,
  ShieldIcon,
  ZapIcon,
  PackageIcon,
  MoveIcon,
  ArrowRightIcon,
  ClockIcon,
  HeartIcon,
  SparklesIcon,
  TargetIcon
} from 'lucide-react';

import type {
  CombatAction,
  CombatParticipant
} from '@/types/combat';

interface ActionPanelProps {
  availableActions: CombatAction[];
  selectedAction: CombatAction | null;
  selectedTarget: string | null;
  validTargets: CombatParticipant[];
  isProcessingAction: boolean;
  onActionSelect: (action: CombatAction) => void;
  onTargetSelect: (targetId: string | null) => void;
  onExecute: () => void;
}

const ACTION_ICONS = {
  attack: SwordIcon,
  defend: ShieldIcon,
  skill: ZapIcon,
  item: PackageIcon,
  move: MoveIcon,
  flee: ArrowRightIcon,
  wait: ClockIcon,
};

const ACTION_COLORS = {
  attack: 'destructive',
  defend: 'secondary',
  skill: 'default',
  item: 'outline',
  move: 'secondary',
  flee: 'outline',
  wait: 'ghost',
} as const;

export default function ActionPanel({
  availableActions,
  selectedAction,
  selectedTarget,
  validTargets,
  isProcessingAction,
  onActionSelect,
  onTargetSelect,
  onExecute,
}: ActionPanelProps) {
  // Group actions by type for better organization
  const groupedActions = availableActions.reduce((groups, action) => {
    if (!groups[action.type]) {
      groups[action.type] = [];
    }
    groups[action.type].push(action);
    return groups;
  }, {} as Record<string, CombatAction[]>);

  const needsTarget = selectedAction && ['attack', 'skill', 'item'].includes(selectedAction.type);
  const canExecute = selectedAction && (!needsTarget || selectedTarget) && !isProcessingAction;

  const getActionLabel = (action: CombatAction): string => {
    switch (action.type) {
      case 'attack':
        return 'Attack';
      case 'defend':
        return 'Defend';
      case 'skill':
        // Would need to look up skill name from action.skillId
        return `Skill (${action.skillId?.slice(0, 8) || 'Unknown'})`;
      case 'item':
        // Would need to look up item name from action.itemId
        return `Use Item (${action.itemId?.slice(0, 8) || 'Unknown'})`;
      case 'move':
        return 'Move';
      case 'flee':
        return 'Flee';
      case 'wait':
        return 'Wait';
      default:
        return 'Unknown Action';
    }
  };

  const getActionDescription = (action: CombatAction): string => {
    switch (action.type) {
      case 'attack':
        return 'Basic attack with equipped weapon';
      case 'defend':
        return 'Take defensive stance, reducing damage taken';
      case 'skill':
        return 'Use a special ability or spell';
      case 'item':
        return 'Consume or use an item from inventory';
      case 'move':
        return 'Change position on the battlefield';
      case 'flee':
        return 'Attempt to escape from combat';
      case 'wait':
        return 'Skip turn and recover slightly';
      default:
        return 'Unknown action';
    }
  };

  const renderActionGroup = (type: string, actions: CombatAction[]) => {
    const Icon = ACTION_ICONS[type as keyof typeof ACTION_ICONS] || ZapIcon;
    
    return (
      <div key={type} className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2 capitalize">
          <Icon className="w-4 h-4" />
          {type === 'skill' ? 'Skills' : type === 'item' ? 'Items' : `${type}s`}
        </h4>
        
        <div className="grid grid-cols-1 gap-2">
          {actions.map((action) => {
            const isSelected = selectedAction?.id === action.id;
            const Icon = ACTION_ICONS[action.type as keyof typeof ACTION_ICONS] || ZapIcon;
            
            return (
              <Button
                key={action.id}
                variant={isSelected ? 'default' : ACTION_COLORS[action.type as keyof typeof ACTION_COLORS]}
                size="sm"
                className="justify-start h-auto p-3"
                onClick={() => onActionSelect(action)}
                disabled={isProcessingAction}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium">{getActionLabel(action)}</div>
                      <div className="text-xs opacity-75">{getActionDescription(action)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {action.actionPointCost > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {action.actionPointCost} AP
                      </Badge>
                    )}
                    {action.manaCost && action.manaCost > 0 && (
                      <Badge variant="outline" className="text-xs text-blue-600">
                        {action.manaCost} MP
                      </Badge>
                    )}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Action Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(groupedActions).map(([type, actions]) =>
            renderActionGroup(type, actions)
          )}
          
          {availableActions.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <ClockIcon className="w-8 h-8 mx-auto mb-2" />
              <p>No actions available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Target Selection */}
      {needsTarget && validTargets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TargetIcon className="w-4 h-4" />
              Select Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {validTargets.map((target) => {
                const isSelected = selectedTarget === target.id;
                const healthPercentage = (target.health / target.maxHealth) * 100;
                
                return (
                  <Button
                    key={target.id}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start h-auto p-3"
                    onClick={() => onTargetSelect(target.id)}
                    disabled={isProcessingAction}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          target.type === 'player' ? 'bg-blue-500' :
                          target.type === 'ally' ? 'bg-green-500' :
                          'bg-red-500'
                        }`} />
                        
                        <div className="text-left">
                          <div className="font-medium">{target.name}</div>
                          <div className="text-xs opacity-75">
                            {target.health}/{target.maxHealth} HP
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              healthPercentage > 60 ? 'bg-green-500' :
                              healthPercentage > 30 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${healthPercentage}%` }}
                          />
                        </div>
                        
                        {target.statusEffects.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {target.statusEffects.length} effects
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Summary and Execute */}
      {selectedAction && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Confirm Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="font-medium">{getActionLabel(selectedAction)}</div>
              <div className="text-sm text-gray-600 mt-1">
                {getActionDescription(selectedAction)}
              </div>
              
              {selectedTarget && (
                <div className="text-sm mt-2">
                  <span className="font-medium">Target: </span>
                  {validTargets.find(t => t.id === selectedTarget)?.name || 'Unknown'}
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-2">
                {selectedAction.actionPointCost > 0 && (
                  <Badge variant="outline">
                    Cost: {selectedAction.actionPointCost} AP
                  </Badge>
                )}
                {selectedAction.manaCost && selectedAction.manaCost > 0 && (
                  <Badge variant="outline" className="text-blue-600">
                    Cost: {selectedAction.manaCost} MP
                  </Badge>
                )}
              </div>
            </div>
            
            <Button
              onClick={onExecute}
              disabled={!canExecute}
              className="w-full"
              size="lg"
            >
              {isProcessingAction ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                'Execute Action'
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
