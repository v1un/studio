/**
 * Scenario Integration Engine
 * 
 * Coordinates all systems during scenario generation to create a comprehensive,
 * integrated experience that includes state tracking, gameplay mechanics,
 * and series-specific adaptations.
 */

import type { 
  StructuredStoryState, 
  CharacterProfile,
  Quest,
  NPCProfile,
  Item,
  EquipmentSlot
} from '@/types/story';

import { 
  initializeEnhancedStoryState,
  updateStateWithPriority,
  createRelationshipUpdate,
  createEmotionalUpdate,
  createEnvironmentalUpdate,
  createNarrativeUpdate,
  type StateUpdate
} from '@/lib/enhanced-state-manager';

import { getSeriesConfig, adaptPromptForSeries } from '@/lib/series-adapter';
import { initializeCharacterProgression } from '@/lib/progression-engine';
import { InventoryManager } from '@/lib/inventory-manager';

export interface ScenarioGenerationContext {
  seriesName: string;
  characterName?: string;
  characterClass?: string;
  usePremiumAI: boolean;
  playerPreferences?: any;
}

export interface IntegratedScenarioResult {
  // Core scenario data
  sceneDescription: string;
  characterProfile: CharacterProfile;
  currentLocation: string;
  inventory: Item[];
  equippedItems: Partial<Record<EquipmentSlot, Item | null>>;
  worldFacts: string[];
  seriesStyleGuide: string;
  seriesPlotSummary: string;
  quests: Quest[];
  storyArcs: any[];
  trackedNPCs: NPCProfile[];
  initialLoreEntries: any[];
  
  // Enhanced integrations
  enhancedStoryState: StructuredStoryState;
  combatScenario?: any;
  progressionSetup?: any;
  craftingSetup?: any;
  balanceConfiguration?: any;
  
  // Integration metadata
  integrationWarnings: string[];
  seriesCompatibility: string[];
  systemStatus: {
    stateTracking: 'active' | 'partial' | 'disabled';
    combatIntegration: 'active' | 'partial' | 'disabled';
    progressionSystem: 'active' | 'partial' | 'disabled';
    craftingSystem: 'active' | 'partial' | 'disabled';
    balanceSystem: 'active' | 'partial' | 'disabled';
  };
}

export class ScenarioIntegrationEngine {
  private context: ScenarioGenerationContext;
  private seriesConfig: any;
  private warnings: string[] = [];

  constructor(context: ScenarioGenerationContext) {
    this.context = context;
    this.seriesConfig = getSeriesConfig(context.seriesName);
  }

  async integrateScenarioResult(baseResult: any): Promise<IntegratedScenarioResult> {
    console.log(`[ScenarioIntegration] Starting integration for ${this.context.seriesName}`);
    
    // Initialize enhanced story state
    const enhancedState = await this.initializeEnhancedState(baseResult);
    
    // Apply series-specific adaptations
    const adaptedResult = await this.applySeriesAdaptations(baseResult, enhancedState);
    
    // Integrate gameplay systems
    const gameplayIntegration = await this.integrateGameplaySystems(adaptedResult, enhancedState);
    
    // Apply balance and difficulty settings
    const balancedResult = await this.applyBalanceSettings(gameplayIntegration, enhancedState);
    
    // Validate and finalize
    const finalResult = await this.finalizeIntegration(balancedResult, enhancedState);
    
    console.log(`[ScenarioIntegration] Integration complete with ${this.warnings.length} warnings`);
    
    return finalResult;
  }

