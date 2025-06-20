/**
 * Specialization Trees API Route
 * 
 * Server-side API endpoint for managing specialization trees.
 * This keeps the specialization logic on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSpecializationTrees,
  getSpecializationTreesByCategory,
  getSeriesSpecificSpecializations
} from '@/lib/default-specializations';
import {
  getAvailableSpecializationTrees,
  generateDynamicSpecializations
} from '@/lib/specialization-engine';
import type { SpecializationCategory } from '@/types/story';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as SpecializationCategory | null;
    const seriesName = searchParams.get('series');
    
    console.log(`[${new Date().toISOString()}] Specialization Trees API: GET - category: ${category}, series: ${seriesName}`);

    let trees;
    
    if (seriesName) {
      // Get series-specific specializations
      trees = getSeriesSpecificSpecializations(seriesName);
      
      // Also include general trees if no category filter
      if (!category) {
        const generalTrees = getAllSpecializationTrees().filter(tree => !tree.seriesOrigin);
        trees = [...trees, ...generalTrees];
      }
    } else if (category) {
      // Get trees by category
      trees = getSpecializationTreesByCategory(category);
    } else {
      // Get all trees
      trees = getAllSpecializationTrees();
    }
    
    console.log(`[${new Date().toISOString()}] Specialization Trees API: SUCCESS - Retrieved ${trees.length} trees`);

    return NextResponse.json({
      trees,
      categories: ['combat', 'magic', 'social', 'utility', 'unique', 'defensive', 'support', 'crafting', 'exploration', 'leadership'],
      totalCount: trees.length
    });

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Specialization Trees API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve specialization trees', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, treeId, nodeId, characterData, turnId, storyState, seriesName } = await request.json();
    
    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    if (!characterData) {
      return NextResponse.json(
        { error: 'Missing required field: characterData' },
        { status: 400 }
      );
    }

    console.log(`[${new Date().toISOString()}] Specialization Trees API: POST - action: ${action}, tree: ${treeId}, node: ${nodeId}`);

    let result;

    switch (action) {
      case 'unlock_tree':
        if (!treeId) {
          return NextResponse.json(
            { error: 'Missing required field: treeId for unlock_tree action' },
            { status: 400 }
          );
        }
        result = await handleUnlockTree(treeId, characterData);
        break;

      case 'purchase_node':
        if (!treeId || !nodeId) {
          return NextResponse.json(
            { error: 'Missing required fields: treeId and nodeId for purchase_node action' },
            { status: 400 }
          );
        }
        result = await handlePurchaseNode(treeId, nodeId, characterData, turnId);
        break;

      case 'get_available_trees':
        result = await handleGetAvailableTrees(characterData, storyState, seriesName);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
    console.log(`[${new Date().toISOString()}] Specialization Trees API: SUCCESS - ${action} completed`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Specialization Trees API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Specialization Trees operation failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// === HANDLER FUNCTIONS ===

async function handleUnlockTree(treeId: string, characterData: any) {
  const { unlockSpecializationTree } = await import('@/lib/specialization-engine');
  const { getAllSpecializationTrees } = await import('@/lib/default-specializations');
  
  const allTrees = getAllSpecializationTrees();
  const tree = allTrees.find(t => t.id === treeId);
  
  if (!tree) {
    throw new Error(`Specialization tree not found: ${treeId}`);
  }

  const progression = characterData.specializationProgression || {
    characterId: characterData.name,
    availablePoints: 0,
    totalPointsEarned: 0,
    activeSpecializations: [],
    specializationTrees: {},
    unlockedUniqueAbilities: [],
    activeUniqueAbilities: [],
    progressionHistory: [],
    seriesSpecializations: {}
  };

  const result = unlockSpecializationTree(progression, tree, characterData);
  
  return {
    success: result.success,
    progression: result.progression,
    error: result.error,
    unlockedTree: result.success ? tree : null
  };
}

async function handlePurchaseNode(treeId: string, nodeId: string, characterData: any, turnId: string) {
  const { purchaseSpecializationNode } = await import('@/lib/specialization-engine');
  
  const progression = characterData.specializationProgression;
  if (!progression) {
    throw new Error('Character has no specialization progression data');
  }

  const result = purchaseSpecializationNode(progression, treeId, nodeId, turnId || 'unknown');
  
  return {
    success: result.success,
    progression: result.progression,
    error: result.error,
    purchasedNode: result.success ? { treeId, nodeId } : null
  };
}

async function handleGetAvailableTrees(characterData: any, storyState?: any, seriesName?: string) {
  try {
    // Use the enhanced function that includes dynamic generation
    const result = await getAvailableSpecializationTrees(
      characterData,
      storyState,
      seriesName || 'Generic Fantasy',
      true // Include dynamic trees
    );

    return {
      success: true,
      availableTrees: result.availableTrees,
      lockedTrees: result.lockedTrees,
      dynamicTreesGenerated: result.availableTrees.filter(tree => tree.seriesOrigin).length,
      totalTrees: result.availableTrees.length + result.lockedTrees.length
    };
  } catch (error) {
    console.error('[API] Failed to get available trees:', error);

    // Fallback to basic trees only
    const allTrees = getAllSpecializationTrees();
    const availableTrees = [];
    const lockedTrees = [];

    for (const tree of allTrees) {
      const canUnlock = tree.unlockRequirements.every(req => {
        if (req.type === 'level') {
          return characterData.level >= Number(req.value);
        }
        if (req.type === 'attribute') {
          return (characterData[req.target] || 0) >= Number(req.value);
        }
        return true;
      });

      if (canUnlock) {
        availableTrees.push(tree);
      } else {
        lockedTrees.push({
          tree,
          missingRequirements: tree.unlockRequirements.filter(req => {
            if (req.type === 'level') {
              return characterData.level < Number(req.value);
            }
            if (req.type === 'attribute') {
              return (characterData[req.target] || 0) < Number(req.value);
            }
            return false;
          })
        });
      }
    }

    return {
      success: true,
      availableTrees,
      lockedTrees,
      dynamicTreesGenerated: 0,
      totalTrees: allTrees.length,
      fallbackUsed: true
    };
  }
}
