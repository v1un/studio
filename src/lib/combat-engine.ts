/**
 * Combat Engine
 * 
 * Core combat calculation and processing engine that handles:
 * - Damage calculations with comprehensive formulas
 * - Turn management and action processing
 * - Status effect application and resolution
 * - Combat state transitions
 */

import type {
  CombatState,
  CombatParticipant,
  CombatAction,
  CombatActionResult,
  CombatTurnResult,
  DamageResult,
  DamageBreakdown,
  HealingResult,
  HealingBreakdown,
  StatusEffect,
  StatusEffectApplication,
  MovementResult,
  CombatEndResult,
  DamageType,
  Position
} from '@/types/combat';
import { generateUUID } from '@/lib/utils';

// === DAMAGE CALCULATION SYSTEM ===

export function calculateDamage(
  attacker: CombatParticipant,
  target: CombatParticipant,
  action: CombatAction,
  combatState: CombatState
): DamageResult {
  // Base damage calculation
  const baseDamage = getBaseDamage(attacker, action);
  
  // Attribute modifiers
  const attributeModifier = getAttributeModifier(attacker, action);
  
  // Weapon bonus
  const weaponBonus = getWeaponBonus(attacker, action);
  
  // Skill bonus
  const skillBonus = getSkillBonus(attacker, action);
  
  // Status effect modifiers
  const statusEffectModifier = getStatusEffectDamageModifier(attacker, target, action);
  
  // Critical hit calculation
  const { isCritical, criticalMultiplier } = calculateCritical(attacker, target, action);
  
  // Resistance and armor
  const resistance = getResistance(target, getDamageType(action));
  const armorReduction = getArmorReduction(target, action);
  
  // Environmental modifiers
  const environmentalModifier = getEnvironmentalDamageModifier(combatState, action);
  
  // Calculate final damage
  const preMitigationDamage = (baseDamage + attributeModifier + weaponBonus + skillBonus + statusEffectModifier + environmentalModifier) * criticalMultiplier;
  const finalDamage = Math.max(0, Math.floor(preMitigationDamage - resistance - armorReduction));
  
  const breakdown: DamageBreakdown = {
    baseDamage,
    attributeModifier,
    weaponBonus,
    skillBonus,
    statusEffectModifier,
    criticalMultiplier,
    resistance,
    armorReduction,
    environmentalModifier,
  };
  
  return {
    targetId: target.id,
    damageType: getDamageType(action),
    baseDamage,
    finalDamage,
    isCritical,
    isBlocked: finalDamage === 0 && preMitigationDamage > 0,
    breakdown,
  };
}

function getBaseDamage(attacker: CombatParticipant, action: CombatAction): number {
  if (action.type === 'attack' && attacker.equippedWeapon) {
    return attacker.equippedWeapon.damage;
  }
  
  if (action.type === 'skill' && action.skillId) {
    const skill = attacker.availableSkills.find(s => s.id === action.skillId);
    if (skill) {
      const damageEffect = skill.effects.find(e => e.type === 'damage');
      return damageEffect ? Number(damageEffect.value) : 0;
    }
  }
  
  // Unarmed attack
  return Math.floor(attacker.attack * 0.5);
}

function getAttributeModifier(attacker: CombatParticipant, action: CombatAction): number {
  // Physical attacks use attack stat
  if (action.type === 'attack' || (action.type === 'skill' && getDamageType(action) === 'physical')) {
    return Math.floor(attacker.attack * 0.1);
  }
  
  // Magic attacks could use a magic stat (if available)
  // For now, use attack stat for all damage
  return Math.floor(attacker.attack * 0.1);
}

function getWeaponBonus(attacker: CombatParticipant, action: CombatAction): number {
  if (!attacker.equippedWeapon || action.type !== 'attack') {
    return 0;
  }
  
  // Weapon accuracy affects damage slightly
  return Math.floor(attacker.equippedWeapon.accuracy * 0.05);
}

function getSkillBonus(attacker: CombatParticipant, action: CombatAction): number {
  if (action.type !== 'skill' || !action.skillId) {
    return 0;
  }
  
  // Could implement skill levels here
  // For now, return a small bonus based on attacker's level/stats
  return Math.floor(attacker.attack * 0.05);
}

