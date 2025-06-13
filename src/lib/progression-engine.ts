/**
 * Character Progression Engine
 * 
 * Core utilities for managing the enhanced character progression system including:
 * - Experience and level calculations
 * - Skill tree management
 * - Attribute allocation
 * - Specialization systems
 * - Talent progression
 * - Milestone tracking
 */

import type {
  CharacterProfile,
  ProgressionPoints,
  AttributeProgression,
  SkillTree,
  SkillTreeNode,
  CharacterSpecialization,
  TalentNode,
  ProgressionMilestone,
  ProgressionReward,
  SkillTreeCategory,
  ProgressionPointType
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === EXPERIENCE AND LEVEL CALCULATIONS ===

export function calculateExperienceToNextLevel(level: number): number {
  // Validate input
  if (!Number.isInteger(level) || level < 1) {
    throw new Error(`Invalid level: ${level}. Level must be a positive integer.`);
  }

  // Cap maximum level to prevent overflow (e.g., level 100)
  if (level > 100) {
    throw new Error(`Level ${level} exceeds maximum allowed level (100)`);
  }

  // Progressive XP curve: base 100 XP, increases by 50% each level
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function calculateTotalExperienceForLevel(level: number): number {
  // Validate input
  if (!Number.isInteger(level) || level < 1) {
    throw new Error(`Invalid level: ${level}. Level must be a positive integer.`);
  }

  if (level === 1) {
    return 0; // Level 1 requires 0 total XP
  }

  let total = 0;
  for (let i = 1; i < level; i++) {
    total += calculateExperienceToNextLevel(i);
  }
  return total;
}

export function checkLevelUp(character: CharacterProfile): { shouldLevelUp: boolean; newLevel?: number } {
  if (character.experiencePoints >= character.experienceToNextLevel) {
    const newLevel = character.level + 1;
    return { shouldLevelUp: true, newLevel };
  }
  return { shouldLevelUp: false };
}

export function calculateProgressionPointsForLevel(level: number): ProgressionPoints {
  const basePoints = {
    attribute: 2, // 2 attribute points per level
    skill: 3,     // 3 skill points per level
    specialization: level % 5 === 0 ? 1 : 0, // 1 specialization point every 5 levels
    talent: level % 3 === 0 ? 1 : 0, // 1 talent point every 3 levels
  };

  // Bonus points at milestone levels
  if (level % 10 === 0) {
    basePoints.attribute += 2;
    basePoints.skill += 3;
    basePoints.specialization += 1;
  }

  return basePoints;
}

// === ATTRIBUTE PROGRESSION ===

export function initializeAttributeProgression(): AttributeProgression {
  return {
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0,
    maxHealthBonus: 0,
    maxManaBonus: 0,
    carryCapacityBonus: 0,
  };
}

export function calculateDerivedStats(
  baseCharacter: CharacterProfile,
  attributeProgression: AttributeProgression
): Partial<CharacterProfile> {
  // Ensure minimum attribute values (can't go below 1)
  const totalStr = Math.max(1, (baseCharacter.strength || 10) + attributeProgression.strength);
  const totalDex = Math.max(1, (baseCharacter.dexterity || 10) + attributeProgression.dexterity);
  const totalCon = Math.max(1, (baseCharacter.constitution || 10) + attributeProgression.constitution);
  const totalInt = Math.max(1, (baseCharacter.intelligence || 10) + attributeProgression.intelligence);
  const totalWis = Math.max(1, (baseCharacter.wisdom || 10) + attributeProgression.wisdom);
  const totalCha = Math.max(1, (baseCharacter.charisma || 10) + attributeProgression.charisma);

  // Calculate derived stats with proper rounding and minimum values
  const maxHealth = Math.max(1, baseCharacter.maxHealth + (totalCon * 2) + attributeProgression.maxHealthBonus);
  const maxMana = Math.max(0, Math.round((baseCharacter.maxMana || 0) + (totalInt * 1.5) + attributeProgression.maxManaBonus));

  return {
    strength: totalStr,
    dexterity: totalDex,
    constitution: totalCon,
    intelligence: totalInt,
    wisdom: totalWis,
    charisma: totalCha,
    maxHealth,
    maxMana,
    attack: Math.max(1, Math.round(totalStr * 0.8 + totalDex * 0.3)),
    defense: Math.max(0, Math.round(totalCon * 0.6 + totalDex * 0.4)),
    speed: Math.max(1, Math.round(totalDex * 0.7 + totalStr * 0.2)),
    accuracy: Math.max(0, Math.round(totalDex * 0.6 + totalWis * 0.3)),
    evasion: Math.max(0, Math.round(totalDex * 0.8 + totalWis * 0.2)),
    criticalChance: Math.max(0, Math.min(100, Math.round(totalDex * 0.3 + totalInt * 0.2))), // Cap at 100%
    criticalMultiplier: Math.max(1.0, Math.round((1.5 + (totalStr * 0.02)) * 100) / 100), // Round to 2 decimal places
    carryCapacity: Math.max(0, Math.round(totalStr * 5) + attributeProgression.carryCapacityBonus),
    movementSpeed: Math.max(1, Math.round(totalDex * 0.5 + totalCon * 0.3)),
    initiativeBonus: Math.max(0, Math.round(totalDex * 0.4 + totalWis * 0.3)),
  };
}

export function allocateAttributePoint(
  progression: AttributeProgression,
  attribute: keyof Omit<AttributeProgression, 'maxHealthBonus' | 'maxManaBonus' | 'carryCapacityBonus'>,
  points: number = 1
): AttributeProgression {
  // Validate inputs
  if (!progression || typeof points !== 'number') {
    throw new Error('Invalid progression data or points value');
  }

  if (points < 0) {
    throw new Error('Cannot allocate negative attribute points');
  }

  const currentValue = progression[attribute] || 0;
  const newValue = currentValue + points;

  // Set reasonable maximum limits (e.g., 100 points in any attribute)
  if (newValue > 100) {
    throw new Error(`Attribute ${attribute} cannot exceed 100 points`);
  }

  return {
    ...progression,
    [attribute]: newValue,
  };
}

// === SKILL TREE MANAGEMENT ===

export function isSkillNodeUnlocked(
  node: SkillTreeNode,
  purchasedNodes: string[],
  character: CharacterProfile
): boolean {
  // Validate node data
  if (!node || !node.id || node.tier < 1) {
    console.warn(`Invalid skill node:`, node);
    return false;
  }

  // Check level requirement
  if (node.tier > character.level) {
    return false;
  }

  // Check prerequisites
  if (node.prerequisites && node.prerequisites.length > 0) {
    return node.prerequisites.every(prereqId => {
      if (!prereqId || typeof prereqId !== 'string') {
        console.warn(`Invalid prerequisite ID: ${prereqId} for node ${node.id}`);
        return false;
      }
      return purchasedNodes.includes(prereqId);
    });
  }

  // First tier nodes are always unlocked if level requirement is met
  return node.tier === 1;
}

export function canPurchaseSkillNode(
  node: SkillTreeNode,
  purchasedNodes: string[],
  availableSkillPoints: number,
  character: CharacterProfile
): boolean {
  if (purchasedNodes.includes(node.id)) {
    return false; // Already purchased
  }

  if (!isSkillNodeUnlocked(node, purchasedNodes, character)) {
    return false; // Not unlocked
  }

  if (availableSkillPoints < node.cost) {
    return false; // Not enough points
  }

  return true;
}

export function purchaseSkillNode(
  nodeId: string,
  character: CharacterProfile,
  skillTree: SkillTree
): CharacterProfile {
  const node = skillTree.nodes.find(n => n.id === nodeId);
  if (!node) {
    throw new Error(`Skill node ${nodeId} not found in skill tree ${skillTree.id}`);
  }

  const currentPurchased = character.purchasedSkillNodes || [];
  const currentPoints = character.progressionPoints || { attribute: 0, skill: 0, specialization: 0, talent: 0 };

  if (!canPurchaseSkillNode(node, currentPurchased, currentPoints.skill, character)) {
    throw new Error(`Cannot purchase skill node ${nodeId}`);
  }

  return {
    ...character,
    purchasedSkillNodes: [...currentPurchased, nodeId],
    progressionPoints: {
      ...currentPoints,
      skill: currentPoints.skill - node.cost,
    },
  };
}

// === SPECIALIZATION SYSTEM ===

export function getAvailableSpecializations(
  character: CharacterProfile,
  allSpecializations: CharacterSpecialization[]
): CharacterSpecialization[] {
  if (!character || !allSpecializations || !Array.isArray(allSpecializations)) {
    return [];
  }

  return allSpecializations.filter(spec => {
    // Validate specialization data
    if (!spec || !spec.id || typeof spec.unlockedAtLevel !== 'number') {
      console.warn('Invalid specialization data:', spec);
      return false;
    }

    // Check level requirement
    if (character.level < spec.unlockedAtLevel) {
      return false;
    }

    // Check if already active
    const activeSpecs = character.activeSpecializations || [];
    if (activeSpecs.some(active => active && active.id === spec.id)) {
      return false;
    }

    // Check exclusivity (with circular reference protection)
    if (spec.exclusiveWith && Array.isArray(spec.exclusiveWith)) {
      const hasExclusive = activeSpecs.some(active => {
        if (!active || !active.id) return false;
        return spec.exclusiveWith!.includes(active.id);
      });
      if (hasExclusive) {
        return false;
      }
    }

    return true;
  });
}

export function activateSpecialization(
  character: CharacterProfile,
  specializationId: string,
  allSpecializations: CharacterSpecialization[]
): CharacterProfile {
  const specialization = allSpecializations.find(s => s.id === specializationId);
  if (!specialization) {
    throw new Error(`Specialization ${specializationId} not found`);
  }

  const available = getAvailableSpecializations(character, allSpecializations);
  if (!available.some(s => s.id === specializationId)) {
    throw new Error(`Specialization ${specializationId} is not available`);
  }

  const currentPoints = character.progressionPoints || { attribute: 0, skill: 0, specialization: 0, talent: 0 };
  if (currentPoints.specialization < 1) {
    throw new Error('Not enough specialization points');
  }

  const activeSpec: CharacterSpecialization = {
    ...specialization,
    isActive: true,
    progressionLevel: 1,
  };

  return {
    ...character,
    activeSpecializations: [...(character.activeSpecializations || []), activeSpec],
    progressionPoints: {
      ...currentPoints,
      specialization: currentPoints.specialization - 1,
    },
  };
}

// === INITIALIZATION FUNCTIONS ===

export function initializeProgressionPoints(): ProgressionPoints {
  return {
    attribute: 0,
    skill: 0,
    specialization: 0,
    talent: 0,
  };
}

export function initializeCharacterProgression(character: CharacterProfile): CharacterProfile {
  return {
    ...character,
    progressionPoints: character.progressionPoints || initializeProgressionPoints(),
    attributeProgression: character.attributeProgression || initializeAttributeProgression(),
    purchasedSkillNodes: character.purchasedSkillNodes || [],
    availableSkillTrees: character.availableSkillTrees || [],
    activeSpecializations: character.activeSpecializations || [],
    purchasedTalents: character.purchasedTalents || [],
    completedMilestones: character.completedMilestones || [],
    totalExperienceEarned: character.totalExperienceEarned || character.experiencePoints,
  };
}

export function processLevelUp(character: CharacterProfile): CharacterProfile {
  let currentCharacter = { ...character };
  let totalProgressionPoints = currentCharacter.progressionPoints || initializeProgressionPoints();

  // Handle multiple level ups in a single call
  while (true) {
    const levelUpCheck = checkLevelUp(currentCharacter);
    if (!levelUpCheck.shouldLevelUp || !levelUpCheck.newLevel) {
      break;
    }

    const newLevel = levelUpCheck.newLevel;
    const newProgressionPoints = calculateProgressionPointsForLevel(newLevel);

    // Calculate remaining XP after level up (handle overflow correctly)
    const excessXP = currentCharacter.experiencePoints - currentCharacter.experienceToNextLevel;
    const newXPToNextLevel = calculateExperienceToNextLevel(newLevel);

    // Accumulate progression points from all level ups
    totalProgressionPoints = {
      attribute: totalProgressionPoints.attribute + newProgressionPoints.attribute,
      skill: totalProgressionPoints.skill + newProgressionPoints.skill,
      specialization: totalProgressionPoints.specialization + newProgressionPoints.specialization,
      talent: totalProgressionPoints.talent + newProgressionPoints.talent,
    };

    // Update character for next iteration
    currentCharacter = {
      ...currentCharacter,
      level: newLevel,
      experiencePoints: Math.max(0, excessXP),
      experienceToNextLevel: newXPToNextLevel,
      totalExperienceEarned: (currentCharacter.totalExperienceEarned || currentCharacter.experiencePoints) + currentCharacter.experienceToNextLevel,
    };
  }

  return {
    ...currentCharacter,
    progressionPoints: totalProgressionPoints,
  };
}
