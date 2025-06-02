
'use server';
/**
 * @fileOverview A Genkit flow for generating a bridging quest or narrative hook
 * when major story arcs conclude and no new major arc is immediately discovered.
 *
 * - generateBridgingQuest - Function to generate this bridging content.
 * - GenerateBridgingQuestInput - Input type for the flow.
 * - GenerateBridgingQuestOutput - Output type for the flow.
 */

import { ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME } from '@/ai/genkit';
import { z } from 'zod';
import type { Quest as QuestType, GenerateBridgingQuestInput as IGenerateBridgingQuestInput, GenerateBridgingQuestOutput as IGenerateBridgingQuestOutput, Item as ItemType, ActiveEffect as ActiveEffectType, StatModifier as StatModifierType, ItemRarity } from '@/types/story';
import { EquipSlotEnumInternal } from '@/types/zod-schemas'; // Ensure this is imported if used in ItemSchemaInternal
import { lookupLoreTool } from '@/ai/tools/lore-tool';

// Re-using ItemSchemaInternal, QuestSchemaInternal etc. from other flows if identical.
// For simplicity, let's redefine a focused QuestSchema for bridging content, though reuse is better for maintenance.

const ItemRarityEnumInternal = z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']);

const StatModifierSchemaInternal = z.object({
  stat: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'maxHealth', 'maxMana', 'health', 'mana', 'level', 'experiencePoints', 'currency', 'languageReading', 'languageSpeaking']),
  value: z.number(),
  type: z.enum(['add', 'multiply']),
  description: z.string().optional(),
});

const ActiveEffectSchemaInternal = z.object({
  id: z.string().describe("REQUIRED."),
  name: z.string().describe("REQUIRED."),
  description: z.string().describe("REQUIRED."),
  type: z.enum(['stat_modifier', 'temporary_ability', 'passive_aura']).describe("REQUIRED."),
  duration: z.union([z.string().describe("Use 'permanent_while_equipped' for ongoing effects from gear."), z.number().int().describe("Number of turns effect lasts (for consumables, must be positive).")]).optional(),
  statModifiers: z.array(StatModifierSchemaInternal).optional(),
  sourceItemId: z.string().optional(),
});

const BridgingItemSchemaInternal = z.object({
  id: z.string().describe("REQUIRED."),
  name: z.string().describe("REQUIRED."),
  description: z.string().describe("REQUIRED."),
  equipSlot: EquipSlotEnumInternal.optional(),
  isConsumable: z.boolean().optional(),
  effectDescription: z.string().optional(),
  isQuestItem: z.boolean().optional(),
  relevantQuestId: z.string().optional(),
  basePrice: z.number().optional().describe("MUST BE a number if provided."),
  rarity: ItemRarityEnumInternal.optional().default('common'),
  activeEffects: z.array(ActiveEffectSchemaInternal).optional(),
});

const BridgingQuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("REQUIRED."),
  isCompleted: z.literal(false).describe("REQUIRED."),
});

const BridgingQuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("MUST BE a number if provided."),
  items: z.array(BridgingItemSchemaInternal).optional(),
  currency: z.number().optional().describe("MUST BE a number if provided."),
});

const BridgingQuestSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the quest, e.g., 'quest_bridge_123'. REQUIRED."),
  title: z.string().optional(),
  description: z.string().describe("A clear description of the quest's overall objective. REQUIRED."),
  type: z.enum(['side', 'dynamic']).describe("MUST be 'side' or 'dynamic'. REQUIRED."),
  status: z.literal('active').describe("MUST be 'active'. REQUIRED."),
  storyArcId: z.null().or(z.string().optional()).describe("Should be null or a generic bridge ID like 'bridge_quests', not a main story arc ID."),
  orderInStoryArc: z.number().optional(),
  category: z.string().optional(),
  objectives: z.array(BridgingQuestObjectiveSchemaInternal).optional().describe("1-2 objectives, 'isCompleted' MUST be false."),
  rewards: BridgingQuestRewardsSchemaInternal.optional(),
});


