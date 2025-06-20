/**
 * Combat Generation AI Flow
 * 
 * AI-powered combat scenario generation that creates:
 * - Dynamic enemy participants with balanced stats
 * - Environmental combat conditions
 * - Victory/defeat conditions based on story context
 * - Tactical considerations and special mechanics
 */

import { ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME } from '@/ai/genkit';
import { z } from 'zod';
import type {
  CombatParticipant,
  CombatEnvironment,
  VictoryCondition,
  DefeatCondition,
  CombatWeapon,
  CombatArmor,
  CombatSkill,
  CombatItem
} from '@/types/combat';
import type { StructuredStoryState, CharacterProfile } from '@/types/story';
import { generateUUID } from '@/lib/utils';
import { GameBalanceSystem } from '@/lib/balance-system-integration';

// === INPUT/OUTPUT SCHEMAS ===

export interface CombatGenerationInput {
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

export interface CombatGenerationOutput {
  enemies: CombatParticipant[];
  allies: CombatParticipant[];
  environment: CombatEnvironment;
  victoryConditions: VictoryCondition[];
  defeatConditions: DefeatCondition[];
  combatDescription: string;
  tacticalConsiderations: string[];
  specialMechanics?: {
    name: string;
    description: string;
    rules: string[];
  }[];
}

// === ZOD SCHEMAS ===

const CombatWeaponSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['melee', 'ranged', 'magic']),
  damage: z.number(),
  accuracy: z.number(),
  criticalChance: z.number(),
  range: z.number(),
  actionPointCost: z.number(),
  specialEffects: z.array(z.object({
    type: z.enum(['status_inflict', 'damage_bonus', 'special_attack']),
    trigger: z.enum(['on_hit', 'on_critical', 'on_kill']),
    chance: z.number(),
    value: z.any(),
  })).default([]),
});

const CombatArmorSchema = z.object({
  id: z.string(),
  name: z.string(),
  defense: z.number(),
  resistance: z.record(z.number()).default({}),
  speedPenalty: z.number().default(0),
  specialEffects: z.array(z.object({
    type: z.enum(['damage_reduction', 'status_immunity', 'reflect_damage']),
    trigger: z.enum(['on_hit', 'passive', 'on_block']),
    value: z.any(),
  })).default([]),
});

const CombatSkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['attack', 'defense', 'support', 'movement', 'special']),
  actionPointCost: z.number(),
  manaCost: z.number().optional(),
  cooldown: z.number().default(0),
  currentCooldown: z.number().default(0),
  targetType: z.enum(['self', 'single_ally', 'single_enemy', 'all_allies', 'all_enemies', 'area', 'any']),
  range: z.number(),
  effects: z.array(z.object({
    type: z.enum(['damage', 'healing', 'status_apply', 'status_remove', 'movement', 'special']),
    value: z.union([z.number(), z.string()]),
    chance: z.number(),
    damageType: z.enum(['physical', 'magical', 'fire', 'ice', 'lightning', 'poison', 'holy', 'dark', 'true']).optional(),
    statusEffectId: z.string().optional(),
  })),
});

const CombatParticipantSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['player', 'ally', 'enemy', 'neutral']),
  health: z.number(),
  maxHealth: z.number(),
  mana: z.number().optional(),
  maxMana: z.number().optional(),
  attack: z.number(),
  defense: z.number(),
  speed: z.number(),
  accuracy: z.number(),
  evasion: z.number(),
  criticalChance: z.number(),
  criticalMultiplier: z.number(),
  actionPoints: z.number(),
  maxActionPoints: z.number(),
  initiative: z.number(),
  statusEffects: z.array(z.any()).default([]),
  position: z.object({
    x: z.number(),
    y: z.number(),
    zone: z.enum(['front', 'middle', 'back']).optional(),
  }).optional(),
  equippedWeapon: CombatWeaponSchema.optional(),
  equippedArmor: CombatArmorSchema.optional(),
  availableSkills: z.array(CombatSkillSchema).default([]),
  availableItems: z.array(z.any()).default([]),
  aiProfile: z.object({
    behavior: z.enum(['aggressive', 'defensive', 'balanced', 'support', 'tactical']),
    priority: z.enum(['damage', 'survival', 'support_allies', 'control', 'objective']),
    riskTolerance: z.enum(['low', 'medium', 'high']),
    preferredRange: z.enum(['melee', 'ranged', 'any']),
    specialTactics: z.array(z.string()).default([]),
  }).optional(),
});

const CombatEnvironmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  effects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    type: z.enum(['damage', 'healing', 'movement', 'visibility', 'special']),
    value: z.number(),
    affectedZones: z.array(z.enum(['front', 'middle', 'back'])).optional(),
    duration: z.number(),
  })).default([]),
  terrain: z.enum(['open', 'forest', 'urban', 'dungeon', 'water', 'mountain', 'desert', 'magical']),
  visibility: z.enum(['clear', 'dim', 'dark', 'obscured']),
  size: z.enum(['cramped', 'normal', 'spacious', 'vast']),
});

const VictoryConditionSchema = z.object({
  type: z.enum(['defeat_all_enemies', 'survive_turns', 'reach_position', 'protect_target', 'custom']),
  description: z.string(),
  parameters: z.any().optional(),
  completed: z.boolean().default(false),
});

const DefeatConditionSchema = z.object({
  type: z.enum(['player_death', 'ally_death', 'time_limit', 'objective_failed', 'custom']),
  description: z.string(),
  parameters: z.any().optional(),
  triggered: z.boolean().default(false),
});

const CombatGenerationOutputSchema = z.object({
  enemies: z.array(CombatParticipantSchema),
  allies: z.array(CombatParticipantSchema).default([]),
  environment: CombatEnvironmentSchema,
  victoryConditions: z.array(VictoryConditionSchema),
  defeatConditions: z.array(DefeatConditionSchema),
  combatDescription: z.string(),
  tacticalConsiderations: z.array(z.string()),
  specialMechanics: z.array(z.object({
    name: z.string(),
    description: z.string(),
    rules: z.array(z.string()),
  })).optional(),
});

// === AI PROMPTS ===

