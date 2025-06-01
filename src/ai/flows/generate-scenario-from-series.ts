
'use server';

/**
 * @fileOverview This file contains Genkit flows for generating:
 * 1. Scenario Foundation: Character, scene, core world details, initial items, plot summary, style guide. (generateScenarioFoundation)
 * 2. Scenario Narrative Elements: Quests, chapters, NPCs, and lore entries. (generateScenarioNarrativeElements)
 * It exports two main functions.
 */

import { ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME } from '@/ai/genkit';
import { z } from 'zod';
import type { EquipmentSlot, Item as ItemType, CharacterProfile as CharacterProfileType, Skill as SkillType, ItemRarity, ActiveEffect as ActiveEffectType, StatModifier as StatModifierType, Quest as QuestType, NPCProfile as NPCProfileType, Chapter as ChapterType, RawLoreEntry } from '@/types/story';
import { EquipSlotEnumInternal } from '@/types/zod-schemas';
import { lookupLoreTool } from '@/ai/tools/lore-tool';


// --- SCHEMAS FOR FOUNDATION FLOW ---

const Foundation_ItemRarityEnumInternal = z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']);

const Foundation_StatModifierSchemaInternal = z.object({
  stat: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'maxHealth', 'maxMana', 'health', 'mana', 'level', 'experiencePoints', 'currency', 'languageReading', 'languageSpeaking']),
  value: z.number(),
  type: z.enum(['add', 'multiply']),
  description: z.string().optional(),
});

const Foundation_ActiveEffectSchemaInternal = z.object({
  id: z.string().describe("REQUIRED."),
  name: z.string().describe("REQUIRED."),
  description: z.string().describe("REQUIRED."),
  type: z.enum(['stat_modifier', 'temporary_ability', 'passive_aura']).describe("REQUIRED."),
  duration: z.union([z.string().describe("Use 'permanent_while_equipped' for ongoing effects from gear."), z.number()]).optional().describe("Duration of the effect. Use 'permanent_while_equipped' for ongoing effects from gear. Use a number (representing turns) for temporary effects."),
  statModifiers: z.array(Foundation_StatModifierSchemaInternal).optional(),
  sourceItemId: z.string().optional(),
});

const Foundation_ItemSchemaInternal = z.object({
  id: z.string().describe("REQUIRED."),
  name: z.string().describe("REQUIRED."),
  description: z.string().describe("REQUIRED."),
  equipSlot: EquipSlotEnumInternal.optional(),
  isConsumable: z.boolean().optional(),
  effectDescription: z.string().optional(),
  isQuestItem: z.boolean().optional(),
  relevantQuestId: z.string().optional(),
  basePrice: z.number().optional(),
  rarity: Foundation_ItemRarityEnumInternal.optional(),
  activeEffects: z.array(Foundation_ActiveEffectSchemaInternal).optional(),
});

const Foundation_SkillSchemaInternal = z.object({
    id: z.string().describe("REQUIRED."),
    name: z.string().describe("REQUIRED."),
    description: z.string().describe("REQUIRED."),
    type: z.string().describe("REQUIRED.")
});

const Foundation_CharacterCoreProfileSchemaInternal = z.object({
  name: z.string().describe("REQUIRED."),
  class: z.string().describe("REQUIRED."),
  description: z.string().describe("REQUIRED."),
  health: z.number().describe("REQUIRED. Number."),
  maxHealth: z.number().describe("REQUIRED. Number."),
  mana: z.number().optional().describe("Number if provided."),
  maxMana: z.number().optional().describe("Number if provided."),
  strength: z.number().optional().describe("Number if provided."),
  dexterity: z.number().optional().describe("Number if provided."),
  constitution: z.number().optional().describe("Number if provided."),
  intelligence: z.number().optional().describe("Number if provided."),
  wisdom: z.number().optional().describe("Number if provided."),
  charisma: z.number().optional().describe("Number if provided."),
  level: z.number().describe("REQUIRED. Number."),
  experiencePoints: z.number().describe("REQUIRED. Number."),
  experienceToNextLevel: z.number().describe("REQUIRED. Number (>0)."),
  currency: z.number().optional().describe("Number if provided."),
  languageReading: z.number().optional().describe("Number (0-100) if provided."),
  languageSpeaking: z.number().optional().describe("Number (0-100) if provided."),
});

const Foundation_CharacterProfileSchemaInternal = Foundation_CharacterCoreProfileSchemaInternal.extend({
    skillsAndAbilities: z.array(Foundation_SkillSchemaInternal).optional(),
});

const Foundation_EquipmentSlotsSchemaInternal = z.object({
  weapon: Foundation_ItemSchemaInternal.nullable(),
  shield: Foundation_ItemSchemaInternal.nullable(),
  head: Foundation_ItemSchemaInternal.nullable(),
  body: Foundation_ItemSchemaInternal.nullable(),
  legs: Foundation_ItemSchemaInternal.nullable(),
  feet: Foundation_ItemSchemaInternal.nullable(),
  hands: Foundation_ItemSchemaInternal.nullable(),
  neck: Foundation_ItemSchemaInternal.nullable(),
  ring1: Foundation_ItemSchemaInternal.nullable(),
  ring2: Foundation_ItemSchemaInternal.nullable(),
}).describe("All 10 slots MUST be present, with an item object or null. Items must have id, name, description. REQUIRED.");


const GenerateScenarioFoundationInputSchema = z.object({
  seriesName: z.string(),
  characterNameInput: z.string().optional(),
  characterClassInput: z.string().optional(),
  usePremiumAI: z.boolean().optional(),
});
export type GenerateScenarioFoundationInput = z.infer<typeof GenerateScenarioFoundationInputSchema>;

const GenerateScenarioFoundationOutputSchema = z.object({
  sceneDescription: z.string().describe("REQUIRED."),
  characterProfile: Foundation_CharacterProfileSchemaInternal.describe("REQUIRED. Ensure all nested required fields (name, class, health, etc.) are present."),
  currentLocation: z.string().describe("REQUIRED."),
  inventory: z.array(Foundation_ItemSchemaInternal).describe("REQUIRED (can be empty array). Each item needs id, name, description."),
  equippedItems: Foundation_EquipmentSlotsSchemaInternal.describe("REQUIRED. All 10 slots specified."),
  worldFacts: z.array(z.string()).describe("REQUIRED (can be empty array)."),
  seriesStyleGuide: z.string().optional(),
  seriesPlotSummary: z.string().describe("REQUIRED."),
});
export type GenerateScenarioFoundationOutput = z.infer<typeof GenerateScenarioFoundationOutputSchema>;


