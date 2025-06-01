
'use server';

/**
 * @fileOverview A Genkit flow for generating an initial game scenario based on a real-life series.
 * This includes the starting scene, character state (potentially based on user input for name/class, including separate languageReading and languageSpeaking skills),
 * initial inventory, chapters with main quests (coherent with the series plot), world facts,
 * a set of pre-populated lorebook entries relevant to the series, a brief series style guide,
 * initial profiles for any NPCs introduced in the starting scene or known major characters from the series (including merchant data, and optional health/mana for combatants),
 * and starting skills/abilities for the character.
 * This flow uses a multi-step generation process with parallelized AI calls and supports model selection.
 * Only the first chapter's main quests are generated in detail; subsequent chapters are outlined.
 *
 * - generateScenarioFromSeries - Function to generate the scenario.
 * - GenerateScenarioFromSeriesInput - Input type (series name, optional character name/class, usePremiumAI).
 * - GenerateScenarioFromSeriesOutput - Output type (scene, story state, initial lore, style guide, plot summary).
 */

import {ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME} from '@/ai/genkit';
import {z}from 'zod';
import type { EquipmentSlot, RawLoreEntry, Item as ItemType, Quest as QuestType, NPCProfile as NPCProfileType, Skill as SkillType, Chapter as ChapterType, GenerateScenarioFromSeriesOutput as IGenerateScenarioFromSeriesOutput, ItemRarity, ActiveEffect as ActiveEffectType, StatModifier as StatModifierType } from '@/types/story';
import { EquipSlotEnumInternal } from '@/types/zod-schemas';
import { lookupLoreTool } from '@/ai/tools/lore-tool';

// --- Schemas for AI communication (Internal, consistent with types/story.ts) ---
const ItemRarityEnumInternal = z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']);

const StatModifierSchemaInternal = z.object({
  stat: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'maxHealth', 'maxMana', 'health', 'mana', 'level', 'experiencePoints', 'currency', 'languageReading', 'languageSpeaking']),
  value: z.number(),
  type: z.enum(['add', 'multiply']),
  description: z.string().optional(),
});

const ActiveEffectSchemaInternal = z.object({
  id: z.string().describe("Unique ID for this specific effect on this item instance, e.g., 'effect_sword_fire_dmg_001'."),
  name: z.string().describe("Descriptive name of the effect, e.g., 'Fiery Aura', 'Eagle Eye'."),
  description: z.string().describe("Narrative description of what the effect does or looks like."),
  type: z.enum(['stat_modifier', 'temporary_ability', 'passive_aura']).describe("Type of effect. For now, prioritize 'stat_modifier' or 'passive_aura' for equippable gear."),
  duration: z.union([z.literal('permanent_while_equipped'), z.number()]).optional().describe("Duration of the effect. 'permanent_while_equipped' for ongoing effects from gear. Number for turns if temporary."),
  statModifiers: z.array(StatModifierSchemaInternal).optional().describe("If type is 'stat_modifier', an array of specific stat changes. Each must include 'stat', 'value' (number), and 'type' ('add' or 'multiply')."),
  sourceItemId: z.string().optional().describe("The ID of the item granting this effect (auto-filled by system if needed)."),
});

const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Make it unique within the current inventory/equipment/rewards."),
  name: z.string().describe("The name of the item."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function."),
  equipSlot: EquipSlotEnumInternal.optional().describe("If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), specify the slot it occupies. Examples: 'weapon', 'head', 'body', 'ring'. If the item is not an equippable type of item (e.g., a potion, a key, a generic diary/book), this field MUST BE OMITTED ENTIRELY."),
  isConsumable: z.boolean().optional().describe("True if the item is consumed on use (e.g., potion, scroll)."),
  effectDescription: z.string().optional().describe("Briefly describes the item's effect when used (e.g., 'Restores health', 'Reveals hidden paths'). Relevant if isConsumable or has a direct use effect. For equippable gear with complex effects, prefer using 'activeEffects'."),
  isQuestItem: z.boolean().optional().describe("True if this item is specifically required for a quest objective."),
  relevantQuestId: z.string().optional().describe("If isQuestItem is true, the ID of the quest this item is for."),
  basePrice: z.number().optional().describe("The base value or estimated worth of the item. Used for trading. Should be a positive number or zero. MUST BE a number if provided."),
  rarity: ItemRarityEnumInternal.optional().describe("The rarity of the item (e.g., 'common', 'uncommon', 'rare'). Most starting items should be 'common' or 'uncommon'."),
  activeEffects: z.array(ActiveEffectSchemaInternal).optional().describe("An array of structured active effects this item provides. For equippable gear, these might include 'stat_modifier' effects. Each effect needs a unique id, name, description, type. If 'stat_modifier', include 'statModifiers' array detailing changes. 'duration' should be 'permanent_while_equipped' for gear stat mods."),
});

const SkillSchemaInternal = z.object({
    id: z.string().describe("A unique identifier for the skill, e.g., 'skill_fireball_001'."),
    name: z.string().describe("The name of the skill or ability."),
    description: z.string().describe("A clear description of what the skill does, its narrative impact, or basic effect."),
    type: z.string().describe("A category for the skill, e.g., 'Combat Ability', 'Utility Skill', 'Passive Trait', or a series-specific type like 'Ninjutsu Technique', 'Semblance'.")
});

