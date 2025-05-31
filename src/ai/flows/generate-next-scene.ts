
'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating the next scene in a story based on user input and structured story state, including core character stats, mana, level, XP, inventory, equipped items, quests (with objectives, categories, and rewards), world facts, tracked NPCs, skills/abilities, and series-specific context. It also allows the AI to propose new lore entries, updates a running story summary, and handles character leveling.
 *
 * - generateNextScene - A function that takes the current story state and user input, and returns the next scene, updated state, potentially new lore, an updated story summary, and handles character progression.
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
  items: z.array(ItemSchemaInternal).optional().describe("An array of item objects awarded. Each item must have a unique ID, name, description, and optional 'equipSlot' (omit if not inherently equippable gear). Also define `isConsumable`, `effectDescription`, etc., if applicable for reward items.")
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
});

const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal.describe('The profile of the main character, including core stats, level, XP, and skills/abilities.'),
  currentLocation: z.string().describe('The current location of the character in the story.'),
  inventory: z.array(ItemSchemaInternal).describe('A list of UNequipped items in the character\'s inventory. Each item is an object with id, name, description. If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), include its equipSlot; otherwise, the equipSlot field MUST BE OMITTED ENTIRELY. Also include `isConsumable`, `effectDescription`, `isQuestItem`, `relevantQuestId` if applicable.'),
  equippedItems: EquipmentSlotsSchemaInternal,
  quests: z.array(QuestSchemaInternal).describe("A list of all quests. Each quest is an object with 'id', 'description', 'status', its 'rewards' (defined at quest creation specifying what the player will get on completion), optionally 'category', and a list of 'objectives' (each with 'description' and 'isCompleted')."),
  worldFacts: z.array(z.string()).describe('Key facts or observations about the game world state. These facts should reflect the character\'s current understanding and immediate environment, including the presence of significant NPCs. Add new facts as they are discovered, modify existing ones if they change, or remove them if they become outdated or irrelevant. Narrate significant changes to world facts if the character would perceive them.'),
  trackedNPCs: z.array(NPCProfileSchemaInternal).describe("A list of detailed profiles for significant NPCs encountered. Update existing profiles or add new ones as NPCs are introduced or interacted with."),
  storySummary: z.string().optional().describe("A brief, running summary of key story events and character developments so far. This summary will be updated each turn."),
});

export type StructuredStoryState = z.infer<typeof StructuredStoryStateSchemaInternal>;

const GenerateNextSceneInputSchemaInternal = z.object({
  currentScene: z.string().describe('The current scene text.'),
  userInput: z.string().describe('The user input (action or dialogue).'),
  storyState: StructuredStoryStateSchemaInternal.describe('The current structured state of the story (character, location, inventory, equipped items, XP, quests, worldFacts, trackedNPCs, skills/abilities, storySummary etc.).'),
  seriesName: z.string().describe('The name of the series this story is based on, for contextual awareness.'),
  seriesStyleGuide: z.string().optional().describe('A brief style guide for the series to maintain tone and themes.'),
  currentTurnId: z.string().describe('The ID of the current story turn, for logging in NPC dialogue history etc.'),
});
export type GenerateNextSceneInput = z.infer<typeof GenerateNextSceneInputSchemaInternal>;

