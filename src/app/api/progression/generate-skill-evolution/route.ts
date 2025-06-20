/**
 * Generate Skill Evolution Chain API Route
 * 
 * Server-side API endpoint for generating skill evolution chains.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSkillEvolutionChain } from '@/ai/flows/skill-evolution-generation';
import type { DynamicSkillNode, CharacterProfile, StructuredStoryState, SkillBranchTheme } from '@/types/story';

export async function POST(request: NextRequest) {
  try {
    const { baseSkill, character, storyState, seriesName, options } = await request.json();
    
    // Validate required fields
    if (!baseSkill) {
      return NextResponse.json(
        { error: 'Missing required field: baseSkill' },
        { status: 400 }
      );
    }

    if (!character) {
      return NextResponse.json(
        { error: 'Missing required field: character' },
        { status: 400 }
      );
    }

    if (!storyState) {
      return NextResponse.json(
        { error: 'Missing required field: storyState' },
        { status: 400 }
      );
    }

    if (!seriesName) {
      return NextResponse.json(
        { error: 'Missing required field: seriesName' },
        { status: 400 }
      );
    }

    console.log(`[${new Date().toISOString()}] Generate Skill Evolution Chain API: START for skill: ${baseSkill.name}, character: ${character.name}, series: ${seriesName}`);

    const result = await generateSkillEvolutionChain(
      baseSkill as DynamicSkillNode,
      character as CharacterProfile,
      storyState as StructuredStoryState,
      seriesName,
      options || {}
    );
    
    console.log(`[${new Date().toISOString()}] Generate Skill Evolution Chain API: SUCCESS - Generated evolution chain`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Generate Skill Evolution Chain API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Generate Skill Evolution Chain failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Generate Skill Evolution Chain API',
    endpoints: {
      POST: 'Generate skill evolution chain for dynamic progression'
    }
  });
}
