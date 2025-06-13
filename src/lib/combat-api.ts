/**
 * Combat API Client
 * 
 * Client-side functions for interacting with combat-related API endpoints.
 * This keeps the server-side AI dependencies separate from the client.
 */

import type { CharacterProfile, StructuredStoryState } from '@/types/story';
import type { CombatParticipant } from '@/types/combat';

export interface CombatGenerationRequest {
  storyContext: string;
  playerCharacter: CharacterProfile;
  currentLocation: string;
  storyState: StructuredStoryState;
  combatTrigger: 'story_event' | 'player_action' | 'random_encounter' | 'boss_fight';
  difficultyLevel: 'easy' | 'medium' | 'hard' | 'extreme';
  usePremiumAI: boolean;
  specialRequirements?: {
    maxEnemies?: number;
    environmentType?: string;
    mustIncludeNPCs?: string[];
    forbiddenActions?: string[];
    timeLimit?: number;
  };
}

export interface CombatGenerationResponse {
  enemies: CombatParticipant[];
  allies: CombatParticipant[];
  environment: {
    id: string;
    name: string;
    description: string;
    effects: Array<{
      id: string;
      name: string;
      description: string;
      type: 'damage' | 'healing' | 'movement' | 'visibility' | 'special';
      value: number;
      affectedZones?: ('front' | 'middle' | 'back')[];
      duration: number;
    }>;
    terrain: 'open' | 'forest' | 'urban' | 'dungeon' | 'water' | 'mountain' | 'desert' | 'magical';
    visibility: 'clear' | 'dim' | 'dark' | 'obscured';
    size: 'cramped' | 'normal' | 'spacious' | 'vast';
  };
  victoryConditions: Array<{
    type: 'defeat_all_enemies' | 'survive_turns' | 'reach_position' | 'protect_target' | 'custom';
    description: string;
    parameters?: any;
    completed: boolean;
  }>;
  defeatConditions: Array<{
    type: 'player_death' | 'ally_death' | 'time_limit' | 'objective_failed' | 'custom';
    description: string;
    parameters?: any;
    triggered: boolean;
  }>;
  combatDescription: string;
  tacticalConsiderations: string[];
  specialMechanics?: Array<{
    name: string;
    description: string;
    rules: string[];
  }>;
}

export async function generateCombatScenario(request: CombatGenerationRequest): Promise<CombatGenerationResponse> {
  const response = await fetch('/api/combat/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json();
    
    // If there's a fallback scenario, use it
    if (errorData.fallback) {
      console.warn('Using fallback combat scenario due to generation error:', errorData.error);
      return errorData.fallback;
    }
    
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export function createPlayerCombatParticipant(character: CharacterProfile): CombatParticipant {
  return {
    id: 'player',
    name: character.name,
    type: 'player',
    health: character.health,
    maxHealth: character.maxHealth,
    mana: character.mana,
    maxMana: character.maxMana,
    attack: character.attack,
    defense: character.defense,
    speed: character.speed || 10,
    accuracy: character.accuracy || 85,
    evasion: character.evasion || 10,
    criticalChance: character.criticalChance || 5,
    criticalMultiplier: character.criticalMultiplier || 1.5,
    actionPoints: 3,
    maxActionPoints: 3,
    initiative: character.speed || 10,
    statusEffects: [],
    availableSkills: character.skills?.map(skill => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      type: 'special' as const,
      actionPointCost: 2,
      cooldown: 3,
      currentCooldown: 0,
      targetType: 'single_enemy' as const,
      range: 1,
      effects: [{
        type: 'damage' as const,
        value: skill.level * 10,
        chance: 90,
        damageType: 'physical' as const,
      }],
    })) || [],
    availableItems: [],
  };
}
