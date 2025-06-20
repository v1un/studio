/**
 * Character Specialization Engine
 * 
 * Core system for managing character specializations, unique abilities,
 * and series-specific powers like "Return by Death".
 */

import type {
  CharacterProfile,
  StructuredStoryState,
  SpecializationTree,
  SpecializationNode,
  SpecializationProgression,
  UniqueAbility,
  ReturnByDeathAbility,
  SpecializationPrerequisite,
  SpecializationProgressionRecord,
  SpecializationCategory,
  SpecializationRarity,
  AbilityUsageRecord,
  PsychologicalProgressionTracker,
  TemporalGameState
} from '@/types/story';
import { generateUUID } from '@/lib/utils';
import { getAllSpecializationTrees, getSeriesSpecificSpecializations } from '@/lib/default-specializations';

// === SPECIALIZATION PROGRESSION ===

export function initializeSpecializationProgression(
  character: CharacterProfile,
  seriesName: string
): SpecializationProgression {
  return {
    characterId: character.name, // Using name as ID for now
    availablePoints: calculateInitialSpecializationPoints(character),
    totalPointsEarned: 0,
    activeSpecializations: [],
    specializationTrees: {},
    unlockedUniqueAbilities: [],
    activeUniqueAbilities: [],
    progressionHistory: [],
    seriesSpecializations: {
      [seriesName]: []
    }
  };
}

export function calculateInitialSpecializationPoints(character: CharacterProfile): number {
  // Base points from level
  const levelPoints = Math.floor(character.level / 5);
  
  // Bonus points from high attributes
  const attributeBonus = Math.floor(
    ((character.strength || 10) + 
     (character.intelligence || 10) + 
     (character.charisma || 10)) / 30
  );
  
  return Math.max(1, levelPoints + attributeBonus);
}

export function earnSpecializationPoints(
  progression: SpecializationProgression,
  points: number,
  reason: string,
  turnId: string
): SpecializationProgression {
  const record: SpecializationProgressionRecord = {
    id: generateUUID(),
    timestamp: new Date().toISOString(),
    turnId,
    action: 'earn_points',
    details: { pointsEarned: points },
    storyContext: reason
  };

  return {
    ...progression,
    availablePoints: progression.availablePoints + points,
    totalPointsEarned: progression.totalPointsEarned + points,
    progressionHistory: [...progression.progressionHistory, record]
  };
}

// === DYNAMIC SPECIALIZATION GENERATION ===

export interface DynamicSpecializationContext {
  character: CharacterProfile;
  storyState: StructuredStoryState;
  seriesName: string;
  recentEvents: string[];
  currentStoryArc?: string;
  relationshipDynamics: any[];
  generationTrigger: 'scenario_generation' | 'level_milestone' | 'story_event' | 'arc_transition';
}

export interface SpecializationGenerationSettings {
  maxTreesToGenerate: number;
  preferredCategories: SpecializationCategory[];
  includeSeriesSpecific: boolean;
  balanceLevel: 'conservative' | 'moderate' | 'experimental';
  hybridMode: boolean; // Combine with existing trees
}

