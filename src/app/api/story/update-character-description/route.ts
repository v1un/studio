/**
 * Update Character Description API Route
 * 
 * Server-side API endpoint for updating character description.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateCharacterDescription } from '@/ai/flows/update-character-description-flow';
import type { UpdateCharacterDescriptionInput } from '@/ai/flows/update-character-description-flow';

export async function POST(request: NextRequest) {
  try {
    const input: UpdateCharacterDescriptionInput = await request.json();
    
    // Validate required fields
    if (!input.seriesName) {
      return NextResponse.json(
        { error: 'Missing required field: seriesName' },
        { status: 400 }
      );
    }

    if (!input.characterProfile) {
      return NextResponse.json(
        { error: 'Missing required field: characterProfile' },
        { status: 400 }
      );
    }

    if (!input.storyState) {
      return NextResponse.json(
        { error: 'Missing required field: storyState' },
        { status: 400 }
      );
    }

    if (typeof input.usePremiumAI !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: usePremiumAI' },
        { status: 400 }
      );
    }

    console.log(`[${new Date().toISOString()}] Update Character Description API: START for series: ${input.seriesName}, character: ${input.characterProfile.name}`);

    const result = await updateCharacterDescription(input);
    
    console.log(`[${new Date().toISOString()}] Update Character Description API: SUCCESS - Updated character description`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Update Character Description API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Update Character Description failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Update Character Description API',
    endpoints: {
      POST: 'Update character description based on story progression'
    }
  });
}
