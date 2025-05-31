
'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating the next scene in a story based on user input and structured story state, including core character stats, mana, level, XP, currency, inventory, equipped items, quests (with objectives, categories, and rewards), world facts, tracked NPCs (with merchant capabilities), skills/abilities, and series-specific context. It also allows the AI to propose new lore entries, updates a running story summary, and handles character leveling and trading.
 *
 * - generateNextScene - A function that takes the current story state and user input, and returns the next scene, updated state, potentially new lore, an updated story summary, and handles character progression and trading.
 * - GenerateNextSceneInput - The input type for the generateNextScene function.
 * - GenerateNextSceneOutput - The return type for the generateNextScene function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';
import type { EquipmentSlot, Item as ItemType, Quest as QuestType, ActiveNPCInfo as ActiveNPCInfoType, NPCProfile as NPCProfileType, Skill as SkillType, RawLoreEntry } from '@/types/story';
import { lookupLoreTool } from '@/ai/tools/lore-tool';
import { addLoreEntry as saveNewLoreEntry } from '@/lib/lore-manager';


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
  name: z.string().describe('The name of the character.'),
  class: z.string().describe('The class or archetype of the character.'),
  description: z.string().describe('A brief backstory or description of the character.'),
  health: z.number().describe('Current health points of the character.'),
  maxHealth: z.number().describe('Maximum health points of the character.'),
  mana: z.number().optional().describe('Current mana or magic points of the character. Must be a number; use 0 if not applicable, or omit.'),
  maxMana: z.number().optional().describe('Maximum mana or magic points. Must be a number; use 0 if not applicable, or omit.'),
  strength: z.number().optional().describe('Character\'s physical power, or omit.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes, or omit.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness, or omit.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and memory, or omit.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition, or omit.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence, or omit.'),
  level: z.number().describe('The current level of the character.'),
  experiencePoints: z.number().describe('Current experience points of the character.'),
  experienceToNextLevel: z.number().describe('Experience points needed for the character to reach the next level.'),
  skillsAndAbilities: z.array(SkillSchemaInternal).optional().describe("A list of the character's current skills and abilities. Each includes an id, name, description, and type."),
  currency: z.number().optional().describe("Character's current currency (e.g., gold). Default to 0 if not set."),
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
}).describe("A record of the character's equipped items. Keys are slot names (weapon, shield, head, body, legs, feet, hands, neck, ring1, ring2), values are the item object or null if the slot is empty. All 10 slots must be present, with 'null' for empty ones.");

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

// Schema for items in a merchant's inventory, including their specific selling price
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
  character: CharacterProfileSchemaInternal.describe('The profile of the main character, including core stats, level, XP, currency, and skills/abilities.'),
  currentLocation: z.string().describe('The current location of the character in the story.'),
  inventory: z.array(ItemSchemaInternal).describe('A list of UNequipped items in the character\'s inventory. Each item is an object with id, name, description, and basePrice. If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), include its equipSlot; otherwise, the equipSlot field MUST BE OMITTED ENTIRELY. Also include `isConsumable`, `effectDescription`, `isQuestItem`, `relevantQuestId` if applicable.'),
  equippedItems: EquipmentSlotsSchemaInternal,
  quests: z.array(QuestSchemaInternal).describe("A list of all quests. Each quest is an object with 'id', 'description', 'status', its 'rewards' (defined at quest creation specifying what the player will get on completion, including currency and items with basePrice), optionally 'category', and a list of 'objectives' (each with 'description' and 'isCompleted')."),
  worldFacts: z.array(z.string()).describe('Key facts or observations about the game world state. These facts should reflect the character\'s current understanding and immediate environment, including the presence of significant NPCs. Add new facts as they are discovered, modify existing ones if they change, or remove them if they become outdated or irrelevant. Narrate significant changes to world facts if the character would perceive them.'),
  trackedNPCs: z.array(NPCProfileSchemaInternal).describe("A list of detailed profiles for significant NPCs encountered. Update existing profiles or add new ones as NPCs are introduced or interacted with. If an NPC is a merchant, include 'isMerchant', 'merchantInventory', 'buysItemTypes', 'sellsItemTypes'."),
  storySummary: z.string().optional().describe("A brief, running summary of key story events and character developments so far. This summary will be updated each turn."),
});

export type StructuredStoryState = z.infer<typeof StructuredStoryStateSchemaInternal>;

const GenerateNextSceneInputSchemaInternal = z.object({
  currentScene: z.string().describe('The current scene text.'),
  userInput: z.string().describe('The user input (action or dialogue).'),
  storyState: StructuredStoryStateSchemaInternal.describe('The current structured state of the story (character, location, inventory, equipped items, XP, currency, quests, worldFacts, trackedNPCs, skills/abilities, storySummary etc.).'),
  seriesName: z.string().describe('The name of the series this story is based on, for contextual awareness.'),
  seriesStyleGuide: z.string().optional().describe('A brief style guide for the series to maintain tone and themes.'),
  currentTurnId: z.string().describe('The ID of the current story turn, for logging in NPC dialogue history etc.'),
});
export type GenerateNextSceneInput = z.infer<typeof GenerateNextSceneInputSchemaInternal>;

const PromptInternalInputSchema = GenerateNextSceneInputSchemaInternal.extend({
  formattedEquippedItemsString: z.string().describe("Pre-formatted string of equipped items."),
  formattedQuestsString: z.string().describe("Pre-formatted string of quests with their statuses, categories, objectives, and potential rewards (including currency)."),
  formattedTrackedNPCsString: z.string().describe("Pre-formatted string summarizing tracked NPCs, including their short-term goals and merchant status/wares if any."),
  formattedSkillsString: z.string().describe("Pre-formatted string of character's skills and abilities."),
});