// Schemas for internal AI calls within Foundation Flow
const Foundation_CharacterAndSceneInputSchema = GenerateScenarioFoundationInputSchema; // Re-use
const Foundation_CharacterAndSceneOutputSchema = z.object({
    sceneDescription: GenerateScenarioFoundationOutputSchema.shape.sceneDescription.describe("REQUIRED."),
    characterCore: Foundation_CharacterCoreProfileSchemaInternal.describe("REQUIRED. All nested required fields MUST be present."),
    currentLocation: GenerateScenarioFoundationOutputSchema.shape.currentLocation.describe("REQUIRED."),
});

const Foundation_InitialCharacterSkillsInputSchema = z.object({
    seriesName: z.string(),
    characterName: z.string(),
    characterClass: z.string(),
    characterDescription: z.string(),
});
const Foundation_InitialCharacterSkillsOutputSchema = z.object({
    skillsAndAbilities: z.array(Foundation_SkillSchemaInternal).optional().describe("If provided, each skill needs id, name, description, type."),
});

const Foundation_MinimalContextForItemsFactsInputSchema = z.object({
    seriesName: z.string(),
    character: Foundation_CharacterCoreProfileSchemaInternal.pick({ name: true, class: true, description: true, currency: true, languageReading:true, languageSpeaking:true }),
    sceneDescription: z.string(),
    currentLocation: z.string(),
});
const Foundation_InitialInventoryOutputSchema = z.object({
    inventory: z.array(Foundation_ItemSchemaInternal).describe("REQUIRED (can be empty array). Each item needs id, name, description."),
});
const Foundation_InitialMainGearOutputSchema = z.object({
    weapon: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
    shield: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
    body: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
});
const Foundation_InitialSecondaryGearOutputSchema = z.object({
    head: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
    legs: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
    feet: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
    hands: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
});
const Foundation_InitialAccessoryGearOutputSchema = z.object({
    neck: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
    ring1: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
    ring2: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
});
const Foundation_InitialWorldFactsOutputSchema = z.object({
    worldFacts: z.array(z.string()).describe("REQUIRED (can be empty array)."),
});

const Foundation_SeriesPlotSummaryInputSchema = z.object({
    seriesName: z.string(),
    characterNameInput: z.string().optional(),
});
const Foundation_SeriesPlotSummaryOutputSchema = z.object({
    plotSummary: z.string().describe("REQUIRED."),
});

const Foundation_StyleGuideInputSchema = z.object({
  seriesName: z.string(),
});


export async function generateScenarioFoundation(input: GenerateScenarioFoundationInput): Promise<GenerateScenarioFoundationOutput> {
  return foundationFlow(input);
}

