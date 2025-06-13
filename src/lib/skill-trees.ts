/**
 * Skill Tree Definitions
 * 
 * Predefined skill trees for different character builds and playstyles
 */

import type {
  SkillTree,
  SkillTreeNode,
  SkillTreeLayout,
  SkillTreeConnection,
  SkillNodeEffect,
  CharacterSpecialization,
  TalentNode,
  ProgressionMilestone
} from '@/types/story';

// === COMBAT SKILL TREE ===

export const combatSkillTree: SkillTree = {
  id: 'combat',
  name: 'Combat Mastery',
  description: 'Master the arts of warfare, weapon techniques, and tactical combat.',
  category: 'combat',
  requiredLevel: 1,
  nodes: [
    // Tier 1 - Basic Combat
    {
      id: 'basic_attack',
      name: 'Basic Attack Training',
      description: 'Improves accuracy and damage with basic attacks.',
      icon: 'sword',
      tier: 1,
      cost: 1,
      prerequisites: [],
      effects: [
        { type: 'stat_bonus', value: 2, description: '+2 Attack', target: 'attack' },
        { type: 'stat_bonus', value: 5, description: '+5% Accuracy', target: 'accuracy' }
      ],
      position: { x: 2, y: 1 },
      isUnlocked: false,
      isPurchased: false,
      category: 'combat'
    },
    {
      id: 'weapon_proficiency',
      name: 'Weapon Proficiency',
      description: 'Reduces penalties when using unfamiliar weapons.',
      icon: 'crossed-swords',
      tier: 1,
      cost: 1,
      prerequisites: [],
      effects: [
        { type: 'passive_effect', value: 'weapon_penalty_reduction', description: 'Reduces weapon unfamiliarity penalties by 50%' }
      ],
      position: { x: 1, y: 1 },
      isUnlocked: false,
      isPurchased: false,
      category: 'combat'
    },
    {
      id: 'defensive_stance',
      name: 'Defensive Stance',
      description: 'Learn to adopt a defensive posture in combat.',
      icon: 'shield',
      tier: 1,
      cost: 1,
      prerequisites: [],
      effects: [
        { type: 'stat_bonus', value: 3, description: '+3 Defense', target: 'defense' },
        { type: 'combat_skill', value: 'defensive_stance', description: 'Unlocks Defensive Stance combat action' }
      ],
      position: { x: 3, y: 1 },
      isUnlocked: false,
      isPurchased: false,
      category: 'combat'
    },

    // Tier 2 - Intermediate Combat
    {
      id: 'power_attack',
      name: 'Power Attack',
      description: 'Sacrifice accuracy for devastating damage.',
      icon: 'hammer',
      tier: 2,
      cost: 2,
      prerequisites: ['basic_attack'],
      effects: [
        { type: 'combat_skill', value: 'power_attack', description: 'Unlocks Power Attack: -10% accuracy, +50% damage' }
      ],
      position: { x: 2, y: 2 },
      isUnlocked: false,
      isPurchased: false,
      category: 'combat'
    },
    {
      id: 'dual_wielding',
      name: 'Dual Wielding',
      description: 'Learn to fight with two weapons simultaneously.',
      icon: 'dual-swords',
      tier: 2,
      cost: 3,
      prerequisites: ['weapon_proficiency'],
      effects: [
        { type: 'passive_effect', value: 'dual_wield_enabled', description: 'Can equip weapons in both hands' },
        { type: 'stat_bonus', value: 1, description: '+1 Attack per equipped weapon', target: 'attack' }
      ],
      position: { x: 1, y: 2 },
      isUnlocked: false,
      isPurchased: false,
      category: 'combat'
    },
    {
      id: 'shield_mastery',
      name: 'Shield Mastery',
      description: 'Become proficient with shields and blocking techniques.',
      icon: 'shield-check',
      tier: 2,
      cost: 2,
      prerequisites: ['defensive_stance'],
      effects: [
        { type: 'stat_bonus', value: 5, description: '+5 Defense when using shield', target: 'defense' },
        { type: 'combat_skill', value: 'shield_bash', description: 'Unlocks Shield Bash attack' }
      ],
      position: { x: 3, y: 2 },
      isUnlocked: false,
      isPurchased: false,
      category: 'combat'
    },

    // Tier 3 - Advanced Combat
    {
      id: 'berserker_rage',
      name: 'Berserker Rage',
      description: 'Enter a rage state for increased damage but reduced defense.',
      icon: 'angry',
      tier: 3,
      cost: 3,
      prerequisites: ['power_attack'],
      effects: [
        { type: 'combat_skill', value: 'berserker_rage', description: 'Unlocks Berserker Rage: +100% damage, -50% defense for 3 turns' }
      ],
      position: { x: 2, y: 3 },
      isUnlocked: false,
      isPurchased: false,
      category: 'combat'
    },
    {
      id: 'whirlwind_attack',
      name: 'Whirlwind Attack',
      description: 'Attack all nearby enemies in a spinning motion.',
      icon: 'tornado',
      tier: 3,
      cost: 4,
      prerequisites: ['dual_wielding', 'power_attack'],
      effects: [
        { type: 'combat_skill', value: 'whirlwind', description: 'Unlocks Whirlwind: Attack all adjacent enemies' }
      ],
      position: { x: 1.5, y: 3 },
      isUnlocked: false,
      isPurchased: false,
      category: 'combat'
    },
    {
      id: 'fortress_defense',
      name: 'Fortress Defense',
      description: 'Become an immovable defensive wall.',
      icon: 'castle',
      tier: 3,
      cost: 3,
      prerequisites: ['shield_mastery'],
      effects: [
        { type: 'combat_skill', value: 'fortress_stance', description: 'Unlocks Fortress Stance: Immobile but +200% defense' },
        { type: 'passive_effect', value: 'damage_reduction', description: '10% damage reduction from all sources' }
      ],
      position: { x: 3, y: 3 },
      isUnlocked: false,
      isPurchased: false,
      category: 'combat'
    }
  ],
  layout: {
    width: 4,
    height: 3,
    connections: [
      { fromNodeId: 'basic_attack', toNodeId: 'power_attack', type: 'prerequisite' },
      { fromNodeId: 'weapon_proficiency', toNodeId: 'dual_wielding', type: 'prerequisite' },
      { fromNodeId: 'defensive_stance', toNodeId: 'shield_mastery', type: 'prerequisite' },
      { fromNodeId: 'power_attack', toNodeId: 'berserker_rage', type: 'prerequisite' },
      { fromNodeId: 'dual_wielding', toNodeId: 'whirlwind_attack', type: 'prerequisite' },
      { fromNodeId: 'power_attack', toNodeId: 'whirlwind_attack', type: 'prerequisite' },
      { fromNodeId: 'shield_mastery', toNodeId: 'fortress_defense', type: 'prerequisite' }
    ]
  }
};

