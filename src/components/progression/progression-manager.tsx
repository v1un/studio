"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Star, 
  TreePine, 
  Award, 
  Target,
  Sparkles
} from 'lucide-react';
import type { CharacterProfile } from '@/types/story';
import { checkLevelUp, processLevelUp, initializeCharacterProgression } from '@/lib/progression-engine';
import LevelUpModal from './level-up-modal';
import SkillTreeViewer from './skill-tree-viewer';

interface ProgressionManagerProps {
  character: CharacterProfile;
  onCharacterUpdate: (character: CharacterProfile) => void;
}

export default function ProgressionManager({ character, onCharacterUpdate }: ProgressionManagerProps) {
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [currentTab, setCurrentTab] = useState('overview');

  // Initialize progression if not present
  const progressionCharacter = character.progressionPoints 
    ? character 
    : initializeCharacterProgression(character);

  const levelUpCheck = checkLevelUp(progressionCharacter);
  const progressionPoints = progressionCharacter.progressionPoints || {
    attribute: 0,
    skill: 0,
    specialization: 0,
    talent: 0
  };

  const handleLevelUp = () => {
    if (levelUpCheck.shouldLevelUp) {
      const leveledUpCharacter = processLevelUp(progressionCharacter);
      setShowLevelUpModal(true);
      // Update character with new level and progression points
      onCharacterUpdate(leveledUpCharacter);
    }
  };

  const handleLevelUpComplete = (updatedCharacter: CharacterProfile) => {
    setShowLevelUpModal(false);
    onCharacterUpdate(updatedCharacter);
  };

  const totalAvailablePoints = Object.values(progressionPoints).reduce((sum, points) => sum + points, 0);
  const purchasedSkillsCount = progressionCharacter.purchasedSkillNodes?.length || 0;
  const activeSpecializationsCount = progressionCharacter.activeSpecializations?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-500" />
            Character Progression
          </h2>
          <p className="text-muted-foreground">
            Customize your character's growth and abilities
          </p>
        </div>
        {levelUpCheck.shouldLevelUp && (
          <Button 
            onClick={handleLevelUp}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
            size="lg"
          >
            <Award className="w-4 h-4 mr-2" />
            Level Up to {levelUpCheck.newLevel}!
          </Button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" />
              Attribute Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressionPoints.attribute}</div>
            <p className="text-xs text-muted-foreground">
              Increase core attributes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TreePine className="w-4 h-4 text-green-500" />
              Skill Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressionPoints.skill}</div>
            <p className="text-xs text-muted-foreground">
              Unlock new abilities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="w-4 h-4 text-blue-500" />
              Specialization Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressionPoints.specialization}</div>
            <p className="text-xs text-muted-foreground">
              Choose specializations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Talent Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressionPoints.talent}</div>
            <p className="text-xs text-muted-foreground">
              Unlock unique talents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Progression Summary</CardTitle>
          <CardDescription>
            Your character's development progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{purchasedSkillsCount}</div>
              <div className="text-sm text-muted-foreground">Skills Learned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{activeSpecializationsCount}</div>
              <div className="text-sm text-muted-foreground">Active Specializations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{totalAvailablePoints}</div>
              <div className="text-sm text-muted-foreground">Available Points</div>
            </div>
          </div>

          {totalAvailablePoints > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2 text-blue-800">
                <Star className="w-4 h-4" />
                <span className="font-medium">You have unspent progression points!</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Use the tabs below to allocate your points and improve your character.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progression Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skill Trees</TabsTrigger>
          <TabsTrigger value="specializations" disabled>Specializations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Character Development</CardTitle>
              <CardDescription>
                Track your character's growth and plan future development
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Current Level</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Level {progressionCharacter.level}
                    </Badge>
                    {levelUpCheck.shouldLevelUp && (
                      <Badge variant="default" className="bg-yellow-600">
                        Ready to Level Up!
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Experience Progress</h4>
                  <div className="text-sm text-muted-foreground">
                    {progressionCharacter.experiencePoints} / {progressionCharacter.experienceToNextLevel} XP
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total XP Earned: {progressionCharacter.totalExperienceEarned || progressionCharacter.experiencePoints}
                  </div>
                </div>
              </div>

              {progressionCharacter.activeSpecializations && progressionCharacter.activeSpecializations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Active Specializations</h4>
                  <div className="flex flex-wrap gap-2">
                    {progressionCharacter.activeSpecializations.map((spec) => (
                      <Badge key={spec.id} variant="default">
                        {spec.name} (Level {spec.progressionLevel})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <SkillTreeViewer 
            character={progressionCharacter} 
            onCharacterUpdate={onCharacterUpdate} 
          />
        </TabsContent>

        <TabsContent value="specializations">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Specialization system coming soon!</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Level Up Modal */}
      <LevelUpModal
        character={progressionCharacter}
        isOpen={showLevelUpModal}
        onClose={() => setShowLevelUpModal(false)}
        onComplete={handleLevelUpComplete}
      />
    </div>
  );
}
