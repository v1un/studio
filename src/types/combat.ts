/**
 * Combat System Type Definitions
 * 
 * Comprehensive type definitions for the interactive combat system
 * including participants, actions, status effects, and combat state management.
 */

// === CORE COMBAT TYPES ===

export interface Position {
  x: number;
  y: number;
  zone?: 'front' | 'middle' | 'back';
}

export interface CombatEnvironment {
  id: string;
  name: string;
  description: string;
  effects: EnvironmentalEffect[];
  terrain: TerrainType;
  visibility: 'clear' | 'dim' | 'dark' | 'obscured';
  size: 'cramped' | 'normal' | 'spacious' | 'vast';
}

export interface EnvironmentalEffect {
  id: string;
  name: string;
  description: string;
  type: 'damage' | 'healing' | 'movement' | 'visibility' | 'special';
  value: number;
  affectedZones?: ('front' | 'middle' | 'back')[];
  duration: number; // -1 for permanent
}

export type TerrainType = 'open' | 'forest' | 'urban' | 'dungeon' | 'water' | 'mountain' | 'desert' | 'magical';

// === STATUS EFFECTS ===

export interface StatusEffect {
  id: string;
  name: string;
  description: string;
  type: 'buff' | 'debuff' | 'neutral';
  category: 'physical' | 'magical' | 'mental' | 'environmental' | 'special';
  effects: StatusEffectModifier[];
  duration: number; // turns remaining, -1 for permanent
  stacks: number;
  maxStacks: number;
  source: string; // who/what applied this effect
  canDispel: boolean;
  tickTiming: 'start_turn' | 'end_turn' | 'immediate' | 'on_action';
}

export interface StatusEffectModifier {
  stat: 'health' | 'mana' | 'attack' | 'defense' | 'speed' | 'accuracy' | 'evasion' | 'critical' | 'resistance';
  type: 'flat' | 'percentage' | 'multiplier';
  value: number;
}

// === COMBAT PARTICIPANTS ===

export interface CombatParticipant {
  id: string;
  name: string;
  type: 'player' | 'ally' | 'enemy' | 'neutral';
  
  // Core Stats
  health: number;
  maxHealth: number;
  mana?: number;
  maxMana?: number;
  
  // Combat Stats
  attack: number;
  defense: number;
  speed: number;
  accuracy: number;
  evasion: number;
  criticalChance: number;
  criticalMultiplier: number;
  
  // Action Economy
  actionPoints: number;
  maxActionPoints: number;
  initiative: number;
  
  // Status & Position
  statusEffects: StatusEffect[];
  position?: Position;
  
  // Equipment & Skills
  equippedWeapon?: CombatWeapon;
  equippedArmor?: CombatArmor;
  availableSkills: CombatSkill[];
  availableItems: CombatItem[];
  
  // AI Behavior (for NPCs)
  aiProfile?: CombatAIProfile;
}

export interface CombatWeapon {
  id: string;
  name: string;
  type: 'melee' | 'ranged' | 'magic';
  damage: number;
  accuracy: number;
  criticalChance: number;
  range: number;
  actionPointCost: number;
  specialEffects: WeaponEffect[];
}

export interface CombatArmor {
  id: string;
  name: string;
  defense: number;
  resistance: { [damageType: string]: number };
  speedPenalty: number;
  specialEffects: ArmorEffect[];
}

export interface WeaponEffect {
  type: 'status_inflict' | 'damage_bonus' | 'special_attack';
  trigger: 'on_hit' | 'on_critical' | 'on_kill';
  chance: number;
  value: any;
}

export interface ArmorEffect {
  type: 'damage_reduction' | 'status_immunity' | 'reflect_damage';
  trigger: 'on_hit' | 'passive' | 'on_block';
  value: any;
}

// === COMBAT SKILLS ===

export interface CombatSkill {
  id: string;
  name: string;
  description: string;
  type: 'attack' | 'defense' | 'support' | 'movement' | 'special';
  
  // Costs & Requirements
  actionPointCost: number;
  manaCost?: number;
  cooldown: number;
  currentCooldown: number;
  
  // Targeting
  targetType: 'self' | 'single_ally' | 'single_enemy' | 'all_allies' | 'all_enemies' | 'area' | 'any';
  range: number;
  areaOfEffect?: {
    shape: 'circle' | 'line' | 'cone' | 'square';
    size: number;
  };
  
  // Effects
  effects: SkillEffect[];
  
  // Requirements
  requirements?: {
    minLevel?: number;
    weaponType?: string;
    statusRequired?: string;
    positionRequired?: string;
  };
}

export interface SkillEffect {
  type: 'damage' | 'healing' | 'status_apply' | 'status_remove' | 'movement' | 'special';
  value: number | string;
  chance: number; // 0-100
  damageType?: DamageType;
  statusEffectId?: string;
}

export type DamageType = 'physical' | 'magical' | 'fire' | 'ice' | 'lightning' | 'poison' | 'holy' | 'dark' | 'true';

// === COMBAT ITEMS ===

export interface CombatItem {
  id: string;
  name: string;
  description: string;
  type: 'consumable' | 'throwable' | 'tool';
  quantity: number;
  
  // Usage
  actionPointCost: number;
  targetType: 'self' | 'single_ally' | 'single_enemy' | 'area';
  range: number;
  
