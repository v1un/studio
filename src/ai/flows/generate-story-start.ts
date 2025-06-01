
'use server';

/**
 * @fileOverview A flow for generating the initial scene of an interactive story, including character creation with core stats, mana, level, XP, initial empty equipment, initial quests (with optional objectives, categories, and pre-defined rewards), initial tracked NPCs, starting skills/abilities, and languageUnderstanding.
 * THIS FLOW IS NOW LARGELY SUPERSEDED BY generateScenarioFromSeries.ts for series-based starts. Supports model selection.
 *
 * - generateStoryStart - A function that generates the initial scene description and story state.
 * - GenerateStoryStartInput - The input type for the generateStoryStart function.
 * - GenerateStoryStartOutput - The return type for the generateStoryStart function.
 */

import {ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME} from '@/ai/genkit';
import {z} from 'zod';
import type { EquipmentSlot, Item as ItemType, Quest as QuestType, NPCProfile as NPCProfileType, Skill as SkillType, GenerateStoryStartInput as GenerateStoryStartInputType, GenerateStoryStartOutput as GenerateStoryStartOutputType } from '@/types/story'; // Use exported types
import { EquipSlotEnumInternal } from '@/types/zod-schemas';

const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Make it unique within the current inventory if any items are pre-assigned (though typically inventory starts empty)."),
  name: z.string().describe("The name of the item."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function."),
  equipSlot: EquipSlotEnumInternal.optional().describe("If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), specify the slot it occupies. Examples: 'weapon', 'head', 'body', 'ring'. If it is not an equippable type of item (e.g., a potion, a key, a generic diary/book), this field MUST BE OMITTED ENTIRELY."),
  isConsumable: z.boolean().optional().describe("True if the item is consumed on use (e.g., potion, scroll)."),
  effectDescription: z.string().optional().describe("Briefly describes the item's effect when used (e.g., 'Restores health', 'Reveals hidden paths'). Relevant if isConsumable or has a direct use effect."),
  isQuestItem: z.boolean().optional().describe("True if this item is specifically required for a quest objective."),
  relevantQuestId: z.string().optional().describe("If isQuestItem is true, the ID of the quest this item is for."),
  basePrice: z.number().optional().describe("The base value or estimated worth of the item. Used for trading. MUST BE a number if provided."),
});

const SkillSchemaInternal = z.object({
    id: z.string().describe("A unique identifier for the skill, e.g., 'skill_basic_strike_001'."),
    name: z.string().describe("The name of the skill or ability."),
    description: z.string().describe("A clear description of what the skill does, its narrative impact, or its basic effect."),
    type: z.string().describe("A category for the skill, e.g., 'Combat', 'Utility', 'Passive', 'Racial Trait'.")
});

const CharacterProfileSchemaInternal = z.object({
  name: z.string().describe('The name of the character.'),
  class: z.string().describe('The class or archetype of the character.'),
  description: z.string().describe('A brief backstory or description of the character.'),
  health: z.number().describe('Current health points of the character. MUST BE a number.'),
  maxHealth: z.number().describe('Maximum health points of the character. MUST BE a number.'),
  mana: z.number().optional().describe('Current mana or magic points of the character. Assign 0 if not applicable to the class, or omit. MUST BE a number if provided.'),
  maxMana: z.number().optional().describe('Maximum mana or magic points. Assign 0 if not applicable, or omit. MUST BE a number if provided.'),
  strength: z.number().optional().describe('Character\'s physical power. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness. Affects health. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and memory. Affects mana for magic users. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition. Affects mana regeneration or spell effectiveness. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  level: z.number().describe('The current level of the character. Initialize to 1. MUST BE a number.'),
  experiencePoints: z.number().describe('Current experience points. Initialize to 0. MUST BE a number.'),
  experienceToNextLevel: z.number().describe('Experience points needed to reach the next level. Initialize to a starting value, e.g., 100. MUST BE a number.'),
  skillsAndAbilities: z.array(SkillSchemaInternal).optional().describe("A list of 1-2 starting skills or abilities appropriate for the character's class. Each skill requires an id, name, description, and type."),
  currency: z.number().optional().describe("Character's starting currency (e.g., gold). Initialize to a small amount like 50, or 0. MUST BE a number if provided."),
  languageUnderstanding: z.number().optional().describe("Character's understanding of the local language (0-100). For generic starts, default to 100 unless the prompt implies a barrier (e.g., 'lost in a foreign land and can't understand anyone'), then set to a low value like 0-10. MUST BE a number if provided."),
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
}).describe("A record of the character's equipped items. All 10 slots MUST be present, with an item object (including 'basePrice' as a number, and 'equipSlot' if applicable, otherwise OMIT 'equipSlot') or 'null' if the slot is empty.");

const QuestStatusEnumInternal = z.enum(['active', 'completed']);
const QuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("A clear description of this specific objective for the quest."),
  isCompleted: z.boolean().describe("Whether this specific objective is completed (should usually be false for new quests).")
});

const QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("Amount of experience points awarded. MUST BE a number if provided."),
  items: z.array(ItemSchemaInternal).optional().describe("An array of item objects awarded. Each item must have a unique ID, name, description, 'basePrice' (as a number), and optional 'equipSlot' (omit if not inherently equippable gear), and other item properties like `isConsumable` if applicable."),
  currency: z.number().optional().describe("Amount of currency awarded. MUST BE a number if provided."),
}).describe("Potential rewards to be given upon quest completion. Defined when the quest is created. Omit if the quest has no specific material rewards.");

const QuestSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the quest, e.g., 'quest_generic_001'."),
  description: z.string().describe("A clear description of the quest's overall objective."),
  status: QuestStatusEnumInternal.describe("The current status of the quest, typically 'active' for starting quests."),
  category: z.string().optional().describe("An optional category for the quest (e.g., 'Main Story', 'Side Quest', 'Tutorial'). Omit if not clearly classifiable."),
  objectives: z.array(QuestObjectiveSchemaInternal).optional().describe("An optional list of specific sub-objectives for this quest. If the quest is simple, this can be omitted. For initial quests, all objectives should have 'isCompleted: false'."),
  rewards: QuestRewardsSchemaInternal.optional()
});

const NPCDialogueEntrySchemaInternal = z.object({
    playerInput: z.string().optional().describe("The player's input that led to the NPC's response, if applicable. This helps track the conversation flow."),
    npcResponse: z.string().describe("The NPC's spoken dialogue or a summary of their significant verbal response."),
    turnId: z.string().describe("The ID of the story turn in which this dialogue occurred."),
});

const MerchantItemSchemaInternal = ItemSchemaInternal.extend({
  price: z.number().optional().describe("The price this merchant sells the item for. If not specified, can be derived from basePrice or context. MUST BE a number if provided."),
});

