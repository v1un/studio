/**
 * Combat Generation API Route
 * 
 * Server-side API endpoint for generating combat scenarios.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCombatScenario } from '@/ai/flows/combat-generation';
import type { CombatGenerationInput } from '@/ai/flows/combat-generation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.storyContext || !body.playerCharacter || !body.currentLocation) {
      return NextResponse.json(
        { error: 'Missing required fields: storyContext, playerCharacter, currentLocation' },
        { status: 400 }
      );
    }

    const input = {
      storyContext: body.storyContext,
      playerCharacter: body.playerCharacter,
      currentLocation: body.currentLocation,
      storyState: body.storyState,
      combatTrigger: body.combatTrigger || 'player_action',
      difficultyLevel: body.difficultyLevel || 'medium',
      usePremiumAI: body.usePremiumAI || false,
      specialRequirements: body.specialRequirements,
    } as CombatGenerationInput;

    console.log(`[${new Date().toISOString()}] Combat generation API: START for ${input.combatTrigger} at ${input.currentLocation}`);

    const result = await generateCombatScenario(input);
    
    console.log(`[${new Date().toISOString()}] Combat generation API: SUCCESS - Generated ${result.enemies.length} enemies`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Combat generation API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Combat generation failed', 
        details: error.message,
        // Fallback combat scenario for development
        fallback: {
          enemies: [{
            id: 'fallback-enemy',
            name: 'Training Dummy',
            type: 'enemy' as const,
            health: 50,
            maxHealth: 50,
            attack: 10,
            defense: 5,
            speed: 8,
            accuracy: 80,
            evasion: 10,
            criticalChance: 5,
            criticalMultiplier: 1.5,
            actionPoints: 2,
            maxActionPoints: 2,
            initiative: 8,
            statusEffects: [],
            availableSkills: [],
            availableItems: [],
            aiProfile: {
              behavior: 'balanced' as const,
              priority: 'damage' as const,
              riskTolerance: 'medium' as const,
              preferredRange: 'melee' as const,
              specialTactics: [],
            }
          }],
          allies: [],
          environment: {
            id: 'fallback-env',
            name: 'Training Ground',
            description: 'A simple training area for combat practice.',
            effects: [],
            terrain: 'open' as const,
            visibility: 'clear' as const,
            size: 'normal' as const,
          },
          victoryConditions: [{
            type: 'defeat_all_enemies' as const,
            description: 'Defeat all enemies',
            completed: false,
          }],
          defeatConditions: [{
            type: 'player_death' as const,
            description: 'Player is defeated',
            triggered: false,
          }],
          combatDescription: 'A simple training combat encounter.',
          tacticalConsiderations: ['Focus on basic attack and defense', 'Manage your action points carefully'],
        }
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Combat Generation API',
    endpoints: {
      POST: 'Generate a combat scenario'
    }
  });
}
