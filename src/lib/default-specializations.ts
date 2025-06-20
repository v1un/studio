/**
 * Default Specialization Trees and Unique Abilities
 * 
 * Predefined specialization trees for different categories and series-specific
 * unique abilities including "Return by Death".
 */

import type {
  SpecializationTree,
  SpecializationNode,
  SpecializationBonus,
  UniqueAbility,
  ReturnByDeathAbility,
  SpecializationCategory
} from '@/types/story';
import { createReturnByDeathAbility } from '@/lib/return-by-death-engine';

// === COMBAT SPECIALIZATION TREES ===

export const combatSpecializationTrees: SpecializationTree[] = [
  {
    id: 'berserker_path',
    name: 'Berserker\'s Fury',
    description: 'Channel rage and pain into devastating attacks. The lower your health, the stronger you become.',
    category: 'combat',
    
    nodes: [
      {
        id: 'rage_initiation',
        name: 'Rage Initiation',
        description: 'Learn to channel anger into combat prowess.',
        tier: 1,
        position: { x: 2, y: 1 },
        pointCost: 1,
        prerequisites: [],
        bonuses: [
          {
            type: 'stat_multiplier',
            value: 1.1,
            description: '+10% attack when below 75% health',
            appliesAtLevel: 1,
            conditions: [
              {
                type: 'health_threshold',
                target: 'health_percentage',
                value: 75,
                operator: 'less_than'
              }
            ]
          }
        ],
        isUnlocked: true,
        isPurchased: false,
        icon: 'sword',
        color: '#ff4444'
      },
      {
        id: 'berserker_resilience',
        name: 'Berserker Resilience',
        description: 'Pain fuels your determination to fight.',
        tier: 2,
        position: { x: 2, y: 2 },
        pointCost: 2,
        prerequisites: ['rage_initiation'],
        bonuses: [
          {
            type: 'stat_multiplier',
            value: 1.2,
            description: '+20% attack when below 50% health',
            appliesAtLevel: 1,
            conditions: [
              {
                type: 'health_threshold',
                target: 'health_percentage',
                value: 50,
                operator: 'less_than'
              }
            ]
          },
          {
            type: 'resource_bonus',
            value: 5,
            description: '+5 health regeneration per turn when in combat',
            appliesAtLevel: 1
          }
        ],
        isUnlocked: false,
        isPurchased: false,
        icon: 'heart',
        color: '#ff6666'
      },
      {
        id: 'unstoppable_fury',
        name: 'Unstoppable Fury',
        description: 'At death\'s door, become an unstoppable force.',
        tier: 3,
        position: { x: 2, y: 3 },
        pointCost: 3,
        prerequisites: ['berserker_resilience'],
        bonuses: [
          {
            type: 'stat_multiplier',
            value: 1.5,
            description: '+50% attack when below 25% health',
            appliesAtLevel: 1,
            conditions: [
              {
                type: 'health_threshold',
                target: 'health_percentage',
                value: 25,
                operator: 'less_than'
              }
            ]
          },
          {
            type: 'unique_ability',
            value: 'berserker_last_stand',
            description: 'Gain "Last Stand" ability - become immune to death for 3 turns when health reaches 1',
            appliesAtLevel: 1
          }
        ],
        isUnlocked: false,
        isPurchased: false,
        icon: 'skull',
        color: '#ff0000'
      }
    ],
    
    connections: [
      {
        fromNodeId: 'rage_initiation',
        toNodeId: 'berserker_resilience',
        type: 'prerequisite'
      },
      {
        fromNodeId: 'berserker_resilience',
        toNodeId: 'unstoppable_fury',
        type: 'prerequisite'
      }
    ],
    
    tiers: [
      {
        tier: 1,
        name: 'Initiate',
        description: 'Begin the path of the berserker',
        requiredPoints: 0
      },
      {
        tier: 2,
        name: 'Warrior',
        description: 'Embrace pain as strength',
        requiredPoints: 1
      },
      {
        tier: 3,
        name: 'Berserker',
        description: 'Master of fury and resilience',
        requiredPoints: 3
      }
    ],
    
    unlockRequirements: [
      {
        type: 'level',
        target: 'character_level',
        value: 3,
        description: 'Requires character level 3'
      },
      {
        type: 'attribute',
        target: 'strength',
        value: 12,
        description: 'Requires 12 Strength'
      }
    ],
    
    maxPoints: 6,
    pointsSpent: 0,
    completionBonuses: [
      {
        type: 'stat_multiplier',
        value: 1.1,
        description: '+10% maximum health',
        appliesAtLevel: 1
      }
    ]
  }
];

