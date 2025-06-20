/**
 * Dynamic Progression Generation AI Flows
 * 
 * AI flows for generating adaptive character progression content that responds
 * to story context and character development.
 */

import { ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME } from '@/ai/genkit';
import { z } from 'zod';
import type {
  CharacterProfile,
  StructuredStoryState,
  AISkillTreeGenerationContext,
  AIGeneratedSkillTree,
  AIProgressionRecommendation,
  SkillFusionOpportunity,
  AIBackstoryIntegration,
  DynamicCharacterTrait,
  PlayerChoice
} from '@/types/story';
import {
  DYNAMIC_SKILL_TREE_GENERATION_TEMPLATE,
  SKILL_EVOLUTION_ANALYSIS_TEMPLATE,
  PROGRESSION_RECOMMENDATION_TEMPLATE,
  BACKSTORY_INTEGRATION_TEMPLATE
} from '@/ai/prompts/progression-templates';
import { adaptPromptForSeries } from '@/lib/series-adapter';
import { buildAISkillTreeContext } from '@/lib/ai-progression-engine';

// === INPUT/OUTPUT SCHEMAS ===

const DynamicSkillTreeInputSchema = z.object({
  character: z.object({
    name: z.string(),
    class: z.string(),
    level: z.number(),
    skillsAndAbilities: z.array(z.any()).optional(),
    personalityTraits: z.array(z.string()).optional()
  }),
  storyContext: z.object({
    recentEvents: z.array(z.string()),
    currentArc: z.string().optional(),
    relationshipDynamics: z.array(z.string()),
    environmentalFactors: z.array(z.string())
  }),
  seriesName: z.string(),
  usePremiumAI: z.boolean()
});

const DynamicSkillTreeOutputSchema = z.object({
  skillTree: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    nodes: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      tier: z.number(),
      cost: z.number(),
      effects: z.array(z.object({
        type: z.string(),
        value: z.union([z.number(), z.string()]),
        description: z.string(),
        target: z.string().optional()
      })),
      narrativeJustification: z.string(),
      evolutionTriggers: z.array(z.string()).optional(),
      fusionCompatibility: z.array(z.string()).optional()
    })),
    narrativeIntegration: z.object({
      storyRelevance: z.number(),
      characterAlignment: z.number(),
      progressionCoherence: z.number(),
      futureNarrativePotential: z.array(z.string())
    })
  })
});

const ProgressionRecommendationInputSchema = z.object({
  character: z.object({
    name: z.string(),
    class: z.string(),
    level: z.number(),
    progressionPoints: z.object({
      attribute: z.number(),
      skill: z.number(),
      specialization: z.number(),
      talent: z.number()
    }).optional()
  }),
  storyState: z.object({
    currentChallenges: z.array(z.string()),
    recentEvents: z.array(z.string()),
    futureDirections: z.array(z.string())
  }),
  availableOptions: z.array(z.string()),
  seriesName: z.string(),
  usePremiumAI: z.boolean()
});

const ProgressionRecommendationOutputSchema = z.object({
  recommendations: z.array(z.object({
    type: z.string(),
    option: z.string(),
    priority: z.number(),
    reasoning: z.string(),
    narrativeJustification: z.string(),
    expectedOutcome: z.string(),
    confidence: z.number(),
    alternatives: z.array(z.object({
      description: z.string(),
      tradeoffs: z.array(z.string()),
      suitability: z.number()
    }))
  }))
});

const BackstoryIntegrationInputSchema = z.object({
  character: z.object({
    name: z.string(),
    class: z.string(),
    currentSkills: z.array(z.string()),
    personalityTraits: z.array(z.string()).optional()
  }),
  storyPosition: z.string(),
  seriesName: z.string(),
  usePremiumAI: z.boolean()
});

const BackstoryIntegrationOutputSchema = z.object({
  backstoryIntegration: z.object({
    formativeExperiences: z.array(z.object({
      event: z.string(),
      impact: z.string(),
      progressionInfluence: z.array(z.string())
    })),
    significantRelationships: z.array(z.object({
      relationship: z.string(),
      influence: z.string(),
      skillImplications: z.array(z.string())
    })),
    specialAbilities: z.array(z.object({
      ability: z.string(),
      origin: z.string(),
      restrictions: z.array(z.string()).optional()
    })),
    characterLimitations: z.array(z.object({
      limitation: z.string(),
      reason: z.string(),
      overcomingPath: z.string()
    })),
    narrativeHooks: z.array(z.string())
  })
});

