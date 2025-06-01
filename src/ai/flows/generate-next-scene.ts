
'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating the next scene in a story.
 * It's being refactored into a multi-step process:
 * 1. AI generates narrative and DESCRIPTIONS of events.
 * 2. TypeScript processes these descriptions to update the game state.
 * This aims for greater reliability and easier debugging.
 *
 * - generateNextScene - A function that takes the current story state and user input, and returns the next scene and updated state.
 * - GenerateNextSceneInput - The input type for the generateNextScene function.
 * - GenerateNextSceneOutput - The return type for the generateNextScene function.
 */

import {ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME} from '@/ai/genkit';
import {z}from 'zod';
import type {
    Item as ItemType, Quest as QuestType, ActiveNPCInfo as ActiveNPCInfoType,
    NPCProfile as NPCProfileType, Skill as SkillType, RawLoreEntry, AIMessageSegment,
    CharacterProfile, StructuredStoryState, GenerateNextSceneInput, GenerateNextSceneOutput,
    DescribedEvent, NewNPCIntroducedEvent, ItemEquippedEvent, ItemUnequippedEvent, EquipmentSlot, LanguageSkillChangeEvent, ItemRarity, ActiveEffect as ActiveEffectType, StatModifier as StatModifierType, StoryArc as StoryArcType
} from '@/types/story'; // StoryArcType
import { EquipSlotEnumInternal } from '@/types/zod-schemas';
import { lookupLoreTool } from '@/ai/tools/lore-tool';
import { addLoreEntry as saveNewLoreEntry } from '@/lib/lore-manager';
import { produce } from 'immer';

// --- SCHEMAS FOR AI COMMUNICATION (INTERNAL, MOSTLY FROM types/story.ts) ---
const ItemRarityEnumInternal = z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']);

const StatModifierSchemaInternal = z.object({
  stat: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'maxHealth', 'maxMana', 'health', 'mana', 'level', 'experiencePoints', 'currency', 'languageReading', 'languageSpeaking']),
  value: z.number(),
  type: z.enum(['add', 'multiply']),
  description: z.string().optional(),
});

const ActiveEffectSchemaInternal = z.object({
  id: z.string().describe("Unique ID for this specific effect on this item instance, e.g., 'effect_sword_fire_dmg_001'. REQUIRED."),
  name: z.string().describe("Descriptive name of the effect, e.g., 'Fiery Aura', 'Eagle Eye'. REQUIRED."),
  description: z.string().describe("Narrative description of what the effect does or looks like. REQUIRED."),
  type: z.enum(['stat_modifier', 'temporary_ability', 'passive_aura']).describe("Type of effect. For now, prioritize 'stat_modifier' or 'passive_aura' for equippable gear. REQUIRED."),
  duration: z.union([z.string().describe("Use 'permanent_while_equipped' for ongoing effects from gear."), z.number()]).optional().describe("Duration of the effect. Use 'permanent_while_equipped' for ongoing effects from gear. Use a number (representing turns) for temporary effects."),
  statModifiers: z.array(StatModifierSchemaInternal).optional().describe("If type is 'stat_modifier', an array of specific stat changes. Each must include 'stat', 'value' (number), and 'type' ('add' or 'multiply')."),
  sourceItemId: z.string().optional().describe("The ID of the item granting this effect (auto-filled by system if needed)."),
});

const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Must be unique if multiple items of the same name exist. REQUIRED."),
  name: z.string().describe("The name of the item. REQUIRED."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function. REQUIRED."),
  equipSlot: EquipSlotEnumInternal.optional().describe("If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), specify the slot it occupies. Examples: 'weapon', 'head', 'body', 'ring'. If the item is not an equippable type of item (e.g., a potion, a key, a generic diary/book), this field MUST BE OMITTED ENTIRELY."),
  isConsumable: z.boolean().optional().describe("True if the item is consumed on use (e.g., potion, scroll)."),
  effectDescription: z.string().optional().describe("Briefly describes the item's effect when used (e.g., 'Restores health', 'Reveals hidden paths'). Relevant if isConsumable or has a direct use effect. For equippable gear with complex effects, prefer 'activeEffects'."),
  isQuestItem: z.boolean().optional().describe("True if this item is specifically required for a quest objective."),
  relevantQuestId: z.string().optional().describe("If isQuestItem is true, the ID of the quest this item is for."),
  basePrice: z.number().optional().describe("The base value or estimated worth of the item. Used for trading. Should be a positive number or zero. MUST BE a number if provided."),
  rarity: ItemRarityEnumInternal.optional().describe("The rarity of the item. Most common items found can omit this or be 'common'."),
  activeEffects: z.array(ActiveEffectSchemaInternal).optional().describe("An array of structured active effects this item provides. If the item is gear and has stat modifiers, define them here under 'stat_modifier' type. Each effect needs a unique id, name, description, type. If 'stat_modifier', include 'statModifiers' array detailing changes. 'duration' should be 'permanent_while_equipped' for gear stat mods."),
});

