'use server';

/**
 * @fileOverview A flow for generating the initial scene of an interactive story.
 *
 * - generateStoryStart - A function that generates the initial scene description.
 * - GenerateStoryStartInput - The input type for the generateStoryStart function.
 * - GenerateStoryStartOutput - The return type for the generateStoryStart function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStoryStartInputSchema = z.object({
  prompt: z.string().describe('A prompt to kickstart the story (e.g., \'A lone knight enters a dark forest\').'),
});
export type GenerateStoryStartInput = z.infer<typeof GenerateStoryStartInputSchema>;

const GenerateStoryStartOutputSchema = z.object({
  sceneDescription: z.string().describe('The generated initial scene description.'),
});
export type GenerateStoryStartOutput = z.infer<typeof GenerateStoryStartOutputSchema>;

export async function generateStoryStart(input: GenerateStoryStartInput): Promise<GenerateStoryStartOutput> {
  return generateStoryStartFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStoryStartPrompt',
  input: {schema: GenerateStoryStartInputSchema},
  output: {schema: GenerateStoryStartOutputSchema},
  prompt: `You are a creative storyteller. Generate an initial scene description based on the following prompt:

Prompt: {{{prompt}}}

Scene Description:`, // Ensuring the output key is 'sceneDescription'
});

const generateStoryStartFlow = ai.defineFlow(
  {
    name: 'generateStoryStartFlow',
    inputSchema: GenerateStoryStartInputSchema,
    outputSchema: GenerateStoryStartOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