function getStatusEffectDamageModifier(attacker: CombatParticipant, target: CombatParticipant, action: CombatAction): number {
  let modifier = 0;
  
  // Check attacker's damage-boosting effects
  attacker.statusEffects.forEach(effect => {
    effect.effects.forEach(mod => {
      if (mod.stat === 'attack' && mod.type === 'flat') {
        modifier += mod.value;
      }
    });
  });
  
  return modifier;
}

function calculateCritical(attacker: CombatParticipant, target: CombatParticipant, action: CombatAction): { isCritical: boolean; criticalMultiplier: number } {
  let criticalChance = attacker.criticalChance;
  
  // Weapon critical bonus
  if (attacker.equippedWeapon && action.type === 'attack') {
    criticalChance += attacker.equippedWeapon.criticalChance;
  }
  
  // Status effect modifiers
  attacker.statusEffects.forEach(effect => {
    effect.effects.forEach(mod => {
      if (mod.stat === 'critical' && mod.type === 'flat') {
        criticalChance += mod.value;
      }
    });
  });
  
  const isCritical = Math.random() * 100 < criticalChance;
  const criticalMultiplier = isCritical ? attacker.criticalMultiplier : 1.0;
  
  return { isCritical, criticalMultiplier };
}

function getResistance(target: CombatParticipant, damageType: DamageType): number {
  let resistance = 0;
  
  // Armor resistance
  if (target.equippedArmor && target.equippedArmor.resistance[damageType]) {
    resistance += target.equippedArmor.resistance[damageType];
  }
  
  // Status effect resistance
  target.statusEffects.forEach(effect => {
    effect.effects.forEach(mod => {
      if (mod.stat === 'resistance' && mod.type === 'flat') {
        resistance += mod.value;
      }
    });
  });
  
  return resistance;
}

function getArmorReduction(target: CombatParticipant, action: CombatAction): number {
  if (!target.equippedArmor) {
    return 0;
  }
  
  // Physical damage is reduced by armor defense
  if (getDamageType(action) === 'physical') {
    return Math.floor(target.equippedArmor.defense * 0.5);
  }
  
  return 0;
}

function getEnvironmentalDamageModifier(combatState: CombatState, action: CombatAction): number {
  if (!combatState.environment) {
    return 0;
  }
  
  let modifier = 0;
  combatState.environment.effects.forEach(effect => {
    if (effect.type === 'damage') {
      modifier += effect.value;
    }
  });
  
  return modifier;
}

function getDamageType(action: CombatAction): DamageType {
  // Default to physical for basic attacks
  if (action.type === 'attack') {
    return 'physical';
  }
  
  // For skills, would need to look up the skill's damage type
  // For now, default to physical
  return 'physical';
}

// === HEALING CALCULATION SYSTEM ===

export function calculateHealing(
  healer: CombatParticipant,
  target: CombatParticipant,
  action: CombatAction,
  combatState: CombatState
): HealingResult {
  const baseHealing = getBaseHealing(healer, action);
  const attributeModifier = getHealingAttributeModifier(healer, action);
  const skillBonus = getHealingSkillBonus(healer, action);
  const statusEffectModifier = getStatusEffectHealingModifier(healer, target);
  const environmentalModifier = getEnvironmentalHealingModifier(combatState);
  
  const totalHealing = baseHealing + attributeModifier + skillBonus + statusEffectModifier + environmentalModifier;
  const finalHealing = Math.min(totalHealing, target.maxHealth - target.health);
  const overheal = totalHealing - finalHealing;
  
  const breakdown: HealingBreakdown = {
    baseHealing,
    attributeModifier,
    skillBonus,
    statusEffectModifier,
    environmentalModifier,
  };
  
  return {
    targetId: target.id,
    baseHealing,
    finalHealing,
    overheal,
    breakdown,
  };
}

function getBaseHealing(healer: CombatParticipant, action: CombatAction): number {
  if (action.type === 'skill' && action.skillId) {
    const skill = healer.availableSkills.find(s => s.id === action.skillId);
    if (skill) {
      const healingEffect = skill.effects.find(e => e.type === 'healing');
      return healingEffect ? Number(healingEffect.value) : 0;
    }
  }
  
  if (action.type === 'item' && action.itemId) {
    const item = healer.availableItems.find(i => i.id === action.itemId);
    if (item) {
      const healingEffect = item.effects.find(e => e.type === 'healing');
      return healingEffect ? Number(healingEffect.value) : 0;
    }
  }
  
  return 0;
}

