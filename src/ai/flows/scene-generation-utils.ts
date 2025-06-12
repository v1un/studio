import type { GenerateNextSceneInput } from '@/types/story';

// === UTILITY FUNCTIONS FOR OPTIMIZATION ===

// Function to determine if multi-phase approach should be used
export function shouldUseMultiPhase(input: GenerateNextSceneInput): boolean {
  // Calculate complexity score
  const complexityFactors = {
    userInputLength: input.userInput.length > 500 ? 1 : 0,
    inventorySize: input.storyState.inventory.length > 20 ? 1 : 0,
    questCount: input.storyState.quests.length > 10 ? 1 : 0,
    npcCount: input.storyState.trackedNPCs.length > 15 ? 1 : 0,
    activeEffects: (input.storyState.character.activeTemporaryEffects?.length || 0) > 5 ? 1 : 0,
  };

  const complexityScore = Object.values(complexityFactors).reduce((sum, factor) => sum + factor, 0);

  // Use multi-phase for medium to high complexity scenarios
  return complexityScore >= 2;
}

// Performance monitoring utility
export interface SceneGenerationMetrics {
  approach: 'single-phase' | 'multi-phase';
  totalDuration: number;
  phase1Duration?: number;
  phase2Duration?: number;
  success: boolean;
  errorType?: string;
  complexityScore: number;
  inputTokens?: number;
  outputTokens?: number;
}

export function createMetricsTracker(): {
  startTracking: () => void;
  recordPhase: (phase: string, duration: number) => void;
  finishTracking: (success: boolean, error?: string) => SceneGenerationMetrics;
} {
  let startTime: number;
  let phases: Record<string, number> = {};
  let approach: 'single-phase' | 'multi-phase' = 'single-phase';

  return {
    startTracking: () => {
      startTime = Date.now();
      phases = {};
    },

    recordPhase: (phase: string, duration: number) => {
      phases[phase] = duration;
      if (Object.keys(phases).length > 1) {
        approach = 'multi-phase';
      }
    },

    finishTracking: (success: boolean, error?: string) => {
      const totalDuration = Date.now() - startTime;

      return {
        approach,
        totalDuration,
        phase1Duration: phases['narrative'],
        phase2Duration: phases['events'],
        success,
        errorType: error,
        complexityScore: 0, // Would be calculated based on input
      };
    }
  };
}
