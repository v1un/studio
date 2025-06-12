# **Gameplay Implementation Roadmap**

## **Phase 1: Combat System Foundation (Weeks 1-4)**

### **Week 1: Combat State Management**

#### **1.1 Combat Detection & Initialization**
```typescript
// src/types/combat.ts
export interface CombatState {
  isActive: boolean;
  phase: 'initiative' | 'player_turn' | 'enemy_turn' | 'resolution';
  participants: CombatParticipant[];
  currentTurnId: string;
  turnOrder: string[];
  round: number;
  environment?: CombatEnvironment;
}

export interface CombatParticipant {
  id: string;
  name: string;
  type: 'player' | 'ally' | 'enemy';
  health: number;
  maxHealth: number;
  mana?: number;
  maxMana?: number;
  actionPoints: number;
  maxActionPoints: number;
  statusEffects: StatusEffect[];
  position?: Position;
}

export interface CombatAction {
  type: 'attack' | 'defend' | 'skill' | 'item' | 'move' | 'flee';
  actorId: string;
  targetId?: string;
  skillId?: string;
  itemId?: string;
  position?: Position;
  cost: number;
}
```

#### **1.2 Combat Hook Implementation**
```typescript
// src/hooks/use-combat-system.ts
export function useCombatSystem() {
  const [combatState, setCombatState] = useState<CombatState | null>(null);
  
  const initiateCombat = useCallback((participants: CombatParticipant[]) => {
    const turnOrder = calculateInitiative(participants);
    setCombatState({
      isActive: true,
      phase: 'initiative',
      participants,
      currentTurnId: turnOrder[0],
      turnOrder,
      round: 1,
    });
  }, []);

  const executeAction = useCallback((action: CombatAction) => {
    if (!combatState) return;
    
    const result = processCombatAction(combatState, action);
    setCombatState(result.newState);
    return result;
  }, [combatState]);

  return { combatState, initiateCombat, executeAction };
}
```

### **Week 2: Combat UI Components**

