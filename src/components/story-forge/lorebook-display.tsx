
"use client";

import { useState, useEffect, useCallback } from "react";
import { getLorebook, addLoreEntry, updateLoreEntry, deleteLoreEntry } from "@/lib/lore-manager";
import type { LoreEntry } from "@/types/story";
import LoreEntryForm, { type LoreEntryFormData } from "./lore-entry-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LibraryIcon, InfoIcon, PlusCircleIcon, Edit3Icon, Trash2Icon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LorebookDisplay() {
  const [loreEntries, setLoreEntries] = useState<LoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<LoreEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<LoreEntry | null>(null);

  const { toast } = useToast();

  const fetchLoreEntries = useCallback(() => {
    setIsLoading(true);
    const entries = getLorebook();
    // Sort entries by keyword for consistent display, then by createdAt
    entries.sort((a, b) => {
      const keywordComp = a.keyword.toLowerCase().localeCompare(b.keyword.toLowerCase());
      if (keywordComp !== 0) return keywordComp;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    setLoreEntries(entries);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchLoreEntries();
  }, [fetchLoreEntries]);

  const handleCreateSubmit = async (data: LoreEntryFormData) => {
    setIsFormLoading(true);
    try {
      addLoreEntry({ ...data, source: "User-Added" });
      toast({ title: "Lore Entry Created", description: `"${data.keyword}" has been added.` });
      fetchLoreEntries();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Error creating lore entry:", error);
      toast({ title: "Error", description: "Could not create lore entry.", variant: "destructive" });
    }
    setIsFormLoading(false);
  };

  const handleEditSubmit = async (data: LoreEntryFormData) => {
    if (!entryToEdit) return;
    setIsFormLoading(true);
    try {
      updateLoreEntry({ ...entryToEdit, ...data });
      toast({ title: "Lore Entry Updated", description: `"${data.keyword}" has been updated.` });
      fetchLoreEntries();
      setIsEditDialogOpen(false);
      setEntryToEdit(null);
    } catch (error) {
      console.error("Error updating lore entry:", error);
      toast({ title: "Error", description: "Could not update lore entry.", variant: "destructive" });
    }
    setIsFormLoading(false);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;
    setIsFormLoading(true);
    try {
      deleteLoreEntry(entryToDelete.id);
      toast({ title: "Lore Entry Deleted", description: `"${entryToDelete.keyword}" has been deleted.` });
      fetchLoreEntries();
      setEntryToDelete(null);
    } catch (error) {
      console.error("Error deleting lore entry:", error);
      toast({ title: "Error", description: "Could not delete lore entry.", variant: "destructive" });
    }
    setIsFormLoading(false);
  };

  const openEditDialog = (entry: LoreEntry) => {
    setEntryToEdit(entry);
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="w-full shadow-lg animate-fade-in">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary flex items-center justify-between">
            <div className="flex items-center">
              <LibraryIcon className="w-6 h-6 mr-2 text-accent" /> Lorebook
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading lore entries...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full shadow-lg animate-fade-in">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary flex items-center justify-between">
            <div className="flex items-center">
              <LibraryIcon className="w-6 h-6 mr-2 text-accent" /> Lorebook
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <PlusCircleIcon className="w-4 h-4 mr-2" /> Create New Entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Lore Entry</DialogTitle>
                </DialogHeader>
                <LoreEntryForm onSubmit={handleCreateSubmit} isLoading={isFormLoading} submitButtonText="Create Entry" />
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loreEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md bg-background/50">
              <InfoIcon className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-lg">Your Lorebook is currently empty.</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first entry or discover lore as you play!</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {loreEntries.map((entry) => (
                <AccordionItem value={entry.id} key={entry.id}>
                  <AccordionTrigger className="text-lg hover:no-underline group">
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="truncate mr-2">{entry.keyword}</span>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(entry); }}
                          aria-label="Edit"
                        >
                          <Edit3Icon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setEntryToDelete(entry); }}
                          aria-label="Delete"
                        >
                          <Trash2Icon className="w-4 h-4" />
                        </Button>
                        {entry.category && <Badge variant="secondary" className="ml-2 text-xs hidden sm:inline-flex">{entry.category}</Badge>}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed px-2">
                    {entry.category && <Badge variant="outline" className="sm:hidden mb-1">{entry.category}</Badge>}
                    <div className="mb-1 sm:hidden"></div> {/* Spacer for mobile badge */}
                    {entry.content}
                    <p className="text-xs text-muted-foreground mt-2">
                      Source: {entry.source} | Added: {new Date(entry.createdAt).toLocaleDateString()}
                      {entry.updatedAt && ` | Updated: ${new Date(entry.updatedAt).toLocaleDateString()}`}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEntryToEdit(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lore Entry</DialogTitle>
          </DialogHeader>
          {entryToEdit && (
            <LoreEntryForm
              onSubmit={handleEditSubmit}
              defaultValues={entryToEdit}
              isLoading={isFormLoading}
              submitButtonText="Update Entry"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!entryToDelete} onOpenChange={(open) => { if (!open) setEntryToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lore entry for
              <strong className="mx-1">"{entryToDelete?.keyword}"</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEntryToDelete(null)} disabled={isFormLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isFormLoading} className="bg-destructive hover:bg-destructive/90">
              {isFormLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
