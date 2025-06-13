/**
 * Predefined Item Sets, Synergies, and Equipment Data
 * 
 * Contains example configurations for:
 * - Equipment sets with progressive bonuses
 * - Item synergies between different equipment pieces
 * - Crafting recipes for various item categories
 * - Crafting stations and their specializations
 */

import type {
  ItemSetBonus,
  ItemSynergy,
  CraftingRecipe,
  CraftingStation,
  ConditionalBonus
} from '@/types/story';

// === EQUIPMENT SETS ===

export const EQUIPMENT_SETS: ItemSetBonus[] = [
  // Warrior's Valor Set
  {
    setId: 'warriors_valor',
    setName: "Warrior's Valor",
    requiredPieces: 2,
    bonusEffects: [
      {
        id: 'warriors_valor_2pc',
        name: 'Warrior\'s Strength',
        description: '+5 Attack, +3 Defense',
        type: 'stat_modifier',
        duration: 'permanent_while_equipped',
        statModifiers: [
          { stat: 'attack', value: 5, type: 'add', description: '+5 Attack from Warrior\'s Valor (2pc)' },
          { stat: 'defense', value: 3, type: 'add', description: '+3 Defense from Warrior\'s Valor (2pc)' }
        ]
      }
    ],
    description: 'Increases combat prowess for dedicated warriors'
  },
  {
    setId: 'warriors_valor',
    setName: "Warrior's Valor",
    requiredPieces: 4,
    bonusEffects: [
      {
        id: 'warriors_valor_4pc',
        name: 'Warrior\'s Resilience',
        description: '+10 Max Health, +5% Critical Chance',
        type: 'stat_modifier',
        duration: 'permanent_while_equipped',
        statModifiers: [
          { stat: 'maxHealth', value: 10, type: 'add', description: '+10 Max Health from Warrior\'s Valor (4pc)' },
          { stat: 'criticalChance', value: 5, type: 'add', description: '+5% Critical Chance from Warrior\'s Valor (4pc)' }
        ]
      }
    ],
    description: 'Grants exceptional durability and precision in combat'
  },
  
  // Mage's Wisdom Set
  {
    setId: 'mages_wisdom',
    setName: "Mage's Wisdom",
    requiredPieces: 2,
    bonusEffects: [
      {
        id: 'mages_wisdom_2pc',
        name: 'Arcane Knowledge',
        description: '+8 Intelligence, +15 Max Mana',
        type: 'stat_modifier',
        duration: 'permanent_while_equipped',
        statModifiers: [
          { stat: 'intelligence', value: 8, type: 'add', description: '+8 Intelligence from Mage\'s Wisdom (2pc)' },
          { stat: 'maxMana', value: 15, type: 'add', description: '+15 Max Mana from Mage\'s Wisdom (2pc)' }
        ]
      }
    ],
    description: 'Enhances magical abilities and mana reserves'
  },
  {
    setId: 'mages_wisdom',
    setName: "Mage's Wisdom",
    requiredPieces: 3,
    bonusEffects: [
      {
        id: 'mages_wisdom_3pc',
        name: 'Mana Efficiency',
        description: 'Spells cost 15% less mana',
        type: 'special_effect',
        duration: 'permanent_while_equipped',
        statModifiers: [
          { stat: 'manaEfficiency', value: 15, type: 'add', description: '15% Mana Cost Reduction from Mage\'s Wisdom (3pc)' }
        ]
      }
    ],
    description: 'Reduces the mana cost of all magical abilities'
  },
  
  // Shadow Walker Set
  {
    setId: 'shadow_walker',
    setName: 'Shadow Walker',
    requiredPieces: 2,
    bonusEffects: [
      {
        id: 'shadow_walker_2pc',
        name: 'Silent Steps',
        description: '+10 Dexterity, +8% Evasion',
        type: 'stat_modifier',
        duration: 'permanent_while_equipped',
        statModifiers: [
          { stat: 'dexterity', value: 10, type: 'add', description: '+10 Dexterity from Shadow Walker (2pc)' },
          { stat: 'evasion', value: 8, type: 'add', description: '+8% Evasion from Shadow Walker (2pc)' }
        ]
      }
    ],
    description: 'Enhances stealth and agility for rogues and scouts'
  },
  {
    setId: 'shadow_walker',
    setName: 'Shadow Walker',
    requiredPieces: 4,
    bonusEffects: [
      {
        id: 'shadow_walker_4pc',
        name: 'Shadow Strike',
        description: 'Critical hits have 25% chance to grant invisibility for 3 seconds',
        type: 'special_effect',
        duration: 'permanent_while_equipped',
        statModifiers: []
      }
    ],
    description: 'Grants the ability to become invisible after critical strikes'
  }
];

// === ITEM SYNERGIES ===

