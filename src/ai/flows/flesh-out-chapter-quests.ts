
'use server';
/**
 * @fileOverview A Genkit flow for dynamically generating detailed main quests for a given story arc outline.
 * This flow is triggered when a story arc is completed and the next story arc exists only as an outline.
 * It uses the series plot summary and overall story context to create canonical quests.
 *
 * - fleshOutStoryArcQuests - Function to generate detailed quests for an outlined story arc.
 * - FleshOutStoryArcQuestsInput - Input type for the flow.
 * - FleshOutStoryArcQuestsOutput - Output type for the flow.
 */

import { ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME } from '@/ai/genkit';
import { z } from 'zod';
import type { Quest as QuestType, StoryArc as StoryArcType, Item as ItemType, FleshOutStoryArcQuestsInput as IFleshOutStoryArcQuestsInput, FleshOutStoryArcQuestsOutput as IFleshOutStoryArcQuestsOutput, ItemRarity, ActiveEffect as ActiveEffectType, StatModifier as StatModifierType } from '@/types/story'; // StoryArcType
import { EquipSlotEnumInternal } from '@/types/zod-schemas';
import { lookupLoreTool } from '@/ai/tools/lore-tool';

// --- Schemas for AI communication (Subset, focused on Quest generation) ---
const ItemRarityEnumInternal = z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']);

const StatModifierSchemaInternal = z.object({
  stat: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'maxHealth', 'maxMana', 'health', 'mana', 'level', 'experiencePoints', 'currency', 'languageReading', 'languageSpeaking']),
  value: z.number(),
  type: z.enum(['add', 'multiply']),
  description: z.string().optional(),
});

const ActiveEffectSchemaInternal = z.object({
  id: z.string().describe("Unique ID for this specific effect on this item instance. REQUIRED."),
  name: z.string().describe("Descriptive name of the effect. REQUIRED."),
  description: z.string().describe("Narrative description of what the effect does. REQUIRED."),
  type: z.enum(['stat_modifier', 'temporary_ability', 'passive_aura']).describe("REQUIRED."),
  duration: z.union([z.string().describe("Use 'permanent_while_equipped' for ongoing effects from gear."), z.number().int().describe("Number of turns effect lasts (for consumables, should be positive).")]).optional().describe("Duration of the effect. Use 'permanent_while_equipped' for ongoing effects from gear. Use a positive integer (representing turns) for temporary effects from consumables."),
  statModifiers: z.array(StatModifierSchemaInternal).optional().describe("If type is 'stat_modifier', array of stat changes."),
  sourceItemId: z.string().optional(),
});

const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_reward_key_001'. Make it unique within the current rewards. REQUIRED."),
  name: z.string().describe("The name of the item. REQUIRED."),
  description: z.string().describe("A brief description of the item. REQUIRED."),
  equipSlot: EquipSlotEnumInternal.optional().describe("If equippable gear, specify slot. OMIT if not (e.g. potion, key)."),
  isConsumable: z.boolean().optional(),
  effectDescription: z.string().optional().describe("For simple items. For gear with stat mods or complex effects, use 'activeEffects'."),
  isQuestItem: z.boolean().optional(),
  relevantQuestId: z.string().optional(),
  basePrice: z.number().optional().describe("Base value. MUST BE a number if provided."),
  rarity: ItemRarityEnumInternal.optional().describe("The rarity of the item. Most quest rewards can be 'uncommon' or 'rare'."),
  activeEffects: z.array(ActiveEffectSchemaInternal).optional().describe("Array of structured active effects. For reward gear, consider adding 'stat_modifier' effects. 'duration' should be 'permanent_while_equipped' for gear stat mods. For consumables, duration should be a positive integer (number of turns)."),
});

const QuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("A clear description of this specific objective for the quest. REQUIRED."),
  isCompleted: z.literal(false).describe("Must be false for new objectives. REQUIRED."),
});

const QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("XP awarded. MUST BE a number if provided."),
  items: z.array(ItemSchemaInternal).optional().describe("Items awarded. Each must have unique ID, name, description, 'basePrice' (number), optional 'rarity', optional 'equipSlot', and optional 'activeEffects' (with structured 'statModifiers' if type is 'stat_modifier', and numeric 'duration' (should be positive) for consumables)."),
  currency: z.number().optional().describe("Currency awarded. MUST BE a number if provided."),
}).describe("Potential rewards. Defined at quest creation.");

const QuestSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the quest, e.g., 'quest_main_storyarc2_001'. Must be unique among all quests being generated for this story arc. REQUIRED."),
  title: z.string().optional().describe("A short, engaging title for the quest, fitting the story arc and series."),
  description: z.string().describe("A clear description of the quest's overall objective, fitting the series and story arc context. REQUIRED."),
  type: z.literal('main').describe("All quests generated by this flow MUST be of type 'main'. REQUIRED."),
  status: z.literal('active').describe("All quests generated by this flow MUST have status 'active'. REQUIRED."),
  storyArcId: z.string().describe("The ID of the story arc this quest belongs to (must match the input storyArcToFleshOut.id). REQUIRED."), // Renamed from chapterId
  orderInStoryArc: z.number().optional().describe("Suggested sequence within the story arc (e.g., 1, 2, 3)."), // Renamed from orderInChapter
  category: z.string().optional().describe("Optional category (e.g., 'Investigation', 'Confrontation')."),
  objectives: z.array(QuestObjectiveSchemaInternal).optional().describe("1-3 specific sub-objectives. 'isCompleted' MUST be false."),
  rewards: QuestRewardsSchemaInternal.optional(),
});

// --- Input and Output Schemas for the Flow ---
// Renamed from ChapterSchemaForInput
const StoryArcSchemaForInput = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    order: z.number(),
    mainQuestIds: z.array(z.string()).optional(), // Should be empty or undefined for an outlined story arc
    isCompleted: z.literal(false),
    unlockCondition: z.string().optional(),
});

// Renamed from FleshOutChapterQuestsInputSchema
const FleshOutStoryArcQuestsInputSchema = z.object({
  storyArcToFleshOut: StoryArcSchemaForInput.describe("The outlined story arc object that needs its main quests generated."), // Renamed from chapterToFleshOut
  seriesName: z.string().describe("The name of the series for context."),
  seriesPlotSummary: z.string().describe("A summary of the series' overall plot points to guide canonical quest generation."),
  overallStorySummarySoFar: z.string().describe("A summary of what has happened in the game so far, including events of the PREVIOUS story arc. This is crucial for narrative continuity."),
  characterContext: z.object({
      name: z.string(),
      class: z.string(),
      level: z.number(),
  }).describe("Minimal information about the player character for context."),
  usePremiumAI: z.boolean().optional().describe("Whether to use the premium AI model."),
});
export type FleshOutStoryArcQuestsInput = z.infer<typeof FleshOutStoryArcQuestsInputSchema>; // Renamed type

// Renamed from FleshOutChapterQuestsOutputSchema
const FleshOutStoryArcQuestsOutputSchema = z.object({
  fleshedOutQuests: z.array(QuestSchemaInternal).describe("REQUIRED. An array of 2-3 detailed main quests for the specified story arc, consistent with the series plot and story arc theme. Each quest must have a unique ID, title, description, type: 'main', status: 'active', the correct storyArcId, orderInStoryArc, optional objectives, and rewards (with numeric prices/currency and optional item rarity and optional item activeEffects with statModifiers). All nested REQUIRED fields for quests and items must be present."),
});
export type FleshOutStoryArcQuestsOutput = z.infer<typeof FleshOutStoryArcQuestsOutputSchema>; // Renamed type


// Renamed from fleshOutChapterQuests
export async function fleshOutStoryArcQuests(input: IFleshOutStoryArcQuestsInput): Promise<IFleshOutStoryArcQuestsOutput> {
  return fleshOutStoryArcQuestsFlow(input as FleshOutStoryArcQuestsInput);
}

