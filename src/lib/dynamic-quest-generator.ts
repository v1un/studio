/**
 * Dynamic Quest Generator
 * 
 * Core utilities for generating dynamic quests based on:
 * - Player preferences and behavior
 * - Current world state
 * - Story context and progression
 * - Faction relationships
 * - Available NPCs and locations
 */

import type {
  Quest,
  QuestBranch,
  QuestObjective,
  QuestRewards,
  QuestConsequence,
  QuestPrerequisite,
  DynamicQuestTemplate,
  QuestGenerationSettings,
  QuestVariableElement,
  VariableSelectionCriteria,
  BranchCondition,
  ConsequenceEffect,
  StructuredStoryState,
  CharacterProfile,
  NPCProfile,
  Item
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === QUEST TEMPLATE LIBRARY ===

const QUEST_TEMPLATES: DynamicQuestTemplate[] = [
  {
    id: 'rescue_mission',
    name: 'Rescue Mission',
    description: 'Someone important needs to be rescued from danger',
    category: 'rescue',
    baseObjectives: [
      {
        id: 'locate_target',
        description: 'Find {target_npc} who is being held at {location}',
        type: 'reach_location',
        variableTargets: ['{target_npc}', '{location}'],
        optional: false,
        weight: 1
      },
      {
        id: 'rescue_target',
        description: 'Rescue {target_npc} from their captors',
        type: 'talk_to',
        variableTargets: ['{target_npc}'],
        optional: false,
        weight: 2
      }
    ],
    variableElements: [
      {
        placeholder: '{target_npc}',
        type: 'npc',
        selectionCriteria: {
          method: 'story_relevance',
          filters: { relationship: 'positive', importance: 'high' }
        }
      },
      {
        placeholder: '{location}',
        type: 'location',
        selectionCriteria: {
          method: 'difficulty_appropriate',
          filters: { danger_level: 'moderate' }
        }
      }
    ],
    adaptationRules: [],
    difficultyScaling: [
      {
        playerLevel: 5,
        difficultyMultiplier: 1.0,
        additionalObjectives: 0,
        timeConstraintMultiplier: 1.0,
        rewardMultiplier: 1.0,
        consequenceSeverityMultiplier: 1.0
      }
    ],
    contextRequirements: [
      {
        type: 'npc_relationship',
        value: 25,
        required: true,
        description: 'Must have positive relationship with someone to rescue'
      }
    ],
    rewardScaling: [
      {
        baseDifficulty: 5,
        experienceMultiplier: 1.0,
        currencyMultiplier: 1.0,
        itemRarityBonus: 0,
        additionalRewardChance: 10
      }
    ]
  },
  {
    id: 'delivery_mission',
    name: 'Delivery Mission',
    description: 'Transport an important item to its destination',
    category: 'delivery',
    baseObjectives: [
      {
        id: 'obtain_item',
        description: 'Obtain {item_name} from {source_npc}',
        type: 'talk_to',
        variableTargets: ['{item_name}', '{source_npc}'],
        optional: false,
        weight: 1
      },
      {
        id: 'deliver_item',
        description: 'Deliver {item_name} to {target_npc} at {destination}',
        type: 'talk_to',
        variableTargets: ['{item_name}', '{target_npc}', '{destination}'],
        optional: false,
        weight: 2
      }
    ],
    variableElements: [
      {
        placeholder: '{item_name}',
        type: 'item',
        selectionCriteria: {
          method: 'story_relevance',
          filters: { rarity: 'uncommon', type: 'quest' }
        }
      },
      {
        placeholder: '{source_npc}',
        type: 'npc',
        selectionCriteria: {
          method: 'random',
          filters: { relationship: 'neutral_or_positive' }
        }
      },
      {
        placeholder: '{target_npc}',
        type: 'npc',
        selectionCriteria: {
          method: 'random',
          filters: { relationship: 'any' }
        }
      },
      {
        placeholder: '{destination}',
        type: 'location',
        selectionCriteria: {
          method: 'player_preference',
          filters: { accessibility: 'reachable' }
        }
      }
    ],
    adaptationRules: [],
    difficultyScaling: [
      {
        playerLevel: 3,
        difficultyMultiplier: 0.8,
        additionalObjectives: 0,
        timeConstraintMultiplier: 1.2,
        rewardMultiplier: 0.8,
        consequenceSeverityMultiplier: 0.8
      }
    ],
    contextRequirements: [],
    rewardScaling: [
      {
        baseDifficulty: 3,
        experienceMultiplier: 0.8,
        currencyMultiplier: 1.2,
        itemRarityBonus: 0,
        additionalRewardChance: 5
      }
    ]
  },
  {
    id: 'investigation',
    name: 'Investigation',
    description: 'Uncover the truth behind a mysterious event',
    category: 'investigation',
    baseObjectives: [
      {
        id: 'gather_clues',
        description: 'Investigate {location} for clues about {mystery}',
        type: 'reach_location',
        variableTargets: ['{location}', '{mystery}'],
        optional: false,
        weight: 1
      },
      {
        id: 'interview_witnesses',
        description: 'Question {witness_npc} about what they saw',
        type: 'talk_to',
        variableTargets: ['{witness_npc}'],
        optional: false,
        weight: 1
      },
      {
        id: 'solve_mystery',
        description: 'Determine the truth behind {mystery}',
        type: 'solve',
        variableTargets: ['{mystery}'],
        optional: false,
        weight: 3
      }
    ],
    variableElements: [
      {
        placeholder: '{mystery}',
        type: 'text',
        selectionCriteria: {
          method: 'story_relevance',
          filters: { complexity: 'moderate' }
        }
      },
      {
        placeholder: '{location}',
        type: 'location',
        selectionCriteria: {
          method: 'story_relevance',
          filters: { has_secrets: true }
        }
      },
      {
        placeholder: '{witness_npc}',
        type: 'npc',
        selectionCriteria: {
          method: 'story_relevance',
          filters: { has_information: true }
        }
      }
    ],
    adaptationRules: [],
    difficultyScaling: [
      {
        playerLevel: 7,
        difficultyMultiplier: 1.2,
        additionalObjectives: 1,
        timeConstraintMultiplier: 0.8,
        rewardMultiplier: 1.3,
        consequenceSeverityMultiplier: 1.1
      }
    ],
    contextRequirements: [
      {
        type: 'world_state',
        value: 'mystery_exists',
        required: true,
        description: 'There must be an unsolved mystery in the world'
      }
    ],
    rewardScaling: [
      {
        baseDifficulty: 7,
        experienceMultiplier: 1.3,
        currencyMultiplier: 1.0,
        itemRarityBonus: 1,
        additionalRewardChance: 20
      }
    ]
  }
];

// === QUEST GENERATION ===

export function generateDynamicQuest(
  storyState: StructuredStoryState,
  settings: QuestGenerationSettings,
  preferredCategory?: string
): Quest | null {
  // Select appropriate template
  const template = selectQuestTemplate(storyState, settings, preferredCategory);
  if (!template) return null;

  // Check context requirements
  if (!checkContextRequirements(template, storyState)) {
    return null;
  }

  // Generate quest variables
  const variables = generateQuestVariables(template, storyState);
  if (!variables) return null;

  // Create quest objectives
  const objectives = createQuestObjectives(template, variables, storyState);

  // Generate rewards
  const rewards = generateQuestRewards(template, storyState.character, settings);

  // Create consequences
  const consequences = generateQuestConsequences(template, storyState, settings);

  // Generate branches if complexity allows
  const branches = settings.branchingComplexity !== 'simple' 
    ? generateQuestBranches(template, variables, storyState, settings)
    : undefined;

  // Create the quest
  const quest: Quest = {
    id: generateUUID(),
    title: generateQuestTitle(template, variables),
    description: generateQuestDescription(template, variables),
    type: 'dynamic',
    status: 'active',
    category: template.category,
    objectives: objectives,
    rewards: rewards,
    consequences: consequences,
    branches: branches,
    moralAlignment: determineMoralAlignment(template, variables),
    difficultyRating: calculateQuestDifficulty(template, storyState.character),
    estimatedDuration: estimateQuestDuration(template, objectives.length),
    playerChoiceImpact: settings.playerChoiceWeight,
    updatedAt: new Date().toISOString()
  };

  return quest;
}

function selectQuestTemplate(
  storyState: StructuredStoryState,
  settings: QuestGenerationSettings,
  preferredCategory?: string
): DynamicQuestTemplate | null {
  let availableTemplates = QUEST_TEMPLATES;

  // Filter by preferred category
  if (preferredCategory) {
    availableTemplates = availableTemplates.filter(t => t.category === preferredCategory);
  }

  // Filter by player preferences
  if (settings.preferredQuestTypes.length > 0) {
    // For dynamic quests, we'll map categories to types
    availableTemplates = availableTemplates.filter(t => 
      settings.preferredQuestTypes.includes('dynamic')
    );
  }

  // Select based on story relevance and player behavior
  const scoredTemplates = availableTemplates.map(template => ({
    template,
    score: calculateTemplateScore(template, storyState, settings)
  }));

  scoredTemplates.sort((a, b) => b.score - a.score);

  return scoredTemplates.length > 0 ? scoredTemplates[0].template : null;
}

function calculateTemplateScore(
  template: DynamicQuestTemplate,
  storyState: StructuredStoryState,
  settings: QuestGenerationSettings
): number {
  let score = 50; // Base score

  // Adjust based on player preferences
  const preferences = storyState.playerPreferences;
  if (preferences) {
    // Adjust for preferred quest types
    if (preferences.contentPreferences.preferredQuestTypes.includes(template.category)) {
      score += 20;
    }

    // Adjust for difficulty preference
    const templateDifficulty = template.difficultyScaling[0]?.difficultyMultiplier || 1.0;
    if (settings.difficultyPreference === 'easy' && templateDifficulty < 1.0) score += 10;
    if (settings.difficultyPreference === 'hard' && templateDifficulty > 1.0) score += 10;

    // Adjust for moral complexity
    if (preferences.narrativePreferences.moralComplexity > 70 && template.category === 'investigation') {
      score += 15;
    }
  }

  // Adjust based on recent quest history
  const recentQuests = storyState.quests.slice(-5);
  const recentCategories = recentQuests.map(q => q.category).filter(Boolean);
  if (recentCategories.includes(template.category)) {
    score -= 15; // Reduce score for recently used categories
  }

  // Adjust based on story context
  if (template.category === 'rescue' && storyState.npcRelationships?.some(rel => rel.relationshipScore > 50)) {
    score += 10;
  }

  return score;
}

function checkContextRequirements(
  template: DynamicQuestTemplate,
  storyState: StructuredStoryState
): boolean {
  for (const requirement of template.contextRequirements) {
    switch (requirement.type) {
      case 'npc_relationship':
        const hasPositiveRelationship = storyState.npcRelationships?.some(rel => 
          rel.relationshipScore >= (requirement.value as number)
        );
        if (requirement.required && !hasPositiveRelationship) return false;
        break;

      case 'faction_standing':
        const hasGoodStanding = storyState.factionStandings?.some(faction => 
          faction.reputationScore >= (requirement.value as number)
        );
        if (requirement.required && !hasGoodStanding) return false;
        break;

      case 'world_state':
        // Check if required world state exists
        const hasWorldState = storyState.worldFacts.some(fact => 
          fact.includes(requirement.value as string)
        );
        if (requirement.required && !hasWorldState) return false;
        break;
    }
  }

  return true;
}

function generateQuestVariables(
  template: DynamicQuestTemplate,
  storyState: StructuredStoryState
): { [placeholder: string]: any } | null {
  const variables: { [placeholder: string]: any } = {};

  for (const element of template.variableElements) {
    const value = selectVariableValue(element, storyState);
    if (!value) return null; // Failed to find suitable value

    variables[element.placeholder] = value;
  }

  return variables;
}

function selectVariableValue(
  element: QuestVariableElement,
  storyState: StructuredStoryState
): any {
  switch (element.type) {
    case 'npc':
      return selectNPC(element.selectionCriteria, storyState);
    case 'location':
      return selectLocation(element.selectionCriteria, storyState);
    case 'item':
      return selectItem(element.selectionCriteria, storyState);
    case 'text':
      return selectText(element.selectionCriteria, storyState);
    default:
      return null;
  }
}

function selectNPC(
  criteria: VariableSelectionCriteria,
  storyState: StructuredStoryState
): NPCProfile | null {
  let candidates = storyState.trackedNPCs;

  // Apply filters
  if (criteria.filters) {
    if (criteria.filters.relationship === 'positive') {
      candidates = candidates.filter(npc => {
        const rel = storyState.npcRelationships?.find(r => r.npcId === npc.id);
        return rel ? rel.relationshipScore > 0 : false;
      });
    }
    if (criteria.filters.relationship === 'neutral_or_positive') {
      candidates = candidates.filter(npc => {
        const rel = storyState.npcRelationships?.find(r => r.npcId === npc.id);
        return rel ? rel.relationshipScore >= 0 : true;
      });
    }
    if (criteria.filters.importance === 'high') {
      candidates = candidates.filter(npc => 
        npc.knownFacts.length > 3 || npc.isMerchant
      );
    }
  }

  if (candidates.length === 0) return null;

  // Select based on method
  switch (criteria.method) {
    case 'random':
      return candidates[Math.floor(Math.random() * candidates.length)];
    case 'story_relevance':
      // Select NPC with most story connections
      return candidates.reduce((best, current) => 
        current.knownFacts.length > best.knownFacts.length ? current : best
      );
    default:
      return candidates[0];
  }
}

function selectLocation(
  criteria: VariableSelectionCriteria,
  storyState: StructuredStoryState
): string {
  // For now, return a generic location based on current location
  const currentLocation = storyState.currentLocation;
  const locationVariations = [
    `${currentLocation} Outskirts`,
    `${currentLocation} Underground`,
    `${currentLocation} Heights`,
    `Abandoned ${currentLocation} District`,
    `${currentLocation} Marketplace`
  ];

  return locationVariations[Math.floor(Math.random() * locationVariations.length)];
}

function selectItem(
  criteria: VariableSelectionCriteria,
  storyState: StructuredStoryState
): Item | string {
  // Generate a quest-appropriate item
  const itemNames = [
    'Ancient Scroll',
    'Mysterious Package',
    'Family Heirloom',
    'Important Documents',
    'Magical Artifact',
    'Rare Medicine',
    'Secret Message',
    'Precious Gem'
  ];

  return itemNames[Math.floor(Math.random() * itemNames.length)];
}

function selectText(
  criteria: VariableSelectionCriteria,
  storyState: StructuredStoryState
): string {
  // Generate mystery or event text
  const mysteries = [
    'the disappearance of the merchant caravan',
    'the strange lights seen at night',
    'the missing town records',
    'the abandoned house mystery',
    'the recurring nightmares plaguing the town',
    'the unexplained animal behavior',
    'the mysterious stranger\'s identity'
  ];

  return mysteries[Math.floor(Math.random() * mysteries.length)];
}

function createQuestObjectives(
  template: DynamicQuestTemplate,
  variables: { [placeholder: string]: any },
  storyState: StructuredStoryState
): QuestObjective[] {
  return template.baseObjectives.map(objTemplate => {
    let description = objTemplate.description;
    
    // Replace variables in description
    Object.keys(variables).forEach(placeholder => {
      const value = variables[placeholder];
      const displayValue = typeof value === 'object' ? value.name || value.id : value;
      description = description.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), displayValue);
    });

    return {
      description,
      isCompleted: false
    };
  });
}

