/**
 * Generate Backstory Integration API Route
 * 
 * Server-side API endpoint for generating backstory integration.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateBackstoryIntegration } from '@/ai/flows/dynamic-progression-generation';
import type { CharacterProfile, StructuredStoryState } from '@/types/story';

export async function POST(request: NextRequest) {
  try {
    const { character, storyState, seriesName, usePremiumAI } = await request.json();
    
    // Validate required fields
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

    if (typeof usePremiumAI !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: usePremiumAI' },
        { status: 400 }
      );
    }

    console.log(`[${new Date().toISOString()}] Generate Backstory Integration API: START for character: ${character.name}, series: ${seriesName}`);

    const result = await generateBackstoryIntegration(character, storyState, seriesName, usePremiumAI);
    
    console.log(`[${new Date().toISOString()}] Generate Backstory Integration API: SUCCESS - Generated backstory integration`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Generate Backstory Integration API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Generate Backstory Integration failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Generate Backstory Integration API',
    endpoints: {
      POST: 'Generate backstory integration for character progression'
    }
  });
}
