
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-story-start.ts';
import '@/ai/flows/generate-next-scene.ts';
import '@/ai/tools/lore-tool.ts'; // Import the new tool
