/**
 * Test Script for Game Balance System
 * 
 * Comprehensive test of the game balance and difficulty system.
 * Run this to verify all components are working correctly.
 */

import { runCompleteBalanceDemo } from '@/lib/balance-system-demo';

// Run the complete balance system demonstration
console.log('Starting Game Balance System Test...\n');

try {
  runCompleteBalanceDemo();
  console.log('\n✅ Game Balance System test completed successfully!');
} catch (error) {
  console.error('❌ Error during balance system test:', error);
  process.exit(1);
}