const CharacterCoreProfileSchemaInternal = z.object({
  name: z.string().describe('The name of the main character, appropriate for the series. This might be an existing character or an original character fitting the series, based on user input if provided.'),
  class: z.string().describe('The class, role, or archetype of the character within the series (e.g., "Shinobi", "Alchemist", "Keyblade Wielder"), based on user input if provided.'),
  description: z.string().describe('A brief backstory or description of the character, consistent with the series lore and their starting situation. If it is an Original Character (OC), explain their place or origin within the series. For characters who canonically start with language barriers, this description MUST reflect that initial inability to understand written and/or spoken language.'),
  health: z.number().describe('Current health points of the character. MUST BE a number.'),
  maxHealth: z.number().describe('Maximum health points of the character. MUST BE a number.'),
  mana: z.number().optional().describe('Current mana or energy points (e.g., Chakra, Reiatsu, Magic Points). Assign 0 if not applicable, or omit if truly not part of the character concept. MUST BE a number if provided.'),
  maxMana: z.number().optional().describe('Maximum mana or energy points. Assign 0 if not applicable, or omit. MUST BE a number if provided.'),
  strength: z.number().optional().describe('Character\'s physical power. Assign a value between 5 and 15, fitting for the character type, or omit. MUST BE a number if provided.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and knowledge. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  level: z.number().describe('Initialize to 1. MUST BE a number.'),
  experiencePoints: z.number().describe('Initialize to 0. MUST BE a number.'),
  experienceToNextLevel: z.number().describe('Initialize to a starting value, e.g., 100. MUST BE a number, and > 0.'),
  currency: z.number().optional().describe("Character's starting currency (e.g., gold, credits). Initialize to a small amount like 50, or 0. MUST BE a number if provided."),
  languageReading: z.number().optional().describe("Character's understanding of the current primary local WRITTEN language, on a scale of 0 (none) to 100 (fluent). Initialize appropriately for the series/character start (e.g., 0 for characters canonically starting with no understanding of written script, 100 for most others unless specified otherwise by series lore). MUST BE a number if provided."),
  languageSpeaking: z.number().optional().describe("Character's understanding of the current primary local SPOKEN language, on a scale of 0 (none) to 100 (fluent). Initialize appropriately for the series/character start (e.g., 0 for characters canonically starting with no understanding of spoken language, 100 for most others unless specified otherwise by series lore). MUST BE a number if provided."),
});

const CharacterProfileSchemaInternal = CharacterCoreProfileSchemaInternal.extend({
    skillsAndAbilities: z.array(SkillSchemaInternal).optional().describe("A list of 2-3 starting skills, unique abilities, or passive traits appropriate for the character's class and the series. These should be thematically fitting and provide a starting flavor for the character's capabilities. Each skill requires an id, name, description, and type. For characters known for signature, fate-altering abilities (e.g., Subaru's 'Return by Death' in Re:Zero), ensure such an ability is included if appropriate for the specified character name/class and series."),
});

const EquipmentSlotsSchemaInternal = z.object({
  weapon: ItemSchemaInternal.nullable(),
  shield: ItemSchemaInternal.nullable(),
  head: ItemSchemaInternal.nullable(),
  body: ItemSchemaInternal.nullable(),
  legs: ItemSchemaInternal.nullable(),
  feet: ItemSchemaInternal.nullable(),
  hands: ItemSchemaInternal.nullable(),
  neck: ItemSchemaInternal.nullable(),
  ring1: ItemSchemaInternal.nullable(),
  ring2: ItemSchemaInternal.nullable(),
}).describe("Character's equipped items. All 10 slots MUST be present, with an item object (including 'basePrice' (number), optional 'rarity', optional 'activeEffects', and 'equipSlot' if applicable) or 'null'.");

const QuestStatusEnumInternal = z.enum(['active', 'completed', 'failed']);
const QuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("A clear description of this specific objective for the quest."),
  isCompleted: z.boolean().describe("Whether this specific objective is completed (should be false for initial quests).")
});

const QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("Amount of experience points awarded. MUST BE a number if provided."),
  items: z.array(ItemSchemaInternal).optional().describe("An array of item objects awarded. Each item must have unique ID, name, description, basePrice (number), optional rarity, and optional activeEffects."),
  currency: z.number().optional().describe("Amount of currency awarded. MUST BE a number if provided."),
}).describe("Potential rewards to be given upon quest completion. Defined when the quest is created. Omit if the quest has no specific material rewards.");

const QuestSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the quest, e.g., 'quest_series_main_001'. Must be unique across all quests."),
  title: z.string().optional().describe("A short, engaging title for the quest."),
  description: z.string().describe("A clear description of the quest's overall objective, fitting the series."),
  type: z.enum(['main', 'side', 'dynamic', 'chapter_goal']).describe("The type of quest: 'main' for core storyline, 'side' for predefined optional quests, 'dynamic' for AI-generated in-game quests, 'chapter_goal' for overall chapter progression markers."),
  status: QuestStatusEnumInternal.describe("The current status of the quest, typically 'active' for starting quests."),
  chapterId: z.string().optional().describe("If a 'main' quest, the ID of the Chapter it belongs to."),
  orderInChapter: z.number().optional().describe("If a 'main' quest, its suggested sequence within the chapter."),
  category: z.string().optional().describe("An optional category for the quest (e.g., 'Introduction', 'Exploration'). Omit if not clearly classifiable or if not applicable."),
  objectives: z.array(QuestObjectiveSchemaInternal).optional().describe("An optional list of specific sub-objectives for this quest. If the quest is simple, this can be omitted. For initial quests, all objectives should have 'isCompleted: false'."),
  rewards: QuestRewardsSchemaInternal.optional(),
  updatedAt: z.string().optional().describe("Timestamp of the last update to this quest."),
});

const ChapterSchemaInternal = z.object({
    id: z.string().describe("A unique identifier for the chapter, e.g., 'chapter_1_arrival_in_lugunica'. Must be unique."),
    title: z.string().describe("A short, engaging title for the chapter (e.g., 'The Royal Selection Begins')."),
    description: z.string().describe("A brief overview of this story arc or chapter's theme."),
    order: z.number().describe("The sequential order of this chapter in the main storyline (e.g., 1, 2, 3)."),
    mainQuestIds: z.array(z.string()).describe("An array of 'id's for 'main' type Quests belonging to this chapter. For outlined chapters, this MUST be an empty array `[]`."),
    isCompleted: z.boolean().describe("Whether this chapter's objectives/main quests are completed. Initialize to false."),
    unlockCondition: z.string().optional().describe("Narrative condition for unlocking this chapter (e.g., 'Previous chapter completed', 'Character reaches Level 5').")
});

