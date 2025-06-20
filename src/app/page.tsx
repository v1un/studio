
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  generateScenarioFoundation,
  generateScenarioNarrativeElements,
  generateNextScene,
  fleshOutStoryArcQuests as callFleshOutStoryArcQuests,
  discoverNextStoryArc as callDiscoverNextStoryArc,
  updateCharacterDescription as callUpdateCharacterDescription,
  generateBridgingQuest as callGenerateBridgingQuest,
  simpleTestAction
} from "@/lib/scenario-api";

import type {
    GenerateScenarioFoundationInput, GenerateScenarioFoundationOutput,
    GenerateScenarioNarrativeElementsInput, GenerateScenarioNarrativeElementsOutput,
    AIMessageSegment, DisplayMessage,
    FleshOutStoryArcQuestsInput, FleshOutStoryArcQuestsOutput,
    DiscoverNextStoryArcInput, DiscoverNextStoryArcOutput,
    UpdateCharacterDescriptionInput, UpdateCharacterDescriptionOutput,
    GenerateBridgingQuestInput, GenerateBridgingQuestOutput,
    CombatHelperInfo, CombatEventLogEntry,
    DescribedEvent, // Generic DescribedEvent
    HealthChangeEvent, ManaChangeEvent, XPChangeEvent, LevelUpEvent, CurrencyChangeEvent, LanguageSkillChangeEvent, ItemFoundEvent, ItemLostEvent, ItemUsedEvent, ItemEquippedEvent, ItemUnequippedEvent, QuestAcceptedEvent, QuestObjectiveUpdateEvent, QuestCompletedEvent, QuestFailedEvent, NPCRelationshipChangeEvent, NPCStateChangeEvent, NewNPCIntroducedEvent, WorldFactAddedEvent, WorldFactRemovedEvent, WorldFactUpdatedEvent, SkillLearnedEvent, // Specific event types
    CharacterProfile, EquipmentSlot, Item as ItemType, StructuredStoryState, Quest, NPCProfile, StoryArc,
    StatModifier, RawLoreEntry, TemporaryEffect, ActiveEffect, StoryTurn, GameSession
} from "@/types/story";
import { produce } from "immer";

import InitialPromptForm from "@/components/story-forge/initial-prompt-form";
import StoryDisplay from "@/components/story-forge/story-display";
import UserInputForm from "@/components/story-forge/user-input-form";
import StoryControls from "@/components/story-forge/story-controls";
import FloatingInputForm from "@/components/story-forge/floating-input-form";
import ImmersiveStoryDisplay from "@/components/story-forge/immersive-story-display";
import SmartInputToggle from "@/components/story-forge/smart-input-toggle";
import ImmersiveHelpOverlay from "@/components/story-forge/immersive-help-overlay";
import CharacterSheet from "@/components/story-forge/character-sheet";
import MinimalCharacterStatus from "@/components/story-forge/minimal-character-status";
import EnhancedCharacterStatus from "@/components/enhanced-tracking/enhanced-character-status";
import JournalDisplay from "@/components/story-forge/journal-display";
import LorebookDisplay from "@/components/story-forge/lorebook-display";
import NPCTrackerDisplay from "@/components/story-forge/npc-tracker-display";
import { InventoryManagerWrapper } from "@/components/inventory/InventoryManagerWrapper";
import DataCorrectionLogDisplay from "@/components/story-forge/data-correction-log-display";



import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, BookUser, StickyNote, Library, UsersIcon, BookPlus, MessageSquareDashedIcon, AlertTriangleIcon, ClipboardListIcon, TestTubeIcon, Milestone, SearchIcon, InfoIcon, EditIcon, BookmarkIcon, CompassIcon, TrendingUp, PackageIcon, Settings, Moon, Sun } from "lucide-react";
import { EnhancedLoading } from "@/components/ui/enhanced-loading";
import { ThemeToggle } from "@/components/ui/theme-provider";
import { initializeLorebook, clearLorebook } from "@/lib/lore-manager";
import { generateUUID } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { migrateToEnhancedState, initializeEnhancedStoryState } from "@/lib/enhanced-state-manager";
import { generateCombatScenario, createPlayerCombatParticipant } from "@/lib/combat-api";
import type { CombatState, CombatParticipant } from "@/types/combat";
import CombatInterface from "@/components/combat/CombatInterface";
import {
  checkLevelUp,
  processLevelUp,
  initializeCharacterProgression,
  calculateDerivedStats
} from "@/lib/progression-engine";
import ProgressionManager from "@/components/progression/progression-manager";


const ACTIVE_SESSION_ID_KEY = "activeStoryForgeSessionId";
const SESSION_KEY_PREFIX = "storyForgeSession_";

const GM_AVATAR_PLACEHOLDER = "https://placehold.co/40x40.png";
const PLAYER_AVATAR_PLACEHOLDER = "https://placehold.co/40x40.png";

const scenarioGenerationSteps = [
  "Phase 1: Laying Scenario Foundation...",
  "Generating character concepts and opening scene...",
  "Establishing core world details and items...",
  "Phase 2: Weaving Narrative Arcs & Elements...",
  "Crafting initial story arcs and main quests...",
  "Populating the world with notable figures...",
  "Compiling a rich tapestry of lore entries...",
  "Finalizing scenario details..."
];

// Helper function to create system messages
function createSystemMessage(content: string, type: DisplayMessage['speakerType'] = 'SystemHelper', label?: string): DisplayMessage {
  return {
    id: generateUUID(),
    speakerType: type,
    speakerNameLabel: label || (type === 'ArcNotification' ? 'STORY EVENT' : 'SYSTEM EVENT'),
    content: content,
    avatarSrc: undefined,
    avatarHint: type === 'ArcNotification' ? "milestone flag" : "system gear",
    isPlayer: false,
  };
}


// Helper function to calculate effective character stats including item bonuses and temporary effects
function calculateEffectiveCharacterProfile(
  baseProfile: CharacterProfile,
  equippedItems: Partial<Record<EquipmentSlot, ItemType | null>>
): CharacterProfile {
  const effectiveProfile = produce(baseProfile, draft => {
    // Ensure activeTemporaryEffects is an array
    draft.activeTemporaryEffects = draft.activeTemporaryEffects || [];

    const applyModifier = (statName: keyof CharacterProfile, value: number, type: 'add' | 'multiply') => {
        const numericStats: (keyof CharacterProfile)[] = [
            'health', 'maxHealth', 'mana', 'maxMana',
            'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
            'level', 'experiencePoints', 'experienceToNextLevel', 'currency',
            'languageReading', 'languageSpeaking'
        ];
        if (numericStats.includes(statName)) {
            let currentValue = (draft[statName] as number | undefined) ?? 0;
            if (type === 'add') {
                currentValue += value;
            } else if (type === 'multiply') {
                currentValue *= value;
            }
            (draft[statName] as number) = currentValue;
        } else {
            console.warn(`calculateEffectiveCharacterProfile: Attempted to modify non-numeric or unknown stat '${String(statName)}'`);
        }
    };

    // Apply permanent effects from equipped items
    for (const slot in equippedItems) {
        const item = equippedItems[slot as EquipmentSlot];
        if (item && item.activeEffects) {
            for (const effect of item.activeEffects) {
                if (effect.type === 'stat_modifier' && effect.duration === 'permanent_while_equipped' && effect.statModifiers) {
                    for (const modifier of effect.statModifiers) {
                        applyModifier(modifier.stat as keyof CharacterProfile, modifier.value, modifier.type);
                    }
                }
            }
        }
    }

    // Apply temporary effects
    if (draft.activeTemporaryEffects) {
        for (const tempEffect of draft.activeTemporaryEffects) {
            if (tempEffect.type === 'stat_modifier' && tempEffect.statModifiers) {
                for (const modifier of tempEffect.statModifiers) {
                     applyModifier(modifier.stat as keyof CharacterProfile, modifier.value, modifier.type);
                }
            }
        }
    }


    // Ensure health and mana are within bounds
    if (draft.maxHealth <= 0) draft.maxHealth = 1;
    if (draft.health > draft.maxHealth) draft.health = draft.maxHealth;
    if (draft.health < 0) draft.health = 0;

    if (draft.mana !== undefined && draft.maxMana !== undefined) {
        if (draft.maxMana <= 0 && draft.mana > 0) draft.maxMana = draft.mana;
        else if (draft.maxMana <=0) draft.maxMana = 0;
        if (draft.mana > draft.maxMana) draft.mana = draft.maxMana;
        if (draft.mana < 0) draft.mana = 0;
    } else if (draft.mana !== undefined && draft.maxMana === undefined) {
        draft.maxMana = Math.max(0, draft.mana);
    }
  });

  return effectiveProfile;
}