const SkillSchemaInternal = z.object({
    id: z.string().describe("A unique identifier for the skill, e.g., 'skill_fireball_001'. REQUIRED."),
    name: z.string().describe("The name of the skill or ability. REQUIRED."),
    description: z.string().describe("A clear description of what the skill does, its narrative impact, or basic effect. REQUIRED."),
    type: z.string().describe("A category for the skill, e.g., 'Combat Ability', 'Utility Skill', 'Passive Trait', or a series-specific type. REQUIRED.")
});

const CharacterProfileSchemaInternal = z.object({
  name: z.string().describe('The name of the character. REQUIRED. This field is required.'),
  class: z.string().describe('The class or archetype of the character. REQUIRED. This field is required.'),
  description: z.string().describe('A brief backstory or description of the character. REQUIRED. This field is required.'),
  health: z.number().describe('Current health points of the character. REQUIRED. This field is required. This reflects effective health including item bonuses/penalties.'),
  maxHealth: z.number().describe('Maximum health points of the character. REQUIRED. This field is required. This reflects effective maxHealth including item bonuses/penalties.'),
  mana: z.number().optional().describe('Current mana or magic points of the character. Must be a number; use 0 if not applicable, or omit. This reflects effective mana.'),
  maxMana: z.number().optional().describe('Maximum mana or magic points. Must be a number; use 0 if not applicable, or omit. This reflects effective maxMana.'),
  strength: z.number().optional().describe('Character\'s physical power, or omit. This reflects effective strength.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes, or omit. This reflects effective dexterity.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness, or omit. This reflects effective constitution.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and memory, or omit. This reflects effective intelligence.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition, or omit. This reflects effective wisdom.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence, or omit. This reflects effective charisma.'),
  level: z.number().describe('The current level of the character. REQUIRED. This field is required.'),
  experiencePoints: z.number().describe('Current experience points of the character. REQUIRED. This field is required.'),
  experienceToNextLevel: z.number().describe('Experience points needed for the character to reach the next level. REQUIRED. This field is required.'),
  skillsAndAbilities: z.array(SkillSchemaInternal).optional().describe("A list of the character's current skills and abilities. Each includes an id, name, description, and type."),
  currency: z.number().optional().describe("Character's current currency (e.g., gold). Default to 0 if not set. MUST BE a number if provided."),
  languageReading: z.number().optional().describe("Character's understanding of the local written language (0-100). If not present, assume 100 (fluent). This reflects effective skill. MUST BE a number if provided."),
  languageSpeaking: z.number().optional().describe("Character's understanding of the local spoken language (0-100). If not present, assume 100 (fluent). This reflects effective skill. MUST BE a number if provided."),
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
}).describe("A record of the character's equipped items. All 10 slots MUST be present, with an item object (including optional rarity and 'activeEffects') or 'null' if empty. REQUIRED.");


const QuestStatusEnumInternal = z.enum(['active', 'completed', 'failed']);
const QuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("A clear description of this specific objective for the quest. REQUIRED."),
  isCompleted: z.boolean().describe("Whether this specific objective is completed. REQUIRED.")
});

const QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("Amount of experience points awarded. MUST BE a number if provided."),
  items: z.array(ItemSchemaInternal).optional().describe("An array of item objects awarded. Each item must have a unique ID, name, description, 'basePrice' (number), optional 'rarity', and optional 'activeEffects' (with structured 'statModifiers' if type is 'stat_modifier'). 'equipSlot' should be OMITTED for non-equippable items."),
  currency: z.number().optional().describe("Amount of currency awarded. MUST BE a number if provided."),
}).describe("Rewards defined when the quest is created, to be given upon quest completion. Omit if no specific material rewards.");

const QuestSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the quest, e.g., 'quest_main_001' or 'quest_side_witch_forest_003'. Must be unique among all quests. REQUIRED."),
  title: z.string().optional().describe("A short, engaging title for the quest."),
  type: z.enum(['main', 'side', 'dynamic', 'arc_goal']).describe("The type of quest. REQUIRED."), // arc_goal
  description: z.string().describe("A clear description of the quest's overall objective. REQUIRED."),
  status: QuestStatusEnumInternal.describe("The current status of the quest, either 'active' or 'completed' or 'failed'. REQUIRED."),
  storyArcId: z.string().optional().describe("If a 'main' quest, the ID of the Story Arc it belongs to."), // Renamed
  orderInStoryArc: z.number().optional().describe("If a 'main' quest, its suggested sequence within the Story Arc."), // Renamed
  category: z.string().optional().describe("An optional category for the quest. Omit if not clearly classifiable."),
  objectives: z.array(QuestObjectiveSchemaInternal).optional().describe("An optional list of specific sub-objectives for this quest."),
  rewards: QuestRewardsSchemaInternal.optional(),
  updatedAt: z.string().optional().describe("Timestamp of the last update to this quest."),
});