const ActiveNPCInfoSchemaInternal = z.object({
    name: z.string().describe("The name of the NPC, if known or identifiable."),
    description: z.string().optional().describe("A brief description of the NPC if newly introduced or particularly relevant."),
    keyDialogueOrAction: z.string().optional().describe("A key line of dialogue spoken by the NPC or a significant action they took in this scene.")
});

const RawLoreEntrySchemaInternal = z.object({
  keyword: z.string().describe("The specific term, character name, location, or concept from the series (e.g., 'Hokage', 'Death Note', 'Subaru Natsuki', 'Emerald Sustrai')."),
  content: z.string().describe("A concise (2-3 sentences) description or piece of lore about the keyword, accurate to the specified series."),
  category: z.string().optional().describe("An optional category for the lore entry (e.g., 'Character', 'Location', 'Ability', 'Organization', 'Concept'). If no category is applicable or known, this field should be omitted entirely."),
});

const GenerateNextSceneOutputSchemaInternal = z.object({
  nextScene: z.string().describe('The generated text for the next scene, clearly attributing dialogue and actions to NPCs if present.'),
  updatedStoryState: StructuredStoryStateSchemaInternal.describe('The updated structured story state after the scene. This includes any character stat changes, XP, currency, level changes (including potential stat/skill grant from level up), inventory changes, equipment changes, quest updates (status, objective completion, potential branching), world fact updates, NPC profile updates/additions in trackedNPCs (including merchant status, inventory changes, potential short-term goal changes), new skills, or stat increases. Rewards for completed quests (including currency) are applied automatically. Items should always include a basePrice.'),
  activeNPCsInScene: z.array(ActiveNPCInfoSchemaInternal).optional().describe("A list of NPCs who were active (spoke, performed significant actions) in this generated scene. Include their name, an optional brief description, and an optional key piece of dialogue or action. Omit if no distinct NPCs were notably active."),
  newLoreEntries: z.array(RawLoreEntrySchemaInternal).optional().describe("An array of new lore entries discovered or revealed in this scene. Each entry should have 'keyword', 'content', and optional 'category'."),
  updatedStorySummary: z.string().describe("The new running summary of the story, concisely incorporating key events, decisions, and consequences from this scene, building upon the previous summary."),
});
export type GenerateNextSceneOutput = z.infer<typeof GenerateNextSceneOutputSchemaInternal>;

export async function generateNextScene(input: GenerateNextSceneInput): Promise<GenerateNextSceneOutput> {
  return generateNextSceneFlow(input);
}

function formatEquippedItems(equippedItems: Partial<Record<EquipmentSlot, ItemType | null>> | undefined | null): string {
  if (!equippedItems || typeof equippedItems !== 'object') {
    return "Equipment status: Not available or invalid data.";
  }
  let output = "";
  const slots: EquipmentSlot[] = ['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2'];
  for (const slot of slots) {
    const item = equippedItems[slot];
    output += `- ${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${item ? `${item.name} (Value: ${item.basePrice ?? 0})` : 'Empty'}\n`;
  }
  return output.trim();
}

function formatQuests(quests: QuestType[] | undefined | null): string {
  if (!quests || !Array.isArray(quests) || quests.length === 0) {
    return "None";
  }
  return quests.map(q => {
    let questStr = `- ${q.description} (Status: ${q.status}, ID: ${q.id})`;
    if (q.category) {
      questStr += ` [Category: ${q.category}]`;
    }
    if (q.objectives && q.objectives.length > 0) {
      questStr += "\n  Objectives:\n";
      q.objectives.forEach(obj => {
        questStr += `    - ${obj.description} (${obj.isCompleted ? 'Completed' : 'Pending'})\n`;
      });
    }
    if (q.rewards) {
        const rewardLabel = q.status === 'completed' ? "Rewards Received" : "Potential Rewards";
        questStr += `\n  ${rewardLabel}:\n`;
        if (q.rewards.experiencePoints) {
            questStr += `    - XP: ${q.rewards.experiencePoints}\n`;
        }
        if (q.rewards.currency) {
            questStr += `    - Currency: ${q.rewards.currency}\n`;
        }
        if (q.rewards.items && q.rewards.items.length > 0) {
            q.rewards.items.forEach(item => {
            questStr += `    - Item: ${item.name} (Value: ${item.basePrice ?? 0})\n`;
            });
        }
    }
    return questStr;
  }).join("\n");
}

function formatTrackedNPCs(npcs: NPCProfileType[] | undefined | null): string {
    if (!npcs || !Array.isArray(npcs) || npcs.length === 0) {
        return "None known or tracked.";
    }
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
        if (npc.lastKnownLocation) npcStr += ` (Last seen: ${npc.lastKnownLocation})`;
        if (npc.shortTermGoal) npcStr += `\n  Current Goal: ${npc.shortTermGoal}`;
        npcStr += `\n  Description: ${npc.description}`;
        if (npc.isMerchant && npc.merchantInventory && npc.merchantInventory.length > 0) {
            npcStr += "\n  Wares for Sale:\n";
            npc.merchantInventory.forEach(item => {
                npcStr += `    - ${item.name} (Price: ${(item as any).price ?? item.basePrice ?? 0}, ID: ${item.id})\n`; // Cast to any to access price
            });
        }
        if (npc.knownFacts && npc.knownFacts.length > 0) {
            npcStr += "\n  Known Facts:\n";
            npc.knownFacts.forEach(fact => npcStr += `    - ${fact}\n`);
        }
        return npcStr;
    }).join("\n");
}

function formatSkills(skills: SkillType[] | undefined | null): string {
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
        return "None known.";
    }
    return skills.map(skill => {
        return `- ${skill.name} (Type: ${skill.type}): ${skill.description}`;
    }).join("\n");
}