const NPCProfileSchemaInternal = z.object({
    id: z.string().describe("Unique identifier for the NPC, e.g., npc_bartender_giles_001."),
    name: z.string().describe("NPC's name."),
    description: z.string().describe("Physical appearance, general demeanor, key characteristics."),
    classOrRole: z.string().optional().describe("e.g., 'Merchant', 'Guard Captain'."),
    firstEncounteredLocation: z.string().optional().describe("Location where NPC was first met."),
    firstEncounteredTurnId: z.string().optional().describe("ID of the story turn when first met (use 'initial_turn_0' for all NPCs known at game start)."),
    relationshipStatus: z.number().describe("Numerical score representing relationship (e.g., -100 Hostile, 0 Neutral, 100 Allied). Set an initial appropriate value, typically 0 for Neutral start. MUST BE a number."),
    knownFacts: z.array(z.string()).describe("Specific pieces of information player has learned about this NPC. Should be empty or reflect general world knowledge if pre-populated and not yet met."),
    dialogueHistory: z.array(NPCDialogueEntrySchemaInternal).optional().describe("Log of key interaction moments. Should be empty or omitted for initial scenario."),
    lastKnownLocation: z.string().optional().describe("Last known location of the NPC. If pre-populated and not met, this could be their canonical location."),
    lastSeenTurnId: z.string().optional().describe("ID of the story turn when NPC was last seen or interacted with (use 'initial_turn_0' for all NPCs known at game start)."),
    seriesContextNotes: z.string().optional().describe("AI-internal note about their role if from a known series (not for player). Not typically applicable in generic story starts."),
    shortTermGoal: z.string().optional().describe("A simple, immediate goal this NPC might be pursuing. Can be set or updated by the AI based on events."),
    updatedAt: z.string().optional().describe("Timestamp of the last update to this profile."),
    isMerchant: z.boolean().optional().describe("Set to true if this NPC is a merchant and can buy/sell items."),
    merchantInventory: z.array(MerchantItemSchemaInternal).optional().describe("If isMerchant, a list of items the merchant has for sale. Each item includes its 'id', 'name', 'description', 'basePrice' (MUST BE a number), and a 'price' (MUST BE a number) they sell it for. OMIT 'equipSlot' for non-equippable items."),
    buysItemTypes: z.array(z.string()).optional().describe("If isMerchant, optional list of item categories they are interested in buying (e.g., 'Potions', 'Old Books')."),
    sellsItemTypes: z.array(z.string()).optional().describe("If isMerchant, optional list of item categories they typically sell (e.g., 'Adventuring Gear', 'Herbs')."),
});

const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal.describe('The profile of the main character, including core stats, level, XP, currency, starting skills/abilities, and languageUnderstanding (0-100). Ensure all numeric fields are numbers.'),
  currentLocation: z.string().describe('The current location of the character in the story.'),
  inventory: z.array(ItemSchemaInternal).describe('A list of items in the character\'s inventory. Initialize as an empty array: []. Each item must be an object with id, name, description, and basePrice (MUST BE a number). If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), include an \'equipSlot\' (e.g. \'weapon\', \'head\', \'body\'). If it\'s not an equippable type of item (e.g., a potion, a key, a generic diary/book), the \'equipSlot\' field MUST BE OMITTED ENTIRELY.** Consider adding `isConsumable`, `effectDescription`, `isQuestItem`, `relevantQuestId`.'),
  equippedItems: EquipmentSlotsSchemaInternal,
  quests: z.array(QuestSchemaInternal).describe('A list of quests. Initialize as an empty array if no quest is generated, or with one simple starting quest. Each quest is an object with id, description, status (active), and optionally category, objectives, and rewards (which specify what the player will get on completion, including items with basePrice (MUST BE a number) and currency (MUST BE a number)).'),
  worldFacts: z.array(z.string()).describe('Key facts or observations about the game world state. Initialize with one or two relevant facts. If languageUnderstanding is low, a fact should describe this.'),
  trackedNPCs: z.array(NPCProfileSchemaInternal).describe("A list of significant NPCs encountered. Initialize as an empty array, or with profiles for any NPCs introduced in the starting scene. If an NPC is a merchant, set 'isMerchant' and populate 'merchantInventory' with priced items (basePrice and price MUST BE numbers). Ensure all numeric fields are numbers."),
  storySummary: z.string().optional().describe("A brief, running summary of key story events and character developments. Initialize as empty or a very short intro."),
});

const GenerateStoryStartInputSchemaInternal = z.object({
  prompt: z.string().describe('A prompt to kickstart the story (e.g., \'A lone knight enters a dark forest\').'),
  characterNameInput: z.string().optional().describe('Optional user-suggested character name.'),
  characterClassInput: z.string().optional().describe('Optional user-suggested character class.'),
  usePremiumAI: z.boolean().optional().describe("Whether to use the premium AI model."),
});

const GenerateStoryStartOutputSchemaInternal = z.object({
  sceneDescription: z.string().describe('The generated initial scene description.'),
  storyState: StructuredStoryStateSchemaInternal.describe('The initial structured state of the story, including character details (with languageUnderstanding), stats, level, XP, currency (all as numbers), empty equipment slots, any initial quests (with categories, objectives, and pre-defined rewards including currency (number) and items with basePrice (number)), starting skills/abilities, and profiles for any NPCs introduced (including merchant details if applicable, with item prices as numbers).'),
});

