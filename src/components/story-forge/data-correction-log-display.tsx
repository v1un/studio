
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertTriangleIcon, Trash2Icon, InfoIcon } from "lucide-react";

interface DataCorrectionLogDisplayProps {
  warnings: { timestamp: string; warnings: string[] }[];
  onClearLogs: () => void;
}

export default function DataCorrectionLogDisplay({ warnings, onClearLogs }: DataCorrectionLogDisplayProps) {
  return (
    <Card className="w-full shadow-lg animate-fade-in">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="font-headline text-2xl text-primary flex items-center">
            <AlertTriangleIcon className="w-6 h-6 mr-2 text-orange-500" />
            Data Correction Logs
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onClearLogs} disabled={warnings.length === 0}>
            <Trash2Icon className="w-4 h-4 mr-2" />
            Clear Logs for Session
          </Button>
        </div>
        <CardDescription>
          This log shows instances where the AI's output required backend corrections or defaulting. Review these to help identify areas for AI prompt or logic improvement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {warnings.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md bg-background/50 min-h-[200px]">
            <InfoIcon className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-lg text-muted-foreground">No data correction warnings logged for this session yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Warnings will appear here if the system needs to adjust AI-generated game state data.</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-350px)] sm:h-[calc(100vh-320px)] rounded-md border p-3 bg-background/50">
            <div className="space-y-4">
              {warnings.map((entry, entryIndex) => (
                <div key={entryIndex} className="p-3 rounded-md border border-dashed border-border shadow-sm bg-card/50">
                  <p className="text-xs text-muted-foreground mb-1">
                    Logged: {new Date(entry.timestamp).toLocaleString()}
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-4">
                    {entry.warnings.map((warning, warnIndex) => (
                      <li key={warnIndex} className="text-sm text-foreground">
                        {warning}
                      </li>
                    ))}
                  </ul>
                  {entryIndex < warnings.length - 1 && <Separator className="mt-3"/>}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

    