export default function StoryForgePage() {
  const [storyHistory, setStoryHistory] = useState<StoryTurn[]>([]);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingInteraction, setIsLoadingInteraction] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingType, setLoadingType] = useState<'scenario' | 'nextScene' | 'arcLoad' | 'discoveringArc' | 'updatingProfile' | 'bridgingContent' | null>(null);
  const [activeTab, setActiveTab] = useState("story");
  const [activeCombatState, setActiveCombatState] = useState<CombatState | null>(null);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [showFloatingInput, setShowFloatingInput] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to exit immersive mode or close floating input
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showFloatingInput) {
          setShowFloatingInput(false);
        } else if (isImmersiveMode) {
          setIsImmersiveMode(false);
        }
        return;
      }

      // Ctrl/Cmd + Enter to open floating input
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        setShowFloatingInput(true);
      }

      // F11 or Ctrl/Cmd + Shift + F for immersive mode toggle
      if (e.key === 'F11' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F')) {
        e.preventDefault();
        setIsImmersiveMode(!isImmersiveMode);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isImmersiveMode, showFloatingInput]);
  const [showCombatInterface, setShowCombatInterface] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (isLoadingInteraction && loadingType === 'scenario') {
        setLoadingMessage(scenarioGenerationSteps[loadingStep]);
    } else if (isLoadingInteraction && loadingType === 'nextScene') {
        setLoadingMessage("AI is crafting the next part of your tale...");
    } else if (isLoadingInteraction && loadingType === 'arcLoad') {
        setLoadingMessage("The next story arc of your saga is unfolding...");
    } else if (isLoadingInteraction && loadingType === 'discoveringArc') {
        setLoadingMessage("AI is searching for the next chapter in your destiny...");
    } else if (isLoadingInteraction && loadingType === 'updatingProfile') {
        setLoadingMessage("Reflecting on your journey to update your character profile...");
    } else if (isLoadingInteraction && loadingType === 'bridgingContent') {
        setLoadingMessage("The story continues, exploring new possibilities...");
    } else {
      setLoadingMessage(null);
    }

    if (isLoadingInteraction && loadingType === 'scenario' && loadingMessage !== scenarioGenerationSteps[loadingStep]) {
        setLoadingMessage(scenarioGenerationSteps[loadingStep]);
    }


    return () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    };
  }, [isLoadingInteraction, loadingType, loadingStep, loadingMessage]);


  const loadSession = useCallback(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setIsLoadingPage(false);
      return;
    }

    setIsLoadingPage(true);
    const activeId = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
    if (activeId) {
      const sessionData = localStorage.getItem(`${SESSION_KEY_PREFIX}${activeId}`);
      if (sessionData) {
        try {
          const session: GameSession = JSON.parse(sessionData);
          if (session.storyHistory && session.storyHistory.every(turn => Array.isArray(turn.messages))) {
            // Migrate story states to enhanced format
            const migratedStoryHistory = session.storyHistory.map(turn => ({
              ...turn,
              storyStateAfterScene: migrateToEnhancedState(turn.storyStateAfterScene)
            }));

            setStoryHistory(migratedStoryHistory);
            setCurrentSession(session);

            // Save migrated session back to localStorage
            const migratedSession = {
              ...session,
              storyHistory: migratedStoryHistory
            };
            localStorage.setItem(`${SESSION_KEY_PREFIX}${activeId}`, JSON.stringify(migratedSession));
          } else {
            console.warn("CLIENT: Old session format detected or missing story history. Clearing.");
            localStorage.removeItem(`${SESSION_KEY_PREFIX}${activeId}`);
            localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
            setCurrentSession(null);
            setStoryHistory([]);
          }
        } catch (e) {
          console.error("CLIENT: Failed to parse saved session:", e);
          localStorage.removeItem(`${SESSION_KEY_PREFIX}${activeId}`);
          localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
          setCurrentSession(null);
          setStoryHistory([]);
        }
      } else {
        localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
        setCurrentSession(null);
        setStoryHistory([]);
      }
    } else {
       setCurrentSession(null);
       setStoryHistory([]);
    }
    setIsLoadingPage(false);
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (typeof window === 'undefined' || isLoadingPage || !currentSession) return;

    const sessionToSave: GameSession = {
        ...currentSession,
        storyHistory: storyHistory,
        lastPlayedAt: new Date().toISOString(),
      };

    const sessionKey = `${SESSION_KEY_PREFIX}${currentSession.id}`;
    localStorage.setItem(sessionKey, JSON.stringify(sessionToSave));

  }, [storyHistory, currentSession, isLoadingPage]);


  const currentStoryState = useMemo(() => storyHistory.length > 0 ? storyHistory[storyHistory.length - 1].storyStateAfterScene : null, [storyHistory]);
  const baseCharacterProfile = useMemo(() => currentStoryState?.character, [currentStoryState]);
  const effectiveCharacterProfileForAI = useMemo(() => {
    if (!baseCharacterProfile || !currentStoryState?.equippedItems) {
      return baseCharacterProfile;
    }
    return calculateEffectiveCharacterProfile(
      baseCharacterProfile,
      currentStoryState.equippedItems
    );
  }, [baseCharacterProfile, currentStoryState?.equippedItems]);


  const handleStartStoryFromSeries = async (data: { seriesName: string; characterName?: string; characterClass?: string; usePremiumAI: boolean }) => {
    setIsLoadingInteraction(true);
    setLoadingType('scenario');
    setLoadingStep(0);

    let foundationResult: GenerateScenarioFoundationOutput;
    let narrativeElementsResult: GenerateScenarioNarrativeElementsOutput;

    try {
      setLoadingStep(scenarioGenerationSteps.findIndex(s => s.includes("Phase 1")));
      const foundationInput: GenerateScenarioFoundationInput = {
        seriesName: data.seriesName,
        characterNameInput: data.characterName,
        characterClassInput: data.characterClass,
        usePremiumAI: data.usePremiumAI,
      };
      console.log("CLIENT: Starting scenario generation - Step 1: Foundation. Input:", foundationInput);
      foundationResult = await generateScenarioFoundation(foundationInput);
      console.log("CLIENT: Scenario Foundation generation successful. Result:", foundationResult);
      setLoadingStep(scenarioGenerationSteps.findIndex(s => s.includes("character concepts")) || 1);


      setLoadingStep(scenarioGenerationSteps.findIndex(s => s.includes("Phase 2")) || 3);
      const narrativeElementsInput: GenerateScenarioNarrativeElementsInput = {
        seriesName: data.seriesName,
        seriesPlotSummary: foundationResult.seriesPlotSummary,
        characterProfile: foundationResult.characterProfile, 
        sceneDescription: foundationResult.sceneDescription,
        currentLocation: foundationResult.currentLocation,
        characterNameInput: data.characterName,
        usePremiumAI: data.usePremiumAI,
      };
      console.log("CLIENT: Starting scenario generation - Step 2: Narrative Elements. Input:", narrativeElementsInput);
      narrativeElementsResult = await generateScenarioNarrativeElements(narrativeElementsInput);
      console.log("CLIENT: Scenario Narrative Elements generation successful. Result:", narrativeElementsResult);
      setLoadingStep(scenarioGenerationSteps.length - 1);


      clearLorebook();
      if (narrativeElementsResult.initialLoreEntries) {
        initializeLorebook(narrativeElementsResult.initialLoreEntries as RawLoreEntry[]);
      }

      const initialGMMessage: DisplayMessage = {
        id: generateUUID(),
        speakerType: 'GM',
        speakerNameLabel: 'GAME-MASTER',
        speakerDisplayName: "admin",
        content: foundationResult.sceneDescription,
        avatarSrc: GM_AVATAR_PLACEHOLDER,
        avatarHint: "wizard staff",
        isPlayer: false,
      };

      const firstStoryArcId = narrativeElementsResult.storyArcs.find(arc => arc.order === 1)?.id;
      
      const filteredTrackedNPCs = narrativeElementsResult.trackedNPCs.filter(
        npc => npc.name !== foundationResult.characterProfile.name
      );

      // Initialize character with progression system
      const characterWithProgression = initializeCharacterProgression(foundationResult.characterProfile);

      const baseStoryState: StructuredStoryState = {
        character: characterWithProgression,
        currentLocation: foundationResult.currentLocation,
        inventory: foundationResult.inventory,
        equippedItems: foundationResult.equippedItems,
        worldFacts: foundationResult.worldFacts,
        storySummary: `The adventure begins for ${characterWithProgression.name} in ${data.seriesName}, at ${foundationResult.currentLocation}. Initial scene: ${foundationResult.sceneDescription.substring(0,100)}...`,
        quests: narrativeElementsResult.quests,
        storyArcs: narrativeElementsResult.storyArcs,
        currentStoryArcId: firstStoryArcId,
        trackedNPCs: filteredTrackedNPCs,
      } as any; // Temporary cast for migration

      // Initialize enhanced state
      const finalStoryState = initializeEnhancedStoryState(baseStoryState);


      const firstTurn: StoryTurn = {
        id: generateUUID(),
        messages: [initialGMMessage],
        storyStateAfterScene: finalStoryState,
      };

      const newSessionId = generateUUID();
      const newSession: GameSession = {
        id: newSessionId,
        storyPrompt: `Adventure in the world of: ${data.seriesName}${data.characterName ? ` as ${data.characterName}` : ''}`,
        characterName: finalStoryState.character.name,
        storyHistory: [firstTurn],
        createdAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        seriesName: data.seriesName,
        seriesStyleGuide: foundationResult.seriesStyleGuide,
        seriesPlotSummary: foundationResult.seriesPlotSummary,
        isPremiumSession: data.usePremiumAI,
        allDataCorrectionWarnings: [],
      };

      localStorage.setItem(`${SESSION_KEY_PREFIX}${newSession.id}`, JSON.stringify(newSession));
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, newSession.id);

      setStoryHistory([firstTurn]);
      setCurrentSession(newSession);
      setActiveTab("story");
      toast({
        title: `Adventure in ${data.seriesName} Begun!`,
        description: `Playing as ${newSession.characterName}. ${data.usePremiumAI ? "(Premium AI Active)" : ""}`,
      });

    } catch (error: any) {
      console.error("CLIENT: Failed to start story from series:", error);
      toast({
        title: "Error Starting Scenario",
        description: `The AI encountered an issue: ${error.message || "Please try a different series or adjust inputs."}`,
        variant: "destructive",
      });
    }
    setIsLoadingInteraction(false);
    setLoadingType(null);
    setLoadingMessage(null);
    setLoadingStep(0);
  };

  const handleUserAction = async (userInput: string) => {
    if (!currentStoryState || !currentSession || !baseCharacterProfile) return;
    setIsLoadingInteraction(true);
    setLoadingType('nextScene');
    console.log("CLIENT: User action submitted:", userInput);

    // NEW: Check for any game commands first using the universal chat system
    const { createChatIntegrationSystem } = await import('@/lib/chat-integration-system');
    const { CRAFTING_RECIPES } = await import('@/data/item-sets-and-synergies');

    const chatSystem = createChatIntegrationSystem({
      enableAIGM: true,
      enableSafetyChecks: true,
      enableAutoProgression: true,
      enableInventoryManagement: true,
      enableWorldStateUpdates: true,
      enableQuestManagement: true,
      enableNarrativeEvents: true
    });

    try {
      // Process the message through the chat integration system
      const chatResult = await chatSystem.processChatMessage(
        userInput,
        currentStoryState,
        storyHistory,
        storyHistory[storyHistory.length - 1]?.id || 'initial',
        false // isGMCommand = false for player input
      );

      // If a command was recognized and executed successfully
      if (chatResult.parsedCommand.isGameCommand && chatResult.commandResult?.success) {
        console.log("CLIENT: Game command executed successfully:", chatResult.commandResult.message);

        // Update the story state with command results
        if (chatResult.updatedStoryState) {
          setCurrentStoryState(chatResult.updatedStoryState);
        }

        // Create a new turn with the command result
        const newTurnId = generateUUID();
        const commandTurn: StoryTurn = {
          id: newTurnId,
          messages: [
            {
              id: generateUUID(),
              speakerType: 'Player',
              speakerNameLabel: baseCharacterProfile.name,
              content: userInput,
              timestamp: new Date().toISOString()
            },
            {
              id: generateUUID(),
              speakerType: 'SystemHelper',
              speakerNameLabel: 'Game System',
              content: chatResult.userFeedback,
              timestamp: new Date().toISOString()
            },
            ...chatResult.systemMessages
          ],
          storyState: chatResult.updatedStoryState,
          timestamp: new Date().toISOString()
        };

        // Add GM system messages if any
        if (chatResult.gmExecution?.systemMessages) {
          commandTurn.messages.push(...chatResult.gmExecution.systemMessages);
        }

        const updatedHistory = [...storyHistory, commandTurn];
        setStoryHistory(updatedHistory);

        // Show success toast
        toast({
          title: "Command Executed",
          description: chatResult.userFeedback,
        });

        setIsLoadingInteraction(false);
        return; // Don't continue to story generation for pure commands
      }

      // If command was partially recognized but failed
      if (chatResult.parsedCommand.isGameCommand && !chatResult.commandResult?.success) {
        console.log("CLIENT: Game command failed:", chatResult.userFeedback);

        toast({
          title: "Command Failed",
          description: chatResult.userFeedback,
          variant: "destructive"
        });

        setIsLoadingInteraction(false);
        return;
      }

      // If it was a help/status request, show the response without continuing to story generation
      if (chatResult.userFeedback && !chatResult.parsedCommand.isGameCommand &&
          (userInput.toLowerCase().includes('help') ||
           userInput.toLowerCase().includes('status') ||
           userInput.toLowerCase().includes('inventory') ||
           userInput.toLowerCase().includes('quest'))) {

        const helpTurn: StoryTurn = {
          id: generateUUID(),
          messages: [
            {
              id: generateUUID(),
              speakerType: 'Player',
              speakerNameLabel: baseCharacterProfile.name,
              content: userInput,
              timestamp: new Date().toISOString()
            },
            {
              id: generateUUID(),
              speakerType: 'SystemHelper',
              speakerNameLabel: 'Game Assistant',
              content: chatResult.userFeedback,
              timestamp: new Date().toISOString()
            }
          ],
          storyState: currentStoryState,
          timestamp: new Date().toISOString()
        };

        const updatedHistory = [...storyHistory, helpTurn];
        setStoryHistory(updatedHistory);
        setIsLoadingInteraction(false);
        return;
      }

    } catch (error: any) {
      console.error("CLIENT: Chat integration system error:", error);
      // Continue to normal story processing if chat system fails
    }

    // LEGACY: Check for crafting commands (fallback)
    const { parseCraftingCommand, findMatchingRecipe, validateCraftingCommand, formatCraftingResult } = await import('@/lib/chat-command-parser');

    const commandResult = parseCraftingCommand(userInput, CRAFTING_RECIPES);

    if (commandResult.isCraftingCommand && commandResult.command) {
      console.log("CLIENT: Crafting command detected:", commandResult.command);

      // Handle crafting command
      const recipe = findMatchingRecipe(commandResult.command.recipeName, CRAFTING_RECIPES);

      if (recipe && commandResult.command.recipeName !== 'unknown') {
        // Validate crafting requirements
        const availableItems = [
          ...currentStoryState.inventory,
          ...(currentStoryState.equippedItems ? Object.values(currentStoryState.equippedItems).filter(Boolean) : [])
        ];

        const validation = validateCraftingCommand(commandResult.command, recipe, availableItems);

        if (validation.canCraft) {
          // Attempt crafting
          try {
            const { InventoryManager } = await import('@/lib/inventory-manager');
            const inventoryManager = new InventoryManager(baseCharacterProfile, {
              unequippedItems: currentStoryState.inventory,
              equippedItems: currentStoryState.equippedItems || {},
              craftingMaterials: currentStoryState.inventory.filter(item => item.itemType === 'material'),
              consumables: currentStoryState.inventory.filter(item => item.isConsumable),
              questItems: currentStoryState.inventory.filter(item => item.itemType === 'quest'),
              currency: currentStoryState.character.currency || 0
            }, CRAFTING_RECIPES);

            const craftingResult = inventoryManager.craftItem(recipe.id);

            // Create system message for crafting result
            const craftingMessage: DisplayMessage = {
              id: generateUUID(),
              speakerType: 'SystemHelper',
              speakerNameLabel: 'Crafting System',
              content: formatCraftingResult(
                craftingResult.success,
                recipe.name,
                commandResult.command.quantity || 1,
                craftingResult.qualityAchieved,
                craftingResult.experienceGained
              ),
              isPlayer: false,
            };

            // Update story state with crafting results
            if (craftingResult.success) {
              const updatedStoryState = produce(currentStoryState, draftState => {
                // Remove consumed materials
                craftingResult.materialsConsumed.forEach(material => {
                  const itemIndex = draftState.inventory.findIndex(item => item.id === material.itemId);
                  if (itemIndex !== -1) {
                    const item = draftState.inventory[itemIndex];
                    if (item.quantity && item.quantity > material.quantity) {
                      item.quantity -= material.quantity;
                    } else {
                      draftState.inventory.splice(itemIndex, 1);
                    }
                  }
                });

                // Add crafted items
                craftingResult.outputItems.forEach(item => {
                  draftState.inventory.push(item);
                });

                // Add experience
                draftState.character.experiencePoints += craftingResult.experienceGained;
              });

              setCurrentStoryState(updatedStoryState);
            }

            // Add crafting message to story
            setStoryHistory(prevHistory => {
              const lastTurn = prevHistory[prevHistory.length - 1];
              const newTurnForCrafting: StoryTurn = {
                id: `crafting-${generateUUID()}`,
                messages: [craftingMessage],
                storyStateAfterScene: currentStoryState
              };
              return [...prevHistory, newTurnForCrafting];
            });

            setIsLoadingInteraction(false);
            return; // Exit early, don't process as regular action

          } catch (craftingError) {
            console.error("CLIENT: Crafting error:", craftingError);
            const errorMessage: DisplayMessage = {
              id: generateUUID(),
              speakerType: 'SystemHelper',
              speakerNameLabel: 'Crafting System',
              content: `Crafting failed: ${craftingError instanceof Error ? craftingError.message : 'Unknown error'}`,
              isPlayer: false,
            };

            setStoryHistory(prevHistory => {
              const lastTurn = prevHistory[prevHistory.length - 1];
              const newTurnForError: StoryTurn = {
                id: `crafting-error-${generateUUID()}`,
                messages: [errorMessage],
                storyStateAfterScene: currentStoryState
              };
              return [...prevHistory, newTurnForError];
            });

            setIsLoadingInteraction(false);
            return;
          }
        } else {
          // Cannot craft - show validation message
          const validationMessage: DisplayMessage = {
            id: generateUUID(),
            speakerType: 'SystemHelper',
            speakerNameLabel: 'Crafting System',
            content: validation.message,
            isPlayer: false,
          };

          setStoryHistory(prevHistory => {
            const lastTurn = prevHistory[prevHistory.length - 1];
            const newTurnForValidation: StoryTurn = {
              id: `crafting-validation-${generateUUID()}`,
              messages: [validationMessage],
              storyStateAfterScene: currentStoryState
            };
            return [...prevHistory, newTurnForValidation];
          });

          setIsLoadingInteraction(false);
          return;
        }
      } else {
        // Unknown recipe
        const unknownRecipeMessage: DisplayMessage = {
          id: generateUUID(),
          speakerType: 'SystemHelper',
          speakerNameLabel: 'Crafting System',
          content: `Unknown recipe: "${commandResult.command.recipeName}". Type "recipes" or check the Recipe Book in your inventory to see available crafting recipes.`,
          isPlayer: false,
        };

        setStoryHistory(prevHistory => {
          const lastTurn = prevHistory[prevHistory.length - 1];
          const newTurnForUnknown: StoryTurn = {
            id: `crafting-unknown-${generateUUID()}`,
            messages: [unknownRecipeMessage],
            storyStateAfterScene: currentStoryState
          };
          return [...prevHistory, newTurnForUnknown];
        });

        setIsLoadingInteraction(false);
        return;
      }
    }

    const playerMessage: DisplayMessage = {
      id: generateUUID(),
      speakerType: 'Player',
      speakerNameLabel: baseCharacterProfile.name,
      speakerDisplayName: baseCharacterProfile.name,
      content: userInput,
      avatarSrc: PLAYER_AVATAR_PLACEHOLDER,
      avatarHint: "knight shield",
      isPlayer: true,
    };

    setStoryHistory(prevHistory => {
        const lastTurn = prevHistory[prevHistory.length -1];
         const newTurnForPlayerMessage: StoryTurn = {
            id: `pending-${generateUUID()}`,
            messages: [playerMessage],
            storyStateAfterScene: lastTurn.storyStateAfterScene
        };
        return [...prevHistory, newTurnForPlayerMessage];
    });

    try {
      const { generateNextScene } = await import("@/ai/flows/generate-next-scene");

      const lastGMMessagesContent = storyHistory
        .flatMap(turn => turn.messages)
        .filter(m => m.speakerType === 'GM')
        .slice(-3)
        .map(m => m.content)
        .join("\n...\n");

      const currentSceneContext = lastGMMessagesContent || "The story has just begun.";

      const storyStateForAI: StructuredStoryState = {
        ...currentStoryState,
        character: effectiveCharacterProfileForAI || baseCharacterProfile,
      };

      console.log("CLIENT: Calling generateNextScene with context:", { currentSceneContext, userInput, currentTurnId: storyHistory[storyHistory.length -1]?.id || 'initial' });
      console.log("CLIENT: Base Character Profile (before this turn's events/buffs):", baseCharacterProfile);
      console.log("CLIENT: Effective Character Profile for AI (includes buffs from previous turn):", effectiveCharacterProfileForAI);

      const result = await generateNextScene({
        currentScene: currentSceneContext,
        userInput: userInput,
        storyState: storyStateForAI, // AI receives state with effective stats
        seriesName: currentSession.seriesName,
        seriesStyleGuide: currentSession.seriesStyleGuide,
        currentTurnId: storyHistory[storyHistory.length -1]?.id || 'initial',
        usePremiumAI: currentSession.isPremiumSession,
      });
      console.log("CLIENT: generateNextScene successful. Result:", result);

      let clientSideWarnings: string[] = [];
      let systemMessagesForTurn: DisplayMessage[] = [];
      
      let finalUpdatedBaseStoryState = result.updatedStoryState;

      if (result.describedEvents && Array.isArray(result.describedEvents)) {
        result.describedEvents.forEach(event => {
            switch (event.type) {
                case 'healthChange': {
                    const e = event as HealthChangeEvent;
                     systemMessagesForTurn.push(createSystemMessage(
                        `Health ${e.amount > 0 ? 'restored' : 'lost'}: ${Math.abs(e.amount)} for ${e.characterTarget}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'manaChange': {
                    const e = event as ManaChangeEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Mana ${e.amount > 0 ? 'restored' : 'spent'}: ${Math.abs(e.amount)} for ${e.characterTarget}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                 case 'xpChange': {
                    const e = event as XPChangeEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Gained ${e.amount} XP. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'levelUp': {
                    const e = event as LevelUpEvent;

                    // Initialize progression system if not present
                    if (!finalUpdatedBaseStoryState.character.progressionPoints) {
                      finalUpdatedBaseStoryState.character = initializeCharacterProgression(finalUpdatedBaseStoryState.character);
                    }

                    // Process the level up with progression points
                    const leveledUpCharacter = processLevelUp(finalUpdatedBaseStoryState.character);
                    finalUpdatedBaseStoryState.character = leveledUpCharacter;

                    systemMessagesForTurn.push(createSystemMessage(
                        `Level Up! Reached Level ${e.newLevel}. You gained progression points! ${e.rewardSuggestion || ''} ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'currencyChange': {
                    const e = event as CurrencyChangeEvent;
                     systemMessagesForTurn.push(createSystemMessage(
                        `${e.amount >= 0 ? 'Gained' : 'Lost'} ${Math.abs(e.amount)} currency. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'languageSkillChange': {
                    const e = event as LanguageSkillChangeEvent;
                     systemMessagesForTurn.push(createSystemMessage(
                        `${e.skillTarget.charAt(0).toUpperCase() + e.skillTarget.slice(1)} skill ${e.amount > 0 ? 'improved' : 'decreased'} by ${Math.abs(e.amount)}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'itemFound': {
                    const e = event as ItemFoundEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Item Found: ${e.itemName}${(e.quantity || 1) > 1 ? ` (x${e.quantity})` : ''}! ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'itemLost': {
                    const e = event as ItemLostEvent;
                     systemMessagesForTurn.push(createSystemMessage(
                        `Item Lost: ${e.itemIdOrName}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'itemUsed': {
                    const e = event as ItemUsedEvent;
                    const itemJustUsed = currentStoryState.inventory.find(i => i.id === e.itemIdOrName || i.name === e.itemIdOrName); // Check against state *before* AI update
                    let effectMsg = e.reason || "No immediate effect described by AI.";
                    
                    if (itemJustUsed && itemJustUsed.isConsumable && itemJustUsed.activeEffects) {
                        finalUpdatedBaseStoryState = produce(finalUpdatedBaseStoryState, draftState => {
                            draftState.character.activeTemporaryEffects = draftState.character.activeTemporaryEffects || [];
                            itemJustUsed.activeEffects?.forEach(effectDef => {
                                if (typeof effectDef.duration === 'number' && effectDef.duration > 0) {
                                    const newTempEffect: TemporaryEffect = {
                                        ...effectDef,
                                        sourceItemId: itemJustUsed.id,
                                        turnsRemaining: effectDef.duration,
                                    };
                                    draftState.character.activeTemporaryEffects!.push(newTempEffect);
                                    effectMsg += ` Effect '${effectDef.name}' active for ${effectDef.duration} turns.`;
                                    systemMessagesForTurn.push(createSystemMessage(
                                        `Buff Applied: ${effectDef.name} from ${itemJustUsed.name} (Duration: ${effectDef.duration} turns).`
                                    ));
                                }
                            });
                        });
                    }
                    systemMessagesForTurn.push(createSystemMessage(
                        `Item Used: ${e.itemIdOrName}. ${effectMsg}`.trim()
                    ));
                    if (itemJustUsed) { 
                        toast({ title: "Item Used", description: `${e.itemIdOrName} used.`});
                    } else {
                        clientSideWarnings.push(`AI reported item "${e.itemIdOrName}" was used, but it wasn't found in inventory before AI state update. AI is assumed to have handled its removal.`);
                    }
                    break;
                }
                case 'itemEquipped': {
                    const e = event as ItemEquippedEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Equipped ${e.itemIdOrName} to ${e.slot}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'itemUnequipped': {
                    const e = event as ItemUnequippedEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Unequipped ${e.itemIdOrName} from ${e.slot}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'questAccepted': {
                    const e = event as QuestAcceptedEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `New Quest Accepted: "${e.questTitle || e.questDescription.substring(0,30)+ "..."}". ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'questObjectiveUpdate': {
                    const e = event as QuestObjectiveUpdateEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Quest objective for "${e.questIdOrDescription}" updated: "${e.objectiveDescription}" is now ${e.objectiveCompleted ? 'completed' : 'pending'}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'questCompleted': {
                    const e = event as QuestCompletedEvent;
                     systemMessagesForTurn.push(createSystemMessage(
                        `Quest "${e.questIdOrDescription}" Completed! ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                 case 'questFailed': {
                    const e = event as QuestFailedEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Quest "${e.questIdOrDescription}" Failed. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'newNPCIntroduced': {
                    const e = event as NewNPCIntroducedEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Met ${e.npcName} (${e.classOrRole || 'Unknown Role'}). ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'npcRelationshipChange': {
                    const e = event as NPCRelationshipChangeEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Relationship with ${e.npcName} ${e.changeAmount > 0 ? 'improved' : 'worsened'} by ${Math.abs(e.changeAmount)}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                 case 'skillLearned': {
                    const e = event as SkillLearnedEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Skill Learned: ${e.skillName} (${e.skillType})! ${e.reason || ''}`.trim()
                    ));
                    break;
                }
            }
        });
      }

      finalUpdatedBaseStoryState = produce(finalUpdatedBaseStoryState, draftState => {
        if (draftState.character.activeTemporaryEffects) {
            const stillActiveEffects: TemporaryEffect[] = [];
            draftState.character.activeTemporaryEffects.forEach(effect => {
                effect.turnsRemaining -= 1;
                if (effect.turnsRemaining > 0) {
                    stillActiveEffects.push(effect);
                } else {
                    systemMessagesForTurn.push(createSystemMessage(`Effect Expired: ${effect.name} (from ${effect.sourceItemId ? finalUpdatedBaseStoryState.inventory.find(i=>i.id===effect.sourceItemId)?.name || finalUpdatedBaseStoryState.equippedItems[effect.sourceItemId as EquipmentSlot]?.name || effect.sourceItemId : 'Unknown Source'}) has worn off.`));
                }
            });
            draftState.character.activeTemporaryEffects = stillActiveEffects;
        }
      });


      const previousStoryArcId = currentStoryState.currentStoryArcId; 
      const arcJustCompleted = finalUpdatedBaseStoryState.storyArcs.find(arc => arc.id === previousStoryArcId && arc.isCompleted && !currentStoryState.storyArcs.find(sa => sa.id === arc.id && sa.isCompleted));

      // === ENHANCED ARC SYSTEM INTEGRATION ===
      // Update current arc with player choice and scene progression
      if (currentStoryState.currentStoryArcId) {
        try {
          const { arcManager } = await import('@/lib/comprehensive-arc-manager');

          // Track player choice if one was made
          if (userInput && userInput.trim()) {
            const choiceData = {
              turnId: newTurnId,
              choiceText: userInput,
              choiceDescription: `Player chose: ${userInput}`,
              alternatives: [], // Could be extracted from scene generation
              consequences: [],
              impactScope: 'phase' as const,
              moralAlignment: 'neutral' as const,
              agencyScore: 6, // Default score, could be calculated
              narrativeWeight: 5, // Default weight, could be calculated
            };

            const arcUpdateResult = arcManager.updateArc(
              currentStoryState.currentStoryArcId,
              finalUpdatedBaseStoryState.character,
              finalUpdatedBaseStoryState,
              newTurnId,
              'player_choice',
              choiceData
            );

            if (arcUpdateResult.success && arcUpdateResult.updatedArc) {
              // Update the arc in story state
              finalUpdatedBaseStoryState = produce(finalUpdatedBaseStoryState, draftState => {
                const arcIndex = draftState.storyArcs.findIndex(arc => arc.id === currentStoryState.currentStoryArcId);
                if (arcIndex !== -1) {
                  draftState.storyArcs[arcIndex] = arcUpdateResult.updatedArc!;
                }
              });

              // Handle failure detection and recovery
              if (arcUpdateResult.failureDetection?.failures.length) {
                console.log('Arc failures detected:', arcUpdateResult.failureDetection.failures);
                // Could show recovery options to player
              }
            }
          }
        } catch (arcError) {
          console.error('Enhanced Arc system error:', arcError);
          // Graceful degradation - continue with existing system
        }
      }

      if (arcJustCompleted) {
        console.log(`CLIENT: Story Arc "${arcJustCompleted.title}" (ID: ${arcJustCompleted.id}) completed by AI.`);

        // === ENHANCED ARC COMPLETION HANDLING ===
        try {
          const { arcManager } = await import('@/lib/comprehensive-arc-manager');

          const arcCompletionResult = arcManager.completeArc(
            arcJustCompleted.id,
            finalUpdatedBaseStoryState.character,
            finalUpdatedBaseStoryState,
            arcJustCompleted.completionSummary || "The story arc has concluded."
          );

          if (arcCompletionResult.success) {
            console.log('Enhanced Arc completion processed:', arcCompletionResult);

            // Apply completion rewards
            if (arcCompletionResult.completionRewards?.length) {
              finalUpdatedBaseStoryState = produce(finalUpdatedBaseStoryState, draftState => {
                arcCompletionResult.completionRewards!.forEach(reward => {
                  switch (reward.type) {
                    case 'experience':
                      draftState.character.experiencePoints += reward.amount;
                      break;
                    case 'currency':
                      draftState.character.currency = (draftState.character.currency || 0) + reward.amount;
                      break;
                    case 'skill_points':
                      if (draftState.character.progressionPoints) {
                        draftState.character.progressionPoints.skill += reward.amount;
                      }
                      break;
                  }
                });
              });

              // Show reward notifications
              arcCompletionResult.completionRewards.forEach(reward => {
                systemMessagesForTurn.push(createSystemMessage(
                  `Arc Completion Reward: ${reward.description} (+${reward.amount} ${reward.type})`,
                  'SystemHelper'
                ));
              });
            }

            // Show next arc suggestions
            if (arcCompletionResult.nextArcSuggestions?.length) {
              systemMessagesForTurn.push(createSystemMessage(
                `Story Suggestions: ${arcCompletionResult.nextArcSuggestions.join('; ')}`,
                'SystemHelper'
              ));
            }
          }
        } catch (arcError) {
          console.error('Enhanced Arc completion error:', arcError);
          // Continue with existing completion logic
        }

        systemMessagesForTurn.push(createSystemMessage(
            `EPISODE COMPLETE: ${arcJustCompleted.title}!\n\n${arcJustCompleted.completionSummary || "The story arc has concluded."}`,
            'ArcNotification', 'ARC FINALE'
        ));
        toast({
            title: "Episode Complete!",
            description: (
              <div className="flex items-start">
                <Milestone className="w-5 h-5 mr-2 mt-0.5 text-accent shrink-0" />
                <span>{arcJustCompleted.title} finished. {arcJustCompleted.completionSummary || ""}</span>
              </div>
            ),
            duration: 8000,
          });
        
        setLoadingType('updatingProfile');
        try {
            const updateDescInput: UpdateCharacterDescriptionInput = {
                currentProfile: finalUpdatedBaseStoryState.character, 
                completedArc: arcJustCompleted,
                overallStorySummarySoFar: finalUpdatedBaseStoryState.storySummary || "",
                seriesName: currentSession.seriesName,
                usePremiumAI: currentSession.isPremiumSession,
            };
            const descUpdateResult: UpdateCharacterDescriptionOutput = await callUpdateCharacterDescription(updateDescInput);
            finalUpdatedBaseStoryState = produce(finalUpdatedBaseStoryState, draftState => {
                draftState.character.description = descUpdateResult.updatedCharacterDescription;
            });
            systemMessagesForTurn.push(createSystemMessage(`You reflect on the events of the "${arcJustCompleted.title}" arc. Your understanding of yourself and your place in this world has subtly shifted.`, 'SystemHelper'));
            toast({
                title: "Character Reflection",
                description: ( <div className="flex items-start"> <EditIcon className="w-5 h-5 mr-2 mt-0.5 text-primary shrink-0" /> <span>Your character description has been updated.</span></div> ),
                duration: 7000
            });
        } catch (descError: any) {
            console.error("CLIENT: Failed to update character description:", descError);
            toast({ title: "Error Updating Character Profile", description: `Could not update character description. ${descError.message || ""}`, variant: "destructive" });
        }
        setLoadingType('nextScene'); 
        
        const nextStoryArcOrder = arcJustCompleted.order + 1;
        let nextStoryArcToFleshOut = finalUpdatedBaseStoryState.storyArcs.find(
          arc => arc.order === nextStoryArcOrder && !arc.isCompleted && (!arc.mainQuestIds || arc.mainQuestIds.length === 0)
        );

        if (!nextStoryArcToFleshOut && currentSession.seriesPlotSummary) { 
            console.log("CLIENT: No pre-outlined next arc. Attempting to discover a new major story arc.");
            setLoadingType('discoveringArc');
            try {
                const discoverInput: DiscoverNextStoryArcInput = {
                    seriesName: currentSession.seriesName,
                    seriesPlotSummary: currentSession.seriesPlotSummary,
                    completedOrGeneratedArcTitles: finalUpdatedBaseStoryState.storyArcs.map(arc => arc.title),
                    lastCompletedArcOrder: arcJustCompleted.order,
                    lastCompletedArcSummary: arcJustCompleted.completionSummary || undefined,
                    usePremiumAI: currentSession.isPremiumSession,
                };
                const discoveryResult: DiscoverNextStoryArcOutput = await callDiscoverNextStoryArc(discoverInput);

                if (discoveryResult.nextStoryArcOutline) {
                    const newArcOutline = discoveryResult.nextStoryArcOutline;
                    finalUpdatedBaseStoryState = produce(finalUpdatedBaseStoryState, draftState => {
                        draftState.storyArcs.push(newArcOutline);
                        // Do not set currentStoryArcId yet, wait for fleshing
                    });
                    nextStoryArcToFleshOut = newArcOutline; 
                    systemMessagesForTurn.push(createSystemMessage(`A new chapter beckons: ${newArcOutline.title}.\n\n${newArcOutline.description}`, 'ArcNotification', 'NEW ARC DISCOVERED'));
                     toast({
                        title: "New Chapter Discovered!",
                        description: ( <div className="flex items-start"> <SearchIcon className="w-5 h-5 mr-2 mt-0.5 text-primary shrink-0" /> <span>The saga continues with: {newArcOutline.title}</span> </div> ),
                        duration: 7000,
                    });
                } else {
                     // No more major arcs found by discoverNextStoryArc
                    console.log("CLIENT: No more major story arcs found. Attempting to generate bridging content.");
                    setLoadingType('bridgingContent');
                    try {
                        const bridgingInput: GenerateBridgingQuestInput = {
                            seriesName: currentSession.seriesName,
                            currentLocation: finalUpdatedBaseStoryState.currentLocation,
                            characterProfile: { 
                                name: finalUpdatedBaseStoryState.character.name,
                                class: finalUpdatedBaseStoryState.character.class,
                                level: finalUpdatedBaseStoryState.character.level,
                            },
                            overallStorySummarySoFar: finalUpdatedBaseStoryState.storySummary || "",
                            previousArcCompletionSummary: arcJustCompleted.completionSummary || "The previous arc concluded.",
                            usePremiumAI: currentSession.isPremiumSession,
                        };
                        const bridgingResult = await callGenerateBridgingQuest(bridgingInput);
                        if (bridgingResult.bridgingQuest) {
                            finalUpdatedBaseStoryState = produce(finalUpdatedBaseStoryState, draftState => {
                                draftState.quests.push(bridgingResult.bridgingQuest!);
                                draftState.currentStoryArcId = null; // Or a special "bridging_mode" ID
                            });
                            systemMessagesForTurn.push(createSystemMessage(
                                `A new opportunity arises: "${bridgingResult.bridgingQuest.title || bridgingResult.bridgingQuest.description.substring(0,40)+"..."}" has been added to your journal.`,
                                'SystemHelper', 'NEW SIDE QUEST'
                            ));
                            toast({ title: "New Side Quest", description: `"${bridgingResult.bridgingQuest.title || "A new task"}" received.`});
                        } else if (bridgingResult.bridgingNarrativeHook) {
                            systemMessagesForTurn.push(createSystemMessage(
                                `As the dust settles, you notice: ${bridgingResult.bridgingNarrativeHook}`,
                                'SystemHelper', 'NEW EVENT'
                            ));
                             finalUpdatedBaseStoryState = produce(finalUpdatedBaseStoryState, draftState => {
                                draftState.currentStoryArcId = null;
                            });
                            toast({ title: "A New Event", description: "The story takes an unexpected turn..."});
                        } else {
                             finalUpdatedBaseStoryState = produce(finalUpdatedBaseStoryState, draftState => {
                                draftState.currentStoryArcId = null;
                            });
                            systemMessagesForTurn.push(createSystemMessage("The main story seems to have reached a pause. The world is open for exploration.", 'ArcNotification', 'SAGA PAUSED'));
                            toast({ title: "End of Known Saga", description: `You've explored all major story arcs currently identifiable for ${currentSession.seriesName}! The adventure continues in a more open-ended way.` });
                        }
                    } catch (bridgingError: any) {
                        console.error("CLIENT: Failed to generate bridging content:", bridgingError);
                        toast({ title: "Error Generating New Content", description: `Could not generate bridging content. ${bridgingError.message || ""}`, variant: "destructive" });
                         finalUpdatedBaseStoryState = produce(finalUpdatedBaseStoryState, draftState => {
                            draftState.currentStoryArcId = null;
                        });
                    }
                }
            } catch (discoveryError: any) {
                console.error("CLIENT: Failed to discover next story arc:", discoveryError);
                toast({ title: "Error Discovering Next Arc", description: `Could not find the next part of the story. ${discoveryError.message || ""}`, variant: "destructive" });
            }
            setLoadingType('nextScene'); 
        }


        if (nextStoryArcToFleshOut && currentSession.seriesPlotSummary) {
          console.log(`CLIENT: Found next outlined story arc: "${nextStoryArcToFleshOut.title}". Attempting to flesh out quests.`);
          setLoadingType('arcLoad');
          
          try {
            const fleshOutInput: FleshOutStoryArcQuestsInput = {
              storyArcToFleshOut: nextStoryArcToFleshOut,
              seriesName: currentSession.seriesName,
              seriesPlotSummary: currentSession.seriesPlotSummary,
              overallStorySummarySoFar: finalUpdatedBaseStoryState.storySummary || "",
              characterContext: {
                name: finalUpdatedBaseStoryState.character.name,
                class: finalUpdatedBaseStoryState.character.class,
                level: finalUpdatedBaseStoryState.character.level
              },
              usePremiumAI: currentSession.isPremiumSession,
            };
            const fleshedResult: FleshOutStoryArcQuestsOutput = await callFleshOutStoryArcQuests(fleshOutInput);

            finalUpdatedBaseStoryState = produce(finalUpdatedBaseStoryState, draftState => {
              draftState.quests.push(...fleshedResult.fleshedOutQuests);
              const arcIndex = draftState.storyArcs.findIndex(arc => arc.id === nextStoryArcToFleshOut!.id);
              if (arcIndex !== -1) {
                draftState.storyArcs[arcIndex].mainQuestIds = fleshedResult.fleshedOutQuests.map(q => q.id);
              }
              // Only set currentStoryArcId if it's not already set (e.g. by discovery flow)
              // or if it's different from the one being fleshed
              if (draftState.currentStoryArcId !== nextStoryArcToFleshOut!.id) {
                  draftState.currentStoryArcId = nextStoryArcToFleshOut!.id; 
                  systemMessagesForTurn.push(createSystemMessage(`NEW CHAPTER BEGINS: ${nextStoryArcToFleshOut.title}!\n\n${nextStoryArcToFleshOut.description}`, 'ArcNotification', 'ARC INITIATED'));
                   toast({
                        title: `New Chapter: ${nextStoryArcToFleshOut.title}`,
                        description: ( <div className="flex items-start"> <BookmarkIcon className="w-5 h-5 mr-2 mt-0.5 text-primary shrink-0" /> <span>New main quests available.</span> </div> ),
                        duration: 7000,
                    });
              } else if (draftState.currentStoryArcId === nextStoryArcToFleshOut!.id && draftState.storyArcs[arcIndex].mainQuestIds.length > 0) {
                  // If it was already current and now has quests, it's officially "started"
                   systemMessagesForTurn.push(createSystemMessage(`The story arc "${nextStoryArcToFleshOut.title}" has begun, with new objectives available.`, 'ArcNotification', 'ARC INITIATED'));
                   toast({
                        title: `Chapter Unfolds: ${nextStoryArcToFleshOut.title}`,
                        description: ( <div className="flex items-start"> <CompassIcon className="w-5 h-5 mr-2 mt-0.5 text-accent shrink-0" /> <span>Main quests are now active for this arc.</span> </div> ),
                        duration: 7000,
                    });
              }
            });
          } catch (fleshOutError: any) {
            console.error("CLIENT: Failed to flesh out story arc quests:", fleshOutError);
            toast({ title: "Error Loading Next Story Arc", description: `Could not generate quests for "${nextStoryArcToFleshOut.title}". ${fleshOutError.message || ""}`, variant: "destructive" });
          }
          setLoadingType('nextScene');
        } else if (nextStoryArcToFleshOut && !currentSession.seriesPlotSummary) {
            console.warn("CLIENT: Next story arc is outlined, but no seriesPlotSummary found in session to flesh it out.");
        } else if (!nextStoryArcToFleshOut && arcJustCompleted) { 
            console.log("CLIENT: All pre-defined/discoverable story arcs seem to be completed and no bridging content was generated.");
            // This case is now handled by the bridging content logic above. If bridging also returns nothing, the saga is paused.
        }
      }


      const aiDisplayMessages: DisplayMessage[] = result.generatedMessages.map((aiMsg: AIMessageSegment) => {
        const isGM = aiMsg.speaker.toUpperCase() === 'GM';
        const speakerLabel = isGM ? 'GAME-MASTER' : aiMsg.speaker;
        const speakerDisplayName = isGM ? 'admin' : aiMsg.speaker;

        return {
          id: generateUUID(),
          speakerType: isGM ? 'GM' : 'NPC',
          speakerNameLabel: speakerLabel,
          speakerDisplayName: speakerDisplayName,
          content: aiMsg.content,
          avatarSrc: GM_AVATAR_PLACEHOLDER,
          avatarHint: isGM ? "wizard staff" : "merchant friendly",
          isPlayer: false,
        };
      });

      let isCombatTurn = false;
      const combatTurnEvents: CombatEventLogEntry[] = [];
      const hostileNPCsInTurn: CombatHelperInfo['hostileNPCs'] = [];

      if (result.describedEvents) {
        result.describedEvents.forEach(event => {
          if (event.type === 'healthChange') {
            const e = event as HealthChangeEvent;
            if (e.amount < 0) isCombatTurn = true;
            combatTurnEvents.push({
              description: `${e.characterTarget === 'player' ? finalUpdatedBaseStoryState.character.name : e.characterTarget} ${e.amount < 0 ? 'took' : 'recovered'} ${Math.abs(e.amount)} health. ${e.reason || ''}`.trim(),
              target: e.characterTarget,
              type: e.amount < 0 ? 'damage' : 'healing',
              value: Math.abs(e.amount)
            });
          } else if (event.type === 'npcStateChange') {
            const e = event as NPCStateChangeEvent;
            if (e.newState.toLowerCase().includes('hostile') || e.newState.toLowerCase().includes('attacking')) {
              isCombatTurn = true;
            }
            combatTurnEvents.push({
                description: `NPC ${e.npcName}'s state changed to ${e.newState}. ${e.reason || ''}`.trim(),
                target: e.npcName,
                type: 'effect'
            });
          } else if (event.type === 'itemUsed' && (event.reason?.toLowerCase().includes('combat') || event.itemIdOrName.toLowerCase().includes('potion'))){
            combatTurnEvents.push({
                description: `Item used: ${event.itemIdOrName}. ${event.reason || ''}`.trim(),
                type: 'action'
            });
          }
        });
      }

      let turnMessages = [playerMessage, ...aiDisplayMessages];
      if (systemMessagesForTurn.length > 0) {
          turnMessages = [...turnMessages, ...systemMessagesForTurn];
      }


      if (isCombatTurn) {
        console.log("CLIENT: Combat detected in turn.");
        const effectivePlayerProfileForCombatLog = calculateEffectiveCharacterProfile(finalUpdatedBaseStoryState.character, finalUpdatedBaseStoryState.equippedItems);

        finalUpdatedBaseStoryState.trackedNPCs.forEach(npc => {
          if (npc.shortTermGoal?.toLowerCase().includes('attack') ||
              npc.shortTermGoal?.toLowerCase().includes('hostile') ||
              (npc.health !== undefined && npc.maxHealth !== undefined && npc.health < npc.maxHealth && combatTurnEvents.some(e => e.target === npc.name && e.type === 'damage'))) {
            hostileNPCsInTurn.push({
              id: npc.id,
              name: npc.name,
              health: npc.health,
              maxHealth: npc.maxHealth,
              description: npc.description.substring(0,50) + "..."
            });
          }
        });

        const combatHelperData: CombatHelperInfo = {
          playerHealth: effectivePlayerProfileForCombatLog.health,
          playerMaxHealth: effectivePlayerProfileForCombatLog.maxHealth,
          playerMana: effectivePlayerProfileForCombatLog.mana,
          playerMaxMana: effectivePlayerProfileForCombatLog.maxMana,
          hostileNPCs: hostileNPCsInTurn,
          turnEvents: combatTurnEvents.slice(0, 5),
        };

        const combatHelperMessage: DisplayMessage = {
          id: generateUUID(),
          speakerType: 'SystemHelper',
          speakerNameLabel: 'COMBAT LOG',
          isPlayer: false,
          combatHelperInfo: combatHelperData,
          avatarHint: "system combat",
        };
        turnMessages.push(combatHelperMessage);
      }

      const completedTurn: StoryTurn = {
        id: generateUUID(),
        messages: turnMessages,
        storyStateAfterScene: finalUpdatedBaseStoryState,
      };

      setStoryHistory(prevHistory => {
        const historyWithoutPending = prevHistory.filter(turn => !turn.id.startsWith('pending-'));
        return [...historyWithoutPending, completedTurn];
      });

      // NEW: Run AI Game Master analysis after each story turn
      try {
        const { createChatIntegrationSystem } = await import('@/lib/chat-integration-system');
        const chatSystem = createChatIntegrationSystem({
          enableAIGM: true,
          enableAutoProgression: true,
          enableInventoryManagement: true,
          enableWorldStateUpdates: true
        });

        // Run AI GM analysis on the updated state
        const gmResult = await chatSystem.processChatMessage(
          '', // Empty message - just trigger GM analysis
          finalUpdatedBaseStoryState,
          [...storyHistory.filter(turn => !turn.id.startsWith('pending-')), completedTurn],
          completedTurn.id,
          true // isGMCommand = true for AI GM
        );

        // If GM made changes, update the state and add system messages
        if (gmResult.gmExecution && gmResult.gmExecution.systemMessages.length > 0) {
          console.log("CLIENT: AI GM made automatic adjustments:", gmResult.gmExecution.systemMessages.length, "actions");

          // Update story state with GM changes
          setCurrentStoryState(gmResult.updatedStoryState);
          finalUpdatedBaseStoryState = gmResult.updatedStoryState;

          // Add GM messages to the current turn
          completedTurn.messages.push(...gmResult.gmExecution.systemMessages);
          completedTurn.storyStateAfterScene = gmResult.updatedStoryState;

          // Update the history with GM messages
          setStoryHistory(prevHistory => {
            const historyWithoutPending = prevHistory.filter(turn => !turn.id.startsWith('pending-'));
            return [...historyWithoutPending, completedTurn];
          });
        }

        // Log GM analysis for debugging
        if (gmResult.gmAnalysis) {
          console.log("CLIENT: AI GM Analysis:", {
            storyMomentum: gmResult.gmAnalysis.contextAnalysis.storyMomentum,
            playerEngagement: gmResult.gmAnalysis.contextAnalysis.playerEngagement,
            narrativeConsistency: gmResult.gmAnalysis.contextAnalysis.narrativeConsistency,
            systemBalance: gmResult.gmAnalysis.contextAnalysis.systemBalance,
            decisions: gmResult.gmAnalysis.decisions.length
          });
        }

      } catch (error: any) {
        console.error("CLIENT: AI GM analysis failed:", error);
        // Don't block the story flow if GM analysis fails
      }

      if (result.newLoreEntries && result.newLoreEntries.length > 0) {
        const keywords = result.newLoreEntries.map(l => l.keyword).join(', ');
        toast({
          title: "New Lore Discovered!",
          description: ( <div className="flex items-start"> <BookPlus className="w-5 h-5 mr-2 mt-0.5 text-accent shrink-0" /> <span>Added entries for: {keywords}</span> </div> ),
          duration: 5000,
        });
      }
      
      const allWarningsThisTurn = [
          ...(result.dataCorrectionWarnings || []),
          ...clientSideWarnings
      ];

      if (allWarningsThisTurn.length > 0) {
        const newWarningsEntry = {
          timestamp: new Date().toISOString(),
          warnings: allWarningsThisTurn,
        };
        setCurrentSession(prevSession => {
          if (!prevSession) return null;
          const updatedWarnings = [...(prevSession.allDataCorrectionWarnings || []), newWarningsEntry];
          return { ...prevSession, allDataCorrectionWarnings: updatedWarnings };
        });
        allWarningsThisTurn.forEach(warning => {
          toast({
            title: "AI Data Notice",
            description: ( <div className="flex items-start"> <AlertTriangleIcon className="w-5 h-5 mr-2 mt-0.5 text-orange-500 shrink-0" /> <span>{warning}</span> </div> ),
            duration: 7000,
          });
        });
      }

    } catch (error: any) {
      console.error("CLIENT: Failed to generate next scene:", error);
      toast({
        title: "Error Generating Scene",
        description: `The AI encountered an issue: ${error.message || "Please try again."}`,
        variant: "destructive",
      });
      setStoryHistory(prevHistory => prevHistory.filter(turn => !turn.id.startsWith('pending-')));
    }
    setIsLoadingInteraction(false);
    setLoadingType(null);
    setLoadingMessage(null);
  };

  const handleUndo = () => {
    if (storyHistory.length > 1) {
      setStoryHistory((prevHistory) => prevHistory.slice(0, -1));
       toast({ title: "Last interaction undone."});
    } else if (storyHistory.length === 1) {
      handleRestart();
    }
  };

  const handleRestart = () => {
    if (typeof window !== 'undefined') {
      if (currentSession) {
        localStorage.removeItem(`${SESSION_KEY_PREFIX}${currentSession.id}`);
      }
      localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
    }
    clearLorebook();
    setStoryHistory([]);
    setCurrentSession(null);
    setActiveTab("story");
    toast({
      title: "Story Session Cleared",
      description: "Ready for a new adventure!",
    });
  };

  const handleClearCorrectionLogs = () => {
    if (currentSession && typeof window !== 'undefined') {
        setCurrentSession(prev => {
            if (!prev) return null;
            const updatedSession = { ...prev, allDataCorrectionWarnings: [] };
            localStorage.setItem(`${SESSION_KEY_PREFIX}${prev.id}`, JSON.stringify(updatedSession));
            return updatedSession;
        });
        toast({ title: "Correction logs cleared for this session." });
    }
  };

  const handleTestSimpleAction = async () => {
    console.log("CLIENT: Calling simpleTestAction...");
    setIsLoadingInteraction(true);
    try {
      const result = await simpleTestAction({ name: "StoryForge User" });
      console.log("CLIENT: simpleTestAction result:", result);
      toast({
        title: "Simple Test Action Successful",
        description: `Greeting: ${result.greeting} (Server Time: ${new Date(result.timestamp).toLocaleTimeString()})`,
      });
    } catch (error: any) {
      console.error("CLIENT: Error calling simpleTestAction:", error);
      toast({
        title: "Simple Test Action Failed",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    }
    setIsLoadingInteraction(false);
  };

  const handleStartInteractiveCombat = async () => {
    if (!currentStoryState || !baseCharacterProfile || !currentSession) {
      toast({
        title: "Cannot Start Combat",
        description: "Missing required game state",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingInteraction(true);
    try {
      // Generate combat scenario
      const combatInput = {
        storyContext: currentStoryState.storySummary || "An adventure unfolds",
        playerCharacter: baseCharacterProfile,
        currentLocation: currentStoryState.currentLocation,
        storyState: currentStoryState,
        combatTrigger: 'player_action' as const,
        difficultyLevel: 'medium' as const,
        usePremiumAI: currentSession.isPremiumSession,
      };

      const combatScenario = await generateCombatScenario(combatInput);

      // Create player participant
      const playerParticipant = createPlayerCombatParticipant(baseCharacterProfile);

      // Combine all participants
      const allParticipants = [
        playerParticipant,
        ...combatScenario.allies,
        ...combatScenario.enemies
      ];

      // Create initial combat state
      const newCombatState: CombatState = {
        id: generateUUID(),
        isActive: true,
        phase: 'initiative',
        participants: allParticipants,
        currentTurnId: '', // Will be set by initiative calculation
        turnOrder: [],
        round: 1,
        environment: combatScenario.environment,
        actionHistory: [],
        victoryConditions: combatScenario.victoryConditions,
        defeatConditions: combatScenario.defeatConditions,
        startTime: new Date().toISOString(),
        turnStartTime: new Date().toISOString(),
      };

      setActiveCombatState(newCombatState);
      setShowCombatInterface(true);
      setActiveTab("story");

      toast({
        title: "Interactive Combat Started!",
        description: combatScenario.combatDescription,
      });

    } catch (error: any) {
      console.error("CLIENT: Failed to start interactive combat:", error);
      toast({
        title: "Combat Generation Failed",
        description: error.message || "Unable to generate combat scenario",
        variant: "destructive",
      });
    }
    setIsLoadingInteraction(false);
  };

  const handleCombatEnd = (result: any) => {
    console.log("CLIENT: Combat ended with result:", result);

    // Update story state based on combat result
    if (currentStoryState && result.outcome === 'victory') {
      // Add experience, update health, etc.
      toast({
        title: "Victory!",
        description: result.reason,
      });
    } else if (result.outcome === 'defeat') {
      toast({
        title: "Defeat",
        description: result.reason,
        variant: "destructive",
      });
    }

    // Close combat interface
    setShowCombatInterface(false);
    setActiveCombatState(null);
  };

  const handleCombatActionExecuted = (result: any) => {
    console.log("CLIENT: Combat action executed:", result);
    // Could show action feedback or update UI
  };

  if (isLoadingPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 sm:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">Loading your adventure...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background selection:bg-primary/20 selection:text-primary overflow-hidden relative">
        {/* Enhanced Header */}
        <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-[95vw] xl:max-w-[90vw] 2xl:max-w-[85vw] 3xl:max-w-[80vw] 4xl:max-w-[75vw] mx-auto flex h-12 sm:h-14 items-center justify-between px-2 sm:px-4 lg:px-6 xl:px-8">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                <div className="absolute inset-0 h-8 w-8 text-primary animate-ping opacity-20">
                  <Sparkles className="h-8 w-8" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient-primary font-headline">Story Forge</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">AI-Powered Interactive Fiction</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              {currentSession && (
                <Button variant="ghost" size="icon-sm" className="hover-lift">
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="flex flex-col flex-grow w-full max-w-[95vw] xl:max-w-[90vw] 2xl:max-w-[85vw] 3xl:max-w-[80vw] 4xl:max-w-[75vw] mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 lg:py-6 overflow-hidden">
          {isLoadingInteraction && (
            <EnhancedLoading
              variant="ai"
              size="lg"
              message={loadingMessage || "AI is working..."}
              overlay={true}
            />
          )}

          {!currentSession && !isLoadingInteraction && (
            <div className="flex-grow flex items-center justify-center">
              <InitialPromptForm
                onSubmitSeries={handleStartStoryFromSeries}
                isLoading={isLoadingInteraction}
              />
            </div>
          )}

          {currentSession && baseCharacterProfile && currentStoryState && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-grow overflow-hidden animate-fade-in">
              <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 mb-2 sm:mb-3 lg:mb-4 shrink-0 bg-card/50 backdrop-blur-sm border border-border/50 p-1 rounded-lg gap-1">
                <TabsTrigger value="story" className="text-xs sm:text-sm transition-all duration-200 hover-lift data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Sparkles className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Story</span>
                </TabsTrigger>
                <TabsTrigger value="character" className="text-xs sm:text-sm transition-all duration-200 hover-lift data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <BookUser className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Character</span>
                </TabsTrigger>
                <TabsTrigger value="progression" className="text-xs sm:text-sm transition-all duration-200 hover-lift data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <TrendingUp className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Progress</span>
                </TabsTrigger>
                <TabsTrigger value="inventory" className="text-xs sm:text-sm transition-all duration-200 hover-lift data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <PackageIcon className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Inventory</span>
                </TabsTrigger>
                 <TabsTrigger value="npcs" className="text-xs sm:text-sm transition-all duration-200 hover-lift data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <UsersIcon className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">NPCs</span>
                </TabsTrigger>
                <TabsTrigger value="journal" className="text-xs sm:text-sm transition-all duration-200 hover-lift data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <StickyNote className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Journal</span>
                </TabsTrigger>
                <TabsTrigger value="lorebook" className="text-xs sm:text-sm transition-all duration-200 hover-lift data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Library className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Lorebook</span>
                </TabsTrigger>
                <TabsTrigger value="dev-logs" className="text-xs sm:text-sm transition-all duration-200 hover-lift data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <ClipboardListIcon className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Dev Logs</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="story" className="flex flex-col flex-grow space-y-2 sm:space-y-3 overflow-hidden min-h-0">
                <div className="shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2">
                  <StoryControls
                      onUndo={handleUndo}
                      onRestart={handleRestart}
                      canUndo={storyHistory.length > 0}
                      isLoading={isLoadingInteraction}
                  />
                  <Button
                    variant="outline"
                    onClick={handleTestSimpleAction}
                    disabled={isLoadingInteraction}
                    className="sm:ml-2"
                    size="sm"
                  >
                    <TestTubeIcon className="mr-2 h-4 w-4 text-purple-500" />
                    Test Action
                  </Button>
                </div>
                <div className="shrink-0">
                  <EnhancedCharacterStatus
                      character={effectiveCharacterProfileForAI || baseCharacterProfile}
                      storyState={currentStoryState}
                      isPremiumSession={currentSession.isPremiumSession}
                      className="compact-mode"
                  />
                </div>
                {showCombatInterface && activeCombatState ? (
                  <CombatInterface
                    onCombatEnd={handleCombatEnd}
                    onActionExecuted={handleCombatActionExecuted}
                  />
                ) : (
                  <>
                    <ImmersiveStoryDisplay
                      storyHistory={storyHistory}
                      isLoadingInteraction={isLoadingInteraction}
                      onStartInteractiveCombat={handleStartInteractiveCombat}
                      isImmersiveMode={isImmersiveMode}
                      onToggleImmersiveMode={() => setIsImmersiveMode(!isImmersiveMode)}
                      onShowFloatingInput={() => setShowFloatingInput(true)}
                    />

                    {/* Smart Input Toggle - Only show when not in immersive mode */}
                    {!isImmersiveMode && (
                      <div className="shrink-0 mt-2">
                        <SmartInputToggle
                          onShowFloatingInput={() => setShowFloatingInput(true)}
                          isLoading={isLoadingInteraction}
                          variant="inline"
                        />
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="character" className="overflow-y-auto flex-grow">
                <CharacterSheet
                  character={effectiveCharacterProfileForAI || baseCharacterProfile}
                  storyState={currentStoryState}
                />
              </TabsContent>

              <TabsContent value="progression" className="overflow-y-auto flex-grow">
                <ProgressionManager
                  character={baseCharacterProfile}
                  onCharacterUpdate={(updatedCharacter) => {
                    // Update the character in the current story state
                    setStoryHistory(prevHistory => {
                      const newHistory = [...prevHistory];
                      const lastTurn = newHistory[newHistory.length - 1];
                      if (lastTurn) {
                        lastTurn.storyStateAfterScene = {
                          ...lastTurn.storyStateAfterScene,
                          character: updatedCharacter
                        };
                      }
                      return newHistory;
                    });
                  }}
                />
              </TabsContent>

              <TabsContent value="inventory" className="overflow-y-auto flex-grow">
                {baseCharacterProfile && currentStoryState && (
                  <InventoryManagerWrapper
                    character={baseCharacterProfile}
                    storyState={currentStoryState}
                    onCharacterUpdate={(updatedCharacter) => {
                      // Update the character in the current story state
                      setStoryHistory(prevHistory => {
                        const newHistory = [...prevHistory];
                        const lastTurn = newHistory[newHistory.length - 1];
                        if (lastTurn) {
                          lastTurn.storyStateAfterScene = {
                            ...lastTurn.storyStateAfterScene,
                            character: updatedCharacter
                          };
                        }
                        return newHistory;
                      });
                    }}
                    onStoryStateUpdate={(updatedStoryState) => {
                      // Update the story state
                      setStoryHistory(prevHistory => {
                        const newHistory = [...prevHistory];
                        const lastTurn = newHistory[newHistory.length - 1];
                        if (lastTurn) {
                          lastTurn.storyStateAfterScene = updatedStoryState;
                        }
                        return newHistory;
                      });
                    }}
                  />
                )}
              </TabsContent>

              <TabsContent value="npcs" className="overflow-y-auto flex-grow">
                <NPCTrackerDisplay trackedNPCs={currentStoryState.trackedNPCs as NPCProfile[]} currentTurnId={storyHistory[storyHistory.length-1]?.id || 'initial'} />
              </TabsContent>

              <TabsContent value="journal" className="overflow-y-auto flex-grow">
                <JournalDisplay
                  quests={currentStoryState.quests as Quest[]}
                  storyArcs={currentStoryState.storyArcs as StoryArc[]}
                  currentStoryArcId={currentStoryState.currentStoryArcId || undefined}
                  worldFacts={currentStoryState.worldFacts}
                />
              </TabsContent>

              <TabsContent value="lorebook" className="overflow-y-auto flex-grow">
                <LorebookDisplay />
              </TabsContent>

              <TabsContent value="dev-logs" className="overflow-y-auto flex-grow">
                <DataCorrectionLogDisplay
                  warnings={currentSession?.allDataCorrectionWarnings || []}
                  onClearLogs={handleClearCorrectionLogs}
                />
              </TabsContent>
            </Tabs>
          )}
           {currentSession && (!baseCharacterProfile || !currentStoryState) && !isLoadingInteraction && (
              <div className="text-center p-6 bg-card rounded-lg shadow-md flex-grow flex flex-col items-center justify-center">
                  <p className="text-lg text-muted-foreground mb-4">Your current session is empty or could not be fully loaded.</p>
                  <Button onClick={handleRestart}>Start a New Adventure</Button>
              </div>
          )}
        </main>
        <footer className="mt-2 text-center text-xs text-muted-foreground pb-2 sm:pb-3 shrink-0">
          <p>&copy; {new Date().getFullYear()} Story Forge. Powered by GenAI.</p>
        </footer>

        {/* Floating Input Form */}
        <FloatingInputForm
          onSubmit={handleUserAction}
          isLoading={isLoadingInteraction}
          isVisible={showFloatingInput}
          onToggleVisibility={() => setShowFloatingInput(!showFloatingInput)}
        />

        {/* Floating Action Button now handled inside ImmersiveStoryDisplay */}

        {/* Immersive Mode Help Overlay */}
        <ImmersiveHelpOverlay isImmersiveMode={isImmersiveMode} />
      </div>
    </TooltipProvider>
  );
}


