
'use server';
/**
 * @fileOverview A Genkit flow for dynamically discovering and outlining the next major story arc
 * from a comprehensive series plot summary, based on previously completed arcs.
 *
 * - discoverNextStoryArc - Function to find and outline the next story arc.
 * - DiscoverNextStoryArcInput - Input type for the flow.
 * - DiscoverNextStoryArcOutput - Output type for the flow.
 */

import { ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME } from '@/ai/genkit';
import { z } from 'zod';
import type { StoryArc as StoryArcType, DiscoverNextStoryArcInput as IDiscoverNextStoryArcInput, DiscoverNextStoryArcOutput as IDiscoverNextStoryArcOutput } from '@/types/story';
import { lookupLoreTool } from '@/ai/tools/lore-tool';

// --- Input Schema for the Flow ---
const DiscoverNextStoryArcInputSchema = z.object({
  seriesName: z.string().describe("The name of the series for context."),
  seriesPlotSummary: z.string().describe("The comprehensive plot summary of the entire series. This is the primary source for identifying arcs."),
  completedOrGeneratedArcTitles: z.array(z.string()).describe("An array of titles of story arcs that have already been completed or generated/outlined for the player. The AI should find the *next* arc not in this list."),
  lastCompletedArcOrder: z.number().describe("The 'order' number of the most recently completed story arc. The new arc should follow this sequentially."),
  lastCompletedArcSummary: z.string().optional().describe("A summary of how the most recently completed story arc concluded. This helps in generating a relevant unlock condition for the new arc."),
  usePremiumAI: z.boolean().optional().describe("Whether to use the premium AI model for this task."),
});
export type DiscoverNextStoryArcInput = z.infer<typeof DiscoverNextStoryArcInputSchema>;

// --- Output Schema for the Flow ---
const StoryArcOutlineSchemaInternal = z.object({
    id: z.string().describe("REQUIRED. A unique identifier for the new story arc (e.g., 'story_arc_dynamic_004')."),
    title: z.string().describe("REQUIRED. An engaging title for the new story arc, derived from the series plot."),
    description: z.string().describe("REQUIRED. A concise summary of THIS SPECIFIC new story arc's main events, key characters involved, and themes, directly derived from the seriesPlotSummary. This description should focus only on the events of this newly identified arc."),
    order: z.number().describe("REQUIRED. The sequential order of this new arc (should be lastCompletedArcOrder + 1)."),
    mainQuestIds: z.array(z.string()).default([]).describe("REQUIRED. Must be an empty array `[]` as this is an outline for a new arc."),
    isCompleted: z.literal(false).describe("REQUIRED. Must be false for a newly discovered arc."),
    unlockConditions: z.array(z.string()).optional().describe("An array of suggested narrative conditions for unlocking this arc, ideally based on the 'lastCompletedArcSummary'. Example: ['Player_recovered_the_Sunstone', 'Faction_X_defeated']. For now, these are textual suggestions, not mechanically enforced. Prioritize simpler, more achievable conditions for main story progression. If no specific condition comes to mind, this can be omitted or contain a generic condition like ['Previous_arc_completed']."),
});

const DiscoverNextStoryArcOutputSchema = z.object({
  nextStoryArcOutline: StoryArcOutlineSchemaInternal.nullable().describe("The outlined next story arc, or null if no more distinct arcs can be identified from the summary given the completed ones."),
});
export type DiscoverNextStoryArcOutput = z.infer<typeof DiscoverNextStoryArcOutputSchema>;


// --- Exported Function ---
export async function discoverNextStoryArc(input: IDiscoverNextStoryArcInput): Promise<IDiscoverNextStoryArcOutput> {
  // Assume input includes lastCompletedArcSummary if available from GameSession or currentStoryState
  return discoverNextStoryArcFlow(input as DiscoverNextStoryArcInput);
}

