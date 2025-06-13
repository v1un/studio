/**
 * Combat Status Effects System
 * 
 * Comprehensive status effects system with:
 * - Predefined status effects library
 * - Status effect creation and management
 * - Duration tracking and stacking rules
 * - Effect resolution and cleanup
 */

import type {
  StatusEffect,
  StatusEffectModifier,
  CombatParticipant,
  DamageType
} from '@/types/combat';
import { generateUUID } from '@/lib/utils';

// === PREDEFINED STATUS EFFECTS ===

export const STATUS_EFFECTS_LIBRARY = {
  // Damage over Time Effects
  POISON: {
    name: 'Poison',
    description: 'Takes poison damage each turn',
    type: 'debuff' as const,
    category: 'physical' as const,
    effects: [{ stat: 'health' as const, type: 'flat' as const, value: -5 }],
    duration: 3,
    maxStacks: 3,
    canDispel: true,
    tickTiming: 'start_turn' as const,
  },
  
  BURNING: {
    name: 'Burning',
    description: 'Takes fire damage each turn',
    type: 'debuff' as const,
    category: 'magical' as const,
    effects: [{ stat: 'health' as const, type: 'flat' as const, value: -8 }],
    duration: 2,
    maxStacks: 2,
    canDispel: true,
    tickTiming: 'start_turn' as const,
  },
  
  BLEEDING: {
    name: 'Bleeding',
    description: 'Loses health from wounds each turn',
    type: 'debuff' as const,
    category: 'physical' as const,
    effects: [{ stat: 'health' as const, type: 'flat' as const, value: -3 }],
    duration: 4,
    maxStacks: 5,
    canDispel: false,
    tickTiming: 'end_turn' as const,
  },
  
  // Healing over Time Effects
  REGENERATION: {
    name: 'Regeneration',
    description: 'Recovers health each turn',
    type: 'buff' as const,
    category: 'magical' as const,
    effects: [{ stat: 'health' as const, type: 'flat' as const, value: 10 }],
    duration: 5,
    maxStacks: 2,
    canDispel: false,
    tickTiming: 'start_turn' as const,
  },
  
  HEALING_AURA: {
    name: 'Healing Aura',
    description: 'Slowly recovers health',
    type: 'buff' as const,
    category: 'magical' as const,
    effects: [{ stat: 'health' as const, type: 'flat' as const, value: 5 }],
    duration: 3,
    maxStacks: 1,
    canDispel: true,
    tickTiming: 'end_turn' as const,
  },
  
  // Stat Modifiers
  BLESSED: {
    name: 'Blessed',
    description: 'Increased attack and accuracy',
    type: 'buff' as const,
    category: 'magical' as const,
    effects: [
      { stat: 'attack' as const, type: 'percentage' as const, value: 25 },
      { stat: 'accuracy' as const, type: 'flat' as const, value: 15 }
    ],
    duration: 4,
    maxStacks: 1,
    canDispel: true,
    tickTiming: 'immediate' as const,
  },
  
  CURSED: {
    name: 'Cursed',
    description: 'Reduced attack and accuracy',
    type: 'debuff' as const,
    category: 'magical' as const,
    effects: [
      { stat: 'attack' as const, type: 'percentage' as const, value: -20 },
      { stat: 'accuracy' as const, type: 'flat' as const, value: -10 }
    ],
    duration: 3,
    maxStacks: 1,
    canDispel: true,
    tickTiming: 'immediate' as const,
  },
  
  STRENGTHENED: {
    name: 'Strengthened',
    description: 'Increased physical damage',
    type: 'buff' as const,
    category: 'physical' as const,
    effects: [{ stat: 'attack' as const, type: 'flat' as const, value: 10 }],
    duration: 3,
    maxStacks: 3,
    canDispel: false,
    tickTiming: 'immediate' as const,
  },
  
  WEAKENED: {
    name: 'Weakened',
    description: 'Reduced physical damage',
    type: 'debuff' as const,
    category: 'physical' as const,
    effects: [{ stat: 'attack' as const, type: 'percentage' as const, value: -30 }],
    duration: 2,
    maxStacks: 1,
    canDispel: true,
    tickTiming: 'immediate' as const,
  },
  
  // Defensive Effects
  SHIELDED: {
    name: 'Shielded',
    description: 'Increased defense against attacks',
    type: 'buff' as const,
    category: 'magical' as const,
    effects: [{ stat: 'defense' as const, type: 'percentage' as const, value: 40 }],
    duration: 3,
    maxStacks: 1,
    canDispel: true,
    tickTiming: 'immediate' as const,
  },
  
  VULNERABLE: {
    name: 'Vulnerable',
    description: 'Takes increased damage',
    type: 'debuff' as const,
    category: 'magical' as const,
    effects: [{ stat: 'defense' as const, type: 'percentage' as const, value: -25 }],
    duration: 2,
    maxStacks: 2,
    canDispel: true,
    tickTiming: 'immediate' as const,
  },
  
  // Speed and Movement Effects
  HASTED: {
    name: 'Hasted',
    description: 'Increased speed and evasion',
    type: 'buff' as const,
    category: 'magical' as const,
    effects: [
      { stat: 'speed' as const, type: 'percentage' as const, value: 50 },
      { stat: 'evasion' as const, type: 'flat' as const, value: 20 }
    ],
    duration: 3,
    maxStacks: 1,
    canDispel: true,
    tickTiming: 'immediate' as const,
  },
  
  SLOWED: {
    name: 'Slowed',
    description: 'Reduced speed and evasion',
    type: 'debuff' as const,
    category: 'magical' as const,
    effects: [
      { stat: 'speed' as const, type: 'percentage' as const, value: -40 },
      { stat: 'evasion' as const, type: 'flat' as const, value: -15 }
    ],
    duration: 2,
    maxStacks: 1,
    canDispel: true,
    tickTiming: 'immediate' as const,
  },
  
  PARALYZED: {
    name: 'Paralyzed',
    description: 'Cannot move or act',
    type: 'debuff' as const,
    category: 'physical' as const,
    effects: [
      { stat: 'speed' as const, type: 'percentage' as const, value: -100 },
      { stat: 'evasion' as const, type: 'percentage' as const, value: -100 }
    ],
    duration: 1,
    maxStacks: 1,
    canDispel: true,
    tickTiming: 'immediate' as const,
  },
  
  // Critical Hit Effects
  FOCUSED: {
    name: 'Focused',
    description: 'Increased critical hit chance',
    type: 'buff' as const,
    category: 'mental' as const,
    effects: [{ stat: 'critical' as const, type: 'flat' as const, value: 25 }],
    duration: 3,
    maxStacks: 2,
    canDispel: false,
    tickTiming: 'immediate' as const,
  },
  
  CONFUSED: {
    name: 'Confused',
    description: 'Reduced accuracy and critical chance',
    type: 'debuff' as const,
    category: 'mental' as const,
    effects: [
      { stat: 'accuracy' as const, type: 'flat' as const, value: -20 },
      { stat: 'critical' as const, type: 'flat' as const, value: -15 }
    ],
    duration: 2,
    maxStacks: 1,
    canDispel: true,
    tickTiming: 'immediate' as const,
  },
  
  // Resistance Effects
  FIRE_RESISTANCE: {
    name: 'Fire Resistance',
    description: 'Reduced fire damage taken',
    type: 'buff' as const,
    category: 'magical' as const,
    effects: [{ stat: 'resistance' as const, type: 'flat' as const, value: 10 }],
    duration: 5,
    maxStacks: 1,
    canDispel: false,
    tickTiming: 'immediate' as const,
  },
  
  MAGIC_RESISTANCE: {
    name: 'Magic Resistance',
    description: 'Reduced magical damage taken',
    type: 'buff' as const,
    category: 'magical' as const,
    effects: [{ stat: 'resistance' as const, type: 'flat' as const, value: 8 }],
    duration: 4,
    maxStacks: 2,
    canDispel: false,
    tickTiming: 'immediate' as const,
  },
} as const;

