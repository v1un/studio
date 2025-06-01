
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-story-start.ts';
import '@/ai/flows/generate-next-scene.ts';
import '@/ai/tools/lore-tool.ts';
import '@/ai/flows/generate-scenario-from-series.ts'; // Import the new flow
import '@/ai/actions/simple-test-action.ts'; // Import the new test action