function generateQuestRewards(
  template: DynamicQuestTemplate,
  character: CharacterProfile,
  settings: QuestGenerationSettings
): QuestRewards {
  const scaling = template.rewardScaling[0];
  const levelMultiplier = character.level / 10;

  return {
    experiencePoints: Math.round(100 * scaling.experienceMultiplier * levelMultiplier),
    currency: Math.round(50 * scaling.currencyMultiplier * levelMultiplier),
    items: [] // Would generate appropriate items based on template
  };
}

function generateQuestConsequences(
  template: DynamicQuestTemplate,
  storyState: StructuredStoryState,
  settings: QuestGenerationSettings
): QuestConsequence[] {
  // Generate basic consequences based on template category
  const consequences: QuestConsequence[] = [];

  if (template.category === 'rescue') {
    consequences.push({
      id: generateUUID(),
      type: 'immediate',
      category: 'relationship',
      description: 'Rescued NPC becomes grateful ally',
      severity: 'moderate',
      effects: [{
        type: 'relationship_change',
        targetId: 'rescued_npc',
        value: 25,
        description: 'Relationship improved due to rescue',
        permanent: false
      }],
      reversible: false,
      visibilityToPlayer: 'obvious'
    });
  }

  return consequences;
}

function generateQuestBranches(
  template: DynamicQuestTemplate,
  variables: { [placeholder: string]: any },
  storyState: StructuredStoryState,
  settings: QuestGenerationSettings
): QuestBranch[] | undefined {
  if (settings.branchingComplexity === 'simple') return undefined;

  // Generate basic branches based on template
  const branches: QuestBranch[] = [];

  if (template.category === 'rescue') {
    branches.push({
      id: generateUUID(),
      name: 'Diplomatic Approach',
      description: 'Try to negotiate for the captive\'s release',
      condition: {
        type: 'stat_check',
        targetId: 'charisma',
        value: 15,
        comparison: 'greater_than',
        description: 'Requires high charisma for negotiation'
      },
      objectives: [{
        description: 'Negotiate with the captors',
        isCompleted: false
      }],
      rewards: {
        experiencePoints: 75,
        currency: 25
      },
      consequences: [],
      nextBranches: [],
      difficultyModifier: -1
    });

    branches.push({
      id: generateUUID(),
      name: 'Stealth Approach',
      description: 'Sneak in and rescue the captive without being detected',
      condition: {
        type: 'stat_check',
        targetId: 'dexterity',
        value: 15,
        comparison: 'greater_than',
        description: 'Requires high dexterity for stealth'
      },
      objectives: [{
        description: 'Infiltrate the location undetected',
        isCompleted: false
      }],
      rewards: {
        experiencePoints: 100,
        currency: 0
      },
      consequences: [],
      nextBranches: [],
      difficultyModifier: 1
    });
  }

  return branches.length > 0 ? branches : undefined;
}

