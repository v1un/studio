/**
 * AI Skill Evolution Generation Flows
 * 
 * AI flows for generating hierarchical skill evolution chains with branching paths
 * and story-integrated progression mechanics.
 */

import { ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME } from '@/ai/genkit';
import { z } from 'zod';
import type {
  CharacterProfile,
  StructuredStoryState,
  DynamicSkillNode,
  SkillEvolutionChain,
  SkillBranchTheme,
  AISkillEvolutionRequest,
  AISkillEvolutionResponse
} from '@/types/story';
import { adaptPromptForSeries } from '@/lib/series-adapter';

// === INPUT/OUTPUT SCHEMAS ===

const SkillEvolutionGenerationInputSchema = z.object({
  baseSkill: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    effects: z.array(z.object({
      type: z.string(),
      value: z.union([z.number(), z.string()]),
      description: z.string(),
      target: z.string().optional()
    }))
  }),
  character: z.object({
    name: z.string(),
    class: z.string(),
    level: z.number(),
    strength: z.number().optional(),
    dexterity: z.number().optional(),
    constitution: z.number().optional(),
    intelligence: z.number().optional(),
    wisdom: z.number().optional(),
    charisma: z.number().optional()
  }),
  storyContext: z.object({
    themes: z.array(z.string()),
    recentEvents: z.array(z.string()),
    environmentalFactors: z.array(z.string()),
    availableElements: z.array(z.string())
  }),
  evolutionParameters: z.object({
    maxTiers: z.number(),
    branchingPoints: z.number(),
    focusThemes: z.array(z.string())
  }),
  seriesName: z.string(),
  usePremiumAI: z.boolean()
});

const SkillEvolutionGenerationOutputSchema = z.object({
  evolutionChain: z.object({
    chainName: z.string(),
    description: z.string(),
    maxTier: z.number(),
    evolutionTiers: z.array(z.object({
      tier: z.number(),
      name: z.string(),
      description: z.string(),
      effects: z.array(z.object({
        type: z.string(),
        value: z.union([z.number(), z.string()]),
        description: z.string(),
        target: z.string().optional()
      })),
      requirements: z.array(z.object({
        type: z.string(),
        description: z.string(),
        requiredValue: z.number(),
        trackingMetric: z.string()
      })),
      narrativeSignificance: z.string(),
      mechanicalImprovements: z.array(z.object({
        type: z.string(),
        description: z.string(),
        value: z.union([z.number(), z.string()]),
        comparedToPrevious: z.string()
      }))
    })),
    branchingPoints: z.array(z.object({
      atTier: z.number(),
      branchName: z.string(),
      branchTheme: z.string(),
      description: z.string(),
      requirements: z.array(z.object({
        type: z.string(),
        description: z.string(),
        condition: z.string(),
        priority: z.number()
      })),
      evolutionPath: z.array(z.object({
        tier: z.number(),
        name: z.string(),
        description: z.string(),
        effects: z.array(z.object({
          type: z.string(),
          value: z.union([z.number(), z.string()]),
          description: z.string(),
          target: z.string().optional()
        })),
        narrativeSignificance: z.string()
      })),
      narrativeJustification: z.string()
    }))
  }),
  narrativeIntegration: z.object({
    storyRelevance: z.number(),
    characterAlignment: z.number(),
    seriesAuthenticity: z.number(),
    progressionCoherence: z.number(),
    narrativeOpportunities: z.array(z.string()),
    potentialConflicts: z.array(z.string())
  }),
  balanceAnalysis: z.object({
    powerProgression: z.object({
      tierPowerRatings: z.array(z.number()),
      progressionCurve: z.string(),
      balanceScore: z.number(),
      outlierTiers: z.array(z.number())
    }),
    recommendations: z.array(z.object({
      tier: z.number(),
      issue: z.string(),
      severity: z.string(),
      suggestion: z.string()
    }))
  })
});

// === AI PROMPT TEMPLATES ===

