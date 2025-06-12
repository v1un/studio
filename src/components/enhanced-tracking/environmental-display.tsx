/**
 * Environmental Display Component
 * 
 * Shows current location details, weather, time context, and environmental factors
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  MapPin, 
  Cloud, 
  Sun, 
  Moon, 
  Thermometer, 
  Eye, 
  AlertTriangle, 
  Sparkles,
  Users,
  Shield,
  Coins,
  Zap
} from 'lucide-react';
import type { EnvironmentalContext, LocationDetails, WeatherConditions, TimeContext } from '@/types/story';

interface EnvironmentalDisplayProps {
  environmentalContext: EnvironmentalContext;
  className?: string;
}

const weatherIcons = {
  clear: <Sun className="w-4 h-4 text-yellow-500" />,
  cloudy: <Cloud className="w-4 h-4 text-gray-500" />,
  rainy: <Cloud className="w-4 h-4 text-blue-500" />,
  stormy: <Cloud className="w-4 h-4 text-purple-500" />,
  snowy: <Cloud className="w-4 h-4 text-blue-200" />,
  foggy: <Cloud className="w-4 h-4 text-gray-400" />,
  windy: <Cloud className="w-4 h-4 text-green-500" />,
  extreme: <AlertTriangle className="w-4 h-4 text-red-500" />,
};

const timeIcons = {
  dawn: <Sun className="w-4 h-4 text-orange-300" />,
  morning: <Sun className="w-4 h-4 text-yellow-400" />,
  midday: <Sun className="w-4 h-4 text-yellow-500" />,
  afternoon: <Sun className="w-4 h-4 text-orange-400" />,
  evening: <Sun className="w-4 h-4 text-orange-500" />,
  dusk: <Sun className="w-4 h-4 text-red-400" />,
  night: <Moon className="w-4 h-4 text-blue-300" />,
  midnight: <Moon className="w-4 h-4 text-indigo-400" />,
};

const temperatureColors = {
  freezing: 'text-blue-600',
  cold: 'text-blue-400',
  cool: 'text-blue-200',
  mild: 'text-green-500',
  warm: 'text-yellow-500',
  hot: 'text-orange-500',
  scorching: 'text-red-500',
};

const locationTypeColors = {
  city: 'bg-blue-100 text-blue-800',
  wilderness: 'bg-green-100 text-green-800',
  dungeon: 'bg-gray-100 text-gray-800',
  building: 'bg-yellow-100 text-yellow-800',
  landmark: 'bg-purple-100 text-purple-800',
  transport: 'bg-indigo-100 text-indigo-800',
  other: 'bg-gray-100 text-gray-800',
};

const sizeLabels = {
  tiny: 'Tiny',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  massive: 'Massive',
};

function LocationDetailsCard({ location }: { location: LocationDetails }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-blue-500" />
          <span className="font-medium">Location Type</span>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={locationTypeColors[location.locationType]}>
            {location.locationType}
          </Badge>
          <Badge variant="outline">{sizeLabels[location.size]}</Badge>
        </div>
      </div>

      {location.population && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-green-500" />
            <span className="text-sm">Population</span>
          </div>
          <span className="text-sm font-medium">{location.population.toLocaleString()}</span>
        </div>
      )}

      {/* Location Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Shield className="w-3 h-3 text-green-500" />
                  <span className="text-xs">Safety</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Progress value={location.safetyLevel} className="w-12 h-2" />
                  <span className="text-xs">{location.safetyLevel}%</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Safety Level</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Coins className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs">Wealth</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Progress value={location.wealthLevel} className="w-12 h-2" />
                  <span className="text-xs">{location.wealthLevel}%</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Wealth Level</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  <span className="text-xs">Magic</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Progress value={location.magicalLevel} className="w-12 h-2" />
                  <span className="text-xs">{location.magicalLevel}%</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Magical Level</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-blue-500" />
                  <span className="text-xs">Stability</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Progress value={location.politicalStability} className="w-12 h-2" />
                  <span className="text-xs">{location.politicalStability}%</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Political Stability</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Available Services */}
      {location.availableServices.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold mb-2">Available Services</h5>
          <div className="flex flex-wrap gap-1">
            {location.availableServices.map((service, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {service}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Notable Features */}
      {location.notableFeatures.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold mb-2">Notable Features</h5>
          <div className="space-y-1">
            {location.notableFeatures.map((feature, index) => (
              <p key={index} className="text-xs text-gray-600 bg-gray-50 p-1 rounded">
                {feature}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WeatherCard({ weather }: { weather: WeatherConditions }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {weatherIcons[weather.condition]}
          <span className="font-medium capitalize">{weather.condition}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Thermometer className="w-4 h-4" />
          <span className={`text-sm font-medium capitalize ${temperatureColors[weather.temperature]}`}>
            {weather.temperature}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-gray-500" />
          <span className="text-sm">Visibility</span>
        </div>
        <div className="flex items-center space-x-2">
          <Progress value={weather.visibility} className="w-16 h-2" />
          <span className="text-sm">{weather.visibility}%</span>
        </div>
      </div>

      {weather.weatherEffects.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold mb-2">Weather Effects</h5>
          <div className="space-y-1">
            {weather.weatherEffects.map((effect, index) => (
              <p key={index} className="text-xs text-gray-600 bg-gray-50 p-1 rounded">
                {effect}
              </p>
            ))}
          </div>
        </div>
      )}

      {weather.seasonalContext && (
        <div>
          <h5 className="text-sm font-semibold mb-1">Season</h5>
          <p className="text-sm text-gray-600">{weather.seasonalContext}</p>
        </div>
      )}
    </div>
  );
}

function TimeCard({ time }: { time: TimeContext }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {timeIcons[time.timeOfDay]}
          <span className="font-medium capitalize">{time.timeOfDay.replace('_', ' ')}</span>
        </div>
        {time.season && (
          <Badge variant="outline" className="capitalize">
            {time.season}
          </Badge>
        )}
      </div>

      {time.dayOfWeek && (
        <div className="flex items-center justify-between">
          <span className="text-sm">Day of Week</span>
          <span className="text-sm font-medium">{time.dayOfWeek}</span>
        </div>
      )}

      {time.timeEffects.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold mb-2">Time Effects</h5>
          <div className="space-y-1">
            {time.timeEffects.map((effect, index) => (
              <p key={index} className="text-xs text-gray-600 bg-gray-50 p-1 rounded">
                {effect}
              </p>
            ))}
          </div>
        </div>
      )}

      {time.availableActions.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold mb-2">Available Actions</h5>
          <div className="flex flex-wrap gap-1">
            {time.availableActions.map((action, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {action}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {time.activeNPCs.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold mb-2">NPCs Available</h5>
          <div className="flex flex-wrap gap-1">
            {time.activeNPCs.map((npc, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {npc}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EnvironmentalDisplay({ environmentalContext, className = '' }: EnvironmentalDisplayProps) {
  const activeHazards = environmentalContext.environmentalHazards.filter(h => h.isActive);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="w-5 h-5" />
          <span>Environment</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Location */}
        <div>
          <h4 className="font-semibold mb-2">{environmentalContext.currentLocation}</h4>
          <LocationDetailsCard location={environmentalContext.locationDetails} />
        </div>

        {/* Weather & Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Weather</h4>
            <WeatherCard weather={environmentalContext.weatherConditions} />
          </div>
          <div>
            <h4 className="font-semibold mb-2">Time</h4>
            <TimeCard time={environmentalContext.timeContext} />
          </div>
        </div>

        {/* Environmental Hazards */}
        {activeHazards.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>Active Hazards</span>
            </h4>
            <div className="space-y-2">
              {activeHazards.map((hazard) => (
                <div key={hazard.id} className="p-2 bg-red-50 border border-red-200 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-red-800">{hazard.name}</span>
                    <Badge variant="destructive" className="text-xs">
                      {hazard.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-red-700">{hazard.description}</p>
                  {hazard.effects.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs text-red-600">
                        Effects: {hazard.effects.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Atmospheric Modifiers */}
        {environmentalContext.atmosphericModifiers.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Atmosphere</h4>
            <div className="space-y-2">
              {environmentalContext.atmosphericModifiers.map((modifier) => (
                <div key={modifier.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{modifier.effect}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs ${modifier.moodImpact > 0 ? 'text-green-600' : modifier.moodImpact < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      Mood: {modifier.moodImpact > 0 ? '+' : ''}{modifier.moodImpact}
                    </span>
                    <span className={`text-xs ${modifier.interactionModifier > 0 ? 'text-green-600' : modifier.interactionModifier < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      Social: {modifier.interactionModifier > 0 ? '+' : ''}{modifier.interactionModifier}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
