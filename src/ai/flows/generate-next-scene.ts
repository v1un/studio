
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
    EquipmentSlot, Item as ItemType, Quest as QuestType, ActiveNPCInfo as ActiveNPCInfoType, 
    NPCProfile as NPCProfileType, Skill as SkillType, RawLoreEntry, AIMessageSegment, 
    CharacterProfile, StructuredStoryState, GenerateNextSceneInput, GenerateNextSceneOutput,
    DescribedEvent 
} from '@/types/story';
import { lookupLoreTool } from '@/ai/tools/lore-tool';
import { addLoreEntry as saveNewLoreEntry } from '@/lib/lore-manager';
import { produce } from 'immer'; 

// --- SCHEMAS FOR AI COMMUNICATION (INTERNAL, MOSTLY FROM types/story.ts) ---
// These are verbose but necessary for the AI to understand the structure it should partially fill or describe.

const EquipSlotEnumInternal = z.enum(['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring'])
  .describe("The equipment slot type, if the item is equippable (e.g., 'weapon', 'head', 'body', 'ring').");

const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Must be unique if multiple items of the same name exist."),
  name: z.string().describe("The name of the item."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function."),
  equipSlot: EquipSlotEnumInternal.optional().describe("If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), specify the slot it occupies. Examples: 'weapon', 'head', 'body', 'ring'. If the item is not an equippable type of item (e.g., a potion, a key, a generic diary/book), this field MUST BE OMITTED ENTIRELY."),
  isConsumable: z.boolean().optional().describe("True if the item is consumed on use (e.g., potion, scroll)."),
  effectDescription: z.string().optional().describe("Briefly describes the item's effect when used (e.g., 'Restores health', 'Reveals hidden paths'). Relevant if isConsumable or has a direct use effect."),
  isQuestItem: z.boolean().optional().describe("True if this item is specifically required for a quest objective."),
  relevantQuestId: z.string().optional().describe("If isQuestItem is true, the ID of the quest this item is for."),
  basePrice: z.number().optional().describe("The base value or estimated worth of the item. Used for trading. Should be a positive number or zero."),
});

const SkillSchemaInternal = z.object({
    id: z.string().describe("A unique identifier for the skill, e.g., 'skill_fireball_001'."),
    name: z.string().describe("The name of the skill or ability."),
    description: z.string().describe("A clear description of what the skill does, its narrative impact, or basic effect."),
    type: z.string().describe("A category for the skill, e.g., 'Combat Ability', 'Utility Skill', 'Passive Trait', or a series-specific type.")
});

const CharacterProfileSchemaInternal = z.object({
  name: z.string().describe('The name of the character. This field is required.'),
  class: z.string().describe('The class or archetype of the character. This field is required.'),
  description: z.string().describe('A brief backstory or description of the character. This field is required.'),
  health: z.number().describe('Current health points of the character. This field is required.'),
  maxHealth: z.number().describe('Maximum health points of the character. This field is required.'),
  mana: z.number().optional().describe('Current mana or magic points of the character. Must be a number; use 0 if not applicable, or omit.'),
  maxMana: z.number().optional().describe('Maximum mana or magic points. Must be a number; use 0 if not applicable, or omit.'),
  strength: z.number().optional().describe('Character\'s physical power, or omit.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes, or omit.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness, or omit.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and memory, or omit.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition, or omit.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence, or omit.'),
  level: z.number().describe('The current level of the character. This field is required.'),
  experiencePoints: z.number().describe('Current experience points of the character. This field is required.'),
  experienceToNextLevel: z.number().describe('Experience points needed for the character to reach the next level. This field is required.'),
  skillsAndAbilities: z.array(SkillSchemaInternal).optional().describe("A list of the character's current skills and abilities. Each includes an id, name, description, and type."),
  currency: z.number().optional().describe("Character's current currency (e.g., gold). Default to 0 if not set."),
  languageUnderstanding: z.number().optional().describe("Character's understanding of the local language (0-100). If not present, assume 100 (fluent)."),
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
}).describe("A record of the character's equipped items. All 10 slots MUST be present, with an item object or 'null' if the slot is empty.");


const QuestStatusEnumInternal = z.enum(['active', 'completed']);
const QuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("A clear description of this specific objective for the quest."),
  isCompleted: z.boolean().describe("Whether this specific objective is completed.")
});

const QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("Amount of experience points awarded."),
  items: z.array(ItemSchemaInternal).optional().describe("An array of item objects awarded. Each item must have a unique ID, name, description, 'basePrice', and optional 'equipSlot' (omit if not inherently equippable gear). Also define `isConsumable`, `effectDescription`, etc., if applicable for reward items."),
  currency: z.number().optional().describe("Amount of currency awarded."),
}).describe("Rewards defined when the quest is created, to be given upon quest completion. Omit if no specific material rewards.");

const QuestSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the quest, e.g., 'quest_main_001' or 'quest_side_witch_forest_003'. Must be unique among all quests."),
  description: z.string().describe("A clear description of the quest's overall objective."),
  status: QuestStatusEnumInternal.describe("The current status of the quest, either 'active' or 'completed'."),
  category: z.string().optional().describe("An optional category for the quest (e.g., 'Main Story', 'Side Quest', 'Personal Goal', 'Exploration'). Omit if not clearly classifiable."),
  objectives: z.array(QuestObjectiveSchemaInternal).optional().describe("An optional list of specific sub-objectives for this quest. Use for more complex quests. If the quest is simple, this can be omitted."),
  rewards: QuestRewardsSchemaInternal.optional()
});

const NPCDialogueEntrySchemaInternal = z.object({
    playerInput: z.string().optional().describe("The player's input that led to the NPC's response, if applicable. This helps track the conversation flow."),
    npcResponse: z.string().describe("The NPC's spoken dialogue or a summary of their significant verbal response."),
    turnId: z.string().describe("The ID of the story turn in which this dialogue occurred."),
});

const MerchantItemSchemaInternal = ItemSchemaInternal.extend({
  price: z.number().optional().describe("The price this merchant sells the item for. If not specified, can be derived from basePrice or context."),
});

