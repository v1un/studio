/**
 * Simple Test Action API Route
 * 
 * Server-side API endpoint for simple test action.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { simpleTestAction } from '@/ai/actions/simple-test-action';

export async function POST(request: NextRequest) {
  try {
    const input = await request.json();
    
    console.log(`[${new Date().toISOString()}] Simple Test Action API: START`);

    const result = await simpleTestAction(input);
    
    console.log(`[${new Date().toISOString()}] Simple Test Action API: SUCCESS`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Simple Test Action API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Simple Test Action failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Simple Test Action API',
    endpoints: {
      POST: 'Execute simple test action'
    }
  });
}
