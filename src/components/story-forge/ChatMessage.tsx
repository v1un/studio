
"use client";

import type { DisplayMessage } from "@/types/story";
import { cn } from "@/lib/utils";
import Image from 'next/image';
import { Bot, UserCircle, ShieldAlertIcon, InfoIcon, MilestoneIcon, BookmarkPlusIcon } from "lucide-react"; 
import CombatHelperDisplay from "./CombatHelperDisplay";

interface ChatMessageProps {
  message: DisplayMessage;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  if (message.speakerType === 'SystemHelper' && message.combatHelperInfo) {
    return <CombatHelperDisplay combatInfo={message.combatHelperInfo} />;
  }
  
  const isPlayer = message.speakerType === 'Player';
  
  let nameLabelColor = "text-muted-foreground"; 
  let messageBgColor = "bg-muted text-muted-foreground"; 
  let speakerLabelToDisplay = message.speakerNameLabel;
  let avatarHintToUse = message.avatarHint || "person";
  let MessageIcon: React.ElementType | null = null;

  if (isPlayer) {
    nameLabelColor = "text-blue-600 dark:text-blue-400";
    messageBgColor = "bg-primary text-primary-foreground";
    speakerLabelToDisplay = message.speakerDisplayName || message.speakerNameLabel; 
    avatarHintToUse = message.avatarHint || "knight shield"; 
  } else if (message.speakerType === 'NPC') {
    nameLabelColor = "text-green-600 dark:text-green-400"; 
    messageBgColor = "bg-secondary text-secondary-foreground"; 
    speakerLabelToDisplay = message.speakerNameLabel; 
    avatarHintToUse = message.avatarHint || "merchant friendly";
  } else if (message.speakerType === 'GM') { 
    nameLabelColor = "text-orange-600 dark:text-orange-400"; 
    speakerLabelToDisplay = message.speakerNameLabel; 
    avatarHintToUse = message.avatarHint || "wizard staff";
  } else if (message.speakerType === 'SystemHelper') {
    nameLabelColor = "text-purple-600 dark:text-purple-400";
    messageBgColor = "bg-purple-100/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/50";
    speakerLabelToDisplay = message.speakerNameLabel;
    avatarHintToUse = message.avatarHint || "system gear";
    MessageIcon = InfoIcon;
  } else if (message.speakerType === 'ArcNotification') {
    nameLabelColor = "text-indigo-600 dark:text-indigo-400";
    messageBgColor = "bg-indigo-100/80 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700/50";
    speakerLabelToDisplay = message.speakerNameLabel;
    avatarHintToUse = message.avatarHint || "milestone flag";
    MessageIcon = message.content?.toLowerCase().includes("complete") || message.content?.toLowerCase().includes("finale") ? MilestoneIcon : BookmarkPlusIcon;
  }
  
  const AvatarComponent = () => {
    if (message.speakerType === 'SystemHelper' || message.speakerType === 'ArcNotification') {
      const IconComp = MessageIcon || InfoIcon;
      return <IconComp className={`w-10 h-10 ${nameLabelColor}`} />; 
    }
    if (message.avatarSrc) {
      return (
        <Image
          src={message.avatarSrc}
          alt={`${speakerLabelToDisplay}'s avatar`}
          width={40}
          height={40}
          className="rounded-full"
          data-ai-hint={avatarHintToUse}
        />
      );
    }
    if (isPlayer) {
      return <UserCircle className="w-10 h-10 text-muted-foreground" />;
    }
    return <Bot className="w-10 h-10 text-muted-foreground" />;
  };

  const messageAlignmentClass = (message.speakerType === 'SystemHelper' || message.speakerType === 'ArcNotification') 
    ? "justify-center" 
    : isPlayer ? "justify-end" : "justify-start";
  
  const systemMessageMaxWidth = (message.speakerType === 'SystemHelper' || message.speakerType === 'ArcNotification') 
    ? "max-w-full sm:max-w-[90%]" 
    : "max-w-[85%] sm:max-w-[75%]";


  return (
    <div className={cn("flex w-full mb-4 animate-fade-in", messageAlignmentClass)}>
       {(message.speakerType === 'SystemHelper' || message.speakerType === 'ArcNotification') ? (
         <div
          className={cn(
            "rounded-lg px-3 py-2 shadow-sm break-words text-xs italic",
            messageBgColor,
            systemMessageMaxWidth,
            message.speakerType === 'ArcNotification' ? "text-center" : ""
          )}
        >
           <div className={cn("font-semibold text-sm mb-0.5 flex items-center", nameLabelColor, message.speakerType === 'ArcNotification' ? "justify-center text-base" : "")}>
            {MessageIcon && <MessageIcon className="w-4 h-4 mr-1.5 shrink-0"/>} {speakerLabelToDisplay}
          </div>
          <p className={cn("whitespace-pre-line ml-1", message.speakerType === 'ArcNotification' ? "text-sm not-italic" : "text-xs")}>{message.content}</p>
        </div>
      ) : (
        <div className={cn("flex items-end gap-2", systemMessageMaxWidth, isPlayer ? "flex-row-reverse" : "flex-row")}>
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
              {speakerLabelToDisplay}
              {message.speakerType === 'GM' && message.speakerDisplayName && message.speakerDisplayName !== speakerLabelToDisplay && (
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
      )}
    </div>
  );
}