// Renamed from ChapterSchemaInternal
const StoryArcSchemaInternal = z.object({
    id: z.string().describe("REQUIRED."),
    title: z.string().describe("REQUIRED."),
    description: z.string().describe("REQUIRED."),
    order: z.number().describe("REQUIRED."),
    mainQuestIds: z.array(z.string()).describe("REQUIRED (can be empty array)."),
    isCompleted: z.boolean().describe("REQUIRED."),
    unlockCondition: z.string().optional(),
});


const NPCDialogueEntrySchemaInternal = z.object({
    playerInput: z.string().optional(),
    npcResponse: z.string().describe("REQUIRED."),
    turnId: z.string().describe("REQUIRED."),
});

const MerchantItemSchemaInternal = ItemSchemaInternal.extend({
  price: z.number().optional().describe("The price this merchant sells the item for. Must be a number if provided."),
});

const NPCProfileSchemaInternal = z.object({
    id: z.string().describe("Unique identifier for the NPC. REQUIRED."),
    name: z.string().describe("REQUIRED."),
    description: z.string().describe("REQUIRED."),
    classOrRole: z.string().optional(),
    health: z.number().optional().describe("Current health. Number."),
    maxHealth: z.number().optional().describe("Max health. Number."),
    mana: z.number().optional().describe("Current mana. Number."),
    maxMana: z.number().optional().describe("Max mana. Number."),
    firstEncounteredLocation: z.string().optional(),
    firstEncounteredTurnId: z.string().optional(),
    relationshipStatus: z.number().describe("Numerical relationship score. REQUIRED. Number."),
    knownFacts: z.array(z.string()).describe("REQUIRED (can be empty array)."),
    dialogueHistory: z.array(NPCDialogueEntrySchemaInternal).optional(),
    lastKnownLocation: z.string().optional(),
    lastSeenTurnId: z.string().optional(),
    seriesContextNotes: z.string().optional(),
    shortTermGoal: z.string().optional(),
    updatedAt: z.string().optional(),
    isMerchant: z.boolean().optional(),
    merchantInventory: z.array(MerchantItemSchemaInternal).optional().describe("If merchant, list items. Each needs id, name, desc, basePrice (number), price (number), optional rarity, and optional 'activeEffects' (with structured 'statModifiers' if type is 'stat_modifier')."),
    buysItemTypes: z.array(z.string()).optional(),
    sellsItemTypes: z.array(z.string()).optional(),
});

const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal.describe('Player character profile. Stats provided here (health, strength etc.) reflect their current capabilities including effects from equipment. REQUIRED.'),
  currentLocation: z.string().describe('Current location. REQUIRED.'),
  inventory: z.array(ItemSchemaInternal).describe('Unequipped items. Each item has id, name, description, basePrice (number), optional rarity, and optional activeEffects (if any, include statModifiers with numeric values). OMIT equipSlot for non-equippable items. REQUIRED (can be empty array).'),
  equippedItems: EquipmentSlotsSchemaInternal.describe("REQUIRED."),
  quests: z.array(QuestSchemaInternal).describe("All quests. Rewards items should also include optional 'activeEffects' and 'rarity'. REQUIRED (can be empty array)."),
  storyArcs: z.array(StoryArcSchemaInternal).describe("Story arcs. REQUIRED (can be empty array)."), // Renamed
  currentStoryArcId: z.string().optional().describe("Active story arc ID."), // Renamed
  worldFacts: z.array(z.string()).describe('Key world facts. REQUIRED (can be empty array).'),
  trackedNPCs: z.array(NPCProfileSchemaInternal).describe("NPCs. Merchant items also need optional 'activeEffects' and 'rarity'. REQUIRED (can be empty array)."),
  storySummary: z.string().optional().describe("Running story summary."),
});

const GenerateNextSceneInputSchemaInternal = z.object({
  currentScene: z.string(),
  userInput: z.string(),
  storyState: StructuredStoryStateSchemaInternal,
  seriesName: z.string(),
  seriesStyleGuide: z.string().optional(),
  currentTurnId: z.string(),
  usePremiumAI: z.boolean().optional(),
});

// --- NEW SCHEMAS FOR MULTI-STEP APPROACH ---
const DescribedEventBaseSchema = z.object({
  reason: z.string().optional(),
});

const HealthChangeEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('healthChange'), characterTarget: z.union([z.literal('player'), z.string()]), amount: z.number() });
const ManaChangeEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('manaChange'), characterTarget: z.union([z.literal('player'), z.string()]), amount: z.number() });
const XPChangeEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('xpChange'), amount: z.number() });
const LevelUpEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('levelUp'), newLevel: z.number(), rewardSuggestion: z.string().optional() });
const CurrencyChangeEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('currencyChange'), amount: z.number() });
const LanguageSkillChangeEventSchemaInternal = DescribedEventBaseSchema.extend({ type: z.literal('languageSkillChange'), skillTarget: z.enum(['reading', 'speaking']), amount: z.number().min(1).max(20) });