export async function generateDynamicSpecializations(
  context: DynamicSpecializationContext,
  settings: SpecializationGenerationSettings = {
    maxTreesToGenerate: 2,
    preferredCategories: ['combat', 'magic', 'social'],
    includeSeriesSpecific: true,
    balanceLevel: 'moderate',
    hybridMode: true
  }
): Promise<SpecializationTree[]> {
  try {
    console.log(`[DynamicSpec] Generating specializations for ${context.character.name} in ${context.seriesName}`);

    // Get existing trees as reference
    const existingTrees = getAllSpecializationTrees();
    const seriesSpecificTrees = getSeriesSpecificSpecializations(context.seriesName);

    // Analyze character and story context
    const analysisResult = analyzeSpecializationContext(context);

    // Generate new trees based on context
    const generatedTrees: SpecializationTree[] = [];

    for (let i = 0; i < settings.maxTreesToGenerate; i++) {
      const category = selectOptimalCategory(analysisResult, settings.preferredCategories, generatedTrees);

      if (settings.hybridMode && Math.random() < 0.6) {
        // Create hybrid tree combining existing template with dynamic content
        const hybridTree = await generateHybridSpecializationTree(
          context,
          category,
          existingTrees,
          analysisResult
        );
        if (hybridTree) generatedTrees.push(hybridTree);
      } else {
        // Generate completely new tree
        const newTree = await generateNewSpecializationTree(
          context,
          category,
          analysisResult
        );
        if (newTree) generatedTrees.push(newTree);
      }
    }

    // Validate and balance generated trees
    const validatedTrees = validateGeneratedTrees(generatedTrees, settings.balanceLevel);

    console.log(`[DynamicSpec] Generated ${validatedTrees.length} dynamic specialization trees`);
    return validatedTrees;

  } catch (error) {
    console.error('[DynamicSpec] Generation failed:', error);
    // Fallback to existing trees
    return getSeriesSpecificSpecializations(context.seriesName).slice(0, settings.maxTreesToGenerate);
  }
}

interface SpecializationAnalysis {
  characterThemes: string[];
  storyThemes: string[];
  powerLevel: number;
  preferredCategories: SpecializationCategory[];
  seriesContext: {
    powerSystem: string;
    thematicElements: string[];
    canonicalRestrictions: string[];
  };
  relationshipInfluences: string[];
  recentExperiences: string[];
}

function analyzeSpecializationContext(context: DynamicSpecializationContext): SpecializationAnalysis {
  const { character, storyState, seriesName, recentEvents } = context;

  // Analyze character themes
  const characterThemes = extractCharacterThemes(character);

  // Analyze story themes from recent events
  const storyThemes = extractStoryThemes(recentEvents, storyState);

  // Determine power level based on character progression
  const powerLevel = calculateCharacterPowerLevel(character);

  // Get series-specific context
  const seriesContext = getSeriesSpecializationContext(seriesName);

  // Analyze relationships for social specializations
  const relationshipInfluences = extractRelationshipInfluences(storyState);

  return {
    characterThemes,
    storyThemes,
    powerLevel,
    preferredCategories: determinePreferredCategories(characterThemes, storyThemes),
    seriesContext,
    relationshipInfluences,
    recentExperiences: recentEvents
  };
}

function extractCharacterThemes(character: CharacterProfile): string[] {
  const themes: string[] = [];

  // Class-based themes
  const characterClass = character.class?.toLowerCase() || '';
  if (characterClass.includes('warrior') || characterClass.includes('fighter')) {
    themes.push('martial_prowess', 'physical_strength', 'combat_mastery');
  }
  if (characterClass.includes('mage') || characterClass.includes('wizard')) {
    themes.push('arcane_knowledge', 'elemental_control', 'mystical_power');
  }
  if (characterClass.includes('rogue') || characterClass.includes('thief')) {
    themes.push('stealth_mastery', 'cunning_tactics', 'shadow_manipulation');
  }

  // Personality-based themes
  if (character.personalityTraits) {
    character.personalityTraits.forEach(trait => {
      const traitLower = trait.toLowerCase();
      if (traitLower.includes('brave') || traitLower.includes('courageous')) {
        themes.push('heroic_resolve', 'protective_instincts');
      }
      if (traitLower.includes('intelligent') || traitLower.includes('wise')) {
        themes.push('tactical_thinking', 'knowledge_seeking');
      }
      if (traitLower.includes('charismatic') || traitLower.includes('social')) {
        themes.push('social_influence', 'leadership_potential');
      }
    });
  }

  // Skill-based themes
  if (character.skillsAndAbilities) {
    character.skillsAndAbilities.forEach(skill => {
      const skillName = skill.name.toLowerCase();
      if (skillName.includes('sword') || skillName.includes('blade')) {
        themes.push('blade_mastery', 'weapon_expertise');
      }
      if (skillName.includes('magic') || skillName.includes('spell')) {
        themes.push('magical_aptitude', 'spellcasting_focus');
      }
      if (skillName.includes('heal') || skillName.includes('cure')) {
        themes.push('healing_arts', 'supportive_nature');
      }
    });
  }

  return [...new Set(themes)]; // Remove duplicates
}