export const ITEM_SYNERGIES: ItemSynergy[] = [
  {
    id: 'sword_and_board',
    name: 'Sword and Board',
    description: 'Wielding a sword with a shield provides defensive bonuses',
    requiredItems: ['iron_sword', 'steel_shield'], // Example item IDs
    synergyEffects: [
      {
        id: 'sword_board_synergy',
        name: 'Defensive Stance',
        description: '+3 Defense, +5% Block Chance',
        type: 'stat_modifier',
        duration: 'permanent_while_equipped',
        statModifiers: [
          { stat: 'defense', value: 3, type: 'add', description: '+3 Defense from Sword and Board synergy' },
          { stat: 'blockChance', value: 5, type: 'add', description: '+5% Block Chance from Sword and Board synergy' }
        ]
      }
    ],
    conditionalBonuses: [
      {
        condition: 'in_combat',
        effects: [
          {
            id: 'combat_defense_bonus',
            name: 'Combat Readiness',
            description: 'Additional defense while in combat',
            type: 'stat_modifier',
            duration: 'permanent_while_equipped',
            statModifiers: [
              { stat: 'defense', value: 2, type: 'add', description: '+2 Defense while in combat' }
            ]
          }
        ],
        description: 'Grants additional defense while actively fighting'
      }
    ]
  },
  
  {
    id: 'dual_wield_mastery',
    name: 'Dual Wield Mastery',
    description: 'Wielding two weapons increases attack speed and critical chance',
    requiredItems: ['curved_dagger', 'throwing_knife'], // Example item IDs
    synergyEffects: [
      {
        id: 'dual_wield_synergy',
        name: 'Twin Strikes',
        description: '+15% Attack Speed, +8% Critical Chance',
        type: 'stat_modifier',
        duration: 'permanent_while_equipped',
        statModifiers: [
          { stat: 'attackSpeed', value: 15, type: 'add', description: '+15% Attack Speed from Dual Wield' },
          { stat: 'criticalChance', value: 8, type: 'add', description: '+8% Critical Chance from Dual Wield' }
        ]
      }
    ],
    conditionalBonuses: [
      {
        condition: 'low_health',
        threshold: 30,
        effects: [
          {
            id: 'desperate_strikes',
            name: 'Desperate Strikes',
            description: 'Increased damage when health is low',
            type: 'stat_modifier',
            duration: 'permanent_while_equipped',
            statModifiers: [
              { stat: 'attack', value: 5, type: 'add', description: '+5 Attack when health below 30%' }
            ]
          }
        ],
        description: 'Desperation fuels more aggressive attacks'
      }
    ]
  },
  
  {
    id: 'mage_focus',
    name: 'Arcane Focus',
    description: 'Staff and orb combination enhances magical abilities',
    requiredItems: ['wizard_staff', 'crystal_orb'], // Example item IDs
    synergyEffects: [
      {
        id: 'arcane_focus_synergy',
        name: 'Magical Resonance',
        description: '+12 Intelligence, +20 Max Mana, +10% Spell Damage',
        type: 'stat_modifier',
        duration: 'permanent_while_equipped',
        statModifiers: [
          { stat: 'intelligence', value: 12, type: 'add', description: '+12 Intelligence from Arcane Focus' },
          { stat: 'maxMana', value: 20, type: 'add', description: '+20 Max Mana from Arcane Focus' },
          { stat: 'spellDamage', value: 10, type: 'add', description: '+10% Spell Damage from Arcane Focus' }
        ]
      }
    ],
    conditionalBonuses: [
      {
        condition: 'high_mana',
        threshold: 80,
        effects: [
          {
            id: 'mana_overflow',
            name: 'Mana Overflow',
            description: 'Spells have chance to not consume mana',
            type: 'special_effect',
            duration: 'permanent_while_equipped',
            statModifiers: [
              { stat: 'manaConservation', value: 15, type: 'add', description: '15% chance spells cost no mana' }
            ]
          }
        ],
        description: 'High mana reserves occasionally prevent mana consumption'
      }
    ]
  }
];

// === CRAFTING STATIONS ===