// === STATUS EFFECT CREATION ===

export function createStatusEffect(
  effectKey: keyof typeof STATUS_EFFECTS_LIBRARY,
  sourceId: string,
  overrides?: Partial<StatusEffect>
): StatusEffect {
  const template = STATUS_EFFECTS_LIBRARY[effectKey];
  
  return {
    id: generateUUID(),
    name: template.name,
    description: template.description,
    type: template.type,
    category: template.category,
    effects: [...template.effects],
    duration: template.duration,
    stacks: 1,
    maxStacks: template.maxStacks,
    source: sourceId,
    canDispel: template.canDispel,
    tickTiming: template.tickTiming,
    ...overrides,
  };
}

export function createCustomStatusEffect(
  name: string,
  description: string,
  effects: StatusEffectModifier[],
  duration: number,
  sourceId: string,
  options?: {
    type?: 'buff' | 'debuff' | 'neutral';
    category?: 'physical' | 'magical' | 'mental' | 'environmental' | 'special';
    maxStacks?: number;
    canDispel?: boolean;
    tickTiming?: 'start_turn' | 'end_turn' | 'immediate' | 'on_action';
  }
): StatusEffect {
  return {
    id: generateUUID(),
    name,
    description,
    type: options?.type || 'neutral',
    category: options?.category || 'special',
    effects,
    duration,
    stacks: 1,
    maxStacks: options?.maxStacks || 1,
    source: sourceId,
    canDispel: options?.canDispel ?? true,
    tickTiming: options?.tickTiming || 'immediate',
  };
}

