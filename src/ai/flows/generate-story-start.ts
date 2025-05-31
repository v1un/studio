
'use server';

/**
 * @fileOverview A flow for generating the initial scene of an interactive story, including character creation with core stats and mana.
 *
 * - generateStoryStart - A function that generates the initial scene description and story state.
 * - GenerateStoryStartInput - The input type for the generateStoryStart function.
 * - GenerateStoryStartOutput - The return type for the generateStoryStart function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CharacterProfileSchema = z.object({
  name: z.string().describe('The name of the character.'),
  class: z.string().describe('The class or archetype of the character.'),
  description: z.string().describe('A brief backstory or description of the character.'),
  health: z.number().describe('Current health points of the character.'),
  maxHealth: z.number().describe('Maximum health points of the character.'),
  mana: z.number().optional().describe('Current mana or magic points of the character. Assign 0 if not applicable to the class.'),
  maxMana: z.number().optional().describe('Maximum mana or magic points. Assign 0 if not applicable.'),
  strength: z.number().optional().describe('Character\'s physical power. Assign a value between 5 and 15.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes. Assign a value between 5 and 15.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness. Affects health. Assign a value between 5 and 15.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and memory. Affects mana for magic users. Assign a value between 5 and 15.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition. Affects mana regeneration or spell effectiveness. Assign a value between 5 and 15.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence. Assign a value between 5 and 15.'),
});

const StructuredStoryStateSchema = z.object({
  character: CharacterProfileSchema.describe('The profile of the main character, including core stats.'),
  currentLocation: z.string().describe('The current location of the character in the story.'),
  inventory: z.array(z.string()).describe('A list of item names in the character\'s inventory.'),
  activeQuests: z.array(z.string()).describe('A list of active quest descriptions.'),
  worldFacts: z.array(z.string()).describe('Key facts or observations about the game world state.'),
});
export type StructuredStoryState = z.infer<typeof StructuredStoryStateSchema>;


const GenerateStoryStartInputSchema = z.object({
  prompt: z.string().describe('A prompt to kickstart the story (e.g., \'A lone knight enters a dark forest\').'),
  characterNameInput: z.string().optional().describe('Optional user-suggested character name.'),
  characterClassInput: z.string().optional().describe('Optional user-suggested character class.'),
});
export type GenerateStoryStartInput = z.infer<typeof GenerateStoryStartInputSchema>;

const GenerateStoryStartOutputSchema = z.object({
  sceneDescription: z.string().describe('The generated initial scene description.'),
  storyState: StructuredStoryStateSchema.describe('The initial structured state of the story, including character details and stats.'),
});
export type GenerateStoryStartOutput = z.infer<typeof GenerateStoryStartOutputSchema>;

export async function generateStoryStart(input: GenerateStoryStartInput): Promise<GenerateStoryStartOutput> {
  return generateStoryStartFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStoryStartPrompt',
  input: {schema: GenerateStoryStartInputSchema},
  output: {schema: GenerateStoryStartOutputSchema},
  prompt: `You are a creative storyteller and game master.
The user wants to start a new story with the following theme: "{{prompt}}".

User's character suggestions:
- Name: {{#if characterNameInput}}{{characterNameInput}}{{else}}(Not provided){{/if}}
- Class: {{#if characterClassInput}}{{characterClassInput}}{{else}}(Not provided){{/if}}

Based on the theme and any user suggestions, generate the following:
1.  An initial scene description for the story.
2.  A character profile:
    -   Invent a suitable name and class if not provided by the user or if the suggestions are too vague.
    -   Provide a brief backstory or description for the character.
    -   Set initial health and maxHealth (e.g., 100 health, 100 maxHealth).
    -   Set initial mana and maxMana. If the class is not a magic user, set both to 0 or a low symbolic value like 10.
    -   Assign initial values (between 5 and 15, average 10) for the six core stats: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma. These stats should generally align with the character's class (e.g., a warrior might have higher Strength and Constitution).
3.  An initial structured story state, including:
    -   The character profile you just created (with all stats).
    -   A starting location relevant to the scene.
    -   An empty inventory (initialize as an empty array: []).
    -   No active quests initially (initialize as an empty array: []).
    -   One or two initial world facts relevant to the scene and character.

Your entire response must strictly follow the JSON schema defined for the output, containing 'sceneDescription' and 'storyState'.
The 'storyState' itself must be a JSON object with keys 'character', 'currentLocation', 'inventory', 'activeQuests', and 'worldFacts'.
The 'character' object within 'storyState' must have all fields: 'name', 'class', 'description', 'health', 'maxHealth', 'mana', 'maxMana', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'.
Ensure all stat fields (strength, dexterity, etc.) are populated with numbers.
`,
});

const generateStoryStartFlow = ai.defineFlow(
  {
    name: 'generateStoryStartFlow',
    inputSchema: GenerateStoryStartInputSchema,
    outputSchema: GenerateStoryStartOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure default values if AI misses optional fields, though prompt guides it to include them.
    if (output?.storyState.character) {
      const char = output.storyState.character;
      char.mana = char.mana ?? 0;
      char.maxMana = char.maxMana ?? 0;
      char.strength = char.strength ?? 10;
      char.dexterity = char.dexterity ?? 10;
      char.constitution = char.constitution ?? 10;
      char.intelligence = char.intelligence ?? 10;
      char.wisdom = char.wisdom ?? 10;
      char.charisma = char.charisma ?? 10;
    }
    return output!;
  }
);
