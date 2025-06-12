import { z } from 'zod';

// Centralized Zod schema for EquipmentSlot
export const EquipSlotEnumInternal = z.enum(['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2'])
  .describe("The equipment slot type, if the item is equippable (e.g., 'weapon', 'head', 'body', 'ring1', 'ring2').");