// === MAGIC SKILL TREE ===

export const magicSkillTree: SkillTree = {
  id: 'magic',
  name: 'Arcane Arts',
  description: 'Harness the power of magic through study and practice.',
  category: 'magic',
  requiredLevel: 1,
  nodes: [
    // Tier 1 - Basic Magic
    {
      id: 'mana_efficiency',
      name: 'Mana Efficiency',
      description: 'Reduce the mana cost of all spells.',
      icon: 'droplet',
      tier: 1,
      cost: 1,
      prerequisites: [],
      effects: [
        { type: 'passive_effect', value: 'mana_cost_reduction_10', description: '10% reduction in mana costs' },
        { type: 'stat_bonus', value: 10, description: '+10 Max Mana', target: 'maxMana' }
      ],
      position: { x: 2, y: 1 },
      isUnlocked: false,
      isPurchased: false,
      category: 'magic'
    },
    {
      id: 'elemental_affinity',
      name: 'Elemental Affinity',
      description: 'Increase damage with elemental spells.',
      icon: 'flame',
      tier: 1,
      cost: 1,
      prerequisites: [],
      effects: [
        { type: 'passive_effect', value: 'elemental_damage_bonus_15', description: '+15% elemental spell damage' }
      ],
      position: { x: 1, y: 1 },
      isUnlocked: false,
      isPurchased: false,
      category: 'magic'
    },
    {
      id: 'spell_focus',
      name: 'Spell Focus',
      description: 'Improve spell accuracy and reduce casting time.',
      icon: 'target',
      tier: 1,
      cost: 1,
      prerequisites: [],
      effects: [
        { type: 'stat_bonus', value: 10, description: '+10% Spell Accuracy', target: 'accuracy' },
        { type: 'passive_effect', value: 'cast_time_reduction', description: '25% faster spell casting' }
      ],
      position: { x: 3, y: 1 },
      isUnlocked: false,
      isPurchased: false,
      category: 'magic'
    },

    // Tier 2 - Intermediate Magic
    {
      id: 'metamagic',
      name: 'Metamagic',
      description: 'Modify spells with additional effects.',
      icon: 'wand',
      tier: 2,
      cost: 2,
      prerequisites: ['mana_efficiency'],
      effects: [
        { type: 'passive_effect', value: 'metamagic_enabled', description: 'Can apply metamagic effects to spells' }
      ],
      position: { x: 2, y: 2 },
      isUnlocked: false,
      isPurchased: false,
      category: 'magic'
    },
    {
      id: 'elemental_mastery',
      name: 'Elemental Mastery',
      description: 'Master control over elemental forces.',
      icon: 'elements',
      tier: 2,
      cost: 3,
      prerequisites: ['elemental_affinity'],
      effects: [
        { type: 'combat_skill', value: 'elemental_burst', description: 'Unlocks Elemental Burst area attack' },
        { type: 'passive_effect', value: 'elemental_resistance_25', description: '25% resistance to elemental damage' }
      ],
      position: { x: 1, y: 2 },
      isUnlocked: false,
      isPurchased: false,
      category: 'magic'
    },
    {
      id: 'spell_penetration',
      name: 'Spell Penetration',
      description: 'Spells bypass magical defenses more effectively.',
      icon: 'arrow-through',
      tier: 2,
      cost: 2,
      prerequisites: ['spell_focus'],
      effects: [
        { type: 'passive_effect', value: 'magic_resistance_ignore_50', description: 'Ignore 50% of target\'s magic resistance' }
      ],
      position: { x: 3, y: 2 },
      isUnlocked: false,
      isPurchased: false,
      category: 'magic'
    }
  ],
  layout: {
    width: 4,
    height: 2,
    connections: [
      { fromNodeId: 'mana_efficiency', toNodeId: 'metamagic', type: 'prerequisite' },
      { fromNodeId: 'elemental_affinity', toNodeId: 'elemental_mastery', type: 'prerequisite' },
      { fromNodeId: 'spell_focus', toNodeId: 'spell_penetration', type: 'prerequisite' }
    ]
  }
};