const ItemFoundEventSchema = DescribedEventBaseSchema.extend({
  type: z.literal('itemFound'),
  itemName: z.string().describe("REQUIRED."),
  itemDescription: z.string().describe("REQUIRED."),
  quantity: z.number().optional().default(1),
  suggestedBasePrice: z.number().optional().describe("AI's estimate for base value (number, can be 0). MUST BE a number if provided."),
  equipSlot: EquipSlotEnumInternal.optional().describe("OMIT if not equippable gear."),
  isConsumable: z.boolean().optional(),
  effectDescription: z.string().optional().describe("For simple consumables. Prefer 'activeEffects' for complex gear."),
  isQuestItem: z.boolean().optional(),
  relevantQuestId: z.string().optional(),
  rarity: ItemRarityEnumInternal.optional(),
  activeEffects: z.array(ActiveEffectSchemaInternal).optional().describe("Structured active effects, esp. for gear. If 'stat_modifier', include 'statModifiers' array."),
});
const ItemLostEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('itemLost'), itemIdOrName: z.string(), quantity: z.number().optional().default(1) });
const ItemUsedEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('itemUsed'), itemIdOrName: z.string().describe("The ID or name of the item consumed. REQUIRED.") });
const ItemEquippedEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('itemEquipped'), itemIdOrName: z.string(), slot: EquipSlotEnumInternal });
const ItemUnequippedEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('itemUnequipped'), itemIdOrName: z.string(), slot: EquipSlotEnumInternal });

const QuestAcceptedEventSchema = DescribedEventBaseSchema.extend({
  type: z.literal('questAccepted'),
  questIdSuggestion: z.string().optional(),
  questTitle: z.string().optional(),
  questDescription: z.string().describe("REQUIRED."),
  questType: z.enum(['main', 'side', 'dynamic', 'arc_goal']).optional(), // arc_goal
  storyArcId: z.string().optional(), // Renamed
  orderInStoryArc: z.number().optional(), // Renamed
  category: z.string().optional(),
  objectives: z.array(z.object({ description: z.string().describe("REQUIRED."), isCompleted: z.literal(false).describe("REQUIRED.") })).optional(),
  rewards: z.object({
    experiencePoints: z.number().optional().describe("MUST BE a number if provided."),
    currency: z.number().optional().describe("Currency amount (number). MUST BE a number if provided."),
    items: z.array(ItemSchemaInternal.pick({id:true, name:true, description:true, equipSlot:true, isConsumable:true, effectDescription:true, isQuestItem:true, relevantQuestId:true, basePrice:true, rarity: true, activeEffects: true }).deepPartial().extend({basePrice: z.number().optional().describe("Must be number if provided.")})).optional().describe("Reward items with properties, 'basePrice' (number), optional 'rarity', and optional 'activeEffects' (with structured 'statModifiers' if type is 'stat_modifier').")
  }).optional(),
});
const QuestObjectiveUpdateEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('questObjectiveUpdate'), questIdOrDescription: z.string(), objectiveDescription: z.string(), objectiveCompleted: z.boolean() });
const QuestCompletedEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('questCompleted'), questIdOrDescription: z.string() });
const QuestFailedEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('questFailed'), questIdOrDescription: z.string() });

const NPCRelationshipChangeEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('npcRelationshipChange'), npcName: z.string(), changeAmount: z.number(), newStatus: z.number().optional() });
const NPCStateChangeEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('npcStateChange'), npcName: z.string(), newState: z.string() });
const NewNPCIntroducedEventSchemaInternal = z.object({
  type: z.literal('newNPCIntroduced').describe("REQUIRED."),
  npcName: z.string().describe("REQUIRED."),
  npcDescription: z.string().describe("REQUIRED."),
  classOrRole: z.string().optional(),
  initialRelationship: z.number().optional().default(0).describe("Initial relationship (number). MUST BE a number if provided."),
  isMerchant: z.boolean().optional().default(false),
  initialHealth: z.number().optional().describe("Starting health (number). MUST BE a number if provided."),
  initialMana: z.number().optional().describe("Starting mana (number). MUST BE a number if provided."),
  merchantSellsItemTypes: z.array(z.string()).optional(),
  merchantBuysItemTypes: z.array(z.string()).optional(),
  reason: z.string().optional(),
});

const WorldFactAddedEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('worldFactAdded'), fact: z.string() });
const WorldFactRemovedEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('worldFactRemoved'), factDescription: z.string() });
const WorldFactUpdatedEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('worldFactUpdated'), oldFactDescription: z.string(), newFact: z.string() });

const SkillLearnedEventSchema = DescribedEventBaseSchema.extend({
  type: z.literal('skillLearned'),
  skillName: z.string().describe("REQUIRED."),
  skillDescription: z.string().describe("REQUIRED."),
  skillType: z.string().describe("REQUIRED.")
});

