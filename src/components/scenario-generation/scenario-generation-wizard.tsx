"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, Play, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type {
  GenerateCharacterAndSceneInput, GenerateCharacterAndSceneOutput,
  GenerateCharacterSkillsInput, GenerateCharacterSkillsOutput,
  GenerateItemsAndEquipmentInput, GenerateItemsAndEquipmentOutput,
  GenerateWorldFactsInput, GenerateWorldFactsOutput,
  GenerateQuestsAndArcsInput, GenerateQuestsAndArcsOutput
} from "@/ai/flows/generate-scenario-from-series";

export type ScenarioGenerationPhase = {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: any;
  error?: string;
  estimatedTime: string;
};

export type ScenarioGenerationData = {
  seriesName: string;
  characterName?: string;
  characterClass?: string;
  usePremiumAI: boolean;
  phases: ScenarioGenerationPhase[];
  currentPhaseIndex: number;
  isComplete: boolean;
};

interface ScenarioGenerationWizardProps {
  initialData: {
    seriesName: string;
    characterName?: string;
    characterClass?: string;
    usePremiumAI: boolean;
  };
  onComplete: (finalResult: any) => void;
  onCancel: () => void;
}

const INITIAL_PHASES: ScenarioGenerationPhase[] = [
  {
    id: 'character-scene',
    name: 'Character & Scene Creation',
    description: 'Creating your character profile, opening scene, and series foundation',
    status: 'pending',
    estimatedTime: '15-20 seconds',
  },
  {
    id: 'character-skills',
    name: 'Skills & Abilities',
    description: 'Generating character skills and special abilities',
    status: 'pending',
    estimatedTime: '10-15 seconds',
  },
  {
    id: 'items-equipment',
    name: 'Items & Equipment',
    description: 'Creating starting inventory and equipment',
    status: 'pending',
    estimatedTime: '15-20 seconds',
  },
  {
    id: 'world-facts',
    name: 'World Facts',
    description: 'Establishing key world facts and lore foundation',
    status: 'pending',
    estimatedTime: '8-12 seconds',
  },
  {
    id: 'lore-generation',
    name: 'Lore & World Building',
    description: 'Creating comprehensive world lore, character backgrounds, and cultural details',
    status: 'pending',
    estimatedTime: '25-30 seconds',
  },
  {
    id: 'quests-arcs',
    name: 'Quests & Story Arcs',
    description: 'Designing initial quests and overarching story structure',
    status: 'pending',
    estimatedTime: '20-25 seconds',
  },
  {
    id: 'npcs',
    name: 'NPCs & Characters',
    description: 'Populating the world with important characters and relationships',
    status: 'pending',
    estimatedTime: '15-20 seconds',
  },
];

