/**
 * Client-side API helpers for scenario generation and story flows
 *
 * These functions call the server-side API routes instead of importing
 * Genkit flows directly, preventing client-side bundling issues.
 */

import type {
  GenerateScenarioFoundationInput,
  GenerateScenarioFoundationOutput,
  GenerateScenarioNarrativeElementsInput,
  GenerateScenarioNarrativeElementsOutput,
  GenerateCharacterAndSceneInput,
  GenerateCharacterAndSceneOutput,
  GenerateCharacterSkillsInput,
  GenerateCharacterSkillsOutput,
  GenerateItemsAndEquipmentInput,
  GenerateItemsAndEquipmentOutput,
  GenerateWorldFactsInput,
  GenerateWorldFactsOutput,
  GenerateQuestsAndArcsInput,
  GenerateQuestsAndArcsOutput,
  GenerateLoreEntriesInput,
  GenerateLoreEntriesOutput,
  GenerateNPCsInput,
  GenerateNPCsOutput,
} from '@/ai/flows/generate-scenario-from-series';

import type {
  GenerateNextSceneInput,
  GenerateNextSceneOutput,
  FleshOutStoryArcQuestsInput,
  FleshOutStoryArcQuestsOutput,
  DiscoverNextStoryArcInput,
  DiscoverNextStoryArcOutput,
  UpdateCharacterDescriptionInput,
  UpdateCharacterDescriptionOutput,
  GenerateBridgingQuestInput,
  GenerateBridgingQuestOutput,
} from '@/types/story';

