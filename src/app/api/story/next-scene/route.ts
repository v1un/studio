/**
 * Next Scene Generation API Route
 * 
 * Server-side API endpoint for generating the next scene in the story.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateNextScene } from '@/ai/flows/generate-next-scene';
import type { GenerateNextSceneInput } from '@/types/story';

export async function POST(request: NextRequest) {
  try {
    const input: GenerateNextSceneInput = await request.json();
    
    // Validate required fields
    if (!input.currentScene) {
      return NextResponse.json(
        { error: 'Missing required field: currentScene' },
        { status: 400 }
      );
    }

    if (!input.userInput) {
      return NextResponse.json(
        { error: 'Missing required field: userInput' },
        { status: 400 }
      );
    }

    if (!input.storyState) {
      return NextResponse.json(
        { error: 'Missing required field: storyState' },
        { status: 400 }
      );
    }

    if (!input.seriesName) {
      return NextResponse.json(
        { error: 'Missing required field: seriesName' },
        { status: 400 }
      );
    }

    if (!input.currentTurnId) {
      return NextResponse.json(
        { error: 'Missing required field: currentTurnId' },
        { status: 400 }
      );
    }

    if (typeof input.usePremiumAI !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: usePremiumAI' },
        { status: 400 }
      );
    }

    console.log(`[${new Date().toISOString()}] Next Scene generation API: START for series: ${input.seriesName}, turn: ${input.currentTurnId}`);

    const result = await generateNextScene(input);
    
    console.log(`[${new Date().toISOString()}] Next Scene generation API: SUCCESS - Generated scene with ${result.aiMessageSegments.length} segments`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Next Scene generation API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Next Scene generation failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Next Scene Generation API',
    endpoints: {
      POST: 'Generate the next scene in the story'
    }
  });
}
