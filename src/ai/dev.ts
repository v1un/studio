
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-story-start.ts';
import '@/ai/flows/generate-next-scene.ts';
import '@/ai/tools/lore-tool.ts';
import '@/ai/flows/generate-scenario-from-series.ts'; // Contains both foundation and narrative elements (story arcs) flows
import '@/ai/flows/flesh-out-chapter-quests.ts'; // Contains fleshOutStoryArcQuests
import '@/ai/actions/simple-test-action.ts';
