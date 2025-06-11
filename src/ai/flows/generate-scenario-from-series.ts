
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

const Narrative_QuestStatusEnumInternal = z.enum(['active', 'completed', 'failed', 'available', 'locked']);

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
  equipSlot: z.string().optional(),
  activeEffects: z.array(z.object({
    id: z.string().describe("REQUIRED."),
    name: z.string().describe("REQUIRED."),
    description: z.string().describe("REQUIRED."),
    type: z.enum(['passive_aura', 'on_use', 'on_equip', 'consumable']).describe("REQUIRED."),
    statModifiers: z.array(z.object({
      stat: z.string().describe("REQUIRED."),
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

    const foundation_characterAndScenePrompt = ai.definePrompt({
        name: 'foundation_characterAndScenePrompt', model: modelName, input: { schema: Foundation_CharacterAndSceneInputSchema }, output: { schema: Foundation_CharacterAndSceneOutputSchema }, config: generalModelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_CharacterAndSceneOutputSchema'. ALL REQUIRED fields (sceneDescription, characterCore, currentLocation AND nested required fields in characterCore like name, class, description, health, maxHealth, level, experiencePoints, experienceToNextLevel) MUST be present.
You are a master storyteller for "{{seriesName}}".
User character: Name: {{#if characterNameInput}}{{characterNameInput}}{{else}}(Not provided){{/if}}, Class: {{#if characterClassInput}}{{characterClassInput}}{{else}}(Not provided){{/if}}.
Generate 'sceneDescription', 'characterCore', 'currentLocation'.
'characterCore': Authentically create profile. Include name, class, description. Health/MaxHealth (numbers). Mana/MaxMana (numbers, 0 if not applicable). Stats (5-15, numbers). Level 1, 0 XP, XPToNextLevel (numbers, must be >0). Currency (number).
'languageReading' & 'languageSpeaking' (numbers, 0-100):
  - IF seriesName is "Re:Zero" or contains "Re:Zero - Starting Life in Another World" or "Re:Zero", set 'languageSpeaking' to 100 and 'languageReading' to 0. The character description MUST clearly state that the character can understand spoken language but is illiterate.
  - ELSE, set to 0 for other known canonical language barriers, or 100 for both if no specific barrier applies, or make a series-appropriate choice. The character description MUST reflect any language barriers.
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
For characters like Natsuki Subaru in Re:Zero arriving from modern Earth, initial inventory should be very sparse or empty, reflecting what he had on him from a convenience store (e.g., a cell phone with dead battery, a bag of chips, a wallet with unusable currency). Avoid giving fantasy items unless it's something he explicitly just picked up in the scene.
Output ONLY { "inventory": [...] }. Ensure all REQUIRED fields for items are present. Ensure IDs are unique.`,
    });
    const foundation_initialMainGearPrompt = ai.definePrompt({
        name: 'foundation_initialMainGearPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialMainGearOutputSchema }, config: generalModelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_InitialMainGearOutputSchema'. Each item ('weapon', 'shield', 'body') or null is REQUIRED. If an item, it MUST have 'id', 'name', 'description'.
For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'weapon', 'shield', 'body' equipped items (or null). Include 'basePrice' (number), optional 'rarity', 'equipSlot'. 'activeEffects' should have 'duration: "permanent_while_equipped"'.
For certain characters or series starts (e.g., Natsuki Subaru in Re:Zero arriving from modern Earth), all main gear slots ('weapon', 'shield', 'body') MUST be \`null\`.
Output ONLY { "weapon": ..., "shield": ..., "body": ... }. Ensure all REQUIRED fields for items are present if an item is generated. Ensure IDs are unique.`,
    });
    const foundation_initialSecondaryGearPrompt = ai.definePrompt({
        name: 'foundation_initialSecondaryGearPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialSecondaryGearOutputSchema }, config: generalModelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_InitialSecondaryGearOutputSchema'. Each item ('head', 'legs', 'feet', 'hands') or null is REQUIRED. If an item, it MUST have 'id', 'name', 'description'.
For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'head', 'legs', 'feet', 'hands' equipped items (or null). Include 'basePrice' (number), optional 'rarity', 'equipSlot'. 'activeEffects' should have 'duration: "permanent_while_equipped"'.
For characters like Natsuki Subaru in Re:Zero, 'head', 'hands', 'legs', 'feet' slots should likely be \`null\` unless the series canonically gives them immediate, specific non-combat gear.
Output ONLY { "head": ..., "legs": ..., "feet": ..., "hands": ... }. Ensure all REQUIRED fields for items are present if an item is generated. Ensure IDs are unique.`,
    });
    const foundation_initialAccessoryGearPrompt = ai.definePrompt({
        name: 'foundation_initialAccessoryGearPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialAccessoryGearOutputSchema }, config: generalModelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_InitialAccessoryGearOutputSchema'. Each item ('neck', 'ring1', 'ring2') or null is REQUIRED. If an item, it MUST have 'id', 'name', 'description'.
For "{{seriesName}}" (Char: {{character.name}}, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'neck', 'ring1', 'ring2' equipped items (or null). Include 'basePrice' (number), optional 'rarity', 'equipSlot'. 'activeEffects' should have 'duration: "permanent_while_equipped"'.
For characters like Natsuki Subaru in Re:Zero, these slots MUST be \`null\`.
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
    const sanitizeFoundationItem = (item: Partial<ItemType>, prefix: string, index: number | string = '') => {
        if (!item.id || item.id.trim() === "") item.id = `${prefix}_${Date.now()}_${index}_${Math.random().toString(36).substring(2,7)}`;
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

    // Define prompts (reusing existing ones)
    const foundation_characterAndScenePrompt = ai.definePrompt({
        name: 'foundation_characterAndScenePrompt', model: modelName, input: { schema: Foundation_CharacterAndSceneInputSchema }, output: { schema: Foundation_CharacterAndSceneOutputSchema }, config: generalModelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'Foundation_CharacterAndSceneOutputSchema'. ALL REQUIRED fields (sceneDescription, characterCore, currentLocation AND nested required fields in characterCore like name, class, description, health, maxHealth, level, experiencePoints, experienceToNextLevel) MUST be present.
You are a master storyteller for "{{seriesName}}".
Create a character and opening scene. Character name: {{characterNameInput}} (if empty, AI decides). Character class: {{characterClassInput}} (if empty, AI decides). Premium AI: {{usePremiumAI}}.
Generate: sceneDescription (2-3 paragraphs), characterCore (complete profile), currentLocation (specific place name).
Output ONLY JSON for Foundation_CharacterAndSceneOutputSchema. Do not include any other conversational text.`,
    });

    const foundation_styleGuidePrompt = ai.definePrompt({
        name: 'foundation_styleGuidePrompt', model: modelName, input: { schema: Foundation_StyleGuideInputSchema }, output: { schema: Foundation_StyleGuideOutputSchema }, config: generalModelConfig,
        prompt: `Create a style guide for "{{seriesName}}". Include tone, narrative style, dialogue approach, and thematic elements.
Output ONLY JSON for Foundation_StyleGuideOutputSchema. Do not include any other conversational text.`,
    });

    const foundation_seriesPlotSummaryPrompt = ai.definePrompt({
        name: 'foundation_seriesPlotSummaryPrompt', model: modelName, input: { schema: Foundation_SeriesPlotSummaryInputSchema }, output: { schema: Foundation_SeriesPlotSummaryOutputSchema }, config: plotSummaryModelConfig,
        prompt: `Create a comprehensive plot summary for "{{seriesName}}" with character {{characterNameInput}}. Include major story arcs, key conflicts, and character development paths.
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
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object. If 'skillsAndAbilities' are provided, each skill MUST have a unique 'id', 'name', 'description', and 'type'.
For "{{seriesName}}" (Character: {{character.name}} - {{character.class}}, Scene: {{sceneDescription}}, Location: {{currentLocation}}).
Generate 3-5 starting skills/abilities appropriate for this character and setting.
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

    // Define item generation prompts (reusing existing ones)
    const foundation_initialInventoryPrompt = ai.definePrompt({
        name: 'foundation_initialInventoryPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialInventoryOutputSchema }, config: generalModelConfig,
        prompt: `Generate starting inventory items for "{{seriesName}}" character {{character.name}} ({{character.class}}).
Output ONLY { "inventory": [...] }.`,
    });

    const foundation_initialMainGearPrompt = ai.definePrompt({
        name: 'foundation_initialMainGearPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialMainGearOutputSchema }, config: generalModelConfig,
        prompt: `Generate main gear (weapons, armor) for "{{seriesName}}" character {{character.name}} ({{character.class}}).
Output ONLY { "mainGear": [...] }.`,
    });

    const foundation_initialSecondaryGearPrompt = ai.definePrompt({
        name: 'foundation_initialSecondaryGearPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialSecondaryGearOutputSchema }, config: generalModelConfig,
        prompt: `Generate secondary gear for "{{seriesName}}" character {{character.name}} ({{character.class}}).
Output ONLY { "secondaryGear": [...] }.`,
    });

    const foundation_initialAccessoryGearPrompt = ai.definePrompt({
        name: 'foundation_initialAccessoryGearPrompt', model: modelName, input: { schema: Foundation_MinimalContextForItemsFactsInputSchema }, output: { schema: Foundation_InitialAccessoryGearOutputSchema }, config: generalModelConfig,
        prompt: `Generate accessory gear for "{{seriesName}}" character {{character.name}} ({{character.class}}).
Output ONLY { "accessoryGear": [...] }.`,
    });

    const itemPromises = [
        foundation_initialInventoryPrompt(minimalContextForItemsInput),
        foundation_initialMainGearPrompt(minimalContextForItemsInput),
        foundation_initialSecondaryGearPrompt(minimalContextForItemsInput),
        foundation_initialAccessoryGearPrompt(minimalContextForItemsInput),
    ];

    let itemResults;
    try {
      itemResults = await Promise.all(itemPromises.map(async (promise, index) => {
          const callStartTime = Date.now();
          const promptName = ['inventory', 'mainGear', 'secondaryGear', 'accessoryGear'][index];
          console.log(`[${new Date(callStartTime).toISOString()}] itemsAndEquipmentFlow: Calling ${promptName}Prompt.`);
          const result = await promise;
          console.log(`[${new Date().toISOString()}] itemsAndEquipmentFlow: ${promptName}Prompt completed in ${Date.now() - callStartTime}ms.`);
          return result.output;
      }));
    } catch (e: any) {
      console.error(`[${new Date().toISOString()}] itemsAndEquipmentFlow: FAILED. Error: ${e.message}`);
      throw new Error(`AI failed during items generation. Details: ${e.message}`);
    }

    const [inventoryOutput, mainGearRaw, secondaryGearRaw, accessoryGearRaw] = itemResults as [
        z.infer<typeof Foundation_InitialInventoryOutputSchema>,
        z.infer<typeof Foundation_InitialMainGearOutputSchema>,
        z.infer<typeof Foundation_InitialSecondaryGearOutputSchema>,
        z.infer<typeof Foundation_InitialAccessoryGearOutputSchema>,
    ];

    // Process and sanitize items (simplified version of existing logic)
    const inventory = inventoryOutput.inventory || [];
    const allGearItems = [
        ...(mainGearRaw.mainGear || []),
        ...(secondaryGearRaw.secondaryGear || []),
        ...(accessoryGearRaw.accessoryGear || []),
    ];

    // Basic item sanitization
    const sanitizeItem = (item: Partial<ItemType>, prefix: string, index: number | string = '') => {
        if (!item.id || item.id.trim() === "") item.id = `${prefix}_${Date.now()}_${index}_${Math.random().toString(36).substring(2,7)}`;
        item.name = item.name || "Unnamed Item";
        item.description = item.description || "No description.";
        item.basePrice = item.basePrice ?? 0;
        if (item.basePrice < 0) item.basePrice = 0;
        item.activeEffects = item.activeEffects ?? [];
        return item as ItemType;
    };

    inventory.forEach((item, idx) => sanitizeItem(item, 'inv', idx));
    allGearItems.forEach((item, idx) => sanitizeItem(item, 'gear', idx));

    // Create equipped items structure
    const equippedItems: Required<Record<EquipmentSlot, ItemType | null>> = {
        mainHand: null,
        offHand: null,
        head: null,
        chest: null,
        legs: null,
        feet: null,
        hands: null,
        neck: null,
        ring1: null,
        ring2: null,
    };

    // Auto-equip some items (simplified logic)
    allGearItems.forEach(item => {
        if (item.equipSlot && !equippedItems[item.equipSlot as EquipmentSlot]) {
            equippedItems[item.equipSlot as EquipmentSlot] = item;
        } else {
            inventory.push(item);
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
For "{{seriesName}}" (Char: {{character.name}} - Desc: {{character.description}}, Reading: {{character.languageReading}}/100, Speaking: {{character.languageSpeaking}}/100, Scene: {{sceneDescription}}, Loc: {{currentLocation}}).
Generate ONLY 'worldFacts': 3-5 key facts.
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
For "{{seriesName}}" with plot: {{seriesPlotSummary}}
Character: {{characterProfile.name}} ({{characterProfile.class}}) - {{characterProfile.description}}
Scene: {{sceneDescription}}, Location: {{currentLocation}}
Generate initial quests and story arcs.
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
    const narrative_initialTrackedNPCsPrompt = ai.definePrompt({
        name: 'narrative_initialTrackedNPCsPrompt', model: modelName, input: { schema: InitialTrackedNPCsInputSchema }, output: { schema: InitialTrackedNPCsOutputSchema }, config: modelConfig,
        prompt: `Generate initial NPCs for "{{seriesName}}" with character {{characterProfile.name}}.
Output ONLY { "trackedNPCs": [...] }.`,
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
    const sanitizeItem = (item: Partial<ItemType>, prefix: string, index: number | string = '') => {
        if (!item.id || item.id.trim() === "") item.id = `${prefix}_${Date.now()}_${index}_${Math.random().toString(36).substring(2,7)}`;
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

    

    