export async function generateCharacterAndScene(input: GenerateCharacterAndSceneInput): Promise<GenerateCharacterAndSceneOutput> {
  const response = await fetch('/api/scenario/character-scene', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function generateCharacterSkills(input: GenerateCharacterSkillsInput): Promise<GenerateCharacterSkillsOutput> {
  const response = await fetch('/api/scenario/character-skills', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function generateItemsAndEquipment(input: GenerateItemsAndEquipmentInput): Promise<GenerateItemsAndEquipmentOutput> {
  const response = await fetch('/api/scenario/items-equipment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function generateWorldFacts(input: GenerateWorldFactsInput): Promise<GenerateWorldFactsOutput> {
  const response = await fetch('/api/scenario/world-facts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function generateQuestsAndArcs(input: GenerateQuestsAndArcsInput): Promise<GenerateQuestsAndArcsOutput> {
  const response = await fetch('/api/scenario/quests-arcs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function generateLoreEntries(input: GenerateLoreEntriesInput): Promise<GenerateLoreEntriesOutput> {
  const response = await fetch('/api/scenario/lore-entries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function generateNPCs(input: GenerateNPCsInput): Promise<GenerateNPCsOutput> {
  const response = await fetch('/api/scenario/npcs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// === MAIN SCENARIO GENERATION FLOWS ===

export async function generateScenarioFoundation(input: GenerateScenarioFoundationInput): Promise<GenerateScenarioFoundationOutput> {
  const response = await fetch('/api/scenario/foundation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function generateScenarioNarrativeElements(input: GenerateScenarioNarrativeElementsInput): Promise<GenerateScenarioNarrativeElementsOutput> {
  const response = await fetch('/api/scenario/narrative-elements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// === STORY PROGRESSION FLOWS ===

export async function generateNextScene(input: GenerateNextSceneInput): Promise<GenerateNextSceneOutput> {
  const response = await fetch('/api/story/next-scene', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function fleshOutStoryArcQuests(input: FleshOutStoryArcQuestsInput): Promise<FleshOutStoryArcQuestsOutput> {
  const response = await fetch('/api/story/flesh-out-quests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function discoverNextStoryArc(input: DiscoverNextStoryArcInput): Promise<DiscoverNextStoryArcOutput> {
  const response = await fetch('/api/story/discover-next-arc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function updateCharacterDescription(input: UpdateCharacterDescriptionInput): Promise<UpdateCharacterDescriptionOutput> {
  const response = await fetch('/api/story/update-character-description', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function generateBridgingQuest(input: GenerateBridgingQuestInput): Promise<GenerateBridgingQuestOutput> {
  const response = await fetch('/api/story/generate-bridging-quest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// === ACTIONS ===

export async function simpleTestAction(input: any): Promise<any> {
  const response = await fetch('/api/actions/simple-test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// === PROGRESSION FLOWS ===

export async function generateDynamicSkillTree(
  character: any,
  storyState: any,
  seriesName: string,
  usePremiumAI: boolean
): Promise<any> {
  const response = await fetch('/api/progression/generate-skill-tree', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ character, storyState, seriesName, usePremiumAI }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function generateProgressionRecommendations(
  character: any,
  storyState: any,
  seriesName: string,
  usePremiumAI: boolean
): Promise<any> {
  const response = await fetch('/api/progression/generate-recommendations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ character, storyState, seriesName, usePremiumAI }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function generateBackstoryIntegration(
  character: any,
  storyState: any,
  seriesName: string,
  usePremiumAI: boolean
): Promise<any> {
  const response = await fetch('/api/progression/generate-backstory-integration', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ character, storyState, seriesName, usePremiumAI }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function generateSkillEvolutionChain(
  baseSkill: any,
  character: any,
  storyState: any,
  seriesName: string,
  options: any = {}
): Promise<any> {
  const response = await fetch('/api/progression/generate-skill-evolution', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ baseSkill, character, storyState, seriesName, options }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// === SPECIALIZATION SYSTEM ===

export async function getSpecializationTrees(
  category?: string,
  seriesName?: string
): Promise<any> {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (seriesName) params.append('series', seriesName);

  const response = await fetch(`/api/specializations/trees?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function getAvailableSpecializationTrees(
  characterData: any,
  storyState?: any,
  seriesName?: string
): Promise<any> {
  const response = await fetch('/api/specializations/trees', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'get_available_trees',
      characterData,
      storyState,
      seriesName
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function unlockSpecializationTree(
  treeId: string,
  characterData: any
): Promise<any> {
  const response = await fetch('/api/specializations/trees', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'unlock_tree',
      treeId,
      characterData
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function purchaseSpecializationNode(
  treeId: string,
  nodeId: string,
  characterData: any,
  turnId?: string
): Promise<any> {
  const response = await fetch('/api/specializations/trees', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'purchase_node',
      treeId,
      nodeId,
      characterData,
      turnId
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function getUniqueAbilities(
  seriesName?: string,
  characterName?: string
): Promise<any> {
  const params = new URLSearchParams();
  if (seriesName) params.append('series', seriesName);
  if (characterName) params.append('character', characterName);

  const response = await fetch(`/api/specializations/unique-abilities?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function getCharacterAbilities(characterData: any): Promise<any> {
  const response = await fetch('/api/specializations/character-abilities', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characterData }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// === UNIQUE ABILITIES SYSTEM ===

export async function unlockUniqueAbility(
  abilityId: string,
  character: any,
  reason: string
): Promise<{ success: boolean; character?: any; error?: string }> {
  try {
    // Validate input parameters
    if (!abilityId || !character || !reason) {
      return {
        success: false,
        error: 'Missing required parameters: abilityId, character, and reason are required'
      };
    }

    // Check if ability is already unlocked
    const unlockedAbilities = character.unlockedUniqueAbilities || [];
    if (unlockedAbilities.includes(abilityId)) {
      return {
        success: false,
        error: `Ability ${abilityId} is already unlocked`
      };
    }

    // Create updated character with unlocked ability
    const updatedCharacter = {
      ...character,
      unlockedUniqueAbilities: [...unlockedAbilities, abilityId],
      // Update specialization progression if needed
      specializationProgression: {
        ...character.specializationProgression,
        unlockedUniqueAbilities: [...unlockedAbilities, abilityId],
        progressionHistory: [
          ...(character.specializationProgression?.progressionHistory || []),
          {
            id: `unlock_${abilityId}_${Date.now()}`,
            timestamp: new Date().toISOString(),
            turnId: 'system_unlock',
            action: 'unlock_unique_ability',
            details: {
              abilityId,
              reason
            },
            storyContext: reason
          }
        ]
      }
    };

    return {
      success: true,
      character: updatedCharacter
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to unlock unique ability: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function checkAbilityRestrictions(
  character: any,
  action: string,
  abilityId: string
): Promise<{ allowed: boolean; warning?: string }> {
  try {
    // Validate input parameters
    if (!character || !action || !abilityId) {
      return {
        allowed: false,
        warning: 'Missing required parameters for ability restriction check'
      };
    }

    // Check if ability is unlocked
    const unlockedAbilities = character.unlockedUniqueAbilities || [];
    if (!unlockedAbilities.includes(abilityId)) {
      return {
        allowed: false,
        warning: `Ability ${abilityId} is not unlocked`
      };
    }

    // Check if ability is currently active (for abilities that can only be used once)
    const activeAbilities = character.activeUniqueAbilities || [];
    
    // Special handling for Return by Death ability
    if (abilityId === 'return_by_death') {
      // Check psychological state and restrictions
      const returnByDeathAbility = character.returnByDeathAbility;
      if (returnByDeathAbility) {
        const psychState = returnByDeathAbility.psychologicalProgression;
        if (psychState?.currentSanity < 20) {
          return {
            allowed: false,
            warning: 'Mental state too fragile to safely use Return by Death'
          };
        }
        
        if (returnByDeathAbility.currentCooldown && returnByDeathAbility.currentCooldown > 0) {
          return {
            allowed: false,
            warning: `Return by Death is on cooldown (${returnByDeathAbility.currentCooldown} turns remaining)`
          };
        }
      }
    }

    // Check action-specific restrictions
    switch (action) {
      case 'activate_ability':
        if (activeAbilities.includes(abilityId)) {
          return {
            allowed: false,
            warning: `Ability ${abilityId} is already active`
          };
        }
        
        // Check character's current state (health, mana, emotional state)
        if (character.health <= 0) {
          return {
            allowed: false,
            warning: 'Cannot activate abilities while unconscious or dead'
          };
        }

        // Check if character has sufficient resources
        if (character.mana !== undefined && character.mana < 10) {
          return {
            allowed: true,
            warning: 'Low mana may affect ability effectiveness'
          };
        }
        
        break;

      case 'deactivate_ability':
        if (!activeAbilities.includes(abilityId)) {
          return {
            allowed: false,
            warning: `Ability ${abilityId} is not currently active`
          };
        }
        break;

      default:
        // Unknown action, allow but warn
        return {
          allowed: true,
          warning: `Unknown action '${action}' - proceeding with caution`
        };
    }

    // All checks passed
    return {
      allowed: true
    };
  } catch (error) {
    return {
      allowed: false,
      warning: `Error checking ability restrictions: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function activateUniqueAbility(
  abilityId: string,
  character: any,
  storyState: any,
  reason: string
): Promise<{ success: boolean; character?: any; error?: string }> {
  try {
    // Validate input parameters
    if (!abilityId || !character || !reason) {
      return {
        success: false,
        error: 'Missing required parameters: abilityId, character, and reason are required'
      };
    }

    // Check restrictions first
    const restrictionCheck = await checkAbilityRestrictions(character, 'activate_ability', abilityId);
    if (!restrictionCheck.allowed) {
      return {
        success: false,
        error: restrictionCheck.warning || 'Ability activation not allowed'
      };
    }

    // Get current active abilities
    const activeAbilities = character.activeUniqueAbilities || [];
    const updatedActiveAbilities = [...activeAbilities];

    // Add ability to active list if not already active
    if (!updatedActiveAbilities.includes(abilityId)) {
      updatedActiveAbilities.push(abilityId);
    }

    // Special handling for specific abilities
    let updatedCharacter = { ...character };
    
    if (abilityId === 'return_by_death') {
      // Handle Return by Death activation
      const returnByDeathAbility = character.returnByDeathAbility || {};
      const psychState = returnByDeathAbility.psychologicalProgression || {};
      
      // Update psychological state
      const newPsychState = {
        ...psychState,
        currentSanity: Math.max(0, (psychState.currentSanity || 100) - 10),
        traumaAccumulation: (psychState.traumaAccumulation || 0) + 5,
        determinationLevel: Math.min(100, (psychState.determinationLevel || 50) + 15)
      };

      // Add usage record
      const usageRecord = {
        usageId: `rbd_${Date.now()}`,
        timestamp: new Date().toISOString(),
        turnId: 'ability_activation',
        triggerReason: reason,
        stateBeforeUsage: {
          health: character.health,
          sanity: psychState.currentSanity || 100,
          location: storyState?.currentLocation || 'unknown'
        },
        stateAfterUsage: {
          health: character.maxHealth || character.health,
          sanity: newPsychState.currentSanity,
          location: storyState?.currentLocation || 'unknown'
        },
        psychologicalImpact: 65,
        narrativeConsequences: [
          'Experienced the terror of death',
          'Retained knowledge of previous timeline',
          'Psychological strain increased'
        ]
      };

      updatedCharacter.returnByDeathAbility = {
        ...returnByDeathAbility,
        psychologicalProgression: newPsychState,
        usageHistory: [
          ...(returnByDeathAbility.usageHistory || []),
          usageRecord
        ],
        currentCooldown: 3 // 3 turn cooldown
      };

      // Reset character to previous save state (simplified)
      updatedCharacter.health = character.maxHealth || character.health;
      updatedCharacter.mana = character.maxMana || character.mana || 0;
    }

    // Update character with active ability
    updatedCharacter.activeUniqueAbilities = updatedActiveAbilities;

    // Update specialization progression
    updatedCharacter.specializationProgression = {
      ...character.specializationProgression,
      activeUniqueAbilities: updatedActiveAbilities,
      progressionHistory: [
        ...(character.specializationProgression?.progressionHistory || []),
        {
          id: `activate_${abilityId}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          turnId: 'ability_activation',
          action: 'activate_ability',
          details: {
            abilityId,
            reason
          },
          storyContext: reason
        }
      ]
    };

    return {
      success: true,
      character: updatedCharacter
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to activate unique ability: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function executeReturnByDeath(
  character: any,
  storyState: any
): Promise<{ success: boolean; character?: any; error?: string }> {
  try {
    // Validate input parameters
    if (!character) {
      return {
        success: false,
        error: 'Character parameter is required'
      };
    }

    // Check if Return by Death ability is available
    const unlockedAbilities = character.unlockedUniqueAbilities || [];
    if (!unlockedAbilities.includes('return_by_death')) {
      return {
        success: false,
        error: 'Return by Death ability is not unlocked'
      };
    }

    // Get Return by Death ability data
    const returnByDeathAbility = character.returnByDeathAbility || {};
    const psychState = returnByDeathAbility.psychologicalProgression || {};

    // Check if ability is on cooldown
    if (returnByDeathAbility.currentCooldown && returnByDeathAbility.currentCooldown > 0) {
      return {
        success: false,
        error: `Return by Death is on cooldown (${returnByDeathAbility.currentCooldown} turns remaining)`
      };
    }

    // Execute the return by death
    const executionTimestamp = new Date().toISOString();
    
    // Calculate psychological impact
    const currentSanity = psychState.currentSanity || 100;
    const sanityLoss = Math.min(25, currentSanity); // Lose up to 25 sanity, but not below 0
    const newSanity = Math.max(0, currentSanity - sanityLoss);
    
    // Determine psychological stage progression
    let newStage = psychState.currentStage || 'denial';
    if (newSanity < 80 && newStage === 'denial') newStage = 'panic';
    if (newSanity < 60 && newStage === 'panic') newStage = 'experimentation';
    if (newSanity < 40 && newStage === 'experimentation') newStage = 'determination';
    if (newSanity < 20 && newStage === 'determination') newStage = 'desperation';

    // Update psychological progression
    const newPsychState = {
      ...psychState,
      currentSanity: newSanity,
      maxSanity: psychState.maxSanity || 100,
      traumaAccumulation: (psychState.traumaAccumulation || 0) + 15,
      desensitizationLevel: Math.min(100, (psychState.desensitizationLevel || 0) + 10),
      determinationLevel: Math.min(100, (psychState.determinationLevel || 50) + 5),
      isolationLevel: Math.min(100, (psychState.isolationLevel || 0) + 8),
      currentStage: newStage,
      stageProgression: 0 // Reset stage progression
    };

    // Create usage record
    const usageRecord = {
      usageId: `rbd_execution_${Date.now()}`,
      timestamp: executionTimestamp,
      turnId: 'rbd_execution',
      triggerReason: 'Death triggered Return by Death',
      stateBeforeUsage: {
        health: 0, // Assumes character died
        sanity: currentSanity,
        location: storyState?.currentLocation || 'unknown',
        traumaLevel: psychState.traumaAccumulation || 0
      },
      stateAfterUsage: {
        health: character.maxHealth || 100,
        sanity: newSanity,
        location: storyState?.currentLocation || 'unknown',
        traumaLevel: newPsychState.traumaAccumulation
      },
      psychologicalImpact: 85,
      narrativeConsequences: [
        'Experienced death and returned to checkpoint',
        'Retained all memories of the failed timeline',
        'Psychological trauma accumulated significantly',
        'Determination to change fate strengthened',
        newStage !== psychState.currentStage ? `Psychological state evolved to: ${newStage}` : 'Psychological state remained stable'
      ]
    };

    // Update the character
    const updatedCharacter = {
      ...character,
      // Reset physical state
      health: character.maxHealth || 100,
      mana: character.maxMana || 0,
      
      // Update Return by Death ability
      returnByDeathAbility: {
        ...returnByDeathAbility,
        psychologicalProgression: newPsychState,
        usageHistory: [
          ...(returnByDeathAbility.usageHistory || []),
          usageRecord
        ],
        currentCooldown: 5 // 5 turn cooldown after execution
      },

      // Update specialization progression
      specializationProgression: {
        ...character.specializationProgression,
        progressionHistory: [
          ...(character.specializationProgression?.progressionHistory || []),
          {
            id: `rbd_execution_${Date.now()}`,
            timestamp: executionTimestamp,
            turnId: 'rbd_execution',
            action: 'execute_return_by_death',
            details: {
              abilityId: 'return_by_death',
              sanityLoss,
              newStage,
              traumaAccumulated: 15
            },
            storyContext: 'Return by Death executed due to character death'
          }
        ]
      }
    };

    return {
      success: true,
      character: updatedCharacter
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to execute Return by Death: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