const NPCProfileSchemaInternal = z.object({
    id: z.string().describe("Unique identifier for the NPC. If creating a new NPC profile, make this unique (e.g., npc_[name]_[unique_suffix]). If updating, use existing ID."),
    name: z.string().describe("NPC's name."),
    description: z.string().describe("Physical appearance, general demeanor, key characteristics. Update if new details are learned."),
    classOrRole: z.string().optional().describe("e.g., 'Merchant', 'Guard Captain', 'Mysterious Stranger'."),
    firstEncounteredLocation: z.string().optional().describe("Location where NPC was first met. Set only when creating new profile."),
    firstEncounteredTurnId: z.string().optional().describe("ID of the story turn when first met. Set only when creating new profile."),
    relationshipStatus: z.number().describe("Numerical score representing the player's relationship with the NPC (e.g., -100 Hostile, 0 Neutral, 100 Allied). Update based on interactions."),
    knownFacts: z.array(z.string()).describe("Specific pieces of information player has learned about this NPC. Add new facts as they are discovered."),
    dialogueHistory: z.array(NPCDialogueEntrySchemaInternal).optional().describe("Log of key interaction moments. Add new significant dialogues."),
    lastKnownLocation: z.string().optional().describe("Last known location of the NPC. Update if they move or are seen elsewhere."),
    lastSeenTurnId: z.string().optional().describe("ID of the story turn when NPC was last seen or interacted with. Update with current turn ID."),
    seriesContextNotes: z.string().optional().describe("AI-internal note about their role if from a known series (not for player). Set once if applicable."),
    shortTermGoal: z.string().optional().describe("A simple, immediate goal this NPC might be pursuing, influencing their actions or comments. Can be set or updated by the AI based on events."),
    updatedAt: z.string().optional().describe("Timestamp of the last update to this profile. Update with current time."),
    isMerchant: z.boolean().optional().describe("Set to true if this NPC is a merchant and can buy/sell items."),
    merchantInventory: z.array(MerchantItemSchemaInternal).optional().describe("If isMerchant, a list of items the merchant has for sale. Each item includes its 'id', 'name', 'description', 'basePrice', and a 'price' they sell it for. New items added to their stock should also have these details."),
    buysItemTypes: z.array(z.string()).optional().describe("If isMerchant, optional list of item categories they are interested in buying (e.g., 'Potions', 'Old Books'). Influences AI decision on what they might buy."),
    sellsItemTypes: z.array(z.string()).optional().describe("If isMerchant, optional list of item categories they typically sell (e.g., 'Adventuring Gear', 'Herbs')."),
});

const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal.describe('The profile of the main character, including core stats, level, XP, currency, starting skills/abilities, and languageUnderstanding (0-100).'),
  currentLocation: z.string().describe('The current location of the character in the story.'),
  inventory: z.array(ItemSchemaInternal).describe('A list of UNequipped items in the character\'s inventory. Each item is an object with id, name, description, and basePrice. If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), include its equipSlot; otherwise, the equipSlot field MUST BE OMITTED ENTIRELY. Also include `isConsumable`, `effectDescription`, `isQuestItem`, `relevantQuestId` if applicable.'),
  equippedItems: EquipmentSlotsSchemaInternal,
  quests: z.array(QuestSchemaInternal).describe("A list of all quests. Each quest is an object with 'id', 'description', 'status', its 'rewards' (defined at quest creation specifying what the player will get on completion, including currency and items with basePrice), optionally 'category', and a list of 'objectives' (each with 'description' and 'isCompleted')."),
  worldFacts: z.array(z.string()).describe('Key facts or observations about the game world state. These facts should reflect the character\'s current understanding and immediate environment, including the presence of significant NPCs. Add new facts as they are discovered, modify existing ones if they change, or remove them if they become outdated or irrelevant. Narrate significant changes to worldFacts if the character would perceive them. A worldFact like "Language barrier makes communication difficult" should be present if languageUnderstanding is low, and removed if it improves significantly.'),
  trackedNPCs: z.array(NPCProfileSchemaInternal).describe("A list of detailed profiles for significant NPCs encountered. Update existing profiles or add new ones as NPCs are introduced or interacted with. If an NPC is a merchant, set 'isMerchant', 'merchantInventory', 'buysItemTypes', 'sellsItemTypes'."),
  storySummary: z.string().optional().describe("A brief, running summary of key story events and character developments so far. This summary will be updated each turn."),
});

// Input for the overall flow - remains the same
const GenerateNextSceneInputSchemaInternal = z.object({
  currentScene: z.string().describe('A summary of the last few GM messages. This provides context for the AI.'),
  userInput: z.string().describe('The user input (action or dialogue).'),
  storyState: StructuredStoryStateSchemaInternal.describe('The current structured state of the story.'),
  seriesName: z.string().describe('The name of the series this story is based on, for contextual awareness.'),
  seriesStyleGuide: z.string().optional().describe('A brief style guide for the series to maintain tone and themes.'),
  currentTurnId: z.string().describe('The ID of the current story turn, for logging in NPC dialogue history etc.'),
  usePremiumAI: z.boolean().optional().describe("Whether to use the premium AI model."),
});

// --- NEW SCHEMAS FOR MULTI-STEP APPROACH ---
const DescribedEventBaseSchema = z.object({
  // type: z.nativeEnum(EventType), // This doesn't work directly with z.discriminatedUnion's expectations
  reason: z.string().optional().describe("Optional narrative reason for the event."),
});

const HealthChangeEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('healthChange'), characterTarget: z.union([z.literal('player'), z.string()]).describe("Target of health change, 'player' or NPC name."), amount: z.number().describe("Amount of health change (can be negative).") });
const ManaChangeEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('manaChange'), characterTarget: z.union([z.literal('player'), z.string()]), amount: z.number() });
const XPChangeEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('xpChange'), amount: z.number() });
const LevelUpEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('levelUp'), newLevel: z.number(), rewardSuggestion: z.string().optional().describe("e.g., 'suggests increasing strength' or 'new skill: Parry'") });
const CurrencyChangeEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('currencyChange'), amount: z.number() });
const LanguageImprovementEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('languageImprovement'), amount: z.number().min(1).max(20).describe("Small, reasonable amount of improvement (1-20).") });

const ItemFoundEventSchema = DescribedEventBaseSchema.extend({ 
  type: z.literal('itemFound'), 
  itemName: z.string(), 
  itemDescription: z.string(), 
  quantity: z.number().optional().default(1),
  suggestedBasePrice: z.number().optional().describe("AI's estimate for base value."), 
  equipSlot: EquipSlotEnumInternal.optional(),
  isConsumable: z.boolean().optional(),
  effectDescription: z.string().optional(),
  isQuestItem: z.boolean().optional(),
  relevantQuestId: z.string().optional(),
});
const ItemLostEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('itemLost'), itemIdOrName: z.string().describe("ID if known, otherwise name."), quantity: z.number().optional().default(1) });
const ItemUsedEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('itemUsed'), itemIdOrName: z.string().describe("ID if known, otherwise name of item consumed/used.") });