const NPCDialogueEntrySchemaInternal = z.object({
    playerInput: z.string().optional(),
    npcResponse: z.string(),
    turnId: z.string(),
});

const MerchantItemSchemaInternal = ItemSchemaInternal.extend({
  price: z.number().optional().describe("The price this merchant sells the item for. MUST BE a number if provided."),
});

const NPCProfileSchemaInternal = z.object({
    id: z.string().describe("Unique identifier for the NPC, e.g., npc_series_charactername_001."),
    name: z.string(),
    description: z.string(),
    classOrRole: z.string().optional(),
    health: z.number().optional().describe("MUST BE a number if provided."),
    maxHealth: z.number().optional().describe("MUST BE a number if provided."),
    mana: z.number().optional().describe("MUST BE a number if provided."),
    maxMana: z.number().optional().describe("MUST BE a number if provided."),
    firstEncounteredLocation: z.string().optional(),
    firstEncounteredTurnId: z.string().optional().describe("Use 'initial_turn_0' for NPCs known at game start."),
    relationshipStatus: z.number().describe("MUST BE a number."),
    knownFacts: z.array(z.string()),
    dialogueHistory: z.array(NPCDialogueEntrySchemaInternal).optional(),
    lastKnownLocation: z.string().optional(),
    lastSeenTurnId: z.string().optional().describe("Use 'initial_turn_0' for NPCs known at game start."),
    seriesContextNotes: z.string().optional(),
    shortTermGoal: z.string().optional(),
    updatedAt: z.string().optional(),
    isMerchant: z.boolean().optional(),
    merchantInventory: z.array(MerchantItemSchemaInternal).optional().describe("If merchant, list items. Each requires id, name, description, basePrice (number), optional rarity, price (number), and optional 'activeEffects'."),
    buysItemTypes: z.array(z.string()).optional(),
    sellsItemTypes: z.array(z.string()).optional(),
});

const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal,
  currentLocation: z.string(),
  inventory: z.array(ItemSchemaInternal).describe("Unequipped items. Each needs id, name, description, basePrice (number), optional rarity, and optional 'activeEffects' (if any, include statModifiers with numeric values)."),
  equippedItems: EquipmentSlotsSchemaInternal,
  quests: z.array(QuestSchemaInternal).describe("Initial quests. Rewards items should also include optional 'activeEffects' and 'rarity'."),
  chapters: z.array(ChapterSchemaInternal),
  currentChapterId: z.string().optional(),
  worldFacts: z.array(z.string()),
  trackedNPCs: z.array(NPCProfileSchemaInternal).describe("NPCs. Merchant inventory items also need optional 'activeEffects' and 'rarity'."),
  storySummary: z.string().optional(),
});

const GenerateScenarioFromSeriesInputSchema = z.object({
  seriesName: z.string(),
  characterNameInput: z.string().optional(),
  characterClassInput: z.string().optional(),
  usePremiumAI: z.boolean().optional(),
});
export type GenerateScenarioFromSeriesInput = z.infer<typeof GenerateScenarioFromSeriesInputSchema>;

const Scenario_RawLoreEntryZodSchema = z.object({
  keyword: z.string(),
  content: z.string(),
  category: z.string().optional(),
});

const GenerateScenarioFromSeriesOutputSchemaInternal = z.object({
  sceneDescription: z.string(),
  storyState: StructuredStoryStateSchemaInternal,
  initialLoreEntries: z.array(Scenario_RawLoreEntryZodSchema),
  seriesStyleGuide: z.string().optional(),
  seriesPlotSummary: z.string().optional(),
});

const CharacterAndSceneInputSchema = GenerateScenarioFromSeriesInputSchema;
const CharacterAndSceneOutputSchema = z.object({
    sceneDescription: GenerateScenarioFromSeriesOutputSchemaInternal.shape.sceneDescription,
    characterCore: CharacterCoreProfileSchemaInternal,
    currentLocation: StructuredStoryStateSchemaInternal.shape.currentLocation,
});

const InitialCharacterSkillsInputSchema = z.object({
    seriesName: z.string(),
    characterName: z.string(),
    characterClass: z.string(),
    characterDescription: z.string(),
});
const InitialCharacterSkillsOutputSchema = z.object({
    skillsAndAbilities: z.array(SkillSchemaInternal).optional(),
});

const MinimalContextForItemsFactsInputSchema = z.object({
    seriesName: z.string(),
    character: CharacterCoreProfileSchemaInternal.pick({ name: true, class: true, description: true, currency: true, languageReading: true, languageSpeaking: true }),
    sceneDescription: z.string(),
    currentLocation: z.string(),
});
const InitialInventoryOutputSchema = z.object({
    inventory: StructuredStoryStateSchemaInternal.shape.inventory,
});

const InitialMainGearOutputSchema = z.object({
    weapon: ItemSchemaInternal.nullable(),
    shield: ItemSchemaInternal.nullable(),
    body: ItemSchemaInternal.nullable(),
});

const InitialSecondaryGearOutputSchema = z.object({
    head: ItemSchemaInternal.nullable(),
    legs: ItemSchemaInternal.nullable(),
    feet: ItemSchemaInternal.nullable(),
    hands: ItemSchemaInternal.nullable(),
});

const InitialAccessoryGearOutputSchema = z.object({
    neck: ItemSchemaInternal.nullable(),
    ring1: ItemSchemaInternal.nullable(),
    ring2: ItemSchemaInternal.nullable(),
});

const InitialWorldFactsOutputSchema = z.object({
    worldFacts: StructuredStoryStateSchemaInternal.shape.worldFacts,
});

const SeriesPlotSummaryInputSchema = z.object({
    seriesName: z.string(),
    characterNameInput: z.string().optional(),
});
const SeriesPlotSummaryOutputSchema = z.object({
    plotSummary: z.string(),
});

const InitialQuestsAndChaptersInputSchema = z.object({
    seriesName: z.string(),
    character: CharacterProfileSchemaInternal,
    sceneDescription: z.string(),
    currentLocation: z.string(),
    characterNameInput: z.string().optional(),
    seriesPlotSummary: z.string(),
});
const InitialQuestsAndChaptersOutputSchema = z.object({
    quests: StructuredStoryStateSchemaInternal.shape.quests,
    chapters: StructuredStoryStateSchemaInternal.shape.chapters,
});

