
'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating the next scene in a story based on user input and structured story state, including core character stats and mana.
 *
 * - generateNextScene - A function that takes the current story state and user input, and returns the next scene and updated state.
 * - GenerateNextSceneInput - The input type for the generateNextScene function.
 * - GenerateNextSceneOutput - The return type for the generateNextScene function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ItemSchema = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Must be unique if multiple items of the same name exist."),
  name: z.string().describe("The name of the item."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function."),
});
export type Item = z.infer<typeof ItemSchema>;


const CharacterProfileSchema = z.object({
  name: z.string().describe('The name of the character.'),
  class: z.string().describe('The class or archetype of the character.'),
  description: z.string().describe('A brief backstory or description of the character.'),
  health: z.number().describe('Current health points of the character.'),
  maxHealth: z.number().describe('Maximum health points of the character.'),
  mana: z.number().optional().describe('Current mana or magic points of the character.'),
  maxMana: z.number().optional().describe('Maximum mana or magic points.'),
  strength: z.number().optional().describe('Character\'s physical power.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and memory.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence.'),
});
export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;


const StructuredStoryStateSchema = z.object({
  character: CharacterProfileSchema.describe('The profile of the main character, including core stats.'),
  currentLocation: z.string().describe('The current location of the character in the story.'),
  inventory: z.array(ItemSchema).describe('A list of items in the character\'s inventory. Each item is an object with id, name, and description.'),
  activeQuests: z.array(z.string()).describe('A list of active quest descriptions.'),
  worldFacts: z.array(z.string()).describe('Key facts or observations about the game world state.'),
});
export type StructuredStoryState = z.infer<typeof StructuredStoryStateSchema>;


const GenerateNextSceneInputSchema = z.object({
  currentScene: z.string().describe('The current scene text.'),
  userInput: z.string().describe('The user input (action or dialogue).'),
  storyState: StructuredStoryStateSchema.describe('The current structured state of the story (character, location, inventory, etc.).'),
});
export type GenerateNextSceneInput = z.infer<typeof GenerateNextSceneInputSchema>;

const GenerateNextSceneOutputSchema = z.object({
  nextScene: z.string().describe('The generated text for the next scene.'),
  updatedStoryState: StructuredStoryStateSchema.describe('The updated structured story state after the scene.'),
});
export type GenerateNextSceneOutput = z.infer<typeof GenerateNextSceneOutputSchema>;

export async function generateNextScene(input: GenerateNextSceneInput): Promise<GenerateNextSceneOutput> {
  return generateNextSceneFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNextScenePrompt',
  input: {schema: GenerateNextSceneInputSchema},
  output: {schema: GenerateNextSceneOutputSchema},
  prompt: `You are a dynamic storyteller, continuing a story based on the player's actions and the current game state.

Current Scene:
{{currentScene}}

Player Input:
{{userInput}}

Current Character:
- Name: {{storyState.character.name}}, the {{storyState.character.class}}
- Health: {{storyState.character.health}}/{{storyState.character.maxHealth}}
- Mana: {{#if storyState.character.mana}}{{storyState.character.mana}}/{{storyState.character.maxMana}}{{else}}N/A{{/if}}
- Stats:
  - Strength: {{storyState.character.strength}}
  - Dexterity: {{storyState.character.dexterity}}
  - Constitution: {{storyState.character.constitution}}
  - Intelligence: {{storyState.character.intelligence}}
  - Wisdom: {{storyState.character.wisdom}}
  - Charisma: {{storyState.character.charisma}}

Current Location: {{storyState.currentLocation}}

Current Inventory:
{{#if storyState.inventory.length}}
{{#each storyState.inventory}}
- {{this.name}} (ID: {{this.id}}): {{this.description}}
{{/each}}
{{else}}
Empty
{{/if}}

Active Quests: {{#if storyState.activeQuests.length}}{{join storyState.activeQuests ", "}}{{else}}None{{/if}}

Known World Facts:
{{#each storyState.worldFacts}}
- {{{this}}}
{{else}}
- None known.
{{/each}}

Based on the current scene, the player's input, and the detailed story state above, generate the next scene.
Your generated scene should consider the character's stats. For example, a high Strength character might succeed at forcing a door, while a high Intelligence character might solve a riddle.
Describe any quest-related developments (new quests, progress, completion) clearly in the 'nextScene' text.

Crucially, you must also update the story state. This includes:
- Character: Update health if they took damage or healed. Update mana if spells were cast or mana was restored. Max health/mana should generally remain the same unless a significant event occurs. Core stats (Strength, etc.) should generally remain unchanged unless a very significant, transformative event happens that explicitly justifies a permanent stat change.
- Location: Update if the character moved.
- Inventory:
  - If new items are found: Add them as objects to the \`inventory\` array in \`updatedStoryState\`. Each item object **must** have a unique \`id\` (e.g., 'item_potion_123', 'ancient_sword_001', or even a UUID like 'item_a1b2c3d4'), a \`name\`, and a \`description\`. Describe these new items clearly in the \`nextScene\` text.
  - If items are used, consumed, or lost: Remove the corresponding item object(s) from the \`inventory\` array. Be specific about which item is removed (e.g., by its name or id).
- Active Quests: Update if a quest progressed, was completed, or a new one started. Add or remove quest strings from the 'activeQuests' array as appropriate.
- World Facts: Add, modify, or remove facts based on what happened or was discovered in the scene. Update the 'worldFacts' array accordingly.

The next scene should logically follow the player's input and advance the narrative.
Ensure your entire response strictly adheres to the JSON schema defined for the output, providing 'nextScene' and the complete 'updatedStoryState' object.
The 'updatedStoryState' must be a complete JSON object including all its fields (character, currentLocation, inventory, activeQuests, worldFacts), reflecting all changes.
The 'updatedStoryState.inventory' must be an array of item objects (or an empty array if none). Each item object **must** contain 'id', 'name', and 'description' fields.
If a field like activeQuests or worldFacts was empty and remains empty, output it as an empty array.
If the character's health or mana changes, reflect it in 'updatedStoryState.character.health' or 'updatedStoryState.character.mana'.
All character stats (strength, dexterity etc.) must be present in the output character object. If they didn't change, return their existing values.
`,
});

const generateNextSceneFlow = ai.defineFlow(
  {
    name: 'generateNextSceneFlow',
    inputSchema: GenerateNextSceneInputSchema,
    outputSchema: GenerateNextSceneOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (output?.updatedStoryState.character && input.storyState.character) {
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
    }
     if (output?.updatedStoryState) {
        output.updatedStoryState.inventory = output.updatedStoryState.inventory ?? [];
        output.updatedStoryState.activeQuests = output.updatedStoryState.activeQuests ?? [];
        output.updatedStoryState.worldFacts = output.updatedStoryState.worldFacts ?? [];
    }
    return output!;
  }
);