function extractStoryThemes(recentEvents: string[], storyState: StructuredStoryState): string[] {
  const themes: string[] = [];

  // Analyze recent events for thematic content
  recentEvents.forEach(event => {
    const eventLower = event.toLowerCase();
    if (eventLower.includes('battle') || eventLower.includes('fight') || eventLower.includes('combat')) {
      themes.push('warfare', 'conflict_resolution', 'martial_trials');
    }
    if (eventLower.includes('magic') || eventLower.includes('spell') || eventLower.includes('mystical')) {
      themes.push('arcane_mysteries', 'magical_discovery', 'supernatural_encounters');
    }
    if (eventLower.includes('negotiate') || eventLower.includes('diplomacy') || eventLower.includes('social')) {
      themes.push('political_intrigue', 'social_dynamics', 'diplomatic_solutions');
    }
    if (eventLower.includes('death') || eventLower.includes('loss') || eventLower.includes('tragedy')) {
      themes.push('mortality_awareness', 'grief_processing', 'protective_instincts');
    }
    if (eventLower.includes('discovery') || eventLower.includes('learn') || eventLower.includes('knowledge')) {
      themes.push('knowledge_pursuit', 'intellectual_growth', 'wisdom_seeking');
    }
  });

  // Analyze current story arc for broader themes
  if (storyState.currentStoryArcId && storyState.storyArcs) {
    const currentArc = storyState.storyArcs.find(arc => arc.id === storyState.currentStoryArcId);
    if (currentArc) {
      const arcTheme = currentArc.theme?.toLowerCase() || '';
      if (arcTheme.includes('revenge')) themes.push('vengeance_seeking', 'justice_pursuit');
      if (arcTheme.includes('redemption')) themes.push('redemptive_journey', 'moral_growth');
      if (arcTheme.includes('discovery')) themes.push('exploration_drive', 'truth_seeking');
      if (arcTheme.includes('survival')) themes.push('survival_instincts', 'endurance_mastery');
    }
  }

  return [...new Set(themes)];
}

function calculateCharacterPowerLevel(character: CharacterProfile): number {
  // Base power from level
  let powerLevel = character.level * 10;

  // Add attribute bonuses
  const totalAttributes = (character.strength || 10) +
                         (character.intelligence || 10) +
                         (character.agility || 10) +
                         (character.charisma || 10);
  powerLevel += (totalAttributes - 40) * 2; // Bonus for above-average attributes

  // Add skill bonuses
  if (character.skillsAndAbilities) {
    powerLevel += character.skillsAndAbilities.length * 5;
  }

  // Add specialization bonuses
  if (character.activeSpecializations) {
    powerLevel += character.activeSpecializations.length * 15;
  }

  return Math.max(0, powerLevel);
}

