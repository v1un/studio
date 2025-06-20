/**
 * Unique Abilities API Route
 * 
 * Server-side API endpoint for managing unique abilities including Return by Death.
 * This keeps the unique ability logic on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllUniqueAbilities,
  getSeriesSpecificAbilities 
} from '@/lib/default-specializations';
import { 
  unlockUniqueAbility,
  activateUniqueAbility 
} from '@/lib/specialization-engine';
import { 
  executeReturnByDeath,
  checkReturnByDeathRestrictions 
} from '@/lib/return-by-death-engine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seriesName = searchParams.get('series');
    const characterId = searchParams.get('characterId');
    
    console.log(`[${new Date().toISOString()}] Unique Abilities API: GET - series: ${seriesName}, character: ${characterId}`);

    let abilities;
    
    if (seriesName) {
      // Get series-specific abilities
      abilities = getSeriesSpecificAbilities(seriesName);
      
      // Also include general abilities
      const generalAbilities = getAllUniqueAbilities();
      abilities = [...abilities, ...generalAbilities];
    } else {
      // Get all abilities
      abilities = getAllUniqueAbilities();
    }
    
    console.log(`[${new Date().toISOString()}] Unique Abilities API: SUCCESS - Retrieved ${abilities.length} abilities`);

    return NextResponse.json({
      abilities,
      categories: ['temporal_manipulation', 'reality_alteration', 'death_defiance', 'mind_control', 'dimensional_travel', 'fate_manipulation'],
      totalCount: abilities.length
    });

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Unique Abilities API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve unique abilities', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, abilityId, characterData, storyState, context, turnId } = await request.json();
    
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

    console.log(`[${new Date().toISOString()}] Unique Abilities API: POST - action: ${action}, ability: ${abilityId}`);

    let result;

    switch (action) {
      case 'unlock_ability':
        if (!abilityId) {
          return NextResponse.json(
            { error: 'Missing required field: abilityId for unlock_ability action' },
            { status: 400 }
          );
        }
        result = await handleUnlockAbility(abilityId, characterData, context || 'Story progression');
        break;

      case 'activate_ability':
        if (!abilityId || !storyState) {
          return NextResponse.json(
            { error: 'Missing required fields: abilityId and storyState for activate_ability action' },
            { status: 400 }
          );
        }
        result = await handleActivateAbility(abilityId, characterData, storyState, context || 'Player choice', turnId);
        break;

      case 'execute_return_by_death':
        if (!storyState) {
          return NextResponse.json(
            { error: 'Missing required field: storyState for execute_return_by_death action' },
            { status: 400 }
          );
        }
        result = await handleExecuteReturnByDeath(characterData, storyState, context || 'Death', turnId);
        break;

      case 'check_restrictions':
        if (!context) {
          return NextResponse.json(
            { error: 'Missing required field: context for check_restrictions action' },
            { status: 400 }
          );
        }
        result = await handleCheckRestrictions(characterData, context);
        break;

      case 'get_character_abilities':
        result = await handleGetCharacterAbilities(characterData);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
    console.log(`[${new Date().toISOString()}] Unique Abilities API: SUCCESS - ${action} completed`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Unique Abilities API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Unique Abilities operation failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// === HANDLER FUNCTIONS ===

async function handleUnlockAbility(abilityId: string, characterData: any, context: string) {
  const allAbilities = getAllUniqueAbilities();
  const seriesAbilities = getSeriesSpecificAbilities(characterData.seriesName || 'Generic');
  const combinedAbilities = [...allAbilities, ...seriesAbilities];
  
  const ability = combinedAbilities.find(a => a.id === abilityId);
  
  if (!ability) {
    throw new Error(`Unique ability not found: ${abilityId}`);
  }

  const updatedCharacter = unlockUniqueAbility(characterData, ability, context);
  
  return {
    success: true,
    character: updatedCharacter,
    unlockedAbility: ability
  };
}

async function handleActivateAbility(
  abilityId: string, 
  characterData: any, 
  storyState: any, 
  triggerReason: string, 
  turnId: string
) {
  const result = activateUniqueAbility(
    characterData, 
    abilityId, 
    storyState, 
    triggerReason, 
    turnId || 'unknown'
  );
  
  return result;
}

async function handleExecuteReturnByDeath(
  characterData: any, 
  storyState: any, 
  deathReason: string, 
  turnId: string
) {
  const result = executeReturnByDeath(
    characterData, 
    storyState, 
    deathReason, 
    turnId || 'unknown'
  );
  
  return result;
}

async function handleCheckRestrictions(characterData: any, context: string) {
  // Parse context to extract action and additional context
  const [action, ...contextParts] = context.split('|');
  const additionalContext = contextParts.join('|');
  
  const result = checkReturnByDeathRestrictions(characterData, action, additionalContext);
  
  return {
    allowed: result.allowed,
    consequence: result.consequence,
    warning: result.warning,
    action,
    context: additionalContext
  };
}

async function handleGetCharacterAbilities(characterData: any) {
  const unlockedAbilities = characterData.unlockedUniqueAbilities || [];
  const activeAbilities = characterData.activeUniqueAbilities || [];
  const returnByDeathAbility = characterData.returnByDeathAbility;
  
  // Get available abilities based on character's series and progression
  const seriesAbilities = getSeriesSpecificAbilities(characterData.seriesName || 'Generic');
  const generalAbilities = getAllUniqueAbilities();
  
  const availableAbilities = [...seriesAbilities, ...generalAbilities].filter(ability => {
    // Check if ability is already unlocked
    const isUnlocked = unlockedAbilities.some(ua => ua.id === ability.id);
    if (isUnlocked) return false;
    
    // Check unlock conditions (simplified)
    return true; // For now, all abilities are potentially available
  });
  
  return {
    unlockedAbilities,
    activeAbilities: activeAbilities.map(abilityId => 
      unlockedAbilities.find(ua => ua.id === abilityId)
    ).filter(Boolean),
    availableAbilities,
    returnByDeathAbility,
    totalUnlocked: unlockedAbilities.length,
    totalActive: activeAbilities.length
  };
}

// === UTILITY FUNCTIONS ===

export async function PUT(request: NextRequest) {
  try {
    const { abilityId, characterData, updates } = await request.json();
    
    if (!abilityId || !characterData || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields: abilityId, characterData, updates' },
        { status: 400 }
      );
    }

    console.log(`[${new Date().toISOString()}] Unique Abilities API: PUT - updating ability: ${abilityId}`);

    // Update ability properties (cooldowns, usage history, etc.)
    const unlockedAbilities = characterData.unlockedUniqueAbilities || [];
    const updatedAbilities = unlockedAbilities.map(ability => {
      if (ability.id === abilityId) {
        return { ...ability, ...updates };
      }
      return ability;
    });

    const updatedCharacter = {
      ...characterData,
      unlockedUniqueAbilities: updatedAbilities
    };

    console.log(`[${new Date().toISOString()}] Unique Abilities API: SUCCESS - Updated ability ${abilityId}`);

    return NextResponse.json({
      success: true,
      character: updatedCharacter,
      updatedAbility: updatedAbilities.find(a => a.id === abilityId)
    });

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Unique Abilities API: PUT FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Failed to update unique ability', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}
