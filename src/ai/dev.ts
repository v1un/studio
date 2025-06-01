
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-story-start.ts';
import '@/ai/flows/generate-next-scene.ts';
import '@/ai/tools/lore-tool.ts';
import '@/ai/flows/generate-scenario-from-series.ts'; // This file now contains both foundation and narrative elements flows
import '@/ai/flows/flesh-out-chapter-quests.ts';
import '@/ai/actions/simple-test-action.ts';

    