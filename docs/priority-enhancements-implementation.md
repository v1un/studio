# Priority Enhancements - Implementation Guide

## Overview

This document provides detailed implementation guidance for the highest-priority enhancements identified in the codebase analysis. These improvements focus on immediate user experience gains and technical debt reduction.

## 🎯 Priority 1: Enhanced Input System

### Current Implementation Analysis
```typescript
// Current: src/components/story-forge/user-input-form.tsx
// Simple textarea with basic submit functionality
```

### Enhancement Implementation

#### A. Smart Input Suggestions
```typescript
// New: src/components/story-forge/enhanced-input-form.tsx
interface InputSuggestion {
  type: 'action' | 'item' | 'npc' | 'location';
  text: string;
  description?: string;
  icon?: string;
}

const useInputSuggestions = (storyState: StructuredStoryState) => {
  return useMemo(() => {
    const suggestions: InputSuggestion[] = [];
    
    // Add available items
    storyState.inventory.forEach(item => {
      suggestions.push({
        type: 'item',
        text: `Use ${item.name}`,
        description: item.description,
        icon: 'package'
      });
    });
    
    // Add nearby NPCs
    storyState.trackedNPCs.forEach(npc => {
      suggestions.push({
        type: 'npc',
        text: `Talk to ${npc.name}`,
        description: npc.description,
        icon: 'user'
      });
    });
    
    // Add common actions
    suggestions.push(
      { type: 'action', text: 'Look around', icon: 'eye' },
      { type: 'action', text: 'Check inventory', icon: 'backpack' },
      { type: 'action', text: 'Rest', icon: 'bed' }
    );
    
    return suggestions;
  }, [storyState]);
};
```

#### B. Quick Action Buttons
```typescript
const QuickActionBar: React.FC<{ onAction: (action: string) => void }> = ({ onAction }) => {
  const quickActions = [
    { label: 'Examine', icon: Search, action: 'I examine my surroundings carefully.' },
    { label: 'Inventory', icon: Package, action: 'I check my inventory.' },
    { label: 'Rest', icon: Moon, action: 'I take a moment to rest.' },
  ];

  return (
    <div className="flex gap-2 mb-4">
      {quickActions.map(({ label, icon: Icon, action }) => (
        <Button
          key={label}
          variant="outline"
          size="sm"
          onClick={() => onAction(action)}
          className="flex items-center gap-1"
        >
          <Icon className="w-4 h-4" />
          {label}
        </Button>
      ))}
    </div>
  );
};
```

## 🎯 Priority 2: Visual Inventory System

### Current Implementation Analysis
```typescript
// Current: Basic list in character-sheet.tsx
// Limited interaction, no visual management
```

### Enhancement Implementation

#### A. Drag-and-Drop Inventory Grid
```typescript
// New: src/components/story-forge/inventory-grid.tsx
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';

interface InventorySlot {
  id: string;
  item?: Item;
  type: 'inventory' | 'equipment';
  equipSlot?: EquipmentSlot;
}

const InventoryGrid: React.FC<{
  inventory: Item[];
  equippedItems: Partial<Record<EquipmentSlot, Item | null>>;
  onItemMove: (itemId: string, targetSlot: string) => void;
}> = ({ inventory, equippedItems, onItemMove }) => {
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onItemMove(active.id as string, over.id as string);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 gap-6">
        {/* Equipment Slots */}
        <div className="space-y-2">
          <h3 className="font-semibold">Equipment</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(equippedItems).map(([slot, item]) => (
              <EquipmentSlot
                key={slot}
                slot={slot as EquipmentSlot}
                item={item}
              />
            ))}
          </div>
        </div>
        
        {/* Inventory Grid */}
        <div className="space-y-2">
          <h3 className="font-semibold">Inventory</h3>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 20 }).map((_, index) => (
              <InventorySlot
                key={index}
                item={inventory[index]}
                slotId={`inventory-${index}`}
              />
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  );
};
```

