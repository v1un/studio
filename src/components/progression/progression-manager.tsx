"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  Star,
  TreePine,
  Award,
  Target,
  Sparkles,
  Languages,
  BookOpen,
  MessageSquare,
  User,
  Zap,
  Shield,
  Sword,
  Brain,
  Eye,
  Heart,
  Search,
  Filter,
  ChevronRight,
  Plus,
  Minus
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EnhancedCard, EnhancedCardGrid, StatDisplayCard } from '@/components/ui/enhanced-card';
import { SearchFilter } from '@/components/ui/search-filter';
import { ResponsiveGrid, ResponsiveContainer } from '@/components/ui/responsive-grid';
import type { CharacterProfile, Skill, StructuredStoryState, AIGeneratedSkillTree } from '@/types/story';
import { checkLevelUp, processLevelUp, initializeCharacterProgression } from '@/lib/progression-engine';
import LevelUpModal from './level-up-modal';
import SkillTreeViewer from './skill-tree-viewer';
import AISkillGenerator from './ai-skill-generator';
import ProgressionAdvisor from './progression-advisor';
import SkillEvolutionManager from './skill-evolution-manager';
import { SpecializationManager } from '@/components/specializations/specialization-manager';

// Helper function for language proficiency labels
function getLanguageProficiencyLabel(level?: number, type?: 'Reading' | 'Speaking'): string {
  const skillType = type ? `${type} ` : "";
  if (level === undefined || level === null) return `${skillType}Unknown`;
  if (level <= 0) return `${skillType}None (0/100)`;
  if (level <= 10) return `${skillType}Rudimentary (${level}/100)`;
  if (level <= 40) return `${skillType}Basic (${level}/100)`;
  if (level <= 70) return `${skillType}Conversational (${level}/100)`;
  if (level <= 99) return `${skillType}Good (${level}/100)`;
  return `${skillType}Fluent (${level}/100)`;
}

interface ProgressionManagerProps {
  character: CharacterProfile;
  storyState?: StructuredStoryState;
  seriesName?: string;
  onCharacterUpdate: (character: CharacterProfile) => void;
}

