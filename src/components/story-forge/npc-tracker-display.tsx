
"use client";

import * as React from "react";
import type { NPCProfile, NPCDialogueEntry, Item } from "@/types/story";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
    Users2Icon, MapPinIcon, HistoryIcon, FileTextIcon, HeartHandshakeIcon, 
    UserCogIcon, CircleHelpIcon, TrendingUp, TrendingDown, Minus, IdCardIcon, StoreIcon, PackageIcon
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface NPCTrackerDisplayProps {
  trackedNPCs: NPCProfile[];
  currentTurnId: string; // To determine "last seen" relative freshness
}

interface RelationshipInfo {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon?: React.ElementType;
}

const getRelationshipInfo = (score: number): RelationshipInfo => {
  if (score <= -75) return { label: "Arch-Nemesis", variant: "destructive", icon: TrendingDown };
  if (score <= -25) return { label: "Hostile", variant: "destructive", icon: TrendingDown };
  if (score < 25) return { label: "Neutral", variant: "secondary", icon: Minus };
  if (score < 75) return { label: "Friendly", variant: "default", icon: TrendingUp };
  return { label: "Staunch Ally", variant: "default", icon: TrendingUp }; 
};


const NPCEntry: React.FC<{ npc: NPCProfile, currentTurnId: string }> = ({ npc, currentTurnId }) => {
  const isLastSeenCurrent = npc.lastSeenTurnId === currentTurnId;
  const relationshipInfo = getRelationshipInfo(npc.relationshipStatus);
  const RelationshipIcon = relationshipInfo.icon || HeartHandshakeIcon;

  return (
    <AccordionItem value={npc.id} className="border-b-0">
      <AccordionTrigger className="hover:no-underline p-3 rounded-md hover:bg-accent/50 data-[state=open]:bg-accent/80 data-[state=open]:text-accent-foreground">
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
                <Users2Icon className="w-5 h-5 mr-3 text-primary shrink-0"/>
                <span className="text-lg font-semibold">{npc.name}</span>
                {npc.classOrRole && <Badge variant="secondary" className="ml-2 text-xs flex items-center"><IdCardIcon className="w-3 h-3 mr-1"/>{npc.classOrRole}</Badge>}
                {npc.isMerchant && <Badge variant="outline" className="ml-2 text-xs text-green-600 border-green-500 flex items-center"><StoreIcon className="w-3 h-3 mr-1"/>Merchant</Badge>}
            </div>
            <Badge variant={relationshipInfo.variant} className="text-xs">
                <RelationshipIcon className="w-3 h-3 mr-1"/>
                {relationshipInfo.label} ({npc.relationshipStatus})
            </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-2 pb-3 px-3 text-sm space-y-3 bg-background/30 rounded-b-md">
        <p className="text-muted-foreground italic">{npc.description}</p>
        
        <Separator/>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {npc.firstEncounteredLocation && (
                <div className="flex items-start">
                    <MapPinIcon className="w-3.5 h-3.5 mr-1.5 mt-0.5 text-primary/70 shrink-0"/> 
                    <div>
                        <span className="font-medium">First Met: </span> 
                        <span className="text-muted-foreground">{npc.firstEncounteredLocation} (Turn: {npc.firstEncounteredTurnId?.substring(0,8)}...)</span>
                    </div>
                </div>
            )}
            {npc.lastKnownLocation && (
                 <div className="flex items-start">
                    <MapPinIcon className="w-3.5 h-3.5 mr-1.5 mt-0.5 text-primary/70 shrink-0"/>
                    <div>
                        <span className="font-medium">Last Seen: </span>
                        <span className="text-muted-foreground">{npc.lastKnownLocation} (Turn: {npc.lastSeenTurnId?.substring(0,8)}...{isLastSeenCurrent && <Badge variant="secondary" className="ml-1 py-0 px-1 text-green-600 border-green-500 text-[10px]">Current</Badge>})</span>
                    </div>
                </div>
            )}
        </div>

        {npc.isMerchant && (
            <div>
                <h4 className="font-semibold mb-1 flex items-center text-sm">
                    <PackageIcon className="w-4 h-4 mr-1.5 text-accent"/>Merchant Wares
                </h4>
                {npc.merchantInventory && npc.merchantInventory.length > 0 ? (
                    <ScrollArea className="h-24 rounded-md border p-2 bg-background/50">
                        <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
                            {npc.merchantInventory.map((item: Item) => ( // Explicitly type item
                                <li key={item.id} className="text-muted-foreground">
                                    <TooltipProvider delayDuration={100}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="cursor-help font-medium text-foreground/90 hover:text-primary transition-colors">
                                                    {item.name} - Price: {(item as any).price ?? item.basePrice ?? 0}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" align="start">
                                                <p className="text-sm font-medium">{item.name}</p>
                                                <p className="text-xs text-muted-foreground max-w-xs">{item.description}</p>
                                                <p className="text-xs text-muted-foreground">Base Value: {item.basePrice ?? 'N/A'}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                ) : (
                     <p className="text-xs text-muted-foreground italic p-2 border rounded-md bg-background/50">No items currently for sale.</p>
                )}
            </div>
        )}

        {npc.knownFacts && npc.knownFacts.length > 0 && (
          <div>
            <h4 className="font-semibold mb-1 flex items-center text-sm">
                <FileTextIcon className="w-4 h-4 mr-1.5 text-accent"/>Known Facts
            </h4>
            <ScrollArea className="h-20 rounded-md border p-2 bg-background/50">
              <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
                {npc.knownFacts.map((fact, index) => (
                  <li key={index} className="text-muted-foreground">{fact}</li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}

        {npc.dialogueHistory && npc.dialogueHistory.length > 0 && (
          <div>
            <h4 className="font-semibold mb-1 flex items-center text-sm">
                <HistoryIcon className="w-4 h-4 mr-1.5 text-accent"/>Dialogue History
            </h4>
            <ScrollArea className="h-24 rounded-md border p-2 bg-background/50">
              <ul className="space-y-2 text-xs">
                {npc.dialogueHistory.slice(-5).map((entry, index) => ( 
                  <li key={index} className="border-b border-border/50 pb-1 last:border-b-0 last:pb-0">
                    {entry.playerInput && <p><span className="font-medium text-primary/80">You:</span> <span className="text-muted-foreground italic">"{entry.playerInput}"</span></p>}
                    <p><span className="font-medium text-accent">{npc.name}:</span> <span className="text-muted-foreground">"{entry.npcResponse}"</span></p>
                    <p className="text-right text-muted-foreground/70 text-[10px]">Turn: {entry.turnId.substring(0,8)}...</p>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}
        {npc.updatedAt && <p className="text-xs text-muted-foreground/60 text-right mt-1">Profile updated: {new Date(npc.updatedAt).toLocaleString()}</p>}
      </AccordionContent>
    </AccordionItem>
  );
};

export default function NPCTrackerDisplay({ trackedNPCs, currentTurnId }: NPCTrackerDisplayProps) {
  if (!trackedNPCs || trackedNPCs.length === 0) {
    return (
      <Card className="w-full shadow-lg animate-fade-in">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary flex items-center">
            <UserCogIcon className="w-6 h-6 mr-2 text-accent" /> NPC Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center p-8 min-h-[200px]">
          <CircleHelpIcon className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <p className="text-lg text-muted-foreground">No significant NPCs tracked yet.</p>
          <p className="text-sm text-muted-foreground">As you meet and interact with characters, their profiles will appear here.</p>
        </CardContent>
      </Card>
    );
  }
  
  const sortedNPCs = [...trackedNPCs].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Card className="w-full shadow-lg animate-fade-in">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary flex items-center">
          <UserCogIcon className="w-6 h-6 mr-2 text-accent" /> NPC Tracker ({sortedNPCs.length})
        </CardTitle>
        <CardDescription>
          Profiles of significant characters encountered in your story.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-2"> 
        <Accordion type="multiple" className="w-full space-y-1">
          {sortedNPCs.map((npc) => (
            <NPCEntry key={npc.id} npc={npc} currentTurnId={currentTurnId} />
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
