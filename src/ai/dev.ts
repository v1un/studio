
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

// Also try to load from .env as fallback
config();

import '@/ai/flows/generate-story-start.ts';
import '@/ai/flows/generate-next-scene.ts';
import '@/ai/tools/lore-tool.ts';
import '@/ai/flows/generate-scenario-from-series.ts'; // Contains both foundation and narrative elements (story arcs) flows
import '@/ai/flows/flesh-out-chapter-quests.ts'; // Contains fleshOutStoryArcQuests
import '@/ai/flows/discover-next-story-arc-flow.ts'; // Contains discoverNextStoryArc
import '@/ai/flows/update-character-description-flow.ts'; // Contains updateCharacterDescription
import '@/ai/flows/generate-bridging-quest-flow.ts'; // Contains generateBridgingQuest
import '@/ai/actions/simple-test-action.ts';