export default function ProgressionManager({
  character,
  storyState,
  seriesName = "Generic Fantasy",
  onCharacterUpdate
}: ProgressionManagerProps) {
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [currentTab, setCurrentTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    attributes: true,
    skills: true,
    specializations: true
  });
  const [generatedSkillTrees, setGeneratedSkillTrees] = useState<AIGeneratedSkillTree[]>([]);

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

  // Memoized calculations for performance
  const progressionStats = useMemo(() => {
    const totalAvailablePoints = Object.values(progressionPoints).reduce((sum, points) => sum + points, 0);
    const purchasedSkillsCount = progressionCharacter.purchasedSkillNodes?.length || 0;
    const activeSpecializationsCount = progressionCharacter.activeSpecializations?.length || 0;
    const totalExperience = progressionCharacter.totalExperienceEarned || progressionCharacter.experiencePoints;
    const experienceToNext = progressionCharacter.experienceToNextLevel || 100;
    const experienceProgress = (progressionCharacter.experiencePoints / experienceToNext) * 100;

    return {
      totalAvailablePoints,
      purchasedSkillsCount,
      activeSpecializationsCount,
      totalExperience,
      experienceProgress
    };
  }, [progressionCharacter, progressionPoints]);

  const handleLevelUp = () => {
    if (levelUpCheck.shouldLevelUp) {
      const leveledUpCharacter = processLevelUp(progressionCharacter);
      setShowLevelUpModal(true);
      onCharacterUpdate(leveledUpCharacter);
    }
  };

  const handleLevelUpComplete = (updatedCharacter: CharacterProfile) => {
    setShowLevelUpModal(false);
    onCharacterUpdate(updatedCharacter);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSkillTreeGenerated = (skillTree: AIGeneratedSkillTree) => {
    setGeneratedSkillTrees(prev => [...prev, skillTree]);
  };

  return (
    <ResponsiveContainer maxWidth="none" padding="none" className="space-y-6">
      {/* Enhanced Header with Stats */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              Character Progression
            </h2>
            <p className="text-muted-foreground text-lg">
              Customize your character&apos;s growth, abilities, and specializations
            </p>
          </div>

          {levelUpCheck.shouldLevelUp && (
            <Button
              onClick={handleLevelUp}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg animate-pulse-glow"
              size="lg"
            >
              <Award className="w-5 h-5 mr-2" />
              Level Up to {levelUpCheck.newLevel}!
            </Button>
          )}
        </div>

        {/* Quick Stats Overview */}
        <ResponsiveGrid
          columns={{ default: 2, sm: 3, lg: 5 }}
          gap="md"
          className="mb-6"
        >
          <StatDisplayCard
            label="Level"
            value={progressionCharacter.level}
            icon={Star}
            iconColor="text-yellow-500"
            description="Character Level"
          />
          <StatDisplayCard
            label="Available Points"
            value={progressionStats.totalAvailablePoints}
            icon={Target}
            iconColor="text-blue-500"
            description="Unspent Points"
          />
          <StatDisplayCard
            label="Skills Learned"
            value={progressionStats.purchasedSkillsCount}
            icon={BookOpen}
            iconColor="text-green-500"
            description="Purchased Skills"
          />
          <StatDisplayCard
            label="Specializations"
            value={progressionStats.activeSpecializationsCount}
            icon={Sparkles}
            iconColor="text-purple-500"
            description="Active Specs"
          />
          <StatDisplayCard
            label="Total XP"
            value={progressionStats.totalExperience.toLocaleString()}
            icon={Zap}
            iconColor="text-orange-500"
            description="Experience Earned"
          />
        </ResponsiveGrid>

        {/* Experience Progress Bar */}
        <EnhancedCard className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Experience Progress</span>
              <span className="text-sm text-muted-foreground">
                {progressionCharacter.experiencePoints} / {progressionCharacter.experienceToNextLevel}
              </span>
            </div>
            <Progress
              value={progressionStats.experienceProgress}
              className="h-3"
            />
          </div>
        </EnhancedCard>
      </div>

      {/* Enhanced Progression Points Cards */}
      <ResponsiveGrid
        columns={{ default: 2, lg: 4 }}
        gap="md"
        className="mb-6"
      >
        <EnhancedCard
          title="Attribute Points"
          icon={Target}
          iconColor="text-orange-500"
          badge={progressionPoints.attribute.toString()}
          badgeVariant={progressionPoints.attribute > 0 ? "default" : "secondary"}
          interactive={progressionPoints.attribute > 0}
          onClick={() => setCurrentTab('attributes')}
          animation="slide-left"
        >
          <p className="text-sm text-muted-foreground">
            Increase core attributes like Strength, Intelligence, and Agility
          </p>
          {progressionPoints.attribute > 0 && (
            <Button variant="outline" size="sm" className="mt-3 w-full">
              <Plus className="w-4 h-4 mr-2" />
              Allocate Points
            </Button>
          )}
        </EnhancedCard>

        <EnhancedCard
          title="Skill Points"
          icon={TreePine}
          iconColor="text-green-500"
          badge={progressionPoints.skill.toString()}
          badgeVariant={progressionPoints.skill > 0 ? "default" : "secondary"}
          interactive={progressionPoints.skill > 0}
          onClick={() => setCurrentTab('skills')}
          animation="slide-left"
        >
          <p className="text-sm text-muted-foreground">
            Unlock new abilities and enhance existing skills
          </p>
          {progressionPoints.skill > 0 && (
            <Button variant="outline" size="sm" className="mt-3 w-full">
              <TreePine className="w-4 h-4 mr-2" />
              View Skill Trees
            </Button>
          )}
        </EnhancedCard>

        <EnhancedCard
          title="Specialization Points"
          icon={Star}
          iconColor="text-blue-500"
          badge={progressionPoints.specialization.toString()}
          badgeVariant={progressionPoints.specialization > 0 ? "default" : "secondary"}
          interactive={progressionPoints.specialization > 0}
          onClick={() => setCurrentTab('specializations')}
          animation="slide-right"
        >
          <p className="text-sm text-muted-foreground">
            Choose powerful specializations and focus areas
          </p>
          {progressionPoints.specialization > 0 && (
            <Button variant="outline" size="sm" className="mt-3 w-full">
              <Star className="w-4 h-4 mr-2" />
              Choose Specialization
            </Button>
          )}
        </EnhancedCard>

        <EnhancedCard
          title="Talent Points"
          icon={Sparkles}
          iconColor="text-purple-500"
          badge={progressionPoints.talent.toString()}
          badgeVariant={progressionPoints.talent > 0 ? "default" : "secondary"}
          interactive={progressionPoints.talent > 0}
          animation="slide-right"
        >
          <p className="text-sm text-muted-foreground">
            Unlock unique talents and rare abilities
          </p>
          {progressionPoints.talent > 0 && (
            <Button variant="outline" size="sm" className="mt-3 w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Unlock Talents
            </Button>
          )}
        </EnhancedCard>
      </ResponsiveGrid>

      {/* Unspent Points Alert */}
      {progressionStats.totalAvailablePoints > 0 && (
        <EnhancedCard
          variant="gradient"
          className="border-primary/30 animate-pulse-glow"
          animation="bounce"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-white/20">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">
                You have {progressionStats.totalAvailablePoints} unspent progression points!
              </h3>
              <p className="text-white/90 text-sm">
                Use the sections below to allocate your points and improve your character.
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/80" />
          </div>
        </EnhancedCard>
      )}

      {/* Enhanced Navigation Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <TabsList className="grid grid-cols-7 w-full lg:w-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="attributes" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Attributes</span>
            </TabsTrigger>
            <TabsTrigger value="skills" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TreePine className="w-4 h-4" />
              <span className="hidden sm:inline">Skills</span>
            </TabsTrigger>
            <TabsTrigger value="evolution" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Evolution</span>
            </TabsTrigger>
            <TabsTrigger value="specializations" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Specializations</span>
            </TabsTrigger>
            <TabsTrigger value="ai-generator" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">AI Generator</span>
            </TabsTrigger>
            <TabsTrigger value="ai-advisor" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">AI Advisor</span>
            </TabsTrigger>
          </TabsList>

          {/* Search and Filter for Skills Tab */}
          {currentTab === 'skills' && (
            <div className="w-full lg:w-auto">
              <SearchFilter
                searchPlaceholder="Search skills and abilities..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                className="w-full lg:w-80"
              />
            </div>
          )}
        </div>

        <TabsContent value="overview" className="space-y-6">
          {/* Level Up Indicator */}
          {levelUpCheck.shouldLevelUp && (
            <EnhancedCard
              variant="gradient"
              className="border-yellow-400/30 bg-gradient-to-r from-yellow-500 to-orange-500"
              animation="bounce"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-white/20">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">Ready to Level Up!</h3>
                  <p className="text-white/90">
                    You have enough experience to reach level {levelUpCheck.newLevel}
                  </p>
                </div>
                <Button
                  onClick={handleLevelUp}
                  variant="secondary"
                  size="lg"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  Level Up Now!
                </Button>
              </div>
            </EnhancedCard>
          )}

          {/* Character Development Overview */}
          <ResponsiveGrid columns={{ default: 1, lg: 2 }} gap="lg">
            <EnhancedCard
              title="Character Development"
              description="Track your character's growth and plan future development"
              icon={User}
              iconColor="text-blue-500"
              animation="slide-left"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-primary">{progressionCharacter.level}</div>
                    <div className="text-sm text-muted-foreground">Current Level</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-green-500">
                      {progressionStats.totalExperience.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total XP</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Experience Progress</span>
                    <span>{progressionCharacter.experiencePoints} / {progressionCharacter.experienceToNextLevel}</span>
                  </div>
                  <Progress value={progressionStats.experienceProgress} className="h-2" />
                </div>
              </div>
            </EnhancedCard>

            <EnhancedCard
              title="Progression Summary"
              description="Overview of your character's development"
              icon={Target}
              iconColor="text-purple-500"
              animation="slide-right"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-green-500/10">
                  <div className="text-2xl font-bold text-green-500">{progressionStats.purchasedSkillsCount}</div>
                  <div className="text-sm text-muted-foreground">Skills Learned</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-blue-500/10">
                  <div className="text-2xl font-bold text-blue-500">{progressionStats.activeSpecializationsCount}</div>
                  <div className="text-sm text-muted-foreground">Specializations</div>
                </div>
              </div>
            </EnhancedCard>
          </ResponsiveGrid>

          {/* Active Specializations and Skills */}
          <ResponsiveGrid columns={{ default: 1, lg: 2 }} gap="lg">
            {/* Active Specializations */}
            <EnhancedCard
              title="Active Specializations"
              description="Your character's current specializations and focus areas"
              icon={Sparkles}
              iconColor="text-purple-500"
              animation="slide-left"
            >
              {progressionCharacter.activeSpecializations && progressionCharacter.activeSpecializations.length > 0 ? (
                <div className="space-y-3">
                  {progressionCharacter.activeSpecializations.map((spec) => (
                    <div key={spec.id} className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{spec.name}</h4>
                        <Badge variant="outline">Level {spec.progressionLevel}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{spec.description}</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{spec.progressionLevel}/5</span>
                        </div>
                        <Progress value={(spec.progressionLevel / 5) * 100} className="h-1" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No specializations active yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Specializations will appear here as you progress.
                  </p>
                </div>
              )}
            </EnhancedCard>

            {/* Skill Tree Progress */}
            <EnhancedCard
              title="Skill Tree Progress"
              description="Skills and abilities learned from skill trees"
              icon={TreePine}
              iconColor="text-green-500"
              animation="slide-right"
            >
              {progressionCharacter.purchasedSkillNodes && progressionCharacter.purchasedSkillNodes.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <div className="text-2xl font-bold text-green-500">
                      {progressionCharacter.purchasedSkillNodes.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Skills Learned</div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setCurrentTab('skills')}
                  >
                    <TreePine className="w-4 h-4 mr-2" />
                    View Skill Trees
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <TreePine className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No skills learned yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Visit the Skills tab to start learning abilities.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => setCurrentTab('skills')}
                  >
                    <TreePine className="w-4 h-4 mr-2" />
                    Explore Skills
                  </Button>
                </div>
              )}
            </EnhancedCard>
          </ResponsiveGrid>
        </TabsContent>

        <TabsContent value="attributes" className="space-y-6">
          <EnhancedCard
            title="Core Attributes"
            description="Improve your character's fundamental capabilities"
            icon={Zap}
            iconColor="text-orange-500"
            badge={`${progressionPoints.attribute} points available`}
            badgeVariant={progressionPoints.attribute > 0 ? "default" : "secondary"}
          >
            <ResponsiveGrid columns={{ default: 1, sm: 2, lg: 3 }} gap="md">
              {/* Strength */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sword className="w-5 h-5 text-red-500" />
                    <span className="font-medium">Strength</span>
                  </div>
                  <Badge variant="outline">{progressionCharacter.strength}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Increases physical damage and carrying capacity
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={progressionPoints.attribute === 0}>
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={progressionCharacter.strength <= 1}>
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Intelligence */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Intelligence</span>
                  </div>
                  <Badge variant="outline">{progressionCharacter.intelligence}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Increases mana and magical damage
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={progressionPoints.attribute === 0}>
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={progressionCharacter.intelligence <= 1}>
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Agility */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <span className="font-medium">Agility</span>
                  </div>
                  <Badge variant="outline">{progressionCharacter.agility}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Increases speed and dodge chance
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={progressionPoints.attribute === 0}>
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={progressionCharacter.agility <= 1}>
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Perception */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Perception</span>
                  </div>
                  <Badge variant="outline">{progressionCharacter.perception}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Improves awareness and critical hit chance
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={progressionPoints.attribute === 0}>
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={progressionCharacter.perception <= 1}>
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Charisma */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" />
                    <span className="font-medium">Charisma</span>
                  </div>
                  <Badge variant="outline">{progressionCharacter.charisma}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Improves social interactions and leadership
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={progressionPoints.attribute === 0}>
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={progressionCharacter.charisma <= 1}>
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Constitution */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">Constitution</span>
                  </div>
                  <Badge variant="outline">{progressionCharacter.constitution}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Increases health and resistance to effects
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={progressionPoints.attribute === 0}>
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={progressionCharacter.constitution <= 1}>
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </ResponsiveGrid>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="skills">
          <SkillTreeViewer
            character={progressionCharacter}
            onCharacterUpdate={onCharacterUpdate}
          />
        </TabsContent>

        {/* Skill Evolution Tab */}
        <TabsContent value="evolution" className="space-y-6">
          {storyState ? (
            <SkillEvolutionManager
              character={progressionCharacter}
              storyState={storyState}
              seriesName={seriesName}
              onCharacterUpdate={onCharacterUpdate}
            />
          ) : (
            <EnhancedCard
              title="Skill Evolution System"
              description="Dynamic skill progression requires story context"
              icon={TrendingUp}
              iconColor="text-green-500"
            >
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Story Context Required</h3>
                <p className="text-muted-foreground mb-4">
                  The skill evolution system needs access to your story state to create contextual evolution paths.
                </p>
                <p className="text-sm text-muted-foreground">
                  This feature is available when accessing progression from within an active story.
                </p>
              </div>
            </EnhancedCard>
          )}
        </TabsContent>

        <TabsContent value="specializations" className="space-y-6">
          <SpecializationManager
            character={progressionCharacter}
            onCharacterUpdate={onCharacterUpdate}
            seriesName={seriesName}
            currentTurnId={storyState?.currentTurnId}
            storyState={storyState}
          />
        </TabsContent>

        {/* AI Generator Tab */}
        <TabsContent value="ai-generator" className="space-y-6">
          {storyState ? (
            <AISkillGenerator
              character={progressionCharacter}
              storyState={storyState}
              seriesName={seriesName}
              onCharacterUpdate={onCharacterUpdate}
              onSkillTreeGenerated={handleSkillTreeGenerated}
            />
          ) : (
            <EnhancedCard
              title="AI Skill Generator"
              description="Dynamic skill generation requires story context"
              icon={Brain}
              iconColor="text-purple-500"
            >
              <div className="text-center py-12">
                <Brain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Story Context Required</h3>
                <p className="text-muted-foreground mb-4">
                  The AI skill generator needs access to your story state to create contextual skills.
                </p>
                <p className="text-sm text-muted-foreground">
                  This feature is available when accessing progression from within an active story.
                </p>
              </div>
            </EnhancedCard>
          )}
        </TabsContent>

        {/* AI Advisor Tab */}
        <TabsContent value="ai-advisor" className="space-y-6">
          {storyState ? (
            <ProgressionAdvisor
              character={progressionCharacter}
              storyState={storyState}
              seriesName={seriesName}
              onCharacterUpdate={onCharacterUpdate}
            />
          ) : (
            <EnhancedCard
              title="AI Progression Advisor"
              description="Intelligent progression guidance requires story context"
              icon={Target}
              iconColor="text-blue-500"
            >
              <div className="text-center py-12">
                <Target className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Story Context Required</h3>
                <p className="text-muted-foreground mb-4">
                  The AI advisor analyzes your story progression to provide personalized recommendations.
                </p>
                <p className="text-sm text-muted-foreground">
                  This feature is available when accessing progression from within an active story.
                </p>
              </div>
            </EnhancedCard>
          )}
        </TabsContent>
      </Tabs>

      {/* Level Up Modal */}
      <LevelUpModal
        character={progressionCharacter}
        isOpen={showLevelUpModal}
        onClose={() => setShowLevelUpModal(false)}
        onComplete={handleLevelUpComplete}
      />
    </ResponsiveContainer>
  );
}