const SKILL_EVOLUTION_GENERATION_TEMPLATE = `
HIERARCHICAL SKILL EVOLUTION CHAIN GENERATION:
Create a comprehensive evolution chain for the skill "{{baseSkill.name}}" that provides multiple tiers of progression and branching paths.

BASE SKILL ANALYSIS:
- Name: {{baseSkill.name}}
- Description: {{baseSkill.description}}
- Current Effects: {{baseSkill.effects}}

CHARACTER CONTEXT:
- Name: {{character.name}}
- Class: {{character.class}}
- Level: {{character.level}}
- Attributes: STR {{character.strength}}, DEX {{character.dexterity}}, CON {{character.constitution}}, INT {{character.intelligence}}, WIS {{character.wisdom}}, CHA {{character.charisma}}

STORY CONTEXT:
- Themes: {{storyContext.themes}}
- Recent Events: {{storyContext.recentEvents}}
- Environmental Factors: {{storyContext.environmentalFactors}}
- Available Elements: {{storyContext.availableElements}}

EVOLUTION PARAMETERS:
- Maximum Tiers: {{evolutionParameters.maxTiers}}
- Branching Points: {{evolutionParameters.branchingPoints}}
- Focus Themes: {{evolutionParameters.focusThemes}}

SERIES ADAPTATION FOR "{{seriesName}}":
Ensure all evolution names, descriptions, and mechanics fit the established world rules and power systems.

EVOLUTION CHAIN REQUIREMENTS:

1. **HIERARCHICAL PROGRESSION:**
   - Create {{evolutionParameters.maxTiers}} tiers of linear progression
   - Each tier should be 25-40% more powerful than the previous
   - Use series-appropriate naming conventions for tier progression
   - Ensure logical mechanical improvements at each tier

2. **BRANCHING SYSTEM:**
   - Create {{evolutionParameters.branchingPoints}} branching points at tiers 2 and 4
   - Each branch should represent a different specialization path
   - Branch themes: {{evolutionParameters.focusThemes}}
   - Each branch should have 3 additional tiers beyond the branching point

3. **STORY INTEGRATION:**
   - Evolution requirements should tie to story progression
   - Usage-based requirements: successful skill uses
   - Story milestones: major character achievements
   - Attribute thresholds: character development
   - Environmental triggers: exposure to story elements

4. **MECHANICAL BALANCE:**
   - Maintain power progression curve that's challenging but achievable
   - Each tier should offer meaningful improvements
   - Branch specializations should be equally viable
   - Consider both combat and non-combat applications

5. **NARRATIVE SIGNIFICANCE:**
   - Each evolution should have clear story justification
   - Tier names should reflect growing mastery and power
   - Branch paths should align with character development themes
   - Evolution should create new story possibilities

EXAMPLE EVOLUTION STRUCTURE (using Re:Zero as reference):
Base: "Iron Fist" (Enhanced punching power)
Tier 1: "Steel Fist" (Stronger punching, minor armor penetration)
Tier 2: "Titanium Fist" (Major damage increase, stun chance) [BRANCHING POINT]
  - Combat Branch: "Berserker's Fist" → "Destroyer's Fist" → "Annihilation Fist"
  - Elemental Branch: "Flame Fist" → "Inferno Fist" → "Phoenix Fist"
  - Defensive Branch: "Guardian's Fist" → "Fortress Fist" → "Sanctuary Fist"
Tier 3: "Diamond Fist" (Massive damage, area effect)
Tier 4: "Mythril Fist" (Legendary power, special abilities) [BRANCHING POINT]
Tier 5: "Divine Fist" (Ultimate evolution, reality-altering effects)

ADAPT THIS STRUCTURE for "{{seriesName}}":
- Use series-appropriate materials/concepts for tier names
- Ensure evolution themes match series power systems
- Create requirements that fit the series' progression style
- Design effects that respect established world rules

OUTPUT REQUIREMENTS:
Generate a complete evolution chain including:
- Linear progression tiers with balanced power increases
- Branching points with thematic specialization paths
- Story-integrated requirements for each evolution
- Mechanical improvements and new capabilities
- Narrative significance and character development impact
- Balance analysis and recommendations

Each tier should include:
- Thematic name fitting the series
- Detailed description of new capabilities
- Specific mechanical effects and improvements
- Requirements to unlock (usage, story, attributes)
- Narrative significance and story impact
`;

// === AI FLOW DEFINITION ===