const PromptInternalInputSchema = GenerateNextSceneInputSchemaInternal.extend({
  formattedEquippedItemsString: z.string().describe("Pre-formatted string of equipped items."),
  formattedQuestsString: z.string().describe("Pre-formatted string of quests with their statuses, categories, objectives, and potential rewards."),
  formattedTrackedNPCsString: z.string().describe("Pre-formatted string summarizing tracked NPCs, including their short-term goals if any."),
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
  updatedStoryState: StructuredStoryStateSchemaInternal.describe('The updated structured story state after the scene. This includes any character stat changes, XP, level changes (including potential stat/skill grant from level up), inventory changes, equipment changes, quest updates (status, objective completion, potential branching), world fact updates, NPC profile updates/additions in trackedNPCs (including potential short-term goal changes), new skills, or stat increases. Rewards for completed quests are applied automatically based on pre-defined rewards in the quest object. New skills/abilities might be added to character.skillsAndAbilities.'),
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
    output += `- ${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${item ? item.name : 'Empty'}\n`;
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
        if (q.rewards.items && q.rewards.items.length > 0) {
            q.rewards.items.forEach(item => {
            questStr += `    - Item: ${item.name}\n`;
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
        if (npc.lastKnownLocation) npcStr += ` (Last seen: ${npc.lastKnownLocation})`;
        if (npc.shortTermGoal) npcStr += `\n  Current Goal: ${npc.shortTermGoal}`;
        npcStr += `\n  Description: ${npc.description}`;
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
- {{this.name}} (ID: {{this.id}}): {{this.description}} {{#if this.equipSlot}}(Equippable Gear: {{this.equipSlot}}){{/if}}{{#if this.isConsumable}} (Consumable: {{this.effectDescription}}){{/if}}{{#if this.isQuestItem}} (Quest Item{{#if this.relevantQuestId}} for {{this.relevantQuestId}}){{/if}}){{/if}}
{{/each}}
{{else}}
Empty
{{/if}}

Quests (Rewards are pre-defined; they are granted by the system upon completion):
{{{formattedQuestsString}}}

Known World Facts (Reflect immediate environment & character's current understanding, including presence/status of key NPCs):
{{#each storyState.worldFacts}}
- {{{this}}}
{{else}}
- None known.
{{/each}}

Tracked NPCs (Summary - full details in storyState.trackedNPCs, including their shortTermGoal if any):
{{{formattedTrackedNPCsString}}}


Available Equipment Slots: weapon, shield, head, body, legs, feet, hands, neck, ring1, ring2. An item's 'equipSlot' property determines where it can go. 'ring' items can go in 'ring1' or 'ring2'.

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
  - Assign a unique 'id' (e.g., "npc_[name in lowercase with underscores]_[timestamp/random suffix]").
  - Set 'name', 'description', 'classOrRole' (if applicable).
  - Set 'firstEncounteredLocation' to 'storyState.currentLocation' and 'firstEncounteredTurnId' to '{{currentTurnId}}'.
  - Set initial 'relationshipStatus' (numerical score, e.g., 0 for Neutral, or a specific starting value like -10 if they are initially wary).
  - 'knownFacts' can start empty or with 1-2 initial series-based facts.
  - 'seriesContextNotes' can be a brief note on their canon role if applicable.
  - Optionally set a 'shortTermGoal' if their initial appearance or dialogue implies one.
  - Set 'lastKnownLocation' to 'storyState.currentLocation' and 'lastSeenTurnId' to '{{currentTurnId}}'.
  - Set 'updatedAt' to the current time (system will handle actual timestamp).
- If interacting with an existing NPC from 'storyState.trackedNPCs' (match by name):
  - Update their profile in 'updatedStoryState.trackedNPCs' with their existing ID.
  - If new details about their appearance or demeanor are revealed, update 'description'.
  - **Relationship Dynamics:** NPC \\\`relationshipStatus\\\` is a numerical score (e.g., -100 Hostile, 0 Neutral, 100 Allied). Based on the player's interactions, you should propose an update to this numerical score in \`updatedStoryState.trackedNPCs\`. For example, completing a quest for an NPC might increase it by +20 or +30. Betraying them might decrease it by -40. Narrate significant shifts in perceived relationship if the score crosses a major threshold (e.g., from Neutral to Friendly).
  - **NPC Memory & Consistency:** NPCs should demonstrate memory. Refer to their \`knownFacts\` about the player/world and their \`dialogueHistory\` (if available and relevant) to inform their current dialogue and reactions. An NPC who was previously helped should be more welcoming. NPCs should not contradict previously established information about themselves or the world, as recorded in their \`knownFacts\` or past \`dialogueHistory\`.
  - **NPC Proactivity & Goals:** Consider each NPC's 'shortTermGoal' from their profile. If the current scene provides an opportunity, an NPC might take a minor action or make a comment that aligns with their goal. Their goals can also influence their reactions to player actions or ongoing events. If events in the \`nextScene\` logically suggest a new 'shortTermGoal' for an NPC, or an update to an existing one, reflect this in their profile within \`updatedStoryState.trackedNPCs\`. If a significant \`worldFact\` changes that an NPC (especially one present or nearby) would be aware of, their behavior, dialogue, or even their 'shortTermGoal' in the \`updatedStoryState.trackedNPCs\` should reflect this awareness, even if the player hasn't directly informed them.
  - If the player learns new, distinct information directly about the NPC, add it to 'knownFacts' (avoid duplicates).
  - If there's key dialogue, consider adding an entry to 'dialogueHistory': { playerInput: "{{userInput}}", npcResponse: "Relevant NPC quote", turnId: "{{currentTurnId}}" }.
  - If their location changes, update 'lastKnownLocation'.
  - Always update 'lastSeenTurnId' to '{{currentTurnId}}' and 'updatedAt'.
- Do not create duplicate NPC profiles. If an NPC with the same name exists, update their record.
- For the 'nextScene' narrative:
  - Clearly attribute dialogue (e.g., Guard Captain: "Halt!") and actions.
  - Make NPCs react to the player's actions and dialogue in character. Narrate when significant NPCs enter or leave.
  - Consider giving NPCs distinct mannerisms or ways of speaking, fitting the "{{seriesName}}" context.
- If distinct NPCs were active in the scene you generate, populate 'activeNPCsInScene' array in the output.

**Environmental Interaction & Item Use:**
- If the player's input suggests interacting with specific objects in the environment (e.g., 'search the desk', 'examine the painting', 'open the chest', 'read the book', 'climb the tree', 'hide behind the rock'), narrate the outcome of this action in the 'nextScene'.
- If an item is found as a result of such interaction, add it to \`updatedStoryState.inventory\`.
- If a new piece of information is discovered, add it to \`updatedStoryState.worldFacts\`.
- If the interaction directly progresses or completes a quest objective, update the relevant quest in \`updatedStoryState.quests\`.
- **Using Consumable Items:** If the player's input indicates they are using an item from their \`inventory\` and that item has \`isConsumable: true\`:
  - Narrate the item being consumed.
  - Remove one instance of the item from the \`updatedStoryState.inventory\`.
  - Apply its effects based on its \`effectDescription\`. This might involve updating \`character.health\`, \`character.mana\`, adding a temporary \`worldFact\` (e.g., "Character is invisible for a short while"), or other described outcomes. **Ensure these state changes are reflected in \`updatedStoryState\`**.
- **Using Key/Quest Items:** If the player uses an item from \`inventory\` that has \`isQuestItem: true\` (and potentially a \`relevantQuestId\`):
  - Evaluate if the context of usage is appropriate for the item's purpose (e.g., using a specific key on the correct door mentioned in a quest).
  - If the usage is correct and relevant to a quest: Narrate the outcome, update the relevant quest \`objectives\` (e.g., mark as completed), and/or add/modify \`worldFacts\`.
  - If the usage is incorrect or out of context, narrate that nothing happens or describe a minor consequence.

**Quests & World State:**
- Describe any quest-related developments (new quests, progress, completion) clearly in the 'nextScene' text.
- When a quest is completed, the system will automatically handle granting the pre-defined rewards. You should narrate that the quest is complete and the rewards are received.
- **Branching Quest Objectives:** When a player completes an objective or takes a significant action related to a quest:
  - You may modify the \`description\` of subsequent objectives in that quest to reflect the new situation.
  - You may add new, logical objectives to the quest if the player's actions open up a new path or complication. If a player's actions create a new logical path or sub-goal for an existing quest, you can add a new objective to that quest's \`objectives\` array.
  - If a player's actions make a current objective impossible or failed, update its status or description and potentially offer an alternative objective or path for the quest.
- **World Reactivity:** Changes to \`worldFacts\` should have noticeable consequences. If a significant \`worldFact\` is added or changed (e.g., 'The ancient artifact is recovered,' 'The bandit leader is defeated'), describe how this impacts the \`currentLocation\`, NPC behaviors, or available dialogue and actions. The world should feel responsive. Describe tangible consequences or changes in the environment or NPC behavior due to significant \`worldFacts\` updates.

**Character Progression:**
- **Learning New Skills (General):** As a reward for completing significant quests, achieving major story milestones, or through specific interactions (e.g., finding a rare tome, being taught by a master NPC), you can award the character a new skill. Add this new skill object (with a unique \`id\`, \`name\`, \`description\`, and series-appropriate \`type\`) to \`updatedStoryState.character.skillsAndAbilities\`. Narrate how the character learned or acquired this new skill.
- **Stat Increases (Rare, General):** For exceptionally impactful achievements or the use of powerful, unique artifacts, you may grant a small, permanent increase (e.g., +1) to one of the character's core stats (Strength, Dexterity, etc.). This should be rare. Clearly state the stat and the increase in your narration and update it in \`updatedStoryState.character\`.
- **Leveling Up:**
    - When \`character.experiencePoints\` meets or exceeds \`character.experienceToNextLevel\`, a level up occurs.
    - In \`updatedStoryState.character\`, you MUST:
        1. Increment \`level\` by 1.
        2. Update \`experiencePoints\` by subtracting the \`experienceToNextLevel\` value of the *previous* level (e.g., \`newXP = currentXP - oldXpToNextLevel\`). This means excess XP carries over.
        3. Calculate and set a new, higher \`experienceToNextLevel\` (e.g., multiply the old \`experienceToNextLevel\` by 1.5 or a similar scaling factor, then round it. Ensure it's always greater than current \`experiencePoints\`).
    - As a reward for leveling up, you MUST also grant ONE of the following:
        A. A small, permanent increase (typically +1) to one of the character's core stats (Strength, Dexterity, Constitution, Intelligence, Wisdom, or Charisma).
        OR
        B. Award the character one new skill (add a new skill object to \`character.skillsAndAbilities\` with a unique ID, name, description, and type).
    - Clearly narrate the level up event, the stat increase (if any), or the new skill learned (if any) in the \`nextScene\` text.

**Lore Discovery & Generation:**
- If the 'nextScene' reveals significant new information about a character, location, item, concept, or event that is not already common knowledge (you can use \`lookupLoreTool\` for very common terms if unsure), and this information feels like it should be recorded for long-term reference, you can propose a new lore entry.
- Add these new entries to the \`newLoreEntries\` array in the output. Each entry needs a \`keyword\`, \`content\` (a concise description of the new information), and an optional \`category\` (e.g., 'Character Detail', 'Historical Event', 'Location Secret').
- Do not add trivial information. Focus on facts that deepen the understanding of the '{{seriesName}}' world as it unfolds in *this* story.
- The system will handle adding these to the main lorebook.

Crucially, you must also update the story state. This includes:
- Character: Update all character fields as necessary, **including effects from skills, items, and progression (especially level ups).**
  - **Important for 'mana' and 'maxMana'**: These fields MUST be numbers. If a character does not use mana or has no mana, set both 'mana' and 'maxMana' to 0. Do NOT use 'null' or omit these fields if the character profile is being updated; always provide a numeric value (e.g., 0). Similarly for other optional numeric stats.
  - **Skills & Abilities**: The character's \`skillsAndAbilities\` array should be updated if they learn a new skill or an existing one changes. New skills should have a unique \`id\`, \`name\`, \`description\`, and \`type\`.
- Location: Update if the character moved.
- Inventory:
  - If new items are found (excluding pre-defined quest rewards, which are handled by the system): Add them as objects to the \`inventory\` array. Each item object **must** have a unique \`id\`, a \`name\`, a \`description\`. **If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), include an 'equipSlot' (e.g. 'weapon', 'head'). If it's not an equippable type of item (e.g., a potion, a key, a generic diary/book), the 'equipSlot' field MUST BE OMITTED ENTIRELY.** Also include \`isConsumable\`, \`effectDescription\`, \`isQuestItem\`, \`relevantQuestId\` if applicable. Describe these new items clearly in the \`nextScene\` text.
  - If items are used, consumed, or lost: Remove them from \`inventory\` or \`equippedItems\` as appropriate.
- Equipped Items:
  - If the player tries to equip an item:
    1. Find the item in \`inventory\`.
    2. Check if it's equippable and has an \`equipSlot\`. If not, state it (e.g., "You cannot equip the diary."). Only items that are actual gear (weapons, armor, equippable accessories) should have an \`equipSlot\`. Items like books or potions are not equippable and should not have an \`equipSlot\` field.
    3. If the target slot is occupied, move the existing item from \`equippedItems[slot]\` to \`inventory\`.
    4. Move the new item from \`inventory\` to \`equippedItems[slot]\`.
    5. Narrate the action.
  - If the player tries to unequip an item:
    1. Find it in \`equippedItems\`.
    2. Move it to \`inventory\`.
    3. Set \`equippedItems[slot]\` to null.
    4. Narrate the action.
  - Ensure an item is either in \`inventory\` OR \`equippedItems\`, never both.
  - The 'updatedStoryState.equippedItems' object must include all 10 slots, with 'null' for empty ones.
- Quests:
  - The \`quests\` array in \`updatedStoryState\` should contain all current quests as objects. Each quest object must include \`id: string\`, \`description: string\`, and \`status: 'active' | 'completed'\`. It will also include its pre-defined \`rewards\` if any.
  - If a new quest is started: Add a new quest object to the \`quests\` array. It must have a unique \`id\`. Assign a suitable \`category\` (e.g., "Main Story", "Side Quest", "Personal Goal", "Exploration") fitting for "{{seriesName}}"; if no category is clear, omit the \`category\` field. If the quest is complex enough, you can break it down into an array of \`objectives\`, where each objective has a \`description\` and \`isCompleted: false\`.
    - **Pre-defined Quest Rewards**: When creating a new quest, you MUST also define a 'rewards' object for it. This object should specify the 'experiencePoints' (number, optional) and/or 'items' (array of Item objects, optional) that the player will receive upon completing this quest. For 'items' in rewards, each item needs a unique 'id', 'name', 'description', an optional 'equipSlot' (omitting 'equipSlot' if not inherently equippable gear), and other item properties like \`isConsumable\`, \`effectDescription\` if applicable. If a quest has no specific material rewards, you can omit the 'rewards' field or provide an empty object {} for it.
  - If an existing quest in \`quests\` is progressed:
    - If it has \`objectives\`, update the \`isCompleted\` status of relevant objectives to \`true\`.
    - You can update the main quest \`description\` if needed.
    - Narrate the progress in \`nextScene\`. The quest status remains \`'active'\` until fully completed (all essential objectives are done).
  - **VERY IMPORTANT for quest completion**: When updating objectives: if ALL objectives for a given quest are marked as \`isCompleted: true\`, you MUST then update the parent quest's \`status\` to \`'completed'\`.
  - If an existing quest from \`quests\` is completed: Find the quest object in the \`quests\` array. Update its \`status\` to \`'completed'\`. If it has \`objectives\`, ensure all relevant ones are marked \`isCompleted: true\`. Do NOT remove it from the array. Clearly state the completion in \`nextScene\`.
    - **Quest Rewards are Pre-defined**: The system will automatically apply the rewards (XP and items) associated with this quest from its existing \`rewards\` field. You do not need to redefine or specify rewards again here. Your narration should reflect that the quest is done and rewards are obtained.
  - Ensure quest IDs are unique.
  - If a quest's \`category\` is not applicable, omit the field. If objectives are not needed, omit the \`objectives\` array.
- World Facts:
  - You should actively manage the \`worldFacts\` array. These facts should reflect the character's current understanding and immediate environment within the "{{seriesName}}" context. Use world facts to track the presence and key status of significant NPCs in the scene.
  - **Adding Facts**: If the character makes a new, significant observation or learns a piece of information relevant to the immediate situation that isn't broad enough for the lorebook, add it as a string to \`worldFacts\`.
  - **Modifying Facts**: If an existing fact needs refinement based on new developments, you can suggest replacing the old fact with a new one (effectively removing the old and adding the new).
  - **Removing Facts**: If a fact becomes outdated or irrelevant due to story progression (e.g., a temporary condition is resolved, an immediate danger passes, an NPC leaves the scene), you can remove it from the \`worldFacts\` array.
  - **Narrate Changes**: If you add, modify, or remove a world fact in a way that the character would perceive or that's significant for the player to know, briefly mention this in the \`nextScene\` (e.g., "You now realize the guard captain is missing," or "The strange humming sound from the basement has stopped.").
- Tracked NPCs:
  - Ensure 'updatedStoryState.trackedNPCs' contains all previously tracked NPCs, plus any new ones, with their profiles updated as described above (including 'relationshipStatus' and potentially 'shortTermGoal').
  - All fields in each NPCProfile must adhere to their schema definitions. 'id' must be unique for new NPCs.
  - For existing NPCs, ensure their 'id' is preserved from the input 'storyState.trackedNPCs'.
  - **Ensure \\\`relationshipStatus\\\` is a number reflecting the cumulative interactions.**

The next scene should logically follow the player's input and advance the narrative, respecting the style and lore of {{seriesName}}.
Ensure your entire response strictly adheres to the JSON schema for the output.
The 'updatedStoryState.character' must include all fields required by its schema, including 'skillsAndAbilities'.
The 'updatedStoryState.inventory' must be an array of item objects. For items, if 'equipSlot' is not applicable (because the item is not inherently equippable gear), it must be omitted.
The 'updatedStoryState.equippedItems' must be an object mapping all 10 slot names to either an item object or null.
The 'updatedStoryState.quests' must be an array of quest objects, each with 'id', 'description', and 'status', and potentially 'rewards', 'category', and 'objectives'.
The 'updatedStoryState.trackedNPCs' array must contain full NPCProfile objects, with 'relationshipStatus' as a number and an optional 'shortTermGoal'.
The 'activeNPCsInScene' array (if provided) should contain objects with 'name', and optional 'description' and 'keyDialogueOrAction'.
The \`newLoreEntries\` array should contain newly discovered lore for the lorebook.
The \`updatedStorySummary\` field MUST be provided and should be a concise summary of the key events of the generated scene, appended to or refining the previous summary.
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

    // Character post-processing, including Level Up mechanics
    if (output.updatedStoryState.character && input.storyState.character) {
      const updatedChar = output.updatedStoryState.character;
      const originalChar = input.storyState.character;

      // Default values for optional stats
      updatedChar.mana = updatedChar.mana ?? originalChar.mana ?? 0;
      updatedChar.maxMana = updatedChar.maxMana ?? originalChar.maxMana ?? 0;
      updatedChar.strength = updatedChar.strength ?? originalChar.strength ?? 10;
      updatedChar.dexterity = updatedChar.dexterity ?? originalChar.dexterity ?? 10;
      updatedChar.constitution = updatedChar.constitution ?? originalChar.constitution ?? 10;
      updatedChar.intelligence = updatedChar.intelligence ?? originalChar.intelligence ?? 10;
      updatedChar.wisdom = updatedChar.wisdom ?? originalChar.wisdom ?? 10;
      updatedChar.charisma = updatedChar.charisma ?? originalChar.charisma ?? 10;
      
      // Level up check and mechanics - AI is instructed to handle this, but we ensure mechanics are sound.
      let originalXpToNextLevel = originalChar.experienceToNextLevel;
      if (originalXpToNextLevel <=0) originalXpToNextLevel = 100; // Fallback if somehow invalid

      // The AI should set the new level, new XP, and new XPToNextLevel.
      // We will validate and adjust experienceToNextLevel if AI's calculation is problematic.
      updatedChar.level = updatedChar.level ?? originalChar.level ?? 1;
      updatedChar.experiencePoints = updatedChar.experiencePoints ?? originalChar.experiencePoints ?? 0;
      updatedChar.experienceToNextLevel = updatedChar.experienceToNextLevel ?? originalChar.experienceToNextLevel ?? 100;

      // If AI indicates a level up by increasing the level number, or if XP threshold was met
      const didLevelUp = updatedChar.level > originalChar.level || 
                         (originalChar.experiencePoints >= originalXpToNextLevel && updatedChar.level === originalChar.level +1);

      if (didLevelUp && updatedChar.level === originalChar.level + 1) { // Confirmed level up by one level
        // Ensure XP is correctly adjusted if AI didn't do it or did it differently
        if(updatedChar.experiencePoints >= originalXpToNextLevel) { // If AI gave XP that also crosses the threshold
            updatedChar.experiencePoints = originalChar.experiencePoints - originalXpToNextLevel;
        }
        // Ensure new XPToNextLevel is reasonable.
        // AI is instructed to set this, but we can override if it's nonsensical.
        const expectedNewXpToNextLevel = Math.floor(originalXpToNextLevel * 1.5);
        if (updatedChar.experienceToNextLevel <= updatedChar.experiencePoints || updatedChar.experienceToNextLevel < originalXpToNextLevel) {
           updatedChar.experienceToNextLevel = expectedNewXpToNextLevel > updatedChar.experiencePoints 
                                              ? expectedNewXpToNextLevel 
                                              : updatedChar.experiencePoints + Math.max(50, Math.floor(originalXpToNextLevel * 0.5));
        }
      } else {
         // If no level up, ensure experienceToNextLevel is at least the original or a sane default if it got messed up
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
                invItemIds.add(cleanedRewardItem.id); // Also add to main inventory ID set

                if (cleanedRewardItem.equipSlot === null || (cleanedRewardItem.equipSlot as unknown) === '') {
                  delete (cleanedRewardItem as Partial<ItemType>).equipSlot;
                }
                if (cleanedRewardItem.isConsumable === undefined) delete cleanedRewardItem.isConsumable;
                if (cleanedRewardItem.effectDescription === undefined || cleanedRewardItem.effectDescription === '') delete cleanedRewardItem.effectDescription;
                if (cleanedRewardItem.isQuestItem === undefined) delete cleanedRewardItem.isQuestItem;
                if (cleanedRewardItem.relevantQuestId === undefined || cleanedRewardItem.relevantQuestId === '') delete cleanedRewardItem.relevantQuestId;

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
            });
            if (quest.rewards.experiencePoints === undefined && quest.rewards.items.length === 0) {
              delete quest.rewards;
            } else {
                if (quest.rewards.experiencePoints === undefined) delete quest.rewards.experiencePoints;
                if (quest.rewards.items.length === 0) delete quest.rewards.items;
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


    