function getSeriesSpecializationContext(seriesName: string): SpecializationAnalysis['seriesContext'] {
  switch (seriesName.toLowerCase()) {
    case 're:zero':
      return {
        powerSystem: 'Spirit Magic and Divine Protections',
        thematicElements: ['time_loops', 'psychological_trauma', 'political_intrigue', 'spirit_contracts'],
        canonicalRestrictions: ['no_overpowered_combat', 'psychological_costs', 'political_consequences']
      };

    case 'attack on titan':
      return {
        powerSystem: 'ODM Gear and Titan Powers',
        thematicElements: ['military_tactics', 'survival_horror', 'political_conspiracy', 'technological_warfare'],
        canonicalRestrictions: ['resource_limitations', 'military_hierarchy', 'titan_restrictions']
      };

    case 'my hero academia':
      return {
        powerSystem: 'Quirks and Hero Training',
        thematicElements: ['heroic_ideals', 'quirk_development', 'social_responsibility', 'villain_psychology'],
        canonicalRestrictions: ['quirk_limitations', 'hero_regulations', 'social_expectations']
      };

    default:
      return {
        powerSystem: 'Generic Fantasy Magic',
        thematicElements: ['adventure', 'magic_discovery', 'heroic_journey', 'fantasy_politics'],
        canonicalRestrictions: ['balanced_progression', 'fantasy_logic', 'narrative_consistency']
      };
  }
}

function determinePreferredCategories(
  characterThemes: string[],
  storyThemes: string[]
): SpecializationCategory[] {
  const categoryScores: Record<SpecializationCategory, number> = {
    combat: 0,
    magic: 0,
    social: 0,
    utility: 0,
    unique: 0,
    defensive: 0,
    support: 0,
    crafting: 0,
    exploration: 0,
    leadership: 0
  };

  // Score based on character themes
  characterThemes.forEach(theme => {
    if (theme.includes('combat') || theme.includes('martial') || theme.includes('weapon')) {
      categoryScores.combat += 2;
    }
    if (theme.includes('magic') || theme.includes('arcane') || theme.includes('mystical')) {
      categoryScores.magic += 2;
    }
    if (theme.includes('social') || theme.includes('leadership') || theme.includes('charisma')) {
      categoryScores.social += 2;
      categoryScores.leadership += 1;
    }
    if (theme.includes('stealth') || theme.includes('cunning') || theme.includes('tactical')) {
      categoryScores.utility += 2;
    }
    if (theme.includes('protective') || theme.includes('defensive')) {
      categoryScores.defensive += 2;
      categoryScores.support += 1;
    }
  });

  // Score based on story themes
  storyThemes.forEach(theme => {
    if (theme.includes('warfare') || theme.includes('conflict')) {
      categoryScores.combat += 1;
      categoryScores.defensive += 1;
    }
    if (theme.includes('political') || theme.includes('diplomatic')) {
      categoryScores.social += 1;
      categoryScores.leadership += 1;
    }
    if (theme.includes('magical') || theme.includes('supernatural')) {
      categoryScores.magic += 1;
      categoryScores.unique += 1;
    }
    if (theme.includes('survival') || theme.includes('exploration')) {
      categoryScores.utility += 1;
      categoryScores.exploration += 1;
    }
  });

  // Return top 3 categories
  return Object.entries(categoryScores)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category as SpecializationCategory);
}

function extractRelationshipInfluences(storyState: StructuredStoryState): string[] {
  const influences: string[] = [];

  if (storyState.relationshipDynamics) {
    storyState.relationshipDynamics.forEach(relationship => {
      const relationshipType = relationship.relationshipType?.toLowerCase() || '';
      if (relationshipType.includes('mentor')) {
        influences.push('mentorship_learning', 'skill_guidance');
      }
      if (relationshipType.includes('rival')) {
        influences.push('competitive_growth', 'challenge_seeking');
      }
      if (relationshipType.includes('ally') || relationshipType.includes('friend')) {
        influences.push('cooperative_tactics', 'team_synergy');
      }
      if (relationshipType.includes('enemy') || relationshipType.includes('antagonist')) {
        influences.push('conflict_preparation', 'defensive_strategies');
      }
    });
  }

  return [...new Set(influences)];
}

function selectOptimalCategory(
  analysisResult: SpecializationAnalysis,
  preferredCategories: SpecializationCategory[],
  existingTrees: SpecializationTree[]
): SpecializationCategory {
  // Filter out categories we've already generated
  const existingCategories = existingTrees.map(tree => tree.category);
  const availableCategories = preferredCategories.filter(cat => !existingCategories.includes(cat));

  if (availableCategories.length === 0) {
    // If all preferred categories are taken, use the first preferred
    return preferredCategories[0] || 'combat';
  }

  // Return the highest-scoring available category
  return availableCategories[0];
}

