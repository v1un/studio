/**
 * AI-Driven Character Progression Engine
 * 
 * Core system for generating dynamic, narrative-integrated character progression
 * that adapts to story context and character development.
 */

import type {
  CharacterProfile,
  StructuredStoryState,
  AISkillTreeGenerationContext,
  AIGeneratedSkillTree,
  AIProgressionRecommendation,
  DynamicSkillNode,
  SkillEvolutionTrigger,
  SkillFusionOpportunity,
  AIBackstoryIntegration,
  DynamicCharacterTrait,
  PlayerChoice,
  StoryArc,
  SkillTreeAdaptation,
  SkillUsageRecord
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === SKILL TREE GENERATION CONTEXT ===

export function buildAISkillTreeContext(
  character: CharacterProfile,
  storyState: StructuredStoryState,
  recentChoices: PlayerChoice[],
  seriesName: string
): AISkillTreeGenerationContext {
  // Extract recent story events from various sources
  const recentStoryEvents = [
    ...storyState.narrativeThreads.slice(-5).map(thread => thread.description),
    ...recentChoices.slice(-3).map(choice => choice.description),
    ...(storyState.storySummary ? [storyState.storySummary] : [])
  ];

  // Get used skills from character's skill usage history
  const usedSkills = character.skillsAndAbilities?.map(skill => skill.name) || [];

  return {
    characterProfile: character,
    recentStoryEvents,
    currentStoryArc: storyState.storyArcs.find(arc => arc.id === storyState.currentStoryArcId),
    usedSkills,
    characterChoices: recentChoices,
    environmentalContext: storyState.environmentalContext,
    relationshipContext: storyState.npcRelationships,
    seriesName
  };
}

// === SKILL EVOLUTION ANALYSIS ===

export function analyzeSkillEvolutionOpportunities(
  character: CharacterProfile,
  storyState: StructuredStoryState,
  skillUsageHistory: SkillUsageRecord[]
): SkillEvolutionTrigger[] {
  const evolutionTriggers: SkillEvolutionTrigger[] = [];

  character.skillsAndAbilities?.forEach(skill => {
    const usageRecords = skillUsageHistory.filter(record => 
      record.context.includes(skill.name)
    );

    // Usage-based evolution
    if (usageRecords.length >= 10) {
      const avgEffectiveness = usageRecords.reduce((sum, record) => 
        sum + record.effectiveness, 0) / usageRecords.length;
      
      if (avgEffectiveness >= 80) {
        evolutionTriggers.push({
          id: generateUUID(),
          type: 'usage_count',
          condition: `High proficiency with ${skill.name}`,
          threshold: 10,
          evolutionResult: {
            newNodeId: `${skill.name}_evolved`,
            newName: `Mastered ${skill.name}`,
            newDescription: `An evolved form of ${skill.name} gained through extensive practice and mastery.`,
            newEffects: [
              ...skill.effects,
              {
                type: 'stat_bonus',
                value: 25,
                description: '+25% effectiveness from mastery',
                target: 'skill_effectiveness'
              }
            ],
            narrativeDescription: `Through countless applications and deep understanding, ${character.name} has transcended the basic form of ${skill.name}.`
          }
        });
      }
    }

    // Story milestone evolution
    const recentMilestones = storyState.narrativeThreads.filter(thread => 
      thread.significance === 'major' && 
      thread.description.toLowerCase().includes(skill.name.toLowerCase())
    );

    if (recentMilestones.length > 0) {
      evolutionTriggers.push({
        id: generateUUID(),
        type: 'story_milestone',
        condition: `Story milestone involving ${skill.name}`,
        evolutionResult: {
          newNodeId: `${skill.name}_story_evolved`,
          newName: `${skill.name} - Story Forged`,
          newDescription: `${skill.name} transformed by significant story events and character growth.`,
          newEffects: [
            ...skill.effects,
            {
              type: 'passive_effect',
              value: 'narrative_resonance',
              description: 'Enhanced effectiveness in story-critical moments',
              target: 'story_impact'
            }
          ],
          narrativeDescription: `The trials and triumphs of ${character.name}'s journey have fundamentally changed how they use ${skill.name}.`
        }
      });
    }
  });

  return evolutionTriggers;
}

// === PROGRESSION RECOMMENDATIONS ===

export function generateProgressionRecommendations(
  character: CharacterProfile,
  storyState: StructuredStoryState,
  availableOptions: string[]
): AIProgressionRecommendation[] {
  const recommendations: AIProgressionRecommendation[] = [];

  // Analyze current story challenges
  const currentChallenges = analyzeCurrentChallenges(storyState);
  
  // Analyze character weaknesses
  const characterWeaknesses = analyzeCharacterWeaknesses(character);
  
  // Analyze story direction
  const storyDirection = analyzeStoryDirection(storyState);

  // Generate recommendations based on analysis
  currentChallenges.forEach(challenge => {
    const relevantOptions = availableOptions.filter(option => 
      isOptionRelevantToChallenge(option, challenge)
    );

    relevantOptions.forEach(option => {
      recommendations.push({
        id: generateUUID(),
        type: 'skill_purchase',
        priority: calculateChallengePriority(challenge),
        reasoning: `This skill would help address the current challenge: ${challenge}`,
        narrativeJustification: `Given the recent events and challenges, developing this ability would be a natural progression for ${character.name}.`,
        expectedOutcome: `Improved capability to handle similar challenges in the future.`,
        confidence: 85,
        prerequisites: [],
        alternatives: []
      });
    });
  });

  return recommendations.sort((a, b) => b.priority - a.priority);
}

// === SKILL FUSION OPPORTUNITIES ===

export function identifySkillFusionOpportunities(
  character: CharacterProfile,
  storyState: StructuredStoryState
): SkillFusionOpportunity[] {
  const fusionOpportunities: SkillFusionOpportunity[] = [];
  const skills = character.skillsAndAbilities || [];

  // Look for complementary skills that could fuse
  for (let i = 0; i < skills.length; i++) {
    for (let j = i + 1; j < skills.length; j++) {
      const skill1 = skills[i];
      const skill2 = skills[j];

      if (areSkillsCompatibleForFusion(skill1, skill2, storyState)) {
        fusionOpportunities.push({
          id: generateUUID(),
          sourceSkills: [skill1.name, skill2.name],
          resultingSkill: createFusedSkill(skill1, skill2, storyState),
          fusionRequirements: [
            {
              type: 'skill_level',
              description: `Both ${skill1.name} and ${skill2.name} must be well-practiced`,
              isMet: true
            }
          ],
          narrativeContext: `The combination of ${skill1.name} and ${skill2.name} creates unique possibilities.`,
          discoveryMethod: 'ai_suggestion',
          rarity: 'uncommon'
        });
      }
    }
  }

  return fusionOpportunities;
}

// === HELPER FUNCTIONS ===

function analyzeCurrentChallenges(storyState: StructuredStoryState): string[] {
  const challenges: string[] = [];
  
  // Analyze active quests for challenges
  storyState.quests.forEach(quest => {
    if (quest.status === 'active') {
      challenges.push(`Quest challenge: ${quest.description}`);
    }
  });

  // Analyze relationship tensions
  storyState.npcRelationships.forEach(relationship => {
    if (relationship.relationshipScore < -20) {
      challenges.push(`Relationship tension with ${relationship.npcId}`);
    }
  });

  // Analyze environmental challenges
  if (storyState.environmentalContext.dangerLevel > 60) {
    challenges.push('High environmental danger');
  }

  return challenges;
}

function analyzeCharacterWeaknesses(character: CharacterProfile): string[] {
  const weaknesses: string[] = [];
  
  // Analyze low attributes
  const attributes = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  attributes.forEach(attr => {
    const value = character[attr as keyof CharacterProfile] as number;
    if (value && value < 12) {
      weaknesses.push(`Low ${attr}`);
    }
  });

  // Analyze skill gaps
  const skillCategories = ['combat', 'magic', 'social', 'utility'];
  const characterSkillCategories = new Set(
    character.skillsAndAbilities?.map(skill => skill.category) || []
  );
  
  skillCategories.forEach(category => {
    if (!characterSkillCategories.has(category as any)) {
      weaknesses.push(`No ${category} skills`);
    }
  });

  return weaknesses;
}

function analyzeStoryDirection(storyState: StructuredStoryState): string {
  // Analyze narrative threads to determine story direction
  const recentThreads = storyState.narrativeThreads.slice(-3);
  const themes = recentThreads.map(thread => thread.theme).join(', ');
  return `Story trending toward: ${themes}`;
}

function calculateChallengePriority(challenge: string): number {
  // Simple priority calculation based on challenge type
  if (challenge.includes('danger')) return 90;
  if (challenge.includes('relationship')) return 70;
  if (challenge.includes('quest')) return 60;
  return 50;
}

function isOptionRelevantToChallenge(option: string, challenge: string): boolean {
  // Simple relevance check - in a real implementation, this would be more sophisticated
  return challenge.toLowerCase().includes(option.toLowerCase()) ||
         option.toLowerCase().includes(challenge.toLowerCase());
}

function areSkillsCompatibleForFusion(skill1: any, skill2: any, storyState: StructuredStoryState): boolean {
  // Check if skills have complementary effects or themes
  const skill1Effects = skill1.effects?.map((e: any) => e.type) || [];
  const skill2Effects = skill2.effects?.map((e: any) => e.type) || [];
  
  // Skills are compatible if they have different but complementary effect types
  return skill1Effects.some((effect: string) => 
    !skill2Effects.includes(effect) && 
    areEffectsComplementary(effect, skill2Effects)
  );
}

function areEffectsComplementary(effect1: string, effects2: string[]): boolean {
  const complementaryPairs = [
    ['stat_bonus', 'passive_effect'],
    ['combat_skill', 'utility'],
    ['offensive', 'defensive']
  ];
  
  return complementaryPairs.some(pair => 
    pair.includes(effect1) && effects2.some(e2 => pair.includes(e2))
  );
}

function createFusedSkill(skill1: any, skill2: any, storyState: StructuredStoryState): any {
  return {
    id: generateUUID(),
    name: `${skill1.name} + ${skill2.name}`,
    description: `A fusion of ${skill1.name} and ${skill2.name}, creating unique capabilities.`,
    sourceSkills: [skill1.name, skill2.name],
    fusionDate: new Date(),
    fusionContext: 'AI-suggested combination',
    uniqueProperties: ['Fusion skill', 'Enhanced versatility'],
    evolutionPath: []
  };
}

// === TRAIT DEVELOPMENT SYSTEM ===

export function developCharacterTraits(
  character: CharacterProfile,
  storyState: StructuredStoryState,
  recentChoices: PlayerChoice[]
): DynamicCharacterTrait[] {
  const traits: DynamicCharacterTrait[] = [];

  // Analyze character behavior patterns
  const behaviorPatterns = analyzeBehaviorPatterns(recentChoices);

  // Generate traits based on story progression
  const storyBasedTraits = generateStoryBasedTraits(character, storyState);

  // Generate relationship-based traits
  const relationshipTraits = generateRelationshipTraits(storyState.npcRelationships);

  return [...behaviorPatterns, ...storyBasedTraits, ...relationshipTraits];
}

function analyzeBehaviorPatterns(choices: PlayerChoice[]): DynamicCharacterTrait[] {
  const traits: DynamicCharacterTrait[] = [];

  // Analyze choice patterns for trait development
  const aggressiveChoices = choices.filter(choice =>
    choice.description.toLowerCase().includes('attack') ||
    choice.description.toLowerCase().includes('fight')
  ).length;

  const diplomaticChoices = choices.filter(choice =>
    choice.description.toLowerCase().includes('negotiate') ||
    choice.description.toLowerCase().includes('talk')
  ).length;

  if (aggressiveChoices > diplomaticChoices && aggressiveChoices >= 3) {
    traits.push({
      id: 'aggressive_tendencies',
      name: 'Aggressive Tendencies',
      description: 'Tends to favor direct, forceful approaches to problems',
      category: 'behavioral',
      strength: Math.min(aggressiveChoices * 20, 100),
      development: {
        baseValue: 20,
        currentValue: Math.min(aggressiveChoices * 20, 100),
        developmentHistory: [],
        influencingFactors: ['Combat choices', 'Confrontational decisions'],
        developmentTrend: 'increasing'
      },
      skillInfluence: [
        {
          skillCategory: 'combat',
          influenceType: 'effectiveness',
          modifier: 1.15,
          description: 'Aggressive nature enhances combat effectiveness'
        }
      ],
      storyImpact: [
        {
          storyContext: 'conflict_situations',
          impactType: 'action_availability',
          description: 'More aggressive options become available'
        }
      ],
      evolutionPotential: []
    });
  }

  if (diplomaticChoices > aggressiveChoices && diplomaticChoices >= 3) {
    traits.push({
      id: 'diplomatic_nature',
      name: 'Diplomatic Nature',
      description: 'Prefers peaceful resolution and negotiation',
      category: 'social',
      strength: Math.min(diplomaticChoices * 20, 100),
      development: {
        baseValue: 20,
        currentValue: Math.min(diplomaticChoices * 20, 100),
        developmentHistory: [],
        influencingFactors: ['Peaceful choices', 'Negotiation attempts'],
        developmentTrend: 'increasing'
      },
      skillInfluence: [
        {
          skillCategory: 'social',
          influenceType: 'effectiveness',
          modifier: 1.2,
          description: 'Diplomatic nature enhances social interactions'
        }
      ],
      storyImpact: [
        {
          storyContext: 'social_situations',
          impactType: 'dialogue_option',
          description: 'Additional diplomatic dialogue options'
        }
      ],
      evolutionPotential: []
    });
  }

  return traits;
}

function generateStoryBasedTraits(
  character: CharacterProfile,
  storyState: StructuredStoryState
): DynamicCharacterTrait[] {
  const traits: DynamicCharacterTrait[] = [];

  // Analyze environmental exposure
  if (storyState.environmentalContext.dangerLevel > 70) {
    traits.push({
      id: 'danger_adapted',
      name: 'Danger Adapted',
      description: 'Has become accustomed to dangerous environments',
      category: 'personality',
      strength: Math.min(storyState.environmentalContext.dangerLevel, 100),
      development: {
        baseValue: 30,
        currentValue: Math.min(storyState.environmentalContext.dangerLevel, 100),
        developmentHistory: [],
        influencingFactors: ['High danger exposure', 'Survival situations'],
        developmentTrend: 'increasing'
      },
      skillInfluence: [
        {
          skillCategory: 'utility',
          influenceType: 'effectiveness',
          modifier: 1.1,
          description: 'Better at handling dangerous situations'
        }
      ],
      storyImpact: [
        {
          storyContext: 'dangerous_environments',
          impactType: 'action_availability',
          description: 'Can take risks others might avoid'
        }
      ],
      evolutionPotential: []
    });
  }

  return traits;
}

function generateRelationshipTraits(relationships: any[]): DynamicCharacterTrait[] {
  const traits: DynamicCharacterTrait[] = [];

  const positiveRelationships = relationships.filter(rel => rel.relationshipScore > 50);
  const negativeRelationships = relationships.filter(rel => rel.relationshipScore < -20);

  if (positiveRelationships.length >= 3) {
    traits.push({
      id: 'socially_connected',
      name: 'Socially Connected',
      description: 'Has developed strong positive relationships',
      category: 'social',
      strength: Math.min(positiveRelationships.length * 25, 100),
      development: {
        baseValue: 25,
        currentValue: Math.min(positiveRelationships.length * 25, 100),
        developmentHistory: [],
        influencingFactors: ['Positive relationships', 'Social success'],
        developmentTrend: 'increasing'
      },
      skillInfluence: [
        {
          skillCategory: 'social',
          influenceType: 'learning_speed',
          modifier: 1.3,
          description: 'Learns social skills faster due to connections'
        }
      ],
      storyImpact: [
        {
          storyContext: 'group_interactions',
          impactType: 'npc_reaction',
          description: 'NPCs react more favorably'
        }
      ],
      evolutionPotential: []
    });
  }

  return traits;
}

// === BACKSTORY INTEGRATION ===

export function generateBackstoryElements(
  character: CharacterProfile,
  storyState: StructuredStoryState,
  seriesName: string
): AIBackstoryIntegration {
  const backstoryElement = `${character.name}'s journey as a ${character.class} in ${seriesName}`;

  const progressionImpact = analyzeProgressionImpact(character);
  const narrativeHooks = generateNarrativeHooks(character, storyState);
  const characterTraits = extractCharacterTraits(character, storyState);

  return {
    id: generateUUID(),
    backstoryElement,
    progressionImpact,
    narrativeHooks,
    characterTraits,
    availableSkillTrees: determineAvailableSkillTrees(character),
    restrictedSkillTrees: determineRestrictedSkillTrees(character),
    specialAbilities: identifySpecialAbilities(character, storyState)
  };
}

function analyzeProgressionImpact(character: CharacterProfile): any[] {
  const impacts = [];

  // Analyze class-based impacts
  const classLower = character.class.toLowerCase();
  if (classLower.includes('warrior')) {
    impacts.push({
      type: 'skill_affinity',
      target: 'combat',
      effect: 1.2,
      description: 'Natural affinity for combat skills'
    });
  }

  if (classLower.includes('mage')) {
    impacts.push({
      type: 'skill_affinity',
      target: 'magic',
      effect: 1.3,
      description: 'Enhanced magical learning ability'
    });
  }

  return impacts;
}

function generateNarrativeHooks(character: CharacterProfile, storyState: StructuredStoryState): string[] {
  const hooks = [];

  // Generate hooks based on character level and story state
  if (character.level >= 5) {
    hooks.push(`${character.name} has gained significant experience and may have unresolved past encounters`);
  }

  if (storyState.npcRelationships.some(rel => rel.relationshipScore < -50)) {
    hooks.push(`${character.name} has made enemies who may seek revenge`);
  }

  if (storyState.npcRelationships.some(rel => rel.relationshipScore > 80)) {
    hooks.push(`${character.name} has formed deep bonds that could be tested`);
  }

  return hooks;
}

function extractCharacterTraits(character: CharacterProfile, storyState: StructuredStoryState): string[] {
  const traits = [];

  // Extract traits based on attributes
  if (character.strength && character.strength > 15) {
    traits.push('Physically Strong');
  }

  if (character.intelligence && character.intelligence > 15) {
    traits.push('Intellectually Gifted');
  }

  if (character.charisma && character.charisma > 15) {
    traits.push('Naturally Charismatic');
  }

  return traits;
}

function determineAvailableSkillTrees(character: CharacterProfile): string[] {
  const trees = ['basic_combat', 'survival_skills'];

  const classLower = character.class.toLowerCase();
  if (classLower.includes('mage')) {
    trees.push('magic_mastery', 'elemental_control');
  }

  if (classLower.includes('warrior')) {
    trees.push('weapon_mastery', 'tactical_combat');
  }

  return trees;
}

function determineRestrictedSkillTrees(character: CharacterProfile): string[] {
  const restrictions = [];

  // Add restrictions based on character class or background
  const classLower = character.class.toLowerCase();
  if (!classLower.includes('mage')) {
    restrictions.push('advanced_magic');
  }

  if (!classLower.includes('rogue')) {
    restrictions.push('stealth_mastery');
  }

  return restrictions;
}

function identifySpecialAbilities(character: CharacterProfile, storyState: StructuredStoryState): string[] {
  const abilities = [];

  // Identify special abilities based on story progression
  if (character.level >= 10) {
    abilities.push('Veteran Instincts');
  }

  if (storyState.narrativeThreads.some(thread => thread.significance === 'major')) {
    abilities.push('Story-Forged Resilience');
  }

  return abilities;
}