  private async initializeEnhancedState(baseResult: any): Promise<StructuredStoryState> {
    const baseState = {
      character: baseResult.characterProfile,
      currentLocation: baseResult.currentLocation,
      inventory: baseResult.inventory || [],
      equippedItems: baseResult.equippedItems || {},
      quests: baseResult.quests || [],
      storyArcs: baseResult.storyArcs || [],
      worldFacts: baseResult.worldFacts || [],
      trackedNPCs: baseResult.trackedNPCs || [],
      storySummary: baseResult.sceneDescription || '',
    };

    const enhancedState = initializeEnhancedStoryState(baseState);
    
    // Apply initial state updates based on scenario generation
    const initialUpdates: StateUpdate[] = [];

    // Set initial emotional state based on scene
    initialUpdates.push(createEmotionalUpdate(
      {
        primaryMood: this.determineInitialMood(baseResult.sceneDescription),
        stressLevel: this.determineInitialStress(baseResult.sceneDescription),
      },
      'Initial emotional state from scenario generation',
      'scenario_init'
    ));

    // Initialize environmental context based on scene and location
    initialUpdates.push(createEnvironmentalUpdate(
      {
        locationDetails: {
          name: baseResult.currentLocation,
          description: this.extractLocationDescription(baseResult.sceneDescription),
          notableFeatures: this.extractLocationFeatures(baseResult.sceneDescription),
          availableServices: [],
          safetyLevel: 'moderate',
          populationDensity: 'moderate',
          economicLevel: 'moderate',
        },
        atmosphericModifiers: this.determineAtmosphericModifiers(baseResult.sceneDescription),
      },
      'Initial environmental context from scenario generation',
      'scenario_init'
    ));

    // Initialize narrative threads based on scene content
    if (baseResult.sceneDescription) {
      const narrativeThreads = this.extractNarrativeThreads(baseResult.sceneDescription, baseResult.storyArcs || []);
      narrativeThreads.forEach(thread => {
        initialUpdates.push(createNarrativeUpdate(
          { newThread: thread },
          `Initial narrative thread: ${thread.title}`,
          'scenario_init'
        ));
      });
    }
    
    // Set environmental context
    initialUpdates.push(createEnvironmentalUpdate(
      {
        currentLocation: baseResult.currentLocation,
        locationDetails: {
          locationType: this.determineLocationType(baseResult.currentLocation),
          safetyLevel: this.determineSafetyLevel(baseResult.sceneDescription),
          atmosphericModifiers: this.extractAtmosphericModifiers(baseResult.sceneDescription),
        },
      },
      'Initial environmental context from scenario generation',
      'scenario_init'
    ));
    
    // Initialize NPC relationships
    if (baseResult.trackedNPCs) {
      for (const npc of baseResult.trackedNPCs) {
        initialUpdates.push(createRelationshipUpdate(
          npc.id,
          npc.relationshipStatus || 0,
          'initial_meeting',
          `Initial relationship with ${npc.name}`,
          'scenario_init'
        ));
      }
    }
    
    return updateStateWithPriority(enhancedState, initialUpdates);
  }

  private async applySeriesAdaptations(baseResult: any, enhancedState: StructuredStoryState): Promise<any> {
    // Apply series-specific character adaptations
    const adaptedCharacter = await this.adaptCharacterForSeries(baseResult.characterProfile);
    
    // Adapt quests for series consistency
    const adaptedQuests = await this.adaptQuestsForSeries(baseResult.quests || []);
    
    // Adapt NPCs for series consistency
    const adaptedNPCs = await this.adaptNPCsForSeries(baseResult.trackedNPCs || []);
    
    return {
      ...baseResult,
      characterProfile: adaptedCharacter,
      quests: adaptedQuests,
      trackedNPCs: adaptedNPCs,
    };
  }

  private async integrateGameplaySystems(baseResult: any, enhancedState: StructuredStoryState): Promise<any> {
    const integrations: any = {};
    
    // Combat scenarios will be generated dynamically during gameplay
    integrations.systemStatus = { ...integrations.systemStatus, combatIntegration: 'disabled' };
    
    // Progression integration
    try {
      integrations.progressionSetup = await this.generateProgressionIntegration(baseResult);
      integrations.systemStatus = { ...integrations.systemStatus, progressionSystem: 'active' };
    } catch (error) {
      this.warnings.push(`Progression integration failed: ${error}`);
      integrations.systemStatus = { ...integrations.systemStatus, progressionSystem: 'disabled' };
    }
    
    // Crafting integration
    try {
      integrations.craftingSetup = await this.generateCraftingIntegration(baseResult);
      integrations.systemStatus = { ...integrations.systemStatus, craftingSystem: 'active' };
    } catch (error) {
      this.warnings.push(`Crafting integration failed: ${error}`);
      integrations.systemStatus = { ...integrations.systemStatus, craftingSystem: 'disabled' };
    }
    
    return {
      ...baseResult,
      ...integrations,
    };
  }

  private async applyBalanceSettings(baseResult: any, enhancedState: StructuredStoryState): Promise<any> {
    try {
      const { initializeGameBalance } = await import('@/lib/game-balance-engine');
      const balanceSettings = initializeGameBalance();
      
      // Apply series-specific balance adjustments
      const seriesDifficulty = this.seriesConfig.difficultyProfile;
      balanceSettings.difficultySettings = {
        ...balanceSettings.difficultySettings,
        combatDifficulty: seriesDifficulty.combat * 10,
        socialDifficulty: seriesDifficulty.social * 10,
        puzzleDifficulty: seriesDifficulty.puzzle * 10,
        survivalDifficulty: seriesDifficulty.survival * 10,
        politicalDifficulty: seriesDifficulty.political * 10,
      };
      
      return {
        ...baseResult,
        balanceConfiguration: balanceSettings,
        systemStatus: { ...baseResult.systemStatus, balanceSystem: 'active' },
      };
    } catch (error) {
      this.warnings.push(`Balance system integration failed: ${error}`);
      return {
        ...baseResult,
        systemStatus: { ...baseResult.systemStatus, balanceSystem: 'disabled' },
      };
    }
  }