function generateQuestTitle(
  template: DynamicQuestTemplate,
  variables: { [placeholder: string]: any }
): string {
  const titles = {
    rescue: ['Rescue Mission', 'Saving {target_npc}', 'A Life in Danger'],
    delivery: ['Important Delivery', 'The {item_name} Delivery', 'Courier Service'],
    investigation: ['Mystery Investigation', 'Uncovering the Truth', 'The {mystery} Case']
  };

  const categoryTitles = titles[template.category as keyof typeof titles] || ['Dynamic Quest'];
  let title = categoryTitles[Math.floor(Math.random() * categoryTitles.length)];

  // Replace variables
  Object.keys(variables).forEach(placeholder => {
    const value = variables[placeholder];
    const displayValue = typeof value === 'object' ? value.name || value.id : value;
    title = title.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), displayValue);
  });

  return title;
}

function generateQuestDescription(
  template: DynamicQuestTemplate,
  variables: { [placeholder: string]: any }
): string {
  let description = template.description;

  // Replace variables in description
  Object.keys(variables).forEach(placeholder => {
    const value = variables[placeholder];
    const displayValue = typeof value === 'object' ? value.name || value.id : value;
    description = description.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), displayValue);
  });

  return description;
}

function determineMoralAlignment(
  template: DynamicQuestTemplate,
  variables: { [placeholder: string]: any }
): 'good' | 'neutral' | 'evil' | 'complex' {
  switch (template.category) {
    case 'rescue':
      return 'good';
    case 'delivery':
      return 'neutral';
    case 'investigation':
      return 'complex';
    default:
      return 'neutral';
  }
}

function calculateQuestDifficulty(
  template: DynamicQuestTemplate,
  character: CharacterProfile
): number {
  const baseScaling = template.difficultyScaling.find(scaling => 
    character.level >= scaling.playerLevel
  ) || template.difficultyScaling[0];

  return Math.round(5 * baseScaling.difficultyMultiplier);
}

function estimateQuestDuration(
  template: DynamicQuestTemplate,
  objectiveCount: number
): number {
  // Estimate in minutes
  const baseTime = 30; // 30 minutes base
  const timePerObjective = 15; // 15 minutes per objective
  
  return baseTime + (objectiveCount * timePerObjective);
}

export { };
