/**
 * Enhanced Faction System
 * 
 * Core utilities for managing faction relationships, conflicts, and consequences:
 * - Faction relationship management
 * - Inter-faction conflicts and alliances
 * - Faction-based quest generation
 * - Reputation consequences
 * - Political dynamics
 */

import type {
  EnhancedFaction,
  FactionInfluence,
  FactionRelationship,
  FactionGoal,
  FactionLeader,
  FactionBenefit,
  FactionConsequence,
  FactionTreaty,
  FactionConflict,
  GroupReputation,
  StructuredStoryState,
  CharacterProfile,
  QuestConsequence,
  ConsequenceEffect,
  BranchCondition
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === FACTION INITIALIZATION ===

export function createBasicFactions(): EnhancedFaction[] {
  return [
    {
      id: 'merchants_guild',
      name: 'Merchants Guild',
      description: 'A powerful organization controlling trade and commerce',
      type: 'economic',
      powerLevel: 75,
      influence: {
        political: 60,
        economic: 90,
        military: 30,
        social: 70,
        magical: 20,
        informational: 80
      },
      relationships: [],
      goals: [
        {
          id: 'expand_trade',
          name: 'Expand Trade Routes',
          description: 'Establish new profitable trade connections',
          priority: 'high',
          type: 'economic',
          progress: 45,
          timeframe: 'long_term',
          obstacles: ['Bandit attacks', 'Political instability'],
          playerCanInfluence: true
        }
      ],
      resources: [
        {
          type: 'economic',
          amount: 85,
          quality: 80,
          accessibility: 'members_only',
          description: 'Vast financial resources and trade networks'
        }
      ],
      territory: ['Market District', 'Trade Quarter', 'Harbor'],
      leadership: {
        structure: 'oligarchic',
        leaders: [
          {
            name: 'Guildmaster Aldric',
            title: 'Guildmaster',
            role: 'supreme_leader',
            influence: 90,
            loyalty: 85,
            competence: 88,
            personalGoals: ['Increase guild profits', 'Expand political influence']
          }
        ],
        successionRules: ['Elected by guild council', 'Must own significant business'],
        decisionMaking: 'council_votes'
      },
      membershipRequirements: [
        {
          type: 'item_possession',
          value: 'business_license',
          description: 'Must own a legitimate business'
        }
      ],
      benefits: [
        {
          type: 'economic',
          name: 'Trade Discounts',
          description: 'Reduced prices on goods and services',
          requirements: [],
          effects: [
            {
              type: 'stat_change',
              targetId: 'currency',
              value: 0.9, // 10% discount multiplier
              description: 'Reduced merchant prices',
              permanent: true
            }
          ]
        }
      ],
      consequences: []
    },
    {
      id: 'city_guard',
      name: 'City Guard',
      description: 'The official law enforcement and military force',
      type: 'military',
      powerLevel: 80,
      influence: {
        political: 70,
        economic: 40,
        military: 95,
        social: 60,
        magical: 30,
        informational: 75
      },
      relationships: [],
      goals: [
        {
          id: 'maintain_order',
          name: 'Maintain Public Order',
          description: 'Keep the peace and enforce the law',
          priority: 'critical',
          type: 'defense',
          progress: 70,
          timeframe: 'indefinite',
          obstacles: ['Criminal organizations', 'Political corruption'],
          playerCanInfluence: true
        }
      ],
      resources: [
        {
          type: 'military',
          amount: 90,
          quality: 85,
          accessibility: 'members_only',
          description: 'Well-trained soldiers and military equipment'
        }
      ],
      territory: ['Guard Barracks', 'City Gates', 'Patrol Routes'],
      leadership: {
        structure: 'hierarchical',
        leaders: [
          {
            name: 'Captain Marcus',
            title: 'Captain of the Guard',
            role: 'supreme_leader',
            influence: 85,
            loyalty: 95,
            competence: 80,
            personalGoals: ['Protect the city', 'Root out corruption']
          }
        ],
        successionRules: ['Promoted from within ranks', 'Must have military experience'],
        decisionMaking: 'leader_decides'
      },
      membershipRequirements: [
        {
          type: 'skill_requirement',
          targetId: 'combat',
          value: 'basic',
          description: 'Must have basic combat training'
        }
      ],
      benefits: [
        {
          type: 'social',
          name: 'Legal Authority',
          description: 'Recognized authority to enforce laws',
          requirements: [],
          effects: [
            {
              type: 'npc_state_change',
              description: 'NPCs respect your authority',
              permanent: true
            }
          ]
        }
      ],
      consequences: []
    },
    {
      id: 'scholars_circle',
      name: 'Scholars Circle',
      description: 'An academic organization dedicated to knowledge and research',
      type: 'academic',
      powerLevel: 60,
      influence: {
        political: 50,
        economic: 40,
        military: 20,
        social: 70,
        magical: 85,
        informational: 95
      },
      relationships: [],
      goals: [
        {
          id: 'preserve_knowledge',
          name: 'Preserve Ancient Knowledge',
          description: 'Collect and safeguard important historical information',
          priority: 'high',
          type: 'ideological',
          progress: 60,
          timeframe: 'indefinite',
          obstacles: ['Lost texts', 'Dangerous expeditions'],
          playerCanInfluence: true
        }
      ],
      resources: [
        {
          type: 'informational',
          amount: 95,
          quality: 90,
          accessibility: 'members_only',
          description: 'Vast libraries and research materials'
        }
      ],
      territory: ['Great Library', 'Research Halls', 'Archive Vaults'],
      leadership: {
        structure: 'council',
        leaders: [
          {
            name: 'Archscholar Elena',
            title: 'Archscholar',
            role: 'council_member',
            influence: 80,
            loyalty: 90,
            competence: 95,
            personalGoals: ['Advance magical research', 'Train new scholars']
          }
        ],
        successionRules: ['Elected by peer review', 'Must have published research'],
        decisionMaking: 'council_votes'
      },
      membershipRequirements: [
        {
          type: 'skill_requirement',
          targetId: 'intelligence',
          value: 15,
          description: 'Must demonstrate intellectual capability'
        }
      ],
      benefits: [
        {
          type: 'informational',
          name: 'Research Access',
          description: 'Access to extensive libraries and research materials',
          requirements: [],
          effects: [
            {
              type: 'stat_change',
              targetId: 'intelligence',
              value: 2,
              description: 'Increased learning from research',
              permanent: false
            }
          ]
        }
      ],
      consequences: []
    }
  ];
}

// === FACTION RELATIONSHIP MANAGEMENT ===

export function updateFactionRelationship(
  faction1Id: string,
  faction2Id: string,
  relationshipChange: number,
  eventDescription: string,
  turnId: string,
  factions: EnhancedFaction[]
): EnhancedFaction[] {
  return factions.map(faction => {
    if (faction.id === faction1Id) {
      const relationships = [...faction.relationships];
      const relationshipIndex = relationships.findIndex(rel => rel.factionId === faction2Id);

      if (relationshipIndex >= 0) {
        const relationship = relationships[relationshipIndex];
        const newScore = Math.max(-100, Math.min(100, relationship.relationshipScore + relationshipChange));
        
        relationships[relationshipIndex] = {
          ...relationship,
          relationshipScore: newScore,
          relationshipType: determineRelationshipType(newScore),
          history: [
            ...relationship.history,
            {
              turnId,
              timestamp: new Date().toISOString(),
              eventType: relationshipChange > 0 ? 'assistance_provided' : 'conflict_started',
              description: eventDescription,
              relationshipChange,
              consequences: []
            }
          ].slice(-20) // Keep last 20 events
        };
      } else {
        // Create new relationship
        const faction2 = factions.find(f => f.id === faction2Id);
        if (faction2) {
          relationships.push({
            factionId: faction2Id,
            factionName: faction2.name,
            relationshipType: determineRelationshipType(relationshipChange),
            relationshipScore: relationshipChange,
            history: [{
              turnId,
              timestamp: new Date().toISOString(),
              eventType: relationshipChange > 0 ? 'assistance_provided' : 'conflict_started',
              description: eventDescription,
              relationshipChange,
              consequences: []
            }],
            treaties: [],
            conflicts: []
          });
        }
      }

      return { ...faction, relationships };
    }
    return faction;
  });
}

function determineRelationshipType(score: number): 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile' | 'at_war' {
  if (score >= 75) return 'allied';
  if (score >= 25) return 'friendly';
  if (score >= -25) return 'neutral';
  if (score >= -75) return 'rival';
  if (score >= -90) return 'hostile';
  return 'at_war';
}

