
'use server';
/**
 * @fileOverview A Genkit tool for looking up or generating lore information,
 * and storing newly generated lore, aware of the specific game series.
 *
 * - lookupLoreTool - A Genkit tool that provides contextual information about a keyword.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { findLoreEntry, addLoreEntry } from '@/lib/lore-manager';

const LoreLookupInputSchema = z.object({
  keyword: z.string().describe('The keyword, character name, location, or concept to get lore information about.'),
  seriesName: z.string().describe('The name of the series the game is based on, to provide context for lore generation.'),
});

const LoreLookupOutputSchema = z.object({
  lore: z.string().describe('A concise piece of lore or contextual information about the keyword. If the keyword is unknown, relevant lore will be generated and stored based on the series context.'),
});

export const lookupLoreTool = ai.defineTool(
  {
    name: 'lookupLoreTool',
    description: 'Provides a brief piece of lore or contextual information about a specific keyword, character, place, or concept, considering the game\'s series. Use this if the story mentions something that seems like it would have a backstory or established information. If the keyword is unknown, it will attempt to generate relevant lore for that series and store it.',
    inputSchema: LoreLookupInputSchema,
    outputSchema: LoreLookupOutputSchema,
  },
  async (input) => {
    const existingEntry = findLoreEntry(input.keyword);

    if (existingEntry) {
      // For future enhancement: could check if existingEntry.series === input.seriesName if lore becomes series-specific in storage.
      return { lore: existingEntry.content };
    }

    // Lore not found, generate and store it, using seriesName for context
    const { output } = await ai.generate({
      prompt: `You are a lore master for the series "${input.seriesName}". Provide a very brief (1-2 sentences) piece of lore or description for the keyword: "${input.keyword}". If it's a common concept, explain it generally within the context of "${input.seriesName}" if possible. If it seems like a proper noun from a fictional work you might know (especially "${input.seriesName}"), provide relevant info. If you don't know, create plausible lore fitting for "${input.seriesName}".`,
      model: 'googleai/gemini-2.0-flash', 
      output: {
        format: 'json',
        schema: z.object({ generatedLore: z.string() }) 
      }
    });
    
    const generatedContent = output?.generatedLore || `No specific lore could be generated for "${input.keyword}" in the context of "${input.seriesName}" at this time.`;

    addLoreEntry({
      keyword: input.keyword,
      content: generatedContent,
      source: 'AI-Generated', // Could add seriesName here or to the entry if needed for multi-series lorebooks
      // category could be determined by another AI call or left undefined
    });

    return { lore: generatedContent };
  }
);