async function generateHybridSpecializationTree(
  context: DynamicSpecializationContext,
  category: SpecializationCategory,
  existingTrees: SpecializationTree[],
  analysisResult: SpecializationAnalysis
): Promise<SpecializationTree | null> {
  try {
    const { generateDynamicSpecializationTree } = await import('@/ai/flows/dynamic-specialization-generation');

    // Find a suitable base template
    const baseTemplate = existingTrees.find(tree => tree.category === category);

    const input = {
      character: context.character,
      storyState: context.storyState,
      seriesName: context.seriesName,
      category,
      analysisResult,
      generationMode: 'hybrid_tree' as const,
      baseTemplate,
      usePremiumAI: false
    };

    const result = await generateDynamicSpecializationTree(input);
    return result.specializationTree;

  } catch (error) {
    console.error('[DynamicSpec] Hybrid generation failed:', error);
    return null;
  }
}

async function generateNewSpecializationTree(
  context: DynamicSpecializationContext,
  category: SpecializationCategory,
  analysisResult: SpecializationAnalysis
): Promise<SpecializationTree | null> {
  try {
    const { generateDynamicSpecializationTree } = await import('@/ai/flows/dynamic-specialization-generation');

    const input = {
      character: context.character,
      storyState: context.storyState,
      seriesName: context.seriesName,
      category,
      analysisResult,
      generationMode: 'new_tree' as const,
      usePremiumAI: false
    };

    const result = await generateDynamicSpecializationTree(input);
    return result.specializationTree;

  } catch (error) {
    console.error('[DynamicSpec] New tree generation failed:', error);
    return null;
  }
}

function validateGeneratedTrees(
  trees: SpecializationTree[],
  balanceLevel: 'conservative' | 'moderate' | 'experimental'
): SpecializationTree[] {
  return trees.filter(tree => {
    // Basic validation
    if (!tree.name || !tree.description || tree.nodes.length === 0) {
      console.warn('[DynamicSpec] Rejecting tree with missing required fields');
      return false;
    }

    // Balance validation based on level
    const maxAllowedNodes = balanceLevel === 'conservative' ? 4 :
                           balanceLevel === 'moderate' ? 6 : 8;

    if (tree.nodes.length > maxAllowedNodes) {
      console.warn('[DynamicSpec] Rejecting tree with too many nodes');
      return false;
    }

    // Validate node bonuses aren't overpowered
    const hasOverpoweredBonus = tree.nodes.some(node =>
      node.bonuses.some(bonus => bonus.value > 100)
    );

    if (hasOverpoweredBonus) {
      console.warn('[DynamicSpec] Rejecting tree with overpowered bonuses');
      return false;
    }

    return true;
  });
}

// === INTEGRATION WITH EXISTING SYSTEM ===