// --- Input and Output Schemas for the Flow ---
const GenerateBridgingQuestInputSchema = z.object({
  seriesName: z.string(),
  currentLocation: z.string(),
  characterProfile: z.object({
    name: z.string(),
    class: z.string(),
    level: z.number(),
  }),
  overallStorySummarySoFar: z.string(),
  previousArcCompletionSummary: z.string(),
  usePremiumAI: z.boolean().optional(),
});
export type GenerateBridgingQuestInput = z.infer<typeof GenerateBridgingQuestInputSchema>;

const GenerateBridgingQuestOutputSchema = z.object({
  bridgingQuest: BridgingQuestSchemaInternal.nullable().describe("The generated side quest or minor event, or null if no specific quest is generated."),
  bridgingNarrativeHook: z.string().optional().describe("A short narrative hook for the next scene if a full quest is not suitable."),
});
export type GenerateBridgingQuestOutput = z.infer<typeof GenerateBridgingQuestOutputSchema>;


// --- Exported Function ---
export async function generateBridgingQuest(input: IGenerateBridgingQuestInput): Promise<IGenerateBridgingQuestOutput> {
  return generateBridgingQuestFlow(input as GenerateBridgingQuestInput);
}

// --- Genkit Flow Definition ---
const generateBridgingQuestFlow = ai.defineFlow(
  {
    name: 'generateBridgingQuestFlow',
    inputSchema: GenerateBridgingQuestInputSchema,
    outputSchema: GenerateBridgingQuestOutputSchema,
  },
  async (input) => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] generateBridgingQuestFlow: START for Character: ${input.characterProfile.name}, Series: ${input.seriesName}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = input.usePremiumAI
        ? { maxOutputTokens: 4000 } // Bridging content should be concise
        : { maxOutputTokens: 2000 };

    const prompt = ai.definePrompt({
      name: 'generateBridgingQuestPrompt',
      model: modelName,
      input: { schema: GenerateBridgingQuestInputSchema },
      output: { schema: GenerateBridgingQuestOutputSchema },
      tools: [lookupLoreTool],
      config: modelConfig,
      prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'GenerateBridgingQuestOutputSchema'. Provide EITHER a 'bridgingQuest' object OR a 'bridgingNarrativeHook' string. If providing a quest, ensure ALL its REQUIRED fields (id, description, type, status) are present.

You are a dynamic Game Master. The main story arc for the player, {{characterProfile.name}} (Level {{characterProfile.level}} {{characterProfile.class}}) in the series "{{seriesName}}", has just concluded.
- Summary of how the last arc ended: "{{previousArcCompletionSummary}}"
- Overall story summary so far: "{{overallStorySummarySoFar}}"
- Player's current location: "{{currentLocation}}"

No further major canonical story arcs are immediately apparent from the overall series summary.
Your task is to provide EITHER:
1.  A 'bridgingQuest': A single, concise, and contextually relevant side quest or minor event.
    -   MUST be \\\`type: "side"\\\` or \\\`type: "dynamic"\\\`.
    -   MUST have \\\`status: "active"\\\`.
    -   MUST have a unique \\\`id\\\` (e.g., "quest_bridge_{{randomString length=5}}").
    -   MUST have a \\\`description\\\`. A \\\`title\\\` is optional.
    -   \\\`storyArcId\\\` should be \\\`null\\\` or a generic ID like "bridge_quests".
    -   Include 1-2 simple \\\`objectives\\\` (\\\`isCompleted: false\\\`).
    -   Optional: minor \\\`rewards\\\` (small XP (number), currency (number), or a 'common' item with id, name, desc, basePrice (number)). Items can have 'activeEffects' (numeric duration if consumable).
    -   Use the 'lookupLoreTool' if needed for relevant names/locations for this small event.
2.  OR a 'bridgingNarrativeHook': A short (1-2 sentences) narrative hook suggesting an immediate event, observation, or interaction the player can react to in the very next scene (e.g., "A shadowy figure beckons from a nearby alleyway," or "You notice a peculiar glint from an object half-buried in the mud.").

Choose the option that feels most natural for the current situation. If a full quest seems too much, a narrative hook is preferred. If neither feels appropriate, return \`{"bridgingQuest": null, "bridgingNarrativeHook": null}\`.

Output ONLY the JSON object.
Example for a quest: \`{"bridgingQuest": {"id": "bridge_q_abc12", "title": "Lost Locket", "description": "An elderly woman in the market seems distressed, having lost a precious locket.", "type": "side", "status": "active", "storyArcId": null, "objectives": [{"description": "Ask the woman about the locket.", "isCompleted": false}, {"description": "Search the nearby stalls.", "isCompleted": false}], "rewards": {"experiencePoints": 50}}, "bridgingNarrativeHook": null}\`
Example for a hook: \`{"bridgingQuest": null, "bridgingNarrativeHook": "As you ponder your next move, a courier bumps into you, dropping a sealed envelope before rushing off."}\`
`,
    });

    let promptCallTime = Date.now();
    console.log(`[${new Date(promptCallTime).toISOString()}] generateBridgingQuestFlow: Calling generateBridgingQuestPrompt.`);
    const { output } = await prompt(input);
    console.log(`[${new Date().toISOString()}] generateBridgingQuestFlow: generateBridgingQuestPrompt call completed in ${Date.now() - promptCallTime}ms.`);

    if (!output) {
      console.error("generateBridgingQuestFlow: AI failed to return any output.");
      return { bridgingQuest: null, bridgingNarrativeHook: undefined };
    }
    
    // Validate/Sanitize the quest if returned
    if (output.bridgingQuest) {
        const q = output.bridgingQuest;
        q.id = q.id || `bridge_quest_fallback_${Date.now()}`;
        q.type = q.type === 'main' ? 'side' : (q.type || 'dynamic'); // Ensure not 'main'
        q.status = 'active';
        q.storyArcId = q.storyArcId === undefined ? null : q.storyArcId; // Default to null if not provided or make it explicit
        q.description = q.description || "A new opportunity or event has arisen.";
        q.objectives = q.objectives?.map(obj => ({...obj, description: obj.description || "Investigate further.", isCompleted: false})) || [{description: "Investigate further.", isCompleted: false}];
        if (q.rewards) {
            q.rewards.experiencePoints = q.rewards.experiencePoints ?? undefined;
            q.rewards.currency = q.rewards.currency ?? undefined;
            q.rewards.items = q.rewards.items?.map((item, i) => ({
                ...item,
                id: item.id || `bridge_reward_item_${q.id}_${i}`,
                name: item.name || "Mysterious Item",
                description: item.description || "An item of unknown origin.",
                basePrice: item.basePrice ?? 0,
                rarity: item.rarity ?? 'common',
                activeEffects: item.activeEffects?.map((eff, ei) => ({
                    ...eff,
                    id: eff.id || `bridge_eff_${item.id}_${ei}`,
                    name: eff.name || "Unknown Effect",
                    description: eff.description || "A mysterious effect.",
                    type: eff.type || 'passive_aura',
                    duration: (typeof eff.duration === 'number' && eff.duration <= 0) ? 1 : eff.duration,
                })) || []
            })) || [];
            if (q.rewards.items.length === 0) delete q.rewards.items;
        }
    }
    if (output.bridgingQuest && output.bridgingNarrativeHook) {
        // Prioritize quest if both are somehow returned
        output.bridgingNarrativeHook = undefined; 
    }


    console.log(`[${new Date().toISOString()}] generateBridgingQuestFlow: END. Total time: ${Date.now() - flowStartTime}ms. Generated: ${output.bridgingQuest ? 'Quest ('+output.bridgingQuest.title+')' : (output.bridgingNarrativeHook ? 'Narrative Hook' : 'Nothing')}`);
    return output;
  }
);

