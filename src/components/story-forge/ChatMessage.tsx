
"use client";

import type { DisplayMessage } from "@/types/story";
import { cn } from "@/lib/utils";
import Image from 'next/image';
import { Bot, UserCircle } from "lucide-react";

interface ChatMessageProps {
  message: DisplayMessage;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isPlayer = message.speakerType === 'Player';
  const nameLabelColor = isPlayer ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400";
  const messageBgColor = isPlayer
    ? "bg-primary text-primary-foreground"
    : "bg-muted text-muted-foreground";
  
  const AvatarComponent = () => {
    if (message.avatarSrc) {
      return (
        <Image
          src={message.avatarSrc}
          alt={`${message.speakerNameLabel}'s avatar`}
          width={40}
          height={40}
          className="rounded-full"
          data-ai-hint={message.avatarHint}
        />
      );
    }
    if (isPlayer) {
      return <UserCircle className="w-10 h-10 text-muted-foreground" />;
    }
    return <Bot className="w-10 h-10 text-muted-foreground" />;
  };

  return (
    <div className={cn("flex w-full mb-4 animate-fade-in", isPlayer ? "justify-end" : "justify-start")}>
      <div className={cn("flex items-end gap-2 max-w-[85%] sm:max-w-[75%]", isPlayer ? "flex-row-reverse" : "flex-row")}>
        {!isPlayer && (
          <div className="shrink-0">
            <AvatarComponent />
          </div>
        )}
        <div
          className={cn(
            "rounded-lg px-4 py-2 shadow-md break-words",
            messageBgColor,
            isPlayer ? "rounded-br-none" : "rounded-bl-none"
          )}
        >
          <div className={cn("font-bold text-sm mb-0.5", nameLabelColor, isPlayer ? 'text-right' : 'text-left')}>
            {message.speakerNameLabel}
            {message.speakerDisplayName && message.speakerType !== 'Player' && (
                <span className="ml-2 text-xs text-muted-foreground/80 font-normal">
                    ({message.speakerDisplayName})
                </span>
            )}
          </div>
          <p className="text-base whitespace-pre-line">{message.content}</p>
        </div>
         {isPlayer && (
          <div className="shrink-0">
             <AvatarComponent />
          </div>
        )}
      </div>
    </div>
  );
}
