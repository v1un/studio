/**
 * Items & Equipment Generation API Route
 * 
 * Server-side API endpoint for generating character inventory and equipment.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateItemsAndEquipment } from '@/ai/flows/generate-scenario-from-series';
import type { GenerateItemsAndEquipmentInput } from '@/ai/flows/generate-scenario-from-series';

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

    const input: GenerateItemsAndEquipmentInput = {
      seriesName: body.seriesName,
      characterProfile: body.characterProfile,
      sceneDescription: body.sceneDescription,
      currentLocation: body.currentLocation,
      usePremiumAI: body.usePremiumAI || false,
    };

    console.log(`[${new Date().toISOString()}] Items & Equipment generation API: START for character: ${input.characterProfile.name}`);

    const result = await generateItemsAndEquipment(input);
    
    console.log(`[${new Date().toISOString()}] Items & Equipment generation API: SUCCESS - Generated ${result.inventory.length} items`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Items & Equipment generation API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Items & Equipment generation failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Items & Equipment Generation API',
    endpoints: {
      POST: 'Generate character inventory and equipment'
    }
  });
}