// === STATUS EFFECT MANAGEMENT ===

export function getEffectiveStatValue(
  participant: CombatParticipant,
  stat: StatusEffectModifier['stat'],
  baseValue: number
): number {
  let flatModifier = 0;
  let percentageModifier = 0;
  let multiplier = 1;
  
  participant.statusEffects.forEach(effect => {
    effect.effects.forEach(modifier => {
      if (modifier.stat === stat) {
        const stackMultiplier = effect.stacks;
        
        switch (modifier.type) {
          case 'flat':
            flatModifier += modifier.value * stackMultiplier;
            break;
          case 'percentage':
            percentageModifier += modifier.value * stackMultiplier;
            break;
          case 'multiplier':
            multiplier *= Math.pow(modifier.value, stackMultiplier);
            break;
        }
      }
    });
  });
  
  // Apply modifiers in order: base + flat, then percentage, then multiplier
  const withFlat = baseValue + flatModifier;
  const withPercentage = withFlat * (1 + percentageModifier / 100);
  const final = withPercentage * multiplier;
  
  return Math.max(0, Math.floor(final));
}

export function hasStatusEffect(participant: CombatParticipant, effectName: string): boolean {
  return participant.statusEffects.some(effect => effect.name === effectName);
}

export function getStatusEffect(participant: CombatParticipant, effectName: string): StatusEffect | undefined {
  return participant.statusEffects.find(effect => effect.name === effectName);
}

export function removeStatusEffect(participant: CombatParticipant, effectId: string): boolean {
  const initialLength = participant.statusEffects.length;
  participant.statusEffects = participant.statusEffects.filter(effect => effect.id !== effectId);
  return participant.statusEffects.length < initialLength;
}

export function removeStatusEffectByName(participant: CombatParticipant, effectName: string): boolean {
  const initialLength = participant.statusEffects.length;
  participant.statusEffects = participant.statusEffects.filter(effect => effect.name !== effectName);
  return participant.statusEffects.length < initialLength;
}

export function clearDispellableEffects(participant: CombatParticipant, effectType?: 'buff' | 'debuff'): number {
  const initialLength = participant.statusEffects.length;
  
  participant.statusEffects = participant.statusEffects.filter(effect => {
    if (!effect.canDispel) return true;
    if (effectType && effect.type !== effectType) return true;
    return false;
  });
  
  return initialLength - participant.statusEffects.length;
}

export function getStatusEffectsByCategory(
  participant: CombatParticipant,
  category: StatusEffect['category']
): StatusEffect[] {
  return participant.statusEffects.filter(effect => effect.category === category);
}

export function getStatusEffectsByType(
  participant: CombatParticipant,
  type: StatusEffect['type']
): StatusEffect[] {
  return participant.statusEffects.filter(effect => effect.type === type);
}
