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
    <div className="flex w-full justify-between space-x-2 sm:space-x-4">
      <Button
        variant="outline"
        onClick={onUndo}
        disabled={!canUndo || isLoading}
        className="flex-1 sm:flex-none"
      >
        <Undo2 className="mr-2 h-4 w-4" />
        Undo
      </Button>
      <Button
        variant="outline"
        onClick={onRestart}
        disabled={isLoading}
        className="flex-1 sm:flex-none"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Restart
      </Button>
    </div>
  );
}