export default function ScenarioGenerationWizard({ 
  initialData, 
  onComplete, 
  onCancel 
}: ScenarioGenerationWizardProps) {
  const [generationData, setGenerationData] = useState<ScenarioGenerationData>({
    ...initialData,
    phases: [...INITIAL_PHASES],
    currentPhaseIndex: 0,
    isComplete: false,
  });

  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const currentPhase = generationData.phases[generationData.currentPhaseIndex];
  const completedPhases = generationData.phases.filter(p => p.status === 'completed').length;
  const totalPhases = generationData.phases.length;
  const progressPercentage = (completedPhases / totalPhases) * 100;

  const updatePhaseStatus = (phaseId: string, status: ScenarioGenerationPhase['status'], result?: any, error?: string) => {
    setGenerationData(prev => ({
      ...prev,
      phases: prev.phases.map(phase => 
        phase.id === phaseId 
          ? { ...phase, status, result, error }
          : phase
      )
    }));
  };

  const executePhase = async (phase: ScenarioGenerationPhase) => {
    setIsRunning(true);
    updatePhaseStatus(phase.id, 'running');

    try {
      let result;
      
      switch (phase.id) {
        case 'character-scene':
          result = await executeCharacterAndScenePhase();
          break;
        case 'character-skills':
          result = await executeCharacterSkillsPhase();
          break;
        case 'items-equipment':
          result = await executeItemsAndEquipmentPhase();
          break;
        case 'world-facts':
          result = await executeWorldFactsPhase();
          break;
        case 'lore-generation':
          result = await executeLoreGenerationPhase();
          break;
        case 'quests-arcs':
          result = await executeQuestsAndArcsPhase();
          break;
        case 'npcs':
          result = await executeNPCsPhase();
          break;
        default:
          throw new Error(`Unknown phase: ${phase.id}`);
      }

      updatePhaseStatus(phase.id, 'completed', result);
      
      toast({
        title: "Phase Complete",
        description: `${phase.name} completed successfully!`,
      });

      // Move to next phase or complete
      if (generationData.currentPhaseIndex < totalPhases - 1) {
        setGenerationData(prev => ({
          ...prev,
          currentPhaseIndex: prev.currentPhaseIndex + 1
        }));
      } else {
        // All phases complete
        setGenerationData(prev => ({ ...prev, isComplete: true }));
        toast({
          title: "All Phases Complete!",
          description: "Click 'Complete Scenario' to finalize your adventure.",
        });
      }

    } catch (error: any) {
      console.error(`Phase ${phase.id} failed:`, error);
      updatePhaseStatus(phase.id, 'error', undefined, error.message);
      
      toast({
        title: "Phase Failed",
        description: `${phase.name} failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const executeCharacterAndScenePhase = async (): Promise<GenerateCharacterAndSceneOutput> => {
    const { generateCharacterAndScene } = await import("@/ai/flows/generate-scenario-from-series");

    const input: GenerateCharacterAndSceneInput = {
      seriesName: generationData.seriesName,
      characterNameInput: generationData.characterName,
      characterClassInput: generationData.characterClass,
      usePremiumAI: generationData.usePremiumAI,
    };

    const result = await generateCharacterAndScene(input);

    // Generate initial combat scenario for tactical preparation
    try {
      const { generateCombatScenario } = await import("@/ai/flows/combat-generation");
      const combatScenario = await generateCombatScenario({
        storyContext: result.sceneDescription,
        playerCharacter: result.characterProfile,
        currentLocation: result.currentLocation,
        storyState: null, // Will be initialized later
        combatTrigger: 'story_event',
        difficultyLevel: 'easy', // Starting scenario should be manageable
        usePremiumAI: generationData.usePremiumAI,
        specialRequirements: {
          maxEnemies: 2, // Keep initial combat simple
          environmentType: result.currentLocation,
        }
      });

      // Add combat scenario to result
      return {
        ...result,
        initialCombatScenario: combatScenario,
      };
    } catch (error) {
      console.warn('Combat scenario generation failed, continuing without it:', error);
      return result;
    }
  };

  const executeCharacterSkillsPhase = async (): Promise<GenerateCharacterSkillsOutput> => {
    const { generateCharacterSkills } = await import("@/ai/flows/generate-scenario-from-series");

    const characterSceneResult = generationData.phases.find(p => p.id === 'character-scene')?.result as GenerateCharacterAndSceneOutput;
    if (!characterSceneResult) throw new Error("Character & Scene phase must be completed first");

    const input: GenerateCharacterSkillsInput = {
      seriesName: generationData.seriesName,
      characterProfile: characterSceneResult.characterProfile,
      sceneDescription: characterSceneResult.sceneDescription,
      currentLocation: characterSceneResult.currentLocation,
      usePremiumAI: generationData.usePremiumAI,
    };

    const result = await generateCharacterSkills(input);

    // Initialize progression system for the character
    try {
      const { initializeCharacterProgression } = await import("@/lib/progression-engine");
      const { getSeriesConfig } = await import("@/lib/series-adapter");

      const seriesConfig = getSeriesConfig(generationData.seriesName);
      const enhancedCharacter = initializeCharacterProgression(result.updatedCharacterProfile);

      // Add series-appropriate skill trees based on character class
      const availableSkillTrees = determineSkillTreesForCharacter(
        enhancedCharacter.class || 'Adventurer',
        seriesConfig
      );

      return {
        ...result,
        updatedCharacterProfile: {
          ...enhancedCharacter,
          availableSkillTrees,
        },
        progressionSetup: {
          availableSkillTrees,
          progressionStyle: seriesConfig.progressionStyle,
          difficultyProfile: seriesConfig.difficultyProfile,
        },
      };
    } catch (error) {
      console.warn('Progression system initialization failed, continuing without it:', error);
      return result;
    }
  };

  const determineSkillTreesForCharacter = (characterClass: string, seriesConfig: any): string[] => {
    // Basic skill tree assignment based on character class and series
    const baseSkillTrees = ['combat_basics', 'survival_skills'];

    // Add class-specific skill trees
    const classLower = characterClass.toLowerCase();
    if (classLower.includes('mage') || classLower.includes('magic')) {
      baseSkillTrees.push('magic_mastery');
    }
    if (classLower.includes('warrior') || classLower.includes('fighter')) {
      baseSkillTrees.push('weapon_mastery');
    }
    if (classLower.includes('rogue') || classLower.includes('thief')) {
      baseSkillTrees.push('stealth_skills');
    }
    if (classLower.includes('healer') || classLower.includes('cleric')) {
      baseSkillTrees.push('healing_arts');
    }

    // Add series-specific skill trees
    if (seriesConfig.name === 'Re:Zero') {
      baseSkillTrees.push('spirit_magic', 'political_intrigue');
    } else if (seriesConfig.name === 'Attack on Titan') {
      baseSkillTrees.push('odm_gear', 'military_tactics');
    } else if (seriesConfig.name === 'My Hero Academia') {
      baseSkillTrees.push('quirk_development', 'hero_techniques');
    }

    return baseSkillTrees;
  };

  const executeItemsAndEquipmentPhase = async (): Promise<GenerateItemsAndEquipmentOutput> => {
    const { generateItemsAndEquipment } = await import("@/ai/flows/generate-scenario-from-series");

    const characterSceneResult = generationData.phases.find(p => p.id === 'character-scene')?.result as GenerateCharacterAndSceneOutput;
    const skillsResult = generationData.phases.find(p => p.id === 'character-skills')?.result as GenerateCharacterSkillsOutput;

    if (!characterSceneResult || !skillsResult) {
      throw new Error("Previous phases must be completed first");
    }

    const input: GenerateItemsAndEquipmentInput = {
      seriesName: generationData.seriesName,
      characterProfile: skillsResult.updatedCharacterProfile,
      sceneDescription: characterSceneResult.sceneDescription,
      currentLocation: characterSceneResult.currentLocation,
      usePremiumAI: generationData.usePremiumAI,
    };

    const result = await generateItemsAndEquipment(input);

    // Generate crafting system setup
    try {
      const craftingSetup = await generateCraftingSystemSetup({
        seriesName: generationData.seriesName,
        currentLocation: characterSceneResult.currentLocation,
        characterClass: skillsResult.updatedCharacterProfile.class || 'Adventurer',
        inventory: result.inventory,
      });

      return {
        ...result,
        craftingSetup,
      };
    } catch (error) {
      console.warn('Crafting system setup failed, continuing without it:', error);
      return result;
    }
  };

  const generateCraftingSystemSetup = async (params: {
    seriesName: string;
    currentLocation: string;
    characterClass: string;
    inventory: any[];
  }) => {
    const { getSeriesConfig } = await import("@/lib/series-adapter");
    const seriesConfig = getSeriesConfig(params.seriesName);

    // Generate basic crafting recipes based on series and location
    const basicRecipes = generateBasicRecipes(params.seriesName, params.characterClass);

    // Determine available crafting stations based on location
    const availableStations = determineCraftingStations(params.currentLocation, seriesConfig);

    // Generate starting crafting materials
    const craftingMaterials = generateStartingMaterials(params.inventory, seriesConfig);

    return {
      availableRecipes: basicRecipes,
      craftingStations: availableStations,
      craftingMaterials,
      craftingTutorial: generateCraftingTutorial(params.seriesName),
    };
  };

  const generateBasicRecipes = (seriesName: string, characterClass: string) => {
    const baseRecipes = [
      {
        id: 'basic_healing_potion',
        name: 'Basic Healing Potion',
        description: 'A simple healing potion that restores health',
        materials: [{ name: 'Healing Herb', quantity: 2 }, { name: 'Water', quantity: 1 }],
        result: { name: 'Healing Potion', quantity: 1 },
        difficulty: 'easy',
      },
      {
        id: 'simple_weapon_repair',
        name: 'Simple Weapon Repair',
        description: 'Basic weapon maintenance and repair',
        materials: [{ name: 'Metal Scraps', quantity: 1 }, { name: 'Oil', quantity: 1 }],
        result: { name: 'Weapon Durability Restoration', quantity: 1 },
        difficulty: 'easy',
      },
    ];

    // Add series-specific recipes
    if (seriesName === 'Re:Zero') {
      baseRecipes.push({
        id: 'spirit_crystal_polish',
        name: 'Spirit Crystal Polish',
        description: 'Enhances spirit magic conductivity',
        materials: [{ name: 'Spirit Crystal Fragment', quantity: 1 }, { name: 'Moonwater', quantity: 1 }],
        result: { name: 'Polished Spirit Crystal', quantity: 1 },
        difficulty: 'medium',
      });
    } else if (seriesName === 'Attack on Titan') {
      baseRecipes.push({
        id: 'odm_gear_maintenance',
        name: 'ODM Gear Maintenance',
        description: 'Maintains and repairs ODM gear components',
        materials: [{ name: 'Steel Wire', quantity: 2 }, { name: 'Gas Canister', quantity: 1 }],
        result: { name: 'ODM Gear Repair Kit', quantity: 1 },
        difficulty: 'medium',
      });
    }

    return baseRecipes;
  };

  const determineCraftingStations = (location: string, seriesConfig: any) => {
    const baseStations = ['Basic Workbench', 'Campfire'];

    // Add location-specific stations
    const locationLower = location.toLowerCase();
    if (locationLower.includes('town') || locationLower.includes('city')) {
      baseStations.push('Blacksmith Forge', 'Alchemy Lab');
    }
    if (locationLower.includes('forest') || locationLower.includes('wilderness')) {
      baseStations.push('Survival Kit', 'Natural Crafting Area');
    }

    return baseStations;
  };

  const generateStartingMaterials = (inventory: any[], seriesConfig: any) => {
    // Extract crafting materials from existing inventory
    const materials = inventory.filter(item =>
      item.description?.toLowerCase().includes('material') ||
      item.description?.toLowerCase().includes('component') ||
      item.name?.toLowerCase().includes('herb') ||
      item.name?.toLowerCase().includes('crystal')
    );

    // Add basic starting materials if none exist
    if (materials.length === 0) {
      materials.push(
        { name: 'Basic Materials', quantity: 5, description: 'Common crafting materials' },
        { name: 'Healing Herbs', quantity: 3, description: 'Natural healing ingredients' }
      );
    }

    return materials;
  };

  const generateCraftingTutorial = (seriesName: string) => {
    return {
      title: `Crafting in ${seriesName}`,
      steps: [
        'Gather materials from your environment and defeated enemies',
        'Find or access appropriate crafting stations',
        'Select a recipe that matches your available materials',
        'Follow the crafting process to create new items',
        'Experiment with different combinations to discover new recipes',
      ],
      tips: [
        'Higher quality materials produce better results',
        'Some recipes require specific crafting stations',
        'Crafting skills improve with practice',
        'Save rare materials for important recipes',
      ],
    };
  };

  const executeWorldFactsPhase = async (): Promise<GenerateWorldFactsOutput> => {
    const { generateWorldFacts } = await import("@/ai/flows/generate-scenario-from-series");
    
    const characterSceneResult = generationData.phases.find(p => p.id === 'character-scene')?.result as GenerateCharacterAndSceneOutput;
    const skillsResult = generationData.phases.find(p => p.id === 'character-skills')?.result as GenerateCharacterSkillsOutput;
    
    if (!characterSceneResult || !skillsResult) {
      throw new Error("Previous phases must be completed first");
    }

    const input: GenerateWorldFactsInput = {
      seriesName: generationData.seriesName,
      characterProfile: skillsResult.updatedCharacterProfile,
      sceneDescription: characterSceneResult.sceneDescription,
      currentLocation: characterSceneResult.currentLocation,
      usePremiumAI: generationData.usePremiumAI,
    };

    return await generateWorldFacts(input);
  };

  const executeQuestsAndArcsPhase = async (): Promise<GenerateQuestsAndArcsOutput> => {
    const { generateQuestsAndArcs } = await import("@/ai/flows/generate-scenario-from-series");
    
    const characterSceneResult = generationData.phases.find(p => p.id === 'character-scene')?.result as GenerateCharacterAndSceneOutput;
    const skillsResult = generationData.phases.find(p => p.id === 'character-skills')?.result as GenerateCharacterSkillsOutput;
    
    if (!characterSceneResult || !skillsResult) {
      throw new Error("Previous phases must be completed first");
    }

    const input: GenerateQuestsAndArcsInput = {
      seriesName: generationData.seriesName,
      seriesPlotSummary: characterSceneResult.seriesPlotSummary,
      characterProfile: skillsResult.updatedCharacterProfile,
      sceneDescription: characterSceneResult.sceneDescription,
      currentLocation: characterSceneResult.currentLocation,
      characterNameInput: generationData.characterName,
      usePremiumAI: generationData.usePremiumAI,
    };

    return await generateQuestsAndArcs(input);
  };

  const executeLoreGenerationPhase = async () => {
    const { generateLoreEntries } = await import("@/ai/flows/generate-scenario-from-series");

    const characterSceneResult = generationData.phases.find(p => p.id === 'character-scene')?.result as GenerateCharacterAndSceneOutput;
    const skillsResult = generationData.phases.find(p => p.id === 'character-skills')?.result as GenerateCharacterSkillsOutput;
    const worldFactsResult = generationData.phases.find(p => p.id === 'world-facts')?.result as GenerateWorldFactsOutput;

    if (!characterSceneResult || !skillsResult || !worldFactsResult) {
      throw new Error("Previous phases must be completed first");
    }

    const input = {
      seriesName: generationData.seriesName,
      seriesPlotSummary: characterSceneResult.seriesPlotSummary,
      characterProfile: skillsResult.updatedCharacterProfile,
      sceneDescription: characterSceneResult.sceneDescription,
      currentLocation: characterSceneResult.currentLocation,
      worldFacts: worldFactsResult.worldFacts,
      usePremiumAI: generationData.usePremiumAI,
    };

    return await generateLoreEntries(input);
  };

  const executeNPCsPhase = async () => {
    const { generateNPCs } = await import("@/ai/flows/generate-scenario-from-series");

    const characterSceneResult = generationData.phases.find(p => p.id === 'character-scene')?.result as GenerateCharacterAndSceneOutput;
    const skillsResult = generationData.phases.find(p => p.id === 'character-skills')?.result as GenerateCharacterSkillsOutput;
    const loreResult = generationData.phases.find(p => p.id === 'lore-generation')?.result;

    if (!characterSceneResult || !skillsResult || !loreResult) {
      throw new Error("Previous phases must be completed first");
    }

    const input = {
      seriesName: generationData.seriesName,
      seriesPlotSummary: characterSceneResult.seriesPlotSummary,
      characterProfile: skillsResult.updatedCharacterProfile,
      sceneDescription: characterSceneResult.sceneDescription,
      currentLocation: characterSceneResult.currentLocation,
      loreEntries: loreResult.loreEntries,
      usePremiumAI: generationData.usePremiumAI,
    };

    return await generateNPCs(input);
  };

  const finalizeScenario = async () => {
    // Combine all phase results into final scenario
    const characterSceneResult = generationData.phases.find(p => p.id === 'character-scene')?.result as GenerateCharacterAndSceneOutput;
    const skillsResult = generationData.phases.find(p => p.id === 'character-skills')?.result as GenerateCharacterSkillsOutput;
    const itemsResult = generationData.phases.find(p => p.id === 'items-equipment')?.result as GenerateItemsAndEquipmentOutput;
    const worldFactsResult = generationData.phases.find(p => p.id === 'world-facts')?.result as GenerateWorldFactsOutput;
    const loreResult = generationData.phases.find(p => p.id === 'lore-generation')?.result;
    const questsResult = generationData.phases.find(p => p.id === 'quests-arcs')?.result as GenerateQuestsAndArcsOutput;
    const npcsResult = generationData.phases.find(p => p.id === 'npcs')?.result;

    // Check if all required results are available
    if (!characterSceneResult || !skillsResult || !itemsResult || !worldFactsResult || !loreResult || !questsResult || !npcsResult) {
      console.error('Missing phase results:', {
        characterSceneResult: !!characterSceneResult,
        skillsResult: !!skillsResult,
        itemsResult: !!itemsResult,
        worldFactsResult: !!worldFactsResult,
        loreResult: !!loreResult,
        questsResult: !!questsResult,
        npcsResult: !!npcsResult,
      });
      toast({
        title: "Error",
        description: "Not all phases have completed successfully. Please ensure all phases are completed before finalizing.",
        variant: "destructive",
      });
      return;
    }

    // Use the comprehensive integration engine
    try {
      const { integrateScenarioGeneration } = await import("@/lib/scenario-integration-engine");

      // Create base result from all phases
      const baseResult = {
        sceneDescription: characterSceneResult.sceneDescription,
        characterProfile: skillsResult.updatedCharacterProfile,
        currentLocation: characterSceneResult.currentLocation,
        inventory: itemsResult.inventory,
        equippedItems: itemsResult.equippedItems,
        worldFacts: worldFactsResult.worldFacts,
        seriesStyleGuide: characterSceneResult.seriesStyleGuide,
        seriesPlotSummary: characterSceneResult.seriesPlotSummary,
        quests: questsResult.quests,
        storyArcs: questsResult.storyArcs,
        trackedNPCs: npcsResult.trackedNPCs,
        initialLoreEntries: loreResult.loreEntries,
        // Include any additional integrations from phases
        initialCombatScenario: characterSceneResult.initialCombatScenario,
        progressionSetup: skillsResult.progressionSetup,
        craftingSetup: itemsResult.craftingSetup,
      };

      // Create integration context
      const integrationContext = {
        seriesName: generationData.seriesName,
        characterName: generationData.characterName,
        characterClass: generationData.characterClass,
        usePremiumAI: generationData.usePremiumAI,
      };

      // Apply comprehensive integration
      const integratedResult = await integrateScenarioGeneration(baseResult, integrationContext);

      // Validate the integrated scenario
      try {
        const { validateScenario } = await import("@/lib/scenario-validation");
        const validationResult = await validateScenario(integratedResult);

        console.log('Scenario validation result:', validationResult);

        // Show validation results
        if (validationResult.isValid) {
          toast({
            title: "Scenario Generated Successfully",
            description: `Quality Score: ${validationResult.score}/100. All systems integrated.`,
            variant: "default",
          });
        } else {
          toast({
            title: "Scenario Generated with Issues",
            description: `Quality Score: ${validationResult.score}/100. ${validationResult.errors.length} errors, ${validationResult.warnings.length} warnings.`,
            variant: "destructive",
          });
        }

        // Add validation results to the final result
        const finalResult = {
          ...integratedResult,
          validationResult,
        };

        onComplete(finalResult);
      } catch (validationError) {
        console.warn('Validation failed, proceeding without validation:', validationError);

        // Show integration warnings if any
        if (integratedResult.integrationWarnings.length > 0) {
          console.warn('Integration warnings:', integratedResult.integrationWarnings);
          toast({
            title: "Integration Warnings",
            description: `${integratedResult.integrationWarnings.length} warnings during integration. Check console for details.`,
            variant: "default",
          });
        }

        // Show series compatibility warnings if any
        if (integratedResult.seriesCompatibility.length > 0) {
          console.warn('Series compatibility warnings:', integratedResult.seriesCompatibility);
          toast({
            title: "Series Compatibility",
            description: `${integratedResult.seriesCompatibility.length} compatibility notes. Check console for details.`,
            variant: "default",
          });
        }

        onComplete(integratedResult);
      }
    } catch (error) {
      console.error('Integration failed:', error);
      toast({
        title: "Integration Error",
        description: "Failed to integrate all systems. Some features may not be available.",
        variant: "destructive",
      });

      // Fallback to basic result
      const fallbackResult = {
        sceneDescription: characterSceneResult.sceneDescription,
        characterProfile: skillsResult.updatedCharacterProfile,
        currentLocation: characterSceneResult.currentLocation,
        inventory: itemsResult.inventory,
        equippedItems: itemsResult.equippedItems,
        worldFacts: worldFactsResult.worldFacts,
        seriesStyleGuide: characterSceneResult.seriesStyleGuide,
        seriesPlotSummary: characterSceneResult.seriesPlotSummary,
        quests: questsResult.quests,
        storyArcs: questsResult.storyArcs,
        trackedNPCs: npcsResult.trackedNPCs,
        initialLoreEntries: loreResult.loreEntries,
      };

      onComplete(fallbackResult);
    }
  };

  const retryPhase = (phaseId: string) => {
    const phaseIndex = generationData.phases.findIndex(p => p.id === phaseId);
    if (phaseIndex !== -1) {
      setGenerationData(prev => ({
        ...prev,
        currentPhaseIndex: phaseIndex,
        phases: prev.phases.map(phase => 
          phase.id === phaseId 
            ? { ...phase, status: 'pending', error: undefined, result: undefined }
            : phase
        )
      }));
    }
  };

  const canExecuteCurrentPhase = () => {
    if (!currentPhase) return false;
    if (isRunning) return false;
    if (currentPhase.status === 'completed') return false;
    
    // Check if previous phases are completed
    for (let i = 0; i < generationData.currentPhaseIndex; i++) {
      if (generationData.phases[i].status !== 'completed') {
        return false;
      }
    }
    
    return true;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Scenario Generation</h1>
        <p className="text-muted-foreground">
          Creating your adventure in <span className="font-semibold">{generationData.seriesName}</span>
          {generationData.characterName && (
            <span> as <span className="font-semibold">{generationData.characterName}</span></span>
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Generation Progress</span>
            <Badge variant={generationData.isComplete ? "default" : "secondary"}>
              {completedPhases} / {totalPhases} Complete
            </Badge>
          </CardTitle>
          <CardDescription>
            Each phase creates a different aspect of your scenario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercentage} className="mb-4" />
          
          <div className="space-y-4">
            {generationData.phases.map((phase, index) => (
              <div 
                key={phase.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  index === generationData.currentPhaseIndex ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {phase.status === 'completed' && (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    )}
                    {phase.status === 'running' && (
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    )}
                    {phase.status === 'error' && (
                      <AlertCircle className="w-6 h-6 text-red-500" />
                    )}
                    {phase.status === 'pending' && (
                      <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">{phase.name}</h3>
                    <p className="text-sm text-muted-foreground">{phase.description}</p>
                    {phase.status === 'error' && phase.error && (
                      <p className="text-sm text-red-500 mt-1">Error: {phase.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {phase.estimatedTime}
                  </Badge>
                  
                  {phase.status === 'error' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retryPhase(phase.id)}
                      disabled={isRunning}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Retry
                    </Button>
                  )}
                  
                  {index === generationData.currentPhaseIndex && 
                   phase.status === 'pending' && 
                   canExecuteCurrentPhase() && (
                    <Button
                      onClick={() => executePhase(phase)}
                      disabled={isRunning}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start Phase
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isRunning}>
          Cancel
        </Button>
        
        {generationData.isComplete && (
          <Button onClick={() => finalizeScenario()}>
            Complete Scenario
          </Button>
        )}
      </div>
    </div>
  );
}
