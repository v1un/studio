/**
 * Scenario Foundation Generation API Route
 * 
 * Server-side API endpoint for generating scenario foundation.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateScenarioFoundation } from '@/ai/flows/generate-scenario-from-series';
import type { GenerateScenarioFoundationInput } from '@/ai/flows/generate-scenario-from-series';

export async function POST(request: NextRequest) {
  try {
    const input: GenerateScenarioFoundationInput = await request.json();
    
    // Validate required fields
    if (!input.seriesName) {
      return NextResponse.json(
        { error: 'Missing required field: seriesName' },
        { status: 400 }
      );
    }

    if (typeof input.usePremiumAI !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: usePremiumAI' },
        { status: 400 }
      );
    }

    console.log(`[${new Date().toISOString()}] Scenario Foundation generation API: START for series: ${input.seriesName}`);

    const result = await generateScenarioFoundation(input);
    
    console.log(`[${new Date().toISOString()}] Scenario Foundation generation API: SUCCESS - Generated foundation for ${result.characterProfile.name}`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Scenario Foundation generation API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Scenario Foundation generation failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Scenario Foundation Generation API',
    endpoints: {
      POST: 'Generate scenario foundation (character, scene, world details)'
    }
  });
}