function getHealingAttributeModifier(healer: CombatParticipant, action: CombatAction): number {
  // Could use a magic/wisdom stat for healing
  // For now, use a small portion of attack stat
  return Math.floor(healer.attack * 0.05);
}

function getHealingSkillBonus(healer: CombatParticipant, action: CombatAction): number {
  // Could implement healing skill levels
  return 0;
}

function getStatusEffectHealingModifier(healer: CombatParticipant, target: CombatParticipant): number {
  let modifier = 0;
  
  // Check for healing-boosting effects
  healer.statusEffects.forEach(effect => {
    if (effect.name.toLowerCase().includes('blessing') || effect.name.toLowerCase().includes('healing')) {
      modifier += 5; // Small healing bonus
    }
  });
  
  return modifier;
}

function getEnvironmentalHealingModifier(combatState: CombatState): number {
  if (!combatState.environment) {
    return 0;
  }

  let modifier = 0;
  combatState.environment.effects.forEach(effect => {
    if (effect.type === 'healing') {
      modifier += effect.value;
    }
  });

  return modifier;
}

// === ACTION PROCESSING SYSTEM ===

export function processCombatAction(
  combatState: CombatState,
  action: CombatAction
): CombatTurnResult {
  // Validate action
  const validationResult = validateAction(combatState, action);
  if (!validationResult.valid) {
    return {
      success: false,
      error: validationResult.error,
      newState: combatState,
    };
  }

  // Execute the action
  const actionResult = executeAction(combatState, action);

  // Update combat state
  const updatedState = updateCombatState(combatState, actionResult);

  // Check for combat end conditions
  const combatEndCheck = checkCombatEnd(updatedState);

  // Advance turn if needed
  const finalState = combatEndCheck ? updatedState : advanceTurn(updatedState);

  return {
    success: true,
    newState: finalState,
    actionResult,
    combatEnd: combatEndCheck,
    nextPhase: finalState.phase,
  };
}

function validateAction(combatState: CombatState, action: CombatAction): { valid: boolean; error?: string } {
  const actor = combatState.participants.find(p => p.id === action.actorId);
  if (!actor) {
    return { valid: false, error: 'Actor not found in combat' };
  }

  if (combatState.currentTurnId !== action.actorId) {
    return { valid: false, error: 'Not your turn' };
  }

  if (actor.actionPoints < action.actionPointCost) {
    return { valid: false, error: 'Insufficient action points' };
  }

  if (action.manaCost && actor.mana !== undefined && actor.mana < action.manaCost) {
    return { valid: false, error: 'Insufficient mana' };
  }

  // Validate target
  if (action.targetId) {
    const target = combatState.participants.find(p => p.id === action.targetId);
    if (!target) {
      return { valid: false, error: 'Target not found' };
    }

    // Check if target is valid for this action type
    if (!isValidTarget(actor, target, action)) {
      return { valid: false, error: 'Invalid target for this action' };
    }
  }

  // Validate skill availability
  if (action.type === 'skill' && action.skillId) {
    const skill = actor.availableSkills.find(s => s.id === action.skillId);
    if (!skill) {
      return { valid: false, error: 'Skill not available' };
    }

    if (skill.currentCooldown > 0) {
      return { valid: false, error: 'Skill is on cooldown' };
    }
  }

  // Validate item availability
  if (action.type === 'item' && action.itemId) {
    const item = actor.availableItems.find(i => i.id === action.itemId);
    if (!item || item.quantity <= 0) {
      return { valid: false, error: 'Item not available' };
    }
  }

  return { valid: true };
}

function isValidTarget(actor: CombatParticipant, target: CombatParticipant, action: CombatAction): boolean {
  // Basic targeting rules
  if (action.type === 'attack') {
    // Can't attack allies or self
    return target.type !== actor.type && target.id !== actor.id;
  }

  if (action.type === 'skill' && action.skillId) {
    const skill = actor.availableSkills.find(s => s.id === action.skillId);
    if (skill) {
      switch (skill.targetType) {
        case 'self':
          return target.id === actor.id;
        case 'single_ally':
          return target.type === actor.type;
        case 'single_enemy':
          return target.type !== actor.type;
        case 'any':
          return true;
        default:
          return false;
      }
    }
  }

  return true;
}