export async function getAvailableSpecializationTrees(
  character: CharacterProfile,
  storyState?: StructuredStoryState,
  seriesName: string = 'Generic Fantasy',
  includeDynamic: boolean = true
): Promise<{ availableTrees: SpecializationTree[], lockedTrees: SpecializationTree[] }> {
  // Get base hard-coded trees
  const allBaseTrees = getAllSpecializationTrees();
  const seriesSpecificTrees = getSeriesSpecificSpecializations(seriesName);
  const baseTrees = [...allBaseTrees, ...seriesSpecificTrees];

  // Separate available and locked trees
  const availableTrees: SpecializationTree[] = [];
  const lockedTrees: SpecializationTree[] = [];

  baseTrees.forEach(tree => {
    const canUnlock = tree.unlockRequirements.every(req => {
      if (req.type === 'level') {
        return character.level >= Number(req.value);
      }
      if (req.type === 'attribute') {
        return (character[req.target as keyof CharacterProfile] as number || 0) >= Number(req.value);
      }
      return true;
    });

    if (canUnlock) {
      availableTrees.push(tree);
    } else {
      lockedTrees.push(tree);
    }
  });

  // Add dynamic trees if enabled and story state is available
  if (includeDynamic && storyState) {
    try {
      const dynamicContext: DynamicSpecializationContext = {
        character,
        storyState,
        seriesName,
        recentEvents: extractRecentEvents(storyState),
        currentStoryArc: storyState.currentStoryArcId,
        relationshipDynamics: storyState.relationshipDynamics || [],
        generationTrigger: 'level_milestone'
      };

      const dynamicTrees = await generateDynamicSpecializations(dynamicContext);
      availableTrees.push(...dynamicTrees);

    } catch (error) {
      console.warn('[DynamicSpec] Failed to generate dynamic trees, using base trees only:', error);
    }
  }

  return { availableTrees, lockedTrees };
}

function extractRecentEvents(storyState: StructuredStoryState): string[] {
  // Extract recent events from narrative threads or story history
  const events: string[] = [];

  if (storyState.narrativeThreads) {
    // Get the most recent narrative threads
    const recentThreads = storyState.narrativeThreads.slice(-5);
    recentThreads.forEach(thread => {
      if (thread.description) {
        events.push(thread.description);
      }
    });
  }

  // Add any major story events
  if (storyState.majorEvents) {
    events.push(...storyState.majorEvents.slice(-3));
  }

  return events;
}

// === SPECIALIZATION TREE MANAGEMENT ===

export function unlockSpecializationTree(
  progression: SpecializationProgression,
  tree: SpecializationTree,
  character: CharacterProfile
): { success: boolean; progression?: SpecializationProgression; error?: string } {
  // Check if already unlocked
  if (progression.specializationTrees[tree.id]) {
    return { success: false, error: 'Specialization tree already unlocked' };
  }

  // Check requirements
  const requirementCheck = checkSpecializationRequirements(tree.unlockRequirements, character);
  if (!requirementCheck.canUnlock) {
    return { success: false, error: requirementCheck.reason };
  }

  // Check exclusivity
  const exclusivityCheck = checkSpecializationExclusivity(tree, progression);
  if (!exclusivityCheck.canUnlock) {
    return { success: false, error: exclusivityCheck.reason };
  }

  const updatedTrees = {
    ...progression.specializationTrees,
    [tree.id]: { ...tree, pointsSpent: 0 }
  };

  return {
    success: true,
    progression: {
      ...progression,
      specializationTrees: updatedTrees
    }
  };
}

export function purchaseSpecializationNode(
  progression: SpecializationProgression,
  treeId: string,
  nodeId: string,
  turnId: string
): { success: boolean; progression?: SpecializationProgression; error?: string } {
  const tree = progression.specializationTrees[treeId];
  if (!tree) {
    return { success: false, error: 'Specialization tree not found' };
  }

  const node = tree.nodes.find(n => n.id === nodeId);
  if (!node) {
    return { success: false, error: 'Specialization node not found' };
  }

  if (node.isPurchased) {
    return { success: false, error: 'Node already purchased' };
  }

  if (!node.isUnlocked) {
    return { success: false, error: 'Node not unlocked' };
  }

  if (progression.availablePoints < node.pointCost) {
    return { success: false, error: 'Insufficient specialization points' };
  }

  // Check prerequisites
  const prerequisitesMet = node.prerequisites.every(prereqId =>
    tree.nodes.find(n => n.id === prereqId)?.isPurchased
  );

  if (!prerequisitesMet) {
    return { success: false, error: 'Prerequisites not met' };
  }

  // Purchase the node
  const updatedNode = { ...node, isPurchased: true };
  const updatedNodes = tree.nodes.map(n => n.id === nodeId ? updatedNode : n);
  const updatedTree = {
    ...tree,
    nodes: updatedNodes,
    pointsSpent: tree.pointsSpent + node.pointCost
  };

  // Unlock connected nodes
  const nodesWithNewUnlocks = unlockConnectedNodes(updatedNodes, nodeId);

  const finalTree = {
    ...updatedTree,
    nodes: nodesWithNewUnlocks
  };

  const record: SpecializationProgressionRecord = {
    id: generateUUID(),
    timestamp: new Date().toISOString(),
    turnId,
    action: 'purchase_node',
    details: {
      specializationId: treeId,
      nodeId,
      pointsSpent: node.pointCost
    },
    storyContext: `Purchased ${node.name} in ${tree.name}`
  };

  return {
    success: true,
    progression: {
      ...progression,
      availablePoints: progression.availablePoints - node.pointCost,
      specializationTrees: {
        ...progression.specializationTrees,
        [treeId]: finalTree
      },
      progressionHistory: [...progression.progressionHistory, record]
    }
  };
}

