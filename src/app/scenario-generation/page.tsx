"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ScenarioGenerationWizard from "@/components/scenario-generation/scenario-generation-wizard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clearLorebook, initializeLorebook } from "@/lib/lore-manager";
import { generateUUID } from "@/lib/utils";
import type {
  GameSession,
  StoryTurn,
  DisplayMessage,
  StructuredStoryState,
  RawLoreEntry
} from "@/types/story";

const ACTIVE_SESSION_ID_KEY = "activeStoryForgeSessionId";
const SESSION_KEY_PREFIX = "storyForgeSession_";
const GM_AVATAR_PLACEHOLDER = "https://placehold.co/40x40.png";

function ScenarioGenerationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [showWizard, setShowWizard] = useState(false);
  const [formData, setFormData] = useState({
    seriesName: searchParams.get('series') || '',
    characterName: searchParams.get('character') || '',
    characterClass: searchParams.get('class') || '',
    usePremiumAI: searchParams.get('premium') === 'true',
  });

  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    setIsFormValid(formData.seriesName.trim().length > 0);
  }, [formData]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartGeneration = () => {
    if (!isFormValid) {
      toast({
        title: "Invalid Input",
        description: "Please provide at least a series name to begin scenario generation.",
        variant: "destructive",
      });
      return;
    }

    setShowWizard(true);
  };

  const handleGenerationComplete = async (finalResult: any) => {
    try {
      // Clear existing lorebook and initialize with new lore
      clearLorebook();
      if (finalResult.initialLoreEntries) {
        initializeLorebook(finalResult.initialLoreEntries as RawLoreEntry[]);
      }

      // Create initial GM message
      const initialGMMessage: DisplayMessage = {
        id: generateUUID(),
        speakerType: 'GM',
        speakerNameLabel: 'GAME-MASTER',
        speakerDisplayName: "admin",
        content: finalResult.sceneDescription,
        avatarSrc: GM_AVATAR_PLACEHOLDER,
        avatarHint: "wizard staff",
        isPlayer: false,
      };

      // Find first story arc
      const firstStoryArcId = finalResult.storyArcs.find((arc: any) => arc.order === 1)?.id;
      
      // Filter out player character from NPCs
      const filteredTrackedNPCs = finalResult.trackedNPCs.filter(
        (npc: any) => npc.name !== finalResult.characterProfile.name
      );

      // Create final story state
      const finalStoryState: StructuredStoryState = {
        character: finalResult.characterProfile, 
        currentLocation: finalResult.currentLocation,
        inventory: finalResult.inventory,
        equippedItems: finalResult.equippedItems,
        worldFacts: finalResult.worldFacts,
        storySummary: `The adventure begins for ${finalResult.characterProfile.name} in ${formData.seriesName}, at ${finalResult.currentLocation}. Initial scene: ${finalResult.sceneDescription.substring(0,100)}...`,
        quests: finalResult.quests,
        storyArcs: finalResult.storyArcs,
        currentStoryArcId: firstStoryArcId,
        trackedNPCs: filteredTrackedNPCs,
      };

      // Create first story turn
      const firstTurn: StoryTurn = {
        id: generateUUID(),
        messages: [initialGMMessage],
        storyStateAfterScene: finalStoryState,
      };

      // Create new game session
      const newSessionId = generateUUID();
      const newSession: GameSession = {
        id: newSessionId,
        storyPrompt: `Adventure in the world of: ${formData.seriesName}${formData.characterName ? ` as ${formData.characterName}` : ''}`,
        characterName: finalStoryState.character.name,
        storyHistory: [firstTurn],
        createdAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        seriesName: formData.seriesName,
        seriesStyleGuide: finalResult.seriesStyleGuide,
        seriesPlotSummary: finalResult.seriesPlotSummary,
        isPremiumSession: formData.usePremiumAI,
        allDataCorrectionWarnings: [],
      };

      // Save session to localStorage
      localStorage.setItem(`${SESSION_KEY_PREFIX}${newSession.id}`, JSON.stringify(newSession));
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, newSession.id);

      toast({
        title: `Adventure in ${formData.seriesName} Created!`,
        description: `Playing as ${newSession.characterName}. ${formData.usePremiumAI ? "(Premium AI Active)" : ""}`,
      });

      // Navigate to main story page
      router.push('/');

    } catch (error: any) {
      console.error("Failed to finalize scenario:", error);
      toast({
        title: "Error Finalizing Scenario",
        description: `Failed to create the game session: ${error.message || "Please try again."}`,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setShowWizard(false);
  };

  const handleBackToMain = () => {
    router.push('/');
  };

  if (showWizard) {
    return (
      <ScenarioGenerationWizard
        initialData={formData}
        onComplete={handleGenerationComplete}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Scenario Generation
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Create a rich, detailed adventure scenario step by step
          </p>
          <p className="text-sm text-muted-foreground">
            Our new multi-phase generation system ensures reliable creation without timeouts
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Configure Your Adventure</CardTitle>
            <CardDescription>
              Set up the basic parameters for your scenario. Each phase will be generated individually for maximum reliability.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="seriesName">Series/World Name *</Label>
              <Input
                id="seriesName"
                placeholder="e.g., Lord of the Rings, Star Wars, Cyberpunk 2077..."
                value={formData.seriesName}
                onChange={(e) => handleInputChange('seriesName', e.target.value)}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                The fictional universe or setting for your adventure
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="characterName">Character Name (Optional)</Label>
                <Input
                  id="characterName"
                  placeholder="Leave blank for AI to decide"
                  value={formData.characterName}
                  onChange={(e) => handleInputChange('characterName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="characterClass">Character Class/Role (Optional)</Label>
                <Input
                  id="characterClass"
                  placeholder="e.g., Warrior, Mage, Rogue..."
                  value={formData.characterClass}
                  onChange={(e) => handleInputChange('characterClass', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="space-y-1">
                <Label htmlFor="premiumAI" className="text-base font-medium">
                  Premium AI Generation
                </Label>
                <p className="text-sm text-muted-foreground">
                  Use advanced AI model for richer, more detailed content
                </p>
              </div>
              <Switch
                id="premiumAI"
                checked={formData.usePremiumAI}
                onCheckedChange={(checked) => handleInputChange('usePremiumAI', checked)}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                New Multi-Phase Generation
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• <strong>7 separate phases</strong> - each completes in under 30 seconds</li>
                <li>• <strong>Manual progression</strong> - review each phase before continuing</li>
                <li>• <strong>Error recovery</strong> - retry individual phases if needed</li>
                <li>• <strong>Progress saving</strong> - pause and resume generation anytime</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBackToMain}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Main
          </Button>
          
          <Button 
            onClick={handleStartGeneration}
            disabled={!isFormValid}
            size="lg"
            className="px-8"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Start Generation
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ScenarioGenerationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Sparkles className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading scenario generation...</p>
        </div>
      </div>
    }>
      <ScenarioGenerationContent />
    </Suspense>
  );
}