export async function generateStoryStart(input: GenerateStoryStartInputType): Promise<GenerateStoryStartOutputType> {
  return generateStoryStartFlow(input);
}

const generateStoryStartFlow = ai.defineFlow(
  {
    name: 'generateStoryStartFlow',
    inputSchema: GenerateStoryStartInputSchemaInternal,
    outputSchema: GenerateStoryStartOutputSchemaInternal,
  },
  async (input: GenerateStoryStartInputType) => {
    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;

    const storyStartPrompt = ai.definePrompt({
        name: 'generateStoryStartPrompt',
        model: modelName,
        input: {schema: GenerateStoryStartInputSchemaInternal},
        output: {schema: GenerateStoryStartOutputSchemaInternal},
        prompt: `You are a creative storyteller and game master. Your primary task is to generate a complete and valid JSON object that strictly adheres to the 'GenerateStoryStartOutputSchemaInternal'. ALL non-optional fields defined in the schema MUST be present in your output. ALL fields (including optional ones if you choose to include them) MUST use the correct data types as specified in their descriptions (e.g., numbers for prices, stats, currency; strings for names; booleans where appropriate). IDs for items, quests, skills, and NPCs MUST be unique.

Theme: "{{prompt}}".
User suggestions: Character Name: {{#if characterNameInput}}{{characterNameInput}}{{else}}(None provided){{/if}}, Character Class: {{#if characterClassInput}}{{characterClassInput}}{{else}}(None provided){{/if}}.

Based on the theme and user suggestions, generate the following:
1.  'sceneDescription': An engaging initial scene for the story.
2.  'storyState': The complete initial structured state:
    a.  'character':
        -   Invent a character 'name' and 'class' if not provided or if the suggestion is too generic.
        -   Write a brief 'description' (backstory).
        -   'health' & 'maxHealth': e.g., 100 (MUST BE numbers).
        -   'mana' & 'maxMana': e.g., 50 (MUST BE numbers, use 0 if not applicable to the class, or omit if truly not part of concept).
        -   Core stats ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'): Assign sensible values (e.g., between 5-15, MUST BE numbers if provided, omit if not directly relevant).
        -   'level': Initialize to 1 (MUST BE a number).
        -   'experiencePoints': Initialize to 0 (MUST BE a number).
        -   'experienceToNextLevel': Initialize to a starting value, e.g., 100 (MUST BE a number, and > 0).
        -   'currency': Initialize to a small amount, e.g., 20-50 (MUST BE a number, can be 0).
        -   'languageUnderstanding': (MUST BE a number, 0-100). Default to 100 (fluent) unless the theme "{{prompt}}" strongly implies a language barrier (e.g., "lost in a foreign land and can't understand anyone"), in which case set to an appropriate low value like 0-10.
        -   'skillsAndAbilities': An array of 1-2 starting skills (each with a unique 'id', 'name', 'description', and 'type'). Can be an empty array if no starting skills are appropriate.
    b.  'currentLocation': A fitting starting location string.
    c.  'inventory': An array of starting items. Typically initialize as an empty array \`[]\`. If items are included, each MUST have a unique 'id', 'name', 'description', and 'basePrice' (MUST BE a number, can be 0). 'equipSlot' MUST BE OMITTED if the item is not inherently equippable gear (like potions, keys, generic books). For equippable gear, 'equipSlot' must be a valid slot name. 'isConsumable', 'effectDescription', 'isQuestItem', 'relevantQuestId' are optional but useful.
    d.  'equippedItems': All 10 equipment slots ('weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2') MUST be present. Each slot should contain 'null' if empty. If an item object is provided for a slot, it MUST have a unique 'id', 'name', 'description', its correct 'equipSlot' value, and 'basePrice' (MUST BE a number).
    e.  'quests': An array of initial quests. Can be an empty array \`[]\`. If a quest is included, it MUST have a unique 'id', 'description', and 'status: "active"'. 'category' and 'objectives' (with 'isCompleted: false') are optional. **For any included quest, it is highly recommended to define a 'rewards' block.** If 'rewards' are included, they MUST specify at least some 'experiencePoints' (number) or 'currency' (number). 'items' are optional; if included, each item MUST have a unique 'id', 'name', 'description', 'basePrice' (MUST BE a number), and optional 'equipSlot' (OMIT 'equipSlot' for non-equippable rewards). For example, rewards could be: \`{"experiencePoints": 50, "currency": 10, "items": [{"id": "item_starting_potion_01", "name": "Minor Healing Potion", "description": "A simple potion to mend small wounds.", "basePrice": 5, "isConsumable": true, "effectDescription": "Heals 10 HP"}]}\`.
    f.  'worldFacts': An array of 1-2 key facts about the world or starting situation. If 'languageUnderstanding' for the character is low (e.g., 0-10), one fact MUST state something like: "The local language is currently incomprehensible to {{character.name}}."
    g.  'trackedNPCs': An array of NPC profiles. Initialize as an empty array \`[]\` unless NPCs are directly part of the initial scene. If an NPC is included, they MUST have a unique 'id', 'name', 'description', and 'relationshipStatus' (MUST BE a number, e.g., 0 for neutral). Other fields like 'classOrRole', locations, turn IDs ("initial_turn_0"), 'knownFacts' (empty for new NPCs), 'dialogueHistory' (empty), 'isMerchant' are optional but useful. If 'isMerchant' is true, 'merchantInventory' (array of items, each with unique 'id', 'name', 'description', 'basePrice' (MUST BE a number), and merchant 'price' (MUST BE a number). OMIT 'equipSlot' for non-equippable items in inventory), 'buysItemTypes', and 'sellsItemTypes' can be populated.
    h.  'storySummary': Initialize as an empty string "" or a very brief (1-sentence) thematic intro.

Output ONLY the JSON object adhering to 'GenerateStoryStartOutputSchemaInternal'.
`,
    });

    const {output} = await storyStartPrompt(input);
    if (!output) throw new Error("Failed to generate story start output.");

    // Existing sanitation logic remains crucial as a fallback
    if (output.storyState.character) {
      const char = output.storyState.character;
      char.mana = char.mana ?? 0;
      char.maxMana = char.maxMana ?? 0;
      char.strength = char.strength ?? 10;
      char.dexterity = char.dexterity ?? 10;
      char.constitution = char.constitution ?? 10;
      char.intelligence = char.intelligence ?? 10;
      char.wisdom = char.wisdom ?? 10;
      char.charisma = char.charisma ?? 10;
      char.level = char.level ?? 1;
      char.experiencePoints = char.experiencePoints ?? 0;
      char.experienceToNextLevel = char.experienceToNextLevel ?? 100;
      if (char.experienceToNextLevel <= 0) char.experienceToNextLevel = 100;
      char.currency = char.currency ?? 0;
      if (char.currency < 0) char.currency = 0;
      
      char.languageUnderstanding = char.languageUnderstanding ?? 100;
      if (char.languageUnderstanding < 0) char.languageUnderstanding = 0;
      if (char.languageUnderstanding > 100) char.languageUnderstanding = 100;

      char.skillsAndAbilities = char.skillsAndAbilities ?? [];
      char.skillsAndAbilities.forEach((skill, index) => {
        if (!skill.id) skill.id = `skill_generated_start_${Date.now()}_${index}`;
        skill.name = skill.name || "Unnamed Skill";
        skill.description = skill.description || "No description provided.";
        skill.type = skill.type || "Generic";
      });
    }

    const npcIdSet = new Set<string>(); // To help ensure unique NPC IDs during sanitation pass

    if (output.storyState) {
        output.storyState.inventory = output.storyState.inventory ?? [];
        output.storyState.inventory.forEach(item => {
          if (!item.id) item.id = `item_generated_inv_start_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          if (item.equipSlot === null || (item.equipSlot as unknown) === '') delete (item as Partial<ItemType>).equipSlot;
          if (item.isConsumable === undefined) delete item.isConsumable;
          if (item.effectDescription === undefined || item.effectDescription === '') delete item.effectDescription;
          if (item.isQuestItem === undefined) delete item.isQuestItem;
          if (item.relevantQuestId === undefined || item.relevantQuestId === '') delete item.relevantQuestId;
          item.basePrice = item.basePrice ?? 0;
          if (item.basePrice < 0) item.basePrice = 0;
        });
        
        output.storyState.quests = output.storyState.quests ?? [];
        output.storyState.quests.forEach((quest, index) => {
          if (!quest.id) quest.id = `quest_start_generated_${Date.now()}_${index}`;
          if (!quest.status) quest.status = 'active';
          if (quest.category === null || (quest.category as unknown) === '') delete (quest as Partial<QuestType>).category;
          quest.objectives = quest.objectives ?? [];
          quest.objectives.forEach(obj => {
            if (typeof obj.isCompleted !== 'boolean') obj.isCompleted = false;
            if (typeof obj.description !== 'string' || obj.description.trim() === '') obj.description = "Objective details missing";
          });
          if (quest.rewards) {
            quest.rewards.items = quest.rewards.items ?? [];
            quest.rewards.items.forEach(rewardItem => {
              if (!rewardItem.id) rewardItem.id = `item_reward_start_${Date.now()}_${Math.random().toString(36).substring(7)}`;
              if (rewardItem.equipSlot === null || (rewardItem.equipSlot as unknown) === '') delete (rewardItem as Partial<ItemType>).equipSlot;
              if (rewardItem.isConsumable === undefined) delete rewardItem.isConsumable;
              if (rewardItem.effectDescription === undefined || rewardItem.effectDescription === '') delete rewardItem.effectDescription;
              if (rewardItem.isQuestItem === undefined) delete rewardItem.isQuestItem;
              if (rewardItem.relevantQuestId === undefined || rewardItem.relevantQuestId === '') delete rewardItem.relevantQuestId;
              rewardItem.basePrice = rewardItem.basePrice ?? 0;
              if (rewardItem.basePrice < 0) rewardItem.basePrice = 0;
            });
            quest.rewards.currency = quest.rewards.currency ?? undefined;
            if (quest.rewards.currency !== undefined && quest.rewards.currency < 0) quest.rewards.currency = 0;
            if (!quest.rewards.experiencePoints && quest.rewards.items.length === 0 && quest.rewards.currency === undefined) delete quest.rewards;
            else {
              if (quest.rewards.experiencePoints === undefined) delete quest.rewards.experiencePoints;
              if (quest.rewards.items.length === 0) delete quest.rewards.items;
              if (quest.rewards.currency === undefined) delete quest.rewards.currency;
            }
          }
        });

        output.storyState.worldFacts = output.storyState.worldFacts ?? [];
        output.storyState.worldFacts = output.storyState.worldFacts.filter(fact => typeof fact === 'string' && fact.trim() !== '');

        const defaultEquippedItems: Record<EquipmentSlot, ItemType | null> = { weapon: null, shield: null, head: null, body: null, legs: null, feet: null, hands: null, neck: null, ring1: null, ring2: null };
        const aiEquipped = output.storyState.equippedItems || {} as Record<EquipmentSlot, ItemType | null>;
        const newEquippedItems: Record<EquipmentSlot, ItemType | null> = {...defaultEquippedItems};

        for (const slotKey of Object.keys(defaultEquippedItems) as EquipmentSlot[]) {
            const item = aiEquipped[slotKey];
            if (item && typeof item === 'object' && item.name) { 
               if (!item.id) item.id = `item_generated_equip_start_${Date.now()}_${Math.random().toString(36).substring(7)}`;
              if ((item.equipSlot === null || (item.equipSlot as unknown) === '')) delete (item as Partial<ItemType>)!.equipSlot;
              delete (item as Partial<ItemType>)!.isConsumable;
              delete (item as Partial<ItemType>)!.effectDescription;
              delete (item as Partial<ItemType>)!.isQuestItem;
              delete (item as Partial<ItemType>)!.relevantQuestId;
              item.basePrice = item.basePrice ?? 0;
              if (item.basePrice! < 0) item.basePrice = 0;
              newEquippedItems[slotKey] = item;
            } else {
              newEquippedItems[slotKey] = null;
            }
        }
        output.storyState.equippedItems = newEquippedItems;

        output.storyState.trackedNPCs = output.storyState.trackedNPCs ?? [];
        output.storyState.trackedNPCs.forEach((npc, index) => {
            const processedNpc = {...npc} as Partial<NPCProfileType>;

            // Delete extraneous fields
            delete (processedNpc as any).currentGoal;

            if (!processedNpc.id) {
                let baseId = `npc_start_${processedNpc.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}_${Date.now()}_${index}`;
                let newId = baseId; let counter = 0;
                while(npcIdSet.has(newId)) { newId = `${baseId}_u${counter++}`; }
                processedNpc.id = newId;
            } else {
                 let currentId = processedNpc.id;
                 if(npcIdSet.has(currentId)){
                    let baseId = currentId; let counter = 0;
                    while(npcIdSet.has(currentId)) { currentId = `${baseId}_u${counter++}`; }
                    processedNpc.id = currentId;
                 }
            }
            npcIdSet.add(processedNpc.id!);
            
            processedNpc.name = processedNpc.name || "Unnamed NPC";
            processedNpc.description = processedNpc.description || "No description provided.";
            processedNpc.relationshipStatus = typeof processedNpc.relationshipStatus === 'number' ? processedNpc.relationshipStatus : 0; 
            
            if (processedNpc.classOrRole === null || (processedNpc.classOrRole as unknown) === '') delete processedNpc.classOrRole;
            if (processedNpc.firstEncounteredLocation === null || (processedNpc.firstEncounteredLocation as unknown) === '') delete processedNpc.firstEncounteredLocation;
            if (processedNpc.lastKnownLocation === null || (processedNpc.lastKnownLocation as unknown) === '') delete processedNpc.lastKnownLocation;
            if (processedNpc.seriesContextNotes === null || (processedNpc.seriesContextNotes as unknown) === '') delete processedNpc.seriesContextNotes;
            if (processedNpc.shortTermGoal === null || (processedNpc.shortTermGoal as unknown) === '') delete processedNpc.shortTermGoal;
            
            processedNpc.knownFacts = processedNpc.knownFacts ?? [];
            processedNpc.dialogueHistory = processedNpc.dialogueHistory ?? [];
            processedNpc.firstEncounteredTurnId = processedNpc.firstEncounteredTurnId || "initial_turn_0";
            processedNpc.updatedAt = new Date().toISOString(); 
            processedNpc.lastKnownLocation = processedNpc.lastKnownLocation || processedNpc.firstEncounteredLocation;
            processedNpc.lastSeenTurnId = processedNpc.lastSeenTurnId || processedNpc.firstEncounteredTurnId;
            
            processedNpc.isMerchant = processedNpc.isMerchant ?? false;
            processedNpc.merchantInventory = processedNpc.merchantInventory ?? [];
            processedNpc.merchantInventory.forEach(item => {
                if (!item.id) item.id = `item_merchant_start_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                item.basePrice = item.basePrice ?? 0;
                if (item.basePrice < 0) item.basePrice = 0;
                (item as any).price = (item as any).price ?? item.basePrice; 
                if ((item as any).price < 0) (item as any).price = 0;
                if (item.equipSlot === null || (item.equipSlot as unknown) === '') delete (item as Partial<ItemType>).equipSlot;
            });

            if (processedNpc.buysItemTypes === null) delete processedNpc.buysItemTypes;
            else processedNpc.buysItemTypes = processedNpc.buysItemTypes ?? undefined;

            if (processedNpc.sellsItemTypes === null) delete processedNpc.sellsItemTypes;
            else processedNpc.sellsItemTypes = processedNpc.sellsItemTypes ?? undefined;

            output.storyState.trackedNPCs[index] = processedNpc as NPCProfileType;
        });
        output.storyState.storySummary = output.storyState.storySummary ?? "";
    }
    return output!;
  }
);


