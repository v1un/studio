"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Send, X, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingInputFormProps {
  onSubmit: (input: string) => void;
  isLoading: boolean;
  isVisible: boolean;
  onToggleVisibility: () => void;
  className?: string;
}

export default function FloatingInputForm({ 
  onSubmit, 
  isLoading, 
  isVisible, 
  onToggleVisibility,
  className = ""
}: FloatingInputFormProps) {
  const [userInput, setUserInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      onSubmit(userInput.trim());
      setUserInput("");
      // Optionally hide the floating input after submission
      // onToggleVisibility();
    }
  };

  // Auto-focus when visible
  useEffect(() => {
    if (isVisible && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isVisible]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onToggleVisibility();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onToggleVisibility]);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[130] animate-fade-in-fast"
        onClick={onToggleVisibility}
      />

      {/* Floating Input Form */}
      <Card className={cn(
        "fixed bottom-4 left-4 right-4 z-[140] shadow-2xl border-2 border-primary/30 animate-slide-up",
        "sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 sm:w-full sm:max-w-2xl",
        "bg-background/95 backdrop-blur-md",
        isExpanded && "sm:max-w-4xl",
        className
      )}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Your Action</h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleVisibility}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Label htmlFor="floating-user-action" className="sr-only">Your Action</Label>
              <Textarea
                ref={textareaRef}
                id="floating-user-action"
                placeholder="What do you do next? Describe your action in detail..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                rows={isExpanded ? 4 : 2}
                disabled={isLoading}
                className="text-sm sm:text-base shadow-lg border-border/50 bg-background/95 backdrop-blur-sm transition-all duration-200 focus:shadow-xl focus:bg-background hover:border-border-hover resize-none"
              />
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                {userInput.length}/500
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                type="submit"
                disabled={isLoading || !userInput.trim()}
                className="flex-1 text-sm font-semibold hover-glow bg-primary hover:bg-primary/90 text-primary-foreground"
                variant="default"
              >
                <Send className="mr-2 h-4 w-4" />
                {isLoading ? "Processing..." : "Send Action"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onToggleVisibility}
                className="px-4 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