function executeAction(combatState: CombatState, action: CombatAction): CombatActionResult {
  const actor = combatState.participants.find(p => p.id === action.actorId)!;
  const target = action.targetId ? combatState.participants.find(p => p.id === action.targetId) : undefined;

  const result: CombatActionResult = {
    id: generateUUID(),
    action,
    success: true,
    timestamp: new Date().toISOString(),
    description: '',
    damageDealt: [],
    healingDone: [],
    statusEffectsApplied: [],
    statusEffectsRemoved: [],
    triggeredEffects: [],
    combatStateChanges: [],
  };

  switch (action.type) {
    case 'attack':
      if (target) {
        const damageResult = calculateDamage(actor, target, action, combatState);
        result.damageDealt = [damageResult];
        result.description = `${actor.name} attacks ${target.name} for ${damageResult.finalDamage} damage${damageResult.isCritical ? ' (Critical Hit!)' : ''}`;
      }
      break;

    case 'skill':
      result.description = executeSkillAction(actor, target, action, combatState, result);
      break;

    case 'item':
      result.description = executeItemAction(actor, target, action, combatState, result);
      break;

    case 'defend':
      result.description = `${actor.name} takes a defensive stance`;
      // Apply defensive status effect
      const defenseEffect: StatusEffect = {
        id: generateUUID(),
        name: 'Defending',
        description: 'Reduced damage taken',
        type: 'buff',
        category: 'physical',
        effects: [{ stat: 'defense', type: 'percentage', value: 50 }],
        duration: 1,
        stacks: 1,
        maxStacks: 1,
        source: actor.id,
        canDispel: false,
        tickTiming: 'end_turn',
      };
      result.statusEffectsApplied = [{
        targetId: actor.id,
        statusEffect: defenseEffect,
        success: true,
        stacksApplied: 1,
      }];
      break;

    case 'move':
      if (action.targetPosition) {
        const moveResult = executeMovement(actor, action.targetPosition, combatState);
        result.movementResult = moveResult;
        result.description = `${actor.name} moves to a new position`;
      }
      break;

    case 'flee':
      result.description = `${actor.name} attempts to flee from combat`;
      // Implement flee logic
      break;

    case 'wait':
      result.description = `${actor.name} waits and recovers`;
      // Small action point recovery
      break;
  }

  return result;
}

function executeSkillAction(
  actor: CombatParticipant,
  target: CombatParticipant | undefined,
  action: CombatAction,
  combatState: CombatState,
  result: CombatActionResult
): string {
  const skill = actor.availableSkills.find(s => s.id === action.skillId);
  if (!skill) {
    return `${actor.name} failed to use skill`;
  }

  let description = `${actor.name} uses ${skill.name}`;

  skill.effects.forEach(effect => {
    if (target) {
      switch (effect.type) {
        case 'damage':
          const damageResult = calculateDamage(actor, target, action, combatState);
          result.damageDealt!.push(damageResult);
          description += ` dealing ${damageResult.finalDamage} damage to ${target.name}`;
          break;

        case 'healing':
          const healingResult = calculateHealing(actor, target, action, combatState);
          result.healingDone!.push(healingResult);
          description += ` healing ${target.name} for ${healingResult.finalHealing} health`;
          break;

        case 'status_apply':
          // Apply status effect logic would go here
          description += ` applying an effect to ${target.name}`;
          break;
      }
    }
  });

  return description;
}

function executeItemAction(
  actor: CombatParticipant,
  target: CombatParticipant | undefined,
  action: CombatAction,
  combatState: CombatState,
  result: CombatActionResult
): string {
  const item = actor.availableItems.find(i => i.id === action.itemId);
  if (!item) {
    return `${actor.name} failed to use item`;
  }

  let description = `${actor.name} uses ${item.name}`;

  // Process item effects similar to skill effects
  item.effects.forEach(effect => {
    if (target) {
      switch (effect.type) {
        case 'healing':
          const healingResult = calculateHealing(actor, target, action, combatState);
          result.healingDone!.push(healingResult);
          description += ` healing ${target.name} for ${healingResult.finalHealing} health`;
          break;

        case 'mana_restore':
          description += ` restoring mana to ${target.name}`;
          break;
      }
    }
  });

  return description;
}

function executeMovement(
  actor: CombatParticipant,
  targetPosition: Position,
  combatState: CombatState
): MovementResult {
  const fromPosition = actor.position || { x: 0, y: 0 };
  const distance = Math.sqrt(
    Math.pow(targetPosition.x - fromPosition.x, 2) +
    Math.pow(targetPosition.y - fromPosition.y, 2)
  );

  return {
    actorId: actor.id,
    fromPosition,
    toPosition: targetPosition,
    success: true,
    distanceMoved: distance,
  };
}

