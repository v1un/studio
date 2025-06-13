'use server';

/**
 * @fileOverview Dynamic Quest Generation Flow
 * 
 * This flow generates dynamic quests based on:
 * - Current world state and player choices
 * - Faction relationships and conflicts
 * - Player preferences and behavior patterns
 * - Story context and narrative threads
 */

import { ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME } from '@/ai/genkit';
import { z } from 'zod';
import type {
  Quest,
  QuestBranch,
  QuestConsequence,
  StructuredStoryState,
  CharacterProfile,
  QuestGenerationSettings,
  PlayerChoice,
  EnhancedFaction
} from '@/types/story';
import { generateDynamicQuest } from '@/lib/dynamic-quest-generator';
import { formatEnhancedContextForAI } from '@/lib/enhanced-context-formatter';
import { getSeriesConfig, adaptPromptForSeries } from '@/lib/series-adapter';
import { GENERIC_QUEST_GENERATION_TEMPLATE } from '@/ai/prompts/generic-templates';
import {
  updateStateWithPriority,
  createNarrativeUpdate,
  createRelationshipUpdate,
  type StateUpdate
} from '@/lib/enhanced-state-manager';

// === INPUT/OUTPUT SCHEMAS ===

export interface DynamicQuestGenerationInput {
  storyState: StructuredStoryState;
  questTrigger: 'player_action' | 'story_event' | 'time_based' | 'relationship_change' | 'world_state_change';
  contextDescription: string;
  usePremiumAI: boolean;
  questComplexity?: 'simple' | 'moderate' | 'complex';
  questType?: 'main' | 'side' | 'dynamic' | 'emergency';
  timeConstraint?: number; // in turns
  involvedNPCs?: string[]; // NPC IDs
  requiredSkills?: string[];
  seriesName: string;
}

export interface DynamicQuestGenerationOutput {
  quest: Quest;
  questBranches: QuestBranch[];
  stateUpdates: StateUpdate[];
  narrativeImpact: {
    affectedNPCs: string[];
    worldStateChanges: string[];
    emotionalConsequences: string[];
    relationshipChanges: { npcId: string; change: number; reason: string }[];
  };
  integrationNotes: string[];
}

// === MAIN GENERATION FLOW ===

export async function generateDynamicQuestWithIntegration(
  input: DynamicQuestGenerationInput
): Promise<DynamicQuestGenerationOutput> {
  console.log(`[DynamicQuest] Generating quest for ${input.seriesName} - Trigger: ${input.questTrigger}`);

  const seriesConfig = getSeriesConfig(input.seriesName);
  const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;

  // Build context-aware prompt
  const contextualPrompt = buildContextualQuestPrompt(input, seriesConfig);

  // Generate the quest
  const questResult = await generateQuestWithAI(contextualPrompt, input, modelName);

  // Generate state updates based on quest creation
  const stateUpdates = generateQuestStateUpdates(questResult.quest, input);

  // Calculate narrative impact
  const narrativeImpact = calculateNarrativeImpact(questResult.quest, input.storyState);

  // Generate integration notes
  const integrationNotes = generateIntegrationNotes(questResult.quest, input, seriesConfig);

  console.log(`[DynamicQuest] Generated quest "${questResult.quest.title}" with ${stateUpdates.length} state updates`);

  return {
    quest: questResult.quest,
    questBranches: questResult.questBranches || [],
    stateUpdates,
    narrativeImpact,
    integrationNotes,
  };
}