// === AI FLOWS ===

// Dynamic Skill Tree Generation Flow
export const dynamicSkillTreeGenerationFlow = ai.defineFlow(
  {
    name: 'dynamicSkillTreeGenerationFlow',
    inputSchema: DynamicSkillTreeInputSchema,
    outputSchema: DynamicSkillTreeOutputSchema,
  },
  async (input) => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] dynamicSkillTreeGenerationFlow: START for ${input.character.name}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = { maxOutputTokens: input.usePremiumAI ? 12000 : 6000 };

    // Build context-aware prompt
    const basePrompt = DYNAMIC_SKILL_TREE_GENERATION_TEMPLATE
      .replace(/\{\{character\.name\}\}/g, input.character.name)
      .replace(/\{\{character\.class\}\}/g, input.character.class)
      .replace(/\{\{character\.level\}\}/g, input.character.level.toString())
      .replace(/\{\{character\.skillsAndAbilities\}\}/g, JSON.stringify(input.character.skillsAndAbilities || []))
      .replace(/\{\{character\.personalityTraits\}\}/g, JSON.stringify(input.character.personalityTraits || []))
      .replace(/\{\{recentStoryEvents\}\}/g, JSON.stringify(input.storyContext.recentEvents))
      .replace(/\{\{currentStoryArc\}\}/g, input.storyContext.currentArc || 'None')
      .replace(/\{\{relationshipContext\}\}/g, JSON.stringify(input.storyContext.relationshipDynamics))
      .replace(/\{\{environmentalContext\}\}/g, JSON.stringify(input.storyContext.environmentalFactors))
      .replace(/\{\{seriesName\}\}/g, input.seriesName);

    const adaptedPrompt = adaptPromptForSeries(basePrompt, input.seriesName);

    const skillTreePrompt = ai.definePrompt({
      name: 'dynamicSkillTreePrompt',
      model: modelName,
      input: { schema: DynamicSkillTreeInputSchema },
      output: { schema: DynamicSkillTreeOutputSchema },
      config: modelConfig,
      prompt: adaptedPrompt
    });

    try {
      const result = await skillTreePrompt(input);
      console.log(`[${new Date().toISOString()}] dynamicSkillTreeGenerationFlow: SUCCESS. Time: ${Date.now() - flowStartTime}ms`);
      return result.output;
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] dynamicSkillTreeGenerationFlow: FAILED. Error: ${error.message}`);
      throw new Error(`AI failed during skill tree generation. Details: ${error.message}`);
    }
  }
);

// Progression Recommendation Flow
export const progressionRecommendationFlow = ai.defineFlow(
  {
    name: 'progressionRecommendationFlow',
    inputSchema: ProgressionRecommendationInputSchema,
    outputSchema: ProgressionRecommendationOutputSchema,
  },
  async (input) => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] progressionRecommendationFlow: START for ${input.character.name}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = { maxOutputTokens: input.usePremiumAI ? 8000 : 4000 };

    const basePrompt = PROGRESSION_RECOMMENDATION_TEMPLATE
      .replace(/\{\{characterBuild\}\}/g, `${input.character.class} Level ${input.character.level}`)
      .replace(/\{\{availablePoints\}\}/g, JSON.stringify(input.character.progressionPoints || {}))
      .replace(/\{\{recentChallenges\}\}/g, JSON.stringify(input.storyState.currentChallenges))
      .replace(/\{\{futureStoryDirections\}\}/g, JSON.stringify(input.storyState.futureDirections))
      .replace(/\{\{unlockedOptions\}\}/g, JSON.stringify(input.availableOptions));

    const adaptedPrompt = adaptPromptForSeries(basePrompt, input.seriesName);

    const recommendationPrompt = ai.definePrompt({
      name: 'progressionRecommendationPrompt',
      model: modelName,
      input: { schema: ProgressionRecommendationInputSchema },
      output: { schema: ProgressionRecommendationOutputSchema },
      config: modelConfig,
      prompt: adaptedPrompt
    });

    try {
      const result = await recommendationPrompt(input);
      console.log(`[${new Date().toISOString()}] progressionRecommendationFlow: SUCCESS. Time: ${Date.now() - flowStartTime}ms`);
      return result.output;
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] progressionRecommendationFlow: FAILED. Error: ${error.message}`);
      throw new Error(`AI failed during progression recommendation. Details: ${error.message}`);
    }
  }
);

