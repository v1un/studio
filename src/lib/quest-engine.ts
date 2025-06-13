/**
 * Enhanced Quest Engine
 * 
 * Core utilities for managing the enhanced quest system including:
 * - Branching quest logic
 * - Dynamic quest generation
 * - Choice consequence tracking
 * - Quest failure and recovery
 * - Time-based quest management
 */

import type {
  Quest,
  QuestBranch,
  QuestChoice,
  QuestConsequence,
  QuestPrerequisite,
  QuestTimeLimit,
  QuestFailureCondition,
  QuestSolution,
  BranchCondition,
  ConsequenceEffect,
  StructuredStoryState,
  CharacterProfile,
  NPCProfile,
  QuestFailureRecord,
  QuestRecoveryOption,
  TimeBasedEvent,
  DynamicQuestTemplate,
  QuestGenerationSettings,
  QuestAnalytics
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === QUEST VALIDATION AND CHECKING ===

export function validateQuestPrerequisites(
  prerequisites: QuestPrerequisite[],
  character: CharacterProfile,
  storyState: StructuredStoryState
): { satisfied: boolean; missing: QuestPrerequisite[] } {
  const missing: QuestPrerequisite[] = [];

  for (const prereq of prerequisites) {
    let satisfied = false;

    switch (prereq.type) {
      case 'quest_completion':
        satisfied = storyState.quests.some(q => 
          q.id === prereq.targetId && q.status === 'completed'
        );
        break;

      case 'level_requirement':
        satisfied = character.level >= (prereq.value as number);
        break;

      case 'skill_requirement':
        // Check if character has the required skill level
        const skill = character.skillsAndAbilities?.find(s => s.id === prereq.targetId);
        satisfied = skill !== undefined;
        break;

      case 'item_possession':
        satisfied = storyState.inventory.some(item => item.id === prereq.targetId) ||
                   Object.values(storyState.equippedItems).some(item => item?.id === prereq.targetId);
        break;

      case 'relationship_level':
        const relationship = storyState.npcRelationships?.find(rel => rel.npcId === prereq.targetId);
        satisfied = relationship ? relationship.relationshipScore >= (prereq.value as number) : false;
        break;

      case 'faction_standing':
        const faction = storyState.factionStandings?.find(f => f.factionId === prereq.targetId);
        satisfied = faction ? faction.reputationScore >= (prereq.value as number) : false;
        break;

      case 'location_visit':
        // Check if player has visited the location (simplified check)
        satisfied = storyState.environmentalContext?.locationHistory?.some(
          loc => loc.turnId && prereq.targetId
        ) || false;
        break;

      case 'choice_made':
        satisfied = storyState.playerChoices?.some(choice => 
          choice.id === prereq.targetId
        ) || false;
        break;

      default:
        satisfied = prereq.optional || false;
    }

    if (!satisfied && !prereq.optional) {
      missing.push(prereq);
    }
  }

  return { satisfied: missing.length === 0, missing };
}

export function evaluateBranchCondition(
  condition: BranchCondition,
  character: CharacterProfile,
  storyState: StructuredStoryState
): boolean {
  switch (condition.type) {
    case 'choice':
      return storyState.playerChoices?.some(choice => 
        choice.choiceText.includes(condition.value as string)
      ) || false;

    case 'stat_check':
      const statValue = getCharacterStat(character, condition.targetId || '');
      return compareValues(statValue, condition.value, condition.comparison || 'greater_than');

    case 'item_possession':
      return storyState.inventory.some(item => item.id === condition.targetId) ||
             Object.values(storyState.equippedItems).some(item => item?.id === condition.targetId);

    case 'relationship_level':
      const relationship = storyState.npcRelationships?.find(rel => rel.npcId === condition.targetId);
      return relationship ? 
        compareValues(relationship.relationshipScore, condition.value, condition.comparison || 'greater_than') : 
        false;

    case 'faction_standing':
      const faction = storyState.factionStandings?.find(f => f.factionId === condition.targetId);
      return faction ? 
        compareValues(faction.reputationScore, condition.value, condition.comparison || 'greater_than') : 
        false;

    case 'time_limit':
      // Check if current time is within the limit
      const currentTime = new Date().getTime();
      const limitTime = new Date(condition.value as string).getTime();
      return currentTime <= limitTime;

    case 'location':
      return storyState.currentLocation === condition.value;

    case 'previous_choice':
      return storyState.playerChoices?.some(choice => 
        choice.id === condition.targetId
      ) || false;

    default:
      return false;
  }
}

function getCharacterStat(character: CharacterProfile, statName: string): number {
  switch (statName) {
    case 'level': return character.level;
    case 'health': return character.health;
    case 'maxHealth': return character.maxHealth;
    case 'mana': return character.mana || 0;
    case 'maxMana': return character.maxMana || 0;
    case 'strength': return character.strength || 0;
    case 'dexterity': return character.dexterity || 0;
    case 'constitution': return character.constitution || 0;
    case 'intelligence': return character.intelligence || 0;
    case 'wisdom': return character.wisdom || 0;
    case 'charisma': return character.charisma || 0;
    case 'experiencePoints': return character.experiencePoints;
    case 'currency': return character.currency || 0;
    case 'languageReading': return character.languageReading || 100;
    case 'languageSpeaking': return character.languageSpeaking || 100;
    default: return 0;
  }
}

function compareValues(
  actual: number | string | boolean,
  expected: any,
  comparison: string
): boolean {
  switch (comparison) {
    case 'equals':
      return actual === expected;
    case 'greater_than':
      return (actual as number) > (expected as number);
    case 'less_than':
      return (actual as number) < (expected as number);
    case 'contains':
      return String(actual).includes(String(expected));
    default:
      return false;
  }
}

// === QUEST BRANCHING LOGIC ===

export function getAvailableQuestBranches(
  quest: Quest,
  character: CharacterProfile,
  storyState: StructuredStoryState
): QuestBranch[] {
  if (!quest.branches) return [];

  return quest.branches.filter(branch => {
    // Check if branch condition is met
    const conditionMet = evaluateBranchCondition(branch.condition, character, storyState);
    
    // Check if branch is not excluded by current branch
    const currentBranch = quest.currentBranch;
    if (currentBranch && branch.exclusiveBranches?.includes(currentBranch)) {
      return false;
    }

    // Check time limit if applicable
    if (branch.timeLimit) {
      const branchCreatedTime = quest.choiceHistory?.find(choice => 
        choice.branchId === branch.id
      )?.timestamp;
      
      if (branchCreatedTime) {
        const timeElapsed = Date.now() - new Date(branchCreatedTime).getTime();
        const timeLimitMs = branch.timeLimit * 60 * 60 * 1000; // Convert hours to ms
        if (timeElapsed > timeLimitMs) {
          return false;
        }
      }
    }

    return conditionMet;
  });
}

export function selectQuestBranch(
  quest: Quest,
  branchId: string,
  choiceText: string,
  turnId: string,
  character: CharacterProfile,
  storyState: StructuredStoryState
): { updatedQuest: Quest; consequences: QuestConsequence[] } {
  const branch = quest.branches?.find(b => b.id === branchId);
  if (!branch) {
    throw new Error(`Quest branch ${branchId} not found in quest ${quest.id}`);
  }

  // Create choice record
  const choice: QuestChoice = {
    id: generateUUID(),
    questId: quest.id,
    branchId: branchId,
    choiceText: choiceText,
    timestamp: new Date().toISOString(),
    turnId: turnId,
    consequences: branch.consequences,
    moralWeight: determineMoralWeight(choiceText, branch),
    difficultyLevel: branch.difficultyModifier ? 5 + branch.difficultyModifier : 5,
    alternativeOptions: quest.branches?.filter(b => b.id !== branchId).map(b => b.name) || []
  };

  // Update quest
  const updatedQuest: Quest = {
    ...quest,
    currentBranch: branchId,
    objectives: branch.objectives,
    rewards: branch.rewards,
    choiceHistory: [...(quest.choiceHistory || []), choice],
    updatedAt: new Date().toISOString()
  };

  return {
    updatedQuest,
    consequences: branch.consequences
  };
}

function determineMoralWeight(
  choiceText: string,
  branch: QuestBranch
): 'good' | 'neutral' | 'evil' | 'complex' {
  // Simple heuristic based on keywords - in a real implementation,
  // this would be more sophisticated
  const lowerChoice = choiceText.toLowerCase();
  
  if (lowerChoice.includes('help') || lowerChoice.includes('save') || lowerChoice.includes('protect')) {
    return 'good';
  } else if (lowerChoice.includes('kill') || lowerChoice.includes('destroy') || lowerChoice.includes('betray')) {
    return 'evil';
  } else if (branch.consequences.some(c => c.category === 'moral')) {
    return 'complex';
  }
  
  return 'neutral';
}

// === QUEST FAILURE MANAGEMENT ===

export function checkQuestFailureConditions(
  quest: Quest,
  character: CharacterProfile,
  storyState: StructuredStoryState
): QuestFailureCondition[] {
  if (!quest.failureConditions) return [];

  return quest.failureConditions.filter(condition => {
    switch (condition.type) {
      case 'time_limit':
        if (quest.timeLimit) {
          const questStartTime = new Date(quest.updatedAt || Date.now()).getTime();
          const currentTime = Date.now();
          const timeElapsed = currentTime - questStartTime;
          const timeLimitMs = quest.timeLimit.duration * 60 * 60 * 1000; // Convert to ms
          return timeElapsed > timeLimitMs;
        }
        return false;

      case 'character_death':
        return character.health <= 0;

      case 'item_loss':
        return !storyState.inventory.some(item => item.id === condition.targetId) &&
               !Object.values(storyState.equippedItems).some(item => item?.id === condition.targetId);

      case 'relationship_threshold':
        const relationship = storyState.npcRelationships?.find(rel => rel.npcId === condition.targetId);
        return relationship ? relationship.relationshipScore < (condition.threshold || 0) : false;

      case 'faction_hostility':
        const faction = storyState.factionStandings?.find(f => f.factionId === condition.targetId);
        return faction ? faction.reputationScore < (condition.threshold || -50) : false;

      case 'npc_death':
        const npc = storyState.trackedNPCs.find(n => n.id === condition.targetId);
        return npc ? (npc.health || 0) <= 0 : false;

      default:
        return false;
    }
  });
}

export function createQuestFailureRecord(
  quest: Quest,
  failureCondition: QuestFailureCondition,
  turnId: string
): QuestFailureRecord {
  return {
    questId: quest.id,
    questTitle: quest.title || quest.description,
    failureType: failureCondition.type,
    failureReason: failureCondition.description,
    turnId: turnId,
    timestamp: new Date().toISOString(),
    consequences: failureCondition.consequences,
    recoveryOptions: generateRecoveryOptions(quest, failureCondition),
    playerReaction: 'surprised', // Default, would be determined by player response
    lessonsLearned: []
  };
}

function generateRecoveryOptions(
  quest: Quest,
  failureCondition: QuestFailureCondition
): QuestRecoveryOption[] {
  if (!failureCondition.recoverable) return [];

  const options: QuestRecoveryOption[] = [];

  // Generate basic recovery options based on failure type
  switch (failureCondition.type) {
    case 'time_limit':
      options.push({
        id: generateUUID(),
        name: 'Seek Extension',
        description: 'Try to negotiate for more time to complete the quest',
        requirements: [
          {
            type: 'relationship_level',
            targetId: 'quest_giver',
            value: 25,
            description: 'Must have decent relationship with quest giver'
          }
        ],
        cost: 50, // Currency cost
        timeLimit: 24, // 24 hours to use this option
        consequences: [],
        successChance: 70
      });
      break;

    case 'item_loss':
      options.push({
        id: generateUUID(),
        name: 'Find Replacement',
        description: 'Search for a replacement for the lost item',
        requirements: [],
        timeLimit: 48,
        consequences: [],
        successChance: 50
      });
      break;

    case 'relationship_threshold':
      options.push({
        id: generateUUID(),
        name: 'Repair Relationship',
        description: 'Attempt to mend the damaged relationship',
        requirements: [],
        cost: 100,
        consequences: [],
        successChance: 60
      });
      break;
  }

  return options;
}

export { };
