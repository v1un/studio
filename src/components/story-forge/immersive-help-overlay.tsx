"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  HelpCircle, 
  X, 
  Keyboard, 
  Mouse, 
  Edit3,
  Minimize2 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImmersiveHelpOverlayProps {
  isImmersiveMode: boolean;
}

export default function ImmersiveHelpOverlay({ isImmersiveMode }: ImmersiveHelpOverlayProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [hasShownHelp, setHasShownHelp] = useState(false);

  // Show help automatically when entering immersive mode for the first time
  useEffect(() => {
    if (isImmersiveMode && !hasShownHelp) {
      const timer = setTimeout(() => {
        setShowHelp(true);
        setHasShownHelp(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isImmersiveMode, hasShownHelp]);

  if (!isImmersiveMode) return null;

  return (
    <>
      {/* Help Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 left-4 z-[110] bg-background/80 backdrop-blur-sm hover:bg-background/90 border-2 border-border/30"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Help
      </Button>

      {/* Help Overlay */}
      {showHelp && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] animate-fade-in-fast"
            onClick={() => setShowHelp(false)}
          />

          <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[160] w-full max-w-md mx-4 shadow-2xl border-2 border-primary/20 animate-slide-up">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Immersive Mode Controls</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHelp(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center">
                    <Keyboard className="h-4 w-4 mr-2" />
                    Keyboard Shortcuts
                  </h4>
                  <div className="space-y-2 pl-6">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Exit immersive mode:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs">ESC</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Open action input:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs">Ctrl+Enter</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Toggle immersive:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs">F11</code>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium flex items-center">
                    <Mouse className="h-4 w-4 mr-2" />
                    Mouse Controls
                  </h4>
                  <div className="space-y-2 pl-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-destructive/20 border border-destructive/30 rounded flex items-center justify-center">
                        <X className="h-2 w-2 text-destructive" />
                      </div>
                      <span className="text-muted-foreground">Red Exit button (top-left)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <Edit3 className="h-2 w-2 text-primary-foreground" />
                      </div>
                      <span className="text-muted-foreground">Blue Action button (bottom-right)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-background/80 border border-border/30 rounded flex items-center justify-center">
                        <Minimize2 className="h-2 w-2" />
                      </div>
                      <span className="text-muted-foreground">Controls (top-right, auto-hide)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Tip:</strong> Move your mouse to reveal hidden controls. 
                    The red Exit button is always visible for easy access.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setShowHelp(false)}
                className="w-full mt-4"
                variant="default"
              >
                Got it!
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
