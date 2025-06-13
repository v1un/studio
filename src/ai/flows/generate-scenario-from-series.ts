
'use server';

/**
 * @fileOverview This file contains Genkit flows for generating:
 * 1. Scenario Foundation: Character, scene, core world details, initial items, plot summary, style guide. (generateScenarioFoundation)
 * 2. Scenario Narrative Elements: Quests, story arcs, NPCs, and lore entries. (generateScenarioNarrativeElements)
 * It exports two main functions.
 */

import { ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME } from '@/ai/genkit';
import { z } from 'zod';
import type { EquipmentSlot, Item as ItemType, CharacterProfile, Skill as SkillType, ItemRarity, ActiveEffect as ActiveEffectType, StatModifier as StatModifierType, Quest as QuestType, NPCProfile as NPCProfileType, StoryArc as StoryArcType, RawLoreEntry, TemporaryEffect } from '@/types/story';
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
  duration: z.union([z.string().describe("Use 'permanent_while_equipped' for ongoing effects from gear."), z.number().int().describe("Number of turns effect lasts (for consumables, should be positive).")]).optional().describe("Duration of the effect. Use 'permanent_while_equipped' for ongoing effects from gear. Use a positive integer (representing turns) for temporary effects from consumables."),
  statModifiers: z.array(Foundation_StatModifierSchemaInternal).optional(),
  sourceItemId: z.string().optional(),
});

const Foundation_ItemSchemaInternal = z.object({
  id: z.string().describe("REQUIRED."),
  name: z.string().describe("REQUIRED."),
  description: z.string().describe("REQUIRED."),
  equipSlot: EquipSlotEnumInternal.optional(),
  isConsumable: z.boolean().optional(),
  effectDescription: z.string().optional().describe("Narrative description of simple consumable effects. Prefer 'activeEffects' for mechanical buffs."),
  isQuestItem: z.boolean().optional(),
  relevantQuestId: z.string().optional(),
  basePrice: z.number().optional().describe("MUST BE a number if provided."),
  rarity: Foundation_ItemRarityEnumInternal.optional(),
  activeEffects: z.array(Foundation_ActiveEffectSchemaInternal).optional().describe("Structured active effects. For gear, duration: 'permanent_while_equipped'. For consumables, provide numeric duration (turns, must be positive)."),
});

const Foundation_SkillSchemaInternal = z.object({
    id: z.string().describe("REQUIRED."),
    name: z.string().describe("REQUIRED."),
    description: z.string().describe("REQUIRED."),
    type: z.string().describe("REQUIRED.")
});

const Foundation_TemporaryEffectSchemaInternal = Foundation_ActiveEffectSchemaInternal.extend({
    turnsRemaining: z.number().int().describe("REQUIRED. Number of turns remaining for this effect (must be non-negative)."),
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
  experienceToNextLevel: z.number().describe("REQUIRED. Number (must be >0)."),
  currency: z.number().optional().describe("Number if provided."),
  languageReading: z.number().optional().describe("Number (0-100) if provided."),
  languageSpeaking: z.number().optional().describe("Number (0-100) if provided."),
});

const Foundation_CharacterProfileSchemaInternal = Foundation_CharacterCoreProfileSchemaInternal.extend({
    skillsAndAbilities: z.array(Foundation_SkillSchemaInternal).optional(),
    activeTemporaryEffects: z.array(Foundation_TemporaryEffectSchemaInternal).optional().default([]).describe("Typically empty at start. Managed by game logic."),
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
  characterProfile: Foundation_CharacterProfileSchemaInternal.describe("REQUIRED. Ensure all nested required fields (name, class, health, etc.) are present. 'activeTemporaryEffects' MUST be an empty array."),
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
    mainGear: z.array(Foundation_ItemSchemaInternal).optional().describe("Alternative format for main gear items."),
});
const Foundation_InitialSecondaryGearOutputSchema = z.object({
    head: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
    legs: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
    feet: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
    hands: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
    secondaryGear: z.array(Foundation_ItemSchemaInternal).optional().describe("Alternative format for secondary gear items."),
});
const Foundation_InitialAccessoryGearOutputSchema = z.object({
    neck: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
    ring1: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
    ring2: Foundation_ItemSchemaInternal.nullable().describe("Item or null. If item, needs id, name, description."),
    accessoryGear: z.array(Foundation_ItemSchemaInternal).optional().describe("Alternative format for accessory gear items."),
});

// ===== SCHEMA DEFINITIONS FOR NEW GRANULAR FLOWS =====
// Moving these schemas here so they can be used by the new flow definitions

const Narrative_QuestStatusEnumInternal = z.enum(['active', 'completed', 'failed']);

const Narrative_QuestObjectiveSchemaInternal = z.object({
  id: z.string().describe("REQUIRED."),
  description: z.string().describe("REQUIRED."),
  isCompleted: z.boolean().describe("REQUIRED."),
  updatedAt: z.string().optional(),
});

const Narrative_ItemSchemaInternal = z.object({
  id: z.string().describe("REQUIRED."),
  name: z.string().describe("REQUIRED."),
  description: z.string().describe("REQUIRED."),
  basePrice: z.number().describe("REQUIRED. MUST BE a number."),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).optional(),
  equipSlot: EquipSlotEnumInternal.optional(),
  activeEffects: z.array(z.object({
    id: z.string().describe("REQUIRED."),
    name: z.string().describe("REQUIRED."),
    description: z.string().describe("REQUIRED."),
    type: z.enum(['stat_modifier', 'temporary_ability', 'passive_aura']).describe("REQUIRED."),
    statModifiers: z.array(z.object({
      stat: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'maxHealth', 'maxMana', 'health', 'mana', 'level', 'experiencePoints', 'currency', 'languageReading', 'languageSpeaking']).describe("REQUIRED."),
      value: z.number().describe("REQUIRED. MUST BE a number."),
      type: z.enum(['add', 'multiply']).describe("REQUIRED."),
    })).optional(),
    duration: z.number().optional().describe("MUST BE a positive number if provided."),
  })).optional(),
});

const Narrative_QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("MUST BE a number if provided."),
  items: z.array(Narrative_ItemSchemaInternal).optional(),
  currency: z.number().optional().describe("MUST BE a number if provided."),
});

const Narrative_QuestSchemaInternal = z.object({
  id: z.string().describe("REQUIRED."),
  title: z.string().optional().describe("REQUIRED if no detailed description provided."),
  description: z.string().describe("REQUIRED."),
  type: z.enum(['main', 'side', 'dynamic', 'arc_goal']).describe("REQUIRED."),
  status: Narrative_QuestStatusEnumInternal.describe("REQUIRED."),
  storyArcId: z.string().optional().describe("ID of the Story Arc this quest belongs to. REQUIRED for 'main' quests."),
  orderInStoryArc: z.number().optional().describe("Sequence within the Story Arc. REQURIED for 'main' quests."),
  category: z.string().optional(),
  objectives: z.array(Narrative_QuestObjectiveSchemaInternal).optional(),
  rewards: Narrative_QuestRewardsSchemaInternal.optional(),
  updatedAt: z.string().optional(),
});

// Moved to top of file to avoid initialization errors

const Narrative_StoryArcSchemaInternal = z.object({
    id: z.string().describe("REQUIRED."),
    title: z.string().describe("REQUIRED."),
    description: z.string().describe("REQUIRED."),
    order: z.number().describe("REQUIRED."),
    mainQuestIds: z.array(z.string()).describe("REQUIRED (can be empty for outlined story arcs)."),
    isCompleted: z.boolean().describe("REQUIRED."),
    unlockConditions: z.array(z.string()).optional().describe("Array of narrative conditions. For critical path arcs, prefer simpler, achievable conditions. E.g., ['Previous_arc_completed', 'Player_reached_Capital_City']. For optional/side arcs, conditions can be more specific. These are textual suggestions, not mechanically enforced yet."),
});

const Narrative_NPCDialogueEntrySchemaInternal = z.object({
    playerInput: z.string().optional(),
    npcResponse: z.string().describe("REQUIRED."),
    turnId: z.string().describe("REQUIRED."),
});

const Narrative_MerchantItemSchemaInternal = Narrative_ItemSchemaInternal.extend({
  price: z.number().optional().describe("MUST BE a number if provided."),
});

const Narrative_NPCProfileSchemaInternal = z.object({
    id: z.string().describe("REQUIRED."),
    name: z.string().describe("REQUIRED."),
    description: z.string().describe("REQUIRED."),
    classOrRole: z.string().optional(),
    health: z.number().optional().describe("Number if provided."),
    maxHealth: z.number().optional().describe("Number if provided."),
    mana: z.number().optional().describe("Number if provided."),
    maxMana: z.number().optional().describe("Number if provided."),
    firstEncounteredLocation: z.string().optional(),
    firstEncounteredTurnId: z.string().optional(),
    relationshipStatus: z.number().describe("REQUIRED. Number. This MUST be set according to the player character's canonical relationship within the series (e.g., hostile for enemies, allied for friends)."),
    knownFacts: z.array(z.string()).describe("REQUIRED (can be empty array)."),
    dialogueHistory: z.array(Narrative_NPCDialogueEntrySchemaInternal).optional(),
    lastKnownLocation: z.string().optional(),
    lastSeenTurnId: z.string().optional(),
    seriesContextNotes: z.string().optional(),
    shortTermGoal: z.string().optional(),
    updatedAt: z.string().optional(),
    isMerchant: z.boolean().optional(),
    merchantInventory: z.array(Narrative_MerchantItemSchemaInternal).optional().describe("Items should include 'activeEffects' with numeric 'duration' (must be positive) for consumables."),
    buysItemTypes: z.array(z.string()).optional(),
    sellsItemTypes: z.array(z.string()).optional(),
});

const ScenarioNarrative_RawLoreEntryZodSchema = z.object({
  keyword: z.string().describe("REQUIRED."),
  content: z.string().describe("REQUIRED."),
  category: z.string().optional(),
});

// Additional schemas for the new granular flows
const Foundation_StyleGuideInputSchema = z.object({
  seriesName: z.string(),
});

const Foundation_StyleGuideOutputSchema = z.object({
  styleGuide: z.string().describe("REQUIRED."),
});

const Foundation_SeriesPlotSummaryInputSchema = z.object({
  seriesName: z.string(),
  characterNameInput: z.string().optional(),
  usePremiumAI: z.boolean(),
});

const Foundation_SeriesPlotSummaryOutputSchema = z.object({
  plotSummary: z.string().describe("REQUIRED."),
});

// ===== NARRATIVE SCHEMAS (moved here to avoid initialization errors) =====

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
  duration: z.union([z.string().describe("Use 'permanent_while_equipped' for ongoing effects from gear."), z.number().int().describe("Number of turns effect lasts (for consumables, should be positive).")]).optional().describe("Duration of the effect. Use 'permanent_while_equipped' for ongoing effects from gear. Use a positive integer (representing turns) for temporary effects from consumables."),
  statModifiers: z.array(Narrative_StatModifierSchemaInternal).optional(),
  sourceItemId: z.string().optional(),
});

// Duplicate schema removed - already defined at the top of the file

const Narrative_SkillSchemaInternal = z.object({
    id: z.string().describe("REQUIRED."),
    name: z.string().describe("REQUIRED."),
    description: z.string().describe("REQUIRED."),
    type: z.string().describe("REQUIRED.")
});

const Narrative_TemporaryEffectSchemaInternal = Narrative_ActiveEffectSchemaInternal.extend({
    turnsRemaining: z.number().int().describe("REQUIRED. Number of turns remaining for this effect (must be non-negative)."),
});

const Narrative_CharacterProfileSchemaForInput = z.object({
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
  activeTemporaryEffects: z.array(Narrative_TemporaryEffectSchemaInternal).optional(),
});

const LoreBaseInputSchema = z.object({
  seriesName: z.string(),
  seriesPlotSummary: z.string(),
  characterProfile: Foundation_CharacterCoreProfileSchemaInternal,
  sceneDescription: z.string(),
  currentLocation: z.string(),
});

const LoreOutputSchema = z.object({
  loreEntries: z.array(ScenarioNarrative_RawLoreEntryZodSchema).describe("REQUIRED. Each entry needs keyword, content."),
});

const InitialQuestsAndStoryArcsInputSchema = z.object({
  seriesName: z.string(),
  seriesPlotSummary: z.string(),
  characterProfile: Foundation_CharacterCoreProfileSchemaInternal,
  sceneDescription: z.string(),
  currentLocation: z.string(),
  characterNameInput: z.string().optional(),
});

const InitialQuestsAndStoryArcsOutputSchema = z.object({
  quests: z.array(Narrative_QuestSchemaInternal).describe("REQUIRED. Each quest needs id, description, type, status, storyArcId, orderInStoryArc."),
  storyArcs: z.array(Narrative_StoryArcSchemaInternal).describe("REQUIRED. Each story arc needs id, title, description, order, mainQuestIds, isCompleted, and optional unlockConditions (array of strings)."),
});

const InitialTrackedNPCsInputSchema = z.object({
  seriesName: z.string(),
  seriesPlotSummary: z.string(),
  characterProfile: Foundation_CharacterCoreProfileSchemaInternal,
  sceneDescription: z.string(),
  currentLocation: z.string(),
});

const InitialTrackedNPCsOutputSchema = z.object({
  trackedNPCs: z.array(Narrative_NPCProfileSchemaInternal).describe("REQUIRED. Each NPC needs id, name, description, relationshipStatus, knownFacts."),
});
const Foundation_InitialWorldFactsOutputSchema = z.object({
    worldFacts: z.array(z.string()).describe("REQUIRED (can be empty array)."),
});

// Duplicate schemas removed - these are already defined at the top of the file

// Schema moved to top of file

export async function generateScenarioFoundation(input: GenerateScenarioFoundationInput): Promise<GenerateScenarioFoundationOutput> {
  return foundationFlow(input);
}

// ===== NEW GRANULAR PHASE FUNCTIONS =====

// Phase 1: Character & Scene Creation
export type GenerateCharacterAndSceneInput = {
  seriesName: string;
  characterNameInput?: string;
  characterClassInput?: string;
  usePremiumAI: boolean;
};

export type GenerateCharacterAndSceneOutput = {
  sceneDescription: string;
  characterProfile: CharacterProfile;
  currentLocation: string;
  seriesStyleGuide: string;
  seriesPlotSummary: string;
};

export async function generateCharacterAndScene(input: GenerateCharacterAndSceneInput): Promise<GenerateCharacterAndSceneOutput> {
  return characterAndSceneFlow(input);
}

// Phase 2: Character Skills & Abilities
export type GenerateCharacterSkillsInput = {
  seriesName: string;
  characterProfile: CharacterProfile;
  sceneDescription: string;
  currentLocation: string;
  usePremiumAI: boolean;
};

export type GenerateCharacterSkillsOutput = {
  updatedCharacterProfile: CharacterProfile;
};

export async function generateCharacterSkills(input: GenerateCharacterSkillsInput): Promise<GenerateCharacterSkillsOutput> {
  return characterSkillsFlow(input);
}

// Phase 3: Items & Equipment
export type GenerateItemsAndEquipmentInput = {
  seriesName: string;
  characterProfile: CharacterProfile;
  sceneDescription: string;
  currentLocation: string;
  usePremiumAI: boolean;
};