// === UNIQUE ABILITIES SYSTEM ===

export function unlockUniqueAbility(
  character: CharacterProfile,
  ability: UniqueAbility,
  storyContext: string
): CharacterProfile {
  const existingAbilities = character.unlockedUniqueAbilities || [];
  
  // Check if already unlocked
  if (existingAbilities.some(a => a.id === ability.id)) {
    return character;
  }

  const unlockedAbility = {
    ...ability,
    isUnlocked: true,
    isActive: false,
    usageHistory: []
  };

  return {
    ...character,
    unlockedUniqueAbilities: [...existingAbilities, unlockedAbility]
  };
}

export function activateUniqueAbility(
  character: CharacterProfile,
  abilityId: string,
  storyState: StructuredStoryState,
  triggerReason: string,
  turnId: string
): { 
  success: boolean; 
  character?: CharacterProfile; 
  storyState?: StructuredStoryState;
  error?: string;
  abilityResult?: any;
} {
  const ability = character.unlockedUniqueAbilities?.find(a => a.id === abilityId);
  if (!ability) {
    return { success: false, error: 'Unique ability not found' };
  }

  if (!ability.isUnlocked) {
    return { success: false, error: 'Ability not unlocked' };
  }

  // Check cooldown
  if (ability.currentCooldown && ability.currentCooldown > 0) {
    return { success: false, error: `Ability on cooldown for ${ability.currentCooldown} more turns` };
  }

  // Check activation conditions
  const conditionCheck = checkAbilityActivationConditions(ability, character, storyState, triggerReason);
  if (!conditionCheck.canActivate) {
    return { success: false, error: conditionCheck.reason };
  }

  // Apply costs
  const { character: characterAfterCosts, canAfford } = applyAbilityCosts(character, ability);
  if (!canAfford) {
    return { success: false, error: 'Cannot afford ability costs' };
  }

  // Execute ability effect
  const abilityResult = executeUniqueAbilityEffect(ability, characterAfterCosts, storyState, turnId);

  // Record usage
  const usageRecord: AbilityUsageRecord = {
    usageId: generateUUID(),
    timestamp: new Date().toISOString(),
    turnId,
    triggerReason,
    stateBeforeUsage: { character, storyState },
    stateAfterUsage: abilityResult,
    psychologicalImpact: calculatePsychologicalImpact(ability, triggerReason),
    narrativeConsequences: []
  };

  const updatedAbility = {
    ...ability,
    isActive: true,
    currentCooldown: ability.cooldownInfo.duration,
    usageHistory: [...ability.usageHistory, usageRecord]
  };

  const updatedCharacter = {
    ...abilityResult.character,
    unlockedUniqueAbilities: characterAfterCosts.unlockedUniqueAbilities?.map(a =>
      a.id === abilityId ? updatedAbility : a
    ) || [],
    activeUniqueAbilities: [...(characterAfterCosts.activeUniqueAbilities || []), abilityId]
  };

  return {
    success: true,
    character: updatedCharacter,
    storyState: abilityResult.storyState,
    abilityResult: abilityResult.effectResult
  };
}

