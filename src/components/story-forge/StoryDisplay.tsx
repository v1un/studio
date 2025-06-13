
"use client";

import { useEffect, useRef } from "react";
import type { StoryTurn, DisplayMessage } from "@/types/story";
import ChatMessage from "./ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StoryDisplayProps {
  storyHistory: StoryTurn[];
  isLoadingInteraction: boolean; // To prevent scrolling while AI is thinking
  onStartInteractiveCombat?: () => void;
}

export default function StoryDisplay({ storyHistory, isLoadingInteraction, onStartInteractiveCombat }: StoryDisplayProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current && !isLoadingInteraction) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [storyHistory, isLoadingInteraction]); // Scroll when storyHistory changes or loading finishes

  const allMessages: DisplayMessage[] = storyHistory.reduce((acc, turn) => {
    // Ensure turn.messages is an array and not undefined before spreading
    if (Array.isArray(turn.messages)) {
      acc.push(...turn.messages);
    }
    return acc;
  }, [] as DisplayMessage[]);

  return (
    <ScrollArea 
        ref={scrollAreaRef} 
        className="w-full flex-1 pr-3" // Changed to flex-1 for dynamic height
        viewportRef={viewportRef}
    >
      <div className="flex flex-col gap-2 p-1">
        {allMessages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onStartInteractiveCombat={onStartInteractiveCombat}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

