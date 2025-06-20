"use client";

import { Button } from "@/components/ui/button";
import { Edit3, MessageSquare, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartInputToggleProps {
  onShowFloatingInput: () => void;
  isLoading?: boolean;
  className?: string;
  variant?: "floating" | "inline" | "minimal";
}

export default function SmartInputToggle({ 
  onShowFloatingInput, 
  isLoading = false,
  className = "",
  variant = "floating"
}: SmartInputToggleProps) {
  
  if (variant === "minimal") {
    return (
      <Button
        onClick={onShowFloatingInput}
        disabled={isLoading}
        size="lg"
        className={cn(
          "fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 floating-action-button",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "border-2 border-primary-foreground/20 hover:border-primary-foreground/40",
          isLoading ? "animate-pulse" : "animate-bounce",
          className
        )}
      >
        <Edit3 className="h-6 w-6" />
      </Button>
    );
  }

  if (variant === "inline") {
    return (
      <Button
        onClick={onShowFloatingInput}
        disabled={isLoading}
        className={cn(
          "w-full text-sm font-semibold hover-glow",
          "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
          className
        )}
      >
        <MessageSquare className="mr-2 h-4 w-4" />
        {isLoading ? "Processing..." : "Write Your Action"}
      </Button>
    );
  }

  // Default floating variant
  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30",
      "flex items-center space-x-2",
      className
    )}>
      <Button
        onClick={onShowFloatingInput}
        disabled={isLoading}
        className={cn(
          "px-6 py-3 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200",
          "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
          "border border-primary/20 backdrop-blur-sm",
          isLoading && "animate-pulse"
        )}
      >
        <Edit3 className="mr-2 h-4 w-4" />
        {isLoading ? "Processing..." : "Write Action"}
      </Button>
      
      {/* Quick action hint */}
      <div className="hidden sm:block bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-muted-foreground border border-border/50">
        <div className="flex items-center space-x-1">
          <Zap className="h-3 w-3" />
          <span>Click to write your next action</span>
        </div>
      </div>
    </div>
  );
}
