/**
 * Progression Engine Tests
 * 
 * Tests for the enhanced character progression system
 */

import {
  calculateExperienceToNextLevel,
  calculateTotalExperienceForLevel,
  checkLevelUp,
  calculateProgressionPointsForLevel,
  initializeAttributeProgression,
  calculateDerivedStats,
  allocateAttributePoint,
  isSkillNodeUnlocked,
  canPurchaseSkillNode,
  purchaseSkillNode,
  initializeCharacterProgression,
  processLevelUp
} from '../progression-engine';
import { combatSkillTree } from '../skill-trees';
import type { CharacterProfile } from '@/types/story';

// Mock character for testing
const mockCharacter: CharacterProfile = {
  name: 'Test Hero',
  class: 'Warrior',
  description: 'A test character',
  health: 100,
  maxHealth: 100,
  mana: 50,
  maxMana: 50,
  strength: 12,
  dexterity: 10,
  constitution: 14,
  intelligence: 8,
  wisdom: 10,
  charisma: 9,
  level: 1,
  experiencePoints: 0,
  experienceToNextLevel: 100,
  skillsAndAbilities: [],
  currency: 100
};

describe('Experience and Level Calculations', () => {
  test('calculateExperienceToNextLevel should return correct values', () => {
    expect(calculateExperienceToNextLevel(1)).toBe(100);
    expect(calculateExperienceToNextLevel(2)).toBe(150);
    expect(calculateExperienceToNextLevel(3)).toBe(225);
  });

  test('calculateTotalExperienceForLevel should return cumulative XP', () => {
    expect(calculateTotalExperienceForLevel(1)).toBe(0);
    expect(calculateTotalExperienceForLevel(2)).toBe(100);
    expect(calculateTotalExperienceForLevel(3)).toBe(250);
  });

  test('checkLevelUp should detect when character can level up', () => {
    const readyCharacter = { ...mockCharacter, experiencePoints: 100 };
    const notReadyCharacter = { ...mockCharacter, experiencePoints: 50 };

    expect(checkLevelUp(readyCharacter)).toEqual({ shouldLevelUp: true, newLevel: 2 });
    expect(checkLevelUp(notReadyCharacter)).toEqual({ shouldLevelUp: false });
  });

  test('calculateProgressionPointsForLevel should give correct points', () => {
    const level5Points = calculateProgressionPointsForLevel(5);
    expect(level5Points.attribute).toBe(2);
    expect(level5Points.skill).toBe(3);
    expect(level5Points.specialization).toBe(1); // Every 5 levels

    const level3Points = calculateProgressionPointsForLevel(3);
    expect(level3Points.specialization).toBe(0);
    expect(level3Points.talent).toBe(1); // Every 3 levels
  });
});

describe('Attribute Progression', () => {
  test('initializeAttributeProgression should create empty progression', () => {
    const progression = initializeAttributeProgression();
    expect(progression.strength).toBe(0);
    expect(progression.dexterity).toBe(0);
    expect(progression.constitution).toBe(0);
  });

  test('allocateAttributePoint should increase attribute', () => {
    const progression = initializeAttributeProgression();
    const updated = allocateAttributePoint(progression, 'strength', 3);
    
    expect(updated.strength).toBe(3);
    expect(updated.dexterity).toBe(0); // Other attributes unchanged
  });

  test('calculateDerivedStats should compute correct values', () => {
    const progression = allocateAttributePoint(initializeAttributeProgression(), 'strength', 5);
    const derived = calculateDerivedStats(mockCharacter, progression);

    expect(derived.strength).toBe(17); // 12 base + 5 progression
    expect(derived.attack).toBeGreaterThan(mockCharacter.strength || 0);
    expect(derived.maxHealth).toBeGreaterThan(mockCharacter.maxHealth);
  });
});

