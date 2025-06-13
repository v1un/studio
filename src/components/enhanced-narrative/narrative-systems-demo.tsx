/**
 * Enhanced Narrative Systems Demo Component
 * 
 * Demonstrates the integration and usage of all four enhanced narrative systems.
 * This component can be used as a reference for implementing the systems
 * in your main game interface.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Heart, 
  Zap, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  RotateCcw
} from 'lucide-react';

import { useEnhancedNarrativeSystems } from '@/hooks/use-enhanced-narrative-systems';
import type { 
  StructuredStoryState, 
  PlayerChoice, 
  RelationshipEntry,
  GroupDynamicsEntry,
  RomanticTension,
  ChoiceConsequence,
  MemoryRetentionEntry
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

interface NarrativeSystemsDemoProps {
  storyState: StructuredStoryState;
  onStateUpdate: (newState: StructuredStoryState) => void;
  currentTurnId: string;
}

export default function NarrativeSystemsDemo({
  storyState,
  onStateUpdate,
  currentTurnId
}: NarrativeSystemsDemoProps) {
  const narrativeSystems = useEnhancedNarrativeSystems();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');

  // Activate systems on mount
  useEffect(() => {
    narrativeSystems.activateSystem();
    return () => narrativeSystems.deactivateSystem();
  }, [narrativeSystems]);

  // === DEMO ACTIONS ===

  const handleConsequenceDemo = async () => {
    setIsProcessing(true);
    setLastAction('Processing consequence chain...');

    try {
      const demoChoice: PlayerChoice = {
        id: generateUUID(),
        turnId: currentTurnId,
        timestamp: new Date().toISOString(),
        choiceText: "Help the injured stranger on the road",
        choiceDescription: "A wounded traveler needs assistance",
        alternatives: ["Ignore and continue", "Rob the stranger", "Call for help"],
        context: {
          location: storyState.currentLocation,
          npcsPresent: storyState.trackedNPCs.map(npc => npc.id),
          timeOfDay: 'evening',
          stressLevel: 30,
          availableResources: ['healing_potion', 'bandages'],
          knownInformation: ['stranger_might_be_noble', 'bandits_in_area']
        },
        questId: undefined,
        moralAlignment: 'good',
        riskLevel: 'moderate',
        emotionalWeight: 'moderate'
      };

      const updatedState = await narrativeSystems.processPlayerChoice(
        demoChoice,
        storyState,
        currentTurnId
      );

      onStateUpdate(updatedState);
      setLastAction('Consequence chain created! Check the consequences tab.');
    } catch (error) {
      console.error('Error in consequence demo:', error);
      setLastAction('Error processing consequence chain');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRelationshipDemo = async () => {
    setIsProcessing(true);
    setLastAction('Creating love triangle...');

    try {
      // Ensure we have at least 2 NPCs for the demo
      if (storyState.trackedNPCs.length < 2) {
        setLastAction('Need at least 2 NPCs for relationship demo');
        setIsProcessing(false);
        return;
      }

      const npc1 = storyState.trackedNPCs[0];
      const npc2 = storyState.trackedNPCs[1];

      let updatedState = await narrativeSystems.createLoveTriangle(
        npc1.id,
        npc2.id,
        'player',
        storyState
      );

      // Simulate jealousy event
      updatedState = await narrativeSystems.processJealousyEvent(
        npc1.id,
        npc2.id,
        'Player spent time alone with rival',
        updatedState,
        currentTurnId
      );

      onStateUpdate(updatedState);
      setLastAction(`Love triangle created between ${npc1.name} and ${npc2.name}!`);
    } catch (error) {
      console.error('Error in relationship demo:', error);
      setLastAction('Error creating relationship dynamics');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTemporalDemo = async () => {
    setIsProcessing(true);
    setLastAction('Initializing time loop...');

    try {
      let updatedState = storyState;

      // Initialize temporal mechanics if not already active
      if (!updatedState.temporalState?.loopMechanicsActive) {
        updatedState = await narrativeSystems.initializeTimeLoops(
          'Demo time loop activation',
          updatedState
        );
      }

      // Trigger a loop
      updatedState = await narrativeSystems.triggerLoop(
        'Demo death event',
        updatedState,
        true
      );

      onStateUpdate(updatedState);
      setLastAction('Time loop triggered! Memories retained.');
    } catch (error) {
      console.error('Error in temporal demo:', error);
      setLastAction('Error with temporal mechanics');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSynchronizeDemo = async () => {
    setIsProcessing(true);
    setLastAction('Synchronizing all systems...');

    try {
      const synchronizedState = await narrativeSystems.synchronizeAllSystems(
        storyState,
        currentTurnId
      );

      onStateUpdate(synchronizedState);
      setLastAction('All systems synchronized successfully!');
    } catch (error) {
      console.error('Error synchronizing systems:', error);
      setLastAction('Error synchronizing systems');
    } finally {
      setIsProcessing(false);
    }
  };

  // === RENDER HELPERS ===

  const renderConsequenceChains = () => {
    const chains = storyState.butterflyEffects || [];
    const activeChains = chains.filter(chain => chain.isActive);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Active Consequence Chains</h4>
          <Badge variant="secondary">{activeChains.length}</Badge>
        </div>
        
        {activeChains.length === 0 ? (
          <p className="text-muted-foreground">No active consequence chains</p>
        ) : (
          activeChains.map(chain => (
            <Card key={chain.id} className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{chain.originDescription}</p>
                  <p className="text-sm text-muted-foreground">
                    Level {chain.chainLevel} • Magnitude: {chain.magnitude.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Affects {chain.affectedThreads.length} story threads
                  </p>
                </div>
                <Badge variant={chain.magnitude > 2 ? "destructive" : "default"}>
                  {chain.magnitude > 2 ? "High Impact" : "Normal"}
                </Badge>
              </div>
            </Card>
          ))
        )}
      </div>
    );
  };

  const renderRelationshipWebs = () => {
    const webs = storyState.groupDynamics || [];
    const tensions = storyState.activeRomanticTensions || [];

    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Group Dynamics</h4>
          {webs.length === 0 ? (
            <p className="text-muted-foreground">No active group dynamics</p>
          ) : (
            webs.map(web => (
              <Card key={web.id} className="p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{web.groupName}</span>
                  <Badge variant="outline">{web.dynamicsType}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Cohesion</span>
                    <Progress value={web.cohesionLevel} className="w-20 h-2" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Conflict</span>
                    <Progress value={web.conflictLevel} className="w-20 h-2" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <div>
          <h4 className="font-semibold mb-2">Romantic Tensions</h4>
          {tensions.length === 0 ? (
            <p className="text-muted-foreground">No active romantic tensions</p>
          ) : (
            tensions.map(tension => (
              <Card key={tension.id} className="p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">{tension.type.replace('_', ' ')}</span>
                  <Badge variant={tension.playerInvolved ? "default" : "secondary"}>
                    {tension.playerInvolved ? "Player Involved" : "NPC Only"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Tension Level</span>
                  <Progress value={tension.tensionLevel} className="w-20 h-2" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {tension.complications.slice(0, 2).join(', ')}
                </p>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderTemporalState = () => {
    const temporal = storyState.temporalState;
    const memories = storyState.retainedMemories || [];
    const effects = storyState.psychologicalEffects || [];

    return (
      <div className="space-y-4">
        {temporal ? (
          <div>
            <h4 className="font-semibold mb-2">Loop Status</h4>
            <Card className="p-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Iteration: {temporal.currentIteration}</div>
                <div>Total Loops: {temporal.totalLoops}</div>
                <div>Awareness: {temporal.protagonistAwareness}</div>
                <div>Stability: {temporal.temporalStabilityLevel}%</div>
              </div>
            </Card>
          </div>
        ) : (
          <p className="text-muted-foreground">Temporal mechanics not active</p>
        )}

        <div>
          <h4 className="font-semibold mb-2">Retained Memories ({memories.length})</h4>
          {memories.length === 0 ? (
            <p className="text-muted-foreground">No retained memories</p>
          ) : (
            memories.slice(0, 3).map((memory, index) => (
              <Card key={index} className="p-2 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {memory.memoryType}
                  </span>
                  <Progress value={memory.retentionStrength} className="w-16 h-2" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {memory.content.slice(0, 50)}...
                </p>
              </Card>
            ))
          )}
        </div>

        <div>
          <h4 className="font-semibold mb-2">Psychological Effects ({effects.length})</h4>
          {effects.length === 0 ? (
            <p className="text-muted-foreground">No psychological effects</p>
          ) : (
            effects.map(effect => (
              <Card key={effect.id} className="p-2 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {effect.effectType.replace('_', ' ')}
                  </span>
                  <Progress value={effect.intensity} className="w-16 h-2" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {effect.manifestations.slice(0, 2).join(', ')}
                </p>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderSystemStatus = () => {
    const validation = narrativeSystems.systemValidation;

    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${narrativeSystems.isSystemActive ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="font-medium">
            System {narrativeSystems.isSystemActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {validation && (
          <div className="space-y-2">
            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {validation.errors.length} error(s) detected
                </AlertDescription>
              </Alert>
            )}

            {validation.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {validation.warnings.length} warning(s) detected
                </AlertDescription>
              </Alert>
            )}

            {validation.isValid && validation.warnings.length === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All systems operating normally
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {lastAction && (
          <div className="p-2 bg-muted rounded text-sm">
            Last Action: {lastAction}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="w-5 h-5" />
          <span>Enhanced Narrative Systems Demo</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Demo Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button 
              onClick={handleConsequenceDemo} 
              disabled={isProcessing}
              variant="outline"
              size="sm"
            >
              <Zap className="w-4 h-4 mr-1" />
              Consequences
            </Button>
            <Button 
              onClick={handleRelationshipDemo} 
              disabled={isProcessing}
              variant="outline"
              size="sm"
            >
              <Heart className="w-4 h-4 mr-1" />
              Relationships
            </Button>
            <Button 
              onClick={handleTemporalDemo} 
              disabled={isProcessing}
              variant="outline"
              size="sm"
            >
              <Clock className="w-4 h-4 mr-1" />
              Time Loop
            </Button>
            <Button 
              onClick={handleSynchronizeDemo} 
              disabled={isProcessing}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Sync All
            </Button>
          </div>

          {/* System Display */}
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="consequences">Consequences</TabsTrigger>
              <TabsTrigger value="relationships">Relationships</TabsTrigger>
              <TabsTrigger value="temporal">Temporal</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="mt-4">
              {renderSystemStatus()}
            </TabsContent>

            <TabsContent value="consequences" className="mt-4">
              {renderConsequenceChains()}
            </TabsContent>

            <TabsContent value="relationships" className="mt-4">
              {renderRelationshipWebs()}
            </TabsContent>

            <TabsContent value="temporal" className="mt-4">
              {renderTemporalState()}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