const DescribedEventSchema = z.discriminatedUnion("type", [
  HealthChangeEventSchema, ManaChangeEventSchema, XPChangeEventSchema, LevelUpEventSchema, CurrencyChangeEventSchema, LanguageSkillChangeEventSchemaInternal,
  ItemFoundEventSchema, ItemLostEventSchema, ItemUsedEventSchema, ItemEquippedEventSchema, ItemUnequippedEventSchema,
  QuestAcceptedEventSchema, QuestObjectiveUpdateEventSchema, QuestCompletedEventSchema, QuestFailedEventSchema,
  NPCRelationshipChangeEventSchema, NPCStateChangeEventSchema, NewNPCIntroducedEventSchemaInternal,
  WorldFactAddedEventSchema, WorldFactRemovedEventSchema, WorldFactUpdatedEventSchema,
  SkillLearnedEventSchema
]).describe("A described game event. Numeric fields (prices, amounts, stats) MUST be numbers. Items involved (found, reward) should include optional 'rarity' and optional 'activeEffects' (with structured 'statModifiers' if type is 'stat_modifier').");

const AIMessageSegmentSchemaInternal = z.object({
    speaker: z.string().describe("Required. The speaker of the message, e.g., 'GM', or an NPC's name."),
    content: z.string().describe("Required. The content of the message.")
});

const ActiveNPCInfoSchemaInternal = z.object({
    name: z.string().describe("REQUIRED."),
    description: z.string().optional(),
    keyDialogueOrAction: z.string().optional()
});

const NextScene_RawLoreEntryZodSchema = z.object({
  keyword: z.string().describe("REQUIRED."),
  content: z.string().describe("REQUIRED."),
  category: z.string().optional(),
});

const NarrativeAndEventsOutputSchema = z.object({
  generatedMessages: z.array(AIMessageSegmentSchemaInternal).describe("Each message MUST include 'speaker' and 'content' fields. REQUIRED."),
  describedEvents: z.array(DescribedEventSchema).optional().describe("Events that occurred. Ensure numeric fields are numbers. Items should include optional 'rarity' and optional 'activeEffects' (with structured 'statModifiers' if type is 'stat_modifier')."),
  activeNPCsInScene: z.array(ActiveNPCInfoSchemaInternal).optional().describe("Each entry MUST have a 'name' if array is provided."),
  newLoreProposals: z.array(NextScene_RawLoreEntryZodSchema).optional().describe("Each entry MUST have 'keyword' and 'content' if array is provided."),
  sceneSummaryFragment: z.string().describe("REQUIRED. A brief summary of this scene's events."),
});

const GenerateNextSceneOutputSchemaInternal = z.object({
  generatedMessages: z.array(AIMessageSegmentSchemaInternal).describe("REQUIRED."),
  updatedStoryState: StructuredStoryStateSchemaInternal.describe("REQUIRED."),
  activeNPCsInScene: z.array(ActiveNPCInfoSchemaInternal).optional(),
  newLoreEntries: z.array(NextScene_RawLoreEntryZodSchema).optional(),
  updatedStorySummary: z.string().describe("REQUIRED."),
  dataCorrectionWarnings: z.array(z.string()).optional(),
  describedEvents: z.array(DescribedEventSchema).optional(),
});

const NarrativeAndEventsPromptInputSchema = GenerateNextSceneInputSchemaInternal.extend({
  formattedEquippedItemsString: z.string(),
  formattedQuestsString: z.string(),
  formattedTrackedNPCsString: z.string(),
  formattedSkillsString: z.string(),
});


export async function generateNextScene(input: GenerateNextSceneInput): Promise<GenerateNextSceneOutput> {
  return generateNextSceneFlow(input);
}

function formatEquippedItems(equippedItems: Partial<Record<EquipmentSlot, ItemType | null>> | undefined | null): string {
  if (!equippedItems || typeof equippedItems !== 'object') return "Equipment status: Not available.";
  let output = "";
  const slots: EquipmentSlot[] = ['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2'];
  for (const slot of slots) {
    const item = equippedItems[slot as EquipmentSlot];
    let itemDesc = item ? `${item.name} (Val: ${item.basePrice ?? 0}${item.rarity ? `, ${item.rarity}` : ''}${item.activeEffects && item.activeEffects.length > 0 ? `, FX: ${item.activeEffects.map(e => e.name).join(', ')}` : ''})` : 'Empty';
    output += `- ${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${itemDesc}\n`;
  }
  return output.trim();
}

function formatQuests(quests: QuestType[] | undefined | null): string {
  if (!quests || !Array.isArray(quests) || quests.length === 0) return "None active.";
  return quests.map(q => {
    let questStr = `- ${q.title ? `"${q.title}"` : ''}${q.description} (ID: ${q.id}, Status: ${q.status}, Type: ${q.type})`;
    if (q.category) questStr += ` [Category: ${q.category}]`;
    if (q.storyArcId) questStr += ` [Arc: ${q.storyArcId}]`; // Added arc info
    if (q.objectives && q.objectives.length > 0) {
      questStr += "\n  Objectives:\n";
      q.objectives.forEach(obj => { questStr += `    - ${obj.description} (${obj.isCompleted ? 'Completed' : 'Pending'})\n`; });
    }
    if (q.rewards) {
        const rewardLabel = q.status === 'completed' ? "Rewards Received" : "Potential Rewards";
        questStr += `\n  ${rewardLabel}:\n`;
        if (q.rewards.experiencePoints) questStr += `    - XP: ${q.rewards.experiencePoints}\n`;
        if (q.rewards.currency) questStr += `    - Currency: ${q.rewards.currency}\n`;
        if (q.rewards.items && q.rewards.items.length > 0) {
            q.rewards.items.forEach(item => { questStr += `    - Item: ${item.name} (Val: ${item.basePrice ?? 0}${item.rarity ? `, ${item.rarity}`: ''}${item.activeEffects && item.activeEffects.length > 0 ? `, FX: ${item.activeEffects.map(e => e.name).join(', ')}` : ''})\n`; });
        }
    }
    return questStr;
  }).join("\n");
}

