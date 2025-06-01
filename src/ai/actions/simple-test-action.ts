
'use server';

/**
 * @fileOverview A simple test server action.
 */

import {z} from 'zod';

const TestActionInputSchema = z.object({
  name: z.string().optional().describe('An optional name to include in the greeting.'),
});
export type TestActionInput = z.infer<typeof TestActionInputSchema>;

const TestActionOutputSchema = z.object({
  greeting: z.string().describe('A greeting message.'),
  timestamp: z.string().describe('The server timestamp when the action was processed.'),
});
export type TestActionOutput = z.infer<typeof TestActionOutputSchema>;

export async function simpleTestAction(input: TestActionInput): Promise<TestActionOutput> {
  console.log(`[${new Date().toISOString()}] simpleTestAction: Received input - Name: ${input.name || 'Guest'}`);
  
  // Simulate a very short delay
  await new Promise(resolve => setTimeout(resolve, 50)); 
  
  const output: TestActionOutput = {
    greeting: `Hello, ${input.name || 'World'}! This is a simple test action.`,
    timestamp: new Date().toISOString(),
  };
  
  console.log(`[${new Date().toISOString()}] simpleTestAction: Returning output - Greeting: ${output.greeting}`);
  return output;
}
