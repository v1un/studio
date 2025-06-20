"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Maximize2,
  Minimize2,
  Edit3,
  Settings,
  Eye,
  EyeOff,
  X
} from "lucide-react";
import type { StoryTurn, DisplayMessage } from "@/types/story";
import ChatMessage from "./ChatMessage";
import { cn } from "@/lib/utils";

interface ImmersiveStoryDisplayProps {
  storyHistory: StoryTurn[];
  isLoadingInteraction: boolean;
  onStartInteractiveCombat?: () => void;
  isImmersiveMode: boolean;
  onToggleImmersiveMode: () => void;
  onShowFloatingInput: () => void;
  className?: string;
}

export default function ImmersiveStoryDisplay({ 
  storyHistory, 
  isLoadingInteraction, 
  onStartInteractiveCombat,
  isImmersiveMode,
  onToggleImmersiveMode,
  onShowFloatingInput,
  className = ""
}: ImmersiveStoryDisplayProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [lastScrollTime, setLastScrollTime] = useState(Date.now());

  useEffect(() => {
    if (viewportRef.current && !isLoadingInteraction) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [storyHistory, isLoadingInteraction]);

  // Auto-hide controls in immersive mode
  useEffect(() => {
    if (!isImmersiveMode) return;

    const handleMouseMove = () => {
      setShowControls(true);
      setLastScrollTime(Date.now());
    };

    const handleScroll = () => {
      setShowControls(true);
      setLastScrollTime(Date.now());
    };

    // Hide controls after 5 seconds of inactivity (increased from 3 seconds)
    const hideTimer = setInterval(() => {
      if (Date.now() - lastScrollTime > 5000) {
        setShowControls(false);
      }
    }, 1000);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('scroll', handleScroll);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('scroll', handleScroll);
      clearInterval(hideTimer);
    };
  }, [isImmersiveMode, lastScrollTime]);

  const allMessages: DisplayMessage[] = storyHistory.reduce((acc, turn) => {
    if (Array.isArray(turn.messages)) {
      acc.push(...turn.messages);
    }
    return acc;
  }, [] as DisplayMessage[]);

  return (
    <div className={cn(
      "relative w-full flex-1 min-h-0",
      isImmersiveMode && "fixed inset-0 z-[100] bg-background",
      className
    )}>
      {/* Floating Controls */}
      <div className={cn(
        "absolute top-4 right-4 z-[110] flex space-x-2 transition-all duration-300",
        !isImmersiveMode && "hidden",
        isImmersiveMode && !showControls && "opacity-50",
        isImmersiveMode && showControls && "opacity-100"
      )}>
        <Button
          variant="outline"
          size="sm"
          onClick={onShowFloatingInput}
          className="bg-background/90 backdrop-blur-sm hover:bg-background border-2 border-primary/20 hover:border-primary/40"
        >
          <Edit3 className="h-4 w-4 mr-2" />
          Action
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onToggleImmersiveMode}
          className="bg-background/90 backdrop-blur-sm hover:bg-background border-2 border-destructive/20 hover:border-destructive/40"
        >
          <Minimize2 className="h-4 w-4 mr-2" />
          Exit Focus
        </Button>
      </div>

      {/* Persistent Exit Button - Always Visible in Immersive Mode */}
      {isImmersiveMode && (
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleImmersiveMode}
          className="fixed top-4 left-4 z-[120] persistent-exit-button bg-destructive/10 backdrop-blur-sm hover:bg-destructive/20 border-2 border-destructive/30 hover:border-destructive/50 text-destructive hover:text-destructive shadow-lg"
        >
          <X className="h-4 w-4 mr-2" />
          Exit
        </Button>
      )}

      {/* Story Content */}
      <ScrollArea 
        ref={scrollAreaRef} 
        className={cn(
          "w-full h-full pr-2",
          isImmersiveMode ? "p-6 sm:p-8 lg:p-12" : "min-h-[50vh]"
        )}
        viewportRef={viewportRef}
      >
        <div className={cn(
          "flex flex-col gap-3",
          isImmersiveMode && "max-w-4xl mx-auto"
        )}>
          {allMessages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onStartInteractiveCombat={onStartInteractiveCombat}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Floating Action Button - Inside Immersive Container */}
      {isImmersiveMode && (
        <Button
          onClick={onShowFloatingInput}
          disabled={isLoadingInteraction}
          size="lg"
          className={cn(
            "fixed bottom-6 right-6 z-[115] rounded-full h-14 w-14 floating-action-button stable-transform",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            "border-2 border-primary-foreground/20 hover:border-primary-foreground/40 shadow-2xl",
            isLoadingInteraction && "animate-pulse opacity-75"
          )}
        >
          <Edit3 className="h-6 w-6" />
        </Button>
      )}

      {/* Immersive Mode Overlay Instructions */}
      {isImmersiveMode && showControls && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[105]">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-muted-foreground border border-border/50">
            <div className="flex items-center space-x-2">
              <Eye className="h-3 w-3" />
              <span>Immersive reading mode • Press ESC or click Exit to return</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
