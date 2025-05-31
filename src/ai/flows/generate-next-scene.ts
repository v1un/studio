'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating the next scene in a story based on user input.
 *
 * - generateNextScene - A function that takes the current story state and user input, and returns the next scene.
 * - GenerateNextSceneInput - The input type for the generateNextScene function.
 * - GenerateNextSceneOutput - The return type for the generateNextScene function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNextSceneInputSchema = z.object({
  currentScene: z.string().describe('The current scene text.'),
  userInput: z.string().describe('The user input (action or dialogue).'),
  storyState: z.string().describe('The current state of the story (e.g., character information, location, inventory).'),
});
export type GenerateNextSceneInput = z.infer<typeof GenerateNextSceneInputSchema>;

const GenerateNextSceneOutputSchema = z.object({
  nextScene: z.string().describe('The generated text for the next scene.'),
  updatedStoryState: z.string().describe('The updated story state after the scene.'),
});
export type GenerateNextSceneOutput = z.infer<typeof GenerateNextSceneOutputSchema>;

export async function generateNextScene(input: GenerateNextSceneInput): Promise<GenerateNextSceneOutput> {
  return generateNextSceneFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNextScenePrompt',
  input: {schema: GenerateNextSceneInputSchema},
  output: {schema: GenerateNextSceneOutputSchema},
  prompt: `You are a dynamic storyteller, continuing a story based on the player's actions.

  Current Scene:
  {{currentScene}}

  Player Input:
  {{userInput}}

  Current Story State:
  {{storyState}}

  Based on the current scene, the player's input, and the story state, generate the next scene and update the story state accordingly.
  The next scene should logically follow the player's input and advance the narrative.
  The updated story state should reflect any changes that occurred in the scene (e.g., character health, new items, location changes).

  Next Scene:
  {{nextScene}}

  Updated Story State:
  {{updatedStoryState}}`,
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