function buildContextualQuestPrompt(input: DynamicQuestGenerationInput, seriesConfig: any): string {
  const basePrompt = `Generate a dynamic quest for "${input.seriesName}" based on the current story context.

QUEST TRIGGER: ${input.questTrigger}
CONTEXT: ${input.contextDescription}

CURRENT STORY STATE:
- Character: ${input.storyState.character.name} (${input.storyState.character.class})
- Location: ${input.storyState.currentLocation}
- Active Quests: ${input.storyState.quests?.filter(q => q.status === 'active').length || 0}
- Emotional State: ${input.storyState.characterEmotionalState?.primaryMood || 'unknown'}
- Stress Level: ${input.storyState.characterEmotionalState?.stressLevel || 0}

RELATIONSHIP CONTEXT:
${input.storyState.npcRelationships?.map(rel =>
  `- ${rel.npcName}: ${rel.relationshipScore} (${rel.trustLevel} trust)`
).join('\n') || 'No established relationships'}

ENVIRONMENTAL CONTEXT:
- Time of Day: ${input.storyState.environmentalContext?.timeContext?.timeOfDay || 'unknown'}
- Weather: ${input.storyState.environmentalContext?.weatherConditions?.condition || 'unknown'}
- Safety Level: ${input.storyState.environmentalContext?.locationDetails?.safetyLevel || 50}

ACTIVE NARRATIVE THREADS:
${input.storyState.narrativeThreads?.filter(thread => thread.status === 'active').map(thread =>
  `- ${thread.title}: ${thread.description} (Priority: ${thread.priority})`
).join('\n') || 'No active narrative threads'}

${GENERIC_QUEST_GENERATION_TEMPLATE}

QUEST REQUIREMENTS:
- Type: ${input.questType || 'dynamic'}
- Complexity: ${input.questComplexity || 'moderate'}
${input.timeConstraint ? `- Time Limit: ${input.timeConstraint} turns` : ''}
${input.involvedNPCs?.length ? `- Must involve NPCs: ${input.involvedNPCs.join(', ')}` : ''}
${input.requiredSkills?.length ? `- Required skills: ${input.requiredSkills.join(', ')}` : ''}

Generate a quest that:
1. Fits naturally into the current story context
2. Considers the character's emotional and relationship state
3. Advances or creates meaningful narrative threads
4. Provides appropriate challenge for the character's level
5. Has clear consequences that affect the enhanced tracking systems`;

  return adaptPromptForSeries(basePrompt, input.seriesName);
}

async function generateQuestWithAI(prompt: string, input: DynamicQuestGenerationInput, modelName: string) {
  const questGenerationPrompt = ai.definePrompt({
    name: 'dynamicQuestGenerationPrompt',
    model: modelName,
    input: {
      schema: z.object({
        prompt: z.string(),
        questType: z.string(),
        complexity: z.string(),
      })
    },
    output: {
      schema: z.object({
        quest: z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          type: z.enum(['main', 'side', 'dynamic', 'emergency']),
          status: z.enum(['active', 'completed', 'failed']),
          objectives: z.array(z.object({
            id: z.string(),
            description: z.string(),
            isCompleted: z.boolean(),
          })),
          rewards: z.array(z.string()).optional(),
          timeLimit: z.number().optional(),
          difficulty: z.enum(['easy', 'medium', 'hard', 'extreme']).optional(),
        }),
        questBranches: z.array(z.object({
          id: z.string(),
          questId: z.string(),
          title: z.string(),
          description: z.string(),
          conditions: z.array(z.string()),
          consequences: z.array(z.string()),
        })).optional(),
      })
    },
    config: {
      temperature: 0.8,
      maxOutputTokens: 2000,
    },
  });

  const result = await questGenerationPrompt({
    prompt,
    questType: input.questType || 'dynamic',
    complexity: input.questComplexity || 'moderate',
  });

  return result.output;
}

function generateQuestStateUpdates(quest: Quest, input: DynamicQuestGenerationInput): StateUpdate[] {
  const updates: StateUpdate[] = [];

  // Add narrative thread for the quest
  updates.push(createNarrativeUpdate(
    {
      newThread: {
        title: quest.title,
        description: quest.description,
        status: 'active',
        priority: quest.type === 'main' ? 'high' : 'medium',
        relatedQuestIds: [quest.id],
        affectedNPCs: input.involvedNPCs || [],
        progressMarkers: quest.objectives.map(obj => ({
          id: obj.id,
          description: obj.description,
          isCompleted: obj.isCompleted,
          completedAt: obj.isCompleted ? new Date().toISOString() : undefined,
        })),
        consequences: [],
        lastUpdated: new Date().toISOString(),
      }
    },
    `Created narrative thread for quest: ${quest.title}`,
    'quest_generation'
  ));

  // Add relationship updates for involved NPCs
  if (input.involvedNPCs) {
    for (const npcId of input.involvedNPCs) {
      updates.push(createRelationshipUpdate(
        npcId,
        5, // Small positive relationship boost for quest involvement
        'quest_involvement',
        `Involved in quest: ${quest.title}`,
        'quest_generation'
      ));
    }
  }

  return updates;
}

function calculateNarrativeImpact(quest: Quest, storyState: StructuredStoryState) {
  return {
    affectedNPCs: [], // Would be calculated based on quest content
    worldStateChanges: [], // Would be calculated based on quest consequences
    emotionalConsequences: [], // Would be calculated based on quest type and difficulty
    relationshipChanges: [], // Would be calculated based on involved NPCs
  };
}

