
'use server';

/**
 * @fileOverview A flow for generating the initial scene of an interactive story, including character creation with core stats, mana, level, XP, initial empty equipment, initial quests (with optional objectives, categories, and pre-defined rewards), and initial tracked NPCs.
 * THIS FLOW IS NOW LARGELY SUPERSEDED BY generateScenarioFromSeries.ts for series-based starts.
 *
 * - generateStoryStart - A function that generates the initial scene description and story state.
 * - GenerateStoryStartInput - The input type for the generateStoryStart function.
 * - GenerateStoryStartOutput - The return type for the generateStoryStart function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { EquipmentSlot, Item as ItemType, Quest as QuestType, NPCProfile as NPCProfileType, NPCDialogueEntry as NPCDialogueEntryType, NPCRelationshipStatus } from '@/types/story';

const EquipSlotEnumInternal = z.enum(['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring'])
  .describe("The equipment slot type, if the item is equippable (e.g., 'weapon', 'head', 'body', 'ring').");

const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Make it unique within the current inventory if any items are pre-assigned (though typically inventory starts empty)."),
  name: z.string().describe("The name of the item."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function."),
  equipSlot: EquipSlotEnumInternal.optional().describe("If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), specify the slot it occupies. Examples: 'weapon', 'head', 'body', 'ring'. If the item is not an equippable type of item (e.g., a potion, a key, a generic diary/book), this field MUST BE OMITTED ENTIRELY."),
});

const CharacterProfileSchemaInternal = z.object({
  name: z.string().describe('The name of the character.'),
  class: z.string().describe('The class or archetype of the character.'),
  description: z.string().describe('A brief backstory or description of the character.'),
  health: z.number().describe('Current health points of the character.'),
  maxHealth: z.number().describe('Maximum health points of the character.'),
  mana: z.number().optional().describe('Current mana or magic points of the character. Assign 0 if not applicable to the class, or omit.'),
  maxMana: z.number().optional().describe('Maximum mana or magic points. Assign 0 if not applicable, or omit.'),
  strength: z.number().optional().describe('Character\'s physical power. Assign a value between 5 and 15, or omit.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes. Assign a value between 5 and 15, or omit.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness. Affects health. Assign a value between 5 and 15, or omit.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and memory. Affects mana for magic users. Assign a value between 5 and 15, or omit.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition. Affects mana regeneration or spell effectiveness. Assign a value between 5 and 15, or omit.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence. Assign a value between 5 and 15, or omit.'),
  level: z.number().describe('The current level of the character. Initialize to 1.'),
  experiencePoints: z.number().describe('Current experience points. Initialize to 0.'),
  experienceToNextLevel: z.number().describe('Experience points needed to reach the next level. Initialize to a starting value, e.g., 100.'),
});

const EquipmentSlotsSchemaInternal = z.object({
  weapon: ItemSchemaInternal.nullable().optional().describe("Weapon slot. Null if empty."),
  shield: ItemSchemaInternal.nullable().optional().describe("Shield slot. Null if empty."),
  head: ItemSchemaInternal.nullable().optional().describe("Head slot. Null if empty."),
  body: ItemSchemaInternal.nullable().optional().describe("Body slot. Null if empty."),
  legs: ItemSchemaInternal.nullable().optional().describe("Legs slot. Null if empty."),
  feet: ItemSchemaInternal.nullable().optional().describe("Feet slot. Null if empty."),
  hands: ItemSchemaInternal.nullable().optional().describe("Hands slot. Null if empty."),
  neck: ItemSchemaInternal.nullable().optional().describe("Neck slot. Null if empty."),
  ring1: ItemSchemaInternal.nullable().optional().describe("Ring 1 slot. Null if empty."),
  ring2: ItemSchemaInternal.nullable().optional().describe("Ring 2 slot. Null if empty."),
}).describe("A record of the character's equipped items. Keys are slot names (weapon, shield, head, body, legs, feet, hands, neck, ring1, ring2), values are the item object or null if the slot is empty. Initialize all 10 slots to null.");

const QuestStatusEnumInternal = z.enum(['active', 'completed']);
const QuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("A clear description of this specific objective for the quest."),
  isCompleted: z.boolean().describe("Whether this specific objective is completed (should usually be false for new quests).")
});

const QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("Amount of experience points awarded."),
  items: z.array(ItemSchemaInternal).optional().describe("An array of item objects awarded. Each item must have a unique ID, name, description, and optional 'equipSlot' (omit if not inherently equippable gear).")
}).describe("Potential rewards to be given upon quest completion. Defined when the quest is created. Omit if the quest has no specific material rewards.");

const QuestSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the quest, e.g., 'quest_generic_001'."),
  description: z.string().describe("A clear description of the quest's overall objective."),
  status: QuestStatusEnumInternal.describe("The current status of the quest, typically 'active' for starting quests."),
  category: z.string().optional().describe("An optional category for the quest (e.g., 'Main Story', 'Side Quest', 'Tutorial'). Omit if not clearly classifiable."),
  objectives: z.array(QuestObjectiveSchemaInternal).optional().describe("An optional list of specific sub-objectives for this quest. If the quest is simple, this can be omitted. For initial quests, all objectives should have 'isCompleted: false'."),
  rewards: QuestRewardsSchemaInternal.optional()
});

const NPCRelationshipStatusEnumInternal = z.enum(['Friendly', 'Neutral', 'Hostile', 'Allied', 'Cautious', 'Unknown']);
const NPCDialogueEntrySchemaInternal = z.object({
    playerInput: z.string().optional().describe("The player's input that led to the NPC's response, if applicable."),
    npcResponse: z.string().describe("The NPC's spoken dialogue or a summary of their response."),
    turnId: z.string().describe("The ID of the story turn in which this dialogue occurred."),
});
const NPCProfileSchemaInternal = z.object({
    id: z.string().describe("Unique identifier for the NPC, e.g., npc_bartender_giles_001."),
    name: z.string().describe("NPC's name."),
    description: z.string().describe("Physical appearance, general demeanor, key characteristics."),
    classOrRole: z.string().optional().describe("e.g., 'Merchant', 'Guard Captain'."),
    firstEncounteredLocation: z.string().optional().describe("Location where NPC was first met."),
    firstEncounteredTurnId: z.string().optional().describe("ID of the story turn when first met."),
    relationshipStatus: NPCRelationshipStatusEnumInternal.describe("Player's relationship with the NPC."),
    knownFacts: z.array(z.string()).describe("Specific pieces of information player has learned about this NPC."),
    dialogueHistory: z.array(NPCDialogueEntrySchemaInternal).optional().describe("Log of key interaction moments."),
    lastKnownLocation: z.string().optional().describe("Last known location of the NPC."),
    lastSeenTurnId: z.string().optional().describe("ID of the story turn when NPC was last seen or interacted with."),
    seriesContextNotes: z.string().optional().describe("AI-internal note about their role if from a known series (not for player)."),
    updatedAt: z.string().optional().describe("Timestamp of the last update to this profile."),
});


const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal.describe('The profile of the main character, including core stats, level, and XP.'),
  currentLocation: z.string().describe('The current location of the character in the story.'),
  inventory: z.array(ItemSchemaInternal).describe('A list of items in the character\'s inventory. Initialize as an empty array: []. Each item must be an object with id, name, description. If the item is an inherently equippable piece of gear, include its equipSlot; otherwise, the equipSlot field MUST BE OMITTED ENTIRELY.'),
  equippedItems: EquipmentSlotsSchemaInternal,
  quests: z.array(QuestSchemaInternal).describe('A list of quests. Initialize as an empty array if no quest is generated, or with one simple starting quest. Each quest is an object with id, description, status (active), and optionally category, objectives, and rewards (which specify what the player will get on completion).'),
  worldFacts: z.array(z.string()).describe('Key facts or observations about the game world state. Initialize with one or two relevant facts.'),
  trackedNPCs: z.array(NPCProfileSchemaInternal).describe("A list of significant NPCs encountered. Initialize as an empty array, or with profiles for any NPCs introduced in the starting scene.")
});
export type StructuredStoryState = z.infer<typeof StructuredStoryStateSchemaInternal>;

const GenerateStoryStartInputSchemaInternal = z.object({
  prompt: z.string().describe('A prompt to kickstart the story (e.g., \'A lone knight enters a dark forest\').'),
  characterNameInput: z.string().optional().describe('Optional user-suggested character name.'),
  characterClassInput: z.string().optional().describe('Optional user-suggested character class.'),
});
export type GenerateStoryStartInput = z.infer<typeof GenerateStoryStartInputSchemaInternal>;

const GenerateStoryStartOutputSchemaInternal = z.object({
  sceneDescription: z.string().describe('The generated initial scene description.'),
  storyState: StructuredStoryStateSchemaInternal.describe('The initial structured state of the story, including character details, stats, level, XP, empty equipment slots, any initial quests (with categories, objectives, and pre-defined rewards), and profiles for any NPCs introduced.'),
});
export type GenerateStoryStartOutput = z.infer<typeof GenerateStoryStartOutputSchemaInternal>;

export async function generateStoryStart(input: GenerateStoryStartInput): Promise<GenerateStoryStartOutput> {
  return generateStoryStartFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStoryStartPrompt',
  input: {schema: GenerateStoryStartInputSchemaInternal},
  output: {schema: GenerateStoryStartOutputSchemaInternal},
  prompt: `You are a creative storyteller and game master.
The user wants to start a new story with the following theme: "{{prompt}}".

User's character suggestions:
- Name: {{#if characterNameInput}}{{characterNameInput}}{{else}}(Not provided){{/if}}
- Class: {{#if characterClassInput}}{{characterClassInput}}{{else}}(Not provided){{/if}}

Based on the theme and any user suggestions, generate the following:
1.  An initial scene description for the story.
2.  A character profile:
    -   Invent a suitable name and class if not provided by the user or if the suggestions are too vague.
    -   Provide a brief backstory or description for the character.
    -   Set initial health and maxHealth (e.g., 100 health, 100 maxHealth).
    -   Set initial mana and maxMana. These fields must be numbers. If the class is not a magic user, set both to 0. Do not use 'null'.
    -   Assign initial values (between 5 and 15, average 10) for the six core stats: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma. These stats should generally align with the character's class and must be numbers if provided.
    -   Initialize the character at \`level\` 1, with 0 \`experiencePoints\`, and set an initial \`experienceToNextLevel\` (e.g., 100).
3.  An initial structured story state, including:
    -   The character profile you just created.
    -   A starting location relevant to the scene.
    -   An empty inventory (initialize as an empty array: []). If any starting items are somehow generated, each item must include an 'id', 'name', 'description'. **If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), include an 'equipSlot' (e.g. 'weapon', 'head', 'body'). If it's not an equippable type of item (e.g., a potion, a key, a generic diary/book), the 'equipSlot' field MUST BE OMITTED ENTIRELY.**
    -   Initialize 'equippedItems' as an object with all 10 equipment slots ('weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2') set to null, as the character starts with nothing equipped.
    -   If appropriate, one simple starting quest in the 'quests' array. Each quest must be an object with a unique 'id', a 'description', and 'status' set to 'active'. You can optionally assign a 'category' (e.g., "Tutorial", "Introduction") - if no category is clear, omit the 'category' field. If the quest is complex enough, provide a list of 'objectives', each with a 'description' and 'isCompleted: false'.
    -   **Quest Rewards**: For any generated quest, you MUST also define a 'rewards' object. This object should specify the 'experiencePoints' (number, optional) and/or 'items' (array of Item objects, optional) that the player will receive upon completing the quest. For 'items' in rewards, each item needs a unique 'id', 'name', 'description', and an optional 'equipSlot' (omit 'equipSlot' if the item is not inherently equippable gear). If a quest has no specific material rewards, you can omit the 'rewards' field or provide an empty object for it.
    -   One or two initial 'worldFacts'.
    -   'trackedNPCs': If any significant NPCs (e.g., named characters, quest givers) are introduced in the initial scene, create profiles for them in this array. Each NPC profile needs a unique 'id', 'name', 'description', initial 'relationshipStatus' (e.g., 'Neutral' or 'Unknown'), 'firstEncounteredLocation' (current location), 'firstEncounteredTurnId' (use "initial_turn_0"), and 'knownFacts' (initially an empty array or one or two basic facts if revealed). 'dialogueHistory', 'lastKnownLocation', 'lastSeenTurnId', 'seriesContextNotes' can be omitted or empty for initial NPCs.

Your entire response must strictly follow the JSON schema defined for the output.
The 'storyState' must be a JSON object with 'character', 'currentLocation', 'inventory', 'equippedItems', 'quests', 'worldFacts', and 'trackedNPCs'.
The 'character' object must have all fields required by its schema.
The 'equippedItems' must be an object with all 10 specified slots initially set to null.
The 'quests' array must contain quest objects, each with 'id', 'description', and 'status'. Optional fields are 'category', 'objectives', and 'rewards'.
For items in inventory, equipped, or as rewards, if 'equipSlot' is not applicable (because the item is not inherently equippable gear), it must be omitted.
The 'trackedNPCs' array should contain NPCProfile objects.
`,
});

const generateStoryStartFlow = ai.defineFlow(
  {
    name: 'generateStoryStartFlow',
    inputSchema: GenerateStoryStartInputSchemaInternal,
    outputSchema: GenerateStoryStartOutputSchemaInternal,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) throw new Error("Failed to generate story start output.");

    // Character post-processing
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
    }

    // General storyState post-processing
    if (output.storyState) {
        output.storyState.inventory = output.storyState.inventory ?? [];
        output.storyState.inventory.forEach(item => {
          if (!item.id) {
            item.id = `item_generated_inv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          }
          if (item.equipSlot === null || (item.equipSlot as unknown) === '') {
            delete (item as Partial<ItemType>).equipSlot;
          }
        });
        
        output.storyState.quests = output.storyState.quests ?? [];
        output.storyState.quests.forEach((quest, index) => {
          if (!quest.id) {
            quest.id = `quest_start_generated_${Date.now()}_${index}`;
          }
          if (!quest.status) {
            quest.status = 'active';
          }
          if (quest.category === null || (quest.category as unknown) === '') {
            delete (quest as Partial<QuestType>).category;
          }
          quest.objectives = quest.objectives ?? [];
          quest.objectives.forEach(obj => {
            if (typeof obj.isCompleted !== 'boolean') {
              obj.isCompleted = false;
            }
             if (typeof obj.description !== 'string' || obj.description.trim() === '') {
                obj.description = "Objective details missing";
            }
          });
          
          if (quest.rewards) {
            quest.rewards.items = quest.rewards.items ?? [];
            quest.rewards.items.forEach(rewardItem => {
              if (!rewardItem.id) {
                rewardItem.id = `item_reward_start_${Date.now()}_${Math.random().toString(36).substring(7)}`;
              }
              if (rewardItem.equipSlot === null || (rewardItem.equipSlot as unknown) === '') {
                delete (rewardItem as Partial<ItemType>).equipSlot;
              }
            });
            if (quest.rewards.experiencePoints === undefined && quest.rewards.items.length === 0) {
              delete quest.rewards;
            } else {
              if (quest.rewards.experiencePoints === undefined) delete quest.rewards.experiencePoints;
              if (quest.rewards.items.length === 0) delete quest.rewards.items;
            }
          }
        });

        output.storyState.worldFacts = output.storyState.worldFacts ?? [];
        output.storyState.worldFacts = output.storyState.worldFacts.filter(fact => typeof fact === 'string' && fact.trim() !== '');

        const defaultEquippedItems: Partial<Record<EquipmentSlot, ItemType | null>> = {
            weapon: null, shield: null, head: null, body: null, legs: null, feet: null, hands: null, neck: null, ring1: null, ring2: null
        };
        const aiEquipped = output.storyState.equippedItems || {};
        const newEquippedItems: Partial<Record<EquipmentSlot, ItemType | null>> = {};
        for (const slotKey of Object.keys(defaultEquippedItems) as EquipmentSlot[]) {
            newEquippedItems[slotKey] = aiEquipped[slotKey] !== undefined ? aiEquipped[slotKey] : null;
            if (newEquippedItems[slotKey]) {
               if (!newEquippedItems[slotKey]!.id) {
                    newEquippedItems[slotKey]!.id = `item_generated_equip_start_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                }
              if ((newEquippedItems[slotKey]!.equipSlot === null || (newEquippedItems[slotKey]!.equipSlot as unknown) === '')) {
                delete (newEquippedItems[slotKey] as Partial<ItemType>)!.equipSlot;
              }
            }
        }
        output.storyState.equippedItems = newEquippedItems as any;

        // NPC Tracker post-processing
        output.storyState.trackedNPCs = output.storyState.trackedNPCs ?? [];
        const npcIdSet = new Set<string>();
        output.storyState.trackedNPCs.forEach((npc, index) => {
            if (!npc.id) { // Generate ID if missing
                let baseId = `npc_start_${npc.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}_${Date.now()}_${index}`;
                let newId = baseId;
                let counter = 0;
                while(npcIdSet.has(newId)) {
                    newId = `${baseId}_${counter++}`;
                }
                npc.id = newId;
            }
            while(npcIdSet.has(npc.id)){ // Ensure ID is unique even if AI provided one
                 let baseId = npc.id;
                 let counter = 0;
                 while(npcIdSet.has(npc.id)) {
                    npc.id = `${baseId}_u${counter++}`;
                 }
            }
            npcIdSet.add(npc.id);

            npc.name = npc.name || "Unnamed NPC";
            npc.description = npc.description || "No description provided.";
            npc.relationshipStatus = npc.relationshipStatus || 'Unknown';
            npc.knownFacts = npc.knownFacts ?? [];
            npc.dialogueHistory = npc.dialogueHistory ?? [];
            
            npc.firstEncounteredTurnId = npc.firstEncounteredTurnId || "initial_turn_0";
            npc.updatedAt = npc.updatedAt || new Date().toISOString();
            npc.lastKnownLocation = npc.lastKnownLocation || npc.firstEncounteredLocation;
            npc.lastSeenTurnId = npc.lastSeenTurnId || npc.firstEncounteredTurnId;


            if (npc.classOrRole === null || (npc.classOrRole as unknown) === '') delete npc.classOrRole;
            if (npc.firstEncounteredLocation === null || (npc.firstEncounteredLocation as unknown) === '') delete npc.firstEncounteredLocation;
            // Do not delete firstEncounteredTurnId
            if (npc.lastKnownLocation === null || (npc.lastKnownLocation as unknown) === '') delete npc.lastKnownLocation;
            // Do not delete lastSeenTurnId
            if (npc.seriesContextNotes === null || (npc.seriesContextNotes as unknown) === '') delete npc.seriesContextNotes;
        });
    }
    return output!;
  }
);