export const skillEvolutionGenerationFlow = ai.defineFlow(
  {
    name: 'skillEvolutionGenerationFlow',
    inputSchema: SkillEvolutionGenerationInputSchema,
    outputSchema: SkillEvolutionGenerationOutputSchema,
  },
  async (input) => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] skillEvolutionGenerationFlow: START for ${input.baseSkill.name}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = { maxOutputTokens: input.usePremiumAI ? 16000 : 8000 };

    // Build context-aware prompt
    const basePrompt = SKILL_EVOLUTION_GENERATION_TEMPLATE
      .replace(/\{\{baseSkill\.name\}\}/g, input.baseSkill.name)
      .replace(/\{\{baseSkill\.description\}\}/g, input.baseSkill.description)
      .replace(/\{\{baseSkill\.effects\}\}/g, JSON.stringify(input.baseSkill.effects))
      .replace(/\{\{character\.name\}\}/g, input.character.name)
      .replace(/\{\{character\.class\}\}/g, input.character.class)
      .replace(/\{\{character\.level\}\}/g, input.character.level.toString())
      .replace(/\{\{character\.strength\}\}/g, (input.character.strength || 10).toString())
      .replace(/\{\{character\.dexterity\}\}/g, (input.character.dexterity || 10).toString())
      .replace(/\{\{character\.constitution\}\}/g, (input.character.constitution || 10).toString())
      .replace(/\{\{character\.intelligence\}\}/g, (input.character.intelligence || 10).toString())
      .replace(/\{\{character\.wisdom\}\}/g, (input.character.wisdom || 10).toString())
      .replace(/\{\{character\.charisma\}\}/g, (input.character.charisma || 10).toString())
      .replace(/\{\{storyContext\.themes\}\}/g, JSON.stringify(input.storyContext.themes))
      .replace(/\{\{storyContext\.recentEvents\}\}/g, JSON.stringify(input.storyContext.recentEvents))
      .replace(/\{\{storyContext\.environmentalFactors\}\}/g, JSON.stringify(input.storyContext.environmentalFactors))
      .replace(/\{\{storyContext\.availableElements\}\}/g, JSON.stringify(input.storyContext.availableElements))
      .replace(/\{\{evolutionParameters\.maxTiers\}\}/g, input.evolutionParameters.maxTiers.toString())
      .replace(/\{\{evolutionParameters\.branchingPoints\}\}/g, input.evolutionParameters.branchingPoints.toString())
      .replace(/\{\{evolutionParameters\.focusThemes\}\}/g, JSON.stringify(input.evolutionParameters.focusThemes))
      .replace(/\{\{seriesName\}\}/g, input.seriesName);

    const adaptedPrompt = adaptPromptForSeries(basePrompt, input.seriesName);

    const evolutionPrompt = ai.definePrompt({
      name: 'skillEvolutionGenerationPrompt',
      model: modelName,
      input: { schema: SkillEvolutionGenerationInputSchema },
      output: { schema: SkillEvolutionGenerationOutputSchema },
      config: modelConfig,
      prompt: adaptedPrompt
    });

    try {
      const result = await evolutionPrompt(input);
      console.log(`[${new Date().toISOString()}] skillEvolutionGenerationFlow: SUCCESS. Time: ${Date.now() - flowStartTime}ms`);
      return result.output;
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] skillEvolutionGenerationFlow: FAILED. Error: ${error.message}`);
      throw new Error(`AI failed during skill evolution generation. Details: ${error.message}`);
    }
  }
);

// === EXPORT FUNCTIONS ===

export async function generateSkillEvolutionChain(
  baseSkill: DynamicSkillNode,
  character: CharacterProfile,
  storyState: StructuredStoryState,
  seriesName: string,
  options: {
    maxTiers?: number;
    branchingPoints?: number;
    focusThemes?: SkillBranchTheme[];
    usePremiumAI?: boolean;
  } = {}
): Promise<AISkillEvolutionResponse> {
  const {
    maxTiers = 5,
    branchingPoints = 2,
    focusThemes = ['combat_focused', 'elemental_infusion', 'defensive_mastery'],
    usePremiumAI = false
  } = options;

  const input = {
    baseSkill: {
      id: baseSkill.id,
      name: baseSkill.name,
      description: baseSkill.description,
      effects: baseSkill.effects
    },
    character: {
      name: character.name,
      class: character.class,
      level: character.level,
      strength: character.strength,
      dexterity: character.dexterity,
      constitution: character.constitution,
      intelligence: character.intelligence,
      wisdom: character.wisdom,
      charisma: character.charisma
    },
    storyContext: {
      themes: storyState.narrativeThreads.map(thread => thread.theme),
      recentEvents: storyState.narrativeThreads.slice(-5).map(thread => thread.description),
      environmentalFactors: [
        storyState.environmentalContext.atmosphere,
        `Danger Level: ${storyState.environmentalContext.dangerLevel}`,
        storyState.environmentalContext.weather
      ],
      availableElements: extractAvailableElements(storyState, seriesName)
    },
    evolutionParameters: {
      maxTiers,
      branchingPoints,
      focusThemes: focusThemes.map(theme => theme.toString())
    },
    seriesName,
    usePremiumAI
  };

  const result = await skillEvolutionGenerationFlow(input);
  
  // Convert the AI response to our expected format
  return {
    evolutionChain: convertToSkillEvolutionChain(result.evolutionChain, baseSkill.id),
    generatedTiers: [], // Would be populated from evolutionChain
    branchingOptions: [], // Would be populated from evolutionChain
    narrativeIntegration: result.narrativeIntegration,
    balanceAnalysis: result.balanceAnalysis
  };
}

function extractAvailableElements(storyState: StructuredStoryState, seriesName: string): string[] {
  const elements = ['Physical', 'Mental'];
  
  // Check for magical elements in world facts
  const hasMagic = storyState.worldFacts.some(fact => 
    fact.toLowerCase().includes('magic') || 
    fact.toLowerCase().includes('elemental')
  );
  
  if (hasMagic) {
    elements.push('Fire', 'Water', 'Earth', 'Air', 'Lightning', 'Ice');
  }
  
  // Add series-specific elements
  const seriesLower = seriesName.toLowerCase();
  if (seriesLower.includes('re:zero')) {
    elements.push('Spirit', 'Divine', 'Curse');
  } else if (seriesLower.includes('attack on titan')) {
    elements.push('Titan', 'Hardening', 'Coordinate');
  }
  
  return elements;
}

function convertToSkillEvolutionChain(aiChain: any, baseSkillId: string): SkillEvolutionChain {
  // Convert AI response format to our internal format
  return {
    id: `chain_${baseSkillId}`,
    baseSkillId,
    chainName: aiChain.chainName,
    description: aiChain.description,
    maxTier: aiChain.maxTier,
    evolutionTiers: aiChain.evolutionTiers.map((tier: any) => ({
      ...tier,
      skillId: `${baseSkillId}_tier_${tier.tier}`,
      requirements: tier.requirements.map((req: any) => ({
        ...req,
        currentValue: 0,
        isMet: false
      })),
      unlockConditions: [{
        id: `unlock_${tier.tier}`,
        type: 'automatic' as const,
        description: 'Unlocks when requirements are met',
        isActive: tier.tier === 0
      }],
      isUnlocked: tier.tier === 0,
      isActive: tier.tier === 0
    })),
    branchingPoints: aiChain.branchingPoints.map((branch: any) => ({
      ...branch,
      branchId: `branch_${branch.branchName.replace(/\s+/g, '_').toLowerCase()}`,
      requirements: branch.requirements.map((req: any) => ({
        ...req,
        isMet: false
      })),
      evolutionPath: branch.evolutionPath.map((pathTier: any, index: number) => ({
        ...pathTier,
        skillId: `${baseSkillId}_branch_${branch.branchName}_tier_${index}`,
        requirements: [{
          type: 'usage_count' as const,
          description: `Use previous skill ${(pathTier.tier || index) * 3} times`,
          currentValue: 0,
          requiredValue: (pathTier.tier || index) * 3,
          isMet: false,
          trackingMetric: 'branch_usage'
        }],
        unlockConditions: [{
          id: `branch_unlock_${index}`,
          type: 'player_choice' as const,
          description: 'Player must choose this branch',
          isActive: false
        }],
        mechanicalImprovements: [],
        isUnlocked: false,
        isActive: false
      }))
    })),
    generationContext: {
      characterClass: '',
      storyThemes: [],
      availableElements: [],
      characterFocus: [],
      seriesContext: '',
      generationTimestamp: new Date()
    }
  };
}
