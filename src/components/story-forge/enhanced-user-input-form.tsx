"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Send, Search, Package, User, MapPin, Sword, Shield, 
  Eye, MessageSquare, Bed, ArrowRight, Lightbulb 
} from "lucide-react";
import type { StructuredStoryState, Item, NPCProfile } from "@/types/story";

interface InputSuggestion {
  type: 'action' | 'item' | 'npc' | 'location' | 'quest' | 'common';
  text: string;
  description?: string;
  icon: React.ElementType;
  category: string;
}

interface EnhancedUserInputFormProps {
  onSubmit: (input: string) => void;
  isLoading: boolean;
  storyState?: StructuredStoryState;
}

const useInputSuggestions = (storyState?: StructuredStoryState): InputSuggestion[] => {
  return useMemo(() => {
    if (!storyState) return [];
    
    const suggestions: InputSuggestion[] = [];
    
    // Common actions (always available)
    const commonActions: InputSuggestion[] = [
      { type: 'common', text: 'Look around', description: 'Examine your surroundings', icon: Eye, category: 'Exploration' },
      { type: 'common', text: 'Check inventory', description: 'Review your items', icon: Package, category: 'Inventory' },
      { type: 'common', text: 'Rest', description: 'Take a moment to recover', icon: Bed, category: 'Recovery' },
      { type: 'common', text: 'Continue forward', description: 'Move ahead', icon: ArrowRight, category: 'Movement' },
    ];
    suggestions.push(...commonActions);
    
    // Available items (usable/equippable)
    storyState.inventory.forEach(item => {
      if (item.isConsumable) {
        suggestions.push({
          type: 'item',
          text: `Use ${item.name}`,
          description: item.effectDescription || item.description,
          icon: Package,
          category: 'Items'
        });
      } else if (item.equipSlot) {
        suggestions.push({
          type: 'item',
          text: `Equip ${item.name}`,
          description: `Equip to ${item.equipSlot} slot`,
          icon: item.equipSlot === 'weapon' ? Sword : Shield,
          category: 'Equipment'
        });
      } else {
        suggestions.push({
          type: 'item',
          text: `Examine ${item.name}`,
          description: item.description,
          icon: Search,
          category: 'Items'
        });
      }
    });
    
    // Nearby NPCs
    storyState.trackedNPCs.forEach(npc => {
      suggestions.push({
        type: 'npc',
        text: `Talk to ${npc.name}`,
        description: npc.description.substring(0, 60) + '...',
        icon: MessageSquare,
        category: 'NPCs'
      });
      
      if (npc.isMerchant) {
        suggestions.push({
          type: 'npc',
          text: `Trade with ${npc.name}`,
          description: 'Browse merchant inventory',
          icon: Package,
          category: 'Trading'
        });
      }
    });
    
    // Active quests
    storyState.quests.filter(q => q.status === 'active').forEach(quest => {
      suggestions.push({
        type: 'quest',
        text: `Work on: ${quest.title || quest.description.substring(0, 30) + '...'}`,
        description: quest.description,
        icon: Search,
        category: 'Quests'
      });
    });
    
    // Location-based actions
    suggestions.push({
      type: 'location',
      text: `Explore ${storyState.currentLocation}`,
      description: 'Look for points of interest',
      icon: MapPin,
      category: 'Exploration'
    });
    
    return suggestions;
  }, [storyState]);
};

const QuickActionBar: React.FC<{ 
  onAction: (action: string) => void;
  disabled: boolean;
}> = ({ onAction, disabled }) => {
  const quickActions = [
    { label: 'Look', icon: Eye, action: 'I look around carefully, taking in my surroundings.' },
    { label: 'Inventory', icon: Package, action: 'I check my inventory to see what I have.' },
    { label: 'Rest', icon: Bed, action: 'I take a moment to rest and gather my thoughts.' },
  ];

  return (
    <div className="flex gap-2 mb-3">
      {quickActions.map(({ label, icon: Icon, action }) => (
        <Button
          key={label}
          variant="outline"
          size="sm"
          onClick={() => onAction(action)}
          disabled={disabled}
          className="flex items-center gap-1 text-xs"
        >
          <Icon className="w-3 h-3" />
          {label}
        </Button>
      ))}
    </div>
  );
};

const SuggestionsList: React.FC<{
  suggestions: InputSuggestion[];
  onSelect: (suggestion: InputSuggestion) => void;
  searchTerm: string;
}> = ({ suggestions, onSelect, searchTerm }) => {
  const filteredSuggestions = useMemo(() => {
    if (!searchTerm) return suggestions.slice(0, 12); // Limit initial display
    
    return suggestions.filter(s => 
      s.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 8);
  }, [suggestions, searchTerm]);
  
  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, InputSuggestion[]> = {};
    filteredSuggestions.forEach(suggestion => {
      if (!groups[suggestion.category]) {
        groups[suggestion.category] = [];
      }
      groups[suggestion.category].push(suggestion);
    });
    return groups;
  }, [filteredSuggestions]);
  
  if (filteredSuggestions.length === 0) return null;
  
  return (
    <Card className="mt-2 max-h-64 overflow-y-auto">
      <CardContent className="p-3">
        {Object.entries(groupedSuggestions).map(([category, items], categoryIndex) => (
          <div key={category}>
            {categoryIndex > 0 && <Separator className="my-2" />}
            <div className="mb-2">
              <Badge variant="secondary" className="text-xs mb-2">{category}</Badge>
              <div className="space-y-1">
                {items.map((suggestion, index) => {
                  const Icon = suggestion.icon;
                  return (
                    <button
                      key={`${category}-${index}`}
                      onClick={() => onSelect(suggestion)}
                      className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors flex items-start gap-2"
                    >
                      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{suggestion.text}</div>
                        {suggestion.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {suggestion.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default function EnhancedUserInputForm({ 
  onSubmit, 
  isLoading, 
  storyState 
}: EnhancedUserInputFormProps) {
  const [userInput, setUserInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestions = useInputSuggestions(storyState);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      onSubmit(userInput.trim());
      setUserInput("");
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = (suggestion: InputSuggestion) => {
    setUserInput(suggestion.text);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const handleQuickAction = (action: string) => {
    onSubmit(action);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []); // Dependencies are correct - no state dependencies needed

  return (
    <div className="w-full space-y-4">
      <QuickActionBar onAction={handleQuickAction} disabled={isLoading} />
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Label htmlFor="user-action" className="sr-only">Your Action</Label>
          <Textarea
            ref={textareaRef}
            id="user-action"
            placeholder="What do you do next? (Click the lightbulb for suggestions)"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            rows={3}
            disabled={isLoading}
            className="text-base shadow-sm pr-12"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="absolute right-2 top-2 h-8 w-8 p-0"
            disabled={isLoading}
          >
            <Lightbulb className="w-4 h-4" />
          </Button>
        </div>
        
        {showSuggestions && (
          <SuggestionsList
            suggestions={suggestions}
            onSelect={handleSuggestionSelect}
            searchTerm={userInput}
          />
        )}
        
        <Button 
          type="submit" 
          disabled={isLoading || !userInput.trim()} 
          className="w-full text-lg py-6"
        >
          <Send className="mr-2 h-5 w-5" />
          {isLoading ? "Processing..." : "Send Action"}
        </Button>
      </form>
    </div>
  );
}