const prompt = ai.definePrompt({
  name: 'generateNextScenePrompt',
  input: {schema: PromptInternalInputSchema},
  output: {schema: GenerateNextSceneOutputSchemaInternal},
  tools: [lookupLoreTool],
  prompt: `You are a dynamic storyteller, continuing a story based on the player's actions and the current game state.
This story is set in the universe of: {{seriesName}}.
{{#if seriesStyleGuide}}
Series Style Guide: {{seriesStyleGuide}}
{{/if}}

Story Summary So Far:
{{#if storyState.storySummary}}
{{{storyState.storySummary}}}
{{else}}
The story has just begun.
{{/if}}

Current Scene Narrative:
{{currentScene}}

Player Input:
{{userInput}}

Current Player Character:
- Name: {{storyState.character.name}}, the {{storyState.character.class}} (Level: {{storyState.character.level}})
- Health: {{storyState.character.health}}/{{storyState.character.maxHealth}}
- Mana: {{#if storyState.character.mana}}{{storyState.character.mana}}/{{storyState.character.maxMana}}{{else}}N/A{{/if}}
- Currency: {{storyState.character.currency}}
- XP: {{storyState.character.experiencePoints}}/{{storyState.character.experienceToNextLevel}}
- Stats:
  - Strength: {{storyState.character.strength}}
  - Dexterity: {{storyState.character.dexterity}}
  - Constitution: {{storyState.character.constitution}}
  - Intelligence: {{storyState.character.intelligence}}
  - Wisdom: {{storyState.character.wisdom}}
  - Charisma: {{storyState.character.charisma}}
- Skills & Abilities:
{{{formattedSkillsString}}}

Equipped Items:
{{{formattedEquippedItemsString}}}

Current Location: {{storyState.currentLocation}}

Current Inventory (Unequipped Items - includes potential consumables or quest items):
{{#if storyState.inventory.length}}
{{#each storyState.inventory}}
- {{this.name}} (ID: {{this.id}}, Value: {{this.basePrice}}): {{this.description}} {{#if this.equipSlot}}(Equippable Gear: {{this.equipSlot}}){{/if}}{{#if this.isConsumable}} (Consumable: {{this.effectDescription}}){{/if}}{{#if this.isQuestItem}} (Quest Item{{#if this.relevantQuestId}} for {{this.relevantQuestId}}){{/if}}){{/if}}
{{/each}}
{{else}}
Empty
{{/if}}

Quests (Rewards including currency and items are pre-defined; they are granted by the system upon completion):
{{{formattedQuestsString}}}

Known World Facts (Reflect immediate environment & character's current understanding, including presence/status of key NPCs):
{{#each storyState.worldFacts}}
- {{{this}}}
{{else}}
- None known.
{{/each}}

Tracked NPCs (Summary - full details in storyState.trackedNPCs, including their shortTermGoal and merchant status/wares if any):
{{{formattedTrackedNPCsString}}}


Available Equipment Slots: weapon, shield, head, body, legs, feet, hands, neck, ring1, ring2. An item's 'equipSlot' property determines where it can go. 'ring' items can go in 'ring1' or 'ring2'.
All items must have a 'basePrice'. When a merchant sells an item, it will have a 'price' in their merchantInventory.

If the player's input or the unfolding scene mentions a specific named entity (like a famous person, a unique location, a magical artifact, or a special concept) that seems like it might have established lore *within the "{{seriesName}}" universe*, use the 'lookupLoreTool' (providing the current 'seriesName' to it) to get more information about it. Integrate this information naturally into your response if relevant.

Based on the current scene, player's input, detailed story state, and the story summary so far, generate the 'nextScene' text.

**Story Summary & Context:**
You are provided with a \`storyState.storySummary\` of key past events. Use this summary to maintain long-term coherence. After generating the \`nextScene\`, you MUST provide an \`updatedStorySummary\` in the output. This new summary should concisely incorporate the most important developments, decisions, and consequences from the \`nextScene\` you just generated, appending to or refining the previous summary. Keep it brief (1-2 new sentences ideally) but informative.

**Narrative Integrity & Player Impact:**
While respecting player choices is paramount, ensure the story remains coherent within the established \`{{seriesName}}\` universe and its \`{{seriesStyleGuide}}\`.
- If a player action severely contradicts core series lore, established character personalities (for canon characters), or the fundamental tone of the series in a way that would break immersion, gently guide the narrative. This could involve: narrating internal conflict for the character, introducing unexpected obstacles that make the out-of-character action difficult, or NPCs reacting with strong disbelief or opposition. The aim is collaborative storytelling.
- If player actions lead to significant, logical consequences (e.g., alerting an entire city guard, angering a powerful entity), these consequences MUST be reflected in the \`nextScene\`, \`updatedStoryState\` (especially \`worldFacts\`, NPC statuses/goals, and quest states), and the \`updatedStorySummary\`.

**Special Abilities Awareness:** Be mindful of unique, potent character abilities listed in their profile, such as those involving fate, time, or death (e.g., 'Return by Death').

**Narrating Character Failure with such Skills:** If a character possesses an ability like 'Return by Death' and the narrative leads to a situation that would typically be a permanent character death or an irreversible, catastrophic failure for others:
- Do not abruptly end the story or declare a definitive 'game over' for that character.
- Instead, your narrative should:
    1. Describe the 'fatal' event or failure vividly.
    2. Then, transition the narrative to describe the character's experience of 'returning' or time rewinding. They should explicitly retain memories and knowledge from the 'failed' timeline.
    3. The story should then resume from a narratively coherent 'checkpoint' or a point just before the critical failure, with the character now possessing this foreknowledge.
- Subtly reflect any emotional toll or consequences of such a return in the character's state or your descriptive text (e.g., 'Subaru awoke with a gasp, the phantom pain still fresh, the events of the last hour seared into his mind. He was back at the market stall, moments before...').
- The 'updatedStoryState' you provide should reflect the character *after* the return (e.g., memories are part of their current understanding, potentially reflected in new \\\`worldFacts\\\`; health/mana might be reset to the checkpoint's values, but XP/level from the failed timeline could be retained if it makes sense).

**Skill Usage & Effects:**
- If the player's input indicates they are using one of their listed \`skillsAndAbilities\`:
  - Consult the skill's \`name\` and \`description\` from their profile.
  - Narrate the skill's activation and its immediate consequences clearly.
  - **Purely Narrative Success/Failure:** Based on the skill's nature and the character's relevant stats (e.g., Intelligence for a spell, Dexterity for an agile maneuver, Strength for a powerful blow), you can narrate varying degrees of success or minor complications. For example: "Your Fireball, fueled by your high Intelligence, erupts with great force." or "You attempt to leap across the chasm using your Acrobatics skill; with your impressive Dexterity, you land gracefully. If it were a more difficult jump, you might have stumbled." Do not implement dice rolls; this is for narrative flavor.
  - **Crucially, when a skill is used, its effects as described MUST be reflected in the \`updatedStoryState\`. For example, if a potion heals, \`character.health\` must increase. If a spell damages an NPC, their state (or a relevant \`worldFact\`) must change. If a skill costs mana, \`character.mana\` must decrease.**

**NPC Management & Tracking:**
- If new, significant NPCs are introduced (named, have dialogue, clear role):
  - Create a new profile in 'updatedStoryState.trackedNPCs'.
  - Assign a unique 'id'. Set 'name', 'description', 'classOrRole'.
  - Set 'firstEncounteredLocation' to 'storyState.currentLocation' and 'firstEncounteredTurnId' to '{{currentTurnId}}'.
  - Set initial 'relationshipStatus' (numerical score, e.g., 0 for Neutral).
  - 'knownFacts' can start empty or with initial details.
  - Optionally set a 'shortTermGoal'.
  - **If the new NPC is a merchant**: Set \`isMerchant: true\`. Populate their \`merchantInventory\` with 2-4 thematic items for sale. Each item in \`merchantInventory\` needs a unique \`id\`, \`name\`, \`description\`, its \`basePrice\`, and a specific \`price\` the merchant sells it for. Optionally define \`buysItemTypes\` or \`sellsItemTypes\`.
  - Set 'lastKnownLocation' to 'storyState.currentLocation' and 'lastSeenTurnId' to '{{currentTurnId}}'. Set 'updatedAt'.
- If interacting with an existing NPC:
  - Update their profile in 'updatedStoryState.trackedNPCs'.
  - **Relationship Dynamics:** Update numerical \\\`relationshipStatus\\\` based on interactions.
  - **NPC Memory & Consistency:** Refer to \`knownFacts\` and \`dialogueHistory\`.
  - **NPC Proactivity & Goals:** Consider 'shortTermGoal'. Update it if logical. NPCs should react to changes in \`worldFacts\`.
  - If new info about NPC is learned, add to 'knownFacts'.
  - If key dialogue, add to 'dialogueHistory'.
  - If location changes, update 'lastKnownLocation'. Always update 'lastSeenTurnId' and 'updatedAt'.
- Do not create duplicate NPC profiles.
- For 'nextScene' narrative: Attribute dialogue/actions. NPCs react in character.
- If distinct NPCs were active, populate 'activeNPCsInScene'.

**NPC Merchants & Trading:**
- If the player interacts with an NPC where \`isMerchant: true\`:
  - **Viewing Wares:** If the player asks to see wares (e.g., "What do you have for sale?", "Show me your goods"), narrate a list of items from the NPC's \`merchantInventory\`, including their \`name\` and \`price\` in the \`nextScene\`.
  - **Buying Items:** If the player expresses intent to buy an item from the merchant's \`merchantInventory\` (e.g., "I want to buy the Health Potion"):
    1. Find the item by name or ID in the merchant's \`merchantInventory\`. Let's assume the player mentions the item by name.
    2. Check if the merchant has the item and if the player character has enough \`currency\` (use the item's \`price\` from \`merchantInventory\`).
    3. If yes: In \`updatedStoryState\`, deduct the \`price\` from \`character.currency\`. Remove ONE instance of the item from \`trackedNPCs[merchantIndex].merchantInventory\`. Add a new instance of the item (with its own unique ID, but copied properties like name, description, basePrice, equipSlot etc.) to \`character.inventory\`. Narrate the transaction successfully (e.g., "You hand over 50 gold and receive the Health Potion.").
    4. If no (not enough currency, item not found, or merchant inventory empty): Narrate why the transaction cannot occur (e.g., "Sorry, I'm fresh out of those," or "You don't have enough gold for that.").
  - **Selling Items:** If the player expresses intent to sell an item from their \`character.inventory\` (e.g., "I want to sell my Rusty Dagger"):
    1. Identify the item in \`character.inventory\` by name or player's description.
    2. Determine a fair \`buyPrice\` for the item. This price should generally be less than the item's \`basePrice\` (e.g., 50-70% of \`basePrice\`, rounded). Consider the merchant's \`buysItemTypes\` (if defined) – they might offer less or refuse if it's not their specialty. Player's charisma can have a small narrative influence on the offered price but no mechanical roll.
    3. If the merchant agrees to buy and a \`buyPrice\` is determined: In \`updatedStoryState\`, add \`buyPrice\` to \`character.currency\`. Remove the item from \`character.inventory\`. Optionally, you can add the bought item to the merchant's \`merchantInventory\` (if it's something they might resell, give it a new ID and set a new \`price\` for resale, higher than \`buyPrice\`). Narrate the transaction (e.g., "The merchant offers you 10 gold for the Rusty Dagger. You accept.").
    4. If the merchant refuses to buy (e.g., "I have no use for that."): Narrate the refusal.
  - **Important:** All changes to currency, player inventory, and merchant inventory MUST be reflected in \`updatedStoryState\`. Ensure item IDs remain unique when moving/copying items. Newly generated items should have a \`basePrice\`.

**Environmental Interaction & Item Use:**
- If the player's input suggests interacting with specific objects in the environment (e.g., 'search the desk', 'examine the painting', 'open the chest', 'read the book', 'climb the tree', 'hide behind the rock'), narrate the outcome of this action in the 'nextScene'.
- If an item is found as a result of such interaction, add it to \`updatedStoryState.inventory\` (ensure it has a unique ID and a \`basePrice\`).
- If a new piece of information is discovered, add it to \`updatedStoryState.worldFacts\`.
- If the interaction directly progresses or completes a quest objective, update the relevant quest in \`updatedStoryState.quests\`.
- **Using Consumable Items:** If the player uses an item from \`inventory\` with \`isConsumable: true\`: Narrate consumption, remove one instance from \`inventory\`, apply effects to \`character\` or \`worldFacts\`.
- **Using Key/Quest Items:** If player uses an \`isQuestItem\` appropriately: Narrate outcome, update quest objectives/worldFacts.

**Quests & World State:**
- Describe quest developments. When a quest is completed, narrate rewards (XP, currency, items) being received.
- **Branching/Updating Quest Objectives:** Modify or add objectives based on player actions.
- **World Reactivity:** Changes to \`worldFacts\` should have noticeable consequences.

**Character Progression:**
- **Learning New Skills (General):** Award new skills for quests/milestones. Add to \`character.skillsAndAbilities\`.
- **Stat Increases (Rare, General):** Rare permanent stat increases. Update \`character\` stats.
- **Leveling Up:**
    - When \`character.experiencePoints\` meets or exceeds \`character.experienceToNextLevel\`, a level up occurs.
    - In \`updatedStoryState.character\`, you MUST:
        1. Increment \`level\` by 1.
        2. Update \`experiencePoints\` by subtracting the \`experienceToNextLevel\` value of the *previous* level.
        3. Calculate and set a new, higher \`experienceToNextLevel\`.
    - As a reward for leveling up, you MUST also grant ONE of the following:
        A. A small, permanent increase (typically +1) to one of the character's core stats.
        OR
        B. Award the character one new skill (add a new skill object to \`character.skillsAndAbilities\`).
    - Clearly narrate the level up event, the stat increase (if any), or the new skill learned (if any) in the \`nextScene\` text.

**Lore Discovery & Generation:**
- If the 'nextScene' reveals significant new information, propose new entries for the \`newLoreEntries\` array (keyword, content, optional category).

Crucially, you must also update the story state. This includes:
- Character: Update all character fields (health, mana, XP, level, currency, skills, stats).
- Inventory: Add/remove items. All items must have a unique \`id\` and \`basePrice\`.
- Equipped Items: Handle equipping/unequipping. All items must have a \`basePrice\`.
- Quests: Update status, objectives. Rewards can include currency.
- Tracked NPCs: Update profiles, including merchant details (\`isMerchant\`, \`merchantInventory\` with item \`price\` and \`basePrice\`, \`buysItemTypes\`, \`sellsItemTypes\`).
- World Facts: Add, modify, or remove facts.

The next scene should logically follow. Ensure adherence to JSON schema.
The \`updatedStorySummary\` field MUST be provided.
`,
});