// === HELPER FUNCTIONS ===

function checkSpecializationRequirements(
  requirements: SpecializationPrerequisite[],
  character: CharacterProfile
): { canUnlock: boolean; reason?: string } {
  for (const req of requirements) {
    switch (req.type) {
      case 'level':
        if (character.level < Number(req.value)) {
          return { canUnlock: false, reason: `Requires level ${req.value}` };
        }
        break;
      case 'attribute':
        const attrValue = (character as any)[req.target] || 0;
        if (attrValue < Number(req.value)) {
          return { canUnlock: false, reason: `Requires ${req.target} ${req.value}` };
        }
        break;
      // Add more requirement types as needed
    }
  }
  return { canUnlock: true };
}

function checkSpecializationExclusivity(
  tree: SpecializationTree,
  progression: SpecializationProgression
): { canUnlock: boolean; reason?: string } {
  if (!tree.exclusiveWith) return { canUnlock: true };

  for (const exclusiveTreeId of tree.exclusiveWith) {
    if (progression.specializationTrees[exclusiveTreeId]) {
      return { 
        canUnlock: false, 
        reason: `Cannot unlock due to exclusive specialization: ${exclusiveTreeId}` 
      };
    }
  }
  return { canUnlock: true };
}

function unlockConnectedNodes(nodes: SpecializationNode[], purchasedNodeId: string): SpecializationNode[] {
  return nodes.map(node => {
    if (node.isUnlocked || node.isPurchased) return node;

    // Check if all prerequisites are now met
    const prerequisitesMet = node.prerequisites.every(prereqId =>
      nodes.find(n => n.id === prereqId)?.isPurchased
    );

    if (prerequisitesMet) {
      return { ...node, isUnlocked: true };
    }

    return node;
  });
}

function checkAbilityActivationConditions(
  ability: UniqueAbility,
  character: CharacterProfile,
  storyState: StructuredStoryState,
  triggerReason: string
): { canActivate: boolean; reason?: string } {
  // Implementation depends on specific ability conditions
  // For now, return true - will be expanded based on ability types
  return { canActivate: true };
}

function applyAbilityCosts(
  character: CharacterProfile,
  ability: UniqueAbility
): { character: CharacterProfile; canAfford: boolean } {
  let updatedCharacter = { ...character };
  
  for (const cost of ability.costs) {
    switch (cost.type) {
      case 'health':
        if (updatedCharacter.health < cost.amount) {
          return { character, canAfford: false };
        }
        updatedCharacter.health -= cost.amount;
        break;
      case 'mana':
        if ((updatedCharacter.mana || 0) < cost.amount) {
          return { character, canAfford: false };
        }
        updatedCharacter.mana = (updatedCharacter.mana || 0) - cost.amount;
        break;
      // Add more cost types as needed
    }
  }

  return { character: updatedCharacter, canAfford: true };
}

function executeUniqueAbilityEffect(
  ability: UniqueAbility,
  character: CharacterProfile,
  storyState: StructuredStoryState,
  turnId: string
): { character: CharacterProfile; storyState: StructuredStoryState; effectResult: any } {
  // This will be implemented based on specific ability types
  // For now, return unchanged state
  return { character, storyState, effectResult: {} };
}

function calculatePsychologicalImpact(ability: UniqueAbility, triggerReason: string): number {
  // Calculate based on ability power level and trigger circumstances
  let impact = ability.powerLevel * 0.1; // Base impact

  if (triggerReason.includes('death')) {
    impact += 20; // Death-related triggers have high psychological impact
  }

  return Math.min(100, impact);
}

// Export helper functions that are used in API routes
export { checkSpecializationRequirements };
