
'use server';
/**
 * @fileOverview A Genkit tool for looking up or generating lore information.
 *
 * - lookupLoreTool - A Genkit tool that provides contextual information about a keyword.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LoreLookupInputSchema = z.object({
  keyword: z.string().describe('The keyword, character name, location, or concept to get lore information about.'),
});

const LoreLookupOutputSchema = z.object({
  lore: z.string().describe('A concise piece of lore or contextual information about the keyword. If the keyword is unknown, state that.'),
});

export const lookupLoreTool = ai.defineTool(
  {
    name: 'lookupLoreTool',
    description: 'Provides a brief piece of lore or contextual information about a specific keyword, character, place, or concept. Use this if the story mentions something that seems like it would have a backstory or established information within a fictional universe.',
    inputSchema: LoreLookupInputSchema,
    outputSchema: LoreLookupOutputSchema,
  },
  async (input) => {
    // In a real system, this might query a database.
    // For now, we'll use another AI call to generate some plausible lore.
    const { output } = await ai.generate({
      prompt: `You are a lore master. Provide a very brief (1-2 sentences) piece of lore or description for the keyword: "${input.keyword}". If it's a common concept, explain it generally. If it seems like a proper noun from a fictional work you might know, provide relevant info. If you don't know, say that.`,
      model: 'googleai/gemini-2.0-flash', // Or your preferred model
      output: {
        format: 'json',
        schema: LoreLookupOutputSchema,
      }
    });
    return output || { lore: `No specific lore found for "${input.keyword}".` };
  }
);