// === COMBAT STATE MANAGEMENT ===

function updateCombatState(combatState: CombatState, actionResult: CombatActionResult): CombatState {
  const newState = { ...combatState };
  const updatedParticipants = [...newState.participants];

  // Apply damage
  actionResult.damageDealt?.forEach(damage => {
    const participant = updatedParticipants.find(p => p.id === damage.targetId);
    if (participant) {
      participant.health = Math.max(0, participant.health - damage.finalDamage);
    }
  });

  // Apply healing
  actionResult.healingDone?.forEach(healing => {
    const participant = updatedParticipants.find(p => p.id === healing.targetId);
    if (participant) {
      participant.health = Math.min(participant.maxHealth, participant.health + healing.finalHealing);
    }
  });

  // Apply status effects
  actionResult.statusEffectsApplied?.forEach(application => {
    const participant = updatedParticipants.find(p => p.id === application.targetId);
    if (participant && application.success) {
      applyStatusEffect(participant, application.statusEffect);
    }
  });

  // Remove status effects
  actionResult.statusEffectsRemoved?.forEach(effectId => {
    updatedParticipants.forEach(participant => {
      participant.statusEffects = participant.statusEffects.filter(effect => effect.id !== effectId);
    });
  });

  // Apply movement
  if (actionResult.movementResult) {
    const participant = updatedParticipants.find(p => p.id === actionResult.movementResult!.actorId);
    if (participant) {
      participant.position = actionResult.movementResult.toPosition;
    }
  }

  // Consume action points
  const actor = updatedParticipants.find(p => p.id === actionResult.action.actorId);
  if (actor) {
    actor.actionPoints = Math.max(0, actor.actionPoints - actionResult.action.actionPointCost);

    // Consume mana if applicable
    if (actionResult.action.manaCost && actor.mana !== undefined) {
      actor.mana = Math.max(0, actor.mana - actionResult.action.manaCost);
    }

    // Consume items
    if (actionResult.action.type === 'item' && actionResult.action.itemId) {
      const item = actor.availableItems.find(i => i.id === actionResult.action.itemId);
      if (item) {
        item.quantity = Math.max(0, item.quantity - 1);
      }
    }

    // Apply skill cooldowns
    if (actionResult.action.type === 'skill' && actionResult.action.skillId) {
      const skill = actor.availableSkills.find(s => s.id === actionResult.action.skillId);
      if (skill) {
        skill.currentCooldown = skill.cooldown;
      }
    }
  }

  newState.participants = updatedParticipants;
  newState.actionHistory.push(actionResult);

  return newState;
}

function applyStatusEffect(participant: CombatParticipant, statusEffect: StatusEffect): void {
  // Check if effect already exists and can stack
  const existingEffect = participant.statusEffects.find(e => e.name === statusEffect.name);

  if (existingEffect && existingEffect.stacks < existingEffect.maxStacks) {
    // Stack the effect
    existingEffect.stacks += statusEffect.stacks;
    existingEffect.duration = Math.max(existingEffect.duration, statusEffect.duration);
  } else if (!existingEffect) {
    // Add new effect
    participant.statusEffects.push({ ...statusEffect });
  }
  // If effect exists and can't stack, the new application is ignored
}

function advanceTurn(combatState: CombatState): CombatState {
  const newState = { ...combatState };

  // Process end-of-turn effects
  newState.participants.forEach(participant => {
    processStatusEffects(participant, 'end_turn');

    // Reduce cooldowns
    participant.availableSkills.forEach(skill => {
      if (skill.currentCooldown > 0) {
        skill.currentCooldown--;
      }
    });
  });

  // Find next participant in turn order
  const currentIndex = newState.turnOrder.indexOf(newState.currentTurnId);
  const nextIndex = (currentIndex + 1) % newState.turnOrder.length;
  newState.currentTurnId = newState.turnOrder[nextIndex];

  // If we've cycled back to the first participant, increment round
  if (nextIndex === 0) {
    newState.round++;
  }

  // Reset action points for the new turn participant
  const currentParticipant = newState.participants.find(p => p.id === newState.currentTurnId);
  if (currentParticipant) {
    currentParticipant.actionPoints = currentParticipant.maxActionPoints;

    // Process start-of-turn effects
    processStatusEffects(currentParticipant, 'start_turn');
  }

  // Update phase based on participant type
  if (currentParticipant?.type === 'player') {
    newState.phase = 'player_turn';
  } else {
    newState.phase = 'enemy_turn';
  }

  newState.turnStartTime = new Date().toISOString();

  return newState;
}