// Renamed from fleshOutChapterQuestsFlow
const fleshOutStoryArcQuestsFlow = ai.defineFlow(
  {
    name: 'fleshOutStoryArcQuestsFlow', // Renamed flow name
    inputSchema: FleshOutStoryArcQuestsInputSchema,
    outputSchema: FleshOutStoryArcQuestsOutputSchema,
  },
  async (input) => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] fleshOutStoryArcQuestsFlow: START for Story Arc: "${input.storyArcToFleshOut.title}" in Series: ${input.seriesName}, Premium: ${input.usePremiumAI}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = input.usePremiumAI
        ? { maxOutputTokens: 32000 }
        : { maxOutputTokens: 4000 };

    const prompt = ai.definePrompt({
      name: 'fleshOutStoryArcQuestsPrompt', // Renamed prompt name
      model: modelName,
      input: { schema: FleshOutStoryArcQuestsInputSchema },
      output: { schema: FleshOutStoryArcQuestsOutputSchema },
      tools: [lookupLoreTool],
      config: modelConfig,
      prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to the 'FleshOutStoryArcQuestsOutputSchema'. The 'fleshedOutQuests' array is REQUIRED. Each quest object within it MUST have 'id', 'description', 'type', 'status', and 'storyArcId' fields. If 'objectives' are included, each must have 'description' and 'isCompleted'. If 'items' are included in rewards, each item MUST have 'id', 'name', and 'description'.

You are a master storyteller crafting the main quests for a story arc in an interactive game set in the series: "{{seriesName}}".
The player character is {{characterContext.name}}, a level {{characterContext.level}} {{characterContext.class}}.

The specific story arc to flesh out is (ID: {{storyArcToFleshOut.id}}):
- Story Arc Title: {{storyArcToFleshOut.title}}
- Story Arc Description: {{storyArcToFleshOut.description}}
- Story Arc Order: {{storyArcToFleshOut.order}}

Key Context for Quest Generation:
1.  **Series Canonical Plot Points (Primary Guide):**
    {{{seriesPlotSummary}}}
2.  **Overall Story Summary So Far (Crucial for Continuity):** This summary includes events from previous story arcs. Ensure the new quests logically follow from these past events and create a smooth narrative transition.
    {{{overallStorySummarySoFar}}}

Your Task:
Generate an array of 2-3 'fleshedOutQuests' for the story arc titled "{{storyArcToFleshOut.title}}".
- Each quest MUST be of \`type: "main"\` and \`status: "active"\`.
- Each quest's \`storyArcId\` MUST be "{{storyArcToFleshOut.id}}".
- Assign sequential \`orderInStoryArc\` numbers (e.g., 1, 2, 3).
- Quests MUST align with the \`seriesPlotSummary\` and the theme of \`{{storyArcToFleshOut.title}}\`. They must also logically connect to the events described in \`overallStorySummarySoFar\`. Use the \`lookupLoreTool\` if needed for canonical accuracy on names, locations, specific items, or series-specific terms.
- Each quest MUST have a unique \`id\` (e.g., quest_main_{{storyArcToFleshOut.id}}_001), an optional \`title\`, a detailed \`description\`, and 1-2 \`objectives\` (with \`isCompleted: false\`).
- **Crucially, include meaningful 'rewards' for these main quests** (experiencePoints (number), currency (number), and/or items).
- For reward items: each MUST have a unique 'id', 'name', 'description', 'basePrice' (number), optional 'rarity', and optional 'equipSlot' (OMIT for non-equippable items).
- **For reward items that are gear (especially 'uncommon' or 'rare'), you MAY include 'activeEffects'.** If so, each effect needs an 'id', 'name', 'description', 'type' (e.g., 'stat_modifier', 'passive_aura'), 'duration' (e.g., 'permanent_while_equipped' for gear stat mods, or a string for how long a temporary effect lasts, or an integer for number of turns for consumables - should be positive), and if 'stat_modifier', a 'statModifiers' array (each with 'stat', 'value' (number), 'type': 'add').
- Ensure all numeric fields (prices, XP, currency, stat values etc.) are actual numbers.

Output ONLY the JSON object adhering to 'FleshOutStoryArcQuestsOutputSchema'. Example: \`{"fleshedOutQuests": [{"id": "...", "title": "...", ...}]}\`
Ensure all field names and values in your JSON response strictly match the types and requirements described in the FleshOutStoryArcQuestsOutputSchema definition provided earlier in this prompt.`,
    });

    let promptCallTime = Date.now();
    console.log(`[${new Date(promptCallTime).toISOString()}] fleshOutStoryArcQuestsFlow: Calling fleshOutStoryArcQuestsPrompt.`);
    const { output } = await prompt(input);
    console.log(`[${new Date().toISOString()}] fleshOutStoryArcQuestsFlow: fleshOutStoryArcQuestsPrompt call completed in ${Date.now() - promptCallTime}ms.`);

    if (!output || !output.fleshedOutQuests) {
      console.error("fleshOutStoryArcQuestsFlow: AI failed to return fleshedOutQuests.", output);
      throw new Error('AI failed to generate quests for the story arc (REQUIRED "fleshedOutQuests" field missing).');
    }

    const validatedQuests = output.fleshedOutQuests.map((q, index) => ({
        ...q,
        id: q.id || `fleshed_quest_${input.storyArcToFleshOut.id}_${Date.now()}_${index}`,
        type: 'main' as QuestType['type'],
        status: 'active' as QuestType['status'],
        storyArcId: input.storyArcToFleshOut.id, // Ensure correct storyArcId
        description: q.description || "No description provided by AI.",
        orderInStoryArc: q.orderInStoryArc ?? (index + 1), // Ensure orderInStoryArc
        objectives: q.objectives?.map(obj => ({...obj, description: obj.description || "Unnamed objective", isCompleted: false})) || [],
        rewards: q.rewards ? {
            experiencePoints: q.rewards.experiencePoints,
            currency: q.rewards.currency,
            items: q.rewards.items?.map((item, i) => {
                const validatedItem: ItemType = {
                    ...item,
                    id: item.id || `reward_item_${q.id}_${Date.now()}_${i}`,
                    name: item.name || "Unnamed Reward Item",
                    description: item.description || "No item description.",
                    basePrice: item.basePrice ?? 0,
                    rarity: item.rarity ?? undefined,
                    activeEffects: (item.activeEffects as ActiveEffectType[] | undefined)?.map((effect, effIdx) => ({
                        ...effect,
                        id: effect.id || `eff_${item.id || 'new_item'}_${Date.now()}_${effIdx}`,
                        name: effect.name || "Unnamed Effect",
                        description: effect.description || "No effect description.",
                        type: effect.type || 'passive_aura',
                        statModifiers: (effect.statModifiers as StatModifierType[] | undefined)?.map(mod => ({
                            ...mod,
                            value: mod.value ?? 0,
                            type: mod.type || 'add',
                        })) || [],
                        duration: (typeof effect.duration === 'number' && effect.duration <=0) ? 1 : effect.duration || (effect.type === 'stat_modifier' ? 'permanent_while_equipped' : undefined),
                    })).filter(effect => effect.statModifiers && effect.statModifiers.length > 0 || effect.type !== 'stat_modifier') || [],
                };
                if (validatedItem.activeEffects && validatedItem.activeEffects.length === 0) {
                    delete validatedItem.activeEffects;
                }
                return validatedItem;
            }) || []
        } : undefined,
    }));

    console.log(`[${new Date().toISOString()}] fleshOutStoryArcQuestsFlow: END. Total time: ${Date.now() - flowStartTime}ms. Generated ${validatedQuests.length} quests.`);
    return { fleshedOutQuests: validatedQuests as QuestType[] };
  }
);


    