/**
 * Generate Progression Recommendations API Route
 * 
 * Server-side API endpoint for generating progression recommendations.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateProgressionRecommendations } from '@/ai/flows/dynamic-progression-generation';
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

    console.log(`[${new Date().toISOString()}] Generate Progression Recommendations API: START for character: ${character.name}, series: ${seriesName}`);

    const result = await generateProgressionRecommendations(character, storyState, seriesName, usePremiumAI);
    
    console.log(`[${new Date().toISOString()}] Generate Progression Recommendations API: SUCCESS - Generated recommendations`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Generate Progression Recommendations API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Generate Progression Recommendations failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Generate Progression Recommendations API',
    endpoints: {
      POST: 'Generate progression recommendations for character'
    }
  });
}