function formatTrackedNPCs(npcs: NPCProfileType[] | undefined | null): string {
    if (!npcs || !Array.isArray(npcs) || npcs.length === 0) return "None known or tracked.";
    return npcs.map(npc => {
        let relationshipLabel = "Unknown";
        if (npc.relationshipStatus <= -75) relationshipLabel = "Arch-Nemesis";
        else if (npc.relationshipStatus <= -25) relationshipLabel = "Hostile";
        else if (npc.relationshipStatus < 25) relationshipLabel = "Neutral"; // Corrected
        else if (npc.relationshipStatus < 75) relationshipLabel = "Friendly";
        else if (npc.relationshipStatus >= 75) relationshipLabel = "Staunch Ally";

        let npcStr = `- ${npc.name} (ID: ${npc.id}, Relationship: ${relationshipLabel} [${npc.relationshipStatus}])`;
        if (npc.classOrRole) npcStr += ` [${npc.classOrRole}]`;
        if (npc.isMerchant) npcStr += ` [Merchant]`;

        let npcStats = [];
        if (typeof npc.health === 'number' && typeof npc.maxHealth === 'number') {
            npcStats.push(`Health: ${npc.health}/${npc.maxHealth}`);
        }
        if (typeof npc.mana === 'number' && typeof npc.maxMana === 'number') {
            npcStats.push(`Mana: ${npc.mana}/${npc.maxMana}`);
        }
        if (npcStats.length > 0) {
            npcStr += ` (${npcStats.join(', ')})`;
        }

        if (npc.lastKnownLocation) npcStr += ` (Last seen: ${npc.lastKnownLocation} on turn ${npc.lastSeenTurnId || 'unknown'})`;
        if (npc.shortTermGoal) npcStr += `\n  Current Goal: ${npc.shortTermGoal}`;
        npcStr += `\n  Description: ${npc.description}`;
        if (npc.isMerchant && npc.merchantInventory && npc.merchantInventory.length > 0) {
            npcStr += "\n  Wares for Sale:\n";
            npc.merchantInventory.forEach(item => { npcStr += `    - ${item.name} (Price: ${item.price ?? item.basePrice ?? 0}${item.rarity ? `, ${item.rarity}` : ''}${item.activeEffects && item.activeEffects.length > 0 ? `, FX: ${item.activeEffects.map(e => e.name).join(', ')}` : ''}, ID: ${item.id})\n`; });
        }
        return npcStr;
    }).join("\n");
}

function formatSkills(skills: SkillType[] | undefined | null): string {
    if (!skills || !Array.isArray(skills) || skills.length === 0) return "None known.";
    return skills.map(skill => `- ${skill.name} (Type: ${skill.type}): ${skill.description}`).join("\n");
}

