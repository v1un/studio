/**
 * Character & Scene Generation API Route
 * 
 * Server-side API endpoint for generating character profiles and opening scenes.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCharacterAndScene } from '@/ai/flows/generate-scenario-from-series';
import type { GenerateCharacterAndSceneInput } from '@/ai/flows/generate-scenario-from-series';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.seriesName) {
      return NextResponse.json(
        { error: 'Missing required field: seriesName' },
        { status: 400 }
      );
    }

    const input: GenerateCharacterAndSceneInput = {
      seriesName: body.seriesName,
      characterNameInput: body.characterNameInput,
      characterClassInput: body.characterClassInput,
      usePremiumAI: body.usePremiumAI || false,
    };

    console.log(`[${new Date().toISOString()}] Character & Scene generation API: START for series: ${input.seriesName}`);

    const result = await generateCharacterAndScene(input);
    
    console.log(`[${new Date().toISOString()}] Character & Scene generation API: SUCCESS - Generated character: ${result.characterProfile.name}`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Character & Scene generation API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Character & Scene generation failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Character & Scene Generation API',
    endpoints: {
      POST: 'Generate character profile and opening scene'
    }
  });
}