  // Effects
  effects: ItemEffect[];
  
  // Restrictions
  usableInCombat: boolean;
  singleUse: boolean;
}

export interface ItemEffect {
  type: 'healing' | 'mana_restore' | 'status_apply' | 'status_remove' | 'damage' | 'special';
  value: number | string;
  duration?: number;
}

// === COMBAT AI ===

export interface CombatAIProfile {
  behavior: 'aggressive' | 'defensive' | 'balanced' | 'support' | 'tactical';
  priority: 'damage' | 'survival' | 'support_allies' | 'control' | 'objective';
  riskTolerance: 'low' | 'medium' | 'high';
  preferredRange: 'melee' | 'ranged' | 'any';
  specialTactics: string[];
}

// === COMBAT ACTIONS ===

export interface CombatAction {
  id: string;
  type: 'attack' | 'defend' | 'skill' | 'item' | 'move' | 'flee' | 'wait';
  actorId: string;
  targetId?: string;
  targetPosition?: Position;

  // Action Details
  skillId?: string;
  itemId?: string;
  weaponId?: string;

  // Costs
  actionPointCost: number;
  manaCost?: number;

  // Modifiers
  modifiers?: ActionModifier[];
}

export interface ActionModifier {
  type: 'accuracy' | 'damage' | 'critical' | 'range' | 'cost';
  value: number;
  source: string;
}

// === COMBAT STATE ===

export interface CombatState {
  id: string;
  isActive: boolean;
  phase: 'initiative' | 'player_turn' | 'enemy_turn' | 'resolution' | 'ended';

  // Participants & Turn Order
  participants: CombatParticipant[];
  currentTurnId: string;
  turnOrder: string[];
  round: number;

  // Environment
  environment?: CombatEnvironment;

  // Combat Log
  actionHistory: CombatActionResult[];

  // Victory Conditions
  victoryConditions: VictoryCondition[];
  defeatConditions: DefeatCondition[];

  // Timing
  startTime: string;
  turnStartTime: string;
  turnTimeLimit?: number; // seconds
}

export interface VictoryCondition {
  type: 'defeat_all_enemies' | 'survive_turns' | 'reach_position' | 'protect_target' | 'custom';
  description: string;
  parameters?: any;
  completed: boolean;
}

export interface DefeatCondition {
  type: 'player_death' | 'ally_death' | 'time_limit' | 'objective_failed' | 'custom';
  description: string;
  parameters?: any;
  triggered: boolean;
}

// === COMBAT RESULTS ===

export interface CombatActionResult {
  id: string;
  action: CombatAction;
  success: boolean;
  timestamp: string;

  // Results
  damageDealt?: DamageResult[];
  healingDone?: HealingResult[];
  statusEffectsApplied?: StatusEffectApplication[];
  statusEffectsRemoved?: string[];
  movementResult?: MovementResult;

  // Narrative
  description: string;
  flavorText?: string;

  // Consequences
  triggeredEffects?: TriggeredEffect[];
  combatStateChanges?: CombatStateChange[];
}

export interface DamageResult {
  targetId: string;
  damageType: DamageType;
  baseDamage: number;
  finalDamage: number;
  isCritical: boolean;
  isBlocked: boolean;
  breakdown: DamageBreakdown;
}

export interface DamageBreakdown {
  baseDamage: number;
  attributeModifier: number;
  weaponBonus: number;
  skillBonus: number;
  statusEffectModifier: number;
  criticalMultiplier: number;
  resistance: number;
  armorReduction: number;
  environmentalModifier: number;
}

export interface HealingResult {
  targetId: string;
  baseHealing: number;
  finalHealing: number;
  overheal: number;
  breakdown: HealingBreakdown;
}

export interface HealingBreakdown {
  baseHealing: number;
  attributeModifier: number;
  skillBonus: number;
  statusEffectModifier: number;
  environmentalModifier: number;
}

export interface StatusEffectApplication {
  targetId: string;
  statusEffect: StatusEffect;
  success: boolean;
  resistanceRoll?: number;
  stacksApplied: number;
}

export interface MovementResult {
  actorId: string;
  fromPosition: Position;
  toPosition: Position;
  success: boolean;
  distanceMoved: number;
}

export interface TriggeredEffect {
  sourceId: string;
  effectType: string;
  description: string;
  results: any;
}

export interface CombatStateChange {
  type: 'participant_added' | 'participant_removed' | 'phase_change' | 'environment_change';
  description: string;
  data: any;
}

// === COMBAT TURN RESULT ===

export interface CombatTurnResult {
  success: boolean;
  error?: string;
  newState: CombatState;
  actionResult?: CombatActionResult;
  combatEnd?: CombatEndResult;
  nextPhase?: CombatState['phase'];
}

export interface CombatEndResult {
  outcome: 'victory' | 'defeat' | 'flee' | 'draw';
  reason: string;
  survivingParticipants: string[];
  rewards?: CombatReward[];
  consequences?: CombatConsequence[];
}

export interface CombatReward {
  type: 'experience' | 'item' | 'currency' | 'skill_point' | 'reputation';
  value: number | string;
  description: string;
}

export interface CombatConsequence {
  type: 'injury' | 'trauma' | 'reputation_loss' | 'story_impact';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  duration?: number;
}