// === MAGIC SPECIALIZATION TREES ===

export const magicSpecializationTrees: SpecializationTree[] = [
  {
    id: 'elemental_mastery',
    name: 'Elemental Mastery',
    description: 'Master the fundamental forces of fire, ice, and lightning.',
    category: 'magic',
    
    nodes: [
      {
        id: 'elemental_affinity',
        name: 'Elemental Affinity',
        description: 'Develop a connection to elemental forces.',
        tier: 1,
        position: { x: 2, y: 1 },
        pointCost: 1,
        prerequisites: [],
        bonuses: [
          {
            type: 'resource_bonus',
            value: 10,
            description: '+10 maximum mana',
            appliesAtLevel: 1
          },
          {
            type: 'skill_cost_reduction',
            value: 1,
            description: 'Elemental spells cost 1 less mana',
            appliesAtLevel: 1
          }
        ],
        isUnlocked: true,
        isPurchased: false,
        icon: 'flame',
        color: '#4488ff'
      },
      {
        id: 'dual_element',
        name: 'Dual Element Casting',
        description: 'Combine two elements for enhanced effects.',
        tier: 2,
        position: { x: 2, y: 2 },
        pointCost: 2,
        prerequisites: ['elemental_affinity'],
        bonuses: [
          {
            type: 'unique_ability',
            value: 'dual_element_fusion',
            description: 'Can combine fire+ice, fire+lightning, or ice+lightning for unique effects',
            appliesAtLevel: 1
          }
        ],
        isUnlocked: false,
        isPurchased: false,
        icon: 'zap',
        color: '#6644ff'
      }
    ],
    
    connections: [
      {
        fromNodeId: 'elemental_affinity',
        toNodeId: 'dual_element',
        type: 'prerequisite'
      }
    ],
    
    tiers: [
      {
        tier: 1,
        name: 'Apprentice',
        description: 'Basic elemental understanding',
        requiredPoints: 0
      },
      {
        tier: 2,
        name: 'Elementalist',
        description: 'Advanced elemental manipulation',
        requiredPoints: 1
      }
    ],
    
    unlockRequirements: [
      {
        type: 'attribute',
        target: 'intelligence',
        value: 14,
        description: 'Requires 14 Intelligence'
      }
    ],
    
    maxPoints: 8,
    pointsSpent: 0,
    completionBonuses: []
  }
];

// === SOCIAL SPECIALIZATION TREES ===

export const socialSpecializationTrees: SpecializationTree[] = [
  {
    id: 'diplomatic_influence',
    name: 'Diplomatic Influence',
    description: 'Master the arts of persuasion, negotiation, and social manipulation.',
    category: 'social',
    
    nodes: [
      {
        id: 'silver_tongue',
        name: 'Silver Tongue',
        description: 'Your words carry weight and influence.',
        tier: 1,
        position: { x: 2, y: 1 },
        pointCost: 1,
        prerequisites: [],
        bonuses: [
          {
            type: 'narrative_influence',
            value: 15,
            description: '+15% success chance on persuasion attempts',
            appliesAtLevel: 1
          }
        ],
        isUnlocked: true,
        isPurchased: false,
        icon: 'message-circle',
        color: '#44ff88'
      }
    ],
    
    connections: [],
    
    tiers: [
      {
        tier: 1,
        name: 'Smooth Talker',
        description: 'Basic social skills',
        requiredPoints: 0
      }
    ],
    
    unlockRequirements: [
      {
        type: 'attribute',
        target: 'charisma',
        value: 13,
        description: 'Requires 13 Charisma'
      }
    ],
    
    maxPoints: 5,
    pointsSpent: 0,
    completionBonuses: []
  }
];

// === UNIQUE SPECIALIZATION TREES (SERIES-SPECIFIC) ===

