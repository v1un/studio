/**
 * Status Effects Display Component
 * 
 * Comprehensive display for status effects with:
 * - Visual indicators for buff/debuff types
 * - Duration tracking and countdown
 * - Stacking information
 * - Detailed tooltips with effect descriptions
 * - Categorized grouping for better organization
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ShieldIcon,
  SwordIcon,
  ZapIcon,
  HeartIcon,
  BrainIcon,
  LeafIcon,
  SparklesIcon,
  AlertTriangleIcon,
  ClockIcon,
  LayersIcon
} from 'lucide-react';

import type { StatusEffect } from '@/types/combat';

interface StatusEffectsDisplayProps {
  statusEffects: StatusEffect[];
  showCategories?: boolean;
  compact?: boolean;
  maxVisible?: number;
}

const CATEGORY_ICONS = {
  physical: SwordIcon,
  magical: SparklesIcon,
  mental: BrainIcon,
  environmental: LeafIcon,
  special: ZapIcon,
};

const CATEGORY_COLORS = {
  physical: 'text-red-600',
  magical: 'text-purple-600',
  mental: 'text-blue-600',
  environmental: 'text-green-600',
  special: 'text-yellow-600',
};

const STAT_ICONS = {
  health: HeartIcon,
  mana: ZapIcon,
  attack: SwordIcon,
  defense: ShieldIcon,
  speed: TrendingUpIcon,
  accuracy: TrendingUpIcon,
  evasion: TrendingDownIcon,
  critical: SparklesIcon,
  resistance: ShieldIcon,
};

export default function StatusEffectsDisplay({
  statusEffects,
  showCategories = false,
  compact = false,
  maxVisible,
}: StatusEffectsDisplayProps) {
  if (statusEffects.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <AlertTriangleIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No active effects</p>
      </div>
    );
  }

  const visibleEffects = maxVisible ? statusEffects.slice(0, maxVisible) : statusEffects;
  const hiddenCount = maxVisible ? Math.max(0, statusEffects.length - maxVisible) : 0;

  const getEffectVariant = (effect: StatusEffect) => {
    switch (effect.type) {
      case 'buff':
        return 'default';
      case 'debuff':
        return 'destructive';
      case 'neutral':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getEffectIcon = (effect: StatusEffect) => {
    const CategoryIcon = CATEGORY_ICONS[effect.category];
    
    switch (effect.type) {
      case 'buff':
        return TrendingUpIcon;
      case 'debuff':
        return TrendingDownIcon;
      case 'neutral':
        return CategoryIcon;
      default:
        return AlertTriangleIcon;
    }
  };

  const getDurationColor = (duration: number, maxDuration: number = 5) => {
    if (duration === -1) return 'text-gray-500'; // Permanent
    const percentage = duration / maxDuration;
    if (percentage > 0.6) return 'text-green-600';
    if (percentage > 0.3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatEffectModifiers = (effect: StatusEffect): string => {
    return effect.effects.map(modifier => {
      const StatIcon = STAT_ICONS[modifier.stat] || AlertTriangleIcon;
      const sign = modifier.value >= 0 ? '+' : '';
      const value = modifier.type === 'percentage' ? `${sign}${modifier.value}%` : `${sign}${modifier.value}`;
      return `${modifier.stat.toUpperCase()}: ${value}`;
    }).join(', ');
  };

  const renderEffectTooltip = (effect: StatusEffect) => (
    <TooltipContent className="max-w-xs">
      <div className="space-y-2">
        <div className="font-semibold flex items-center gap-2">
          {React.createElement(getEffectIcon(effect), { className: "w-4 h-4" })}
          {effect.name}
        </div>
        
        <p className="text-sm">{effect.description}</p>
        
        {effect.effects.length > 0 && (
          <div className="text-sm">
            <div className="font-medium mb-1">Effects:</div>
            <ul className="space-y-1">
              {effect.effects.map((modifier, index) => {
                const StatIcon = STAT_ICONS[modifier.stat] || AlertTriangleIcon;
                const sign = modifier.value >= 0 ? '+' : '';
                const value = modifier.type === 'percentage' ? `${sign}${modifier.value}%` : `${sign}${modifier.value}`;
                
                return (
                  <li key={index} className="flex items-center gap-2">
                    <StatIcon className="w-3 h-3" />
                    <span>{modifier.stat}: {value}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-3 h-3" />
            <span>
              Duration: {effect.duration === -1 ? 'Permanent' : `${effect.duration} turns`}
            </span>
          </div>
          
          {effect.stacks > 1 && (
            <div className="flex items-center gap-2">
              <LayersIcon className="w-3 h-3" />
              <span>Stacks: {effect.stacks}/{effect.maxStacks}</span>
            </div>
          )}
          
          <div>Category: {effect.category}</div>
          <div>Source: {effect.source}</div>
          {effect.canDispel && <div className="text-blue-600">Can be dispelled</div>}
        </div>
      </div>
    </TooltipContent>
  );

  const renderEffect = (effect: StatusEffect, index: number) => {
    const Icon = getEffectIcon(effect);
    const variant = getEffectVariant(effect);
    
    if (compact) {
      return (
        <TooltipProvider key={effect.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant={variant} className="cursor-help">
                <Icon className="w-3 h-3 mr-1" />
                {effect.name}
                {effect.stacks > 1 && ` x${effect.stacks}`}
                {effect.duration > 0 && (
                  <span className={`ml-1 ${getDurationColor(effect.duration)}`}>
                    ({effect.duration})
                  </span>
                )}
              </Badge>
            </TooltipTrigger>
            {renderEffectTooltip(effect)}
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <TooltipProvider key={effect.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="cursor-help hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{effect.name}</span>
                    {effect.stacks > 1 && (
                      <Badge variant="outline" className="text-xs">
                        x{effect.stacks}
                      </Badge>
                    )}
                  </div>
                  
                  <Badge variant={variant} className="text-xs">
                    {effect.type}
                  </Badge>
                </div>
                
                <p className="text-xs text-gray-600 mb-2">{effect.description}</p>
                
                {effect.effects.length > 0 && (
                  <div className="text-xs text-gray-700 mb-2">
                    {formatEffectModifiers(effect)}
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3 text-gray-500" />
                    <span className={`text-xs ${getDurationColor(effect.duration)}`}>
                      {effect.duration === -1 ? 'Permanent' : `${effect.duration} turns`}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {React.createElement(CATEGORY_ICONS[effect.category], {
                      className: `w-3 h-3 ${CATEGORY_COLORS[effect.category]}`
                    })}
                    <span className="text-xs text-gray-500 capitalize">
                      {effect.category}
                    </span>
                  </div>
                </div>
                
                {effect.duration > 0 && effect.duration <= 5 && (
                  <div className="mt-2">
                    <Progress 
                      value={(effect.duration / 5) * 100} 
                      className="h-1"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TooltipTrigger>
          {renderEffectTooltip(effect)}
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (showCategories) {
    const categorizedEffects = statusEffects.reduce((groups, effect) => {
      if (!groups[effect.category]) {
        groups[effect.category] = [];
      }
      groups[effect.category].push(effect);
      return groups;
    }, {} as Record<string, StatusEffect[]>);

    return (
      <div className="space-y-4">
        {Object.entries(categorizedEffects).map(([category, effects]) => {
          const CategoryIcon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
          const categoryColor = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS];
          
          return (
            <div key={category}>
              <h4 className={`text-sm font-medium mb-2 flex items-center gap-2 ${categoryColor}`}>
                <CategoryIcon className="w-4 h-4" />
                {category.charAt(0).toUpperCase() + category.slice(1)} Effects
              </h4>
              <div className={compact ? "flex flex-wrap gap-2" : "grid grid-cols-1 gap-2"}>
                {effects.map(renderEffect)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={compact ? "flex flex-wrap gap-2" : "grid grid-cols-1 gap-2"}>
        {visibleEffects.map(renderEffect)}
      </div>
      
      {hiddenCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{hiddenCount} more effects
        </Badge>
      )}
    </div>
  );
}