// === CRAFTING SKILL TREE ===

export const craftingSkillTree: SkillTree = {
  id: 'crafting',
  name: 'Crafting Mastery',
  description: 'Master the arts of creation, enhancement, and item maintenance.',
  category: 'crafting',
  requiredLevel: 1,
  nodes: [
    // Tier 1 - Basic Crafting
    {
      id: 'smithing_basics',
      name: 'Basic Smithing',
      description: 'Learn the fundamentals of metalworking and weapon crafting.',
      icon: 'hammer',
      tier: 1,
      cost: 1,
      prerequisites: [],
      effects: [
        { type: 'stat_bonus', value: 10, description: '+10% Smithing Success Rate', target: 'smithing_success' },
        { type: 'ability_unlock', value: 'basic_smithing', description: 'Unlock basic smithing recipes', target: 'recipes' }
      ],
      position: { x: 1, y: 1 },
      isUnlocked: false,
      isPurchased: false,
      category: 'crafting'
    },
    {
      id: 'alchemy_basics',
      name: 'Basic Alchemy',
      description: 'Learn to brew potions and create magical compounds.',
      icon: 'flask',
      tier: 1,
      cost: 1,
      prerequisites: [],
      effects: [
        { type: 'stat_bonus', value: 10, description: '+10% Alchemy Success Rate', target: 'alchemy_success' },
        { type: 'ability_unlock', value: 'basic_alchemy', description: 'Unlock basic alchemy recipes', target: 'recipes' }
      ],
      position: { x: 3, y: 1 },
      isUnlocked: false,
      isPurchased: false,
      category: 'crafting'
    },
    {
      id: 'enchanting_basics',
      name: 'Basic Enchanting',
      description: 'Learn to imbue items with magical properties.',
      icon: 'sparkles',
      tier: 1,
      cost: 1,
      prerequisites: [],
      effects: [
        { type: 'stat_bonus', value: 10, description: '+10% Enchanting Success Rate', target: 'enchanting_success' },
        { type: 'ability_unlock', value: 'basic_enchanting', description: 'Unlock basic enchanting recipes', target: 'recipes' }
      ],
      position: { x: 5, y: 1 },
      isUnlocked: false,
      isPurchased: false,
      category: 'crafting'
    },

    // Tier 2 - Advanced Crafting
    {
      id: 'advanced_smithing',
      name: 'Advanced Smithing',
      description: 'Master advanced metalworking techniques.',
      icon: 'anvil',
      tier: 2,
      cost: 2,
      prerequisites: ['smithing_basics'],
      effects: [
        { type: 'stat_bonus', value: 15, description: '+15% Smithing Success Rate', target: 'smithing_success' },
        { type: 'stat_bonus', value: 10, description: '+10% Quality Chance', target: 'smithing_quality' },
        { type: 'ability_unlock', value: 'advanced_smithing', description: 'Unlock advanced smithing recipes', target: 'recipes' }
      ],
      position: { x: 1, y: 2 },
      isUnlocked: false,
      isPurchased: false,
      category: 'crafting'
    },
    {
      id: 'repair_basics',
      name: 'Item Repair',
      description: 'Learn to repair and maintain equipment.',
      icon: 'wrench',
      tier: 2,
      cost: 1,
      prerequisites: ['smithing_basics'],
      effects: [
        { type: 'stat_bonus', value: 20, description: '+20% Repair Success Rate', target: 'repair_success' },
        { type: 'stat_bonus', value: 15, description: '-15% Repair Material Cost', target: 'repair_efficiency' }
      ],
      position: { x: 2, y: 2 },
      isUnlocked: false,
      isPurchased: false,
      category: 'crafting'
    },
    {
      id: 'enhancement_basics',
      name: 'Item Enhancement',
      description: 'Learn to enhance equipment with magical stones.',
      icon: 'gem',
      tier: 2,
      cost: 2,
      prerequisites: ['enchanting_basics'],
      effects: [
        { type: 'stat_bonus', value: 15, description: '+15% Enhancement Success Rate', target: 'enhancement_success' },
        { type: 'stat_bonus', value: 10, description: '-10% Enhancement Failure Risk', target: 'enhancement_safety' }
      ],
      position: { x: 4, y: 2 },
      isUnlocked: false,
      isPurchased: false,
      category: 'crafting'
    }
  ],
  layout: {
    width: 6,
    height: 3,
    connections: [
      { fromNodeId: 'smithing_basics', toNodeId: 'advanced_smithing', type: 'prerequisite' },
      { fromNodeId: 'smithing_basics', toNodeId: 'repair_basics', type: 'prerequisite' },
      { fromNodeId: 'enchanting_basics', toNodeId: 'enhancement_basics', type: 'prerequisite' }
    ]
  }
};