export const CRAFTING_STATIONS: CraftingStation[] = [
  {
    id: 'basic_smithy',
    name: 'Basic Smithy',
    description: 'A simple forge for basic metalworking and weapon crafting',
    type: 'smithy',
    level: 1,
    availableRecipes: ['iron_sword', 'steel_dagger', 'chain_mail'],
    bonuses: [
      {
        type: 'success_rate',
        value: 10,
        description: '+10% success rate for smithing recipes'
      }
    ],
    requirements: [
      { skillId: 'smithing', level: 1 }
    ],
    owned: false,
    upgradeCost: [
      { itemId: 'iron_ingot', quantity: 5 },
      { itemId: 'coal', quantity: 10 }
    ]
  },
  
  {
    id: 'advanced_smithy',
    name: 'Master Forge',
    description: 'An advanced forge capable of creating masterwork weapons and armor',
    type: 'smithy',
    level: 3,
    availableRecipes: ['mithril_sword', 'dragon_scale_armor', 'enchanted_shield'],
    bonuses: [
      {
        type: 'success_rate',
        value: 25,
        description: '+25% success rate for smithing recipes'
      },
      {
        type: 'quality_chance',
        value: 15,
        description: '+15% chance for higher quality items'
      },
      {
        type: 'material_efficiency',
        value: 10,
        description: '10% chance to save materials'
      }
    ],
    requirements: [
      { skillId: 'smithing', level: 10 }
    ],
    owned: false,
    upgradeCost: [
      { itemId: 'mithril_ingot', quantity: 3 },
      { itemId: 'dragon_fire_crystal', quantity: 1 }
    ]
  },
  
  {
    id: 'alchemy_lab',
    name: 'Alchemist\'s Laboratory',
    description: 'A well-equipped laboratory for brewing potions and creating magical compounds',
    type: 'alchemy_lab',
    level: 2,
    availableRecipes: ['health_potion', 'mana_potion', 'strength_elixir', 'poison_antidote'],
    bonuses: [
      {
        type: 'success_rate',
        value: 20,
        description: '+20% success rate for alchemy recipes'
      },
      {
        type: 'experience',
        value: 25,
        description: '+25% experience from alchemy'
      }
    ],
    requirements: [
      { skillId: 'alchemy', level: 5 }
    ],
    owned: false,
    upgradeCost: [
      { itemId: 'glass_vial', quantity: 20 },
      { itemId: 'rare_herbs', quantity: 10 }
    ]
  },
  
  {
    id: 'enchanting_table',
    name: 'Arcane Enchanting Table',
    description: 'A mystical table infused with magical energies for item enchantment',
    type: 'enchanting_table',
    level: 2,
    availableRecipes: ['weapon_sharpness_enchant', 'armor_protection_enchant', 'ring_wisdom_enchant'],
    bonuses: [
      {
        type: 'success_rate',
        value: 15,
        description: '+15% success rate for enchanting'
      },
      {
        type: 'quality_chance',
        value: 20,
        description: '+20% chance for stronger enchantments'
      }
    ],
    requirements: [
      { skillId: 'enchanting', level: 3 }
    ],
    owned: false,
    upgradeCost: [
      { itemId: 'arcane_crystal', quantity: 5 },
      { itemId: 'enchanted_dust', quantity: 15 }
    ]
  }
];

// === SAMPLE CRAFTING RECIPES ===

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'iron_sword',
    name: 'Iron Sword',
    description: 'A sturdy sword forged from iron, reliable in combat',
    category: 'smithing',
    ingredients: [
      { itemId: 'iron_ingot', quantity: 3 },
      { itemId: 'wood_handle', quantity: 1 },
      { itemId: 'leather_wrap', quantity: 1 }
    ],
    outputItemId: 'iron_sword',
    outputQuantity: 1,
    requiredSkill: { skillId: 'smithing', level: 2 },
    requiredStation: 'basic_smithy',
    craftingTime: 300, // 5 minutes
    baseSuccessRate: 80,
    experienceGained: 25,
    discovered: true
  },
  
  {
    id: 'health_potion',
    name: 'Health Potion',
    description: 'A red potion that restores health when consumed',
    category: 'alchemy',
    ingredients: [
      { itemId: 'red_herb', quantity: 2 },
      { itemId: 'spring_water', quantity: 1 },
      { itemId: 'glass_vial', quantity: 1 }
    ],
    outputItemId: 'health_potion',
    outputQuantity: 1,
    requiredSkill: { skillId: 'alchemy', level: 1 },
    requiredStation: 'alchemy_lab',
    craftingTime: 120, // 2 minutes
    baseSuccessRate: 90,
    experienceGained: 15,
    discovered: true
  },
  
  {
    id: 'mithril_sword',
    name: 'Mithril Sword',
    description: 'An exceptional sword forged from rare mithril, light yet incredibly strong',
    category: 'smithing',
    ingredients: [
      { itemId: 'mithril_ingot', quantity: 2 },
      { itemId: 'enchanted_wood', quantity: 1 },
      { itemId: 'dragon_leather', quantity: 1 },
      { itemId: 'sapphire_gem', quantity: 1 }
    ],
    outputItemId: 'mithril_sword',
    outputQuantity: 1,
    requiredSkill: { skillId: 'smithing', level: 15 },
    requiredStation: 'advanced_smithy',
    craftingTime: 1800, // 30 minutes
    baseSuccessRate: 60,
    experienceGained: 100,
    discovered: false,
    teacherNPC: 'master_smith_gareth',
    unlockConditions: ['complete_quest_ancient_techniques', 'find_mithril_ore']
  },
  
  {
    id: 'weapon_sharpness_enchant',
    name: 'Weapon Sharpness Enchantment',
    description: 'An enchantment that increases weapon damage',
    category: 'enchanting',
    ingredients: [
      { itemId: 'enchanted_dust', quantity: 3 },
      { itemId: 'ruby_gem', quantity: 1 },
      { itemId: 'monster_essence', quantity: 2 }
    ],
    outputItemId: 'sharpness_enchant_scroll',
    outputQuantity: 1,
    requiredSkill: { skillId: 'enchanting', level: 5 },
    requiredStation: 'enchanting_table',
    craftingTime: 600, // 10 minutes
    baseSuccessRate: 70,
    experienceGained: 40,
    discovered: false,
    unlockConditions: ['learn_basic_enchanting', 'enchant_10_items']
  }
];
