/**
 * Drag and Drop Component
 * 
 * Reusable drag and drop functionality for inventory management
 * with visual feedback and accessibility support.
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface DragDropItem {
  id: string;
  type: string;
  data: any;
}

export interface DragDropProps {
  children: React.ReactNode;
  item?: DragDropItem;
  onDragStart?: (item: DragDropItem) => void;
  onDragEnd?: () => void;
  className?: string;
  disabled?: boolean;
}

export interface DropZoneProps {
  children: React.ReactNode;
  onDrop?: (item: DragDropItem) => void;
  onDragOver?: (item: DragDropItem) => void;
  onDragLeave?: () => void;
  acceptTypes?: string[];
  className?: string;
  disabled?: boolean;
  isValidDrop?: (item: DragDropItem) => boolean;
}

// Global drag state
let currentDragItem: DragDropItem | null = null;

export const DragSource: React.FC<DragDropProps> = ({
  children,
  item,
  onDragStart,
  onDragEnd,
  className,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (disabled || !item) {
      e.preventDefault();
      return;
    }

    setIsDragging(true);
    currentDragItem = item;
    
    // Set drag data
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
    
    // Create drag image
    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      e.dataTransfer.setDragImage(dragRef.current, rect.width / 2, rect.height / 2);
    }

    onDragStart?.(item);
  }, [disabled, item, onDragStart]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    currentDragItem = null;
    onDragEnd?.();
  }, [onDragEnd]);

  return (
    <div
      ref={dragRef}
      draggable={!disabled && !!item}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        !disabled && item && 'drag-source',
        isDragging && 'opacity-50 scale-105',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {children}
    </div>
  );
};

export const DropZone: React.FC<DropZoneProps> = ({
  children,
  onDrop,
  onDragOver,
  onDragLeave,
  acceptTypes = [],
  className,
  disabled = false,
  isValidDrop
}) => {
  const [dragState, setDragState] = useState<'none' | 'over' | 'valid' | 'invalid'>('none');
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    
    if (disabled || !currentDragItem) return;

    const isTypeAccepted = acceptTypes.length === 0 || acceptTypes.includes(currentDragItem.type);
    const isValid = isTypeAccepted && (!isValidDrop || isValidDrop(currentDragItem));
    
    setDragState(isValid ? 'valid' : 'invalid');
    onDragOver?.(currentDragItem);
  }, [disabled, acceptTypes, isValidDrop, onDragOver]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragState === 'valid' ? 'move' : 'none';
  }, [dragState]);

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragState('none');
      onDragLeave?.();
    }
  }, [onDragLeave]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragState('none');

    if (disabled) return;

    try {
      const dragData = e.dataTransfer.getData('application/json');
      const item: DragDropItem = JSON.parse(dragData);
      
      const isTypeAccepted = acceptTypes.length === 0 || acceptTypes.includes(item.type);
      const isValid = isTypeAccepted && (!isValidDrop || isValidDrop(item));
      
      if (isValid) {
        onDrop?.(item);
      }
    } catch (error) {
      console.error('Failed to parse drag data:', error);
    }
  }, [disabled, acceptTypes, isValidDrop, onDrop]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'drop-zone',
        dragState === 'valid' && 'drop-zone-active drop-zone-valid',
        dragState === 'invalid' && 'drop-zone-active drop-zone-invalid',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {children}
    </div>
  );
};

// Utility hook for drag and drop state management
export const useDragDrop = () => {
  const [dragItem, setDragItem] = useState<DragDropItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const startDrag = useCallback((item: DragDropItem) => {
    setDragItem(item);
    setIsDragging(true);
  }, []);

  const endDrag = useCallback(() => {
    setDragItem(null);
    setIsDragging(false);
  }, []);

  return {
    dragItem,
    isDragging,
    startDrag,
    endDrag
  };
};

// Compound component for easy drag and drop setup
interface DragDropContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const DragDropContainer: React.FC<DragDropContainerProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('relative', className)}>
      {children}
    </div>
  );
};

// Equipment slot component with drag and drop
interface EquipmentSlotProps {
  slotType: string;
  item?: any;
  onEquip?: (item: DragDropItem) => void;
  onUnequip?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const EquipmentSlot: React.FC<EquipmentSlotProps> = ({
  slotType,
  item,
  onEquip,
  onUnequip,
  className,
  children
}) => {
  const isValidDrop = useCallback((dragItem: DragDropItem) => {
    return dragItem.type === 'item' && dragItem.data?.equipSlot === slotType;
  }, [slotType]);

  const handleDrop = useCallback((dragItem: DragDropItem) => {
    onEquip?.(dragItem);
  }, [onEquip]);

  const handleUnequip = useCallback(() => {
    onUnequip?.();
  }, [onUnequip]);

  return (
    <DropZone
      onDrop={handleDrop}
      isValidDrop={isValidDrop}
      acceptTypes={['item']}
      className={cn(
        'min-h-16 border-2 border-dashed border-muted rounded-lg flex items-center justify-center',
        'transition-all duration-200',
        item && 'border-solid border-primary/30 bg-primary/5',
        className
      )}
    >
      {item ? (
        <DragSource
          item={{
            id: item.id,
            type: 'item',
            data: item
          }}
          onDragStart={() => handleUnequip()}
          className="w-full h-full flex items-center justify-center"
        >
          {children}
        </DragSource>
      ) : (
        <div className="text-muted-foreground text-sm text-center p-2">
          Drop {slotType} here
        </div>
      )}
    </DropZone>
  );
};

// Inventory grid with drag and drop
interface InventoryGridProps {
  items: any[];
  onItemMove?: (item: any, fromIndex: number, toIndex: number) => void;
  renderItem: (item: any, index: number) => React.ReactNode;
  className?: string;
  columns?: number;
}

export const InventoryGrid: React.FC<InventoryGridProps> = ({
  items,
  onItemMove,
  renderItem,
  className,
  columns = 6
}) => {
  const handleDrop = useCallback((dragItem: DragDropItem, targetIndex: number) => {
    const fromIndex = items.findIndex(item => item.id === dragItem.id);
    if (fromIndex !== -1 && fromIndex !== targetIndex) {
      onItemMove?.(dragItem.data, fromIndex, targetIndex);
    }
  }, [items, onItemMove]);

  return (
    <div 
      className={cn(
        'grid gap-2',
        `grid-cols-${columns}`,
        className
      )}
    >
      {items.map((item, index) => (
        <DropZone
          key={`${item.id}-${index}`}
          onDrop={(dragItem) => handleDrop(dragItem, index)}
          acceptTypes={['item']}
          className="aspect-square"
        >
          <DragSource
            item={{
              id: item.id,
              type: 'item',
              data: item
            }}
            className="w-full h-full"
          >
            {renderItem(item, index)}
          </DragSource>
        </DropZone>
      ))}
    </div>
  );
};