// === FACTION CONFLICT MANAGEMENT ===

export function createFactionConflict(
  faction1Id: string,
  faction2Id: string,
  conflictType: 'trade_war' | 'territorial_dispute' | 'ideological_conflict' | 'resource_competition' | 'succession_crisis',
  description: string,
  factions: EnhancedFaction[]
): FactionConflict {
  return {
    id: generateUUID(),
    name: `${conflictType.replace('_', ' ')} between factions`,
    type: conflictType,
    intensity: 'minor',
    startedAt: new Date().toISOString(),
    causes: [description],
    currentStatus: 'Active conflict ongoing',
    playerInvolvement: 'none'
  };
}

export function resolveFactionConflict(
  conflictId: string,
  resolution: string,
  playerRole: 'mediator' | 'supporter' | 'instigator',
  consequences: ConsequenceEffect[],
  factions: EnhancedFaction[]
): { updatedFactions: EnhancedFaction[]; resolutionEffects: string[] } {
  const resolutionEffects: string[] = [];
  
  // Apply consequences based on resolution
  let updatedFactions = [...factions];
  
  for (const consequence of consequences) {
    if (consequence.type === 'faction_change') {
      const factionIndex = updatedFactions.findIndex(f => f.id === consequence.targetId);
      if (factionIndex >= 0) {
        const faction = updatedFactions[factionIndex];
        
        // Update faction power level
        if (consequence.description.includes('weakened')) {
          updatedFactions[factionIndex] = {
            ...faction,
            powerLevel: Math.max(0, faction.powerLevel - 10)
          };
          resolutionEffects.push(`${faction.name} has been weakened by the conflict resolution`);
        } else if (consequence.description.includes('strengthened')) {
          updatedFactions[factionIndex] = {
            ...faction,
            powerLevel: Math.min(100, faction.powerLevel + 10)
          };
          resolutionEffects.push(`${faction.name} has been strengthened by the conflict resolution`);
        }
      }
    }
  }

  return { updatedFactions, resolutionEffects };
}