// === DEFAULT SKILL TREES ===

export const defaultSkillTrees: SkillTree[] = [
  combatSkillTree,
  magicSkillTree,
  craftingSkillTree
];

// Validate skill trees on module load (development only)
if (process.env.NODE_ENV === 'development') {
  defaultSkillTrees.forEach(tree => {
    const errors = validateSkillTree(tree);
    if (errors.length > 0) {
      console.error(`Skill tree validation errors for ${tree.id}:`, errors);
    }
  });
}

// === SPECIALIZATIONS ===

export const defaultSpecializations: CharacterSpecialization[] = [
  {
    id: 'warrior_berserker',
    name: 'Berserker',
    description: 'A fierce warrior who channels rage into devastating attacks.',
    category: 'combat',
    unlockedAtLevel: 5,
    bonuses: [
      {
        type: 'stat_multiplier',
        value: 1.2,
        description: '+20% Attack when below 50% health',
        appliesAtLevel: 1
      },
      {
        type: 'skill_cost_reduction',
        value: 1,
        description: 'Combat skills cost 1 less point',
        appliesAtLevel: 3
      }
    ],
    exclusiveWith: ['warrior_guardian'],
    isActive: false,
    progressionLevel: 0
  },
  {
    id: 'warrior_guardian',
    name: 'Guardian',
    description: 'A defensive specialist who protects allies and controls the battlefield.',
    category: 'combat',
    unlockedAtLevel: 5,
    bonuses: [
      {
        type: 'stat_multiplier',
        value: 1.3,
        description: '+30% Defense when protecting allies',
        appliesAtLevel: 1
      },
      {
        type: 'unique_ability',
        value: 'taunt',
        description: 'Can force enemies to attack you',
        appliesAtLevel: 2
      }
    ],
    exclusiveWith: ['warrior_berserker'],
    isActive: false,
    progressionLevel: 0
  },
  {
    id: 'mage_elementalist',
    name: 'Elementalist',
    description: 'A mage who specializes in elemental magic and area effects.',
    category: 'magic',
    unlockedAtLevel: 5,
    bonuses: [
      {
        type: 'stat_multiplier',
        value: 1.5,
        description: '+50% elemental spell damage',
        appliesAtLevel: 1
      },
      {
        type: 'resource_bonus',
        value: 20,
        description: '+20 Max Mana',
        appliesAtLevel: 2
      }
    ],
    exclusiveWith: ['mage_enchanter'],
    isActive: false,
    progressionLevel: 0
  }
];

