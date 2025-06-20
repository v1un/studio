/**
 * World Facts Generation API Route
 * 
 * Server-side API endpoint for generating world facts and lore.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateWorldFacts } from '@/ai/flows/generate-scenario-from-series';
import type { GenerateWorldFactsInput } from '@/ai/flows/generate-scenario-from-series';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.seriesName || !body.characterProfile || !body.sceneDescription || !body.currentLocation) {
      return NextResponse.json(
        { error: 'Missing required fields: seriesName, characterProfile, sceneDescription, currentLocation' },
        { status: 400 }
      );
    }

    const input: GenerateWorldFactsInput = {
      seriesName: body.seriesName,
      characterProfile: body.characterProfile,
      sceneDescription: body.sceneDescription,
      currentLocation: body.currentLocation,
      usePremiumAI: body.usePremiumAI || false,
    };

    console.log(`[${new Date().toISOString()}] World Facts generation API: START for series: ${input.seriesName}`);

    const result = await generateWorldFacts(input);
    
    console.log(`[${new Date().toISOString()}] World Facts generation API: SUCCESS - Generated ${result.worldFacts.length} facts`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] World Facts generation API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'World Facts generation failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'World Facts Generation API',
    endpoints: {
      POST: 'Generate world facts and lore'
    }
  });
}
