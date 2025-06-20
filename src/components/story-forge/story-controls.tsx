"use client";

import { Button } from "@/components/ui/button";
import { Undo2, RotateCcw, Loader2 } from "lucide-react";

interface StoryControlsProps {
  onUndo: () => void;
  onRestart: () => void;
  canUndo: boolean;
  isLoading: boolean;
}

export default function StoryControls({ onUndo, onRestart, canUndo, isLoading }: StoryControlsProps) {
  return (
    <div className="flex w-full justify-between space-x-2">
      <Button
        variant="outline"
        onClick={onUndo}
        disabled={!canUndo || isLoading}
        className="flex-1 sm:flex-none"
        size="sm"
      >
        <Undo2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
        <span className="text-xs sm:text-sm">Undo</span>
      </Button>
      <Button
        variant="outline"
        onClick={onRestart}
        disabled={isLoading}
        className="flex-1 sm:flex-none"
        size="sm"
      >
        <RotateCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
        <span className="text-xs sm:text-sm">Restart</span>
      </Button>
    </div>
  );
}
