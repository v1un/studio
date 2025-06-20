/**
 * Recipe Viewer Component
 * 
 * Displays available crafting recipes with their requirements and results.
 * Serves as a reference tool for players to see what they can craft.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Clock,
  Star,
  Package,
  Hammer,
  FlaskConical,
  Sparkles,
  ChefHat,
  Scissors,
  TreePine,
  Gem,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

import type { CraftingRecipe, EnhancedItem, CharacterProfile } from '@/types/story';

interface RecipeViewerProps {
  recipes: CraftingRecipe[];
  availableItems: EnhancedItem[];
  character: CharacterProfile;
  className?: string;
}

const categoryIcons = {
  smithing: Hammer,
  alchemy: FlaskConical,
  enchanting: Sparkles,
  cooking: ChefHat,
  tailoring: Scissors,
  woodworking: TreePine,
  jewelcrafting: Gem
};

const categoryColors = {
  smithing: 'text-orange-500',
  alchemy: 'text-green-500',
  enchanting: 'text-purple-500',
  cooking: 'text-yellow-500',
  tailoring: 'text-blue-500',
  woodworking: 'text-amber-500',
  jewelcrafting: 'text-pink-500'
};

export const RecipeViewer: React.FC<RecipeViewerProps> = ({
  recipes,
  availableItems,
  character,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get available item quantities
  const getItemQuantity = (itemId: string): number => {
    const item = availableItems.find(item => item.id === itemId);
    return item?.quantity || 0;
  };

  // Check if recipe can be crafted
  const canCraftRecipe = (recipe: CraftingRecipe): boolean => {
    return recipe.ingredients.every(ingredient => 
      getItemQuantity(ingredient.itemId) >= ingredient.quantity
    );
  };

  // Filter recipes based on search and category
  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           recipe.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || recipe.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [recipes, searchQuery, selectedCategory]);

  // Group recipes by category
  const recipesByCategory = useMemo(() => {
    const categories = ['all', ...Array.from(new Set(recipes.map(r => r.category)))];
    return categories;
  }, [recipes]);

  const RecipeCard: React.FC<{ recipe: CraftingRecipe }> = ({ recipe }) => {
    const canCraft = canCraftRecipe(recipe);
    const CategoryIcon = categoryIcons[recipe.category];
    const categoryColor = categoryColors[recipe.category];

    return (
      <Card className={`transition-all duration-200 hover:shadow-md ${canCraft ? 'border-green-200' : 'border-muted'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <CategoryIcon className={`w-5 h-5 ${categoryColor}`} />
              <CardTitle className="text-lg">{recipe.name}</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              {canCraft ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <Badge variant={canCraft ? 'default' : 'secondary'}>
                {canCraft ? 'Can Craft' : 'Missing Materials'}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{recipe.description}</p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Ingredients */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center">
              <Package className="w-4 h-4 mr-1" />
              Required Materials
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recipe.ingredients.map((ingredient, index) => {
                const available = getItemQuantity(ingredient.itemId);
                const hasEnough = available >= ingredient.quantity;
                
                return (
                  <div key={index} className={`flex items-center justify-between p-2 rounded border ${hasEnough ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <span className="text-sm font-medium">{ingredient.itemId.replace('_', ' ')}</span>
                    <span className={`text-sm ${hasEnough ? 'text-green-600' : 'text-red-600'}`}>
                      {available}/{ingredient.quantity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Recipe Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Time: {Math.floor(recipe.craftingTime / 60)}m {recipe.craftingTime % 60}s</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-muted-foreground" />
              <span>Success: {recipe.baseSuccessRate}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span>XP: {recipe.experienceGained}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span>Yields: {recipe.outputQuantity}x</span>
            </div>
          </div>

          {/* Skill Requirements */}
          {recipe.requiredSkill && (
            <div className="flex items-center space-x-2 text-sm">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              <span>Requires: {recipe.requiredSkill.skillId} Level {recipe.requiredSkill.level}</span>
            </div>
          )}

          {/* Station Requirements */}
          {recipe.requiredStation && (
            <div className="flex items-center space-x-2 text-sm">
              <Hammer className="w-4 h-4 text-muted-foreground" />
              <span>Station: {recipe.requiredStation.replace('_', ' ')}</span>
            </div>
          )}

          {/* Crafting Command Hint */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              <strong>To craft this item, type in chat:</strong>
            </p>
            <code className="text-sm bg-background px-2 py-1 rounded border">
              craft {recipe.name.toLowerCase()}
            </code>
            <p className="text-xs text-muted-foreground mt-1">
              or "make {recipe.name.toLowerCase()}" or "create {recipe.name.toLowerCase()}"
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-4 sm:grid-cols-8 w-full">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            {recipesByCategory.slice(1).map(category => (
              <TabsTrigger key={category} value={category} className="text-xs">
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Recipe List */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {filteredRecipes.length > 0 ? (
            filteredRecipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No recipes found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search or category filter'
                  : 'No crafting recipes are available'
                }
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Help Text */}
      <div className="bg-muted/30 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">How to Craft</h4>
        <p className="text-sm text-muted-foreground mb-2">
          Use the chat system to craft items by typing commands like:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <code className="bg-background px-1 rounded">craft iron sword</code></li>
          <li>• <code className="bg-background px-1 rounded">make healing potion</code></li>
          <li>• <code className="bg-background px-1 rounded">create steel armor</code></li>
        </ul>
        <p className="text-xs text-muted-foreground mt-2">
          The system will automatically check if you have the required materials and craft the item if possible.
        </p>
      </div>
    </div>
  );
};

export default RecipeViewer;