describe('Skill Tree System', () => {
  test('isSkillNodeUnlocked should check prerequisites correctly', () => {
    const basicAttackNode = combatSkillTree.nodes.find(n => n.id === 'basic_attack')!;
    const powerAttackNode = combatSkillTree.nodes.find(n => n.id === 'power_attack')!;

    // Basic attack should be unlocked (tier 1, no prerequisites)
    expect(isSkillNodeUnlocked(basicAttackNode, [], mockCharacter)).toBe(true);

    // Power attack should not be unlocked without basic attack
    expect(isSkillNodeUnlocked(powerAttackNode, [], mockCharacter)).toBe(false);

    // Power attack should be unlocked with basic attack purchased
    expect(isSkillNodeUnlocked(powerAttackNode, ['basic_attack'], mockCharacter)).toBe(true);
  });

  test('canPurchaseSkillNode should check all requirements', () => {
    const basicAttackNode = combatSkillTree.nodes.find(n => n.id === 'basic_attack')!;
    
    // Should be purchasable with enough points
    expect(canPurchaseSkillNode(basicAttackNode, [], 5, mockCharacter)).toBe(true);

    // Should not be purchasable without enough points
    expect(canPurchaseSkillNode(basicAttackNode, [], 0, mockCharacter)).toBe(false);

    // Should not be purchasable if already purchased
    expect(canPurchaseSkillNode(basicAttackNode, ['basic_attack'], 5, mockCharacter)).toBe(false);
  });

  test('purchaseSkillNode should update character correctly', () => {
    const characterWithPoints = {
      ...mockCharacter,
      progressionPoints: { attribute: 0, skill: 5, specialization: 0, talent: 0 },
      purchasedSkillNodes: []
    };

    const updated = purchaseSkillNode('basic_attack', characterWithPoints, combatSkillTree);

    expect(updated.purchasedSkillNodes).toContain('basic_attack');
    expect(updated.progressionPoints?.skill).toBe(4); // 5 - 1 cost
  });
});

describe('Character Progression Integration', () => {
  test('initializeCharacterProgression should add progression fields', () => {
    const initialized = initializeCharacterProgression(mockCharacter);

    expect(initialized.progressionPoints).toBeDefined();
    expect(initialized.attributeProgression).toBeDefined();
    expect(initialized.purchasedSkillNodes).toEqual([]);
    expect(initialized.activeSpecializations).toEqual([]);
  });

  test('processLevelUp should handle level advancement', () => {
    const readyCharacter = {
      ...mockCharacter,
      experiencePoints: 100,
      progressionPoints: { attribute: 0, skill: 0, specialization: 0, talent: 0 }
    };

    const leveled = processLevelUp(readyCharacter);

    expect(leveled.level).toBe(2);
    expect(leveled.experiencePoints).toBe(0); // Excess XP carried over
    expect(leveled.experienceToNextLevel).toBe(150); // Next level requirement
    expect(leveled.progressionPoints?.attribute).toBeGreaterThan(0);
    expect(leveled.progressionPoints?.skill).toBeGreaterThan(0);
  });

  test('processLevelUp should not level up character without enough XP', () => {
    const notReadyCharacter = {
      ...mockCharacter,
      experiencePoints: 50
    };

    const result = processLevelUp(notReadyCharacter);
    expect(result.level).toBe(1); // No level change
    expect(result.experiencePoints).toBe(50); // XP unchanged
  });
});