export function getSkillTreeById(id: string): SkillTree | undefined {
  if (!id || typeof id !== 'string') {
    console.warn('Invalid skill tree ID:', id);
    return undefined;
  }
  return defaultSkillTrees.find(tree => tree && tree.id === id);
}

export function getSpecializationById(id: string): CharacterSpecialization | undefined {
  if (!id || typeof id !== 'string') {
    console.warn('Invalid specialization ID:', id);
    return undefined;
  }
  return defaultSpecializations.find(spec => spec && spec.id === id);
}

// Validation function for skill trees
export function validateSkillTree(skillTree: SkillTree): string[] {
  const errors: string[] = [];

  if (!skillTree.id) {
    errors.push('Skill tree missing ID');
  }

  if (!skillTree.nodes || !Array.isArray(skillTree.nodes)) {
    errors.push('Skill tree missing or invalid nodes array');
    return errors;
  }

  // Check for duplicate node IDs
  const nodeIds = new Set<string>();
  skillTree.nodes.forEach((node, index) => {
    if (!node.id) {
      errors.push(`Node at index ${index} missing ID`);
    } else if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    } else {
      nodeIds.add(node.id);
    }

    // Validate node position is within layout bounds
    if (skillTree.layout) {
      if (node.position.x < 1 || node.position.x > skillTree.layout.width) {
        errors.push(`Node ${node.id} position.x (${node.position.x}) outside layout width (${skillTree.layout.width})`);
      }
      if (node.position.y < 1 || node.position.y > skillTree.layout.height) {
        errors.push(`Node ${node.id} position.y (${node.position.y}) outside layout height (${skillTree.layout.height})`);
      }
    }

    // Validate prerequisites exist
    if (node.prerequisites) {
      node.prerequisites.forEach(prereqId => {
        if (!skillTree.nodes.some(n => n.id === prereqId)) {
          errors.push(`Node ${node.id} has invalid prerequisite: ${prereqId}`);
        }
      });
    }

    // Validate cost is positive
    if (node.cost < 0) {
      errors.push(`Node ${node.id} has negative cost: ${node.cost}`);
    }
  });

  return errors;
}
