/**
 * Character Skills Generation API Route
 * 
 * Server-side API endpoint for generating character skills and abilities.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCharacterSkills } from '@/ai/flows/generate-scenario-from-series';
import type { GenerateCharacterSkillsInput } from '@/ai/flows/generate-scenario-from-series';

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

    const input: GenerateCharacterSkillsInput = {
      seriesName: body.seriesName,
      characterProfile: body.characterProfile,
      sceneDescription: body.sceneDescription,
      currentLocation: body.currentLocation,
      usePremiumAI: body.usePremiumAI || false,
    };

    console.log(`[${new Date().toISOString()}] Character Skills generation API: START for character: ${input.characterProfile.name}`);

    const result = await generateCharacterSkills(input);
    
    console.log(`[${new Date().toISOString()}] Character Skills generation API: SUCCESS - Generated ${result.updatedCharacterProfile.skillsAndAbilities?.length || 0} skills`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Character Skills generation API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Character Skills generation failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Character Skills Generation API',
    endpoints: {
      POST: 'Generate character skills and abilities'
    }
  });
}
