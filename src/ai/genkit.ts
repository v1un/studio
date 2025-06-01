
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const STANDARD_MODEL_NAME = 'googleai/models/gemini-2.5-flash-preview-05-20';
export const PREMIUM_MODEL_NAME = 'googleai/gemini-1.5-pro-latest'; // Reverted for stability

export const ai = genkit({
  plugins: [googleAI()],
  // No default model specified here; it must be set in each prompt definition.
});