// === FACTION BENEFITS AND CONSEQUENCES ===

export function applyFactionBenefits(
  factionId: string,
  playerReputation: number,
  character: CharacterProfile,
  faction: EnhancedFaction
): { benefits: string[]; effects: ConsequenceEffect[] } {
  const benefits: string[] = [];
  const effects: ConsequenceEffect[] = [];

  for (const benefit of faction.benefits) {
    // Check if player qualifies for this benefit
    const qualifies = benefit.requirements.every(req => {
      switch (req.type) {
        case 'faction_standing':
          return playerReputation >= (req.value as number);
        case 'level_requirement':
          return character.level >= (req.value as number);
        default:
          return true;
      }
    });

    if (qualifies) {
      benefits.push(benefit.description);
      effects.push(...benefit.effects);
    }
  }

  return { benefits, effects };
}

export function checkFactionConsequences(
  factionId: string,
  playerReputation: number,
  storyState: StructuredStoryState,
  faction: EnhancedFaction
): { triggeredConsequences: FactionConsequence[]; effects: ConsequenceEffect[] } {
  const triggeredConsequences: FactionConsequence[] = [];
  const effects: ConsequenceEffect[] = [];

  for (const consequence of faction.consequences) {
    const triggered = evaluateFactionCondition(consequence.triggerCondition, playerReputation, storyState);
    
    if (triggered) {
      triggeredConsequences.push(consequence);
      effects.push(...consequence.effects);
    }
  }

  return { triggeredConsequences, effects };
}

function evaluateFactionCondition(
  condition: BranchCondition,
  playerReputation: number,
  storyState: StructuredStoryState
): boolean {
  switch (condition.type) {
    case 'faction_standing':
      return playerReputation >= (condition.value as number);
    case 'choice':
      return storyState.playerChoices?.some(choice => 
        choice.choiceText.includes(condition.value as string)
      ) || false;
    case 'stat_check':
      const statValue = getCharacterStat(storyState.character, condition.targetId || '');
      return compareValues(statValue, condition.value, condition.comparison || 'greater_than');
    default:
      return false;
  }
}

function getCharacterStat(character: CharacterProfile, statName: string): number {
  switch (statName) {
    case 'level': return character.level;
    case 'charisma': return character.charisma || 0;
    case 'intelligence': return character.intelligence || 0;
    case 'currency': return character.currency || 0;
    default: return 0;
  }
}

