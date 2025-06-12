/**
 * Emotional State Display Component
 * 
 * Shows the character's current emotional state, stress levels, and mood modifiers
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Heart, Brain, Zap, AlertTriangle, Clock } from 'lucide-react';
import type { EmotionalState, TraumaticEvent, MoodModifier } from '@/types/story';

interface EmotionalStateDisplayProps {
  emotionalState: EmotionalState;
  className?: string;
}

const moodColors = {
  confident: 'bg-green-500',
  anxious: 'bg-yellow-500',
  angry: 'bg-red-500',
  melancholic: 'bg-blue-500',
  excited: 'bg-orange-500',
  fearful: 'bg-purple-500',
  content: 'bg-emerald-500',
  frustrated: 'bg-red-400',
  hopeful: 'bg-cyan-500',
  despairing: 'bg-gray-500',
};

const moodIcons = {
  confident: '😎',
  anxious: '😰',
  angry: '😠',
  melancholic: '😔',
  excited: '🤩',
  fearful: '😨',
  content: '😌',
  frustrated: '😤',
  hopeful: '🙂',
  despairing: '😞',
};

function getStressLevelColor(level: number): string {
  if (level <= 25) return 'text-green-600';
  if (level <= 50) return 'text-yellow-600';
  if (level <= 75) return 'text-orange-600';
  return 'text-red-600';
}

function getFatigueLevelColor(level: number): string {
  if (level <= 25) return 'text-green-600';
  if (level <= 50) return 'text-yellow-600';
  if (level <= 75) return 'text-orange-600';
  return 'text-red-600';
}

function getMentalHealthColor(score: number): string {
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  if (score >= 25) return 'text-orange-600';
  return 'text-red-600';
}

function TraumaDisplay({ trauma }: { trauma: TraumaticEvent }) {
  const severityColors = {
    minor: 'bg-yellow-100 text-yellow-800',
    moderate: 'bg-orange-100 text-orange-800',
    severe: 'bg-red-100 text-red-800',
    critical: 'bg-red-200 text-red-900',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium">{trauma.eventType.replace('_', ' ')}</span>
            <Badge className={severityColors[trauma.severity]}>{trauma.severity}</Badge>
            <div className="flex-1">
              <Progress value={trauma.recoveryProgress} className="h-2" />
            </div>
            <span className="text-xs text-gray-500">{trauma.recoveryProgress}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-semibold">{trauma.description}</p>
            <p className="text-sm text-gray-600 mt-1">Recovery: {trauma.recoveryProgress}%</p>
            {trauma.ongoingEffects.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium">Ongoing Effects:</p>
                <ul className="text-xs text-gray-600">
                  {trauma.ongoingEffects.map((effect, index) => (
                    <li key={index}>• {effect}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MoodModifierDisplay({ modifier }: { modifier: MoodModifier }) {
  const categoryColors = {
    environmental: 'bg-green-100 text-green-800',
    social: 'bg-blue-100 text-blue-800',
    physical: 'bg-red-100 text-red-800',
    psychological: 'bg-purple-100 text-purple-800',
    magical: 'bg-indigo-100 text-indigo-800',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
            <div className={`w-3 h-3 rounded-full ${modifier.modifier > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">{modifier.effect}</span>
            <Badge className={categoryColors[modifier.category]}>{modifier.category}</Badge>
            <span className={`text-sm font-bold ${modifier.modifier > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {modifier.modifier > 0 ? '+' : ''}{modifier.modifier}
            </span>
            {modifier.duration !== -1 && (
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">{modifier.duration}t</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-semibold">{modifier.effect}</p>
            <p className="text-sm text-gray-600">Source: {modifier.source}</p>
            <p className="text-sm text-gray-600">
              Duration: {modifier.duration === -1 ? 'Permanent' : `${modifier.duration} turns`}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function EmotionalStateDisplay({ emotionalState, className = '' }: EmotionalStateDisplayProps) {
  const moodColor = moodColors[emotionalState.primaryMood] || 'bg-gray-500';
  const moodIcon = moodIcons[emotionalState.primaryMood] || '😐';

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Brain className="w-5 h-5" />
          <span>Emotional State</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Mood */}
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full ${moodColor} flex items-center justify-center text-white text-lg`}>
            {moodIcon}
          </div>
          <div>
            <p className="font-semibold capitalize">{emotionalState.primaryMood.replace('_', ' ')}</p>
            <p className="text-sm text-gray-600">Current Mood</p>
          </div>
        </div>

        {/* Stress, Fatigue, Mental Health */}
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">Stress</span>
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={emotionalState.stressLevel} className="w-20 h-2" />
              <span className={`text-sm font-bold ${getStressLevelColor(emotionalState.stressLevel)}`}>
                {emotionalState.stressLevel}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">Fatigue</span>
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={emotionalState.fatigueLevel} className="w-20 h-2" />
              <span className={`text-sm font-bold ${getFatigueLevelColor(emotionalState.fatigueLevel)}`}>
                {emotionalState.fatigueLevel}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="w-4 h-4 text-pink-500" />
              <span className="text-sm font-medium">Mental Health</span>
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={emotionalState.mentalHealthScore} className="w-20 h-2" />
              <span className={`text-sm font-bold ${getMentalHealthColor(emotionalState.mentalHealthScore)}`}>
                {emotionalState.mentalHealthScore}%
              </span>
            </div>
          </div>
        </div>

        {/* Traumatic Events */}
        {emotionalState.traumaticEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>Traumatic Events</span>
            </h4>
            <div className="space-y-2">
              {emotionalState.traumaticEvents.slice(0, 3).map((trauma) => (
                <TraumaDisplay key={trauma.id} trauma={trauma} />
              ))}
              {emotionalState.traumaticEvents.length > 3 && (
                <p className="text-xs text-gray-500">
                  +{emotionalState.traumaticEvents.length - 3} more traumatic events
                </p>
              )}
            </div>
          </div>
        )}

        {/* Mood Modifiers */}
        {emotionalState.moodModifiers.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Active Mood Modifiers</h4>
            <div className="space-y-2">
              {emotionalState.moodModifiers.slice(0, 3).map((modifier) => (
                <MoodModifierDisplay key={modifier.id} modifier={modifier} />
              ))}
              {emotionalState.moodModifiers.length > 3 && (
                <p className="text-xs text-gray-500">
                  +{emotionalState.moodModifiers.length - 3} more modifiers
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