#### **2.1 Combat Interface Component**
```typescript
// src/components/combat/combat-interface.tsx
export function CombatInterface({ combatState, onAction }: CombatInterfaceProps) {
  const [selectedAction, setSelectedAction] = useState<CombatAction['type'] | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  return (
    <Card className="combat-interface">
      <CardHeader>
        <CardTitle>Combat - Round {combatState.round}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <CombatParticipantsList participants={combatState.participants} />
          <CombatActionPanel 
            availableActions={getAvailableActions(combatState)}
            onActionSelect={setSelectedAction}
            onTargetSelect={setSelectedTarget}
            onExecute={() => onAction({ type: selectedAction!, targetId: selectedTarget })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

#### **2.2 Action Selection Panel**
```typescript
// src/components/combat/action-panel.tsx
export function CombatActionPanel({ availableActions, onActionSelect }: ActionPanelProps) {
  return (
    <div className="action-panel">
      <h4>Choose Action</h4>
      <div className="grid grid-cols-2 gap-2">
        {availableActions.map(action => (
          <Button
            key={action.type}
            variant={action.available ? "default" : "secondary"}
            disabled={!action.available}
            onClick={() => onActionSelect(action.type)}
            className="action-button"
          >
            <action.icon className="w-4 h-4 mr-2" />
            {action.name}
            <Badge variant="outline" className="ml-2">{action.cost} AP</Badge>
          </Button>
        ))}
      </div>
    </div>
  );
}
```

### **Week 3: Combat Logic Implementation**

#### **3.1 Damage Calculation System**
```typescript
// src/lib/combat-calculations.ts
export function calculateDamage(
  attacker: CombatParticipant,
  target: CombatParticipant,
  action: CombatAction,
  equipment: EquipmentState
): DamageResult {
  const baseDamage = getBaseDamage(attacker, action, equipment);
  const attributeModifier = getAttributeModifier(attacker, action.type);
  const weaponBonus = getWeaponBonus(equipment.weapon, action.type);
  const skillBonus = getSkillBonus(attacker, action.skillId);
  const criticalMultiplier = calculateCritical(attacker, target);
  const resistance = getResistance(target, action.damageType);
  
  const totalDamage = Math.max(0, 
    (baseDamage + attributeModifier + weaponBonus + skillBonus) 
    * criticalMultiplier 
    - resistance
  );

  return {
    damage: totalDamage,
    isCritical: criticalMultiplier > 1,
    breakdown: {
      baseDamage,
      attributeModifier,
      weaponBonus,
      skillBonus,
      criticalMultiplier,
      resistance,
    }
  };
}
```

#### **3.2 Turn Management**
```typescript
// src/lib/combat-turn-manager.ts
export function processTurn(state: CombatState, action: CombatAction): CombatTurnResult {
  // Validate action
  if (!isValidAction(state, action)) {
    return { success: false, error: "Invalid action" };
  }

  // Execute action
  const actionResult = executeAction(state, action);
  
  // Update participant states
  const updatedParticipants = updateParticipants(state.participants, actionResult);
  
  // Check for combat end conditions
  const combatEndCheck = checkCombatEnd(updatedParticipants);
  
  // Advance turn
  const nextTurnId = getNextTurn(state.turnOrder, state.currentTurnId);
  
  return {
    success: true,
    newState: {
      ...state,
      participants: updatedParticipants,
      currentTurnId: nextTurnId,
      round: nextTurnId === state.turnOrder[0] ? state.round + 1 : state.round,
    },
    actionResult,
    combatEnd: combatEndCheck,
  };
}
```

### **Week 4: Combat Integration**

#### **4.1 AI Combat Integration**
```typescript
// src/ai/flows/combat-generation.ts
export async function generateCombatScenario(input: CombatGenerationInput) {
  const prompt = `
    Generate a combat encounter for the current story context.
    
    Context: ${input.storyContext}
    Player Level: ${input.playerLevel}
    Location: ${input.location}
    
    Provide:
    1. Enemy participants with stats
    2. Combat environment description
    3. Victory/defeat consequences
    4. Tactical considerations
  `;

  const result = await ai.generate({
    model: input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME,
    prompt,
    output: { schema: CombatScenarioSchema },
  });

  return result.output;
}
```

#### **4.2 Combat State Persistence**
```typescript
// src/hooks/use-combat-persistence.ts
export function useCombatPersistence(gameSession: GameSession) {
  const saveCombatState = useCallback((combatState: CombatState) => {
    const updatedSession = {
      ...gameSession,
      activeCombat: combatState,
      lastUpdated: new Date().toISOString(),
    };
    saveGameSession(updatedSession);
  }, [gameSession]);

  const loadCombatState = useCallback((): CombatState | null => {
    return gameSession.activeCombat || null;
  }, [gameSession]);

  return { saveCombatState, loadCombatState };
}
```

## **Phase 2: Character Progression System (Weeks 5-8)**

### **Week 5: Skill Tree Foundation**

#### **5.1 Skill Tree Data Structure**
```typescript
// src/types/progression.ts
export interface SkillTree {
  id: string;
  name: string;
  description: string;
  category: 'combat' | 'magic' | 'social' | 'utility' | 'crafting';
  nodes: SkillNode[];
  layout: SkillTreeLayout;
}

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: number;
  cost: number;
  prerequisites: string[];
  effects: SkillEffect[];
  position: { x: number; y: number };
  isUnlocked: boolean;
  isPurchased: boolean;
}