const combatGenerationPrompt = ai.definePrompt(
  {
    name: 'combatGenerationPrompt',
    inputSchema: z.object({
      storyContext: z.string(),
      playerCharacter: z.any(),
      currentLocation: z.string(),
      storyState: z.any(),
      combatTrigger: z.string(),
      difficultyLevel: z.string(),
      specialRequirements: z.any().optional(),
    }),
    outputSchema: CombatGenerationOutputSchema,
  },
  async (input) => {
    // Initialize balance system if story state has balance settings
    let balanceSystem: GameBalanceSystem | null = null;
    if (input.storyState && input.storyState.gameBalance && input.storyState.playerPerformance) {
      balanceSystem = new GameBalanceSystem(
        input.storyState.gameBalance,
        input.storyState.playerPerformance
      );
    }

    const difficultyMultipliers = {
      easy: 0.7,
      medium: 1.0,
      hard: 1.3,
      extreme: 1.6,
    };

    const multiplier = difficultyMultipliers[input.difficultyLevel as keyof typeof difficultyMultipliers] || 1.0;
    const playerLevel = input.playerCharacter.level || 1;
    let baseStats = {
      health: Math.floor(50 + (playerLevel * 10) * multiplier),
      attack: Math.floor(10 + (playerLevel * 2) * multiplier),
      defense: Math.floor(8 + (playerLevel * 1.5) * multiplier),
      speed: Math.floor(12 + (playerLevel * 1.2) * multiplier),
    };

    // Apply balance system adjustments if available
    if (balanceSystem) {
      const playerCondition = input.playerCharacter.health && input.playerCharacter.maxHealth
        ? input.playerCharacter.health / input.playerCharacter.maxHealth > 0.8 ? 'excellent'
        : input.playerCharacter.health / input.playerCharacter.maxHealth > 0.6 ? 'good'
        : input.playerCharacter.health / input.playerCharacter.maxHealth > 0.3 ? 'poor'
        : 'critical'
        : 'good';

      baseStats = balanceSystem.balanceCombatEncounter(baseStats, {
        playerLevel,
        location: input.currentLocation,
        questImportance: input.combatTrigger === 'boss_fight' ? 'critical' : 'major',
        playerCondition,
      });
    }

    return {
      text: `Generate a combat encounter for the following scenario:

**Story Context:** ${input.storyContext}

**Player Character:** ${input.playerCharacter.name} (Level ${playerLevel})
- Health: ${input.playerCharacter.health}/${input.playerCharacter.maxHealth}
- Attack: ${input.playerCharacter.attack}
- Defense: ${input.playerCharacter.defense}
- Current Location: ${input.currentLocation}

**Combat Trigger:** ${input.combatTrigger}
**Difficulty Level:** ${input.difficultyLevel}
**Special Requirements:** ${JSON.stringify(input.specialRequirements || {})}

Create a balanced and engaging combat encounter that includes:

1. **Enemy Participants** (1-4 enemies based on difficulty):
   - Scale stats appropriately for player level and difficulty
   - Base enemy stats around: HP ${baseStats.health}, ATK ${baseStats.attack}, DEF ${baseStats.defense}, SPD ${baseStats.speed}
   - Give each enemy unique abilities and AI behavior patterns
   - Include appropriate weapons, armor, and skills
   - Consider the story context for enemy types and motivations

2. **Combat Environment:**
   - Match the current location and story context
   - Include environmental effects that add tactical depth
   - Consider terrain advantages/disadvantages
   - Add atmospheric details that enhance immersion

3. **Victory/Defeat Conditions:**
   - Primary: Defeat all enemies
   - Consider alternative victory conditions based on story context
   - Include meaningful defeat consequences that fit the narrative

4. **Tactical Considerations:**
   - Highlight key strategic elements players should consider
   - Mention environmental interactions
   - Suggest optimal positioning and resource management

5. **Special Mechanics** (if applicable):
   - Unique combat rules for this specific encounter
   - Environmental hazards or interactive elements
   - Time-based challenges or objectives

Ensure the encounter is:
- Balanced for the player's current power level
- Narratively consistent with the story context
- Tactically interesting with meaningful choices
- Appropriately challenging for the selected difficulty

Generate realistic combat statistics and ensure all participants have complete equipment and skill loadouts.`,
    };
  }
);

// === MAIN GENERATION FLOW ===

const combatGenerationFlow = ai.defineFlow(
  {
    name: 'combatGenerationFlow',
    inputSchema: z.object({
      storyContext: z.string(),
      playerCharacter: z.any(),
      currentLocation: z.string(),
      storyState: z.any(),
      combatTrigger: z.string(),
      difficultyLevel: z.string(),
      usePremiumAI: z.boolean(),
      specialRequirements: z.any().optional(),
    }),
    outputSchema: CombatGenerationOutputSchema,
  },
  async (input) => {
    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    
    console.log(`[${new Date().toISOString()}] combatGenerationFlow: START for ${input.combatTrigger} at ${input.currentLocation}`);
    
    try {
      const result = await combatGenerationPrompt({
        storyContext: input.storyContext,
        playerCharacter: input.playerCharacter,
        currentLocation: input.currentLocation,
        storyState: input.storyState,
        combatTrigger: input.combatTrigger,
        difficultyLevel: input.difficultyLevel,
        specialRequirements: input.specialRequirements,
      });
      
      console.log(`[${new Date().toISOString()}] combatGenerationFlow: SUCCESS - Generated ${result.output.enemies.length} enemies`);
      
      return result.output;
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] combatGenerationFlow: FAILED - ${error.message}`);
      throw new Error(`Combat generation failed: ${error.message}`);
    }
  }
);

// === EXPORTED FUNCTIONS ===

export async function generateCombatScenario(input: CombatGenerationInput): Promise<CombatGenerationOutput> {
  return combatGenerationFlow(input);
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