export const uniqueSpecializationTrees: SpecializationTree[] = [
  {
    id: 'temporal_manipulation',
    name: 'Temporal Manipulation',
    description: 'Harness the power over time itself. Extremely rare and dangerous.',
    category: 'unique',
    seriesOrigin: 'Re:Zero',
    
    nodes: [
      {
        id: 'time_awareness',
        name: 'Temporal Awareness',
        description: 'Develop sensitivity to temporal disturbances and loops.',
        tier: 1,
        position: { x: 2, y: 1 },
        pointCost: 3,
        prerequisites: [],
        bonuses: [
          {
            type: 'unique_ability',
            value: 'detect_temporal_anomalies',
            description: 'Can sense when time has been manipulated or reset',
            appliesAtLevel: 1
          }
        ],
        isUnlocked: false,
        isPurchased: false,
        icon: 'clock',
        color: '#8844ff'
      },
      {
        id: 'return_by_death_mastery',
        name: 'Return by Death Mastery',
        description: 'Better control and understanding of the Return by Death ability.',
        tier: 2,
        position: { x: 2, y: 2 },
        pointCost: 5,
        prerequisites: ['time_awareness'],
        bonuses: [
          {
            type: 'unique_ability',
            value: 'enhanced_memory_retention',
            description: 'Retain more memories and details across loops',
            appliesAtLevel: 1
          },
          {
            type: 'unique_ability',
            value: 'psychological_resilience',
            description: 'Reduced psychological impact from deaths and loops',
            appliesAtLevel: 1
          }
        ],
        isUnlocked: false,
        isPurchased: false,
        icon: 'refresh-cw',
        color: '#aa44ff'
      }
    ],
    
    connections: [
      {
        fromNodeId: 'time_awareness',
        toNodeId: 'return_by_death_mastery',
        type: 'prerequisite'
      }
    ],
    
    tiers: [
      {
        tier: 1,
        name: 'Time Sensitive',
        description: 'Basic temporal awareness',
        requiredPoints: 0
      },
      {
        tier: 2,
        name: 'Loop Master',
        description: 'Advanced temporal manipulation',
        requiredPoints: 3
      }
    ],
    
    unlockRequirements: [
      {
        type: 'story_event',
        target: 'first_death',
        value: 'completed',
        description: 'Must have experienced death and Return by Death'
      }
    ],
    
    exclusiveWith: ['normal_progression'], // Cannot take normal progression paths
    
    maxPoints: 15,
    pointsSpent: 0,
    completionBonuses: [
      {
        type: 'unique_ability',
        value: 'temporal_mastery',
        description: 'Gain limited control over when Return by Death activates',
        appliesAtLevel: 1
      }
    ]
  }
];

// === UNIQUE ABILITIES ===

export const defaultUniqueAbilities: UniqueAbility[] = [
  {
    id: 'berserker_last_stand',
    name: 'Last Stand',
    description: 'When reduced to 1 health, become immune to death for 3 turns.',
    category: 'death_defiance',
    rarity: 'epic',
    seriesOrigin: 'Generic',
    
    powerLevel: 60,
    
    balanceMechanisms: [
      {
        type: 'cooldown',
        severity: 'major',
        description: 'Can only be used once per combat encounter',
        mechanicalEffect: 'Long cooldown prevents abuse'
      }
    ],
    
    activationConditions: [
      {
        type: 'automatic',
        description: 'Automatically activates when health reaches 1',
        isControllable: false
      }
    ],
    
    cooldownInfo: {
      type: 'turns',
      duration: 10,
      description: 'Cannot be used again for 10 turns',
      canBeReduced: true,
      reductionMethods: ['Rest', 'Healing items', 'Story events']
    },
    
    costs: [],
    
    effects: [
      {
        type: 'character_modification',
        scope: 'self',
        description: 'Become immune to death for 3 turns',
        mechanicalImplementation: 'Set minimum health to 1, ignore death triggers'
      }
    ],
    
    narrativeRestrictions: [],
    psychologicalEffects: [],
    
    isUnlocked: false,
    isActive: false,
    usageHistory: []
  }
];

// === SERIES-SPECIFIC ABILITIES ===

export function getSeriesSpecificAbilities(seriesName: string): UniqueAbility[] {
  switch (seriesName.toLowerCase()) {
    case 're:zero':
      return [createReturnByDeathAbility('Subaru', 'Re:Zero')];
    
    default:
      return [];
  }
}

export function getSeriesSpecificSpecializations(seriesName: string): SpecializationTree[] {
  switch (seriesName.toLowerCase()) {
    case 're:zero':
      return uniqueSpecializationTrees.filter(tree => tree.seriesOrigin === 'Re:Zero');
    
    default:
      return [];
  }
}

// === HELPER FUNCTIONS ===

export function getAllSpecializationTrees(): SpecializationTree[] {
  return [
    ...combatSpecializationTrees,
    ...magicSpecializationTrees,
    ...socialSpecializationTrees,
    ...uniqueSpecializationTrees
  ];
}

export function getSpecializationTreesByCategory(category: SpecializationCategory): SpecializationTree[] {
  return getAllSpecializationTrees().filter(tree => tree.category === category);
}

export function getAllUniqueAbilities(): UniqueAbility[] {
  return [
    ...defaultUniqueAbilities
  ];
}