export interface SkillEffect {
  type: 'stat_bonus' | 'new_ability' | 'passive_effect' | 'unlock_content';
  target: string;
  value: number | string;
  description: string;
}
```

#### **5.2 Skill Tree Component**
```typescript
// src/components/progression/skill-tree.tsx
export function SkillTree({ tree, characterLevel, availablePoints, onNodePurchase }: SkillTreeProps) {
  return (
    <div className="skill-tree-container">
      <div className="skill-tree-header">
        <h3>{tree.name}</h3>
        <Badge>Available Points: {availablePoints}</Badge>
      </div>
      <div className="skill-tree-grid">
        {tree.nodes.map(node => (
          <SkillNode
            key={node.id}
            node={node}
            canPurchase={canPurchaseNode(node, characterLevel, availablePoints)}
            onPurchase={() => onNodePurchase(node.id)}
          />
        ))}
        <SkillTreeConnections nodes={tree.nodes} />
      </div>
    </div>
  );
}
```

### **Week 6: Attribute Point System**

#### **6.1 Attribute Allocation Interface**
```typescript
// src/components/progression/attribute-allocation.tsx
export function AttributeAllocation({ character, availablePoints, onAllocate }: AttributeAllocationProps) {
  const [pendingAllocations, setPendingAllocations] = useState<Record<string, number>>({});
  
  const attributes = [
    { key: 'strength', name: 'Strength', icon: DumbbellIcon, color: 'text-orange-500' },
    { key: 'dexterity', name: 'Dexterity', icon: VenetianMaskIcon, color: 'text-green-500' },
    { key: 'constitution', name: 'Constitution', icon: HeartIcon, color: 'text-red-600' },
    { key: 'intelligence', name: 'Intelligence', icon: BrainIcon, color: 'text-purple-500' },
    { key: 'wisdom', name: 'Wisdom', icon: EyeIcon, color: 'text-sky-500' },
    { key: 'charisma', name: 'Charisma', icon: SparklesIcon, color: 'text-pink-500' },
  ];

  return (
    <Card className="attribute-allocation">
      <CardHeader>
        <CardTitle>Attribute Points: {availablePoints}</CardTitle>
      </CardHeader>
      <CardContent>
        {attributes.map(attr => (
          <AttributeRow
            key={attr.key}
            attribute={attr}
            currentValue={character[attr.key] || 0}
            pendingValue={pendingAllocations[attr.key] || 0}
            onIncrease={() => incrementAttribute(attr.key)}
            onDecrease={() => decrementAttribute(attr.key)}
          />
        ))}
        <Button onClick={() => onAllocate(pendingAllocations)}>
          Confirm Allocation
        </Button>
      </CardContent>
    </Card>
  );
}
```

### **Week 7: Specialization Paths**

#### **7.1 Class Specialization System**
```typescript
// src/types/specialization.ts
export interface ClassSpecialization {
  id: string;
  name: string;
  description: string;
  baseClass: string;
  requirements: SpecializationRequirement[];
  bonuses: SpecializationBonus[];
  uniqueSkills: string[];
  playstyle: string;
}