  private async finalizeIntegration(baseResult: any, enhancedState: StructuredStoryState): Promise<IntegratedScenarioResult> {
    // Validate series compatibility
    const { validateSeriesCompatibility } = await import('@/lib/series-adapter');
    const compatibilityWarnings = validateSeriesCompatibility(enhancedState, this.context.seriesName);
    
    // Set default system status for any missing entries
    const systemStatus = {
      stateTracking: 'active' as const,
      combatIntegration: 'disabled' as const,
      progressionSystem: 'disabled' as const,
      craftingSystem: 'disabled' as const,
      balanceSystem: 'disabled' as const,
      ...baseResult.systemStatus,
    };
    
    return {
      ...baseResult,
      enhancedStoryState: enhancedState,
      integrationWarnings: this.warnings,
      seriesCompatibility: compatibilityWarnings,
      systemStatus,
    };
  }

  // Helper methods for determining initial states
  private determineInitialMood(sceneDescription: string): string {
    const description = sceneDescription.toLowerCase();
    if (description.includes('danger') || description.includes('threat')) return 'anxious';
    if (description.includes('peaceful') || description.includes('calm')) return 'content';
    if (description.includes('exciting') || description.includes('adventure')) return 'excited';
    return 'neutral';
  }

  private determineInitialStress(sceneDescription: string): number {
    const description = sceneDescription.toLowerCase();
    if (description.includes('combat') || description.includes('danger')) return 60;
    if (description.includes('unknown') || description.includes('mysterious')) return 40;
    if (description.includes('peaceful') || description.includes('safe')) return 10;
    return 20;
  }

  private determineLocationType(location: string): string {
    const loc = location.toLowerCase();
    if (loc.includes('city') || loc.includes('town')) return 'urban';
    if (loc.includes('forest') || loc.includes('woods')) return 'wilderness';
    if (loc.includes('dungeon') || loc.includes('cave')) return 'underground';
    if (loc.includes('castle') || loc.includes('palace')) return 'structure';
    return 'other';
  }

  private determineSafetyLevel(sceneDescription: string): number {
    const description = sceneDescription.toLowerCase();
    if (description.includes('safe') || description.includes('protected')) return 80;
    if (description.includes('danger') || description.includes('threat')) return 20;
    if (description.includes('unknown') || description.includes('mysterious')) return 40;
    return 60;
  }

  private extractAtmosphericModifiers(sceneDescription: string): string[] {
    const modifiers: string[] = [];
    const description = sceneDescription.toLowerCase();
    
    if (description.includes('dark') || description.includes('night')) modifiers.push('low_light');
    if (description.includes('rain') || description.includes('storm')) modifiers.push('wet_weather');
    if (description.includes('fog') || description.includes('mist')) modifiers.push('low_visibility');
    if (description.includes('crowd') || description.includes('busy')) modifiers.push('crowded');
    if (description.includes('quiet') || description.includes('empty')) modifiers.push('isolated');
    
    return modifiers;
  }

  private async adaptCharacterForSeries(character: CharacterProfile): Promise<CharacterProfile> {
    // Apply series-specific character adaptations
    const progressionCharacter = initializeCharacterProgression(character);
    
    // Add series-specific attributes or modifications
    return {
      ...progressionCharacter,
      // Series-specific adaptations would go here
    };
  }

  private async adaptQuestsForSeries(quests: Quest[]): Promise<Quest[]> {
    // Apply series-specific quest adaptations
    return quests.map(quest => ({
      ...quest,
      // Series-specific quest modifications would go here
    }));
  }

  private async adaptNPCsForSeries(npcs: NPCProfile[]): Promise<NPCProfile[]> {
    // Apply series-specific NPC adaptations
    return npcs.map(npc => ({
      ...npc,
      // Series-specific NPC modifications would go here
    }));
  }



  private async generateProgressionIntegration(baseResult: any): Promise<any> {
    // This would integrate with the progression system
    return baseResult.progressionSetup || null;
  }

  private async generateCraftingIntegration(baseResult: any): Promise<any> {
    // This would integrate with the crafting system
    return baseResult.craftingSetup || null;
  }

  // === ENHANCED STATE INITIALIZATION HELPERS ===

