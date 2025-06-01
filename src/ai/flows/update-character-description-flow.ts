
'use server';
/**
 * @fileOverview A Genkit flow for updating the character's core description
 * based on the events of a completed story arc.
 *
 * - updateCharacterDescription - Function to revise the character description.
 * - UpdateCharacterDescriptionInput - Input type for the flow.
 * - UpdateCharacterDescriptionOutput - Output type for the flow.
 */

import { ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME } from '@/ai/genkit';
import { z } from 'zod';
import type { CharacterProfile as CharacterProfileType, StoryArc as StoryArcType, UpdateCharacterDescriptionInput as IUpdateCharacterDescriptionInput, UpdateCharacterDescriptionOutput as IUpdateCharacterDescriptionOutput } from '@/types/story';

// --- Input Schema for the Flow ---
const CharacterProfileForUpdateSchema = z.object({
    name: z.string(),
    class: z.string(),
    description: z.string().describe("The current character description to be updated."),
    level: z.number(),
    // Add other key character attributes if they should influence the description update
});

const CompletedStoryArcForUpdateSchema = z.object({
    title: z.string(),
    description: z.string().describe("A summary of the completed story arc's main events and themes."),
});

const UpdateCharacterDescriptionInputSchema = z.object({
  currentProfile: CharacterProfileForUpdateSchema.describe("The character's current profile, especially their existing description."),
  completedArc: CompletedStoryArcForUpdateSchema.describe("The story arc that was just completed."),
  overallStorySummarySoFar: z.string().describe("A summary of everything that has happened in the game up to the end of the completed arc. Provides broad context."),
  seriesName: z.string().describe("The name of the series for thematic consistency."),
  usePremiumAI: z.boolean().optional().describe("Whether to use the premium AI model for this task."),
});
export type UpdateCharacterDescriptionInput = z.infer<typeof UpdateCharacterDescriptionInputSchema>;

// --- Output Schema for the Flow ---
const UpdateCharacterDescriptionOutputSchema = z.object({
  updatedCharacterDescription: z.string().describe("The revised character description. This should reflect experiences from the completed arc while maintaining core identity."),
});
export type UpdateCharacterDescriptionOutput = z.infer<typeof UpdateCharacterDescriptionOutputSchema>;

// --- Exported Function ---
export async function updateCharacterDescription(input: IUpdateCharacterDescriptionInput): Promise<IUpdateCharacterDescriptionOutput> {
  // Map the broader CharacterProfileType to the more focused CharacterProfileForUpdateSchema
  const mappedInput: UpdateCharacterDescriptionInput = {
    ...input,
    currentProfile: {
        name: input.currentProfile.name,
        class: input.currentProfile.class,
        description: input.currentProfile.description,
        level: input.currentProfile.level,
    },
    completedArc: {
        title: input.completedArc.title,
        description: input.completedArc.description,
    }
  };
  return updateCharacterDescriptionFlow(mappedInput);
}

// --- Genkit Flow Definition ---
const updateCharacterDescriptionFlow = ai.defineFlow(
  {
    name: 'updateCharacterDescriptionFlow',
    inputSchema: UpdateCharacterDescriptionInputSchema,
    outputSchema: UpdateCharacterDescriptionOutputSchema,
  },
  async (input) => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] updateCharacterDescriptionFlow: START for Character: ${input.currentProfile.name}, Series: ${input.seriesName}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = { maxOutputTokens: input.usePremiumAI ? 2000 : 1000 }; // Description updates should be concise

    const prompt = ai.definePrompt({
      name: 'updateCharacterDescriptionPrompt',
      model: modelName,
      input: { schema: UpdateCharacterDescriptionInputSchema },
      output: { schema: UpdateCharacterDescriptionOutputSchema },
      config: modelConfig,
      prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'UpdateCharacterDescriptionOutputSchema'. The 'updatedCharacterDescription' field is REQUIRED.

You are a character biographer, subtly evolving a character's self-perception and narrative description based on their recent experiences in the series "{{seriesName}}".
The character is {{currentProfile.name}}, a Level {{currentProfile.level}} {{currentProfile.class}}.

Current Character Description (to be updated):
"{{{currentProfile.description}}}"

Recently Completed Story Arc: "{{completedArc.title}}"
Summary of the Completed Arc's Events:
"{{{completedArc.description}}}"

Overall Story Summary So Far (leading up to and including the completed arc):
"{{{overallStorySummarySoFar}}}"

Your Task:
Revise the 'Current Character Description'. The 'updatedCharacterDescription' should:
1.  Reflect significant personal growth, new skills learned (if mentioned in summaries), traumas endured, key relationships formed or altered, or new perspectives gained specifically during the 'Completed Story Arc'.
2.  Maintain the character's core identity and established traits unless the arc's events fundamentally and canonically altered them.
3.  Be subtle. The description should evolve, not be completely rewritten from scratch. Integrate changes smoothly.
4.  If the character's fundamental nature (e.g., "NEET from modern Japan", "illiterate") has *canonically* changed due to the arc's events (highly unlikely for core traits), reflect that. Otherwise, preserve such core, unchangeable facts.
5.  Ensure the tone and style are consistent with the existing description and the series "{{seriesName}}".
6.  The updated description should remain concise (2-4 sentences, similar to the original's length).

Focus on how the character might now see themselves or how an observer might describe them differently *after* the events of "{{completedArc.title}}".

Output ONLY the JSON object.
Example: \`{"updatedCharacterDescription": "Once a bewildered NEET, Natsuki Subaru now carries the weight of his recent harrowing experiences in the Roswaal Mathers mansion. While still out of his depth, a newfound determination, forged in repeated deaths and small victories, glimmers in his eyes. He remains illiterate but is slowly learning the nuances of Lugnica's social fabric, driven by loyalty to his new companions."}\`
`,
    });

    let promptCallTime = Date.now();
    console.log(`[${new Date(promptCallTime).toISOString()}] updateCharacterDescriptionFlow: Calling updateCharacterDescriptionPrompt.`);
    const { output } = await prompt(input);
    console.log(`[${new Date().toISOString()}] updateCharacterDescriptionFlow: updateCharacterDescriptionPrompt call completed in ${Date.now() - promptCallTime}ms.`);

    if (!output || !output.updatedCharacterDescription) {
      console.error("updateCharacterDescriptionFlow: AI failed to return an updated description. Returning original.");
      return { updatedCharacterDescription: input.currentProfile.description };
    }

    console.log(`[${new Date().toISOString()}] updateCharacterDescriptionFlow: END. Total time: ${Date.now() - flowStartTime}ms.`);
    return { updatedCharacterDescription: output.updatedCharacterDescription.trim() };
  }
);