const generateNextSceneFlow = ai.defineFlow(
  {
    name: 'generateNextSceneFlow',
    inputSchema: GenerateNextSceneInputSchemaInternal,
    outputSchema: GenerateNextSceneOutputSchemaInternal,
  },
  async (input: GenerateNextSceneInput): Promise<GenerateNextSceneOutput> => {
    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = input.usePremiumAI
        ? { maxOutputTokens: 32000 } 
        : { maxOutputTokens: 8000 };
    const localCorrectionWarnings: string[] = [];

    const narrativeAndEventsPrompt = ai.definePrompt({
        name: 'generateNarrativeAndEventsPrompt',
        model: modelName,
        input: {schema: NarrativeAndEventsPromptInputSchema},
        output: {schema: NarrativeAndEventsOutputSchema.deepPartial()},
        tools: [lookupLoreTool],
        config: modelConfig,
        prompt: `You are a dynamic storyteller. Your entire response MUST be a single, valid JSON object that partially adheres to the 'NarrativeAndEventsOutputSchema' (it's deepPartial). Focus on clear narrative and accurate event descriptions. DO NOT return a full 'updatedStoryState' object.
Series: {{seriesName}}. {{#if seriesStyleGuide}}Style: {{seriesStyleGuide}}{{/if}}
Story Summary: {{#if storyState.storySummary}}{{{storyState.storySummary}}}{{else}}The story has just begun.{{/if}}
Previous Scene Summary: {{currentScene}}
Player Input: {{userInput}}

Character: {{storyState.character.name}} ({{storyState.character.class}}, Lvl {{storyState.character.level}}) - {{storyState.character.description}}
IMPORTANT: The character's stats (HP, Mana, Strength, etc.) already reflect their current capabilities, including any bonuses or penalties from equipped items.
HP: {{storyState.character.health}}/{{storyState.character.maxHealth}}, Mana: {{storyState.character.mana}}/{{storyState.character.maxMana}}, LangRead: {{storyState.character.languageReading}}/100, LangSpeak: {{storyState.character.languageSpeaking}}/100
Currency: {{storyState.character.currency}}, XP: {{storyState.character.experiencePoints}}/{{storyState.character.experienceToNextLevel}}
Skills: {{{formattedSkillsString}}}
Equipped: {{{formattedEquippedItemsString}}}
Location: {{storyState.currentLocation}}
Inventory: {{#if storyState.inventory.length}}{{#each storyState.inventory}}- {{this.name}} (ID:{{this.id}}, Val:{{this.basePrice}}, {{#if this.rarity}}Rarity:{{this.rarity}}{{/if}}{{#if this.activeEffects}}, FX: {{#each this.activeEffects}}{{this.name}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}){{/each}}{{else}}Empty{{/if}}
Quests: {{{formattedQuestsString}}}
World Facts: {{#each storyState.worldFacts}}- {{{this}}}{{else}}- None.{{/each}}
Tracked NPCs: {{{formattedTrackedNPCsString}}}

**Your Task (Strictly Adhere to NarrativeAndEventsOutputSchema - deepPartial):**
1.  **Generate Narrative (generatedMessages):** Continue the story. Each message in this array MUST have a 'speaker' (e.g., "GM", or an NPC name from 'Tracked NPCs') and 'content'. NPC speaker names MUST match 'Tracked NPCs' if they speak. Justify NPC presence (previous scene, this turn's intro, or player input/location). No spontaneous NPC appearances without narrative justification. (REQUIRED)
2.  **Describe Events (describedEvents):** Identify key game events. Use 'DescribedEvent' structure. ALL numeric fields MUST be numbers.
    - 'itemFound': Include 'itemName' (REQUIRED), 'itemDescription' (REQUIRED), 'suggestedBasePrice' (number), optional 'rarity'. 'equipSlot' ONLY for equippable gear. OMIT 'equipSlot' for potions/keys. For gear (esp. uncommon+), MAY include 'activeEffects'. If 'activeEffects' of type 'stat_modifier', include 'statModifiers' (array of {stat, value(number), type('add')}).
    - 'itemUsed': If the player consumes or uses an item from their inventory, generate this event. Include 'itemIdOrName' (REQUIRED), which should be the ID or name of the item consumed from the player's inventory.
    - 'questAccepted': 'questDescription' is REQUIRED. If 'rewards', 'experiencePoints'/'currency' (numbers). Reward 'items' MUST have 'basePrice' (number), optional 'rarity', and MAY have 'activeEffects' (with structured 'statModifiers'). 'objectives' MUST have 'description' (REQUIRED) and 'isCompleted: false' (REQUIRED).
    - 'newNPCIntroduced': 'npcName' and 'npcDescription' are REQUIRED. 'initialRelationship' (number), 'initialHealth' (number), 'initialMana' (number) are optional but MUST be numbers if provided.
    Examples: HealthChange, LanguageSkillChange (amount 1-20, number), ItemEquipped, QuestObjectiveUpdate, NPCRelationshipChange.
3.  **Active NPCs (activeNPCsInScene):** List NPCs who spoke or took significant action. Each MUST have a 'name' if array is provided.
4.  **New Lore (newLoreProposals):** If relevant new "{{seriesName}}" lore, propose entries. Each MUST have 'keyword' and 'content' if array is provided. Use 'lookupLoreTool' for context.
5.  **Scene Summary Fragment (sceneSummaryFragment):** Required. VERY brief (1-2 sentences) summary of ONLY events in THIS scene. (REQUIRED)

**Language Skills:** Low 'languageReading' (0-40) = unreadable text in narration. Low 'languageSpeaking' (0-40) = indecipherable speech in narration. If actions improve language, describe as 'languageSkillChange' event (target 'reading' or 'speaking', amount 5-15, number).
Ensure your ENTIRE output is a single JSON object.
`,
    });

    const formattedEquippedItemsString = formatEquippedItems(input.storyState.equippedItems);
    const formattedQuestsString = formatQuests(input.storyState.quests);
    const formattedTrackedNPCsString = formatTrackedNPCs(input.storyState.trackedNPCs);
    const formattedSkillsString = formatSkills(input.storyState.character.skillsAndAbilities);

    const narrativePromptPayload: z.infer<typeof NarrativeAndEventsPromptInputSchema> = {
      ...input,
      formattedEquippedItemsString,
      formattedQuestsString,
      formattedTrackedNPCsString,
      formattedSkillsString,
    };

    console.log("CLIENT (generateNextSceneFlow): Calling generateNarrativeAndEventsPrompt with payload containing EFFECTIVE character stats:", narrativePromptPayload.storyState.character);
    let aiPartialOutput: z.infer<typeof NarrativeAndEventsOutputSchema.deepPartial> | undefined;
    try {
        const response = await narrativeAndEventsPrompt(narrativePromptPayload);
        aiPartialOutput = response.output;
        console.log("CLIENT (generateNextSceneFlow): generateNarrativeAndEventsPrompt response:", aiPartialOutput);
    } catch (e: any) {
        console.error(`[${modelName}] Error during narrativeAndEventsPrompt:`, e);
        return {
            generatedMessages: [{ speaker: 'GM', content: `(Critical AI Error during narrative generation: ${e.message}. Please try a different action.)` }],
            updatedStoryState: input.storyState,
            updatedStorySummary: input.storyState.storySummary || "Error generating summary.",
            activeNPCsInScene: [], newLoreEntries: [],
            dataCorrectionWarnings: ["AI model failed to generate narrative/events structure."],
            describedEvents: [],
        };
    }

    if (!aiPartialOutput || !aiPartialOutput.generatedMessages || aiPartialOutput.generatedMessages.length === 0 || !aiPartialOutput.generatedMessages.every(msg => msg && msg.speaker && msg.content) || !aiPartialOutput.sceneSummaryFragment) {
        console.warn(`[${modelName}] Null or insufficient output from 'narrativeAndEventsPrompt'. Missing generatedMessages, speaker/content in messages, or sceneSummaryFragment. Output:`, aiPartialOutput);
        localCorrectionWarnings.push("AI model returned empty or malformed narrative/events structure (missing messages, speaker, content, or summary).");
        const errorMessages: AIMessageSegment[] = (aiPartialOutput?.generatedMessages && Array.isArray(aiPartialOutput.generatedMessages) && aiPartialOutput.generatedMessages.length > 0)
            ? aiPartialOutput.generatedMessages.map(msg => ({ speaker: msg?.speaker || 'GM', content: msg?.content || '(AI error: missing content)' })) as AIMessageSegment[]
            : [{ speaker: 'GM', content: `(Critical AI Error: The AI returned an incomplete structure for scene narrative. Messages, speaker/content, or scene summary might be missing. Please try again.)` }];

        return {
            generatedMessages: errorMessages,
            updatedStoryState: input.storyState,
            updatedStorySummary: input.storyState.storySummary || "Error generating summary.",
            activeNPCsInScene: [], newLoreEntries: [],
            dataCorrectionWarnings: localCorrectionWarnings,
            describedEvents: [],
        };
    }


    const storyStateWithBaseCharacterModifiedByEvents = input.storyState;


    const finalOutput: GenerateNextSceneOutput = {
        generatedMessages: aiPartialOutput.generatedMessages!.map(msg => ({
            speaker: msg.speaker || "GM",
            content: msg.content || "(AI provided no content for this message)"
        })) as AIMessageSegment[],
        updatedStoryState: storyStateWithBaseCharacterModifiedByEvents,
        activeNPCsInScene: aiPartialOutput.activeNPCsInScene?.filter(npc => npc && npc.name && npc.name.trim() !== '') as ActiveNPCInfoType[] ?? undefined,
        newLoreEntries: aiPartialOutput.newLoreProposals?.filter(lore => lore && lore.keyword && lore.keyword.trim() !== "" && lore.content && lore.content.trim() !== "") as RawLoreEntry[] ?? undefined,
        updatedStorySummary: (aiPartialOutput.sceneSummaryFragment ? (input.storyState.storySummary || "") + "\n" + aiPartialOutput.sceneSummaryFragment : input.storyState.storySummary || ""),
        dataCorrectionWarnings: localCorrectionWarnings.length > 0 ? Array.from(new Set(localCorrectionWarnings)) : undefined,
        describedEvents: aiPartialOutput.describedEvents as DescribedEvent[] ?? [],
    };

    if (aiPartialOutput.sceneSummaryFragment) {
        finalOutput.updatedStorySummary = ((input.storyState.storySummary || "") + "\n" + aiPartialOutput.sceneSummaryFragment).trim();
    }


    if (finalOutput.newLoreEntries) {
        finalOutput.newLoreEntries.forEach(lore => { if (lore.category === null || lore.category === undefined || (typeof lore.category ==='string' && lore.category.trim() === '')) delete lore.category; });
        if (finalOutput.newLoreEntries.length === 0) delete finalOutput.newLoreEntries;
    }

    if (finalOutput.newLoreEntries && finalOutput.newLoreEntries.length > 0) {
      for (const lore of finalOutput.newLoreEntries) {
        try { saveNewLoreEntry({ keyword: lore.keyword, content: lore.content, category: lore.category, source: 'AI-Discovered'}); }
        catch (e) { console.error("Error saving AI discovered lore:", e); }
      }
    }

    console.log("CLIENT (generateNextSceneFlow): Returning. The updatedStoryState.character sent back is the one AI used for decisions (effective stats). Client will handle base stat updates using describedEvents.", finalOutput.updatedStoryState.character);
    return finalOutput;
  }
);

