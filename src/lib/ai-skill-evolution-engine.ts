/**
 * AI Skill Evolution Engine
 * 
 * Manages hierarchical skill evolution chains with AI-generated branching paths,
 * automatic upgrades based on story events and usage patterns.
 */

import type {
  CharacterProfile,
  StructuredStoryState,
  DynamicSkillNode,
  SkillEvolutionChain,
  SkillEvolutionTier,
  SkillBranchingPoint,
  SkillUsageTracker,
  EvolutionDecisionPoint,
  AISkillEvolutionRequest,
  AISkillEvolutionResponse,
  SkillBranchTheme,
  EvolutionUnlockCondition,
  MechanicalImprovement,
  SkillEvolutionRequirement,
  BranchRequirement
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === SKILL EVOLUTION CHAIN GENERATION ===

export function generateSkillEvolutionChain(
  baseSkill: DynamicSkillNode,
  character: CharacterProfile,
  storyState: StructuredStoryState,
  seriesName: string,
  options: {
    evolutionDepth?: number;
    branchingOptions?: number;
    focusThemes?: SkillBranchTheme[];
  } = {}
): SkillEvolutionChain {
  const {
    evolutionDepth = 5,
    branchingOptions = 3,
    focusThemes = ['combat_focused', 'elemental_infusion', 'defensive_mastery']
  } = options;

  const chainId = generateUUID();
  const chainName = `${baseSkill.name} Evolution Chain`;

  // Generate linear progression tiers
  const evolutionTiers = generateEvolutionTiers(
    baseSkill,
    character,
    storyState,
    seriesName,
    evolutionDepth
  );

  // Generate branching points
  const branchingPoints = generateBranchingPoints(
    baseSkill,
    evolutionTiers,
    character,
    storyState,
    focusThemes,
    branchingOptions
  );

  return {
    id: chainId,
    baseSkillId: baseSkill.id,
    chainName,
    description: `Evolution chain for ${baseSkill.name}, offering multiple paths of development`,
    maxTier: evolutionDepth,
    evolutionTiers,
    branchingPoints,
    generationContext: {
      characterClass: character.class,
      storyThemes: extractStoryThemes(storyState),
      availableElements: extractAvailableElements(storyState, seriesName),
      characterFocus: analyzeCharacterFocus(character),
      seriesContext: seriesName,
      generationTimestamp: new Date()
    }
  };
}

function generateEvolutionTiers(
  baseSkill: DynamicSkillNode,
  character: CharacterProfile,
  storyState: StructuredStoryState,
  seriesName: string,
  depth: number
): SkillEvolutionTier[] {
  const tiers: SkillEvolutionTier[] = [];
  
  // Tier 0 is the base skill
  tiers.push(createBaseTier(baseSkill));

  // Generate progressive tiers
  for (let tier = 1; tier <= depth; tier++) {
    const previousTier = tiers[tier - 1];
    const newTier = generateNextTier(
      previousTier,
      tier,
      baseSkill,
      character,
      storyState,
      seriesName
    );
    tiers.push(newTier);
  }

  return tiers;
}

function createBaseTier(baseSkill: DynamicSkillNode): SkillEvolutionTier {
  return {
    tier: 0,
    skillId: baseSkill.id,
    name: baseSkill.name,
    description: baseSkill.description,
    effects: baseSkill.effects,
    requirements: [],
    unlockConditions: [{
      id: generateUUID(),
      type: 'automatic',
      description: 'Base skill - automatically available',
      isActive: true
    }],
    mechanicalImprovements: [],
    narrativeSignificance: 'Foundation skill that begins the evolution journey',
    isUnlocked: true,
    isActive: true
  };
}

function generateNextTier(
  previousTier: SkillEvolutionTier,
  tier: number,
  baseSkill: DynamicSkillNode,
  character: CharacterProfile,
  storyState: StructuredStoryState,
  seriesName: string
): SkillEvolutionTier {
  const tierNames = generateTierNames(baseSkill.name, tier, seriesName);
  const enhancedEffects = enhanceSkillEffects(previousTier.effects, tier);
  const requirements = generateTierRequirements(tier, character, storyState);
  const improvements = calculateMechanicalImprovements(previousTier.effects, enhancedEffects);

  return {
    tier,
    skillId: generateUUID(),
    name: tierNames.name,
    description: tierNames.description,
    effects: enhancedEffects,
    requirements,
    unlockConditions: [{
      id: generateUUID(),
      type: 'automatic',
      description: `Automatically unlocks when all requirements are met`,
      isActive: true
    }],
    mechanicalImprovements: improvements,
    narrativeSignificance: generateNarrativeSignificance(tier, baseSkill.name, seriesName),
    isUnlocked: false,
    isActive: false
  };
}

function generateTierNames(baseName: string, tier: number, seriesName: string): { name: string; description: string } {
  // Extract the core concept from the base name
  const coreWord = baseName.split(' ').pop() || baseName;
  
  // Define progression materials/concepts by series context
  const progressionMaterials = getProgressionMaterials(seriesName);
  const material = progressionMaterials[Math.min(tier - 1, progressionMaterials.length - 1)];
  
  const name = `${material} ${coreWord}`;
  const description = `An evolved form of ${baseName}, enhanced with ${material.toLowerCase()} properties for greater power and versatility.`;
  
  return { name, description };
}

function getProgressionMaterials(seriesName: string): string[] {
  // Series-specific progression materials as examples
  const seriesLower = seriesName.toLowerCase();
  
  if (seriesLower.includes('re:zero')) {
    return ['Steel', 'Mithril', 'Dragon', 'Divine', 'Witch'];
  } else if (seriesLower.includes('attack on titan')) {
    return ['Hardened', 'Crystallized', 'Founding', 'Coordinate', 'Paths'];
  } else if (seriesLower.includes('hero academia')) {
    return ['Plus', 'Ultra', 'One For All', 'Quirk Awakened', 'Transcendent'];
  } else {
    // Generic fantasy progression
    return ['Steel', 'Titanium', 'Diamond', 'Mythril', 'Legendary'];
  }
}

function enhanceSkillEffects(baseEffects: any[], tier: number): any[] {
  return baseEffects.map(effect => {
    const enhancement = calculateEnhancement(tier);
    
    if (effect.type === 'stat_bonus' && typeof effect.value === 'number') {
      return {
        ...effect,
        value: Math.floor(effect.value * enhancement),
        description: `${effect.description} (Tier ${tier} Enhancement)`
      };
    }
    
    if (effect.type === 'passive_effect') {
      return {
        ...effect,
        description: `${effect.description} - Enhanced (Tier ${tier})`
      };
    }
    
    return effect;
  });
}

function calculateEnhancement(tier: number): number {
  // Progressive enhancement that's not too overpowered
  return 1 + (tier * 0.3); // 30% increase per tier
}

function generateTierRequirements(
  tier: number,
  character: CharacterProfile,
  storyState: StructuredStoryState
): SkillEvolutionRequirement[] {
  const requirements: SkillEvolutionRequirement[] = [];
  
  // Usage-based requirement
  requirements.push({
    type: 'usage_count',
    description: `Use the skill successfully ${tier * 5} times`,
    currentValue: 0,
    requiredValue: tier * 5,
    isMet: false,
    trackingMetric: 'successful_uses'
  });
  
  // Attribute threshold for higher tiers
  if (tier >= 3) {
    const attributeThreshold = 10 + (tier * 2);
    requirements.push({
      type: 'attribute_threshold',
      description: `Reach ${attributeThreshold} in a relevant attribute`,
      currentValue: Math.max(
        character.strength || 0,
        character.dexterity || 0,
        character.intelligence || 0
      ),
      requiredValue: attributeThreshold,
      isMet: false,
      trackingMetric: 'max_attribute'
    });
  }
  
  // Story milestone for high tiers
  if (tier >= 4) {
    requirements.push({
      type: 'story_milestone',
      description: `Complete a major story milestone`,
      currentValue: storyState.narrativeThreads.filter(t => t.significance === 'major').length,
      requiredValue: 1,
      isMet: false,
      trackingMetric: 'major_milestones'
    });
  }
  
  return requirements;
}

function calculateMechanicalImprovements(
  oldEffects: any[],
  newEffects: any[]
): MechanicalImprovement[] {
  const improvements: MechanicalImprovement[] = [];
  
  for (let i = 0; i < Math.min(oldEffects.length, newEffects.length); i++) {
    const oldEffect = oldEffects[i];
    const newEffect = newEffects[i];
    
    if (oldEffect.type === 'stat_bonus' && newEffect.type === 'stat_bonus') {
      const oldValue = typeof oldEffect.value === 'number' ? oldEffect.value : 0;
      const newValue = typeof newEffect.value === 'number' ? newEffect.value : 0;
      const increase = newValue - oldValue;
      
      if (increase > 0) {
        improvements.push({
          type: 'damage_increase',
          description: `+${increase} bonus increase`,
          value: increase,
          comparedToPrevious: `${increase} more than previous tier`
        });
      }
    }
  }
  
  return improvements;
}

function generateNarrativeSignificance(tier: number, baseName: string, seriesName: string): string {
  const tierDescriptions = [
    '', // Tier 0 handled separately
    `The first evolution of ${baseName}, showing initial mastery and understanding.`,
    `A significant advancement in ${baseName}, demonstrating growing expertise.`,
    `A major breakthrough in ${baseName}, reaching new levels of power.`,
    `Near-mastery of ${baseName}, approaching legendary status.`,
    `The ultimate evolution of ${baseName}, achieving mythical power.`
  ];
  
  return tierDescriptions[Math.min(tier, tierDescriptions.length - 1)];
}

// === HELPER FUNCTIONS ===

function extractStoryThemes(storyState: StructuredStoryState): string[] {
  return storyState.narrativeThreads.map(thread => thread.theme);
}

function extractAvailableElements(storyState: StructuredStoryState, seriesName: string): string[] {
  // Extract elements based on series and story context
  const elements = ['Physical', 'Mental'];
  
  if (seriesName.toLowerCase().includes('magic') || 
      storyState.worldFacts.some(fact => fact.toLowerCase().includes('magic'))) {
    elements.push('Fire', 'Water', 'Earth', 'Air', 'Lightning', 'Ice');
  }
  
  return elements;
}

function analyzeCharacterFocus(character: CharacterProfile): string[] {
  const focus = [];

  if ((character.strength || 0) > 12) focus.push('Physical Combat');
  if ((character.intelligence || 0) > 12) focus.push('Mental Abilities');
  if ((character.charisma || 0) > 12) focus.push('Social Interaction');
  if ((character.dexterity || 0) > 12) focus.push('Agility and Precision');

  return focus.length > 0 ? focus : ['Balanced Development'];
}

// === BRANCHING SYSTEM ===

function generateBranchingPoints(
  baseSkill: DynamicSkillNode,
  evolutionTiers: SkillEvolutionTier[],
  character: CharacterProfile,
  storyState: StructuredStoryState,
  focusThemes: SkillBranchTheme[],
  branchingOptions: number
): SkillBranchingPoint[] {
  const branchingPoints: SkillBranchingPoint[] = [];

  // Create branching points at tier 2 and tier 4
  const branchingTiers = [2, 4];

  branchingTiers.forEach(tier => {
    if (tier < evolutionTiers.length) {
      const branches = createBranchesForTier(
        baseSkill,
        tier,
        character,
        storyState,
        focusThemes.slice(0, branchingOptions)
      );
      branchingPoints.push(...branches);
    }
  });

  return branchingPoints;
}

function createBranchesForTier(
  baseSkill: DynamicSkillNode,
  tier: number,
  character: CharacterProfile,
  storyState: StructuredStoryState,
  themes: SkillBranchTheme[]
): SkillBranchingPoint[] {
  return themes.map(theme => {
    const branchId = generateUUID();
    const branchData = generateBranchData(baseSkill, tier, theme, character, storyState);

    return {
      atTier: tier,
      branchId,
      branchName: branchData.name,
      branchTheme: theme,
      description: branchData.description,
      requirements: generateBranchRequirements(theme, character, storyState),
      evolutionPath: generateBranchEvolutionPath(baseSkill, tier, theme, character),
      narrativeJustification: branchData.narrativeJustification
    };
  });
}

function generateBranchData(
  baseSkill: DynamicSkillNode,
  tier: number,
  theme: SkillBranchTheme,
  character: CharacterProfile,
  storyState: StructuredStoryState
): { name: string; description: string; narrativeJustification: string } {
  const baseName = baseSkill.name;

  switch (theme) {
    case 'combat_focused':
      return {
        name: `${baseName} - Combat Mastery`,
        description: `Focuses on maximizing combat effectiveness and damage output`,
        narrativeJustification: `${character.name}'s combat experience drives this evolution toward pure fighting prowess`
      };

    case 'elemental_infusion':
      return {
        name: `${baseName} - Elemental Path`,
        description: `Infuses the skill with elemental properties for versatile effects`,
        narrativeJustification: `Exposure to elemental forces in the story allows for magical enhancement`
      };

    case 'defensive_mastery':
      return {
        name: `${baseName} - Guardian Path`,
        description: `Evolves toward protection and defensive capabilities`,
        narrativeJustification: `${character.name}'s protective instincts shape this defensive evolution`
      };

    case 'utility_enhancement':
      return {
        name: `${baseName} - Versatile Application`,
        description: `Expands utility and problem-solving applications`,
        narrativeJustification: `Creative use in various situations unlocks new possibilities`
      };

    case 'social_application':
      return {
        name: `${baseName} - Social Influence`,
        description: `Adapts the skill for social and interpersonal situations`,
        narrativeJustification: `Strong relationships and social connections influence this evolution`
      };

    default:
      return {
        name: `${baseName} - Specialized Path`,
        description: `A unique evolution path based on character development`,
        narrativeJustification: `Character's unique journey creates this specialized evolution`
      };
  }
}

function generateBranchRequirements(
  theme: SkillBranchTheme,
  character: CharacterProfile,
  storyState: StructuredStoryState
): BranchRequirement[] {
  const requirements: BranchRequirement[] = [];

  switch (theme) {
    case 'combat_focused':
      requirements.push({
        type: 'character_focus',
        description: 'High combat attribute (Strength or Dexterity)',
        condition: 'strength >= 14 OR dexterity >= 14',
        isMet: (character.strength || 0) >= 14 || (character.dexterity || 0) >= 14,
        priority: 80
      });
      break;

    case 'elemental_infusion':
      requirements.push({
        type: 'environmental_exposure',
        description: 'Exposure to magical or elemental forces',
        condition: 'story contains magical elements',
        isMet: storyState.worldFacts.some(fact =>
          fact.toLowerCase().includes('magic') ||
          fact.toLowerCase().includes('elemental')
        ),
        priority: 70
      });
      break;

    case 'defensive_mastery':
      requirements.push({
        type: 'character_focus',
        description: 'High Constitution or protective behavior',
        condition: 'constitution >= 14 OR protective actions taken',
        isMet: (character.constitution || 0) >= 14,
        priority: 75
      });
      break;

    case 'social_application':
      requirements.push({
        type: 'story_path',
        description: 'Strong positive relationships',
        condition: 'multiple positive relationships',
        isMet: storyState.npcRelationships.filter(rel => rel.relationshipScore > 50).length >= 2,
        priority: 65
      });
      break;
  }

  return requirements;
}

function generateBranchEvolutionPath(
  baseSkill: DynamicSkillNode,
  startTier: number,
  theme: SkillBranchTheme,
  character: CharacterProfile
): SkillEvolutionTier[] {
  const path: SkillEvolutionTier[] = [];
  const maxBranchTiers = 3; // Generate 3 tiers for each branch

  for (let i = 0; i < maxBranchTiers; i++) {
    const tier = startTier + i;
    const branchTier = generateBranchTier(baseSkill, tier, theme, character, i);
    path.push(branchTier);
  }

  return path;
}

function generateBranchTier(
  baseSkill: DynamicSkillNode,
  tier: number,
  theme: SkillBranchTheme,
  character: CharacterProfile,
  branchIndex: number
): SkillEvolutionTier {
  const branchNames = getBranchTierNames(baseSkill.name, theme, branchIndex);
  const branchEffects = generateBranchEffects(baseSkill.effects, theme, tier);

  return {
    tier,
    skillId: generateUUID(),
    name: branchNames.name,
    description: branchNames.description,
    effects: branchEffects,
    requirements: [{
      type: 'usage_count',
      description: `Use previous tier skill ${tier * 3} times`,
      currentValue: 0,
      requiredValue: tier * 3,
      isMet: false,
      trackingMetric: 'branch_usage'
    }],
    unlockConditions: [{
      id: generateUUID(),
      type: 'player_choice',
      description: 'Player must choose this branch path',
      isActive: false
    }],
    mechanicalImprovements: [],
    narrativeSignificance: `Branch evolution focusing on ${theme.replace('_', ' ')}`,
    isUnlocked: false,
    isActive: false
  };
}

function getBranchTierNames(
  baseName: string,
  theme: SkillBranchTheme,
  branchIndex: number
): { name: string; description: string } {
  const coreWord = baseName.split(' ').pop() || baseName;

  const themeProgression = {
    combat_focused: ['Warrior', 'Berserker', 'Destroyer'],
    elemental_infusion: ['Flame', 'Inferno', 'Phoenix'],
    defensive_mastery: ['Guardian', 'Fortress', 'Sanctuary'],
    utility_enhancement: ['Versatile', 'Adaptive', 'Omnipotent'],
    social_application: ['Inspiring', 'Commanding', 'Legendary']
  };

  const progression = themeProgression[theme] || ['Enhanced', 'Superior', 'Ultimate'];
  const modifier = progression[Math.min(branchIndex, progression.length - 1)];

  return {
    name: `${modifier} ${coreWord}`,
    description: `${baseName} evolved along the ${theme.replace('_', ' ')} path, gaining ${modifier.toLowerCase()} properties`
  };
}

function generateBranchEffects(baseEffects: any[], theme: SkillBranchTheme, tier: number): any[] {
  const enhancedEffects = [...baseEffects];

  // Add theme-specific effects
  switch (theme) {
    case 'combat_focused':
      enhancedEffects.push({
        type: 'stat_bonus',
        value: tier * 5,
        description: `+${tier * 5} Combat Damage`,
        target: 'damage'
      });
      break;

    case 'elemental_infusion':
      enhancedEffects.push({
        type: 'passive_effect',
        value: 'elemental_damage',
        description: 'Adds elemental damage to attacks',
        target: 'elemental'
      });
      break;

    case 'defensive_mastery':
      enhancedEffects.push({
        type: 'stat_bonus',
        value: tier * 3,
        description: `+${tier * 3} Damage Reduction`,
        target: 'defense'
      });
      break;
  }

  return enhancedEffects;
}

// === EVOLUTION TRACKING AND PROGRESSION ===

export class SkillEvolutionTracker {
  private usageTrackers: Map<string, SkillUsageTracker> = new Map();
  private evolutionChains: Map<string, SkillEvolutionChain> = new Map();
  private activeDecisionPoints: EvolutionDecisionPoint[] = [];

  addEvolutionChain(chain: SkillEvolutionChain): void {
    this.evolutionChains.set(chain.baseSkillId, chain);

    // Initialize usage tracker for base skill
    if (!this.usageTrackers.has(chain.baseSkillId)) {
      this.usageTrackers.set(chain.baseSkillId, {
        skillId: chain.baseSkillId,
        usageCount: 0,
        successfulUses: 0,
        contextualUses: [],
        lastUsed: new Date(),
        averageEffectiveness: 0,
        storyImpactScore: 0,
        evolutionProgress: []
      });
    }
  }

  recordSkillUsage(
    skillId: string,
    context: 'combat' | 'social' | 'exploration' | 'crafting' | 'story_event',
    effectiveness: number,
    storyImpact: number,
    description: string
  ): void {
    const tracker = this.usageTrackers.get(skillId);
    if (!tracker) return;

    tracker.usageCount++;
    tracker.lastUsed = new Date();

    if (effectiveness >= 70) {
      tracker.successfulUses++;
    }

    // Update contextual usage
    let contextualUsage = tracker.contextualUses.find(cu => cu.context === context);
    if (!contextualUsage) {
      contextualUsage = {
        context,
        usageCount: 0,
        effectiveness: 0,
        notableUses: []
      };
      tracker.contextualUses.push(contextualUsage);
    }

    contextualUsage.usageCount++;
    contextualUsage.effectiveness = (contextualUsage.effectiveness + effectiveness) / 2;

    // Record notable use if highly effective or impactful
    if (effectiveness >= 85 || storyImpact >= 80) {
      contextualUsage.notableUses.push({
        timestamp: new Date(),
        context: description,
        description,
        effectiveness,
        storyImpact,
        witnessedBy: [],
        consequences: []
      });
    }

    // Update averages
    tracker.averageEffectiveness = (tracker.averageEffectiveness + effectiveness) / 2;
    tracker.storyImpactScore = (tracker.storyImpactScore + storyImpact) / 2;

    // Check for evolution opportunities
    this.checkEvolutionOpportunities(skillId);
  }

  checkEvolutionOpportunities(skillId: string): EvolutionDecisionPoint[] {
    const chain = this.evolutionChains.get(skillId);
    const tracker = this.usageTrackers.get(skillId);

    if (!chain || !tracker) return [];

    const opportunities: EvolutionDecisionPoint[] = [];

    // Check each tier for evolution readiness
    chain.evolutionTiers.forEach(tier => {
      if (tier.isActive || tier.isUnlocked) return;

      const canEvolve = this.checkTierRequirements(tier, tracker);
      if (canEvolve) {
        // Check for branching opportunities
        const branchingPoint = chain.branchingPoints.find(bp => bp.atTier === tier.tier);

        if (branchingPoint) {
          opportunities.push(this.createBranchingDecisionPoint(tier, branchingPoint, chain));
        } else {
          // Automatic evolution
          this.triggerAutomaticEvolution(tier, chain);
        }
      }
    });

    return opportunities;
  }

  private checkTierRequirements(tier: SkillEvolutionTier, tracker: SkillUsageTracker): boolean {
    return tier.requirements.every(req => {
      switch (req.type) {
        case 'usage_count':
          req.currentValue = tracker.successfulUses;
          req.isMet = req.currentValue >= req.requiredValue;
          return req.isMet;

        case 'story_milestone':
          // This would be checked against story state
          return req.isMet;

        case 'attribute_threshold':
          // This would be checked against character attributes
          return req.isMet;

        default:
          return req.isMet;
      }
    });
  }

  private createBranchingDecisionPoint(
    tier: SkillEvolutionTier,
    branchingPoint: SkillBranchingPoint,
    chain: SkillEvolutionChain
  ): EvolutionDecisionPoint {
    const decisionPoint: EvolutionDecisionPoint = {
      id: generateUUID(),
      skillId: chain.baseSkillId,
      currentTier: tier.tier - 1,
      availableBranches: [branchingPoint],
      decisionContext: {
        triggerEvent: 'Skill evolution requirements met',
        storyMoment: 'Character has mastered the current skill level',
        characterState: 'Ready for advancement',
        availableResources: [],
        environmentalFactors: []
      },
      consequences: [{
        branchId: branchingPoint.branchId,
        immediateEffects: ['Skill evolves along chosen path'],
        longTermImplications: ['Unlocks branch-specific evolution chain'],
        storyImpact: ['May influence future story options'],
        characterDevelopment: ['Shapes character specialization'],
        relationshipEffects: []
      }]
    };

    this.activeDecisionPoints.push(decisionPoint);
    return decisionPoint;
  }

  private triggerAutomaticEvolution(tier: SkillEvolutionTier, chain: SkillEvolutionChain): void {
    // Mark previous tier as completed
    const previousTier = chain.evolutionTiers.find(t => t.tier === tier.tier - 1);
    if (previousTier) {
      previousTier.isActive = false;
    }

    // Activate new tier
    tier.isUnlocked = true;
    tier.isActive = true;

    console.log(`Skill evolved: ${tier.name} (Tier ${tier.tier})`);
  }

  getEvolutionProgress(skillId: string): { tier: number; progress: number; nextEvolution?: string } | null {
    const chain = this.evolutionChains.get(skillId);
    const tracker = this.usageTrackers.get(skillId);

    if (!chain || !tracker) return null;

    const currentTier = chain.evolutionTiers.find(t => t.isActive);
    if (!currentTier) return null;

    const nextTier = chain.evolutionTiers.find(t => t.tier === currentTier.tier + 1);
    if (!nextTier) return { tier: currentTier.tier, progress: 100 };

    // Calculate progress toward next tier
    const totalRequirements = nextTier.requirements.length;
    const metRequirements = nextTier.requirements.filter(req => {
      switch (req.type) {
        case 'usage_count':
          return tracker.successfulUses >= req.requiredValue;
        default:
          return req.isMet;
      }
    }).length;

    const progress = totalRequirements > 0 ? (metRequirements / totalRequirements) * 100 : 0;

    return {
      tier: currentTier.tier,
      progress,
      nextEvolution: nextTier.name
    };
  }

  getActiveDecisionPoints(): EvolutionDecisionPoint[] {
    return [...this.activeDecisionPoints];
  }

  resolveDecisionPoint(decisionPointId: string, chosenBranchId: string): void {
    const decisionIndex = this.activeDecisionPoints.findIndex(dp => dp.id === decisionPointId);
    if (decisionIndex === -1) return;

    const decisionPoint = this.activeDecisionPoints[decisionIndex];
    const chain = this.evolutionChains.get(decisionPoint.skillId);

    if (chain) {
      const chosenBranch = decisionPoint.availableBranches.find(b => b.branchId === chosenBranchId);
      if (chosenBranch) {
        // Activate the chosen branch path
        this.activateBranchPath(chain, chosenBranch);
      }
    }

    // Remove the resolved decision point
    this.activeDecisionPoints.splice(decisionIndex, 1);
  }

  private activateBranchPath(chain: SkillEvolutionChain, branch: SkillBranchingPoint): void {
    // Deactivate linear progression beyond branching point
    chain.evolutionTiers.forEach(tier => {
      if (tier.tier > branch.atTier) {
        tier.isUnlocked = false;
      }
    });

    // Activate first tier of chosen branch
    if (branch.evolutionPath.length > 0) {
      branch.evolutionPath[0].isUnlocked = true;
      branch.evolutionPath[0].isActive = true;
    }

    console.log(`Branch activated: ${branch.branchName}`);
  }
}

// === GLOBAL EVOLUTION TRACKER INSTANCE ===

export const globalEvolutionTracker = new SkillEvolutionTracker();