function compareValues(
  actual: number,
  expected: any,
  comparison: string
): boolean {
  switch (comparison) {
    case 'greater_than':
      return actual > (expected as number);
    case 'less_than':
      return actual < (expected as number);
    case 'equals':
      return actual === (expected as number);
    default:
      return false;
  }
}

// === FACTION GOAL MANAGEMENT ===

export function updateFactionGoalProgress(
  factionId: string,
  goalId: string,
  progressChange: number,
  playerContribution: boolean,
  factions: EnhancedFaction[]
): EnhancedFaction[] {
  return factions.map(faction => {
    if (faction.id === factionId) {
      const goals = faction.goals.map(goal => {
        if (goal.id === goalId) {
          const newProgress = Math.max(0, Math.min(100, goal.progress + progressChange));
          return {
            ...goal,
            progress: newProgress
          };
        }
        return goal;
      });

      return { ...faction, goals };
    }
    return faction;
  });
}

export function generateFactionQuest(
  faction: EnhancedFaction,
  playerReputation: number,
  storyState: StructuredStoryState
): any | null {
  // Find a goal that the player can help with
  const availableGoals = faction.goals.filter(goal => 
    goal.playerCanInfluence && goal.progress < 100
  );

  if (availableGoals.length === 0) return null;

  const goal = availableGoals[Math.floor(Math.random() * availableGoals.length)];

  // Generate quest based on goal type
  switch (goal.type) {
    case 'economic':
      return {
        title: `Economic Support for ${faction.name}`,
        description: `Help ${faction.name} achieve their economic goal: ${goal.description}`,
        type: 'side',
        category: 'faction_support',
        objectives: [
          {
            description: `Contribute to ${goal.name}`,
            isCompleted: false
          }
        ],
        rewards: {
          experiencePoints: 100,
          currency: 50
        },
        consequences: [
          {
            id: generateUUID(),
            type: 'immediate',
            category: 'reputation',
            description: `Improved standing with ${faction.name}`,
            severity: 'moderate',
            effects: [
              {
                type: 'faction_change',
                targetId: faction.id,
                value: 15,
                description: `Reputation increased with ${faction.name}`,
                permanent: false
              }
            ],
            reversible: false,
            visibilityToPlayer: 'obvious'
          }
        ]
      };

    case 'defense':
      return {
        title: `Defend ${faction.name} Interests`,
        description: `Help ${faction.name} with their defensive goal: ${goal.description}`,
        type: 'side',
        category: 'faction_defense',
        objectives: [
          {
            description: `Assist in ${goal.name}`,
            isCompleted: false
          }
        ],
        rewards: {
          experiencePoints: 150,
          currency: 25
        }
      };

    default:
      return null;
  }
}

// === POLITICAL DYNAMICS ===

export function calculatePoliticalInfluence(
  factions: EnhancedFaction[],
  playerFactionStandings: { [factionId: string]: number }
): { dominantFaction: string; politicalStability: number; playerInfluence: number } {
  let totalPoliticalPower = 0;
  let dominantFaction = '';
  let maxPower = 0;

  // Calculate total political power and find dominant faction
  for (const faction of factions) {
    const politicalPower = faction.powerLevel * (faction.influence.political / 100);
    totalPoliticalPower += politicalPower;
    
    if (politicalPower > maxPower) {
      maxPower = politicalPower;
      dominantFaction = faction.id;
    }
  }

  // Calculate political stability based on power distribution
  const powerDistribution = factions.map(f => 
    (f.powerLevel * (f.influence.political / 100)) / totalPoliticalPower
  );
  
  // More even distribution = higher stability
  const stability = 100 - (Math.max(...powerDistribution) - Math.min(...powerDistribution)) * 100;

  // Calculate player's political influence
  let playerInfluence = 0;
  for (const faction of factions) {
    const standing = playerFactionStandings[faction.id] || 0;
    const factionWeight = faction.influence.political / 100;
    playerInfluence += (standing / 100) * factionWeight * faction.powerLevel;
  }
  playerInfluence = Math.max(0, Math.min(100, playerInfluence / factions.length));

  return {
    dominantFaction,
    politicalStability: Math.max(0, Math.min(100, stability)),
    playerInfluence
  };
}

export { };