export interface SpecializationRequirement {
  type: 'level' | 'attribute' | 'skill' | 'quest';
  target: string;
  value: number;
}
```

#### **7.2 Specialization Selection Interface**
```typescript
// src/components/progression/specialization-selection.tsx
export function SpecializationSelection({ character, availableSpecs, onSelect }: SpecializationSelectionProps) {
  return (
    <div className="specialization-grid">
      {availableSpecs.map(spec => (
        <Card key={spec.id} className="specialization-card">
          <CardHeader>
            <CardTitle>{spec.name}</CardTitle>
            <CardDescription>{spec.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="requirements">
              <h4>Requirements:</h4>
              {spec.requirements.map(req => (
                <RequirementItem
                  key={`${req.type}-${req.target}`}
                  requirement={req}
                  isMet={checkRequirement(character, req)}
                />
              ))}
            </div>
            <div className="bonuses">
              <h4>Bonuses:</h4>
              {spec.bonuses.map(bonus => (
                <BonusItem key={bonus.id} bonus={bonus} />
              ))}
            </div>
            <Button 
              onClick={() => onSelect(spec.id)}
              disabled={!canSelectSpecialization(character, spec)}
            >
              Select Specialization
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### **Week 8: Progression Integration**

#### **8.1 Level Up Flow**
```typescript
// src/components/progression/level-up-modal.tsx
export function LevelUpModal({ character, onComplete }: LevelUpModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [allocations, setAllocations] = useState<LevelUpAllocations>({});

  const steps = [
    { name: 'Attribute Points', component: AttributeAllocation },
    { name: 'Skill Points', component: SkillPointAllocation },
    { name: 'Specialization', component: SpecializationCheck },
    { name: 'Summary', component: LevelUpSummary },
  ];

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="level-up-modal">
        <DialogHeader>
          <DialogTitle>Level Up! Welcome to Level {character.level + 1}</DialogTitle>
        </DialogHeader>
        <div className="level-up-content">
          <StepIndicator steps={steps} currentStep={currentStep} />
          <div className="step-content">
            {React.createElement(steps[currentStep].component, {
              character,
              allocations,
              onUpdate: setAllocations,
            })}
          </div>
          <div className="step-navigation">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <Button 
              onClick={() => {
                if (currentStep === steps.length - 1) {
                  onComplete(allocations);
                } else {
                  setCurrentStep(currentStep + 1);
                }
              }}
            >
              {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## **Phase 3: Choice & Consequence System (Weeks 9-12)**

### **Week 9: Quest Branching Framework**

#### **9.1 Branching Quest Structure**
```typescript
// src/types/quest-branching.ts
export interface BranchingQuest extends Quest {
  branches: QuestBranch[];
  currentBranch?: string;
  choiceHistory: QuestChoice[];
}

export interface QuestBranch {
  id: string;
  name: string;
  description: string;
  condition: BranchCondition;
  objectives: QuestObjective[];
  rewards: QuestRewards;
  consequences: QuestConsequence[];
  nextBranches: string[];
}

export interface QuestChoice {
  id: string;
  questId: string;
  branchId: string;
  choiceText: string;
  timestamp: string;
  consequences: QuestConsequence[];
}
```

#### **9.2 Choice Presentation Component**
```typescript
// src/components/quest/choice-dialog.tsx
export function QuestChoiceDialog({ quest, availableChoices, onChoice }: QuestChoiceDialogProps) {
  return (
    <Dialog open={true}>
      <DialogContent className="quest-choice-dialog">
        <DialogHeader>
          <DialogTitle>{quest.title}</DialogTitle>
          <DialogDescription>{quest.description}</DialogDescription>
        </DialogHeader>
        <div className="choices-container">
          {availableChoices.map(choice => (
            <Card key={choice.id} className="choice-card">
              <CardContent>
                <p className="choice-text">{choice.text}</p>
                {choice.requirements && (
                  <div className="requirements">
                    {choice.requirements.map(req => (
                      <RequirementBadge 
                        key={req.id} 
                        requirement={req}
                        isMet={checkRequirement(req)}
                      />
                    ))}
                  </div>
                )}
                {choice.consequences && (
                  <div className="consequences-preview">
                    <h4>Potential Consequences:</h4>
                    {choice.consequences.map(cons => (
                      <ConsequencePreview key={cons.id} consequence={cons} />
                    ))}
                  </div>
                )}
                <Button 
                  onClick={() => onChoice(choice.id)}
                  disabled={!canMakeChoice(choice)}
                  className="choice-button"
                >
                  Choose This Path
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### **Week 10-12: Implementation continues...**

## **Quick Implementation Wins**

### **Immediate (This Week)**
1. **Combat Action Selection**: Add basic attack/defend/item buttons to combat
2. **Attribute Point Display**: Show available points on level up
3. **Choice Indicators**: Highlight when story choices have consequences
4. **Equipment Comparison**: Show stat changes when hovering items

### **Next Week**
5. **Skill Point System**: Add skill points that unlock abilities
6. **Difficulty Toggle**: Basic easy/normal/hard mode selection
7. **Character Build Summary**: Show current character build and specialization
8. **Quest Choice History**: Track and display previous important choices

These implementations will immediately enhance player engagement while building toward the comprehensive systems outlined in the full roadmap.