// --- Genkit Flow Definition ---
const discoverNextStoryArcFlow = ai.defineFlow(
  {
    name: 'discoverNextStoryArcFlow',
    inputSchema: DiscoverNextStoryArcInputSchema,
    outputSchema: DiscoverNextStoryArcOutputSchema,
  },
  async (input) => {
    const flowStartTime = Date.now();
    console.log(`[${new Date(flowStartTime).toISOString()}] discoverNextStoryArcFlow: START for Series: ${input.seriesName}, Premium: ${input.usePremiumAI}`);

    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = { maxOutputTokens: input.usePremiumAI ? 32000 : 8000 };

    const prompt = ai.definePrompt({
      name: 'discoverNextStoryArcPrompt',
      model: modelName,
      input: { schema: DiscoverNextStoryArcInputSchema },
      output: { schema: DiscoverNextStoryArcOutputSchema },
      tools: [lookupLoreTool],
      config: modelConfig,
      prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object conforming to 'DiscoverNextStoryArcOutputSchema'.
The 'nextStoryArcOutline' field can be an object matching 'StoryArcOutlineSchemaInternal' or null. If an object, ALL its REQUIRED fields (id, title, description, order, mainQuestIds, isCompleted) MUST be present. The 'unlockConditions' field is optional, but if provided, it MUST be an array of strings.

You are a master series analyst. Your task is to identify the *next logical major story arc* from the provided 'seriesPlotSummary' for the series "{{seriesName}}".

Context:
-   **Series Name:** {{seriesName}}
-   **Comprehensive Series Plot Summary (Primary Source):**
    {{{seriesPlotSummary}}}
-   **Story Arc Titles Already Completed or Generated:**
    {{#if completedOrGeneratedArcTitles.length}}
    {{#each completedOrGeneratedArcTitles}}- "{{this}}"
    {{/each}}
    {{else}}- None yet.
    {{/if}}
-   **Order of the Last Completed Arc:** {{lastCompletedArcOrder}}
-   **Summary of How Last Arc Was Completed (if available):** {{#if lastCompletedArcSummary}}"{{{lastCompletedArcSummary}}}"{{else}}N/A{{/if}}

Your Task:
1.  **Analyze the 'seriesPlotSummary'.**
2.  **Identify the next major chronological story arc** that has *not* been mentioned in 'completedOrGeneratedArcTitles'.
3.  **If a clear, distinct next arc is found:**
    a.  Create a 'nextStoryArcOutline' object.
    b.  **'title' (REQUIRED):** Devise a compelling and accurate title for this new arc based on its content in the plot summary.
    c.  **'description' (REQUIRED):** Write a concise (2-4 sentences) summary *specifically for this new arc*. This description should cover its main events, key characters, and themes, derived *directly* from the relevant section of the 'seriesPlotSummary'. Do NOT re-summarize the entire series or previous arcs.
    d.  **'id' (REQUIRED):** Generate a unique ID (e.g., "ds_arc_{{seriesName}}_{{lastCompletedArcOrder + 1}}_{{randomString length=5}}").
    e.  **'order' (REQUIRED):** Set this to {{lastCompletedArcOrder + 1}}.
    f.  **'mainQuestIds' (REQUIRED):** This MUST be an empty array \`[]\`.
    g.  **'isCompleted' (REQUIRED):** This MUST be \`false\`.
    h.  **'unlockConditions' (optional array of strings):** Based on the 'lastCompletedArcSummary' (if provided) or the general transition from the previous arc, suggest an array of 1-2 brief, narrative unlock conditions for this new arc. Examples: ["Player has defeated the Shadow Knight", "The ancient artifact has been recovered"], ["Character has reached the capital city"]. These are textual suggestions for now and not mechanically enforced. If no specific condition comes to mind, you can state ["Previous_arc_completed"] or omit the field. For main story progression, try to make these conditions generally achievable and related to story progression rather than overly specific game states (like exact health values).
4.  **If NO clear, distinct next arc can be identified** (e.g., the summary seems exhausted, or the remaining plot points are too minor or fragmented to form a major arc):
    a.  Set 'nextStoryArcOutline' to \`null\`.

Output ONLY the JSON object. Do not include any conversational text.
Example of a valid output if an arc is found:
\`{ "nextStoryArcOutline": { "id": "ds_arc_fantasy_3_abc12", "title": "The Dragon's Awakening", "description": "The ancient dragon, long dormant, begins to stir, threatening the northern kingdoms. Heroes must seek the legendary Sunstone to pacify it.", "order": 3, "mainQuestIds": [], "isCompleted": false, "unlockConditions": ["The Orb of Prophecy was secured.", "Player reached level 5"] } }\`
Example of a valid output if no arc is found:
\`{ "nextStoryArcOutline": null }\`
`,
    });

    let promptCallTime = Date.now();
    console.log(`[${new Date(promptCallTime).toISOString()}] discoverNextStoryArcFlow: Calling discoverNextStoryArcPrompt.`);
    const { output } = await prompt(input);
    console.log(`[${new Date().toISOString()}] discoverNextStoryArcFlow: discoverNextStoryArcPrompt call completed in ${Date.now() - promptCallTime}ms.`);

    if (!output) {
      console.error("discoverNextStoryArcFlow: AI failed to return any output.");
      return { nextStoryArcOutline: null };
    }
    
    if (output.nextStoryArcOutline) {
        const arc = output.nextStoryArcOutline;
        arc.id = arc.id || `ds_arc_fallback_${Date.now()}`;
        arc.title = arc.title || "Untitled Discovered Arc";
        arc.description = arc.description || "No description provided by AI for this discovered arc.";
        arc.order = arc.order || (input.lastCompletedArcOrder + 1);
        arc.mainQuestIds = []; 
        arc.isCompleted = false; 
        // arc.unlockConditions is now directly from AI if provided (and is an array)
        if (arc.unlockConditions && !Array.isArray(arc.unlockConditions)) {
             arc.unlockConditions = [String(arc.unlockConditions)]; // Ensure it's an array if AI messes up
        }
    }


    console.log(`[${new Date().toISOString()}] discoverNextStoryArcFlow: END. Total time: ${Date.now() - flowStartTime}ms. Discovered arc: ${output.nextStoryArcOutline?.title || 'None'}`);
    return output;
  }
);

  