const foundationFlow = ai.defineFlow(
  {
    name: 'generateScenarioFoundationFlow',
    inputSchema: GenerateScenarioFoundationInputSchema,
    outputSchema: GenerateScenarioFoundationOutputSchema,
  },
  async (mainInput: GenerateScenarioFoundationInput): Promise<GenerateScenarioFoundationOutput> => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] generateScenarioFoundationFlow: START for Series: ${mainInput.seriesName}, Character: ${mainInput.characterNameInput || 'AI Decides'}, Premium: ${mainInput.usePremiumAI}`);

    const modelName = mainInput.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = mainInput.usePremiumAI 
        ? { maxOutputTokens: 32000 } 
        : { maxOutputTokens: 8000 };


    let step1StartTime = Date.now();
    console.log(`[${new Date(step1StartTime).toISOString()}] generateScenarioFoundationFlow: STEP 1 - Starting Initial Parallel Batch (Character/Scene, Style Guide, Plot Summary).`);

    const foundation_characterAndScenePrompt = ai.definePrompt({
        name: 'foundation_characterAndScenePrompt', model: modelName, input: { schema: Foundation_CharacterAndSceneInputSchema }, output: { schema: Foundation_CharacterAndSceneOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_CharacterAndSceneOutputSchema'. ALL REQUIRED fields (sceneDescription, characterCore, currentLocation AND nested required fields in characterCore like name, class, description, health, maxHealth, level, experiencePoints, experienceToNextLevel) MUST be present.
You are a master storyteller for "{{seriesName}}".
User character: Name: {{#if characterNameInput}}{{characterNameInput}}{{else}}(Not provided){{/if}}, Class: {{#if characterClassInput}}{{characterClassInput}}{{else}}(Not provided){{/if}}.
Generate 'sceneDescription', 'characterCore', 'currentLocation'.
'characterCore': Authentically create profile. Include name, class, description. Health/MaxHealth (numbers). Mana/MaxMana (numbers, 0 if not applicable). Stats (5-15, numbers). Level 1, 0 XP, XPToNextLevel (numbers, >0). Currency (number).
'languageReading' & 'languageSpeaking' (numbers, 0-100): Set to 0 for canonical language barriers, else 100 or series-appropriate. Description MUST reflect language barriers if skills are 0.
'currentLocation': Specific series starting location.
Output ONLY the JSON. Strictly adhere to Foundation_CharacterAndSceneOutputSchema and all its REQUIRED fields.`,
    });
    const foundation_styleGuidePrompt = ai.definePrompt({
        name: 'foundation_generateSeriesStyleGuidePrompt', model: modelName, input: { schema: Foundation_StyleGuideInputSchema }, output: { schema: z.string().nullable() }, config: modelConfig, // Assuming style guide is short
        prompt: `For "{{seriesName}}", provide a 2-3 sentence summary of key themes/tone. If unable, output an empty string (""). Output ONLY the summary string or empty string.`,
    });
    const foundation_seriesPlotSummaryPrompt = ai.definePrompt({
        name: 'foundation_generateSeriesPlotSummaryPrompt', model: modelName, input: { schema: Foundation_SeriesPlotSummaryInputSchema }, output: { schema: Foundation_SeriesPlotSummaryOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_SeriesPlotSummaryOutputSchema'. The 'plotSummary' field is REQUIRED.
For "{{seriesName}}"{{#if characterNameInput}} (character: "{{characterNameInput}}"){{/if}}, provide 'plotSummary': Concise summary of early major plot points/arcs relevant to the character. 5-7 bullet points or short paragraph.
Output ONLY JSON for Foundation_SeriesPlotSummaryOutputSchema.`,
    });

    let charSceneResult, styleGuideResult, seriesPlotSummaryResult;
    try {
        [charSceneResult, styleGuideResult, seriesPlotSummaryResult] = await Promise.all([
            foundation_characterAndScenePrompt({ seriesName: mainInput.seriesName, characterNameInput: mainInput.characterNameInput, characterClassInput: mainInput.characterClassInput, usePremiumAI: mainInput.usePremiumAI }),
            foundation_styleGuidePrompt({ seriesName: mainInput.seriesName }),
            foundation_seriesPlotSummaryPrompt({ seriesName: mainInput.seriesName, characterNameInput: mainInput.characterNameInput })
        ]);
    } catch (e: any) {
        console.error(`[${new Date().toISOString()}] generateScenarioFoundationFlow: STEP 1 FAILED. Error: ${e.message}`);
        throw new Error(`AI failed during initial scenario setup (Step 1). Details: ${e.message}`);
    }
    console.log(`[${new Date().toISOString()}] generateScenarioFoundationFlow: STEP 1 - Initial Parallel Batch completed in ${Date.now() - step1StartTime}ms.`);

    const charSceneOutput = charSceneResult.output;
    const styleGuideRaw = styleGuideResult.output;
    const generatedSeriesPlotSummary = seriesPlotSummaryResult.output?.plotSummary || `No specific plot summary was generated by the AI for ${mainInput.seriesName}. The story will be more emergent.`;

    if (!charSceneOutput || !charSceneOutput.sceneDescription || !charSceneOutput.characterCore || !charSceneOutput.currentLocation) {
      console.error("Character/Scene generation failed or returned invalid structure:", charSceneOutput);
      throw new Error('Failed to generate character core, scene, or location (REQUIRED fields missing).');
    }
    let { characterCore, sceneDescription, currentLocation } = charSceneOutput;
    characterCore.mana = characterCore.mana ?? 0;
    characterCore.maxMana = characterCore.maxMana ?? 0;
    characterCore.currency = characterCore.currency ?? 0;
    characterCore.languageReading = characterCore.languageReading ?? 100;
    characterCore.languageSpeaking = characterCore.languageSpeaking ?? 100;


    let step2StartTime = Date.now();
    console.log(`[${new Date(step2StartTime).toISOString()}] generateScenarioFoundationFlow: STEP 2 - Calling foundation_initialCharacterSkillsPrompt.`);
    const foundation_initialCharacterSkillsPrompt = ai.definePrompt({
        name: 'foundation_initialCharacterSkillsPrompt', model: modelName, input: { schema: Foundation_InitialCharacterSkillsInputSchema }, output: { schema: Foundation_InitialCharacterSkillsOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object. If 'skillsAndAbilities' are provided, each skill MUST have a unique 'id', 'name', 'description', and 'type'.
For "{{seriesName}}" character: Name: {{characterName}}, Class: {{characterClass}}, Desc: {{characterDescription}}.
Generate ONLY 'skillsAndAbilities': Array of 2-3 starting skills. Include signature abilities if appropriate (e.g., "Return by Death" for Re:Zero Subaru).
Output ONLY { "skillsAndAbilities": [...] } or { "skillsAndAbilities": [] }. Ensure all REQUIRED fields for skills are present.`,
    });
    const skillsInput: z.infer<typeof Foundation_InitialCharacterSkillsInputSchema> = {
        seriesName: mainInput.seriesName,
        characterName: characterCore.name,
        characterClass: characterCore.class,
        characterDescription: characterCore.description,
    };
    let skillsOutput;
    try {
        const { output } = await foundation_initialCharacterSkillsPrompt(skillsInput);
        skillsOutput = output;
    } catch (e:any) {
        console.error(`[${new Date().toISOString()}] generateScenarioFoundationFlow: STEP 2 FAILED (Skills Generation). Error: ${e.message}`);
        throw new Error(`AI failed during skills generation (Step 2). Details: ${e.message}`);
    }
    console.log(`[${new Date().toISOString()}] generateScenarioFoundationFlow: STEP 2 - foundation_initialCharacterSkillsPrompt completed in ${Date.now() - step2StartTime}ms.`);
    const characterSkills = skillsOutput?.skillsAndAbilities || [];
    const fullCharacterProfile: z.infer<typeof Foundation_CharacterProfileSchemaInternal> = {
        ...characterCore,
        skillsAndAbilities: characterSkills,
    };

    let step3StartTime = Date.now();
    console.log(`[${new Date(step3StartTime).toISOString()}] generateScenarioFoundationFlow: STEP 3 - Starting Item & Facts Parallel Batch.`);

    const minimalContextForItemsFactsInput: z.infer<typeof Foundation_MinimalContextForItemsFactsInputSchema> = {
        seriesName: mainInput.seriesName,
        character: { name: fullCharacterProfile.name, class: fullCharacterProfile.class, description: fullCharacterProfile.description, currency: fullCharacterProfile.currency, languageReading: fullCharacterProfile.languageReading, languageSpeaking: fullCharacterProfile.languageSpeaking },
        sceneDescription: sceneDescription,
        currentLocation: currentLocation,
    };

    const foundation_initialInventoryPrompt = ai.definePrompt({
        name: 'foundation_initialInventoryPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialInventoryOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_InitialInventoryOutputSchema'. The 'inventory' array is REQUIRED (can be empty). Each item MUST have 'id', 'name', 'description'. 'basePrice' (number) is optional.
For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'inventory': 0-3 unequipped items. Include optional 'rarity', optional 'activeEffects'. If 'activeEffects' of type 'stat_modifier', include 'statModifiers' (array of {stat, value(number), type('add')}). 'equipSlot' if equippable, OMITTED otherwise.
Output ONLY { "inventory": [...] }. Ensure all REQUIRED fields for items are present. Ensure IDs are unique.`,
    });
    const foundation_initialMainGearPrompt = ai.definePrompt({
        name: 'foundation_initialMainGearPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialMainGearOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_InitialMainGearOutputSchema'. Each item ('weapon', 'shield', 'body') or null is REQUIRED. If an item, it MUST have 'id', 'name', 'description'.
For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'weapon', 'shield', 'body' equipped items (or null). Include 'basePrice' (number), optional 'rarity', 'equipSlot', optional 'activeEffects'. If 'activeEffects' of type 'stat_modifier', include 'statModifiers' (array of {stat, value(number), type('add')}).
Output ONLY { "weapon": ..., "shield": ..., "body": ... }. Ensure all REQUIRED fields for items are present if an item is generated. Ensure IDs are unique.`,
    });
    const foundation_initialSecondaryGearPrompt = ai.definePrompt({
        name: 'foundation_initialSecondaryGearPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialSecondaryGearOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_InitialSecondaryGearOutputSchema'. Each item ('head', 'legs', 'feet', 'hands') or null is REQUIRED. If an item, it MUST have 'id', 'name', 'description'.
For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'head', 'legs', 'feet', 'hands' equipped items (or null). Include 'basePrice' (number), optional 'rarity', 'equipSlot', optional 'activeEffects'. If 'activeEffects' of type 'stat_modifier', include 'statModifiers' (array of {stat, value(number), type('add')}).
Output ONLY { "head": ..., "legs": ..., "feet": ..., "hands": ... }. Ensure all REQUIRED fields for items are present if an item is generated. Ensure IDs are unique.`,
    });
    const foundation_initialAccessoryGearPrompt = ai.definePrompt({
        name: 'foundation_initialAccessoryGearPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialAccessoryGearOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_InitialAccessoryGearOutputSchema'. Each item ('neck', 'ring1', 'ring2') or null is REQUIRED. If an item, it MUST have 'id', 'name', 'description'.
For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'neck', 'ring1', 'ring2' equipped items (or null). Include 'basePrice' (number), optional 'rarity', 'equipSlot', optional 'activeEffects'. If 'activeEffects' of type 'stat_modifier', include 'statModifiers' (array of {stat, value(number), type('add')}).
Output ONLY { "neck": ..., "ring1": ..., "ring2": ... }. Ensure all REQUIRED fields for items are present if an item is generated. Ensure IDs are unique.`,
    });
    const foundation_initialWorldFactsPrompt = ai.definePrompt({
        name: 'foundation_initialWorldFactsPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialWorldFactsOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_InitialWorldFactsOutputSchema'. The 'worldFacts' array is REQUIRED (can be empty).
For "{{seriesName}}" (Char: {{character.name}} - Reading: {{character.languageReading}}/100, Speaking: {{character.languageSpeaking}}/100, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'worldFacts': 3-5 key facts. If languageReading is low, fact MUST state "Character {{character.name}} cannot read local script...". If languageSpeaking is low, fact MUST state "Character {{character.name}} cannot understand/speak local language...".
Output ONLY { "worldFacts": [...] }.`,
    });

    const itemFactsPromises = [
        foundation_initialInventoryPrompt(minimalContextForItemsFactsInput),
        foundation_initialMainGearPrompt(minimalContextForItemsFactsInput),
        foundation_initialSecondaryGearPrompt(minimalContextForItemsFactsInput),
        foundation_initialAccessoryGearPrompt(minimalContextForItemsFactsInput),
        foundation_initialWorldFactsPrompt(minimalContextForItemsFactsInput),
    ];

    console.log(`[${new Date().toISOString()}] generateScenarioFoundationFlow: STEP 3 - Firing ${itemFactsPromises.length} parallel AI calls for items & facts.`);

    let itemFactsResults;
    try {
      itemFactsResults = await Promise.all(itemFactsPromises.map(async (promise, index) => {
          const callStartTime = Date.now();
          const promptName = ['inventory', 'mainGear', 'secondaryGear', 'accessoryGear', 'worldFacts'][index];
          console.log(`[${new Date(callStartTime).toISOString()}] generateScenarioFoundationFlow: STEP 3 - Calling foundation_${promptName}Prompt.`);
          const result = await promise;
          console.log(`[${new Date().toISOString()}] generateScenarioFoundationFlow: STEP 3 - foundation_${promptName}Prompt call completed in ${Date.now() - callStartTime}ms.`);
          return result.output;
      }));
    } catch (e: any) {
        console.error(`[${new Date().toISOString()}] generateScenarioFoundationFlow: STEP 3 FAILED (Item & Facts Batch). Error: ${e.message}`);
        throw new Error(`AI failed during item/fact generation (Step 3). Details: ${e.message}`);
    }
    console.log(`[${new Date().toISOString()}] generateScenarioFoundationFlow: STEP 3 - Item & Facts Parallel Batch completed in ${Date.now() - step3StartTime}ms.`);

    const [
        inventoryOutput,
        mainGearRaw,
        secondaryGearRaw,
        accessoryGearRaw,
        worldFactsOutput,
    ] = itemFactsResults as [
        z.infer<typeof Foundation_InitialInventoryOutputSchema>,
        z.infer<typeof Foundation_InitialMainGearOutputSchema>,
        z.infer<typeof Foundation_InitialSecondaryGearOutputSchema>,
        z.infer<typeof Foundation_InitialAccessoryGearOutputSchema>,
        z.infer<typeof Foundation_InitialWorldFactsOutputSchema>,
    ];

    if (!inventoryOutput || !inventoryOutput.inventory) { throw new Error('Failed to generate initial inventory (REQUIRED field missing).'); }
    const inventory = inventoryOutput.inventory;
    const mainGearOutput = mainGearRaw || { weapon: null, shield: null, body: null };
    const secondaryGearOutput = secondaryGearRaw || { head: null, legs: null, feet: null, hands: null };
    const accessoryGearOutput = accessoryGearRaw || { neck: null, ring1: null, ring2: null };
    if (!worldFactsOutput || !worldFactsOutput.worldFacts) { throw new Error('Failed to generate initial world facts (REQUIRED field missing).'); }
    const worldFacts = worldFactsOutput.worldFacts;

    const equippedItemsIntermediate: Partial<Record<EquipmentSlot, ItemType | null>> = {
        weapon: mainGearOutput.weapon ?? null, shield: mainGearOutput.shield ?? null, body: mainGearOutput.body ?? null,
        head: secondaryGearOutput.head ?? null, legs: secondaryGearOutput.legs ?? null, feet: secondaryGearOutput.feet ?? null, hands: secondaryGearOutput.hands ?? null,
        neck: accessoryGearOutput.neck ?? null, ring1: accessoryGearOutput.ring1 ?? null, ring2: accessoryGearOutput.ring2 ?? null,
    };
    const seriesStyleGuide = styleGuideRaw === null ? undefined : styleGuideRaw;

    console.log(`[${new Date().toISOString()}] generateScenarioFoundationFlow: Performing final data sanitation for foundation items.`);
    const sanitizeFoundationItem = (item: Partial<ItemType>, prefix: string, index: number | string = '') => {
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

    inventory.forEach((item, index) => sanitizeFoundationItem(item, `item_inv_foundation`, index));
    Object.keys(equippedItemsIntermediate).forEach(slot => {
        const item = equippedItemsIntermediate[slot as EquipmentSlot];
        if (item) sanitizeFoundationItem(item, `item_eqp_foundation`, slot);
    });

    const finalOutput: GenerateScenarioFoundationOutput = {
      sceneDescription: sceneDescription,
      characterProfile: fullCharacterProfile,
      currentLocation: currentLocation,
      inventory: inventory,
      equippedItems: equippedItemsIntermediate as Required<typeof equippedItemsIntermediate>,
      worldFacts: worldFacts,
      seriesStyleGuide: seriesStyleGuide,
      seriesPlotSummary: generatedSeriesPlotSummary,
    };

    console.log(`[${new Date().toISOString()}] generateScenarioFoundationFlow: END. Total time: ${Date.now() - flowStartTime}ms`);
    return finalOutput;
  }
);


// --- SCHEMAS FOR NARRATIVE ELEMENTS FLOW ---
// (Moved from separate file back into here)

const Narrative_ItemRarityEnumInternal = z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']);

const Narrative_StatModifierSchemaInternal = z.object({
  stat: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'maxHealth', 'maxMana', 'health', 'mana', 'level', 'experiencePoints', 'currency', 'languageReading', 'languageSpeaking']),
  value: z.number(),
  type: z.enum(['add', 'multiply']),
  description: z.string().optional(),
});

const Narrative_ActiveEffectSchemaInternal = z.object({
  id: z.string().describe("REQUIRED."),
  name: z.string().describe("REQUIRED."),
  description: z.string().describe("REQUIRED."),
  type: z.enum(['stat_modifier', 'temporary_ability', 'passive_aura']).describe("REQUIRED."),
  duration: z.union([z.string().describe("Use 'permanent_while_equipped' for ongoing effects from gear."), z.number()]).optional().describe("Duration of the effect. Use 'permanent_while_equipped' for ongoing effects from gear. Use a number (representing turns) for temporary effects."),
  statModifiers: z.array(Narrative_StatModifierSchemaInternal).optional(),
  sourceItemId: z.string().optional(),
});

const Narrative_ItemSchemaInternal = z.object({
  id: z.string().describe("REQUIRED."),
  name: z.string().describe("REQUIRED."),
  description: z.string().describe("REQUIRED."),
  equipSlot: EquipSlotEnumInternal.optional(),
  isConsumable: z.boolean().optional(),
  effectDescription: z.string().optional(),
  isQuestItem: z.boolean().optional(),
  relevantQuestId: z.string().optional(),
  basePrice: z.number().optional(),
  rarity: Narrative_ItemRarityEnumInternal.optional(),
  activeEffects: z.array(Narrative_ActiveEffectSchemaInternal).optional(),
});

const Narrative_SkillSchemaInternal = z.object({
    id: z.string().describe("REQUIRED."),
    name: z.string().describe("REQUIRED."),
    description: z.string().describe("REQUIRED."),
    type: z.string().describe("REQUIRED.")
});

const Narrative_CharacterProfileSchemaForInput = z.object({ // Used for input context
  name: z.string().describe("REQUIRED."),
  class: z.string().describe("REQUIRED."),
  description: z.string().describe("REQUIRED."),
  health: z.number().describe("REQUIRED."),
  maxHealth: z.number().describe("REQUIRED."),
  mana: z.number().optional(),
  maxMana: z.number().optional(),
  strength: z.number().optional(),
  dexterity: z.number().optional(),
  constitution: z.number().optional(),
  intelligence: z.number().optional(),
  wisdom: z.number().optional(),
  charisma: z.number().optional(),
  level: z.number().describe("REQUIRED."),
  experiencePoints: z.number().describe("REQUIRED."),
  experienceToNextLevel: z.number().describe("REQUIRED."),
  skillsAndAbilities: z.array(Narrative_SkillSchemaInternal).optional(),
  currency: z.number().optional(),
  languageReading: z.number().optional(),
  languageSpeaking: z.number().optional(),
});


const Narrative_QuestStatusEnumInternal = z.enum(['active', 'completed', 'failed']);
const Narrative_QuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("REQUIRED."),
  isCompleted: z.boolean().describe("REQUIRED.")
});

const Narrative_QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional(),
  items: z.array(Narrative_ItemSchemaInternal).optional(),
  currency: z.number().optional(),
});

const Narrative_QuestSchemaInternal = z.object({
  id: z.string().describe("REQUIRED."),
  title: z.string().optional(),
  description: z.string().describe("REQUIRED."),
  type: z.enum(['main', 'side', 'dynamic', 'chapter_goal']).describe("REQUIRED."),
  status: Narrative_QuestStatusEnumInternal.describe("REQUIRED."),
  chapterId: z.string().optional(),
  orderInChapter: z.number().optional(),
  category: z.string().optional(),
  objectives: z.array(Narrative_QuestObjectiveSchemaInternal).optional(),
  rewards: Narrative_QuestRewardsSchemaInternal.optional(),
  updatedAt: z.string().optional(),
});

const Narrative_ChapterSchemaInternal = z.object({
    id: z.string().describe("REQUIRED."),
    title: z.string().describe("REQUIRED."),
    description: z.string().describe("REQUIRED."),
    order: z.number().describe("REQUIRED."),
    mainQuestIds: z.array(z.string()).describe("REQUIRED (can be empty for outlined chapters)."),
    isCompleted: z.boolean().describe("REQUIRED."),
    unlockCondition: z.string().optional(),
});

const Narrative_NPCDialogueEntrySchemaInternal = z.object({
    playerInput: z.string().optional(),
    npcResponse: z.string().describe("REQUIRED."),
    turnId: z.string().describe("REQUIRED."),
});

const Narrative_MerchantItemSchemaInternal = Narrative_ItemSchemaInternal.extend({
  price: z.number().optional(),
});

const Narrative_NPCProfileSchemaInternal = z.object({
    id: z.string().describe("REQUIRED."),
    name: z.string().describe("REQUIRED."),
    description: z.string().describe("REQUIRED."),
    classOrRole: z.string().optional(),
    health: z.number().optional(),
    maxHealth: z.number().optional(),
    mana: z.number().optional(),
    maxMana: z.number().optional(),
    firstEncounteredLocation: z.string().optional(),
    firstEncounteredTurnId: z.string().optional(),
    relationshipStatus: z.number().describe("REQUIRED."),
    knownFacts: z.array(z.string()).describe("REQUIRED (can be empty array)."),
    dialogueHistory: z.array(Narrative_NPCDialogueEntrySchemaInternal).optional(),
    lastKnownLocation: z.string().optional(),
    lastSeenTurnId: z.string().optional(),
    seriesContextNotes: z.string().optional(),
    shortTermGoal: z.string().optional(),
    updatedAt: z.string().optional(),
    isMerchant: z.boolean().optional(),
    merchantInventory: z.array(Narrative_MerchantItemSchemaInternal).optional(),
    buysItemTypes: z.array(z.string()).optional(),
    sellsItemTypes: z.array(z.string()).optional(),
});

const ScenarioNarrative_RawLoreEntryZodSchema = z.object({
  keyword: z.string().describe("REQUIRED."),
  content: z.string().describe("REQUIRED."),
  category: z.string().optional(),
});

// --- Input and Output Schemas for the Narrative Elements Flow ---
const GenerateScenarioNarrativeElementsInputSchema = z.object({
  seriesName: z.string(),
  seriesPlotSummary: z.string(),
  characterProfile: Narrative_CharacterProfileSchemaForInput,
  sceneDescription: z.string(),
  currentLocation: z.string(),
  characterNameInput: z.string().optional(), // From original user input
  usePremiumAI: z.boolean().optional(),
});
export type GenerateScenarioNarrativeElementsInput = z.infer<typeof GenerateScenarioNarrativeElementsInputSchema>;

const GenerateScenarioNarrativeElementsOutputSchema = z.object({
  quests: z.array(Narrative_QuestSchemaInternal).describe("REQUIRED (can be empty array). Each quest needs id, description, type, status."),
  chapters: z.array(Narrative_ChapterSchemaInternal).describe("REQUIRED (can be empty array). Each chapter needs id, title, description, order, mainQuestIds, isCompleted."),
  trackedNPCs: z.array(Narrative_NPCProfileSchemaInternal).describe("REQUIRED (can be empty array). Each NPC needs id, name, description, relationshipStatus, knownFacts."),
  initialLoreEntries: z.array(ScenarioNarrative_RawLoreEntryZodSchema).describe("REQUIRED (can be empty array). Each entry needs keyword, content."),
});
export type GenerateScenarioNarrativeElementsOutput = z.infer<typeof GenerateScenarioNarrativeElementsOutputSchema>;


// Schemas for internal AI calls within Narrative Elements Flow
const Narrative_InitialQuestsAndChaptersInputSchema = GenerateScenarioNarrativeElementsInputSchema.pick({
    seriesName: true, seriesPlotSummary: true, characterProfile: true, sceneDescription: true, currentLocation: true, characterNameInput: true
});
const Narrative_InitialQuestsAndChaptersOutputSchema = z.object({
    quests: z.array(Narrative_QuestSchemaInternal).describe("REQUIRED. Each quest needs id, description, type, status."),
    chapters: z.array(Narrative_ChapterSchemaInternal).describe("REQUIRED. Each chapter needs id, title, description, order, mainQuestIds, isCompleted."),
});

const Narrative_InitialTrackedNPCsInputSchema = GenerateScenarioNarrativeElementsInputSchema.pick({
    seriesName: true, characterProfile: true, sceneDescription: true, currentLocation: true, characterNameInput: true
});
const Narrative_InitialTrackedNPCsOutputSchema = z.object({
    trackedNPCs: z.array(Narrative_NPCProfileSchemaInternal).describe("REQUIRED. Each NPC needs id, name, description, relationshipStatus, knownFacts."),
});

const Narrative_LoreGenerationInputSchema = z.object({
  seriesName: z.string(),
  characterName: z.string(),
  characterClass: z.string(),
  sceneDescription: z.string(),
  characterDescription: z.string(),
});
const Narrative_CategorizedLoreOutputSchema = z.object({
    loreEntries: z.array(ScenarioNarrative_RawLoreEntryZodSchema).describe("REQUIRED. Each entry needs keyword, content."),
});


// Exported function to call the Narrative Elements flow
export async function generateScenarioNarrativeElements(input: GenerateScenarioNarrativeElementsInput): Promise<GenerateScenarioNarrativeElementsOutput> {
  return generateScenarioNarrativeElementsFlow(input);
}

const generateScenarioNarrativeElementsFlow = ai.defineFlow(
  {
    name: 'generateScenarioNarrativeElementsFlow',
    inputSchema: GenerateScenarioNarrativeElementsInputSchema,
    outputSchema: GenerateScenarioNarrativeElementsOutputSchema,
  },
  async (input: GenerateScenarioNarrativeElementsInput): Promise<GenerateScenarioNarrativeElementsOutput> => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] generateScenarioNarrativeElementsFlow: START for Series: ${input.seriesName}, Character: ${input.characterProfile.name}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = input.usePremiumAI 
        ? { maxOutputTokens: 32000 } 
        : { maxOutputTokens: 8000 };

    // --- Define Prompts ---
    const narrative_initialQuestsAndChaptersPrompt = ai.definePrompt({
        name: 'narrative_initialQuestsAndChaptersPrompt', model: modelName, input: { schema: Narrative_InitialQuestsAndChaptersInputSchema }, output: { schema: Narrative_InitialQuestsAndChaptersOutputSchema }, config: modelConfig,
        tools: [lookupLoreTool],
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Narrative_InitialQuestsAndChaptersOutputSchema'. ALL REQUIRED fields (quests array, chapters array, and nested required fields like quest id/desc/type/status, chapter id/title/desc/order/mainQuestIds/isCompleted) MUST be present.
For "{{seriesName}}" (Char: {{characterProfile.name}}, Scene: {{sceneDescription}}, Plot: {{{seriesPlotSummary}}}).
Generate 'chapters' & 'quests'.
'chapters': 2-3 initial Chapters. Each chapter MUST have id, title, description, order, mainQuestIds (can be empty for outlined chapters), and isCompleted. First chapter: full details, 'mainQuestIds' list IDs of its quests. Subsequent chapters: OUTLINES (id, title, desc, order, EMPTY mainQuestIds: []).
'quests': 2-3 'main' quests ONLY for the FIRST chapter, based on 'seriesPlotSummary'. Each quest MUST have 'id', 'description', 'type: "main"', 'status: "active"', 'chapterId' (first chapter's ID). Include 'orderInChapter'. 'title' is optional. Include 'rewards' (XP (number), currency (number), items (each with id, name, desc, basePrice (number), optional rarity, optional activeEffects with statModifiers)). Include 1-2 'objectives' (each with description, 'isCompleted: false'). Use 'lookupLoreTool' for accuracy.
Output ONLY JSON { "quests": [...], "chapters": [...] }. Ensure 'activeEffects' are structured correctly if included. Ensure all IDs are unique.`,
    });

    const narrative_initialTrackedNPCsPrompt = ai.definePrompt({
        name: 'narrative_initialTrackedNPCsPrompt', model: modelName, input: { schema: Narrative_InitialTrackedNPCsInputSchema }, output: { schema: Narrative_InitialTrackedNPCsOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Narrative_InitialTrackedNPCsOutputSchema'. The 'trackedNPCs' array is REQUIRED (can be empty), and each NPC object within it MUST have id, name, description, relationshipStatus, and knownFacts (can be empty array).
For "{{seriesName}}" (Char: {{characterProfile.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'trackedNPCs':
- NPCs IN SCENE: Must include. Each MUST have 'id', 'name', 'description', 'relationshipStatus' (number), 'knownFacts' (can be empty array). 'firstEncounteredLocation'/'lastKnownLocation' = '{{currentLocation}}'.
- PRE-POPULATED MAJOR NPCs (NOT in scene): 2-4 crucial early-series NPCs. Each MUST have 'id', 'name', 'description', 'relationshipStatus' (number), 'knownFacts' (can be empty array). Their canonical locations for 'firstEncounteredLocation'/'lastKnownLocation'.
- ALL NPCs: 'firstEncounteredTurnId'/'lastSeenTurnId' = "initial_turn_0". Optional 'classOrRole', 'health' (number), 'maxHealth' (number), 'mana' (number), 'maxMana' (number). If merchant: 'isMerchant: true', 'merchantInventory' (items with id, name, desc, basePrice (number), price (number), optional rarity, optional activeEffects with statModifiers), 'buysItemTypes', 'sellsItemTypes'.
Output ONLY { "trackedNPCs": [...] }. Ensure 'activeEffects' are structured correctly. Ensure all IDs are unique.`,
    });

    const narrative_characterLorePrompt = ai.definePrompt({
        name: 'narrative_characterLorePrompt', model: modelName, input: { schema: Narrative_LoreGenerationInputSchema }, output: { schema: Narrative_CategorizedLoreOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Narrative_CategorizedLoreOutputSchema'. The 'loreEntries' array is REQUIRED (can be empty), and each entry MUST have 'keyword' and 'content'.
You are a lore master for "{{seriesName}}". Context: Character "{{characterName}}" ({{characterClass}}). Scene: {{sceneDescription}}. Character Background: {{characterDescription}}.
Generate 10-12 key lore entries for MAJOR CHARACTERS relevant to early-to-mid game. Each: 'keyword' (name), 'content' (2-3 sentences), 'category': "Character".
Output ONLY { "loreEntries": [{"keyword": "...", "content": "...", "category":"Character"}, ...] }.`,
    });
    const narrative_locationLorePrompt = ai.definePrompt({
        name: 'narrative_locationLorePrompt', model: modelName, input: { schema: Narrative_LoreGenerationInputSchema }, output: { schema: Narrative_CategorizedLoreOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Narrative_CategorizedLoreOutputSchema'. The 'loreEntries' array is REQUIRED (can be empty), and each entry MUST have 'keyword' and 'content'.
You are a lore master for "{{seriesName}}". Context: Character "{{characterName}}" ({{characterClass}}). Scene: {{sceneDescription}}. Character Background: {{characterDescription}}.
Generate 10-12 key lore entries for MAJOR LOCATIONS/REGIONS relevant to early-to-mid game. Each: 'keyword' (name), 'content' (2-3 sentences), 'category': "Location".
Output ONLY { "loreEntries": [{"keyword": "...", "content": "...", "category":"Location"}, ...] }.`,
    });
    const narrative_factionLorePrompt = ai.definePrompt({
        name: 'narrative_factionLorePrompt', model: modelName, input: { schema: Narrative_LoreGenerationInputSchema }, output: { schema: Narrative_CategorizedLoreOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Narrative_CategorizedLoreOutputSchema'. The 'loreEntries' array is REQUIRED (can be empty), and each entry MUST have 'keyword' and 'content'.
You are a lore master for "{{seriesName}}". Context: Character "{{characterName}}" ({{characterClass}}). Scene: {{sceneDescription}}. Character Background: {{characterDescription}}.
Generate 8-10 key lore entries for IMPORTANT FACTIONS/ORGANIZATIONS relevant to early-to-mid game. Each: 'keyword' (name), 'content' (2-3 sentences), 'category': "Faction/Organization".
Output ONLY { "loreEntries": [{"keyword": "...", "content": "...", "category":"Faction/Organization"}, ...] }.`,
    });
    const narrative_itemConceptLorePrompt = ai.definePrompt({
        name: 'narrative_itemConceptLorePrompt', model: modelName, input: { schema: Narrative_LoreGenerationInputSchema }, output: { schema: Narrative_CategorizedLoreOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Narrative_CategorizedLoreOutputSchema'. The 'loreEntries' array is REQUIRED (can be empty), and each entry MUST have 'keyword' and 'content'.
You are a lore master for "{{seriesName}}". Context: Character "{{characterName}}" ({{characterClass}}). Scene: {{sceneDescription}}. Character Background: {{characterDescription}}.
Generate 8-10 key lore entries for SIGNIFICANT ITEMS, ARTIFACTS, CORE CONCEPTS, or UNIQUE TECHNOLOGIES relevant to early-to-mid game. Each: 'keyword', 'content' (2-3 sentences), 'category': "Item/Concept" or "Technology".
Output ONLY { "loreEntries": [{"keyword": "...", "content": "...", "category":"Item/Concept"}, ...] }.`,
    });
    const narrative_eventHistoryLorePrompt = ai.definePrompt({
        name: 'narrative_eventHistoryLorePrompt', model: modelName, input: { schema: Narrative_LoreGenerationInputSchema }, output: { schema: Narrative_CategorizedLoreOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Narrative_CategorizedLoreOutputSchema'. The 'loreEntries' array is REQUIRED (can be empty), and each entry MUST have 'keyword' and 'content'.
You are a lore master for "{{seriesName}}". Context: Character "{{characterName}}" ({{characterClass}}). Scene: {{sceneDescription}}. Character Background: {{characterDescription}}.
Generate 8-10 key lore entries for KEY HISTORICAL EVENTS or BACKGROUND ELEMENTS relevant to early-to-mid game. Each: 'keyword', 'content' (2-3 sentences), 'category': "Event/History".
Output ONLY { "loreEntries": [{"keyword": "...", "content": "...", "category":"Event/History"}, ...] }.`,
    });

    // --- Prepare Inputs for Prompts ---
    const questsChaptersInput: z.infer<typeof Narrative_InitialQuestsAndChaptersInputSchema> = {
        seriesName: input.seriesName,
        seriesPlotSummary: input.seriesPlotSummary,
        characterProfile: input.characterProfile,
        sceneDescription: input.sceneDescription,
        currentLocation: input.currentLocation,
        characterNameInput: input.characterNameInput,
    };
    const npcsInput: z.infer<typeof Narrative_InitialTrackedNPCsInputSchema> = {
        seriesName: input.seriesName,
        characterProfile: input.characterProfile,
        sceneDescription: input.sceneDescription,
        currentLocation: input.currentLocation,
        characterNameInput: input.characterNameInput,
    };
    const loreBaseInput: z.infer<typeof Narrative_LoreGenerationInputSchema> = {
        seriesName: input.seriesName,
        characterName: input.characterProfile.name,
        characterClass: input.characterProfile.class,
        sceneDescription: input.sceneDescription,
        characterDescription: input.characterProfile.description,
    };

    // --- Execute Prompts in Parallel ---
    let questsChaptersResult, npcsResult, charLore, locLore, factLore, itemLore, eventLore;
    try {
        console.log(`[${new Date().toISOString()}] generateScenarioNarrativeElementsFlow: Firing parallel AI calls.`);
        [
            questsChaptersResult,
            npcsResult,
            charLore,
            locLore,
            factLore,
            itemLore,
            eventLore
        ] = await Promise.all([
            narrative_initialQuestsAndChaptersPrompt(questsChaptersInput).then(r => r.output),
            narrative_initialTrackedNPCsPrompt(npcsInput).then(r => r.output),
            narrative_characterLorePrompt(loreBaseInput).then(r => r.output),
            narrative_locationLorePrompt(loreBaseInput).then(r => r.output),
            narrative_factionLorePrompt(loreBaseInput).then(r => r.output),
            narrative_itemConceptLorePrompt(loreBaseInput).then(r => r.output),
            narrative_eventHistoryLorePrompt(loreBaseInput).then(r => r.output),
        ]);
    } catch (e: any) {
        console.error(`[${new Date().toISOString()}] generateScenarioNarrativeElementsFlow: Parallel AI calls FAILED. Error: ${e.message}`);
        throw new Error(`AI failed during narrative elements generation. Details: ${e.message}`);
    }
    console.log(`[${new Date().toISOString()}] generateScenarioNarrativeElementsFlow: Parallel AI calls completed.`);

    if (!questsChaptersResult || !questsChaptersResult.quests || !questsChaptersResult.chapters) {
      throw new Error('Failed to generate initial quests and chapters (REQUIRED fields missing).');
    }
    if (!npcsResult || !npcsResult.trackedNPCs) {
      throw new Error('Failed to generate initial tracked NPCs (REQUIRED field missing).');
    }

    const allLoreEntries: RawLoreEntry[] = [
        ...(charLore?.loreEntries || []),
        ...(locLore?.loreEntries || []),
        ...(factLore?.loreEntries || []),
        ...(itemLore?.loreEntries || []),
        ...(eventLore?.loreEntries || []),
    ];
    console.log(`[${new Date().toISOString()}] generateScenarioNarrativeElementsFlow: Generated ${allLoreEntries.length} raw lore entries.`);


    // --- Final Sanitation Pass ---
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

    questsChaptersResult.quests.forEach(quest => {
        if (quest.rewards?.items) {
            quest.rewards.items.forEach((item, index) => sanitizeItem(item, `item_reward_narrative_${quest.id}`, index));
        }
    });
    npcsResult.trackedNPCs.forEach(npc => {
        npc.knownFacts = npc.knownFacts ?? []; // Ensure knownFacts is an array
        if (npc.merchantInventory) {
            npc.merchantInventory.forEach((item, index) => {
                const merchantItem = sanitizeItem(item, `item_merch_narrative_${npc.id}`, index);
                (merchantItem as any).price = (merchantItem as any).price ?? merchantItem.basePrice;
                if ((merchantItem as any).price < 0) (merchantItem as any).price = 0;
            });
        }
    });


    const output: GenerateScenarioNarrativeElementsOutput = {
      quests: questsChaptersResult.quests,
      chapters: questsChaptersResult.chapters,
      trackedNPCs: npcsResult.trackedNPCs,
      initialLoreEntries: allLoreEntries.filter(entry => entry.keyword && entry.content), // Filter out potentially empty lore entries
    };

    console.log(`[${new Date().toISOString()}] generateScenarioNarrativeElementsFlow: END. Total time: ${Date.now() - flowStartTime}ms`);
    return output;
  }
);

