
'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating the next scene in a story based on user input and structured story state.
 *
 * - generateNextScene - A function that takes the current story state and user input, and returns the next scene and updated state.
 * - GenerateNextSceneInput - The input type for the generateNextScene function.
 * - GenerateNextSceneOutput - The return type for the generateNextScene function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schemas for structured story state
const CharacterProfileSchema = z.object({
  name: z.string().describe('The name of the character.'),
  class: z.string().describe('The class or archetype of the character.'),
  description: z.string().describe('A brief backstory or description of the character.'),
  health: z.number().describe('Current health points of the character.'),
  maxHealth: z.number().describe('Maximum health points of the character.'),
});

const StructuredStoryStateSchema = z.object({
  character: CharacterProfileSchema.describe('The profile of the main character.'),
  currentLocation: z.string().describe('The current location of the character in the story.'),
  inventory: z.array(z.string()).describe('A list of item names in the character\'s inventory.'),
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

Current Character: {{storyState.character.name}}, the {{storyState.character.class}}
Character Health: {{storyState.character.health}}/{{storyState.character.maxHealth}}
Current Location: {{storyState.currentLocation}}
Inventory: {{#if storyState.inventory.length}}{{join storyState.inventory ", "}}{{else}}Empty{{/if}}
Active Quests: {{#if storyState.activeQuests.length}}{{join storyState.activeQuests ", "}}{{else}}None{{/if}}
Known World Facts:
{{#each storyState.worldFacts}}
- {{{this}}}
{{else}}
- None known.
{{/each}}

Based on the current scene, the player's input, and the detailed story state above, generate the next scene.
Crucially, you must also update the story state. This includes:
- Character: Update health if they took damage, healed, or if their status changed. Max health should generally remain the same unless a significant event occurs.
- Location: Update if the character moved.
- Inventory: Add or remove items if they were found, used, or lost.
- Active Quests: Update if a quest progressed, was completed, or a new one started.
- World Facts: Add, modify, or remove facts based on what happened or was discovered in the scene.

The next scene should logically follow the player's input and advance the narrative.
Ensure your entire response strictly adheres to the JSON schema defined for the output, providing 'nextScene' and the complete 'updatedStoryState' object.
The 'updatedStoryState' must be a complete JSON object including all its fields (character, currentLocation, inventory, activeQuests, worldFacts), reflecting all changes.
If a field like inventory or activeQuests was empty and remains empty, output it as an empty array.
If the character's health changes, reflect it in 'updatedStoryState.character.health'.
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
    return output!;
  }
);