const QuestAcceptedEventSchema = DescribedEventBaseSchema.extend({ 
  type: z.literal('questAccepted'), 
  questIdSuggestion: z.string().optional().describe("AI suggested unique ID for the quest."),
  questDescription: z.string(), 
  category: z.string().optional(), 
  objectives: z.array(z.object({ description: z.string() })).optional().describe("Descriptions for new objectives."), 
  rewards: z.object({ 
    experiencePoints: z.number().optional(), 
    currency: z.number().optional(), 
    itemNames: z.array(z.string()).optional().describe("Names of items to be rewarded. Details like price to be determined later or by TypeScript.")
  }).optional(),
});
const QuestObjectiveUpdateEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('questObjectiveUpdate'), questIdOrDescription: z.string().describe("ID or distinguishing description of the quest."), objectiveDescription: z.string().describe("Description of the objective being updated."), objectiveCompleted: z.boolean() });
const QuestCompletedEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('questCompleted'), questIdOrDescription: z.string().describe("ID or distinguishing description of the completed quest.") });

const NPCRelationshipChangeEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('npcRelationshipChange'), npcName: z.string(), changeAmount: z.number().describe("e.g., +10, -20. Total will be capped at -100 to 100."), newStatus: z.number().optional().describe("AI's assessment of the new relationship score.") });
const NPCStateChangeEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('npcStateChange'), npcName: z.string(), newState: z.string().describe("e.g., 'hostile', 'friendly', 'following', 'fled'") });
const NewNPCIntroducedEventSchema = DescribedEventBaseSchema.extend({
  type: z.literal('newNPCIntroduced'),
  npcName: z.string(),
  npcDescription: z.string().describe("Brief description of appearance and demeanor."),
  classOrRole: z.string().optional(),
  initialRelationship: z.number().optional().default(0).describe("Initial relationship score."),
  isMerchant: z.boolean().optional().default(false),
});

const WorldFactAddedEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('worldFactAdded'), fact: z.string() });
const WorldFactRemovedEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('worldFactRemoved'), factDescription: z.string().describe("Description of the fact to be removed.") });
const WorldFactUpdatedEventSchema = DescribedEventBaseSchema.extend({ type: z.literal('worldFactUpdated'), oldFactDescription: z.string().describe("Description of the fact to be updated."), newFact: z.string() });

const SkillLearnedEventSchema = DescribedEventBaseSchema.extend({
  type: z.literal('skillLearned'),
  skillName: z.string(),
  skillDescription: z.string(),
  skillType: z.string()
});

const DescribedEventSchema = z.discriminatedUnion("type", [
  HealthChangeEventSchema, ManaChangeEventSchema, XPChangeEventSchema, LevelUpEventSchema, CurrencyChangeEventSchema, LanguageImprovementEventSchema,
  ItemFoundEventSchema, ItemLostEventSchema, ItemUsedEventSchema, // ItemEquipped/Unequipped handled by user intent typically
  QuestAcceptedEventSchema, QuestObjectiveUpdateEventSchema, QuestCompletedEventSchema,
  NPCRelationshipChangeEventSchema, NPCStateChangeEventSchema, NewNPCIntroducedEventSchema,
  WorldFactAddedEventSchema, WorldFactRemovedEventSchema, WorldFactUpdatedEventSchema,
  SkillLearnedEventSchema
]).describe("A described game event resulting from player action or narrative progression.");

// Schema for AIMessageSegment from types/story.ts, but internal to this flow for clarity
const AIMessageSegmentSchemaInternal = z.object({
    speaker: z.string().describe("Use 'GM' for general narration, world descriptions, or outcomes of player actions. For Non-Player Character dialogue, use the NPC's exact name as defined in `trackedNPCs` (e.g., 'Elara the Wise', 'Guard Captain Rex'). Ensure the NPC name matches an existing tracked NPC if they are speaking."),
    content: z.string().describe("The narrative text or the NPC's spoken dialogue. Keep segments relatively focused; if GM narration shifts to NPC dialogue, or one NPC stops speaking and another starts, create a new message segment.")
});

// Schema for ActiveNPCInfo from types/story.ts, but internal for clarity
const ActiveNPCInfoSchemaInternal = z.object({
    name: z.string().describe("The name of the NPC, if known or identifiable."),
    description: z.string().optional().describe("A brief description of the NPC if newly introduced or particularly relevant."),
    keyDialogueOrAction: z.string().optional().describe("A key line of dialogue spoken by the NPC or a significant action they took in this scene.")
});

// Schema for RawLoreEntry from types/story.ts, but internal for clarity
const RawLoreEntrySchemaInternal = z.object({
  keyword: z.string().describe("The specific term, character name, location, or concept from the series (e.g., 'Hokage', 'Death Note', 'Subaru Natsuki', 'Emerald Sustrai')."),
  content: z.string().describe("A concise (2-3 sentences) description or piece of lore about the keyword, accurate to the specified series."),
  category: z.string().optional().describe("An optional category for the lore entry (e.g., 'Character', 'Location', 'Ability', 'Organization', 'Concept'). If no category is applicable or known, this field should be omitted entirely."),
});


const NarrativeAndEventsOutputSchema = z.object({
  generatedMessages: z.array(AIMessageSegmentSchemaInternal).describe("The narrative text and NPC dialogue for the current scene/turn."),
  describedEvents: z.array(DescribedEventSchema).optional().describe("An array of structured events that occurred in the scene, described by the AI. TypeScript will use these to update the game state."),
  activeNPCsInScene: z.array(ActiveNPCInfoSchemaInternal).optional().describe("NPCs active in this scene."),
  newLoreProposals: z.array(RawLoreEntrySchemaInternal).optional().describe("New lore entries suggested by the AI."),
  sceneSummaryFragment: z.string().describe("A very brief summary of ONLY the key events that transpired in THIS generated scene/turn."),
  // No updatedStoryState here, as it's now built by TypeScript
});
// --- END NEW SCHEMAS ---


// Final output schema for the flow - remains the same overall structure
const GenerateNextSceneOutputSchemaInternal = z.object({
  generatedMessages: z.array(AIMessageSegmentSchemaInternal).describe("An array of message segments that constitute the AI's response."),
  updatedStoryState: StructuredStoryStateSchemaInternal.describe('The updated structured story state after the scene.'),
  activeNPCsInScene: z.array(ActiveNPCInfoSchemaInternal).optional().describe("A list of NPCs who were active in this generated scene."),
  newLoreEntries: z.array(RawLoreEntrySchemaInternal).optional().describe("An array of new lore entries discovered or revealed in this scene."),
  updatedStorySummary: z.string().describe("The new running summary of the story, incorporating events from this scene."),
  dataCorrectionWarnings: z.array(z.string()).optional().describe("An array of warnings if the AI's output for story state required corrections or fallbacks."),
});