const InitialTrackedNPCsInputSchema = z.object({
    seriesName: z.string(),
    character: CharacterProfileSchemaInternal,
    sceneDescription: z.string(),
    currentLocation: z.string(),
    characterNameInput: z.string().optional(),
});
const InitialTrackedNPCsOutputSchema = z.object({
    trackedNPCs: StructuredStoryStateSchemaInternal.shape.trackedNPCs,
});

const LoreGenerationInputSchema = z.object({
  seriesName: z.string(),
  characterName: z.string(),
  characterClass: z.string(),
  sceneDescription: z.string(),
  characterDescription: z.string(),
});

const CategorizedLoreOutputSchema = z.object({
    loreEntries: z.array(Scenario_RawLoreEntryZodSchema),
});

const StyleGuideInputSchema = z.object({
  seriesName: z.string(),
});

export async function generateScenarioFromSeries(input: GenerateScenarioFromSeriesInput): Promise<IGenerateScenarioFromSeriesOutput> {
  return generateScenarioFromSeriesFlow(input);
}

const generateScenarioFromSeriesFlow = ai.defineFlow(
  {
    name: 'generateScenarioFromSeriesFlow',
    inputSchema: GenerateScenarioFromSeriesInputSchema,
    outputSchema: GenerateScenarioFromSeriesOutputSchemaInternal,
  },
  async (mainInput: GenerateScenarioFromSeriesInput): Promise<IGenerateScenarioFromSeriesOutput> => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] generateScenarioFromSeriesFlow: START for Series: ${mainInput.seriesName}, Character: ${mainInput.characterNameInput || 'AI Decides'}, Premium: ${mainInput.usePremiumAI}`);

    const modelName = mainInput.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    console.log(`[${new Date().toISOString()}] generateScenarioFromSeriesFlow: Using model: ${modelName}`);
    const modelConfig = { maxOutputTokens: 8000 };

    let step1StartTime = Date.now();
    console.log(`[${new Date(step1StartTime).toISOString()}] generateScenarioFromSeriesFlow: STEP 1 - Starting Initial Parallel Batch (Character/Scene, Style Guide, Plot Summary).`);

    const characterAndScenePrompt = ai.definePrompt({
        name: 'characterAndScenePrompt', model: modelName, input: { schema: CharacterAndSceneInputSchema }, output: { schema: CharacterAndSceneOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to the 'CharacterAndSceneOutputSchema'.
You are a master storyteller for "{{seriesName}}".
User character: Name: {{#if characterNameInput}}{{characterNameInput}}{{else}}(Not provided){{/if}}, Class: {{#if characterClassInput}}{{characterClassInput}}{{else}}(Not provided){{/if}}.
Generate 'sceneDescription', 'characterCore', 'currentLocation'.
'characterCore': Authentically create profile. Include name, class, description. Health/MaxHealth (numbers). Mana/MaxMana (numbers, 0 if not applicable). Stats (5-15, numbers). Level 1, 0 XP, XPToNextLevel (numbers, >0). Currency (number).
'languageReading' & 'languageSpeaking' (numbers, 0-100): Set to 0 for canonical language barriers, else 100 or series-appropriate. Description MUST reflect language barriers if skills are 0.
'currentLocation': Specific series starting location.
Output ONLY the JSON. Strictly adhere to CharacterAndSceneOutputSchema.`,
    });
    const styleGuidePrompt = ai.definePrompt({
        name: 'generateSeriesStyleGuidePrompt', model: modelName, input: { schema: StyleGuideInputSchema }, output: { schema: z.string().nullable() }, config: modelConfig,
        prompt: `For "{{seriesName}}", provide a 2-3 sentence summary of key themes/tone. If unable, output an empty string (""). Output ONLY the summary string or empty string.`,
    });
    const seriesPlotSummaryPrompt = ai.definePrompt({
        name: 'generateSeriesPlotSummaryPrompt', model: modelName, input: { schema: SeriesPlotSummaryInputSchema }, output: { schema: SeriesPlotSummaryOutputSchema }, config: modelConfig,
        prompt: `For "{{seriesName}}"{{#if characterNameInput}} (character: "{{characterNameInput}}"){{/if}}, provide 'plotSummary': Concise summary of early major plot points/arcs relevant to the character. 5-7 bullet points or short paragraph. Output ONLY JSON for SeriesPlotSummaryOutputSchema.`,
    });

    let charSceneResult, styleGuideResult, seriesPlotSummaryResult;
    try {
        [charSceneResult, styleGuideResult, seriesPlotSummaryResult] = await Promise.all([
            characterAndScenePrompt({ seriesName: mainInput.seriesName, characterNameInput: mainInput.characterNameInput, characterClassInput: mainInput.characterClassInput, usePremiumAI: mainInput.usePremiumAI }),
            styleGuidePrompt({ seriesName: mainInput.seriesName }),
            seriesPlotSummaryPrompt({ seriesName: mainInput.seriesName, characterNameInput: mainInput.characterNameInput })
        ]);
    } catch (e: any) {
        console.error(`[${new Date().toISOString()}] generateScenarioFromSeriesFlow: STEP 1 FAILED. Error: ${e.message}`);
        throw new Error(`AI failed during initial scenario setup (Step 1). Details: ${e.message}`);
    }
    console.log(`[${new Date().toISOString()}] generateScenarioFromSeriesFlow: STEP 1 - Initial Parallel Batch completed in ${Date.now() - step1StartTime}ms.`);

    const charSceneOutput = charSceneResult.output;
    const styleGuideRaw = styleGuideResult.output;
    const generatedSeriesPlotSummary = seriesPlotSummaryResult.output?.plotSummary || `No specific plot summary was generated by the AI for ${mainInput.seriesName}. The story will be more emergent.`;

    if (!charSceneOutput || !charSceneOutput.sceneDescription || !charSceneOutput.characterCore || !charSceneOutput.currentLocation) {
      console.error("Character/Scene generation failed or returned invalid structure:", charSceneOutput);
      throw new Error('Failed to generate character core, scene, or location.');
    }
    let { characterCore, sceneDescription, currentLocation } = charSceneOutput;
    characterCore.mana = characterCore.mana ?? 0;
    characterCore.maxMana = characterCore.maxMana ?? 0;
    characterCore.currency = characterCore.currency ?? 0;
    characterCore.languageReading = characterCore.languageReading ?? 100;
    characterCore.languageSpeaking = characterCore.languageSpeaking ?? 100;

    let step2StartTime = Date.now();
    console.log(`[${new Date(step2StartTime).toISOString()}] generateScenarioFromSeriesFlow: STEP 2 - Calling initialCharacterSkillsPrompt.`);
    const initialCharacterSkillsPrompt = ai.definePrompt({
        name: 'initialCharacterSkillsPrompt', model: modelName, input: { schema: InitialCharacterSkillsInputSchema }, output: { schema: InitialCharacterSkillsOutputSchema }, config: modelConfig,
        prompt: `For "{{seriesName}}" character: Name: {{characterName}}, Class: {{characterClass}}, Desc: {{characterDescription}}.
Generate ONLY 'skillsAndAbilities': Array of 2-3 starting skills (unique 'id', 'name', 'description', 'type'). Include signature abilities if appropriate (e.g., "Return by Death" for Re:Zero Subaru).
Output ONLY { "skillsAndAbilities": [...] } or { "skillsAndAbilities": [] }.`,
    });
    const skillsInput: z.infer<typeof InitialCharacterSkillsInputSchema> = {
        seriesName: mainInput.seriesName,
        characterName: characterCore.name,
        characterClass: characterCore.class,
        characterDescription: characterCore.description,
    };
    let skillsOutput;
    try {
        const { output } = await initialCharacterSkillsPrompt(skillsInput);
        skillsOutput = output;
    } catch (e:any) {
        console.error(`[${new Date().toISOString()}] generateScenarioFromSeriesFlow: STEP 2 FAILED (Skills Generation). Error: ${e.message}`);
        throw new Error(`AI failed during skills generation (Step 2). Details: ${e.message}`);
    }
    console.log(`[${new Date().toISOString()}] generateScenarioFromSeriesFlow: STEP 2 - initialCharacterSkillsPrompt completed in ${Date.now() - step2StartTime}ms.`);
    const characterSkills = skillsOutput?.skillsAndAbilities || [];
    const fullCharacterProfile: z.infer<typeof CharacterProfileSchemaInternal> = {
        ...characterCore,
        skillsAndAbilities: characterSkills,
    };

    let step3StartTime = Date.now();
    console.log(`[${new Date(step3StartTime).toISOString()}] generateScenarioFromSeriesFlow: STEP 3 - Starting Main Parallel Batch for Series Items, Facts, Quests, NPCs, and Lore.`);

    const minimalContextForItemsFactsInput: z.infer<typeof MinimalContextForItemsFactsInputSchema> = {
        seriesName: mainInput.seriesName,
        character: { name: fullCharacterProfile.name, class: fullCharacterProfile.class, description: fullCharacterProfile.description, currency: fullCharacterProfile.currency, languageReading: fullCharacterProfile.languageReading, languageSpeaking: fullCharacterProfile.languageSpeaking },
        sceneDescription: sceneDescription,
        currentLocation: currentLocation,
    };
    const questsAndChaptersInput: z.infer<typeof InitialQuestsAndChaptersInputSchema> = {
        seriesName: mainInput.seriesName,
        character: fullCharacterProfile,
        sceneDescription: sceneDescription,
        currentLocation: currentLocation,
        characterNameInput: mainInput.characterNameInput,
        seriesPlotSummary: generatedSeriesPlotSummary,
    };
    const npcsInput: z.infer<typeof InitialTrackedNPCsInputSchema> = {
        seriesName: mainInput.seriesName, character: fullCharacterProfile, sceneDescription: sceneDescription, currentLocation: currentLocation, characterNameInput: mainInput.characterNameInput,
    };
    const loreGenerationBaseInput: z.infer<typeof LoreGenerationInputSchema> = {
      seriesName: mainInput.seriesName, characterName: fullCharacterProfile.name, characterClass: fullCharacterProfile.class, sceneDescription: sceneDescription, characterDescription: fullCharacterProfile.description,
    };

    const initialInventoryPrompt = ai.definePrompt({
        name: 'initialInventoryPrompt', model: modelName, input: { schema: MinimalContextForItemsFactsInputSchema }, output: { schema: InitialInventoryOutputSchema }, config: modelConfig,
        prompt: `For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'inventory': 0-3 unequipped items. Each: 'id', 'name', 'description', 'basePrice' (number), optional 'rarity', optional 'activeEffects'. If 'activeEffects' of type 'stat_modifier', include 'statModifiers' (array of {stat, value(number), type('add')}). 'equipSlot' if equippable, OMITTED otherwise.
Output ONLY { "inventory": [...] }.`,
    });
    const initialMainGearPrompt = ai.definePrompt({
        name: 'initialMainGearPrompt', model: modelName, input: { schema: MinimalContextForItemsFactsInputSchema }, output: { schema: InitialMainGearOutputSchema }, config: modelConfig,
        prompt: `For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'weapon', 'shield', 'body' equipped items (or null). Each item: 'id', 'name', 'description', 'basePrice' (number), optional 'rarity', 'equipSlot', optional 'activeEffects'. If 'activeEffects' of type 'stat_modifier', include 'statModifiers' (array of {stat, value(number), type('add')}).
Output ONLY { "weapon": ..., "shield": ..., "body": ... }.`,
    });
    const initialSecondaryGearPrompt = ai.definePrompt({
        name: 'initialSecondaryGearPrompt', model: modelName, input: { schema: MinimalContextForItemsFactsInputSchema }, output: { schema: InitialSecondaryGearOutputSchema }, config: modelConfig,
        prompt: `For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'head', 'legs', 'feet', 'hands' equipped items (or null). Each item: 'id', 'name', 'description', 'basePrice' (number), optional 'rarity', 'equipSlot', optional 'activeEffects'. If 'activeEffects' of type 'stat_modifier', include 'statModifiers' (array of {stat, value(number), type('add')}).
Output ONLY { "head": ..., "legs": ..., "feet": ..., "hands": ... }.`,
    });
    const initialAccessoryGearPrompt = ai.definePrompt({
        name: 'initialAccessoryGearPrompt', model: modelName, input: { schema: MinimalContextForItemsFactsInputSchema }, output: { schema: InitialAccessoryGearOutputSchema }, config: modelConfig,
        prompt: `For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'neck', 'ring1', 'ring2' equipped items (or null). Each item: 'id', 'name', 'description', 'basePrice' (number), optional 'rarity', 'equipSlot', optional 'activeEffects'. If 'activeEffects' of type 'stat_modifier', include 'statModifiers' (array of {stat, value(number), type('add')}).
Output ONLY { "neck": ..., "ring1": ..., "ring2": ... }.`,
    });
    const initialWorldFactsPrompt = ai.definePrompt({
        name: 'initialWorldFactsPrompt', model: modelName, input: { schema: MinimalContextForItemsFactsInputSchema }, output: { schema: InitialWorldFactsOutputSchema }, config: modelConfig,
        prompt: `For "{{seriesName}}" (Char: {{character.name}} - Reading: {{character.languageReading}}/100, Speaking: {{character.languageSpeaking}}/100, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'worldFacts': 3-5 key facts. If languageReading is low, fact MUST state "Character {{character.name}} cannot read local script...". If languageSpeaking is low, fact MUST state "Character {{character.name}} cannot understand/speak local language...".
Output ONLY { "worldFacts": [...] }.`,
    });
    const initialQuestsAndChaptersPrompt = ai.definePrompt({
        name: 'initialQuestsAndChaptersPrompt', model: modelName, input: { schema: InitialQuestsAndChaptersInputSchema }, output: { schema: InitialQuestsAndChaptersOutputSchema }, config: modelConfig,
        tools: [lookupLoreTool],
        prompt: `For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Plot: {{{seriesPlotSummary}}}).
Generate 'chapters' & 'quests'.
'chapters': 2-3 initial Chapters. First chapter: full details, 'mainQuestIds' list IDs of its quests. Subsequent chapters: OUTLINES (id, title, desc, order, EMPTY mainQuestIds: []).
'quests': 2-3 'main' quests ONLY for the FIRST chapter, based on 'seriesPlotSummary'. Each: 'id', 'title' (optional), 'description', 'type: "main"', 'status: "active"', 'chapterId' (first chapter's ID), 'orderInChapter'. Include 'rewards' (XP (number), currency (number), items (each with id, name, desc, basePrice (number), optional rarity, optional activeEffects with statModifiers)). Include 1-2 'objectives' ('isCompleted: false'). Use 'lookupLoreTool' for accuracy.
Output ONLY JSON { "quests": [...], "chapters": [...] }. Ensure 'activeEffects' are structured correctly if included.`,
    });
    const initialTrackedNPCsPrompt = ai.definePrompt({
        name: 'initialTrackedNPCsPrompt', model: modelName, input: { schema: InitialTrackedNPCsInputSchema }, output: { schema: InitialTrackedNPCsOutputSchema }, config: modelConfig,
        prompt: `For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'trackedNPCs':
- NPCs IN SCENE: Must include. 'id', 'name', 'desc', 'relationshipStatus' (number). 'firstEncounteredLocation'/'lastKnownLocation' = '{{currentLocation}}'.
- PRE-POPULATED MAJOR NPCs (NOT in scene): 2-4 crucial early-series NPCs. 'id', 'name', 'desc', 'relationshipStatus' (number). Their canonical locations for 'firstEncounteredLocation'/'lastKnownLocation'.
- ALL NPCs: 'firstEncounteredTurnId'/'lastSeenTurnId' = "initial_turn_0". Optional 'classOrRole', 'health' (number), 'maxHealth' (number), 'mana' (number), 'maxMana' (number). If merchant: 'isMerchant: true', 'merchantInventory' (items with id, name, desc, basePrice (number), price (number), optional rarity, optional activeEffects with statModifiers), 'buysItemTypes', 'sellsItemTypes'.
Output ONLY { "trackedNPCs": [...] }. Ensure 'activeEffects' are structured correctly.`,
    });

    const characterLorePrompt = ai.definePrompt({
        name: 'characterLorePrompt', model: modelName, input: { schema: LoreGenerationInputSchema }, output: { schema: CategorizedLoreOutputSchema }, config: modelConfig,
        prompt: `You are a lore master for "{{seriesName}}". Context: Character "{{characterName}}" ({{characterClass}}). Scene: {{sceneDescription}}. Character Background: {{characterDescription}}.
Generate 20-25 key lore entries for MAJOR CHARACTERS relevant to early-to-mid game. Each: 'keyword' (name), 'content' (2-3 sentences), 'category': "Character".
Output ONLY { "loreEntries": [{"keyword": "...", "content": "...", "category":"Character"}, ...] }.`,
    });
    const locationLorePrompt = ai.definePrompt({
        name: 'locationLorePrompt', model: modelName, input: { schema: LoreGenerationInputSchema }, output: { schema: CategorizedLoreOutputSchema }, config: modelConfig,
        prompt: `You are a lore master for "{{seriesName}}". Context: Character "{{characterName}}" ({{characterClass}}). Scene: {{sceneDescription}}. Character Background: {{characterDescription}}.
Generate 20-25 key lore entries for MAJOR LOCATIONS/REGIONS relevant to early-to-mid game. Each: 'keyword' (name), 'content' (2-3 sentences), 'category': "Location".
Output ONLY { "loreEntries": [{"keyword": "...", "content": "...", "category":"Location"}, ...] }.`,
    });
    const factionLorePrompt = ai.definePrompt({
        name: 'factionLorePrompt', model: modelName, input: { schema: LoreGenerationInputSchema }, output: { schema: CategorizedLoreOutputSchema }, config: modelConfig,
        prompt: `You are a lore master for "{{seriesName}}". Context: Character "{{characterName}}" ({{characterClass}}). Scene: {{sceneDescription}}. Character Background: {{characterDescription}}.
Generate 15-20 key lore entries for IMPORTANT FACTIONS/ORGANIZATIONS relevant to early-to-mid game. Each: 'keyword' (name), 'content' (2-3 sentences), 'category': "Faction/Organization".
Output ONLY { "loreEntries": [{"keyword": "...", "content": "...", "category":"Faction/Organization"}, ...] }.`,
    });
    const itemConceptLorePrompt = ai.definePrompt({
        name: 'itemConceptLorePrompt', model: modelName, input: { schema: LoreGenerationInputSchema }, output: { schema: CategorizedLoreOutputSchema }, config: modelConfig,
        prompt: `You are a lore master for "{{seriesName}}". Context: Character "{{characterName}}" ({{characterClass}}). Scene: {{sceneDescription}}. Character Background: {{characterDescription}}.
Generate 15-20 key lore entries for SIGNIFICANT ITEMS, ARTIFACTS, CORE CONCEPTS, or UNIQUE TECHNOLOGIES relevant to early-to-mid game. Each: 'keyword', 'content' (2-3 sentences), 'category': "Item/Concept" or "Technology".
Output ONLY { "loreEntries": [{"keyword": "...", "content": "...", "category":"Item/Concept"}, ...] }.`,
    });
    const eventHistoryLorePrompt = ai.definePrompt({
        name: 'eventHistoryLorePrompt', model: modelName, input: { schema: LoreGenerationInputSchema }, output: { schema: CategorizedLoreOutputSchema }, config: modelConfig,
        prompt: `You are a lore master for "{{seriesName}}". Context: Character "{{characterName}}" ({{characterClass}}). Scene: {{sceneDescription}}. Character Background: {{characterDescription}}.
Generate 15-20 key lore entries for KEY HISTORICAL EVENTS or BACKGROUND ELEMENTS relevant to early-to-mid game. Each: 'keyword', 'content' (2-3 sentences), 'category': "Event/History".
Output ONLY { "loreEntries": [{"keyword": "...", "content": "...", "category":"Event/History"}, ...] }.`,
    });

    const mainBatchPromises = [
        initialInventoryPrompt(minimalContextForItemsFactsInput),
        initialMainGearPrompt(minimalContextForItemsFactsInput),
        initialSecondaryGearPrompt(minimalContextForItemsFactsInput),
        initialAccessoryGearPrompt(minimalContextForItemsFactsInput),
        initialWorldFactsPrompt(minimalContextForItemsFactsInput),
        initialQuestsAndChaptersPrompt(questsAndChaptersInput),
        initialTrackedNPCsPrompt(npcsInput),
        characterLorePrompt(loreGenerationBaseInput),
        locationLorePrompt(loreGenerationBaseInput),
        factionLorePrompt(loreGenerationBaseInput),
        itemConceptLorePrompt(loreGenerationBaseInput),
        eventHistoryLorePrompt(loreGenerationBaseInput),
    ];

    console.log(`[${new Date().toISOString()}] generateScenarioFromSeriesFlow: STEP 3 - Firing ${mainBatchPromises.length} parallel AI calls for main batch.`);
    
    let mainBatchResults;
    try {
      mainBatchResults = await Promise.all(mainBatchPromises.map(async (promise, index) => {
          const callStartTime = Date.now();
          const promptName = ['inventory', 'mainGear', 'secondaryGear', 'accessoryGear', 'worldFacts', 'questsChapters', 'npcs', 'characterLore', 'locationLore', 'factionLore', 'itemConceptLore', 'eventHistoryLore'][index];
          console.log(`[${new Date(callStartTime).toISOString()}] generateScenarioFromSeriesFlow: STEP 3 - Calling ${promptName}Prompt.`);
          const result = await promise;
          console.log(`[${new Date().toISOString()}] generateScenarioFromSeriesFlow: STEP 3 - ${promptName}Prompt call completed in ${Date.now() - callStartTime}ms.`);
          return result.output;
      }));
    } catch (e: any) {
        console.error(`[${new Date().toISOString()}] generateScenarioFromSeriesFlow: STEP 3 FAILED (Main Batch). Error: ${e.message}`);
        throw new Error(`AI failed during main scenario content generation (Step 3). Details: ${e.message}`);
    }
    
    console.log(`[${new Date().toISOString()}] generateScenarioFromSeriesFlow: STEP 3 - Main Parallel Batch completed in ${Date.now() - step3StartTime}ms.`);

    const [
        inventoryOutput,
        mainGearRaw,
        secondaryGearRaw,
        accessoryGearRaw,
        worldFactsOutput,
        questsAndChaptersOutput,
        npcsOutput,
        characterLoreResult,
        locationLoreResult,
        factionLoreResult,
        itemConceptLoreResult,
        eventHistoryLoreResult,
    ] = mainBatchResults as [
        z.infer<typeof InitialInventoryOutputSchema>,
        z.infer<typeof InitialMainGearOutputSchema>,
        z.infer<typeof InitialSecondaryGearOutputSchema>,
        z.infer<typeof InitialAccessoryGearOutputSchema>,
        z.infer<typeof InitialWorldFactsOutputSchema>,
        z.infer<typeof InitialQuestsAndChaptersOutputSchema>,
        z.infer<typeof InitialTrackedNPCsOutputSchema>,
        z.infer<typeof CategorizedLoreOutputSchema>,
        z.infer<typeof CategorizedLoreOutputSchema>,
        z.infer<typeof CategorizedLoreOutputSchema>,
        z.infer<typeof CategorizedLoreOutputSchema>,
        z.infer<typeof CategorizedLoreOutputSchema>
    ];

    if (!inventoryOutput || !inventoryOutput.inventory) { throw new Error('Failed to generate initial inventory.'); }
    const inventory = inventoryOutput.inventory;
    const mainGearOutput = mainGearRaw || { weapon: null, shield: null, body: null };
    const secondaryGearOutput = secondaryGearRaw || { head: null, legs: null, feet: null, hands: null };
    const accessoryGearOutput = accessoryGearRaw || { neck: null, ring1: null, ring2: null };
    if (!worldFactsOutput || !worldFactsOutput.worldFacts) { throw new Error('Failed to generate initial world facts.'); }
    const worldFacts = worldFactsOutput.worldFacts;

    if (!questsAndChaptersOutput || !questsAndChaptersOutput.quests || !questsAndChaptersOutput.chapters) { throw new Error('Failed to generate initial quests and chapters.'); }
    const quests = questsAndChaptersOutput.quests;
    const chapters = questsAndChaptersOutput.chapters;

    if (!npcsOutput || !npcsOutput.trackedNPCs) { throw new Error('Failed to generate initial tracked NPCs.'); }
    const trackedNPCs = npcsOutput.trackedNPCs;
    
    const allLoreEntries: RawLoreEntry[] = [
        ...(characterLoreResult?.loreEntries || []),
        ...(locationLoreResult?.loreEntries || []),
        ...(factionLoreResult?.loreEntries || []),
        ...(itemConceptLoreResult?.loreEntries || []),
        ...(eventHistoryLoreResult?.loreEntries || []),
    ];
    console.log(`[${new Date().toISOString()}] generateScenarioFromSeriesFlow: Generated a total of ${allLoreEntries.length} raw lore entries from parallel calls.`);

    const equippedItemsIntermediate: Partial<Record<EquipmentSlot, ItemType | null>> = {
        weapon: mainGearOutput.weapon ?? null, shield: mainGearOutput.shield ?? null, body: mainGearOutput.body ?? null,
        head: secondaryGearOutput.head ?? null, legs: secondaryGearOutput.legs ?? null, feet: secondaryGearOutput.feet ?? null, hands: secondaryGearOutput.hands ?? null,
        neck: accessoryGearOutput.neck ?? null, ring1: accessoryGearOutput.ring1 ?? null, ring2: accessoryGearOutput.ring2 ?? null,
    };
    const seriesStyleGuide = styleGuideRaw === null ? undefined : styleGuideRaw;

    const firstChapter = chapters.find(c => c.order === 1);
    const storyState: z.infer<typeof StructuredStoryStateSchemaInternal> = {
        character: fullCharacterProfile,
        currentLocation: currentLocation,
        inventory: inventory,
        equippedItems: equippedItemsIntermediate as Required<typeof equippedItemsIntermediate>,
        quests: quests,
        chapters: chapters,
        currentChapterId: firstChapter?.id,
        worldFacts: worldFacts,
        trackedNPCs: trackedNPCs,
        storySummary: `The adventure begins for ${fullCharacterProfile.name} in ${mainInput.seriesName}, at ${currentLocation}. Chapter 1: ${firstChapter?.title || 'The Beginning'}. Initial scene: ${sceneDescription.substring(0,100)}...`,
    };

    let finalOutput: IGenerateScenarioFromSeriesOutput = {
      sceneDescription: sceneDescription, storyState: storyState, initialLoreEntries: allLoreEntries, seriesStyleGuide: seriesStyleGuide, seriesPlotSummary: generatedSeriesPlotSummary
    };

    // --- Final Sanitation Pass ---
    console.log(`[${new Date().toISOString()}] generateScenarioFromSeriesFlow: Performing final data sanitation.`);
    const sanitizeItem = (item: Partial<ItemType>, prefix: string, index: number | string = '') => {
        if (!item.id || item.id.trim() === "") item.id = `${prefix}_${Date.now()}_${index}_${Math.random().toString(36).substring(2,7)}`;
        item.name = item.name || "Unnamed Item";
        item.description = item.description || "No description.";
        item.basePrice = item.basePrice ?? 0;
        if (item.basePrice < 0) item.basePrice = 0;
        if (item.rarity === undefined) delete item.rarity;
        item.activeEffects = item.activeEffects ?? [];
        item.activeEffects.forEach((effect, effIdx) => {
            if(!effect.id) effect.id = `eff_${item.id}_${effIdx}`;
            effect.name = effect.name || "Unnamed Effect";
            effect.description = effect.description || "No effect description.";
            effect.type = effect.type || 'passive_aura';
            effect.statModifiers = effect.statModifiers ?? [];
            effect.statModifiers.forEach(mod => {
                mod.value = mod.value ?? 0;
                mod.type = mod.type || 'add';
            });
            if (effect.statModifiers.length === 0) delete effect.statModifiers;
        });
        if (item.activeEffects.length === 0) delete item.activeEffects;
        return item as ItemType;
    };
    
    finalOutput.storyState.inventory.forEach((item, index) => sanitizeItem(item, `item_inv_series`, index));
    Object.keys(finalOutput.storyState.equippedItems).forEach(slot => {
        const item = finalOutput.storyState.equippedItems[slot as EquipmentSlot];
        if (item) sanitizeItem(item, `item_eqp_series`, slot);
    });
    finalOutput.storyState.quests.forEach(quest => {
        if (quest.rewards?.items) {
            quest.rewards.items.forEach((item, index) => sanitizeItem(item, `item_reward_series_${quest.id}`, index));
        }
    });
    finalOutput.storyState.trackedNPCs.forEach(npc => {
        if (npc.merchantInventory) {
            npc.merchantInventory.forEach((item, index) => {
                const merchantItem = sanitizeItem(item, `item_merch_series_${npc.id}`, index);
                (merchantItem as any).price = (merchantItem as any).price ?? merchantItem.basePrice;
                if ((merchantItem as any).price < 0) (merchantItem as any).price = 0;
            });
        }
    });


    console.log(`[${new Date().toISOString()}] generateScenarioFromSeriesFlow: END. Total time: ${Date.now() - flowStartTime}ms`);
    return finalOutput;
  }
);
