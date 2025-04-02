'use client'

import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { countryCoordinates } from "@/lib/country-coordinates"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useMemo, useEffect, useState } from "react"

interface CountryStats {
  country: string;
  visits: number;
}

interface WorldMapProps {
  data: CountryStats[];
  className?: string;
}

interface MarkerData {
  countryCode: string;
  coordinates: [number, number];
  visits: number;
  radius: number;
}

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

export function WorldMap({ data, className }: WorldMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Memoize the max visits calculation to ensure consistency
  const maxVisits = useMemo(() => 
    Math.max(...data.map(d => d.visits)), 
    [data]
  );

  // Memoize the markers data to ensure consistent rendering
  const markers = useMemo(() => 
    data.map(({ country, visits }) => {
      const countryCode = country.toUpperCase();
      const coordinates = countryCoordinates[countryCode];
      
      if (!coordinates) return null;

      // Round coordinates to a fixed number of decimal places to ensure consistency
      const roundedCoordinates: [number, number] = [
        Number(coordinates[0].toFixed(6)),
        Number(coordinates[1].toFixed(6))
      ];

      return {
        countryCode,
        coordinates: roundedCoordinates,
        visits,
        radius: Math.max(4, (visits / maxVisits) * 20)
      } as MarkerData;
    }).filter((marker): marker is MarkerData => marker !== null),
    [data, maxVisits]
  );

  // Return a placeholder during SSR
  if (!isMounted) {
    return (
      <div className="w-full h-[400px] relative bg-zinc-900/40 rounded-lg animate-pulse" />
    );
  }

  return (
    <div className="w-full h-[400px] relative">
      <ComposableMap
        projectionConfig={{
          rotate: [0, 0, 0],
          scale: 170,
          center: [0, 0],
        }}
        width={800}
        height={400}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <ZoomableGroup>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#27272A"
                  stroke="#3F3F46"
                  style={{
                    default: {
                      outline: "none",
                    },
                    hover: {
                      fill: "#3F3F46",
                      outline: "none",
                    },
                    pressed: {
                      outline: "none",
                    },
                  }}
                />
              ))
            }
          </Geographies>
          <TooltipProvider>
            {markers.map(({ countryCode, coordinates, visits, radius }) => (
              <Tooltip key={countryCode}>
                <TooltipTrigger asChild>
                  <Marker coordinates={coordinates}>
                    <circle
                      r={radius}
                      fill="#2563eb"
                      fillOpacity={0.6}
                      stroke="#fff"
                      strokeWidth={1}
                    />
                  </Marker>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-950 border-zinc-800">
                  <p className="text-sm text-zinc-50">
                    {countryCode}: {visits} visits
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}