#### B. Item Comparison Tooltips
```typescript
const ItemComparisonTooltip: React.FC<{
  item: Item;
  equippedItem?: Item;
  character: CharacterProfile;
}> = ({ item, equippedItem, character }) => {
  const statChanges = useMemo(() => {
    if (!item.activeEffects || !equippedItem?.activeEffects) return [];
    
    // Calculate stat differences
    return calculateStatDifferences(item.activeEffects, equippedItem.activeEffects);
  }, [item, equippedItem]);

  return (
    <div className="p-3 max-w-sm">
      <div className="font-semibold">{item.name}</div>
      <div className="text-sm text-muted-foreground">{item.description}</div>
      
      {statChanges.length > 0 && (
        <div className="mt-2 pt-2 border-t">
          <div className="text-xs font-semibold">Stat Changes:</div>
          {statChanges.map(change => (
            <div key={change.stat} className={`text-xs ${change.value > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change.stat}: {change.value > 0 ? '+' : ''}{change.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## 🎯 Priority 3: Performance Optimization

### Current Implementation Analysis
```typescript
// Current: Direct localStorage usage, no caching strategy
// Potential for unnecessary re-renders and API calls
```

### Enhancement Implementation

#### A. React Query Integration
```typescript
// New: src/lib/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useSceneGeneration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: GenerateNextSceneInput) => {
      const { generateNextSceneOptimized } = await import('@/ai/flows/generate-next-scene');
      return generateNextSceneOptimized(input);
    },
    onSuccess: (data, variables) => {
      // Cache the result for potential retry scenarios
      queryClient.setQueryData(['scene', variables.currentTurnId], data);
    },
    onError: (error) => {
      console.error('Scene generation failed:', error);
    }
  });
};

export const useStoryState = (sessionId: string) => {
  return useQuery({
    queryKey: ['storyState', sessionId],
    queryFn: () => {
      const sessionData = localStorage.getItem(`storyForgeSession_${sessionId}`);
      return sessionData ? JSON.parse(sessionData) : null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};
```

#### B. Optimistic Updates
```typescript
// New: src/hooks/use-optimistic-story.ts
export const useOptimisticStory = () => {
  const [optimisticState, setOptimisticState] = useState<StructuredStoryState | null>(null);
  const sceneGeneration = useSceneGeneration();
  
  const submitAction = useCallback(async (userInput: string, currentState: StructuredStoryState) => {
    // Immediately show user message
    const optimisticMessage: DisplayMessage = {
      id: `temp-${Date.now()}`,
      speakerType: 'Player',
      speakerNameLabel: currentState.character.name,
      content: userInput,
      isPlayer: true,
    };
    
    // Update UI immediately
    setOptimisticState(produce(currentState, draft => {
      // Add optimistic changes
    }));
    
    try {
      const result = await sceneGeneration.mutateAsync({
        userInput,
        storyState: currentState,
        // ... other params
      });
      
      // Replace optimistic state with real result
      setOptimisticState(null);
      return result;
    } catch (error) {
      // Rollback optimistic changes
      setOptimisticState(null);
      throw error;
    }
  }, [sceneGeneration]);
  
  return { submitAction, isOptimistic: optimisticState !== null };
};
```

## 🎯 Priority 4: Enhanced Error Handling

### Current Implementation Analysis
```typescript
// Current: Basic try-catch with toast notifications
// Limited error recovery and user guidance
```

### Enhancement Implementation

#### A. Error Boundary with Recovery
```typescript
// New: src/components/error-boundary.tsx
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class StoryForgeErrorBoundary extends Component<
  PropsWithChildren<{ fallback?: ComponentType<{ error: Error; retry: () => void }> }>,
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Story Forge Error:', error, errorInfo);
    
    // Send to error tracking service
    if (typeof window !== 'undefined') {
      // Analytics or error tracking
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} retry={this.retry} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="p-6 text-center">
    <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
    <p className="text-muted-foreground mb-4">{error.message}</p>
    <Button onClick={retry}>Try Again</Button>
  </div>
);
```

#### B. Graceful AI Failure Recovery
```typescript
// New: src/hooks/use-ai-fallback.ts
export const useAIFallback = () => {
  const [fallbackMode, setFallbackMode] = useState(false);
  
  const executeWithFallback = useCallback(async <T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>,
    options?: { maxRetries?: number }
  ): Promise<T> => {
    const maxRetries = options?.maxRetries ?? 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt === 0 && !fallbackMode) {
          return await primaryFn();
        } else {
          setFallbackMode(true);
          return await fallbackFn();
        }
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw new Error('All attempts failed');
  }, [fallbackMode]);
  
  return { executeWithFallback, fallbackMode };
};
```

## 🎯 Priority 5: Accessibility Improvements

### Current Implementation Analysis
```typescript
// Current: Basic semantic HTML, limited ARIA support
// Missing keyboard navigation and screen reader optimization
```

### Enhancement Implementation

#### A. Enhanced Keyboard Navigation
```typescript
// New: src/hooks/use-keyboard-navigation.ts
export const useKeyboardNavigation = (items: string[], onSelect: (item: string) => void) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          event.preventDefault();
          onSelect(items[selectedIndex]);
          break;
        case 'Escape':
          event.preventDefault();
          setSelectedIndex(0);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onSelect]);
  
  return selectedIndex;
};
```

#### B. Screen Reader Optimization
```typescript
// New: src/components/story-forge/accessible-story-display.tsx
const AccessibleStoryDisplay: React.FC<{ messages: DisplayMessage[] }> = ({ messages }) => {
  const [announcements, setAnnouncements] = useState<string[]>([]);
  
  useEffect(() => {
    // Announce new messages to screen readers
    const latestMessage = messages[messages.length - 1];
    if (latestMessage && !latestMessage.isPlayer) {
      const announcement = `${latestMessage.speakerNameLabel}: ${latestMessage.content}`;
      setAnnouncements(prev => [...prev, announcement]);
    }
  }, [messages]);
  
  return (
    <>
      {/* Live region for screen reader announcements */}
      <div aria-live="polite" aria-atomic="false" className="sr-only">
        {announcements.map((announcement, index) => (
          <div key={index}>{announcement}</div>
        ))}
      </div>
      
      {/* Main story content */}
      <div role="log" aria-label="Story progression">
        {messages.map((message, index) => (
          <div
            key={message.id}
            role="article"
            aria-labelledby={`speaker-${index}`}
            className="mb-4"
          >
            <div id={`speaker-${index}`} className="font-semibold">
              {message.speakerNameLabel}
            </div>
            <div aria-describedby={`speaker-${index}`}>
              {message.content}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
```

## 📋 Implementation Timeline

### Week 1-2: Foundation
1. Set up React Query and error boundaries
2. Implement basic keyboard navigation
3. Add input suggestions framework

### Week 3-4: Core Features
1. Complete enhanced input system
2. Implement visual inventory grid
3. Add optimistic updates

### Week 5-6: Polish & Testing
1. Accessibility improvements
2. Performance optimization
3. Error handling refinement

### Week 7-8: Integration & Testing
1. Integration testing
2. User acceptance testing
3. Performance monitoring setup

This implementation guide provides the technical foundation for the highest-priority enhancements while maintaining code quality and user experience standards.