describe('Edge Cases and Bug Fixes', () => {
  test('should handle missing progression data gracefully', () => {
    const characterWithoutProgression = { ...mockCharacter };
    delete (characterWithoutProgression as any).progressionPoints;

    const initialized = initializeCharacterProgression(characterWithoutProgression);
    expect(initialized.progressionPoints).toBeDefined();
  });

  test('should handle invalid skill node purchase attempts', () => {
    const characterWithoutPoints = {
      ...mockCharacter,
      progressionPoints: { attribute: 0, skill: 0, specialization: 0, talent: 0 }
    };

    expect(() => {
      purchaseSkillNode('basic_attack', characterWithoutPoints, combatSkillTree);
    }).toThrow();
  });

  test('should handle level up with existing progression points', () => {
    const characterWithExistingPoints = {
      ...mockCharacter,
      experiencePoints: 100,
      progressionPoints: { attribute: 2, skill: 3, specialization: 1, talent: 0 }
    };

    const leveled = processLevelUp(characterWithExistingPoints);

    // Should add to existing points, not replace them
    expect(leveled.progressionPoints?.attribute).toBeGreaterThan(2);
    expect(leveled.progressionPoints?.skill).toBeGreaterThan(3);
  });

  test('should handle multiple level ups correctly', () => {
    const characterWithMassiveXP = {
      ...mockCharacter,
      experiencePoints: 500, // Enough for multiple levels
      experienceToNextLevel: 100
    };

    const leveled = processLevelUp(characterWithMassiveXP);

    // Should level up multiple times
    expect(leveled.level).toBeGreaterThan(2);
    expect(leveled.experiencePoints).toBeGreaterThanOrEqual(0);
    expect(leveled.progressionPoints?.attribute).toBeGreaterThan(2); // Multiple level rewards
  });

  test('should prevent negative attribute allocation', () => {
    const progression = initializeAttributeProgression();

    expect(() => {
      allocateAttributePoint(progression, 'strength', -5);
    }).toThrow('Cannot allocate negative attribute points');
  });

  test('should prevent excessive attribute allocation', () => {
    const progression = initializeAttributeProgression();

    expect(() => {
      allocateAttributePoint(progression, 'strength', 150);
    }).toThrow('cannot exceed 100 points');
  });

  test('should handle invalid level inputs', () => {
    expect(() => {
      calculateExperienceToNextLevel(0);
    }).toThrow('Invalid level');

    expect(() => {
      calculateExperienceToNextLevel(-1);
    }).toThrow('Invalid level');

    expect(() => {
      calculateExperienceToNextLevel(150);
    }).toThrow('exceeds maximum allowed level');
  });

  test('should ensure derived stats have minimum values', () => {
    const characterWithLowStats = {
      ...mockCharacter,
      strength: 1,
      dexterity: 1,
      constitution: 1,
      intelligence: 1,
      wisdom: 1,
      charisma: 1
    };

    const progression = initializeAttributeProgression();
    const derived = calculateDerivedStats(characterWithLowStats, progression);

    // All stats should have minimum values
    expect(derived.attack).toBeGreaterThanOrEqual(1);
    expect(derived.defense).toBeGreaterThanOrEqual(0);
    expect(derived.speed).toBeGreaterThanOrEqual(1);
    expect(derived.maxHealth).toBeGreaterThanOrEqual(1);
    expect(derived.criticalChance).toBeLessThanOrEqual(100);
  });

  test('should handle invalid skill node data', () => {
    const invalidNode = {
      ...combatSkillTree.nodes[0],
      id: '',
      tier: -1
    };

    expect(isSkillNodeUnlocked(invalidNode, [], mockCharacter)).toBe(false);
  });

  test('should validate specialization data', () => {
    const invalidSpecializations = [
      null,
      { id: '', unlockedAtLevel: 'invalid' },
      { id: 'test', unlockedAtLevel: 5 }
    ] as any;

    const available = getAvailableSpecializations(mockCharacter, invalidSpecializations);
    expect(available.length).toBe(1); // Only the valid one
  });

  test('should handle XP overflow correctly', () => {
    const characterWithOverflow = {
      ...mockCharacter,
      level: 2,
      experiencePoints: 175, // 25 XP over the 150 needed for level 3
      experienceToNextLevel: 150
    };

    const leveled = processLevelUp(characterWithOverflow);

    expect(leveled.level).toBe(3);
    expect(leveled.experiencePoints).toBe(25); // Remaining XP after level up
    expect(leveled.experienceToNextLevel).toBe(225); // XP needed for level 4
  });
});