export type GenerateItemsAndEquipmentOutput = {
  inventory: ItemType[];
  equippedItems: Required<Record<EquipmentSlot, ItemType | null>>;
};

export async function generateItemsAndEquipment(input: GenerateItemsAndEquipmentInput): Promise<GenerateItemsAndEquipmentOutput> {
  return itemsAndEquipmentFlow(input);
}

// Phase 4: World Facts & Lore Foundation
export type GenerateWorldFactsInput = {
  seriesName: string;
  characterProfile: CharacterProfile;
  sceneDescription: string;
  currentLocation: string;
  usePremiumAI: boolean;
};

export type GenerateWorldFactsOutput = {
  worldFacts: string[];
};

export async function generateWorldFacts(input: GenerateWorldFactsInput): Promise<GenerateWorldFactsOutput> {
  return worldFactsFlow(input);
}

// Phase 5: Quests & Story Arcs
export type GenerateQuestsAndArcsInput = {
  seriesName: string;
  seriesPlotSummary: string;
  characterProfile: CharacterProfile;
  sceneDescription: string;
  currentLocation: string;
  characterNameInput?: string;
  usePremiumAI: boolean;
};

export type GenerateQuestsAndArcsOutput = {
  quests: QuestType[];
  storyArcs: StoryArcType[];
};

export async function generateQuestsAndArcs(input: GenerateQuestsAndArcsInput): Promise<GenerateQuestsAndArcsOutput> {
  return questsAndArcsFlow(input);
}

// Phase 6: NPCs & Lore Entries
export type GenerateNPCsAndLoreInput = {
  seriesName: string;
  seriesPlotSummary: string;
  characterProfile: CharacterProfile;
  sceneDescription: string;
  currentLocation: string;
  usePremiumAI: boolean;
};

export type GenerateNPCsAndLoreOutput = {
  trackedNPCs: NPCProfileType[];
  initialLoreEntries: RawLoreEntry[];
};