const generateNextSceneFlow = ai.defineFlow(
  {
    name: 'generateNextSceneFlow',
    inputSchema: GenerateNextSceneInputSchemaInternal,
    outputSchema: GenerateNextSceneOutputSchemaInternal,
  },
  async (input: GenerateNextSceneInput): Promise<GenerateNextSceneOutput> => {
    const formattedEquippedItemsString = formatEquippedItems(input.storyState.equippedItems);
    const formattedQuestsString = formatQuests(input.storyState.quests);
    const formattedTrackedNPCsString = formatTrackedNPCs(input.storyState.trackedNPCs);
    const formattedSkillsString = formatSkills(input.storyState.character.skillsAndAbilities);


    const promptPayload: z.infer<typeof PromptInternalInputSchema> = {
      ...input,
      formattedEquippedItemsString: formattedEquippedItemsString,
      formattedQuestsString: formattedQuestsString,
      formattedTrackedNPCsString: formattedTrackedNPCsString,
      formattedSkillsString: formattedSkillsString,
    };

    const {output} = await prompt(promptPayload);
    if (!output) throw new Error("Failed to generate next scene output.");

    // Post-process new lore entries
    if (output.newLoreEntries && Array.isArray(output.newLoreEntries)) {
      for (const lore of output.newLoreEntries) {
        if (lore.keyword && lore.content) {
          try {
            saveNewLoreEntry({
              keyword: lore.keyword,
              content: lore.content,
              category: lore.category,
              source: 'AI-Discovered',
            });
          } catch (e) {
            console.error("Error saving AI discovered lore:", e);
          }
        }
      }
    }

    // Character post-processing, including Level Up mechanics and currency
    if (output.updatedStoryState.character && input.storyState.character) {
      const updatedChar = output.updatedStoryState.character;
      const originalChar = input.storyState.character;

      updatedChar.mana = updatedChar.mana ?? originalChar.mana ?? 0;
      updatedChar.maxMana = updatedChar.maxMana ?? originalChar.maxMana ?? 0;
      updatedChar.strength = updatedChar.strength ?? originalChar.strength ?? 10;
      updatedChar.dexterity = updatedChar.dexterity ?? originalChar.dexterity ?? 10;
      updatedChar.constitution = updatedChar.constitution ?? originalChar.constitution ?? 10;
      updatedChar.intelligence = updatedChar.intelligence ?? originalChar.intelligence ?? 10;
      updatedChar.wisdom = updatedChar.wisdom ?? originalChar.wisdom ?? 10;
      updatedChar.charisma = updatedChar.charisma ?? originalChar.charisma ?? 10;
      updatedChar.currency = updatedChar.currency ?? originalChar.currency ?? 0;
      if (updatedChar.currency < 0) updatedChar.currency = 0;
      
      let originalXpToNextLevel = originalChar.experienceToNextLevel;
      if (originalXpToNextLevel <=0) originalXpToNextLevel = 100; 

      updatedChar.level = updatedChar.level ?? originalChar.level ?? 1;
      updatedChar.experiencePoints = updatedChar.experiencePoints ?? originalChar.experiencePoints ?? 0;
      updatedChar.experienceToNextLevel = updatedChar.experienceToNextLevel ?? originalChar.experienceToNextLevel ?? 100;

      const didLevelUp = updatedChar.level > originalChar.level || 
                         (originalChar.experiencePoints >= originalXpToNextLevel && updatedChar.level === originalChar.level +1);

      if (didLevelUp && updatedChar.level === originalChar.level + 1) { 
        if(updatedChar.experiencePoints >= originalXpToNextLevel && originalChar.experiencePoints >= originalXpToNextLevel) {
            updatedChar.experiencePoints = originalChar.experiencePoints - originalXpToNextLevel;
        } else if (updatedChar.experiencePoints < originalXpToNextLevel && originalChar.experiencePoints >= originalXpToNextLevel ) {
            // AI might have already subtracted XP, keep its value if it's positive and less than new threshold
            // This path implies AI handled XP subtraction.
        } else {
             updatedChar.experiencePoints = originalChar.experiencePoints; // Fallback if AI's XP doesn't make sense
        }

        const expectedNewXpToNextLevel = Math.floor(originalXpToNextLevel * 1.5);
        if (updatedChar.experienceToNextLevel <= updatedChar.experiencePoints || updatedChar.experienceToNextLevel < originalXpToNextLevel) {
           updatedChar.experienceToNextLevel = expectedNewXpToNextLevel > updatedChar.experiencePoints 
                                              ? expectedNewXpToNextLevel 
                                              : updatedChar.experiencePoints + Math.max(50, Math.floor(originalXpToNextLevel * 0.5));
        }
      } else {
         if (updatedChar.experienceToNextLevel <= 0 || updatedChar.experienceToNextLevel < updatedChar.experiencePoints) {
            updatedChar.experienceToNextLevel = originalXpToNextLevel > updatedChar.experiencePoints ? originalXpToNextLevel : updatedChar.experiencePoints + 50;
         }
      }
      
      updatedChar.skillsAndAbilities = updatedChar.skillsAndAbilities ?? originalChar.skillsAndAbilities ?? [];
      const skillIdSet = new Set<string>();
      updatedChar.skillsAndAbilities.forEach((skill, index) => {
        if (!skill.id || skill.id.trim() === "" || skillIdSet.has(skill.id)) { 
            let baseId = `skill_generated_next_${skill.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}_${Date.now()}_${index}`;
            let newId = baseId;
            let counter = 0;
            while(skillIdSet.has(newId)){
                newId = `${baseId}_u${counter++}`;
            }
            skill.id = newId;
        }
        skillIdSet.add(skill.id);
        skill.name = skill.name || "Unnamed Skill";
        skill.description = skill.description || "No description provided.";
        skill.type = skill.type || "Generic";
      });
    }

     if (output.updatedStoryState) {
        output.updatedStoryState.inventory = output.updatedStoryState.inventory ?? [];
        const invItemIds = new Set<string>();
        output.updatedStoryState.inventory.forEach((item, index) => {
          if (!item.id || item.id.trim() === "" || invItemIds.has(item.id)) {
            let baseId = `item_generated_inv_next_${Date.now()}_${Math.random().toString(36).substring(7)}_${index}`;
            let newId = baseId;
            let counter = 0;
            while(invItemIds.has(newId)){ newId = `${baseId}_u${counter++}`; }
            item.id = newId;
          }
          invItemIds.add(item.id);

          if (item.equipSlot === null || (item.equipSlot as unknown) === '') {
            delete (item as Partial<ItemType>).equipSlot;
          }
          if (item.isConsumable === undefined) delete item.isConsumable;
          if (item.effectDescription === undefined || item.effectDescription === '') delete item.effectDescription;
          if (item.isQuestItem === undefined) delete item.isQuestItem;
          if (item.relevantQuestId === undefined || item.relevantQuestId === '') delete item.relevantQuestId;
          item.basePrice = item.basePrice ?? 0;
          if (item.basePrice < 0) item.basePrice = 0;
        });

        output.updatedStoryState.quests = output.updatedStoryState.quests ?? [];
        const questIds = new Set<string>();
        output.updatedStoryState.quests.forEach((quest, index) => {
          if (!quest.id || quest.id.trim() === "" || questIds.has(quest.id)) {
            let baseId = `quest_generated_next_${Date.now()}_${index}`;
            let newId = baseId;
            let counter = 0;
            while(questIds.has(newId)){ newId = `${baseId}_u${counter++}`; }
            quest.id = newId;
          }
          questIds.add(quest.id);

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

          const previousQuestState = input.storyState.quests.find(pq => pq.id === quest.id);
          if (quest.status === 'completed' && previousQuestState?.status === 'active' && quest.rewards && output.updatedStoryState.character) {
            if (typeof quest.rewards.experiencePoints === 'number') {
              output.updatedStoryState.character.experiencePoints += quest.rewards.experiencePoints;
            }
             if (typeof quest.rewards.currency === 'number' && output.updatedStoryState.character.currency !== undefined) {
              output.updatedStoryState.character.currency += quest.rewards.currency;
              if (output.updatedStoryState.character.currency < 0) output.updatedStoryState.character.currency = 0;
            }
            if (quest.rewards.items && Array.isArray(quest.rewards.items)) {
              quest.rewards.items.forEach(rewardItem => {
                const cleanedRewardItem = { ...rewardItem };
                const rewardItemIds = new Set<string>();
                 if (!cleanedRewardItem.id || cleanedRewardItem.id.trim() === "" || rewardItemIds.has(cleanedRewardItem.id) || invItemIds.has(cleanedRewardItem.id)) {
                    let baseId = `item_reward_next_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                    let newId = baseId;
                    let counter = 0;
                    while(rewardItemIds.has(newId) || invItemIds.has(newId)){ newId = `${baseId}_u${counter++}`; }
                    cleanedRewardItem.id = newId;
                }
                rewardItemIds.add(cleanedRewardItem.id);
                invItemIds.add(cleanedRewardItem.id); 

                if (cleanedRewardItem.equipSlot === null || (cleanedRewardItem.equipSlot as unknown) === '') {
                  delete (cleanedRewardItem as Partial<ItemType>).equipSlot;
                }
                if (cleanedRewardItem.isConsumable === undefined) delete cleanedRewardItem.isConsumable;
                if (cleanedRewardItem.effectDescription === undefined || cleanedRewardItem.effectDescription === '') delete cleanedRewardItem.effectDescription;
                if (cleanedRewardItem.isQuestItem === undefined) delete cleanedRewardItem.isQuestItem;
                if (cleanedRewardItem.relevantQuestId === undefined || cleanedRewardItem.relevantQuestId === '') delete cleanedRewardItem.relevantQuestId;
                cleanedRewardItem.basePrice = cleanedRewardItem.basePrice ?? 0;
                 if (cleanedRewardItem.basePrice < 0) cleanedRewardItem.basePrice = 0;

                output.updatedStoryState.inventory.push(cleanedRewardItem);
              });
            }
          }

          if (quest.rewards) {
            quest.rewards.items = quest.rewards.items ?? [];
            const rewardDefItemIds = new Set<string>();
             quest.rewards.items.forEach((rewardItem, rIndex) => {
                if (!rewardItem.id || rewardItem.id.trim() === "" || rewardDefItemIds.has(rewardItem.id)) {
                    let baseId = `item_reward_next_def_${Date.now()}_${Math.random().toString(36).substring(7)}_${rIndex}`;
                    let newId = baseId;
                    let counter = 0;
                    while(rewardDefItemIds.has(newId)){ newId = `${baseId}_u${counter++}`; }
                    rewardItem.id = newId;
                }
                rewardDefItemIds.add(rewardItem.id);

                if (rewardItem.equipSlot === null || (rewardItem.equipSlot as unknown) === '') {
                    delete (rewardItem as Partial<ItemType>).equipSlot;
                }
                if (rewardItem.isConsumable === undefined) delete rewardItem.isConsumable;
                if (rewardItem.effectDescription === undefined || rewardItem.effectDescription === '') delete rewardItem.effectDescription;
                if (rewardItem.isQuestItem === undefined) delete rewardItem.isQuestItem;
                if (rewardItem.relevantQuestId === undefined || rewardItem.relevantQuestId === '') delete rewardItem.relevantQuestId;
                rewardItem.basePrice = rewardItem.basePrice ?? 0;
                if (rewardItem.basePrice < 0) rewardItem.basePrice = 0;
            });
            quest.rewards.currency = quest.rewards.currency ?? undefined;
            if (quest.rewards.currency !== undefined && quest.rewards.currency < 0) quest.rewards.currency = 0;

            if (quest.rewards.experiencePoints === undefined && quest.rewards.items.length === 0 && quest.rewards.currency === undefined) {
              delete quest.rewards;
            } else {
                if (quest.rewards.experiencePoints === undefined) delete quest.rewards.experiencePoints;
                if (quest.rewards.items.length === 0) delete quest.rewards.items;
                if (quest.rewards.currency === undefined) delete quest.rewards.currency;
            }
          }
        });

        output.updatedStoryState.worldFacts = output.updatedStoryState.worldFacts ?? [];
        output.updatedStoryState.worldFacts = output.updatedStoryState.worldFacts.filter(fact => typeof fact === 'string' && fact.trim() !== '');


        const defaultEquippedItems: Partial<Record<EquipmentSlot, ItemType | null>> = {
            weapon: null, shield: null, head: null, body: null, legs: null, feet: null, hands: null, neck: null, ring1: null, ring2: null
        };

        const aiEquipped = output.updatedStoryState.equippedItems || {};
        const newEquippedItems: Partial<Record<EquipmentSlot, ItemType | null>> = {};
        const equippedItemIds = new Set<string>();
        for (const slotKey of Object.keys(defaultEquippedItems) as EquipmentSlot[]) {
            newEquippedItems[slotKey] = aiEquipped[slotKey] !== undefined ? aiEquipped[slotKey] : null;
            if (newEquippedItems[slotKey]) {
                const item = newEquippedItems[slotKey]!;
                if (!item.id || item.id.trim() === "" || equippedItemIds.has(item.id) || invItemIds.has(item.id)) {
                     let baseId = `item_equipped_next_${Date.now()}_${Math.random().toString(36).substring(7)}_${slotKey}`;
                     let newId = baseId;
                     let counter = 0;
                     while(equippedItemIds.has(newId) || invItemIds.has(newId)){ newId = `${baseId}_u${counter++}`; }
                     item.id = newId;
                }
                equippedItemIds.add(item.id);

                if (item.equipSlot === null || (item.equipSlot as unknown) === '') {
                  delete (item as Partial<ItemType>)!.equipSlot;
                }
                delete (item as Partial<ItemType>)!.isConsumable;
                delete (item as Partial<ItemType>)!.effectDescription;
                delete (item as Partial<ItemType>)!.isQuestItem;
                delete (item as Partial<ItemType>)!.relevantQuestId;
                item.basePrice = item.basePrice ?? 0;
                if (item.basePrice < 0) item.basePrice = 0;
            }
        }
        output.updatedStoryState.equippedItems = newEquippedItems as any;

        output.updatedStoryState.trackedNPCs = output.updatedStoryState.trackedNPCs ?? [];
        const npcIdMap = new Map<string, NPCProfileType>();
        const existingNpcIdsFromInput = new Set(input.storyState.trackedNPCs.map(npc => npc.id));

        output.updatedStoryState.trackedNPCs.forEach((npc) => {
            let currentNpcId = npc.id;
            if (!currentNpcId || currentNpcId.trim() === "" || (!existingNpcIdsFromInput.has(currentNpcId) && npcIdMap.has(currentNpcId))) {
                 let baseId = `npc_${npc.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}_${Date.now()}`;
                 let newId = baseId;
                 let counter = 0;
                 while(npcIdMap.has(newId) || existingNpcIdsFromInput.has(newId)) { 
                     newId = `${baseId}_u${counter++}`;
                 }
                 currentNpcId = newId;
            }
            npc.id = currentNpcId; 
            
            if (npcIdMap.has(npc.id)) { 
                console.warn(`Duplicate NPC ID ${npc.id} encountered in AI output for current turn. Skipping duplicate to avoid overwriting.`);
                return; 
            }
            npcIdMap.set(npc.id, npc);


            npc.name = npc.name || "Unnamed NPC";
            npc.description = npc.description || "No description provided.";
            
            const originalNpcProfile = input.storyState.trackedNPCs.find(onpc => onpc.id === npc.id);
            if (typeof npc.relationshipStatus !== 'number') {
                npc.relationshipStatus = originalNpcProfile?.relationshipStatus ?? 0;
            } else {
                npc.relationshipStatus = Math.max(-100, Math.min(100, npc.relationshipStatus));
            }

            npc.knownFacts = npc.knownFacts ?? [];
            npc.dialogueHistory = npc.dialogueHistory ?? [];
            npc.dialogueHistory.forEach(dh => {
                if(!dh.turnId) dh.turnId = input.currentTurnId; 
            });

            const originalNpc = input.storyState.trackedNPCs.find(onpc => onpc.id === npc.id);
            if (!originalNpc) { 
                npc.firstEncounteredLocation = npc.firstEncounteredLocation || input.storyState.currentLocation;
                npc.firstEncounteredTurnId = npc.firstEncounteredTurnId || input.currentTurnId;
            } else { 
                 npc.firstEncounteredLocation = originalNpc.firstEncounteredLocation;
                 npc.firstEncounteredTurnId = originalNpc.firstEncounteredTurnId;
                 npc.seriesContextNotes = npc.seriesContextNotes ?? originalNpc.seriesContextNotes; 
            }
            
            npc.lastKnownLocation = npc.lastKnownLocation || npc.firstEncounteredLocation || input.storyState.currentLocation; 
            npc.lastSeenTurnId = input.currentTurnId; 
            npc.updatedAt = new Date().toISOString(); 

            if (npc.classOrRole === null || (npc.classOrRole as unknown) === '') delete npc.classOrRole;
            if (npc.firstEncounteredLocation === null || (npc.firstEncounteredLocation as unknown) === '') delete npc.firstEncounteredLocation;
            if (npc.lastKnownLocation === null || (npc.lastKnownLocation as unknown) === '') delete npc.lastKnownLocation;
            if (npc.seriesContextNotes === null || (npc.seriesContextNotes as unknown) === '') delete npc.seriesContextNotes;
            if (npc.shortTermGoal === null || (npc.shortTermGoal as unknown) === '') delete npc.shortTermGoal;

            // Merchant specific post-processing
            npc.isMerchant = npc.isMerchant ?? originalNpc?.isMerchant ?? false;
            npc.merchantInventory = npc.merchantInventory ?? originalNpc?.merchantInventory ?? [];
            const merchantItemIds = new Set<string>();
            npc.merchantInventory.forEach((item, mIndex) => {
                if (!item.id || item.id.trim() === "" || merchantItemIds.has(item.id) || invItemIds.has(item.id) || equippedItemIds.has(item.id) ) {
                    let baseId = `item_merchant_next_${Date.now()}_${Math.random().toString(36).substring(7)}_${mIndex}`;
                    let newId = baseId;
                    let counter = 0;
                    while(merchantItemIds.has(newId) || invItemIds.has(newId) || equippedItemIds.has(newId)){ newId = `${baseId}_u${counter++}`; }
                    item.id = newId;
                }
                merchantItemIds.add(item.id);
                item.basePrice = item.basePrice ?? 0;
                 if (item.basePrice < 0) item.basePrice = 0;
                (item as any).price = (item as any).price ?? item.basePrice; // Ensure merchant items have a sale price
                if ((item as any).price < 0) (item as any).price = 0;

                if (item.equipSlot === null || (item.equipSlot as unknown) === '') delete (item as Partial<ItemType>).equipSlot;

            });
             npc.buysItemTypes = npc.buysItemTypes ?? originalNpc?.buysItemTypes ?? undefined;
             npc.sellsItemTypes = npc.sellsItemTypes ?? originalNpc?.sellsItemTypes ?? undefined;

        });
         output.updatedStoryState.trackedNPCs = Array.from(npcIdMap.values());
         output.updatedStoryState.storySummary = output.updatedStorySummary || input.storyState.storySummary || "";
    }

    if (output && output.activeNPCsInScene) {
      output.activeNPCsInScene = output.activeNPCsInScene.filter(npc => npc.name && npc.name.trim() !== '');
      output.activeNPCsInScene.forEach(npc => {
        if (npc.description === null || npc.description === '') delete npc.description;
        if (npc.keyDialogueOrAction === null || npc.keyDialogueOrAction === '') delete npc.keyDialogueOrAction;
      });
      if (output.activeNPCsInScene.length === 0) {
        delete output.activeNPCsInScene;
      }
    }
    
    output.newLoreEntries = output.newLoreEntries && Array.isArray(output.newLoreEntries) ? output.newLoreEntries : undefined;
    if (output.newLoreEntries) {
        output.newLoreEntries = output.newLoreEntries.filter(lore => lore.keyword && lore.keyword.trim() !== "" && lore.content && lore.content.trim() !== "");
        output.newLoreEntries.forEach(lore => {
            if (lore.category === null || (lore.category as unknown) === '') {
                delete lore.category;
            }
        });
        if (output.newLoreEntries.length === 0) {
            delete output.newLoreEntries;
        }
    }


    return output!;
  }
);


    