// Schema for the input to the first AI prompt in the multi-step flow
const NarrativeAndEventsPromptInputSchema = GenerateNextSceneInputSchemaInternal.extend({
  formattedEquippedItemsString: z.string().describe("Pre-formatted string of equipped items."),
  formattedQuestsString: z.string().describe("Pre-formatted string of quests."),
  formattedTrackedNPCsString: z.string().describe("Pre-formatted string summarizing tracked NPCs."),
  formattedSkillsString: z.string().describe("Pre-formatted string of character's skills."),
});


export async function generateNextScene(input: GenerateNextSceneInput): Promise<GenerateNextSceneOutput> {
  return generateNextSceneFlow(input);
}

// Helper functions for formatting (can be moved to a utils file later)
function formatEquippedItems(equippedItems: Partial<Record<EquipmentSlot, ItemType | null>> | undefined | null): string {
  if (!equippedItems || typeof equippedItems !== 'object') return "Equipment status: Not available.";
  let output = "";
  const slots: EquipmentSlot[] = ['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2'];
  for (const slot of slots) {
    const item = equippedItems[slot];
    output += `- ${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${item ? `${item.name} (Value: ${item.basePrice ?? 0})` : 'Empty'}\n`;
  }
  return output.trim();
}

function formatQuests(quests: QuestType[] | undefined | null): string {
  if (!quests || !Array.isArray(quests) || quests.length === 0) return "None active.";
  return quests.map(q => {
    let questStr = `- ${q.description} (ID: ${q.id}, Status: ${q.status})`;
    if (q.category) questStr += ` [Category: ${q.category}]`;
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
            q.rewards.items.forEach(item => { questStr += `    - Item: ${item.name} (Value: ${item.basePrice ?? 0})\n`; });
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
        else if (npc.relationshipStatus < 25) relationshipLabel = "Neutral";
        else if (npc.relationshipStatus < 75) relationshipLabel = "Friendly";
        else if (npc.relationshipStatus >= 75) relationshipLabel = "Staunch Ally";
        let npcStr = `- ${npc.name} (ID: ${npc.id}, Relationship: ${relationshipLabel} [${npc.relationshipStatus}])`;
        if (npc.classOrRole) npcStr += ` [${npc.classOrRole}]`;
        if (npc.isMerchant) npcStr += ` [Merchant]`;
        if (npc.lastKnownLocation) npcStr += ` (Last seen: ${npc.lastKnownLocation} on turn ${npc.lastSeenTurnId || 'unknown'})`;
        if (npc.shortTermGoal) npcStr += `\n  Current Goal: ${npc.shortTermGoal}`;
         npcStr += `\n  Description: ${npc.description}`;
        if (npc.isMerchant && npc.merchantInventory && npc.merchantInventory.length > 0) {
            npcStr += "\n  Wares for Sale:\n";
            npc.merchantInventory.forEach(item => { npcStr += `    - ${item.name} (Price: ${item.price ?? item.basePrice ?? 0}, ID: ${item.id})\n`; });
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
    const localCorrectionWarnings: string[] = [];

    // ----- AI Call 1: Generate Narrative and Described Events -----
    const narrativeAndEventsPrompt = ai.definePrompt({
        name: 'generateNarrativeAndEventsPrompt', 
        model: modelName,
        input: {schema: NarrativeAndEventsPromptInputSchema},
        output: {schema: NarrativeAndEventsOutputSchema.deepPartial()}, 
        tools: [lookupLoreTool], 
        prompt: `You are a dynamic storyteller. Based on the player's action and current story context, generate the next part of the story.
This story is set in the universe of: {{seriesName}}.
{{#if seriesStyleGuide}}Series Style Guide: {{seriesStyleGuide}}{{/if}}

Story Summary So Far:
{{#if storyState.storySummary}}{{{storyState.storySummary}}}{{else}}The story has just begun.{{/if}}

Context from Previous Scene/Messages (Summary): {{currentScene}}
Player Input: {{userInput}}

Current Player Character:
- Name: {{storyState.character.name}}, Class: {{storyState.character.class}} (Level: {{storyState.character.level}})
- Description: {{storyState.character.description}}
- Health: {{storyState.character.health}}/{{storyState.character.maxHealth}}, Mana: {{storyState.character.mana}}/{{storyState.character.maxMana}}
- Language Understanding: {{storyState.character.languageUnderstanding}}/100
- Currency: {{storyState.character.currency}}, XP: {{storyState.character.experiencePoints}}/{{storyState.character.experienceToNextLevel}}
- Skills & Abilities:
{{{formattedSkillsString}}}

Equipped Items:
{{{formattedEquippedItemsString}}}
Current Location: {{storyState.currentLocation}}

Inventory (Unequipped):
{{#if storyState.inventory.length}}{{#each storyState.inventory}}- {{this.name}} (ID:{{this.id}}, Val:{{this.basePrice}}){{/each}}{{else}}Empty{{/if}}

Quests:
{{{formattedQuestsString}}}

Known World Facts:
{{#each storyState.worldFacts}}- {{{this}}}{{else}}- None known.{{/each}}

Tracked NPCs:
{{{formattedTrackedNPCsString}}}

**Your Task:**
1.  **Generate Narrative (generatedMessages):** Write the story's continuation, including GM narration and any NPC dialogue. Ensure NPC speaker names match those in 'Tracked NPCs' if they are speaking.
2.  **Describe Events (describedEvents):** Identify key game events that occurred due to the player's action or narrative progression. Use the 'DescribedEvent' structure. Examples:
    - Health/Mana/XP/Currency/Language changes: \\\`{ type: 'healthChange', characterTarget: 'player', amount: -10, reason: 'hit by arrow' }\\\`, \\\`{ type: 'languageImprovement', amount: 5, reason: 'studied local script' }\\\`
    - Items: \\\`{ type: 'itemFound', itemName: 'Old Key', itemDescription: 'A rusty key.', suggestedBasePrice: 5 }\\\`, \\\`{ type: 'itemUsed', itemIdOrName: 'Health Potion' }\\\`
    - Quests: \\\`{ type: 'questObjectiveUpdate', questIdOrDescription: 'Main Quest 1', objectiveDescription: 'Find the artifact', objectiveCompleted: true }\\\`, \\\`{ type: 'questAccepted', questDescription: 'Slay the Goblins', objectives: [{description: 'Defeat 5 Goblins'}], rewards: {experiencePoints: 100} }\\\`
    - NPCs: \\\`{ type: 'npcRelationshipChange', npcName: 'Guard Captain', changeAmount: -20, reason: 'player stole apple' }\\\`, \\\`{ type: 'newNPCIntroduced', npcName: 'Mysterious Stranger', npcDescription: 'Hooded figure in the shadows', classOrRole: 'Unknown' }\\\`
    - World Facts: \\\`{ type: 'worldFactAdded', fact: 'A new bridge has collapsed north of town.' }\\\`
    - Skills: \\\`{ type: 'skillLearned', skillName: 'Fireball', skillDescription: 'Hurls a ball of fire.', skillType: 'Magic' }\\\`
    Be specific. If an item is found, describe it. If a quest updates, detail which one and what changed. If language understanding improves, note by how much (1-20 pts).
3.  **Active NPCs (activeNPCsInScene):** List NPCs who spoke or took significant action.
4.  **New Lore (newLoreProposals):** If relevant new lore for "{{seriesName}}" is revealed, propose entries. Use 'lookupLoreTool' if more info on existing lore is needed for the narrative.
5.  **Scene Summary Fragment (sceneSummaryFragment):** A VERY brief (1-2 sentences) summary of ONLY what happened in THIS scene/turn.

**Language Understanding Mechanic:**
- Player's 'languageUnderstanding' (0-100) affects comprehension.
- If low (0-40), GM narration in 'generatedMessages' MUST reflect this (e.g., indecipherable speech/text). Actual foreign dialogue can be in NPC segments for player OOC knowledge.
- If player actions lead to language improvement (e.g., "I study the signs", "ask for translation"), describe this as a 'languageImprovement' event with a small 'amount' (e.g., 5-15).

Adhere to the 'NarrativeAndEventsOutputSchema' (partially, as it's deepPartial). Prioritize clear narrative and accurate event descriptions.
DO NOT return a full 'updatedStoryState' object. Focus on describing the events that TypeScript will use to update the state.
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
    
    let aiPartialOutput: z.infer<typeof NarrativeAndEventsOutputSchema.deepPartial> | undefined;
    try {
        const response = await narrativeAndEventsPrompt(narrativePromptPayload);
        aiPartialOutput = response.output; 
    } catch (e: any) {
        console.error(`[${modelName}] Error during narrativeAndEventsPrompt:`, e);
        return {
            generatedMessages: [{ speaker: 'GM', content: `(Critical AI Error during narrative generation: ${e.message}. Please try a different action.)` }],
            updatedStoryState: input.storyState, 
            updatedStorySummary: input.storyState.storySummary || "Error generating summary.",
            activeNPCsInScene: [], newLoreEntries: [],
            dataCorrectionWarnings: ["AI model failed to generate narrative/events structure."],
        };
    }

    if (!aiPartialOutput || !aiPartialOutput.generatedMessages || aiPartialOutput.generatedMessages.length === 0) {
        console.warn(`[${modelName}] Null or insufficient output from 'narrativeAndEventsPrompt'.`);
        localCorrectionWarnings.push("AI model returned empty or malformed narrative/events structure.");
        return {
            generatedMessages: [{ speaker: 'GM', content: `(Critical AI Error: The AI returned an empty or malformed structure for scene narrative. Please try again.)` }],
            updatedStoryState: input.storyState,
            updatedStorySummary: input.storyState.storySummary || "Error generating summary.",
            activeNPCsInScene: [], newLoreEntries: [],
            dataCorrectionWarnings: localCorrectionWarnings,
        };
    }

    // ----- TypeScript Logic: Process Described Events and Update State -----    
    const finalUpdatedStoryState = produce(input.storyState, draftState => {
        const describedEvents: DescribedEvent[] = (aiPartialOutput?.describedEvents?.filter(Boolean) || []) as DescribedEvent[]; 
        const originalChar = input.storyState.character; 

        for (const event of describedEvents) {
            if (!event || !event.type) {
                localCorrectionWarnings.push(`Received a malformed event from AI: ${JSON.stringify(event)}`);
                continue;
            }

            switch (event.type) {
                case 'healthChange':
                    if (event.characterTarget === 'player' && typeof event.amount === 'number') {
                        draftState.character.health = (draftState.character.health ?? originalChar.health) + event.amount;
                        // Max health will be clamped later during character sanitation
                        localCorrectionWarnings.push(`Event: Character health changed by ${event.amount} due to: ${event.reason || 'unspecified'}`);
                    }
                    // TODO: Handle healthChange for NPCs
                    break;
                case 'languageImprovement':
                    if (typeof event.amount === 'number') {
                        const currentUnderstanding = draftState.character.languageUnderstanding ?? originalChar.languageUnderstanding ?? 0;
                        draftState.character.languageUnderstanding = Math.max(0, Math.min(100, currentUnderstanding + event.amount));
                        localCorrectionWarnings.push(`Event: Language understanding improved by ${event.amount} to ${draftState.character.languageUnderstanding}. Reason: ${event.reason || 'unspecified'}`);
                         if (draftState.character.languageUnderstanding >= 40) { 
                            draftState.worldFacts = (draftState.worldFacts || []).filter(fact => 
                                !fact.toLowerCase().includes("language barrier") && 
                                !fact.toLowerCase().includes("cannot understand") &&
                                !fact.toLowerCase().includes("incomprehensible")
                            );
                            localCorrectionWarnings.push("Removed 'language barrier' world fact due to improved understanding.");
                        }
                    }
                    break;
                // TODO: Implement handlers for each other event.type (manaChange, xpChange, itemFound, itemLost, quest updates, npc changes, etc.)
                // This is where the core logic for updating the game state based on AI-described events will go.
                // Example for itemFound:
                // case 'itemFound':
                //   const newItem: ItemType = {
                //     id: `item_${event.itemName.replace(/\s+/g, '_')}_${Date.now()}`,
                //     name: event.itemName,
                //     description: event.itemDescription,
                //     basePrice: event.suggestedBasePrice ?? 0,
                //     equipSlot: event.equipSlot,
                //     isConsumable: event.isConsumable,
                //     effectDescription: event.effectDescription,
                //     isQuestItem: event.isQuestItem,
                //     relevantQuestId: event.relevantQuestId,
                //   };
                //   draftState.inventory.push(newItem);
                //   localCorrectionWarnings.push(`Event: Item found - ${event.itemName}.`);
                //   break;
                default:
                    localCorrectionWarnings.push(`Received unhandled event type: ${event.type}`);
            }
        }


        // --- Robust Character Data Finalization ---
        // This section ensures all required fields are present and valid,
        // primarily using originalChar as the source of truth if AI event processing didn't set them,
        // or if they became invalid. Hardcoded defaults are last resort.

        // Name
        if (!(typeof draftState.character.name === 'string' && draftState.character.name.trim() !== "")) {
             draftState.character.name = (originalChar.name && typeof originalChar.name === 'string' && originalChar.name.trim() !== "") ? originalChar.name : "Unnamed Character";
            localCorrectionWarnings.push("Character 'name' was missing or invalid after event processing; restored/defaulted.");
        }
        // Class
        if (!(typeof draftState.character.class === 'string' && draftState.character.class.trim() !== "")) {
            draftState.character.class = (originalChar.class && typeof originalChar.class === 'string' && originalChar.class.trim() !== "") ? originalChar.class : "Adventurer";
            localCorrectionWarnings.push("Character 'class' was missing or invalid after event processing; restored/defaulted.");
        }
        // Description
        if (!(typeof draftState.character.description === 'string' && draftState.character.description.trim() !== "")) {
            draftState.character.description = (originalChar.description && typeof originalChar.description === 'string' && originalChar.description.trim() !== "") ? originalChar.description : "A mysterious adventurer.";
            localCorrectionWarnings.push("Character 'description' was missing or invalid after event processing; restored/defaulted.");
        }

        // MaxHealth
        if (!(typeof draftState.character.maxHealth === 'number' && draftState.character.maxHealth > 0)) {
            draftState.character.maxHealth = (typeof originalChar.maxHealth === 'number' && originalChar.maxHealth > 0) ? originalChar.maxHealth : 100;
            localCorrectionWarnings.push("Character 'maxHealth' was invalid or zero after event processing; restored/defaulted.");
        }
        // Health (ensure it's a number and clamped)
        if (typeof draftState.character.health !== 'number') {
            draftState.character.health = (typeof originalChar.health === 'number') ? originalChar.health : draftState.character.maxHealth;
            localCorrectionWarnings.push("Character 'health' was invalid after event processing; restored/defaulted.");
        }
        draftState.character.health = Math.max(0, Math.min(draftState.character.health, draftState.character.maxHealth));


        // Level, XP, XPToNextLevel
        if (!(typeof draftState.character.level === 'number' && draftState.character.level >= 1)) {
            draftState.character.level = (typeof originalChar.level === 'number' && originalChar.level >=1) ? originalChar.level : 1;
            localCorrectionWarnings.push("Character 'level' was invalid after event processing; restored/defaulted.");
        }
        if (!(typeof draftState.character.experiencePoints === 'number' && draftState.character.experiencePoints >= 0)) {
            draftState.character.experiencePoints = (typeof originalChar.experiencePoints === 'number' && originalChar.experiencePoints >=0) ? originalChar.experiencePoints : 0;
            localCorrectionWarnings.push("Character 'experiencePoints' was invalid after event processing; restored/defaulted.");
        }
        if (!(typeof draftState.character.experienceToNextLevel === 'number' && draftState.character.experienceToNextLevel > 0)) {
            draftState.character.experienceToNextLevel = (typeof originalChar.experienceToNextLevel === 'number' && originalChar.experienceToNextLevel > 0) ? originalChar.experienceToNextLevel : 100;
            localCorrectionWarnings.push("Character 'experienceToNextLevel' was invalid or zero after event processing; restored/defaulted.");
        }
         if (draftState.character.experienceToNextLevel <= draftState.character.experiencePoints && draftState.character.level === originalChar.level) {
            draftState.character.experienceToNextLevel = draftState.character.experiencePoints + Math.max(50, Math.floor((originalChar.experienceToNextLevel || 100) * 0.5));
            localCorrectionWarnings.push("Corrected 'character.experienceToNextLevel' to be greater than current XP for current level.");
        }


        // Optional numeric fields
        const ensureOptionalNumber = (fieldName: keyof CharacterProfile, defaultValue: number) => {
            let currentValue = (draftState.character as any)[fieldName];
            if (typeof currentValue !== 'number') { // If not a number after event processing
                currentValue = (originalChar as any)[fieldName]; // Try original
                if (typeof currentValue !== 'number') { // If original also not a number
                    (draftState.character as any)[fieldName] = defaultValue;
                    localCorrectionWarnings.push(`Character '${fieldName}' was invalid after events & original state; defaulted to ${defaultValue}.`);
                } else {
                    (draftState.character as any)[fieldName] = currentValue; // Use original value
                    localCorrectionWarnings.push(`Character '${fieldName}' was invalid after events; restored from original state.`);
                }
            }
        };

        ensureOptionalNumber('mana', 0);
        ensureOptionalNumber('maxMana', 0);
        ensureOptionalNumber('strength', 10);
        ensureOptionalNumber('dexterity', 10);
        ensureOptionalNumber('constitution', 10);
        ensureOptionalNumber('intelligence', 10);
        ensureOptionalNumber('wisdom', 10);
        ensureOptionalNumber('charisma', 10);
        ensureOptionalNumber('currency', 0);
        if (draftState.character.currency! < 0) draftState.character.currency = 0; // ensure non-negative
        ensureOptionalNumber('languageUnderstanding', 100);
        if (draftState.character.languageUnderstanding! < 0) draftState.character.languageUnderstanding = 0;
        if (draftState.character.languageUnderstanding! > 100) draftState.character.languageUnderstanding = 100;


        // SkillsAndAbilities (Optional Array)
        if (!Array.isArray(draftState.character.skillsAndAbilities)) {
            draftState.character.skillsAndAbilities = Array.isArray(originalChar.skillsAndAbilities) ? originalChar.skillsAndAbilities : [];
            localCorrectionWarnings.push("Character 'skillsAndAbilities' was not an array after event processing; restored/defaulted.");
        }
        const skillIdSetSanitize = new Set<string>();
        (draftState.character.skillsAndAbilities || []).forEach((skill, index) => {
            if (!skill.id || skill.id.trim() === "" || skillIdSetSanitize.has(skill.id)) { 
                let baseId = `skill_next_${skill.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}_${Date.now()}_${index}`;
                let newId = baseId; let counter = 0;
                while(skillIdSetSanitize.has(newId)){ newId = `${baseId}_u${counter++}`; }
                skill.id = newId;
            }
            skillIdSetSanitize.add(skill.id);
            skill.name = skill.name || "Unnamed Skill";
            skill.description = skill.description || "No description provided.";
            skill.type = skill.type || "Generic";
        });
        
        // Update story summary using the fragment from AI
        if (aiPartialOutput?.sceneSummaryFragment && typeof aiPartialOutput.sceneSummaryFragment === 'string') {
            draftState.storySummary = (draftState.storySummary ? draftState.storySummary + "\n\n" : "") + aiPartialOutput.sceneSummaryFragment;
        } else if (!draftState.storySummary) {
             draftState.storySummary = "The story continues..."; // Fallback summary
        }
        
        // Ensure other state parts are at least empty arrays if not provided or processed
        draftState.inventory = draftState.inventory || [];
        draftState.quests = draftState.quests || [];
        draftState.worldFacts = draftState.worldFacts || [];
        draftState.trackedNPCs = draftState.trackedNPCs || [];
        draftState.equippedItems = draftState.equippedItems || { weapon: null, shield: null, head: null, body: null, legs: null, feet: null, hands: null, neck: null, ring1: null, ring2: null };
        draftState.currentLocation = typeof draftState.currentLocation === 'string' ? draftState.currentLocation : (typeof input.storyState.currentLocation === 'string' ? input.storyState.currentLocation : "Unknown Location");


    });


    // ----- Perform final detailed sanitation (outside immer produce, on the final state) -----
    // Inventory
    finalUpdatedStoryState.inventory = finalUpdatedStoryState.inventory ?? [];
    const invItemIds = new Set<string>();
    finalUpdatedStoryState.inventory.forEach((item, index) => {
        if (!item.id || item.id.trim() === "" || invItemIds.has(item.id)) {
            let baseId = `item_inv_next_${Date.now()}_${index}`;
            let newId = baseId; let i = 0;
            while(invItemIds.has(newId)) newId = `${baseId}_${i++}`;
            item.id = newId;
            localCorrectionWarnings.push(`Generated unique ID for inventory item: ${item.name || 'Unnamed Item'}`);
        }
        invItemIds.add(item.id);
        item.name = item.name || "Unnamed Item";
        item.description = item.description || "No description.";
        if (item.equipSlot === null || (item.equipSlot as unknown) === '') delete (item as Partial<ItemType>).equipSlot;
        if (item.basePrice === undefined || item.basePrice === null || item.basePrice < 0) item.basePrice = 0;
    });

    // Quests
    finalUpdatedStoryState.quests = finalUpdatedStoryState.quests ?? [];
    const questIds = new Set<string>();
    finalUpdatedStoryState.quests.forEach((quest, index) => {
        if (!quest.id || quest.id.trim() === "" || questIds.has(quest.id)) {
            let baseId = `quest_next_${Date.now()}_${index}`;
            let newId = baseId; let i = 0;
            while(questIds.has(newId)) newId = `${baseId}_${i++}`;
            quest.id = newId;
            localCorrectionWarnings.push(`Generated unique ID for quest: ${quest.description || 'Unnamed Quest'}`);
        }
        questIds.add(quest.id);
        quest.description = quest.description || "No description.";
        quest.status = quest.status || 'active';
        if (quest.category === null || (quest.category as unknown) === '') delete (quest as Partial<QuestType>).category;
        quest.objectives = quest.objectives ?? [];
        quest.objectives.forEach(obj => { 
            obj.description = obj.description || "Unnamed objective";
            obj.isCompleted = obj.isCompleted ?? false; 
        });
        if (quest.rewards) {
            quest.rewards.items = quest.rewards.items ?? [];
            quest.rewards.items.forEach((rItem, rIndex) => {
                if (!rItem.id) rItem.id = `item_reward_next_${Date.now()}_${Math.random().toString(36).substring(2,8)}_${rIndex}`;
                rItem.name = rItem.name || "Unnamed Reward Item";
                rItem.description = rItem.description || "No description.";
                if (rItem.basePrice === undefined || rItem.basePrice === null || rItem.basePrice < 0) rItem.basePrice = 0;
            });
            if (quest.rewards.currency !== undefined && quest.rewards.currency < 0) quest.rewards.currency = 0;
            if (!quest.rewards.experiencePoints && (!quest.rewards.items || quest.rewards.items.length === 0) && quest.rewards.currency === undefined) {
                 delete quest.rewards;
            } else {
                if (quest.rewards.experiencePoints === undefined) delete quest.rewards.experiencePoints;
                if (!quest.rewards.items || quest.rewards.items.length === 0) delete quest.rewards.items;
                if (quest.rewards.currency === undefined) delete quest.rewards.currency;
            }
        } else {
            delete quest.rewards; 
        }
    });
    
    // Equipped Items
    const defaultEquippedItems: Record<EquipmentSlot, ItemType | null> = { weapon: null, shield: null, head: null, body: null, legs: null, feet: null, hands: null, neck: null, ring1: null, ring2: null };
    const aiEquipped = finalUpdatedStoryState.equippedItems || {} as Partial<Record<EquipmentSlot, ItemType | null>>;
    const newEquippedItems: Record<EquipmentSlot, ItemType | null> = {...defaultEquippedItems};
    const equippedItemIds = new Set<string>();
    for (const slotKey of Object.keys(defaultEquippedItems) as EquipmentSlot[]) {
        const item = aiEquipped[slotKey]; 
        if (item && typeof item === 'object' && item.name) { 
            if (!item.id || item.id.trim() === "" || equippedItemIds.has(item.id) || invItemIds.has(item.id)) {
                 let baseId = `item_equipped_next_${Date.now()}_${slotKey}`;
                 let newId = baseId; let counter = 0;
                 while(equippedItemIds.has(newId) || invItemIds.has(newId)){ newId = `${baseId}_u${counter++}`; }
                 item.id = newId;
                 localCorrectionWarnings.push(`Generated unique ID for equipped item in slot ${slotKey}: ${item.name}`);
            }
            equippedItemIds.add(item.id);
            item.name = item.name || "Unnamed Equipped Item";
            item.description = item.description || "No description.";
            if (item.equipSlot === null || (item.equipSlot as unknown) === '') delete (item as Partial<ItemType>)!.equipSlot;
            if (item.basePrice === undefined || item.basePrice === null || item.basePrice < 0) item.basePrice = 0;
            newEquippedItems[slotKey] = item;
        } else {
            if (item !== null && item !== undefined) localCorrectionWarnings.push(`Item in slot ${slotKey} was invalid; set to empty.`);
            newEquippedItems[slotKey] = null; 
        }
    }
    finalUpdatedStoryState.equippedItems = newEquippedItems;

    // Tracked NPCs
    finalUpdatedStoryState.trackedNPCs = finalUpdatedStoryState.trackedNPCs ?? [];
    const npcIdMap = new Map<string, NPCProfileType>();
    const existingNpcIdsFromInput = new Set(input.storyState.trackedNPCs.map(npc => npc.id));
    
    finalUpdatedStoryState.trackedNPCs.forEach(npc => {
        let currentNpcId = npc.id;
        if (!currentNpcId || currentNpcId.trim() === "" || (!existingNpcIdsFromInput.has(currentNpcId) && npcIdMap.has(currentNpcId))) {
             let baseId = `npc_${npc.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}_${Date.now()}`;
             let newId = baseId; let counter = 0;
             while(npcIdMap.has(newId) || existingNpcIdsFromInput.has(newId)) { newId = `${baseId}_u${counter++}`; }
             currentNpcId = newId;
             localCorrectionWarnings.push(`Generated unique ID for NPC: ${npc.name || 'Unnamed NPC'}`);
        }
        npc.id = currentNpcId; 
        if (npcIdMap.has(npc.id)) { console.warn(`Duplicate NPC ID ${npc.id} in processing. Skipping duplicate.`); localCorrectionWarnings.push(`Skipped duplicate NPC ID ${npc.id} during processing.`); return; }
        
        const processedNpc: Partial<NPCProfileType> = { ...npc }; 
        
        const optionalStringFields: (keyof NPCProfileType)[] = ['classOrRole', 'firstEncounteredLocation', 'firstEncounteredTurnId', 'lastKnownLocation', 'lastSeenTurnId', 'seriesContextNotes', 'shortTermGoal', 'updatedAt'];
        optionalStringFields.forEach(field => {
            if (processedNpc[field] === null || processedNpc[field] === undefined || (typeof processedNpc[field] === 'string' && (processedNpc[field] as string).trim() === '')) {
                delete processedNpc[field];
            }
        });
        const optionalArrayFields: (keyof NPCProfileType)[] = ['dialogueHistory', 'merchantInventory', 'buysItemTypes', 'sellsItemTypes'];
        optionalArrayFields.forEach(field => {
             if (processedNpc[field] === null || processedNpc[field] === undefined || (Array.isArray(processedNpc[field]) && (processedNpc[field] as any[]).length === 0)) {
                delete processedNpc[field];
            }
        });
        if (processedNpc.isMerchant === null || processedNpc.isMerchant === undefined) delete processedNpc.isMerchant;

        processedNpc.name = processedNpc.name || "Unnamed NPC";
        processedNpc.description = processedNpc.description || "No description provided.";
        processedNpc.relationshipStatus = typeof processedNpc.relationshipStatus === 'number' ? Math.max(-100, Math.min(100, processedNpc.relationshipStatus)) : 0;
        processedNpc.knownFacts = Array.isArray(processedNpc.knownFacts) ? processedNpc.knownFacts.filter(f => typeof f === 'string' && f.trim() !== '') : [];
        
        processedNpc.dialogueHistory?.forEach(dh => { if(!dh.turnId) dh.turnId = input.currentTurnId; });
        
        const originalNpc = input.storyState.trackedNPCs.find(onpc => onpc.id === processedNpc.id);
        if (!originalNpc) { 
            if (!processedNpc.firstEncounteredLocation) processedNpc.firstEncounteredLocation = input.storyState.currentLocation;
            if (!processedNpc.firstEncounteredTurnId) processedNpc.firstEncounteredTurnId = input.currentTurnId;
        } else { 
             if (!processedNpc.firstEncounteredLocation) processedNpc.firstEncounteredLocation = originalNpc.firstEncounteredLocation;
             if (!processedNpc.firstEncounteredTurnId) processedNpc.firstEncounteredTurnId = originalNpc.firstEncounteredTurnId;
             if (processedNpc.seriesContextNotes === undefined && originalNpc.seriesContextNotes) { 
                 processedNpc.seriesContextNotes = originalNpc.seriesContextNotes;
             }
        }
        if (!processedNpc.lastKnownLocation) processedNpc.lastKnownLocation = processedNpc.firstEncounteredLocation || input.storyState.currentLocation; 
        processedNpc.lastSeenTurnId = input.currentTurnId; 
        processedNpc.updatedAt = new Date().toISOString(); 
        
        processedNpc.isMerchant = processedNpc.isMerchant ?? false; 
        if (processedNpc.merchantInventory) {
            const merchantItemIds = new Set<string>();
            processedNpc.merchantInventory.forEach((item, mIndex) => {
                if (!item.id || item.id.trim() === "" || merchantItemIds.has(item.id) || invItemIds.has(item.id) || equippedItemIds.has(item.id) ) {
                    let baseId = `item_merchant_next_${Date.now()}_${mIndex}`;
                    let newId = baseId; let counter = 0;
                    while(merchantItemIds.has(newId) || invItemIds.has(newId) || equippedItemIds.has(newId)){ newId = `${baseId}_u${counter++}`; }
                    item.id = newId;
                    localCorrectionWarnings.push(`Generated unique ID for merchant item: ${item.name || 'Unnamed Merchant Item'}`);
                }
                merchantItemIds.add(item.id);
                item.name = item.name || "Unnamed Merchant Item";
                item.description = item.description || "No description.";
                item.basePrice = item.basePrice ?? 0;
                 if (item.basePrice < 0) item.basePrice = 0;
                item.price = item.price ?? item.basePrice; 
                if (item.price < 0) item.price = 0;
                if (item.equipSlot === null || (item.equipSlot as unknown) === '') delete (item as Partial<ItemType>).equipSlot;
            });
        }
        npcIdMap.set(processedNpc.id!, processedNpc as NPCProfileType);
    });
    finalUpdatedStoryState.trackedNPCs = Array.from(npcIdMap.values());


    finalUpdatedStoryState.worldFacts = finalUpdatedStoryState.worldFacts ?? [];
    finalUpdatedStoryState.worldFacts = finalUpdatedStoryState.worldFacts.filter(fact => typeof fact === 'string' && fact.trim() !== '');
    
    const finalOutput: GenerateNextSceneOutput = {
        generatedMessages: aiPartialOutput.generatedMessages!,
        updatedStoryState: finalUpdatedStoryState as StructuredStoryState, 
        activeNPCsInScene: aiPartialOutput.activeNPCsInScene?.filter(npc => npc.name && npc.name.trim() !== '') ?? undefined,
        newLoreEntries: aiPartialOutput.newLoreProposals?.filter(lore => lore.keyword && lore.keyword.trim() !== "" && lore.content && lore.content.trim() !== "") ?? undefined,
        updatedStorySummary: finalUpdatedStoryState.storySummary!,
        dataCorrectionWarnings: localCorrectionWarnings.length > 0 ? Array.from(new Set(localCorrectionWarnings)) : undefined,
    };

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

    return finalOutput;
  }
);