export async function generateNPCsAndLore(input: GenerateNPCsAndLoreInput): Promise<GenerateNPCsAndLoreOutput> {
  return npcsAndLoreFlow(input);
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
    // General model config for this flow
    const generalModelConfig = { maxOutputTokens: mainInput.usePremiumAI ? 32000 : 8000 };
    // Specific, potentially larger, config for plot summary when premium is used
    const plotSummaryModelConfig = mainInput.usePremiumAI
        ? { maxOutputTokens: 32000 }
        : { maxOutputTokens: 8000 };

    let step1StartTime = Date.now();
    console.log(`[${new Date(step1StartTime).toISOString()}] generateScenarioFoundationFlow: STEP 1 - Starting Initial Parallel Batch (Character/Scene, Style Guide, Plot Summary).`);

    // Import generic templates and series adapter
    const { adaptPromptForSeries } = await import("@/lib/series-adapter");
    const { GENERIC_CHARACTER_FOUNDATION_TEMPLATE, GENERIC_DETAILED_SCENE_TEMPLATE } = await import("@/ai/prompts/generic-templates");

    const basePrompt = `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_CharacterAndSceneOutputSchema'. ALL REQUIRED fields (sceneDescription, characterCore, currentLocation AND nested required fields in characterCore like name, class, description, health, maxHealth, level, experiencePoints, experienceToNextLevel) MUST be present.

You are a master storyteller and canon expert for "{{seriesName}}".

${GENERIC_CHARACTER_FOUNDATION_TEMPLATE}

${GENERIC_DETAILED_SCENE_TEMPLATE}

INTEGRATION REQUIREMENTS:
- Create a sceneDescription that follows the HIGH-QUALITY NARRATIVE SCENE GENERATION guidelines
- Include granular sensory details (sight, sound, smell, touch, taste where relevant)
- Build moment-by-moment progression that creates engagement
- Establish character psychology through actions and internal thoughts
- Create environmental atmosphere that enhances immersion
- Set up natural relationship development opportunities`;

    const adaptedPrompt = adaptPromptForSeries(basePrompt, input.seriesName);

    const foundation_characterAndScenePrompt = ai.definePrompt({
        name: 'foundation_characterAndScenePrompt', model: modelName, input: { schema: Foundation_CharacterAndSceneInputSchema }, output: { schema: Foundation_CharacterAndSceneOutputSchema }, config: generalModelConfig,
        prompt: adaptedPrompt
User character: Name: {{#if characterNameInput}}{{characterNameInput}}{{else}}(Not provided){{/if}}, Class: {{#if characterClassInput}}{{characterClassInput}}{{else}}(Not provided){{/if}}.
Generate 'sceneDescription', 'characterCore', 'currentLocation'.
'characterCore': Authentically create profile. Include name, class, description. Health/MaxHealth (numbers). Mana/MaxMana (numbers, 0 if not applicable). Stats (5-15, numbers). Level 1, 0 XP, XPToNextLevel (numbers, must be >0). Currency (number).
'languageReading' & 'languageSpeaking' (numbers, 0-100):
  - Consider the character's canonical abilities and background. Examples: For transported characters with translation abilities (like Subaru in Re:Zero), set 'languageSpeaking' to 100 and 'languageReading' to 0, mentioning the translation ability in description. For native characters, typically 100 for both. For characters with language barriers, set appropriately low values.
  - The character description MUST reflect any language barriers or special language abilities.
'currentLocation': Specific series starting location.
The 'sceneDescription' should be vivid and set the stage. CRUCIALLY, it MUST conclude with a clear, immediate hook to prompt the player's first action. This could be a question directed at the player (e.g., 'What is the first thing you do?', 'You notice X, what's your reaction?'), a minor event they witness (e.g., 'Suddenly, a figure bumps into you.'), or an interaction initiated by a nearby element (e.g., 'A nearby vendor calls out to you, "New in town, eh?"').
Output ONLY the JSON. Strictly adhere to Foundation_CharacterAndSceneOutputSchema and all its REQUIRED fields.`,
    });
    const foundation_styleGuidePrompt = ai.definePrompt({
        name: 'foundation_generateSeriesStyleGuidePrompt', model: modelName, input: { schema: Foundation_StyleGuideInputSchema }, output: { schema: z.string().nullable() }, config: {maxOutputTokens: 500}, // Short
        prompt: `For "{{seriesName}}", provide a 2-3 sentence summary of key themes/tone. If unable, output an empty string (""). Output ONLY the summary string or empty string.`,
    });
    const foundation_seriesPlotSummaryPrompt = ai.definePrompt({
        name: 'foundation_generateSeriesPlotSummaryPrompt', model: modelName, input: { schema: Foundation_SeriesPlotSummaryInputSchema }, output: { schema: Foundation_SeriesPlotSummaryOutputSchema }, config: plotSummaryModelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_SeriesPlotSummaryOutputSchema'. The 'plotSummary' field is REQUIRED.
For "{{seriesName}}"{{#if characterNameInput}} (character: "{{characterNameInput}}"){{/if}}, provide 'plotSummary': An **extremely comprehensive and exhaustive** summary of the **entire known storyline** for "{{seriesName}}", from the **absolute beginning to the most recent known point in the canon**. This MUST cover **all major and minor story arcs**, all pivotal plot points, significant and subtle character developments for **all key main and supporting characters**, details about major and minor antagonists, all critical lore reveals (including world-building, magic systems, historical events), and all world-altering events. Structure the summary chronologically, ideally breaking it down by distinct, named story arcs from the series. **Utilize your available token budget to be as detailed and thorough as possible within a single summary string.** This summary is the canonical backbone for the entire game's narrative.
Output ONLY JSON for Foundation_SeriesPlotSummaryOutputSchema. Do not include any other conversational text.`,
    });

    let charSceneResult, styleGuideResult, seriesPlotSummaryResult;
    try {
        [charSceneResult, styleGuideResult, seriesPlotSummaryResult] = await Promise.all([
            foundation_characterAndScenePrompt({ seriesName: mainInput.seriesName, characterNameInput: mainInput.characterNameInput, characterClassInput: mainInput.characterClassInput, usePremiumAI: mainInput.usePremiumAI }),
            foundation_styleGuidePrompt({ seriesName: mainInput.seriesName }),
            foundation_seriesPlotSummaryPrompt({ seriesName: mainInput.seriesName, characterNameInput: mainInput.characterNameInput, usePremiumAI: mainInput.usePremiumAI })
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
    characterCore.languageReading = characterCore.languageReading ?? 100; // Default if AI forgets
    characterCore.languageSpeaking = characterCore.languageSpeaking ?? 100; // Default if AI forgets


    let step2StartTime = Date.now();
    console.log(`[${new Date(step2StartTime).toISOString()}] generateScenarioFoundationFlow: STEP 2 - Calling foundation_initialCharacterSkillsPrompt.`);
    const foundation_initialCharacterSkillsPrompt = ai.definePrompt({
        name: 'foundation_initialCharacterSkillsPrompt', model: modelName, input: { schema: Foundation_InitialCharacterSkillsInputSchema }, output: { schema: Foundation_InitialCharacterSkillsOutputSchema }, config: generalModelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object. If 'skillsAndAbilities' are provided, each skill MUST have a unique 'id', 'name', 'description', and 'type'.
For "{{seriesName}}" character: Name: {{characterName}}, Class: {{characterClass}}, Desc: {{characterDescription}}.
Generate ONLY 'skillsAndAbilities': Array of 2-3 starting skills.
Include signature abilities appropriate to the character and series (e.g., "Return by Death" and "World's Welcome Gift" for Subaru in Re:Zero). Ensure skills match the character's background and avoid generic skills that don't fit their established nature.
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
    const fullCharacterProfile: CharacterProfile = {
        ...characterCore,
        skillsAndAbilities: characterSkills,
        activeTemporaryEffects: [], // Initialize empty array
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
        name: 'foundation_initialInventoryPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialInventoryOutputSchema }, config: generalModelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_InitialInventoryOutputSchema'. The 'inventory' array is REQUIRED (can be empty). Each item MUST have 'id', 'name', 'description'. 'basePrice' (number) is optional.
For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'inventory': 0-3 unequipped items. Include optional 'rarity'. For consumables, 'activeEffects' may define temporary buffs with numeric 'duration' (turns, must be positive). 'equipSlot' if equippable, OMITTED otherwise.
For characters transported from other worlds (e.g., Natsuki Subaru in Re:Zero arriving from modern Earth), initial inventory should reflect what they had on them when transported (e.g., a cell phone, snacks, wallet). For native characters, inventory should match their background and preparation level.
Output ONLY { "inventory": [...] }. Ensure all REQUIRED fields for items are present. Ensure IDs are unique.`,
    });
    const foundation_initialMainGearPrompt = ai.definePrompt({
        name: 'foundation_initialMainGearPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialMainGearOutputSchema }, config: generalModelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_InitialMainGearOutputSchema'. Each item ('weapon', 'shield', 'body') or null is REQUIRED. If an item, it MUST have 'id', 'name', 'description'.
For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'weapon', 'shield', 'body' equipped items (or null). Include 'basePrice' (number), optional 'rarity', 'equipSlot'. 'activeEffects' should have 'duration: "permanent_while_equipped"'.
For unprepared characters (e.g., Natsuki Subaru in Re:Zero arriving from modern Earth), main gear slots ('weapon', 'shield', 'body') should typically be \`null\`. For prepared adventurers, include appropriate starting gear.
Output ONLY { "weapon": ..., "shield": ..., "body": ... }. Ensure all REQUIRED fields for items are present if an item is generated. Ensure IDs are unique.`,
    });
    const foundation_initialSecondaryGearPrompt = ai.definePrompt({
        name: 'foundation_initialSecondaryGearPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialSecondaryGearOutputSchema }, config: generalModelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_InitialSecondaryGearOutputSchema'. Each item ('head', 'legs', 'feet', 'hands') or null is REQUIRED. If an item, it MUST have 'id', 'name', 'description'.
For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'head', 'legs', 'feet', 'hands' equipped items (or null). Include 'basePrice' (number), optional 'rarity', 'equipSlot'. 'activeEffects' should have 'duration: "permanent_while_equipped"'.
For unprepared characters (e.g., Natsuki Subaru in Re:Zero), secondary gear slots should typically be \`null\` unless the series canonically provides specific starting gear.
Output ONLY { "head": ..., "legs": ..., "feet": ..., "hands": ... }. Ensure all REQUIRED fields for items are present if an item is generated. Ensure IDs are unique.`,
    });
    const foundation_initialAccessoryGearPrompt = ai.definePrompt({
        name: 'foundation_initialAccessoryGearPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialAccessoryGearOutputSchema }, config: generalModelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_InitialAccessoryGearOutputSchema'. Each item ('neck', 'ring1', 'ring2') or null is REQUIRED. If an item, it MUST have 'id', 'name', 'description'.
For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'neck', 'ring1', 'ring2' equipped items (or null). Include 'basePrice' (number), optional 'rarity', 'equipSlot'. 'activeEffects' should have 'duration: "permanent_while_equipped"'.
For most starting characters (e.g., Natsuki Subaru in Re:Zero), these accessory slots should typically be \`null\` unless the character canonically starts with specific accessories.
Output ONLY { "neck": ..., "ring1": ..., "ring2": ... }. Ensure all REQUIRED fields for items are present if an item is generated. Ensure IDs are unique.`,
    });
    const foundation_initialWorldFactsPrompt = ai.definePrompt({
        name: 'foundation_initialWorldFactsPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialWorldFactsOutputSchema }, config: generalModelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_InitialWorldFactsOutputSchema'. The 'worldFacts' array is REQUIRED (can be empty).
For "{{seriesName}}" (Char: {{character.name}} - Desc: {{character.description}}, Reading: {{character.languageReading}}/100, Speaking: {{character.languageSpeaking}}/100, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'worldFacts': 3-5 key facts.
If the character description or language skills (languageReading: {{character.languageReading}}, languageSpeaking: {{character.languageSpeaking}}) indicate illiteracy, one fact MUST state "Character {{character.name}} cannot read local script."
If the character description or language skills indicate inability to speak/understand the local language (and they are not also illiterate), one fact MUST state "Character {{character.name}} cannot understand/speak the local language."
If both reading and speaking are 0 or described as such, facts reflecting both barriers are appropriate.
If both reading and speaking are 100 and the description implies no barriers, no specific language barrier facts are needed unless a canonical plot point dictates it.
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
    const foundationUsedIds = new Set<string>();
    const sanitizeFoundationItem = (item: Partial<ItemType>, prefix: string, index: number | string = '') => {
        // Generate unique ID if missing or duplicate
        if (!item.id || item.id.trim() === "" || foundationUsedIds.has(item.id)) {
            let newId: string;
            do {
                newId = `${prefix}_${Date.now()}_${index}_${Math.random().toString(36).substring(2,7)}`;
            } while (foundationUsedIds.has(newId));
            item.id = newId;
        }
        foundationUsedIds.add(item.id);

        item.name = item.name || "Unnamed Item";
        item.description = item.description || "No description.";
        item.basePrice = item.basePrice ?? 0;
        if (item.basePrice < 0) item.basePrice = 0;
        if (item.rarity === undefined) delete item.rarity;
        item.activeEffects = item.activeEffects ?? [];
        item.activeEffects.forEach((effect: Partial<ActiveEffectType>, effIdx: number) => {
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
            if (typeof effect.duration === 'number' && effect.duration <= 0) effect.duration = 1; // Ensure positive duration if numeric
            else if (item.equipSlot && !item.isConsumable) effect.duration = 'permanent_while_equipped'; // Default for equippables
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

// ===== GRANULAR PHASE FLOW IMPLEMENTATIONS =====

// Phase 1: Character & Scene Flow
const characterAndSceneFlow = ai.defineFlow(
  {
    name: 'characterAndSceneFlow',
    inputSchema: z.object({
      seriesName: z.string(),
      characterNameInput: z.string().optional(),
      characterClassInput: z.string().optional(),
      usePremiumAI: z.boolean(),
    }),
    outputSchema: z.object({
      sceneDescription: z.string(),
      characterProfile: Foundation_CharacterCoreProfileSchemaInternal,
      currentLocation: z.string(),
      seriesStyleGuide: z.string(),
      seriesPlotSummary: z.string(),
    }),
  },
  async (input: GenerateCharacterAndSceneInput): Promise<GenerateCharacterAndSceneOutput> => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] characterAndSceneFlow: START for Series: ${input.seriesName}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const generalModelConfig = { maxOutputTokens: input.usePremiumAI ? 16000 : 4000 };
    const plotSummaryModelConfig = input.usePremiumAI ? { maxOutputTokens: 16000 } : { maxOutputTokens: 4000 };

    // Import enhanced templates
    const { adaptPromptForSeries } = await import("@/lib/series-adapter");
    const { GENERIC_CHARACTER_FOUNDATION_TEMPLATE, GENERIC_DETAILED_SCENE_TEMPLATE } = await import("@/ai/prompts/generic-templates");

    // Build enhanced prompt with detailed scene generation
    const basePrompt = `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_CharacterAndSceneOutputSchema'. ALL REQUIRED fields (sceneDescription, characterCore, currentLocation AND nested required fields in characterCore like name, class, description, health, maxHealth, level, experiencePoints, experienceToNextLevel) MUST be present.

You are a master storyteller and canon expert for "{{seriesName}}".

${GENERIC_CHARACTER_FOUNDATION_TEMPLATE}

${GENERIC_DETAILED_SCENE_TEMPLATE}

INTEGRATION REQUIREMENTS:
- Create a sceneDescription that follows the HIGH-QUALITY NARRATIVE SCENE GENERATION guidelines
- Include granular sensory details (sight, sound, smell, touch, taste where relevant)
- Build moment-by-moment progression that creates engagement
- Establish character psychology through actions and internal thoughts
- Create environmental atmosphere that enhances immersion
- Set up natural relationship development opportunities

Your task is to create an authentic character and opening scene that strictly adheres to the series' established lore, world rules, and character archetypes.`;

    const adaptedPrompt = adaptPromptForSeries(basePrompt, input.seriesName);

    // Define prompts with enhanced templates
    const foundation_characterAndScenePrompt = ai.definePrompt({
        name: 'foundation_characterAndScenePrompt', model: modelName, input: { schema: Foundation_CharacterAndSceneInputSchema }, output: { schema: Foundation_CharacterAndSceneOutputSchema }, config: generalModelConfig,
        prompt: adaptedPrompt + `

User character: Name: {{#if characterNameInput}}{{characterNameInput}}{{else}}(Not provided){{/if}}, Class: {{#if characterClassInput}}{{characterClassInput}}{{else}}(Not provided){{/if}}.
Generate 'sceneDescription', 'characterCore', 'currentLocation'.`

**CANON COMPLIANCE REQUIREMENTS:**
- Respect ALL established world rules, magic systems, political structures, and cultural norms from the original series
- Ensure character abilities and limitations align with the series' power scaling and established mechanics
- Maintain consistency with the series' tone, themes, and narrative style
- Consider the character's starting point in the series timeline and their canonical knowledge/relationships at that moment

Generate: sceneDescription (following the detailed scene generation guidelines above), characterCore (complete profile with appropriate starting conditions), currentLocation (specific canonical place name).
Output ONLY JSON for Foundation_CharacterAndSceneOutputSchema. Do not include any other conversational text.`,
    });

    const foundation_styleGuidePrompt = ai.definePrompt({
        name: 'foundation_styleGuidePrompt', model: modelName, input: { schema: Foundation_StyleGuideInputSchema }, output: { schema: Foundation_StyleGuideOutputSchema }, config: generalModelConfig,
        prompt: `You are a literary analyst and expert on "{{seriesName}}". Create a comprehensive style guide that captures the essence of this series' storytelling approach.

**NARRATIVE TONE & ATMOSPHERE:**
- Analyze the series' overall emotional tone (dark, hopeful, comedic, dramatic, etc.)
- Identify the primary mood and atmosphere that permeates the series
- Note how tension and pacing are typically handled
- Describe the balance between serious and lighter moments

**DIALOGUE STYLE & CHARACTER VOICE:**
- Examine how characters speak and express themselves in the original series
- Note any distinctive speech patterns, formality levels, or linguistic quirks
- Identify how dialogue reveals character personality and relationships
- Describe the balance between exposition and natural conversation

**THEMATIC ELEMENTS & CORE MESSAGES:**
- Identify the central themes and philosophical questions the series explores
- Note recurring motifs, symbols, and metaphors
- Describe how the series handles moral complexity and character growth
- Identify what makes this series unique in its genre

**NARRATIVE STRUCTURE & STORYTELLING APPROACH:**
- Analyze how the series typically structures its story arcs and character development
- Note the pacing preferences (fast-paced action vs slow character development)
- Identify how the series handles world-building and exposition
- Describe the typical relationship between plot and character development

**GENRE CONVENTIONS & UNIQUE ELEMENTS:**
- Identify which genre conventions the series follows or subverts
- Note any unique storytelling techniques or narrative innovations
- Describe how the series balances familiar elements with original concepts
- Identify signature elements that make this series recognizable

Create a detailed style guide that will ensure all generated content maintains authentic consistency with "{{seriesName}}".
Output ONLY JSON for Foundation_StyleGuideOutputSchema. Do not include any other conversational text.`,
    });

    const foundation_seriesPlotSummaryPrompt = ai.definePrompt({
        name: 'foundation_seriesPlotSummaryPrompt', model: modelName, input: { schema: Foundation_SeriesPlotSummaryInputSchema }, output: { schema: Foundation_SeriesPlotSummaryOutputSchema }, config: plotSummaryModelConfig,
        prompt: `You are a comprehensive lore expert for "{{seriesName}}". Create an extensive, detailed plot summary that serves as the foundation for all subsequent content generation.

**CHARACTER CONTEXT:**
Primary character: {{characterNameInput}} (if specified)
- Focus on this character's canonical journey, relationships, and development arc
- Include their starting conditions, abilities, and knowledge state at series beginning
- Detail their major character growth moments and relationship changes

**COMPREHENSIVE PLOT COVERAGE:**
Create a detailed summary covering:

**MAJOR STORY ARCS (in chronological order):**
- Break down the series into distinct narrative arcs with clear beginning/middle/end
- For each arc: main conflict, key events, character introductions, and resolution
- Include approximate timeline and how arcs connect to each other
- Note any parallel storylines or subplots that run alongside main arcs

**KEY CONFLICTS & ANTAGONISTS:**
- Primary conflicts (internal and external) that drive the narrative
- Major antagonists and their motivations, methods, and relationship to protagonists
- Political, social, or cosmic conflicts that shape the world state
- How conflicts evolve and resolve throughout the series

**WORLD STATE & POLITICAL LANDSCAPE:**
- Current political situation, power structures, and governing bodies
- Major factions, organizations, and their relationships/conflicts
- Economic systems, social hierarchies, and cultural dynamics
- Geographic regions and their significance to the overall plot

**CHARACTER DEVELOPMENT PATHS:**
- Major character introductions and their roles in the overarching narrative
- Character relationship dynamics and how they evolve
- Key character growth moments, revelations, and transformations
- Supporting character arcs that intersect with the main storyline

**MAGIC/POWER SYSTEMS & WORLD RULES:**
- Detailed explanation of any supernatural elements, magic systems, or special abilities
- Limitations, costs, and consequences of power usage
- How these systems impact plot development and character capabilities
- Evolution or revelation of power systems throughout the series

**CRITICAL PLOT POINTS & TURNING MOMENTS:**
- Major revelations that change character understanding or world state
- Pivotal battles, confrontations, or dramatic moments
- Character deaths, betrayals, or major relationship changes
- World-changing events that alter the status quo

**THEMATIC PROGRESSION:**
- How central themes develop and are explored throughout the series
- Moral questions and philosophical elements that drive character decisions
- Symbolic elements and their significance to the overall narrative

This summary will be used to generate quests, story arcs, character interactions, and world details. Ensure it provides sufficient depth for creating authentic, canon-compliant content while maintaining logical consistency with established lore.

Output ONLY JSON for Foundation_SeriesPlotSummaryOutputSchema. Do not include any other conversational text.`,
    });

    let charSceneResult, styleGuideResult, seriesPlotSummaryResult;
    try {
        [charSceneResult, styleGuideResult, seriesPlotSummaryResult] = await Promise.all([
            foundation_characterAndScenePrompt({ seriesName: input.seriesName, characterNameInput: input.characterNameInput, characterClassInput: input.characterClassInput, usePremiumAI: input.usePremiumAI }),
            foundation_styleGuidePrompt({ seriesName: input.seriesName }),
            foundation_seriesPlotSummaryPrompt({ seriesName: input.seriesName, characterNameInput: input.characterNameInput, usePremiumAI: input.usePremiumAI })
        ]);
    } catch (e: any) {
        console.error(`[${new Date().toISOString()}] characterAndSceneFlow: FAILED. Error: ${e.message}`);
        throw new Error(`AI failed during character and scene generation. Details: ${e.message}`);
    }

    const sceneDescription = charSceneResult.output.sceneDescription;
    const characterCore = charSceneResult.output.characterCore;
    const currentLocation = charSceneResult.output.currentLocation;
    const seriesStyleGuide = styleGuideResult.output.styleGuide;
    const generatedSeriesPlotSummary = seriesPlotSummaryResult.output.plotSummary;

    // Build full character profile
    const fullCharacterProfile: CharacterProfile = {
        ...characterCore,
        skillsAndAbilities: [], // Will be filled in next phase
        activeTemporaryEffects: [],
    };

    const finalOutput: GenerateCharacterAndSceneOutput = {
      sceneDescription,
      characterProfile: fullCharacterProfile,
      currentLocation,
      seriesStyleGuide,
      seriesPlotSummary: generatedSeriesPlotSummary,
    };

    console.log(`[${new Date().toISOString()}] characterAndSceneFlow: END. Total time: ${Date.now() - flowStartTime}ms`);
    return finalOutput;
  }
);

// Phase 2: Character Skills Flow
const characterSkillsFlow = ai.defineFlow(
  {
    name: 'characterSkillsFlow',
    inputSchema: z.object({
      seriesName: z.string(),
      characterProfile: Foundation_CharacterCoreProfileSchemaInternal,
      sceneDescription: z.string(),
      currentLocation: z.string(),
      usePremiumAI: z.boolean(),
    }),
    outputSchema: z.object({
      updatedCharacterProfile: Foundation_CharacterCoreProfileSchemaInternal,
    }),
  },
  async (input: GenerateCharacterSkillsInput): Promise<GenerateCharacterSkillsOutput> => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] characterSkillsFlow: START for Character: ${input.characterProfile.name}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const generalModelConfig = { maxOutputTokens: input.usePremiumAI ? 8000 : 4000 };

    const foundation_initialCharacterSkillsPrompt = ai.definePrompt({
        name: 'foundation_initialCharacterSkillsPrompt', model: modelName, input: { schema: Foundation_InitialCharacterSkillsInputSchema }, output: { schema: Foundation_InitialCharacterSkillsOutputSchema }, config: generalModelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object. Each skill MUST have a unique 'id', 'name', 'description', and 'type'.

You are a character development expert for "{{seriesName}}". Create starting skills and abilities that are authentic to the series' power systems and character archetypes.

**CONTEXT:**
Character: {{character.name}} ({{character.class}})
Character Background: {{character.description}}
Current Scene: {{sceneDescription}}
Location: {{currentLocation}}

**CANON COMPLIANCE FOR SKILLS:**
- Ensure all skills align with the established power systems and magic rules of "{{seriesName}}"
- Respect the series' power scaling - starting characters should have appropriately limited abilities
- Consider the character's background and how they would have acquired these skills
- Maintain consistency with similar character archetypes from the original series

**STARTING SKILL GUIDELINES:**
Generate 3-5 starting skills/abilities that follow these principles:

**SERIES-SPECIFIC SKILL EXAMPLES:**
Consider the character's canonical abilities and background:
- For characters with signature abilities (e.g., "Return by Death" for Subaru in Re:Zero): Include these defining powers
- For characters with translation abilities (e.g., "World's Welcome Gift" in Re:Zero): Include language-related skills
- For transported modern characters: Include modern world knowledge/perspective skills, avoid generic fantasy skills that don't fit their background
- For native fantasy characters: Include skills appropriate to their class, training, and world
- Always ensure skills match the character's established background and the series' power systems

**SKILL BALANCE:**
- Mix of active abilities and passive traits
- Include both combat and non-combat skills where appropriate
- Balance powerful abilities with meaningful limitations or costs
- Ensure skills complement the character's class and background

**SKILL AUTHENTICITY:**
- Each skill should feel like it belongs in this series' world
- Use terminology and concepts consistent with the series' established lore
- Consider how these skills would be perceived by other characters in the world
- Ensure skill descriptions match the series' tone and style

**PROGRESSION POTENTIAL:**
- Design skills that can grow and evolve as the character develops
- Include hints at advanced techniques or mastery levels
- Consider how skills might combine or interact with future abilities
- Leave room for character growth and learning

**SKILL CATEGORIES TO CONSIDER:**
- Combat abilities (weapon skills, martial techniques, tactical knowledge)
- Magic or supernatural abilities (if applicable to the series)
- Social skills (persuasion, deception, leadership, cultural knowledge)
- Survival skills (navigation, crafting, resource management)
- Knowledge skills (lore, languages, academic subjects)
- Physical abilities (athletics, stealth, perception)

**SKILL STRUCTURE REQUIREMENTS:**
Each skill must include:
- 'id': Unique identifier (use format: "skill_[descriptive_name]")
- 'name': Clear, evocative name that fits the series' naming conventions
- 'description': Detailed explanation of what the skill does, its limitations, and how it manifests
- 'type': Appropriate category (combat, magic, social, survival, knowledge, physical, etc.)

**LIMITATION AWARENESS:**
- Consider the character's starting conditions (no money, limited knowledge, etc.)
- Ensure skills don't contradict the character's inexperience with this world
- Balance competence with room for growth and learning
- Avoid skills that would trivialize early challenges

Create skills that feel authentic to "{{seriesName}}" while providing a solid foundation for character development.
Output ONLY { "skillsAndAbilities": [...] }.`,
    });

    const skillsInput: z.infer<typeof Foundation_InitialCharacterSkillsInputSchema> = {
        seriesName: input.seriesName,
        character: {
            name: input.characterProfile.name,
            class: input.characterProfile.class,
            description: input.characterProfile.description
        },
        sceneDescription: input.sceneDescription,
        currentLocation: input.currentLocation,
    };

    let skillsOutput;
    try {
        const { output } = await foundation_initialCharacterSkillsPrompt(skillsInput);
        skillsOutput = output;
    } catch (e: any) {
        console.error(`[${new Date().toISOString()}] characterSkillsFlow: FAILED. Error: ${e.message}`);
        throw new Error(`AI failed during skills generation. Details: ${e.message}`);
    }

    // Update character profile with skills
    const updatedCharacterProfile: CharacterProfile = {
        ...input.characterProfile,
        skillsAndAbilities: skillsOutput.skillsAndAbilities || [],
        activeTemporaryEffects: [],
    };

    const finalOutput: GenerateCharacterSkillsOutput = {
      updatedCharacterProfile,
    };

    console.log(`[${new Date().toISOString()}] characterSkillsFlow: END. Total time: ${Date.now() - flowStartTime}ms`);
    return finalOutput;
  }
);

// Phase 3: Items & Equipment Flow
const itemsAndEquipmentFlow = ai.defineFlow(
  {
    name: 'itemsAndEquipmentFlow',
    inputSchema: z.object({
      seriesName: z.string(),
      characterProfile: Foundation_CharacterCoreProfileSchemaInternal,
      sceneDescription: z.string(),
      currentLocation: z.string(),
      usePremiumAI: z.boolean(),
    }),
    outputSchema: z.object({
      inventory: z.array(Foundation_ItemSchemaInternal),
      equippedItems: z.record(z.union([Foundation_ItemSchemaInternal, z.null()])),
    }),
  },
  async (input: GenerateItemsAndEquipmentInput): Promise<GenerateItemsAndEquipmentOutput> => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] itemsAndEquipmentFlow: START for Character: ${input.characterProfile.name}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const generalModelConfig = { maxOutputTokens: input.usePremiumAI ? 8000 : 4000 };

    const minimalContextForItemsInput: z.infer<typeof Foundation_MinimalContextForItemsFactsInputSchema> = {
        seriesName: input.seriesName,
        character: {
            name: input.characterProfile.name,
            class: input.characterProfile.class,
            description: input.characterProfile.description,
            currency: input.characterProfile.currency,
            languageReading: input.characterProfile.languageReading,
            languageSpeaking: input.characterProfile.languageSpeaking
        },
        sceneDescription: input.sceneDescription,
        currentLocation: input.currentLocation,
    };

    // Step 1: Generate inventory items first
    const inventoryGenerationPrompt = ai.definePrompt({
        name: 'inventoryGenerationPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialInventoryOutputSchema }, config: generalModelConfig,
        prompt: `You are an inventory specialist for "{{seriesName}}". Create a starting inventory that reflects the character's realistic starting conditions and background.

**CHARACTER CONTEXT:**
Character: {{character.name}} ({{character.class}})
Character Background: {{character.description}}
Current Scene: {{sceneDescription}}
Location: {{currentLocation}}
Currency: {{character.currency}} (starting money)
Language Reading: {{character.languageReading}}/100
Language Speaking: {{character.languageSpeaking}}/100

**SERIES-SPECIFIC EXAMPLES:**
Consider the character's background and how they arrived in this world:
- For transported modern characters (e.g., Subaru in Re:Zero): Include modern items from their previous life (smartphone, wallet, convenience store items), avoid fantasy-specific items
- For native fantasy characters: Include items appropriate to their class, profession, and economic status
- For prepared adventurers: Include basic adventuring supplies appropriate to their preparation level
- For unprepared characters: Focus on personal effects and basic necessities
- Always ensure items match the character's background and circumstances

**INVENTORY GUIDELINES:**
Generate 3-7 unequipped items following these principles:

**ITEM CATEGORIES:**
- Basic consumables (food, water, basic medicines)
- Simple tools (rope, basic knife, flint and steel, etc.)
- Personal effects (letters, mementos, identification if applicable)
- Currency or trade goods (if appropriate to starting conditions)
- Information items (maps, books, notes - considering literacy limitations)
- Modern items (for transported characters)

**ITEM AUTHENTICITY:**
- All items must fit seamlessly within the series' established world and technology level
- Use naming conventions and descriptions consistent with the series' style
- Consider cultural and regional variations in item design and availability
- Ensure items match the series' tone and aesthetic

**ITEM STRUCTURE REQUIREMENTS:**
Each item must include:
- 'id': Unique identifier
- 'name': Clear, series-appropriate name
- 'description': Detailed description including appearance, function, and any special properties
- 'basePrice': Realistic price in the series' currency system
- Optional: 'rarity', 'activeEffects', 'isConsumable'

Create an inventory that provides basic functionality while maintaining authenticity to "{{seriesName}}" and respecting the character's starting limitations.
Output ONLY { "inventory": [...] }.`,
    });

    // Step 2a: Combat equipment (weapon, shield)
    const combatEquipmentPrompt = ai.definePrompt({
        name: 'combatEquipmentPrompt', model: modelName, input: { schema: z.object({
            seriesName: z.string(),
            characterName: z.string(),
            characterDescription: z.string(),
            inventoryContext: z.string()
        }) }, output: { schema: z.object({
            weapon: Foundation_ItemSchemaInternal.nullable(),
            shield: Foundation_ItemSchemaInternal.nullable(),
        }) }, config: generalModelConfig,
        prompt: `Generate combat equipment for "{{seriesName}}" character {{characterName}}.

Character: {{characterDescription}}
Inventory: {{inventoryContext}}

Generate weapon and shield slots:
- weapon: Primary weapon or null
- shield: Shield/off-hand item or null

For unprepared characters (like Subaru in Re:Zero), both should be null.
For adventurers, include appropriate starting gear.

Each item needs: id, name, description, equipSlot, basePrice.

Output ONLY { "weapon": ..., "shield": ... }.`,
    });

    // Step 2b: Armor equipment (head, body, legs, feet, hands)
    const armorEquipmentPrompt = ai.definePrompt({
        name: 'armorEquipmentPrompt', model: modelName, input: { schema: z.object({
            seriesName: z.string(),
            characterName: z.string(),
            characterDescription: z.string(),
            inventoryContext: z.string()
        }) }, output: { schema: z.object({
            head: Foundation_ItemSchemaInternal.nullable(),
            body: Foundation_ItemSchemaInternal.nullable(),
            legs: Foundation_ItemSchemaInternal.nullable(),
            feet: Foundation_ItemSchemaInternal.nullable(),
            hands: Foundation_ItemSchemaInternal.nullable(),
        }) }, config: generalModelConfig,
        prompt: `Generate armor/clothing for "{{seriesName}}" character {{characterName}}.

Character: {{characterDescription}}
Inventory: {{inventoryContext}}

Generate armor slots:
- head: Headgear or null
- body: Chest armor/clothing or null
- legs: Leg protection or null
- feet: Footwear or null
- hands: Hand protection or null

For unprepared characters (like Subaru in Re:Zero), focus on basic clothing.
For adventurers, include appropriate armor.

Each item needs: id, name, description, equipSlot, basePrice.

Output ONLY { "head": ..., "body": ..., "legs": ..., "feet": ..., "hands": ... }.`,
    });

    // Step 2c: Accessory equipment (neck, ring1, ring2)
    const accessoryEquipmentPrompt = ai.definePrompt({
        name: 'accessoryEquipmentPrompt', model: modelName, input: { schema: z.object({
            seriesName: z.string(),
            characterName: z.string(),
            characterDescription: z.string(),
            inventoryContext: z.string()
        }) }, output: { schema: z.object({
            neck: Foundation_ItemSchemaInternal.nullable(),
            ring1: Foundation_ItemSchemaInternal.nullable(),
            ring2: Foundation_ItemSchemaInternal.nullable(),
        }) }, config: generalModelConfig,
        prompt: `Generate accessories for "{{seriesName}}" character {{characterName}}.

Character: {{characterDescription}}
Inventory: {{inventoryContext}}

Generate accessory slots:
- neck: Necklace/amulet or null
- ring1: Ring or null
- ring2: Ring or null

For most starting characters, these should be null.
Only include if character has specific background reason.

Each item needs: id, name, description, equipSlot, basePrice.

Output ONLY { "neck": ..., "ring1": ..., "ring2": ... }.`,
    });

    // Sequential generation: inventory first, then equipment
    console.log(`[${new Date().toISOString()}] itemsAndEquipmentFlow: Step 1 - Generating inventory.`);
    const inventoryGeneration = inventoryGenerationPrompt(minimalContextForItemsInput);

    let inventoryResult;
    try {
      const callStartTime = Date.now();
      const result = await inventoryGeneration;
      console.log(`[${new Date().toISOString()}] itemsAndEquipmentFlow: Step 1 completed in ${Date.now() - callStartTime}ms.`);
      inventoryResult = result.output;
    } catch (e: any) {
      console.error(`[${new Date().toISOString()}] itemsAndEquipmentFlow: Step 1 FAILED. Error: ${e.message}`);
      throw new Error(`AI failed during inventory generation. Details: ${e.message}`);
    }

    const inventory = inventoryResult.inventory || [];

    // Steps 2a-2c: Generate equipment in smaller chunks using inventory context
    console.log(`[${new Date().toISOString()}] itemsAndEquipmentFlow: Step 2 - Generating equipment in phases.`);

    // Create a simple string summary of inventory for context
    const inventoryContext = inventory.length > 0
        ? inventory.map(item => `${item.name}: ${item.description}`).join('; ')
        : 'No inventory items';

    const equipmentInput = {
        seriesName: input.seriesName,
        characterName: input.characterProfile.name,
        characterDescription: input.characterProfile.description,
        inventoryContext: inventoryContext
    };

    // Step 2a: Combat equipment
    console.log(`[${new Date().toISOString()}] itemsAndEquipmentFlow: Step 2a - Generating combat equipment.`);
    let combatResult;
    try {
      const callStartTime = Date.now();
      const result = await combatEquipmentPrompt(equipmentInput);
      console.log(`[${new Date().toISOString()}] itemsAndEquipmentFlow: Step 2a completed in ${Date.now() - callStartTime}ms.`);
      combatResult = result.output;
    } catch (e: any) {
      console.error(`[${new Date().toISOString()}] itemsAndEquipmentFlow: Step 2a FAILED. Error: ${e.message}`);
      throw new Error(`AI failed during combat equipment generation. Details: ${e.message}`);
    }

    // Step 2b: Armor equipment
    console.log(`[${new Date().toISOString()}] itemsAndEquipmentFlow: Step 2b - Generating armor equipment.`);
    let armorResult;
    try {
      const callStartTime = Date.now();
      const result = await armorEquipmentPrompt(equipmentInput);
      console.log(`[${new Date().toISOString()}] itemsAndEquipmentFlow: Step 2b completed in ${Date.now() - callStartTime}ms.`);
      armorResult = result.output;
    } catch (e: any) {
      console.error(`[${new Date().toISOString()}] itemsAndEquipmentFlow: Step 2b FAILED. Error: ${e.message}`);
      throw new Error(`AI failed during armor equipment generation. Details: ${e.message}`);
    }

    // Step 2c: Accessory equipment
    console.log(`[${new Date().toISOString()}] itemsAndEquipmentFlow: Step 2c - Generating accessory equipment.`);
    let accessoryResult;
    try {
      const callStartTime = Date.now();
      const result = await accessoryEquipmentPrompt(equipmentInput);
      console.log(`[${new Date().toISOString()}] itemsAndEquipmentFlow: Step 2c completed in ${Date.now() - callStartTime}ms.`);
      accessoryResult = result.output;
    } catch (e: any) {
      console.error(`[${new Date().toISOString()}] itemsAndEquipmentFlow: Step 2c FAILED. Error: ${e.message}`);
      throw new Error(`AI failed during accessory equipment generation. Details: ${e.message}`);
    }

    // Combine all equipment results
    const rawEquippedItems = {
        weapon: combatResult.weapon,
        shield: combatResult.shield,
        head: armorResult.head,
        body: armorResult.body,
        legs: armorResult.legs,
        feet: armorResult.feet,
        hands: armorResult.hands,
        neck: accessoryResult.neck,
        ring1: accessoryResult.ring1,
        ring2: accessoryResult.ring2,
    };

    // Enhanced item sanitization with unique ID tracking
    const usedIds = new Set<string>();
    const sanitizeItem = (item: Partial<ItemType>, prefix: string, index: number | string = '') => {
        // Generate unique ID if missing or duplicate
        if (!item.id || item.id.trim() === "" || usedIds.has(item.id)) {
            let newId: string;
            do {
                newId = `${prefix}_${Date.now()}_${index}_${Math.random().toString(36).substring(2,7)}`;
            } while (usedIds.has(newId));
            item.id = newId;
        }
        usedIds.add(item.id);

        item.name = item.name || "Unnamed Item";
        item.description = item.description || "No description.";
        item.basePrice = item.basePrice ?? 0;
        if (item.basePrice < 0) item.basePrice = 0;
        item.activeEffects = item.activeEffects ?? [];
        return item as ItemType;
    };

    // Sanitize inventory items
    inventory.forEach((item, idx) => sanitizeItem(item, 'inv', idx));

    // Create equipped items structure with proper slot mapping
    const equippedItems: Required<Record<EquipmentSlot, ItemType | null>> = {
        weapon: null,
        shield: null,
        head: null,
        body: null,
        legs: null,
        feet: null,
        hands: null,
        neck: null,
        ring1: null,
        ring2: null,
    };

    // Process equipped items from the unified result
    Object.keys(rawEquippedItems).forEach(slot => {
        const item = rawEquippedItems[slot as keyof typeof rawEquippedItems];
        if (item) {
            const sanitizedItem = sanitizeItem(item, 'eqp', slot);
            equippedItems[slot as EquipmentSlot] = sanitizedItem;
        }
    });

    const finalOutput: GenerateItemsAndEquipmentOutput = {
      inventory,
      equippedItems,
    };

    console.log(`[${new Date().toISOString()}] itemsAndEquipmentFlow: END. Total time: ${Date.now() - flowStartTime}ms`);
    return finalOutput;
  }
);

// Phase 4: World Facts Flow
const worldFactsFlow = ai.defineFlow(
  {
    name: 'worldFactsFlow',
    inputSchema: z.object({
      seriesName: z.string(),
      characterProfile: Foundation_CharacterCoreProfileSchemaInternal,
      sceneDescription: z.string(),
      currentLocation: z.string(),
      usePremiumAI: z.boolean(),
    }),
    outputSchema: z.object({
      worldFacts: z.array(z.string()),
    }),
  },
  async (input: GenerateWorldFactsInput): Promise<GenerateWorldFactsOutput> => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] worldFactsFlow: START for Series: ${input.seriesName}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const generalModelConfig = { maxOutputTokens: input.usePremiumAI ? 4000 : 2000 };

    const foundation_initialWorldFactsPrompt = ai.definePrompt({
        name: 'foundation_initialWorldFactsPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialWorldFactsOutputSchema }, config: generalModelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_InitialWorldFactsOutputSchema'. The 'worldFacts' array is REQUIRED (can be empty).

You are a world-building expert for "{{seriesName}}". Create essential world facts that establish the fundamental rules and current state of the world for this scenario.

**CHARACTER CONTEXT:**
Character: {{character.name}} ({{character.class}})
Character Description: {{character.description}}
Language Reading: {{character.languageReading}}/100
Language Speaking: {{character.languageSpeaking}}/100
Current Scene: {{sceneDescription}}
Location: {{currentLocation}}

**WORLD FACTS REQUIREMENTS:**
Generate 5-8 key world facts that establish the foundational knowledge needed for this scenario. Focus on facts that are:

**IMMEDIATELY RELEVANT:**
- Information that directly impacts the character's current situation
- Facts about the current location and its immediate surroundings
- Current political or social climate affecting the area
- Economic conditions and trade systems in effect

**CANONICALLY ACCURATE:**
- All facts must align perfectly with the established lore of "{{seriesName}}"
- Respect the series' timeline and current world state
- Maintain consistency with known political structures and power dynamics
- Ensure facts don't contradict established character relationships or world rules

**ACTIONABLE KNOWLEDGE:**
- Facts that inform decision-making and character interactions
- Information about local customs, laws, and social expectations
- Current threats, opportunities, or significant events affecting the region
- Practical knowledge about survival, commerce, and navigation

**FACT CATEGORIES TO CONSIDER:**
- **Political/Governance**: Current rulers, laws, political tensions, recent changes
- **Economic**: Currency systems, trade routes, economic conditions, market availability
- **Social/Cultural**: Customs, traditions, social hierarchies, cultural tensions
- **Geographic**: Important locations, travel conditions, regional characteristics
- **Magical/Supernatural**: Active magical phenomena, supernatural threats or protections
- **Current Events**: Recent happenings that affect the world state and character opportunities

**STARTING CONDITION AWARENESS:**
- Consider what a newcomer to this world would need to know immediately
- Include facts that explain why certain things might be difficult for the character
- Address language barriers and cultural unfamiliarity where relevant
- Include information about how newcomers are typically received or treated

**LOGICAL CONSISTENCY:**
- Ensure facts work together to create a coherent world state
- Avoid contradictions with the character's background and abilities
- Consider how facts might influence future story developments
- Maintain internal logic within the series' established rules

**NARRATIVE UTILITY:**
- Include facts that create story opportunities and potential conflicts
- Provide information that can drive character goals and motivations
- Establish stakes and consequences for character actions
- Create a foundation for meaningful NPC interactions and quest development

Each world fact should be:
- Concise but informative (1-2 sentences)
- Directly relevant to the character's situation
- Consistent with series canon
- Useful for informing future story decisions

Create world facts that establish a solid foundation for authentic storytelling within "{{seriesName}}" while respecting the character's starting conditions and knowledge limitations.
Output ONLY { "worldFacts": [...] }.`,
    });

    const worldFactsInput: z.infer<typeof Foundation_MinimalContextForItemsFactsInputSchema> = {
        seriesName: input.seriesName,
        character: {
            name: input.characterProfile.name,
            class: input.characterProfile.class,
            description: input.characterProfile.description,
            currency: input.characterProfile.currency,
            languageReading: input.characterProfile.languageReading,
            languageSpeaking: input.characterProfile.languageSpeaking
        },
        sceneDescription: input.sceneDescription,
        currentLocation: input.currentLocation,
    };

    let worldFactsOutput;
    try {
        const { output } = await foundation_initialWorldFactsPrompt(worldFactsInput);
        worldFactsOutput = output;
    } catch (e: any) {
        console.error(`[${new Date().toISOString()}] worldFactsFlow: FAILED. Error: ${e.message}`);
        throw new Error(`AI failed during world facts generation. Details: ${e.message}`);
    }

    const finalOutput: GenerateWorldFactsOutput = {
      worldFacts: worldFactsOutput.worldFacts || [],
    };

    console.log(`[${new Date().toISOString()}] worldFactsFlow: END. Total time: ${Date.now() - flowStartTime}ms`);
    return finalOutput;
  }
);

// Phase 5: Quests & Story Arcs Flow
const questsAndArcsFlow = ai.defineFlow(
  {
    name: 'questsAndArcsFlow',
    inputSchema: z.object({
      seriesName: z.string(),
      seriesPlotSummary: z.string(),
      characterProfile: Foundation_CharacterCoreProfileSchemaInternal,
      sceneDescription: z.string(),
      currentLocation: z.string(),
      characterNameInput: z.string().optional(),
      usePremiumAI: z.boolean(),
    }),
    outputSchema: z.object({
      quests: z.array(Narrative_QuestSchemaInternal),
      storyArcs: z.array(Narrative_StoryArcSchemaInternal),
    }),
  },
  async (input: GenerateQuestsAndArcsInput): Promise<GenerateQuestsAndArcsOutput> => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] questsAndArcsFlow: START for Series: ${input.seriesName}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = { maxOutputTokens: input.usePremiumAI ? 16000 : 8000 };

    const narrative_initialQuestsAndStoryArcsPrompt = ai.definePrompt({
        name: 'narrative_initialQuestsAndStoryArcsPrompt', model: modelName, input: { schema: InitialQuestsAndStoryArcsInputSchema }, output: { schema: InitialQuestsAndStoryArcsOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'InitialQuestsAndStoryArcsOutputSchema'. Both 'quests' and 'storyArcs' arrays are REQUIRED (can be empty).

You are a master quest designer and story architect for "{{seriesName}}". Create initial quests and story arcs that provide engaging progression while maintaining perfect canon compliance and logical consistency.

**CONTEXT:**
Series: {{seriesName}}
Comprehensive Plot Summary: {{seriesPlotSummary}}
Character: {{characterProfile.name}} ({{characterProfile.class}}) - {{characterProfile.description}}
Current Scene: {{sceneDescription}}
Location: {{currentLocation}}

**ENHANCED QUEST GENERATION:**
${await import("@/ai/prompts/generic-templates").then(m => m.GENERIC_QUEST_GENERATION_TEMPLATE)}

**CANON COMPLIANCE REQUIREMENTS:**
- All quests and story arcs must align perfectly with the established timeline and world state of "{{seriesName}}"
- Respect the character's canonical starting position and knowledge limitations
- Ensure quest objectives don't contradict established series lore or character relationships
- Maintain consistency with the series' tone, themes, and storytelling approach

**STARTING CONDITION AWARENESS:**
- Character begins with no money, limited possessions, and minimal local knowledge
- Character cannot read/write local language initially (if applicable)
- Character has no established relationships or reputation in this world
- Character is unfamiliar with local customs, geography, and social structures
- Design quests that account for these limitations while providing growth opportunities

**STORY ARC DESIGN PRINCIPLES:**
Generate 3-5 major story arcs that:

**CHRONOLOGICAL PROGRESSION:**
- Present story arcs in logical chronological order based on the series timeline
- Each arc should represent a distinct narrative phase with clear beginning, middle, and end
- Ensure natural progression from character introduction to major series events
- Consider pacing and character development requirements between arcs

**THEMATIC CONSISTENCY:**
- Each arc should explore core themes from "{{seriesName}}"
- Maintain the series' balance between character development and plot advancement
- Include appropriate moral complexity and decision-making opportunities
- Ensure arcs contribute to the overall narrative vision of the series

**UNLOCK CONDITIONS:**
- First arc: Simple conditions like ["Game_started", "Character_arrived_in_world"]
- Subsequent arcs: Logical progression conditions based on character growth and story development
- Consider both narrative milestones and character capability requirements
- Ensure conditions are achievable and don't create impossible barriers

**QUEST DESIGN PRINCIPLES:**
For the FIRST story arc only, generate 2-4 main quests that:

**IMMEDIATE ACCESSIBILITY:**
- Can be started given the character's current situation and limitations
- Don't require resources, knowledge, or relationships the character doesn't have
- Provide clear, achievable objectives for a newcomer to this world
- Include appropriate guidance and learning opportunities

**NARRATIVE INTEGRATION:**
- Directly advance the first story arc's central conflict or theme
- Introduce key characters, locations, or concepts important to the series
- Provide meaningful choices that reflect the character's personality and values
- Create opportunities for character growth and world exploration

**LOGICAL PROGRESSION:**
- Each quest should build naturally from the previous one
- Include both immediate objectives and longer-term goals
- Provide appropriate rewards that help the character progress
- Consider how quest completion affects the character's situation and capabilities

**CONFLICT PREVENTION:**
- Ensure quests don't contradict the character's established background or abilities
- Avoid objectives that would be impossible given the character's starting conditions
- Don't create quests that conflict with established world rules or character limitations
- Ensure quest rewards are appropriate for the character's current level and situation

**QUEST STRUCTURE REQUIREMENTS:**
Each quest must include:
- 'id': Unique identifier
- 'description': Clear, engaging description of the quest's purpose and stakes
- 'type': "main" for story-critical quests
- 'status': "active" for immediately available quests
- 'storyArcId': ID of the first story arc
- 'orderInStoryArc': Numerical order within the arc
- 'objectives': 1-2 clear, achievable objectives with 'isCompleted: false'
- 'rewards': Appropriate XP, currency, and items for character progression

**REWARD BALANCE:**
- XP rewards should reflect quest difficulty and importance
- Currency rewards should be modest but helpful for a starting character
- Item rewards should be useful but not overpowered for the character's level
- Consider both immediate utility and long-term character development

**WORLD INTEGRATION:**
- Quests should feel like natural extensions of the world and story
- Include opportunities to interact with important locations and characters
- Provide information and context that enhances world understanding
- Create hooks for future story developments and character relationships

Generate story arcs and quests that provide engaging progression while respecting the character's starting limitations and maintaining perfect authenticity to "{{seriesName}}".
Output ONLY { "quests": [...], "storyArcs": [...] }.`,
    });

    const questsAndStoryArcsInput: z.infer<typeof InitialQuestsAndStoryArcsInputSchema> = {
        seriesName: input.seriesName,
        seriesPlotSummary: input.seriesPlotSummary,
        characterProfile: input.characterProfile,
        sceneDescription: input.sceneDescription,
        currentLocation: input.currentLocation,
        characterNameInput: input.characterNameInput,
    };

    let questsAndStoryArcsResult;
    try {
        const { output } = await narrative_initialQuestsAndStoryArcsPrompt(questsAndStoryArcsInput);
        questsAndStoryArcsResult = output;
    } catch (e: any) {
        console.error(`[${new Date().toISOString()}] questsAndArcsFlow: FAILED. Error: ${e.message}`);
        throw new Error(`AI failed during quests and story arcs generation. Details: ${e.message}`);
    }

    if (!questsAndStoryArcsResult || !questsAndStoryArcsResult.quests || !questsAndStoryArcsResult.storyArcs) {
      throw new Error('Failed to generate initial quests and story arcs (REQUIRED fields missing).');
    }

    const finalOutput: GenerateQuestsAndArcsOutput = {
      quests: questsAndStoryArcsResult.quests,
      storyArcs: questsAndStoryArcsResult.storyArcs,
    };

    console.log(`[${new Date().toISOString()}] questsAndArcsFlow: END. Total time: ${Date.now() - flowStartTime}ms`);
    return finalOutput;
  }
);

// Phase 6: NPCs & Lore Flow
const npcsAndLoreFlow = ai.defineFlow(
  {
    name: 'npcsAndLoreFlow',
    inputSchema: z.object({
      seriesName: z.string(),
      seriesPlotSummary: z.string(),
      characterProfile: Foundation_CharacterCoreProfileSchemaInternal,
      sceneDescription: z.string(),
      currentLocation: z.string(),
      usePremiumAI: z.boolean(),
    }),
    outputSchema: z.object({
      trackedNPCs: z.array(Narrative_NPCProfileSchemaInternal),
      initialLoreEntries: z.array(ScenarioNarrative_RawLoreEntryZodSchema),
    }),
  },
  async (input: GenerateNPCsAndLoreInput): Promise<GenerateNPCsAndLoreOutput> => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] npcsAndLoreFlow: START for Series: ${input.seriesName}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = { maxOutputTokens: input.usePremiumAI ? 16000 : 8000 };

    // Define all lore and NPC prompts
    // Import generic templates for relationship-aware NPC generation
    const { GENERIC_NPC_GENERATION_TEMPLATE } = await import("@/ai/prompts/generic-templates");
    const { adaptPromptForSeries } = await import("@/lib/series-adapter");
    const { initializeEnhancedStoryState, formatEnhancedContextForAI } = await import("@/lib/enhanced-state-manager");

    // Create enhanced state context for NPC generation
    const baseStoryState = {
      character: input.characterProfile,
      currentLocation: input.currentLocation,
      inventory: [],
      equippedItems: {},
      quests: [],
      storyArcs: [],
      worldFacts: [],
      trackedNPCs: [],
    };
    const enhancedState = initializeEnhancedStoryState(baseStoryState);
    const enhancedContext = formatEnhancedContextForAI(enhancedState);

    const baseNPCPrompt = `Generate initial NPCs for "{{seriesName}}" with character {{characterProfile.name}}.

**ENHANCED CONTEXT:**
Character Emotional State: ${enhancedContext.emotionalContext}
Environmental Context: ${enhancedContext.environmentalContext}
Scene Description: {{sceneDescription}}
Current Location: {{currentLocation}}

${GENERIC_NPC_GENERATION_TEMPLATE}

**INTEGRATION REQUIREMENTS:**
- Create NPCs that naturally fit the current environmental and emotional context
- Establish clear relationship potential based on the character's emotional state
- Consider the environmental atmosphere when designing NPC personalities and motivations
- Set up natural interaction opportunities that enhance the scene's immersion
- Include NPCs that can drive narrative threads and relationship development

Output ONLY { "trackedNPCs": [...] }.`;

    const adaptedNPCPrompt = adaptPromptForSeries(baseNPCPrompt, input.seriesName);

    const narrative_initialTrackedNPCsPrompt = ai.definePrompt({
        name: 'narrative_initialTrackedNPCsPrompt', model: modelName, input: { schema: InitialTrackedNPCsInputSchema }, output: { schema: InitialTrackedNPCsOutputSchema }, config: modelConfig,
        prompt: adaptedNPCPrompt,
    });

    const narrative_characterLorePrompt = ai.definePrompt({
        name: 'narrative_characterLorePrompt', model: modelName, input: { schema: LoreBaseInputSchema }, output: { schema: LoreOutputSchema }, config: modelConfig,
        prompt: `Generate character lore entries for "{{seriesName}}".
Output ONLY { "loreEntries": [...] }.`,
    });

    const narrative_locationLorePrompt = ai.definePrompt({
        name: 'narrative_locationLorePrompt', model: modelName, input: { schema: LoreBaseInputSchema }, output: { schema: LoreOutputSchema }, config: modelConfig,
        prompt: `Generate location lore entries for "{{seriesName}}".
Output ONLY { "loreEntries": [...] }.`,
    });

    const narrative_factionLorePrompt = ai.definePrompt({
        name: 'narrative_factionLorePrompt', model: modelName, input: { schema: LoreBaseInputSchema }, output: { schema: LoreOutputSchema }, config: modelConfig,
        prompt: `Generate faction lore entries for "{{seriesName}}".
Output ONLY { "loreEntries": [...] }.`,
    });

    const narrative_itemConceptLorePrompt = ai.definePrompt({
        name: 'narrative_itemConceptLorePrompt', model: modelName, input: { schema: LoreBaseInputSchema }, output: { schema: LoreOutputSchema }, config: modelConfig,
        prompt: `Generate item concept lore entries for "{{seriesName}}".
Output ONLY { "loreEntries": [...] }.`,
    });

    const narrative_eventHistoryLorePrompt = ai.definePrompt({
        name: 'narrative_eventHistoryLorePrompt', model: modelName, input: { schema: LoreBaseInputSchema }, output: { schema: LoreOutputSchema }, config: modelConfig,
        prompt: `Generate event/history lore entries for "{{seriesName}}".
Output ONLY { "loreEntries": [...] }.`,
    });

    // Prepare inputs
    const npcsInput: z.infer<typeof InitialTrackedNPCsInputSchema> = {
        seriesName: input.seriesName,
        seriesPlotSummary: input.seriesPlotSummary,
        characterProfile: input.characterProfile,
        sceneDescription: input.sceneDescription,
        currentLocation: input.currentLocation,
    };

    const loreBaseInput: z.infer<typeof LoreBaseInputSchema> = {
        seriesName: input.seriesName,
        seriesPlotSummary: input.seriesPlotSummary,
        characterProfile: input.characterProfile,
        sceneDescription: input.sceneDescription,
        currentLocation: input.currentLocation,
    };

    // Execute all prompts in parallel
    let npcsResult, charLore, locLore, factLore, itemLore, eventLore;
    try {
        console.log(`[${new Date().toISOString()}] npcsAndLoreFlow: Firing parallel AI calls.`);
        [
            npcsResult,
            charLore,
            locLore,
            factLore,
            itemLore,
            eventLore
        ] = await Promise.all([
            narrative_initialTrackedNPCsPrompt(npcsInput).then(r => r.output),
            narrative_characterLorePrompt(loreBaseInput).then(r => r.output),
            narrative_locationLorePrompt(loreBaseInput).then(r => r.output),
            narrative_factionLorePrompt(loreBaseInput).then(r => r.output),
            narrative_itemConceptLorePrompt(loreBaseInput).then(r => r.output),
            narrative_eventHistoryLorePrompt(loreBaseInput).then(r => r.output),
        ]);
    } catch (e: any) {
        console.error(`[${new Date().toISOString()}] npcsAndLoreFlow: Parallel AI calls FAILED. Error: ${e.message}`);
        throw new Error(`AI failed during NPCs and lore generation. Details: ${e.message}`);
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

    const finalOutput: GenerateNPCsAndLoreOutput = {
      trackedNPCs: npcsResult.trackedNPCs.filter(npc => npc.name !== input.characterProfile.name),
      initialLoreEntries: allLoreEntries.filter(entry => entry.keyword && entry.content),
    };

    console.log(`[${new Date().toISOString()}] npcsAndLoreFlow: END. Total time: ${Date.now() - flowStartTime}ms`);
    return finalOutput;
  }
);


// --- SCHEMAS FOR NARRATIVE ELEMENTS FLOW ---
// (Moved to top of file to avoid initialization errors)


// Duplicate schemas removed - these are already defined at the top of the file

// Duplicate schemas removed - now defined at the top of the file

// --- Input and Output Schemas for the Narrative Elements Flow ---
const GenerateScenarioNarrativeElementsInputSchema = z.object({
  seriesName: z.string(),
  seriesPlotSummary: z.string(),
  characterProfile: Narrative_CharacterProfileSchemaForInput, // Now includes activeTemporaryEffects
  sceneDescription: z.string(),
  currentLocation: z.string(),
  characterNameInput: z.string().optional(),
  usePremiumAI: z.boolean().optional(),
});
export type GenerateScenarioNarrativeElementsInput = z.infer<typeof GenerateScenarioNarrativeElementsInputSchema>;

const GenerateScenarioNarrativeElementsOutputSchema = z.object({
  quests: z.array(Narrative_QuestSchemaInternal).describe("REQUIRED (can be empty array). Each quest needs id, description, type, status."),
  storyArcs: z.array(Narrative_StoryArcSchemaInternal).describe("REQUIRED (can be empty array). Each story arc needs id, title, description, order, mainQuestIds, isCompleted, and optional unlockConditions (array of strings)."),
  trackedNPCs: z.array(Narrative_NPCProfileSchemaInternal).describe("REQUIRED (can be empty array). Each NPC needs id, name, description, relationshipStatus, knownFacts."),
  initialLoreEntries: z.array(ScenarioNarrative_RawLoreEntryZodSchema).describe("REQUIRED (can be empty array). Each entry needs keyword, content."),
});
export type GenerateScenarioNarrativeElementsOutput = z.infer<typeof GenerateScenarioNarrativeElementsOutputSchema>;

const LoreGenerationInputSchema = z.object({
  seriesName: z.string(),
  characterName: z.string(),
  characterClass: z.string(),
  sceneDescription: z.string(),
  characterDescription: z.string(),
});
const CategorizedLoreOutputSchema = z.object({
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
    console.log(`[${new Date(flowStartTime).toISOString()}] generateScenarioNarrativeElementsFlow: START for Series: ${input.seriesName}, Character: ${input.characterProfile.name}, Premium: ${input.usePremiumAI}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = { maxOutputTokens: input.usePremiumAI ? 32000 : 8000 };

    // --- Define Prompts ---
    const narrative_initialQuestsAndStoryArcsPrompt = ai.definePrompt({
        name: 'narrative_initialQuestsAndStoryArcsPrompt', model: modelName, input: { schema: InitialQuestsAndStoryArcsInputSchema }, output: { schema: InitialQuestsAndStoryArcsOutputSchema }, config: modelConfig,
        tools: [lookupLoreTool],
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'InitialQuestsAndStoryArcsOutputSchema'. ALL REQUIRED fields (quests array, storyArcs array, and nested required fields like quest id/desc/type/status/storyArcId/orderInStoryArc, storyArc id/title/desc/order/mainQuestIds/isCompleted) MUST be present. The 'unlockConditions' field in story arcs is optional, but if provided, MUST be an array of strings.
For "{{seriesName}}" (Char: {{characterProfile.name}}, Scene: {{sceneDescription}}, Plot: {{{seriesPlotSummary}}}).
Generate 'storyArcs' & 'quests'.

'storyArcs': Generate several (e.g., 3-5, or more if the series is long and the plot summary clearly delineates them) initial Story Arcs. These MUST be major narrative segments from the series, presented in chronological order.
  - For EACH Story Arc:
    - 'id', 'title', 'order', 'isCompleted: false' are REQUIRED.
    - 'description' is REQUIRED and MUST be a concise summary of THAT SPECIFIC ARC's main events, key characters involved, and themes, directly derived from the comprehensive 'seriesPlotSummary'.
    - 'unlockConditions' (optional array of strings): Suggest 1-2 narrative conditions. For critical path/main story arcs, these should be simpler and tied to natural story progression (e.g., ["Previous_arc_completed", "Player_has_spoken_to_elder"]). For optional/side arcs, conditions can be more specific if appropriate (e.g., ["Player_found_the_hidden_map", "NPC_relationship_with_X_is_high"]). These are textual suggestions and not mechanically enforced by the system yet.
  - First story arc: 'mainQuestIds' must list the IDs of its generated quests (see below). 'unlockConditions' should be simple, like ["Game_started"].
  - Subsequent story arcs: These are OUTLINES. Their 'mainQuestIds' array MUST be EMPTY initially (e.g., \`[]\`).

'quests': For the FIRST story arc ONLY, generate a suitable number (e.g., 2-4) of 'main' quests directly based on its portion of the 'seriesPlotSummary'. Each quest MUST have 'id', 'description', 'type: "main"', 'status: "active"', 'storyArcId' (first story arc's ID), 'orderInStoryArc'. 'title' is optional. Include 'rewards' (XP (number), currency (number), items (each with id, name, desc, basePrice (number), optional rarity, optional activeEffects with statModifiers and numeric 'duration' (must be positive) for consumables)). Include 1-2 'objectives' ('isCompleted: false'). Use 'lookupLoreTool' for accuracy.

Output ONLY JSON { "quests": [...], "storyArcs": [...] }. Ensure 'activeEffects' are structured correctly (including numeric 'duration' (must be positive) for consumables). Ensure all IDs are unique.`,
    });

    const narrative_initialTrackedNPCsPrompt = ai.definePrompt({
        name: 'narrative_initialTrackedNPCsPrompt', model: modelName, input: { schema: InitialTrackedNPCsInputSchema }, output: { schema: InitialTrackedNPCsOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'InitialTrackedNPCsOutputSchema'. The 'trackedNPCs' array is REQUIRED (can be empty), and each NPC object within it MUST have id, name, description, relationshipStatus, and knownFacts (can be empty array).
The Player Character, "{{characterProfile.name}}", MUST NOT be included in the 'trackedNPCs' list.

For "{{seriesName}}" (Player Character: {{characterProfile.name}} ({{characterProfile.class}}), Scene: {{sceneDescription}}, Location: {{currentLocation}}).
Generate ONLY 'trackedNPCs':
- NPCs IN SCENE: Must include. Each MUST have 'id', 'name', 'description', 'relationshipStatus' (number), 'knownFacts' (can be empty array). 'firstEncounteredLocation'/'lastKnownLocation' = '{{currentLocation}}'.
- PRE-POPULATED MAJOR NPCs (NOT in scene): 2-4 crucial early-series NPCs. Each MUST have 'id', 'name', 'description', 'relationshipStatus' (number), 'knownFacts' (can be empty array). Their canonical locations for 'firstEncounteredLocation'/'lastKnownLocation'.
- ALL NPCs:
    - "relationshipStatus" (number) MUST be set according to the Player Character's ({{characterProfile.name}}) canonical relationship within the series (e.g., -100 for a major antagonist like Princess Leia if player is Darth Vader, 75 for a close ally). Use values like: -100 (Arch-Nemesis), -50 (Hostile), 0 (Neutral), 50 (Friendly), 100 (Staunch Ally).
    - Consider the player character's exact starting point in the series. If {{characterProfile.name}} would not have canonically met an NPC immediately upon arrival/start of the series, their initial 'relationshipStatus' with that NPC should be 0 (Neutral), unless their very first canonical encounter is inherently hostile. For example, for 'Re:Zero' if the player is Natsuki Subaru, his initial relationship with characters like Emilia or Felt upon immediate arrival to Lugunica should be 0, as he hasn't met them yet.
    - 'firstEncounteredTurnId'/'lastSeenTurnId' = "initial_turn_0".
    - Optional 'classOrRole', 'health' (number), 'maxHealth' (number), 'mana' (number), 'maxMana' (number).
    - If merchant: 'isMerchant: true', 'merchantInventory' (items with id, name, desc, basePrice (number), price (number), optional rarity, optional activeEffects with statModifiers and numeric 'duration' (must be positive) for consumables), 'buysItemTypes', 'sellsItemTypes'.
Output ONLY { "trackedNPCs": [...] }. Ensure 'activeEffects' are structured correctly (including numeric 'duration' (must be positive) for consumables). Ensure all IDs are unique. Do NOT include "{{characterProfile.name}}" in the output.`,
    });

    const narrative_characterLorePrompt = ai.definePrompt({
        name: 'narrative_characterLorePrompt', model: modelName, input: { schema: LoreGenerationInputSchema }, output: { schema: CategorizedLoreOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'CategorizedLoreOutputSchema'. The 'loreEntries' array is REQUIRED (can be empty), and each entry MUST have 'keyword' and 'content'.
You are a lore master for "{{seriesName}}". Context: Character "{{characterName}}" ({{characterClass}}). Scene: {{sceneDescription}}. Character Background: {{characterDescription}}.
Generate 10-12 key lore entries for MAJOR CHARACTERS relevant to early-to-mid game. Each: 'keyword' (name), 'content' (2-3 sentences), 'category': "Character".
Output ONLY { "loreEntries": [{"keyword": "...", "content": "...", "category":"Character"}, ...] }.`,
    });
    const narrative_locationLorePrompt = ai.definePrompt({
        name: 'narrative_locationLorePrompt', model: modelName, input: { schema: LoreGenerationInputSchema }, output: { schema: CategorizedLoreOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'CategorizedLoreOutputSchema'. The 'loreEntries' array is REQUIRED (can be empty), and each entry MUST have 'keyword' and 'content'.
You are a lore master for "{{seriesName}}". Context: Character "{{characterName}}" ({{characterClass}}). Scene: {{sceneDescription}}. Character Background: {{characterDescription}}.
Generate 10-12 key lore entries for MAJOR LOCATIONS/REGIONS relevant to early-to-mid game. Each: 'keyword' (name), 'content' (2-3 sentences), 'category': "Location".
Output ONLY { "loreEntries": [{"keyword": "...", "content": "...", "category":"Location"}, ...] }.`,
    });
    const narrative_factionLorePrompt = ai.definePrompt({
        name: 'narrative_factionLorePrompt', model: modelName, input: { schema: LoreGenerationInputSchema }, output: { schema: CategorizedLoreOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'CategorizedLoreOutputSchema'. The 'loreEntries' array is REQUIRED (can be empty), and each entry MUST have 'keyword' and 'content'.
You are a lore master for "{{seriesName}}". Context: Character "{{characterName}}" ({{characterClass}}). Scene: {{sceneDescription}}. Character Background: {{characterDescription}}.
Generate 8-10 key lore entries for IMPORTANT FACTIONS/ORGANIZATIONS relevant to early-to-mid game. Each: 'keyword' (name), 'content' (2-3 sentences), 'category': "Faction/Organization".
Output ONLY { "loreEntries": [{"keyword": "...", "content": "...", "category":"Faction/Organization"}, ...] }.`,
    });
    const narrative_itemConceptLorePrompt = ai.definePrompt({
        name: 'narrative_itemConceptLorePrompt', model: modelName, input: { schema: LoreGenerationInputSchema }, output: { schema: CategorizedLoreOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'CategorizedLoreOutputSchema'. The 'loreEntries' array is REQUIRED (can be empty), and each entry MUST have 'keyword' and 'content'.
You are a lore master for "{{seriesName}}". Context: Character "{{characterName}}" ({{characterClass}}). Scene: {{sceneDescription}}. Character Background: {{characterDescription}}.
Generate 8-10 key lore entries for SIGNIFICANT ITEMS, ARTIFACTS, CORE CONCEPTS, or UNIQUE TECHNOLOGIES relevant to early-to-mid game. Each: 'keyword', 'content' (2-3 sentences), 'category': "Item/Concept" or "Technology".
Output ONLY { "loreEntries": [{"keyword": "...", "content": "...", "category":"Item/Concept"}, ...] }.`,
    });
    const narrative_eventHistoryLorePrompt = ai.definePrompt({
        name: 'narrative_eventHistoryLorePrompt', model: modelName, input: { schema: LoreGenerationInputSchema }, output: { schema: CategorizedLoreOutputSchema }, config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'CategorizedLoreOutputSchema'. The 'loreEntries' array is REQUIRED (can be empty), and each entry MUST have 'keyword' and 'content'.
You are a lore master for "{{seriesName}}". Context: Character "{{characterName}}" ({{characterClass}}). Scene: {{sceneDescription}}. Character Background: {{characterDescription}}.
Generate 8-10 key lore entries for KEY HISTORICAL EVENTS or BACKGROUND ELEMENTS relevant to early-to-mid game. Each: 'keyword', 'content' (2-3 sentences), 'category': "Event/History".
Output ONLY { "loreEntries": [{"keyword": "...", "content": "...", "category":"Event/History"}, ...] }.`,
    });


    // --- Prepare Inputs for Prompts ---
    const questsAndStoryArcsInput: z.infer<typeof InitialQuestsAndStoryArcsInputSchema> = {
        seriesName: input.seriesName,
        seriesPlotSummary: input.seriesPlotSummary,
        characterProfile: input.characterProfile,
        sceneDescription: input.sceneDescription,
        currentLocation: input.currentLocation,
        characterNameInput: input.characterNameInput,
    };
    const npcsInput: z.infer<typeof InitialTrackedNPCsInputSchema> = {
        seriesName: input.seriesName,
        characterProfile: input.characterProfile,
        sceneDescription: input.sceneDescription,
        currentLocation: input.currentLocation,
        characterNameInput: input.characterNameInput,
    };
    const loreBaseInput: z.infer<typeof LoreGenerationInputSchema> = {
        seriesName: input.seriesName,
        characterName: input.characterProfile.name,
        characterClass: input.characterProfile.class,
        sceneDescription: input.sceneDescription,
        characterDescription: input.characterProfile.description,
    };

    // --- Execute Prompts in Parallel ---
    let questsAndStoryArcsResult, npcsResult, charLore, locLore, factLore, itemLore, eventLore;
    try {
        console.log(`[${new Date().toISOString()}] generateScenarioNarrativeElementsFlow: Firing parallel AI calls.`);
        [
            questsAndStoryArcsResult,
            npcsResult,
            charLore,
            locLore,
            factLore,
            itemLore,
            eventLore
        ] = await Promise.all([
            narrative_initialQuestsAndStoryArcsPrompt(questsAndStoryArcsInput).then(r => r.output),
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

    if (!questsAndStoryArcsResult || !questsAndStoryArcsResult.quests || !questsAndStoryArcsResult.storyArcs) {
      throw new Error('Failed to generate initial quests and story arcs (REQUIRED fields missing).');
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
    const narrativeUsedIds = new Set<string>();
    const sanitizeItem = (item: Partial<ItemType>, prefix: string, index: number | string = '') => {
        // Generate unique ID if missing or duplicate
        if (!item.id || item.id.trim() === "" || narrativeUsedIds.has(item.id)) {
            let newId: string;
            do {
                newId = `${prefix}_${Date.now()}_${index}_${Math.random().toString(36).substring(2,7)}`;
            } while (narrativeUsedIds.has(newId));
            item.id = newId;
        }
        narrativeUsedIds.add(item.id);

        item.name = item.name || "Unnamed Item";
        item.description = item.description || "No description.";
        item.basePrice = item.basePrice ?? 0;
        if (item.basePrice < 0) item.basePrice = 0;
        if (item.rarity === undefined) delete item.rarity;
        item.activeEffects = item.activeEffects ?? [];
        item.activeEffects.forEach((effect: Partial<ActiveEffectType>, effIdx: number) => {
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
            if (typeof effect.duration === 'number' && effect.duration <= 0) effect.duration = 1;
        });
        if (item.activeEffects.length === 0) delete item.activeEffects;
        return item as ItemType;
    };

    questsAndStoryArcsResult.quests.forEach(quest => {
        if (quest.rewards?.items) {
            quest.rewards.items.forEach((item, index) => sanitizeItem(item, `item_reward_narrative_${quest.id}`, index));
        }
    });
    questsAndStoryArcsResult.storyArcs.forEach(arc => {
        if (arc.unlockConditions && !Array.isArray(arc.unlockConditions)) {
            arc.unlockConditions = [String(arc.unlockConditions)]; // Ensure it's an array if AI messes up
        }
    });
    npcsResult.trackedNPCs.forEach(npc => {
        npc.knownFacts = npc.knownFacts ?? [];
        if (npc.merchantInventory) {
            npc.merchantInventory.forEach((item, index) => {
                const merchantItem = sanitizeItem(item, `item_merch_narrative_${npc.id}`, index);
                (merchantItem as any).price = (merchantItem as any).price ?? merchantItem.basePrice;
                if ((merchantItem as any).price < 0) (merchantItem as any).price = 0;
            });
        }
    });


    const output: GenerateScenarioNarrativeElementsOutput = {
      quests: questsAndStoryArcsResult.quests,
      storyArcs: questsAndStoryArcsResult.storyArcs,
      trackedNPCs: npcsResult.trackedNPCs.filter(npc => npc.name !== input.characterProfile.name), // Ensure player char is not an NPC
      initialLoreEntries: allLoreEntries.filter(entry => entry.keyword && entry.content),
    };

    console.log(`[${new Date().toISOString()}] generateScenarioNarrativeElementsFlow: END. Total time: ${Date.now() - flowStartTime}ms`);
    return output;
  }
);

// ===== NEW DEDICATED LORE GENERATION PHASE =====

export type GenerateLoreEntriesInput = {
  seriesName: string;
  seriesPlotSummary: string;
  characterProfile: CharacterProfile;
  sceneDescription: string;
  currentLocation: string;
  worldFacts: string[];
  usePremiumAI: boolean;
};

export type GenerateLoreEntriesOutput = {
  loreEntries: RawLoreEntry[];
};

const GenerateLoreEntriesInputSchema = z.object({
  seriesName: z.string(),
  seriesPlotSummary: z.string(),
  characterProfile: Foundation_CharacterCoreProfileSchemaInternal,
  sceneDescription: z.string(),
  currentLocation: z.string(),
  worldFacts: z.array(z.string()),
  usePremiumAI: z.boolean(),
});

const GenerateLoreEntriesOutputSchema = z.object({
  loreEntries: z.array(ScenarioNarrative_RawLoreEntryZodSchema).describe("REQUIRED. Each entry needs keyword, content, and category."),
});

export async function generateLoreEntries(input: GenerateLoreEntriesInput): Promise<GenerateLoreEntriesOutput> {
  return loreGenerationFlow(input);
}

const loreGenerationFlow = ai.defineFlow(
  {
    name: 'loreGenerationFlow',
    inputSchema: GenerateLoreEntriesInputSchema,
    outputSchema: GenerateLoreEntriesOutputSchema,
  },
  async (input: GenerateLoreEntriesInput): Promise<GenerateLoreEntriesOutput> => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] loreGenerationFlow: START for Series: ${input.seriesName}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = { maxOutputTokens: input.usePremiumAI ? 32000 : 16000 };

    // Enhanced lore generation prompts with much more detail and categories
    const lore_majorCharactersPrompt = ai.definePrompt({
        name: 'lore_majorCharactersPrompt', model: modelName, input: { schema: GenerateLoreEntriesInputSchema }, output: { schema: z.object({ loreEntries: z.array(ScenarioNarrative_RawLoreEntryZodSchema) }) }, config: modelConfig,
        prompt: `You are the ultimate character lore expert for "{{seriesName}}". Create comprehensive lore entries for major characters that will appear in or influence this scenario.

**CONTEXT:**
Series: {{seriesName}}
Plot Summary: {{seriesPlotSummary}}
Character: {{characterProfile.name}} ({{characterProfile.class}}) - {{characterProfile.description}}
Scene: {{sceneDescription}}
Location: {{currentLocation}}
World Facts: {{worldFacts}}

**CHARACTER LORE REQUIREMENTS:**
Generate 15-20 detailed lore entries for MAJOR CHARACTERS from "{{seriesName}}" who are:
- Central to the main storyline and likely to interact with the player character
- Important political, social, or magical figures in the world
- Antagonists, allies, or neutral parties with significant influence
- Characters whose actions drive major plot developments

**LORE ENTRY GUIDELINES:**
For each character, create entries that include:

**CORE IDENTITY:**
- Full name, titles, and how they're commonly addressed
- Current role, position, or occupation in the world
- Physical description and distinctive characteristics
- Personality traits, motivations, and core beliefs

**BACKGROUND & HISTORY:**
- Origin story and how they came to their current position
- Major life events that shaped their character
- Past relationships and how they've evolved
- Significant achievements, failures, or turning points

**CURRENT STATUS:**
- Present location and activities
- Current goals and what they're working toward
- Recent events affecting their situation
- Current relationships and alliances

**ABILITIES & RESOURCES:**
- Special powers, skills, or magical abilities
- Political influence, wealth, or organizational control
- Combat capabilities and preferred fighting styles
- Unique knowledge or information they possess

**RELATIONSHIP DYNAMICS:**
- How they typically interact with newcomers like {{characterProfile.name}}
- Their stance toward the player character's class/background
- Potential for alliance, conflict, or neutrality
- What they might want from or offer to the player character

**NARRATIVE HOOKS:**
- Plot threads they're involved in that could affect the player
- Secrets they know or are hiding
- Problems they face that might require assistance
- Opportunities they could provide for character advancement

**CANON COMPLIANCE:**
- Ensure all information aligns perfectly with established series lore
- Respect character development arcs and current timeline position
- Maintain consistency with their canonical personality and motivations
- Consider their relationships with other major characters

Each lore entry should be 3-4 sentences providing rich, actionable information that enhances storytelling and character interactions.

Output ONLY { "loreEntries": [{"keyword": "Character Name", "content": "...", "category": "Character"}, ...] }.`,
    });

    const lore_worldLocationsPrompt = ai.definePrompt({
        name: 'lore_worldLocationsPrompt', model: modelName, input: { schema: GenerateLoreEntriesInputSchema }, output: { schema: z.object({ loreEntries: z.array(ScenarioNarrative_RawLoreEntryZodSchema) }) }, config: modelConfig,
        prompt: `You are the master geographer and location expert for "{{seriesName}}". Create comprehensive lore entries for important locations that define the world's geography and culture.

**CONTEXT:**
Series: {{seriesName}}
Plot Summary: {{seriesPlotSummary}}
Character: {{characterProfile.name}} starting at {{currentLocation}}
Scene: {{sceneDescription}}
World Facts: {{worldFacts}}

**LOCATION LORE REQUIREMENTS:**
Generate 15-20 detailed lore entries for MAJOR LOCATIONS including:
- Capital cities and major urban centers
- Important regions, kingdoms, or territories
- Significant landmarks, dungeons, or mystical sites
- Trade routes, borders, and strategic locations
- Cultural or religious centers of importance

**LOCATION CATEGORIES:**
**MAJOR CITIES & SETTLEMENTS:**
- Political capitals and centers of power
- Trade hubs and commercial centers
- Cultural or religious centers
- Military strongholds and fortifications

**GEOGRAPHIC REGIONS:**
- Kingdoms, provinces, or territorial divisions
- Natural regions (forests, mountains, deserts, etc.)
- Magical or supernatural areas
- Contested or dangerous territories

**SIGNIFICANT LANDMARKS:**
- Ancient ruins or historical sites
- Magical locations or sources of power
- Natural wonders or geographic features
- Battlefields or sites of historical importance

**INFRASTRUCTURE & ROUTES:**
- Major roads, trade routes, and travel paths
- Borders, checkpoints, and controlled passages
- Ports, harbors, and transportation hubs
- Communication networks and way stations

**LORE ENTRY DETAILS:**
For each location, include:

**PHYSICAL DESCRIPTION:**
- Geographic features, climate, and natural characteristics
- Architecture, layout, and distinctive visual elements
- Size, population, and general atmosphere
- Notable buildings, districts, or areas within

**POLITICAL & SOCIAL STRUCTURE:**
- Governing system and current leadership
- Social hierarchy and cultural norms
- Economic base and primary industries
- Relationship with neighboring regions

**HISTORICAL SIGNIFICANCE:**
- Founding story and historical development
- Major events that occurred there
- Role in larger conflicts or political movements
- Cultural or religious importance

**CURRENT STATUS:**
- Present political situation and stability
- Economic conditions and trade relationships
- Current threats, opportunities, or challenges
- Recent events affecting the location

**PRACTICAL INFORMATION:**
- Travel conditions and accessibility
- Services available to visitors (inns, shops, etc.)
- Local laws, customs, and expectations
- Dangers or precautions travelers should know

**NARRATIVE POTENTIAL:**
- Story opportunities and adventure hooks
- Important NPCs likely to be found there
- Resources or information available
- How the location might factor into larger plots

Each entry should provide 3-4 sentences of rich, practical information that helps players understand and navigate the world.

Output ONLY { "loreEntries": [{"keyword": "Location Name", "content": "...", "category": "Location"}, ...] }.`,
    });

    // Prepare input for all lore prompts
    const loreInput = input;

    // Additional comprehensive lore prompts
    const lore_factionsAndOrganizationsPrompt = ai.definePrompt({
        name: 'lore_factionsAndOrganizationsPrompt', model: modelName, input: { schema: GenerateLoreEntriesInputSchema }, output: { schema: z.object({ loreEntries: z.array(ScenarioNarrative_RawLoreEntryZodSchema) }) }, config: modelConfig,
        prompt: `You are the political and organizational expert for "{{seriesName}}". Create detailed lore entries for major factions, organizations, and power structures that shape the world.

**CONTEXT:**
Series: {{seriesName}}
Plot Summary: {{seriesPlotSummary}}
Character: {{characterProfile.name}} ({{characterProfile.class}})
Scene: {{sceneDescription}}
Location: {{currentLocation}}
World Facts: {{worldFacts}}

**FACTION LORE REQUIREMENTS:**
Generate 12-15 detailed lore entries for MAJOR FACTIONS AND ORGANIZATIONS including:
- Political parties, governments, and ruling bodies
- Military organizations, knightly orders, and guard units
- Religious institutions, cults, and spiritual organizations
- Merchant guilds, trade organizations, and economic powers
- Criminal organizations, rebel groups, and underground movements
- Academic institutions, magical schools, and research organizations

For each faction/organization, include:
- Leadership structure and key figures
- Goals, motivations, and methods
- Resources, influence, and territorial control
- Relationships with other factions
- How they might interact with newcomers like {{characterProfile.name}}
- Current activities and recent developments

Each entry should be 3-4 sentences providing actionable information for political intrigue and faction interactions.

Output ONLY { "loreEntries": [{"keyword": "Faction Name", "content": "...", "category": "Faction/Organization"}, ...] }.`,
    });

    const lore_magicAndPowerSystemsPrompt = ai.definePrompt({
        name: 'lore_magicAndPowerSystemsPrompt', model: modelName, input: { schema: GenerateLoreEntriesInputSchema }, output: { schema: z.object({ loreEntries: z.array(ScenarioNarrative_RawLoreEntryZodSchema) }) }, config: modelConfig,
        prompt: `You are the magic and power systems expert for "{{seriesName}}". Create comprehensive lore entries explaining the supernatural elements and power systems that govern this world.

**CONTEXT:**
Series: {{seriesName}}
Plot Summary: {{seriesPlotSummary}}
Character: {{characterProfile.name}} ({{characterProfile.class}})
Scene: {{sceneDescription}}
Location: {{currentLocation}}
World Facts: {{worldFacts}}

**MAGIC/POWER SYSTEM LORE REQUIREMENTS:**
Generate 10-12 detailed lore entries covering:
- Core magic systems and how they function
- Types of magical abilities and their limitations
- Sources of power and how they're accessed
- Magical artifacts, items, and their significance
- Supernatural creatures and entities
- Magical locations and phenomena
- Rules, restrictions, and consequences of power usage
- Training methods and magical education
- Cultural attitudes toward magic and power

For each system/concept, include:
- How it works mechanically within the world
- Who can access it and under what conditions
- Limitations, costs, and potential dangers
- How it's perceived by society
- Relevance to the current story and character situation

Each entry should be 3-4 sentences providing clear understanding of the world's supernatural elements.

Output ONLY { "loreEntries": [{"keyword": "Magic/Power Concept", "content": "...", "category": "Magic/Power"}, ...] }.`,
    });

    const lore_historyAndEventsPrompt = ai.definePrompt({
        name: 'lore_historyAndEventsPrompt', model: modelName, input: { schema: GenerateLoreEntriesInputSchema }, output: { schema: z.object({ loreEntries: z.array(ScenarioNarrative_RawLoreEntryZodSchema) }) }, config: modelConfig,
        prompt: `You are the historian and chronicler for "{{seriesName}}". Create detailed lore entries for major historical events and background elements that shaped the current world state.

**CONTEXT:**
Series: {{seriesName}}
Plot Summary: {{seriesPlotSummary}}
Character: {{characterProfile.name}} ({{characterProfile.class}})
Scene: {{sceneDescription}}
Location: {{currentLocation}}
World Facts: {{worldFacts}}

**HISTORICAL LORE REQUIREMENTS:**
Generate 10-12 detailed lore entries covering:
- Major wars, conflicts, and their outcomes
- Founding events and origin stories of nations/organizations
- Catastrophic events that changed the world
- Important treaties, agreements, and political changes
- Legendary figures and their historical impact
- Cultural developments and social movements
- Economic shifts and trade developments
- Technological or magical discoveries
- Recent events affecting the current situation

For each historical element, include:
- What happened and when it occurred
- Key figures involved and their roles
- Consequences and lasting effects on the world
- How it influences current politics and society
- Relevance to the character's present situation

Each entry should be 3-4 sentences providing context for understanding the current world state.

Output ONLY { "loreEntries": [{"keyword": "Historical Event/Element", "content": "...", "category": "History/Events"}, ...] }.`,
    });

    const lore_cultureAndSocietyPrompt = ai.definePrompt({
        name: 'lore_cultureAndSocietyPrompt', model: modelName, input: { schema: GenerateLoreEntriesInputSchema }, output: { schema: z.object({ loreEntries: z.array(ScenarioNarrative_RawLoreEntryZodSchema) }) }, config: modelConfig,
        prompt: `You are the cultural anthropologist and society expert for "{{seriesName}}". Create detailed lore entries for cultural elements, social systems, and daily life aspects that define how people live in this world.

**CONTEXT:**
Series: {{seriesName}}
Plot Summary: {{seriesPlotSummary}}
Character: {{characterProfile.name}} ({{characterProfile.class}})
Scene: {{sceneDescription}}
Location: {{currentLocation}}
World Facts: {{worldFacts}}

**CULTURAL LORE REQUIREMENTS:**
Generate 10-12 detailed lore entries covering:
- Social hierarchies and class systems
- Cultural traditions, festivals, and ceremonies
- Religious beliefs and spiritual practices
- Languages, dialects, and communication systems
- Art, literature, and entertainment forms
- Food, cuisine, and dining customs
- Fashion, clothing, and personal appearance norms
- Marriage, family structures, and social relationships
- Education systems and knowledge transmission
- Economic systems and trade practices
- Legal systems and justice concepts

For each cultural element, include:
- How it functions in daily life
- Regional or class variations
- Historical development and current state
- How outsiders like {{characterProfile.name}} might encounter it
- Social expectations and potential cultural misunderstandings

Each entry should be 3-4 sentences providing practical cultural knowledge for character interactions.

Output ONLY { "loreEntries": [{"keyword": "Cultural Element", "content": "...", "category": "Culture/Society"}, ...] }.`,
    });

    // Execute all lore generation prompts in parallel
    let majorCharactersLore, worldLocationsLore, factionsLore, magicSystemsLore, historyLore, cultureLore;
    try {
        console.log(`[${new Date().toISOString()}] loreGenerationFlow: Firing parallel lore generation calls.`);
        [
            majorCharactersLore,
            worldLocationsLore,
            factionsLore,
            magicSystemsLore,
            historyLore,
            cultureLore
        ] = await Promise.all([
            lore_majorCharactersPrompt(loreInput).then(r => r.output),
            lore_worldLocationsPrompt(loreInput).then(r => r.output),
            lore_factionsAndOrganizationsPrompt(loreInput).then(r => r.output),
            lore_magicAndPowerSystemsPrompt(loreInput).then(r => r.output),
            lore_historyAndEventsPrompt(loreInput).then(r => r.output),
            lore_cultureAndSocietyPrompt(loreInput).then(r => r.output)
        ]);
    } catch (e: any) {
        console.error(`[${new Date().toISOString()}] loreGenerationFlow: Parallel lore calls FAILED. Error: ${e.message}`);
        throw new Error(`AI failed during lore generation. Details: ${e.message}`);
    }

    // Combine all lore entries
    const allLoreEntries: RawLoreEntry[] = [
        ...(majorCharactersLore?.loreEntries || []),
        ...(worldLocationsLore?.loreEntries || []),
        ...(factionsLore?.loreEntries || []),
        ...(magicSystemsLore?.loreEntries || []),
        ...(historyLore?.loreEntries || []),
        ...(cultureLore?.loreEntries || [])
    ];

    console.log(`[${new Date().toISOString()}] loreGenerationFlow: Generated ${allLoreEntries.length} lore entries.`);

    const finalOutput: GenerateLoreEntriesOutput = {
      loreEntries: allLoreEntries.filter(entry => entry.keyword && entry.content),
    };

    console.log(`[${new Date().toISOString()}] loreGenerationFlow: END. Total time: ${Date.now() - flowStartTime}ms`);
    return finalOutput;
  }
);

// ===== SEPARATE NPC GENERATION PHASE =====

export type GenerateNPCsInput = {
  seriesName: string;
  seriesPlotSummary: string;
  characterProfile: CharacterProfile;
  sceneDescription: string;
  currentLocation: string;
  loreEntries: RawLoreEntry[];
  usePremiumAI: boolean;
};

export type GenerateNPCsOutput = {
  trackedNPCs: NPCProfileType[];
};

export async function generateNPCs(input: GenerateNPCsInput): Promise<GenerateNPCsOutput> {
  return npcGenerationFlow(input);
}

const npcGenerationFlow = ai.defineFlow(
  {
    name: 'npcGenerationFlow',
    inputSchema: z.object({
      seriesName: z.string(),
      seriesPlotSummary: z.string(),
      characterProfile: Foundation_CharacterCoreProfileSchemaInternal,
      sceneDescription: z.string(),
      currentLocation: z.string(),
      loreEntries: z.array(ScenarioNarrative_RawLoreEntryZodSchema),
      usePremiumAI: z.boolean(),
    }),
    outputSchema: z.object({
      trackedNPCs: z.array(Narrative_NPCProfileSchemaInternal),
    }),
  },
  async (input: GenerateNPCsInput): Promise<GenerateNPCsOutput> => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] npcGenerationFlow: START for Series: ${input.seriesName}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = { maxOutputTokens: input.usePremiumAI ? 16000 : 8000 };

    // Phase 1: Immediate Scene NPCs (3-4 NPCs)
    const immediateSceneNPCsPrompt = ai.definePrompt({
        name: 'immediateSceneNPCsPrompt', model: modelName,
        input: { schema: z.object({
          seriesName: z.string(),
          characterName: z.string(),
          characterDescription: z.string(),
          sceneDescription: z.string(),
          currentLocation: z.string(),
        }) },
        output: { schema: z.object({ trackedNPCs: z.array(Narrative_NPCProfileSchemaInternal) }) },
        config: modelConfig,
        prompt: `Create immediate scene NPCs for "{{seriesName}}".

Character: {{characterName}} - {{characterDescription}}
Scene: {{sceneDescription}}
Location: {{currentLocation}}

Generate 3-4 NPCs physically present in the current scene:
- Characters the player will interact with immediately
- Mix of helpful, neutral, and potentially challenging personalities
- Clear reasons for being in this location

For unknown newcomers (like Subaru in Re:Zero), most should start NEUTRAL (0-25).

Each NPC needs: id, name, description, relationshipStatus (-100 to 100), knownFacts (array), firstEncounteredLocation, lastKnownLocation, firstEncounteredTurnId: "initial_turn_0", lastSeenTurnId: "initial_turn_0".

Output ONLY { "trackedNPCs": [...] }.`,
    });

    // Phase 2: Major Story NPCs (4-6 NPCs)
    const majorStoryNPCsPrompt = ai.definePrompt({
        name: 'majorStoryNPCsPrompt', model: modelName,
        input: { schema: z.object({
          seriesName: z.string(),
          characterName: z.string(),
          characterDescription: z.string(),
          currentLocation: z.string(),
          existingNPCs: z.array(z.string()) // Just names for context
        }) },
        output: { schema: z.object({ trackedNPCs: z.array(Narrative_NPCProfileSchemaInternal) }) },
        config: modelConfig,
        prompt: `Create major story NPCs for "{{seriesName}}".

Character: {{characterName}} - {{characterDescription}}
Location: {{currentLocation}}
Existing NPCs: {{existingNPCs}}

Generate 4-6 important series characters:
- Key allies, mentors, or antagonists
- Characters who drive major plot developments
- Both accessible and distant/powerful figures

For unknown newcomers (like Subaru in Re:Zero), most should start NEUTRAL (0-25).

Each NPC needs: id, name, description, relationshipStatus (-100 to 100), knownFacts (array), firstEncounteredLocation, lastKnownLocation, firstEncounteredTurnId: "initial_turn_0", lastSeenTurnId: "initial_turn_0".

Output ONLY { "trackedNPCs": [...] }.`,
    });

    // Phase 3: Local Community NPCs (2-3 NPCs)
    const localCommunityNPCsPrompt = ai.definePrompt({
        name: 'localCommunityNPCsPrompt', model: modelName,
        input: { schema: z.object({
          seriesName: z.string(),
          characterName: z.string(),
          currentLocation: z.string(),
          existingNPCs: z.array(z.string()) // Just names for context
        }) },
        output: { schema: z.object({ trackedNPCs: z.array(Narrative_NPCProfileSchemaInternal) }) },
        config: modelConfig,
        prompt: `Create local community NPCs for "{{seriesName}}".

Character: {{characterName}}
Location: {{currentLocation}}
Existing NPCs: {{existingNPCs}}

Generate 2-3 local service providers:
- Merchants, guards, innkeepers, or other service providers
- Local residents who provide world flavor and practical services
- Characters who can provide information or minor quests

Most should start NEUTRAL (0-25) for newcomers.

Each NPC needs: id, name, description, relationshipStatus (-100 to 100), knownFacts (array), firstEncounteredLocation, lastKnownLocation, firstEncounteredTurnId: "initial_turn_0", lastSeenTurnId: "initial_turn_0".

Output ONLY { "trackedNPCs": [...] }.`,
    });

    // Sequential NPC generation in phases
    const allNPCs: any[] = [];

    // Phase 1: Immediate Scene NPCs
    console.log(`[${new Date().toISOString()}] npcGenerationFlow: Phase 1 - Generating immediate scene NPCs.`);
    const immediateInput = {
      seriesName: input.seriesName,
      characterName: input.characterProfile.name,
      characterDescription: input.characterProfile.description,
      sceneDescription: input.sceneDescription,
      currentLocation: input.currentLocation,
    };

    let immediateResult;
    try {
        const callStartTime = Date.now();
        const { output } = await immediateSceneNPCsPrompt(immediateInput);
        console.log(`[${new Date().toISOString()}] npcGenerationFlow: Phase 1 completed in ${Date.now() - callStartTime}ms.`);
        immediateResult = output;
    } catch (e: any) {
        console.error(`[${new Date().toISOString()}] npcGenerationFlow: Phase 1 FAILED. Error: ${e.message}`);
        throw new Error(`AI failed during immediate scene NPC generation. Details: ${e.message}`);
    }

    if (immediateResult?.trackedNPCs) {
        allNPCs.push(...immediateResult.trackedNPCs);
    }

    // Phase 2: Major Story NPCs
    console.log(`[${new Date().toISOString()}] npcGenerationFlow: Phase 2 - Generating major story NPCs.`);
    const majorInput = {
      seriesName: input.seriesName,
      characterName: input.characterProfile.name,
      characterDescription: input.characterProfile.description,
      currentLocation: input.currentLocation,
      existingNPCs: allNPCs.map(npc => npc.name),
    };

    let majorResult;
    try {
        const callStartTime = Date.now();
        const { output } = await majorStoryNPCsPrompt(majorInput);
        console.log(`[${new Date().toISOString()}] npcGenerationFlow: Phase 2 completed in ${Date.now() - callStartTime}ms.`);
        majorResult = output;
    } catch (e: any) {
        console.error(`[${new Date().toISOString()}] npcGenerationFlow: Phase 2 FAILED. Error: ${e.message}`);
        throw new Error(`AI failed during major story NPC generation. Details: ${e.message}`);
    }

    if (majorResult?.trackedNPCs) {
        allNPCs.push(...majorResult.trackedNPCs);
    }

    // Phase 3: Local Community NPCs
    console.log(`[${new Date().toISOString()}] npcGenerationFlow: Phase 3 - Generating local community NPCs.`);
    const localInput = {
      seriesName: input.seriesName,
      characterName: input.characterProfile.name,
      currentLocation: input.currentLocation,
      existingNPCs: allNPCs.map(npc => npc.name),
    };

    let localResult;
    try {
        const callStartTime = Date.now();
        const { output } = await localCommunityNPCsPrompt(localInput);
        console.log(`[${new Date().toISOString()}] npcGenerationFlow: Phase 3 completed in ${Date.now() - callStartTime}ms.`);
        localResult = output;
    } catch (e: any) {
        console.error(`[${new Date().toISOString()}] npcGenerationFlow: Phase 3 FAILED. Error: ${e.message}`);
        throw new Error(`AI failed during local community NPC generation. Details: ${e.message}`);
    }

    if (localResult?.trackedNPCs) {
        allNPCs.push(...localResult.trackedNPCs);
    }

    if (allNPCs.length === 0) {
      throw new Error('Failed to generate any NPCs across all phases.');
    }

    const finalOutput: GenerateNPCsOutput = {
      trackedNPCs: allNPCs.filter(npc => npc.name !== input.characterProfile.name),
    };

    console.log(`[${new Date().toISOString()}] npcGenerationFlow: END. Total time: ${Date.now() - flowStartTime}ms`);
    return finalOutput;
  }
);