function processStatusEffects(participant: CombatParticipant, timing: 'start_turn' | 'end_turn'): void {
  const effectsToRemove: string[] = [];

  participant.statusEffects.forEach(effect => {
    if (effect.tickTiming === timing) {
      // Apply effect
      effect.effects.forEach(modifier => {
        applyStatusEffectModifier(participant, modifier, effect);
      });

      // Reduce duration
      if (effect.duration > 0) {
        effect.duration--;
        if (effect.duration === 0) {
          effectsToRemove.push(effect.id);
        }
      }
    }
  });

  // Remove expired effects
  participant.statusEffects = participant.statusEffects.filter(
    effect => !effectsToRemove.includes(effect.id)
  );
}

function applyStatusEffectModifier(
  participant: CombatParticipant,
  modifier: StatusEffectModifier,
  effect: StatusEffect
): void {
  // Apply damage over time or healing over time
  if (modifier.stat === 'health') {
    if (modifier.value > 0) {
      // Healing
      participant.health = Math.min(participant.maxHealth, participant.health + modifier.value);
    } else {
      // Damage
      participant.health = Math.max(0, participant.health + modifier.value); // modifier.value is negative
    }
  }

  if (modifier.stat === 'mana' && participant.mana !== undefined) {
    if (modifier.value > 0) {
      // Mana restoration
      participant.mana = Math.min(participant.maxMana!, participant.mana + modifier.value);
    } else {
      // Mana drain
      participant.mana = Math.max(0, participant.mana + modifier.value);
    }
  }

  // Other stat modifiers are applied during calculations, not directly to the participant
}

// === COMBAT END CONDITIONS ===

export function checkCombatEnd(combatState: CombatState): CombatEndResult | null {
  // Check victory conditions
  for (const condition of combatState.victoryConditions) {
    if (checkVictoryCondition(combatState, condition)) {
      return {
        outcome: 'victory',
        reason: condition.description,
        survivingParticipants: combatState.participants.filter(p => p.health > 0).map(p => p.id),
        rewards: generateVictoryRewards(combatState),
        consequences: [],
      };
    }
  }

  // Check defeat conditions
  for (const condition of combatState.defeatConditions) {
    if (checkDefeatCondition(combatState, condition)) {
      return {
        outcome: 'defeat',
        reason: condition.description,
        survivingParticipants: combatState.participants.filter(p => p.health > 0).map(p => p.id),
        rewards: [],
        consequences: generateDefeatConsequences(combatState),
      };
    }
  }

  return null;
}

function checkVictoryCondition(combatState: CombatState, condition: any): boolean {
  switch (condition.type) {
    case 'defeat_all_enemies':
      return combatState.participants.filter(p => p.type === 'enemy' && p.health > 0).length === 0;
    case 'survive_turns':
      return combatState.round >= condition.parameters.turns;
    default:
      return false;
  }
}

function checkDefeatCondition(combatState: CombatState, condition: any): boolean {
  switch (condition.type) {
    case 'player_death':
      return combatState.participants.filter(p => p.type === 'player' && p.health > 0).length === 0;
    case 'time_limit':
      const elapsed = Date.now() - new Date(combatState.startTime).getTime();
      return elapsed > condition.parameters.timeLimit * 1000;
    default:
      return false;
  }
}

function generateVictoryRewards(combatState: CombatState): any[] {
  // Generate rewards based on combat difficulty and performance
  return [
    { type: 'experience', value: 100, description: 'Combat experience gained' },
  ];
}

function generateDefeatConsequences(combatState: CombatState): any[] {
  // Generate consequences for defeat
  return [
    { type: 'injury', severity: 'minor', description: 'Minor injuries sustained', duration: 3 },
  ];
}

// === INITIATIVE CALCULATION ===

export function calculateInitiative(participants: CombatParticipant[]): string[] {
  const initiativeRolls = participants.map(participant => ({
    id: participant.id,
    initiative: participant.speed + Math.random() * 20, // Speed + random factor
  }));

  // Sort by initiative (highest first)
  initiativeRolls.sort((a, b) => b.initiative - a.initiative);

  return initiativeRolls.map(roll => roll.id);
}