// Backstory Integration Flow
export const backstoryIntegrationFlow = ai.defineFlow(
  {
    name: 'backstoryIntegrationFlow',
    inputSchema: BackstoryIntegrationInputSchema,
    outputSchema: BackstoryIntegrationOutputSchema,
  },
  async (input) => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] backstoryIntegrationFlow: START for ${input.character.name}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = { maxOutputTokens: input.usePremiumAI ? 10000 : 5000 };

    const basePrompt = BACKSTORY_INTEGRATION_TEMPLATE
      .replace(/\{\{character\.name\}\}/g, input.character.name)
      .replace(/\{\{character\.class\}\}/g, input.character.class)
      .replace(/\{\{currentSkills\}\}/g, JSON.stringify(input.character.currentSkills))
      .replace(/\{\{establishedTraits\}\}/g, JSON.stringify(input.character.personalityTraits || []))
      .replace(/\{\{storyPosition\}\}/g, input.storyPosition);

    const adaptedPrompt = adaptPromptForSeries(basePrompt, input.seriesName);

    const backstoryPrompt = ai.definePrompt({
      name: 'backstoryIntegrationPrompt',
      model: modelName,
      input: { schema: BackstoryIntegrationInputSchema },
      output: { schema: BackstoryIntegrationOutputSchema },
      config: modelConfig,
      prompt: adaptedPrompt
    });

    try {
      const result = await backstoryPrompt(input);
      console.log(`[${new Date().toISOString()}] backstoryIntegrationFlow: SUCCESS. Time: ${Date.now() - flowStartTime}ms`);
      return result.output;
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] backstoryIntegrationFlow: FAILED. Error: ${error.message}`);
      throw new Error(`AI failed during backstory integration. Details: ${error.message}`);
    }
  }
);

// === EXPORT FUNCTIONS ===

export async function generateDynamicSkillTree(
  character: CharacterProfile,
  storyState: StructuredStoryState,
  seriesName: string,
  usePremiumAI: boolean = false
) {
  const input = {
    character: {
      name: character.name,
      class: character.class,
      level: character.level,
      skillsAndAbilities: character.skillsAndAbilities,
      personalityTraits: [] // Would be extracted from character data
    },
    storyContext: {
      recentEvents: storyState.narrativeThreads.slice(-5).map(thread => thread.description),
      currentArc: storyState.storyArcs.find(arc => arc.id === storyState.currentStoryArcId)?.title,
      relationshipDynamics: storyState.npcRelationships.map(rel => `${rel.npcId}: ${rel.relationshipScore}`),
      environmentalFactors: [storyState.environmentalContext.atmosphere, storyState.environmentalContext.dangerLevel.toString()]
    },
    seriesName,
    usePremiumAI
  };

  return await dynamicSkillTreeGenerationFlow(input);
}

export async function generateProgressionRecommendations(
  character: CharacterProfile,
  storyState: StructuredStoryState,
  availableOptions: string[],
  seriesName: string,
  usePremiumAI: boolean = false
) {
  const input = {
    character: {
      name: character.name,
      class: character.class,
      level: character.level,
      progressionPoints: character.progressionPoints
    },
    storyState: {
      currentChallenges: [], // Would be extracted from story analysis
      recentEvents: storyState.narrativeThreads.slice(-3).map(thread => thread.description),
      futureDirections: [] // Would be predicted from story analysis
    },
    availableOptions,
    seriesName,
    usePremiumAI
  };

  return await progressionRecommendationFlow(input);
}

export async function generateBackstoryIntegration(
  character: CharacterProfile,
  storyPosition: string,
  seriesName: string,
  usePremiumAI: boolean = false
) {
  const input = {
    character: {
      name: character.name,
      class: character.class,
      currentSkills: character.skillsAndAbilities?.map(skill => skill.name) || [],
      personalityTraits: [] // Would be extracted from character data
    },
    storyPosition,
    seriesName,
    usePremiumAI
  };

  return await backstoryIntegrationFlow(input);
}