function generateIntegrationNotes(quest: Quest, input: DynamicQuestGenerationInput, seriesConfig: any): string[] {
  const notes: string[] = [];

  notes.push(`Quest generated for ${seriesConfig.name} with ${seriesConfig.genre} themes`);
  notes.push(`Trigger: ${input.questTrigger} - Context: ${input.contextDescription}`);
  notes.push(`Complexity: ${input.questComplexity || 'moderate'} - Type: ${input.questType || 'dynamic'}`);

  if (input.involvedNPCs?.length) {
    notes.push(`Involves ${input.involvedNPCs.length} NPCs: ${input.involvedNPCs.join(', ')}`);
  }

  if (quest.timeLimit) {
    notes.push(`Time-sensitive quest with ${quest.timeLimit} turn limit`);
  }

  return notes;
}

const QuestGenerationInputSchema = z.object({
  storyState: z.any().describe('Current story state with all context'),
  questCategory: z.enum(['rescue', 'delivery', 'investigation', 'combat', 'diplomacy', 'exploration', 'any']).optional(),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  playerPreferences: z.object({
    preferredApproaches: z.array(z.string()).optional(),
    difficultyPreference: z.enum(['easy', 'moderate', 'hard', 'adaptive']).default('adaptive'),
    moralComplexity: z.number().min(0).max(100).default(50),
    branchingComplexity: z.enum(['simple', 'moderate', 'complex']).default('moderate')
  }).optional(),
  contextualTriggers: z.object({
    recentPlayerChoices: z.array(z.string()).optional(),
    activeFactionConflicts: z.array(z.string()).optional(),
    unresolved_narrative_threads: z.array(z.string()).optional(),
    environmental_factors: z.array(z.string()).optional()
  }).optional(),
  usePremiumAI: z.boolean().optional().default(false)
});

const QuestBranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  approach: z.enum(['combat', 'diplomacy', 'stealth', 'magic', 'social', 'economic']),
  requirements: z.array(z.object({
    type: z.string(),
    value: z.union([z.string(), z.number()]),
    description: z.string()
  })).optional(),
  consequences: z.array(z.object({
    type: z.enum(['immediate', 'delayed', 'conditional']),
    category: z.enum(['relationship', 'reputation', 'world_state', 'story_progression']),
    description: z.string(),
    severity: z.enum(['trivial', 'minor', 'moderate', 'major', 'critical'])
  })),
  difficultyModifier: z.number().min(-5).max(5).default(0)
});

const DynamicQuestSchema = z.object({
  title: z.string().describe('Engaging quest title that reflects the content and stakes'),
  description: z.string().describe('Detailed quest description explaining the situation and what needs to be done'),
  category: z.enum(['rescue', 'delivery', 'investigation', 'combat', 'diplomacy', 'exploration', 'social', 'economic']),
  objectives: z.array(z.object({
    description: z.string(),
    isCompleted: z.literal(false)
  })).min(1).max(4),
  
  // Enhanced quest properties
  moralAlignment: z.enum(['good', 'neutral', 'evil', 'complex']).optional(),
  difficultyRating: z.number().min(1).max(10),
  estimatedDuration: z.number().min(15).max(180).describe('Estimated completion time in minutes'),
  
  // Branching paths
  branches: z.array(QuestBranchSchema).optional(),
  
  // Time constraints
  timeLimit: z.object({
    duration: z.number().describe('Time limit in hours'),
    warningThreshold: z.number().min(0).max(100).default(25),
    failureConsequences: z.array(z.string())
  }).optional(),
  
  // Failure conditions
  failureConditions: z.array(z.object({
    type: z.enum(['time_limit', 'character_death', 'item_loss', 'relationship_threshold', 'faction_hostility']),
    description: z.string(),
    recoverable: z.boolean().default(true)
  })).optional(),
  
  // Rewards
  rewards: z.object({
    experiencePoints: z.number().min(0),
    currency: z.number().min(0).optional(),
    items: z.array(z.object({
      name: z.string(),
      description: z.string(),
      rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).optional()
    })).optional(),
    factionReputation: z.array(z.object({
      factionId: z.string(),
      change: z.number().min(-50).max(50)
    })).optional()
  }),
  
  // Long-term consequences
  consequences: z.array(z.object({
    type: z.enum(['immediate', 'short_term', 'long_term', 'permanent']),
    category: z.enum(['relationship', 'reputation', 'world_state', 'character_development', 'story_progression']),
    description: z.string(),
    severity: z.enum(['trivial', 'minor', 'moderate', 'major', 'critical']),
    visibilityToPlayer: z.enum(['hidden', 'hinted', 'obvious']).default('hinted')
  })),
  
  // Narrative integration
  narrativeHooks: z.array(z.string()).describe('How this quest connects to ongoing story threads'),
  worldStateChanges: z.array(z.string()).describe('How completing this quest will change the world'),
  
  // Player agency
  playerChoiceImpact: z.number().min(0).max(100).describe('How much player choices affect quest outcome'),
  alternativeSolutions: z.array(z.object({
    approach: z.string(),
    description: z.string(),
    requirements: z.array(z.string()).optional()
  })).optional()
});