  private determineInitialMood(sceneDescription: string): 'confident' | 'anxious' | 'angry' | 'melancholic' | 'excited' | 'fearful' | 'content' | 'frustrated' | 'hopeful' | 'despairing' {
    const description = sceneDescription.toLowerCase();

    if (description.includes('danger') || description.includes('threat') || description.includes('attack')) {
      return 'fearful';
    } else if (description.includes('confusion') || description.includes('lost') || description.includes('uncertain')) {
      return 'anxious';
    } else if (description.includes('wonder') || description.includes('amazing') || description.includes('beautiful')) {
      return 'excited';
    } else if (description.includes('peaceful') || description.includes('calm') || description.includes('serene')) {
      return 'content';
    } else if (description.includes('hope') || description.includes('opportunity') || description.includes('chance')) {
      return 'hopeful';
    } else {
      return 'content'; // Default neutral state
    }
  }

  private determineInitialStress(sceneDescription: string): number {
    const description = sceneDescription.toLowerCase();
    let stressLevel = 20; // Base stress level

    if (description.includes('danger') || description.includes('threat')) stressLevel += 30;
    if (description.includes('confusion') || description.includes('lost')) stressLevel += 20;
    if (description.includes('crowd') || description.includes('busy')) stressLevel += 15;
    if (description.includes('unfamiliar') || description.includes('strange')) stressLevel += 10;
    if (description.includes('peaceful') || description.includes('calm')) stressLevel -= 10;

    return Math.max(0, Math.min(100, stressLevel));
  }

  private extractLocationDescription(sceneDescription: string): string {
    // Extract environmental details from scene description
    const sentences = sceneDescription.split(/[.!?]+/);
    const environmentalSentences = sentences.filter(sentence =>
      sentence.toLowerCase().includes('street') ||
      sentence.toLowerCase().includes('building') ||
      sentence.toLowerCase().includes('square') ||
      sentence.toLowerCase().includes('market') ||
      sentence.toLowerCase().includes('district')
    );

    return environmentalSentences.slice(0, 2).join('. ').trim() || 'A location in the world';
  }

  private extractLocationFeatures(sceneDescription: string): string[] {
    const features: string[] = [];
    const description = sceneDescription.toLowerCase();

    if (description.includes('fountain')) features.push('Central fountain');
    if (description.includes('market') || description.includes('stall')) features.push('Market stalls');
    if (description.includes('clock tower')) features.push('Clock tower');
    if (description.includes('cobblestone')) features.push('Cobblestone streets');
    if (description.includes('carriage') || description.includes('cart')) features.push('Vehicle traffic');
    if (description.includes('crowd') || description.includes('people')) features.push('Populated area');

    return features;
  }

  private determineAtmosphericModifiers(sceneDescription: string): any[] {
    const modifiers: any[] = [];
    const description = sceneDescription.toLowerCase();

    if (description.includes('busy') || description.includes('bustling')) {
      modifiers.push({
        name: 'Bustling Activity',
        effect: 'Increased energy and alertness',
        moodImpact: 5,
        duration: 'persistent',
        source: 'environmental'
      });
    }

    if (description.includes('unfamiliar') || description.includes('strange')) {
      modifiers.push({
        name: 'Cultural Displacement',
        effect: 'Heightened awareness and uncertainty',
        moodImpact: -10,
        duration: 'persistent',
        source: 'social'
      });
    }

    return modifiers;
  }

  private extractNarrativeThreads(sceneDescription: string, storyArcs: any[]): any[] {
    const threads: any[] = [];

    // Create a thread for character adaptation/integration
    threads.push({
      title: 'World Integration',
      description: 'Character adapting to and understanding their new environment',
      category: 'character_development',
      priority: 'high',
      status: 'active',
      timeSensitive: false,
      urgencyLevel: 60,
      relatedCharacters: [],
      relatedLocations: [],
      relatedFactions: [],
      keyEvents: [],
      potentialOutcomes: ['Successful integration', 'Continued confusion', 'Cultural conflict'],
      playerInfluence: 90,
      consequences: [],
    });

    // If there are story arcs, create threads for them
    storyArcs.forEach(arc => {
      threads.push({
        title: arc.title || 'Story Arc Thread',
        description: arc.description || 'An ongoing story development',
        category: 'main_plot',
        priority: 'medium',
        status: 'dormant',
        timeSensitive: false,
        urgencyLevel: 40,
        relatedCharacters: [],
        relatedLocations: [],
        relatedFactions: [],
        keyEvents: [],
        potentialOutcomes: ['Arc progression', 'Arc delay', 'Arc modification'],
        playerInfluence: 70,
        consequences: [],
      });
    });

    return threads;
  }
}

// Export convenience function
export async function integrateScenarioGeneration(
  baseResult: any,
  context: ScenarioGenerationContext
): Promise<IntegratedScenarioResult> {
  const engine = new ScenarioIntegrationEngine(context);
  return await engine.integrateScenarioResult(baseResult);
}
