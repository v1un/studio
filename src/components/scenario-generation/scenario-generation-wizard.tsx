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
  GenerateQuestsAndArcsInput, GenerateQuestsAndArcsOutput,
  GenerateNPCsAndLoreInput, GenerateNPCsAndLoreOutput
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
    id: 'quests-arcs',
    name: 'Quests & Story Arcs',
    description: 'Designing initial quests and overarching story structure',
    status: 'pending',
    estimatedTime: '20-25 seconds',
  },
  {
    id: 'npcs-lore',
    name: 'NPCs & Lore Entries',
    description: 'Populating the world with characters and detailed lore',
    status: 'pending',
    estimatedTime: '20-25 seconds',
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
        case 'quests-arcs':
          result = await executeQuestsAndArcsPhase();
          break;
        case 'npcs-lore':
          result = await executeNPCsAndLorePhase();
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

    return await generateCharacterAndScene(input);
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

    return await generateCharacterSkills(input);
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

    return await generateItemsAndEquipment(input);
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

  const executeNPCsAndLorePhase = async (): Promise<GenerateNPCsAndLoreOutput> => {
    const { generateNPCsAndLore } = await import("@/ai/flows/generate-scenario-from-series");
    
    const characterSceneResult = generationData.phases.find(p => p.id === 'character-scene')?.result as GenerateCharacterAndSceneOutput;
    const skillsResult = generationData.phases.find(p => p.id === 'character-skills')?.result as GenerateCharacterSkillsOutput;
    
    if (!characterSceneResult || !skillsResult) {
      throw new Error("Previous phases must be completed first");
    }

    const input: GenerateNPCsAndLoreInput = {
      seriesName: generationData.seriesName,
      seriesPlotSummary: characterSceneResult.seriesPlotSummary,
      characterProfile: skillsResult.updatedCharacterProfile,
      sceneDescription: characterSceneResult.sceneDescription,
      currentLocation: characterSceneResult.currentLocation,
      usePremiumAI: generationData.usePremiumAI,
    };

    return await generateNPCsAndLore(input);
  };

  const finalizeScenario = async () => {
    // Combine all phase results into final scenario
    const characterSceneResult = generationData.phases.find(p => p.id === 'character-scene')?.result as GenerateCharacterAndSceneOutput;
    const skillsResult = generationData.phases.find(p => p.id === 'character-skills')?.result as GenerateCharacterSkillsOutput;
    const itemsResult = generationData.phases.find(p => p.id === 'items-equipment')?.result as GenerateItemsAndEquipmentOutput;
    const worldFactsResult = generationData.phases.find(p => p.id === 'world-facts')?.result as GenerateWorldFactsOutput;
    const questsResult = generationData.phases.find(p => p.id === 'quests-arcs')?.result as GenerateQuestsAndArcsOutput;
    const npcsLoreResult = generationData.phases.find(p => p.id === 'npcs-lore')?.result as GenerateNPCsAndLoreOutput;

    // Check if all required results are available
    if (!characterSceneResult || !skillsResult || !itemsResult || !worldFactsResult || !questsResult || !npcsLoreResult) {
      console.error('Missing phase results:', {
        characterSceneResult: !!characterSceneResult,
        skillsResult: !!skillsResult,
        itemsResult: !!itemsResult,
        worldFactsResult: !!worldFactsResult,
        questsResult: !!questsResult,
        npcsLoreResult: !!npcsLoreResult,
      });
      toast({
        title: "Error",
        description: "Not all phases have completed successfully. Please ensure all phases are completed before finalizing.",
        variant: "destructive",
      });
      return;
    }

    const finalResult = {
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
      trackedNPCs: npcsLoreResult.trackedNPCs,
      initialLoreEntries: npcsLoreResult.initialLoreEntries,
    };

    onComplete(finalResult);
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