const QuestGenerationOutputSchema = z.object({
  quest: DynamicQuestSchema,
  generationReasoning: z.string().describe('Explanation of why this quest was generated and how it fits the current context'),
  integrationSuggestions: z.array(z.string()).describe('Suggestions for how to integrate this quest into the ongoing narrative'),
  adaptationNotes: z.array(z.string()).describe('Notes on how the quest might adapt based on player choices')
});

// === QUEST GENERATION FLOW ===

export const generateDynamicQuestFlow = ai.defineFlow(
  {
    name: 'generateDynamicQuest',
    inputSchema: QuestGenerationInputSchema,
    outputSchema: QuestGenerationOutputSchema,
  },
  async (input) => {
    const flowStartTime = Date.now();
    console.log(`[${new Date().toISOString()}] generateDynamicQuestFlow: START`);

    try {
      // Extract context from story state
      const storyState = input.storyState as StructuredStoryState;
      const character = storyState.character;
      
      // Format enhanced context for AI
      const enhancedContext = formatEnhancedContextForAI(storyState);
      
      // Analyze recent player behavior
      const recentChoices = storyState.playerChoices?.slice(-5) || [];
      const playerBehaviorAnalysis = analyzePlayerBehavior(recentChoices);
      
      // Identify active narrative threads
      const activeThreads = storyState.narrativeThreads?.filter(thread => 
        thread.status === 'active' || thread.status === 'escalating'
      ) || [];
      
      // Check faction dynamics
      const factionConflicts = analyzeFactionConflicts(storyState.enhancedFactions || []);
      
      // Generate quest using AI
      const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
      
      const prompt = `You are an expert quest designer creating a dynamic quest for an interactive story game. 

**CURRENT CONTEXT:**
${enhancedContext}

**CHARACTER INFORMATION:**
- Name: ${character.name}
- Class: ${character.class}
- Level: ${character.level}
- Current Location: ${storyState.currentLocation}

**PLAYER BEHAVIOR ANALYSIS:**
${playerBehaviorAnalysis}

**ACTIVE NARRATIVE THREADS:**
${activeThreads.map(thread => `- ${thread.title}: ${thread.description} (Priority: ${thread.priority})`).join('\n')}

**FACTION DYNAMICS:**
${factionConflicts}

**QUEST GENERATION PARAMETERS:**
- Category Preference: ${input.questCategory || 'any'}
- Urgency Level: ${input.urgencyLevel}
- Difficulty Preference: ${input.playerPreferences?.difficultyPreference || 'adaptive'}
- Moral Complexity: ${input.playerPreferences?.moralComplexity || 50}/100
- Branching Complexity: ${input.playerPreferences?.branchingComplexity || 'moderate'}

**CONTEXTUAL TRIGGERS:**
${input.contextualTriggers ? Object.entries(input.contextualTriggers)
  .map(([key, values]) => `- ${key}: ${Array.isArray(values) ? values.join(', ') : values}`)
  .join('\n') : 'None specified'}

**QUEST DESIGN REQUIREMENTS:**

1. **Narrative Integration**: The quest must feel organic to the current story state and build upon existing narrative threads, relationships, and world events.

2. **Player Agency**: Design meaningful choices that have lasting consequences. The quest should adapt to different player approaches (combat, diplomacy, stealth, etc.).

3. **Moral Complexity**: Include ethical dilemmas appropriate to the specified complexity level. Avoid simple good/evil choices for complex quests.

4. **Faction Relevance**: Consider how the quest affects faction relationships and ongoing political dynamics.

5. **Consequence Design**: Create a mix of immediate and long-term consequences that feel meaningful and proportional to player choices.

6. **Branching Paths**: If complexity allows, design multiple solution paths with different requirements, risks, and rewards.

7. **Failure States**: Include meaningful failure conditions that create tension without being punitive.

8. **World Impact**: Ensure the quest has visible effects on the world state and ongoing narrative.

**SPECIFIC GUIDELINES:**
- Quest difficulty should match character level (${character.level}) and player preferences
- Include at least one choice that tests the player's established moral alignment
- Reference specific NPCs, locations, or factions from the current context when possible
- Ensure rewards are appropriate for the effort and risk involved
- Design consequences that players will discover over multiple turns
- Create opportunities for the player to use their established skills and relationships

Generate a dynamic quest that feels like a natural extension of the current story while providing meaningful choices and consequences.`;

      const response = await ai.generate({
        model: modelName,
        prompt: prompt,
        output: { schema: QuestGenerationOutputSchema }
      });

      const result = response.output;
      
      console.log(`[${new Date().toISOString()}] generateDynamicQuestFlow: Generated quest "${result.quest.title}"`);
      console.log(`[${new Date().toISOString()}] generateDynamicQuestFlow: END. Total time: ${Date.now() - flowStartTime}ms`);
      
      return result;
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] generateDynamicQuestFlow: ERROR:`, error);
      
      // Fallback to template-based generation
      const fallbackQuest = generateFallbackQuest(input.storyState as StructuredStoryState, input);
      
      return {
        quest: fallbackQuest,
        generationReasoning: 'Generated using fallback template due to AI generation error',
        integrationSuggestions: ['Integrate naturally into current story flow'],
        adaptationNotes: ['Quest may need manual adjustment for optimal integration']
      };
    }
  }
);

// === HELPER FUNCTIONS ===

function analyzePlayerBehavior(recentChoices: PlayerChoice[]): string {
  if (recentChoices.length === 0) {
    return 'No recent choices to analyze - new player or fresh start';
  }

  const moralTendencies = recentChoices.map(choice => choice.moralAlignment).filter(Boolean);
  const difficultyLevels = recentChoices.map(choice => choice.difficultyLevel);
  const averageDifficulty = difficultyLevels.reduce((sum, level) => sum + level, 0) / difficultyLevels.length;

  const moralAnalysis = moralTendencies.length > 0 
    ? `Moral tendencies: ${moralTendencies.join(', ')}`
    : 'No clear moral pattern established';

  return `Recent behavior analysis:
- ${moralAnalysis}
- Average choice difficulty: ${averageDifficulty.toFixed(1)}/10
- Total recent choices: ${recentChoices.length}
- Player seems to prefer ${averageDifficulty > 6 ? 'challenging' : averageDifficulty > 3 ? 'moderate' : 'simple'} decisions`;
}

function analyzeFactionConflicts(factions: EnhancedFaction[]): string {
  if (factions.length === 0) {
    return 'No faction information available';
  }

  const conflicts: string[] = [];
  const alliances: string[] = [];

  factions.forEach(faction => {
    faction.relationships.forEach(rel => {
      if (rel.relationshipType === 'hostile' || rel.relationshipType === 'at_war') {
        conflicts.push(`${faction.name} vs ${rel.factionName} (${rel.relationshipType})`);
      } else if (rel.relationshipType === 'allied') {
        alliances.push(`${faction.name} allied with ${rel.factionName}`);
      }
    });
  });

  return `Faction Dynamics:
Active Conflicts: ${conflicts.length > 0 ? conflicts.join(', ') : 'None'}
Active Alliances: ${alliances.length > 0 ? alliances.join(', ') : 'None'}
Total Factions: ${factions.length}`;
}

function generateFallbackQuest(storyState: StructuredStoryState, input: any): any {
  // Use the template-based generator as fallback
  const settings: QuestGenerationSettings = {
    dynamicQuestFrequency: 'medium',
    preferredQuestTypes: ['dynamic'],
    difficultyPreference: input.playerPreferences?.difficultyPreference || 'adaptive',
    branchingComplexity: input.playerPreferences?.branchingComplexity || 'moderate',
    consequenceSeverity: 'moderate',
    moralComplexityLevel: input.playerPreferences?.moralComplexity || 50,
    timeConstraintPreference: 'moderate',
    failureToleranceLevel: 50,
    adaptiveGeneration: true,
    playerChoiceWeight: 70
  };

  const templateQuest = generateDynamicQuest(storyState, settings, input.questCategory);
  
  if (templateQuest) {
    return {
      title: templateQuest.title || 'Dynamic Quest',
      description: templateQuest.description,
      category: 'exploration',
      objectives: templateQuest.objectives || [{ description: 'Complete the quest', isCompleted: false }],
      difficultyRating: templateQuest.difficultyRating || 5,
      estimatedDuration: templateQuest.estimatedDuration || 60,
      rewards: templateQuest.rewards || { experiencePoints: 100 },
      consequences: [],
      narrativeHooks: ['Connects to ongoing story'],
      worldStateChanges: ['Minor world changes'],
      playerChoiceImpact: templateQuest.playerChoiceImpact || 50
    };
  }

  // Ultimate fallback
  return {
    title: 'Exploration Task',
    description: 'A simple task has presented itself that requires your attention.',
    category: 'exploration',
    objectives: [{ description: 'Investigate the local area', isCompleted: false }],
    difficultyRating: 3,
    estimatedDuration: 30,
    rewards: { experiencePoints: 50 },
    consequences: [],
    narrativeHooks: ['Simple local task'],
    worldStateChanges: ['Minor local changes'],
    playerChoiceImpact: 30
  };
}

// === QUEST INTEGRATION UTILITIES ===

export function integrateQuestIntoStoryState(
  generatedQuest: any,
  storyState: StructuredStoryState,
  turnId: string
): StructuredStoryState {
  // Convert AI-generated quest to proper Quest object
  const quest: Quest = {
    id: `dynamic_quest_${Date.now()}`,
    title: generatedQuest.title,
    description: generatedQuest.description,
    type: 'dynamic',
    status: 'active',
    category: generatedQuest.category,
    objectives: generatedQuest.objectives,
    rewards: generatedQuest.rewards,
    moralAlignment: generatedQuest.moralAlignment,
    difficultyRating: generatedQuest.difficultyRating,
    estimatedDuration: generatedQuest.estimatedDuration,
    playerChoiceImpact: generatedQuest.playerChoiceImpact,
    updatedAt: new Date().toISOString()
  };

  // Add branches if they exist
  if (generatedQuest.branches) {
    quest.branches = generatedQuest.branches.map((branch: any) => ({
      id: `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: branch.name,
      description: branch.description,
      condition: {
        type: 'choice',
        value: branch.approach,
        description: `Choose ${branch.approach} approach`
      },
      objectives: quest.objectives || [],
      rewards: quest.rewards || { experiencePoints: 0 },
      consequences: branch.consequences.map((cons: any) => ({
        id: `consequence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: cons.type,
        category: cons.category,
        description: cons.description,
        severity: cons.severity,
        effects: [],
        reversible: cons.severity !== 'critical',
        visibilityToPlayer: 'hinted'
      })),
      nextBranches: [],
      difficultyModifier: branch.difficultyModifier || 0
    }));
  }

  // Add consequences
  if (generatedQuest.consequences) {
    quest.consequences = generatedQuest.consequences.map((cons: any) => ({
      id: `consequence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: cons.type,
      category: cons.category,
      description: cons.description,
      severity: cons.severity,
      effects: [], // Would be populated based on consequence type
      reversible: cons.severity !== 'critical',
      visibilityToPlayer: cons.visibilityToPlayer || 'hinted'
    }));
  }

  // Add time limit if specified
  if (generatedQuest.timeLimit) {
    quest.timeLimit = {
      type: 'real_time',
      duration: generatedQuest.timeLimit.duration,
      warningThreshold: generatedQuest.timeLimit.warningThreshold,
      failureConsequences: generatedQuest.timeLimit.failureConsequences.map((desc: string) => ({
        id: `failure_consequence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'immediate',
        category: 'story_progression',
        description: desc,
        severity: 'moderate',
        effects: [],
        reversible: false,
        visibilityToPlayer: 'obvious'
      }))
    };
  }

  // Add failure conditions
  if (generatedQuest.failureConditions) {
    quest.failureConditions = generatedQuest.failureConditions.map((condition: any) => ({
      type: condition.type,
      description: condition.description,
      consequences: [],
      recoverable: condition.recoverable
    }));
  }

  return {
    ...storyState,
    quests: [...storyState.quests, quest]
  };
}

export { };
