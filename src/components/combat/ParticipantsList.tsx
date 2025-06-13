/**
 * Participants List Component
 * 
 * Displays all combat participants with:
 * - Health and mana bars with visual indicators
 * - Status effects and their durations
 * - Turn order and current turn highlighting
 * - Target selection for player actions
 * - Action points and resource tracking
 */

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  UserIcon,
  BotIcon,
  UsersIcon,
  HeartIcon,
  ZapIcon,
  ShieldIcon,
  SwordIcon,
  ClockIcon,
  TargetIcon,
  AlertTriangleIcon
} from 'lucide-react';

import type { CombatParticipant } from '@/types/combat';

interface ParticipantsListProps {
  participants: CombatParticipant[];
  currentTurnId: string;
  selectedTargetId: string | null;
  validTargetIds: string[];
  onTargetSelect?: (targetId: string | null) => void;
}

export default function ParticipantsList({
  participants,
  currentTurnId,
  selectedTargetId,
  validTargetIds,
  onTargetSelect,
}: ParticipantsListProps) {
  const getParticipantIcon = (type: CombatParticipant['type']) => {
    switch (type) {
      case 'player':
        return UserIcon;
      case 'ally':
        return UsersIcon;
      case 'enemy':
        return BotIcon;
      default:
        return UserIcon;
    }
  };

  const getParticipantColor = (type: CombatParticipant['type']) => {
    switch (type) {
      case 'player':
        return 'border-blue-500 bg-blue-50';
      case 'ally':
        return 'border-green-500 bg-green-50';
      case 'enemy':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getHealthColor = (healthPercentage: number) => {
    if (healthPercentage > 60) return 'bg-green-500';
    if (healthPercentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getManaColor = () => 'bg-blue-500';

  const renderStatusEffects = (participant: CombatParticipant) => {
    if (participant.statusEffects.length === 0) return null;

    return (
      <div className="mt-2">
        <div className="flex items-center gap-1 mb-1">
          <AlertTriangleIcon className="w-3 h-3 text-gray-500" />
          <span className="text-xs font-medium text-gray-600">Effects:</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {participant.statusEffects.slice(0, 3).map((effect) => (
            <Badge
              key={effect.id}
              variant={effect.type === 'buff' ? 'default' : effect.type === 'debuff' ? 'destructive' : 'secondary'}
              className="text-xs px-1 py-0"
            >
              {effect.name}
              {effect.duration > 0 && ` (${effect.duration})`}
              {effect.stacks > 1 && ` x${effect.stacks}`}
            </Badge>
          ))}
          {participant.statusEffects.length > 3 && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              +{participant.statusEffects.length - 3} more
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const renderParticipant = (participant: CombatParticipant) => {
    const Icon = getParticipantIcon(participant.type);
    const isCurrentTurn = participant.id === currentTurnId;
    const isValidTarget = validTargetIds.includes(participant.id);
    const isSelectedTarget = selectedTargetId === participant.id;
    const isDead = participant.health <= 0;
    
    const healthPercentage = (participant.health / participant.maxHealth) * 100;
    const manaPercentage = participant.mana !== undefined && participant.maxMana !== undefined
      ? (participant.mana / participant.maxMana) * 100
      : null;
    const actionPointsPercentage = (participant.actionPoints / participant.maxActionPoints) * 100;

    const cardClasses = [
      'relative transition-all duration-200',
      getParticipantColor(participant.type),
      isCurrentTurn ? 'ring-2 ring-yellow-400 shadow-lg' : '',
      isValidTarget ? 'cursor-pointer hover:shadow-md' : '',
      isSelectedTarget ? 'ring-2 ring-blue-400' : '',
      isDead ? 'opacity-50 grayscale' : '',
    ].filter(Boolean).join(' ');

    const handleClick = () => {
      if (isValidTarget && onTargetSelect) {
        onTargetSelect(isSelectedTarget ? null : participant.id);
      }
    };

    return (
      <Card
        key={participant.id}
        className={cardClasses}
        onClick={handleClick}
      >
        <CardContent className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              <span className="font-medium text-sm">{participant.name}</span>
              {isDead && (
                <Badge variant="destructive" className="text-xs">
                  Defeated
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {isCurrentTurn && (
                <Badge variant="default" className="text-xs">
                  <ClockIcon className="w-3 h-3 mr-1" />
                  Turn
                </Badge>
              )}
              {isValidTarget && (
                <TargetIcon className="w-3 h-3 text-gray-500" />
              )}
            </div>
          </div>

          {/* Health Bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <HeartIcon className="w-3 h-3 text-red-500" />
                <span className="text-xs font-medium">Health</span>
              </div>
              <span className="text-xs text-gray-600">
                {participant.health}/{participant.maxHealth}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${getHealthColor(healthPercentage)}`}
                style={{ width: `${healthPercentage}%` }}
              />
            </div>
          </div>

          {/* Mana Bar (if applicable) */}
          {participant.mana !== undefined && participant.maxMana !== undefined && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <ZapIcon className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium">Mana</span>
                </div>
                <span className="text-xs text-gray-600">
                  {participant.mana}/{participant.maxMana}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getManaColor()}`}
                  style={{ width: `${manaPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Points */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3 text-orange-500" />
                <span className="text-xs font-medium">Action Points</span>
              </div>
              <span className="text-xs text-gray-600">
                {participant.actionPoints}/{participant.maxActionPoints}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full transition-all bg-orange-500"
                style={{ width: `${actionPointsPercentage}%` }}
              />
            </div>
          </div>

          {/* Combat Stats */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="flex items-center gap-1">
              <SwordIcon className="w-3 h-3 text-red-600" />
              <span className="text-xs">ATK: {participant.attack}</span>
            </div>
            <div className="flex items-center gap-1">
              <ShieldIcon className="w-3 h-3 text-blue-600" />
              <span className="text-xs">DEF: {participant.defense}</span>
            </div>
            <div className="text-xs text-gray-600">
              SPD: {participant.speed}
            </div>
            <div className="text-xs text-gray-600">
              ACC: {participant.accuracy}%
            </div>
          </div>

          {/* Equipment */}
          {(participant.equippedWeapon || participant.equippedArmor) && (
            <div className="mb-2">
              <div className="text-xs font-medium text-gray-600 mb-1">Equipment:</div>
              <div className="space-y-1">
                {participant.equippedWeapon && (
                  <div className="text-xs text-gray-600">
                    Weapon: {participant.equippedWeapon.name}
                  </div>
                )}
                {participant.equippedArmor && (
                  <div className="text-xs text-gray-600">
                    Armor: {participant.equippedArmor.name}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Effects */}
          {renderStatusEffects(participant)}

          {/* Position (if applicable) */}
          {participant.position && (
            <div className="mt-2 text-xs text-gray-600">
              Position: {participant.position.zone || `(${participant.position.x}, ${participant.position.y})`}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Group participants by type for better organization
  const playerParticipants = participants.filter(p => p.type === 'player');
  const allyParticipants = participants.filter(p => p.type === 'ally');
  const enemyParticipants = participants.filter(p => p.type === 'enemy');

  return (
    <div className="space-y-4">
      {/* Player */}
      {playerParticipants.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-blue-500" />
            Player
          </h4>
          <div className="space-y-2">
            {playerParticipants.map(renderParticipant)}
          </div>
        </div>
      )}

      {/* Allies */}
      {allyParticipants.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-green-500" />
            Allies
          </h4>
          <div className="space-y-2">
            {allyParticipants.map(renderParticipant)}
          </div>
        </div>
      )}

      {/* Enemies */}
      {enemyParticipants.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <BotIcon className="w-4 h-4 text-red-500" />
            Enemies
          </h4>
          <div className="space-y-2">
            {enemyParticipants.map(renderParticipant)}
          </div>
        </div>
      )}
    </div>
  );
}
